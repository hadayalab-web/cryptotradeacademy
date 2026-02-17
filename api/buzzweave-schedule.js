/**
 * 時間帯別・言語別の予定リプライ数を返す
 * GET /api/buzzweave-schedule
 */
require("../utils/suppressKnownWarnings");
const { loadEnv } = require("../utils/loadEnv");
loadEnv();
const { getSchedulePlan } = require("../services/td/buzzWeaveSchedulePlan");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const plan = getSchedulePlan();
    return res.status(200).json(plan);
  } catch (e) {
    console.error("[buzzweave-schedule]", e?.message);
    return res.status(500).json({ ok: false, error: e?.message || "schedule plan failed" });
  }
};
