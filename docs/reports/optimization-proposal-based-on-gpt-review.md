# 70リストへの最適化案（GPT-5.2レビュー基づく実装提案）
**作成日時**: 2026-01-27
**ベース**: GPT-5.2-2025-12-11レビュー結果

---

## 📋 エグゼクティブサマリー

GPT-5.2のレビューを踏まえ、以下の5つのP0改善を優先的に実装します：

1. **インフルエンサー単位クールダウン（8時間）**: 同一インフルエンサーへの連続投稿を防止
2. **枯渇時リセット禁止**: 候補不足時はスキップ/別言語へフォールバック
3. **15分窓レートリミッタ**: 自然さを優先した安全弁
4. **構造化ログ**: 投稿決定理由を記録して最適化可能にする
5. **日次上限の一元化確認**: ハードコード50が残っていないか確認

---

## 🎯 最適化目標

### 短期目標（P0実装後）
- **日次投稿数**: 40〜60投稿/日（安全運用開始）
- **インフルエンサー1人あたり**: 平均1投稿/日、上位のみ2投稿/日
- **スパム判定リスク**: 低（クールダウンと分散により）

### 中期目標（2〜4週間後）
- **日次投稿数**: 60〜90投稿/日（安定後）
- **インフルエンサー1人あたり**: 動的に0〜2投稿/日（反応に応じて）
- **スパム判定リスク**: 低〜中（指標を監視しながら段階的に増加）

---

## 🔧 P0: 即座に実装すべき改善

### 1. インフルエンサー単位クールダウン（8時間）

**目的**: 同一インフルエンサーへの短時間連投を防止し、スパム判定リスクを低減

**実装場所**: `services/x/influencerRotation.js`

**変更内容**:
- KVに `x:influencer_last_posted:{lang}:{username}` を保存（TTL: 24時間）
- `selectInfluencersWithRotation` でクールダウンをチェック
- クールダウン時間: 8時間（環境変数 `X_INFLUENCER_COOLDOWN_HOURS` で設定可能、デフォルト8）

**実装コード**:
```javascript
// services/x/influencerRotation.js に追加

const COOLDOWN_KEY_PREFIX = 'x:influencer_last_posted:';

/**
 * インフルエンサーの最終投稿時刻を取得
 */
async function getLastPostedAt(lang, username) {
  if (!kv) return null;
  try {
    const key = `${COOLDOWN_KEY_PREFIX}${lang.toLowerCase()}:${username}`;
    const timestamp = await kv.get(key);
    return timestamp ? new Date(timestamp) : null;
  } catch (error) {
    console.warn(`[InfluencerRotation] Failed to get last posted at for @${username}:`, error.message);
    return null;
  }
}

/**
 * インフルエンサーの最終投稿時刻を記録
 */
async function markLastPostedAt(lang, username) {
  if (!kv) return false;
  try {
    const key = `${COOLDOWN_KEY_PREFIX}${lang.toLowerCase()}:${username}`;
    await kv.set(key, new Date().toISOString(), { ex: 24 * 60 * 60 }); // TTL: 24時間
    return true;
  } catch (error) {
    console.warn(`[InfluencerRotation] Failed to mark last posted at for @${username}:`, error.message);
    return false;
  }
}

/**
 * クールダウン期間内かどうかをチェック
 */
function isInCooldown(lastPostedAt, cooldownHours = 8) {
  if (!lastPostedAt) return false;
  const hoursDiff = (new Date() - lastPostedAt) / (1000 * 60 * 60);
  return hoursDiff < cooldownHours;
}

// selectInfluencersWithRotation を修正
async function selectInfluencersWithRotation(influencers, lang, count, dateString = null) {
  // ... 既存のコード ...
  
  const cooldownHours = parseInt(process.env.X_INFLUENCER_COOLDOWN_HOURS || '8', 10);
  
  // 利用可能なインフルエンサーをフィルタリング（投稿済み + クールダウン）
  const availableInfluencers = influencers.filter(async (inf) => {
    const username = inf.username || inf.userId || inf.id;
    if (!username) return false;
    
    // 今日既に投稿したインフルエンサーを除外
    if (postedToday.has(username)) return false;
    
    // クールダウン期間内のインフルエンサーを除外
    const lastPostedAt = await getLastPostedAt(lang, username);
    if (isInCooldown(lastPostedAt, cooldownHours)) {
      console.log(`[InfluencerRotation] ⏰ @${username} is in cooldown (last posted: ${lastPostedAt})`);
      return false;
    }
    
    return true;
  });
  
  // 利用可能なインフルエンサーが不足している場合、リセットせずにスキップ
  if (availableInfluencers.length < count) {
    console.log(`[InfluencerRotation] ⚠️ Only ${availableInfluencers.length} available influencers for ${lang} (required: ${count}), skipping rotation reset`);
    // GPT-5.2推奨: リセットせず、スキップまたは別言語へフォールバック
    return availableInfluencers.slice(0, count); // 利用可能な分だけ返す
  }
  
  // ... 既存のローテーションロジック ...
  
  // 選択されたインフルエンサーの最終投稿時刻を記録
  for (const inf of selected) {
    const username = inf.username || inf.userId || inf.id;
    if (username) {
      await markLastPostedAt(lang, username);
    }
  }
  
  return selected;
}
```

