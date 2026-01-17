# Vercel APIトークンの取得方法
**作成日時**: 2026-01-17 14:07:03  
**作成日**: 2026-01-17  

**目的**: Vercel API経由でデプロイメント状況を確認するため

---

## 📋 手順

### 1. Vercel Dashboardでトークンを生成

1. **Vercel Dashboardにアクセス**: https://vercel.com/dashboard
2. **Settings → Tokens** に移動
3. **「Create Token」** をクリック
4. トークン名を入力（例: `Deployment Check`）
5. **「Create」** をクリック
6. **生成されたトークンをコピー**（この画面を離れると再表示できません）

---

### 2. .envファイルに設定

`.env` ファイルに以下を追加：

```bash
VERCEL_TOKEN=your-vercel-api-token-here
```

**注意**: `.env` ファイルは `.gitignore` に含まれていることを確認してください。

---

### 3. 確認スクリプトを実行

```bash
node scripts/check-vercel-api.js
```

または

```bash
npm run verify:deployment
```

---

## 🔍 確認できる情報

- ✅ プロジェクト情報（名前、ID）
- ✅ 最新のデプロイメント（URL、状態、作成日時）
- ✅ 環境変数の設定状況
- ✅ Cronジョブの設定
- ✅ VSL APIエンドポイントの動作確認

---

## ⚠️ 注意事項

- **トークンは機密情報です**。絶対に公開リポジトリにコミットしないでください
- トークンには読み取り権限があれば十分です（書き込み権限は不要）
- トークンが漏洩した場合は、Vercel Dashboardから削除して新しいトークンを生成してください

---

**作成者**: COO（Cursor/Composer 1）  
**最終更新**: 2026-01-17 14:07:03
