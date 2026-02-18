# PQT 言語別配分・スケジュール・有料導線 監査メモ

**実施日**: 3パターン集約・Jitter 実装後の整合性確認。  
**結論**: 言語別リプライ配分・スケジュール・有料版（Regular）導線のロジックは **壊れていない**。

---

## 1. 言語別のリプライ配分

| 要素 | 場所 | 状態 |
|------|------|------|
| **1 run = 1 言語** | `api/buzzweave-run.js` | `langFilter` はクエリ `?lang=xx` / `getLangByUtcHour()` / 分単位 round-robin のいずれか。1回の呼び出しで1言語のみ。 |
| **候補の言語** | `buzzWeaveEngine.js` | `collectBuzzCandidates({ slotLang: langFilter })` → `fetchCandidatesFromSearch(slotLang)` → `buildSearchQueries(slotLang)` で**検索クエリが言語別**。取得候補はその言語の投稿中心。 |
| **本文の言語** | `buildPqt(langFilter, { ... })` | 常に `langFilter` でテンプレ・CTA・プロモ行・希少性を選択。リプライ文言はその言語に統一。 |
| **cap（本数/run）** | `runBuzzWeaveCyclePqtOnly` | `perLang = allocatePqtPerLanguageFromSchedule(snapshot)` で言語別日次目標を取得。`BUZZWEAVE_USE_LANG_SPECIFIC_CAP` 時は `cap = perLang[langFilter]`、否则は `dailyTarget / RUNS_PER_DAY_FOR_TARGET`。 |

**結論**: 配分ロジックは変更しておらず、3パターン/Jitter の追加の影響なし。

---

## 2. 言語別のリプライスケジュール・数確保

| 要素 | 場所 | 状態 |
|------|------|------|
| **日次ターゲット** | `pqtPlanner.js` | `allocatePqtPerLanguageFromSchedule(snapshot)` が `mlPqtScheduleConfig.LANGUAGE_ALLOCATION`（share_ratio）と `getDailyPqtTargetFromSnapshot` から `perLangTargets` を算出。 |
| **UTC→言語** | `buzzweave-run.js` | `getLangByUtcHour()`（中身は `buzzWeaveSchedulePlan` → `mlPqtScheduleConfig.STRATEGIC_UTC_TO_LANG`）で「今の UTC 時間」に対応する言語を決定。 |
| **run 間隔** | `buzzweave-run.js` | `CAMPAIGN_PAID_FOCUS` 時は 15分 or 1h、否则は 3h。`MIN_RUN_INTERVAL_MS` で連続 run を抑制。 |
| **日次 run 数** | `buzzWeaveSchedulePlan.js` | `BUZZWEAVE_RUNS_PER_DAY_FOR_TARGET`（キャンペーン時は 96 or 24）。Cron がこの間隔で `/api/buzzweave-run` を叩く想定。 |

**結論**: スケジュール・数確保は `pqtPlanner` / `mlPqtScheduleConfig` / `buzzWeaveSchedulePlan` に集約されており、PQT 本文側の変更の影響なし。

---

## 3. 言語別の有料版（Regular Briefing）導線への集中

| 要素 | 場所 | 状態 |
|------|------|------|
| **キャンペーン時** | `buzzWeaveEngine.js` | `CAMPAIGN_PAID_FOCUS=true` のとき `link = getWhopProductUrl(langFilter)`、`funnelType = "whop_regular"`。**6言語×Whop 有料版に固定**。 |
| **リンクの言語** | `services/telegram/whop-links.js` | `getWhopProductUrl(lang)` が言語別 Whop URL を返す。`langFilter` をそのまま渡しているため言語と一致。 |
| **本文・プロモ** | `buildPqt` / `pqtTemplates.js` | `resolveCta(lang, "whop_regular", 0)`、`getPromoLine(langFilter)`、`getScarcityLine(langFilter, ...)` で**言語別の Regular 用コピー**を使用。 |
| **非キャンペーン時** | `buzzWeaveEngine.js` | `pickBestFunnelLink` or `pickVidalyticsLink(langFilter, "regular")`。Regular 導線は維持。 |

**結論**: 有料版（Regular）導線は `CAMPAIGN_PAID_FOCUS` 時に Whop Regular に集中し、言語別リンク・文言とも整合している。

---

## 参照

- 言語スケジュール根拠: `docs/BUZZWEAVE_STRATEGIC_LANG_SCHEDULE_RATIONALE.md`
- キャンペーン導線: `docs/CAMPAIGN_72H_PAID_FOCUS.md`
- PQT 設計: `docs/PQT_DESIGN_BASED_ON_GEMINI_ANALYSIS.md`
