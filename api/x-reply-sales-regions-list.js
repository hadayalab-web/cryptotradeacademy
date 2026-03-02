/**
 * Xリプライ直販: 他言語リスト取得ラン（AR/ES/PT/JA/KO）
 * Cron: 6時間ごと
 */
const mainHandler = require("./x-reply-sales-run");

module.exports = async function handler(req, res) {
  req.query = req.query || {};
  req.query.mode = "list";
  req.query.langs = "ar,es,pt,ja,ko";
  return mainHandler(req, res);
};
