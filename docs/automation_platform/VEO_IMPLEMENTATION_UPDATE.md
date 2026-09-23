# Veo API実装更新

## 更新内容

公式ドキュメント（https://ai.google.dev/gemini-api/docs/video）に基づき、Veo APIの実装を更新しました。

### 変更点

1. **SDKの使用**
   - 以前: REST APIを直接呼び出し（404エラー）
   - 現在: `@google/genai` SDKを使用

2. **実装方法**
   ```javascript
   import { GoogleGenAI } from "@google/genai";
   
   const ai = new GoogleGenAI({
     apiKey: GEMINI_API_KEY,
   });
   
   // 動画生成
   let operation = await ai.models.generateVideos({
     model: "veo-3.1-generate-preview",
     prompt: prompt,
   });
   
   // ポーリング
   while (!operation.done) {
     operation = await ai.operations.getVideosOperation({
       operation: operation,
     });
   }
   ```

3. **パッケージ追加**
   - `@google/genai` をインストール済み

## 利用可能なモデル

- `veo-3.1-generate-preview` - Veo 3.1 プレビュー版
- `veo-3.1-fast-generate-preview` - Veo 3.1 Fast プレビュー版
- `veo-3.0-generate-001` - Veo 3.0 Stable
- `veo-3.0-fast-generate-001` - Veo 3.0 Fast Stable
- `veo-2.0-generate-001` - Veo 2.0

## 機能

1. **テキストから動画生成**
   - 8秒間の720pまたは1080p動画
   - ネイティブオーディオ生成

2. **動画の拡張**
   - 以前に生成された動画を拡張

3. **フレーム固有の生成**
   - 開始フレームと終了フレームを指定

4. **画像ベースの指示**
   - 最大3つの参照画像を使用

## 次のステップ

1. ✅ SDKインストール完了
2. ✅ 実装更新完了
3. ⏳ 動作テスト（クレジット利用可能になったら）

## 参考

- [公式ドキュメント](https://ai.google.dev/gemini-api/docs/video)
- [Veo公式ページ](https://deepmind.google/models/veo/)
