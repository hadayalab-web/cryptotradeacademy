# CryptoQuant API エンドポイント使用状況まとめ

**作成日**: 2026-01-25  
**目的**: CryptoQuantのどのエンドポイントでどんな情報を取得しているかの完全なリスト

---

## 📊 基本エンドポイント（全市場共通）

### 1. Exchange Netflow（取引所ネットフロー）
**エンドポイント**: `/btc/exchange-flows/netflow`  
**パラメータ**:
- `exchange`: `all_exchange`（全取引所）
- `window`: `day`（1日）
- `limit`: `1`（最新1件）

**取得情報**:
- `netflow_total` / `netflow` / `value`: 取引所へのネットフロー（BTC単位）
- 正の値 = 流入（売却圧力の可能性）
- 負の値 = 流出（ホルダーが資産を保持中）

**使用箇所**:
- `services/cryptoquant/endpoints/btc.js` - `getExchangeInflow()`
- `services/cryptoquant/highResolution.js` - `getExchangeNetflowMultiTimeframe()`（複数時間窓対応）

---

### 2. Miners' Position Index (MPI)
**エンドポイント**: `/btc/flow-indicator/mpi`  
**パラメータ**:
- `window`: `day`（1日）
- `limit`: `1`（最新1件）または `24`（高解像度データ用）

**取得情報**:
- `mpi` / `value`: マイナーのポジションインデックス
- `> 2.0`: マイナーが売却中（注意が必要）
- `< 0.5`: マイナーが保持中（ポジティブシグナル）
- `0.5 - 2.0`: 正常範囲

**使用箇所**:
- `services/cryptoquant/endpoints/btc.js` - `getMinerPositionIndex()`
- `services/cryptoquant/highResolution.js` - `getMPIMultiTimeframe()`（複数時間窓対応）

---

## 🐋 EN市場専用エンドポイント

### 3. Exchange Whale Ratio（クジラ比率）
**エンドポイント**: `/btc/flow-indicator/exchange-whale-ratio`  
**パラメータ**:
- `exchange`: `all_exchange`
- `window`: `day`
- `limit`: `1`（基本）または `24`（高解像度）

**取得情報**:
- `exchange_whale_ratio` / `value` / `whale_ratio`: トップ10のインフロー / 全体のインフロー（0-1の範囲）
- `> 0.85` (85%): 高圧力（強い売り圧力）
- `> 0.75` (75%): 中程度の圧力
- `< 0.75`: 正常範囲

**用途**:
- Trap Score計算（EN市場）
- Whale Flowsデータとして返却

**使用箇所**:
- `services/cryptoquant/deepMetrics.js` - `getWhaleFlows()`
- `services/cryptoquant/highResolution.js` - `getHighResolutionCQData()`内

---

### 4. Liquidations Long/Short（削除済み）
**エンドポイント**: `/derivatives/liquidations-long/btc`, `/derivatives/liquidations-short/btc`  
**ステータス**: ❌ **CryptoQuant APIで提供されていない（404エラー）**

**対応**: 
- `getLiquidations()`関数は常に0を返すように変更済み
- API呼び出しを削除し、コストとレート枠の無駄を排除
- `trapScore`計算ではLiquidationsによるスコア加算は行われない

**削除日**: 2026-01-25

---

## 🇰🇷 KO市場専用エンドポイント

### 6. Exchange Inflow（Upbit）
**エンドポイント**: `/btc/exchange-flows/inflow`  
**パラメータ**:
- `exchange`: `upbit`
- `window`: `day`
- `limit`: `1`

**取得情報**:
- `value` / `inflow_total` / `inflow`: Upbitへの流入量（BTC）

**用途**: Kimchi Premium計算

**使用箇所**:
- `services/cryptoquant/deepMetrics.js` - `getUpbitInflow()`

---

### 7. Exchange Inflow（Binance）
**エンドポイント**: `/btc/exchange-flows/inflow`  
**パラメータ**:
- `exchange`: `binance`
- `window`: `day`
- `limit`: `1`

**取得情報**:
- `value` / `inflow_total` / `inflow`: Binanceへの流入量（BTC）

**用途**: Kimchi Premium計算（参考値）

**使用箇所**:
- `services/cryptoquant/deepMetrics.js` - `getBinanceInflow()`

---

## 🇯🇵 JA市場専用エンドポイント

### 8. NUPL（削除済み）
**エンドポイント**: `/utxo-data/nupl/btc`  
**ステータス**: ❌ **CryptoQuant APIで提供されていない（404エラー）**

**対応**: 
- `getNUPL()`関数は常に0を返すように変更済み
- API呼び出しを削除し、コストとレート枠の無駄を排除
- `riskReward`計算ではNUPLによる加算は行われない（SOPRのみで計算）

**削除日**: 2026-01-25

---

