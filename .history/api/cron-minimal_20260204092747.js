// api/cron-minimal.js
// 無料版（Minimal Version）6言語専用Cron。300秒以内に完了を保証するため分割。
// スケジュール: 0 0,6,12,18 * * * (UTC)

const cronHandler = require("./cron");

module.exports = async function handler(req, res) {
  req.query = req.query || {};
  req.query.mode = "minimal";
  return cronHandler(req, res);
};
