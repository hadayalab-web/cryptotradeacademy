# アクション項目の解決状況

**作成日**: 2026-01-16  
**確認者**: COO（Cursor/Composer 1）

---

## 📋 各項目の解決状況

### 1. ⚠️ free-users.json をKV/DBへ移行（最優先）

**現状**: ❌ **未解決**

**問題点**:
- `services/free-users/manager.js` が `data/free-users.json` にローカル保存
- Vercelのサーバーレス環境では、ファイルシステムへの書き込みが永続化されない
- デプロイごとに無料ユーザーリストがリセットされる可能性

**推奨対応**:
- **短期**: 環境変数で管理（カンマ区切り、制限あり）
- **長期**: Vercel KV、Upstash、またはMongoDB等のデータベースに移行

**影響度**: 🔴 **高** - 本番運用でVSL2配信が正常に動作しない可能性

---

### 2. ✅ VSL2の「24h運用」か「48h字幕」かを統一

**現状**: ✅ **コード側は統一済み（24時間）**

**確認結果**:
- ✅ **コード実装**: 24時間設定で統一
  - `services/free-users/manager.js`: `twentyFourHoursAgo`（24時間前）
  - `api/vsl2-free-users.js`: `hoursLeft = 24`、"24-HOUR LIMITED"
  - `api/vsl2-last-call.js`: 22時間後（24時間経過の2時間前）
- ⚠️ **VSL2動画字幕**: "48 hours" の記述あり（動画コンテンツの問題）

**結論**:
- **コード側**: 24時間で統一済み ✅
- **動画字幕**: 48時間の記述あり（動画編集が必要だが、コード側は問題なし）

**推奨**: コード側は24時間で統一されているため、動画字幕の修正は任意（動画編集が必要）

---

### 3. ✅ VSL1_YOUTUBE_LINK / VSL2_YOUTUBE_LINK / VSL_YOUTUBE_LINK の最新値を再確認

**現状**: ✅ **解決済み**

**確認結果**:
- ✅ VSL1 YouTubeリンク: `https://youtu.be/fXgVsKhqDjI` に更新済み
  - `api/vsl1-post.js`: デフォルト値更新済み
  - `api/vsl1-reminder.js`: デフォルト値更新済み
- ✅ VSL2 YouTubeリンク: `https://youtu.be/OqvqngJOiXc` に更新済み
  - `api/vsl2-free-users.js`: デフォルト値更新済み
  - `api/vsl2-last-call.js`: デフォルト値更新済み
  - `services/telegram/bot-commands.js`: 環境変数から取得（問題なし）
  - `services/telegram/messages/user/en/minimal-high-quality.en.js`: 環境変数から取得（問題なし）

**結論**: ✅ **すべて正しいURLに更新済み**

---

### 4. ⚠️ X投稿の自動化（VSL1）

**現状**: ❌ **未実装（TODOコメントのまま）**

**確認結果**:
- `api/vsl1-post.js` にTODOコメントあり
- X API統合サービス未実装

**影響度**: 🟡 **中** - Grokの推奨施策だが、本番運用には必須ではない

**推奨対応**:
- X API Freeプランで実装
- `services/x/client.js` を作成
- `api/vsl1-post.js` でX投稿機能を追加

---

## 🎯 解決状況サマリー

| 項目 | 状態 | 優先度 | 対応状況 |
|------|------|--------|---------|
| free-users.json → KV/DB移行 | ❌ 未解決 | 🔴 高 | **要対応** |
| VSL2時間整合 | ✅ 解決済み | 🟢 低 | コード側は24時間で統一 |
| YouTubeリンク確認 | ✅ 解決済み | 🟢 低 | すべて正しいURLに更新 |
| X投稿自動化 | ❌ 未実装 | 🟡 中 | 任意（成長施策） |

---

## 📋 推奨アクション

### 最優先（本番運用前に必須）

1. **free-users.json → KV/DB移行**
   - Vercel KVまたはUpstash Redisに移行
   - 本番運用でVSL2配信が正常に動作するために必須

### 任意（本番運用後でも可）

2. **X投稿自動化**
   - Grokの推奨施策だが、本番運用には必須ではない
   - 成長施策として後から実装可能

---

**作成者**: COO（Cursor/Composer 1）  
**状態**: ⚠️ **free-users.json → KV/DB移行が未解決**
