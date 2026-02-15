/**
 * v5.3: 導線別 KPI 取得（pickBestFunnelLink 学習用）
 */

const { getSupabase } = require("../../utils/supabase");

const RECENT_HOURS = 72;
const MIN_POSTS = 3;

async function getFunnelStats(lang) {
  const sb = getSupabase();
  if (!sb) return { bestBySub: null, bestByClick: null, byType: {} };

  try {
    const since = new Date(Date.now() - RECENT_HOURS * 60 * 60 * 1000).toISOString();
    const { data, error } = await sb
      .from("buzzweave_post_log")
      .select("funnel_type, our_impressions, our_clicks, our_subs")
      .eq("slot_lang", lang)
      .gte("posted_at", since)
      .not("funnel_type", "is", null);

    if (error || !data?.length) return { bestBySub: null, bestByClick: null, byType: {} };

    const byType = {};
    for (const row of data) {
      const t = row.funnel_type || "unknown";
      if (!byType[t]) byType[t] = { impressions: 0, clicks: 0, subs: 0, posts: 0 };
      byType[t].impressions += Number(row.our_impressions) || 0;
      byType[t].clicks += Number(row.our_clicks) || 0;
      byType[t].subs += Number(row.our_subs) || 0;
      byType[t].posts += 1;
    }

    let bestBySub = null;
    let bestByClick = null;
    let maxSubs = 0;
    let maxCtr = 0;

    for (const [t, s] of Object.entries(byType)) {
      if (s.posts < MIN_POSTS) continue;
      if (s.subs > maxSubs) {
        maxSubs = s.subs;
        bestBySub = t;
      }
      const ctr = s.impressions > 0 ? s.clicks / s.impressions : 0;
      if (ctr > maxCtr) {
        maxCtr = ctr;
        bestByClick = t;
      }
    }

    return { bestBySub, bestByClick, byType };
  } catch (e) {
    console.warn("[links/metrics] getFunnelStats error:", e?.message);
    return { bestBySub: null, bestByClick: null, byType: {} };
  }
}

module.exports = { getFunnelStats };
