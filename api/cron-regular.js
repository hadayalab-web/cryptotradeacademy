// api/cron-regular.js
// 有料版（Regular Briefing）6言語専用Cron。300秒以内に完了を保証するため分割。
// スケジュール: 0 0,6,12,18 * * * (UTC) — 最優先で定時実行

const cronHandler = require("./cron");

module.exports = async function handler(req, res) {
  req.query = req.query || {};
  req.query.mode = "regular";
  return cronHandler(req, res);
};
