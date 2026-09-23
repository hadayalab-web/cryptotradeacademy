# 動画理解・ドキュメント処理機能実装

## 概要

Gemini APIの動画理解とドキュメント処理機能をMCPサーバーに追加しました。これにより、AIアシスタントの機能をさらに強化できます。

## 追加された機能

### ✅ 1. 動画理解 (`gemini_understand_video`)

**機能**: 動画の説明、セグメント化、情報抽出、質問応答

- **ドキュメント**: https://ai.google.dev/gemini-api/docs/video-understanding
- **対応形式**:
  - ファイルパス（File API経由で自動アップロード）
  - Base64データURL
  - YouTube URL
  - HTTP(S) URL（File API経由でアップロード済みファイル）

**タスクタイプ**:
- `summarize` - 動画の要約
- `analyze` - 包括的な動画分析（デフォルト）
- `qa` - Visual Question Answering
- `extract` - 情報抽出
- `custom` - カスタムプロンプト

**技術仕様**:
- 最大1時間の動画（デフォルト解像度）
- 最大3時間の動画（低解像度）
- 1 FPSでサンプリング
- タイムスタンプ参照: `MM:SS`形式（例: `01:15`）

### ✅ 2. ドキュメント処理 (`gemini_process_document`)

**機能**: PDF、Word、PowerPoint、Excel、テキストファイルなどの処理

- **ドキュメント**: https://ai.google.dev/gemini-api/docs/document-processing
- **対応形式**:
  - PDF (.pdf)
  - Microsoft Word (.docx)
  - Microsoft PowerPoint (.pptx)
  - Microsoft Excel (.xlsx)
  - テキストファイル (.txt)
  - その他（File API経由でアップロード可能な形式）

**タスクタイプ**:
- `summarize` - ドキュメントの要約
- `extract` - 重要な情報の抽出
- `analyze` - 包括的な分析（デフォルト）
- `qa` - 質問応答
- `translate` - 翻訳
- `custom` - カスタムプロンプト

## 使用例

### 動画理解

```javascript
// 動画の要約
{
  "model": "gemini-2.5-flash",
  "video": "/path/to/video.mp4",
  "prompt": "この動画を要約してください",
  "task": "summarize"
}

// 特定のタイムスタンプの質問
{
  "model": "gemini-2.5-flash",
  "video": "https://www.youtube.com/watch?v=...",
  "prompt": "01:15の時点で何が起こっていますか？",
  "task": "qa"
}
```

### ドキュメント処理

```javascript
// PDFの要約
{
  "model": "gemini-2.5-flash",
  "document": "/path/to/document.pdf",
  "prompt": "このドキュメントを要約してください",
  "task": "summarize"
}

// 重要な情報の抽出
{
  "model": "gemini-2.5-pro",
  "document": "/path/to/report.docx",
  "prompt": "重要なポイントを抽出してください",
  "task": "extract"
}
```

## 機能強化のポイント

### 1. **マルチモーダル対応の完全実装**
- テキスト ✅
- 画像 ✅
- 動画 ✅（生成・理解）
- 音声 ✅（動画に含まれる）
- ドキュメント ✅

### 2. **長いコンテキストの活用**
- 最大100万トークンのコンテキストウィンドウ
- 大規模ドキュメントの処理
- 長時間動画の分析

### 3. **実用的なタスク対応**
- 動画の要約と分析
- ドキュメントの要約と抽出
- 質問応答
- 翻訳

## 実装の詳細

### File APIの自動使用
大きなファイル（20MB超、約1分超の動画）は自動的にFile API経由でアップロードされます。

### 対応動画形式
- MP4, AVI, FLV, MPG, WebM, WMV, 3GPP

### 対応ドキュメント形式
- PDF, DOCX, PPTX, XLSX, TXT

## 参考

- [動画理解公式ドキュメント](https://ai.google.dev/gemini-api/docs/video-understanding)
- [ドキュメント処理公式ドキュメント](https://ai.google.dev/gemini-api/docs/document-processing)
- [Files API](https://ai.google.dev/gemini-api/docs/files)
