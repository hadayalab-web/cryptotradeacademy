# ローカル環境変数設定ガイド

**作成日**: 2026-01-07  
**目的**: ローカル開発環境でのGemini API統合のための環境変数設定

---

## 📍 `.env`ファイルの場所

プロジェクトルート（`cryptosignal-ai`）ではなく、親ディレクトリ（`hadayalab-automation-platform`）に`.env`ファイルがある場合：

```
C:\Users\chiba\hadayalab-automation-platform\.env
```

**注意**: プロジェクト内の`.env.local`も使用可能です（優先順位は`.env.local` > `.env`）

---

## 🔑 設定が必要な環境変数

### 新規追加が必要

```bash
GEMINI_API_KEY=AIzaSyBeKmuRBImr1ZYtQMsOqpU-cqkdzQh3fig
```

### 既存の環境変数（確認のみ）

以下の環境変数が既に設定されていることを確認してください：

- `CRYPTOQUANT_API_KEY`
- `XAI_API_KEY` または `GROK_API_KEY`
- `OPENAI_API_KEY`（GPT API用）
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `CRON_SECRET`
- Vercel KV関連（`KV_URL`, `KV_REST_API_URL`, `KV_REST_API_TOKEN` など）

### GPT API最適化設定（オプション）

コスト最適化とパフォーマンス向上のため、以下の環境変数を設定できます：

```bash
# GPT API設定
GPT_MODEL=gpt-4o-mini                    # デフォルト: gpt-4o-mini（コスト最適化）
GPT_CACHE_TTL_SECONDS=900                # デフォルト: 900（15分）
GPT_TIMEOUT_MS=25000                     # デフォルト: 25000（25秒）

# 緊急配信閾値（api/cron.js）
GPT_THRESHOLD_INFLOW=500                 # デフォルト: 500（BTC）
GPT_THRESHOLD_MPI=1.5                     # デフォルト: 1.5
GPT_THRESHOLD_CHANGE24H=3.0               # デフォルト: 3.0（%）

# 定期配信設定
REGULAR_SCHEDULE=4h                       # デフォルト: 4h（4時間ごと）
LANG=en                                    # デフォルト: en
```

詳細は [システム最適化ガイド](./OPTIMIZATION_GUIDE.md) を参照してください。

---

## 📋 設定手順

### 方法1: 親ディレクトリの`.env`に追加（推奨）

1. `C:\Users\chiba\hadayalab-automation-platform\.env` を開く
2. 以下の行を追加：

```bash
# ============================================
# Gemini AI設定
# ============================================
# Gemini API キー（画像・動画生成用）
GEMINI_API_KEY=AIzaSyBeKmuRBImr1ZYtQMsOqpU-cqkdzQh3fig
```

3. ファイルを保存

### 方法2: プロジェクト内の`.env.local`に追加

1. `cryptosignal-ai`ディレクトリ内に`.env.local`を作成（存在しない場合）
2. 以下の内容を追加：

```bash
GEMINI_API_KEY=AIzaSyBeKmuRBImr1ZYtQMsOqpU-cqkdzQh3fig
```

3. ファイルを保存

**注意**: `.env.local`は`.gitignore`に含まれているため、Gitにコミットされません。

---

## 🧪 動作確認

### 1. 環境変数の確認

```bash
# PowerShell
$env:GEMINI_API_KEY

# または、Node.jsスクリプトで確認
node -e "console.log(process.env.GEMINI_API_KEY ? '✅ Set' : '❌ Not set')"
```

### 2. テストスクリプトの実行

```bash
# プロジェクトディレクトリに移動
cd cryptosignal-ai

# 画像生成のみテスト
npm run test:gemini

# すべてのテスト（画像 + 動画 + Telegram）
npm run test:gemini:full
```

---

## ⚠️ 注意事項

### 1. 環境変数の読み込み順序

Node.jsの`dotenv`パッケージを使用している場合、以下の順序で読み込まれます：

1. `.env.local`（最優先）
2. `.env`
3. システム環境変数

### 2. `.env`ファイルの場所

- **親ディレクトリ**: `C:\Users\chiba\hadayalab-automation-platform\.env`
  - 複数のプロジェクトで共有される環境変数
- **プロジェクト内**: `cryptosignal-ai\.env.local`
  - このプロジェクト専用の環境変数

### 3. セキュリティ

- ⚠️ `.env`ファイルは絶対にGitリポジトリにコミットしない
- ✅ `.env.local`は`.gitignore`に含まれていることを確認
- ✅ `.env.example`には実際のAPIキーを含めない（プレースホルダーのみ）

---

## 🔍 トラブルシューティング

### エラー: `GEMINI_API_KEY not set`

**原因**: 環境変数が読み込まれていない

**解決方法**:
1. `.env`または`.env.local`ファイルが正しい場所にあるか確認
2. ファイルに`GEMINI_API_KEY=...`が正しく記述されているか確認
3. プロセスを再起動（環境変数の変更を反映）

### エラー: `Cannot find module 'dotenv'`

**原因**: `dotenv`パッケージがインストールされていない

**解決方法**:
```bash
npm install dotenv
```

### エラー: 環境変数が読み込まれない

**原因**: `dotenv`の設定パスが間違っている

**解決方法**:
- `require('dotenv').config({ path: '.env.local' })` を使用
- または、親ディレクトリの`.env`を使用する場合は、パスを調整

---

## 📚 関連ドキュメント

- [Vercel環境変数設定ガイド](./VERCEL_ENV_SETUP.md)
- [デプロイチェックリスト](./DEPLOYMENT_CHECKLIST.md)
- [修正レポート](./GEMINI_IMPLEMENTATION_FIXES.md)
- [システム最適化ガイド](./OPTIMIZATION_GUIDE.md) - GPT APIコスト最適化とパフォーマンス設定
- [80%勝率検証方法](./BACKTEST_80_PERCENT_WIN_RATE_VERIFICATION.md) - SELL/SHORTシグナルのバックテスト方法