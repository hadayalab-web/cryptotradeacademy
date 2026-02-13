/**
 * Phase 4: Extract email payload from btcSnapshot.
 * Used by formatRegularBriefingHTML(snapshot, lang, opts).
 */

/**
 * @param {Object} snapshot - btcSnapshot
 * @param {Object} opts - { psychologicalSupport, nonUserImpactReport, missedOpportunities, grokXAnalysis }
 * @returns {Object} payload for formatRegularBriefingHTMLCore
 */
function extractFromSnapshot(snapshot, opts = {}) {
  if (!snapshot || typeof snapshot !== "object") return null;
  const raw = snapshot.raw || {};
  const cqDeep = snapshot.cqDeep || {};
  const td = snapshot.trapDetection || {};
  const asOf = snapshot.as_of_utc || new Date().toISOString();
  const now = typeof asOf === "string" ? new Date(asOf) : asOf;
  const inflow = raw.inflow ?? cqDeep.exchangeNetflow ?? 0;
  const mpi = raw.mpi ?? cqDeep.minerMPI ?? cqDeep.mpi ?? 0;
  const whaleFlows = cqDeep.whaleFlows ?? null;
  const liquidations = cqDeep.liquidations ?? null;
  const trap = td.trapDetected
    ? { isTrap: true, label: td.label ?? "Trap", confidence: td.trapSeverity ?? "MEDIUM" }
    : { isTrap: false, label: "No trap", confidence: "LOW" };

  const grokXAnalysis = opts.grokXAnalysis ?? snapshot.highResX ?? null;
  const grokObj = grokXAnalysis && typeof grokXAnalysis === "object" ? grokXAnalysis : null;
  const grokXText = typeof grokXAnalysis === "string" ? grokXAnalysis : (grokObj?.xEngineReport || grokObj?.summary || null);

  return {
    now,
    inflow,
    mpi,
    sentimentLabel: raw.sentimentLabel ?? "Unknown",
    priceUsd: raw.priceUsd ?? null,
    change24h: raw.change24h ?? null,
    score: snapshot.market_score ?? 0,
    tradeSignal: snapshot.tradeSignal || { signal: "STANDBY", tp: null, sl: null, rr: null },
    trap,
    aiAnalysis: snapshot.drGrok?.base ?? (typeof snapshot.gptStructureReasoning === "string" ? snapshot.gptStructureReasoning : null),
    stats: null,
    trapScore: cqDeep.trapScore ?? td.trapScore ?? null,
    whaleFlows,
    liquidations,
    noTradeAlert: null,
    trapRisk: null,
    exitMap: null,
    trapDetection: td,
    marketBug: opts.marketBug ?? null,
    trapAlert: snapshot.trapAlert ?? null,
    divergenceSignal: snapshot.divergenceSignal ?? null,
    psychologicalSupport: opts.psychologicalSupport ?? null,
    hasGeminiContent: !!(snapshot.sosovalueArticle && String(snapshot.sosovalueArticle).trim()),
    gptReporterAnalysis: snapshot.gptStructureReasoning ?? null,
    grokXAnalysis: grokObj ?? grokXText,
    geminiImageUrl: null,
    geminiVideoUrl: null,
    cqDeep: cqDeep || null,
    showContent: null,
    sosovalueArticle: snapshot.sosovalueArticle ?? null,
    diff: snapshot.diff ?? null
  };
}

module.exports = { extractFromSnapshot };
