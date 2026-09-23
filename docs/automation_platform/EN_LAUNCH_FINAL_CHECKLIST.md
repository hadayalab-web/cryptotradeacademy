# EN版発信 - 最終チェックリスト

**作成日**: 2026-01-15  
**発信予定**: 2026-01-16（明日）

---

## ✅ コード実装（完了）

- [x] Bot参加時のユーザー登録（`/start minimal`）
- [x] VSL1自動投稿（`/api/vsl1-post.js`）
- [x] VSL2無料版ユーザー配信（`/api/vsl2-free-users.js`）
- [x] 無料版ユーザー管理システム
- [x] Telegram Webhook

---

## 🔧 CEO対応（必須）

### 1. 環境変数設定（Vercel Dashboard）

```env
# VSL YouTube Links
VSL1_YOUTUBE_LINK=https://youtu.be/zdLFYwFJQd4
VSL2_YOUTUBE_LINK=https://youtu.be/vjz896hTPPw
VSL_YOUTUBE_LINK=https://youtu.be/vjz896hTPPw

# Telegram Bot Tokens
TELEGRAM_BOT_TOKEN_EN=xxx
TELEGRAM_BOT_TOKEN=xxx

# Telegram Chat IDs
TELEGRAM_CHAT_ID_MINIMAL_EN=xxx

# Whop Product URL
WHOP_PRODUCT_URL_EN=https://whop.com/aio-media-llc/trap-defense-btc-en/

# Cron Secret
CRON_SECRET=xxx
```

### 2. Telegram Bot Webhook設定

1. Telegram Bot APIにアクセス
2. Webhook URLを設定: `https://your-domain.vercel.app/api/telegram-webhook`
3. Bot Tokenを確認

### 3. Git Push（COOが対応）

```bash
git add .
git commit -m "feat: VSL1/VSL2自動投稿・配信ワークフロー実装完了"
git push
```

---

## 🧪 動作確認

### 1. Bot Webhook確認
- [ ] `/start minimal`コマンドが動作するか
- [ ] ユーザーが`data/free-users.json`に登録されるか

### 2. VSL1投稿確認
- [ ] Cronが正しく実行されるか（手動実行で確認）
- [ ] Telegram MINIMALチャンネルに投稿されるか

### 3. VSL2配信確認
- [ ] 48時間経過ユーザーが正しく取得されるか
- [ ] VSL2が正しく送信されるか

---

## 🚀 発信準備完了

**状態**: ✅ **実装完了**

**次のステップ**: 環境変数設定 → Git Push → 動作確認 → 発信開始

---

**作成者**: COO  
**状態**: ✅ **準備完了（環境変数設定待ち）**
