// api/x-quote-repost-pt.js
// Stateless Search → Pick → Shoot（PT）

const { handleStatelessQuoteRepost } = require("./x-quote-repost-stateless-handler");

module.exports = async (req, res) => {
  return handleStatelessQuoteRepost(req, res, "pt");
};
