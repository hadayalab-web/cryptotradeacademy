// api/x-quote-repost-en.js
// Stateless Search → Pick → Shoot（EN）

const { handleStatelessQuoteRepost } = require("./x-quote-repost-stateless-handler");

module.exports = async (req, res) => {
  return handleStatelessQuoteRepost(req, res, "en");
};
