/**
 * EN キューライン: 送信（15 分ごと・15秒間隔ペーシング）
 * Cron: every 15 minutes
 * - 1実行あたり試行上限: EN_RECRUIT_ATTEMPTS_PER_RUN（既定 15）
 * - 15分窓試行上限: EN_RECRUIT_ATTEMPT_BREAKER_PER_15MIN（既定 15）
 * - 実行内送信間隔: EN_RECRUIT_SEND_DELAY_MS（既定 15000ms）
 * 仕様: docs/AFFILIATE_RECRUIT_EN_LINE_SPEC.md
 */
const mainHandler = require("./affiliate-recruit-run");

module.exports = async function handler(req, res) {
  req.query = req.query || {};
  req.query.mode = "en-queue-send";
  return mainHandler(req, res);
};
