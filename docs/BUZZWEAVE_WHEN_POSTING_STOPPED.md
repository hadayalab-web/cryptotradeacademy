# BuzzWeave — 投稿が止まったときの確認

暴走防止を入れた結果、投稿が完全にストップしてしまうことがあった経緯を踏まえ、**止まった原因ごとの対処**をまとめる。

---

## 1. 投稿が止まる主な原因と対処

| 原因 | 確認方法 | 対処 |
|------|----------|------|
| **btcSnapshot が無い** | ログに `SKIP_NO_SNAPSHOT` | `/api/cron` が動き、KV に `btc:snapshot` が入るようにする。cron が止まっているなら原因を解消してから再実行。 |
| **スロットが 0 件** | ログに `No slots in next hour` | `/api/buzzweave-slots` が日1回動いているか確認。`td_post_slots` にレコードが入っているか確認。 |

---

## 2. 「暴走は止めたいが、投稿は止めたくない」とき

- **ロックは現在未使用**。buzzweave-run はロック取得をしておらず、Cron の回数・間隔（MIN_RUN_INTERVAL_HOURS）で重複を抑えている。
- **402 が出ても** → その run は失敗して終わるだけ。次回 Cron で再試行する。ブロックは使わない。
- **時間帯で叩く回数を減らしたい** → `BUZZWEAVE_ACTIVE_HOURS_JST` で投稿したい時間だけスロットを生成する。

---

## 3. まとめ

- 投稿が止まった場合は、ログで上記のどれに当たるか確認する（主に SKIP_NO_SNAPSHOT / daily_limit_reached / interval_not_reached）。
