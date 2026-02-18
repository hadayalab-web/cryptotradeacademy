/**
 * Cron 用ラッパー: 30 分ごとに ?region=asia で buzzweave-run を実行（ja/ko を UTC で切り替え）
 */
const handler = require("./buzzweave-run");
module.exports = function (req, res) {
  req.query = { ...(req.query || {}), region: "asia" };
  return handler(req, res);
};
module.exports.config = { runtime: "nodejs" };
