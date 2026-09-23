# HeyGen 直接API呼び出しガイド

**作成日**: 2026-01-09  
**目的**: MCPサーバーを使わずに、HeyGenライブラリへのアップロードと動画生成を直接呼び出す方法

---

## 📋 概要

MCPサーバーを実装しなくても、**直接APIを呼び出す**ことができます。LP用のVSL動画生成に最適です。

---

## 🚀 使用方法

### 1. CLIから直接呼び出す

```bash
# HeyGenライブラリにアップロード
npx tsx scripts/direct-ai-api.ts heygen-upload --filePath ./image.png

# HeyGenライブラリ一覧を取得
npx tsx scripts/direct-ai-api.ts heygen-list --page 1 --pageSize 20

# HeyGenライブラリアセットを取得
npx tsx scripts/direct-ai-api.ts heygen-get --assetId asset_123

# HeyGenライブラリから動画を作成
npx tsx scripts/direct-ai-api.ts heygen-create --scriptText "スクリプト" --avatarId avatar_123
```

### 2. TypeScript/JavaScriptからインポートして使用

```typescript
import { 
  uploadToHeyGenLibrary, 
  listHeyGenLibrary, 
  getHeyGenLibraryItem,
  createHeyGenVideoFromLibrary 
} from "./scripts/direct-ai-api.js";

// ライブラリにアップロード
const uploadResult = await uploadToHeyGenLibrary("./image.png", {
  metadata: { description: "LP用画像" },
});

// ライブラリ一覧を取得
const library = await listHeyGenLibrary({ page: 1, pageSize: 20 });

// アセットを取得
const asset = await getHeyGenLibraryItem("asset_123");

// 動画を作成
const video = await createHeyGenVideoFromLibrary({
  scriptText: "VSLスクリプト",
  avatarId: "avatar_123",
  backgroundImageAssetId: "bg_image_123",
  aspectRatio: "16:9",
});
```

---

## 📊 各機能の詳細

### 1. `uploadToHeyGenLibrary()` - ライブラリにアップロード

```typescript
const result = await uploadToHeyGenLibrary(filePath, {
  mimeType: "image/png", // オプション: 自動検出
  metadata: { description: "LP用画像" }, // オプション
});
```

**レスポンス**:
```typescript
{
  assetId: "asset_123",
  assetUrl: "https://...",
  metadata: {
    description: "LP用画像",
    uploadedAt: "2026-01-09T...",
  },
  heygenResponse: { ... }
}
```

---

### 2. `listHeyGenLibrary()` - ライブラリ一覧を取得

```typescript
const result = await listHeyGenLibrary({
  assetType: "image", // オプション: "image" | "video" | "audio"
  page: 1,
  pageSize: 20,
});
```

**レスポンス**:
```typescript
{
  assets: [
    {
      id: "asset_123",
      url: "https://...",
      type: "image",
      ...
    }
  ],
  total: 100,
  page: 1,
  pageSize: 20,
}
```

---

### 3. `getHeyGenLibraryItem()` - アセットを取得

```typescript
const result = await getHeyGenLibraryItem("asset_123");
```

**レスポンス**:
```typescript
{
  assetId: "asset_123",
  assetUrl: "https://...",
  assetType: "image",
  metadata: { ... },
  heygenResponse: { ... }
}
```

---

### 4. `createHeyGenVideoFromLibrary()` - 動画を作成

```typescript
const result = await createHeyGenVideoFromLibrary({
  scriptText: "VSLスクリプト", // または scriptAssetId
  avatarId: "avatar_123",
  backgroundImageAssetId: "bg_image_123", // または backgroundVideoAssetId
  backgroundMusicAssetId: "bg_music_123", // オプション
  aspectRatio: "16:9", // LP用
  dimension: "landscape", // オプション
  test: false, // オプション
  caption: true, // オプション
});
```

