# PQT 6言語×8テンプレ・引用厳選・投稿ペース 徹底調査

**調査日**: 2026-02-16  
**目的**: 「投稿は6言語×8種類のテンプレがあるはず」「引用リポスト用の投稿はかなり厳選されてるはず」「投稿ペースは良い」のコードベース検証。

---

## 1. 6言語 × 8テンプレの実態

### 1.1 実装確認結果

| 項目 | 仕様 | 実装 | 一致 |
|------|------|------|------|
| 言語数 | 6 | 6 (en, ja, es, pt, ar, ko) | ✅ |
| テンプレ数/言語 | 8 | 8 | ✅ |
| **合計テンプレ** | **48** | **48** | ✅ |

- **根拠**: `services/td/pqtTemplates.js` の `PQT_TEMPLATES` を `Object.keys(PQT_TEMPLATES).map(l => PQT_TEMPLATES[l].length)` でカウント。  
  - 各言語とも配列長は **8**。  
  - ファイル先頭コメント「6言語 × 8バリアント」と一致。

### 1.2 テンプレ選択ロジック（どの「8種類」が使われるか）

- **pqtCtaEngine.pickTemplateIndex(lang)**  
  - 言語ごとに **uses / clicks** を保持。  
  - **CTR = clicks / uses** が最も高いテンプレを優先。  
  - 未使用テンプレは順に試す（ラウンドロビン的）。  
- つまり「8種類」はすべて利用候補で、**実績に応じてCTRの高いテンプレが選ばれる**設計。

### 1.3 言語配分（日次ターゲット内での割り当て）

`mlPqtScheduleConfig.js` の **LANGUAGE_ALLOCATION**:

| 言語 | share_ratio |
|------|-------------|
| en | 40% |
| es | 20% |
| pt | 15% |
| ar | 10% |
| ko | 8% |
| ja | 7% |

1 run あたりは **1言語**。cap は日次ターゲットを 8 run で割った値と、言語配分・API_CALL_CAP・MAX_CAP_PER_RUN で決まる。

---

## 2. 引用リポスト（PQT）の「かなり厳選」ロジック

引用元は **Fisherman（釣り師）** のみ。以下の多段フィルタで厳選されている。

### 2.1 第1段: Fisherman 判定（hype + エンゲージメント）

- **fishermanDetector.js**
  - **isFishermanPost(post, lang)**  
    - 本文に **HYPE_KEYWORDS**（moon, pump, 100x, 今すぐ, 乗り遅れるな, 等・言語別）が含まれること。  
    - かつ **engagementScore ≥ 500**（デフォルト `DEFAULT_ENGAGEMENT_THRESHOLD`）。  
  - **scoreFromMetrics**: likes + 2×retweets + 3×quotes + replies でスコア化。

→ 煽り系かつ一定以上のエンゲージメントがある投稿だけが候補。

### 2.2 第2段: 上位 5〜10% のみ採用

- **selectFishermanSlotsTopPercent(candidates, lang, opts)**
  - **topPercent**: デフォルト **0.08**（8%）。opts で 0.05〜0.10 に変更可能。  
  - 候補を **engagement 降順** にソートし、**上から `ceil(filtered.length * topPercent)` 件** のみ取得。  
  - さらに **maxCount**（その run の cap）で上限制限。

→ 候補のうち **上位約 5〜10%** の「一番バズっている」投稿だけがスロットになる。

### 2.3 第3段: 2〜7分ウィンドウ優先（momentum）

- **buzzWeaveEngine.js** 内  
  - スロットごとに **投稿からの経過秒数** を計算。  
  - **2〜7分**（120〜420秒）の「立ち上がり中」投稿を **in2_7Window** でマーク。  
  - **in2_7Window が 1 件でもあれば、そのウィンドウ内のスロットだけに絞る**。  
  - 同一ウィンドウ内は **likesPer10min**（10分あたりいいね数）降順でソート。

→ 「今まさに伸びている」投稿を優先。

### 2.4 第4段: Tier1 / Tier2 / Tier3 と Tier3 cap

- **fishermanPriority.js**
  - **Tier1**: 仕手師 high-impact、または **>90th velocity + CTR > 閾値**。  
  - **Tier2**: **70–90th velocity** かつ overlap 等。  
  - **Tier3**: その他。**最大 2 件まで**（`orderedCandidatesWithTier3Cap` の tier3Cap=2）。  
- 並び順: **Tier1 → Tier2 → Tier3（2件まで）**。  
- 実測メトリクス（performanceMetrics）がある場合は **orderCandidatesByPerformanceTiers** で Tier 更新・ブラックリスト（48h）を適用したうえで同様に cap。

→ 過去パフォーマンスが悪いものは Tier 落ちし、Tier3 は最大 2 スロットに抑制。

### 2.5 第5段: 多様性ガード（同一作者・クラスタ集中の抑制）

