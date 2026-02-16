# BuzzWeave PQT CTR 最大化ロジック設計（実装レベル）

Grok の「投稿数・割合・時間帯の数字」は**一切使わない**。  
**6言語 × Fisherman 検出 × 市場ボラ × CTR 学習**のみで、1日 200〜350 投稿レンジで CTR 最大化しつつアルゴに溶け込む。

**「いかにクリックさせるか」**（コピー・心理・フォーマット・クリック計測の接続）は別ドキュメントにまとめた → [PQT_CTR_HOW_TO_GET_CLICKS.md](PQT_CTR_HOW_TO_GET_CLICKS.md)。

---

## 1. 全体アーキテクチャ

| 軸 | 関数・モジュール |
|----|------------------|
| **どれだけ撃つか** | `pqtPlanner.decideGlobalPqtRangeFromSnapshot` / `allocatePqtPerLanguage` |
| **どこに撃つか** | `fishermanDetector.selectFishermanSlots`（パターンのみ） |
| **どう書くか（CTR最大化）** | `pqtCtaEngine.buildPqt` ＋ `pqtTemplates` ＋ `templateStats` |

---

## 2. 実装ファイル一覧

| ファイル | 役割 |
|----------|------|
| `services/td/languageConfig.js` | 6言語 weight / tone（EN 1.0, ES/PT 0.9, AR/KO 0.7, JA 0.6） |
| `services/td/pqtPlanner.js` | 200〜350 レンジ決定（trap_score 連動）、言語別配分 |
| `services/td/fishermanDetector.js` | hype ワード＋engagement 閾値で Fisherman 判定、スロット選定 |
| `services/td/pqtTemplates.js` | 6言語 × 2 バリアント（CTR寄り / CVR寄り） |
| `services/td/pqtCtaEngine.js` | テンプレ選択（未使用優先→CTR最大）、buildPqt、recordPqtResult |
| `services/td/pqtProofSnippet.js` | buildProofSnippetFromSnapshot（trap/funding/netflow 1〜2 行） |
| `services/td/pqtRunner.js` | runPqtDay 統合フロー |
| `services/td/mlPqtScheduleConfig.js` | ML-PQT スケジュール JSON + PERFORMANCE_REFINEMENT_CONFIG |
| `services/td/mlPqtScheduler.js` | 日次目標・時間・言語配分＋refineDailyTarget / adjustLanguageAllocation / adjustWindowIntensities |
| `services/td/mlPqtMetrics.js` | 実測メトリクス集約（collectPerformanceMetricsForSnapshot） |
| `services/td/mlPqtNormalizer.js` | 正規化（normalizePerformanceMetrics） |
| `services/td/fishermanPriority.js` | Tier ランク＋updateFishermanTiers / orderCandidatesByPerformanceTiers |

**ML-PQT スケジュール**: 日次目標を OS が 200〜400 で決定し、時間・言語は JSON 比率で配分する場合は `pqtPlanner.getDailyPqtTargetFromSnapshot` / `allocatePqtPerLanguageFromSchedule` および `mlPqtScheduler.getSchedule` を使用。詳細は `docs/BUZZWEAVE_ML_PQT_SCHEDULE_SPEC.md`。

---

## 3. データ構造・入出力

- **snapshot**: `getBtcSnapshot()` 形式（trapScore, fundingRate, netflowState, trap_score_label 等）
- **candidatesByLang**: `{ en: [candidate], ja: [...], ... }`。各 candidate は `post`, `engagementScore`, `cluster`, `dangerLabel` 等（buzzWeave の collectBuzzCandidates 出力と互換）
- **linkResolver(lang, slot)**: 導線 URL を返す。未指定時は `pickBestFunnelLink` で解決
- **CTR フィードバック**: `recordPqtResult(lang, templateIndex, clicks)` でテンプレ別 uses/clicks を記録（現状はメモリ。DB 永続化は別途）

---

## 4. メインフロー（擬似コード）

