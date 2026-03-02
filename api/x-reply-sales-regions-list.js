/**
 * Xリプライ直販: 他言語リスト取得ラン（AR/ES/PT/JA/KO）
 * Cron: 毎時10分。UTC時間で1時間に1言語ローテーション（0→ar, 1→es, 2→pt, 3→ja, 4→ko, 5→ar...）
 */
const { X_REPLY_SALES_REGION_LANGS } = require("../config/xReplySalesConfig");
const mainHandler = require("./x-reply-sales-run");

module.exports = async function handler(req, res) {
  const utcHour = new Date().getUTCHours();
  const langIndex = utcHour % X_REPLY_SALES_REGION_LANGS.length;
  const lang = X_REPLY_SALES_REGION_LANGS[langIndex];
  req.query = req.query || {};
  req.query.mode = "list";
  req.query.langs = lang;
  req.query.scope = "regions";
  return mainHandler(req, res);
};
