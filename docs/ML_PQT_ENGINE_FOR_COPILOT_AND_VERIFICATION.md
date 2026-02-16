# ML-PQT Engine 説明ドキュメント（Copilot・検証チーム用）

PDCA を回すための共通理解用。ML-PQT Engine の役割・フロー・主要ファイル・検証ポイントをまとめる。

---

## 1. 概要・目的

**ML-PQT Engine** は、Trap Defence OS の **X（Twitter）向け引用リポスト（PQT = Parasitic Quote Tweet）** を、**市場スナップショット・Fisherman 検出・CTR 学習** に基づいて自動で生成・投稿するエンジンである。

- **やること**: バズっている「釣り師」投稿に寄生する形で、**4要素テンプレ**（Agree / Proof / Soft CTA / Link）の引用リポストを **6言語** で投稿する。
- **やらないこと**: Grok の「投稿数・割合・時間帯」の数字は使わない。通常ポスト（非引用）の量産はしない。固定投稿数・固定スケジュールに依存しない。
- **設計思想**: **1成約 ≒ 5投稿** を目安に、日次ターゲットを 200〜400 のレンジで決定し、trapScore・Fisherman 活動量・API クレジットで cap する。CTR の高いテンプレを優先する簡易バンディットで学習する。

---

## 2. 用語

| 用語 | 意味 |
|------|------|
| **PQT** | Parasitic Quote Tweet。他人の投稿を引用リポストし、その上に Agree / Proof / CTA / Link を載せる形式。 |
| **Fisherman** | 煽り・ hype を含み、エンゲージメントが伸びている投稿（釣り師）。上位 5〜10% のみを寄生対象とする。 |
| **ML-PQT** | 日次ターゲット・時間帯・言語配分を JSON 設定と refinement ルールで決める「機械学習的」な PQT 制御レイヤー。 |
| **trapScore** | BTC スナップショットの罠スコア。high / medium / low で投稿量のレンジ（多め / 少なめ）に反映。 |
| **4要素** | Agree（乗る）→ Proof（1行の構造視点）→ Soft CTA（導線）→ Link（Vidalytics / Whop）。 |

---

## 3. 実行の入口とフロー

### 3.1 入口

- **API**: `GET` または `POST` `/api/buzzweave-run`
- **認証**: `Authorization: Bearer ${CRON_SECRET}` または `?cron_secret=...`
- **Cron**: `vercel.json` で **1日 9回**（UTC 0, 1, 8, 13, 14, 15, 16, 20, 21 時）。1 run あたり **1言語**（`lang` は round-robin または query で指定）。
- **常に PQT-only**: `runBuzzWeaveCycle` は内部で **runBuzzWeaveCyclePqtOnly** に委譲。通常ポスト経路は使わない。

### 3.2 1 run の流れ（要約）

1. KV から **btcSnapshot** 取得。無ければ SKIP。
2. **dailyLimit**（1日の run 上限）を `determineDailyRunTarget(snapshot)` で決定。**low=6, medium=7, high=8**。今日の run 数がこれに達していたら SKIP。
3. **MIN_RUN_INTERVAL_HOURS**（デフォルト 3）を満たしていなければ SKIP。
4. **日次 PQT ターゲット** を `resolveDailyPqtTarget()` で解決（目標成約×投稿/成約 or 固定ターゲット）。**cap** = min(その言語の配分, API_CALL_CAP, MAX_CAP_PER_RUN)。
5. **候補取得**: 1言語で search → Fisherman 検出 → 上位 5〜10% を `selectFishermanSlotsTopPercent` で選択。Tier1→Tier2→Tier3 順・Tier3 は最大 2 件など diversity cap を適用。
6. 各スロットに対して: **buildPqt**（テンプレ選択＋Proof 挿入＋Link）→ **postQuoteTweet** → **recordPqtUse**。cap に達するまで繰り返し。

---

## 4. 主要コンポーネント

### 4.1 ターゲティング（どれだけ・どの言語に）

