# 直接AI API呼び出しガイド

**作成日**: 2026-01-09  
**目的**: MCPサーバーを使わずに、ハイエンドモデルを直接呼び出す方法

---

## 📋 概要

MCPサーバーを実装しなくても、**直接APIを呼び出す**ことができます。この方法は、スクリプトやバッチ処理、CI/CDパイプラインなどで便利です。

---

## 🚀 使用方法

### 1. CLIから直接呼び出す

```bash
# Gemini 3 Pro DeepResearch
npx tsx scripts/direct-ai-api.ts gemini "プロンプト"

# GPT-5.2 ハイエンド推論
npx tsx scripts/direct-ai-api.ts gpt "プロンプト"

# Grok 4.1 Fast Reasoning
npx tsx scripts/direct-ai-api.ts grok "プロンプト"
```

### 2. TypeScript/JavaScriptからインポートして使用

```typescript
import { callGemini3Pro, callGPT52, callGrok41FastReasoning } from "./scripts/direct-ai-api.js";

// Gemini 3 Pro DeepResearch
const geminiResult = await callGemini3Pro("プロンプト", {
  thinkingLevel: "high", // DeepResearch相当
  temperature: 0.7,
});

// GPT-5.2 ハイエンド推論
const gptResult = await callGPT52("プロンプト", {
  reasoningEffort: "high",
  verbosity: "high",
  temperature: 0.3,
});

// Grok 4.1 Fast Reasoning
const grokResult = await callGrok41FastReasoning("プロンプト", {
  maxTokens: 4096,
  temperature: 0.7,
});
```

---

## 📊 各モデルの設定

### NanoBanana Pro ハイエンド画像生成

```typescript
const result = await callNanoBananaPro(prompt, {
  aspectRatio: "16:9", // "1:1" | "2:3" | "3:2" | "3:4" | "4:3" | "4:5" | "5:4" | "9:16" | "16:9" | "21:9" (デフォルト: "16:9")
  imageSize: "2K",     // "1K" | "2K" | "4K" (デフォルト: "2K" - ハイエンド推論向け)
  savePath: "./image.png", // オプション: 画像をファイルに保存
});
```

**特徴**:
- `imageSize: "2K"`でハイエンド品質（デフォルト）
- `aspectRatio: "16:9"`でLP用に最適化（デフォルト）
- Base64 Data URLまたはファイルパスで返却

---

### Veo 3.1 ハイエンド動画生成

```typescript
const result = await callVeo31(prompt, {
  referenceImages: ["url1", "url2"], // オプション: 参照画像（最大3つ）
  pollInterval: 10,                  // ポーリング間隔（秒、デフォルト: 10）
  maxPollAttempts: 60,               // 最大ポーリング試行回数（デフォルト: 60）
  savePath: "./video.mp4",           // オプション: 動画保存パス
});
```

**特徴**:
- 非同期処理（ポーリングで完了を待つ）
- 高品質な動画生成
- URIまたはファイルパスで返却

---

### Gemini 3 Pro DeepResearch

```typescript
const result = await callGemini3Pro(prompt, {
  thinkingLevel: "high", // "low" | "high" (デフォルト: "high")
  temperature: 0.7,      // 0-2 (デフォルト: 0.7)
  maxOutputTokens: 2048, // オプション
});
```

**特徴**:
- `thinkingLevel: "high"`でDeepResearch相当の深い推論
- `thinkingLevel: "low"`で高速処理

---

### GPT-5.2 ハイエンド推論

```typescript
const result = await callGPT52(prompt, {
  temperature: 0.3,         // ハイエンド推論推奨: 0.3-0.5
  maxCompletionTokens: 4000, // オプション
});
```

**特徴**:
- ⚠️ **`reasoningEffort`と`verbosity`パラメータはサポートされていません**
- GPT-5.2-2025-12-11のAPIではこれらのパラメータを送信すると`400 Unknown parameter`エラーが発生します
- 高品質な出力を得るには、プロンプト設計と`temperature`/`maxCompletionTokens`の調整で対応してください
- コンテキストウィンドウ: 400,000トークン

---

### Grok 4.1 Fast Reasoning

```typescript
const result = await callGrok41FastReasoning(prompt, {
  temperature: 0.7,  // 0-1 (デフォルト: 0.7)
  maxTokens: 4096,   // ハイエンド推論向け (デフォルト: 4096)
});
```

**特徴**:
- 推論の深さは**自動決定**（パラメータ調整不可）
- プロンプトの品質が推論の深さに影響
- `presencePenalty`, `frequencyPenalty`, `stop`はサポートされていない

