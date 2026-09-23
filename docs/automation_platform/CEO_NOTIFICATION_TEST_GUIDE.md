# CEO Telegram通知テストガイド

**作成日時**: 2026-01-12
**目的**: CEO（人間）にTelegram通知が正常に届くかテストする

---

## 📋 現在の状況

CEO専用のTelegram通知機能を実装しましたが、**環境変数の設定が必要**です。

---

## 🔧 必要な設定

### 1. `.env`ファイルに以下を追加

```env
# CEO専用Telegram設定
TELEGRAM_CHAT_ID_CEO=あなたのTelegramチャットID
TELEGRAM_BOT_TOKEN_CEO=あなたのTelegram Bot Token
```

**注意**: `TELEGRAM_BOT_TOKEN_CEO`が設定されていない場合、`TELEGRAM_BOT_TOKEN_EN`または`TELEGRAM_BOT_TOKEN`が使用されます。

---

## 📱 チャットIDの取得方法

### 方法1: getUpdates APIを使用

1. **Telegram Botにメッセージを送信**
   - Botに`/start`コマンドを送信
   - または、任意のメッセージを送信

2. **ブラウザで以下にアクセス**
   ```
   https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates
   ```
   - `<YOUR_BOT_TOKEN>`を実際のBot Tokenに置き換え

3. **レスポンスからチャットIDを取得**
   ```json
   {
     "ok": true,
     "result": [
       {
         "update_id": 123456789,
         "message": {
           "message_id": 1,
           "from": {
             "id": 987654321,
             "is_bot": false,
             "first_name": "Your Name"
           },
           "chat": {
             "id": 987654321,  // ← これがチャットID
             "first_name": "Your Name",
             "type": "private"
           },
           "date": 1234567890,
           "text": "/start"
         }
       }
     ]
   }
   ```
   - `result[0].message.chat.id`をコピー

4. **`.env`ファイルに追加**
   ```env
   TELEGRAM_CHAT_ID_CEO=987654321
   ```

### 方法2: @userinfobotを使用

1. Telegramで`@userinfobot`にメッセージを送信
2. 返信されたIDをコピー
3. `.env`ファイルに追加

---

## 🧪 テスト送信

### テストスクリプト実行

```bash
npx tsx scripts/test-ceo-notification-direct.ts
```

### 成功時の出力

```
📱 CEO Telegram通知テスト開始

✅ 環境変数確認完了
   - Bot Token: 123456789:...
   - Chat ID: 987654321

📤 CEOにテストメッセージを送信中...
✅ CEO通知テスト成功！
   - メッセージID: 12345
   - チャットID: 987654321
   - 送信時刻: 2026-01-12T...

📱 CEOのTelegramを確認してください。

✅ テスト完了
```

### 失敗時の出力

#### ケース1: 環境変数が設定されていない

```
❌ エラー: TELEGRAM_CHAT_ID_CEO is not set in .env file

⚠️ 環境変数が設定されていません:
   .envファイルに以下を追加してください:
   TELEGRAM_CHAT_ID_CEO=あなたのTelegramチャットID
   TELEGRAM_BOT_TOKEN_CEO=あなたのTelegram Bot Token（またはTELEGRAM_BOT_TOKEN_EN）
```

#### ケース2: チャットIDが正しくない

```
❌ エラー: chat not found

⚠️ チャットIDが正しくありません。
   Botにメッセージを送信してから、再度試してください。
```

#### ケース3: Bot Tokenが正しくない

```
❌ エラー: Unauthorized

⚠️ Bot Tokenが正しくありません。
   .envファイルのTELEGRAM_BOT_TOKEN_CEOを確認してください。
```

---

## ✅ 設定確認

設定状況を確認するには：

```bash
npx tsx scripts/check-ceo-telegram-config.ts
```

---

## 📊 実装済み機能

### CEO専用通知関数

- **関数名**: `sendTelegramMessageToCEO(message: string)`
- **場所**: `api/unified-api.ts`
- **機能**: CEO（人間）に直接Telegramメッセージを送信

### 自動通知

以下のスクリプトでCEOに自動通知されます：

1. **日次KPIレポート**: `scripts/automated-weekend-100k-workflow.ts`
2. **シミュレーション結果**: `scripts/simulate-weekend-100k-probability.ts`
3. **異常検知**: `app/api/cron/hourly-kpi-check/route.ts`

---

## 🎯 次のステップ

1. ✅ `.env`ファイルに`TELEGRAM_CHAT_ID_CEO`を追加
2. ✅ `.env`ファイルに`TELEGRAM_BOT_TOKEN_CEO`を追加（または既存のBot Tokenを使用）
3. ✅ テスト送信を実行: `npx tsx scripts/test-ceo-notification-direct.ts`
4. ✅ CEOのTelegramでメッセージを確認

---

**設定完了後、CEOのTelegramに通知が届くようになります！**
