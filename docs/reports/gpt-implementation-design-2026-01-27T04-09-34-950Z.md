# 実装設計案（GPT-5.2-2025-12-11解析）
**作成日時**: 2026-01-27T04:09:34.954Z
**解析AI**: GPT-5.2-2025-12-11
**目的**: X投稿戦略の最適化案に基づく実装設計
**ベース**: final-optimization-plan.md

---

### 1. エグゼクティブサマリー（200-300字）
最適化案を「高頻度実行・条件付き投稿」で実装するため、(1)インフルエンサー単位の8時間クールダウンをKVで厳格化し、(2)Cronを偶数時Quote/奇数時自社投稿へ再配置、(3)各Cronに1–15分ジッター＋6言語投稿に30–60秒ウェイトを追加します。さらにKVアクセス最適化とロックで二重投稿を防ぎ、段階的に日次上限を引き上げられる安全な運用設計にします。

---

## 2. 8時間クールダウンの実装設計

### 2.1 services/x/influencerRotation.jsへの追加

#### 実装コード（追加分：完全実装・コメント付き）
```js
// services/x/influencerRotation.js
// 既存のkv初期化はそのまま利用

// 追加: 最終投稿時刻キー
const LAST_POSTED_KEY_PREFIX = 'x:influencer_last_posted:'; 
// 例: x:influencer_last_posted:ja:elonmusk

function getLastPostedKey(lang, username) {
  const l = (lang || 'en').toLowerCase();
  const u = (username || '').replace(/^@/, '').toLowerCase();
  return `${LAST_POSTED_KEY_PREFIX}${l}:${u}`;
}

/**
 * 最終投稿時刻(ISO文字列)を取得
 * KV障害時は null を返し、クールダウン判定をスキップ（=投稿を止めない）
 */
async function getLastPostedAt(lang, username) {
  if (!kv) return null;
  try {
    const key = getLastPostedKey(lang, username);
    const value = await kv.get(key);
    if (!value) return null;

    // valueはISO文字列想定
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d;
  } catch (e) {
    console.warn('[InfluencerRotation] getLastPostedAt failed:', e.message);
    return null;
  }
}

/**
 * 最終投稿時刻を記録（ISO文字列）
 * TTLは24h（8hクールダウン + 安全マージン）
 */
async function markLastPostedAt(lang, username, date = new Date()) {
  if (!kv) return false;
  try {
    const key = getLastPostedKey(lang, username);
    await kv.set(key, date.toISOString(), { ex: 24 * 60 * 60 });
    return true;
  } catch (e) {
    console.warn('[InfluencerRotation] markLastPostedAt failed:', e.message);
    return false;
  }
}

/**
 * 8時間クールダウン判定
 * lastPostedAtが取れない場合は false（=クールダウン中ではない）として扱う
 */
async function isInCooldown(lang, username, cooldownHours = 8, now = new Date()) {
  const last = await getLastPostedAt(lang, username);
  if (!last) return false;
  const diffMs = now.getTime() - last.getTime();
  return diffMs < cooldownHours * 60 * 60 * 1000;
}

/**
 * 追加: selectInfluencersWithRotation にクールダウンを組み込む版
 * - 既存の「今日投稿済み除外」に加えて「8h以内投稿除外」を行う
 * - KV障害時は従来通り（postedTodayのみ）で動作
 */
async function selectInfluencersWithRotationAndCooldown(influencers, lang, count, dateString = null) {
  if (!influencers || influencers.length === 0) return [];

  const targetDate = dateString || new Date().toISOString().split('T')[0];
  const postedToday = await getPostedInfluencersToday(lang, targetDate);

  // まず postedToday を除外
  const candidates = influencers.filter(inf => {
    const username = inf.username || inf.userId || inf.id;
    return username && !postedToday.has(username);
  });

  // 次に cooldown を除外（逐次チェック：countが小さい前提でOK）
  const available = [];
  for (const inf of candidates) {
    const username = inf.username || inf.userId || inf.id;
    if (!username) continue;
    const inCd = await isInCooldown(lang, username, 8);
    if (!inCd) available.push(inf);
    if (available.length >= count) break;
  }

  // 足りない場合は従来ロジックにフォールバック（ただしクールダウンは可能な限り維持）
  const pool = available.length >= count ? available : candidates;

  const rotationIndex = await getRotationIndex(lang, targetDate);
  const selected = [];
  for (let i = 0; i < count && i < pool.length; i++) {
    const index = (rotationIndex + i) % pool.length;
    selected.push(pool[index]);
  }

  const newIndex = pool.length > 0 ? (rotationIndex + count) % pool.length : 0;
  await updateRotationIndex(lang, newIndex, targetDate);

  return selected;
}
```

