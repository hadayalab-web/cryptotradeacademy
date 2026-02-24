/**
 * アフィリエイトリクルート EN 用（目的: 英語圏 40人/日・3h×8回・5人ずつ）
 * Cron: 0 0,3,6,9,12,15,18,21 * * *
 */
const mainHandler = require("./affiliate-recruit-run");

module.exports = async function handler(req, res) {
  req.query = req.query || {};
  req.query.mode = "en";
  return mainHandler(req, res);
};
