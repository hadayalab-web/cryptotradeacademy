# Trap Defence Phase 2 実装完了報告

**作成日**: 2026-02-13  
**ステータス**: Phase 2 実装完了

---

## 1. 実装サマリー

Phase 2「血液を通す」を完了した。btcSnapshot を中心とした統合 OS の完全ライブ化、Cron のリファクタ、Emergency 6 言語配信、CQ Pro 100% 受け皿の整備、BWE プロンプト拡張を実施した。

---

## 2. オープンクエスチョンへの正式回答（実装前提）

| # | 論点 | 結論 |
|---|------|------|
| 1 | Emergency のチャンネル | Regular と同じ `TELEGRAM_CHAT_ID_BTC_*` に送る。全言語で先頭に `[EMERGENCY]` を付与。 |
| 2 | STANDBY_BREAK / WATCH | mode は minimal / regular / emergency の 3 値のまま。`meta: { watch, standbyBreak }` を meta フラグとして追加。 |
| 3 | CQ Pro エンドポイント | 取得可能なものから順に cqDeep に追加。404 のものはスキップし、ログを残す。受け皿（スキーマ）を先に完成させる。 |

---

## 3. 実施した変更

### 3.1 deliveryModeEvaluator.js

| 変更 | 内容 |
|------|------|
| `computeMetaFlags(snapshot, lastSnapshot)` | 新規。WATCH（scoreChange≥30, mpi≤-20, kimchiPremium≥5%）と STANDBY_BREAK（24h 以上 standby 後、現在 active）を meta フラグとして計算。 |
| `evaluateDeliveryMode` 戻り値 | `{ mode, reason, meta: { watch, standbyBreak } }` を返すように拡張。 |

### 3.2 deepMetrics.js（CQ Pro 100% 受け皿）

| 変更 | 内容 |
|------|------|
| `getNUPL()` | 固定 0 返却から実取得に変更。複数エンドポイントを試行し、404 時は null。 |
| `getFundingRate()` | 新規。derivatives funding rate 取得。404 時は null。 |
| `getOpenInterest()` | 新規。OI 取得。404 時は null。 |
| `getMinerFlows()` | 新規。miner outflow 等。404 時は null。 |
| `getLiquidity()` | 新規。liquidity 指標。404 時は null。 |
| `fetchCQProCommonFields()` | 新規。sopr, sopr30d, nupl, funding, openInterest, minerFlows, liquidity を並列取得。 |
| `getCQDeepMetrics` | 全市場で上記フィールドを cqDeep に含める。404 は null で受け皿を用意。 |

### 3.3 utils/supabase.js

| 変更 | 内容 |
|------|------|
| `getLastBtcSnapshot()` | 既存。btc_snapshots から直近 1 件を取得し、`dbRowToBtcSnapshot` で btcSnapshot 形式に変換。 |

### 3.4 api/cron.js

| 変更 | 内容 |
|------|------|
| **writeEarlySnapshot** | Stage 1 完了後（market_score, trap 取得後）、isRegularSlot \|\| force 時に `btc:snapshot:early` へ書き込み。従来の earlyMinimalPayload → minimal:btc:latest を廃止。 |
| **getCQDeepMetrics 常時取得** | event-driven パス以外でも cqDeep が不足している場合にフォールバック取得。 |
| **buildFullSnapshot** | raw, cqDeep, xSentiment, trapDetection, trapAlert 等から btcSnapshot を構築。 |
| **writeFullSnapshot / persistSnapshotToDb** | isRegularSlot \|\| force 時に KV（btc:snapshot）と DB へ永続化。 |
| **evaluateDeliveryMode** | getLastBtcSnapshot 取得後、deliveryMode を評価。 |
| **配信 dispatch** | triggerType ベースから deliveryMode ベースに変更。deliveryMode === "regular" で REGULAR、deliveryMode === "emergency" で EMERGENCY。 |
| **早期 return** | deliveryMode === "minimal" かつ !isRegularSlot かつ !force の場合は送信ブロックをスキップ。 |
| **minimalPayload 廃止** | minimal:btc:latest への書き込みを廃止。btc:snapshot のみ使用。 |

### 3.5 api/minimal-tg-delivery.js

| 変更 | 内容 |
|------|------|
| **KV 読み取り順** | `btc:snapshot:early` → `btc:snapshot` → `minimal:btc:latest`（移行期フォールバック）。 |
| **mapSnapshotToMinimalPayload** | btcSnapshot を formatMinimalBriefing 用のレガシー shape に変換するアダプタ。 |

### 3.6 Emergency 6 言語配信

