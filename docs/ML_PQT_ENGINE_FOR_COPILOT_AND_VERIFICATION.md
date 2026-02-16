# ML-PQT Engine 説明ドキュメント（Copilot・検証チーム用）

PDCA を回すための共通理解用。ML-PQT Engine の役割・フロー・主要ファイル・検証ポイントをまとめる。

---

## 1. 概要・目的

**ML-PQT Engine** は、Trap Defence OS の **X（Twitter）向け引用リポスト（PQT = Parasitic Quote Tweet）** を、**市場スナップショット・Fisherman 検出・CTR 学習** に基づいて自動で生成・投稿するエンジンである。

- **やること**: バズっている「釣り師」投稿に寄生する形で、**4要素テンプレ**（Agree / Proof / Soft CTA / Link）の引用リポストを **6言語** で投稿する。
- **やらないこと**: Grok の「投稿数・割合・時間帯」の数字は使わない。通常ポスト（非引用）の量産はしない。固定投稿数・固定スケジュールに依存しない。
- **設計思想**: **1成約 ≒ 5投稿** を目安に、日次ターゲットを 200〜400 のレンジで決定し、trapScore・Fisherman 活動量・API クレジットで cap する。CTR の高いテンプレを優先する簡易バンディットで学習する。
- **コピー設計**: 投稿した分だけ反応（インプレ・エンゲージメント）が返ってくる前提のコピーが搭載されている。投稿量を増やせば反応もスケールする設計。

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
- **Cron**: `vercel.json` で **1日 8回**（UTC **0, 3, 6, 9, 12, 15, 18, 21** 時・3h 等間隔）。1 run あたり **1言語**（`lang` は round-robin または query で指定）。スケジュール根拠は「3.4 投稿スケジュールの根拠」を参照。
- **常に PQT-only**: `runBuzzWeaveCycle` は内部で **runBuzzWeaveCyclePqtOnly** に委譲。通常ポスト経路は使わない。

### 3.2 1 run の流れ（要約）

1. KV から **btcSnapshot** 取得。無ければ SKIP。
2. **dailyLimit**（1日の run 上限）を `determineDailyRunTarget(snapshot)` で決定。**low=6, medium=7, high=8**。Cron は 8 回/日なので high 時は全 run 実行。今日の run 数が dailyLimit に達していたら SKIP。
3. **MIN_RUN_INTERVAL_HOURS**（デフォルト 3）を満たしていなければ SKIP。
4. **日次 PQT ターゲット** を `resolveDailyPqtTarget()` で解決（目標成約×投稿/成約 or 固定ターゲット）。**cap** = min(その言語の配分, API_CALL_CAP, MAX_CAP_PER_RUN)。
5. **候補取得**: 1言語で search → Fisherman 検出 → 上位 5〜10% を `selectFishermanSlotsTopPercent` で選択。Tier1→Tier2→Tier3 順・Tier3 は最大 2 件など diversity cap を適用。
6. 各スロットに対して: **buildPqt**（テンプレ選択＋Proof 挿入＋Link）→ **postQuoteTweet** → **recordPqtUse**。cap に達するまで繰り返し。

### 3.3 投稿スケジュールの根拠

- **Cron 時刻**: UTC 0, 3, 6, 9, 12, 15, 18, 21（**3 時間等間隔・8 run/日**）。X のエンゲージメントは「現地 8–9 時前後の朝」にピークが出やすいという一般的な知見に合わせ、全球（EN/ES/PT/AR/KO/JA）でいずれかのタイムゾーンの朝〜昼に当たるように均等にばらした。
- **TIME_DISTRIBUTION**（`mlPqtScheduleConfig.js`）: 00–04 UTC をやや強め（アジア朝）、12–16 UTC を強め（米国朝・欧州昼）、16–20 を強め（米国昼・中南米）。それ以外はやや弱め。合計 1.0 で日次ターゲットを 6 ウィンドウに配分。
- **RUNS_PER_DAY_FOR_TARGET**: デフォルト 8（Cron の実行回数と一致）。日次ターゲットを 8 で割って 1 run あたりの cap を算出。

### 3.4 Vercel でのドライラン手順

本番／プレビュー環境で **投稿せず** 候補取得・スロット選定・サンプル生成まで実行して動作確認するには、`dry_run=true` を付けて呼ぶ。

