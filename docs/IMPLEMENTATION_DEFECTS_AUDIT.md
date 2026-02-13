# 実装欠陥一覧（Cursor 自己診断）

**検証日**: 2026-02-13  
**基準**: Trap Defence 統合 OS アーキテクチャ（確定版）・TRAP_DEFENCE_OS_V1.0.md

---

## 1. 重大な仕様違反

- [ ] **BWE が btcSnapshot 無しで実行可能** — `api/buzzweave-run.js` L56–76: KV から snapshot 取得失敗時も `runBuzzWeaveCycle({ btcSnapshot: null })` を呼び出し、投稿まで進行する。憲法「btcSnapshot の参照は必須。optional ではない」に違反。`btcSnapshot == null` の場合は早期 return し、投稿してはならない。
- [ ] **Early write が isRegularSlot/force 時のみ** — `api/cron.js` L569–580: `writeEarlySnapshot` は `if (isRegularSlot || force)` 内でのみ実行。憲法「Stage 1 完了直後に btc:snapshot:early を KV に書き込み」に反し、毎回書き込む必要がある。minimal-tg-delivery が non-regular 時のみ cron 実行された場合に stale/empty になる可能性あり。
- [ ] **STANDBY_BREAK / WATCH が snapshot-native でない** — `api/cron.js` L1359–1420, L1421–1483, L1492–1561: `formatRegularBriefing` に legacy payload（`now`, `inflow`, `mpi`, `sentimentLabel`, …）を直接渡している。憲法「snapshot-native テンプレート」に違反。`formatRegularBriefing(snapshot, lang, opts)` で snapshot を渡す必要がある。
- [ ] **minimalContent.js が legacy payload を使用** — `services/content/minimalContent.js` L59–67: `formatMinimalBriefing` に `{ now, trapScore, priceUsd, change24h, trapData, marketData, sentimentData, lang }` を渡している。snapshot-native であるべき。
- [ ] **Emergency トリガー 3 件未実装** — `logic/deliveryModeEvaluator.js`: 憲法 2.5「liquidity vacuum」「ETF shock」「miner capitulation」の deterministic トリガーが実装されていない。現状は trapScore、trapSeverity、whale-retail divergence、kimchiPremium、panic-driven volatility のみ。

---

## 2. 中程度の仕様違反

- [ ] **divergenceSignal の二重ソース** — `api/cron.js` L973: `divergenceSignalResult` は `baseCoreDecision?.divergenceSignal` を参照するが、`decideSignal` / `decideSignalAdvanced` は divergenceSignal を返していない（`logic/core/marketCore.js` は internal divergenceScore のみ）。実質的には `computeDivergenceSignal` のみが使われているが、コードの意図が不明瞭。
- [ ] **Regular event-driven の liquidity shock / derivatives unwind 未実装** — `logic/deliveryModeEvaluator.js` L65–87: `evaluateRegularEventDriven` に whale spike、volatility regime shift、sentiment flip はあるが、憲法 2.6 の「liquidity shock」「derivatives unwind」が未実装。
- [ ] **Cron パイプライン順序の不一致** — 憲法 2.8.3: `runAssetSnapshot('BTC')` がステップ 1 とあるが、実装では `buildFullSnapshot` 完了後に `writeFullSnapshot` → `persistSnapshotToDb` → `runAssetSnapshot("BTC", btcSnapshot)` の順。`runAssetSnapshot` は KV 書き込みのみで、スナップショット構築は cron 内の別フローが担当。設計意図との整合性要確認。

---

## 3. 軽微な仕様違反

- [ ] **ドキュメントの矛盾** — `docs/TRAP_DEFENCE_UNIFIED_OS_ARCHITECTURE.md` L357: Phase 3 セクションで「`utils/snapshotToRegularEmailPayload.js`: snapshot → legacy email payload のマッピング」と記載。Phase 4 では削除済みと矛盾。
- [ ] **レガシー minimal.*.js が残存** — `services/telegram/messages/user/{en,ja,ko,...}/minimal.{lang}.js` が legacy `formatMinimalBriefing({ ... })` 形式で存在。minimal-high-quality.* がメインだが、minimal.* の使用箇所が残っている可能性あり。

