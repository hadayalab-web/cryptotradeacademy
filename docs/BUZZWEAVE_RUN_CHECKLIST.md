# BuzzWeave — 正常に動かすためのチェックリスト

ロジックは揃っている。あとは以下を満たせば正常に動く。

---

## 稼働の前提（一度だけ確認）

| 項目 | 確認 |
|------|------|
| **btcSnapshot** | `/api/cron` が動いて KV に `btc:snapshot` が入っていること。無いと buzzweave-run は `SKIP_NO_SNAPSHOT` で終了する。 |
| **スロット** | `/api/buzzweave-slots` が日1回（0:00 JST 等）で動き、`td_post_slots` に枠が入っていること。 |
| **環境変数** | X API（Bearer / OAuth）、OpenAI、Supabase、Vidalytics 用（任意）が Vercel に設定されていること。 |

---

## Cron（Vercel）

- **buzzweave-run**: `0 0,3,6,9,12,15,18,21 * * *`（UTC の 0,3,6,9,12,15,18,21 時ちょうど）。1日 8 回・3 時間等間隔。根拠は `docs/ML_PQT_ENGINE_FOR_OPERATION_AND_VERIFICATION.md` の 3.3 参照。
- **buzzweave-slots**: 日1回（例: 15:00 UTC）→ PQT-only では未使用。

---

## 投稿数が少ないときの分析（例: 2時間で2投稿）

1. **Vercel Logs** で `/api/buzzweave-run` をフィルタし、該当 2 時間内の **run 回数** を確認する。  
   - 0 回 → cron が呼ばれていない（スキップ: `SKIP_NO_SNAPSHOT` / `interval_not_reached` / `daily_limit_reached` など）。  
   - 1 回 → その 1 run で `posted=2` なら「1 run あたり 2 投稿」が原因。  
   - 2 回 → 各 run で `posted=1` なら「1 run あたり 1 投稿」が 2 回。

2. **各 run の Messages** を確認する（デプロイ後のログで次のように出る想定）。  
   - `[buzzweave-run] run completed posted=N runId=...` → その run の投稿数。  
   - `[BuzzWeave] pqt-only slots ready candidates=X slots=Y cap=Z` → **候補数 X、2–7 分ウィンドウ通過スロット数 Y、cap Z**。  
   - **Y が小さい（例: 2）** → 「2–7 分の伸び始め」に該当するポストが少なく、投稿数が cap より少なくなる正常な挙動。

3. **想定される原因の切り分け**  
   - **candidates が少ない** → 検索ヒット少・言語フィルタ・median フィルタ。  
   - **slots が少ない（candidates は多い）** → 2–7 分ウィンドウ＋momentum で絞った結果。時間帯によっては「今ちょうど 2–7 分のバズ」が少ない。  
   - **posted &lt; slots** → 投稿 API エラー・重複引用スキップ・link 取得失敗など。  
   - **run 自体がスキップ** → `SKIP_NO_SNAPSHOT`（KV に btcSnapshot なし）、`interval_not_reached`（前回 run から間隔不足）、`daily_limit_reached`（日次 run 上限到達）。

4. **目標投稿数（動的逆算）との関係**  
   - デフォルトは `目標成約/日 × 投稿/成約` で日次投稿目標を自動算出（例: 100成約/日 × 5 = 500投稿/日）。  
   - 1 run あたり cap は `dailyTarget / RUNS_PER_DAY_FOR_TARGET` で計算し、`BUZZWEAVE_MAX_CAP_PER_RUN`（通常）/`BUZZWEAVE_MAX_CAP_PER_RUN_WARP`（warp）で上限をかける。  
   - 固定値で運用したい場合は `BUZZWEAVE_DAILY_PQT_TARGET_HARD` を使う（最優先）。  
   - 実際は「候補数・2–7 分スロット数」の上限までしか出さないため、**run あたり 2 投稿は「その時間帯で 2–7 分のスロットが 2 つしかなかった」と解釈できる**。

---

## オプション（挙動を絞りたいとき）

- **投稿時間帯を絞る**: `BUZZWEAVE_ACTIVE_HOURS_JST=8,9,10,11,12,13,14,17,18,19,20,21,22,23` など。未設定なら従来どおり全時間帯。
- **緊急停止**: `BUZZWEAVE_EMERGENCY_STOP=true` で run を止める。

ここまで満たせば、あとはそのまま動かせばよい。
