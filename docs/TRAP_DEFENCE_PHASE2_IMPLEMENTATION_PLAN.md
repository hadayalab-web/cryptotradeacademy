# Trap Defence Phase 2 実装計画

**作成日**: 2026-02-13  
**目的**: btcSnapshot を「血液」として流し、OS を完全にライブ化する

---

## 1. cron.js リファクタの具体的計画

### 1.1 現状フロー（要約）

```
認証 → スロット判定 → [1] CQ basic (inflow, mpi) → [2] Price, FNG
  → [early write] minimal:btc:latest (isRegularSlot||force 時のみ)
  → [3] GPT (shouldCallGPT 時)
  → [4] buildMarketContext, decideSignal, tradeSignal
  → [5] detectTrap
  → [6] Grok (needsXIntel 時)
  → [7] eventTriggers.evaluateTrigger (ENABLE_EVENT_DRIVEN 時)
  → [8] getCQDeepMetrics (isRegularSlot 時)
  → [9] GPT Regular, Grok, trapDetection, Dr.Grok (needsLongReport && isRegularSlot 時)
  → [10] minimalPayload → minimal:btc:latest (isRegularSlot||force)
  → [11] REGULAR 配信 (isRegularSlot || force || triggerType===REGULAR)
  → [12] EMERGENCY 配信 (finalNeedsEmergency || triggerType===EMERGENCY)
  → [13] WATCH, STANDBY_BREAK
```

### 1.2 新フロー（btcSnapshot 中心）

```
認証 → スロット判定
  → [1] CQ basic (inflow, mpi), Price, FNG
  → raw = { inflow, mpi, priceUsd, change24h, sentimentLabel, fng }
  → ctx = buildMarketContext(...), coreDecision = decideSignal(ctx)
  → trap = detectTrap(...)
  → ★ writeEarlySnapshot(kv, raw, coreDecision.score, trap)  [btc:snapshot:early]
  
  → [2] getCQDeepMetrics (常に。CQ Pro 100% の第一歩)
  → cqDeep = { ...getCQDeepMetrics, sopr, sopr30d, nupl?, funding?, oi? }
  
  → [3] Grok (needsXIntel: isRegularSlot || force || needsEmergency || needsWatch)
  → xSentiment, highResX
  
  → [4] GPT (needsLongReport: isRegularSlot || force || needsEmergency)
  → gptStructureReasoning, gptTrapInterpretation
  → trapDetection, trapAlert
  
  → [5] lastSnapshot = getLastBtcSnapshot()  [btc_snapshots から直近1件]
  → snapshot = buildFullSnapshot({ raw, cqDeep, xSentiment, highResX, ... })
  → ★ writeFullSnapshot(kv, snapshot)
  → ★ persistSnapshotToDb(snapshot)
  
  → [6] deliveryMode = evaluateDeliveryMode(snapshot, { isRegularSlot, force, lastSnapshot })
  → mode = deliveryMode.mode  // 'minimal' | 'regular' | 'emergency'
  
  → [7] モード別ディスパッチ:
     - emergency: formatTrapAlert(snapshot, lang) × 6言語 → sendMessageToChannel(EMERGENCY)
     - regular: formatRegularBriefing(snapshot, lang, ...) × 6言語 → sendMessageToChannel
     - minimal: writeFullSnapshot で btc:snapshot を既に書いたので、minimal-tg-delivery が読む
```

### 1.3 削除・統合する legacy 分岐

| 削除対象 | 置き換え |
|----------|----------|
| `earlyMinimalPayload` → `minimal:btc:latest` | `writeEarlySnapshot` → `btc:snapshot:early` |
| `minimalPayload` → `minimal:btc:latest` | 不要（minimal-tg-delivery が btc:snapshot を読む） |
| `finalNeedsEmergency` の独自計算 | `evaluateEmergencyTrigger(snapshot).fire` |
| `triggerType` (eventTriggers) | `evaluateDeliveryMode` と統合。eventTriggers は lastSnapshot の代わりに stateManager を使う場合は併存可 |
| Emergency の LANG 単一送信 | 6 言語 × 言語別チャンネル |

---

## 2. Minimal / Regular / Emergency の btcSnapshot 接続

### 2.1 Minimal

**minimal-tg-delivery.js の変更:**

1. `kv.get("btc:snapshot:early")` を試す
2. 無ければ `kv.get("btc:snapshot")`
3. まだ無ければ `kv.get("minimal:btc:latest")`（移行期フォールバック）
4. 取得したオブジェクトを btcSnapshot として解釈:
   - `snapshot.raw` → priceUsd, change24h, inflow, sentimentLabel
   - `snapshot.trapDetection?.trapScore` or `snapshot.cqDeep?.trapScore` → trapScore
   - `snapshot.market_score` → score
   - `snapshot.cqDeep?.whaleFlows?.whaleRatio` → trapData.whaleRatio
