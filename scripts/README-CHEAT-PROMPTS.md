# チートプロンプト実行ガイド

## 🎯 概要

このディレクトリには、AI（Grok、Gemini、GPT-5.2）に対して「チート級」の戦略を引き出すためのプロンプトスクリプトが含まれています。

## 🚀 チートプロンプトの特徴

### 従来のプロンプトとの違い

**従来のプロンプト**:
- 「安全圏」を推奨
- 保守的な推奨値
- リスク回避に焦点

**チートプロンプト**:
- 「最大限の成果」を追求
- 技術的制約内での最大値
- リスク対報酬評価に焦点

### 設計方針

1. **安全バイアスの回避**: 「安全圏」ではなく「最大限の成果」を求める
2. **技術的制約への焦点**: レート制限などの技術的制約のみを考慮
3. **エッジケースの探索**: アルゴリズムの「抜け道」や「最適化ポイント」を探る
4. **データ駆動**: 実際のデータに基づいた推奨（推測ではなく）
5. **リスク評価**: リスクを明確に評価し、リスクを取る価値があるかを判断

## 📋 利用可能なスクリプト

### 1. Grok用チートプロンプト

```bash
node scripts/ask-grok-x-algorithm-cheat-strategy.js
```

**特徴**:
- アルゴリズムの「抜け道」と「最適化ポイント」を特定
- Temperature: 0.7（より創造的/積極的な回答）
- Max Tokens: 12,000（詳細な分析）

**必要な環境変数**:
- `XAI_API_KEY`: Grok APIキー
- `XAI_BASE_URL`: Grok APIベースURL（オプション、デフォルト: https://api.x.ai/v1）

**出力先**:
- `docs/reports/grok-x-algorithm-cheat-strategy-[timestamp].md`

### 2. Gemini用チートプロンプト

```bash
node scripts/ask-gemini-x-algorithm-cheat-strategy.js
```

**特徴**:
- データ分析とパターン認識に優れている
- Temperature: 0.7（より創造的/積極的な回答）
- Max Output Tokens: 12,000（詳細な分析）

**必要な環境変数**:
- `GEMINI_API_KEY`: Gemini APIキー

**出力先**:
- `docs/reports/gemini-x-algorithm-cheat-strategy-[timestamp].md`

### 3. GPT-5.2用チートプロンプト

```bash
node scripts/ask-gpt-x-algorithm-cheat-strategy.js
```

**特徴**:
- 実装可能性の評価が正確
- コード例の提供が得意
- Temperature: 0.7（より創造的/積極的な回答）
- Max Tokens: 12,000（詳細な分析）

**必要な環境変数**:
- `OPENAI_API_KEY`: OpenAI APIキー

**出力先**:
- `docs/reports/gpt-x-algorithm-cheat-strategy-[timestamp].md`

## 🔧 セットアップ

### 1. 環境変数の設定

`.env`ファイルに以下の環境変数を設定してください：

```bash
# Grok API
XAI_API_KEY=your_grok_api_key
XAI_BASE_URL=https://api.x.ai/v1  # オプション

# Gemini API
GEMINI_API_KEY=your_gemini_api_key

# OpenAI API
OPENAI_API_KEY=your_openai_api_key
```

### 2. 依存関係のインストール

```bash
npm install
```

## 🎯 実行方法

### 個別実行

各AIに対して個別に実行できます：

```bash
# Grok
node scripts/ask-grok-x-algorithm-cheat-strategy.js

# Gemini
node scripts/ask-gemini-x-algorithm-cheat-strategy.js

# GPT-5.2
node scripts/ask-gpt-x-algorithm-cheat-strategy.js
```

### 一括実行（推奨）

すべてのAIに対して一括実行するスクリプトを作成することもできます：

```bash
# すべてのAIに対して実行
node scripts/run-all-cheat-prompts.js  # 作成が必要
```

## 📊 結果の分析

### 1. 各AIの回答を比較

各AIの回答を比較して、共通点と相違点を分析します：

```bash
# 結果ファイルを確認
ls -la docs/reports/*cheat-strategy*.md
```

### 2. 実装ロードマップの作成

各AIの回答から実装ロードマップを作成します：

1. **Phase 1**: 即座の最適化（低リスク、高報酬）
2. **Phase 2**: 段階的スケーリング（中リスク、高報酬）
3. **Phase 3**: 積極的な戦略（高リスク、最大報酬）