#### 既存module.exportsへの追記
```js
module.exports = {
  // 既存
  getPostedInfluencersToday,
  markInfluencerPosted,
  getRotationIndex,
  updateRotationIndex,
  selectInfluencersWithRotation,
  getRotationStats,

  // 追加
  getLastPostedAt,
  markLastPostedAt,
  isInCooldown,
  selectInfluencersWithRotationAndCooldown,
};
```

#### KVキー設計
- **キー形式**: `x:influencer_last_posted:{lang}:{username}`
- **値**: ISO文字列（例: `2026-01-27T04:45:00.000Z`）
- **TTL**: 24時間（`ex: 86400`）
- **命名規則**: `lang`/`username`は小文字、`@`は除去

#### エラーハンドリング
- KVが使えない/取得失敗: **null返却→クールダウン判定はfalse**（投稿停止で全体が止まるのを回避）
- 値が壊れている: Date parse失敗時もnull扱い

#### テスト方法（ユニットテスト例：Jest想定）
```js
// __tests__/influencerRotation.cooldown.test.js
jest.mock('@vercel/kv', () => ({
  kv: {
    get: jest.fn(),
    set: jest.fn(),
  }
}));

const { kv } = require('@vercel/kv');
const { isInCooldown, markLastPostedAt, getLastPostedAt } = require('../services/x/influencerRotation');

test('markLastPostedAt stores ISO with TTL', async () => {
  const d = new Date('2026-01-27T00:00:00.000Z');
  await markLastPostedAt('ja', 'Alice', d);
  expect(kv.set).toHaveBeenCalled();
  const [key, value, opts] = kv.set.mock.calls[0];
  expect(key).toContain('x:influencer_last_posted:ja:alice');
  expect(value).toBe(d.toISOString());
  expect(opts.ex).toBe(86400);
});

test('isInCooldown true within 8h', async () => {
  kv.get.mockResolvedValueOnce('2026-01-27T00:00:00.000Z');
  const now = new Date('2026-01-27T07:59:59.000Z');
  await expect(isInCooldown('en', 'bob', 8, now)).resolves.toBe(true);
});

test('isInCooldown false after 8h', async () => {
  kv.get.mockResolvedValueOnce('2026-01-27T00:00:00.000Z');
  const now = new Date('2026-01-27T08:00:01.000Z');
  await expect(isInCooldown('en', 'bob', 8, now)).resolves.toBe(false);
});

test('getLastPostedAt returns null on invalid value', async () => {
  kv.get.mockResolvedValueOnce('not-a-date');
  await expect(getLastPostedAt('en', 'bob')).resolves.toBe(null);
});
```

---

### 2.2 api/x-quote-repost.jsへの統合

#### 統合ポイント
- **インフルエンサー選定直後〜投稿実行直前**に、対象usernameごとに`isInCooldown`をチェック
- **投稿成功直後**に`markLastPostedAt`を呼ぶ（同時に既存の`markInfluencerPosted`も維持）

> 既存コード断片では `selectInfluencersForImpressionTarget` を使っているため、  
> 「選定結果をクールダウンでフィルタ→不足分を追加選定」または「選定関数を差し替え」が現実的です。まずは安全に**フィルタ方式**を推奨します（影響範囲が小さい）。

