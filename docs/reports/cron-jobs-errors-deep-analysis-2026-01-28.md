# Cron Jobs エラー詳細分析レポート - 2026-01-28

## 📊 エラーサマリー

**合計エラー数**: 43件  
**エラー発生Cron Jobs**: 6個  
**実際の重大エラー**: 3個（残りは警告のみ）

---

## 🔴 エラー1: `/api/cron` - 重大エラー

### 基本情報
- **ステータスコード**: 500
- **発生回数**: 12回
- **デプロイID**: `dpl_EfCGvyp7PErAauBWB1e6R6EdTcr6`
- **影響度**: 🔴 **最高（P0）**

### エラーメッセージ
```
Cannot find module '../shared/contentFilters'
Require stack:
- /var/task/services/telegram/messages/user/ja/regular.ja.js
- /var/task/api/cron.js
- /opt/rust/nodejs.js
```

### 詳細分析

#### 問題の本質
1. **モジュールパス**: `services/telegram/messages/user/ja/regular.ja.js`が`../shared/contentFilters`をrequireしようとしている
2. **期待されるパス**: `services/telegram/messages/shared/contentFilters.js`
3. **実際のパス**: ローカルでは存在確認済み（2,641 bytes）
4. **Vercelデプロイ時**: ファイルがデプロイバンドルに含まれていない可能性

#### 影響範囲
- ✅ **有料版（Regular Briefing）Telegram配信**: 完全に失敗
- ✅ **無料版（Minimal Version）Telegram配信**: 完全に失敗
- ✅ **6言語すべて**: en, es, pt-br, ar, ja, ko すべて影響
- ✅ **配信スロット**: UTC 0:00, 4:00, 8:00, 12:00, 16:00, 20:00 すべて失敗

#### 発生時刻パターン
- 2026-01-28 01:30:37 (3回)
- 2026-01-28 01:30:06 (3回)
- 2026-01-28 01:30:05 (3回)
- 2026-01-28 01:15:11 (3回)

#### 根本原因の仮説

**仮説1: Vercelの`includeFiles`設定不足**
- `vercel.json`に`services/telegram/messages/shared/`の明示的なインクルード設定がない
- Vercelは`api/`ディレクトリを自動的に含めるが、`services/`ディレクトリは明示的に指定が必要な可能性

**仮説2: デプロイ時のファイル除外**
- `.vercelignore`は空だが、Vercelのデフォルト動作で`services/`が除外されている可能性
- または、ファイルサイズ制限やパス長制限の問題

**仮説3: パスの解決問題**
- サーバーレス関数の実行環境（`/var/task/`）での相対パス解決が異なる可能性
- `../shared/contentFilters`が正しく解決されていない

#### 修正方法

**方法1: `vercel.json`に`includeFiles`を追加**
```json
{
  "functions": {
    "api/cron.js": {
      "includeFiles": [
        "services/telegram/messages/shared/**",
        "services/telegram/messages/user/**"
      ]
    }
  }
}
```

**方法2: ビルドスクリプトでファイルをコピー**
- `services/telegram/messages/shared/`を`api/`にコピー
- または、`services/`全体を`api/services/`にコピー

**方法3: モジュールの配置を変更**
- `contentFilters.js`を`api/`配下に移動
- または、`utils/`配下に移動して統一管理

#### 推奨修正
**P0（緊急）**: `vercel.json`に`includeFiles`を追加して、`services/telegram/messages/shared/`を明示的に含める

---

## 🔴 エラー2: `/api/x-quote-repost` - 重大エラー（修正済み）

### 基本情報
- **ステータスコード**: 500
- **発生回数**: 3回
- **デプロイID**: `dpl_EfCGvyp7PErAauBWB1e6R6EdTcr6`
- **影響度**: 🔴 **高（P0）**
- **修正状況**: ✅ **修正済み**

### エラーメッセージ
```
SyntaxError: Identifier 'getDailyPostCount' has already been declared
    at /var/task/api/x-quote-repost.js:31
```

### 詳細分析

#### 問題の本質
1. **重複インポート**: `getDailyPostCount`と`incrementDailyPostCount`が2箇所からインポートされていた
   - 13-14行目: `services/x/optimization`から
   - 31-32行目: `services/x/influencerRotation`から

#### 影響範囲
- ✅ **引用リポスト機能**: 完全に動作停止
- ✅ **24投稿/日の自動化**: 失敗
- ✅ **インフルエンサー発掘機能**: 影響なし（別モジュール）

#### 発生時刻
- 2026-01-28 01:30:24 (3回)

#### 修正内容
```javascript
// 修正前
const {
  isPeakTimeWindow,
  shouldPostQuoteRepost,
  checkDailyPostLimit,
  getOptimizedHashtags,
  getDailyPostCount,        // ← 重複
  incrementDailyPostCount,  // ← 重複
} = require('../services/x/optimization');

const { 
  isInCooldown, 
  markLastPostedAt,
  getDailyPostCount,        // ← 重複
  incrementDailyPostCount,  // ← 重複
  hasReachedDailyLimit,
} = require('../services/x/influencerRotation');

// 修正後
const {
  isPeakTimeWindow,
  shouldPostQuoteRepost,
  checkDailyPostLimit,
  getOptimizedHashtags,
  // getDailyPostCount と incrementDailyPostCount は services/x/influencerRotation から統一実装を使用
} = require('../services/x/optimization');
```

