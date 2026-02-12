/**
 * TD BuzzWeave Engine — 日次600枠スロット生成 API
 * Cron: GET /api/buzzweave-slots（日1回・0:00 JST 等）
 */

const { getSupabase } = require("../utils/supabase");
const { generateDailySlots } = require("../services/td/buzzWeaveEngine");

module.exports = async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const sb = getSupabase();
  if (sb) {
    const { error: slotTableError } = await sb.from("td_post_slots").select("id").limit(1);
    if (slotTableError) {
      return res.status(500).json({
        ok: false,
        error:
          "td_post_slots が存在しません。Supabase SQL Editor で docs/supabase-tweet-metrics-schema.sql を実行してテーブルを作成してください。"
      });
    }
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
