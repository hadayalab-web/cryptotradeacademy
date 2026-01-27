# Webhookデータ活用戦略の実装設計案（GPT-5.2-2025-12-11解析）
**作成日時**: 2026-01-27T04:41:03.000Z
**解析AI**: GPT-5.2-2025-12-11
**目的**: Webhookデータ活用戦略のP0/P1項目の実装設計
**ベース**: webhook-data-utilization-strategy.md

---

### 1. エグゼクティブサマリー（200-300字）
Webhook（いいね/RT/リプライ）を「イベントログ」ではなく「tweetId単位の増分カウンタ」に正規化し、`tweetId→influencer`マッピングと日次のX APIメトリクス（impressions）を結合して、インフルエンサー別ERを安定算出します。KVは「(1)tweet集計」「(2)influencer日次集計」「(3)rolling集計」「(4)ダッシュボード」の4層に分け、リアルタイム更新は軽量に、ER計算は日次バッチで確定。P1ではrolling ERでローテーション重み付けし、時間帯はUTC hour別に学習して次日の投稿枠を配分します。

---

## 2. P0-1: インフルエンサー別エンゲージメント率の計算

### 2.1 データ取得と計算ロジック

#### WebhookデータからのインフルエンサーID取得（tweetId→influencer）
前提：投稿時に必ず `x:post:influencer:{tweetId}` を保存（未実装ならP0で追加）。

- 取得手順（Webhook処理内）  
  1) `tweetId` を抽出  
  2) `kv.get(x:post:influencer:${tweetId})` で `influencerUsername` を取得  
  3) 取れない場合は「unknown」扱いにせず、**遅延解決キュー**へ（後述）

**実装例（取得関数）**
```js
// services/x/influencerPerformance.js 内で使用
async function getInfluencerByTweetId(tweetId) {
  const key = `x:post:influencer:${tweetId}`;
  const influencer = await kv.get(key);
  return influencer || null;
}
```

#### エンゲージメント率の計算式（確定値は日次バッチで）
- **ER（tweet）** = (likes + retweets + replies + quotes) / impressions  
- Webhookで取れるのは likes/retweets/replies（quotesは取れないことが多い）  
  → **確定ERは `api/x-engagement-metrics.js` のX API取得結果（public_metrics + impressions）を正**とする  
- Webhookは「リアルタイム検知（バイラル/反応速度）」用途に寄せ、ER確定は日次で整合性を担保

**エッジケース**
- impressions=0：投稿直後/取得失敗。ERは `null`（0にしない）にして集計から除外、再取得対象に。
- 同一ユーザーの重複イベント：Webhookは重複が起こり得るため、**イベントIDが無い場合は厳密な重複排除は困難**。  
  → P0では「tweet単位の増分カウンタ」を採用し、確定値は日次X APIで上書きして整合性を回復。

#### インプレッション数の取得（既存getTweetMetricsと統合）
既存 `updateMetricsForDate()` が impressions を `non_public_metrics` 優先で取得できているため、ここを「tweet→influencer集計」に接続します。

- 日次バッチで各tweetの確定メトリクス取得
- `tweetId→influencer` を引いて influencer日次集計に加算
- rolling（7d/30d）も同時更新

---

### 2.2 KV保存設計

#### キー設計（4層）
**(A) tweet単位（Webhook増分・速報）**
- `x:eng:tweet:{tweetId}`  
  - TTL: 45日（分析/再計算余地）
  - 内容：Webhookでの増分カウンタ、最終イベント時刻、influencer/lang/postType（可能なら冗長に保持）

**(B) tweet→influencer マッピング（投稿時に保存）**
- `x:post:influencer:{tweetId}` = `{ username, lang, postType, postedAt }`
  - TTL: 45日（tweet集計と揃える）

**(C) influencer日次集計（確定値）**
- `x:perf:influencer:day:{date}:{lang}:{username}`
  - TTL: 180日（週次/月次に使う）
  - impressions/engagements/posts/avgER/bestTweetId 等

**(D) influencer rolling（7d/30d）**
- `x:perf:influencer:roll:{window}:{lang}:{username}` window=7d|30d
  - TTL: 30日（毎日更新される前提）

