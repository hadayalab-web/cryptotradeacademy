/**
 * Cron 用ラッパー: 15 分ごとに ?lang=en で buzzweave-run を実行（CMO 推奨: en 高頻度）
 */
const handler = require("./buzzweave-run");
module.exports = function (req, res) {
  req.query = { ...(req.query || {}), lang: "en" };
  return handler(req, res);
};
module.exports.config = { runtime: "nodejs" };
