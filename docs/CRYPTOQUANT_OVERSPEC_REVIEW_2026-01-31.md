# CryptoQuant API オーバースペック検討（2026-01-31）

Vercel Pro 運用下で、`getCQDeepMetrics` と `getHighResolutionCQData` の設計が過剰でないか検討し、重複呼び出しの削減と負荷軽減を行った。

## 検討結果サマリ

| 項目 | 変更前 | 変更後 |
|------|--------|--------|
| 同一エンドポイントの重複 | deep と highRes で netflow/mpi/whale をそれぞれ取得（計6呼び出し） | highRes を先に1回取得し、deep で再利用（計3呼び出し） |
| 取得順序 | 並列（Promise.allSettled） | 直列（highRes → deep with reuse） |
| Professional 時の limit | 24ポイント（day） | 7ポイント（1週間分でトレンド/加速度に十分） |

## 問題点（オーバースペックだった点）

1. **重複API呼び出し**
   - `getCQDeepMetrics(market)`:
     - `/btc/exchange-flows/netflow` (day, limit 1)
     - `/btc/flow-indicator/mpi` (day, limit 1)
     - EN 時: `/btc/flow-indicator/exchange-whale-ratio` (day, limit 1)
   - `getHighResolutionCQData()`:
     - 上記3エンドポイントを limit 24 で再取得
   - 結果: 同じ3エンドポイントを「limit 1」と「limit 24」で2回ずつ呼んでいた。

2. **Professional プランでの limit**
   - 時間窓は `['day']` のみ（hour/4hour は利用不可）。
   - トレンド・加速度算出に 24 ポイントは過剰。7 日分で十分。

## 実施した変更

### 1. `services/cryptoquant/deepMetrics.js`

- **`options.highResCQ`** を追加。渡された場合:
  - `netflow.timeframes.day.current` → exchangeInflow / netflow
  - `mpi.timeframes.day.current` → minerMPI
  - EN 時: `whaleRatio.current` から trapScore を算出し、`getWhaleFlows` をスキップ
- 内部ヘルパー `deriveBaseFromHighRes(highResCQ)` で highRes から基本値を導出。

### 2. `api/cron.js`（Phase 2: イベント駆動パス）

- **取得順序**: 先に `getHighResolutionCQData()` を実行し、その結果を `getCQDeepMetrics(market, { highResCQ: highResResult, ... })` に渡す。
- highRes 失敗時は従来どおり `getCQDeepMetrics(market, priceOptions)` のみでフォールバック。

### 3. `services/cryptoquant/highResolution.js`

- **デフォルト limit**: `CRYPTOQUANT_PLAN` が premium/enterprise でない場合は `limit = 7`（Professional 時は 7 日分）。
- 呼び出し元で `limit` を指定しない場合にこのデフォルトが使われる。

## 影響範囲

- **cron（定期枠）**: CQ の API 呼び出しが約半分に削減。レスポンス時間短縮が期待できる。
- **prepare.js / x-post-free-report.js 等**: `getCQDeepMetrics` を highResCQ なしで呼んでいるため従来どおり（変更なし）。
- **REGULAR 配信パス（イベント駆動オフ）**: 従来どおり `getCQDeepMetrics(firstLangMarket)` のみ呼び出し（highRes は使わない）。

## 参照

- `services/cryptoquant/deepMetrics.js` - JSDoc `options.highResCQ`
- `services/cryptoquant/highResolution.js` - DEFAULT_WINDOWS, defaultLimit
- `api/cron.js` - Phase 2 深掘りデータ取得ブロック
