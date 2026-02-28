/**
 * 他地域キューライン: リスト取得（1日複数ページ/言語・言語ごとの時間帯で取得 → キュー上書き。1日かけて枯渇まで送信）
 * Cron: 2 12,13,17,21,22 * * *（12→ja, 13→ko, 17→ar, 21→es, 22→pt UTC）
 * 仕様: docs/AFFILIATE_RECRUIT_REGIONS_LINE_SPEC.md
 */
const mainHandler = require("./affiliate-recruit-run");

module.exports = async function handler(req, res) {
  req.query = req.query || {};
  req.query.mode = "regions-queue-list";
  return mainHandler(req, res);
};