- **日次ターゲット**: `pqtPlanner.getDailyPqtTargetFromSnapshot(snapshot)` または `resolveDailyPqtTarget()`。200〜400 レンジ。trapScore が high のとき 350〜400 に寄せる。
- **言語配分**: `mlPqtScheduleConfig.js` の **LANGUAGE_ALLOCATION**（EN 40%, ES 20%, PT 15%, AR 10%, KO 8%, JA 7%）。`allocatePqtPerLanguageFromSchedule(snapshot)` で 1 run あたりの cap に反映。
- **1日 run 数**: `autonomousSlotGenerator.determineDailyRunTarget(snapshot)`。ボラティリティで 6 / 7 / 8。Cron は 9 回叩くが、この上限で打ち切り。

### 4.2 スケジュール（時間帯）

- **TIME_DISTRIBUTION**（`mlPqtScheduleConfig.js`）: 00–04 UTC 0.25, 04–08 0.15, 08–12 0.10, 12–16 0.20, 16–20 0.20, 20–24 0.10。
- 実装上は **1 run あたりの cap** が言語別に決まり、Cron の「9回/日」が時間帯の分布に相当。ウィンドウ別 cap は `getCurrentWindowSchedule` 等で参照可能だが、現行 PQT-only では run 単位 cap が主。

### 4.3 コピー（テンプレ・4要素）

- **pqtTemplates.js**: 6言語 × 複数バリアント（CTR 寄り / CVR 寄り等）。各テンプレは **Agree / Proof / Soft CTA / Link** を組み立てる関数。
- **pqtProofSnippet.js**: `buildProofSnippetFromSnapshot(snapshot, lang, slot)` で trap / funding / netflow 等の 1〜2 行を生成。
- **pqtSecretWeapons**: リンク改行・末尾句点削除・Mirror vocab。X Premium で字数制限はかけない。

### 4.4 テンプレ選択（CTR バンディット）

- **pqtCtaEngine.pickTemplateIndex(lang)**: 言語ごとにテンプレ別の uses / clicks を保持し、**CTR = clicks / uses** が最も高いテンプレを優先。未使用テンプレは順に試す。
- **recordPqtUse(lang, templateIndex)**: 投稿時に uses += 1。クリック数は別途（短縮 URL や Whop/Vidalytics）取れれば **recordPqtResult(lang, templateIndex, clicks)** で反映可能。

### 4.5 ガード・抑制

- **緊急停止**: `BUZZWEAVE_EMERGENCY_STOP=true` で即 return。
- **X API blocked**: Supabase の `buzzweave_status.x_api_blocked` が true なら SKIP。
- **daily_limit_reached**: その日の run 数が `determineDailyRunTarget` を超えたら SKIP。
- **interval_not_reached**: 前回 run から MIN_RUN_INTERVAL_HOURS 未満なら SKIP。
- **API_CALL_CAP**: 1 run あたりの投稿数上限（デフォルト 20）。**MAX_CAP_PER_RUN**（100）、火水木の **MAX_CAP_PER_RUN_WARP**（200）でさらに上限制御。
- **Safety guards**: `pqtPlanner.applySafetyAndSaturationGuards` で CTR 急落・停滞・言語過多・テンプレ分散に応じた補正（実装詳細は `ML_PQT_IMPLEMENTATION_PATCH_SPEC.md`）。

---

## 5. キーファイル一覧

| ファイル | 役割 |
|----------|------|
| **api/buzzweave-run.js** | エントリ。認証・KV 取得・dailyLimit/interval チェック・runBuzzWeaveCycle（→ PQT-only）呼び出し。 |
| **services/td/buzzWeaveEngine.js** | runBuzzWeaveCyclePqtOnly。候補取得・allocatePqtPerLanguageFromSchedule・スロット選定・buildPqt・postQuoteTweet・recordPqtUse。 |
| **services/td/pqtPlanner.js** | getDailyPqtTargetFromSnapshot、allocatePqtPerLanguageFromSchedule、applySafetyAndSaturationGuards。 |
| **services/td/mlPqtScheduleConfig.js** | GLOBAL_LIMITS、TIME_DISTRIBUTION、LANGUAGE_ALLOCATION、ML_PQT_REFINEMENT_CONFIG。 |
| **services/td/mlPqtScheduler.js** | getSchedule、refineDailyTarget、adjustLanguageAllocation、adjustWindowIntensities、getCurrentWindowSchedule。 |
| **services/td/pqtCtaEngine.js** | buildPqt、pickTemplateIndex、recordPqtUse / recordPqtResult、getTemplateStats。 |
| **services/td/pqtTemplates.js** | PQT_TEMPLATES（6言語×バリアント）。4要素を組み立てる関数群。 |
| **services/td/pqtProofSnippet.js** | buildProofSnippetFromSnapshot。 |
| **services/td/fishermanDetector.js** | Fisherman 判定、selectFishermanSlotsTopPercent、selectSlotsFallback。 |
| **services/td/fishermanPriority.js** | Tier ランク、orderCandidatesByPerformanceTiers、Tier3 cap。 |
| **services/td/autonomousSlotGenerator.js** | determineDailyRunTarget（6/7/8 runs per day）。 |