```
1. snapshot = options.snapshot || getBtcSnapshot()
2. perLangTarget = allocatePqtPerLanguage(snapshot, fisherActivityByLang)
3. for each (lang, targetCount) in perLangTarget:
   a. slots = selectFishermanSlots(candidatesByLang[lang], lang, targetCount)
   b. if slots.length === 0 then slots = selectSlotsFallback(candidates, targetCount)
   c. for each slot in slots:
      - link = linkResolver(lang, slot)
      - proofSnippet = buildProofSnippetFromSnapshot(snapshot, lang, slot)
      - { text, templateIndex } = buildPqt(lang, { coin, proofSnippet, link })
      - postQuoteTweet(text, slot.post.id)
      - recordPqtUse(lang, templateIndex)
```

---

## 5. 既存 BuzzWeave への組み込み

- **現行本番**: `api/buzzweave-run.js` → `runBuzzWeaveCycle`（1 run あたり 1 言語・1 スロット）。
- **PQT フロー**: `runPqtDay` は **candidatesByLang を呼び出し元が用意**する前提。
  - 例: 別 Cron で 6 言語分 `collectBuzzCandidates({ slotLang })` を回し、`candidatesByLang` を組み立ててから `runPqtDay({ snapshot, candidatesByLang, dryRun: false })` を実行。
  - または `api/buzzweave-pqt-run.js` を新設し、内部で 6 言語検索 → candidatesByLang 構築 → runPqtDay 呼び出し（X API 呼び出し回数・レート制限に注意）。
- **X への write**: 既存方針どおり `postQuoteTweet` は `services/x/client.js` 経由で 1 箇所にまとめる。PQT 実行時も同じクライアントを渡す。

---

## 6. CTR ログ記録

- **投稿時**: `recordPqtUse(lang, templateIndex)` で uses += 1。
- **クリック反映**: 導線別クリック数を取得する仕組み（例: 短縮 URL クリックログや Whop/Vidalytics のレポート、または `buzzweave_post_log.our_clicks` を templateIndex 付きで集計）ができたら `recordPqtResult(lang, templateIndex, clicks)` で更新。テンプレ選択が CTR に基づいて最適化される。
- **「いかにクリックさせるか」**（心理・コピー・フォーマット・クリック計測の接続）: [PQT_CTR_HOW_TO_GET_CLICKS.md](PQT_CTR_HOW_TO_GET_CLICKS.md)。

---

## 7. ポイント整理

- **投稿数**: Grok 廃止。trap_score × レンジで 200〜350 を毎日再計算。
- **言語別配分**: LANGUAGE_CONFIG.weight と Fisherman 活動量で自動配分。
- **どこに撃つか**: Fisherman パターン（hype＋engagement 閾値）＋ engagement 降順。不足時はフォールバックで上位候補。
- **どう書くか**: 6言語共通構造テンプレ ＋ 言語別ニュアンス ＋ CTR フィードバックでテンプレ選択を最適化。
- **外部ツール**: 使わず、snapshot / candidatesByLang / linkResolver を渡すシンプル構成。

---

## 8. 実測補正レイヤー（PERFORMANCE_REFINEMENT_CONFIG）

実測メトリクス（CTR・インプレ・言語別・ウィンドウ別・Tier・fisherman 履歴・飽和度）を正規化し、日次ターゲット・言語配分・ウィンドウ強度・Fisherman Tier・ガードに反映する補正レイヤーを追加している。

- **流れ**: 実測取得（mlPqtMetrics）→ 正規化（mlPqtNormalizer）→ 補正（refineDailyTarget / adjustLanguageAllocation / adjustWindowIntensities / updateFishermanTiers）→ ガード（applySafetyAndSaturationGuards）
- **snapshot.performanceMetrics**: `runBuzzWeaveCyclePqtOnly` 内で `collectPerformanceMetricsForSnapshot` により付与（任意）。未取得時は従来どおり trapScore / langStats のみで補正。
- **詳細**: `docs/ML_PQT_IMPLEMENTATION_PATCH_SPEC.md` に JSON ブロックと関数の対応・データ構造・接続ポイントを記載。
