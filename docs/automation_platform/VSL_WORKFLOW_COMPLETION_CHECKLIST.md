# VSLワークフロー完成チェックリスト - EN版発信準備

**作成日**: 2026-01-15  
**状態**: ✅ **実装完了**

---

## ✅ 実装完了項目

### 1. VSL1自動投稿（`/api/vsl1-post.js`）
- ✅ Telegram MINIMALチャンネル（EN）への自動投稿
- ✅ 1日2回（9時・21時 UTC）
- ✅ VSL1 YouTube URL埋め込み
- ✅ 無料版オプトイン誘導CTA

### 2. VSL2無料版ユーザー配信（`/api/vsl2-free-users.js`）
- ✅ 48時間経過ユーザーの自動取得
- ✅ Telegram DM送信
- ✅ DEFEND50プロモコード付き
- ✅ VSL2送信済みフラグ管理

### 3. Bot参加時のユーザー登録（`services/telegram/bot-commands.js`）
- ✅ `/start minimal`コマンド処理
- ✅ ユーザー登録（参加日時・ユーザー名保存）
- ✅ 新形式データ構造対応

### 4. 無料版ユーザー管理（`services/free-users/manager.js`）
- ✅ 参加日時管理
- ✅ VSL2送信済みフラグ管理
- ✅ 48時間経過判定
- ✅ 後方互換性対応

---

## 🔧 必要な環境変数（Vercel Dashboard）

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

---

## 🚀 動作フロー

### ステップ1: VSL1投稿 → 無料版オプトイン
```
1. VSL1自動投稿（Telegram MINIMAL/EN）
   ↓
2. ユーザーがVSL1を見る
   ↓
3. @TrapDefenceBot /start minimal を実行
   ↓
4. Botがユーザーを登録（joinedAt記録）
   ↓
5. ウェルカムメッセージ送信
```

### ステップ2: 48時間後 → VSL2配信
```
1. Cron実行（1時間ごと）
   ↓
2. 48時間経過ユーザーを取得
   ↓
3. VSL2未送信ユーザーにDM送信
   ↓
4. DEFEND50プロモコード付きWhopリンク
   ↓
5. VSL2送信済みフラグを設定
```

### ステップ3: Whopページ → コンバージョン
```
1. ユーザーがVSL2を見る
   ↓
2. Whopページにアクセス
   ↓
3. DEFEND50プロモコード適用
   ↓
4. 有料版購入
```

---

## 📋 動作確認項目

### CEO対応（必須）

1. **環境変数設定**
   - [ ] Vercel Dashboardで上記の環境変数をすべて設定

2. **Telegram Bot設定**
   - [ ] Webhook URL設定: `https://your-domain.vercel.app/api/telegram-webhook`
   - [ ] Bot Token確認

3. **動作確認**
   - [ ] `/start minimal`コマンドが動作するか
   - [ ] ユーザーが`data/free-users.json`に保存されるか
   - [ ] VSL1投稿が正しく動作するか（手動実行で確認）
   - [ ] VSL2配信が正しく動作するか（テストユーザーで確認）

---

## ⚠️ 注意事項

1. **データ保存場所**: `cryptosignal-ai/data/free-users.json`
   - Vercelでは一時的なストレージのため、本番では外部ストレージ（DB/S3）が必要

2. **Webhook設定**: Telegram BotのWebhook URLを設定する必要がある

3. **初回実行**: 最初のVSL2配信は48時間後になる

---

**状態**: ✅ **実装完了（環境変数設定・動作確認待ち）**