### 9. SOPR（Spent Output Profit Ratio）
**エンドポイント**: `/btc/market-indicator/sopr`  
**パラメータ**:
- `window`: `day`
- `limit`: `1`（現在値）または `30`（30日移動平均）

**取得情報**:
- `value` / `sopr`: 使用済みアウトプットの利益率
- `> 1.0`: 利益で売却されている
- `< 1.0`: 損失で売却されている

**用途**: Risk/Reward計算（30日移動平均）

**使用箇所**:
- `services/cryptoquant/deepMetrics.js` - `getSOPR()` / `getSOPR30d()`

---

## 📈 高解像度データ（複数時間窓対応）

### Professionalプラン制限
- **利用可能な時間窓**: `day`のみ
- **制限**: API解像度が「1日まで」

### Premiumプラン以上
- **利用可能な時間窓**: `hour`, `4hour`, `day`
- **環境変数**: `CRYPTOQUANT_PLAN=premium`で有効化

### 高解像度データで取得される指標
1. **Exchange Netflow**（複数時間窓）
2. **MPI**（複数時間窓）
3. **Whale Ratio**（`day`のみ）
4. ~~**Liquidations**~~（削除済み - CryptoQuant APIで提供されていない）

### 追加分析
- **トレンド分析**: 線形回帰による傾き計算
- **加速度**: 変化率の変化率
- **異常検知**: Zスコアベース
- **整合性チェック**: 複数時間窓での方向性の一致確認

**使用箇所**:
- `services/cryptoquant/highResolution.js` - `getHighResolutionCQData()`

---

## 🔧 機能フラグ制御（削除済み）

**注意**: 以前は404エンドポイント（Liquidations、NUPL）を`capabilities.js`でチェックしていましたが、
これらのエンドポイントはCryptoQuant APIで提供されていないため、2026-01-25に削除しました。

**削除されたエンドポイント**:
- `/derivatives/liquidations-long/btc`
- `/derivatives/liquidations-short/btc`
- `/utxo-data/nupl/btc`

**対応**: API呼び出しを削除し、常に0を返すように変更。コストとレート枠の無駄を排除。

---

## 📦 データ取得の統合関数

### `getCQSnapshot()`（推奨）
**ファイル**: `services/cryptoquant/snapshot.js`

**機能**:
- 基本データ（Exchange Netflow, MPI）を一度だけ取得
- 深掘りデータ（`getCQDeepMetrics()`）と高解像度データ（`getHighResolutionCQData()`）を並列取得
- 重複取得を排除

**使用箇所**:
- `api/cron.js` - メインのデータ取得

---

## 🎯 市場別データ取得

### EN市場
- Exchange Netflow
- MPI
- **Whale Ratio**（Exchange Whale Ratio）
- ~~**Liquidations**~~（削除済み - CryptoQuant APIで提供されていない）
- **Trap Score**（計算値、Whale Ratioのみで計算）

### KO市場
- Exchange Netflow
- MPI
- **Upbit Inflow**
- **Binance Inflow**
- **Kimchi Premium**（計算値）

### JA市場
- Exchange Netflow
- MPI
- ~~**NUPL**~~（削除済み - CryptoQuant APIで提供されていない）
- **SOPR** / **SOPR 30d**
- **Risk/Reward**（計算値、SOPRのみで計算）

### AR/ES/PT-BR市場
- Exchange Netflow
- MPI
- （基本データのみ）

---

## ⚙️ レート制限とキャッシュ

### レート制限
- **Professionalプラン**: 20リクエスト/分
- **制御方法**: `services/cryptoquant/rateLimiter.js`でキュー + トークンバケット

### キャッシュ
- **Vercel KV**: stale-while-revalidate方式
- **TTL**: エンドポイントごとに設定（通常5-15分）
- **EMERGENCY判定指標**: `skipCache`オプションでキャッシュバイパス可能

---

## 📝 まとめ

**使用エンドポイント総数**: 6種類（404エンドポイント3つを削除）

1. `/btc/exchange-flows/netflow` - Exchange Netflow（基本）
2. `/btc/flow-indicator/mpi` - MPI（基本）
3. `/btc/flow-indicator/exchange-whale-ratio` - Whale Ratio（EN市場）
4. `/btc/exchange-flows/inflow` (exchange=upbit) - Upbit Inflow（KO市場）
5. `/btc/exchange-flows/inflow` (exchange=binance) - Binance Inflow（KO市場）
6. `/btc/market-indicator/sopr` - SOPR（JA市場）

**削除されたエンドポイント**（2026-01-25）:
- `/derivatives/liquidations-long/btc` - Liquidations Long（404エラー）
- `/derivatives/liquidations-short/btc` - Liquidations Short（404エラー）
- `/utxo-data/nupl/btc` - NUPL（404エラー）

**高解像度データ**: 複数時間窓対応（Professionalプランは`day`のみ）

**最適化**: 404エンドポイントへのAPI呼び出しを削除し、コストとレート枠の無駄を排除