#### データ構造（例）
```json
// x:eng:tweet:{tweetId}
{
  "tweetId": "123",
  "lang": "en",
  "postType": "quote_repost",
  "influencerUsername": "elonmusk",
  "webhook": { "likes": 10, "retweets": 2, "replies": 1 },
  "firstSeenAt": "2026-01-27T00:00:00Z",
  "lastEventAt": "2026-01-27T01:00:00Z"
}
```

```json
// x:perf:influencer:day:{date}:{lang}:{username}
{
  "date": "2026-01-27",
  "lang": "en",
  "influencerUsername": "elonmusk",
  "totalPosts": 3,
  "totalImpressions": 120000,
  "totalEngagements": 4200,
  "avgEngagementRate": 0.035,
  "bestPost": { "tweetId": "123", "engagementRate": 0.052 }
}
```

#### 更新頻度（推奨）
- Webhook：`x:eng:tweet:{tweetId}` を**リアルタイム増分更新**（軽量）
- ER確定：`updateMetricsForDate(date)` 実行時に  
  - tweet確定メトリクス → influencer日次集計 → rolling更新（**バッチ**）

---

### 2.3 実装コード

#### 新規: `services/x/influencerPerformance.js`（完全実装例）
> 目的：Webhook増分の保存、日次確定メトリクスからinfluencer集計生成、rolling更新、参照APIを提供

