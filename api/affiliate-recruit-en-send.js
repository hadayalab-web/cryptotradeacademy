/**
 * EN キューライン: 送信（15 分ごと・キューから 1 件、403 ブレーカー 20・日次 200 キャップ）
 * Cron: */15 * * * *（毎時 0, 15, 30, 45 分）
 * 仕様: docs/AFFILIATE_RECRUIT_EN_LINE_SPEC.md
 */
const mainHandler = require("./affiliate-recruit-run");

module.exports = async function handler(req, res) {
  req.query = req.query || {};
  req.query.mode = "en-queue-send";
  return mainHandler(req, res);
};