#### 実装コード（diff形式：要点）
```diff
diff --git a/api/x-quote-repost.js b/api/x-quote-repost.js
index 123..456 100644
--- a/api/x-quote-repost.js
+++ b/api/x-quote-repost.js
@@ -1,6 +1,7 @@
 const { postQuoteTweet } = require('../services/x/client');
 ...
+const { isInCooldown, markLastPostedAt, markInfluencerPosted } = require('../services/x/influencerRotation');

@@
 const SUPPORTED_LANGS = ['en', 'es', 'pt-br', 'ar', 'ja', 'ko'];

+async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

 module.exports = async (req, res) => {
   try {
+    // (任意) Quote Repostにも軽いジッターを入れるならここ（ただしmaxDuration注意）
+    // const jitterMs = Math.floor((60 * 1000) + Math.random() * (5 * 60 * 1000)); // 1-6分など短め推奨
+    // await sleep(jitterMs);

     // 既存: 言語ループ等
     for (const lang of SUPPORTED_LANGS) {
       ...
-      const influencers = selectInfluencersForImpressionTarget(lang, ...);
+      const influencers = selectInfluencersForImpressionTarget(lang, ...);

+      // 追加: 8時間クールダウンでフィルタ
+      const filtered = [];
+      for (const inf of influencers) {
+        const username = (inf.username || inf.userId || inf.id || '').replace(/^@/, '');
+        if (!username) continue;
+        const inCd = await isInCooldown(lang, username, 8);
+        if (!inCd) filtered.push(inf);
+      }
+
+      // フィルタで0件なら、その言語はスキップ（=条件付き実行）
+      if (filtered.length === 0) {
+        console.log(`[Quote Repost] cooldown filtered all influencers for ${lang}, skip`);
+        continue;
+      }

-      for (const influencer of influencers) {
+      for (const influencer of filtered) {
         const username = (influencer.username || influencer.userId || influencer.id || '').replace(/^@/, '');
         ...
         // 既存: shouldPostQuoteRepost / daily limit / etc
         ...
         const result = await postQuoteTweet(...);
         if (result?.success) {
+          // 追加: 最終投稿時刻を記録（8hクールダウン用）
+          await markLastPostedAt(lang, username, new Date());
+          // 既存の「今日投稿済み」も維持（同日ローテーション用）
+          await markInfluencerPosted(lang, username);
         }
       }
     }

     return res.status(200).json({ ok: true });
   } catch (e) {
     console.error('[Quote Repost] error:', e);
     return res.status(500).json({ ok: false, error: e.message });
   }
 };
```

#### エラーハンドリング
- `isInCooldown`内部でKV失敗→false扱いなので、Quote Repost全体は止まりにくい
- `markLastPostedAt`失敗→ログのみ、投稿自体は成功扱い（次回クールダウンが効かないリスクはあるが可用性優先）

#### テスト方法（統合テスト例）
- **モック**: `postQuoteTweet`を成功固定、`isInCooldown`をtrue/falseで切替
- **期待**:
  - trueのとき投稿関数が呼ばれない
  - falseのとき投稿され、`markLastPostedAt`が呼ばれる

```js
// __tests__/x-quote-repost.cooldown.int.test.js
jest.mock('../services/x/client', () => ({ postQuoteTweet: jest.fn() }));
jest.mock('../services/x/influencerRotation', () => ({
  isInCooldown: jest.fn(),
  markLastPostedAt: jest.fn(),
  markInfluencerPosted: jest.fn(),
}));

const { postQuoteTweet } = require('../services/x/client');
const { isInCooldown, markLastPostedAt } = require('../services/x/influencerRotation');
const handler = require('../api/x-quote-repost');

test('skips posting when in cooldown', async () => {
  isInCooldown.mockResolvedValue(true);
  await handler({ method: 'GET' }, mockRes());
  expect(postQuoteTweet).not.toHaveBeenCalled();
});

test('posts and marks lastPostedAt when not in cooldown', async () => {
  isInCooldown.mockResolvedValue(false);
  postQuoteTweet.mockResolvedValue({ success: true });
  await handler({ method: 'GET' }, mockRes());
  expect(postQuoteTweet).toHaveBeenCalled();
  expect(markLastPostedAt).toHaveBeenCalled();
});
```

---

## 3. Cronスケジュールの変更

### 3.1 vercel.jsonの変更内容