```js
// services/x/influencerPerformance.js
const { kv } = require("@vercel/kv");

const TWEET_ENG_TTL = 86400 * 45;
const MAP_TTL = 86400 * 45;
const PERF_DAY_TTL = 86400 * 180;
const PERF_ROLL_TTL = 86400 * 30;

function dayKey(date, lang, username) {
  return `x:perf:influencer:day:${date}:${lang}:${username}`;
}
function rollKey(window, lang, username) {
  return `x:perf:influencer:roll:${window}:${lang}:${username}`;
}
function tweetEngKey(tweetId) {
  return `x:eng:tweet:${tweetId}`;
}
function tweetMapKey(tweetId) {
  return `x:post:influencer:${tweetId}`;
}

/**
 * Webhook増分をtweet単位で保存（速報）
 * - 厳密な重複排除はしない（確定値は日次X APIで上書きする設計）
 */
async function incrementTweetEngagement(tweetId, type, meta = {}) {
  if (!tweetId) return false;

  const key = tweetEngKey(tweetId);
  const now = new Date().toISOString();

  const current = (await kv.get(key)) || {
    tweetId,
    lang: meta.lang,
    postType: meta.postType,
    influencerUsername: meta.influencerUsername,
    webhook: { likes: 0, retweets: 0, replies: 0 },
    firstSeenAt: now,
    lastEventAt: now
  };

  // metaは後勝ちで補完（投稿直後にマッピングが間に合わないケース対策）
  current.lang = current.lang || meta.lang;
  current.postType = current.postType || meta.postType;
  current.influencerUsername = current.influencerUsername || meta.influencerUsername;

  if (type === "like") current.webhook.likes += 1;
  else if (type === "retweet") current.webhook.retweets += 1;
  else if (type === "reply") current.webhook.replies += 1;

  current.lastEventAt = now;

  await kv.set(key, current, { ex: TWEET_ENG_TTL });
  return true;
}

/**
 * tweetId→influencer マッピング取得
 */
async function getInfluencerMapping(tweetId) {
  if (!tweetId) return null;
  const mapping = await kv.get(tweetMapKey(tweetId));
  return mapping || null;
}

/**
 * 日次：tweet確定メトリクス（impressions含む）をinfluencer日次集計へ反映
 * @param {string} dateString YYYY-MM-DD
 * @param {Array<{tweetId, lang, postType, postedAt}>} posts
 * @param {(tweetId)=>Promise<{impressions, engagements, replies, retweets, likes, quoteTweets}>} metricsFetcher
 */
async function buildInfluencerDailyPerformance(dateString, posts, metricsFetcher) {
  // influencer単位に集約
  const agg = new Map(); // key: `${lang}:${username}`

  for (const post of posts) {
    const tweetId = post.tweetId;
    const mapping = await getInfluencerMapping(tweetId);

    // マッピングが無い場合：後で再計算できるようキューへ
    if (!mapping?.username) {
      await kv.lpush("x:queue:missing_influencer_map", { tweetId, dateString, post });
      continue;
    }

    const username = mapping.username;
    const lang = mapping.lang || post.lang || "unknown";
    const m = await metricsFetcher(tweetId);

    // impressionsが取れない/0は除外（再取得対象）
    if (!m || !m.impressions || m.impressions <= 0) {
      await kv.lpush("x:queue:missing_impressions", { tweetId, dateString, username, lang });
      continue;
    }

    const key = `${lang}:${username}`;
    const cur = agg.get(key) || {
      date: dateString,
      lang,
      influencerUsername: username,
      totalPosts: 0,
      totalImpressions: 0,
      totalEngagements: 0,
      bestPost: { tweetId: null, engagementRate: null }
    };

    const er = m.engagements / m.impressions;

    cur.totalPosts += 1;
    cur.totalImpressions += m.impressions;
    cur.totalEngagements += m.engagements;

    if (cur.bestPost.engagementRate === null || er > cur.bestPost.engagementRate) {
      cur.bestPost = { tweetId, engagementRate: er };
    }

    agg.set(key, cur);
  }

  // KVへ保存（avgER算出）
  for (const cur of agg.values()) {
    cur.avgEngagementRate = cur.totalEngagements / cur.totalImpressions;
    await kv.set(dayKey(dateString, cur.lang, cur.influencerUsername), cur, { ex: PERF_DAY_TTL });
  }

  return { influencers: agg.size };
}

/**
 * rolling更新（7d/30d）
 * - P0では「直近N日分のdayキーを読み直して再集計」方式（実装容易）
 */
async function rebuildInfluencerRolling(windowDays, lang, username, endDateString) {
  // endDateStringを含む過去N日
  const end = new Date(`${endDateString}T00:00:00.000Z`);
  let totalPosts = 0, totalImpressions = 0, totalEngagements = 0;
  let best = { tweetId: null, engagementRate: null };

  for (let i = 0; i < windowDays; i++) {
    const d = new Date(end);
    d.setUTCDate(end.getUTCDate() - i);
    const ds = d.toISOString().slice(0, 10);

    const day = await kv.get(dayKey(ds, lang, username));
    if (!day) continue;

    totalPosts += day.totalPosts || 0;
    totalImpressions += day.totalImpressions || 0;
    totalEngagements += day.totalEngagements || 0;

    const b = day.bestPost;
    if (b?.engagementRate != null && (best.engagementRate == null || b.engagementRate > best.engagementRate)) {
      best = b;
    }
  }

  const avgEngagementRate = totalImpressions > 0 ? totalEngagements / totalImpressions : null;

  const payload = {
    windowDays,
    lang,
    influencerUsername: username,
    endDate: endDateString,
    totalPosts,
    totalImpressions,
    totalEngagements,
    avgEngagementRate,
    bestPost: best,
    updatedAt: new Date().toISOString()
  };

  await kv.set(rollKey(`${windowDays}d`, lang, username), payload, { ex: PERF_ROLL_TTL });
  return payload;
}

/**
 * 参照：rolling ER取得（無ければnull）
 */
async function getInfluencerRolling(windowDays, lang, username) {
  return (await kv.get(rollKey(`${windowDays}d`, lang, username))) || null;
}

module.exports = {
  incrementTweetEngagement,
  getInfluencerMapping,
  buildInfluencerDailyPerformance,
  rebuildInfluencerRolling,
  getInfluencerRolling
};
```

#### 既存拡張: `api/x-webhook.js` の `updateEngagementStats` 拡張（例）
> 目的：Webhook受信時にtweet単位の増分を保存し、可能ならマッピングも補完

