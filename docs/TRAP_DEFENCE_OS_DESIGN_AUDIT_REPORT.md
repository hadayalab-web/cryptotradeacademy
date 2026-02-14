# Trap Defence OS（BTC版）構造監査レポート

**監査日**: 2026-02-14  
**対象**: Trap Defence BTC Minimal / Regular / KIBA、BuzzWeave Engine、snapshot・evaluator・macroContext・cron、CQ クライアント、kiba/run 認証、dispatchPayload.alerts、KV、validate-trap-defence-os.js、health-check-external-deps.js  
**評価基準**: 設計としての完成度（OS として壊れないか）。主観・美学ではなく**実装に基づく**。

---

## 総合スコア: **86 / 100**（初回監査）

| # | 評価軸 | スコア | 備考 |
|---|--------|--------|------|
| 1 | 構造整合性 | 9/10 | snapshot → evaluator → delivery の血流は破綻していない |
| 2 | 責務分離 | 9/10 | Minimal / Regular / KIBA の役割はコード上明確 |
| 3 | 外部依存の扱い | 9/10 | CQ 404・kiba 401・BWE 投稿の耐障害性が実装されている |
| 4 | 時間軸の一貫性 | 8/10 | cron / macroContext / snapshot は regular 時は同期。非 regular 時は kiba が古い btc を読む設計 |
| 5 | KV キーの一貫性と安全性 | 9/10 | キー設計は統一、full:latest 廃止済み、読み順が明文化されている |
| 6 | 発火条件の妥当性 | 9/10 | KIBA の level / score / suppression が閾値と整合 |
| 7 | 多言語配信の実装 | 9/10 | dispatchPayload.alerts 6 言語・formatCriticalAlert・送信経路が一致 |
| 8 | 拡張性 | 7/10 | NASDAQ/GOLD はあるが、ETH 等の資産追加はキー・パイプラインの拡張が未整備 |
| 9 | 可観測性 | 8/10 | validate 12 項目・health-check 3 項目・ログあり。本番 401/404/実投稿は要手動確認 |
| 10 | 商品性 | 9/10 | Minimal / Regular / KIBA の線引きが deliveryMode と分岐に反映されている |

---

## 改定スコア（3項目実装後）: **88 / 100**

**反映した実装**（時間軸の正式仕様・拡張性 ETH 抽象化・可観測性 /api/health）

| # | 評価軸 | 初回 | 改定 | 理由 |
|---|--------|------|------|------|
| 1 | 構造整合性 | 9 | 9 | 変更なし |
| 2 | 責務分離 | 9 | 9 | 変更なし |
| 3 | 外部依存の扱い | 9 | 9 | 変更なし |
| 4 | **時間軸の一貫性** | 8 | **9** | KIBA の「regular スロットで更新された btc:snapshot 前提」をアーキテクチャに正式明記。非 regular 時の役割を仕様として確定 |
| 5 | KV キーの一貫性と安全性 | 9 | 9 | 変更なし |
| 6 | 発火条件の妥当性 | 9 | 9 | 変更なし |
| 7 | 多言語配信の実装 | 9 | 9 | 変更なし |
| 8 | **拡張性** | 7 | **8** | readAssetSnapshot / writeAssetSnapshot、KIBA asset 対応、KV 命名規則（kiba:snapshot:${ASSET}:latest）、ENABLE_ETH で runAssetSnapshot("ETH") を実装。deliveryMode/KIBA の ETH 配信は段階2のため 9 は未付与 |
| 9 | **可観測性** | 8 | **9** | /api/health で CQ・kiba・BWE・cron・KV を一括確認可能。kiba/cron/BWE の health KV 書き込みで「死んだ瞬間に分かる」運用が可能に |
| 10 | 商品性 | 9 | 9 | 変更なし |

**最終スコア: 88 / 100**（86 → +2）。時間軸の明文化・拡張性の土台・運用レベルの可観測性により、設計としての完成度が上がった状態。

---

## 1. 構造整合性（9/10）

**確認した実装**

