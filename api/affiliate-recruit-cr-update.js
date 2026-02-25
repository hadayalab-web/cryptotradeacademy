/**
 * C/R 自動調整: ヒートマップの conversionRate に基づき国係数 C（言語別）・スコア帯係数 B を KV に保存する。
 * POST（認証必須）。Cron で定期実行するか手動で叩く。v2.2 自己最適化フェーズ。
 */
const funnel = require("./affiliate-recruit-funnel");
const { getCrConfig, setCrConfig, RECRUIT_STATS_LANGS, SCORE_BANDS } = require("../services/td/affiliateRecruitCrConfig");
const { COEFFICIENT_BY_LANG } = require("../services/td/affiliateRecruitScoring");

const C_MIN = 0.9;
const C_MAX = 1.2;
const C_RANGE = C_MAX - C_MIN;
const B_MIN = 0.9;
const B_MAX = 1.1;
const B_RANGE = B_MAX - B_MIN;

/** 言語別登録率から C を算出。送信0の言語はデフォルト値のまま */
function computeCFromRates(sent, signupsAttributed) {
  const rates = {};
  let maxRate = 0;
  for (const lang of RECRUIT_STATS_LANGS) {
    const s = sent.byLang[lang] || 0;
    const a = signupsAttributed.byLang[lang] || 0;
    rates[lang] = s > 0 ? a / s : 0;
    if (rates[lang] > maxRate) maxRate = rates[lang];
  }
  const C = {};
  for (const lang of RECRUIT_STATS_LANGS) {
    const sentCount = sent.byLang[lang] || 0;
    if (sentCount === 0) {
      C[lang] = COEFFICIENT_BY_LANG[lang] ?? 1.0;
      continue;
    }
    const r = rates[lang];
    const normalized = maxRate > 0 ? r / maxRate : 0;
    C[lang] = Math.round((C_MIN + C_RANGE * normalized) * 100) / 100;
  }
  return C;
}

/** スコア帯別登録率（全言語合計）から B を算出 */
function computeBFromRates(sent, signupsAttributed) {
  const sentByBand = {};
  const attrByBand = {};
  for (const band of SCORE_BANDS) {
    sentByBand[band] = 0;
    attrByBand[band] = 0;
  }
  for (const lang of RECRUIT_STATS_LANGS) {
    for (const band of SCORE_BANDS) {
      sentByBand[band] += sent.byLangScore[lang]?.[band] ?? 0;
      attrByBand[band] += signupsAttributed.byLangScore[lang]?.[band] ?? 0;
    }
  }
  let maxRate = 0;
  const rates = {};
  for (const band of SCORE_BANDS) {
    const s = sentByBand[band] || 0;
    const a = attrByBand[band] || 0;
    rates[band] = s > 0 ? a / s : 0;
    if (rates[band] > maxRate) maxRate = rates[band];
  }
  const B = {};
  for (const band of SCORE_BANDS) {
    const sentCount = sentByBand[band] || 0;
    if (sentCount === 0) {
      B[band] = 1.0;
      continue;
    }
    const r = rates[band];
    const normalized = maxRate > 0 ? r / maxRate : 0;
    B[band] = Math.round((B_MIN + B_RANGE * normalized) * 100) / 100;
  }
  return B;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const auth =
    (process.env.CRON_SECRET && req.headers?.authorization === `Bearer ${process.env.CRON_SECRET}`) ||
    req.query?.secret === process.env.CRON_SECRET;
  if (!auth) {
    return res.status(401).json({ error: "Unauthorized", hint: "CRON_SECRET or ?secret=" });
  }

  const { kv } = require("../utils/kv");
  if (!kv) {
    return res.status(503).json({ error: "KV not available" });
  }

  const [sent, signupsAttributed] = await Promise.all([
    funnel.getSentStats(),
    funnel.getSignupsAttributed()
  ]);

  const C = computeCFromRates(sent, signupsAttributed);
  const B = computeBFromRates(sent, signupsAttributed);
  const ok = await setCrConfig({ C, B });

  return res.status(200).json({
    ok: !!ok,
    C,
    B,
    message: ok
      ? "C/B updated from heatmap conversion rates. Next recruit run will use these values."
      : "setCrConfig failed"
  });
};
