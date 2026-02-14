# Cursor 統合実装ブリーフ — Trap Defence OS

**用途**: この文書を Cursor に渡し、「すべての欠陥を一括で修正し、転換点アラート を商品として Telegram 配信まで完成させる」実装を依頼する。

---

## 確認メッセージ

Trap Defence OS の構造監査に基づく **High / Medium の全項目** と、**商品定義の確定（Minimal / Regular / 転換点アラート、Emergency は deliveryMode のみ）** を、**一括で実装**してください。繰り返しを避け、以下のブリーフとタスクリストに従ってください。

---

## Cursor 実装ブリーフ（Trap Defence OS）

### 目標

- 整合性スコア **72 → 85〜90** に引き上げる。
- **商品ラインナップを Minimal / Regular / 転換点アラート に固定**し、Emergency は deliveryMode（内部モード）としてのみ残す。
- **転換点アラート（商品 転換点アラート）を Telegram 配信まで実装**する。
- **macroContext / macroRiskOnOff / KV / shiftType** の一貫性を OS 全体で完成させる。

### 欠陥リスト（要約・修正対象）

| 重大度 | 内容 |
|--------|------|
| **High** | macroContext が cron の buildFullSnapshot に渡されておらず、btcSnapshot.macroContext が常に null。 |
| **High** | `btc:snapshot:full:latest` を run.js が読むが誰も書いておらずデッドキー。 |
| **High** | 転換点アラート の評価・アラート文はあるが Telegram 配信経路が未実装。 |
| **Medium** | macroRiskOnOff が run.js / evaluator / buzzweave-run で別ロジック・別閾値。 |
| **Medium** | shiftType の優先順位が仕様と逆（ACCEL が REVERSAL より先に判定されている）。 |
| **Medium** | NASDAQ/GOLD の asset snapshot が cron で更新されていない。 |
| **Low** | minimal-tg-delivery のコメントが「minimal:btc:latest を書く」と誤記。 |

### 必要な変更（前回回答・監査から）

1. **転換点アラート を Telegram 商品として完成**  
   cron で `/api/kiba/run` の戻り `dispatchPayload.alerts`（6言語）を、既存の Regular 配信と同じ送信ユーティリティで Telegram に送る。条件: `shiftType !== "NONE"` かつ `confidence >= MIN_CONFIDENCE`（thresholds）。

2. **macroContext の一次ソースを btcSnapshot に統一**  
   cron 内で `runAssetSnapshot("NASDAQ")` / `runAssetSnapshot("GOLD")` を呼び、共通の `buildMacroContextFromAssets({ nasdaqSnapshot, goldSnapshot })` で macroContext を構築し、`buildFullSnapshot({ ..., macroContext })` に渡す。run.js の buildMacroSnapshot は btcSnapshot.macroContext を優先し、無い場合のみ共通関数で補完。

3. **macroRiskOnOff の一元化**  
   新規 `logic/macroRiskEvaluator.js` に `inferMacroRiskOnOff({ nasdaqChange24h, goldChange24h }, thresholds)` を定義（閾値は thresholds.js のみ）。run.js / evaluator / buzzweave-run.js の既存判定をすべてこの関数に置き換える。

4. **shiftType の優先順位**  
   `logic/shiftTypes.js` で **REVERSAL を ACCEL より先に**判定するようブロックの順序を入れ替える（diff は監査レポートまたは下記タスク 4 参照）。

5. **KV の配線**  
   `BTC_SNAPSHOT_KEYS` から `btc:snapshot:full:latest` を削除し、`["asset:snapshot:BTC", "btc:snapshot"]` のみにする。

6. **コメント・ドキュメント**  
   minimal-tg-delivery.js: 「btc:snapshot:early / btc:snapshot を読む。minimal:btc:latest は移行期フォールバック」に修正。TRAP_DEFENCE_UNIFIED_OS_ARCHITECTURE.md: 商品ラインナップを Minimal / Regular / 転換点アラート に統一し、Emergency は deliveryMode としてのみ記述。

---

## 実装タスクリスト（ラベル・コードヒント付き）