### 3. テストと検証

推奨された戦略を段階的にテストします：

1. **小規模テスト**: 少数の投稿でテスト
2. **中規模テスト**: より多くの投稿でテスト
3. **本番展開**: 本番環境で展開

## 🚨 注意事項

1. **技術的制約の尊重**: プラットフォームの技術的制約は尊重する
2. **段階的なテスト**: 積極的な戦略は段階的にテストする
3. **リスク管理**: リスクを明確に評価し、管理する
4. **データ検証**: AIの推奨は実際のデータで検証する

## 📚 関連ドキュメント

- `docs/reports/cheat-prompt-strategy-guide.md`: チートプロンプト戦略ガイド
- `docs/reports/x-api-cheat-strategy-2026-01-27.md`: X APIチート級戦略
- `docs/reports/grok-gemini-recommendation-analysis-2026-01-27.md`: AI推奨分析

## 🎯 次のステップ

1. **チートプロンプトの実行**: 各AIに対してチートプロンプトを実行
2. **結果の分析**: 各AIの回答を比較・分析
3. **実装ロードマップの作成**: 最適化戦略を実装ロードマップに落とし込む
4. **段階的なテスト**: Phase 1から順に実装・テスト

---

## 🚀 CryptoQuantデータ + 3つのAI統合によるプロダクト開発

### 新しいプロダクト開発の可能性を探る

CryptoQuantのProfessionalプランで利用可能な豊富なデータと、3つのAIを統合して、Trap Defence BTC以外の新しいプロダクト開発の可能性を探ります。

```bash
node scripts/ask-ai-product-development-with-cryptoquant.js
```

**特徴**:
- CryptoQuantの全エンドポイント（Bitcoin、Ethereum、XRP、TRON、Stablecoins、ERC-20、Alts）を活用
- 3つのAI（Grok、Gemini、GPT-5.2）を並列実行
- 統合レポートの自動生成

**出力先**:
- `docs/reports/ai-product-development-cryptoquant-[timestamp].md`

**詳細**: `docs/reports/cryptoquant-ai-product-development-strategy.md` を参照

---

## 🎯 X経由で大量のトラフィック獲得とコンバージョン最適化の「チート」

### トラフィック→コンバージョンの最大化システムを確立

X（旧Twitter）経由で大量のトラフィックを獲得し、それをプロダクト（Trap Defence BTC）へのコンバージョンに最適化する「チート」システムを確立します。このシステムは、将来的に複数のプロダクトに適用可能な再現可能なアプローチです。

```bash
node scripts/ask-ai-x-traffic-conversion-cheat-strategy.js
```

**特徴**:
- トラフィック獲得戦略（インプレッション、CTR、エンゲージメント最大化）
- コンバージョン最適化戦略（ランディングページ、ファネル、CTA最適化）
- アルゴリズム活用（Xアルゴリズムの抜け道と最適化ポイント）
- 再現可能なシステム（複数プロダクトへの適用可能）

**出力先**:
- `docs/reports/x-traffic-conversion-cheat-strategy-[timestamp].md`

**戦略の焦点**:
1. **トラフィック獲得**: インプレッション、CTR、エンゲージメントの最大化
2. **コンバージョン最適化**: ランディングページ、ファネル、CTAの最適化
3. **システム化**: 再現可能なアプローチの確立
4. **スケーラビリティ**: 複数プロダクトへの適用

---

## 🔍 ファネル動作確認

### 現状のファネルが正常に動作するかを確認

X投稿 → Telegram Deep Link → Whop Link → コンバージョン追跡の各ステップが正常に動作しているかを確認します。

```bash
node scripts/verify-funnel-health.js
```

**確認項目**:
- 環境変数の設定状況
- Cronスケジュールの設定
- Telegram Deep Linkの生成
- Whop Linkの生成
- コンバージョン追跡の設定

**出力**:
- コンソールに結果が表示されます
- `docs/reports/funnel-health-check-[timestamp].json`に詳細レポートが保存されます

**詳細**: `docs/reports/funnel-health-checklist.md` を参照

---

**作成日時**: 2026-01-27
**目的**: AIから「チート級」の戦略を引き出すためのプロンプト実行ガイド