- **URL**: `GET https://<your-app>.vercel.app/api/buzzweave-run?dry_run=true`
- **認証**: Vercel に `CRON_SECRET` を設定している場合は必須。`Authorization: Bearer <CRON_SECRET>` または `?cron_secret=<CRON_SECRET>`。
- **オプション**: `?lang=en` で言語固定。`dry_run=1` も有効。

**curl 例（CRON_SECRET あり）:**

```bash
curl -s -H "Authorization: Bearer YOUR_CRON_SECRET" \
  "https://your-app.vercel.app/api/buzzweave-run?dry_run=true&lang=en"
```

**注意**

- ドライラン時は **X への投稿は一切行わない**（`postQuoteTweet` は呼ばれず、`recordPqtUse` とサンプル用ログのみ）。ログは Vercel Dashboard → Project → Logs で確認。`[buzzweave-run] dry_run=true` および `[BuzzWeave] buildAndPostFromSlot dryRun` 等が出力される。

---

## 4. 主要コンポーネント

### 4.1 ターゲティング（どれだけ・どの言語に）

- **日次ターゲット**: `pqtPlanner.getDailyPqtTargetFromSnapshot(snapshot)` または `resolveDailyPqtTarget()`。200〜400 レンジ。trapScore が high のとき 350〜400 に寄せる。
- **言語配分**: `mlPqtScheduleConfig.js` の **LANGUAGE_ALLOCATION**（EN 40%, ES 20%, PT 15%, AR 10%, KO 8%, JA 7%）。`allocatePqtPerLanguageFromSchedule(snapshot)` で 1 run あたりの cap に反映。
- **1日 run 数**: `autonomousSlotGenerator.determineDailyRunTarget(snapshot)`。ボラティリティで 6 / 7 / 8。Cron は 8 回/日で叩き、この上限で打ち切り。

### 4.2 スケジュール（時間帯）

- **TIME_DISTRIBUTION**（`mlPqtScheduleConfig.js`）: 00–04 UTC 0.20, 04–08 0.18, 08–12 0.12, 12–16 0.22, 16–20 0.18, 20–24 0.10（全球ピーク考慮・3.3 参照）。
- 実装上は **1 run あたりの cap** が言語別に決まり、Cron の「8回/日」が時間帯の分布に相当。ウィンドウ別 cap は `getCurrentWindowSchedule` 等で参照可能だが、現行 PQT-only では run 単位 cap が主。

### 4.3 コピー（テンプレ・4要素）

- **pqtTemplates.js**: 6言語 × 複数バリアント（CTR 寄り / CVR 寄り等）。各テンプレは **Agree / Proof / Soft CTA / Link** を組み立てる関数。
- **pqtProofSnippet.js**: `buildProofSnippetFromSnapshot(snapshot, lang, slot)` で trap / funding / netflow 等の 1〜2 行を生成。
- **pqtSecretWeapons**: リンク改行・末尾句点削除・Mirror vocab。X Premium で字数制限はかけない。

### 4.4 テンプレ選択（CTR バンディット）

- **pqtCtaEngine.pickTemplateIndex(lang)**: 言語ごとにテンプレ別の uses / clicks を保持し、**CTR = clicks / uses** が最も高いテンプレを優先。未使用テンプレは順に試す。
- **recordPqtUse(lang, templateIndex)**: 投稿時に uses += 1。クリック数は別途（短縮 URL や Whop/Vidalytics）取れれば **recordPqtResult(lang, templateIndex, clicks)** で反映可能。

### 4.5 ガード・抑制

- **投稿を止めるブロックは使わない**。暴走しない設計（Cron 1日8回・3h間隔・日次上限）のため、402 が出てもその run だけ失敗し、次回は通常どおり試行する。
- **緊急停止のみ**: `BUZZWEAVE_EMERGENCY_STOP=true` のときだけ即 return。
- **daily_limit_reached**: その日の run 数が `determineDailyRunTarget` を超えたら SKIP。
- **interval_not_reached**: 前回 run から MIN_RUN_INTERVAL_HOURS 未満なら SKIP。
- **API_CALL_CAP**: 1 run あたりの投稿数上限（デフォルト 20）。**MAX_CAP_PER_RUN**（100）、火水木の **MAX_CAP_PER_RUN_WARP**（200）で上限制御。
- **Safety guards**: `pqtPlanner.applySafetyAndSaturationGuards` で CTR 急落・停滞・言語過多・テンプレ分散に応じた補正（実装詳細は `ML_PQT_IMPLEMENTATION_PATCH_SPEC.md`）。

