# AI MCP Servers セットアップガイド

**作成日**: 2026-01-12  
**目的**: GPT、Gemini、GrokのMCPサーバー統合セットアップガイド

---

## 📋 概要

このガイドでは、3つのAI MCPサーバー（GPT、Gemini、Grok）のセットアップ方法を説明します。

**利用可能なMCPサーバー**:
- ✅ **GPT MCP Server**: GPT-5.2-2025-12-11（CTO役割、技術的意思決定）
- ✅ **Gemini MCP Server**: Gemini 3 Flash Preview（CMO/CKO役割、マーケティング・コンテンツ生成）
- ✅ **Grok MCP Server**: Grok 2-1212 Fast Reasoning（CFO/CRO/CSO役割、大規模分析・高速推論）

---

## 🚀 セットアップ手順

### 1. MCP設定ファイルを編集

`~/.cursor/mcp.json`（Windows: `C:\Users\<ユーザー名>\.cursor\mcp.json`）を編集：

```json
{
  "mcpServers": {
    "gpt": {
      "command": "node",
      "args": [
        "C:\\Users\\chiba\\hadayalab-automation-platform\\scripts\\gpt-mcp-server.js"
      ],
      "env": {
        "NODE_ENV": "production"
      }
    },
    "gemini": {
      "command": "node",
      "args": [
        "C:\\Users\\chiba\\hadayalab-automation-platform\\scripts\\gemini-mcp-server.js"
      ],
      "env": {
        "NODE_ENV": "production"
      }
    },
    "grok": {
      "command": "node",
      "args": [
        "C:\\Users\\chiba\\hadayalab-automation-platform\\scripts\\grok-mcp-server.js"
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

`api/.env`ファイルに以下の環境変数が設定されていることを確認：

```env
# GPT
OPENAI_API_KEY=sk-xxx

# Gemini
GEMINI_API_KEY=xxx

