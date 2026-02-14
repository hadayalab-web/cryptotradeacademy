/**
 * KIBA score (crypto-weighted). Internal only.
 */
function computeKibaScore(detectors) {
  const w = {
    flow: 0.25,
    liquidity: 0.1,
    sentiment: 0.2,
    whale: 0.3,
    algo: 0.1,
    retail: 0.05
  };
  const d = detectors || {};
  const flow = Number.isFinite(d.flow) ? d.flow : 0;
  const liquidity = Number.isFinite(d.liquidity) ? d.liquidity : 0;
  const sentiment = Number.isFinite(d.sentiment) ? d.sentiment : 0;
  const whale = Number.isFinite(d.whale) ? d.whale : 0;
  const algo = Number.isFinite(d.algo) ? d.algo : 0;
  const retail = Number.isFinite(d.retail) ? d.retail : 0;
  const score =
    flow * w.flow +
    liquidity * w.liquidity +
    sentiment * w.sentiment +
    whale * w.whale +
    algo * w.algo +
    retail * w.retail;
  return Math.max(0, Math.min(score * 20, 100));
}
module.exports = { computeKibaScore };