**レスポンス**:
```typescript
{
  videoId: "video_123",
  videoUrl: "https://...",
  status: "processing",
  usedAssets: {
    script: "provided",
    scriptAssetId: null,
    avatarId: "avatar_123",
    backgroundImageAssetId: "bg_image_123",
    ...
  },
  heygenResponse: { ... }
}
```

---

## 📝 使用例

### 例1: Geminiで画像を生成してHeyGenライブラリに保存

```typescript
import { callNanoBananaPro, uploadToHeyGenLibrary } from "./scripts/direct-ai-api.js";

// 1. Geminiで画像を生成
const imageResult = await callNanoBananaPro(
  "TelegramのメッセージUIが表示されているスマホの画面",
  {
    aspectRatio: "16:9",
    imageSize: "2K",
    savePath: "./temp-image.png",
  }
);

// 2. HeyGenライブラリにアップロード
const uploadResult = await uploadToHeyGenLibrary("./temp-image.png", {
  metadata: { 
    description: "LP用Telegram UI画像",
    source: "gemini-nanobanana-pro",
  },
});

console.log("HeyGen Asset ID:", uploadResult.assetId);
```

### 例2: ライブラリのアセットを使用してVSL動画を作成

```typescript
import { createHeyGenVideoFromLibrary } from "./scripts/direct-ai-api.js";

const vslScript = `
Two traders, Trader A and Trader B. 
Yesterday, Trader A lost months of accumulated profits in an instant. 
Meanwhile, Trader B earned $5K while drinking coffee. 
Which one are you?
`;

const video = await createHeyGenVideoFromLibrary({
  scriptText: vslScript,
  avatarId: "your_avatar_id",
  backgroundImageAssetId: "your_bg_image_id",
  aspectRatio: "16:9",
  caption: true,
});

console.log("VSL Video ID:", video.videoId);
console.log("VSL Video URL:", video.videoUrl);
```

### 例3: ライブラリからアセットを検索して使用

```typescript
import { listHeyGenLibrary, createHeyGenVideoFromLibrary } from "./scripts/direct-ai-api.js";

// 1. ライブラリから画像を検索
const library = await listHeyGenLibrary({ assetType: "image" });
const bgImage = library.assets.find((asset: any) => 
  asset.metadata?.description?.includes("background")
);

// 2. 見つけた画像を使用して動画を作成
if (bgImage) {
  const video = await createHeyGenVideoFromLibrary({
    scriptText: "VSLスクリプト",
    avatarId: "your_avatar_id",
    backgroundImageAssetId: bgImage.id,
    aspectRatio: "16:9",
  });
}
```

---

## 🔧 環境変数の設定

`.env`ファイルに以下を設定してください：

```env
HEYGEN_API_KEY=your_heygen_api_key
```

---

## 📋 実装ファイル

- `scripts/direct-ai-api.ts` - 直接API呼び出しユーティリティ
  - `uploadToHeyGenLibrary()` - HeyGenライブラリにアップロード
  - `listHeyGenLibrary()` - ライブラリ一覧を取得
  - `getHeyGenLibraryItem()` - アセットを取得
  - `createHeyGenVideoFromLibrary()` - ライブラリから動画を作成

---

## ✅ 実装完了確認

- [x] `uploadToHeyGenLibrary()` - ファイルをHeyGenライブラリにアップロード
- [x] `listHeyGenLibrary()` - ライブラリ一覧を取得
- [x] `getHeyGenLibraryItem()` - アセットを取得
- [x] `createHeyGenVideoFromLibrary()` - ライブラリから動画を作成
- [x] CLI対応: `heygen-upload`, `heygen-list`, `heygen-get`, `heygen-create`

---

## 🎉 実装完了

**HeyGenのライブラリ格納機能を直接API呼び出しで実装しました。**

これで、MCPサーバーを使わずに、LP用のVSL動画を直接生成できます。

---

**参照**: 
- [HeyGen API Documentation](https://docs.heygen.com/)
- HeyGen API v2仕様
