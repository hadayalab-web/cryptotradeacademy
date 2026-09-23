# Gemini MCPサーバー 完全実装

## 概要

Gemini MCPサーバーは、Veo（動画生成）、NanoBanana（画像生成）、画像理解の3つの機能を提供します。

## 実装済み機能

### ✅ 1. Veo動画生成
- **ツール名**: `gemini_veo_generate_video`
- **モデル**: 
  - `veo-3.1-generate-preview`
  - `veo-3.1-fast-generate-preview`
- **機能**:
  - 8秒間の720pまたは1080p動画生成
  - ネイティブオーディオ生成
  - 動画の拡張
  - フレーム固有の生成
  - 画像ベースの指示（最大3つの参照画像）
- **実装**: 公式SDK `@google/genai` を使用
- **ドキュメント**: https://ai.google.dev/gemini-api/docs/video

### ✅ 2. NanoBanana画像生成
- **ツール名**: `gemini_nanobanana_generate_image`
- **モデル**: 
  - `nano-banana-pro` (gemini-3-pro-image-preview)
  - `nano-banana` (gemini-2.5-flash-image)
- **機能**:
  - 高品質な画像生成
  - 10種類のアスペクト比対応
  - 画像サイズ選択（nano-banana-proのみ: 1K, 2K, 4K）
- **実装**: 公式SDK `@google/genai` を使用
- **ドキュメント**: https://ai.google.dev/gemini-api/docs/image-generation

### ✅ 3. 画像理解
- **ツール名**: `gemini_understand_image`
- **モデル**: 
  - `gemini-2.5-flash` (デフォルト)
  - `gemini-3-pro-preview`
  - `gemini-3-flash-preview`
  - `gemini-2.5-pro`
  - `gemini-2.0-flash`
- **機能**:
  - 画像キャプション生成
  - 画像分類
  - Visual Question Answering
  - 包括的な画像分析
- **実装**: 公式SDK `@google/genai` を使用
- **ドキュメント**: https://ai.google.dev/gemini-api/docs/image-understanding

## 使用例

### Veo動画生成
```javascript
{
  "model": "veo-3.1-generate-preview",
  "prompt": "A beautiful sunset over the ocean",
  "pollInterval": 10,
  "maxPollAttempts": 60
}
```

### NanoBanana画像生成
```javascript
{
  "model": "nano-banana-pro",
  "prompt": "A professional cryptocurrency market analysis visualization",
  "aspectRatio": "16:9",
  "imageSize": "2K"
}
```

### 画像理解
```javascript
{
  "model": "gemini-2.5-flash",
  "image": "data:image/jpeg;base64,/9j/4AAQ...",
  "prompt": "この画像を詳しく説明してください",
  "task": "caption"
}
```

## 技術仕様

### 使用SDK
- `@google/genai` - 公式Gemini API SDK

### 画像データ形式
- Base64データURL: `data:image/jpeg;base64,...`
- ファイルパス: `/path/to/image.jpg`

### 対応画像形式
- JPEG, PNG, GIF, WebP, BMP

## 参考ドキュメント

- [Veo動画生成](https://ai.google.dev/gemini-api/docs/video)
- [NanoBanana画像生成](https://ai.google.dev/gemini-api/docs/image-generation)
- [画像理解](https://ai.google.dev/gemini-api/docs/image-understanding)
