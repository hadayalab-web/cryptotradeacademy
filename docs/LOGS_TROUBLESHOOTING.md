# ログトラブルシュート

Vercel の Logs でよく出る事象と、見方・対処のメモ。

---

## GET --- が出たとき

**意味**: そのリクエストが HTTP ステータスを返さずに終わった。典型的には **タイムアウト**・**プロセス落ち**・**コールドスタートで応答前に終了**。

**出やすいエンドポイント**（cron 5分ごと）:

| パス | maxDuration | 対処の目安 |
|------|-------------|------------|
| `/api/refresh-chain-raid-mv` | 30s | 30s で切れているなら `vercel.json` で 60s に上げる候補。DB/外部が重い時間帯なら一時的なので監視継続。 |
| `/api/x-metrics-fetcher` | 60s | 60s 超過 or 応答前に落ち。キュー空でも「No unprocessed queue」を返す前に落ちると ---。同じ時刻に他 cron と重なっていないか確認。 |
| `/api/kiba-5min` | 120s | 120s 超 or 初期化で落ち。たまに 1 回なら一過性。連続で --- ならログを増やして原因切り分け。 |

**やること**:
1. 同じエンドポイントが **連続で ---** か、**たまに 1 回** かを確認。たまに 1 回ならまず監視でよい。
2. **refresh-chain-raid-mv** が 30s で切れていそうなら `vercel.json` の `api/refresh-chain-raid-mv.js` の `maxDuration` を 60 に。
3. **同じ分に複数 cron** が走っているときは負荷で両方 --- になりうる。cron の時刻を少しずらす（例: 一方を `*/5`、他方を `2,7,12,...`）と分散できる。
4. 各 API の先頭・返信前・catch で `console.log` / `console.error` を足すと、次に --- が出たときに「どこで止まったか」が分かる。

---

## その他

- **cron が 200 なのに「Skipping send」** → 意図したスキップ（deliveryMode=minimal 等）。異常ではない。
- **buzzweave-run の short_report** → 1 run ごとの `run_id, lang, posts_fetched, candidates, slots, cap, posted, fill_rate` がログに出る。これをコピーして Gemini に投げると「次の1アクション」を出しやすい。