---

### 2. 枯渇時リセット禁止

**目的**: 同一インフルエンサー偏重を防止し、自然な分散を実現

**実装場所**: `services/x/influencerRotation.js`

**変更内容**:
- 候補不足時はリセットせず、利用可能な分だけ返す
- または、別言語へフォールバック（`api/x-quote-repost.js` で実装）

**実装コード**:
```javascript
// services/x/influencerRotation.js の selectInfluencersWithRotation を修正

// 変更前（178-208行目）:
if (availableInfluencers.length < count) {
  console.log(`[InfluencerRotation] ⚠️ Only ${availableInfluencers.length} available influencers for ${lang}, resetting rotation`);
  // 投稿済みリストをクリア（リセット）
  // ...
  return selected; // 全インフルエンサーから選択
}

// 変更後:
if (availableInfluencers.length < count) {
  console.log(`[InfluencerRotation] ⚠️ Only ${availableInfluencers.length} available influencers for ${lang} (required: ${count}), skipping rotation reset`);
  // GPT-5.2推奨: リセットせず、利用可能な分だけ返す
  // または、別言語へフォールバック（api/x-quote-repost.js で実装）
  const selected = [];
  const rotationIndex = await getRotationIndex(lang, targetDate);
  for (let i = 0; i < availableInfluencers.length && i < count; i++) {
    const index = (rotationIndex + i) % availableInfluencers.length;
    selected.push(availableInfluencers[index]);
  }
  // ローテーションインデックスを更新
  const newIndex = (rotationIndex + selected.length) % availableInfluencers.length;
  await updateRotationIndex(lang, newIndex, targetDate);
  console.log(`[InfluencerRotation] ✅ Selected ${selected.length} influencers (available: ${availableInfluencers.length}, required: ${count})`);
  return selected; // 利用可能な分だけ返す
}
```

---

### 3. 15分窓レートリミッタ

**目的**: 自然さを優先した安全弁（X APIレート制限: 100/15min）

**実装場所**: `services/x/optimization.js`

**変更内容**:
- 15分単位の投稿数カウンタを追加
- 環境変数 `X_MAX_POSTS_PER_15M` で設定可能（デフォルト: 10）

