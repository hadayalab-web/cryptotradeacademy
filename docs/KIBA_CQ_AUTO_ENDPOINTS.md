# KIBA CQ 自律エンドポイント取得

## 概要

KIBA を拡張可能にし、CQ（CryptoQuant）の**公式リファレンス一覧**からエンドポイントを自動取得して利用できるようにする。

- **reference.js**: リファレンスの読み取り（`listAllPaths()`）と取得（`fetchReference()`）を一元化済み。
- **autoFetchEndpoints.js**: `listAllPaths()` で得たパスに対し、デフォルトパラメータで API を叩き、成功分を `cqDeep.autoEndpoints` に格納。
- **kiba-5min**: 環境変数で自律取得の ON/OFF を切り替え。

## 有効化

```bash
# Vercel 環境変数
KIBA_CQ_AUTO_ENDPOINTS=true
```

有効時、kiba-5min の 1 回ごとに以下を実行する。

1. 既存どおり `getCQDeepMetrics("EN", { skipCache: true })` でコア指標を取得。
2. 追加で `fetchAllEndpointsFromReference()` を実行。
3. 取得成功分を `cqDeep.autoEndpoints` にマージ（キーは API パス例: `/v1/btc/network-data/supply`）。

## リファレンスの準備

自律取得は **reference のパス一覧**（`data/cryptoquant/cq-openapi-paths.json` 等）に依存する。

- リポジトリに `data/cryptoquant/cq-openapi-paths.json` をコミットしている場合はそのまま利用可能。
- 未コミット or 更新したい場合は、手動または Cron で以下を実行する。

```bash
# パス一覧のみ更新（Playwright なし・軽量）
SKIP_PLAYWRIGHT=1 node scripts/cq-fetch-reference.js
```

週 1 などで上記を回しておくと、新規エンドポイントも自動取得の対象になる。

## オプション環境変数

| 変数 | デフォルト | 説明 |
|------|------------|------|
| `KIBA_CQ_AUTO_ENDPOINTS` | 未設定 | `true` / `1` で自律取得を有効化 |
| `KIBA_CQ_AUTO_MAX_PER_RUN` | 80 | 1 回あたりの最大取得エンドポイント数 |
| `KIBA_CQ_AUTO_DELAY_MS` | 400 | リクエスト間隔（ms）。レート制限対策 |

## 取得ルール

- **対象パス**: `listAllPaths()` のうち、`/btc/`, `/eth/`, `/stablecoin/`, `/xrp/`, `/trx/`, `/alt/`, `/erc20/` で始まるもののみ。
- **パラメータ**: パスに応じて自動で付与（例: `/stablecoin/` → `token=USDT`、`funding-rates` → `window=8hour`）。共通で `exchange=all_exchange`, `window=day`, `limit=1` を使用。
- **403/404/400**: スキップし、成功した分だけ `autoEndpoints` に格納。

## 出力例

`cqDeep` の形は従来どおり（`netflow`, `mpi`, `whaleRatio`, `trapScore` 等）に加え、次のキーが付く。

```js
cqDeep.autoEndpoints = {
  "/v1/btc/network-data/supply": { value: 19500000, ... },
  "/v1/btc/exchange-flows/netflow": { netflow_total: -1575.64, ... },
  // ...
}
```

KIBA エンジン側で `cqDeep.autoEndpoints` を参照すれば、新規指標を追加実装しなくても拡張できる。
