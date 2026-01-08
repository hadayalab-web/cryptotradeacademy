# システム最適化ガイド

## 概要

本ドキュメントは、GPT APIコスト最適化、パフォーマンス向上、エラーハンドリング強化のための環境変数と閾値設定を説明します。

## 環境変数一覧

### GPT API設定

#### `OPENAI_API_KEY` (必須)
- **説明**: OpenAI APIキー
- **デフォルト**: なし（必須）
- **使用箇所**: `services/gpt/client.js`

#### `GPT_MODEL` / `OPENAI_MODEL` (オプション)
- **説明**: 使用するGPTモデル
- **デフォルト**: `gpt-4o-mini`（コスト最適化のため）
- **推奨値**: 
  - 開発/テスト: `gpt-4o-mini`
  - 本番（高精度が必要な場合）: `gpt-4o`
- **使用箇所**: `services/gpt/client.js`

#### `GPT_CACHE_TTL_SECONDS` (オプション)
- **説明**: GPT APIレスポンスのキャッシュTTL（秒）
- **デフォルト**: `900`（15分）
- **推奨値**: 
  - 緊急配信: `900`（15分）
  - 定期配信: `3600`（1時間）
- **使用箇所**: `services/gpt/client.js`

#### `GPT_TIMEOUT_MS` (オプション)
- **説明**: GPT API呼び出しのタイムアウト（ミリ秒）
- **デフォルト**: `25000`（25秒）
- **使用箇所**: `services/gpt/client.js`

### 緊急配信閾値（`api/cron.js`）

これらの閾値を超えた場合のみ、GPT APIを呼び出して緊急シグナルを検出します。これにより、不要なAPI呼び出しを削減し、コストを最適化します。

#### `GPT_THRESHOLD_INFLOW` (オプション)
- **説明**: Exchange Netflow（BTC）の閾値。この値を超えるとGPT解析を実行
- **デフォルト**: `500`
- **単位**: BTC
- **使用箇所**: `api/cron.js`（緊急配信判定）
- **推奨値**: 
  - より多くのシグナル: `300`
  - より厳格な判定: `800`

#### `GPT_THRESHOLD_MPI` (オプション)
- **説明**: Miner Position Indexの閾値。この値を超えるとGPT解析を実行
- **デフォルト**: `1.5`
- **単位**: 無次元
- **使用箇所**: `api/cron.js`（緊急配信判定）
- **推奨値**: 
  - より多くのシグナル: `1.2`
  - より厳格な判定: `2.0`

#### `GPT_THRESHOLD_CHANGE24H` (オプション)
- **説明**: 24時間価格変化率（%）の閾値。この値を超えるとGPT解析を実行
- **デフォルト**: `3.0`
- **単位**: パーセント（例: 3.0 = 3%）
- **使用箇所**: `api/cron.js`（緊急配信判定）
- **推奨値**: 
  - より多くのシグナル: `2.0`
  - より厳格な判定: `5.0`

### 定期配信設定

#### `REGULAR_SCHEDULE` (オプション)
- **説明**: 定期配信の間隔
- **デフォルト**: `4h`（4時間ごと）
- **有効値**: 
  - `4h`: 4時間ごと（0, 4, 8, 12, 16, 20時UTC）
  - `6h`: 6時間ごと（0, 6, 12, 18時UTC）
- **使用箇所**: `api/cron.js`, `api/prepare.js`

#### `LANG` (オプション)
- **説明**: 配信言語
- **デフォルト**: `en`
- **有効値**: `en`, `es`, `pt-br`, `ar`, `ja`, `ko`
- **使用箇所**: 全体的

### 機能フラグ

#### `ENABLE_EVENT_DRIVEN` (オプション)
- **説明**: イベント駆動配信システムの有効化
- **デフォルト**: `false`
- **有効値**: `true` / `false`
- **使用箇所**: `api/cron.js`

