# Trap Defence 統合 OS 実装完了報告

**作成日**: 2026-02-13  
**ステータス**: Phase 1 実装完了

---

## 1. 実装サマリー

統合 OS の基盤と BWE の btcSnapshot 必須消費を実装した。アーキテクチャドキュメントの必須修正を反映し、以下を追加・変更した。

---

## 2. 実施した変更

### 2.1 ドキュメント

| ファイル | 内容 |
|----------|------|
| `docs/TRAP_DEFENCE_UNIFIED_OS_ARCHITECTURE.md` | 必須修正を反映（BWE 必須、btcSnapshot history 必須、Emergency 現状 dead、Regular event-driven 追記） |
| `docs/supabase-btc-snapshots.sql` | **新規**。`btc_snapshots` テーブル定義。Unified OS 用スナップショット履歴（必須） |

### 2.2 新規モジュール

| ファイル | 役割 |
|----------|------|
| `services/snapshot/btcSnapshotSchema.js` | `buildEarlySnapshot`, `buildFullSnapshot`, `snapshotToDbRow`。KV キー定数・最大 age 定数 |
| `services/snapshot/btcSnapshotWriter.js` | `writeEarlySnapshot`, `writeFullSnapshot`, `persistSnapshotToDb`。KV 書き込みと DB 永続化 |
| `logic/deliveryModeEvaluator.js` | **純粋関数**。`evaluateEmergencyTrigger`, `evaluateRegularEventDriven`, `evaluateDeliveryMode`。Emergency 復活用トリガーと Regular イベント駆動判定 |

### 2.3 Supabase

| ファイル | 変更 |
|----------|------|
| `utils/supabase.js` | `insertBtcSnapshot(row)` を追加・export。`btc_snapshots` への upsert |

### 2.4 BWE の btcSnapshot 必須対応

| ファイル | 変更 |
|----------|------|
| `api/buzzweave-run.js` | 起動時に KV から `btc:snapshot` を取得。24h 以内なら `runBuzzWeaveCycle({ btcSnapshot })` に渡す。無い/古い場合は null で実行しログのみ |
| `services/td/buzzWeaveEngine.js` | `runBuzzWeaveCycle(options)` で `options.btcSnapshot` を受け取り、`generateParasiticCopy(..., btcSnapshot)` に渡す。`generateParasiticCopy` は `generateXPost` に `btcSnapshot` を渡す |
| `services/ai/gpt5mini.js` | `generateXPost(opts)` で `opts.btcSnapshot` を受け取り、存在時はプロンプトに「Current Trap Defence market state: trapScore, market_score, price, change24h」を付与し、TD と同一市場状態で投稿 |

---

## 3. 動作仕様

### 3.1 btcSnapshot の流れ

1. **Cron**（今後の統合で）: Stage 1 完了後に `writeEarlySnapshot(kv, raw, market_score, trap)` を呼び、`btc:snapshot:early` を KV に書き込む。全 stage 完了後に `buildFullSnapshot(...)` でスナップショットを組み立て、`writeFullSnapshot(kv, snapshot)` で `btc:snapshot` を KV に書き、`persistSnapshotToDb(snapshot)` で `btc_snapshots` に保存する。
2. **BWE**: 毎回 `btc:snapshot` を KV から取得。24h 以内なら `btcSnapshot` として `runBuzzWeaveCycle` に渡す。GPT 投稿生成時に trapScore / market_score / price / change24h をプロンプトに含め、TD と整合したトーンで投稿する。

### 3.2 Emergency / Regular 判定（ロジックのみ実装）

- `evaluateEmergencyTrigger(snapshot)`: trapScore≥60、trapSeverity CRITICAL/HIGH、whale–retail divergence≥40、kimchiPremium≥8%、panic + change24h≥8% で `{ fire: true, reason }`。
- `evaluateRegularEventDriven(snapshot, lastSnapshot)`: whaleRatio≥0.85、volatility change24h≥5%、sentiment flip (score delta≥25) で `{ fire: true, reason }`。
- `evaluateDeliveryMode(snapshot, { isRegularSlot, force, lastSnapshot })`: force → emergency → regular_slot → event_driven_regular → minimal。

これらは **cron.js から未呼び出し**。cron を btcSnapshot ベースにリファクタする際に組み込む。

---

