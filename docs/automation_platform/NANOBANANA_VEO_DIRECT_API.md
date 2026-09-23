# NanoBanana Pro & Veo 3.1 直接API呼び出しガイド

**作成日**: 2026-01-09  
**目的**: MCPサーバーを使わずに、NanoBanana Pro（画像生成）とVeo 3.1（動画生成）を直接呼び出す方法

---

## 📋 概要

MCPサーバーを実装しなくても、**直接APIを呼び出す**ことができます。LP用の画像・動画生成に最適です。

---

## 🎨 NanoBanana Pro ハイエンド画像生成

### 基本的な使用

```typescript
import { callNanoBananaPro } from "./scripts/direct-ai-api.js";

const result = await callNanoBananaPro(
  "TelegramのメッセージUIが表示されているスマホの画面、モダンなデザイン、高品質",
  {
    aspectRatio: "16:9", // LP用
    imageSize: "2K",     // ハイエンド品質（デフォルト）
    savePath: "./public/images/lp/telegram-ui.png", // オプション
  }
);

console.log("生成された画像:", result.images[0].dataUrl);
```

### パラメータ

| パラメータ | 型 | デフォルト | 説明 |
|---|---|---|---|
| `aspectRatio` | `"1:1" \| "2:3" \| "3:2" \| "3:4" \| "4:3" \| "4:5" \| "5:4" \| "9:16" \| "16:9" \| "21:9"` | `"16:9"` | アスペクト比（LP用に16:9をデフォルト） |
| `imageSize` | `"1K" \| "2K" \| "4K"` | `"2K"` | 画像サイズ（ハイエンド推論向けに2Kをデフォルト） |
| `savePath` | `string` | `undefined` | 画像をファイルに保存するパス（オプション） |

### レスポンス

```typescript
{
  images: [
    {
      mimeType: "image/png",
      dataUrl: "data:image/png;base64,...",
      base64Data: "...",
      filePath?: "./public/images/lp/image.png" // savePathが指定された場合
    }
  ],
  model: "gemini-3-pro-image-preview",
  aspectRatio: "16:9",
  imageSize: "2K"
}
```

---

## 🎬 Veo 3.1 ハイエンド動画生成

### 基本的な使用

```typescript
import { callVeo31 } from "./scripts/direct-ai-api.js";

const result = await callVeo31(
  "BTCトレーダーがスマホでTelegramメッセージを確認しているシーン、プロフェッショナルな品質、8秒",
  {
    pollInterval: 10,      // ポーリング間隔（秒）
    maxPollAttempts: 60,    // 最大ポーリング試行回数
    // savePath: "./public/videos/lp/vsl.mp4", // オプション
  }
);

console.log("動画URI:", result.videos[0].uri);
```

### パラメータ

| パラメータ | 型 | デフォルト | 説明 |
|---|---|---|---|
| `referenceImages` | `string[]` | `undefined` | 参照画像のURL（最大3つ） |
| `startFrame` | `string` | `undefined` | 開始フレームのBase64データURL |
| `endFrame` | `string` | `undefined` | 終了フレームのBase64データURL |
| `extendVideo` | `any` | `undefined` | 動画延長設定 |
| `pollInterval` | `number` | `10` | ポーリング間隔（秒） |
| `maxPollAttempts` | `number` | `60` | 最大ポーリング試行回数 |
| `savePath` | `string` | `undefined` | 動画保存パス（オプション） |

### レスポンス

```typescript
{
  videos: [
    {
      uri: "gs://...", // Google Cloud Storage URI
      name: "...",
      filePath?: "./public/videos/lp/video.mp4" // savePathが指定された場合
    }
  ],
  model: "veo-3.1-generate-preview",
  operation: { ... } // オペレーション情報
}
```

**注意**: Veo 3.1は**非同期処理**です。動画生成リクエストを送信すると、オペレーション（job）が返され、ポーリングで完了を待つ必要があります。

---

## 🚀 CLIから直接呼び出す

```bash
# NanoBanana Pro 画像生成
npx tsx scripts/direct-ai-api.ts nanobanana "プロンプト" --aspectRatio 16:9 --imageSize 2K --savePath ./image.png

# Veo 3.1 動画生成
npx tsx scripts/direct-ai-api.ts veo "プロンプト"
```

---

## 📝 使用例

### LP用画像生成（5つの画像）

```typescript
import { callNanoBananaPro } from "./scripts/direct-ai-api.js";

const imagePrompts = [
  {
    prompt: "TelegramのメッセージUIが表示されているスマホの画面、モダンなデザイン、高品質",
    savePath: "./public/images/lp/telegram-ui.png",
  },
  {
    prompt: "BTC価格の比較グラフ、プロフェッショナルなデータ可視化、16:9",
    savePath: "./public/images/lp/comparison-chart.png",
  },
  {
    prompt: "CryptoQuantのロゴ、プロフェッショナルなデザイン、白背景",
    savePath: "./public/images/lp/cryptoquant-logo.png",
  },
  {
    prompt: "Grokのロゴ、プロフェッショナルなデザイン、白背景",
    savePath: "./public/images/lp/grok-logo.png",
  },
  {
    prompt: "GPTのロゴ、プロフェッショナルなデザイン、白背景",
    savePath: "./public/images/lp/gpt-logo.png",
  },
];

for (const { prompt, savePath } of imagePrompts) {
  const result = await callNanoBananaPro(prompt, {
    aspectRatio: "16:9",
    imageSize: "2K",
    savePath,
  });
  console.log(`✅ ${savePath} を生成しました`);
}
```

### VSL動画生成

```typescript
import { callVeo31 } from "./scripts/direct-ai-api.js";

const vslVideo = await callVeo31(
  "Two traders, Trader A and Trader B. Trader A lost months of profits. Trader B earned $5K while drinking coffee. Professional quality, 15 seconds",
  {
    pollInterval: 10,
    maxPollAttempts: 60,
  }
);

console.log("VSL動画URI:", vslVideo.videos[0].uri);
```

---

## 📋 実装ファイル

- `scripts/direct-ai-api.ts` - 直接API呼び出しユーティリティ
  - `callNanoBananaPro()` - NanoBanana Pro ハイエンド画像生成
  - `callVeo31()` - Veo 3.1 ハイエンド動画生成

---

## ✅ 実装完了確認

- [x] NanoBanana Pro: ハイエンド設定（`imageSize: "2K"`、`aspectRatio: "16:9"`）
- [x] Veo 3.1: 非同期処理とポーリングの実装
- [x] CLI対応: `nanobanana`と`veo`プロバイダーの追加
- [x] ファイル保存機能: `savePath`オプション

---

## 🎉 実装完了

**NanoBanana ProとVeo 3.1のハイエンド設定を直接API呼び出しで実装しました。**

これで、MCPサーバーを使わずに、LP用の画像・動画を直接生成できます。

---

**参照**: 
- [Gemini API Documentation - Image Generation](https://ai.google.dev/gemini-api/docs/image-generation)
- [Gemini API Documentation - Video](https://ai.google.dev/gemini-api/docs/video)