#### diff形式（提案）
```diff
diff --git a/vercel.json b/vercel.json
--- a/vercel.json
+++ b/vercel.json
@@
   "crons": [
@@
-    { "path": "/api/vsl1-post", "schedule": "0 14,20 * * *" },
+    { "path": "/api/vsl1-post", "schedule": "0 1,13,21 * * *" },

@@
-    { "path": "/api/x-post-free-report", "schedule": "0 12,13,14,15,18 * * *" },
-    { "path": "/api/x-post-minimal-version-cron", "schedule": "0 8,12,18,20 * * *" },
-    { "path": "/api/x-quote-repost", "schedule": "0 0,1,13,14,20,21,22 * * *" },
+    { "path": "/api/x-post-minimal-version-cron", "schedule": "0 7,15,23 * * *" },
+    { "path": "/api/x-post-free-report", "schedule": "30 4,10,17,19 * * *" },
+    { "path": "/api/x-quote-repost", "schedule": "0 0,2,4,6,8,10,12,14,16,18,20,22 * * *" },
+    { "path": "/api/x-update-influencer-stock", "schedule": "0 */2 * * *" },

     { "path": "/api/x-quote-repost-metrics", "schedule": "0 1 * * *" },
     { "path": "/api/x-engagement-metrics", "schedule": "0 0 * * *" },
     { "path": "/api/x-post-performance-analysis", "schedule": "0 1 * * *" },
@@
   ]
 }
```

#### 変更理由
- Quote Repostを**偶数時2時間ごと**に固定し、鮮度と捕捉率を最大化
- 自社投稿（VSL/Minimal）を**奇数時**に寄せて衝突を減らす
- Free Reportを**30分オフセット**で隙間を埋め、バーストを回避
- ストック更新を**2時間ごと**にし、Quote Repostの実行頻度と同期

#### 互換性（既存スケジュールとの整合）
- 既存の`/api/cron`（15分）等は維持可能
- 既存の`x-post-free-report`や`x-post-minimal-version-cron`は**回数が減る**ため、投稿数が一時的に下がるが「最適化案の確定スケジュール」に一致
- 新規Cron `/api/x-update-influencer-stock` を追加する場合、**実ファイル名が `api/x-update-influencer-stock.js` であること**を確認（pathの末尾は拡張子なしがVercel Cronの一般形）

---

## 4. ジッター（揺らぎ）の実装設計

### 4.1 実装方法

#### 共通ユーティリティ化（推奨）
`utils/scheduler.js` を新設して各APIから呼ぶ（重複排除＋テスト容易）。
```js
// utils/scheduler.js
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 1-15分ジッター（デフォルト）
 * maxDurationが短い関数では上限を下げられるようにする
 */
async function applyJitter({ minMs = 60_000, maxMs = 15 * 60_000, label = '' } = {}) {
  const jitterMs = Math.floor(minMs + Math.random() * (maxMs - minMs));
  console.log(`[Jitter] ${label} sleeping ${Math.round(jitterMs/1000)}s`);
  await sleep(jitterMs);
}

module.exports = { sleep, applyJitter };
```

#### 各スクリプトへの追加（例）
- **api/vsl1-post.js** 冒頭に追加
```js
const { applyJitter } = require('../utils/scheduler');

module.exports = async (req, res) => {
  // maxDurationに余裕がある前提。なければmaxMsを短縮
  await applyJitter({ label: 'vsl1-post', minMs: 60_000, maxMs: 15 * 60_000 });

  // 以降、既存処理
};
```

- **api/x-post-minimal-version-cron.js / api/x-post-free-report.js** も同様

#### エラーハンドリング
- `applyJitter`は基本的に例外を投げない（sleepのみ）
- もし`setTimeout`が中断される環境でも、失敗時は即時続行でOK（投稿停止より可用性優先）

#### タイムアウト処理（重要）
- Vercel Functionsの`maxDuration`が60秒のままだと**1–15分ジッターは確実にタイムアウト**します。  
  対応はどちらか必須：
  1) **maxDurationを引き上げる**（プラン制約に依存）  
  2) **ジッター上限を短縮**（例: 5–20秒 or 10–60秒）し、分散はCron側の分離で担保

