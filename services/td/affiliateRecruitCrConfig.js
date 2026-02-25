/**
 * C/R 自動調整用: 国係数 C（言語別）・スコア帯係数 B（バンド別）の KV 読み書き。
 * ヒートマップの conversionRate に基づき cr-update API が C/B を更新し、run が priority 算出で参照する。
 * v2.2 自己最適化フェーズ。
 */
const { kv } = require("../../utils/kv");
const { COEFFICIENT_BY_LANG } = require("./affiliateRecruitScoring");

const RECRUIT_STATS_LANGS = ["en", "ja", "ko", "es", "pt", "ar"];
const SCORE_BANDS = ["0-49", "50-64", "65-79", "80-100"];
const KV_PREFIX_C = "affiliate_recruit:cr:C:";
const KV_PREFIX_B = "affiliate_recruit:cr:B:";
const CR_TTL = 86400 * 180; // 180日

function parseNum(v, fallback) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * KV に保存された C/B を取得。未設定はデフォルト（C=COEFFICIENT_BY_LANG, B=1.0）
 */
async function getCrConfig() {
  const C = {};
  const B = {};
  for (const lang of RECRUIT_STATS_LANGS) {
    C[lang] = COEFFICIENT_BY_LANG[lang] ?? 1.0;
  }
  for (const band of SCORE_BANDS) {
    B[band] = 1.0;
  }
  if (!kv) return { C, B };

  try {
    const cKeys = RECRUIT_STATS_LANGS.map((l) => KV_PREFIX_C + l);
    const bKeys = SCORE_BANDS.map((b) => KV_PREFIX_B + b);
    const cVals = await Promise.all(cKeys.map((k) => kv.get(k)));
    const bVals = await Promise.all(bKeys.map((k) => kv.get(k)));
    for (let i = 0; i < RECRUIT_STATS_LANGS.length; i++) {
      const v = cVals[i];
      if (v != null) C[RECRUIT_STATS_LANGS[i]] = parseNum(v, C[RECRUIT_STATS_LANGS[i]]);
    }
    for (let i = 0; i < SCORE_BANDS.length; i++) {
      const v = bVals[i];
      if (v != null) B[SCORE_BANDS[i]] = parseNum(v, 1.0);
    }
  } catch (e) {
    console.warn("[affiliateRecruitCrConfig] getCrConfig error:", e?.message);
  }
  return { C, B };
}

/**
 * C/B を KV に保存（上書き）。TTL 180日。
 */
async function setCrConfig({ C = {}, B = {} }) {
  if (!kv) return false;
  try {
    for (const lang of RECRUIT_STATS_LANGS) {
      if (C[lang] != null && Number.isFinite(C[lang])) {
        await kv.set(KV_PREFIX_C + lang, String(C[lang]), { ex: CR_TTL });
      }
    }
    for (const band of SCORE_BANDS) {
      if (B[band] != null && Number.isFinite(B[band])) {
        await kv.set(KV_PREFIX_B + band, String(B[band]), { ex: CR_TTL });
      }
    }
    return true;
  } catch (e) {
    console.warn("[affiliateRecruitCrConfig] setCrConfig error:", e?.message);
    return false;
  }
}

module.exports = {
  getCrConfig,
  setCrConfig,
  RECRUIT_STATS_LANGS,
  SCORE_BANDS,
  CR_TTL
};