```js
// api/x-webhook.js 内（updateEngagementStatsの中 or 呼び出し元）
// 例: updateEngagementStats(tweetId, type) の冒頭で追加

const { incrementTweetEngagement, getInfluencerMapping } = require("../services/x/influencerPerformance");

async function updateEngagementStats(tweetId, type) {
  if (!kv || !tweetId) return;

  // 可能ならマッピングを取得してメタ補完（KV read 1回）
  let meta = {};
  try {
    const mapping = await getInfluencerMapping(tweetId);
    if (mapping?.username) {
      meta = { influencerUsername: mapping.username, lang: mapping.lang, postType: mapping.postType };
    }
  } catch (e) {
    console.warn("[X Webhook] mapping lookup failed:", e.message);
  }

  // tweet単位の速報カウンタ更新（KV write 1回）
  try {
    await incrementTweetEngagement(tweetId, type, meta);
  } catch (e) {
    console.warn("[X Webhook] incrementTweetEngagement failed:", e.message);
  }

  // 既存の集計ロジックがあるならここに残す（後方互換）
  // ...
}
```

#### エラーハンドリング方針
- Webhook処理は**落とさない**（200を返すのが最優先）
- KV失敗：warnログ＋スキップ（後で日次X APIで回復）
- マッピング欠損：`x:queue:missing_influencer_map` に積む（後で再処理）

---

### 2.4 テスト方法

#### ユニットテスト（例：Jest）
```js
// __tests__/influencerPerformance.test.js
const { incrementTweetEngagement } = require("../services/x/influencerPerformance");

jest.mock("@vercel/kv", () => {
  const store = new Map();
  return {
    kv: {
      get: jest.fn(async (k) => store.get(k)),
      set: jest.fn(async (k, v) => { store.set(k, v); return "OK"; }),
      lpush: jest.fn(async () => 1)
    }
  };
});

test("incrementTweetEngagement increments like", async () => {
  await incrementTweetEngagement("t1", "like", { influencerUsername: "u1", lang: "en" });
  const { kv } = require("@vercel/kv");
  const saved = await kv.get("x:eng:tweet:t1");
  expect(saved.webhook.likes).toBe(1);
  expect(saved.influencerUsername).toBe("u1");
});
```

#### 統合テスト（Webhook→保存→日次集計）
- WebhookイベントJSONを `handleSingleLikeEvent` 等に投入
- `x:post:influencer:{tweetId}` を事前にセット
- `buildInfluencerDailyPerformance()` に posts と metricsFetcherモックを渡し、`x:perf:influencer:day:*` が生成されることを確認

---

## 3. P0-2: 日次エンゲージメントレポートの拡張

### 3.1 レポートデータ構造の設計

既存 `x:metrics:{date}` を壊さず、追加フィールドを足す（後方互換）。

```json
{
  "tweets": [ ... ],
  "totalImpressions": 0,
  "totalEngagements": 0,
  "...": "...",
  "extensions": {
    "influencers": {
      "top": [ { "username": "a", "avgER": 0.03, "posts": 3 } ],
      "bottom": [ ... ],
      "p80Threshold": 0.021
    },
    "timing": {
      "byUtcHour": [
        { "hour": 0, "posts": 5, "avgER": 0.018 },
        ...
      ],
      "bestHours": [13, 14, 15]
    }
  }
}
```

### 3.2 実装コード（generateEngagementDashboard拡張：diff例）
※実コード内に関数がある前提で、概念diffを提示します。

