/**
 * Xリプライ直販: 送信ラン
 * Cron: 15分ごと
 */
const mainHandler = require("./x-reply-sales-run");

module.exports = async function handler(req, res) {
  req.query = req.query || {};
  req.query.mode = "send";
  return mainHandler(req, res);
};
