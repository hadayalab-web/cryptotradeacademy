# 送信テスト実行ガイド

**作成日**: 2026-01-10

---

## 🚀 実行方法

### 1. テスト用環境変数の設定（初回のみ）

`.env`ファイル（`C:\Users\chiba\hadayalab-automation-platform\.env`）に以下を追加：

```env
# Telegram DM送信テスト用
TELEGRAM_TEST_CHAT_ID=123456789  # あなたのTelegramチャットID

# Resend Email送信テスト用
TEST_EMAIL=your-email@example.com  # テストメールを受信するアドレス
RESEND_FROM_EMAIL=noreply@yourdomain.com  # 送信元メールアドレス（検証済みドメイン、または onboarding@resend.dev）
```

### 2. テスト実行

PowerShellまたはコマンドプロンプトで以下を実行：

```powershell
# プロジェクトディレクトリに移動
cd C:\Users\chiba\hadayalab-automation-platform\workflows\affiliate-recruitment

# 送信テストを実行
npm run test:send
```

---

## 📋 テスト内容

### Telegram DM送信テスト
- 6市場（EN, AR, KO, JA, ES, PT-BR）のBot Tokenをチェック
- 各市場のBotでテストメッセージを送信
- 送信成功/失敗を確認

### Resend Email送信テスト
- Resend API Keyをチェック
- テストメールを送信
- 送信成功/失敗を確認

---

## 🔧 テスト用環境変数の取得方法

### Telegram TEST_CHAT_IDの取得方法

1. **Telegram Botにメッセージを送信**
   - テストしたいBot（例: EN市場のBot）にメッセージを送信
   - `/start`コマンドを実行

2. **チャットIDを取得**
   - 方法1: ブラウザで以下のURLにアクセス
     ```
     https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates
     ```
     - `<YOUR_BOT_TOKEN>`を実際のBot Tokenに置き換え
     - レスポンスの`message.chat.id`をコピー

   - 方法2: `@userinfobot`にメッセージを送信してIDを確認

3. **`.env`ファイルに追加**
   ```env
   TELEGRAM_TEST_CHAT_ID=123456789
   ```

### TEST_EMAILの設定

テストメールを受信できるメールアドレスを設定：

```env
TEST_EMAIL=your-email@gmail.com
```

### RESEND_FROM_EMAILの設定

- **検証済みドメインがある場合**:
  ```env
  RESEND_FROM_EMAIL=noreply@yourdomain.com
  ```

- **検証済みドメインがない場合**（デフォルト）:
  ```env
  RESEND_FROM_EMAIL=onboarding@resend.dev
  ```

---

## ✅ 実行例

### 成功時の出力

```
📁 Loading .env from: C:\Users\chiba\hadayalab-automation-platform\.env
✅ .env file loaded

🚀 送信テスト開始

============================================================

📋 環境変数チェック...

✅ 設定済み環境変数:
  - XAI_API_KEY: xai-jxO7...6vii
  - OPENAI_API_KEY: sk-proj-...Pz4A
  - GEMINI_API_KEY: AIzaSyBe...3fig
  - TELEGRAM_BOT_TOKEN_EN: 81553517...d974
  ...

✅ すべての必須環境変数が設定されています。

============================================================

📱 Telegram DM送信テスト...

  Testing EN...
    ✅ EN: Telegram DM sent successfully to 123456789
  Testing AR...
    ✅ AR: Telegram DM sent successfully to 123456789
  ...

📧 Resend Email送信テスト...

  ✅ Resend email sent successfully to your-email@gmail.com

============================================================

📊 テスト結果サマリー:

Telegram DM: 6/6 成功
Resend Email: ✅ 成功

✅ すべての送信テストが成功しました！
```

---

## ❌ エラー時の対処

### エラー: "TELEGRAM_TEST_CHAT_ID not set"

**解決方法**:
1. `.env`ファイルに`TELEGRAM_TEST_CHAT_ID`を追加
2. チャットIDを取得（上記参照）

### エラー: "TEST_EMAIL not set"

**解決方法**:
1. `.env`ファイルに`TEST_EMAIL`を追加
2. テストメールを受信できるメールアドレスを設定

### エラー: "Telegram API error: Unauthorized"

**解決方法**:
- Bot Tokenが無効な可能性があります
- `.env`ファイルのBot Tokenを確認
- 必要に応じてBot Tokenを再生成

### エラー: "Resend API error: Invalid 'from' field"

**解決方法**:
- `RESEND_FROM_EMAIL`を検証済みドメインに変更
- または`onboarding@resend.dev`を使用

---

## 📝 注意事項

1. **初回実行時**: テスト用環境変数の設定が必要です
2. **Telegram Bot**: 各市場のBotにメッセージを送信できる必要があります
3. **Resend**: API Keyが有効で、送信元メールアドレスが検証済みである必要があります

---

**最終更新**: 2026-01-10