- **cron**: Stage1（inflow/mpi）→ buildFullSnapshot(macroContext) → writeFullSnapshot / persistSnapshotToDb → evaluateDeliveryMode → ENABLE_KIBA 時に POST /api/kiba/run → kibaResult.dispatchPayload.alerts を sendMessageToChannel で送信。deliveryMode が regular なら REGULAR ブロックで 6 言語配信、minimal なら early return で送信スキップ。
- **minimal-tg-delivery.js**: KV から `btc:snapshot:early` → `btc:snapshot` → `minimal:btc:latest` の順で取得し、formatMinimal で 6 言語配信。cron が書く early/full を読む設計。
- **kiba/run.js**: KV から BTC / NASDAQ / GOLD / lastKiba 取得 → buildMacroSnapshot（btcSnapshot.macroContext 優先）→ runKibaEngine → triggered 時は buildAndWriteKibaSnapshot と dispatchPayload.alerts 生成。

**Good**

- snapshot の生成（buildFullSnapshot / buildEarlySnapshot）→ deliveryMode 評価 → 配信分岐が一連の流れで繋がっている。
- KIBA は「評価・KV 保存・多言語アラート生成」を run.js で完結させ、cron は「呼び出しと dispatchPayload の送信」のみで責務が分かれている。

**Issues**

- Minimal は別 API（minimal-tg-delivery）で別 Cron 想定のため、「cron 一本の血流」からは外れる。設計意図どおりだが、監査観点では「一つの cron 内で完結する流れ」とは別経路である点のみ注意。

**Fixes**

- 特になし。現状で構造は破綻していない。

---

## 2. 責務分離（9/10）

**確認した実装**

- **deliveryModeEvaluator.js**: `evaluateDeliveryMode` は `force → regular_slot → event_driven regular → minimal` の優先順位。Emergency は廃止（コメントで「内部エンジンと役割が被るため外部通知ゼロに統一」）。
- **cron.js**: deliveryMode が `minimal` のときは `!force && !isRegularSlot` で early return し、REGULAR ブロックに入らない。KIBA は ENABLE_KIBA と triggered と dispatchPayload.alerts が揃ったときのみ送信。
- **buzzWeaveEngine.js**: 引用リポスト最適化エンジン。cron の Minimal/Regular/KIBA 配信とは別エンドポイント（buzzweave-run）で実行。

**Good**

- Minimal（無料・短い配信）、Regular（有料・定期＋イベント駆動）、KIBA（転換点アラート・発火時のみ）が分岐条件とブロックで明確に分かれている。
- Emergency は deliveryMode として返さず、商品ラインナップから外れている。

**Issues**

- なし（実装と設計ドキュメントの「Minimal / Regular / 転換点アラート」の三本立てが一致している）。

**Fixes**

- 特になし。

---

## 3. 外部依存の扱い（9/10）

**確認した実装**

- **CQ 404**: `services/cryptoquant/client.js` で `response.status === 404` または `error.message` に "404" を含む場合は throw せず `return null`。`services/cryptoquant/endpoints/btc.js` の `getExchangeInflow` / `getMinerPositionIndex` は try/catch で null または throw 時に `{ value: 0, raw: {} }` を返し Stage1 が null にならない。cron では CQ 取得を try/catch で囲み `inflow = Number(inflowData?.value ?? 0) || 0`、`mpi = Number(mpiData?.value ?? 0) || 0` でフォールバック。
- **kiba 401**: `api/kiba/run.js` で `CRON_SECRET` を参照し、`Authorization: Bearer CRON_SECRET` または query/body の `cron_secret` で一致時のみ 200。cron は `Authorization: Bearer ${cronSecret}` と `cron_secret` を query と body の両方で送っている。
- **BWE 実投稿**: `runBuzzWeaveCycle(options)` で `options.postQuoteTweet` を注入可能。未指定時は `postQuoteTweetDefault`（x/client）。投稿成功時に `[BuzzWeave] post success` 相当のログ。`scripts/test-buzzweave-post.js` でモック差し替えを検証可能。

**Good**

- CQ 404 でパイプラインが落ちない。kiba は認証ミスマッチ時 401 を返し、cron と認証方式が揃っている。BWE はテスト可能でログで成功を確認できる。

**Issues**

