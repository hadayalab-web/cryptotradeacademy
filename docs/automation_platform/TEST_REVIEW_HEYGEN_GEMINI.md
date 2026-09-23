# AI動画・コンテンツ生成ツール テストレビュー

## テスト実施日
2025年1月

## 1. HeyGenの動画生成テスト

### テスト内容
HeyGen API v2を使用した動画生成機能のテスト

### 実施した操作
1. **音声一覧の取得**: `heygen_get_voices`ツールを使用して利用可能な音声を取得
   - 結果: 成功。多数の英語音声とその他の言語音声を取得
   - 取得した音声ID例: `1bd001e7e50f421d891986aad2158d8f`

2. **動画生成の試行**: `heygen_create_video`ツールを使用してテスト動画を生成
   - 試行回数: 複数回
   - 結果: **失敗** - API構造に関するエラーが発生

### 発生したエラー
```
HeyGen API Error: 400 BAD REQUEST
video_inputs.0.voice is invalid: Field required
video_inputs.0.voice.text.input_text is invalid: Field required
```

### 問題の分析
- HeyGen API v2の`video_inputs`パラメータの構造が、現在のMCPサーバー実装と一致していない
- APIドキュメントによると、`video_inputs`の各要素には`voice`オブジェクトが必要
- `voice`オブジェクトの構造が複雑で、`type`、`text.input_text`、`voice_id`などのフィールドが必要と推測される
- 現在のMCPサーバー実装（`scripts/heygen-mcp-server.js`）は、`video_inputs`をそのままAPIに渡しているため、構造の検証が不十分

### レビュー

#### 良い点
- **音声一覧の取得**: API接続は正常に動作し、多数の音声オプションを取得できた
- **エラーハンドリング**: APIエラーメッセージが明確で、問題の特定が容易
- **MCPサーバー実装**: 基本的な構造は正しく、認証やリクエスト処理は正常に動作

#### 改善が必要な点
- **API構造の理解**: HeyGen API v2の`video_inputs`構造を正確に理解し、実装する必要がある
- **ドキュメントの確認**: 公式APIドキュメントを確認し、正しいリクエスト構造を特定する必要がある
- **エンドポイントの検証**: `/video/generate`エンドポイントが正しいか確認が必要

#### 推奨される対応
1. HeyGen公式APIドキュメントを確認し、`video_inputs`の正しい構造を特定
2. MCPサーバーの実装を修正し、正しいAPI構造を使用
3. テストモード（`test: true`）を使用して、クレジットを消費せずに構造を検証
4. 成功例を確認後、本番環境での使用を検討

### 総評
**評価: ⚠️ 部分的に動作（音声取得は成功、動画生成は未成功）**

HeyGenのAPI接続と音声取得機能は正常に動作していますが、動画生成機能についてはAPI構造の問題により未実装です。公式ドキュメントの確認と実装の修正が必要です。

---

## 2. Gemini Veoコンテンツ生成テスト

### テスト内容
Gemini Veo 3.1を使用した動画生成機能のテスト

### 実施した操作
1. **Gemini API呼び出し**: `gemini_chat`ツールを使用してVeo動画生成を試行
   - 結果: **失敗** - クォータ制限エラーが発生

### 発生したエラー
```
[GoogleGenerativeAI Error]: Error fetching from https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent
[429 Too Many Requests] You exceeded your current quota
* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_input_token_count
* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests
```

### 問題の分析
- Gemini APIの無料プランのクォータ制限に達している
- 以下のクォータ制限に達した:
  - `GenerateContentInputTokensPerModelPerDay-FreeTier`
  - `GenerateRequestsPerDayPerProjectPerModel-FreeTier`
  - `GenerateRequestsPerMinutePerProjectPerModel-FreeTier`
  - `GenerateContentInputTokensPerModelPerMinute-FreeTier`
- リトライ推奨時間: 約8秒後

### レビュー

#### 良い点
- **エラーメッセージの明確性**: クォータ制限の詳細が明確に表示される
- **リトライ情報の提供**: リトライ推奨時間が表示される
- **MCPサーバー実装**: Gemini MCPサーバーは正常に動作（クォータ制限以外）

#### 改善が必要な点
- **クォータ管理**: 無料プランの制限を超えているため、有料プランへのアップグレードまたはクォータのリセット待ちが必要
- **Veo専用機能の不足**: 現在のMCPサーバーにはVeo専用の動画生成機能がない
  - 現在の実装: `gemini_chat`のみ（テキスト生成用）
  - 必要な実装: Veo専用の`generateVideos`エンドポイント呼び出し

#### 推奨される対応
1. **クォータ管理**:
   - 有料プランへのアップグレードを検討
   - または、クォータがリセットされるまで待機（通常24時間ごと）

