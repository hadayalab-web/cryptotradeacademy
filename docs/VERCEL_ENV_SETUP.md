# Vercel環境変数設定ガイド

**作成日**: 2026-01-07  
**目的**: Gemini API統合のためのVercel環境変数設定手順

---

## 🔑 設定が必要な環境変数

### 新規追加が必要

| 変数名 | 値 | 説明 | 環境 |
|--------|-----|------|------|
| `GEMINI_API_KEY` | `AIzaSyBeKmuRBImr1ZYtQMsOqpU-cqkdzQh3fig` | Gemini APIキー（画像・動画生成用） | Production, Preview, Development |

### 既存の環境変数（確認のみ）

以下の環境変数が既に設定されていることを確認してください：

- `CRYPTOQUANT_API_KEY`
- `GROK_API_KEY` または `XAI_API_KEY`
- `OPENAI_API_KEY`（GPT API用）
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `CRON_SECRET`
- Vercel KV関連（`KV_URL`, `KV_REST_API_URL`, `KV_REST_API_TOKEN` など）

### GPT API最適化設定（オプション）

コスト最適化とパフォーマンス向上のため、以下の環境変数を設定できます：

| 変数名 | デフォルト | 説明 |
|--------|-----------|------|
| `GPT_MODEL` | `gpt-4o-mini` | 使用するGPTモデル（コスト最適化のため） |
| `GPT_CACHE_TTL_SECONDS` | `900` | キャッシュTTL（秒） |
| `GPT_TIMEOUT_MS` | `25000` | API呼び出しタイムアウト（ミリ秒） |
| `GPT_THRESHOLD_INFLOW` | `500` | Exchange Netflow閾値（BTC） |
| `GPT_THRESHOLD_MPI` | `1.5` | Miner Position Index閾値 |
| `GPT_THRESHOLD_CHANGE24H` | `3.0` | 24時間価格変化率閾値（%） |

詳細は [システム最適化ガイド](./OPTIMIZATION_GUIDE.md) を参照してください。

---

## 📋 設定手順

### 1. Vercel Dashboardにアクセス

1. [Vercel Dashboard](https://vercel.com/dashboard) にログイン
2. プロジェクトを選択（例: `cryptotradeacademy-en`）

### 2. 環境変数を追加

1. **Project Settings** → **Environment Variables** を開く
2. **Add New** をクリック
3. 以下の値を入力：
   - **Key**: `GEMINI_API_KEY`
   - **Value**: `AIzaSyBeKmuRBImr1ZYtQMsOqpU-cqkdzQh3fig`
   - **Environment**: 
     - ✅ Production
     - ✅ Preview
     - ✅ Development
4. **Save** をクリック

### 3. デプロイの確認

Git経由で自動デプロイされている場合：

1. 最新のコミットがデプロイされていることを確認
2. デプロイログでエラーがないことを確認
3. 環境変数が正しく読み込まれていることを確認

---

## 🧪 デプロイ後の動作確認

### 1. Prepare APIのテスト

```bash
# デバッグモードで実行（認証バイパス）
curl "https://your-project.vercel.app/api/prepare?debug=local"
```

**期待されるレスポンス**:
```json
{
  "success": true,
  "message": "Content prepared successfully",
  "content": {
    "imageGenerated": true,
    "videoGenerated": true,
    "summaryGenerated": true
  }
}
```

### 2. Cron APIのテスト

```bash
# デバッグモードで実行（認証バイパス）
curl "https://your-project.vercel.app/api/cron?debug=local"
```

**期待される動作**:
- 保存されたコンテンツを取得
- 動画をTelegramに送信（`savedVideoUrl`がある場合）
- 画像をTelegramに送信（`imageUrl`がある場合）
- テキストメッセージをTelegramに送信

### 3. ログの確認

Vercel Dashboard → **Deployments** → 最新のデプロイ → **Functions** → `/api/prepare` または `/api/cron` のログを確認

**確認ポイント**:
- `[Gemini ImageGenerator] Image generated successfully` - 画像生成成功
- `[Gemini VideoGenerator] Video generation completed` - 動画生成成功
- `📸 Telegram photo sent: Success` - 画像送信成功
- `🎥 Telegram video sent: Success` - 動画送信成功

---

## ⚠️ トラブルシューティング

### エラー: `GEMINI_API_KEY not set`

**原因**: 環境変数が設定されていない、またはデプロイ後に反映されていない

**解決方法**:
1. Vercel Dashboardで環境変数が正しく設定されているか確認
2. 環境変数を再保存（保存後に再デプロイが自動実行される）
3. デプロイログで環境変数が読み込まれているか確認

### エラー: `429 Too Many Requests - Quota exceeded`

**原因**: Gemini APIの無料枠を超過

**解決方法**:
1. [Google AI Studio](https://makersuite.google.com/app/apikey) でAPIキーの使用量を確認
2. 必要に応じて有料プランにアップグレード
3. レート制限を考慮したリトライロジックを実装（将来の改善）

### エラー: `Video generation timeout`

**原因**: 動画生成が10分以内に完了しない

**解決方法**:
1. これは正常な動作（動画生成は時間がかかる）
2. `api/prepare.js` は定時5分前に実行されるため、動画が完了しない場合は次回の配信で使用される
3. ポーリングの最大試行回数（60回）と間隔（10秒）は適切に設定済み

### エラー: `Invalid Data URL format`

**原因**: Telegram送信時のData URLパースエラー

**解決方法**:
1. `services/telegram/bot.js` のData URL処理ロジックを確認
2. Gemini APIのレスポンス形式を確認
3. エラーログを確認して原因を特定

---

## 📚 関連ドキュメント

- [修正レポート](./GEMINI_IMPLEMENTATION_FIXES.md)
- [実装ステータス](./GEMINI_IMPLEMENTATION_STATUS.md)
- [デプロイ準備ガイド](./GEMINI_READY_FOR_DEPLOYMENT.md)
- [システム最適化ガイド](./OPTIMIZATION_GUIDE.md) - GPT APIコスト最適化とパフォーマンス設定
- [80%勝率検証方法](./BACKTEST_80_PERCENT_WIN_RATE_VERIFICATION.md) - SELL/SHORTシグナルのバックテスト方法

---

## 🎯 チェックリスト

- [ ] Vercel Dashboardで `GEMINI_API_KEY` を追加
- [ ] すべての環境（Production, Preview, Development）に設定
- [ ] デプロイが完了するまで待機
- [ ] Prepare APIをテスト（`?debug=local`）
- [ ] Cron APIをテスト（`?debug=local`）
- [ ] Telegramで画像・動画が配信されることを確認
- [ ] ログでエラーがないことを確認
