# HeyGen MCP Server - Gemini統合版

## 📋 概要

HeyGen MCP Serverを拡張し、Geminiの機能を統合しました。VSLスクリプト、Bロール動画/画像、バックミュージック、アバター画像を生成し、**HeyGenのライブラリ**に保存できます。

## ✅ 実装完了機能

### 1. VSLスクリプト生成
- **ツール**: `heygen_generate_vsl_script`
- **機能**: GeminiでVSL（Video Sales Letter）スクリプトを生成
- **保存先**: スクリプトテキストを返す（HeyGen動画作成時に使用可能）

### 2. Bロール動画生成（Veo）
- **ツール**: `heygen_generate_broll_veo`
- **機能**: Gemini VeoでBロール動画を生成し、**HeyGenライブラリ**にアップロード
- **保存先**: HeyGenライブラリ（アセットIDを返す）

### 3. Bロール画像生成（NanoBanana）
- **ツール**: `heygen_generate_broll_nanobanana`
- **機能**: Gemini NanoBananaでBロール画像を生成し、**HeyGenライブラリ**にアップロード
- **保存先**: HeyGenライブラリ（アセットIDを返す）

### 4. バックミュージック生成
- **ツール**: `heygen_generate_background_music`
- **機能**: Gemini TTSでバックミュージック（音声）を生成し、**HeyGenライブラリ**にアップロード
- **保存先**: HeyGenライブラリ（アセットIDを返す）

### 5. アバター画像生成（NanoBanana）
- **ツール**: `heygen_generate_avatar_nanobanana`
- **機能**: Gemini NanoBananaでアバター画像を生成し、**HeyGenライブラリ**にアップロード
- **保存先**: HeyGenライブラリ（アセットIDを返す）

### 6. ライブラリ管理
- **ツール**: `heygen_list_library` - ライブラリの一覧を取得
- **ツール**: `heygen_get_library_item` - ライブラリアイテムを取得

### 7. ライブラリから動画生成
- **ツール**: `heygen_create_video_from_library` - HeyGenライブラリのアセットを使用して動画を作成

## 🔧 設定要件

### 環境変数

`.env`ファイルに以下の環境変数を設定してください：

```env
HEYGEN_API_KEY=your_heygen_api_key
GEMINI_API_KEY=your_gemini_api_key
```

### ライブラリ管理

生成されたアセット（画像、動画、音声）は**HeyGenのライブラリ**に自動的にアップロードされます。アセットIDとURLが返されるため、HeyGen動画作成時に使用できます。

**注意**: VSLスクリプトはテキストのため、HeyGenライブラリには保存されません。スクリプトテキストが返されるため、`heygen_create_video`の`video_inputs`で使用できます。

## 🚀 使用例

### VSLスクリプト生成

```
VSLスクリプトを生成してください。
トピック: 暗号通貨トレーディングコース
ターゲットオーディエンス: 初心者トレーダー
動画の長さ: 90秒
言語: ja
```

### Bロール動画生成（Veo）

```
Bロール動画を生成してください。
プロンプト: ビジネスパーソンがオフィスで働いている様子、プロフェッショナルな雰囲気
```

### Bロール画像生成（NanoBanana）

```
Bロール画像を生成してください。
プロンプト: 都市の夜景、ネオンサインが輝く、映画的な雰囲気
アスペクト比: 16:9
画像サイズ: 2K
```

### バックミュージック生成

```
バックミュージックを生成してください。
説明: アップテンポなビジネス音楽、エネルギッシュで前向きな雰囲気
長さ: 60秒
```

### アバター画像生成

```
アバター画像を生成してください。
説明: プロフェッショナルなビジネスパーソン、スーツ姿、自信に満ちた表情
アスペクト比: 1:1
```

### ライブラリ一覧取得

```
ライブラリの一覧を取得してください。
カテゴリ: image
```

### ライブラリから動画生成

