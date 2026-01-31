# CronJobs分析レポート
**作成日**: 2026-01-30  
**対象**: vercel.jsonの全CronJobs

## 📊 CronJobs総数

**合計: 14個**

### カテゴリ別内訳

1. **Trap Defence BTC配信（有料版・無料版）**: 1個
   - `/api/cron` - 15分ごと

2. **X投稿関連**: 10個
   - `/api/vsl1-post` - 1日3回（UTC 1時、13時、21時）
   - `/api/x-post-minimal-version-cron` - 1日5回（UTC 0時、7時、12時、15時、23時）
   - `/api/x-post-free-report` - 1日4回（UTC 4:30、10:30、17:30、19:30）
   - `/api/x-quote-repost-en` - 6分ごと（1時間に10回）
   - `/api/x-quote-repost-es` - 1時間に10回（1,7,13,19,25,31,37,43,49,55分）
   - `/api/x-quote-repost-pt-br` - 1時間に10回（2,8,14,20,26,32,38,44,50,56分）
   - `/api/x-quote-repost-ar` - 1時間に10回（3,9,15,21,27,33,39,45,51,57分）
   - `/api/x-quote-repost-ja` - 1時間に10回（4,10,16,22,28,34,40,46,52,58分）
   - `/api/x-quote-repost-ko` - 1時間に10回（5,11,17,23,29,35,41,47,53,59分）

3. **TG DM関連**: 3個
   - `/api/vsl2-free-users` - 1時間ごと
   - `/api/vsl1-reminder` - 12時間ごと（UTC 0時、12時）
   - `/api/vsl2-last-call` - 1時間ごと

4. **その他**: 1個
   - `/api/promo-stock-monitor` - 15分ごと

## 🔍 ムダな制御チェック

### 1. 引用リポストのスケジュール重複チェック

**問題**: `api/x-quote-repost.js`（旧KV方式）がCron設定から削除されているが、`functions`セクションには残っている

**現状**:
- ✅ Cron設定: コメントアウト済み（81行目）
- ⚠️ Functions設定: `api/x-quote-repost.js`が残っている（11-14行目）

**推奨**: `functions`セクションから`api/x-quote-repost.js`を削除（使用されていないため）

### 2. 引用リポストの時間帯制御の重複

**問題**: `api/x-quote-repost.js`のhandler関数内で`getLanguagesForCurrentHour`を使用して時間帯チェックを行っているが、各言語別APIは既にCronスケジュールで時間帯を制御している

**現状**:
- ✅ 各言語別API（`x-quote-repost-{lang}.js`）は直接`postQuoteRepostsForLang`を呼び出している
- ⚠️ `api/x-quote-repost.js`のhandler関数内で`getLanguagesForCurrentHour`を使用して時間帯チェック（1807-1833行目）

**分析**:
- `api/x-quote-repost.js`はCron設定から削除されているため、この時間帯チェックは使用されていない
- ただし、各言語別APIは`postQuoteRepostsForLang`を直接呼び出しているため、時間帯チェックは`postQuoteRepostsForLang`内で実行される

**推奨**: 
- `api/x-quote-repost.js`のhandler関数内の時間帯チェックは、各言語別APIが直接`postQuoteRepostsForLang`を呼び出すため、実際には使用されていない可能性がある
- ただし、`postQuoteRepostsForLang`内でも時間帯チェックが行われているため、二重チェックになっている可能性がある

### 3. 日次上限チェックの重複

**問題**: `api/x-quote-repost.js`のhandler関数内で日次上限チェックが行われているが、コメントで「日次上限を撤廃（Cronスケジュールで制御されているため不要）」と記載されている

**現状**:
- ✅ 日次上限チェックは削除されている（1839-1841行目）
- ✅ ログ出力のみ残っている（モニタリング用）

**結論**: 問題なし（日次上限チェックは削除済み）

### 4. 1時間あたりの投稿数制限チェック

**問題**: `api/x-quote-repost.js`のhandler関数内で1時間あたりの投稿数制限チェックが行われているが、各言語別APIは既にCronスケジュールで時間帯を制御している

**現状**:
- ✅ 1時間あたりの投稿数制限チェックが実装されている（1843-1871行目）
- ✅ これはX APIレート制限対策として必要

**結論**: 問題なし（X APIレート制限対策として必要）

### 5. ジッター（ランダム遅延）の重複

**問題**: `api/x-quote-repost.js`のhandler関数内でジッター（1-15分のランダム遅延）が実装されているが、各言語別APIは既にCronスケジュールで時間帯を制御している

**現状**:
- ⚠️ ジッターが実装されている（1657-1661行目）
- ⚠️ 各言語別APIは直接`postQuoteRepostsForLang`を呼び出しているため、このジッターは使用されていない

**推奨**: 
- `api/x-quote-repost.js`のhandler関数内のジッターは、Cron設定から削除されているため、実際には使用されていない
- ただし、`postQuoteRepostsForLang`内でもジッターが実装されているため、二重チェックになっている可能性がある

### 6. 引用リポストのスケジュール頻度

**問題**: 各言語別APIが6分ごと（EN）または1時間に10回（その他言語）実行されているが、実際の投稿数は`getLanguagesForCurrentHour`で制御されている