5. `formatMinimalBriefing({ now, trapScore, priceUsd, change24h, trapData, marketData, sentimentData, lang })` にマッピングして渡す

**後方互換**: `minimal:btc:latest` の shape も解釈できるアダプタを用意（`snapshotFromLegacyMinimalPayload(payload)`）。

### 2.2 Regular

**既存の formatRegularBriefing 入力:**

- snapshot, now, inflow, mpi, sentimentLabel, priceUsd, change24h, score, tradeSignal, trap, aiAnalysis, trapScore, whaleFlows, liquidations, kimchiPremium, upbitPrice, gptReporterAnalysis, grokXAnalysis, trapDetection, trapAlert, divergenceSignal, psychologicalSupport, sosovalueArticle, 等

**btcSnapshot からのマッピング:**

- `snapshot.raw` → inflow, mpi, priceUsd, change24h, sentimentLabel
- `snapshot.market_score` → score
- `snapshot.tradeSignal` → tradeSignal
- `snapshot.trapDetection` → trapDetection
- `snapshot.trapAlert` → trapAlert
- `snapshot.cqDeep` → trapScore, whaleFlows, liquidations, kimchiPremium, upbitPrice
- `snapshot.gptStructureReasoning` → gptReporterAnalysis / aiAnalysis
- `snapshot.grokXAnalysis` → grokXAnalysis
- `snapshot.sosovalueArticle` → sosovalueArticle
- `snapshot.drGrok` → psychologicalSupport（言語ごとに診断する場合は既存ロジック維持）

**実装方針**: cron 内で `btcSnapshot` を組み立てた後、`formatRegularBriefing` に渡す引数を btcSnapshot から導出する。既存の `snapshot` (marketSnapshotService) は必要に応じて btcSnapshot から生成するか、btcSnapshot をそのまま渡せるようにテンプレートを拡張する。

### 2.3 Emergency

**formatTrapAlert の現行入力:** `{ inflow, mpi, priceUsd, trap, aiAnalysis }`

**btcSnapshot からのマッピング:**

- `snapshot.raw.inflow` → inflow
- `snapshot.raw.mpi` → mpi
- `snapshot.raw.priceUsd` → priceUsd
- `snapshot.trapDetection` を trap 相当に変換（label, confidence, note, hint）
- `snapshot.gptStructureReasoning` または `snapshot.gptTrapInterpretation` → aiAnalysis

**新規関数**: `formatTrapAlertFromSnapshot(snapshot, lang)`  
- 各言語の `formatTrapAlert` を呼ぶ際に、snapshot から上記をマッピングして渡す。
- 既存 `formatTrapAlert` のシグネチャは維持し、アダプタで変換。

**Emergency 配信:**

- mode === 'emergency' のとき、SUPPORTED_LANGS の各言語で:
  - `formatTrapAlertFromSnapshot(snapshot, lang)` でテキスト生成
  - `sendMessageToChannel` または `sendMessageToAsset` で言語別チャンネルに送信
- Regular より優先（Emergency 発火時は Regular をスキップ）

---

## 3. CQ Pro 100% への拡張

### 3.1 deepMetrics の拡張

**既存**: whaleRatio, trapScore, SOPR, SOPR30d, kimchiPremium, riskReward, liquidations(0), longTerm(nupl, sopr30d)

**追加（CQ API が提供する範囲で）:**

- `getFundingRate()` - derivatives funding（存在するエンドポイントを確認）
- `getOpenInterest()` - OI（存在するエンドポイントを確認）
- `getMinerFlows()` - MPI 以外の miner 指標（存在するエンドポイントを確認）
- `getLiquidityMetrics()` - liquidity 関連（存在するエンドポイントを確認）
- NUPL: 現状 404 の場合はスキップ、提供されれば追加

**buildFullSnapshot / cqDeep への組み込み:**

- `cqDeep.sopr`, `cqDeep.sopr30d`, `cqDeep.nupl`, `cqDeep.funding`, `cqDeep.openInterest`, `cqDeep.minerFlows`, `cqDeep.liquidity` を設定
- btc_snapshots の `cq_deep` JSONB にそのまま保存

### 3.2 段階的実装

- Phase 2 では、既存の `getCQDeepMetrics` の戻り値をそのまま cqDeep に格納
- 追加 CQ エンドポイントは、存在確認後に `deepMetrics.js` に追加し、`getCQDeepMetrics` の戻り値にマージ

