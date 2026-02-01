# インフルエンサーリスト構築 進捗

**実行日**: 2026-02-01

---

## 目標値（初回ストック）

| 言語     | 目標    | シード | KV 保存    | 備考                                                       |
| -------- | ------- | ------ | ---------- | ---------------------------------------------------------- |
| en       | 200     | 124 件 | **124 件** | チャレンジで +12。目標まであと約76。                       |
| pt-br    | 120     | 39 件  | **35 件**  | チャレンジで build + rebuild、+12。                        |
| ko       | 100     | 30 件  | **30 件**  | チャレンジで build + rebuild、+15。                        |
| es       | 80      | 49 件  | **48 件**  | チャレンジで build + rebuild、+23。                        |
| ja       | 80      | 12 件  | **11 件**  | クレジットチャージ後に build + KV 反映済み。               |
| ar       | 40      | 53 件  | **52 件**  | ar ポテンシャルで build + rebuild、+16。目標40達成・超過。 |
| **合計** | **620** | —      | **300 件** | ar 増強後。en 124, pt-br 35, ko 30, es 48, ja 11, ar 52。  |

---

## 初回ストックでスタート・投稿スケジュール最適化（2026-02-01）

この **300 件** のストックで運用を開始し、投稿スケジュールを実態に合わせて最適化した。

### 変更内容

1. **config/influencerStrategy.js**
   - **INFLUENCER_COUNT_BY_LANG**: 1回の Cron あたりの投稿候補数をストックに合わせて変更。
     - en 3、es 2、pt-br 1、ar 2、ko 1、ja 1（ja は 11 件のみのため 1）。
   - **Cron 頻度**: 1時間ごと（24回/日/言語）を前提に設計。
   - **STOCK_COUNT_BY_LANG**: 実態（124, 48, 35, 52, 30, 11）に合わせて更新。
   - **IMPRESSION_TARGET_BY_LANG**: 約 240 投稿/日 × 5,000 imp を目安に min/max を再設定。
   - **HOURLY_DISTRIBUTION**: オフピーク（UTC 13,14）を 40% → 50% に変更。

2. **vercel.json（引用リポスト Cron）**
   - **変更前**: en は 6分ごと（240回/日）、他言語は 1時間に10回（240回/日）。
   - **変更後**: 全言語 **1時間ごと**（24回/日）、分をずらして分散。
     - en 0分、es 5分、pt-br 10分、ar 15分、ja 20分、ko 25分。

### 期待値（初回ストック 300 運用）

| 項目                                  | 値                                                        |
| ------------------------------------- | --------------------------------------------------------- |
| 引用リポスト数/日（目安）             | **約 240**（en 72, es 48, pt-br 24, ar 48, ko 24, ja 24） |
| インプレッション/日（5,000 imp/投稿） | **約 120 万**                                             |
| 1人あたり最大投稿数/日                | 4（X_MAX_DAILY_POSTS_PER_INFLUENCER）                     |

ストックを増やしたら `INFLUENCER_COUNT_*` や Cron 頻度を段階的に上げる。

---

## 実施したコマンド

1. **en**: `build-influencer-list-per-lang.js --lang en` を 2 回 → `rebuild-influencer-list-from-seed.js --lang en` を 2 回 → KV 69 件。
2. **pt-br**: `build-influencer-list-per-lang.js --lang pt-br --batch 30` → `rebuild-influencer-list-from-seed.js --lang pt-br` → KV 23 件。
3. **ko**: `build-influencer-list-per-lang.js --lang ko --batch 25` → `rebuild-influencer-list-from-seed.js --lang ko` → KV 15 件。
4. **es**: `build-influencer-list-per-lang.js --lang es --batch 25` → シード 26 件。`rebuild-influencer-list-from-seed.js --lang es` 実行時に **X API 402 CreditsDepleted** のため KV 保存 0 件。
5. **ja**: `build-influencer-list-per-lang.js --lang ja --batch 25` → 採用 0/50、シード 0 件（X API エラーまたは候補の user 不在の可能性）。

---

## クレジットチャージ後の実施（2026-02-01）

- **es**: `rebuild-influencer-list-from-seed.js --lang es` → **25 件 KV 保存**。
- **ja**: `build-influencer-list-per-lang.js --lang ja --batch 25` → 12 件シード → `rebuild-influencer-list-from-seed.js --lang ja` → **11 件 KV 保存**。
- **ar**: `build-influencer-list-per-lang.js --lang ar --batch 20` → 14 件シード → `rebuild-influencer-list-from-seed.js --lang ar` → **14 件 KV 保存**。

---

## 本日の en 増強（推奨で実施）

- **build** × 3 回: `build-influencer-list-per-lang.js --lang en --batch 40`
  - シード 71 → 83 → 95 → 114 件（サンプル2件削除後は実質 112 件）。
- **rebuild** × 3 回: `rebuild-influencer-list-from-seed.js --lang en`
  - KV: 69 → 81 → 93 → **112 件**。
- シードから `EXAMPLE_HANDLE_1` / `EXAMPLE_HANDLE_2` を削除し、次回 rebuild で 112/112 になるよう整理済み。

## チャレンジ追加（もう少しやってみる）

- **en**: build × 2 回 + rebuild × 2 回 → シード 112 → 119 → 124、KV **124 件**（目標 200 まであと約76）。
- **pt-br**: build × 1（batch 30）+ rebuild → シード 25 → 39、KV **35 件**（+12）。
- **ko**: build × 1（batch 30）+ rebuild → シード 15 → 30、KV **30 件**（+15）。
- **es**: build × 1（batch 30）+ rebuild → シード 26 → 49、KV **48 件**（+23）。
- **ar**: build × 1（batch 25）+ rebuild → シード 14 → 37、KV **36 件**（+22）。
- **ar ポテンシャル**: build × 1（batch 25）+ rebuild → シード 37 → 53、KV **52 件**（+16、目標40達成・超過）。
- **KV 合計**: 200 → **300 件**（ar 増強後）。

---

## 次のアクション

1. **en を目標 200 に近づける**
   - `build-influencer-list-per-lang.js --lang en --batch 40` を複数回実行し、都度 `rebuild-influencer-list-from-seed.js --lang en` で KV 更新（あと約 88 件）。

2. **pt-br, ko の増強**
   - 同様に `build-influencer-list-per-lang.js --lang pt-br` / `--lang ko` を繰り返し、目標数に近づける。

---

## 参照

- シード: `data/influencers-seed/influencers-{lang}.json`
- 構築: `scripts/build-influencer-list-per-lang.js`
- KV 反映: `scripts/rebuild-influencer-list-from-seed.js`
- 計画: `docs/INITIAL_STOCK_PLAN_QUOTE_REPOST_2026-02-01.md`, `docs/BUILD_INFLUENCER_LIST_PER_LANG_2026-02-01.md`