**現状**:
- ✅ EN: `*/6 * * * *` (6分ごと = 1時間に10回)
- ✅ ES: `1,7,13,19,25,31,37,43,49,55 * * * *` (1時間に10回)
- ✅ PT-BR: `2,8,14,20,26,32,38,44,50,56 * * * *` (1時間に10回)
- ✅ AR: `3,9,15,21,27,33,39,45,51,57 * * * *` (1時間に10回)
- ✅ JA: `4,10,16,22,28,34,40,46,52,58 * * * *` (1時間に10回)
- ✅ KO: `5,11,17,23,29,35,41,47,53,59 * * * *` (1時間に10回)

**分析**:
- 各言語別APIは1時間に10回実行される
- しかし、`getLanguagesForCurrentHour`で時間帯別に処理する言語が決定されるため、実際の投稿数は時間帯によって異なる
- 例: UTC 0時は`['ar', 'en']`のみ、UTC 1時は`['ko', 'en']`のみ

**推奨**: 
- Cronスケジュールは1時間に10回実行されるが、`getLanguagesForCurrentHour`で時間帯別に処理する言語が決定されるため、実際の投稿数は時間帯によって異なる
- これは意図的な設計（時間帯別の最適化）のため、問題なし

## 🚨 発見された問題

### 1. `api/x-quote-repost.js`のfunctions設定が残っている

**問題**: `api/x-quote-repost.js`がCron設定から削除されているが、`functions`セクションには残っている

**影響**: 
- 使用されていない関数設定が残っている
- デプロイサイズが増える可能性がある

**推奨**: `functions`セクションから`api/x-quote-repost.js`を削除

### 2. 時間帯チェックの二重実装

**問題**: `api/x-quote-repost.js`のhandler関数内で時間帯チェックが行われているが、各言語別APIは直接`postQuoteRepostsForLang`を呼び出しているため、この時間帯チェックは使用されていない

**影響**: 
- コードの複雑性が増す
- メンテナンスが困難になる

**推奨**: 
- `api/x-quote-repost.js`のhandler関数内の時間帯チェックは、Cron設定から削除されているため、実際には使用されていない
- ただし、`postQuoteRepostsForLang`内でも時間帯チェックが行われているため、二重チェックになっている可能性がある
- `postQuoteRepostsForLang`内の時間帯チェックは、各言語別APIから直接呼び出されるため、必要

## 📋 推奨事項

### 1. `api/x-quote-repost.js`のfunctions設定を削除

```json
// 削除推奨
"api/x-quote-repost.js": {
  "maxDuration": 120,
  "includeFiles": "{config/**,services/x/**}"
},
```

### 2. `api/x-quote-repost.js`のhandler関数内の時間帯チェックを確認

- 各言語別APIは直接`postQuoteRepostsForLang`を呼び出しているため、`api/x-quote-repost.js`のhandler関数内の時間帯チェックは使用されていない
- ただし、`postQuoteRepostsForLang`内でも時間帯チェックが行われているため、二重チェックになっている可能性がある
- `postQuoteRepostsForLang`内の時間帯チェックは、各言語別APIから直接呼び出されるため、必要

### 3. Cronスケジュールの最適化

- 現在のスケジュールは1時間に10回実行されるが、`getLanguagesForCurrentHour`で時間帯別に処理する言語が決定されるため、実際の投稿数は時間帯によって異なる
- これは意図的な設計（時間帯別の最適化）のため、問題なし

## 📊 実行頻度サマリー

| CronJob | 実行頻度 | 1日あたりの実行回数 |
|---------|---------|-------------------|
| /api/cron | 15分ごと | 96回 |
| /api/vsl1-post | 1日3回 | 3回 |
| /api/x-post-minimal-version-cron | 1日5回 | 5回 |
| /api/x-post-free-report | 1日4回 | 4回 |
| /api/x-quote-repost-en | 6分ごと | 240回 |
| /api/x-quote-repost-es | 1時間に10回 | 240回 |
| /api/x-quote-repost-pt-br | 1時間に10回 | 240回 |
| /api/x-quote-repost-ar | 1時間に10回 | 240回 |
| /api/x-quote-repost-ja | 1時間に10回 | 240回 |
| /api/x-quote-repost-ko | 1時間に10回 | 240回 |
| /api/vsl2-free-users | 1時間ごと | 24回 |
| /api/vsl1-reminder | 12時間ごと | 2回 |
| /api/vsl2-last-call | 1時間ごと | 24回 |
| /api/promo-stock-monitor | 15分ごと | 96回 |

**合計**: 1日あたり **1,484回** のCron実行

## ⚠️ 注意事項

1. **引用リポストの実際の投稿数**: 各言語別APIは1時間に10回実行されるが、`getLanguagesForCurrentHour`で時間帯別に処理する言語が決定されるため、実際の投稿数は時間帯によって異なる
2. **X APIレート制限**: 1時間あたりの投稿数制限（デフォルト: 100/時間）が実装されているため、実際の投稿数は制限される可能性がある
3. **時間帯別の最適化**: `getLanguagesForCurrentHour`で時間帯別に処理する言語が決定されるため、実際の投稿数は時間帯によって異なる
