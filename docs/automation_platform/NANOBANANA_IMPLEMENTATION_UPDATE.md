# NanoBanana実装更新

## 更新内容

公式ドキュメント（https://ai.google.dev/gemini-api/docs/image-generation）に基づき、NanoBanana APIの実装を公式SDKに更新しました。

### 変更点

1. **SDKの使用**
   - 以前: REST APIを直接呼び出し
   - 現在: `@google/genai` SDKの`generateContent`メソッドを使用

2. **実装方法（公式ドキュメント準拠）**
   ```javascript
   import { GoogleGenAI } from "@google/genai";
   
   const ai = new GoogleGenAI({});
   
   const response = await ai.models.generateContent({
     model: "gemini-2.5-flash-image",
     contents: prompt,
     generationConfig: {
       imageConfig: {
         aspectRatio: "16:9",
         imageSize: "2K"  // nano-banana-proのみ
       }
     }
   });
   
   // レスポンスから画像データを取得
   for (const part of response.candidates[0].content.parts) {
     if (part.inlineData) {
       const imageData = part.inlineData.data;
       // Base64データを処理
     }
   }
   ```

## 利用可能なモデル

- **Nano Banana**: `gemini-2.5-flash-image`
  - 速度と効率性重視
  - 1,024ピクセル解像度
  - アスペクト比: 1:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9

- **Nano Banana Pro**: `gemini-3-pro-image-preview`
  - プロフェッショナルなアセット制作向け
  - 最大4K解像度
  - 画像サイズ: 1K, 2K, 4K
  - アスペクト比: 1:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9

## 画像サイズとトークン数

### Gemini 2.5 Flash Image
- すべてのアスペクト比: 1,290トークン
- 解像度: 1,024ピクセル固定

### Gemini 3 Pro Image プレビュー
- 1K: 1,120トークン
- 2K: 1,120トークン
- 4K: 2,000トークン

## 機能

1. **テキストから画像生成**
   - 高品質な画像生成
   - SynthID透かしが自動的に埋め込まれる

2. **アスペクト比の選択**
   - 10種類のアスペクト比に対応

3. **画像サイズの選択**（nano-banana-proのみ）
   - 1K, 2K, 4Kから選択可能

## テスト結果

- ✅ 画像生成成功
- ✅ 約3.6MBのJPEG画像を生成
- ✅ Base64データを正常に取得

## 参考

- [公式ドキュメント](https://ai.google.dev/gemini-api/docs/image-generation)
- [Nano Banana公式ページ](https://deepmind.google/models/veo/)
