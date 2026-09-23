# Resend & Telegram 直接API呼び出しガイド

**作成日**: 2026-01-09  
**目的**: MCPサーバーを使わずに、ResendとTelegram APIを直接呼び出す方法（Cursorのパフォーマンス向上のため）

---

## 📋 概要

MCPサーバーを実装しなくても、**直接APIを呼び出す**ことができます。メール送信やTelegramメッセージ配信に最適です。

**注意**: ResendとTelegramをMCPにするとCursorのパフォーマンスが落ちることが確認されています。直接API呼び出しを使用することで、パフォーマンスを維持できます。

---

## 🚀 Resend API

### CLIから直接呼び出す

```bash
# メールを送信
npx tsx scripts/direct-ai-api.ts resend-send --from sender@example.com --to recipient@example.com --subject "Test" --html "<h1>Hello</h1>"

# 一括メール送信
npx tsx scripts/direct-ai-api.ts resend-bulk --from sender@example.com --to "user1@example.com,user2@example.com" --subject "Bulk Email" --html "<h1>Hello</h1>"

# メールステータスを取得
npx tsx scripts/direct-ai-api.ts resend-status --emailId email_123

# メール一覧を取得
npx tsx scripts/direct-ai-api.ts resend-list --limit 20
```

### TypeScript/JavaScriptからインポートして使用

```typescript
import { 
  sendResendEmail,
  sendResendBulkEmail,
  getResendEmailStatus,
  listResendEmails,
} from "./scripts/direct-ai-api.js";

// メールを送信
const result = await sendResendEmail({
  from: "onboarding@cryptotradeacademy.io",
  to: "user@example.com",
  subject: "Welcome!",
  html: "<h1>Welcome to CryptoTrade Academy</h1>",
});

// 一括メール送信
const bulkResult = await sendResendBulkEmail({
  from: "onboarding@cryptotradeacademy.io",
  to: ["user1@example.com", "user2@example.com"],
  subject: "Bulk Email",
  html: "<h1>Hello</h1>",
  batchId: "batch_123",
});
```

---

## 📊 Resend API機能の詳細

### 1. `sendResendEmail()` - メールを送信

```typescript
const result = await sendResendEmail({
  from: "sender@example.com", // 必須
  to: "recipient@example.com" | ["user1@example.com", "user2@example.com"], // 必須
  subject: "Subject", // 必須
  html: "<h1>HTML Content</h1>", // htmlまたはtextのいずれか必須
  text: "Plain text content", // htmlまたはtextのいずれか必須
  cc: ["cc@example.com"], // オプション
  bcc: ["bcc@example.com"], // オプション
  replyTo: "reply@example.com", // オプション
  tags: [{ name: "category", value: "newsletter" }], // オプション
});
```

**レスポンス**:
```typescript
{
  success: true,
  emailId: "email_123",
  data: { ... }
}
```

---

### 2. `sendResendBulkEmail()` - 一括メール送信

```typescript
const result = await sendResendBulkEmail({
  from: "sender@example.com",
  to: ["user1@example.com", "user2@example.com", ...], // 50件ずつバッチ処理
  subject: "Bulk Email",
  html: "<h1>Hello</h1>",
  batchId: "batch_123", // オプション: バッチ追跡用
});
```

**レスポンス**:
```typescript
{
  success: true,
  totalRecipients: 100,
  batches: 2,
  results: [
    { batch: 50, emailId: "email_1", data: { ... } },
    { batch: 50, emailId: "email_2", data: { ... } },
  ]
}
```

---

### 3. `getResendEmailStatus()` - メールステータスを取得

```typescript
const result = await getResendEmailStatus("email_123");
```

**レスポンス**:
```typescript
{
  emailId: "email_123",
  status: "delivered",
  createdAt: "2026-01-09T...",
  data: { ... }
}
```

---

### 4. `listResendEmails()` - メール一覧を取得

```typescript
const result = await listResendEmails({ limit: 20 });
```

**レスポンス**:
```typescript
{
  emails: [
    {
      id: "email_123",
      to: ["user@example.com"],
      subject: "Test Email",
      ...
    }
  ],
  total: 20,
}
```

---

## 🚀 Telegram API

