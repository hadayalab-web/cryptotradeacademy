# Trap Defence OS 構造レビュー監査レポート

**実施日**: 2026-02-14  
**目的**: 全レイヤー（Cron → snapshotBuilder → KV → run.js → evaluator → shiftTypes → gpt5mini → adapters → schemas）の一貫性・破綻・ノイズ・二重管理・矛盾の総合監査

---

## 0. 定義の一貫性（ブレの有無）

**前提とする定義**

| 対象 | 定義 |
|------|------|
| **Trap Defence BTC（Minimal / Regular / 転換点アラート）** | **商品**。Telegram で**定期 / 不定期**に自動配信される。 |
| **BuzzWeave Engine** | **X → Vidalytics → Whop** が連携した**自動集客・送客システム**（ブリーフィングではない）。 |

### 0.1 Trap Defence BTC と BuzzWeave の分離 【ブレなし】

- **コード・ドキュメント**: `TRAP_DEFENCE_UNIFIED_OS_ARCHITECTURE.md` で TD = 価値エンジン（Minimal/Regular/Emergency/転換点アラート）、BWE = 成長エンジン（X 引用リポスト・Vidalytics リンク・Whop 着地）と明確に分かれている。
- **実装**: cron は Minimal/Regular/Emergency の **Telegram 配信のみ**担当。BWE は `api/buzzweave-run.js` → `runBuzzWeaveCycle` で **X 投稿** と `pickVidalyticsLink`（Vidalytics）→ Whop 着地。両者の役割は混線していない。
- **結論**: 「Trap Defence BTC = 商品で Telegram 配信」「BuzzWeave = X～Vidalytics～Whop の集客・送客」という定義は**ブレていない**。

### 0.2 転換点アラート を「商品・Telegram 配信」とみなした場合のブレ 【High】

- **定義**: 転換点アラート も Trap Defence BTC の**商品**のひとつで、Telegram で定期/不定期配信される、としている。
- **実装**: 
  - `api/kiba/run.js` で 転換点アラート は**評価・スナップショット作成・KV 保存・多言語アラート文生成**まで実施し、`dispatchPayload`（`alerts` に 6 言語分）を返している。
  - 一方、**この `dispatchPayload` を Telegram に送るコードがリポジトリ内に存在しない**。cron は `kibaResult` をレスポンスに含めるだけで、Minimal/Regular/Emergency のような「配信ブロック（sendMessageToChannel 等）」が 転換点アラート 用にない。
- **結論**: 「転換点アラート = 商品で Telegram で配信」と定義するなら、**現状はブレている**。転換点アラート は「Regular 特典・転換点検知」として評価・KV 保存まではあるが、**Telegram への配信経路が未実装**。  
  - 対応案: (1) 転換点アラート 発火時に `dispatchPayload.alerts` を Regular 購読者向けチャット等に送る配信を cron（または別 API）に追加する、(2) あるいは「転換点アラート は現時点では配信対象外（将来 転換点アラート_PRO で配信）」と定義側で明記する。

### 0.3 Minimal / Regular の「定期・不定期」 【ブレなし】

- **Regular**: 定期 = スロット（0,6,12,18 時等）、不定期 = イベント駆動（WATCH / STANDBY_BREAK 等）。cron 内で両方とも Telegram 配信。定義と一致。
- **Minimal**: 別 Cron（例: 8 分に 0,6,12,18）で Telegram 配信。定期扱いで問題なし。
- **Emergency**: イベント駆動で Telegram 配信。定義と一致。

---

## 1. 血流の一貫性

### 1.1 macroContext の一次ソースが btcSnapshot.macroContext になっていない 【High】

- **事実**: `api/cron.js` の `buildFullSnapshot()` 呼び出し（786–804行）で **macroContext を渡していない**。そのため KV に保存される `btcSnapshot.macroContext` は常に `null`。
- **影響**: 
  - `api/kiba/run.js` は `btcSnapshot?.macroContext` を優先するが、cron 由来の btcSnapshot では常に null のため、実質的に `inferMacroRiskOnOffFromChanges(nasdaqChange24h, goldChange24h)` に依存している。
  - 「macroContext の一次ソースは btcSnapshot.macroContext」という設計と実装が一致していない。
