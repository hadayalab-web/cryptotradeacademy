/**
 * Xリプライ直販: リスト取得 15分ローテ（6言語順番に300ページ）
 * Cron: 毎15分で呼ぶ。scope=rotate でスロットに応じた1言語のみ取得。
 */
const mainHandler = require("./x-reply-sales-run");

module.exports = async function handler(req, res) {
  req.query = req.query || {};
  req.query.mode = "list";
  req.query.scope = "rotate";
  return mainHandler(req, res);
};