---

## 4. 未実装（仕様にあるがコードに存在しない）

- [ ] **liquidity vacuum による Emergency トリガー** — `logic/deliveryModeEvaluator.js` に CQ Pro liquidity 指標に基づく liquidity vacuum 判定が未実装。
- [ ] **ETF shock による Emergency トリガー** — Grok ETF シグナルに基づく Emergency 判定が未実装。
- [ ] **miner capitulation による Emergency トリガー** — MPI / miner flows に基づく独立した Emergency トリガーが未実装（trapScore には間接的に含まれる可能性あり）。
- [ ] **Regular event-driven: liquidity shock** — 未実装。
- [ ] **Regular event-driven: derivatives unwind** — 未実装。
- [ ] **asset_snapshots への書き込み** — `runAssetSnapshot` は KV 書き込みのみ。`asset_snapshots` テーブルへの insert は未実装。憲法「DB: btc_snapshots, asset_snapshots」とあるが、現状 btc は `btc_snapshots` のみ。asset_snapshots は「将来拡張」の可能性あり。仕様解釈により要対応。

---

## 5. 誤実装（仕様と異なる動作）

- [ ] **STANDBY_BREAK / WATCH の formatRegularBriefing 呼び出し** — `snapshot` を渡すべきところで legacy オブジェクトを渡している。`formatRegularBriefing` は `snapshotOrPayload` を受け付けるが、このパスでは btcSnapshot を渡すのが正しい（憲法準拠）。

---

## 6. CQ Pro 関連の問題

- [ ] **存在しないエンドポイント呼び出しの可能性** — `services/cryptoquant/deepMetrics.js`: getStablecoinMetrics、getETFFlows、getLTHNUPL 等が推測パスで API を叩いている。憲法 0.2「実在するエンドポイントだけを叩く」に照らし、404 が多い場合は該当呼び出しの見直しが必要。
- [ ] **CQ クライアントのパス形式** — 憲法は `/v1/Bitcoin/Status/` 等のカテゴリを SSOT とするが、実装は `/btc/flow-indicator/exchange-whale-ratio` 等。CryptoQuant API の実際のパス形式との整合性要確認。

---

## 7. Emergency 関連の問題

- [ ] **3 トリガー未実装** — 上記「1. 重大」「4. 未実装」参照。liquidity vacuum、ETF shock、miner capitulation。
- [ ] **eventTriggers と deliveryModeEvaluator の二重構造** — cron は `eventTriggers.evaluateTrigger` で WATCH/STANDBY_BREAK 等を判定し、`evaluateDeliveryMode` で emergency/regular/minimal を判定。Emergency は deliveryModeEvaluator 側で正しく deterministic 化されているが、eventTriggers 側にも EMERGENCY 判定があり、役割の重複・分離が不明瞭。

---

## 8. Regular event-driven の問題

- [ ] **whale spike, liquidity shock, derivatives unwind, sentiment flip, volatility regime shift** — 憲法 2.6 の 5 イベントのうち、whale spike（whaleRatio）、sentiment flip（score delta）、volatility regime shift（change24h）は実装済み。liquidity shock、derivatives unwind は未実装。

---

## 9. BWE 関連の問題

- [ ] **btcSnapshot が null でも投稿実行** — 上記「1. 重大」参照。BWE は btcSnapshot 必須であるべき。
- [ ] **snapshot の freshness チェック** — 憲法 3.4 Q9「snapshot の許容 freshness」に答える実装（例: 24 時間以内）が未確認。`buzzweave-run.js` は `BTC_SNAPSHOT_MAX_AGE_MS` で古い snapshot を拒否しているが、その閾値が明示されていない可能性あり。

---

## 10. Multi-Asset Framework の問題