## 4. 未実装・今後の作業

| 項目 | 内容 |
|------|------|
| **Cron の btcSnapshot 統合** | cron.js 内で `buildEarlySnapshot` / `buildFullSnapshot` を呼び、`writeEarlySnapshot`・`writeFullSnapshot`・`persistSnapshotToDb` を実行する。既存の earlyMinimalPayload を early snapshot に置き換え可能。 |
| **Minimal の btcSnapshot 消費** | minimal-tg-delivery が `btc:snapshot` または `btc:snapshot:early` を読んでフォーマットするように変更（現状は `minimal:btc:latest` のままでも可。移行時にキー統一）。 |
| **Emergency 6 言語配信** | `evaluateEmergencyTrigger` が true のときに、同一 btcSnapshot から `formatTrapAlert(snapshot)` を 6 言語分呼び出し、言語別チャンネルへ Telegram 配信する。 |
| **Regular イベント駆動の接続** | cron 内で `evaluateRegularEventDriven(snapshot, lastSnapshot)` を呼び、true なら時間スロットでなくても Regular 配信する。lastSnapshot は `btc_snapshots` から直近 1 件取得するか、KV に「前回」を保持する。 |
| **CQ Pro 100%** | deepMetrics 等で NUPL、funding、OI、miner flows 詳細、liquidity を取得し、`cqDeep` および btcSnapshot に含める。CQ API のエンドポイント仕様に合わせて実装。 |

---

## 5. 検証方法

### 5.1 単体

- `logic/deliveryModeEvaluator.js`: `evaluateEmergencyTrigger`, `evaluateRegularEventDriven`, `evaluateDeliveryMode` にダミー snapshot を渡し、期待する `fire` / `mode` が返ることを確認。
- `services/snapshot/btcSnapshotSchema.js`: `buildEarlySnapshot`, `buildFullSnapshot`, `snapshotToDbRow` の出力形を確認。

### 5.2 BWE

1. 事前に `/api/cron` を実行し、KV に `btc:snapshot` が書き込まれるようにする（現状 cron はまだ btcSnapshot を書いていないため、手動で `btc:snapshot` を KV に置くか、cron に writeFullSnapshot を組み込んだ後に実行）。
2. `GET /api/buzzweave-run?dry_run=true` を実行。
3. ログに `hasBtcSnapshot: true` が出ること、および GPT が trapScore/market_score 付きで生成していることを確認。

### 5.3 DB

- Supabase で `docs/supabase-btc-snapshots.sql` を実行し、`btc_snapshots` を作成。
- cron で `persistSnapshotToDb` を呼ぶ実装後に、cron 実行ごとに 1 行挿入されることを確認。

---

## 6. ファイル一覧（変更・新規）

| 種別 | パス |
|------|------|
| 新規 | `docs/supabase-btc-snapshots.sql` |
| 新規 | `services/snapshot/btcSnapshotSchema.js` |
| 新規 | `services/snapshot/btcSnapshotWriter.js` |
| 新規 | `logic/deliveryModeEvaluator.js` |
| 変更 | `docs/TRAP_DEFENCE_UNIFIED_OS_ARCHITECTURE.md` |
| 変更 | `utils/supabase.js` |
| 変更 | `api/buzzweave-run.js` |
| 変更 | `services/td/buzzWeaveEngine.js` |
| 変更 | `services/ai/gpt5mini.js` |
| 新規 | `docs/TRAP_DEFENCE_UNIFIED_OS_IMPLEMENTATION_REPORT.md`（本レポート） |

---

## 7. まとめ

- **btcSnapshot のスキーマ・早期/完全ビルド・KV/DB 書き込み**の基盤を実装した。
- **BWE は必ず KV から btcSnapshot を読み、取得できた場合は GPT に市場状態を渡して投稿**するようにした。
- **Emergency / Regular のトリガーとモード判定**は純粋関数として用意し、cron からの呼び出しと Emergency 6 言語配信・Regular イベント駆動は次の Phase で接続する。
- **btc_snapshots テーブルと insertBtcSnapshot** により、スナップショット履歴の保存が必須要件を満たせる状態にした。

次のステップ: cron.js の btcSnapshot 統合、Minimal の snapshot 消費、Emergency 復活（6 言語）、Regular イベント駆動の接続、CQ Pro 100% の取り込み。
