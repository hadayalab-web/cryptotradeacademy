// api/cron-regular.js
// 有料版（Regular Briefing）6言語専用Cron。300秒以内に完了を保証するため分割。
// スケジュール: 10 0,6,12,18 * * * (UTC) — Minimalの10分後に実行

const cronHandler = require("./cron");

module.exports = async function handler(req, res) {
  req.query = req.query || {};
  req.query.mode = "regular";
  return cronHandler(req, res);
};