- [ ] **Cron が ETH/SOL/NASDAQ/GOLD を呼んでいない** — 憲法「BTC 以外は stub」「Cron が BTC 以外を呼んでいるのは重大欠陥」に照らし、現状は `runAssetSnapshot("BTC", btcSnapshot)` のみで正しい。BTC 以外の adapter は stub のまま。問題なし。
- [ ] **adapter の stub 確認** — `ethAdapter.js`, `solAdapter.js`, `nasdaqAdapter.js`, `goldAdapter.js` は stub（fetchRaw が固定値を返す）で問題なし。`btcAdapter.js` のみ実装済み。

---

## 11. Cron パイプラインの問題

- [ ] **Stage 1–6 が単一の btcSnapshotBuilder に統合されていない** — cron 内で Stage 1–6 が分散して実装されている。`runStages5And6` で Stage 5/6 を実行し、Stage 1–4 は cron 本体に散在。憲法の「btcSnapshotBuilder (pure, incremental)」という整理と完全には一致していない。
- [ ] **runAssetSnapshot の呼び出しタイミング** — full snapshot 構築・永続化の後に実行されており、Multi-Asset の「runAssetSnapshot が orchestrator」という解釈とは異なる。現状は「既存 btcSnapshot を asset:snapshot:BTC に複写」に近い。

---

## 12. snapshot-native テンプレートの問題

- [ ] **STANDBY_BREAK / WATCH が legacy payload** — 上記「1. 重大」「5. 誤実装」参照。
- [ ] **minimalContent.js が legacy** — 上記「1. 重大」参照。
- [ ] **formatMinimalBriefing の snapshotOrPayload 両対応** — minimal-high-quality.*.js は `snapshotOrPayload` を受け付け、両対応。仕様上は snapshot-native を主とし、legacy は移行用とすべき。legacy パスを残したままにしている箇所が上記で指摘したとおり存在する。

---

## 13. diff エンジンの問題

- [ ] **computeSnapshotDiff は実装済み** — `logic/diff/computeSnapshotDiff.js` が存在し、cron で `buildFullSnapshot` に diff を渡している。問題なし。
- [ ] **diff の DB 永続化** — `btcSnapshotSchema.snapshotToDbRow` および `utils/supabase.js` の `dbRowToBtcSnapshot` に diff が含まれているか要確認。前回対応で追加済みの想定。

---

## 14. Dashboard の問題

- [ ] **api/dashboard/btc.js, history.js, public/dashboard/index.html は実装済み** — Phase 4 で実装済み。diff セクションも追加済み。軽微: Dashboard のルーティングが Vercel / Next.js 等で `/api/dashboard/*` として有効かはプロジェクト構成次第。

---

## 15. Email の問題

- [ ] **formatRegularBriefingHTML(snapshot, lang, opts) は実装済み** — 全言語で snapshot-native。`utils/snapshotToRegularEmailPayload.js` は削除済み（grep で未検出）。問題なし。
- [ ] **scripts/test-email-*.js** — `test-email-simple-ceo.js` は `formatRegularBriefingHTML(snapshot, 'en', opts)` をモック snapshot で呼び出しており、仕様通り。

---

## 16. Self-healing の問題

- [ ] **CQ Pro: 404→null, 500→retry, 429→wait+retry** — `services/cryptoquant/deepMetrics.js` の `fetchCQWithRetry` で実装済み。
- [ ] **AI 失敗時の null フォールバック** — cron 内で gptRegularAnalysis、grokXAnalysis 等が null の場合のフォールバックが存在。概ね対応済み。

---

## 17. その他の問題

- [ ] **EVENT_DRIVEN がデフォルト無効** — `api/cron.js` L192: `ENABLE_EVENT_DRIVEN = process.env.ENABLE_EVENT_DRIVEN === "true"`。環境変数未設定時は event-driven が無効となり、Regular event-driven が発火しない。憲法上は event-driven が必須のため、デフォルト有効とするか仕様を明確にする必要がある。
- [ ] **btc:snapshot:early の TTL** — `btcSnapshotWriter.js` L9: `KV_EARLY_TTL = 1200`（20 分）。cron が 6 時間周期の場合、early が消えた後に minimal-tg-delivery が動くと empty になる可能性。cron 周期との整合性要確認。
