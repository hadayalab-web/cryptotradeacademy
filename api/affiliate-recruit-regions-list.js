/**
 * 他地域キューライン: リスト取得（毎時・3ペア時系列ローテ）
 * Cron: 4 * * * *（UTC）
 * - h%3=0: AR（ENは en-list が同時実行）
 * - h%3=1: ES + PT
 * - h%3=2: JA + KO
 * 仕様: docs/AFFILIATE_RECRUIT_REGIONS_LINE_SPEC.md
 */
const mainHandler = require("./affiliate-recruit-run");

module.exports = async function handler(req, res) {
  req.query = req.query || {};
  req.query.mode = "regions-queue-list";
  return mainHandler(req, res);
};
