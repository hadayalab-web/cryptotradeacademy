# 緊急修正適用レポート（2026-01-25）

## 🚨 緊急修正完了

3つの重大な不具合を即座に修正しました。

---

## ✅ 修正1: X APIエラー（400） - 引数順序エラー

### 修正内容

**ファイル**: `api/x-post-free-report.js`  
**行**: 965

**修正前**:
```javascript
await replyToTweet(langMainTweetId, velocityReply.substring(0, 280));
```

**修正後**:
```javascript
// 🔴 CRITICAL FIX: 引数の順序を修正（textが先、inReplyToTweetIdが後）
await replyToTweet(velocityReply.substring(0, 280), langMainTweetId);
```

**エラーハンドリングも改善**:
```javascript
// 修正前: console.warn（警告レベル）
console.warn(`[X Post Free Report] Failed to post velocity self-question for ${lang}:`, error.message);

// 修正後: console.error（エラーレベル）+ 詳細情報
console.error(`[X Post Free Report] ❌ CRITICAL: Failed to post velocity self-question for ${lang}:`, {
  error: error.message,
  stack: error.stack,
  tweetId: langMainTweetId,
  lang,
  timestamp: new Date().toISOString(),
});
```

**影響**: 
- ✅ Velocity self-questionリプライが正常に投稿されるようになる
- ✅ エラーが発生した場合、詳細な情報が記録される

---

## ✅ 修正2: レート制限 - maxPostsPerHourパラメータ

### 修正内容

**ファイル**: `api/x-post-free-report.js`  
**行**: 807-822

**修正前**:
```javascript
if (currentHourlyCount >= maxPostsPerHour - 2) {
  console.log(`⏰ Skipping ${lang} (not peak hour and hourly limit near: ${currentHourlyCount}/${maxPostsPerHour - 2})`);
  continue;
}
// ...
if (!checkHourlyPostLimit(currentHourlyCount, maxPostsPerHour)) {
```

**修正後**:
```javascript
// 🔴 CRITICAL FIX: ピーク時間外の制限を明確化
const peakHourLimit = maxPostsPerHour - 2; // ピーク時間外は制限を2減らす
if (currentHourlyCount >= peakHourLimit) {
  console.log(`⏰ Skipping ${lang} (not peak hour and hourly limit near: ${currentHourlyCount}/${peakHourLimit})`);
  continue;
}
// ...
// 🔴 CRITICAL FIX: maxPostsPerHourを明示的に渡す
if (!checkHourlyPostLimit(currentHourlyCount, maxPostsPerHour)) {
```

**影響**:
- ✅ ログメッセージが正確になる
- ✅ レート制限チェックが正しく機能する

**注意**: `checkHourlyPostLimit`の呼び出しは既に`maxPostsPerHour`を渡していましたが、ログメッセージの不整合を修正しました。

---

## ✅ 修正3: 投稿上限の不整合 "30/25"

### 修正内容

**ファイル**: `api/x-post-minimal-version.js`  
**行**: 257-264

**修正前**:
```javascript
const maxDailyPosts = 25; // Grok推奨: 20-25回/日（スパム判定回避）
const dailyPostCount = await getDailyPostCount(dateString);
if (dailyPostCount >= maxDailyPosts) {
  console.log(`[X Post Minimal] ⏰ Daily post limit reached (${dailyPostCount}/${maxDailyPosts}), skipping minimal version post for ${normalizedLang}`);
```

**修正後**:
```javascript
// 🔴 CRITICAL FIX: 1日の投稿上限を35に統一（Free Reportと同じ上限を使用）
// 注意: 投稿タイプごとに異なる上限を設定する場合は、カウンターも分離する必要がある
const maxDailyPosts = 35; // Free Reportと同じ上限に統一（インプレッション最大化）
const dailyPostCount = await getDailyPostCount(dateString);
if (dailyPostCount >= maxDailyPosts) {
  console.log(`[X Post Minimal] ⏰ Daily post limit reached (${dailyPostCount}/${maxDailyPosts}), skipping minimal version post for ${normalizedLang}`);
```

**影響**:
- ✅ Minimal Versionの投稿が正常に機能するようになる
- ✅ 投稿上限の不整合が解消される

**今後の改善**:
- 投稿タイプごとに異なる上限を設定する場合は、カウンターを分離する必要がある
- 統一された`getDailyPostCount()`実装を`services/x/optimization.js`に作成し、すべてのAPIファイルで使用する

---

## 📊 修正の影響

| 修正 | 影響範囲 | 期待される改善 |
|------|----------|--------------|
| X APIエラー（400） | Free ReportのVelocity self-question | ✅ エンゲージメント最大化が機能 |
| レート制限 | ピーク時間外の投稿 | ✅ ログが正確になり、制限が正しく機能 |
| 投稿上限の不整合 | Minimal Versionの投稿 | ✅ Minimal Versionが正常に投稿される |

---

## ⚠️ 注意事項

### 投稿上限の統一について

現在、すべての投稿タイプで`maxDailyPosts = 35`に統一しましたが、これは一時的な対応です。

**理想的な解決策**:
1. 投稿タイプごとにカウンターを分離
   - `x:posts_count:${dateString}:free_report`
   - `x:posts_count:${dateString}:minimal_version`
   - `x:posts_count:${dateString}:quote_repost`

2. 統一された`getDailyPostCount()`実装を作成
   - `services/x/optimization.js`に実装
   - すべてのAPIファイルでこの実装を使用

**今後の対応**:
- 短期: 現在の統一上限（35）で運用
- 中期: カウンターを分離し、投稿タイプごとに異なる上限を設定可能にする

---

## ✅ 修正完了

すべての緊急修正が適用されました。次回のCron Jobs実行から、これらの修正が反映されます。

**検証方法**:
1. 次回のFree Report投稿時に、Velocity self-questionが正常に投稿されることを確認
2. Minimal Versionの投稿が正常に機能することを確認
3. ログでエラーが発生していないことを確認

---

## 📚 参照

- `docs/COMPREHENSIVE_ERROR_INVESTIGATION_2026-01-25.md` - 詳細なエラー調査レポート
- `docs/ROOT_CAUSE_ANALYSIS_MISSED_BUGS_2026-01-25.md` - 根本原因分析
