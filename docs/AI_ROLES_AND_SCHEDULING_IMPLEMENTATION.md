# AI役割分担とスケジューリング実装

## 概要

要件に基づき、各AIモデルの役割を明確化し、新しいワークフローを実装しました。

## AI役割分担

### Gemini
- **Veo 3.1**: 動画生成（定期配信用）
- **Nano Banana Pro**: 画像生成（定期配信用）

### Grok
- **X（Twitter）リアルタイム解析**: 定期配信時にXのセンチメントを分析
  - `whaleBias`: クジラのバイアス
  - `retailFomo`: リテールFOMO
  - `newsImpact`: ニュース影響度

### GPT
- **CryptoQuantデータ解析**: 15分ごとの緊急配信と定期配信でCryptoQuantデータを分析
  - 緊急配信: `analyzeCryptoQuantData` - シグナル検出用
  - 定期配信: `generateCryptoQuantAnalysis` - 詳細分析用
- **サービス未利用ユーザー影響レポート生成**: `generateNonUserImpactReport`

### Composer（Assistant）
- **アルゴリズム構築**: GPTと協力してアルゴリズムを構築
- **システム統合**: 各AIの出力を統合してメッセージ生成

## スケジューリング

### 15分ごとの緊急配信（`/api/cron`）

**スケジュール**: `*/15 * * * *` (既存)

**ワークフロー**:
1. CryptoQuantデータ取得（Exchange Netflow, MPI）
2. **GPT解析** (`analyzeCryptoQuantData`)
   - SELL/SHORTシグナル検出
   - 信頼度（confidence >= 0.80）チェック
   - 緊急度判定（high/medium/low）
3. シグナル検出
4. 緊急配信（EMERGENCY）

**実装箇所**: `api/cron.js` (15分ごとの処理部分)

### 定期配信（4時間ごとまたは6時間ごと）

**スケジュール**: 
- 4時間ごと: `55 23,3,7,11,15,19 * * *` (0, 4, 8, 12, 16, 20 UTCの5分前)
- 6時間ごと: 環境変数 `REGULAR_SCHEDULE=6h` で切り替え可能

**ワークフロー**:
1. **準備フェーズ** (`/api/prepare` - 定時の5分前)
   - CryptoQuantデータ取得
   - **GPT解析** (`generateCryptoQuantAnalysis`) - CryptoQuantデータの詳細分析
   - **Grok解析** (`analyzeXSentimentLive`) - Xセンチメント分析
   - **Gemini画像生成** (`generateMarketImage`) - Nano Banana Pro
   - **Gemini動画生成** (`generateMarketVideo`) - Veo 3.1
   - コンテンツを保存

2. **配信フェーズ** (`/api/cron` - 定時)
   - 保存されたコンテンツを読み込み
   - **見逃した機会を計算** (`calculateMissedOpportunities`)
   - **GPTで影響レポート生成** (`generateNonUserImpactReport`)
   - メッセージ生成・送信

**実装箇所**: 
- `api/prepare.js` (準備フェーズ)
- `api/cron.js` (配信フェーズ、REGULAR処理部分)

## 新規実装ファイル

### 1. `services/gpt/client.js`
GPT APIを使用したCryptoQuantデータ解析サービス

**主要関数**:
- `analyzeCryptoQuantData(cryptoQuantData, marketContext, lang)`: 15分ごとの緊急配信用
- `generateCryptoQuantAnalysis(cryptoQuantData, marketContext, lang)`: 定期配信用詳細分析
- `generateNonUserImpactReport(marketData, missedOpportunities, lang)`: サービス未利用ユーザー影響レポート

### 2. `utils/missedOpportunities.js`
見逃した機会を計算するユーティリティ

**主要関数**:
- `calculateMissedOpportunities(signalsLogPath, hoursBack)`: 過去24時間のシグナルから見逃した機会を計算
- `formatMissedOpportunities(opportunities, lang)`: 人間が読める形式でフォーマット

## 変更されたファイル

### 1. `api/cron.js`
- GPTクライアントをインポート
- 15分ごとの処理でGPT解析を追加（緊急配信用）
- 定期配信でGPT解析とGrok X解析を分離
- 見逃した機会の計算と影響レポート生成を追加
- Gemini動画生成を統合

### 2. `api/prepare.js`
- GPTクライアントをインポート
- GPT解析とGrok X解析を分離
- 保存時にGPT解析結果とGrok X解析結果の両方を保存
- 6時間ごとのスケジュールに対応

### 3. `vercel.json`
- 環境変数 `REGULAR_SCHEDULE` の説明を追加（4h/6h切り替え）

## 環境変数

### 新規追加
- `REGULAR_SCHEDULE`: 定期配信のスケジュール
  - `4h` (デフォルト): 4時間ごと（0, 4, 8, 12, 16, 20 UTC）
  - `6h`: 6時間ごと（0, 6, 12, 18 UTC）

### 既存（使用中）
- `OPENAI_API_KEY`: GPT APIキー
- `GEMINI_API_KEY`: Gemini APIキー（Veo/Nano Banana用）
- `XAI_API_KEY`: Grok APIキー（X解析用）

## データフロー

### 15分ごとの緊急配信
```
CryptoQuant API
    ↓
GPT解析 (analyzeCryptoQuantData)
    ↓
シグナル検出 (SELL/SHORT, confidence >= 0.80)
    ↓
緊急配信 (EMERGENCY)
```

### 定期配信（準備フェーズ）
```
CryptoQuant API
    ↓
GPT解析 (generateCryptoQuantAnalysis) ──┐
                                         ├─→ コンテンツ保存
Grok X解析 (analyzeXSentimentLive) ────┤
                                         │
Gemini画像生成 (Nano Banana Pro) ──────┤
                                         │
Gemini動画生成 (Veo 3.1) ───────────────┘
```

### 定期配信（配信フェーズ）
```
保存されたコンテンツ読み込み
    ↓
見逃した機会計算 (calculateMissedOpportunities)
    ↓
GPT影響レポート生成 (generateNonUserImpactReport)
    ↓
メッセージ生成・送信
```

## 今後の改善点

1. **TrendReversalDetector統合**: `logic/core/trendReversalDetector.js`を`marketCore.js`に完全統合
2. **時系列データ管理**: `TrendReversalDetector`の履歴データを外部ストレージ（Redis等）で管理
3. **バックテスト**: 新しいGPT解析アルゴリズムの有効性を検証
4. **エラーハンドリング**: 各AIサービスのエラー時のフォールバック処理を強化
5. **コスト最適化**: 15分ごとのGPT呼び出しコストを監視・最適化

## 注意事項

- GPT APIキー（`OPENAI_API_KEY`）が設定されていない場合、GPT解析はスキップされます
- Gemini APIキー（`GEMINI_API_KEY`）が設定されていない場合、画像・動画生成はスキップされます
- Grok APIキー（`XAI_API_KEY`）が設定されていない場合、X解析はスキップされます
- 各AIサービスのレート制限に注意してください