2. **Veo機能の実装**:
   - MCPサーバーにVeo専用のツールを追加
   - `veo-3.1-generate-preview`または`veo-3.1-fast-generate-preview`モデルを使用
   - 非同期処理（operation）のポーリング機能を実装

3. **実装例**:
   ```javascript
   // Veo動画生成の例（参考実装）
   const url = `https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-generate-preview:generateVideos`;
   const requestBody = {
     prompt: "A beautiful sunset over the ocean with gentle waves"
   };
   ```

### 総評
**評価: ⚠️ クォータ制限により未テスト**

Gemini Veoの動画生成機能は、クォータ制限により実際のテストができませんでした。また、現在のMCPサーバーにはVeo専用の機能が実装されていないため、追加の実装が必要です。

---

## 3. Gemini NanoBananaコンテンツ生成テスト

### テスト内容
Gemini NanoBanana Proを使用した画像生成機能のテスト

### 実施した操作
1. **MCPサーバーの確認**: 現在のGemini MCPサーバーにNanoBanana機能があるか確認
   - 結果: **機能なし** - 現在のMCPサーバーにはNanoBanana専用機能がない

### 問題の分析
- 現在のGemini MCPサーバー（`scripts/gemini-mcp-server.js`）には以下の機能のみ:
  - `gemini_chat`: テキスト生成
  - `gemini_knowledge_management`: 知識管理
  - `gemini_marketing_strategy`: マーケティング戦略
  - `gemini_content_creation`: コンテンツ作成（テキスト）
- NanoBananaは画像生成機能のため、専用の実装が必要

### レビュー

#### 良い点
- **コードベース内の実装例**: プロジェクト内にNanoBananaの実装例が存在
  - `cryptosignal-ai/services/gemini/imageGenerator.js`
  - `hadayalab-website-dev/cryptotradeacademy-lp-dev/scripts/gemini-mcp-server.js`

#### 改善が必要な点
- **MCPサーバーへの機能追加**: 現在のMCPサーバーにNanoBanana機能を追加する必要がある
- **API構造の理解**: NanoBanana APIの正しい構造を確認し、実装する必要がある

#### 推奨される実装
1. **MCPサーバーにNanoBananaツールを追加**:
   ```javascript
   {
     name: "gemini_nanobanana_generate_image",
     description: "Gemini NanoBanana Proを使用して画像を生成します",
     inputSchema: {
       type: "object",
       properties: {
         model: {
           type: "string",
           enum: ["nano-banana-pro", "nano-banana"],
           default: "nano-banana-pro"
         },
         prompt: {
           type: "string",
           description: "画像生成用のプロンプト"
         },
         aspectRatio: {
           type: "string",
           enum: ["1:1", "9:16", "16:9", "4:3", "3:4"],
           default: "16:9"
         }
       },
       required: ["prompt"]
     }
   }
   ```

2. **API呼び出しの実装**:
   ```javascript
   const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent`;
   const requestBody = {
     contents: [{
       parts: [{ text: prompt }]
     }],
     generationConfig: {
       responseModalities: ["IMAGE"],
       imageConfig: {
         aspectRatio: aspectRatio,
         imageSize: "2K"
       }
     }
   };
   ```

### 総評
**評価: ⚠️ 機能未実装**

Gemini NanoBananaの画像生成機能は、現在のMCPサーバーに実装されていないため、テストができませんでした。プロジェクト内に実装例が存在するため、MCPサーバーに機能を追加することで利用可能になります。

---

## 総合評価と推奨事項

### 現状のまとめ
1. **HeyGen**: 音声取得は成功、動画生成はAPI構造の問題で未実装
2. **Gemini Veo**: クォータ制限により未テスト、MCPサーバーに機能未実装
3. **Gemini NanoBanana**: MCPサーバーに機能未実装

### 優先順位の推奨
1. **最優先**: HeyGenの動画生成機能の修正（API構造の確認と実装修正）
2. **次優先**: Gemini Veo機能のMCPサーバーへの追加実装
3. **その他**: Gemini NanoBanana機能のMCPサーバーへの追加実装

### 次のステップ
1. HeyGen公式APIドキュメントを確認し、`video_inputs`の正しい構造を特定
2. Gemini APIのクォータ状況を確認し、必要に応じて有料プランへのアップグレードを検討
3. MCPサーバーにVeoとNanoBananaの機能を追加実装
4. 各機能のテストを再実施し、動作確認を行う

---

## 参考資料
- HeyGen API Documentation: https://docs.heygen.com/
- Gemini API Documentation: https://ai.google.dev/gemini-api/docs
- Veo Documentation: https://ai.google.dev/gemini-api/docs/video
- NanoBanana Documentation: https://ai.google.dev/gemini-api/docs/image-generation
