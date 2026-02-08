// config/secondaryTargets.js
// インフルエンサー以外の「重要ターゲット」アカウント群
// weight: daily=毎日, 2d=2日に1回, 3d=3日に1回, weekly=週1（優先度順で due な1件を選ぶ）

const SECONDARY_TARGETS = [
  // コア（最重要）→ 毎日
  { username: "elonmusk", weight: "daily" },
  { username: "tesla", weight: "daily" },
  { username: "spacex", weight: "daily" },
  { username: "xai", weight: "daily" },

  // マーケット構造クラスタ → 3日に1回
  { username: "whale_alert", weight: "3d" },
  { username: "glassnode", weight: "3d" },
  { username: "cryptoquant_com", weight: "3d" },
  { username: "coinglass", weight: "3d" },
  { username: "lookonchain", weight: "3d" },
  { username: "intotheblock", weight: "3d" },
  { username: "santimentfeed", weight: "3d" },
  { username: "skewdotcom", weight: "3d" },

  // AI × 自動化クラスタ → 2日に1回
  { username: "OpenAI", weight: "2d" },
  { username: "stabilityai", weight: "2d" },
  { username: "midjourney", weight: "2d" },
  { username: "huggingface", weight: "2d" },

  // ミーム × 拡散クラスタ → 週1
  { username: "dogecoin", weight: "weekly" },
  { username: "wallstreetbets", weight: "weekly" },

  // テック × 哲学クラスタ → 週1
  { username: "naval", weight: "weekly" },
  { username: "balajis", weight: "weekly" },
  { username: "paulg", weight: "weekly" },
  { username: "sama", weight: "weekly" }
];

/** weight の優先順（先に due を探す順） */
const WEIGHT_PRIORITY = ["daily", "2d", "3d", "weekly"];

/** weight ごとのインターバル（日数） */
const WEIGHT_INTERVAL_DAYS = { daily: 1, "2d": 2, "3d": 3, weekly: 7 };

/**
 * 指定 weight のターゲットだけを配列で返す
 * @param {string} weight - "daily" | "2d" | "3d" | "weekly"
 * @returns {{ username: string, weight: string }[]}
 */
function getTargetsByWeight(weight) {
  return normalizeTargets(SECONDARY_TARGETS).filter((t) => t.weight === weight);
}

/**
 * 文字列配列 or { username, weight }[] を正規化（後方互換）
 * @param {Array<string|{username:string,weight?:string}>} list
 * @returns {{ username: string, weight: string }[]}
 */
function normalizeTargets(list) {
  if (!Array.isArray(list)) return [];
  return list.map((item) => {
    if (typeof item === "string") return { username: item.trim().replace(/^@/, ""), weight: "daily" };
    const u = (item && item.username && String(item.username).trim().replace(/^@/, "")) || "";
    const w = (item && item.weight) || "daily";
    return { username: u, weight: w };
  }).filter((t) => t.username);
}

/**
 * 全ターゲットをフラットな username 配列で返す（従来互換）
 */
function getAllUsernames() {
  return normalizeTargets(SECONDARY_TARGETS).map((t) => t.username);
}

module.exports = {
  SECONDARY_TARGETS,
  WEIGHT_PRIORITY,
  WEIGHT_INTERVAL_DAYS,
  getTargetsByWeight,
  normalizeTargets,
  getAllUsernames
};