> 現状 `api/x-quote-repost.js` と `api/x-update-influencer-stock.js` は maxDuration:60。  
> 自社投稿系も同様なら、**ジッターは「数十秒」へ縮小**するのが現実的です。  
> 最適化案の1–15分を守るなら、maxDurationを最低でも900秒以上に。

---

### 4.2 テスト方法

#### ユニットテスト例
```js
// __tests__/scheduler.jitter.test.js
jest.useFakeTimers();
const { applyJitter } = require('../utils/scheduler');

test('applyJitter waits within range', async () => {
  const p = applyJitter({ minMs: 1000, maxMs: 2000, label: 'test' });
  jest.advanceTimersByTime(2500);
  await p;
});
```

#### 統合テスト例
- `applyJitter`をモックして0msにし、投稿処理だけ検証（CIで遅くしない）

---

## 5. 言語間ウェイトの実装設計

### 5.1 実装方法

#### 共通関数化（推奨）
```js
// utils/scheduler.js に追記
async function applyLanguageWait({ minMs = 30_000, maxMs = 60_000, label = '' } = {}) {
  const waitMs = Math.floor(minMs + Math.random() * (maxMs - minMs));
  console.log(`[LangWait] ${label} sleeping ${Math.round(waitMs/1000)}s`);
  await sleep(waitMs);
}

module.exports = { sleep, applyJitter, applyLanguageWait };
```

#### 6言語ループへの組み込み（例）
```js
const { applyLanguageWait } = require('../utils/scheduler');
const SUPPORTED_LANGS = ['en', 'es', 'pt-br', 'ar', 'ja', 'ko'];

for (let i = 0; i < SUPPORTED_LANGS.length; i++) {
  const lang = SUPPORTED_LANGS[i];

  try {
    await postToX(lang); // 既存の投稿処理
  } catch (e) {
    console.warn(`[Post] failed lang=${lang}:`, e.message);
    // 失敗しても次言語へ（全停止を避ける）
  }

  // 最後の言語では待たない
  if (i < SUPPORTED_LANGS.length - 1) {
    await applyLanguageWait({ label: `between ${lang} -> next` });
  }
}
```

#### エラーハンドリング
- ある言語の投稿失敗は**次言語へ継続**
- ただし「X APIの一時障害」などが疑われる場合は、連続失敗回数で早期停止（P1で導入推奨）

#### タイムアウト処理
- 6言語×(30–60秒)だけで**2.5〜5分**消費します。  
  ここも `maxDuration` と整合が必要です（ジッター同様）。

---

### 5.2 テスト方法

#### ユニットテスト例（待機をモック）
```js
jest.mock('../utils/scheduler', () => ({
  applyLanguageWait: jest.fn(() => Promise.resolve()),
}));

test('continues even if one language fails', async () => {
  // postToXを lang=es だけthrowするようにして、他が呼ばれることを確認
});
```

#### 統合テスト例
- `postToX`をモックし、呼び出し順序が `SUPPORTED_LANGS` 通りであることを検証

---

## 6. 実装順序とテスト戦略

### 6.1 実装順序

#### フェーズ1: 8時間クールダウンの実装（P0）
1) `services/x/influencerRotation.js` に `getLastPostedAt/markLastPostedAt/isInCooldown`追加  
2) `api/x-quote-repost.js` に統合（投稿成功時に必ずmark）  
**依存**: KVが使えること（ただし無くても動く設計）

#### フェーズ2: Cronスケジュール変更（P0）
1) `vercel.json` を最適化案のUTCスケジュールへ  
2) `x-update-influencer-stock` Cron追加（ファイル/パス整合確認）  
**依存**: フェーズ1が先（頻度増でクールダウン未実装だと過投稿リスク）

#### フェーズ3: ジッター＋言語間ウェイト（P0）
1) `utils/scheduler.js` 追加  
2) `vsl1-post / minimal / free-report` に導入  
3) **maxDuration見直し**（ここが最大の実装ブロッカー）  
**依存**: フェーズ2後でも良いが、バースト回避のため早め推奨

---

### 6.2 テスト戦略

