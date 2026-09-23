# Telegram配信の有効化手順

**作成日**: 2026-01-13  
**目的**: Telegram配信を主要チャネルとして有効化

---

## ✅ Telegram配信の有効化

### 環境変数の設定

`.env` ファイルに以下を設定：

```env
# Telegram配信を有効化
ENABLE_TELEGRAM=true

# Telegram Bot設定（既に設定済みのはず）
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
```

### 確認方法

1. **Bot情報の確認**:
   ```bash
   npx tsx scripts/check-telegram-bot-info.ts
   ```

2. **配信テスト**:
   - `cryptosignal-ai/api/cron.js` の定期配信を実行
   - Telegramチャンネル/グループにメッセージが届くことを確認

---

## 📊 Telegram Bot情報

### Bot名の最適化

ユーザーが最適化したBot名とチャットグループ名を確認する必要があります。

**確認コマンド**:
```bash
npx tsx scripts/check-telegram-bot-info.ts
```

---

## 🔄 配信ロジック

### 現在の実装

`cryptosignal-ai/api/cron.js` で以下のロジックが実装されています：

1. **定期配信（Regular Briefing）**:
   - `ENABLE_TELEGRAM=true` の場合、Telegramに送信
   - 動画・画像がある場合は先に送信
   - その後、テキストメッセージを送信

2. **緊急配信（Emergency Alert）**:
   - `ENABLE_TELEGRAM=true` の場合、Telegramに送信
   - トラップアラートを即座に配信

---

## 📝 次のステップ

1. ✅ `.env` に `ENABLE_TELEGRAM=true` を設定
2. ✅ Bot情報を確認（`scripts/check-telegram-bot-info.ts`）
3. ✅ 配信テストを実行
4. ✅ 動作確認

---

**状態**: ⏳ 設定待ち