- **推奨**: cron 側で NASDAQ/GOLD を取得し、run.js と同一ロジック（または thresholds を参照する共通関数）で macroContext を組み立て、`buildFullSnapshot({ ..., macroContext })` に渡す。run.js の `buildMacroSnapshot` は btcSnapshot.macroContext を優先するだけにし、一次ソースを btcSnapshot に統一する。

### 1.2 multi-asset snapshot の補完ロジックが二重管理 【Medium】

- **事実**: 
  - **run.js**: `buildMacroSnapshot()` 内で `normalizeMacroRiskOnOff(btcSnapshot?.macroContext?.macroRiskOnOff) ?? inferMacroRiskOnOffFromChanges(nasdaqChange24h, goldChange24h)`。閾値はハードコード（1.0, -0.3, -1.0, 0.3）。
  - **evaluator.js**: `inferMacroRiskOnOff()` で `CRITICAL_転換点アラート_THRESHOLDS.NASDAQ_RISK_ON_CHANGE_24H` 等を参照。
  - **buzzweave-run.js**: `btcSnapshot.macroContext` が無い場合に NASDAQ/GOLD から別ロジックで補完（change24h > 2 → risk_on 等）。閾値が run.js / thresholds と異なる（2 / -2 等）。
- **影響**: 同じ「マクロ局面」が run.js・evaluator・BWE で異なる閾値・異なるラベルになりうる。
- **推奨**: macro 判定（nasdaqChange24h / goldChange24h → macroRiskOnOff）を一箇所に集約（例: `core/kiba` または `services/snapshot/` の共通関数）し、run.js / evaluator / BWE はすべてそこを参照する。閾値は `thresholds.js` のみから取得する。

### 1.3 snapshot → evaluator → shiftTypes の流れ 【問題なし】

- evaluator は `classifyShiftType(metrics, btcSnapshot, macroSnapshot)` を呼び、shiftTypes は `btcSnapshot?.raw?.change24h` と `btcSnapshot?.macroContext` を参照。run.js が渡す `macroSnapshot` と btcSnapshot の組み合わせで一貫して評価されている。

---

## 2. 転換点アラート の整合性

### 2.1 shiftType の優先順位が仕様と不一致 【Medium】

- **仕様**: TOP → BOTTOM → UP → DOWN → **REVERSAL** → **ACCEL** → NONE
- **実装**: `core/kiba（旧 shiftTypes は廃止）` では **ACCEL** を **REVERSAL** より先に判定している（80–86行で ACCEL、88–103行で REVERSAL）。
- **影響**: 両方の条件を満たす場合、仕様では REVERSAL を返すべきところ、実装では ACCEL が返る。
- **修正案** (diff):

```diff
--- a/core/kiba（旧 shiftTypes は廃止）
+++ b/core/kiba（旧 shiftTypes は廃止）
@@ -77,14 +77,6 @@ function classifyShiftType(metrics = {}, btcSnapshot = null, macroSnapshot = null) {
     return "DOWN";
   }

-  // ACCEL: structure is thin + derivatives pressure can amplify move
-  if (
-    liquidityStressScore >= t.LIQUIDITY_STRESS_HIGH &&
-    derivativesStressScore >= t.SCORE_MEDIUM
-  ) {
-    return "ACCEL";
-  }
-
   // REVERSAL: opposite pressure emerges vs recent direction
   const bullishReversal =
     change24h < 0 &&
@@ -98,6 +90,14 @@ function classifyShiftType(metrics = {}, btcSnapshot = null, macroSnapshot = null) {
   if (bullishReversal || bearishReversal) {
     return "REVERSAL";
   }
+
+  // ACCEL: structure is thin + derivatives pressure can amplify move
+  if (
+    liquidityStressScore >= t.LIQUIDITY_STRESS_HIGH &&
+    derivativesStressScore >= t.SCORE_MEDIUM
+  ) {
+    return "ACCEL";
+  }
 
   return "NONE";
 }
```

