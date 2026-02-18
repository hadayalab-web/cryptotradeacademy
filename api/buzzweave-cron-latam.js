/**
 * Cron 用ラッパー: 30 分ごとに ?region=latam で buzzweave-run を実行（es/pt を UTC で切り替え）
 */
const handler = require("./buzzweave-run");
module.exports = function (req, res) {
  req.query = { ...(req.query || {}), region: "latam" };
  return handler(req, res);
};
module.exports.config = { runtime: "nodejs" };