### CLIから直接呼び出す

```bash
# メッセージを送信（言語指定）
npx tsx scripts/direct-ai-api.ts tg-send --language EN --message "Hello World"

# 全言語にメッセージを送信
npx tsx scripts/direct-ai-api.ts tg-send-all --message "Hello All Languages"

# 画像を送信
npx tsx scripts/direct-ai-api.ts tg-photo --language EN --photoUrl "https://example.com/image.png" --caption "Image Caption"

# 動画を送信
npx tsx scripts/direct-ai-api.ts tg-video --language EN --videoUrl "https://example.com/video.mp4" --caption "Video Caption"

# チャット情報を取得
npx tsx scripts/direct-ai-api.ts tg-chat-info --language EN
```

### TypeScript/JavaScriptからインポートして使用

```typescript
import { 
  sendTelegramMessage,
  sendTelegramMessageAllLanguages,
  sendTelegramPhoto,
  sendTelegramVideo,
  getTelegramChatInfo,
} from "./scripts/direct-ai-api.js";

// メッセージを送信
const result = await sendTelegramMessage({
  language: "EN",
  message: "Hello World",
  parseMode: "HTML",
});

// 全言語にメッセージを送信
const allResult = await sendTelegramMessageAllLanguages({
  defaultMessage: "Hello All Languages",
  messages: {
    JA: "こんにちは",
    EN: "Hello",
  },
  parseMode: "HTML",
});
```

---

## 📊 Telegram API機能の詳細

### 1. `sendTelegramMessage()` - メッセージを送信

```typescript
const result = await sendTelegramMessage({
  language: "EN" | "AR" | "ES" | "JA" | "KO" | "PT-BR", // 必須
  message: "Hello World", // 必須
  parseMode: "HTML" | "Markdown" | "MarkdownV2", // オプション
  chatId: "custom_chat_id", // オプション: デフォルトは言語別チャットID
});
```

**レスポンス**:
```typescript
{
  success: true,
  language: "EN",
  messageId: 12345,
  chatId: "chat_123",
}
```

**対応言語**:
- `EN` - 英語
- `AR` - アラビア語
- `ES` - スペイン語
- `JA` - 日本語
- `KO` - 韓国語
- `PT-BR` - ポルトガル語（ブラジル）

---

### 2. `sendTelegramMessageAllLanguages()` - 全言語にメッセージを一括送信

```typescript
const result = await sendTelegramMessageAllLanguages({
  defaultMessage: "Hello All Languages", // 必須
  messages: { // オプション: 言語別メッセージ
    JA: "こんにちは",
    EN: "Hello",
  },
  parseMode: "HTML", // オプション
});
```

**レスポンス**:
```typescript
{
  total: 6,
  successful: 6,
  failed: 0,
  results: [
    { language: "EN", success: true, messageId: 12345, ... },
    { language: "JA", success: true, messageId: 12346, ... },
    ...
  ]
}
```

---

### 3. `sendTelegramPhoto()` - 画像を送信

```typescript
const result = await sendTelegramPhoto({
  language: "EN",
  photoUrl: "https://example.com/image.png", // 必須
  caption: "Image Caption", // オプション
  parseMode: "HTML", // オプション
  chatId: "custom_chat_id", // オプション
});
```

---

### 4. `sendTelegramVideo()` - 動画を送信

```typescript
const result = await sendTelegramVideo({
  language: "EN",
  videoUrl: "https://example.com/video.mp4", // 必須
  caption: "Video Caption", // オプション
  parseMode: "HTML", // オプション
  chatId: "custom_chat_id", // オプション
});
```

---

### 5. `getTelegramChatInfo()` - チャット情報を取得

```typescript
const result = await getTelegramChatInfo({
  language: "EN",
  chatId: "custom_chat_id", // オプション
});
```

**レスポンス**:
```typescript
{
  language: "EN",
  chatId: "chat_123",
  chatInfo: {
    id: 123456789,
    type: "channel",
    title: "Channel Name",
    ...
  }
}
```

---

## 🔧 環境変数の設定

`.env`ファイルに以下を設定してください：

