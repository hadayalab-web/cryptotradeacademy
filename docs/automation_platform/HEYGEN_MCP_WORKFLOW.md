# HeyGen MCP Server ワークフロー

## 📋 概要

HeyGen MCPサーバーは、HeyGen固有の機能（動画作成、ライブラリ管理、アセットアップロード）に集中しています。

**Geminiのコンテンツ生成機能は、既存のGemini MCPサーバーを使用してください。**

## 🔄 推奨ワークフロー

### VSL動画作成の完全自動化

```
1. Gemini MCPサーバーでコンテンツを生成
   - gemini_generate_text - VSLスクリプトを生成
   - gemini_veo_generate_video - Bロール動画を生成
   - gemini_nanobanana_generate_image - Bロール画像を生成
   - gemini_generate_speech - バックミュージックを生成
   - gemini_nanobanana_generate_image - アバター画像を生成

2. HeyGen MCPサーバーでアップロード・動画作成
   - heygen_upload_asset - 生成されたコンテンツをHeyGenライブラリにアップロード
   - heygen_get_voices - 音声一覧を取得
   - heygen_create_video_from_library - ライブラリのアセットIDを使用して動画を作成
```

## 🔧 HeyGen MCPサーバーの機能

### 1. 動画作成
- `heygen_create_video` - HeyGenで動画を作成
- `heygen_create_video_from_library` - ライブラリのアセットを使用して動画を作成

### 2. ライブラリ管理
- `heygen_upload_asset` - ファイルをHeyGenライブラリにアップロード
- `heygen_list_library` - ライブラリのアセット一覧を取得
- `heygen_get_library_item` - ライブラリからアセットを取得

### 3. 音声・アバター管理
- `heygen_get_voices` - 音声一覧を取得
- `heygen_get_voice_locales` - 音声ロケール一覧を取得

### 4. 動画管理
- `heygen_get_video_status` - 動画ステータスを取得
- `heygen_get_videos` - 動画一覧を取得
- `heygen_get_remaining_credits` - 残りクレジットを取得

## 📝 使用例

### Geminiでコンテンツを生成してHeyGenにアップロード

```
1. Gemini MCPサーバーで画像を生成
   gemini_nanobanana_generate_imageを使用してBロール画像を生成

2. 生成された画像をHeyGenライブラリにアップロード
   heygen_upload_assetを使用して、Base64データまたはファイルパスを指定してアップロード

3. ライブラリのアセットを使用して動画を作成
   heygen_create_video_from_libraryを使用して、アセットIDを指定して動画を作成
```

### 完全自動化ワークフロー

```
1. Gemini MCPサーバーでVSLスクリプトを生成
   - gemini_generate_text: "VSLスクリプトを作成してください。トピック: 暗号通貨トレーディングコース"

2. Gemini MCPサーバーでBロール動画を生成
   - gemini_veo_generate_video: "ビジネスパーソンがオフィスで働いている様子"

3. Gemini MCPサーバーでBロール画像を生成
   - gemini_nanobanana_generate_image: "都市の夜景、ネオンサインが輝く"

4. Gemini MCPサーバーでバックミュージックを生成
   - gemini_generate_speech: "アップテンポなビジネス音楽"

5. Gemini MCPサーバーでアバター画像を生成
   - gemini_nanobanana_generate_image: "プロフェッショナルなビジネスパーソン"

6. HeyGen MCPサーバーでアップロード
   - heygen_upload_asset: 各生成コンテンツをHeyGenライブラリにアップロード

7. HeyGen MCPサーバーで動画を作成
   - heygen_get_voices: 音声一覧を取得
   - heygen_create_video_from_library: ライブラリのアセットIDを使用して動画を作成
```

## 🎯 役割分担

### Gemini MCPサーバー
- コンテンツ生成（VSLスクリプト、Bロール動画/画像、バックミュージック、アバター画像）
- テキスト生成、画像生成、動画生成、音声生成

### HeyGen MCPサーバー
- HeyGenライブラリへのアップロード
- HeyGen動画の作成
- ライブラリ管理
- 音声・アバター管理

## ✅ メリット

1. **責任の分離**: 各MCPサーバーが明確な役割を持つ
2. **再利用性**: Gemini MCPサーバーの機能を他の用途でも使用可能
3. **保守性**: 各サーバーが独立して管理・更新可能
4. **拡張性**: 新しい機能を追加しやすい

---

**更新日**: 2026-01-09  
**バージョン**: 2.0.0