#### `ENABLE_GEMINI_IMAGES` (オプション)
- **説明**: Gemini画像生成の有効化
- **デフォルト**: `false`
- **有効値**: `true` / `false`
- **使用箇所**: `api/cron.js`

#### `CRON_SECRET` (オプション)
- **説明**: Vercel Cronジョブの認証用シークレット
- **デフォルト**: なし（認証なし）
- **使用箇所**: `api/cron.js`, `api/prepare.js`

## 最適化のベストプラクティス

### 1. コスト最適化

**推奨設定:**
```env
GPT_MODEL=gpt-4o-mini
GPT_CACHE_TTL_SECONDS=900
GPT_THRESHOLD_INFLOW=500
GPT_THRESHOLD_MPI=1.5
GPT_THRESHOLD_CHANGE24H=3.0
```

**効果:**
- GPT-4o-miniはGPT-4oの約1/10のコスト
- キャッシュにより重複API呼び出しを削減
- 閾値により不要なAPI呼び出しを削減

### 2. パフォーマンス最適化

**推奨設定:**
```env
GPT_CACHE_TTL_SECONDS=900
GPT_TIMEOUT_MS=25000
```

**効果:**
- キャッシュによりレスポンス時間を短縮
- タイムアウトにより長時間待機を防止

### 3. 80%勝率要件の強化

**推奨設定（より厳格な判定）:**
```env
GPT_THRESHOLD_INFLOW=800
GPT_THRESHOLD_MPI=2.0
GPT_THRESHOLD_CHANGE24H=5.0
```

**効果:**
- より高インパクトな状況でのみGPTを呼び出し
- 80%勝率を達成しやすいシグナルのみを生成

### 4. 開発/テスト環境

**推奨設定:**
```env
GPT_MODEL=gpt-4o-mini
GPT_THRESHOLD_INFLOW=300
GPT_THRESHOLD_MPI=1.2
GPT_THRESHOLD_CHANGE24H=2.0
ENABLE_EVENT_DRIVEN=false
ENABLE_GEMINI_IMAGES=false
```

**効果:**
- より多くのシグナルを生成してテスト
- コストを最小化

## メトリクス監視

`utils/metrics.js` により、以下のメトリクスを収集：

- `call`: GPT API呼び出し回数
- `memory_cache_hit`: メモリキャッシュヒット回数
- `kv_cache_hit`: Vercel KVキャッシュヒット回数
- `error`: エラー回数
- `rate_limit_error`: レート制限エラー回数
- `server_error`: サーバーエラー（5xx）回数

これらのメトリクスはVercel KVに保存され、`metrics:gpt:YYYY-MM-DD:HH` 形式のキーでアクセス可能です。

## トラブルシューティング

### GPT APIが頻繁に呼ばれる

**原因**: 閾値が低すぎる

**解決策**: 閾値を上げる
```env
GPT_THRESHOLD_INFLOW=800
GPT_THRESHOLD_MPI=2.0
GPT_THRESHOLD_CHANGE24H=5.0
```

### キャッシュが効いていない

**原因**: `GPT_CACHE_TTL_SECONDS`が短すぎる、またはKVが利用できない

**解決策**: 
- `GPT_CACHE_TTL_SECONDS`を増やす（例: `3600`）
- Vercel KVの設定を確認

### レート制限エラーが多い

**原因**: API呼び出しが多すぎる

**解決策**: 
- 閾値を上げて呼び出し頻度を下げる
- `GPT_MODEL`を`gpt-4o-mini`に変更（レート制限が緩い）

## 関連ファイル

- `services/gpt/client.js`: GPT APIクライアント（キャッシュ、リトライ、メトリクス統合）
- `api/cron.js`: 緊急配信エンドポイント（閾値ベースのGPT呼び出し）
- `api/prepare.js`: 定期配信準備エンドポイント
- `utils/metrics.js`: メトリクス収集
- `utils/logger.js`: 構造化ログ
