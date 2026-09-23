# Vercelデプロイエラー修正ガイド

**作成日**: 2026-01-12  
**目的**: Vercelデプロイエラーの修正

---

## 🔧 実施した修正

### 1. `next.config.ts`の修正

**問題**: 絶対パス（`C:/Users/chiba/hadayalab-automation-platform/.env`）がハードコードされており、Vercelのビルド環境でエラーが発生

**修正内容**:
- ✅ 絶対パスを削除
- ✅ Vercel環境（`process.env.VERCEL === '1'`）では.env読み込みをスキップ
- ✅ ローカル開発環境でのみ.envファイルを読み込む

**変更前**:
```typescript
const envFiles = [
  // ...
  'C:/Users/chiba/hadayalab-automation-platform/.env', // ❌ 絶対パス
];
```

**変更後**:
```typescript
// Vercel環境では環境変数が自動的に設定されるため、スキップ
if (typeof window === 'undefined' && process.env.VERCEL !== '1') {
  // ローカル開発環境でのみ.envファイルを読み込む
}
```

---

## 🐛 よくあるVercelデプロイエラー

### エラー1: "Module not found"

**原因**: 依存関係が不足している

**解決策**:
```powershell
cd hadayalab-website-dev\cryptotradeacademy-lp-dev\cryptotradeacademy-lp-en
npm install
npm run build
```

### エラー2: "Environment variable not found"

**原因**: 環境変数がVercelに設定されていない

**解決策**:
1. Vercel Dashboard → プロジェクト選択
2. **Settings** → **Environment Variables**
3. 必要な環境変数を追加

**必須環境変数**:
- `NEXT_PUBLIC_APP_URL`
- `WHOP_API_KEY`
- `TELEGRAM_BOT_TOKEN_EN`
- `RESEND_API_KEY`

### エラー3: "Build failed - TypeScript error"

**原因**: TypeScriptの型エラー

**解決策**:
```powershell
npm run typecheck
npm run build
```

### エラー4: "Cannot find module '../config/marketProfiles'"

**原因**: ファイルパスの問題

**解決策**: 相対パスを確認し、正しいパスに修正

---

## ✅ デプロイ前チェックリスト

### コード確認
- [x] `next.config.ts`から絶対パスを削除
- [x] ローカルビルドが成功することを確認
- [x] TypeScriptエラーがないことを確認

### 環境変数確認
- [ ] Vercel Dashboardで環境変数が設定されている
- [ ] `NEXT_PUBLIC_APP_URL`が設定されている
- [ ] APIキーが設定されている

### デプロイ確認
- [ ] デプロイを再実行
- [ ] ビルドログを確認
- [ ] デプロイURLで動作確認

---

## 🚀 デプロイ手順

### 1. 変更をコミット・プッシュ

```powershell
cd hadayalab-website-dev\cryptotradeacademy-lp-dev\cryptotradeacademy-lp-en
git add .
git commit -m "fix: Remove absolute path from next.config.ts for Vercel deployment"
git push
```

### 2. Vercelで自動デプロイを確認

GitHubにプッシュすると、Vercelが自動的にデプロイを開始します。

### 3. ビルドログを確認

Vercel Dashboardでビルドログを確認し、エラーがないか確認します。

---

## 📝 次のステップ

1. ✅ `next.config.ts`の修正をコミット・プッシュ
2. ✅ Vercel Dashboardでビルドログを確認
3. ✅ エラーがあれば、ログを確認して修正
4. ✅ デプロイ成功を確認

---

**最終更新**: 2026-01-12  
**状態**: ✅ 修正完了
