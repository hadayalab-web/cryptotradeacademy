# Gemini API統合 - デプロイチェックリスト
**最終更新**: 2026-01-17 14:07:03  
**作成日時**: 2026-01-17 14:07:03  

**作成日**: 2026-01-17
**ステータス**: ✅ コード実装完了、⏳ 環境変数設定待ち

---

## ✅ 完了済み

- [x] 認証方法の修正（`x-goog-api-key` ヘッダー）
- [x] リクエスト形式の修正（`responseModalities: ['IMAGE']`, `['VIDEO']`）
- [x] Telegram BotのData URLサポート
- [x] テストスクリプト作成
- [x] ドキュメント作成
- [x] Gitコミット・プッシュ（自動デプロイ）

---

## ⏳ 残りのタスク

### 1. Vercel環境変数の設定

**手順**:
1. [Vercel Dashboard](https://vercel.com/dashboard) にアクセス
2. プロジェクトを選択
3. **Settings** → **Environment Variables**
4. 以下を追加：
   - **Key**: `GEMINI_API_KEY`
   - **Value**: `AIzaSyBeKmuRBImr1ZYtQMsOqpU-cqkdzQh3fig`
   - **Environment**: Production, Preview, Development（すべてにチェック）
5. **Save** をクリック

**注意**: 環境変数を追加すると、自動的に再デプロイが実行されます。

### 2. デプロイ完了の確認

1. Vercel Dashboard → **Deployments** で最新のデプロイを確認
2. ステータスが **Ready** になるまで待機（通常1-2分）

### 3. 動作確認

#### 3-1. Prepare APIのテスト

```bash
curl "https://your-project.vercel.app/api/prepare?debug=local"
```

**期待されるレスポンス**:
```json
{
  "success": true,
  "content": {
    "imageGenerated": true,
    "videoGenerated": true,
    "summaryGenerated": true
  }
}
```

#### 3-2. Cron APIのテスト

```bash
curl "https://your-project.vercel.app/api/cron?debug=local"
```

**期待される動作**:
- Telegramに動画が送信される（`savedVideoUrl`がある場合）
- Telegramに画像が送信される（`imageUrl`がある場合）
- Telegramにテキストメッセージが送信される

#### 3-3. ログの確認

Vercel Dashboard → **Deployments** → 最新のデプロイ → **Functions** → ログを確認

**確認ポイント**:
- `[Gemini ImageGenerator] Image generated successfully` ✅
- `[Gemini VideoGenerator] Video generation completed` ✅
- `📸 Telegram photo sent: Success` ✅
- `🎥 Telegram video sent: Success` ✅

---

## 🚨 エラー時の対処

### エラー: `GEMINI_API_KEY not set`

**対処**:
1. Vercel Dashboardで環境変数が正しく設定されているか確認
2. 環境変数を再保存（再デプロイが自動実行される）
3. デプロイログで環境変数が読み込まれているか確認

### エラー: `429 Too Many Requests`

**対処**:
1. [Google AI Studio](https://makersuite.google.com/app/apikey) で使用量を確認
2. 必要に応じて有料プランにアップグレード

### エラー: `Video generation timeout`

**対処**:
1. これは正常（動画生成は最大10分かかる）
2. 次回の定時配信で使用される

---

## 📚 関連ドキュメント

- [Vercel環境変数設定ガイド](./VERCEL_ENV_SETUP.md)
- [修正レポート](./GEMINI_IMPLEMENTATION_FIXES.md)
- [実装ステータス](./GEMINI_IMPLEMENTATION_STATUS.md)
- [デプロイ準備ガイド](./GEMINI_READY_FOR_DEPLOYMENT.md)