### 4.6 検索ログの読み方（Copilot 解析用）

- **pages/bucket**（ログ）: 1 クエリあたり**最大何ページまで取得するか**の上限。`BUZZWEAVE_SEARCH_PAGES_PER_BUCKET`（デフォルト 3）で、`collectBuzzCandidates` から `fetchCandidatesFromSearch` に `pagesPerBucket` で明示的に渡している。
- **queryStats.pagesFetched**: そのクエリで**実際に取得したページ数**。X API が `next_token` を返さない（＝その時間帯にそれ以上ヒットがない）と 1 ページで終わる。したがって **pagesFetched=1 は「設定が効いていない」ではなく、15 分ウィンドウ内で 1 ページ分（maxResults=50）に満たないヒットしかなかった**ことを意味する。ヒットを増やしたい場合は検索ウィンドウ拡大（`BUZZWEAVE_SEARCH_WINDOW_MIN`）やクエリ見直しが有効。
- **lowVolumeBackfillUsed**: **LOW_VOLUME_LANGS**（デフォルト `ar,ko,ja`）かつ、最初のウィンドウで 0 件だったときにのみ、拡張ウィンドウ（`BUZZWEAVE_LOW_VOLUME_SEARCH_WINDOW_MIN`、デフォルト 30 分）で再検索し、そのとき true になる。**es は LOW_VOLUME_LANGS に含まれない**ため、es run では常に false。候補を増やしたい場合は `BUZZWEAVE_LOW_VOLUME_LANGS` に `es` を追加するか、別途「候補数が閾値未満のときだけウィンドウ拡大」するロジックを検討する。

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
| BUZZWEAVE_API_CALL_CAP | 1 run あたりの投稿数上限 | 100 |
| BUZZWEAVE_MAX_CAP_PER_RUN | 1 run の絶対上限 | 200 |
| BUZZWEAVE_MAX_CAP_PER_RUN_WARP | 火水木の 2 倍時上限 | 400 |
| BUZZWEAVE_DAILY_CONVERSION_TARGET | 目標成約/日（投稿ターゲット算出用） | 100 |
| BUZZWEAVE_BASE_POSTS_PER_CONVERSION | 1成約あたり投稿数（フェルミ値） | 5 |
| BUZZWEAVE_RUNS_PER_DAY_FOR_TARGET | ターゲットを割る run 数（Cron 実行回数と一致推奨） | 8 |
| BUZZWEAVE_WEEKDAY_WARP | 火水木 2 倍 cap を使うか | 任意 |
| BUZZWEAVE_SEARCH_WINDOW_MIN | 検索の直近何分まで取得するか（分） | 15 |
| BUZZWEAVE_SEARCH_PAGES_PER_BUCKET | クエリあたりの取得ページ数 | 3 |
| BUZZWEAVE_LOW_VOLUME_LANGS | 少言語（検索 0 件時に長めウィンドウで再試行） | ar,ko,ja |
| BUZZWEAVE_FALLBACK_SLOT_COUNT | Fisherman 0 件時のフォールバック最大スロット数 | 10 |

---

## 7. 検証・PDCA で見るポイント

- **Run が走っているか**: Cron が 8 回/日（0,3,6,9,12,15,18,21 UTC）で叩いているか。ログで `daily_limit_reached` / `interval_not_reached` / `SKIP_NO_SNAPSHOT` の有無。
- **1 run あたりの投稿数**: cap が API_CALL_CAP（100）や日次ターゲット/run で制限されているか。実際の post 数がログに残っているか。
- **言語ローテーション**: 6言語が round-robin または指定 `lang` で均等に回っているか。
- **テンプレ選択**: pickTemplateIndex が言語ごとに uses/clicks を参照しているか。recordPqtUse が投稿後に呼ばれているか。
- **成約との対応**: 1成約 ≒ 5投稿の設計で、Minimal/Regular の成約数が想定（例: 32成約グロス、7:3 配分）に近いか。Whop Webhook と KV/Supabase の成約集計と突き合わせる。
- **インプレ・CTR**: 投稿数が最大に近い日（例: 160投稿/日）で、期待インプレ 20–30万・CTR 2% 前後と実測のオーダーが合っているか。
- **ガード**: 緊急停止・daily limit・interval が意図どおり効いているか。

### 7.1 Run 短報フォーマット（毎 run 収集）

