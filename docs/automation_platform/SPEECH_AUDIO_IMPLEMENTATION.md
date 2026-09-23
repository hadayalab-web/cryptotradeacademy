# 音声生成・音声理解機能実装

## 概要

Gemini APIの音声生成（TTS）と音声理解機能をMCPサーバーに追加しました。これにより、完全なマルチモーダルAIアシスタントが完成しました。

## 追加された機能

### ✅ 1. 音声生成 (`gemini_generate_speech`)

**機能**: テキストを音声に変換（TTS: Text-to-Speech）

- **ドキュメント**: https://ai.google.dev/gemini-api/docs/speech-generation
- **対応モデル**:
  - `gemini-2.5-flash-preview-tts`（デフォルト）
  - `gemini-2.5-pro-preview-tts`

**機能**:
- 単一話者の音声生成
- 複数話者の音声生成
- 監督ノートによるスタイル制御（スタイル、アクセント、ペース、トーン）

**使用例**:
```javascript
// 単一話者
{
  "model": "gemini-2.5-flash-preview-tts",
  "text": "Have a wonderful day!",
  "voice": "Aoede"
}

// 複数話者
{
  "model": "gemini-2.5-flash-preview-tts",
  "text": "Hello",
  "voices": [
    {
      "voice": "Aoede",
      "text": "Hello, how are you?"
    },
    {
      "voice": "Charon",
      "text": "I'm doing great, thanks!"
    }
  ]
}

// 監督ノートによるスタイル制御
{
  "model": "gemini-2.5-flash-preview-tts",
  "text": "Welcome to our podcast!",
  "directorsNotes": "### DIRECTOR'S NOTES\n\nStyle: Enthusiastic and energetic\nPacing: Speaks at a faster, energetic pace\nAccent: Southern california valley girl"
}
```

### ✅ 2. 音声理解 (`gemini_understand_audio`)

**機能**: 音声を理解・分析（音声認識、転写、要約、質問応答）

- **ドキュメント**: https://ai.google.dev/gemini-api/docs/audio
- **対応形式**:
  - ファイルパス（File API経由で自動アップロード）
  - Base64データURL
  - HTTP(S) URL（File API経由でアップロード済みファイル）

**タスクタイプ**:
- `transcribe` - 音声転写（デフォルト）
- `summarize` - 音声の要約
- `analyze` - 包括的な音声分析
- `qa` - 質問応答
- `extract` - 情報抽出
- `custom` - カスタムプロンプト

**使用例**:
```javascript
// 音声転写
{
  "model": "gemini-2.5-flash",
  "audio": "/path/to/audio.mp3",
  "prompt": "この音声を転写してください",
  "task": "transcribe"
}

// 音声の要約
{
  "model": "gemini-2.5-pro",
  "audio": "data:audio/mpeg;base64,...",
  "prompt": "この音声を要約してください",
  "task": "summarize"
}
```

## 完全なマルチモーダル対応

### ✅ すべてのモダリティに対応

- ✅ **テキスト** - 生成・理解
- ✅ **画像** - 生成・理解
- ✅ **動画** - 生成・理解
- ✅ **音声** - 生成・理解
- ✅ **ドキュメント** - 処理

## 機能強化のポイント

### 1. **音声生成の柔軟性**
- 単一話者・複数話者の選択
- 監督ノートによる詳細なスタイル制御
- 自然言語による音声パフォーマンスの調整

### 2. **音声理解の多様性**
- 音声転写
- 音声の要約と分析
- 質問応答
- 情報抽出

### 3. **実用的なユースケース**
- ポッドキャストの生成
- オーディオブックの作成
- 音声メモの転写
- 会議録音の要約
- 音声コンテンツの分析

## 実装の詳細

### 音声生成の実装
```javascript
const response = await this.genAI.models.generateContent({
  model: "gemini-2.5-flash-preview-tts",
  contents: text,
  config: {
    responseModalities: ["AUDIO"],
    speechConfig: {
      voiceConfig: {
        prebuiltVoiceConfig: {
          voiceName: voice
        }
      }
    }
  }
});
```

### 音声理解の実装
```javascript
const response = await this.genAI.models.generateContent({
  model: "gemini-2.5-flash",
  contents: [
    audioPart,
    prompt
  ]
});
```

## 参考

- [音声生成公式ドキュメント](https://ai.google.dev/gemini-api/docs/speech-generation)
- [音声理解公式ドキュメント](https://ai.google.dev/gemini-api/docs/audio)
- [Live API](https://ai.google.dev/gemini-api/docs/live) - インタラクティブな音声生成
