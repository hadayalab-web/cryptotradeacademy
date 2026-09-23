# CEO Telegram通知設定ガイド

**作成日時**: 2026-01-12
**目的**: CEO（人間）にTelegram通知を送信するための設定

---

## 📋 必要な環境変数

`.env`ファイルに以下を追加してください：

```env
# CEO専用Telegram設定
TELEGRAM_CHAT_ID_CEO=あなたのTelegramチャットID
TELEGRAM_BOT_TOKEN_CEO=あなたのTelegram Bot Token
```

**注意**: `TELEGRAM_BOT_TOKEN_CEO`が設定されていない場合、`TELEGRAM_BOT_TOKEN_EN`または`TELEGRAM_BOT_TOKEN`が使用されます。

---

## 🔧 設定手順

### Step 1: Telegram Bot Tokenの取得

1. **Telegram Botを作成**（まだの場合）
   - Telegramで`@BotFather`にメッセージを送信
   - `/newbot`コマンドを実行
   - 指示に従ってBotを作成
   - Bot Tokenを取得（例: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`）

2. **`.env`ファイルに追加**
   ```env
   TELEGRAM_BOT_TOKEN_CEO=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
   ```

### Step 2: CEOのTelegramチャットIDを取得

1. **Botにメッセージを送信**
   - 作成したBotに`/start`コマンドを送信
   - または、任意のメッセージを送信

2. **チャットIDを取得**
   - ブラウザで以下にアクセス：
     ```
     https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates
     ```
   - レスポンスの`result[0].message.chat.id`をコピー
   - 例: `123456789`

3. **`.env`ファイルに追加**
   ```env
   TELEGRAM_CHAT_ID_CEO=123456789
   ```

### Step 3: テスト送信

```bash
npx tsx scripts/test-ceo-notification-direct.ts
```

**成功時の出力**:
```
✅ CEO通知テスト成功！
   - メッセージID: 12345
   - チャットID: 123456789
   - 送信時刻: 2026-01-12T...

📱 CEOのTelegramを確認してください。
```

---

## 📱 通知内容

CEOには以下の通知が自動で届きます：

### 1. 日次KPIレポート
- **送信時刻**: 毎日10:00（JST）
- **内容**: 
  - 現在の売上
  - 目標売上
  - 進捗率
  - 残り日数
  - DM送信状況
  - コンバージョン状況

### 2. 週末$100K達成確率シミュレーション結果
- **送信時刻**: シミュレーション実行時
- **内容**:
  - 統合達成確率
  - 役員別確率
  - シナリオ別確率
  - 推奨アクション

### 3. 異常・エラー通知
- **送信時刻**: 異常検知時・エラー発生時
- **内容**:
  - 異常内容
  - 現在のKPI
  - 対応状況

---

## ✅ 確認事項

- [ ] `.env`ファイルに`TELEGRAM_CHAT_ID_CEO`が設定されている
- [ ] `.env`ファイルに`TELEGRAM_BOT_TOKEN_CEO`が設定されている（または`TELEGRAM_BOT_TOKEN_EN`）
- [ ] テスト送信が成功している
- [ ] CEOのTelegramにメッセージが届いている

---

## 🚨 トラブルシューティング

### エラー: `TELEGRAM_CHAT_ID_CEO is not set`
- **原因**: 環境変数が設定されていない
- **解決**: `.env`ファイルに`TELEGRAM_CHAT_ID_CEO`を追加

### エラー: `chat not found`
- **原因**: チャットIDが正しくない、またはBotにメッセージを送信していない
- **解決**: 
  1. Botに`/start`コマンドを送信
  2. `getUpdates`でチャットIDを再取得
  3. `.env`ファイルを更新

### エラー: `Unauthorized`
- **原因**: Bot Tokenが正しくない
- **解決**: `.env`ファイルの`TELEGRAM_BOT_TOKEN_CEO`を確認

---

**設定完了後、CEOのTelegramに通知が届くようになります！**