解析・PDCA 用に、以下を 1 run ごとに収集する（ログから抽出 or ツールで集約）。

| 項目 | 説明 |
|------|------|
| run_id | ログの `runId` |
| lang | 実行言語 |
| posts_fetched | 検索で取得した投稿数 |
| pagesFetched | queryStats の各クエリの pagesFetched（配列 or 要約） |
| lowVolumeBackfillUsed | 拡張ウィンドウを使用したか |
| candidates | 候補数（median フィルタ後） |
| slots | 選定スロット数 |
| cap | その run の投稿 cap |
| posted | 実際の投稿数 |
| fill_rate | posted / cap（0〜1） |
| top_alerts | 補足（deadline_exceeded / 402 / guard 発動など） |

テンプレ別 uses/clicks が取れる環境では、言語・template_id ごとの uses / clicks も収集する。

### 7.2 検証指標と合格ライン（短期）

- **posts_fetched**: 前 run 比で増加していることが望ましい。**2× を狙う場合は** `pagesPerBucket` の明示だけでは不十分で、**検索ヒット数を増やす必要がある**（`BUZZWEAVE_SEARCH_WINDOW_MIN` の拡大やクエリ見直し）。X API が next_token を返さない限り pagesFetched は 1 のまま。
- **queryStats.pagesFetched**: 設定値（例: 3）以下であること。1 の場合は「その時間帯で 1 ページ分のヒットしかなかった」と解釈する（4.6 参照）。
- **lowVolumeBackfillUsed**: LOW_VOLUME_LANGS かつ最初のウィンドウで 0 件のときに true。発生すればバックフィルは機能している。
- **slots / posted**: `BUZZWEAVE_FALLBACK_SLOT_COUNT` を 3→5→10 に段階的に上げた場合、slots が増えることを期待する。

**短期の合格ライン（目安）**: 1 run 後に **posts_fetched が前 run 比で増加**し、**posted が 1.5× 以上**（パラメータ変更をした場合）。posts_fetched 2× は「ウィンドウ拡大などでヒット数が増えた場合」の目標。

### 7.3 監視とロールバック（候補拡張パラメータ）

検索幅・フォールバック拡大後は 7.1 の項目を毎 run で確認する。あわせて **テンプレ別 CTR** と CVR を監視する。

**ロールフォワード**: `pagesFetched` と lowVolumeBackfill が期待どおり動作し、fill_rate が改善するなら、`BUZZWEAVE_FALLBACK_SLOT_COUNT` を 5→10 に段階的に上げる。

**ロールバックが必要な場合**（CTR が前 run 比 −40% 程度の急落、fill_rate 悪化、Safety guard の連続発動など）は、**次の順序**で戻す。

1. `BUZZWEAVE_FALLBACK_SLOT_COUNT` を元の値（例: 3）に戻す  
2. それでも問題なら `BUZZWEAVE_SEARCH_WINDOW_MIN` を縮める（例: 15→5）  
3. さらに必要なら `BUZZWEAVE_SEARCH_PAGES_PER_BUCKET` を下げる（例: 3→2）

**一括ロールバック例**（緊急時）:

- `BUZZWEAVE_SEARCH_WINDOW_MIN=5`
- `BUZZWEAVE_SEARCH_PAGES_PER_BUCKET=2`
- `BUZZWEAVE_FALLBACK_SLOT_COUNT=3`
- （必要なら）`BUZZWEAVE_LOW_VOLUME_LANGS=ar` のみに戻す

様子見でフォールバックを抑えたい場合は、まず `BUZZWEAVE_FALLBACK_SLOT_COUNT=5` で運用し、問題なければ 10 に上げる。

---

## 8. 関連ドキュメント

- **BUZZWEAVE_PQT_ONLY_SPEC.md** — PQT-only の禁止事項と 4 要素・CTR 学習の概要。
- **BUZZWEAVE_ML_PQT_SCHEDULE_SPEC.md** — 時間帯・言語配分の数式。
- **BUZZWEAVE_PQT_CTR_DESIGN.md** — CTR 最大化・メインフロー・ファイル一覧。
- **ML_PQT_IMPLEMENTATION_AUDIT.md** — 破綻チェック・軽微な不整合と対応状況。
- **ML_PQT_IMPLEMENTATION_PATCH_SPEC.md** — 実測メトリクス・補正・ガードの仕様。

---

*Copilot と検証チームが PDCA で参照するための共通仕様として利用してください。*
