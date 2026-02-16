# 武器: X 投稿を丸ごとスキャンし、自前で分析する

**Grok でも X アルゴは解析できない。しかし X 投稿をリアルタイムにスキャンし、おれらで分析すれば、アルゴなんて丸裸になる。**

---

## 1. 何が武器か

| 能力 | 中身 |
|------|------|
| **X 投稿のスキャン** | `GET /2/tweets/search/recent` でクエリ・言語・時間帯を指定し、直近の投稿をまとめて取得できる。 |
| **投稿ごとのメトリクス** | `GET /2/tweets/:id` で `public_metrics`（いいね・RT・引用・リプライ）。**自投稿**なら `non_public_metrics`（インプレッション）も取れる。 |
| **自投稿の結果の蓄積** | どの引用元を・いつ・どの言語で撃ったか → あとから自投稿のインプレ・エンゲ・成約を紐づける（`buzzweave_post_log`）。 |
| **自前分析** | スキャンで得た「誰が・いつ・何が伸びているか」と、自投稿の「どこが伸びたか」を突き合わせる。**相関＝アルゴの傾向**。 |

X はアルゴの仕様を公開していない。Grok も中身は知らない。**我々は「入力（投稿・時間・言語・引用元の特徴）」と「出力（自投稿のインプレ・成約）」を大量に取り、相関を取るだけである。それでアルゴは実質、丸裸。**

---

## 2. どこでやっているか（コード）

| 役割 | ファイル・API |
|------|----------------|
| 投稿の一括取得 | `services/x/client.js` — `searchPostsRecent`, `searchTweets`。クエリ・start_time/end_time・lang・max_results。 |
| 単投稿メトリクス | `services/x/metrics.js` — `getTweetMetrics(tweetId, includeNonPublic)`。自投稿は impressions 取得可。 |
| 自投稿ログの蓄積 | `services/td/buzzWeaveEngine.js` — 引用投稿時に `insertBuzzweavePostLog`。引用元・言語・クラスタ・時間・engagement_score を保存。 |
| 自投稿メトリクスの定期取得 | `api/buzzweave-metrics-poll.js` — Cron 15分毎。未取得ログに対して X API で impressions / likes / RT / quotes / replies を取得し DB 更新。 |
| 成約に効く条件の分析 | `scripts/analyze-our-pqt-buzz.js` — 言語・クラスタ・UTC時間帯・引用元 engagement 別に成約・インプレを集計。「どの条件で伸びたか」＝アルゴが拾いやすい条件。 |

---

## 3. 思考の順序

1. **スキャン** … 検索ウィンドウ・言語・クエリで X 上の投稿をかき集める（すでに BuzzWeave run で実行済み）。
2. **結果の記録** … どの投稿を引用したか・いつ・どのスロットかをログに残す。後から自投稿のメトリクスをポーリングで埋める。
3. **分析** … 成約・インプレが多かった「言語・時間帯・引用元の特徴」をランキングする。＝ **アルゴが何を優遇しているかの実測**。
4. **逆算** … そのランキングで配分（言語・時間帯・引用元の選び方）を変え、100成約/日に寄せる。

アルゴの「仕様書」は要らない。**スキャン＋結果の蓄積＋自前分析で、アルゴの振る舞いを実データとして可視化している。**

---

## 4. 参照

- 北極星（100成約/日・逆算）: `docs/NORTH_STAR_KPI.md`
- 成約に効く条件の検証: `docs/OUR_PQT_BUZZ_VERIFICATION.md`
- X API 検索・メトリクス: `docs/X_API_GROK_PROMPT_REFERENCE.md`