| 変更 | 内容 |
|------|------|
| 送信先 | Regular と同じ `TELEGRAM_CHAT_ID_BTC_*`（EN, ES, AR, PT_BR, KO, JA）。 |
| プレフィックス | 全言語でメッセージ先頭に `[EMERGENCY]` を付与。 |
| ループ | 各言語の formatTrapAlert を呼び、sendMessageToChannel(alertText, "BTC", marketCode) で送信。 |

### 3.7 services/ai/gpt5mini.js（BWE プロンプト拡張）

| 変更 | 内容 |
|------|------|
| marketStateNote | trapScore, market_score, priceUsd, change24h に加え、whaleRatio、sentimentLabel、regimeLabel を追加。 |
| regimeLabel | change24h > 5 → "high_volatility"、whaleRatio > 0.85 → "whale_driven"、retailFomo > 70 → "retail_fomo"、それ以外 → "neutral"。 |

---

## 4. データフロー（Phase 2 後）

```
認証 → スロット判定
  → [1] CQ basic, Price, FNG → raw
  → ctx, coreDecision, trap
  → writeEarlySnapshot(kv, raw, snapshot.market_score, trap)  [btc:snapshot:early]
  
  → [2] getCQDeepMetrics（常時取得、フォールバック含む）→ cqDeep
  → Grok / GPT（needsXIntel / needsLongReport）
  → trapDetection, trapAlert 等
  
  → buildFullSnapshot({ raw, cqDeep, ... })
  → lastSnapshot = getLastBtcSnapshot()
  → writeFullSnapshot(kv, btcSnapshot)
  → persistSnapshotToDb(btcSnapshot)
  → deliveryResult = evaluateDeliveryMode(btcSnapshot, { isRegularSlot, force, lastSnapshot })
  
  → deliveryMode で dispatch:
     - emergency: formatTrapAlert × 6 言語、[EMERGENCY] 付与 → TELEGRAM_CHAT_ID_BTC_*
     - regular: formatRegularBriefing × 6 言語 → TELEGRAM_CHAT_ID_BTC_*
     - minimal:  early return（minimal-tg-delivery が btc:snapshot を読む）
```

---

## 5. 環境変数・依存

| 項目 | 用途 |
|------|------|
| CRON_SECRET | cron / minimal-tg-delivery 認証 |
| KV_REST_API_* | btc:snapshot, btc:snapshot:early の保存 |
| SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL | getLastBtcSnapshot, persistSnapshotToDb |
| CRYPTOQUANT_API_KEY | CQ Pro メトリクス取得 |
| TELEGRAM_BOT_TOKEN | Telegram 配信 |
| TELEGRAM_CHAT_ID_BTC_EN / ES / AR / PT_BR / KO / JA | Regular / Emergency の言語別チャンネル |
| btc_snapshots テーブル | docs/supabase-btc-snapshots.sql で作成 |

---

## 6. 検証方法

### 6.1 単体

- `logic/deliveryModeEvaluator.js`: `evaluateDeliveryMode` にダミー snapshot / lastSnapshot を渡し、期待する mode と meta が返ることを確認。
- `services/cryptoquant/deepMetrics.js`: `getCQDeepMetrics` 実行で cqDeep に sopr, sopr30d, nupl, funding, openInterest, minerFlows, liquidity が含まれることを確認（404 のものは null）。

### 6.2 統合

- cron 実行（isRegularSlot または force）: btc:snapshot:early と btc:snapshot が KV に書き込まれ、btc_snapshots に 1 行 insert されること。
- minimal-tg-delivery 実行: btc:snapshot または btc:snapshot:early を読み、6 言語で Minimal 配信されること。
- Emergency 発火条件（trapScore≥60 等）成立時: 6 言語で [EMERGENCY] 付きメッセージが TELEGRAM_CHAT_ID_BTC_* に送信されること。

---

## 7. 今後の検討事項

| 項目 | 内容 |
|------|------|
| **meta フラグのテンプレート反映** | deliveryMeta.standbyBreak / deliveryMeta.watch を formatRegularBriefing / formatMinimalBriefing に渡し、文言を調整する。 |
| **sosovalueArticle の btcSnapshot 組み込み** | REGULAR ブロック内で生成される sosovalueArticle を btcSnapshot に反映するタイミングの調整。 |
| **eventTriggers との統合** | ENABLE_EVENT_DRIVEN 時の evaluateTrigger と evaluateDeliveryMode の併存・統合方針の整理。 |
| **CQ Pro エンドポイント追加** | CryptoQuant で利用可能になったエンドポイントを順次 deepMetrics に追加。 |

---

## 8. 変更ファイル一覧

| ファイル | 種別 |
|----------|------|
| `logic/deliveryModeEvaluator.js` | 拡張 |
| `services/cryptoquant/deepMetrics.js` | 拡張 |
| `api/cron.js` | リファクタ |
| `api/minimal-tg-delivery.js` | 変更 |
| `services/ai/gpt5mini.js` | 拡張 |
