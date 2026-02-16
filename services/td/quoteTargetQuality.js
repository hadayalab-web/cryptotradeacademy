/**
 * 引用リポスト・ターゲット投稿の品質スコア（研究ベース）
 * - Engagement velocity（経過時間あたりのエンゲージメント）
 * - Algorithm-weighted score（リプライ重視の重み）
 * - Topic fit（Trap Defence ニッチ：BTC/ETH/トレード/リスクとの適合）
 * Grok/既存ドキュメントのしばりは使わず、文献・アルゴリズム知見に基づく。
 */

const VELOCITY_MIN_AGE_MINUTES = 0.5;

const TOPIC_KEYWORDS = [
  "btc", "bitcoin", "eth", "ethereum", "crypto", "trading", "trade", "market",
  "risk", "volatility", "support", "resistance", "liquidation", "long", "short",
  "トレード", "相場", "リスク", "ボラティリティ", "サポート", "レジスタンス",
  "트레이딩", "리스크", "변동성", "mercado", "riesgo", "trading", "mercado"
];

/**
 * アルゴリズムに近い重み付け（リプライ > 引用 > RT > いいね）
 * 出典: X engagement weight の相対値
 */
function algorithmWeightedScore(metrics = {}) {
  const like = Number(metrics.like_count) || 0;
  const rt = Number(metrics.retweet_count) || 0;
  const quote = Number(metrics.quote_count) || 0;
  const reply = Number(metrics.reply_count) || 0;
  return reply * 4 + quote * 2 + rt * 1 + like * 0.5;
}

/**
 * 経過時間あたりのエンゲージメント（velocity）
 * 初動が速いほどアルゴリズムに拾われやすい
 */
function engagementVelocityScore(post, nowMs = Date.now()) {
  const metrics = post?.post?.public_metrics ?? post?.public_metrics ?? {};
  const createdAt = post?.post?.created_at ?? post?.created_at;
  if (!createdAt) return 0;
  const ageMs = nowMs - new Date(createdAt).getTime();
  const ageMin = ageMs / (1000 * 60);
  if (ageMin < VELOCITY_MIN_AGE_MINUTES) return 0;
  const raw = (post?.engagementScore != null)
    ? post.engagementScore
    : (Number(metrics.like_count) || 0) + 2 * (Number(metrics.retweet_count) || 0) + 3 * (Number(metrics.quote_count) || 0) + (Number(metrics.reply_count) || 0);
  return raw / Math.max(1, ageMin);
}

/**
 * Trap Defence 文脈とのトピック適合度 0..1
 */
function topicFitScore(text) {
  if (!text || typeof text !== "string") return 0;
  const t = text.toLowerCase();
  const hits = TOPIC_KEYWORDS.filter((k) => t.includes(k.toLowerCase()));
  if (hits.length === 0) return 0;
  return Math.min(1, 0.2 + hits.length * 0.15);
}

/**
 * Hype 含有は「伸びやすい」シグナルとしてボーナス（必須にしない）
 */
const HYPE_BONUS_KEYWORDS = [
  "moon", "pump", "100x", "ath", "breakout", "fud", "dump", "crash",
  "今すぐ", "乗り遅れるな", "絶対", "급등", "반등", "oportunidad", "sube"
];
function hypeBonus(text) {
  if (!text || typeof text !== "string") return 0;
  const t = text.toLowerCase();
  return HYPE_BONUS_KEYWORDS.some((k) => t.includes(k.toLowerCase())) ? 0.2 : 0;
}

/**
 * 合成品質スコア（ランキング用）
 * velocity 正規化 + algorithm 重み + topic fit + hype ボーナス
 */
function quoteTargetQualityScore(candidate, nowMs = Date.now()) {
  const post = candidate?.post ?? candidate;
  const text = post?.text ?? candidate?.text ?? "";
  const vel = engagementVelocityScore(candidate, nowMs);
  const alg = algorithmWeightedScore(post?.public_metrics ?? candidate?.public_metrics ?? {});
  const topic = topicFitScore(text);
  const hype = hypeBonus(text);
  const velocityNorm = Math.min(1, vel / 50);
  const algNorm = Math.min(1, alg / 500);
  return velocityNorm * 0.35 + algNorm * 0.35 + topic * 0.25 + hype;
}

/**
 * 候補を品質スコアでソートし、上位 maxCount 件を返す
 * Fisherman 必須にしないオプション
 */
function selectByQualityScore(candidates, maxCount, nowMs = Date.now()) {
  const scored = (candidates || []).map((c) => ({
    ...c,
    _quoteQualityScore: quoteTargetQualityScore(c, nowMs)
  }));
  scored.sort((a, b) => (b._quoteQualityScore ?? 0) - (a._quoteQualityScore ?? 0));
  return scored.slice(0, Math.max(0, maxCount));
}

module.exports = {
  algorithmWeightedScore,
  engagementVelocityScore,
  topicFitScore,
  hypeBonus,
  quoteTargetQualityScore,
  selectByQualityScore
};
