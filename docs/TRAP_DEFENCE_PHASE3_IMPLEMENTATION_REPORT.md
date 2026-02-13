# Trap Defence Phase 3 実装完了報告

**作成日**: 2026-02-13  
**ステータス**: Phase 3 一部完了（タスク 1–7 完了、8–13 は未着手）

---

## 1. 実装サマリー

Phase 3「snapshot-native intelligence OS」の前半を完了した。btcSnapshot スキーマ拡張、computeDivergenceSignal / computeMarketRegime の新規実装、trapDetection 強化、formatMinimalBriefing / formatTrapAlertFromSnapshot の snapshot-native 化（6 言語）、minimal-tg-delivery の直接呼び出し、cron Emergency の formatTrapAlertFromSnapshot 統合を実施した。Q1–Q5 の正式採用方針に基づき進捗した。

---

## 2. 正式採用方針（Q1–Q5）の反映状況

| # | 方針 | 実装反映 |
|---|------|----------|
| Q1 | Dr.Grok: snapshot に base のみ、言語別は cron 言語ループ内で注入 | Stage 6 snapshotBuilder 統合時に適用予定 |
| Q2 | Email: Phase 3 ではアダプタ対応、snapshot-native は Phase 4 | 未変更（現状維持） |
| Q3 | scripts: Phase 3 完了後にモック snapshot で一括更新 | 未着手 |
| Q4 | computeDivergenceSignal は高レベル要約、既存 divergenceDetector は trapDetection 内で継続 | 両方とも実装済み |
| Q5 | EN を基準に他 5 言語を一気に揃える | formatMinimalBriefing / formatTrapAlertFromSnapshot で実施済み |

---

## 3. 実施した変更

### 3.1 btcSnapshot スキーマ拡張

| 変更 | 内容 |
|------|------|
| `services/snapshot/btcSnapshotSchema.js` | `meta`, `marketRegime` を buildFullSnapshot に追加。snapshotToDbRow に `market_regime` 対応。 |
| `utils/supabase.js` | snapshotToDbRow / dbRowToBtcSnapshot に meta, market_regime の入出力を追加。 |
| `docs/supabase-btc-snapshots-phase3.sql` | meta, market_regime カラム用の migration を追加。 |

### 3.2 新規ロジック

| ファイル | 内容 |
|----------|------|
| `logic/divergence/computeDivergenceSignal.js` | **新規**。whaleRatio, funding, OI, liquidity, sentiment flip, volatility を入力に `{ divergenceLevel, reasons, confidence }` を返す高レベル要約。 |
| `logic/regime/computeMarketRegime.js` | **新規**。whale-driven, retail-fomo, high-volatility, low-volatility, liquidity-vacuum, miner-capitulation, neutral を判定。 |

### 3.3 trapDetection 強化

| 変更 | 内容 |
|------|------|
| `logic/core/trapDetector.js` | cqDeep を受け取り、whaleRatio, minerFlows, SOPR, NUPL, liquidity, funding からスコア補正と `reasons` 配列を追加。 |

### 3.4 formatMinimalBriefing(snapshot, lang) — 6 言語

| ファイル | 内容 |
|----------|------|
| `services/telegram/messages/user/*/minimal-high-quality.*.js` | en, es, pt-br, ar, ja, ko に `formatMinimalBriefing(snapshotOrPayload, lang)` を追加。btcSnapshot とレガシーペイロードの両対応。`meta.watch` 時の WATCH 文言を各言語で表示。 |

### 3.5 formatTrapAlertFromSnapshot(snapshot, lang) — 6 言語

| ファイル | 内容 |
|----------|------|
| `services/telegram/messages/user/*/emergency.*.js` | en, es, pt-br, ar, ja, ko に `formatTrapAlertFromSnapshot(snapshotOrPayload, lang)` を追加。snapshot から inflow, mpi, priceUsd, trap, aiAnalysis をマッピングし既存 formatTrapAlert を呼び出し。 |

### 3.6 api/minimal-tg-delivery.js

| 変更 | 内容 |
|------|------|
| mapSnapshotToMinimalPayload | 廃止。btcSnapshot をそのまま formatMinimalBriefing(payload, targetLang) に渡す。 |
| loadMinimalFormatter | formatMinimalBriefing を優先して返す。 |

### 3.7 api/cron.js

| 変更 | 内容 |
|------|------|
| loadUserTemplates | formatTrapAlertFromSnapshot を返却。 |
| Emergency ブロック | formatTrapAlertFromSnapshot(snapshotForAlert, targetLang) を優先。snapshotForAlert に aiAnalysis, drGrok.base, trap.label/note/hint をマージして渡す。 |

---

## 4. データフロー（Phase 3 現状）

