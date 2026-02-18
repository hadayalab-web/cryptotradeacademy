/**
 * Cron 用ラッパー: 60 分ごとに ?lang=ar で buzzweave-run を実行（CMO 推奨: ar は窓広め）
 */
const handler = require("./buzzweave-run");
module.exports = function (req, res) {
  req.query = { ...(req.query || {}), lang: "ar" };
  return handler(req, res);
};
module.exports.config = { runtime: "nodejs" };
