# 実装品質ガイド（2026-01-25）

## 📋 概要

このドキュメントは、「デタラメ実装」を防ぐための実装品質基準と検証方法を説明します。

## 🎯 目的

1. **実装の正確性を保証**
2. **関数の引数順序・型の検証**
3. **定数の一貫性チェック**
4. **エラーハンドリングの検証**
5. **自動テストの実行**

## 🔍 実装前のチェックリスト

### 1. 関数の引数順序を確認

**重要**: 関数を呼び出す前に、必ず関数の定義を確認してください。

```javascript
// ❌ 間違った例（過去のバグ）
await replyToTweet(langMainTweetId, velocityReply.substring(0, 280));

// ✅ 正しい例
await replyToTweet(velocityReply.substring(0, 280), langMainTweetId);
```

**確認方法**:
```bash
# 関数の定義を確認
grep -n "function replyToTweet" services/x/client.js
```

### 2. 定数の一貫性を確認

**重要**: 同じ目的の定数は、すべてのファイルで同じ値を使用してください。

```javascript
// ❌ 間違った例（過去のバグ）
// api/x-post-free-report.js
const maxDailyPosts = 35;

// api/x-post-minimal-version.js
const maxDailyPosts = 25; // 不一致！

// ✅ 正しい例
// 両方のファイルで同じ値を使用
const maxDailyPosts = 35;
```

### 3. エラーハンドリングを確認

**重要**: 重要なエラー（API呼び出しなど）は`console.error`を使用してください。

```javascript
// ❌ 間違った例（過去のバグ）
} catch (error) {
  console.warn(`Failed to post velocity self-question:`, error.message);
}

// ✅ 正しい例
} catch (error) {
  console.error(`[X Post Free Report] ❌ CRITICAL: Failed to post velocity self-question:`, {
    error: error.message,
    stack: error.stack,
    tweetId: langMainTweetId,
    lang,
    timestamp: new Date().toISOString(),
  });
}
```

## 🔧 実装後の検証

### 1. 実装検証スクリプトを実行

```bash
# 実装の検証を実行
node scripts/validate_implementation.js
```

**検証項目**:
- ✅ 関数の引数順序
- ✅ 定数の一貫性
- ✅ エラーハンドリング

### 2. 重要な関数の統合テストを実行

```bash
# 重要な関数のテストを実行
node scripts/test_critical_functions.js
```

**テスト項目**:
- ✅ `replyToTweet`関数の引数順序
- ✅ 定数の一貫性

### 3. 手動テスト

実装後、必ず手動で動作確認してください：

```bash
# X投稿のテスト
node scripts/test-x-post.js

# Free Report投稿のテスト
# （実際のAPIを呼び出すため、注意が必要）
```

## 📊 実装品質基準

### 関数の引数順序

| 関数 | 正しい順序 | 間違った例 |
|------|-----------|----------|
| `replyToTweet` | `(text, inReplyToTweetId)` | `(inReplyToTweetId, text)` ❌ |
| `postTweet` | `(text, options)` | - |

### 定数の一貫性

| 定数 | 期待値 | ファイル |
|------|--------|---------|
| `maxDailyPosts` | 35 | `api/x-post-free-report.js`, `api/x-post-minimal-version.js` |
| `maxPostsPerHour` | 6 | `api/x-post-free-report.js` |

### エラーハンドリング

| エラーの種類 | ログレベル | 例 |
|------------|----------|---|
| API呼び出しエラー | `console.error` | `replyToTweet`, `postTweet` |
| レート制限 | `console.warn` | レート制限の警告 |
| 通常の警告 | `console.warn` | スキップされた投稿 |

## 🚨 過去の「デタラメ実装」の例

### 1. 引数順序エラー

**問題**: `replyToTweet`関数の引数順序が間違っていた

**影響**: X APIエラー（400）が発生し、Velocity self-questionが投稿されなかった

**修正**: 引数の順序を修正（`text`が先、`inReplyToTweetId`が後）

### 2. 定数の不整合

**問題**: `maxDailyPosts`がファイル間で不一致（35 vs 25）

**影響**: Minimal Versionの投稿が正常に機能しなかった

**修正**: すべてのファイルで35に統一

### 3. エラーハンドリングの不備

**問題**: 重要なエラーが`console.warn`で処理されていた

**影響**: エラーが「警告」として扱われ、見逃されやすかった

**修正**: `console.error`に変更し、詳細情報を追加

## 🔄 継続的な改善

### 1. 実装前の確認

- [ ] 関数の定義を確認したか？
- [ ] 引数の順序が正しいか？
- [ ] 定数の値が一貫しているか？
- [ ] エラーハンドリングが適切か？

### 2. 実装後の検証

- [ ] `validate_implementation.js`を実行したか？
- [ ] `test_critical_functions.js`を実行したか？
- [ ] 手動テストを実施したか？

### 3. コードレビュー

- [ ] 関数の引数順序を確認したか？
- [ ] 定数の一貫性を確認したか？
- [ ] エラーハンドリングを確認したか？

## 📚 参照ドキュメント

- `docs/CRITICAL_FIXES_SUMMARY_2026-01-25.md` - 緊急修正サマリー
- `docs/ROOT_CAUSE_ANALYSIS_MISSED_BUGS_2026-01-25.md` - 根本原因分析
- `scripts/validate_implementation.js` - 実装検証スクリプト
- `scripts/test_critical_functions.js` - 重要な関数のテスト

## ✅ チェックリスト

実装前に確認すべき項目：

- [ ] 関数の定義を確認したか？
- [ ] 引数の順序が正しいか？
- [ ] 定数の値が一貫しているか？
- [ ] エラーハンドリングが適切か？

実装後に確認すべき項目：

- [ ] `validate_implementation.js`を実行したか？
- [ ] `test_critical_functions.js`を実行したか？
- [ ] 手動テストを実施したか？

## 🎯 結論

**「デタラメ実装」を防ぐためには、実装前の確認と実装後の検証が重要です。**

このガイドに従って、実装の品質を保証しましょう。