```
ライブラリのアセットを使用して動画を作成してください。
スクリプト: [VSLスクリプトテキスト]
音声ID: [voice_id]
アバター画像アセットID: [avatar_asset_id]
背景画像アセットID: [background_image_asset_id]
アスペクト比: 16:9
キャプション: 有効
```

または、スクリプトアセットIDを使用：

```
ライブラリのアセットを使用して動画を作成してください。
スクリプトアセットID: [script_asset_id]
音声ID: [voice_id]
アバター画像アセットID: [avatar_asset_id]
背景動画アセットID: [background_video_asset_id]
アスペクト比: 16:9
```

## 📊 ツール詳細

### `heygen_generate_vsl_script`

**パラメータ**:
- `topic` (必須): VSLスクリプトのトピック
- `target_audience` (オプション): ターゲットオーディエンス
- `duration` (オプション): 動画の長さ（秒、デフォルト: 60）
- `language` (オプション): 言語（デフォルト: ja）

**戻り値**:
- `success`: 成功フラグ
- `script`: 生成されたスクリプトテキスト
- `library_item`: ライブラリアイテム情報

### `heygen_generate_broll_veo`

**パラメータ**:
- `prompt` (必須): 動画生成用のプロンプト
- `model` (オプション): 使用するモデル（デフォルト: veo-3.1-generate-preview）

**戻り値**:
- `success`: 成功フラグ
- `video`: 生成された動画情報
- `library_item`: ライブラリアイテム情報

### `heygen_generate_broll_nanobanana`

**パラメータ**:
- `prompt` (必須): 画像生成用のプロンプト
- `aspect_ratio` (オプション): アスペクト比（デフォルト: 16:9）
- `image_size` (オプション): 画像サイズ（デフォルト: 2K）
- `model` (オプション): 使用するモデル（デフォルト: nano-banana-pro）

**戻り値**:
- `success`: 成功フラグ
- `image_path`: 保存された画像のパス
- `library_item`: ライブラリアイテム情報

### `heygen_generate_background_music`

**パラメータ**:
- `description` (必須): 音楽の説明
- `duration` (オプション): 音声の長さ（秒、デフォルト: 30）
- `voice` (オプション): 音声名
- `model` (オプション): 使用するモデル（デフォルト: gemini-2.5-flash-preview-tts）

**戻り値**:
- `success`: 成功フラグ
- `audio_path`: 保存された音声ファイルのパス
- `library_item`: ライブラリアイテム情報

### `heygen_generate_avatar_nanobanana`

**パラメータ**:
- `description` (必須): アバターの説明
- `aspect_ratio` (オプション): アスペクト比（デフォルト: 1:1）
- `image_size` (オプション): 画像サイズ（デフォルト: 2K）
- `model` (オプション): 使用するモデル（デフォルト: nano-banana-pro）

**戻り値**:
- `success`: 成功フラグ
- `image_path`: 保存された画像のパス
- `library_item`: ライブラリアイテム情報

### `heygen_list_library`

**パラメータ**:
- `category` (オプション): カテゴリ（scripts, broll-videos, broll-images, music, avatars）

**戻り値**:
- `success`: 成功フラグ
- `items`: ライブラリアイテムの配列
- `count`: アイテム数

### `heygen_get_library_item`

**パラメータ**:
- `item_id` (必須): アセットID

**戻り値**:
- `success`: 成功フラグ
- `asset`: アセット情報

### `heygen_create_video_from_library`

**パラメータ**:
- `voice_id` (必須): 音声ID
- `script` (オプション): VSLスクリプトテキスト
- `script_asset_id` (オプション): VSLスクリプトのアセットID（scriptの代わりに使用可能）
- `avatar_id` (オプション): アバター画像のアセットID
- `background_image_asset_id` (オプション): 背景画像のアセットID
- `background_video_asset_id` (オプション): 背景動画のアセットID
- `background_music_asset_id` (オプション): バックミュージックのアセットID
- `aspect_ratio` (オプション): アスペクト比（デフォルト: 16:9）
- `dimension` (オプション): 動画のサイズ（width, height）
- `caption` (オプション): キャプションを有効化（デフォルト: false）
- `test` (オプション): テストモード（デフォルト: false）