- **applyDiversityCaps(slots, opts)**
  - **MAX_SLOTS_PER_AUTHOR**: デフォルト **1**（同一作者から最大 1 スロット）。  
  - **MAX_CLUSTER_SHARE**: デフォルト **0.4**（スロット数の 40% を上限に、1 クラスタに集中させない）。  
  - 環境変数: `BUZZWEAVE_MAX_SLOTS_PER_AUTHOR`, `BUZZWEAVE_MAX_CLUSTER_SHARE`。

→ 1 run 内で同じアカウント・同じクラスタに偏らない。

### 2.6 フォールバック（Fisherman 0 件時）

- **selectFishermanSlotsTopPercent** でスロットが 0 件のときのみ、  
  **selectSlotsFallback(candidates, min(FALLBACK_SLOT_COUNT, cap))** を実行。  
- **FALLBACK_SLOT_COUNT**: デフォルト **10**（環境変数 `BUZZWEAVE_FALLBACK_SLOT_COUNT`）。  
- このときは「hype 判定なし」で engagement 降順の上位のみ。

---

## 3. 投稿ペース

### 3.1 Cron スケジュール

- **vercel.json**  
  - **path**: `/api/buzzweave-run`  
  - **schedule**: `0 0,3,6,9,12,15,18,21 * * *`  
  - つまり **1日 8回**（UTC 0, 3, 6, 9, 12, 15, 18, 21 時・3時間等間隔）。

→ **投稿ペースは 3h 等間隔・8 run/日で設計どおり。**

### 3.2 1 run あたりの投稿数（cap）

- **API_CALL_CAP**: デフォルト **100**（1 run の通常上限）。  
- **MAX_CAP_PER_RUN**: デフォルト **200**（1 run の絶対上限）。  
- **MAX_CAP_PER_RUN_WARP**: 火水木で **2倍**（デフォルト 400）を利用可能（`BUZZWEAVE_WEEKDAY_WARP=true` 時）。  
- 実際の cap は次の最小値で決まる:  
  - その run の言語に割り当てられた配分  
  - API_CALL_CAP  
  - **日次ターゲット / RUNS_PER_DAY_FOR_TARGET**（8）  
  - MAX_CAP_PER_RUN（または warp 時は MAX_CAP_PER_RUN_WARP）

### 3.3 日次 run 数上限（daily limit）

- **determineDailyRunTarget(snapshot)**  
  - trapScore に応じて **low=6, medium=7, high=8**（1日の run 上限）。  
  - Cron は 8 回/日なので、high のときは全 run 実行可能。

### 3.4 まとめ（投稿ペース）

| 項目 | 値 |
|------|-----|
| run 頻度 | 8回/日（UTC 0,3,6,9,12,15,18,21） |
| 間隔 | 3時間等間隔 |
| 1 run あたり cap | 通常 〜100、最大 200（火水木 warp 時 〜400） |
| 日次ターゲット | 200〜400 レンジ（trapScore 等で決定） |

→ **投稿ペースは仕様どおり「良い」ペースで設定されている。**

---

## 4. 結論（徹底調査サマリ）

| 確認項目 | 結果 |
|----------|------|
| 6言語 × 8テンプレ | ✅ **48 テンプレ実在**（各言語 8 個・コードでカウント済み） |
| 引用リポストの厳選 | ✅ **5段階**（Fisherman 判定 → 上位 5–10% → 2–7分ウィンドウ優先 → Tier1/2/3＋Tier3 cap 2 → 多様性 cap） |
| 投稿ペース | ✅ **8 run/日・3h 等間隔**。cap は日次ターゲット・API 上限・言語配分で制御。 |

**「投稿は6言語×8種類のテンプレがある」「引用リポスト用はかなり厳選」「投稿ペースは良い」はいずれもコード上で成立している。**

---

## 5. 参照ファイル一覧

| ファイル | 役割 |
|----------|------|
| services/td/pqtTemplates.js | PQT_TEMPLATES 定義（6言語×8）・CTA_BY_LANG・ACTION_GUIDANCE |
| services/td/pqtCtaEngine.js | pickTemplateIndex, buildPqt, recordPqtUse |
| services/td/fishermanDetector.js | isFishermanPost, selectFishermanSlotsTopPercent, selectSlotsFallback |
| services/td/fishermanPriority.js | rankFishermenWithTiers, orderedCandidatesWithTier3Cap, orderCandidatesByPerformanceTiers |
| services/td/buzzWeaveEngine.js | runBuzzWeaveCyclePqtOnly, 2–7分ウィンドウ, applyDiversityCaps, cap 計算 |
| services/td/mlPqtScheduleConfig.js | LANGUAGE_ALLOCATION, TIME_DISTRIBUTION, ML_PQT_REFINEMENT_CONFIG |
| api/buzzweave-run.js | エントリ・daily limit チェック |
| vercel.json | crons[path=/api/buzzweave-run] schedule |