---

## 4. BWE プロンプトの拡張

**現在**: trapScore, market_score, priceUsd, change24h をプロンプトに注入

**追加（軽量）:**

- whaleRatio（0–1）
- sentimentLabel（Fear / Greed / Neutral 等）
- regimeLabel: 簡易ルール（例: change24h > 5 → "high_volatility", whaleRatio > 0.85 → "whale_driven", retailFomo > 70 → "retail_fomo"）

**実装**: `services/ai/gpt5mini.js` の `marketStateNote` 生成部分を拡張

---

## 5. 実装順序（推奨）

| 順序 | タスク | 依存 |
|------|--------|------|
| 1 | Supabase に `getLastBtcSnapshot()` を追加 | btc_snapshots テーブル |
| 2 | deepMetrics に CQ Pro 追加取得を追加（可能な範囲） | - |
| 3 | btcSnapshotSchema の buildFullSnapshot に cqDeep 拡張フィールドを追加 | 2 |
| 4 | cron.js: Stage 1 完了直後に writeEarlySnapshot を呼ぶ | - |
| 5 | cron.js: 全データ取得後に buildFullSnapshot, writeFullSnapshot, persistSnapshotToDb を呼ぶ | 1, 3 |
| 6 | cron.js: evaluateDeliveryMode で mode を決定、legacy 分岐を削除 | 1, 5 |
| 7 | minimal-tg-delivery: btc:snapshot:early / btc:snapshot を読むように変更 | 4 |
| 8 | Emergency: formatTrapAlertFromSnapshot + 6 言語配信を実装 | 5 |
| 9 | Regular: btcSnapshot から formatRegularBriefing 入力を導出 | 5 |
| 10 | BWE generateXPost: whaleRatio, sentimentLabel, regimeLabel を追加 | - |

---

## 6. 実装前の確認事項

### 6.1 Emergency の言語別チャンネル

- Regular は `TELEGRAM_CHAT_ID_BTC_EN` 等の言語別チャンネルを使用
- Emergency も同じチャンネルに送るか、`TELEGRAM_CHAT_ID_EMERGENCY_EN` 等の別チャンネルを持つか
- **推奨**: 同一チャンネル（Regular 用）に送り、Emergency 時は「アラート」として上書き表示される想定

### 6.2 eventTriggers との関係

- 現行: `evaluateTrigger(market, currentState, lastState, cqDeep)` が `triggerType` を返す
- 新: `evaluateDeliveryMode(snapshot, { isRegularSlot, force, lastSnapshot })` が `mode` を返す
- **方針**: Phase 2 では `evaluateDeliveryMode` を主とし、`evaluateTrigger` は ENABLE_EVENT_DRIVEN 時も `evaluateDeliveryMode` の結果を優先。将来的に eventTriggers を evaluateDeliveryMode に統合するか、両者を併用するかは検討

### 6.3 marketSnapshotService と btcSnapshot

- 現行: `marketSnapshotService.createSnapshot(...)` が market_score 等を保持
- 新: btcSnapshot が同様の情報を持つ
- **方針**: btcSnapshot を正とし、marketSnapshotService は btcSnapshot から createSnapshot を呼ぶか、または formatRegularBriefing が btcSnapshot を直接受け取るようにテンプレートを拡張。後者の方がシンプル。

### 6.4 Cron 実行頻度と Minimal 配信タイミング

- cron: 0,7,22,37,52 分に実行（毎時 5 回）
- minimal-tg-delivery: 8 0,6,12,18（00:08, 06:08, 12:08, 18:08 UTC）
- cron が 00:07 に実行すると、00:08 の minimal-tg-delivery が読む snapshot は 1 分前のもの
- **結論**: 問題なし。btc:snapshot は直近の cron 実行で更新されるため、minimal-tg-delivery は最新の snapshot を読む。

---

## 7. オープンクエスチョン

1. **Emergency のチャンネル**: Regular と同じ `TELEGRAM_CHAT_ID_BTC_*` でよいか、それとも Emergency 専用チャンネルを設けるか。
2. **STANDBY_BREAK / WATCH**: Phase 2 でこれらをどう扱うか。`evaluateDeliveryMode` は現状 minimal/regular/emergency の 3 値。STANDBY_BREAK は regular の亜種、WATCH は minimal の亜種として扱うか、mode を拡張するか。
3. **CQ Pro エンドポイント**: funding, OI, minerFlows, liquidity, NUPL について、CryptoQuant Pro で利用可能なエンドポイントの公式ドキュメントまたは一覧があれば共有してほしい。404 となるものはスキップする。

上記が決まり次第、Phase 2 実装に着手する。