```
認証 → スロット判定
  → [1] CQ basic, Price, FNG → raw
  → ctx, coreDecision, trap
  → writeEarlySnapshot(kv, raw, ...)  [btc:snapshot:early]

  → [2] getCQDeepMetrics → cqDeep
  → Grok / GPT
  → trapDetection (cqDeep 対応)
  → buildFullSnapshot({ raw, cqDeep, meta, marketRegime, ... })
  → writeFullSnapshot / persistSnapshotToDb

  → deliveryMode で dispatch:
     - emergency: formatTrapAlertFromSnapshot(snapshotForAlert, targetLang) × 6 言語
     - regular: formatRegularBriefing(snapshotOrPayload, lang, opts) — snapshot-native 対応済み（後方互換あり）
     - minimal: early return（minimal-tg-delivery が btc:snapshot を読む）

minimal-tg-delivery:
  btc:snapshot:early / btc:snapshot を読み込み
  → formatMinimalBriefing(payload, targetLang) 直接呼び出し（snapshot-native）
  → 6 言語 Telegram 配信
```

---

## 5. 変更ファイル一覧

| ファイル | 種別 |
|----------|------|
| `services/snapshot/btcSnapshotSchema.js` | 拡張 |
| `logic/divergence/computeDivergenceSignal.js` | 新規 |
| `logic/regime/computeMarketRegime.js` | 新規 |
| `logic/core/trapDetector.js` | 拡張 |
| `services/telegram/messages/user/en/minimal-high-quality.en.js` | 拡張 |
| `services/telegram/messages/user/es/minimal-high-quality.es.js` | 拡張 |
| `services/telegram/messages/user/pt-br/minimal-high-quality.pt-br.js` | 拡張 |
| `services/telegram/messages/user/ar/minimal-high-quality.ar.js` | 拡張 |
| `services/telegram/messages/user/ja/minimal-high-quality.ja.js` | 拡張 |
| `services/telegram/messages/user/ko/minimal-high-quality.ko.js` | 拡張 |
| `services/telegram/messages/user/en/emergency.en.js` | 拡張 |
| `services/telegram/messages/user/es/emergency.es.js` | 拡張 |
| `services/telegram/messages/user/pt-br/emergency.pt-br.js` | 拡張 |
| `services/telegram/messages/user/ar/emergency.ar.js` | 拡張 |
| `services/telegram/messages/user/ja/emergency.ja.js` | 拡張 |
| `services/telegram/messages/user/ko/emergency.ko.js` | 拡張 |
| `api/minimal-tg-delivery.js` | 変更 |
| `api/cron.js` | 変更 |
| `docs/supabase-btc-snapshots-phase3.sql` | 新規 |
| `docs/TRAP_DEFENCE_PHASE3_IMPLEMENTATION_PLAN.md` | 更新 |
| `services/telegram/messages/user/en/regular.en.js` | 拡張（Task 7） |
| `services/telegram/messages/user/es/regular.es.js` | 拡張（Task 7） |
| `services/telegram/messages/user/pt-br/regular.pt-br.js` | 拡張（Task 7） |
| `services/telegram/messages/user/ar/regular.ar.js` | 拡張（Task 7） |
| `services/telegram/messages/user/ja/regular.ja.js` | 拡張（Task 7） |
| `services/telegram/messages/user/ko/regular.ko.js` | 拡張（Task 7） |

---

## 6. 残タスク（Phase 3）

| 順序 | タスク | 状態 |
|------|--------|------|
| 7 | formatRegularBriefing(snapshot, lang, opts) 書き換え | **完了** |
| 8 | Stage 5 (Gemini) snapshotBuilder 統合 | 未着手 |
| 9 | Stage 6 (Dr.Grok) snapshotBuilder 統合 | 未着手 |
| 10 | cron.js: snapshotBuilder パイプライン再構成 | 未着手 |
| 11 | BWE deep snapshot alignment | 未着手 |
| 12 | アーキテクチャドキュメント更新 | 未着手 |
| 13 | scripts モック snapshot 更新 | 未着手 |

---

## 7. 検証方法

### 7.1 単体

- `logic/divergence/computeDivergenceSignal.js`: モック snapshot / lastSnapshot で `{ divergenceLevel, reasons, confidence }` が返ることを確認。
- `logic/regime/computeMarketRegime.js`: モック snapshot で regime ラベルが返ることを確認。
- `formatMinimalBriefing`: モック btcSnapshot を渡し、各言語で期待フォーマットの出力になることを確認。
- `formatTrapAlertFromSnapshot`: モック btcSnapshot を渡し、各言語で [EMERGENCY] 本文相当が返ることを確認。

### 7.2 統合

- minimal-tg-delivery: btc:snapshot を読み、formatMinimalBriefing で 6 言語配信されること。
- Emergency 発火時: formatTrapAlertFromSnapshot で 6 言語の [EMERGENCY] メッセージが TELEGRAM_CHAT_ID_BTC_* に送信されること。

---

## 8. 注意点

- **DB migration**: `docs/supabase-btc-snapshots-phase3.sql` を実行するまで、meta / market_regime の永続化は失敗する可能性あり。
- **computeDivergenceSignal / computeMarketRegime**: 現時点では cron の buildFullSnapshot 前には未呼び出し。タスク 10（パイプライン再構成）で統合予定。
- **formatRegularBriefing**: Task 7 で snapshot-native 化完了。後方互換のため legacy 引数も引き続き受け付け。
