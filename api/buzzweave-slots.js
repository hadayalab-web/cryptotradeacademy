/**
 * TD BuzzWeave Engine — 日次400枠スロット生成 API
 * Cron: GET /api/buzzweave-slots（日1回・0:00 JST 等）
 */

require("../utils/suppressKnownWarnings");
const { getSupabase } = require("../utils/supabase");
const { generateDailySlots } = require("../services/td/buzzWeaveEngine");
const { loadEnv } = require("../utils/loadEnv");
loadEnv();

module.exports = async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  const sb = getSupabase();
  if (!sb) {
    return res.status(503).json({
      ok: false,
      error:
        "Supabase が未設定です。NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY を確認してください。"
    });
  }
  const { error: slotTableError } = await sb.from("td_post_slots").select("id").limit(1);
  if (slotTableError) {
    return res.status(500).json({
      ok: false,
      error:
        "td_post_slots が存在しません。Supabase SQL Editor で docs/supabase-tweet-metrics-schema.sql を実行してテーブルを作成してください。"
    });
  }

  try {
    const result = await generateDailySlots();
    return res.status(200).json(result);
  } catch (e) {
    console.error("[buzzweave-slots] error:", e.message);
    return res.status(500).json({
      ok: false,
      error: e.message
    });
  }
};