| # | ラベル | タスク | ヒント |
|---|--------|--------|--------|
| 1 | 転換点アラート配信 | 転換点アラート を Telegram で配信する | cron.js で kibaResult?.dispatchPayload を検証し、triggered かつ alerts があれば sendMessageToChannel 等で 6 言語分を送る。既存の Regular ブロック付近に「7-D. 転換点アラート」ブロックを追加。 |
| 2 | macroContext | btcSnapshot.macroContext を cron で設定 | cron の isRegularSlot\|\|force ブロック内で runAssetSnapshot("NASDAQ") / runAssetSnapshot("GOLD") を実行。buildMacroContextFromAssets は services/snapshot または logic に配置し、nasdaqRegime / goldWhaleBias / macroRiskOnOff を返す。buildFullSnapshot の引数に macroContext を追加。 |
| 3 | macroRisk一元化 | macroRiskEvaluator.js を作成し全参照を置換 | logic/macroRiskEvaluator.js で MACRO_THRESHOLDS を require し、inferMacroRiskOnOff を export。run.js / evaluator.js / buzzweave-run.js から当該ロジックを削除し、macroRiskEvaluator を require して呼ぶ。 |
| 4 | shiftType順序 | REVERSAL を ACCEL より先に判定 | shiftTypes.js の ACCEL 判定ブロックを REVERSAL ブロックの後ろに移動（監査レポートの diff を適用）。 |
| 5 | KVキー | full:latest を廃止 | api/kiba/run.js の BTC_SNAPSHOT_KEYS を ["asset:snapshot:BTC", "btc:snapshot"] に変更。 |
| 6 | コメント | minimal-tg-delivery とアーキテクチャ doc | ファイル先頭コメントと KV 読み順のコメントを修正。TRAP_DEFENCE_UNIFIED_OS_ARCHITECTURE.md の 0.3.1 表とレイヤー図で商品を Minimal / Regular / 転換点アラート にし、Emergency を「deliveryMode」と注記。 |
| 7 | テスト | 整合性の自動確認 | macroContext が btcSnapshot に含まれること、同一入力で run/evaluator/BWE の macroRiskOnOff が一致すること、REVERSAL/ACCEL 両方条件で REVERSAL が返ること、転換点アラート 発火時に Telegram 送信が呼ばれること、をテストでカバー。 |

---

## そのまま Cursor に投げるプロンプト（統合版）

```
Trap Defence OS の 転換点アラート / macroContext / KV / 配信まわりを、以下の仕様に完全準拠するように修正してください。

1. 商品ラインナップは Minimal / Regular / 転換点アラート。Emergency は deliveryMode としてのみ残し、商品名としては前面に出さない。

2. 転換点アラート を「商品 転換点アラート」として Telegram に配信する。api/kiba/run.js が返す dispatchPayload.alerts（6言語）を、cron 側で Minimal/Regular と同じ送信ユーティリティ（sendMessageToChannel 等）で配信する。条件は shiftType !== "NONE" かつ confidence >= MIN_CONFIDENCE（thresholds.js）。

3. macroContext の一次ソースを btcSnapshot.macroContext に統一する。cron 内で runAssetSnapshot("NASDAQ") / runAssetSnapshot("GOLD") を呼び、共通関数 buildMacroContextFromAssets({ nasdaqSnapshot, goldSnapshot }) で macroContext を構築し、buildFullSnapshot に渡す。run.js の buildMacroSnapshot は btcSnapshot.macroContext を優先し、無い場合のみ共通関数を使う。

4. macroRiskOnOff 判定を logic/macroRiskEvaluator.js に集約する。inferMacroRiskOnOff({ nasdaqChange24h, goldChange24h }, thresholds) を定義し、閾値は thresholds.js のみ参照。run.js / evaluator / buzzweave-run.js の既存判定をすべてこの関数に置き換える。

5. logic/shiftTypes.js で REVERSAL を ACCEL より先に判定するよう、ACCEL ブロックを REVERSAL ブロックの後ろに移動する。

6. api/kiba/run.js の BTC_SNAPSHOT_KEYS から btc:snapshot:full:latest を削除し、["asset:snapshot:BTC", "btc:snapshot"] のみにする。

7. api/minimal-tg-delivery.js のコメントを「btc:snapshot:early / btc:snapshot を読む。minimal:btc:latest は移行期フォールバック」に修正する。

8. docs/TRAP_DEFENCE_UNIFIED_OS_ARCHITECTURE.md を更新し、商品ラインナップを Minimal / Regular / 転換点アラート に統一し、Emergency は deliveryMode としてのみ記述する。

9. 上記変更後、macroContext の存在・macroRiskOnOff の一致・REVERSAL 優先・転換点アラート 配信呼び出し・KV キー削除の確認を含むテストを追加する。

以上の変更を一括で実装し、Trap Defence OS の整合性スコアを 72 から 85〜90 レベルに引き上げてください。
```

---

*このブリーフは docs/TRAP_DEFENCE_OS_STRUCTURAL_AUDIT_REPORT.md およびユーザー指定の定義・タスクリストを統合したものです。*
