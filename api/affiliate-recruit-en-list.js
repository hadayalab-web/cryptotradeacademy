/**
 * EN キューライン: リスト取得（6h ごと 1 ページ → キュー投入）
 * Cron: 0 0,6,12,18 * * *（UTC）
 * 仕様: docs/AFFILIATE_RECRUIT_EN_LINE_SPEC.md
 */
const mainHandler = require("./affiliate-recruit-run");

module.exports = async function handler(req, res) {
  req.query = req.query || {};
  req.query.mode = "en-queue-list";
  return mainHandler(req, res);
};
