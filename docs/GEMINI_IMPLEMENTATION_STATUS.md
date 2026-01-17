# Gemini API実装ステータス
**作成日時**: 2026-01-17 14:07:03  
**作成日**: 2026-01-17  

**最終更新**: 2026-01-17 14:07:03
**ステータス**: ✅ 実装修正完了

---

## ✅ 完了した修正

### 1. 認証方法の修正
- ✅ `services/gemini/imageGenerator.js` - `x-goog-api-key` ヘッダー認証に変更
- ✅ `services/gemini/videoGenerator.js` - `x-goog-api-key` ヘッダー認証に変更（ポーリングも含む）

### 2. リクエスト形式の修正
- ✅ `responseModalities: ['IMAGE']` - 大文字に統一
- ✅ `responseModalities: ['VIDEO']` - 大文字に統一

### 3. Telegram BotのData URLサポート
- ✅ `services/telegram/bot.js` - `sendPhoto()` でData URL対応
- ✅ `services/telegram/bot.js` - `sendVideo()` でData URL対応

### 4. 環境変数の文書化
- ✅ `.env.example` - `GEMINI_API_KEY` の設定方法を追加
- ✅ `docs/GEMINI_IMPLEMENTATION_FIXES.md` - 修正レポートを作成

---

## 🔄 実装フロー

### 定時配信の流れ

```
定時5分前 (23:55, 3:55, 7:55, 11:55, 15:55, 19:55 UTC)
  ↓
api/prepare.js 実行
  ↓
1. 市場データ取得 (CryptoQuant, CoinGecko, etc.)
2. 市場分析 (Grok AI)
3. 画像生成 (Gemini Nano Banana Pro)
   → generateMarketImage(snapshot, lang)
   → Base64 Data URL を返す
4. 動画生成 (Gemini Veo 3.1)
   → generateMarketVideo(snapshot, summary, lang)
   → Base64 Data URL または URL を返す
5. コンテンツ保存 (Vercel KV)
   → saveContent(market, { imageUrl, videoUrl, summary, marketData })
  ↓
定時 (0:00, 4:00, 8:00, 12:00, 16:00, 20:00 UTC)
  ↓
api/cron.js 実行
  ↓
1. 保存されたコンテンツ取得
   → getContent(market, slotTime)
2. メッセージ生成 (Grok AI + テンプレート)
3. Telegram配信
   → sendVideo(videoUrl, caption)  # 動画を先に送信
   → sendPhoto(imageUrl, caption)  # 画像を送信
   → sendMessage(text)              # テキストメッセージを送信
```

---

## 📋 使用しているGeminiモデル

### 画像生成
- **モデル**: `gemini-3-pro-image-preview` (Nano Banana Pro)
- **エンドポイント**: `POST /v1beta/models/gemini-3-pro-image-preview:generateContent`
- **設定**:
  - `responseModalities: ['IMAGE']`
  - `aspectRatio: '16:9'`
  - `imageSize: '2K'`
- **出力**: Base64 Data URL (`data:image/png;base64,...`)

### 動画生成
- **モデル**: `veo-3.1-generate-preview` (Veo 3.1)
- **エンドポイント**: `POST /v1beta/models/veo-3.1-generate-preview:generateContent`
- **設定**:
  - `responseModalities: ['VIDEO']`
  - `durationSeconds: 8`
  - `resolution: '720p'`
- **処理方式**: 非同期（`jobId`を返し、ポーリングで完了を待つ）
- **ポーリング**: `/v1beta/operations/{jobId}` を最大60回、10秒間隔でポーリング
- **出力**: Base64 Data URL (`data:video/mp4;base64,...`) または URL

---

## 🧪 動作確認方法

### 1. ローカル環境でのテスト

```bash
# 環境変数を設定
cp .env.example .env.local
# .env.local を編集して GEMINI_API_KEY を設定

# 画像生成のみテスト
npm run test:gemini

# 画像 + 動画生成テスト
node scripts/test-gemini-integration.js --video

# 画像 + Telegram送信テスト
node scripts/test-gemini-integration.js --telegram

# すべてのテスト（画像 + 動画 + Telegram）
npm run test:gemini:full
```

### 2. Vercel環境での確認

1. **環境変数の設定**
   - Vercel Dashboard → Project Settings → Environment Variables
   - `GEMINI_API_KEY` = `AIzaSyBeKmuRBImr1ZYtQMsOqpU-cqkdzQh3fig`
   - Environment: Production, Preview, Development（すべてに適用）

2. **Prepare APIのテスト**
   ```bash
   # デバッグモードで実行（認証バイパス）
   curl "https://your-project.vercel.app/api/prepare?debug=local"
   ```