#### ユニットテスト
- `isInCooldown`境界（7:59:59 / 8:00:00）
- KV障害時（kv=null、kv.get throw）でも落ちない
- schedulerの待機関数（fake timers）

#### 統合テスト（ステージング推奨）
- 1回のCron実行で「投稿される/されない」が条件通りか
- 同一インフルエンサーに8時間以内で再投稿されないか（ログ＋KV確認）

#### ロールバック戦略
- `vercel.json` を即時戻せるようPRを分ける（Cron変更だけを独立PR）
- クールダウンは**フラグで無効化**できるようにするのが安全  
  例: `process.env.X_COOLDOWN_ENABLED !== 'false'` のときのみ適用

---

## 7. パフォーマンスとスケーラビリティ

### 7.1 KVアクセスの最適化
- **バッチ化**: 可能なら`kv.mget`相当（Vercel KVのAPI可否に依存）で、候補インフルエンサーのlastPostedをまとめて取得  
  できない場合でも、`count`が小さい前提で「必要数に達したらチェック打ち切り」でKV readを抑制
- **キャッシュ**: 1実行内だけ `Map(username->Date|null)` を持ち、同一usernameの重複getを避ける
- **KVエラー時**: 取得失敗はスキップ（投稿停止しない）。ただしログに`cooldown_unavailable`を出して監視

### 7.2 並行処理の考慮
- **同時実行**: 6言語を並列にするとレート制限とスパム判定リスクが上がるため、基本は逐次＋ウェイト
- **レート制限**: 「15分100リクエスト」制約があるなら、投稿API呼び出し前に簡易トークンバケット（KV）を置くのが堅い（P1で導入推奨）
- **タイムアウト**: ジッター/ウェイトを入れるほどmaxDurationが重要。ここを満たせない場合は「ジッター短縮＋Cron分離」で代替

---

## 8. リスク評価と対策

### 8.1 実装リスク
- **リスク**: maxDuration不足でジッター/ウェイトがタイムアウト  
  **対策**: (A) maxDuration引き上げ、無理なら(B)ジッターを秒単位へ短縮
- **リスク**: KV障害でクールダウンが効かず過投稿  
  **対策**: 日次上限・15分上限を既存の`checkDailyPostLimit`等で二重に守る／KV障害アラート

### 8.2 運用リスク
- **リスク**: Quote頻度増で同一インフルエンサーに偏る  
  **対策**: クールダウン＋ローテーション＋「不足時はスキップ」を優先（無理に埋めない）
- **リスク**: テキスト類似でスパム判定  
  **対策**: P1で類似度チェック導入、テンプレのシャッフル＋可変要素（数値/問い/語尾）を増やす

---

## 9. 結論と次のアクション

### 総合的な結論
Quote Repostを2時間ごとに回す前提では、**8時間クールダウン（KV）**が安全運用の要で、Cron再配置とジッター/言語ウェイトはバースト・スパム判定回避に効きます。ただし現状の`maxDuration:60`のままでは「分単位ジッター/ウェイト」は成立しないため、**maxDuration設計の見直し**が実装の成否を決めます。

### 即座に実行すべき具体的アクション（3-5項目）
1) `services/x/influencerRotation.js`にクールダウン3関数＋`markLastPostedAt`を実装し、`api/x-quote-repost.js`へ統合  
2) `vercel.json`のCronを最適化案のUTCスケジュールへ変更（Cron変更PRは単独で）  
3) `maxDuration`制約を確認し、可能なら自社投稿系も含めて延長（不可ならジッター/ウェイトを秒単位に調整）  
4) `utils/scheduler.js`を追加し、ジッターと言語間ウェイトを共通化して各投稿APIへ適用  
5) ステージングで「8時間以内に同一インフルエンサーへ投稿されない」ことをKVとログで検証してから本番反映

必要なら、現状の `api/vsl1-post.js / api/x-post-minimal-version-cron.js / api/x-post-free-report.js` の実コードを貼ってください。ループ構造に合わせて、差分（diff）でそのまま適用できる形に落とし込みます。

---

## API使用量

- **入力トークン**: 9197
- **出力トークン**: 6824
- **合計トークン**: 16021
