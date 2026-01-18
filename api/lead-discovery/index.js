// api/lead-discovery/index.js
// リード発見自動化APIエンドポイント

const { handleLeadDiscovery } = require('../lead-discovery');

module.exports = async (req, res) => {
  return handleLeadDiscovery(req, res);
};