**実装コード**:
```javascript
// services/x/optimization.js に追加

const POSTS_PER_15M_KEY_PREFIX = 'x:posts_per_15m:';

/**
 * 15分窓の投稿数を取得
 */
async function getPostsPer15M(windowKey) {
  let kv = null;
  try {
    const kvModule = require('@vercel/kv');
    kv = kvModule.kv;
  } catch (error) {
    console.warn('[Optimization] @vercel/kv not available for 15m post count');
    return 0;
  }

  if (!kv) return 0;

  try {
    const key = `${POSTS_PER_15M_KEY_PREFIX}${windowKey}`;
    const count = await kv.get(key);
    return count !== null && typeof count === 'number' ? count : 0;
  } catch (error) {
    console.error('[Optimization] Failed to get posts per 15m:', error.message);
    return 0;
  }
}

/**
 * 15分窓の投稿数をインクリメント
 */
async function incrementPostsPer15M(windowKey, count = 1) {
  let kv = null;
  try {
    const kvModule = require('@vercel/kv');
    kv = kvModule.kv;
  } catch (error) {
    console.warn('[Optimization] @vercel/kv not available for 15m post count');
    return false;
  }

  if (!kv) return false;

  try {
    const key = `${POSTS_PER_15M_KEY_PREFIX}${windowKey}`;
    const current = await getPostsPer15M(windowKey);
    const newCount = current + count;
    await kv.set(key, newCount, { ex: 15 * 60 }); // TTL: 15分
    return true;
  } catch (error) {
    console.error('[Optimization] Failed to increment posts per 15m:', error.message);
    return false;
  }
}

/**
 * 15分窓のレート制限をチェック
 */
function checkPostsPer15MLimit(currentCount, maxPosts = null) {
  const max = maxPosts !== null ? maxPosts : parseInt(process.env.X_MAX_POSTS_PER_15M || '10', 10);
  return currentCount < max;
}

/**
 * 15分窓のキーを生成（現在時刻を15分単位で切り捨て）
 */
function get15MWindowKey() {
  const now = new Date();
  const minutes = now.getMinutes();
  const windowStart = new Date(now);
  windowStart.setMinutes(Math.floor(minutes / 15) * 15, 0, 0);
  return windowStart.toISOString();
}

// エクスポートに追加
module.exports = {
  // ... 既存のエクスポート ...
  getPostsPer15M,
  incrementPostsPer15M,
  checkPostsPer15MLimit,
  get15MWindowKey,
};
```

**使用例（api/x-quote-repost.js）**:
```javascript
// api/x-quote-repost.js に追加

const { getPostsPer15M, incrementPostsPer15M, checkPostsPer15MLimit, get15MWindowKey } = require('../services/x/optimization');

// 15分窓のレート制限をチェック
const windowKey = get15MWindowKey();
const currentPostsPer15M = await getPostsPer15M(windowKey);
const maxPostsPer15M = parseInt(process.env.X_MAX_POSTS_PER_15M || '10', 10);

if (!checkPostsPer15MLimit(currentPostsPer15M, maxPostsPer15M)) {
  console.log(`[Quote Repost] ⏰ 15-minute window limit reached (${currentPostsPer15M}/${maxPostsPer15M}), skipping`);
  return [];
}

// 投稿成功後にインクリメント
await incrementPostsPer15M(windowKey, 1);
```

---

### 4. 構造化ログ

**目的**: 投稿決定理由を記録して最適化可能にする

**実装場所**: `api/x-quote-repost.js`

**変更内容**:
- 投稿決定時の理由（スコア、クールダウン、重複判定など）を構造化ログで記録
- Vercel KVまたはログファイルに保存

**実装コード**:
```javascript
// api/x-quote-repost.js に追加

/**
 * 投稿決定理由を記録
 */
async function logPostDecision(lang, influencer, decision, reason) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    lang,
    influencer: {
      username: influencer.username,
      userId: influencer.userId,
      tweetId: influencer.tweetId,
    },
    decision, // 'posted' | 'skipped' | 'cooldown' | 'duplicate' | 'limit_reached'
    reason,
  };

  // コンソールに出力（構造化ログ）
  console.log(`[Quote Repost] 📊 Post decision:`, JSON.stringify(logEntry, null, 2));

  // オプション: KVに保存（分析用）
  // const { kv } = require('@vercel/kv');
  // if (kv) {
  //   const key = `x:post_decisions:${new Date().toISOString().split('T')[0]}`;
  //   await kv.lpush(key, JSON.stringify(logEntry));
  //   await kv.expire(key, 7 * 24 * 60 * 60); // TTL: 7日
  // }
}

// 使用例
await logPostDecision(lang, influencer, 'posted', {
  score: influencer.score,
  cooldownHours: hoursSinceLastPost,
  duplicateCheck: 'passed',
  timingCheck: 'passed',
});

await logPostDecision(lang, influencer, 'cooldown', {
  lastPostedAt: lastPostedAt.toISOString(),
  cooldownHours: 8,
  hoursSinceLastPost: hoursSinceLastPost,
});
```

