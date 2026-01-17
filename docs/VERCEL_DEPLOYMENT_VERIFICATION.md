# Vercelデプロイメント確認ガイド

**作成日**: 2026-01-17  
**目的**: デプロイ後のVSLワークフロー動作確認

---

## ✅ デプロイ完了後の確認チェックリスト

### 1. デプロイメントの状態確認

**Vercel Dashboard → プロジェクト → Deployments**

- [ ] 最新のデプロイメントが **「Ready」** 状態になっている
- [ ] デプロイメントをクリックして、ビルドログにエラーがないか確認
- [ ] デプロイメントURLをメモ（例: `https://your-project.vercel.app`）

**確認ポイント**:
- ✅ ビルドが成功している
- ✅ エラーや警告がない
- ✅ デプロイメント時刻が最新

---

### 2. 環境変数の確認

**Vercel Dashboard → プロジェクト → Settings → Environment Variables**

以下の環境変数が **Production環境** に設定されているか確認：

#### 必須環境変数

- [ ] `TELEGRAM_BOT_TOKEN` - Telegram Bot Token
- [ ] `TELEGRAM_BOT_USERNAME` - Botのユーザー名（例: `TrapDefenceBot`）
- [ ] `X_API_CONSUMER_KEY` - X API Consumer Key
- [ ] `X_API_CONSUMER_KEY_SECRET` - X API Consumer Secret
- [ ] `X_API_ACCESS_TOKEN` - X API Access Token
- [ ] `X_API_ACCESS_TOKEN_SECRET` - X API Access Token Secret
- [ ] `XAI_API_KEY` - Grok API Key
- [ ] `WHOP_API_KEY` - Whop API Key
- [ ] `VSL1_YOUTUBE_LINK` - VSL1 YouTube Link
- [ ] `VSL2_YOUTUBE_LINK` - VSL2 YouTube Link

#### 推奨環境変数

- [ ] `X_POSTING_ENABLED=true` - X投稿機能を有効化
- [ ] `X_POSTING_DRY_RUN=false` - 本番環境では false
- [ ] `CRON_SECRET` - Cronエンドポイントのセキュリティ（必須）
- [ ] `KV_REST_API_URL` - Vercel KV URL（推奨）
- [ ] `KV_REST_API_TOKEN` - Vercel KV Token（推奨）
- [ ] `WHOP_PROMO_CODE_ID` - プロモコード監視用（オプション）
- [ ] `WHOP_PROMO_CODE=DEFEND50` - プロモコード（デフォルト値あり）

**確認ポイント**:
- ✅ すべての環境変数が **Production** 環境に設定されている
- ✅ 環境変数の値が正しい（タイポがない）
- ✅ `CRON_SECRET` が設定されている（セキュリティ）

---

### 3. Cronジョブの確認

**Vercel Dashboard → プロジェクト → Settings → Cron Jobs**

以下のCronジョブが設定されているか確認：

- [ ] `/api/vsl1-post` - スケジュール: `0 9,21 * * *` (1日2回: 9時、21時 UTC)
- [ ] `/api/vsl2-free-users` - スケジュール: `0 * * * *` (1時間ごと)
- [ ] `/api/vsl1-reminder` - スケジュール: `0 */12 * * *` (12時間ごと)
- [ ] `/api/vsl2-last-call` - スケジュール: `0 * * * *` (1時間ごと)
- [ ] `/api/promo-stock-monitor` - スケジュール: `*/15 * * * *` (15分ごと)

**確認ポイント**:
- ✅ すべてのCronジョブが表示されている
- ✅ スケジュールが正しい
- ✅ ステータスが「Active」になっている

**注意**: Cronジョブが表示されない場合、`vercel.json` が正しくデプロイされているか確認してください。

---

### 4. Functions（APIエンドポイント）の確認

**Vercel Dashboard → プロジェクト → Functions**

以下のAPIエンドポイントが表示されているか確認：

- [ ] `/api/vsl1-post`
- [ ] `/api/vsl2-free-users`
- [ ] `/api/vsl1-reminder`
- [ ] `/api/vsl2-last-call`
- [ ] `/api/promo-stock-monitor`

**手動実行テスト**:

各エンドポイントをクリックして、「Invoke」ボタンで手動実行：

1. **VSL1投稿テスト**:
   - `/api/vsl1-post` をクリック
   - 「Invoke」ボタンをクリック
   - レスポンスを確認（`success: true` が返ることを確認）
   - **注意**: `X_POSTING_DRY_RUN=false` の場合、実際にXに投稿されます

