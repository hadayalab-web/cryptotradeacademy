/**
 * Xリプライ直販: リスト取得ラン
 * 手動実行/互換用（mode=list）
 */
const mainHandler = require("./x-reply-sales-run");

module.exports = async function handler(req, res) {
  req.query = req.query || {};
  req.query.mode = "list";
  req.query.scope = req.query.scope || "en";
  return mainHandler(req, res);
};
