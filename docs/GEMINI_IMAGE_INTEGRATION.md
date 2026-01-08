# Gemini画像・動画統合ガイド

## 概要

Dr. Grok's Market LeakメッセージにGeminiで生成した画像や動画を埋め込む機能の実装ガイドです。

## 実装状況

### ✅ 完了
- `services/gemini/imageGenerator.js`: 画像生成サービスの構造
- `services/telegram/bot.js`: `sendPhoto`と`sendVideo`関数の追加
- `api/cron.js`: 画像生成の統合ポイント（環境変数で有効化）

### ⚠️ 要実装
- 実際のGemini API呼び出し（MCP経由または直接API呼び出し）
- 生成された画像/動画の一時保存またはURL取得
- エラーハンドリングとフォールバック

## 使用方法

### 1. 環境変数の設定

`.env`または`.env.local`に以下を追加:

```bash
# Gemini画像生成を有効化（オプション）
ENABLE_GEMINI_IMAGES=true
```

### 2. Gemini APIの設定

#### オプションA: MCPサーバー経由（推奨）

MCPサーバー（`mcp_gemini`）が設定されている場合、`api/cron.js`内でMCPツールを呼び出します。

#### オプションB: 直接Gemini API呼び出し

Google AI SDKを使用して直接Gemini APIを呼び出します:

```bash
npm install @google/generative-ai
```

`services/gemini/imageGenerator.js`を更新して、直接APIを呼び出す実装を追加します。

### 3. 実装例（MCP経由）

`api/cron.js`の画像生成部分を以下のように実装:

```javascript
if (ENABLE_GEMINI_IMAGES) {
  try {
    // MCPツール経由でGemini画像生成
    // 注意: 実際のMCP呼び出しは環境に依存
    const geminiImageResult = await mcp_gemini_nano_banana_generate_image({
      prompt: generateImagePrompt(snapshot, LANG),
      model: 'nano-banana-pro',
      aspectRatio: '16:9',
      numberOfImages: 1,
    });
    
    if (geminiImageResult && geminiImageResult.images && geminiImageResult.images.length > 0) {
      imageUrl = geminiImageResult.images[0].url;
    }
  } catch (error) {
    console.warn('[Gemini] Image generation failed:', error.message);
  }
}
```

## 生成される画像の内容

市場データに基づいて以下の情報を可視化:
- BTC価格
- マーケットスコア（0-100）
- センチメント（Fear/Greedなど）
- 24時間変動率
- 取引所フロー（Inflow/Outflow）

スタイル: モダンでクリーンなトレーディングダッシュボードスタイル、ダークテーマ

## 言語対応

以下の6言語に対応:
- EN (英語)
- JA (日本語)
- KO (韓国語)
- ES (スペイン語)
- PT-BR (ポルトガル語)
- AR (アラビア語)

各言語に適したプロンプトで画像を生成します。

## 動画生成（将来実装）

Veo 3.1を使用した動画生成も準備中です。`generateMarketVideo`関数を実装することで、市場動向を短い動画で表現できます。

## トラブルシューティング

### 画像が生成されない場合

1. 環境変数`ENABLE_GEMINI_IMAGES=true`が設定されているか確認
2. Gemini APIキーまたはMCPサーバー設定を確認
3. エラーログを確認（`[Gemini ImageGenerator]`で始まるログ）

### 画像送信が失敗する場合

- Telegram APIの制限（画像サイズ、形式）を確認
- 画像URLが有効か確認
- エラー時は自動的にテキストのみ送信にフォールバック

## パフォーマンス考慮事項

- 画像生成には数秒かかる可能性があるため、タイムアウト設定を推奨
- 生成失敗時はテキストのみ送信で処理を継続
- 画像生成を非同期で実行し、メッセージ送信をブロックしない