---

## 6. 環境変数・設定（主要）

| 変数 | 概要 | デフォルト例 |
|------|------|----------------|
| BUZZWEAVE_EMERGENCY_STOP | true で全 run 停止 | - |
| BUZZWEAVE_PQT_ONLY | PQT-only 有効（常に true 相当で委譲） | true |
| BUZZWEAVE_MIN_RUN_INTERVAL_HOURS | 同一 run 間の最小間隔（時間） | 3 |
| BUZZWEAVE_DAILY_RUN_LOW / MEDIUM / HIGH | 1日の run 上限（low/medium/high ボラ時） | 6 / 7 / 8 |
| BUZZWEAVE_API_CALL_CAP | 1 run あたりの投稿数上限 | 20 |
| BUZZWEAVE_MAX_CAP_PER_RUN | 1 run の絶対上限 | 100 |
| BUZZWEAVE_MAX_CAP_PER_RUN_WARP | 火水木の 2 倍時上限 | 200 |
| BUZZWEAVE_DAILY_CONVERSION_TARGET | 目標成約/日（投稿ターゲット算出用） | 100 |
| BUZZWEAVE_BASE_POSTS_PER_CONVERSION | 1成約あたり投稿数（フェルミ値） | 5 |
| BUZZWEAVE_RUNS_PER_DAY_FOR_TARGET | ターゲットを割る run 数 | 6 |
| BUZZWEAVE_WEEKDAY_WARP | 火水木 2 倍 cap を使うか | 任意 |

---

## 7. 検証・PDCA で見るポイント

- **Run が走っているか**: Cron が 9 回/日で叩いているか。ログで `daily_limit_reached` / `interval_not_reached` / `SKIP_NO_SNAPSHOT` の有無。
- **1 run あたりの投稿数**: cap が API_CALL_CAP（20）や日次ターゲット/run で制限されているか。実際の post 数がログに残っているか。
- **言語ローテーション**: 6言語が round-robin または指定 `lang` で均等に回っているか。
- **テンプレ選択**: pickTemplateIndex が言語ごとに uses/clicks を参照しているか。recordPqtUse が投稿後に呼ばれているか。
- **成約との対応**: 1成約 ≒ 5投稿の設計で、Minimal/Regular の成約数が想定（例: 32成約グロス、7:3 配分）に近いか。Whop Webhook と KV/Supabase の成約集計と突き合わせる。
- **インプレ・CTR**: 投稿数が最大に近い日（例: 160投稿/日）で、期待インプレ 20–30万・CTR 2% 前後と実測のオーダーが合っているか。
- **ガード**: 緊急停止・X API blocked・daily limit・interval が意図どおり効いているか。

---

## 8. 関連ドキュメント

- **BUZZWEAVE_PQT_ONLY_SPEC.md** — PQT-only の禁止事項と 4 要素・CTR 学習の概要。
- **BUZZWEAVE_ML_PQT_SCHEDULE_SPEC.md** — 時間帯・言語配分の数式。
- **BUZZWEAVE_PQT_CTR_DESIGN.md** — CTR 最大化・メインフロー・ファイル一覧。
- **ML_PQT_IMPLEMENTATION_AUDIT.md** — 破綻チェック・軽微な不整合と対応状況。
- **ML_PQT_IMPLEMENTATION_PATCH_SPEC.md** — 実測メトリクス・補正・ガードの仕様。

---

*Copilot と検証チームが PDCA で参照するための共通仕様として利用してください。*