```diff
--- a/api/x-engagement-metrics.js
+++ b/api/x-engagement-metrics.js
@@
 async function generateEngagementDashboard(dateString) {
   const daily = await getDailyEngagementMetrics(dateString);
   if (!daily) return null;

+  const { kv } = require("@vercel/kv");
+  const postsKey = `x:posts:${dateString}`;
+  const posts = (await kv.get(postsKey)) || [];
+
+  // influencer日次集計を生成済み前提（未生成ならここで生成してもよい）
+  // ここではレポート用に集計してextensionsへ格納
+  const influencerAgg = new Map();
+  const hourAgg = Array.from({ length: 24 }, (_, h) => ({ hour: h, posts: 0, impressions: 0, engagements: 0 }));
+
+  for (const t of daily.tweets || []) {
+    // t: {tweetId, impressions, engagements, ...}
+    const mapping = await kv.get(`x:post:influencer:${t.tweetId}`);
+    if (mapping?.username) {
+      const k = `${mapping.lang || t.lang || "unknown"}:${mapping.username}`;
+      const cur = influencerAgg.get(k) || { username: mapping.username, lang: mapping.lang || t.lang, posts: 0, impressions: 0, engagements: 0 };
+      cur.posts += 1;
+      cur.impressions += t.impressions || 0;
+      cur.engagements += t.engagements || 0;
+      influencerAgg.set(k, cur);
+    }
+
+    // timing: postedAtはpostTracker側にあるのでpostsから引く
+    const p = posts.find(p => p.tweetId === t.tweetId);
+    if (p?.postedAt && (t.impressions || 0) > 0) {
+      const hour = new Date(p.postedAt).getUTCHours();
+      hourAgg[hour].posts += 1;
+      hourAgg[hour].impressions += t.impressions || 0;
+      hourAgg[hour].engagements += t.engagements || 0;
+    }
+  }
+
+  const influencerRows = Array.from(influencerAgg.values()).map(r => ({
+    username: r.username,
+    lang: r.lang,
+    posts: r.posts,
+    avgER: r.impressions > 0 ? r.engagements / r.impressions : null
+  })).filter(r => r.avgER != null).sort((a,b) => b.avgER - a.avgER);
+
+  const p80Index = Math.floor(influencerRows.length * 0.2) - 1;
+  const p80Threshold = influencerRows.length ? influencerRows[Math.max(0, p80Index)].avgER : null;
+
+  const byUtcHour = hourAgg.map(h => ({
+    hour: h.hour,
+    posts: h.posts,
+    avgER: h.impressions > 0 ? h.engagements / h.impressions : null
+  }));
+  const bestHours = byUtcHour
+    .filter(x => x.avgER != null && x.posts >= 3) // 最低サンプル数
+    .sort((a,b) => b.avgER - a.avgER)
+    .slice(0, 3)
+    .map(x => x.hour);
+
+  daily.extensions = {
+    influencers: {
+      top: influencerRows.slice(0, Math.max(5, Math.ceil(influencerRows.length * 0.2))),
+      bottom: influencerRows.slice(-5),
+      p80Threshold
+    },
+    timing: { byUtcHour, bestHours }
+  };

   return daily;
 }
```

### 3.3 KV保存設計
- 保存キー：既存の `x:metrics:{date}` をそのまま更新（extensions追加）
- TTL：現状の30日でOK（ただしrollingや長期比較をするなら `x:dashboard:{date}` を別キーで180日保持でも可）

### 3.4 テスト方法
- ユニット：`generateEngagementDashboard()` にモックdailyとposts/mappingを与え、`extensions` が付くこと
- 統合：前日分の `updateMetricsForDate()` → `generateEngagementDashboard()` を順に実行し、KVに保存されたJSONを検証

---

## 4. P1-1: 高パフォーマンスインフルエンサーの優先投稿

### 4.1 実装設計

#### 優先順位付けロジック（rolling 7d推奨）
- `avgER_7d` を主指標（データが薄い場合は30dへフォールバック）
- スコア例：
  - `score = avgER_7d * log10(totalImpressions_7d + 10)`（小規模のブレを抑制）
- 閾値：
  - `avgER_7d >= 0.02` → high
  - `avgER_7d < 0.01` → low
  - それ以外 → mid

#### 投稿頻度（1日2回/1回）と8時間クールダウン整合
- 8時間クールダウン維持 → 2回/日は理論上可能（最低8h間隔）
- `services/x/influencerRotation.js` 側で「今日の残り枠」を判定
  - high: `dailyCap=2`
  - mid/low: `dailyCap=1`
- 既存の「posted_today」セットは回数管理が弱いので、P1で **回数カウンタ**へ拡張推奨：
  - `x:influencer_post_count:{date}:{lang}:{username}` = number（TTL 2日）