- health-check-external-deps.js は「認証ロジックの有無」「CQ ディレクトリ存在」「BWE が X 経路を参照しているか」の静的確認のみ。実際の 401/404/実投稿は本番 or ステージングでの確認が別途必要と doc に明記されている。

**Fixes**

- 運用で定期的に正しい Bearer で kiba/run を叩き 200 を確認する。必要なら `/api/health` から health-check を呼び、失敗時はアラートに繋げる。

---

## 4. 時間軸の一貫性（8/10）

**確認した実装**

- **regular 時**: cron 内で `runAssetSnapshot("NASDAQ")` / `runAssetSnapshot("GOLD")` → `buildMacroContextFromAssets` → `buildFullSnapshot({ ..., macroContext })` → `writeFullSnapshot(kv, btcSnapshot)` → その後 `POST /api/kiba/run`。kiba/run は KV から `asset:snapshot:BTC` / `btc:snapshot` を読む。同一 cron 内で write した直後に read するため、kiba が読む btcSnapshot はこの run で書き込んだもの（macroContext 入り）になる。
- **非 regular 時**: NASDAQ/GOLD は走らない。macroContext は buildFullSnapshot に渡されず null。writeFullSnapshot も実行されない。kiba/run は「前回の regular で書かれた btc:snapshot」を読むため、最大で定期間隔（例 6h）分古いデータで転換点アラートが評価される。TRAP_DEFENCE_OS_STRUCTURAL_AUDIT_REPORT で「意図であればドキュメントに書くのがよい」とある通り、設計として許容されている。

**Good**

- regular 時は「NASDAQ/GOLD → macroContext → full snapshot → KV 書込 → kiba がその KV を読む」で時間軸が揃っている。

**Issues**

- 非 regular 時の kiba は古い btc で評価される。転換点アラートを「定期枠データ前提」とするなら、仕様として明文化するとよい。

**Fixes**

- アーキテクチャ doc に「転換点アラートは定期枠（isRegularSlot or force）で更新された btc:snapshot を前提とする。非 regular 時は前回 regular のスナップショットで評価する」と追記する。

---

## 5. KV キーの一貫性と安全性（9/10）

**確認した実装**

- **btcSnapshotWriter.js**: `BTC_SNAPSHOT_EARLY_KV_KEY`（btc:snapshot:early）、`BTC_SNAPSHOT_KV_KEY`（btc:snapshot）のみ書き込み。TTL 1200 秒。
- **btcSnapshotSchema.js**: `btc:snapshot`, `btc:snapshot:early` を定義。
- **kiba/run.js**: `BTC_SNAPSHOT_KEYS = ["asset:snapshot:BTC", "btc:snapshot"]`。`btc:snapshot:full:latest` は含まれていない（validate で検証済み）。
- **kibaSnapshotSchema.js**: `kiba:snapshot:latest`、履歴は `kiba:snapshot:YYYYMMDDHHmm`。
- **minimal-tg-delivery.js**: コメントで「btc:snapshot:early / btc:snapshot を読む。minimal:btc:latest は移行期フォールバック」と明記。読み順は early → full → minimal:btc:latest。

**Good**

- 誰も書かない `btc:snapshot:full:latest` は削除され、読み手と書き手のキーが一致している。KIBA 履歴キーも一貫した命名。

**Issues**

- 特になし。

**Fixes**

- 特になし。

---

## 6. 発火条件の妥当性（9/10）

**確認した実装**

- **kiba_engine.js**: `evaluateKibaImpact(score)` で 85+ → CRITICAL、75+ → HIGH、65+ → ELEVATED、それ以外 → NONE。`triggered = (CRITICAL|HIGH|ELEVATED) && kibaScore >= 65`。直近 1 時間以内に lastKibaSnapshot があれば triggered を false に（SUPPRESSION_WINDOW_MS）。`applySuppressionFilters` で CQ なし・X ボリューム低・低ボラ・ホエール偏り小のときはスコアを 30 以下にキャップ。
- **kiba_trigger.js**: スコアから level / intensity を返す。閾値は 65/75/85。

**Good**

