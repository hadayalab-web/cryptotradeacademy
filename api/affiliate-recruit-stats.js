/**
 * アフィリエイトリクルート 送信集計 API（観測ダッシュボード用）
 * GET: 言語別・言語×スコア帯別の送信数を返す。KV の affiliate_recruit:stats:lang:* を読む。
 */
const { kv } = require("../utils/kv");

const RECRUIT_STATS_LANGS = ["en", "ja", "ko", "es", "pt", "ar"];
const SCORE_BANDS = ["0-49", "50-64", "65-79", "80-100"];

const KV_KEY_STATS_LANG = (lang) => `affiliate_recruit:stats:lang:${lang}`;
const KV_KEY_STATS_LANG_BAND = (lang, band) => `affiliate_recruit:stats:lang:${lang}:band:${band}`;

function parseCount(v) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : 0;
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!kv) {
    return res.status(503).json({ error: "KV not available", byLang: {}, byLangScore: {} });
  }

  const keys = [];
  for (const lang of RECRUIT_STATS_LANGS) {
    keys.push({ type: "lang", lang, key: KV_KEY_STATS_LANG(lang) });
    for (const band of SCORE_BANDS) {
      keys.push({ type: "band", lang, band, key: KV_KEY_STATS_LANG_BAND(lang, band) });
    }
  }

  const values = await Promise.all(keys.map(({ key }) => kv.get(key)));

  const byLang = {};
  const byLangScore = {};
  for (const lang of RECRUIT_STATS_LANGS) {
    byLang[lang] = 0;
    byLangScore[lang] = { "0-49": 0, "50-64": 0, "65-79": 0, "80-100": 0 };
  }

  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    const v = values[i];
    const count = parseCount(v);
    if (k.type === "lang") {
      byLang[k.lang] = count;
    } else {
      byLangScore[k.lang][k.band] = count;
    }
  }

  const total = Object.values(byLang).reduce((a, b) => a + b, 0);

  return res.status(200).json({
    ok: true,
    total,
    byLang,
    byLangScore,
    meta: {
      langs: RECRUIT_STATS_LANGS,
      scoreBands: SCORE_BANDS,
      description: "Sent DM counts by lang (region proxy) and by lang × score band. Incremented on each successful send."
    }
  });
};
