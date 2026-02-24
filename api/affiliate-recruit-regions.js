/**
 * アフィリエイトリクルート 地域別（目的: 南米・JA+KO・AR の3時間帯で他5言語 21本/日）
 * Cron: 0 12,17,21 * * *
 */
const mainHandler = require("./affiliate-recruit-run");

module.exports = async function handler(req, res) {
  req.query = req.query || {};
  req.query.mode = "slot";
  return mainHandler(req, res);
};
