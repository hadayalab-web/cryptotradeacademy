/**
 * EN キューライン: リスト取得（4時間ごと・高品質順でキュー更新）
 * Cron: UTC minute 8, every 4 hours
 * 仕様: docs/AFFILIATE_RECRUIT_EN_LINE_SPEC.md
 */
const mainHandler = require("./affiliate-recruit-run");

module.exports = async function handler(req, res) {
  req.query = req.query || {};
  req.query.mode = "en-queue-list";
  return mainHandler(req, res);
};