---

### 5. 日次上限の一元化確認

**目的**: ハードコード50が残っていないか確認

**実装場所**: `api/x-quote-repost.js`

**確認内容**:
- 既に環境変数 `X_MAX_DAILY_POSTS` に統一されているか確認
- ハードコード50が残っていないか検索

**確認コマンド**:
```bash
grep -r "50" api/x-quote-repost.js | grep -i "daily\|post\|limit"
```

---

## 📊 環境変数の推奨値

```bash
# 日次投稿数上限（安全運用開始: 40-60、安定後: 60-90）
X_MAX_DAILY_POSTS=60

# 15分窓の投稿数上限（自然さ優先）
X_MAX_POSTS_PER_15M=10

# インフルエンサー単位のクールダウン時間（時間）
X_INFLUENCER_COOLDOWN_HOURS=8

# 1人あたりの日次上限（オプション、将来的に実装）
X_PER_INFLUENCER_DAILY_CAP=2

# グローバル最小投稿間隔（分、ジッター込みで5-15分）
X_GLOBAL_MIN_GAP_MINUTES=8
```

---

## 🚀 実装手順

### Step 1: インフルエンサー単位クールダウン（P0-1）
1. `services/x/influencerRotation.js` にクールダウン機能を追加
2. `selectInfluencersWithRotation` を修正
3. テスト: 同一インフルエンサーへの8時間以内の投稿がブロックされることを確認

### Step 2: 枯渇時リセット禁止（P0-2）
1. `services/x/influencerRotation.js` のリセットロジックを削除
2. 利用可能な分だけ返すように修正
3. テスト: 候補不足時にリセットされないことを確認

### Step 3: 15分窓レートリミッタ（P0-3）
1. `services/x/optimization.js` に15分窓機能を追加
2. `api/x-quote-repost.js` で使用
3. テスト: 15分以内に10投稿を超えるとブロックされることを確認

### Step 4: 構造化ログ（P0-4）
1. `api/x-quote-repost.js` にログ機能を追加
2. 投稿決定時の理由を記録
3. テスト: ログが正しく出力されることを確認

### Step 5: 日次上限の一元化確認（P0-5）
1. ハードコード50を検索
2. 残っていれば環境変数に統一
3. テスト: 環境変数が正しく反映されることを確認

---

## 📈 期待される効果

### 短期（P0実装後）
- **スパム判定リスク**: 中 → 低（クールダウンと分散により）
- **投稿数**: 40〜60投稿/日（安全運用）
- **同一インフルエンサー偏重**: 解消（クールダウンとリセット禁止により）

### 中期（2〜4週間後）
- **投稿数**: 60〜90投稿/日（安定後）
- **インプレッション**: 段階的に増加
- **スパム判定リスク**: 低（指標を監視しながら）

---

## ⚠️ リスク評価

### スパム判定リスク
- **現状**: 中（40〜60/日）→ 高（100+/日）
- **対策**: クールダウン、分散、文面多様化、枯渇時スキップ、バックオフ

### X APIレート制限超過リスク
- **現状**: 低（90/日は余裕）
- **対策**: 15分窓レートリミッタ、日次上限、時間単位上限

### コスト増加リスク
- **現状**: 中（投稿数増 = 引用5cr + 生成10cr）
- **対策**: AI生成は反応が良い枠だけ、他は軽量テンプレ

---

## 🎯 次のアクション

1. **P0実装**: 上記5つの改善を即座に実装
2. **監視**: 投稿数、スパム判定、エンゲージメントを監視
3. **段階的増加**: 2〜4週間後に60〜90投稿/日へ段階的に増加
4. **P1実装**: ストック複数tweet候補化、スコアリング選択、言語別ピーク時間

---

## 📝 参考資料

- GPT-5.2レビュー結果: `docs/reports/optimal-posting-strategy-review-2026-01-27T03-31-15-449Z.md`
- X APIレート制限: https://docs.x.com/x-api/fundamentals/rate-limits