```env
# Resend
RESEND_API_KEY=re_xxxxxxxxxxxxxx

# Telegram（グローバル）
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz

# Telegram（言語別 - オプション）
TELEGRAM_BOT_TOKEN_EN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_BOT_TOKEN_AR=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_BOT_TOKEN_ES=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_BOT_TOKEN_JA=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_BOT_TOKEN_KO=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_BOT_TOKEN_PT_BR=123456789:ABCdefGHIjklMNOpqrsTUVwxyz

# Telegram Chat ID（言語別）
TELEGRAM_CHAT_ID_EN=-1001234567890
TELEGRAM_CHAT_ID_AR=-1001234567890
TELEGRAM_CHAT_ID_ES=-1001234567890
TELEGRAM_CHAT_ID_JA=-1001234567890
TELEGRAM_CHAT_ID_KO=-1001234567890
TELEGRAM_CHAT_ID_PT_BR=-1001234567890
```

---

## 📝 使用例

### 例1: LP登録後のウェルカムメール送信

```typescript
import { sendResendEmail } from "./scripts/direct-ai-api.js";

await sendResendEmail({
  from: "onboarding@cryptotradeacademy.io",
  to: userEmail,
  subject: "Welcome to CryptoTrade Academy!",
  html: `
    <h1>Welcome!</h1>
    <p>Thank you for joining CryptoTrade Academy.</p>
  `,
  tags: [{ name: "category", value: "welcome" }],
});
```

### 例2: Trap Defence BTCの全言語配信

```typescript
import { sendTelegramMessageAllLanguages } from "./scripts/direct-ai-api.js";

await sendTelegramMessageAllLanguages({
  defaultMessage: "🚨 Trap Defence BTC Alert",
  messages: {
    JA: "🚨 Trap Defence BTCアラート",
    EN: "🚨 Trap Defence BTC Alert",
    AR: "🚨 تنبيه Trap Defence BTC",
  },
  parseMode: "HTML",
});
```

### 例3: アフィリエイトリンクをTelegram DMで送信

```typescript
import { sendTelegramMessage } from "./scripts/direct-ai-api.js";

await sendTelegramMessage({
  language: "EN",
  message: `Your affiliate link: ${affiliateLink}`,
  chatId: userId, // ユーザーのTelegram user_id
  parseMode: "HTML",
});
```

---

## 📋 実装ファイル

- `scripts/direct-ai-api.ts` - 直接API呼び出しユーティリティ
  - **Resend**:
    - `sendResendEmail()` - メールを送信
    - `sendResendBulkEmail()` - 一括メール送信
    - `getResendEmailStatus()` - メールステータスを取得
    - `listResendEmails()` - メール一覧を取得
  - **Telegram**:
    - `sendTelegramMessage()` - メッセージを送信
    - `sendTelegramMessageAllLanguages()` - 全言語にメッセージを一括送信
    - `sendTelegramPhoto()` - 画像を送信
    - `sendTelegramVideo()` - 動画を送信
    - `getTelegramChatInfo()` - チャット情報を取得

---

## ✅ 実装完了確認

- [x] `sendResendEmail()` - メールを送信
- [x] `sendResendBulkEmail()` - 一括メール送信
- [x] `getResendEmailStatus()` - メールステータスを取得
- [x] `listResendEmails()` - メール一覧を取得
- [x] `sendTelegramMessage()` - メッセージを送信
- [x] `sendTelegramMessageAllLanguages()` - 全言語にメッセージを一括送信
- [x] `sendTelegramPhoto()` - 画像を送信
- [x] `sendTelegramVideo()` - 動画を送信
- [x] `getTelegramChatInfo()` - チャット情報を取得
- [x] CLI対応: `resend-send`, `resend-bulk`, `resend-status`, `resend-list`, `tg-send`, `tg-send-all`, `tg-photo`, `tg-video`, `tg-chat-info`

---

## 🎉 実装完了

**ResendとTelegramの直接API呼び出し機能を実装しました。**

これで、MCPサーバーを使わずに、メール送信やTelegramメッセージ配信を直接呼び出せます。Cursorのパフォーマンスも維持されます。

---

**参照**: 
- [Resend API Documentation](https://resend.com/docs/api-reference)
- [Telegram Bot API Documentation](https://core.telegram.org/bots/api)
