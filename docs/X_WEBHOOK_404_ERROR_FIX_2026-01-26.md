# X Webhook 404エラー修正ガイド
**作成日時**: 2026-01-26  
**問題**: CRC Challenge-Response Checkで404エラーが発生

---

## 🔍 問題の原因

X Developer ConsoleでWebhookを作成しようとした際、以下のエラーが発生：

```
Webhookの作成に失敗しました
Received invalid status code from URL during CRC: Got a non-200 status code back: 4xx
Client Error code 404
```

**原因**:
1. **エンドポイントがまだデプロイされていない**
2. **URLが間違っている**（`your-domain`が実際のVercel URLに置き換えられていない）
3. **Vercelのエクスポート形式の問題**

---

## ✅ 修正内容

### 1. エクスポート形式の修正

`api/x-webhook.js`のエクスポート形式を修正しました：

```javascript
// 修正前
module.exports = async function handler(req, res) { ... };

// 修正後
async function handler(req, res) { ... }

module.exports = handler;
module.exports.default = handler; // Vercel/Next.js用
```

### 2. ログの改善

CRC検証時のログを改善し、デバッグしやすくしました。

---

## 🚀 次のステップ

### 1. デプロイの確認

エンドポイントが正しくデプロイされているか確認してください：

```bash
# コミット & プッシュ
git add api/x-webhook.js
git commit -m "Fix X Webhook export format"
git push
```

### 2. 実際のVercel URLを確認

Vercel Dashboardで実際のデプロイメントURLを確認してください：

1. Vercel Dashboardにアクセス
2. プロジェクトを選択
3. **Deployments**タブで最新のデプロイメントを確認
4. **URL**をコピー（例: `https://cryptotradeacademy-xxx.vercel.app`）

### 3. Webhook URLの登録

X Developer Consoleで、**実際のVercel URL**を使用してWebhookを登録してください：

```
https://your-actual-vercel-url.vercel.app/api/x-webhook
```

**注意**: `your-domain`を実際のVercelデプロイメントURLに置き換えてください。

### 4. エンドポイントのテスト

ブラウザまたはcurlでエンドポイントをテストしてください：

```bash
# GETリクエスト（CRCテスト用）
curl "https://your-actual-vercel-url.vercel.app/api/x-webhook?crc_token=test123"
```

**期待されるレスポンス**:
```json
{
  "error": "Missing crc_token parameter"
}
```

または、`crc_token`パラメータがある場合：
```json
{
  "response_token": "sha256=..."
}
```

---

## 🔧 トラブルシューティング

### 問題1: まだ404エラーが発生する

**原因**: エンドポイントがまだデプロイされていない

**解決策**:
1. Vercel Dashboardでデプロイメントが完了しているか確認
2. デプロイメントログでエラーがないか確認
3. 必要に応じて再デプロイ

### 問題2: CRC検証が失敗する

**原因**: `X_API_CONSUMER_KEY_SECRET`が設定されていない

**解決策**:
1. Vercel Dashboard → Settings → Environment Variables
2. `X_API_CONSUMER_KEY_SECRET`を追加
3. 再デプロイ

### 問題3: エンドポイントが認識されない

**原因**: Vercelの設定の問題

**解決策**:
1. `vercel.json`にエンドポイントの設定を追加（必要に応じて）
2. ファイル名が`api/x-webhook.js`であることを確認
3. 関数のエクスポート形式を確認

---

## 📝 確認チェックリスト

- [ ] `api/x-webhook.js`が正しくエクスポートされている
- [ ] Vercelにデプロイされている
- [ ] 実際のVercel URLを確認した
- [ ] `X_API_CONSUMER_KEY_SECRET`が設定されている
- [ ] エンドポイントが`/api/x-webhook`でアクセス可能
- [ ] GETリクエストで400または200が返る（404ではない）

---

**修正完了**: 2026-01-26
