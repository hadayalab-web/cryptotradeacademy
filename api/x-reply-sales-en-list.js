/**
 * Xリプライ直販: EN専用リスト取得ラン
 * Cron: 毎時
 */
const mainHandler = require("./x-reply-sales-run");

module.exports = async function handler(req, res) {
  req.query = req.query || {};
  req.query.mode = "list";
  req.query.lang = "en";
  return mainHandler(req, res);
};
