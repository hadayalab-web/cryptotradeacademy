/**
 * FirstPromoter イベント種別の判定ヘルパー
 */

function normalizeFirstPromoterEventType(eventType) {
  return String(eventType || "")
    .trim()
    .toLowerCase()
    .replace(/[.\-\s]+/g, "_");
}

function isPromoterAcceptedEvent(eventType) {
  const normalized = normalizeFirstPromoterEventType(eventType);
  if (!normalized) return false;
  if (normalized === "promoter_accepted") return true;
  return normalized.includes("promoter") && normalized.includes("accept");
}

module.exports = {
  normalizeFirstPromoterEventType,
  isPromoterAcceptedEvent
};
