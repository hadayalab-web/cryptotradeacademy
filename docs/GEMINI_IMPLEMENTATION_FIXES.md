# Gemini API実装修正レポート
**最終更新**: 2026-01-17 14:07:03  
**作成日時**: 2026-01-17 14:07:03  

**作成日**: 2026-01-17
**目的**: Gemini APIの実装を公式ドキュメントに準拠させる

---

## 🔍 発見された問題点

### 1. 認証方法の不備
- **問題**: APIキーをクエリパラメータ（`?key=${apiKey}`）で送信していた
- **リスク**: URLにAPIキーが含まれるため、ログやブラウザ履歴に残る可能性がある
- **修正**: `x-goog-api-key` ヘッダーを使用するように変更

### 2. リクエスト形式の不備
- **問題**: `responseModalities` が小文字（`['Image']`, `['Video']`）で指定されていた
- **修正**: 大文字（`['IMAGE']`, `['VIDEO']`）に変更

### 3. Telegram BotのData URLサポート不足
- **問題**: Base64 Data URLを直接Telegram APIに送信していた
- **修正**: Data URLを検出し、multipart/form-data形式で送信するように変更

---

## ✅ 実施した修正

### 1. `services/gemini/imageGenerator.js`

**変更前**:
```javascript
const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
// ...
const response = await fetch(apiUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(requestBody),
});
```

**変更後**:
```javascript
const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;
// ...
generationConfig: {
  responseModalities: ['IMAGE'], // 大文字で指定
  // ...
}
// ...
const response = await fetch(apiUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-goog-api-key': apiKey, // ヘッダーで認証
  },
  body: JSON.stringify(requestBody),
});
```

### 2. `services/gemini/videoGenerator.js`

**変更前**:
```javascript
const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
// ...
const pollUrl = `https://generativelanguage.googleapis.com/v1beta/operations/${jobId}?key=${apiKey}`;
```

**変更後**:
```javascript
const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
// ...
generationConfig: {
  responseModalities: ['VIDEO'], // 大文字で指定
  // ...
}
// ...
const response = await fetch(apiUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-goog-api-key': apiKey, // ヘッダーで認証
  },
  body: JSON.stringify(requestBody),
});
// ...
const pollUrl = `https://generativelanguage.googleapis.com/v1beta/operations/${jobId}`;
const response = await fetch(pollUrl, {
  headers: {
    'x-goog-api-key': apiKey, // ヘッダーで認証
  },
});
```

### 3. `services/telegram/bot.js`

**追加機能**: Base64 Data URLのサポート

```javascript
// Data URLの場合はmultipart/form-dataで送信
if (photoUrl.startsWith('data:')) {
  // Data URLをパース: data:image/png;base64,<base64data>
  const matches = photoUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) {
    throw new Error('Invalid Data URL format');
  }

  const mimeType = matches[1];
  const base64Data = matches[2];
  const buffer = Buffer.from(base64Data, 'base64');

  // multipart/form-dataで送信
  const formData = new FormData();
  const blob = new Blob([buffer], { type: mimeType });
  formData.append('photo', blob, 'image.png');
  formData.append('chat_id', TELEGRAM_CHAT_ID);
  // ...
}
```

### 4. `.env.example`

**追加**: Gemini APIキーの設定方法

```bash
# ============================================
# Gemini AI設定
# ============================================
# Gemini API キー（画像・動画生成用）
GEMINI_API_KEY=your-gemini-api-key
```

---

## 🔑 環境変数の設定方法

### ローカル開発環境

1. `.env.example` を `.env` にコピー
   ```bash
   cp .env.example .env
   ```

2. `.env` ファイルを編集し、実際のAPIキーを設定
   ```bash
   GEMINI_API_KEY=AIzaSyBeKmuRBImr1ZYtQMsOqpU-cqkdzQh3fig
   ```

### Vercel環境変数

1. Vercel Dashboard → Project Settings → Environment Variables
2. 以下の環境変数を追加:
   - **Name**: `GEMINI_API_KEY`
   - **Value**: `AIzaSyBeKmuRBImr1ZYtQMsOqpU-cqkdzQh3fig`
   - **Environment**: Production, Preview, Development（すべてに適用）

---

## 📋 使用しているGeminiモデル

### 画像生成
- **モデル**: `gemini-3-pro-image-preview` (Nano Banana Pro)
- **エンドポイント**: `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent`
- **機能**: 市場分析画像の生成（16:9アスペクト比、2K解像度）

### 動画生成
- **モデル**: `veo-3.1-generate-preview` (Veo 3.1)
- **エンドポイント**: `https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-generate-preview:generateContent`
- **機能**: AIキャスター動画の生成（8秒、720p解像度）
- **処理方式**: 非同期（jobIdを返し、ポーリングで完了を待つ）

---

## 🧪 動作確認方法

### 1. 画像生成のテスト

```javascript
// テストスクリプト例
const { generateMarketImage } = require('./services/gemini/imageGenerator');

const testMarketData = {
  price_usd_display: 45000,
  market_score: 65,
  sentiment_label: 'Bullish',
  change_24h: 2.5,
  inflow: 1500,
};

generateMarketImage(testMarketData, 'en')
  .then(dataUrl => {
    if (dataUrl) {
      console.log('✅ Image generated:', dataUrl.substring(0, 50) + '...');
    } else {
      console.log('❌ Image generation failed');
    }
  })
  .catch(error => {
    console.error('❌ Error:', error.message);
  });
```

### 2. 動画生成のテスト

```javascript
// テストスクリプト例
const { generateMarketVideo } = require('./services/gemini/videoGenerator');

const testMarketData = {
  price_usd_display: 45000,
  market_score: 65,
  sentiment_label: 'Bullish',
  change_24h: 2.5,
};

const testSummary = 'BTC is showing strong bullish momentum with increased exchange inflows...';

generateMarketVideo(testMarketData, testSummary, 'en')
  .then(videoUrl => {
    if (videoUrl) {
      console.log('✅ Video generated:', videoUrl.substring(0, 50) + '...');
    } else {
      console.log('❌ Video generation failed');
    }
  })
  .catch(error => {
    console.error('❌ Error:', error.message);
  });
```

---

## 📚 参考資料

- [Gemini API 公式ドキュメント](https://ai.google.dev/gemini-api/docs?hl=ja)
- [Gemini API クイックスタート](https://ai.google.dev/gemini-api/docs/quickstart?hl=ja)
- [Gemini API 画像生成](https://ai.google.dev/gemini-api/docs/image-generation?hl=ja)
- [Gemini Veo 3.1 動画生成](https://ai.google.dev/gemini-api/docs/video?hl=ja)

---

## ⚠️ 注意事項

1. **APIキーの管理**
   - 絶対にGitリポジトリにコミットしない
   - `.env` ファイルは `.gitignore` に含まれていることを確認
   - Vercel環境変数は適切な権限管理を行う

2. **レート制限**
   - Gemini APIには無料枠とレート制限がある
   - 大量のリクエストを送信する場合は、適切なエラーハンドリングとリトライロジックを実装

3. **コスト管理**
   - 画像生成と動画生成は有料APIの可能性がある
   - 使用量を監視し、予算を設定

---

## 🎯 次のステップ

1. ✅ 実装修正完了
2. ⏳ Vercel環境変数に `GEMINI_API_KEY` を設定
3. ⏳ 実際のAPIで動作確認
4. ⏳ エラーハンドリングの強化（必要に応じて）