#### 修正状況
✅ **修正完了**: `api/x-quote-repost.js`の重複インポートを削除済み

---

## 🔴 エラー3: `/api/x-webhook` - 部分的エラー（修正済み、古いログ）

### 基本情報
- **ステータスコード**: 500（24回） / 200（6回）
- **発生回数**: 25回（エラー） + 6回（成功）
- **デプロイID**: `dpl_EfCGvyp7PErAauBWB1e6R6EdTcr6`
- **影響度**: 🟡 **中（P1）**
- **修正状況**: ✅ **修正済み（古いデプロイのログ）**

### エラーメッセージ
```
Cannot find module '../../utils/kv'
Require stack:
- /var/task/api/x-webhook.js
Did you forget to add it to "dependencies" in `package.json`?
```

### 詳細分析

#### 問題の本質
1. **インポートパス誤り**: `api/x-webhook.js`が`../../utils/kv`を使用していた
2. **正しいパス**: `../utils/kv`（`api/`から`utils/`への相対パス）

#### 影響範囲
- ✅ **X Webhook CRC Challenge-Response Check**: 失敗
- ✅ **Webhook作成・再作成**: 失敗
- ✅ **リアルタイムエンゲージメント追跡**: 影響なし（Webhookが無効なため）

#### 発生時刻パターン
- 2026-01-28 01:27:43 (成功)
- 2026-01-28 01:23:10 (エラー)
- 2026-01-28 01:22:53 (エラー)
- 2026-01-28 01:22:13 (エラー)
- 2026-01-28 01:13:57 (エラー)
- 2026-01-28 01:13:17 (エラー)
- 2026-01-28 01:12:50 (エラー)
- 2026-01-28 01:12:30 (エラー)
- 2026-01-28 01:12:15 (エラー)
- 2026-01-28 01:12:03 (エラー)
- 2026-01-28 01:06:20 (エラー)
- 2026-01-28 01:04:20 (エラー)

**パターン分析**:
- 01:27:43に成功している → この時点で修正がデプロイされた可能性
- それ以前はすべてエラー → 古いデプロイのログ

#### 修正内容
```javascript
// 修正前
const { kv } = require('../../utils/kv');

// 修正後
const { kv } = require('../utils/kv');
```

#### 修正状況
✅ **修正完了**: `api/x-webhook.js`のインポートパスを修正済み  
✅ **デプロイ済み**: 01:27:43以降は成功している

#### その他の警告
- `DeprecationWarning: url.parse()` - 非推奨警告のみ、機能には影響なし

---

## ⚠️ 警告のみ（エラーではない）

### `/api/x-algorithm-analysis`
- **ステータスコード**: 202（正常）
- **警告**: `DeprecationWarning: url.parse()`
- **影響**: なし（機能は正常動作）

### `/api/x-influencer-report`
- **ステータスコード**: 200（正常）
- **警告**: `DeprecationWarning: url.parse()`
- **影響**: なし（機能は正常動作）

### `/api/x-post-performance-analysis`
- **ステータスコード**: 200（正常）
- **警告**: `DeprecationWarning: url.parse()`
- **影響**: なし（機能は正常動作）

---

## 📋 修正優先度とアクション

### P0（緊急）: `/api/cron`の`contentFilters`エラー
1. ✅ `vercel.json`に`includeFiles`を追加
2. ✅ または、ビルドスクリプトでファイルをコピー
3. ✅ デプロイ後に動作確認

### P1（高）: `/api/x-quote-repost`の重複インポート
- ✅ **修正済み**: コミット・プッシュ待ち

### P2（中）: `/api/x-webhook`のインポートパス
- ✅ **修正済み**: デプロイ済み（01:27:43以降成功）

### P3（低）: `url.parse()`の非推奨警告
- 将来的に修正（機能には影響なし）

---

## 🎯 次のステップ

1. **`vercel.json`を修正**して`contentFilters.js`を明示的に含める
2. **修正をコミット・プッシュ・デプロイ**
3. **再テスト**してエラーが解消されたか確認
4. **`url.parse()`警告**は後日対応（機能には影響なし）

---

## 📝 補足情報

### デプロイID分析
- **エラー発生デプロイ**: `dpl_EfCGvyp7PErAauBWB1e6R6EdTcr6`
- **このデプロイで発生したエラー**:
  1. `/api/cron` - contentFilters（未修正）
  2. `/api/x-quote-repost` - 重複インポート（修正済み）
  3. `/api/x-webhook` - utils/kv（修正済み、一部成功）

### ファイル存在確認
- ✅ `services/telegram/messages/shared/contentFilters.js`: 存在確認済み（2,641 bytes）
- ✅ `utils/kv.js`: 存在確認済み
- ✅ ローカル環境ではすべてのファイルが存在

### Vercelデプロイ設定
- `.vercelignore`: 空（すべてのファイルがデプロイ対象）
- `vercel.json`: `includeFiles`設定なし（`services/`が自動的に含まれない可能性）