- impact.level とスコア閾値が一致し、サプレッションとスコアキャップで誤検出抑制がかかっている。

**Issues**

- 閾値が kiba_engine / kiba_trigger に分散している。将来的に thresholds.js に集約すると変更が追いやすい。

**Fixes**

- 任意。現状でも妥当性は満たしている。

---

## 7. 多言語配信の実装（9/10）

**確認した実装**

- **api/kiba/run.js**: `ALERT_LANGS = ["en", "ja", "es", "ko", "pt-br", "ar"]`。triggered 時に `dispatchPayload.alerts` を `ALERT_LANGS.reduce` で `formatCriticalAlert(writeResult.snapshot, lang)` により生成。
- **cron.js**: `ALERT_LANGS` と同じ 6 言語をループし、`kibaResult.dispatchPayload.alerts[lang]` を `sendMessageToChannel(text, "BTC", marketCode)` で送信。text が無い lang は continue。
- **gpt5mini.js**: `formatCriticalAlert(snapshot, lang)` で level / btcContext / macroContext を参照し多言語文を生成。

**Good**

- run.js が生成する alerts のキーと、cron が送信する言語が一致。Minimal / Regular も SUPPORTED_LANGS で 6 言語対応。

**Issues**

- なし（実装の正しさは満たしている）。

**Fixes**

- 特になし。

---

## 8. 拡張性（7/10）

**確認した実装**

- **assetSnapshotBuilder**: `runAssetSnapshot("BTC"|"NASDAQ"|"GOLD")` が存在。asset 単位のスナップショット書き込みは可能。
- **KV キー**: `asset:snapshot:BTC` など asset プレフィックスはあるが、cron / deliveryMode / kiba は BTC 前提の btcSnapshot とチャンネル（getMarketCode 等）に紐づいている。
- **BWE**: ポスト検索・スロット・引用リポストは X 中心で、資産キーは直接は見えない。

**Good**

- NASDAQ/GOLD による macroContext は既に別資産を取り込んでいる。閾値は logic/macroRiskEvaluator や thresholds に集約されている部分はある。

**Issues**

- ETH 版を同じ OS に載せるには、btcSnapshot に相当する ethSnapshot、deliveryMode の資産引数、KV キー（asset:snapshot:ETH 等）、KIBA 用の別エンジン or 資産パラメータ化が必要。現状は「BTC 版として完成」であり、マルチ資産は設計の拡張が未整備。

**Fixes**

- ETH 対応時は「資産を引数化した snapshot ビルダー」「asset を渡す deliveryMode」「KV キー命名規則の拡張」を設計し、cron の分岐か別 cron で資産を切り替える形が考えられる。

---

## 9. 可観測性（8/10）

**確認した実装**

- **validate-trap-defence-os.js**: macroRiskEvaluator の export、macroRiskOnOff の閾値一致、kiba run の BTC_SNAPSHOT_KEYS（full:latest なし・asset/BTC と btc:snapshot あり）、minimal-tg-delivery のコメント、cron の macroContext 渡し・buildMacroContextFromAssets・dispatchPayload と sendMessageToChannel の有無を検証。計 12 項目（各ブロック 2 assert）。
- **health-check-external-deps.js**: kiba の CRON_SECRET/Bearer/cron_secret チェックの有無、CQ サービスディレクトリ存在、BWE の postTweet/postQuote/client 参照の有無を確認。3 項目。末尾に「401/404/実投稿は本番 or ステージングで要確認」と明記。
- **ログ**: kiba/run は 200 時 `[kiba/run] 200 OK (triggered=...)`、401 時は Unauthorized をログ。cron は `[kiba] Run completed: { triggered, level }`。BWE は投稿成功時に REPOSTED と tweet id をログ。

**Good**

- 構造の整合性は validate で自動チェックできる。外部依存の「コード上の存在」は health-check で確認できる。ログで kiba 発火有無と BWE 投稿有無を追える。

**Issues**

- 実際の 401/404/実投稿はスクリプトでは検証しておらず、本番 or ステージングでの手動 or 定期チェックが必要。

**Fixes**