### 2.2 change24h の扱い 【問題なし】

- run.js は btcSnapshot をそのまま evaluator に渡している。evaluator / shiftTypes は `btcSnapshot?.raw?.change24h` を参照。データソースは一貫して btcSnapshot.raw のみ。矛盾なし。

### 2.3 evaluator / shiftTypes / run.js の参照順 【問題なし】

- evaluator が shiftTypes.classifyShiftType を呼び、thresholds を参照。run.js は evaluator の結果をそのまま snapshot 化し KV に書き、gpt5mini.formatCriticalShiftAlert に渡す。参照順は一致。

### 2.4 DOWN / REVERSAL の条件 【要確認・Low】

- **DOWN**: `whaleDistributionScore >= HIGH && derivativesStressScore >= MEDIUM && (macroRiskOnOff === "RISK_OFF" || panicScore >= MEDIUM || change24h <= -1)`。change24h <= -1 は「下落寄り」の補助条件として妥当。
- **REVERSAL**: bullishReversal / bearishReversal の定義は、仕様書の「反転」の定義と照合する価値あり。現状は change24h の符号と whale 指標の組み合わせで一貫している。

---

## 3. Emergency との役割分離

### 3.1 Emergency と 転換点アラート の判定領域 【問題なし】

- **Emergency** (`logic/deliveryModeEvaluator.js`): trapScore≥60, trapSeverity CRITICAL/HIGH, whale-retail divergence, kimchi premium, liquidity vacuum, ETF shock, miner capitulation, panic+volatility など「即時警告」向け。
- **転換点アラート** (`core/kiba`): 構造的転換（TOP/BOTTOM/UP/DOWN/ACCEL/REVERSAL）のスコアベース判定。閾値は thresholds.js、confidence と suppression window で制御。
- トリガー条件と目的が異なり、重複はない。

### 3.2 deliveryMode と 転換点アラート の責務 【問題なし】

- deliveryMode は「minimal / regular / emergency」の**配信モード**。転換点アラート は**別エンジン**で、cron から `ENABLE_KIBA` 時に `/api/kiba/run` を呼ぶだけ。配信結果は `kibaResult` として返し、Minimal/Regular/Emergency の分岐には直接使っていない。責務の混線なし。

---

## 4. snapshot-native の完全性

### 4.1 Minimal / Regular の snapshot-native 【おおむね問題なし】

- **Regular**: `formatRegularBriefing(snapshotForRegular, targetLang, regularOpts)` で btcSnapshot を渡している（cron.js 957–965行）。snapshot-native になっている。
- **Minimal**: `formatMinimalBriefing(payload, targetLang)`。payload は `btc:snapshot:early` または `btc:snapshot` の実体。minimal-high-quality.*.js の `formatMinimalBriefing` は `snapshot.raw` / `snapshot.trapDetection` / `snapshot.cqDeep` 等を参照し、legacy 形状のフォールバックあり。snapshot-native として扱われている。

### 4.2 legacy minimal.* の残存 【Low】

- **minimal-tg-delivery.js** コメント（3行）: 「cron が KV に書き出す minimal:btc:latest を読んで」とあるが、**cron は minimal:btc:latest に一切書いていない**。実際の読み順は `btc:snapshot:early` → `btc:snapshot` → `minimal:btc:latest`（フォールバックのみ）。ドキュメント・コメントと実装の乖離。
- **推奨**: コメントを「cron が書き出す btc:snapshot:early / btc:snapshot を読んで」に修正。`minimal:btc:latest` は「移行期フォールバック」と明記。

### 4.3 転換点アラート テンプレート 【問題なし】

