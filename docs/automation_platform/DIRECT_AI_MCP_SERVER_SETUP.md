# Direct AI API MCP Server セットアップガイド

**作成日**: 2026-01-09  
**目的**: Cursorのパフォーマンス低下を防ぐため、軽量なMCPサーバーで`direct-ai-api.ts`にアクセス

---

## 📋 概要

`direct-ai-api.ts`は、以下のAPIをREST APIで直接呼び出すユーティリティプログラムです：

- **AI API**: GPT-5.2, GPT-4o, Grok 4.1 Fast Reasoning, Gemini 3 Pro DeepResearch
- **Resend API**: メール送信、一括送信、ステータス取得
- **Telegram API**: メッセージ送信、画像/動画送信、全言語一括送信
- **Whop API**: アフィリエイトリンク生成、プロダクト/プラン取得
- **HeyGen API**: ライブラリアップロード、動画作成
- **CryptoQuant API**: データ取得、APIキー検証

このMCPサーバーは、`direct-ai-api.ts`に直接アクセスする軽量版です。

---

## 🚀 セットアップ手順

### 1. MCP設定ファイルを編集

`~/.cursor/mcp.json`（Windows: `C:\Users\<ユーザー名>\.cursor\mcp.json`）を編集：

```json
{
  "mcpServers": {
    "direct-ai-api": {
      "command": "node",
      "args": [
        "C:\\Users\\chiba\\hadayalab-automation-platform\\scripts\\direct-ai-mcp-server.js"
      ],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

**注意**: パスは絶対パスで指定してください。

### 2. 環境変数の確認

`.env`ファイルに以下の環境変数が設定されていることを確認：

```env
# AI API
OPENAI_API_KEY=sk-xxx
XAI_API_KEY=xai-xxx
GEMINI_API_KEY=xxx

# Resend API
RESEND_API_KEY=re_xxx

# Telegram API
TELEGRAM_BOT_TOKEN_EN=xxx
TELEGRAM_BOT_TOKEN_AR=xxx
TELEGRAM_BOT_TOKEN_KO=xxx
TELEGRAM_BOT_TOKEN_JA=xxx
TELEGRAM_BOT_TOKEN_ES=xxx
TELEGRAM_BOT_TOKEN_PT_BR=xxx
TELEGRAM_CHAT_ID_EN=xxx
TELEGRAM_CHAT_ID_AR=xxx
TELEGRAM_CHAT_ID_KO=xxx
TELEGRAM_CHAT_ID_JA=xxx
TELEGRAM_CHAT_ID_ES=xxx
TELEGRAM_CHAT_ID_PT_BR=xxx

# Whop API
WHOP_API_KEY=whop_xxx

# HeyGen API
HEYGEN_API_KEY=xxx

