// api/x-quote-repost-pt-br.js
// Stateless Search → Pick → Shoot（PT-BR → pt）

const { handleStatelessQuoteRepost } = require("./x-quote-repost-stateless-handler");

module.exports = async (req, res) => {
  return handleStatelessQuoteRepost(req, res, "pt-br");
};
