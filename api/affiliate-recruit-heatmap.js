/**
 * アフィリエイトリクルート ヒートマップ API（言語×スコア帯の可視化用）
 * GET: 送信数・ref紐づき登録数・登録率を言語×スコア帯の行列で返す。C/R 自動調整・DM集中投下の根拠データ。
 * 設計: docs/AFFILIATE_RECRUIT_FULL_BLOODFLOW_DASHBOARD_DESIGN.md（ビュー3）
 */
const funnel = require("./affiliate-recruit-funnel");

const RECRUIT_STATS_LANGS = funnel.RECRUIT_STATS_LANGS;
const SCORE_BANDS = funnel.SCORE_BANDS;

/** セルごとの登録率（%）。送信0のセルは null */
function buildConversionRateMatrix(sentByLangScore, attributedByLangScore) {
  const matrix = {};
  for (const lang of RECRUIT_STATS_LANGS) {
    matrix[lang] = {};
    for (const band of SCORE_BANDS) {
      const sent = sentByLangScore[lang]?.[band] ?? 0;
      const attributed = attributedByLangScore[lang]?.[band] ?? 0;
      matrix[lang][band] =
        sent > 0 ? Math.round((attributed / sent) * 10000) / 100 : null;
    }
  }
  return matrix;
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { kv } = require("../utils/kv");
  if (!kv) {
    return res.status(503).json({
      error: "KV not available",
      rows: RECRUIT_STATS_LANGS,
      columns: SCORE_BANDS,
      sent: {},
      signupsAttributed: {},
      conversionRate: {}
    });
  }

  const [sent, signupsAttributed] = await Promise.all([
    funnel.getSentStats(),
    funnel.getSignupsAttributed()
  ]);

  const conversionRate = buildConversionRateMatrix(
    sent.byLangScore,
    signupsAttributed.byLangScore
  );

  return res.status(200).json({
    ok: true,
    rows: RECRUIT_STATS_LANGS,
    columns: SCORE_BANDS,
    sent: sent.byLangScore,
    signupsAttributed: signupsAttributed.byLangScore,
    conversionRate,
    totals: {
      sent: sent.total,
      signupsAttributed: signupsAttributed.total
    },
    meta: {
      description:
        "Language (region proxy) × score band heatmap. conversionRate = signupsAttributed / sent per cell (%). null = no sends in that cell.",
      useCase: "C/R auto-tuning, DM concentration, which layer performs best"
    }
  });
};
