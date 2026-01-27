# X APIデバッグガイド
**作成日時**: 2026-01-27  
**目的**: X APIが動作していない問題を特定するためのデバッグガイド

## 🔍 問題の概要

X APIのクレジットが減っていない、X API関連がまったく動いていない可能性があります。

## 📊 環境変数の確認

以下の環境変数が正しく設定されていることを確認しました：

✅ **設定済み**:
- `X_API_CONSUMER_KEY`: ✅
- `X_API_CONSUMER_KEY_SECRET`: ✅
- `X_API_ACCESS_TOKEN`: ✅
- `X_API_ACCESS_TOKEN_SECRET`: ✅
- `X_POSTING_ENABLED`: `true` ✅
- `X_POSTING_DRY_RUN`: `false` ✅

## 🔧 追加したデバッグログ

X APIの呼び出し状況を確認するため、以下のデバッグログを追加しました：

### 1. `services/x/client.js`の`xApiRequest()`関数

```javascript
console.log('[X API] 🔵 xApiRequest called:', {
  endpoint,
  method: options.method || 'GET',
  hasConsumerKey: !!X_API_CONSUMER_KEY,
  hasConsumerSecret: !!X_API_CONSUMER_KEY_SECRET,
  hasAccessToken: !!X_API_ACCESS_TOKEN,
  hasAccessTokenSecret: !!X_API_ACCESS_TOKEN_SECRET,
  timestamp: new Date().toISOString(),
});
```

### 2. `api/x-quote-repost.js`の`postQuoteRepostsForLang()`関数

#### 2.1 ローテーション選択の結果
```javascript
console.log(`[Quote Repost] 🔵 Rotation selection result:`, {
  lang,
  selectedCount: selectedInfluencers?.length || 0,
  targetCount,
  timestamp: new Date().toISOString(),
});
```

#### 2.2 influencers変数の代入前後
```javascript
console.log(`[Quote Repost] 🔵 About to assign selectedInfluencers to influencers:`, {
  lang,
  influencersLength: influencers.length,
  selectedInfluencersLength: selectedInfluencers.length,
  timestamp: new Date().toISOString(),
});

influencers = selectedInfluencers;

console.log(`[Quote Repost] 🔵 Successfully assigned influencers:`, {
  lang,
  influencersLength: influencers.length,
  timestamp: new Date().toISOString(),
});
```

#### 2.3 ループ開始前
```javascript
console.log(`[Quote Repost] 🔵 Starting influencer loop:`, {
  lang,
  influencersCount: influencers.length,
  maxInfluencers: targetCount,
  timestamp: new Date().toISOString(),
});
```

#### 2.4 各インフルエンサーの処理開始時
```javascript
console.log(`[Quote Repost] 🔵 Processing influencer:`, {
  lang,
  influencer: influencer.username,
  tweetId: influencer.tweetId,
  timestamp: new Date().toISOString(),
});
```

#### 2.5 X API呼び出し前
```javascript
console.log(`[Quote Repost] 🔵 About to call postQuoteTweet:`, {
  lang,
  influencer: influencer.username,
  tweetId: influencer.tweetId,
  textLength: quoteText.length,
  timestamp: new Date().toISOString(),
});
```

## 📋 デバッグ手順

### ステップ1: 修正をデプロイ

1. 修正をコミット・プッシュ
2. Vercelにデプロイ
3. デプロイ完了を確認

### ステップ2: ログの確認

Vercelログで以下のログを検索：

1. **X API設定の確認**
   ```
   [Quote Repost] X API Status:
   ```
   - `configured: true`であることを確認
   - `postingEnabled: true`であることを確認
   - `dryRun: false`であることを確認

2. **ローテーション選択の確認**
   ```
   [Quote Repost] 🔵 Rotation selection result:
   ```
   - `selectedCount`が0より大きいことを確認

3. **influencers変数の代入確認**
   ```
   [Quote Repost] 🔵 About to assign selectedInfluencers to influencers:
   [Quote Repost] 🔵 Successfully assigned influencers:
   ```
   - エラーが発生していないことを確認

4. **ループ開始の確認**
   ```
   [Quote Repost] 🔵 Starting influencer loop:
   ```
   - `influencersCount`が0より大きいことを確認

5. **各インフルエンサーの処理確認**
   ```
   [Quote Repost] 🔵 Processing influencer:
   ```
   - 各インフルエンサーが処理されていることを確認

6. **X API呼び出し前の確認**
   ```
   [Quote Repost] 🔵 About to call postQuoteTweet:
   ```
   - X API呼び出し前に到達していることを確認

7. **X API呼び出しの確認**
   ```
   [X API] 🔵 xApiRequest called:
   ```
   - X APIが実際に呼び出されていることを確認
   - 認証情報が正しく設定されていることを確認

### ステップ3: エラーの確認

以下のエラーログを検索：

1. **Assignment to constant variable**
   ```
   ❌ Failed to post quote reposts for {lang}: Assignment to constant variable.
   ```
   - このエラーが発生している場合、修正がデプロイされていない可能性があります

2. **X API認証エラー**
   ```
   [X API] ❌ Missing credentials:
   ```
   - 認証情報が不足している場合

3. **X API呼び出しエラー**
   ```
   [X API] Failed to post quote tweet:
   ```
   - X APIの呼び出しが失敗している場合

## 🔍 考えられる原因と対処法

### 1. Assignment to constant variableエラー

**原因**: `influencers`変数が`const`で宣言されている（修正がデプロイされていない）

**対処法**:
- `api/x-quote-repost.js:549`で`let influencers`に変更されていることを確認
- 修正をデプロイ

### 2. ローテーション選択が失敗している

**原因**: `selectInfluencersWithRotation()`が空の配列を返している

**対処法**:
- ログで`selectedCount`を確認
- フォールバック処理が動作していることを確認

### 3. インフルエンサーのループが実行されていない

**原因**: `influencers`が空、または`maxInfluencers`が0

**対処法**:
- ログで`influencersCount`と`maxInfluencers`を確認
- インフルエンサーが正しく取得されていることを確認

### 4. X API呼び出し前にエラーが発生している

**原因**: タイミングチェック、インプレッション規模チェック、テキスト生成などでエラーが発生

**対処法**:
- 各チェックポイントのログを確認
- エラーが発生している箇所を特定

### 5. X APIが実際に呼び出されていない

**原因**: `postQuoteTweet()`が呼び出される前に処理が終了している

**対処法**:
- `[Quote Repost] 🔵 About to call postQuoteTweet:`のログを確認
- その後の`[X API] 🔵 xApiRequest called:`のログを確認

## 📊 ログの検索クエリ

Vercelログで以下のクエリを使用して検索：

1. **X API設定の確認**
   ```
   [Quote Repost] X API Status
   ```

2. **デバッグログの確認**
   ```
   [Quote Repost] 🔵
   ```

3. **X API呼び出しの確認**
   ```
   [X API] 🔵
   ```

4. **エラーの確認**
   ```
   ❌ Failed to post quote reposts
   ```

5. **成功ログの確認**
   ```
   ✅✅✅ SUCCESSFULLY POSTED
   ```

## 🎯 次のステップ

1. ✅ 修正をデプロイ
2. ⚠️ ログを確認（上記のデバッグ手順に従う）
3. ⚠️ エラーが発生している箇所を特定
4. ⚠️ 必要に応じて追加の修正を実施

---

**作成日時**: 2026-01-27  
**関連レポート**: 
- `docs/reports/x-api-not-working-investigation.md`
- `docs/reports/vercel-deployment-12h-logs-investigation.md`
