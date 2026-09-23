# Vercel環境変数 - アフィリエイター募集自動化ワークフロー

**作成日**: 2026-01-09  
**目的**: Vercelに設定が必要な環境変数の完全リスト

---

## 🔑 必須環境変数

### 1. AI API Keys（検索・DM生成用）

```env
# Grok API（アフィリエイター候補検索用 - grok-3-mini）
XAI_API_KEY=xai_xxx

# OpenAI API（DM生成用 - gpt-4o）
OPENAI_API_KEY=sk-xxx
```

### 2. Whop API（プロダクト情報取得用）

```env
WHOP_API_KEY=whop_xxx
```

### 3. Telegram Bot Tokens（DM送信用 - 6言語対応）

```env
# デフォルト（フォールバック用）
TELEGRAM_BOT_TOKEN=xxx

# 各言語用
TELEGRAM_BOT_TOKEN_EN=xxx
TELEGRAM_BOT_TOKEN_AR=xxx
TELEGRAM_BOT_TOKEN_KO=xxx
TELEGRAM_BOT_TOKEN_JA=xxx
TELEGRAM_BOT_TOKEN_ES=xxx
TELEGRAM_BOT_TOKEN_PT_BR=xxx
```

### 4. Resend API（Email送信用）

```env
RESEND_API_KEY=re_xxx
```

### 5. App URL（ワークフロー内部呼び出し用）

```env
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

---

## 📋 環境変数一覧表

| 変数名 | 用途 | 必須 | 環境 |
|--------|------|------|------|
| `XAI_API_KEY` | Grok API（候補検索） | ✅ | Production, Preview, Development |
| `OPENAI_API_KEY` | OpenAI API（DM生成） | ✅ | Production, Preview, Development |
| `WHOP_API_KEY` | Whop API（プロダクト情報） | ✅ | Production, Preview, Development |
| `TELEGRAM_BOT_TOKEN` | Telegram Bot（デフォルト） | ⚠️ | Production, Preview, Development |
| `TELEGRAM_BOT_TOKEN_EN` | Telegram Bot（英語） | ✅ | Production, Preview, Development |
| `TELEGRAM_BOT_TOKEN_AR` | Telegram Bot（アラビア語） | ✅ | Production, Preview, Development |
| `TELEGRAM_BOT_TOKEN_KO` | Telegram Bot（韓国語） | ✅ | Production, Preview, Development |
| `TELEGRAM_BOT_TOKEN_JA` | Telegram Bot（日本語） | ✅ | Production, Preview, Development |
| `TELEGRAM_BOT_TOKEN_ES` | Telegram Bot（スペイン語） | ✅ | Production, Preview, Development |
| `TELEGRAM_BOT_TOKEN_PT_BR` | Telegram Bot（ポルトガル語） | ✅ | Production, Preview, Development |
| `RESEND_API_KEY` | Resend API（Email送信） | ✅ | Production, Preview, Development |
| `NEXT_PUBLIC_APP_URL` | アプリURL | ✅ | Production, Preview, Development |

---

## 🎯 合計: 12個の環境変数

### 必須（11個）
1. `XAI_API_KEY`
2. `OPENAI_API_KEY`
3. `WHOP_API_KEY`
4. `TELEGRAM_BOT_TOKEN_EN`
5. `TELEGRAM_BOT_TOKEN_AR`
6. `TELEGRAM_BOT_TOKEN_KO`
7. `TELEGRAM_BOT_TOKEN_JA`
8. `TELEGRAM_BOT_TOKEN_ES`
9. `TELEGRAM_BOT_TOKEN_PT_BR`
10. `RESEND_API_KEY`
11. `NEXT_PUBLIC_APP_URL`

### オプション（1個）
12. `TELEGRAM_BOT_TOKEN`（フォールバック用、各言語用が設定されていれば不要）

---

## 📝 設定方法

### 方法1: Vercel CLI（推奨）

```powershell
# プロジェクトにリンク
vercel link

# 環境変数を追加（各環境に設定）
vercel env add XAI_API_KEY production
vercel env add XAI_API_KEY preview
vercel env add XAI_API_KEY development

# 同様に他の環境変数も設定
vercel env add OPENAI_API_KEY production
vercel env add OPENAI_API_KEY preview
vercel env add OPENAI_API_KEY development

# ... 以下同様
```

### 方法2: Vercel Dashboard（手動）

1. Vercel Dashboard → プロジェクト選択
2. **Settings** → **Environment Variables**
3. **Add New** をクリック
4. KeyとValueを入力
5. 適用環境を選択（Production, Preview, Development）
6. **Save** をクリック

### 方法3: Pythonスクリプト（一括設定）

```powershell
# vercel_control.pyを使用
python scripts/vercel_control.py env create `
  --project-id "prj_xxxxx" `
  --key "XAI_API_KEY" `
  --value "xai_xxx" `
  --target production preview development
```

---

## ✅ 設定確認

### Vercel CLIで確認

```powershell
# 環境変数一覧を表示
vercel env ls production
vercel env ls preview
vercel env ls development
```

### コードで確認

デプロイ後、以下のエンドポイントで動作確認：

```bash
# 環境変数チェック用エンドポイント（作成が必要）
GET /api/health/env-check
```

---

## 🔐 セキュリティ注意事項

1. **環境変数は暗号化される**: Vercelは自動的に暗号化して保存
2. **本番環境のみ設定**: 必要に応じて環境を分ける
3. **定期的なローテーション**: APIキーは定期的に更新推奨
4. **Gitにコミットしない**: `.env`ファイルは`.gitignore`に追加済み

---

## 📚 関連ドキュメント

- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [アフィリエイター募集自動化ワークフロー](./AFFILIATE_WORKFLOW_DEPLOYMENT_STATUS.md)
