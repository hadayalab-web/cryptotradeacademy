// api/x-quote-repost-ar.js
// Stateless Search → Pick → Shoot（AR）

const { handleStatelessQuoteRepost } = require("./x-quote-repost-stateless-handler");

module.exports = async (req, res) => {
  return handleStatelessQuoteRepost(req, res, "ar");
};
