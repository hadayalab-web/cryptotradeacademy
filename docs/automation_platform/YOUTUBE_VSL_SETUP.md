# YouTube VSL設定ガイド

**作成日時**: 2026-01-13  
**目的**: HeyGen VSLからYouTubeリンクへの移行（パフォーマンス向上）

---

## 🎯 YouTubeリンクの利点

### パフォーマンス
- ✅ **読み込み速度**: YouTubeはCDNが最適化されており、読み込みが速い
- ✅ **メールクライアント対応**: Gmailなどでサムネイルが自動表示される
- ✅ **広範なサポート**: ほぼすべてのプラットフォームでサポート

### ユーザー体験
- ✅ **サムネイル表示**: メールで動画のサムネイルが表示される
- ✅ **再生しやすい**: YouTubeアプリで直接開ける
- ✅ **シェアしやすい**: YouTubeのシェア機能が使える

---

## 🔧 設定方法

### 1. 環境変数の設定

`.env`ファイルに以下を追加：

```bash
# YouTube VSL URL（優先）
YOUTUBE_VSL_URL=https://www.youtube.com/watch?v=VIDEO_ID

# または短縮URL
YOUTUBE_VSL_URL=https://youtu.be/VIDEO_ID

# HeyGen VSL URL（フォールバック、YouTubeが設定されていない場合に使用）
HEYGEN_VSL_SHARE_URL=https://app.heygen.com/videos/3aaf47b98f4b49c59c14999a16038af3
```

### 2. YouTubeリンクの形式

以下のいずれかの形式が使用可能：

- **標準形式**: `https://www.youtube.com/watch?v=VIDEO_ID`
- **短縮形式**: `https://youtu.be/VIDEO_ID`
- **埋め込み形式**: `https://www.youtube.com/embed/VIDEO_ID`（自動変換されます）

---

## 📋 動作確認

### DMメッセージ生成時

```bash
npx tsx scripts/generate-dm-messages-en.ts
```

**確認項目**:
- ✅ YouTubeリンクが使用されているか
- ✅ 埋め込みURLが正しく生成されているか
- ✅ 共有リンクが正しく設定されているか

### CEOテスト送信時

```bash
npx tsx scripts/send-ceo-test-dm-csv.ts
```

**確認項目**:
- ✅ EmailでYouTubeリンクがボタンとして表示されるか
- ✅ TelegramでYouTubeリンクがテキストリンクとして表示されるか
- ✅ リンクが正しく動作するか

---

## 🔄 フォールバック動作

### YouTubeリンクが設定されていない場合

1. **HeyGen VSL URL**が使用されます
2. 既存の動作が維持されます
3. エラーは発生しません

### 環境変数の優先順位

1. `YOUTUBE_VSL_URL`（最優先）
2. `HEYGEN_VSL_SHARE_URL`（フォールバック）
3. デフォルトHeyGen URL（最終フォールバック）

---

## 📊 コード変更箇所

### `scripts/generate-dm-messages-en.ts`

- ✅ YouTubeリンクの検出と埋め込みURL生成
- ✅ プロンプト内でのYouTube/HeyGenの自動切り替え
- ✅ 共有リンクの適切な設定

### `scripts/send-ceo-test-dm-csv.ts`

- ✅ Email送信時のYouTubeリンク対応
- ✅ Telegram送信時のYouTubeリンク対応
- ✅ 埋め込みURLから共有リンクへの自動変換

---

## 🎨 Email表示の改善

### YouTubeリンクの場合

- **ボタン色**: 赤（`#ff0000`）- YouTubeブランドカラー
- **ボタンテキスト**: "▶️ Watch on YouTube"
- **サムネイル**: Gmailが自動的にサムネイルを表示

### HeyGenリンクの場合（フォールバック）

- **ボタン色**: 青（`#007bff`）
- **ボタンテキスト**: "📹 Watch Our VSL Video"

---

## ✅ 次のステップ

1. ⏳ **YouTubeにVSLをアップロード**（まだの場合）
2. ⏳ **環境変数`YOUTUBE_VSL_URL`を設定**
3. ⏳ **DMメッセージを再生成**（`npx tsx scripts/generate-dm-messages-en.ts`）
4. ⏳ **CEOテスト送信を実行**（`npx tsx scripts/send-ceo-test-dm-csv.ts`）
5. ⏳ **Email/TelegramでYouTubeリンクが正しく表示されることを確認**

---

**作成日時**: 2026-01-13  
**報告者**: COO兼CTO（Cursor/Composer 1）