# Grok
XAI_API_KEY=xxx
```

### 3. 依存関係の確認

以下のパッケージがインストールされていることを確認（既にインストール済み）：

```bash
npm install @modelcontextprotocol/sdk dotenv
```

### 4. Cursorの再起動

MCP設定ファイルを編集した後、Cursorを再起動してMCPサーバーを有効化します。

---

## 🛠️ 利用可能なツール

### GPT MCP Server

#### 1. `gpt_analyze`
**説明**: GPT-5.2-2025-12-11を使用して高精度分析を実行します。深い理解・戦略的思考・論理的推論に最適です。CTOとしての技術的意思決定やコードレビューに使用できます。

**パラメータ**:
- `prompt` (必須): 分析したい内容や質問
- `temperature` (オプション): 温度パラメータ（0.0-2.0、デフォルト: 0.3）
- `maxCompletionTokens` (オプション): 最大出力トークン数（デフォルト: 4000）

**使用例**:
```
@gpt_analyze "Next.js 16のビルドエラーを解決してください。"
```

#### 2. `gpt_chat`
**説明**: GPT-5.2-2025-12-11を使用した一般的なチャット。質問応答、会話、情報取得など。

**パラメータ**:
- `prompt` (必須): ユーザーの質問やメッセージ
- `temperature` (オプション): 温度パラメータ（0.0-2.0、デフォルト: 0.7）
- `maxCompletionTokens` (オプション): 最大出力トークン数（デフォルト: 2000）

---

### Gemini MCP Server

#### 1. `gemini_research`
**説明**: Gemini 3 Flash Previewを使用してDeepResearch相当の高精度分析を実行します。マルチモーダル対応、複雑な問題の深い理解、視覚的な情報の分析に最適です。CMOやCKOとしてのマーケティング戦略、コンテンツ生成、データ分析に使用できます。

**パラメータ**:
- `prompt` (必須): 分析したい内容や質問
- `thinkingLevel` (オプション): 思考レベル（low/high、デフォルト: high）
- `temperature` (オプション): 温度パラメータ（0.0-2.0、デフォルト: 0.7）
- `maxOutputTokens` (オプション): 最大出力トークン数（デフォルト: 8192）

**使用例**:
```
@gemini_research "マーケティング戦略を立案してください。"
```

#### 2. `gemini_chat`
**説明**: Gemini 3 Flash Previewを使用した一般的なチャット。質問応答、会話、情報取得など。マルチモーダル対応。

**パラメータ**:
- `prompt` (必須): ユーザーの質問やメッセージ
- `temperature` (オプション): 温度パラメータ（0.0-2.0、デフォルト: 0.7）
- `maxOutputTokens` (オプション): 最大出力トークン数（デフォルト: 4096）

#### 3. `nanobanana_generate`
**説明**: NanoBanana Pro（Gemini 3 Pro Image Preview）を使用してハイエンド画像を生成します。LP用の高品質な画像生成に最適です。

**パラメータ**:
- `prompt` (必須): 画像生成用のプロンプト
- `aspectRatio` (オプション): アスペクト比（1:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9、デフォルト: 16:9）
- `imageSize` (オプション): 画像サイズ（1K, 2K, 4K、デフォルト: 2K）
- `savePath` (オプション): 画像保存パス

**使用例**:
```
@nanobanana_generate "A futuristic glowing hexagonal core floating in a dark high-tech command center"
```

#### 4. `veo_generate`
**説明**: Veo 3.1を使用して高品質な動画を生成します。ループ動画、VSL用動画の生成に最適です。非同期処理のため、完了まで時間がかかる場合があります。

**パラメータ**:
- `prompt` (必須): 動画生成用のプロンプト
- `referenceImages` (オプション): 参照画像のURL配列（最大3つ）
- `startFrame` (オプション): 開始フレームのBase64データURL
- `endFrame` (オプション): 終了フレームのBase64データURL
- `pollInterval` (オプション): ポーリング間隔（秒、デフォルト: 10）
- `maxPollAttempts` (オプション): 最大ポーリング試行回数（デフォルト: 60）
- `savePath` (オプション): 動画保存パス

**使用例**:
```
@veo_generate "A 10-second cinematic loop starting with a red whale-trap alert on a trading screen"
```

---

### Grok MCP Server

#### 1. `grok_reasoning`
**説明**: Grok 2-1212 Fast Reasoningを使用して高速推論を実行します。大規模コンテキスト（2Mトークン）に対応し、複数ファイルにまたがるエラーの分析、大規模コードベースの分析に最適です。CFO/CRO/CSOとしての財務分析、リスク評価、戦略的意思決定に使用できます。

**パラメータ**:
- `prompt` (必須): 分析したい内容や質問
- `temperature` (オプション): 温度パラメータ（0.0-2.0、デフォルト: 0.3）
- `maxTokens` (オプション): 最大出力トークン数（デフォルト: 4096）

**使用例**:
```
@grok_reasoning "大規模コードベースを分析してください。"
```

#### 2. `grok_chat`
**説明**: Grok 2-1212を使用した一般的なチャット。質問応答、会話、情報取得など。高速推論に最適。

**パラメータ**:
- `prompt` (必須): ユーザーの質問やメッセージ
- `temperature` (オプション): 温度パラメータ（0.0-2.0、デフォルト: 0.7）
- `maxTokens` (オプション): 最大出力トークン数（デフォルト: 2048）

---

## 🎯 用途別推奨モデル

### ビルドエラー・型エラー解決
- **推奨**: `@gpt_analyze`（GPT-5.2）
- **理由**: TypeScript/Next.jsの型エラー解決に最適

### マーケティング戦略・コンテンツ生成
- **推奨**: `@gemini_research`（Gemini 3 Flash）
- **理由**: DeepResearch相当の深い分析、マルチモーダル対応

### 大規模コードベース分析
- **推奨**: `@grok_reasoning`（Grok 2-1212）
- **理由**: 2Mトークンのコンテキストウィンドウで大規模コードベースを一度に分析可能

---

## 📝 使用例

### Cursorから直接呼び出す

1. **GPT**: `@gpt_analyze "ビルドエラーを解決してください"`
2. **Gemini**: `@gemini_research "マーケティング戦略を立案してください"`
3. **Grok**: `@grok_reasoning "大規模コードベースを分析してください"`

### 複数モデルの組み合わせ

```
1. @gpt_analyze で技術的な問題を分析
2. @gemini_research でマーケティング戦略を立案
3. @grok_reasoning で大規模データを分析
```

---

## ✅ 確認事項

- [ ] MCP設定ファイルが正しく設定されている
- [ ] `api/.env`に必要なAPIキーが設定されている
  - [ ] `OPENAI_API_KEY`（GPT用）
  - [ ] `GEMINI_API_KEY`（Gemini用）
  - [ ] `XAI_API_KEY`（Grok用）
- [ ] 依存関係がインストールされている
- [ ] Cursorを再起動してMCPサーバーを有効化
- [ ] 各MCPサーバーが正常に起動している

---

## 🔍 トラブルシューティング

### エラー: "Failed to import callXXX"

**原因**: `api/unified-api.ts`が見つからない、またはエクスポートされていない

**解決策**:
1. `api/unified-api.ts`が存在することを確認
2. 該当する関数がエクスポートされていることを確認

### エラー: "XXX_API_KEY is not set"

**原因**: 環境変数が設定されていない

**解決策**:
1. `api/.env`ファイルに該当するAPIキーを設定
2. MCP設定ファイルの`env`セクションに直接設定

### エラー: "Unknown tool"

**原因**: ツール名が間違っている

**解決策**:
1. 正しいツール名を使用（`gpt_analyze`, `gemini_research`, `grok_reasoning`など）
2. ツール名のスペルを確認

---

## 📚 関連ドキュメント

- [GPT MCP Server 詳細](./GPT_MCP_SERVER_SETUP.md)
- [GPT MCP Server リファレンス](./GPT_MCP_SERVER_REFERENCE.md)
- [デバッグ最強モデル分析](./BEST_MODEL_FOR_DEBUGGING.md)

---

**最終更新**: 2026-01-12  
**作成者**: COO（Cursor/Composer）
