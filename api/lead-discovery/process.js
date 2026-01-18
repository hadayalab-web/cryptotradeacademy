// api/lead-discovery/process.js
// リード発見キュー処理APIエンドポイント

const { processLeadQueue } = require('../lead-discovery');

module.exports = async (req, res) => {
  return processLeadQueue(req, res);
};
