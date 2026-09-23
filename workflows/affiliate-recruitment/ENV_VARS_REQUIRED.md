# 環境変数 - 必須設定ガイド

**作成日**: 2026-01-10  
**更新**: Telegram送信とResend送信は必須機能として設定

---

## 🔴 必須環境変数（すべて設定が必要）

以下の環境変数は**すべて必須**です：

```env
# AI API Keys（必須）
XAI_API_KEY=xai_xxx          # Grok API（候補検索・分析に必須）
OPENAI_API_KEY=sk-xxx        # GPT API（深い推論・DM生成に必須）
GEMINI_API_KEY=xxx           # Gemini API（マルチモーダル分析に必須）

# Telegram Bot Tokens（必須 - 6言語対応）
TELEGRAM_BOT_TOKEN_EN=xxx    # 英語市場用（必須）
TELEGRAM_BOT_TOKEN_AR=xxx    # アラビア語市場用（必須）
TELEGRAM_BOT_TOKEN_KO=xxx    # 韓国語市場用（必須）
TELEGRAM_BOT_TOKEN_JA=xxx    # 日本語市場用（必須）
TELEGRAM_BOT_TOKEN_ES=xxx    # スペイン語市場用（必須）
TELEGRAM_BOT_TOKEN_PT_BR=xxx # ポルトガル語市場用（必須）

# Resend API Key（必須）
RESEND_API_KEY=re_xxx        # Email送信に必須
```

---

## ✅ 理由

### Telegram送信機能が必須である理由

1. **デフォルトで有効**: `executeIntegratedWorkflow`の`sendTelegramDM`のデフォルト値は`true`
2. **コア機能**: アフィリエイター募集の自動化において、DM送信は必須機能
3. **エラーハンドリング**: 環境変数が不足している場合、明確なエラーメッセージを表示

### Resend送信機能が必須である理由

1. **補完機能**: Telegram DMが失敗した場合のフォールバック
2. **多様な連絡手段**: EmailはTelegramよりも確実な連絡手段
3. **ビジネス要件**: アフィリエイター募集において、Email送信は必須機能

---

## 🛡️ 実装された安全対策

### 1. 起動時環境変数チェック

`executeIntegratedWorkflow`実行時に、以下のチェックが行われます：

```typescript
// 必須環境変数チェック
requireEnvVars(['XAI_API_KEY', 'OPENAI_API_KEY', 'GEMINI_API_KEY']);

// Telegram DM送信が有効な場合
if (sendTelegramDM) {
  const telegramTokenKey = `TELEGRAM_BOT_TOKEN_${marketCode}`;
  if (!process.env[telegramTokenKey]) {
    throw new Error(`Missing required environment variable: ${telegramTokenKey}`);
  }
}

// Email送信が有効な場合
if (sendEmail || emailFallback) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error(`Missing required environment variable: RESEND_API_KEY`);
  }
}
```

### 2. 実行時環境変数チェック

実際のAPI呼び出し前にも、環境変数を再チェックします：

```typescript
// Telegram DM送信前
const telegramTokenKey = `TELEGRAM_BOT_TOKEN_${marketCode}`;
if (!process.env[telegramTokenKey]) {
  throw new Error(`Telegram Bot Token not found: ${telegramTokenKey}`);
}

// Email送信前
if (!process.env.RESEND_API_KEY) {
  throw new Error(`Resend API Key not found: RESEND_API_KEY`);
}
```

### 3. 詳細なエラーメッセージ

環境変数が不足している場合、以下のような明確なエラーメッセージが表示されます：

```
Missing required environment variable for Telegram DM: TELEGRAM_BOT_TOKEN_EN. 
Telegram DM sending is enabled (sendTelegramDM: true) but the token is not set.
```

```
Missing required environment variable: RESEND_API_KEY. 
Email sending is enabled (sendEmail: true, emailFallback: true) but RESEND_API_KEY is not set.
```

---

## 📊 エラーハンドリングの流れ

### 1. 起動時チェック

```
executeIntegratedWorkflow 実行
  ↓
環境変数チェック（requireEnvVars）
  ↓
不足している場合 → エラーを投げて即座に終了
  ↓
すべて揃っている場合 → ワークフロー続行
```

### 2. 実行時チェック

```
Telegram DM送信ステップ
  ↓
環境変数再チェック
  ↓
不足している場合 → エラーをログに記録、ステップを失敗としてマーク
  ↓
ワークフローは続行（他のステップは実行される）
```

---

## 🔧 設定方法

### Vercelでの設定

1. Vercelダッシュボードにログイン
2. プロジェクトの「Settings」→「Environment Variables」を開く
3. 以下の環境変数を追加：

```env
XAI_API_KEY=xai_xxx
OPENAI_API_KEY=sk-xxx
GEMINI_API_KEY=xxx
TELEGRAM_BOT_TOKEN_EN=xxx
TELEGRAM_BOT_TOKEN_AR=xxx
TELEGRAM_BOT_TOKEN_KO=xxx
TELEGRAM_BOT_TOKEN_JA=xxx
TELEGRAM_BOT_TOKEN_ES=xxx
TELEGRAM_BOT_TOKEN_PT_BR=xxx
RESEND_API_KEY=re_xxx
```

4. 「Save」をクリック
5. 再デプロイを実行

---

## ✅ 確認方法

### ローカルでの確認

```bash
# 環境変数が設定されているか確認
echo $XAI_API_KEY
echo $TELEGRAM_BOT_TOKEN_EN
echo $RESEND_API_KEY
```

### Vercelでの確認

1. Vercelダッシュボードの「Settings」→「Environment Variables」で確認
2. デプロイログでエラーメッセージを確認
3. Function Logsでエラーメッセージを確認

---

## 🚨 よくあるエラー

### エラー1: Missing required environment variable for Telegram DM

**原因**: Telegram Bot Tokenが設定されていない

**解決方法**:
```env
TELEGRAM_BOT_TOKEN_EN=xxx  # 使用する市場のトークンを設定
```

### エラー2: Missing required environment variable: RESEND_API_KEY

**原因**: Resend API Keyが設定されていない

**解決方法**:
```env
RESEND_API_KEY=re_xxx  # Resend API Keyを設定
```

---

## 📝 まとめ

- **Telegram送信機能**: 必須（デフォルトで有効）
- **Resend送信機能**: 必須（補完機能として）
- **環境変数チェック**: 起動時と実行時の2段階でチェック
- **エラーハンドリング**: 明確なエラーメッセージとログ記録

**すべての環境変数を設定してからデプロイしてください。**

---

**最終更新**: 2026-01-10