#### `selectInfluencersWithRotation` 統合（diff概念）
```diff
--- a/services/x/influencerRotation.js
+++ b/services/x/influencerRotation.js
@@
 async function selectInfluencersWithRotation(lang, count) {
   const dateString = new Date().toISOString().split('T')[0];

+  const { getInfluencerRolling } = require("./influencerPerformance");
+  async function getCap(username) {
+    const roll = await getInfluencerRolling(7, lang, username);
+    const er = roll?.avgEngagementRate;
+    if (er == null) return 1;        // データなしは保守的に1
+    if (er >= 0.02) return 2;
+    if (er < 0.01) return 1;
+    return 1;
+  }
+
+  async function canPost(username) {
+    const cap = await getCap(username);
+    const key = `x:influencer_post_count:${dateString}:${lang}:${username}`;
+    const n = (await kv.get(key)) || 0;
+    return n < cap;
+  }

   // 既存のローテーション候補から選ぶ
   const candidates = await getRotationCandidates(lang, dateString);

-  const selected = [];
+  const selected = [];
   for (const username of candidates) {
     if (selected.length >= count) break;
     if (await isInCooldown(lang, username)) continue;
-    if (await hasPostedToday(lang, username)) continue;
+    if (!(await canPost(username))) continue;
     selected.push(username);
   }
   return selected;
 }
```

投稿成功時にカウントを増やす：
- 投稿処理（quote repost等）成功後に
  - `INCR x:influencer_post_count:{date}:{lang}:{username}`（`@vercel/kv`でincrが難しければ get→set でも可、ただしロック推奨）

### 4.2 エラーハンドリング
- rollingが取れない：cap=1で通常ローテーション（安全側）
- KV不調：従来ロジックにフォールバック（posted_todayのみ等）
- データ不整合（ERが異常値）：`avgER>0.2` 等は外れ値としてクリップ（ログ）

---

## 5. P1-2: 投稿タイミング最適化

### 5.1 タイミング分析の実装

#### 高エンゲージメントタイミングの特定（UTC hour別）
- 日次ダッシュボードで作った `timing.byUtcHour` を蓄積し、7日移動平均で「強い時間帯」を算出
- 指標：`avgER_hour_7d`（サンプル数が少ないhourは除外）
- 保存：
  - `x:timing:roll:7d:{lang}` = `{ byUtcHour:[...], bestHours:[...] }` TTL 30日

**構造例**
```json
{
  "lang": "en",
  "windowDays": 7,
  "byUtcHour": [{ "hour": 13, "posts": 40, "avgER": 0.028 }],
  "bestHours": [13,14,15],
  "updatedAt": "..."
}
```

### 5.2 Cronスケジュールの動的調整（現実解）
VercelのCron（`vercel.json`）は**デプロイ成果物**なので、実行時に自動書き換えは基本不可（可能でも運用事故が増える）です。実践的には以下のどちらか：

**推奨（安全・実装容易）: 固定Cron + 実行時に「投稿する/しない」を判定**
- 例：15分ごとに起動（固定）
- 起動時に `x:timing:roll:7d:{lang}` を見て、現在UTC hourがbestHoursに含まれる場合のみ投稿
- これで「動的スケジュール」と同等の効果が出る

**代替: GitHub Actionsでvercel.jsonを書き換えて再デプロイ**
- 自動化できるが、デプロイ頻度増・失敗時影響大  
- P1では非推奨、P2以降で検討

#### スケジュール変更の検証
- 変更前後で
  - `avgER`、`impressions/post`、`engagements/post`
  - bestHours内投稿比率
  を7日単位で比較（A/B：偶数日だけ適用など）

---

## 6. 実装順序とテスト戦略

### 6.1 実装順序（依存関係つき）
1) **フェーズ1（P0-1）**  
   - 投稿時マッピング保存（`x:post:influencer:{tweetId}`）を確実化  
   - Webhookで `x:eng:tweet:{tweetId}` 増分保存  
   - 日次で `buildInfluencerDailyPerformance()` を回す（metricsFetcherは既存getTweetMetrics）
2) **フェーズ2（P0-2）**  
   - `generateEngagementDashboard()` に `extensions` を追加  
   - UTC hour別集計を追加
3) **フェーズ3（P1-1）**  
   - rolling 7d生成（rebuild）  
   - rotationにcap/優先度を統合  
   - post_countカウンタ導入