- 転換点アラート 用の表示は gpt5mini の `formatCriticalShiftAlert(criticalShiftSnapshot, lang)` のみ。snapshot の shiftType / reasons / confidence / btcContext / macroContext を参照しており、kibaSnapshotSchema と一致。

### 4.4 snapshotBuilder と全テンプレート 【問題なし】

- `runStages5And6` は Stage 5 (Gemini) / Stage 6 (Dr.Grok) のみ。macroContext は生成しない。btcSnapshot の組み立ては cron 内の `buildFullSnapshot` で行われ、Stage 5/6 出力（sosovalueArticle, drGrok）は正しくマージされている。

---

## 5. multi-asset snapshot の役割

### 5.1 BTC 以外の「外部文脈」としての扱い 【問題なし】

- run.js は `asset:snapshot:NASDAQ` と `asset:snapshot:GOLD` を取得し、`buildMacroSnapshot()` で nasdaqChange24h / goldChange24h / nasdaqRegime / goldWhaleBias を導出。evaluator の `inferMacroRiskOnOff` も macroSnapshot および btcSnapshot.macroContext を参照。NASDAQ/GOLD はマクロ文脈としてのみ使われている。

### 5.2 転換点アラート の対象が BTC のみ 【問題なし】

- evaluator は btcSnapshot を主入力とし、macroSnapshot は補助。shiftTypes の change24h / trapScore は btcSnapshot 由来。他アセットは 転換点アラート 判定に使われていない。

### 5.3 不要なデータの流入 【問題なし】

- run.js が NASDAQ/GOLD 以外の asset snapshot を取得していない。必要最小限に止まっている。

---

## 6. KV key 設計の整合性

### 6.1 使用されているキーと書き手の対応

| キー | 書き手 | 読み手 | 備考 |
|-----|--------|--------|------|
| `kiba:snapshot:latest` | kibaSnapshotBuilder | run.js (lastKiba), cron (結果参照) | 設計通り |
| `kiba:snapshot:YYYYMMDDHHmm` | kibaSnapshotBuilder | （履歴用） | 設計通り |
| `btc:snapshot:full:latest` | **なし** | run.js (getFirstSnapshot の先頭) | **誰も書いていない** |
| `btc:snapshot` | btcSnapshotWriter (writeFullSnapshot) | run.js, minimal-tg-delivery, BWE 等 | 設計通り |
| `btc:snapshot:early` | btcSnapshotWriter (writeEarlySnapshot) | minimal-tg-delivery, (run.js は参照していない) | 設計通り |
| `asset:snapshot:BTC` | assetSnapshotBuilder (runAssetSnapshot('BTC', btcSnapshot)) | run.js (2番目に試行) | 設計通り |
| `asset:snapshot:NASDAQ` / `GOLD` | assetSnapshotBuilder (cron 経由では定期枠時のみ runAssetSnapshot は BTC) | run.js, BWE 補完時 | NASDAQ/GOLD は cron で明示的に runAssetSnapshot していない可能性あり（要確認） |

### 6.2 問題: btc:snapshot:full:latest が未使用 【High】

- **事実**: `api/kiba/run.js` の `BTC_SNAPSHOT_KEYS = ["btc:snapshot:full:latest", "asset:snapshot:BTC", "btc:snapshot"]`。先頭キー `btc:snapshot:full:latest` を**どこも書き込んでいない**。btcSnapshotWriter は `btc:snapshot` と `btc:snapshot:early` のみ。
- **影響**: getFirstSnapshot は毎回 1 キー目で null を取り、2 キー目または 3 キー目にフォールバックする。デッドコードかつ将来「full:latest を書く」実装を入れた場合の取り違えリスク。
- **推奨**: 
  - 運用上「full」と「early」を分けないなら、`BTC_SNAPSHOT_KEYS` から `btc:snapshot:full:latest` を削除し、`["asset:snapshot:BTC", "btc:snapshot"]` にする。
  - または、cron の writeFullSnapshot で `btc:snapshot:full:latest` にも同じスナップショットを書き、run.js の 1 キー目を有効にする。