# CryptoQuant API
CRYPTOQUANT_API_KEY=xxx
```

### 3. Cursorを再起動

MCP設定を反映するため、Cursorを再起動してください。

---

## 🛠️ 利用可能なツール

### AI API

#### `gpt52`
GPT-5.2 (gpt-4o) を使用してテキスト生成・分析を実行

**パラメータ**:
- `prompt` (必須): プロンプト
- `temperature` (オプション): 温度パラメータ（デフォルト: 0.7）
- `maxCompletionTokens` (オプション): 最大トークン数（デフォルト: 4000）

#### `grok41`
Grok 4.1 Fast Reasoning を使用して高速推論を実行

**パラメータ**:
- `prompt` (必須): プロンプト
- `temperature` (オプション): 温度パラメータ（デフォルト: 0.7）
- `maxTokens` (オプション): 最大トークン数（デフォルト: 4096）

#### `gemini3pro`
Gemini 3 Pro DeepResearch を使用して深い推論・分析を実行

**パラメータ**:
- `prompt` (必須): プロンプト
- `thinkingLevel` (オプション): 思考レベル（"low" | "high"、デフォルト: "high"）
- `temperature` (オプション): 温度パラメータ（デフォルト: 0.7）
- `maxOutputTokens` (オプション): 最大出力トークン数

### Resend API

#### `resend_send`
Resendでメールを送信

**パラメータ**:
- `from` (必須): 送信者メールアドレス
- `to` (必須): 受信者メールアドレス（カンマ区切りで複数指定可能）
- `subject` (必須): 件名
- `html` (オプション): HTML本文
- `text` (オプション): テキスト本文（htmlまたはtextのいずれかが必須）
- `cc` (オプション): CC（カンマ区切り）
- `bcc` (オプション): BCC（カンマ区切り）

#### `resend_bulk`
Resendで一括メール送信

**パラメータ**:
- `from` (必須): 送信者メールアドレス
- `to` (必須): 受信者メールアドレス（カンマ区切り）
- `subject` (必須): 件名
- `html` (オプション): HTML本文
- `text` (オプション): テキスト本文

### Telegram API

#### `telegram_send`
Telegramでメッセージを送信

**パラメータ**:
- `language` (必須): 言語コード（"AR" | "EN" | "ES" | "JA" | "KO" | "PT-BR"）
- `message` (必須): メッセージ
- `parseMode` (オプション): パースモード（"HTML" | "Markdown" | "MarkdownV2"）

#### `telegram_send_all`
Telegramで全言語にメッセージを一括送信

**パラメータ**:
- `defaultMessage` (必須): デフォルトメッセージ
- `parseMode` (オプション): パースモード

### Whop API

#### `whop_affiliate_link`
Whopアフィリエイトリンクを生成

**パラメータ**:
- `productId` (必須): プロダクトID
- `affiliateId` (必須): アフィリエイトID
- `planId` (オプション): プランID
- `customCode` (オプション): カスタムコード

#### `whop_get_product`
Whopプロダクト情報を取得

**パラメータ**:
- `productId` (必須): プロダクトID

#### `whop_get_plan`
Whopプラン情報を取得

**パラメータ**:
- `planId` (必須): プランID

### HeyGen API

#### `heygen_upload`
HeyGenライブラリにアセットをアップロード

**パラメータ**:
- `filePath` (必須): ファイルパス

#### `heygen_create_video`
HeyGenライブラリから動画を作成

**パラメータ**:
- `assetId` (必須): アセットID
- `script` (必須): スクリプト

### CryptoQuant API

#### `cryptoquant_get_data`
CryptoQuantデータを取得

**パラメータ**:
- `endpoint` (必須): エンドポイント（例: "/btc/exchange-flows/netflow"）
- `params` (オプション): パラメータ（JSON形式のオブジェクト）

#### `cryptoquant_verify_key`
CryptoQuant APIキーを検証

**パラメータ**: なし

---

## ✅ 軽量化のポイント

1. **最小限のツール**: よく使う機能のみを提供
2. **直接インポート**: `direct-ai-api.ts`を直接インポート（重複実装なし）
3. **シンプルな構造**: 複雑な処理を避け、軽量に保つ
4. **エラーハンドリング**: 最小限のエラーハンドリング

---

## 🎯 使用例

### GPTレビューを実行

```
gpt52 を使用して、コードレビューを実行してください。
プロンプト: [GPT_REVIEW_COMPLETE.mdの内容]
```

### Resendでメール送信

```
resend_send を使用して、アフィリエイト招待メールを送信してください。
from: affiliate@cryptotradeacademy.io
to: candidate@example.com
subject: Trap Defense Academy アフィリエイトプログラムへのご招待
html: [HTMLコンテンツ]
```

### Telegramでメッセージ送信

```
telegram_send を使用して、日本語のTelegramチャンネルにメッセージを送信してください。
language: JA
message: 新しいアフィリエイト候補が見つかりました！
```

---

## 📝 注意事項

1. **環境変数の設定**: 必要な環境変数がすべて設定されていることを確認
2. **パスの指定**: MCP設定ファイルでは絶対パスを使用
3. **Cursorの再起動**: MCP設定変更後はCursorを再起動

---

## 🔧 トラブルシューティング

### MCPサーバーが起動しない

1. **パスの確認**: MCP設定ファイルのパスが正しいか確認
2. **環境変数の確認**: `.env`ファイルに必要な環境変数が設定されているか確認
3. **ログの確認**: CursorのMCPログを確認

### ツールが動作しない

1. **環境変数の確認**: 該当するAPIの環境変数が設定されているか確認
2. **エラーメッセージの確認**: ツールのエラーメッセージを確認

---

## ✅ まとめ

**`direct-ai-mcp-server.js`は、`direct-ai-api.ts`に直接アクセスする軽量なMCPサーバーです。**

- ✅ 軽量化: 最小限の機能のみを提供
- ✅ 直接アクセス: `direct-ai-api.ts`を直接インポート
- ✅ 多機能: GPT/Grok/Gemini/Resend/Telegram/Whop/HeyGen/CryptoQuantに対応

Cursorのパフォーマンス低下を防ぎながら、必要なAPI機能を利用できます。