2. **VSL2配信テスト**:
   - `/api/vsl2-free-users` をクリック
   - 「Invoke」ボタンをクリック
   - レスポンスを確認（ユーザーがいない場合は `sent: 0` が返る）

**確認ポイント**:
- ✅ すべてのエンドポイントが表示されている
- ✅ エンドポイントをクリックして詳細が表示される
- ✅ 「Invoke」ボタンで手動実行できる
- ✅ エラーが発生しない

---

### 5. ログの確認

**Vercel Dashboard → プロジェクト → Logs**

リアルタイムログで以下を確認：

- [ ] エラーがないか確認
- [ ] Cronジョブ実行時のログを確認
- [ ] APIエンドポイント実行時のログを確認

**確認ポイント**:
- ✅ エラーログがない
- ✅ Cronジョブが正常に実行されている
- ✅ APIエンドポイントが正常に動作している

**ログの見方**:
- `✅` マーク: 成功
- `❌` マーク: エラー
- `ℹ️` マーク: 情報

---

### 6. 実際の動作確認

#### 6.1 VSL1投稿の確認

**手動実行**:
1. Vercel Dashboard → Functions → `/api/vsl1-post` → 「Invoke」
2. または、ブラウザで `https://your-project.vercel.app/api/vsl1-post` にアクセス（CRON_SECRETが必要）

**確認項目**:
- [ ] Telegram MINIMALチャンネルにVSL1が投稿された
- [ ] X（Twitter）にVSL1が投稿された（`X_POSTING_DRY_RUN=false` の場合）
- [ ] レスポンスに `success: true` が返る

#### 6.2 VSL2配信の確認

**前提条件**: 24時間以上前に `/start` コマンドでBotに登録したユーザーが存在する必要があります

**手動実行**:
1. Vercel Dashboard → Functions → `/api/vsl2-free-users` → 「Invoke」

**確認項目**:
- [ ] 対象ユーザーにVSL2が送信された
- [ ] レスポンスに `sent: 1` などが返る

#### 6.3 プロモコード監視の確認

**手動実行**:
1. Vercel Dashboard → Functions → `/api/promo-stock-monitor` → 「Invoke」

**確認項目**:
- [ ] Whop APIからプロモコード情報が取得できた
- [ ] レスポンスに `remainingStock` が含まれる

---

## 🐛 トラブルシューティング

### Cronジョブが実行されない

**原因**:
- `vercel.json` が正しくデプロイされていない
- Cronジョブのスケジュールが間違っている

**解決方法**:
1. `vercel.json` の内容を確認
2. デプロイを再実行
3. Vercel Dashboard → Settings → Cron Jobs で確認

### APIエンドポイントが404エラーを返す

**原因**:
- ファイルパスが間違っている
- デプロイが失敗している

**解決方法**:
1. `api/` ディレクトリ内のファイルが正しいか確認
2. デプロイを再実行
3. Vercel Dashboard → Functions でエンドポイントが表示されているか確認

### 環境変数が読み込まれない

**原因**:
- 環境変数が Production 環境に設定されていない
- 環境変数名が間違っている

**解決方法**:
1. Vercel Dashboard → Settings → Environment Variables で確認
2. 環境変数が **Production** 環境に設定されているか確認
3. 環境変数名にタイポがないか確認

### CRON_SECRETエラーが発生する

**原因**:
- `CRON_SECRET` が設定されていない
- `CRON_SECRET` の値が間違っている

**解決方法**:
1. Vercel Dashboard → Settings → Environment Variables で `CRON_SECRET` を設定
2. 手動実行時は、リクエストヘッダーに `Authorization: Bearer <CRON_SECRET>` を追加

---

## 📊 確認完了後の次のステップ

1. **Cronジョブの初回実行を待つ**:
   - VSL1投稿: 次回の9時または21時（UTC）に自動実行
   - VSL2配信: 次回の正時（例: 10:00, 11:00）に自動実行

2. **ログを監視**:
   - Vercel Dashboard → Logs でリアルタイムログを確認
   - エラーがないか確認

3. **実際の動作を確認**:
   - Telegram Botで `/start` コマンドを実行
   - 24時間後にVSL2が自動送信されるか確認

---

## 📞 サポート

問題が発生した場合：

1. Vercel Dashboard → Logs でエラーログを確認
2. `node scripts/check-vsl-workflow-setup.js` を実行して環境変数を確認
3. Vercel Dashboard → Functions でエンドポイントを手動実行してテスト

---

**作成者**: COO（Cursor/Composer 1）  
**最終更新**: 2026-01-17