### 6.3 NASDAQ/GOLD の asset snapshot が cron で書かれるか 【Medium】

- **事実**: cron では `runAssetSnapshot("BTC", btcSnapshot)` のみ呼んでいる（1312行）。`runAssetSnapshot("NASDAQ")` / `runAssetSnapshot("GOLD")` は cron から呼ばれていない。
- **影響**: run.js が `kv.get("asset:snapshot:NASDAQ")` / `kv.get("asset:snapshot:GOLD")` で取るデータは、別ジョブや手動で書かれていない限り常に null。macro 判定は run.js 内の `inferMacroRiskOnOffFromChanges` に完全依存し、NASDAQ/GOLD の実データが使われない。
- **推奨**: cron の定期枠内で、BTC 書き込み後に `runAssetSnapshot("NASDAQ")` と `runAssetSnapshot("GOLD")` を呼ぶか、別 cron で NASDAQ/GOLD を更新する。そうしない場合は「macro は btc 単体 + 閾値ロジックのみ」と仕様を明文化する。

---

## 7. Cron パイプラインの整合性

### 7.1 流れの整理

1. Stage 1: CQ inflow/mpi, 価格, FNG → market context → trap / snapshot 初期値  
2. writeEarlySnapshot → `btc:snapshot:early`（毎回）  
3. Grok / 深掘り（条件付き）→ イベント駆動判定  
4. Stage 5/6 (runStages5And6) → buildFullSnapshot → (isRegularSlot \|\| force) 時のみ writeFullSnapshot / persistSnapshotToDb / runAssetSnapshot('BTC')  
5. evaluateDeliveryMode(btcSnapshot, …)  
6. ENABLE_KIBA 時は `/api/kiba/run` を HTTP 呼び出し  
7. deliveryMode に応じて REGULAR / EMERGENCY / WATCH / STANDBY_BREAK 配信  

### 7.2 タイミング・競合 【Medium】

- **転換点アラート の実行タイミング**: cron は「配信ブロックの前」に kiba/run を呼んでいる（832–837 行付近の後、配信の前）。run.js が読む KV は、**同じ cron 内で writeFullSnapshot した直後**（regular/force 時）か、**前回の regular で書いた btc:snapshot**（非 regular 時）。  
- 非 regular 時は「最大で定期間隔（例 6h）古い」btc スナップショットで 転換点アラート が評価される。意図であれば「転換点アラート は定期枠データを前提とする」とドキュメントに書くのがよい。
- **minimal-tg-delivery**: 別 cron（8 0,6,12,18 * * *）で実行。読むのは `btc:snapshot:early` または `btc:snapshot`。cron が 0,7,22,37,52 分に動くため、minimal が 8 分に動くときは 0 分 or 6 分等の early/full を読む。race は許容範囲。

### 7.3 Stage1 → early → full → deliveryMode → 転換点アラート の順序 【問題なし】

- 上記の通り、early は Stage 1 直後、full は全 Stage と buildFullSnapshot の後（かつ isRegularSlot \|\| force 時のみ）。deliveryMode は full スナップショットで評価。転換点アラート は full 書き込みの後に呼ばれる。順序は正しい。

---

## 8. gpt5mini のテンプレート整合性

### 8.1 Minimal / Regular / 転換点アラート のテンプレート 【問題なし】

- **Minimal**: gpt5mini の `generateXPost({ mode: "minimal", ... })`。BWE 用。snapshot は btcSnapshot を渡す設計。regimeTone / marketRegime / divergence 等は btcSnapshot から取得。snapshot-native と矛盾なし。
- **Regular**: 同様に `mode: "regular"`。構造テンプレは SYSTEM_PROMPT と MODE_*_USER で定義。snapshot は btcSnapshot。
- **転換点アラート**: `formatCriticalShiftAlert(criticalShiftSnapshot, lang)` は 転換点アラート 用。shiftType / confidence / reasons / btcContext / macroContext を表示。kibaSnapshotSchema の形状と一致。

