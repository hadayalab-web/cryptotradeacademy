# 投稿ログ記録システム

## 📋 概要

PDCAサイクルを回すために、投稿履歴を確実に記録・取得できるシステムを実装しました。

## 🎯 目的

- **確実な証拠の記録**: 投稿成功/失敗をKVストレージに構造化ログとして記録
- **PDCAの基盤**: 正確なデータに基づいた分析と改善
- **ログの二重記録**: `console.log` + KVストレージ（確実性の向上）

## 📊 記録されるログタイプ

### 1. Quote Repost投稿
- **投稿成功**: `quote_repost`
- **投稿失敗**: `quote_repost` (type: POST_FAILURE)
- **ストックリスト選択**: `quote_repost_selection`
- **最終確認**: `quote_repost_confirmed`

### 2. Free Report投稿
- **投稿成功**: `free_report`

### 3. Minimal Version投稿
- **メイン投稿成功**: `minimal_version`
- **リプライ投稿成功**: `minimal_version_reply`

## 🔧 実装詳細

### ログ記録サービス
- **ファイル**: `services/core/postLogger.js`
- **ストレージ**: Vercel KV (`x:post_logs:YYYY-MM-DD`)
- **TTL**: 30日間

### 記録されるデータ構造

```javascript
{
  timestamp: "2026-01-26T06:42:00.000Z",
  type: "POST_SUCCESS" | "POST_FAILURE",
  postType: "quote_repost" | "free_report" | "minimal_version",
  quoteTweetId: "1234567890123456789", // Quote Repostの場合
  tweetId: "1234567890123456789", // Free Report/Minimal Versionの場合
  lang: "en",
  influencerUsername: "@username", // Quote Repostの場合
  originalTweetId: "1234567890123456789", // Quote Repostの場合
  estimatedImpressions: 150000, // Quote Repostの場合
  impressions: 0, // 実際のインプレッション数（初期値は0の可能性あり）
  engagements: 0, // エンゲージメント数
  // ... その他のメタデータ
}
```

## 📖 使用方法

### 1. API経由でログを取得

```bash
# 指定日のログを取得
GET /api/x-post-logs?date=2026-01-26

# 最近7日間のログを取得
GET /api/x-post-logs?days=7
```

### 2. スクリプトでログを取得

```bash
# 指定日のログを取得
node scripts/get-post-logs.js --date=2026-01-26

# 最近7日間のログを取得（デフォルト）
node scripts/get-post-logs.js

# 最近30日間のログを取得
node scripts/get-post-logs.js --days=30
```

## 📊 ログ記録の確認

### Quote Repost投稿成功ログの確認

```bash
node scripts/get-post-logs.js --days=1 | grep "quote_repost"
```

### ストックリストからの選択ログの確認

```bash
node scripts/get-post-logs.js --days=1 | grep "quote_repost_selection"
```

## ✅ 確認事項

1. **ストックリストからの選択**: `quote_repost_selection`ログで確認可能
2. **投稿成功**: `POST_SUCCESS`タイプのログで確認可能
3. **投稿失敗**: `POST_FAILURE`タイプのログで確認可能
4. **ツイートID**: 各ログに`quoteTweetId`または`tweetId`が記録される

## 🔍 トラブルシューティング

### ログが記録されない場合

1. **KVストレージの確認**
   ```bash
   # KVストレージが利用可能か確認
   node -e "const kv = require('@vercel/kv').kv; kv.get('x:post_logs:2026-01-26').then(console.log).catch(console.error);"
   ```

2. **console.logの確認**
   - Vercelのログで`[PostLogger]`で検索
   - フォールバックログが出力されているか確認

3. **エラーログの確認**
   - `[PostLogger] ⚠️ Failed to log` という警告がないか確認

## 📈 今後の拡張

- [ ] ログの可視化ダッシュボード
- [ ] 自動アラート機能
- [ ] ログのエクスポート機能
- [ ] 統計情報の自動計算
