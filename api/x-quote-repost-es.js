// api/x-quote-repost-es.js
// Stateless Search → Pick → Shoot（ES）

const { handleStatelessQuoteRepost } = require("./x-quote-repost-stateless-handler");

module.exports = async (req, res) => {
  return handleStatelessQuoteRepost(req, res, "es");
};
