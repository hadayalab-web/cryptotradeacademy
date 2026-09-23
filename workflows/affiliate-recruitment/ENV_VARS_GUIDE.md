# 環境変数設定ガイド

**作成日**: 2026-01-10  
**目的**: 必要な環境変数とオプション環境変数の明確化

---

## 🔴 必須環境変数

以下の環境変数は**必ず設定が必要**です：

```env
# AI API Keys（必須）
XAI_API_KEY=xai_xxx          # Grok API（候補検索・分析に必須）
OPENAI_API_KEY=sk-xxx        # GPT API（深い推論・DM生成に必須）
GEMINI_API_KEY=xxx           # Gemini API（マルチモーダル分析に必須）
```

**理由**: 
- これらのAPIはワークフローのコア機能（検索、分析、DM生成）で使用されます
- 設定がないとワークフローが実行できません

---

## 🟡 条件付き必須環境変数

以下の環境変数は、**使用する機能に応じて設定が必要**です：

### Telegram Bot Token（Telegram DM送信を使用する場合）

```env
# Telegram Bot Tokens（6言語対応）
TELEGRAM_BOT_TOKEN_EN=xxx    # 英語市場用
TELEGRAM_BOT_TOKEN_AR=xxx    # アラビア語市場用
TELEGRAM_BOT_TOKEN_KO=xxx    # 韓国語市場用
TELEGRAM_BOT_TOKEN_JA=xxx    # 日本語市場用
TELEGRAM_BOT_TOKEN_ES=xxx    # スペイン語市場用
TELEGRAM_BOT_TOKEN_PT_BR=xxx # ポルトガル語市場用
```

**必要な条件**:
- `executeIntegratedWorkflow`で`sendTelegramDM: true`を指定する場合
- デフォルト値は`true`のため、**Telegram DM送信を使用する場合は必須**

**設定不要の場合**:
- `sendTelegramDM: false`を明示的に指定する場合
- DM生成のみで送信しない場合（Tri-Forceワークフローなど）

---

### Resend API Key（Email送信を使用する場合）

```env
RESEND_API_KEY=re_xxx
```

**必要な条件**:
- `executeIntegratedWorkflow`で`sendEmail: true`または`emailFallback: true`を指定する場合
- デフォルト値は`false`のため、**Email送信を使用しない場合は不要**

**設定不要の場合**:
- `sendEmail: false`（デフォルト）で`emailFallback: false`の場合
- Email送信機能を使用しない場合

---

## 🟢 オプション環境変数

以下の環境変数は、**使用する機能に応じて設定**します：

### Whop API Key（Whop連携を使用する場合）

```env
WHOP_API_KEY=whop_xxx
```

**必要な条件**:
- Whop Product情報の取得が必要な場合
- 設定がない場合、Whop関連のステップはエラーになりますが、ワークフローは続行可能

---

### App URL（内部API呼び出しを使用する場合）

```env
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

**必要な条件**:
- 内部API呼び出し（`callInternalApi`）を使用する場合
- デフォルトは`http://localhost:3000`

---

## 📊 使用シナリオ別の環境変数設定

### シナリオ1: 検索・分析のみ（DM送信なし）

```env
# 必須
XAI_API_KEY=xai_xxx
OPENAI_API_KEY=sk-xxx
GEMINI_API_KEY=xxx

# 不要
# TELEGRAM_BOT_TOKEN_* は不要
# RESEND_API_KEY は不要
```

**ワークフロー呼び出し例**:
```typescript
await executeIntegratedWorkflow({
  marketCode: 'EN',
  whopProductId: 'prod_xxx',
  sendTelegramDM: false,  // DM送信を無効化
  sendEmail: false,        // Email送信を無効化
});
```

---

### シナリオ2: 検索・分析 + Telegram DM送信

```env
# 必須
XAI_API_KEY=xai_xxx
OPENAI_API_KEY=sk-xxx
GEMINI_API_KEY=xxx
TELEGRAM_BOT_TOKEN_EN=xxx  # 使用する市場のトークン

# 不要
# RESEND_API_KEY は不要
```

**ワークフロー呼び出し例**:
```typescript
await executeIntegratedWorkflow({
  marketCode: 'EN',
  whopProductId: 'prod_xxx',
  sendTelegramDM: true,   // DM送信を有効化（デフォルト）
  sendEmail: false,       // Email送信を無効化（デフォルト）
});
```

---

### シナリオ3: 検索・分析 + Email送信

```env
# 必須
XAI_API_KEY=xai_xxx
OPENAI_API_KEY=sk-xxx
GEMINI_API_KEY=xxx
RESEND_API_KEY=re_xxx

# 不要
# TELEGRAM_BOT_TOKEN_* は不要
```

**ワークフロー呼び出し例**:
```typescript
await executeIntegratedWorkflow({
  marketCode: 'EN',
  whopProductId: 'prod_xxx',
  sendTelegramDM: false,  // DM送信を無効化
  sendEmail: true,        // Email送信を有効化
});
```

---

### シナリオ4: Tri-Forceワークフロー（DM生成のみ、送信なし）

```env
# 必須
XAI_API_KEY=xai_xxx
OPENAI_API_KEY=sk-xxx
GEMINI_API_KEY=xxx

# 不要
# TELEGRAM_BOT_TOKEN_* は不要（DM生成のみで送信しないため）
# RESEND_API_KEY は不要
```

**ワークフロー呼び出し例**:
```typescript
await executeTriForceSynergyWorkflow({
  marketCode: 'EN',
  whopProductId: 'prod_xxx',
  niche: 'crypto trading',
  // DMは生成されるが、送信は別のAPIルートで行う
});
```

---

## ✅ 結論

### Resend API Key
- **設定不要**: `sendEmail: false`（デフォルト）の場合
- **設定必要**: `sendEmail: true`または`emailFallback: true`の場合

### Telegram Bot Token
- **設定不要**: `sendTelegramDM: false`を明示的に指定する場合、またはDM生成のみで送信しない場合
- **設定必要**: `sendTelegramDM: true`（デフォルト）でDM送信を使用する場合

### 推奨設定

**最小構成（検索・分析のみ）**:
```env
XAI_API_KEY=xai_xxx
OPENAI_API_KEY=sk-xxx
GEMINI_API_KEY=xxx
```

**フル機能構成（検索・分析・DM送信・Email送信）**:
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
WHOP_API_KEY=whop_xxx
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

---

**最終更新**: 2026-01-10
