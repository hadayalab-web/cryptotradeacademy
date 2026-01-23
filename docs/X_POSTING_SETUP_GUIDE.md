# X投稿機能セットアップガイド

## 重大な不具合の修正完了

以下の不具合を修正しました：

1. ✅ **無料版レポートX投稿が実行されない問題**
   - `api/x-post-free-report.js`が独立したCronジョブとして正しく動作するように修正
   - 最新の市場データを自動取得する機能を追加
   - 二重実行防止機能を追加（KVストレージで実行済みフラグを管理）

2. ✅ **インフルエンサーへの引用リポストが実行されない問題**
   - `api/x-quote-repost.js`が独立したCronジョブとして正しく動作するように修正
   - 最新の市場データを自動取得する機能を追加
   - エラーハンドリングとログ出力を強化

3. ✅ **二重実行防止**
   - `api/cron.js`からの呼び出しを最適化（通常時は独立したCronジョブに任せる）
   - KVストレージで実行済みフラグを管理

## 必要な環境変数

以下の環境変数がVercelに設定されている必要があります：

### X API認証情報（必須）
```
X_API_CONSUMER_KEY=QiMTK7pB0mKMil7TyVjoC9GrT
X_API_CONSUMER_KEY_SECRET=5cCFod21lxdxqhoX8NxmdSpcU58Rjz8d5goXriAmth6UOuRVnA
X_API_ACCESS_TOKEN=2012160017974378496-M7DTJfmiKMiFYCKaENCa0d67ER08PR
X_API_ACCESS_TOKEN_SECRET=cgW9cnK8vBPJx6WOXDlAh7dVGdcAjs5hsgdLZyvLkOErO
```

### X投稿設定
```
X_POSTING_ENABLED=true
X_POSTING_DRY_RUN=false
```

### Cron設定
```
CRON_SECRET=9bbaadd14244949f1647185d88f48fdefff61c3531b3c0f325951edafe69e359
```

### KVストレージ（投稿履歴追跡用）
```
KV_REST_API_URL=https://genuine-stork-35682.upstash.io
KV_REST_API_TOKEN=AYtiAAIncDE3ZjBjNDQxMzgwYzQ0MzdhYWI1MTYwMTFkMzFjNDA3MXAxMzU2ODI
```

## Cronスケジュール

`vercel.json`に以下のスケジュールが設定されています：

1. **無料版レポートX投稿**: 毎日6:05と18:05 UTC
   ```json
   { "path": "/api/x-post-free-report", "schedule": "5 6,18 * * *" }
   ```

2. **引用リポスト**: 毎日12-22時 UTC（1時間ごと）
   ```json
   { "path": "/api/x-quote-repost", "schedule": "0 12-22 * * *" }
   ```

## 動作確認方法

### 1. Vercelダッシュボードで確認
- Vercelダッシュボード → Functions → Cron Jobs
- `x-post-free-report`と`x-quote-repost`の実行ログを確認

### 2. Xアカウント（@trapdefence）で確認
- 無料版レポートの投稿が表示されているか確認
- インフルエンサーへの引用リポストが表示されているか確認

### 3. ログで確認
- Vercelダッシュボード → Logs
- `[X Post Free Report]`と`[Quote Repost]`のログを確認

## トラブルシューティング

### 問題: X投稿が実行されない

**確認事項:**
1. 環境変数が正しく設定されているか
   - Vercelダッシュボード → Settings → Environment Variables
   - 必須の4つのX API認証情報が設定されているか確認

2. `X_POSTING_ENABLED`が`true`に設定されているか
3. `X_POSTING_DRY_RUN`が`false`に設定されているか
4. Cronジョブが正しくスケジュールされているか
   - `vercel.json`の設定を確認

### 問題: 二重投稿が発生する

**解決策:**
- KVストレージで実行済みフラグを管理しているため、通常は発生しません
- もし発生する場合は、KVストレージのキーを確認：
  - `x:free-report:YYYY-MM-DD`（無料版レポート用）
  - `x:posts:YYYY-MM-DD`（1日の投稿数）

### 問題: 引用リポストが実行されない

**確認事項:**
1. Grok API（XAI_API_KEY）が設定されているか
2. インフルエンサーが発掘できているか（ログで確認）
3. ピーク時間（UTC 12-22時）に実行されているか
4. 1日の投稿上限（25投稿/日）に達していないか

## 修正内容の詳細

### api/x-post-free-report.js
- ✅ `fetchLatestMarketData()`関数を追加：独立したCronジョブ実行時に最新の市場データを取得
- ✅ `hasPostedFreeReportToday()`関数を追加：二重実行防止
- ✅ `markFreeReportPostedToday()`関数を追加：投稿完了後にフラグを設定
- ✅ エラーハンドリングとログ出力を強化

### api/x-quote-repost.js
- ✅ レポートデータが提供されていない場合、`fetchLatestMarketData()`を使用して最新データを取得
- ✅ エラーハンドリングとログ出力を強化

### api/cron.js
- ✅ 通常の定期実行時は独立したCronジョブに任せる（二重実行防止）
- ✅ `force=true`の場合のみ即座に実行

## 次のステップ

1. ✅ 環境変数をVercelに設定（提供された環境変数を使用）
2. ✅ VercelダッシュボードでCronジョブの実行ログを確認
3. ✅ Xアカウント（@trapdefence）で投稿が表示されるか確認
4. ✅ インプレッションとトラフィックをモニタリング
