// api/x-quote-repost-ja.js
// Stateless Search → Pick → Shoot（JA）

const { handleStatelessQuoteRepost } = require("./x-quote-repost-stateless-handler");

module.exports = async (req, res) => {
  return handleStatelessQuoteRepost(req, res, "ja");
};
