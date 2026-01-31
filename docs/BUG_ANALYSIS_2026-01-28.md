# バグ分析レポート - 2026-01-28

## 🔴 重大なバグ: `/api/cron` が500エラーで失敗

### エラー詳細

**発生時刻**: UTC 2026-01-28 06:00:36 (JST 15:00:36)  
**エンドポイント**: `/api/cron`  
**HTTPステータス**: 500  
**エラーメッセージ**: 
```
Cannot find module '../shared/contentFilters'
Require stack:
- /var/task/services/telegram/messages/user/ja/regular.ja.js
- /var/task/api/cron.js
```

### 根本原因

1. **Vercelデプロイ時のファイル不足**
   - `services/telegram/messages/user/ja/regular.ja.js` と `services/telegram/messages/user/en/regular.en.js` が `require('../shared/contentFilters')` を使用
   - `vercel.json` の `includeFiles` に `services/telegram/messages/user/**` が含まれていなかった
   - そのため、Vercelデプロイ時にテンプレートファイルが含まれず、実行時にモジュールが見つからない

2. **影響範囲**
   - 定期配信（UTC 0, 6, 12, 18時）が完全に失敗
   - 無料版（Minimal Version）と有料版（Regular Briefing）の両方が配信されない
   - エラーが発生すると、フォールバック処理も失敗し、プロセスが終了

### 修正内容

**`vercel.json` の修正**:
```json
"api/cron.js": {
  "includeFiles": "{api/services/**,config/**,services/telegram/messages/**}"
}
```

変更点:
- `services/telegram/messages/shared/**` → `services/telegram/messages/**`
- これにより、`shared/` ディレクトリだけでなく、`user/` ディレクトリ内のすべてのテンプレートファイルも含まれる

### その他の問題

#### 1. `/api/x-quote-repost` が504タイムアウト

**発生時刻**: UTC 2026-01-28 06:00:06  
**エンドポイント**: `/api/x-quote-repost`  
**HTTPステータス**: 504  
**エラー**: `Vercel Runtime Timeout Error: Task timed out after 60 seconds`  
**実行時間**: 60.03秒

**原因**:
- jitterで1.58分の遅延を適用しているが、その後の処理が60秒を超えている
- `vercel.json` で `maxDuration: 60` が設定されているが、実際の処理時間が60秒を超えている

**推奨対応**:
- `vercel.json` の `maxDuration` を120秒に増やす
- または、jitterの遅延時間を短縮する

#### 2. 環境変数の警告

**`/api/vsl2-free-users` と `/api/vsl2-last-call`**:
```
⚠️ TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not set in environment variables
```

**影響**: 
- エラーではないが、Telegram DMの送信ができない状態
- 環境変数の設定を確認する必要がある

### 修正後の確認事項

1. ✅ `vercel.json` の `includeFiles` を修正
2. ⚠️ 次回の定期配信（UTC 6, 12, 18, 0時）で正常に動作するか確認
3. ⚠️ `/api/x-quote-repost` のタイムアウト問題を調査・修正
4. ⚠️ 環境変数の設定を確認

### 関連ファイル

- `vercel.json` - Vercelデプロイ設定
- `services/telegram/messages/shared/contentFilters.js` - 共有フィルター関数
- `services/telegram/messages/user/ja/regular.ja.js` - 日本語テンプレート
- `services/telegram/messages/user/en/regular.en.js` - 英語テンプレート
- `api/cron.js` - 定期配信Cronジョブ