4) **フェーズ4（P1-2）**  
   - timing rolling 7d生成  
   - 固定Cron + 実行時ゲートで最適時間帯に寄せる

### 6.2 テスト戦略
- ユニット：新規service（increment/集計/rolling）とdashboard拡張
- 統合：  
  - (1) 投稿→postTracker保存→マッピング保存  
  - (2) Webhookイベント投入→tweet集計更新  
  - (3) 日次metrics取得モック→influencer日次生成→dashboard生成
- ロールバック：  
  - rotation優先ロジックはフラグ（ENV `X_ROTATION_WEIGHTING=off`）で無効化可能に  
  - timingゲートもフラグで無効化（常に投稿）に戻せる

---

## 7. パフォーマンスとスケーラビリティ

### 7.1 KVアクセス最適化
- Webhookは「1イベント=最大2KV（mapping get + tweet set）」に抑える  
  - さらに最適化するなら mappingをtweet集計に冗長保持し、2回目以降はmapping getを省略
- 日次バッチは posts数（180-220）× metrics API 呼び出しが支配的  
  - 既存のリトライ/レート制御を維持
- キャッシュ：`x:post:influencer:{tweetId}` は頻繁に読むのでTTL長め＋冗長化でread削減

### 7.2 データ整合性（同時更新）
- Webhook同時更新：tweet集計は get→set なので競合し得る  
  - P0は許容（確定値は日次で回復）  
  - 可能ならUpstashの原子操作（HINCRBY）へ移行が理想（P1.5）
- 不整合検出：
  - `x:queue:missing_influencer_map`
  - `x:queue:missing_impressions`
  を定期処理して再計算

---

## 8. リスク評価と対策

### 8.1 実装リスク
- **署名検証でraw body問題**：本番でWebhookが弾かれる/偽陽性  
  - 対策：`bodyParser:false` + raw body取得を早期に実装（セキュリティ上P0相当）
- **Webhook重複でカウンタ過大**  
  - 対策：速報用途に限定し、確定値は日次X APIで上書き（本設計）
- **マッピング欠損**（投稿保存失敗）  
  - 対策：投稿成功後のマッピング保存を「必須」扱いにし、失敗時はキューへ

### 8.2 運用リスク
- KV容量/キー増加  
  - 対策：TTL設計（45日/180日）を厳守、日次集計は必要最小限
- レート制限（metrics取得）  
  - 対策：日次バッチの分散、失敗tweetは翌日に繰越キュー

---

## 9. 結論と次のアクション

### 総合的な結論
Webhookは「リアルタイム反応速度」と「バイラル検知」に強く、ERの確定にはimpressionsが必要です。よって、Webhookはtweet単位の速報カウンタに正規化し、日次のX APIメトリクスで確定集計（influencer日次→rolling）を作る二段構えが最も実装容易で堅牢です。これを基にrotation重み付けと時間帯ゲートを導入すれば、1週間以内に実運用で改善が出ます。

### 即座に実行すべき具体的アクション（3-5項目）
1) 投稿成功時に `x:post:influencer:{tweetId}` を必ず保存（username/lang/postType/postedAt）  
2) `services/x/influencerPerformance.js` を追加し、Webhookで `x:eng:tweet:{tweetId}` を増分更新  
3) `updateMetricsForDate()` の後段で `buildInfluencerDailyPerformance()` を呼び、influencer日次を生成  
4) `generateEngagementDashboard()` に `extensions.influencers` と `extensions.timing` を追加（後方互換維持）  
5) P1準備として `x:influencer_post_count:{date}:{lang}:{username}` カウンタ導入（cap制御の土台）

必要なら、あなたの現行 `api/x-webhook.js` の残り（`handleSingleReplyEvent`以降、`updateEngagementStats`の現物）と `api/x-quote-repost.js` のマッピング保存部分を貼ってください。差分が最小になる形で、実ファイルに合わせたパッチに落とし込みます。

---

## API使用量

- **入力トークン**: 12383
- **出力トークン**: 7870
- **合計トークン**: 20253
