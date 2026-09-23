# 画像理解機能実装

## 概要

Gemini APIの画像理解機能をMCPサーバーに追加しました。画像キャプション、分類、Visual Question Answeringなどの画像処理タスクを実行できます。

## 実装内容

### 追加された機能

**`gemini_understand_image`** - 画像理解・分析ツール

- **機能**: 画像を理解し、キャプション、分類、質問応答などを実行
- **ドキュメント**: https://ai.google.dev/gemini-api/docs/image-understanding

### 利用可能なモデル

- `gemini-3-pro-preview` - マルチモーダル理解で世界最高水準
- `gemini-3-flash-preview` - 高速モデル
- `gemini-2.5-flash` - 第2世代高速モデル（デフォルト）
- `gemini-2.5-pro` - 強力な推論モデル
- `gemini-2.0-flash` - 第2世代モデル

### タスクタイプ

- `caption` - 画像キャプション生成
- `classify` - 画像分類
- `qa` - Visual Question Answering
- `analyze` - 包括的な画像分析（デフォルト）
- `custom` - カスタムプロンプト

## 使用方法

### 基本的な使用例

```javascript
// 画像キャプション生成
{
  "image": "data:image/jpeg;base64,/9j/4AAQ...",
  "prompt": "この画像を詳しく説明してください",
  "task": "caption"
}

// 画像分類
{
  "image": "/path/to/image.jpg",
  "prompt": "この画像のカテゴリを分類してください",
  "task": "classify"
}

// Visual Question Answering
{
  "image": "data:image/png;base64,iVBORw0KG...",
  "prompt": "この画像に何が写っていますか？",
  "task": "qa"
}
```

## 画像データの形式

### Base64データURL形式
```
data:image/jpeg;base64,/9j/4AAQSkZJRg...
```

### ファイルパス形式
```
/path/to/image.jpg
/path/to/image.png
```

## 対応画像形式

- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)
- WebP (.webp)
- BMP (.bmp)

## 機能の詳細

### 1. 画像キャプション生成
画像の内容を詳しく説明するテキストを生成します。

### 2. 画像分類
画像のカテゴリや種類を分類します。

### 3. Visual Question Answering
画像に関する質問に答えます。

### 4. 包括的な画像分析
画像の詳細な分析を行います。

## 制限事項

- **ファイルサイズ**: リクエスト全体で20MB未満（インライン画像データの場合）
- **画像数**: リクエストごとに最大3,600個の画像ファイル
- **トークン計算**: 
  - 384ピクセル以下の画像: 258トークン
  - 大きな画像: タイル化され、各タイルに258トークン

## 参考

- [公式ドキュメント](https://ai.google.dev/gemini-api/docs/image-understanding)
- [メディアの解像度](https://ai.google.dev/gemini-api/docs/media-resolution)
