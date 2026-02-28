/**
 * 他地域キューライン: リスト取得（6時間ごと・言語ごとに取得 → キュー上書き。EN送信の残り枠で枯渇まで送信）
 * Cron: 4 0,1,2,3,4,6,7,8,9,10,12,13,14,15,16,18,19,20,21,22 * * *
 *       （0,6,12,18→ja / 1,7,13,19→ko / 2,8,14,20→ar / 3,9,15,21→es / 4,10,16,22→pt UTC）
 * 仕様: docs/AFFILIATE_RECRUIT_REGIONS_LINE_SPEC.md
 */
const mainHandler = require("./affiliate-recruit-run");

module.exports = async function handler(req, res) {
  req.query = req.query || {};
  req.query.mode = "regions-queue-list";
  return mainHandler(req, res);
};
