/**
 * ML-PQT ログ/データ管理（統合）
 * (1) buzzweave_post_log の public_metrics ポーリング (2) MV 更新 + lang_penalty 書き込み
 * 通常は buzzweave-run の投稿完了後に呼ばれる（Cron はなし）。手動 GET では ?skipRefresh=1 で MV のみスキップ可。
 */
require("../utils/suppressKnownWarnings");
const { fetchBuzzweavePostLogsPendingMetrics, updateBuzzweavePostLogWithMetrics } = require("../utils/supabase");
const { getTweetMetrics } = require("../services/x/metrics");
const { runRefreshChainRaidMv } = require("./refresh-chain-raid-mv");

const DEFAULT_LIMIT = 20;
const DEFAULT_MIN_AGE_MINUTES = 5;

/**
 * メトリクスポール + MV/lang_penalty を実行。buzzweave-run から呼び出し or 手動 API 用。
 * @param {{ limit?: number, minAgeMinutes?: number, skipRefresh?: boolean }} options
 * @returns {Promise<{ ok: boolean, updated?: number, results?: any[], errors?: any[], mv?: object, error?: string }>}
 */
async function runBuzzweaveMetricsPollAndRefresh(options = {}) {
  const limit = options.limit ?? DEFAULT_LIMIT;
  const minAgeMinutes = options.minAgeMinutes ?? DEFAULT_MIN_AGE_MINUTES;
  const skipRefresh = options.skipRefresh === true;
  console.log("[buzzweave-metrics-poll] run limit=" + limit + " minAgeMinutes=" + minAgeMinutes + " skipRefresh=" + skipRefresh);

  const { ok, rows } = await fetchBuzzweavePostLogsPendingMetrics(limit, minAgeMinutes);
  let updated = 0;
  const results = [];
  const errors = [];

  if (ok && rows?.length) {
    console.log("[buzzweave-metrics-poll] pending rows=" + rows.length + ", fetching X metrics");
    for (const row of rows) {
      const tweetId = row.our_tweet_id;
      if (!tweetId) continue;
      try {
        const data = await getTweetMetrics(tweetId, true);
        const pm = data?.publicMetrics || {};
        const impressions =
          data?.nonPublicMetrics?.impression_count ??
          data?.organicMetrics?.impression_count ??
          pm.impression_count ??
          null;
        const metrics = {
          impressions: impressions ?? null,
          likes: pm.like_count ?? null,
          retweets: pm.retweet_count ?? null,
          quotes: pm.quote_count ?? null,
          replies: pm.reply_count ?? null
        };
        const update = await updateBuzzweavePostLogWithMetrics(tweetId, metrics);
        if (update.ok) {
          results.push({ tweetId, ...metrics });
          updated++;
        } else {
          errors.push({ tweetId, error: "update failed" });
        }
      } catch (e) {
        errors.push({ tweetId, error: e.message });
      }
    }
    console.log("[buzzweave-metrics-poll] metrics done updated=" + updated + " errors=" + errors.length);
  } else {
    console.log("[buzzweave-metrics-poll] no pending metrics, rows=" + (rows?.length ?? 0));
  }

  let mv = { ok: true, penalty_keys: 0 };
  if (!skipRefresh) {
    mv = await runRefreshChainRaidMv();
  }

  return {
    ok: true,
    updated,
    results: results.length ? results : undefined,
    errors: errors.length ? errors : undefined,
    mv: mv.ok ? { refreshed: true, penalty_keys: mv.penalty_keys } : { error: mv.error }
  };
}

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  const limit = parseInt(req.query?.limit, 10) || DEFAULT_LIMIT;
  const minAgeMinutes = parseInt(req.query?.minAgeMinutes, 10) || DEFAULT_MIN_AGE_MINUTES;
  const skipRefresh = req.query?.skipRefresh === "1";

  try {
    const body = await runBuzzweaveMetricsPollAndRefresh({ limit, minAgeMinutes, skipRefresh });
    return res.status(200).json(body);
  } catch (e) {
    console.error("[buzzweave-metrics-poll] error:", e.message);
    return res.status(500).json({ ok: false, error: e.message });
  }
};

module.exports.runBuzzweaveMetricsPollAndRefresh = runBuzzweaveMetricsPollAndRefresh;
