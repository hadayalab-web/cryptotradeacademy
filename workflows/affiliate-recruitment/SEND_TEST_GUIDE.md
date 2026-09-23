# 送信テストガイド

**作成日**: 2026-01-10  
**目的**: Telegram DM送信とResend Email送信のテスト方法

---

## ✅ 現在の状況

送信テストスクリプトを実行した結果：

- ✅ **環境変数**: すべての必須環境変数が設定済み
- ❌ **Telegram DM送信テスト**: テスト用チャットIDが必要
- ❌ **Resend Email送信テスト**: テスト用メールアドレスが必要

---

## 🔧 テスト用環境変数の設定

### 1. Telegram DM送信テスト用

`.env`ファイルに以下を追加：

```env
# Telegram DM送信テスト用チャットID
TELEGRAM_TEST_CHAT_ID=123456789
```

#### チャットIDの取得方法

1. **Telegram Botを作成**（まだの場合）
   - Telegramで`@BotFather`にメッセージを送信
   - `/newbot`コマンドを実行
   - 指示に従ってBotを作成
   - Bot Tokenを取得（既に`.env`に設定済み）

2. **テスト用チャットIDを取得**
   - 作成したBotにメッセージを送信（`/start`コマンド）
   - ブラウザで以下のURLにアクセス：
     ```
     https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates
     ```
   - レスポンスの`chat.id`をコピー
   - または、`@userinfobot`にメッセージを送信してIDを確認

3. **`.env`ファイルに追加**
   ```env
   TELEGRAM_TEST_CHAT_ID=123456789  # 取得したチャットID
   ```

---

### 2. Resend Email送信テスト用

`.env`ファイルに以下を追加：

```env
# Resend Email送信テスト用
TEST_EMAIL=your-test-email@example.com
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

#### メールアドレスの設定

1. **TEST_EMAIL**: テストメールを受信するメールアドレス
   ```env
   TEST_EMAIL=your-email@gmail.com
   ```

2. **RESEND_FROM_EMAIL**: 送信元メールアドレス
   - Resendでドメインを検証済みの場合: `noreply@yourdomain.com`
   - 検証していない場合: `onboarding@resend.dev`（デフォルト）

---

## 🚀 送信テストの実行

### テスト実行

```bash
cd workflows/affiliate-recruitment
npm run test:send
```

### 期待される結果

#### 成功時

```
📱 Telegram DM送信テスト...

  Testing EN...
    ✅ EN: Telegram DM sent successfully to 123456789
  Testing AR...
    ✅ AR: Telegram DM sent successfully to 123456789
  ...

📧 Resend Email送信テスト...

  ✅ Resend email sent successfully to your-email@gmail.com

📊 テスト結果サマリー:

Telegram DM: 6/6 成功
Resend Email: ✅ 成功
```

#### 失敗時

エラーメッセージが表示されます。以下を確認してください：

1. **Telegram DM送信が失敗する場合**
   - `TELEGRAM_TEST_CHAT_ID`が正しく設定されているか
   - Bot Tokenが有効か
   - Botにメッセージを送信できるか

2. **Resend Email送信が失敗する場合**
   - `TEST_EMAIL`が正しく設定されているか
   - `RESEND_API_KEY`が有効か
   - `RESEND_FROM_EMAIL`が検証済みドメインか

---

## 📝 テスト内容

### Telegram DM送信テスト

1. **各市場のBot Tokenをチェック**
   - EN, AR, KO, JA, ES, PT-BRの6市場
   - 各市場のBot Tokenが設定されているか確認

2. **テストメッセージを送信**
   - テスト用チャットIDにメッセージを送信
   - 送信成功/失敗を確認

3. **結果を表示**
   - 各市場の送信結果
   - エラー詳細（失敗時）

### Resend Email送信テスト

1. **API Keyをチェック**
   - `RESEND_API_KEY`が設定されているか確認

2. **テストメールを送信**
   - テスト用メールアドレスにメールを送信
   - 送信成功/失敗を確認

3. **結果を表示**
   - 送信結果
   - エラー詳細（失敗時）

---

## 🔍 トラブルシューティング

### Telegram DM送信が失敗する場合

#### エラー: "Telegram Bot Token not found"

**原因**: Bot Tokenが設定されていない

**解決方法**:
```env
TELEGRAM_BOT_TOKEN_EN=your_bot_token_here
```

#### エラー: "TELEGRAM_TEST_CHAT_ID not set"

**原因**: テスト用チャットIDが設定されていない

**解決方法**:
```env
TELEGRAM_TEST_CHAT_ID=123456789
```

#### エラー: "Telegram API error: Unauthorized"

**原因**: Bot Tokenが無効

**解決方法**:
- Bot Tokenを再生成（@BotFatherで`/token`コマンド）
- `.env`ファイルを更新

---

### Resend Email送信が失敗する場合

#### エラー: "RESEND_API_KEY not found"

**原因**: Resend API Keyが設定されていない

**解決方法**:
```env
RESEND_API_KEY=re_your_api_key_here
```

#### エラー: "TEST_EMAIL not set"

**原因**: テスト用メールアドレスが設定されていない

**解決方法**:
```env
TEST_EMAIL=your-email@example.com
```

#### エラー: "Resend API error: Invalid 'from' field"

**原因**: 送信元メールアドレスが無効

**解決方法**:
```env
RESEND_FROM_EMAIL=noreply@yourdomain.com  # 検証済みドメイン
# または
RESEND_FROM_EMAIL=onboarding@resend.dev  # デフォルト
```

---

## ✅ テスト完了後の確認事項

1. **Telegram DM送信**
   - ✅ テスト用チャットにメッセージが届いているか確認
   - ✅ メッセージの内容が正しいか確認

2. **Resend Email送信**
   - ✅ テスト用メールアドレスにメールが届いているか確認
   - ✅ メールの内容が正しいか確認
   - ✅ スパムフォルダに入っていないか確認

---

## 📊 テスト結果の記録

テスト実行後、結果を記録してください：

```markdown
## 送信テスト結果

**実行日**: 2026-01-10

### Telegram DM送信
- EN: ✅ 成功
- AR: ✅ 成功
- KO: ✅ 成功
- JA: ✅ 成功
- ES: ✅ 成功
- PT-BR: ✅ 成功

### Resend Email送信
- ✅ 成功

**結論**: すべての送信テストが成功しました。
```

---

**最終更新**: 2026-01-10