3. **Cron APIのテスト**
   ```bash
   # デバッグモードで実行（認証バイパス）
   curl "https://your-project.vercel.app/api/cron?debug=local"
   ```

---

## 🔍 実装の詳細

### 画像生成 (`services/gemini/imageGenerator.js`)

```javascript
// 認証: x-goog-api-key ヘッダー
const response = await fetch(apiUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-goog-api-key': apiKey,
  },
  body: JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseModalities: ['IMAGE'], // 大文字
      imageConfig: {
        aspectRatio: '16:9',
        imageSize: '2K',
      }
    }
  }),
});

// レスポンス処理
const data = await response.json();
const base64Data = data.candidates[0].content.parts[0].inlineData.data;
const dataUrl = `data:${mimeType};base64,${base64Data}`;
return dataUrl;
```

### 動画生成 (`services/gemini/videoGenerator.js`)

```javascript
// 1. 動画生成リクエスト
const response = await fetch(apiUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-goog-api-key': apiKey,
  },
  body: JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseModalities: ['VIDEO'], // 大文字
      videoConfig: {
        durationSeconds: 8,
        resolution: '720p',
      }
    }
  }),
});

// 2. 非同期処理の場合、jobIdを取得してポーリング
const data = await response.json();
if (data.jobId) {
  const videoUrl = await pollVideoGeneration(data.jobId, apiKey);
  return videoUrl;
}

// 3. ポーリング処理
async function pollVideoGeneration(jobId, apiKey) {
  const pollUrl = `https://generativelanguage.googleapis.com/v1beta/operations/${jobId}`;
  for (let attempt = 0; attempt < 60; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 10000)); // 10秒待機
    const response = await fetch(pollUrl, {
      headers: { 'x-goog-api-key': apiKey },
    });
    const data = await response.json();
    if (data.done && data.response) {
      // 動画データを取得して返す
      return videoUrl;
    }
  }
}
```

### Telegram送信 (`services/telegram/bot.js`)

```javascript
// Data URLの検出と変換
if (photoUrl.startsWith('data:')) {
  // Data URLをパース
  const matches = photoUrl.match(/^data:([^;]+);base64,(.+)$/);
  const mimeType = matches[1];
  const base64Data = matches[2];
  const buffer = Buffer.from(base64Data, 'base64');

  // multipart/form-dataで送信
  const formData = new FormData();
  const blob = new Blob([buffer], { type: mimeType });
  formData.append('photo', blob, 'image.png');
  formData.append('chat_id', TELEGRAM_CHAT_ID);
  formData.append('caption', caption);

  const response = await fetch(url.toString(), {
    method: 'POST',
    body: formData, // Content-Typeは自動設定
  });
}
```

---

## ⚠️ 注意事項

### 1. APIキーの管理
- ✅ `.env.local` は `.gitignore` に含まれていることを確認
- ✅ Vercel環境変数は適切な権限管理を行う
- ⚠️ 絶対にGitリポジトリにコミットしない

### 2. レート制限とコスト
- ⚠️ Gemini APIには無料枠とレート制限がある
- ⚠️ 画像生成と動画生成は有料APIの可能性がある
- ⚠️ 使用量を監視し、予算を設定

### 3. エラーハンドリング
- ✅ 画像生成失敗時は `null` を返し、処理を続行
- ✅ 動画生成失敗時は `null` を返し、処理を続行
- ✅ Telegram送信失敗時はエラーログを出力し、処理を続行

### 4. パフォーマンス
- ⚠️ 動画生成は非同期処理のため、最大10分（60回 × 10秒）かかる可能性がある
- ⚠️ `api/prepare.js` は定時5分前に実行されるため、動画生成が完了しない可能性がある
- 💡 推奨: 動画生成は非同期で実行し、完了後にVercel KVに保存する

---

## 🎯 次のステップ

1. ✅ **実装修正完了** - すべての修正を完了
2. ⏳ **Vercel環境変数の設定** - `GEMINI_API_KEY` を設定
3. ⏳ **動作確認** - 実際のAPIで動作確認
4. ⏳ **エラーハンドリングの強化** - 必要に応じてリトライロジックを追加
5. ⏳ **パフォーマンス最適化** - 動画生成の非同期処理を最適化

---

## 📚 参考資料

- [Gemini API 公式ドキュメント](https://ai.google.dev/gemini-api/docs?hl=ja)
- [Gemini API 画像生成](https://ai.google.dev/gemini-api/docs/image-generation?hl=ja)
- [Gemini Veo 3.1 動画生成](https://ai.google.dev/gemini-api/docs/video?hl=ja)
- [修正レポート](./GEMINI_IMPLEMENTATION_FIXES.md)