**戻り値**:
- `success`: 成功フラグ
- `video_id`: 生成された動画ID
- `video_data`: 動画データ
- `used_assets`: 使用されたアセット情報

## 🔄 ワークフロー例

### VSL動画作成の完全自動化

```
1. heygen_generate_vsl_script - VSLスクリプトを生成
2. heygen_generate_broll_veo - Bロール動画を生成（HeyGenライブラリに保存）
3. heygen_generate_background_music - バックミュージックを生成（HeyGenライブラリに保存）
4. heygen_generate_avatar_nanobanana - アバター画像を生成（HeyGenライブラリに保存）
5. heygen_get_voices - 音声一覧を取得
6. heygen_create_video_from_library - HeyGenライブラリのアセットを使用して動画を作成
```

### ライブラリから動画生成（推奨ワークフロー）

```
1. heygen_list_library - ライブラリのアセット一覧を確認
2. heygen_get_library_item - 必要なアセットの詳細を取得
3. heygen_get_voices - 使用する音声を選択
4. heygen_create_video_from_library - ライブラリのアセットIDを指定して動画を作成
```

## 📝 ライブラリファイル形式

各ライブラリアイテムには、以下のメタデータファイル（`.meta.json`）が作成されます：

```json
{
  "id": "scripts-1234567890",
  "category": "scripts",
  "filename": "vsl-script-1234567890.txt",
  "filePath": "data/heygen-library/scripts/vsl-script-1234567890.txt",
  "createdAt": "2026-01-09T12:00:00.000Z",
  "metadata": {
    "topic": "暗号通貨トレーディングコース",
    "target_audience": "初心者トレーダー",
    "duration": 90,
    "language": "ja"
  },
  "content": "生成されたコンテンツまたはファイルパス"
}
```

## 🎯 チーム機能強化の効果

### 1. コンテンツ作成の完全自動化
- VSLスクリプトの自動生成
- Bロール動画/画像の自動生成
- バックミュージックの自動生成
- アバター画像の自動生成

### 2. ライブラリ管理
- 生成されたコンテンツの一元管理
- 再利用可能なアセットの蓄積
- メタデータによる検索・管理

### 3. ワークフロー効率化
- 手動作業の削減
- 一貫性のあるコンテンツ生成
- 迅速な動画制作

## 🔍 トラブルシューティング

### Gemini APIエラー

1. **APIキーの確認**
   - `.env`ファイルに`GEMINI_API_KEY`が設定されているか確認

2. **エンドポイントエラー**
   - Veo動画生成は複数のエンドポイントを試行します
   - エラーが続く場合は、モデル名を確認してください

3. **タイムアウトエラー**
   - Veo動画生成は最大60回（10分）ポーリングします
   - タイムアウトが発生する場合は、プロンプトを簡潔にしてください

### ライブラリ保存エラー

1. **ディレクトリ権限**
   - `data/heygen-library/`ディレクトリの書き込み権限を確認

2. **ディスク容量**
   - 生成されたファイルのサイズを確認
   - ディスク容量が不足していないか確認

## 📚 参考情報

- [Gemini API ドキュメント](https://ai.google.dev/gemini-api/docs)
- [HeyGen API ドキュメント](https://docs.heygen.com)
- [Veo動画生成](https://ai.google.dev/gemini-api/docs/video)
- [NanoBanana画像生成](https://ai.google.dev/gemini-api/docs/image-generation)

---

**実装完了日**: 2026-01-09  
**バージョン**: 2.0.0  
**実装者**: COO (Composer 1)