- 本番で定期的に「Bearer 付き kiba/run → 200」「CQ エンドポイント → 200 or 404 時のフォールバック」「BWE 実投稿ログ」を確認する。必要なら /api/health から health-check を呼び、失敗時はアラート通知する。

---

## 10. 商品性（9/10）

**確認した実装**

- **deliveryMode**: minimal / regular のみ返す（emergency は廃止）。force → regular_slot → event_driven regular → minimal の優先順位。
- **cron**: deliveryMode === "minimal" かつ !force かつ !isRegularSlot のときは REGULAR ブロックに入らず early return。KIBA は「転換点アラート」として triggered 時のみ 6 言語送信し、Minimal/Regular の分岐とは独立したブロックで実行。
- **商品の線引き**: Minimal = 無料・短い配信（別 API）。Regular = 有料・定期＋イベント駆動。転換点アラート = 発火時のみの 6 言語アラート。BWE = 引用リポスト（ブリーフィングとは別商品）。

**Good**

- コード上で「Minimal / Regular / 転換点アラート」の三本立てと、Emergency を商品として前面に出さない方針が一致している。

**Issues**

- なし。

**Fixes**

- 特になし。

---

## Good（良い点）まとめ

1. **血流の一貫性**: snapshot 構築 → deliveryMode 評価 → 配信分岐 → KIBA 評価・配信が途切れず繋がっている。
2. **責務の分離**: Minimal / Regular / KIBA / BWE が分岐とブロックで明確に分かれており、Emergency は廃止されている。
3. **外部依存の耐障害**: CQ 404 で null/0 フォールバック、kiba 認証統一、BWE の postQuoteTweet 差し替えとログで運用しやすい。
4. **KV 設計**: 書き手と読み手のキーが一致し、full:latest 廃止と読み順の明文化がされている。
5. **KIBA 発火条件**: level・スコア・サプレッション・スコアキャップが閾値と整合している。
6. **多言語**: dispatchPayload.alerts の 6 言語と formatCriticalAlert・sendMessageToChannel が一致している。
7. **検証**: validate で 12 項目、health-check で 3 項目の静的チェックが用意されている。
8. **商品性**: deliveryMode と early return により、Minimal / Regular / 転換点アラートの線引きがコードに反映されている。

---

## Issues（問題点）まとめ

1. **時間軸**: 非 regular 時、kiba が読む btc は前回 regular まで古くなる。仕様として明文化されていない。
2. **拡張性**: ETH 等の他資産を同じ OS で扱うためのキー・パイプライン・delivery の拡張が未整備。
3. **可観測性**: 401/404/実投稿の「実際の成否」は validate/health-check では検証しておらず、本番 or ステージングでの確認が別途必要。

---

## Fixes（修正提案）まとめ

1. **ドキュメント**: アーキテクチャ doc に「転換点アラートは定期枠で更新された btc:snapshot を前提とする。非 regular 時は前回 regular のスナップショットで評価する」と追記する。
2. **運用**: 本番で定期的に、Bearer 付き kiba/run の 200、CQ 404 時のフォールバック動作、BWE 実投稿ログを確認する。必要なら /api/health から health-check を呼び失敗時はアラートに繋げる。
3. **拡張時**: ETH 対応時は、資産を引数化した snapshot ビルダー・deliveryMode・KV キー命名を設計し、cron の分岐または別 cron で資産を切り替える。

---

## 最終判定：この設計は商品として成立するか

**結論: はい、成立する。**

- **Minimal / Regular / 転換点アラート** の三商品は、deliveryMode と分岐でコードに反映され、配信経路が混線していない。
- **外部依存**（CQ / kiba 認証 / BWE）はフォールバックと認証統一・差し替え可能設計で、OS が一箇所の障害で止まりにくい。
- **KV と発火条件** は一貫しており、validate で構造の整合性を確認できる。
- 残るリスクは「非 regular 時の kiba のデータ鮮度」と「本番での 401/404/実投稿の実確認」であり、いずれも仕様明記と運用でカバー可能。

総合 **86 点** は、設計としての完成度が高く、商品として運用可能な水準にあることを示している。拡張性と可観測性の改善で、さらに安定運用と将来のマルチ資産対応がしやすくなる。