### 8.2 転換点アラート の shiftType / reasons / confidence の反映 【問題なし】

- run.js は `writeResult.snapshot`（buildCriticalShiftSnapshot の結果）を `formatCriticalShiftAlert(writeResult.snapshot, lang)` に渡している。schema の normalizeShiftType / clampConfidence / reasons がそのまま表示に使われている。

---

## 9. ノイズ・冗長・レガシー

### 9.1 使われていないキー・デッドコード 【High】

- `btc:snapshot:full:latest`: 読み手のみで書き手なし（上記 6.2）。

### 9.2 二重ロジック 【Medium】

- **macroRiskOnOff の導出**: run.js の `inferMacroRiskOnOffFromChanges` と evaluator の `inferMacroRiskOnOff` で類似ロジック。閾値は run.js がハードコード、evaluator が thresholds 参照。統一推奨（1.2 と同じ）。

### 9.3 参照されていない定数・関数 【Low】

- `logic/deliveryModeEvaluator.js`: `computeMetaFlags` の `standbyBreak` / `watch` は evaluateDeliveryMode の戻り meta で返され、cron では deliveryMode の分岐にのみ使用。REGULAR/EMERGENCY 配信の条件には meta が直接使われていないが、テンプレートや将来拡張で使う可能性があるため、現状は許容範囲。

### 9.4 破綻しうる条件分岐 【Low】

- run.js: btcSnapshot が null の場合は evaluator が fallback を返す。KV が一時的に空でも 503 にはせず 200 で evaluation 結果を返す設計。破綻はしにくい。
- minimal-tg-delivery: `btc:snapshot:early` も `btc:snapshot` も無い場合のみ 503。early は毎回書かれるため、cron が動いていれば 503 はレア。

---

## 修正案サマリ（優先度順）

1. **High**
   - **macroContext の一次ソース**: cron で macroContext を組み立て、buildFullSnapshot に渡す。または run.js の「一次ソースは btcSnapshot.macroContext」をやめ、常に run.js 内で NASDAQ/GOLD から組み立てると仕様で明記する。
   - **btc:snapshot:full:latest**: 使用するなら cron/writer で書き、使用しないなら run.js の BTC_SNAPSHOT_KEYS から削除する。

2. **Medium**
   - **macro 判定の一元化**: 閾値とロジックを一モジュールに集約し、run.js / evaluator / BWE から参照する。
   - **shiftType 優先順位**: REVERSAL を ACCEL より先に判定するよう shiftTypes.js を変更（上記 diff）。
   - **NASDAQ/GOLD の KV**: cron または別ジョブで `runAssetSnapshot("NASDAQ")` / `runAssetSnapshot("GOLD")` を実行するか、仕様で「macro は NASDAQ/GOLD KV に依存しない」と明記する。

3. **Low**
   - minimal-tg-delivery のコメントを「btc:snapshot:early / btc:snapshot を読む」に修正し、minimal:btc:latest はフォールバックと明記する。

---

## OS 全体の整合性スコア: **72 / 100**

- **内訳**
  - 血流・データソースの一貫性: 減点（macroContext 未設定・二重管理）
  - 転換点アラート 整合性: 減点（優先順位 ACCEL/REVERSAL、閾値の二重管理）
  - Emergency との分離: 満点
  - snapshot-native: 軽微なコメント乖離のみ
  - multi-asset 役割: 満点
  - KV 設計: 減点（full:latest 未使用、NASDAQ/GOLD 未書き込み）
  - Cron パイプライン: 軽微（非 regular 時の 転換点アラート のデータ鮮度）
  - gpt5mini テンプレート: 満点
  - ノイズ・レガシー: 減点（デッドキー、二重ロジック）

上記の High/Medium 対応後には **85–90** 程度まで引き上げ可能と判断する。
