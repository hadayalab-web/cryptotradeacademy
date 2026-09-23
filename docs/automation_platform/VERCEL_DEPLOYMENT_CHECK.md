# Vercelデプロイ確認ガイド

**作成日**: 2026-01-12  
**目的**: EN版LPのVercelデプロイ状況を確認・修正

---

## 🔍 デプロイ状況の確認

### 1. Vercelダッシュボードで確認

1. [Vercel Dashboard](https://vercel.com/dashboard)にアクセス
2. プロジェクト `cryptotradeacademy-lp-en` を選択
3. **Deployments**タブで最新のデプロイ状況を確認

### 2. デプロイエラーの確認

**よくあるエラー**:
- ❌ **Build Error**: ビルドプロセスでエラーが発生
- ❌ **Environment Variables Missing**: 環境変数が設定されていない
- ❌ **Module Not Found**: 依存関係の問題
- ❌ **TypeScript Error**: 型エラー

---

## 🔧 修正手順

### Step 1: ローカルビルドの確認

```powershell
cd hadayalab-website-dev\cryptotradeacademy-lp-dev\cryptotradeacademy-lp-en
npm install
npm run build
```

**期待される結果**: ✅ ビルド成功

### Step 2: vercel.jsonの確認

Next.js 16では、`vercel.json`は基本的に不要です。Next.jsが自動検出します。

**現在の設定**:
```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "outputDirectory": ".next"
}
```

**推奨設定**（Next.js 16用）:
```json
{
  "framework": "nextjs"
}
```

または、`vercel.json`を削除してもOK（Next.jsが自動検出）

### Step 3: 環境変数の確認

Vercel Dashboardで以下の環境変数が設定されているか確認：

**必須環境変数**:
- `NEXT_PUBLIC_APP_URL` (例: `https://cryptotradeacademy-lp-en.vercel.app`)
- `WHOP_API_KEY` (Whop API用)
- `TELEGRAM_BOT_TOKEN_EN` (Telegram Bot用)
- `RESEND_API_KEY` (Resend Email用)
- `OPENAI_API_KEY` (GPT用、オプション)
- `GEMINI_API_KEY` (Gemini用、オプション)
- `XAI_API_KEY` (Grok用、オプション)

**設定方法**:
1. Vercel Dashboard → プロジェクト選択
2. **Settings** → **Environment Variables**
3. 各環境変数を追加（Production, Preview, Development）

### Step 4: デプロイの再実行

```powershell
# Vercel CLIでデプロイ
cd hadayalab-website-dev\cryptotradeacademy-lp-dev\cryptotradeacademy-lp-en
vercel --prod
```

---

## 🐛 よくあるエラーと解決策

### エラー1: "Module not found"

**原因**: 依存関係が不足している

**解決策**:
```powershell
npm install
npm run build
```

### エラー2: "Environment variable not found"

**原因**: 環境変数がVercelに設定されていない

**解決策**:
1. Vercel Dashboardで環境変数を設定
2. デプロイを再実行

### エラー3: "Build failed"

**原因**: TypeScriptエラーやビルドエラー

**解決策**:
```powershell
npm run typecheck  # 型チェック
npm run build      # ビルドテスト
```

### エラー4: "next-i18next not found"

**原因**: `next-i18next`が依存関係に含まれているが、App Routerでは使用不可

**解決策**: 
- `package.json`から`next-i18next`を削除（既に削除済み）
- `tsconfig.json`から`next-i18next`の型定義を削除（既に削除済み）

---

## ✅ デプロイ成功の確認

### 1. デプロイURLにアクセス

```
https://cryptotradeacademy-lp-en.vercel.app
```

### 2. ページの動作確認

- ✅ ホームページが表示される
- ✅ `/en`ルートが動作する
- ✅ VSLが表示される
- ✅ チェックアウトリンクが動作する

### 3. APIエンドポイントの確認

```powershell
# ヘルスチェック
curl https://cryptotradeacademy-lp-en.vercel.app/api/register
```

---

## 📝 次のステップ

1. ✅ ローカルビルドが成功することを確認
2. ✅ Vercel Dashboardで環境変数を設定
3. ✅ `vercel.json`を最適化（または削除）
4. ✅ デプロイを再実行
5. ✅ デプロイURLで動作確認

---

**最終更新**: 2026-01-12  
**状態**: 🔄 確認中
