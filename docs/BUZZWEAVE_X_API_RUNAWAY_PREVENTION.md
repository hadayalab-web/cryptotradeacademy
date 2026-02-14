# BuzzWeave — X API が暴走しない理由

現状の実装では、**X API は「暴走」しない**ように複数段で止まるようになっている。

---

## 1. X API を叩くまでの 5 ゲート（全部通らないと叩かない）

| # | ゲート | 場所 | 通らないと |
|---|--------|------|------------|
| 1 | **認証** | buzzweave-run | 401 で return。run しない。 |
| 2 | **緊急停止** | buzzweave-run | `BUZZWEAVE_EMERGENCY_STOP=true` なら return。run しない。 |
| 3 | **x_api_blocked** | buzzweave-run ＋ runBuzzWeaveCycle 内 | 402 後に true のまま。**API 入口**と**サイクル内（search の前）**の 2 箇所でチェック。どちらかで引っかかれば X API は呼ばない。 |
| 4 | **btcSnapshot** | buzzweave-run | KV に無い or 24h 超なら `SKIP_NO_SNAPSHOT` で return。run しない。 |
| 5 | **ロック** | buzzweave-run | 取得失敗（別 run 中 or **minimal スキーマで「refusing run」**）なら return。run しない。 |
| 6 | **スロット** | runBuzzWeaveCycle | 次 1 時間にスロットが 0 件なら「No slots」で return。**search も post も呼ばない。** |

この 6 つを**すべて**通過したときだけ、`fetchCandidatesFromSearch` → `searchPostsRecent`（X API）が 1 回呼ばれ、条件が揃えばその後に `postQuoteTweet` が**最大 1 回**呼ばれる。

---

## 2. 402 が出たとき（暴走していた原因の一つ）

- **search/recent が 402** → `fetchCandidatesFromSearch` が `fatal402: true` を返す → `runBuzzWeaveCycle` 内で `upsertBuzzweaveStatus402()` を実行 → **x_api_blocked = true** になる。
- **次の 1 分**の Cron では、**API 入口**で `getBuzzweaveStatus().x_api_blocked` が true なので、**run 自体を開始せず** return。X API は一切叩かない。
- そのため「402 → 毎分リトライ → 毎分 402」の**無限ループは起きない**。402 後は 1 回だけ DB 更新し、以降は run をスキップする。

※ 解除するときは、Token/クレジット対応後に `scripts/clear-buzzweave-x-api-blocked.js` で x_api_blocked を false に戻す。

---

## 3. 1 run あたりの X API 呼び出し回数（上限）

- **search/recent**: **1 回まで**（1 スロット・1 言語のみ）。
- **postQuoteTweet**: **1 回まで**（候補がいて、リンク・候補チェックを通過したときだけ）。

Cron は**毎分 1 回**なので、**理論上の最大**は「毎分 1 search + 1 post」。  
「スロットがある時間帯だけ」「ロック・btcSnapshot・x_api_blocked が OK のときだけ」という条件が重なるので、実際はそれより少ない。

---

## 4. まとめ

- **暴走しない**理由: 上記 6 ゲートで「run しない」「search しない」がかかり、402 時は x_api_blocked で次 run から一切 X を叩かず、1 run あたりも search 1 回・post 1 回までに制限されている。
- **意図した範囲で叩く**とき: ロックテーブル修復済み・x_api_blocked=false・btcSnapshot あり・スロットあり、という「投稿したいとき」だけ run が進み、そのときだけ X API が使われる。

この前提（ロック修復・402 解除・cron/snapshot 運用）を満たしていれば、X API が暴走することはない設計になっている。
