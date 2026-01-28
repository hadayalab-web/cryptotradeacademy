# X APIコスト追跡実装レポート（2026-01-28）

## 📊 実装内容

X APIのコストデータをKVストレージに保存・追跡する機能を実装しました。

## ✅ 実装した機能

### 1. コスト追跡サービス
**ファイル**: `services/x/costTracker.js`

**機能**:
- 操作別コスト記録（`recordCost`）
- 日次コスト取得（`getDailyCost`）
- 月次コスト取得（`getMonthlyCost`）
- 期間コスト取得（`getCostForPeriod`）
- コストサマリー取得（`getCostSummary`）

**対応操作**:
- `post`: 投稿作成（$0.005/回）
- `userRead`: ユーザー情報取得（$0.002/回）
- `search`: ツイート検索（$0.002/回）
- `followers`: フォロワー数取得（$0.01/回）
- `profile`: プロファイル情報取得（$0.002/回）
- `message`: DM送信（$0.01/回）
- `imageUpload`: 画像アップロード（$0.005/回）
- `videoUpload`: 動画アップロード（$0.01/回）

### 2. コスト記録の統合

以下のAPIエンドポイントにコスト記録を追加：

#### `api/x-quote-repost.js`
- ✅ 引用リポスト投稿成功時にコストを記録（`post`操作）
- メタデータ: lang, jobId, influencer, quoteTweetId, originalTweetId

#### `api/x-post-free-report.js`
- ✅ 無料版レポート投稿成功時にコストを記録（`post`操作）
- ✅ スレッドリプライ投稿成功時にコストを記録（`post`操作）
- ✅ ベロシティ戦術リプライ投稿成功時にコストを記録（`post`操作）
- ✅ 画像アップロード成功時にコストを記録（`imageUpload`操作）
- ✅ 動画アップロード成功時にコストを記録（`videoUpload`操作）
- メタデータ: lang, jobId, tweetId, contentFormat, hasMedia, hasPoll, isThread, threadIndex

#### `api/x-post-minimal-version.js`
- ✅ 無料版（Minimal Version）投稿成功時にコストを記録（`post`操作）
- ✅ スレッドリプライ投稿成功時にコストを記録（`post`操作）
- メタデータ: lang, jobId, tweetId, threadLength, abTestVariant, isThread, threadIndex

#### `api/vsl1-post.js`
- ✅ VSL1投稿成功時にコストを記録（`post`操作）
- ✅ 画像アップロード成功時にコストを記録（`imageUpload`操作）
- メタデータ: lang, jobId, tweetId, variant, hasMedia, contentType

### 3. コストサマリースクリプト
**ファイル**: `scripts/get-x-api-cost-summary.js`

**機能**:
- 今日のコスト表示
- 今月のコスト表示
- 過去7日間のコスト表示
- JSON形式での出力（`--json`オプション）

## 📋 KVストレージ構造

### 日次コストキー
```
x:api:cost:daily:YYYY-MM-DD
```

**データ構造**:
```json
{
  "date": "2026-01-28",
  "total": 0.025,
  "operations": {
    "post": 5
  },
  "postCount": 5,
  "metadata": [
    {
      "operation": "post",
      "count": 1,
      "cost": 0.005,
      "timestamp": "2026-01-28T12:00:00.000Z",
      "lang": "en",
      "jobId": "x-quote-repost",
      "tweetId": "1234567890"
    }
  ]
}
```

### 月次コストキー
```
x:api:cost:monthly:YYYY-MM
```

**データ構造**:
```json
{
  "month": "2026-01",
  "total": 0.775,
  "operations": {
    "post": 155
  },
  "postCount": 155,
  "dailyBreakdown": {
    "2026-01-28": 0.025,
    "2026-01-27": 0.030
  }
}
```

### 操作別コストキー
```
x:api:cost:operation:{operation}:YYYY-MM-DD
```

**データ構造**:
```json
{
  "operation": "post",
  "date": "2026-01-28",
  "count": 5,
  "totalCost": 0.025
}
```

## 🔍 使用例

### コストを記録
```javascript
const { recordCost } = require('../services/x/costTracker');

// 投稿成功時
await recordCost('post', 1, {
  lang: 'en',
  jobId: 'x-quote-repost',
  tweetId: '1234567890',
});
```

### コストを取得
```javascript
const { getDailyCost, getMonthlyCost } = require('../services/x/costTracker');

// 今日のコスト
const todayCost = await getDailyCost();

// 今月のコスト
const monthlyCost = await getMonthlyCost();
```

### コストサマリーを表示
```bash
# コマンドラインから実行
node scripts/get-x-api-cost-summary.js

# JSON形式で出力
node scripts/get-x-api-cost-summary.js --json
```

## 📊 データ保持期間

- **日次コスト**: 7日間（TTL: 86400 * 7秒）
- **月次コスト**: 93日間（TTL: 86400 * 93秒、約3ヶ月）
- **操作別コスト**: 7日間（TTL: 86400 * 7秒）

## ✅ 実装完了

X APIのコストデータをKVストレージに保存・追跡する機能が実装されました。

- ✅ コスト追跡サービス実装（`services/x/costTracker.js`）
- ✅ 主要な投稿APIにコスト記録を統合
  - ✅ 引用リポスト投稿（`x-quote-repost.js`）
  - ✅ 無料版レポート投稿（`x-post-free-report.js`）
  - ✅ 無料版（Minimal Version）投稿（`x-post-minimal-version.js`）
  - ✅ VSL1投稿（`vsl1-post.js`）
- ✅ リプライ投稿のコスト記録
- ✅ 画像・動画アップロードのコスト記録
- ✅ コストサマリースクリプト実装（`scripts/get-x-api-cost-summary.js`）
- ✅ 日次・月次・期間別のコスト取得機能

## 🚀 次のステップ

1. **実装確認**: 実際の投稿時にコストが正しく記録されているか確認
2. **コスト監視**: 定期的にコストサマリーを確認して予算管理
3. **アラート設定**: コストが閾値を超えた場合のアラート機能（将来実装）
