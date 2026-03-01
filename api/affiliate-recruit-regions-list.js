/**
 * 他地域キューライン: 全言語グロス取得（毎時・高品質順で各言語キュー更新）
 * Cron: 10 * * * *（UTC）
 * - デフォルト: en + ar + es + pt + ja + ko
 * - ?lang=xx 指定時は単一言語のみ更新
 * 仕様: docs/AFFILIATE_RECRUIT_REGIONS_LINE_SPEC.md
 */
const mainHandler = require("./affiliate-recruit-run");

module.exports = async function handler(req, res) {
  req.query = req.query || {};
  req.query.mode = "regions-queue-list";
  return mainHandler(req, res);
};