---

## 🔧 環境変数の設定

`.env`ファイルに以下を設定してください：

```env
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key
XAI_API_KEY=your_xai_api_key
```

---

## 📝 使用例

### 例1: LPレビューを3つのモデルで実行

```typescript
import { callGemini3Pro, callGPT52, callGrok41FastReasoning } from "./scripts/direct-ai-api.js";

const lpCode = "..."; // LPのコード
const prompt = `以下のLPコードをレビューしてください:\n\n${lpCode}`;

// Gemini 3 Pro (CMO/CKO視点)
const geminiReview = await callGemini3Pro(prompt, {
  thinkingLevel: "high",
});

// GPT-5.2 (CTO/CPO視点)
const gptReview = await callGPT52(prompt, {
  temperature: 0.3,
});

// Grok 4.1 (最後の砦)
const grokReview = await callGrok41FastReasoning(prompt, {
  maxTokens: 4096,
});
```

### 例2: バッチ処理

```typescript
const prompts = ["プロンプト1", "プロンプト2", "プロンプト3"];

for (const prompt of prompts) {
  const result = await callGemini3Pro(prompt, {
    thinkingLevel: "high",
  });
  console.log(result.text);
}
```

### 例3: LP用画像生成（NanoBanana Pro）

```typescript
import { callNanoBananaPro } from "./scripts/direct-ai-api.js";

// Telegram UI画像
const telegramImage = await callNanoBananaPro(
  "TelegramのメッセージUIが表示されているスマホの画面、モダンなデザイン、高品質",
  {
    aspectRatio: "16:9",
    imageSize: "2K",
    savePath: "./public/images/lp/telegram-ui.png",
  }
);

// 比較グラフ画像
const comparisonChart = await callNanoBananaPro(
  "BTC価格の比較グラフ、プロフェッショナルなデータ可視化",
  {
    aspectRatio: "16:9",
    imageSize: "2K",
    savePath: "./public/images/lp/comparison-chart.png",
  }
);
```

### 例4: VSL動画生成（Veo 3.1）

```typescript
import { callVeo31 } from "./scripts/direct-ai-api.js";

const vslVideo = await callVeo31(
  "BTCトレーダーがスマホでTelegramメッセージを確認しているシーン、プロフェッショナルな品質、8秒",
  {
    pollInterval: 10,
    maxPollAttempts: 60,
  }
);

console.log("動画URI:", vslVideo.videos[0].uri);
```

---

## 🆚 MCPサーバー vs 直接API呼び出し

| 特徴 | MCPサーバー | 直接API呼び出し |
|---|---|---|
| **用途** | CursorなどのIDE統合 | スクリプト、バッチ処理、CI/CD |
| **設定** | MCP設定ファイルが必要 | 環境変数のみ |
| **起動** | Cursor起動時に自動起動 | 必要時に呼び出し |
| **柔軟性** | IDE統合に最適化 | より柔軟なカスタマイズ可能 |
| **パフォーマンス** | 常時起動（オーバーヘッドあり） | 必要時のみ起動（効率的） |

---

## 📋 実装ファイル

- `scripts/direct-ai-api.ts` - 直接API呼び出しユーティリティ
  - `callGemini3Pro()` - Gemini 3 Pro DeepResearch
  - `callGPT52()` - GPT-5.2 ハイエンド推論
  - `callGrok41FastReasoning()` - Grok 4.1 Fast Reasoning
  - `callNanoBananaPro()` - NanoBanana Pro ハイエンド画像生成
  - `callVeo31()` - Veo 3.1 ハイエンド動画生成
- `scripts/direct-ai-api-example.ts` - 使用例

---

## ✅ メリット

1. **MCPサーバーの設定不要**: 環境変数さえ設定すればすぐに使える
2. **柔軟なカスタマイズ**: パラメータを自由に調整可能
3. **バッチ処理対応**: 複数のプロンプトを効率的に処理
4. **CI/CD統合**: 自動化パイプラインに組み込みやすい

---

## 🎉 まとめ

**MCPサーバーを使わなくても、直接APIを呼び出すことができます。**

- **CLI使用**: `npx tsx scripts/direct-ai-api.ts <provider> <prompt>`
- **プログラムから使用**: `import { callGemini3Pro, callGPT52, callGrok41FastReasoning } from "./scripts/direct-ai-api.js"`

用途に応じて、MCPサーバーと直接API呼び出しを使い分けてください。
