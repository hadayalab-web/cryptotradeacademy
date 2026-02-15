/**
 * Trap Defence OS v4.2 — 言語別釣り師クラスタ可視化
 * KV: fishermen:cluster:{lang}
 */

const SUPPORTED_LANGS = ["en", "ja", "es", "ar", "ko", "pt"];
const FISHERMEN_CLUSTER_KV_PREFIX = "fishermen:cluster:";
const FISHERMEN_CLUSTER_TTL = 24 * 60 * 60; // 24h

function getFishermenClusterKey(lang) {
  const normalized = (lang || "en").replace("pt-br", "pt").toLowerCase();
  return `${FISHERMEN_CLUSTER_KV_PREFIX}${normalized}`;
}

const PEAK_HOURS_BY_LANG = {
  en: [14, 15, 16, 20, 21],
  ja: [9, 10, 12, 20, 21],
  es: [21, 22, 23, 0, 1, 2],
  ar: [18, 19, 20, 21, 22, 23],
  ko: [9, 10, 11, 12],
  pt: [14, 15, 19, 20, 21]
};

function getDefaultCluster(lang) {
  const normalized = (lang || "en").replace("pt-br", "pt").toLowerCase();
  return {
    lang: normalized,
    active_fishermen: 0,
    burst_events: 0,
    botnet_links: 0,
    avg_burst_factor: 0,
    peak_hours: PEAK_HOURS_BY_LANG[normalized] || [],
    chain_raid_rate: 0,
    timestamp: Date.now()
  };
}

function isPeakHourForLang(lang, utcHour) {
  const cluster = getDefaultCluster(lang);
  const hours = cluster.peak_hours;
  if (!hours || !hours.length) return true;
  return hours.includes(utcHour);
}

async function getFishermenCluster(kv, lang) {
  if (!kv) return getDefaultCluster(lang);
  try {
    const key = getFishermenClusterKey(lang);
    const value = await kv.get(key);
    return value && typeof value === "object" ? { ...getDefaultCluster(lang), ...value } : getDefaultCluster(lang);
  } catch {
    return getDefaultCluster(lang);
  }
}

async function setFishermenCluster(kv, lang, data) {
  if (!kv) return;
  try {
    const key = getFishermenClusterKey(lang);
    const merged = { ...getDefaultCluster(lang), ...data, timestamp: Date.now() };
    await kv.set(key, merged, { ex: FISHERMEN_CLUSTER_TTL });
  } catch (e) {
    console.warn("[fishermenCluster] setFishermenCluster failed:", e?.message);
  }
}

module.exports = {
  SUPPORTED_LANGS,
  FISHERMEN_CLUSTER_KV_PREFIX,
  PEAK_HOURS_BY_LANG,
  getFishermenClusterKey,
  getDefaultCluster,
  getFishermenCluster,
  setFishermenCluster,
  isPeakHourForLang
};
