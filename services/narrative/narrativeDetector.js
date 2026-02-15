/**
 * v5.5: 市場スナップショットからナラティブを直接判定
 * 72h ローテーションを「市場構造」に同期
 * 鮮度切れ (is_stale) 時は DEFAULT(FOMO) を返し、誤推定を避ける
 */

function detectNarrativeFromSnapshot(snapshot) {
  if (snapshot?.is_stale) {
    return "FOMO";
  }

  const trapScore = String(snapshot?.trapScore ?? "").toLowerCase();
  const netflowState = String(snapshot?.netflowState ?? "").toLowerCase();
  const liquidationBias = String(snapshot?.liquidationBias ?? "").toLowerCase();
  const fundingRate = String(snapshot?.fundingRate ?? "").toLowerCase();

  // TrapScore 高 + Netflow 吸収 → FOMO
  if (
    (trapScore === "elevated" || trapScore === "high") &&
    (netflowState === "absorption" || netflowState === "inflow")
  ) {
    return "FOMO";
  }

  // Funding 過熱 + 清算ロング偏り → ATH
  if (
    (fundingRate === "overheated" || fundingRate === "high") &&
    liquidationBias === "long"
  ) {
    return "ATH";
  }

  // TrapScore 高 + Netflow 流出 + 清算ショート偏り → CRASH
  if (
    (trapScore === "elevated" || trapScore === "high") &&
    (netflowState === "outflow" || netflowState === "distribution") &&
    liquidationBias === "short"
  ) {
    return "CRASH";
  }

  return "FOMO";
}

module.exports = { detectNarrativeFromSnapshot };
