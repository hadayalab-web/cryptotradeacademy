// services/x/secondaryRotation.js
// セカンダリーターゲットを重み付け（daily/2d/3d/weekly）でローテーション（EN 固定・インフルエンサーとは別枠）

const {
  SECONDARY_TARGETS,
  WEIGHT_PRIORITY,
  WEIGHT_INTERVAL_DAYS,
  normalizeTargets,
  getTargetsByWeight
} = require("../../config/secondaryTargets");
const { kv } = require("../../utils/kv");

const LAST_POSTED_KEY_PREFIX = "secondary:lastPosted:";
const LAST_POSTED_TTL_SEC = 30 * 24 * 60 * 60; // 30日

function parseDateYmd(dateString) {
  const m = (dateString || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return new Date(Date.UTC(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10)));
}

/**
 * 最後に投稿した日（YYYY-MM-DD）を取得
 */
async function getLastPosted(username) {
  if (!kv) return null;
  try {
    return (await kv.get(LAST_POSTED_KEY_PREFIX + username)) || null;
  } catch (e) {
    return null;
  }
}

/**
 * 最後に投稿した日を記録
 */
async function markPosted(username, dateString) {
  if (!kv) return;
  try {
    await kv.set(LAST_POSTED_KEY_PREFIX + username, dateString, { ex: LAST_POSTED_TTL_SEC });
  } catch (e) {
    console.warn("[SecondaryRotation] markPosted failed:", e.message);
  }
}

/**
 * 最後の投稿日から interval 日以上経っていれば due
 */
function isDue(lastPostedDateString, weight, todayDateString) {
  const intervalDays = WEIGHT_INTERVAL_DAYS[weight] ?? 1;
  if (!lastPostedDateString) return true; // 未投稿なら due
  const last = parseDateYmd(lastPostedDateString);
  const today = parseDateYmd(todayDateString);
  if (!last || !today) return true;
  const diffMs = today.getTime() - last.getTime();
  const diffDays = diffMs / (24 * 60 * 60 * 1000);
  return diffDays >= intervalDays;
}

/**
 * 重み付けに従い、優先度順（daily → 2d → 3d → weekly）で due なターゲットを1件選ぶ
 * @param {string} dateString - YYYY-MM-DD（UTC）
 * @returns {Promise<string|null>} username または null
 */
async function pickSecondaryTarget(dateString) {
  if (!kv) return null;
  const targets = normalizeTargets(SECONDARY_TARGETS);
  if (targets.length === 0) return null;

  for (const weight of WEIGHT_PRIORITY) {
    const list = getTargetsByWeight(weight);
    for (const { username } of list) {
      const lastPosted = await getLastPosted(username);
      if (isDue(lastPosted, weight, dateString)) return username;
    }
  }
  return null;
}

/** 後方互換: 「今日投稿したか」は lastPosted === dateString で判定可能 */
async function getPostedToday(username, dateString) {
  const last = await getLastPosted(username);
  return last === dateString;
}

module.exports = {
  pickSecondaryTarget,
  markPosted,
  getLastPosted,
  getPostedToday,
  isDue
};
