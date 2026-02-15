const path = require("path");
const fs = require("fs");
const { getFunnelStats } = require("./metrics");

function loadLinks() {
  const base = path.join(__dirname, "btc");
  if (!fs.existsSync(base)) return [];
  const categories = fs.readdirSync(base);
  const links = [];

  for (const cat of categories) {
    const catDir = path.join(base, cat);
    if (!fs.lstatSync(catDir).isDirectory()) continue;

    const files = fs.readdirSync(catDir).filter((f) => f.endsWith(".js") && f !== "index.js");
    for (const file of files) {
      try {
        const mod = require(path.join(catDir, file));
        links.push(mod);
      } catch (e) {
        console.warn("[links] load error:", cat, file, e?.message);
      }
    }
  }

  return links;
}

const ALL_LINKS = loadLinks();

function getLinksByLang(lang) {
  const l = (lang || "en").replace("pt-br", "pt").toLowerCase();
  return ALL_LINKS.filter((link) => link.lang === l);
}

/**
 * v5.3: 学習型 — 直近72hの CVR/CTR が最大の funnel_type を優先、なければヒューリスティック
 */
async function pickBestFunnelLink({ lang, narrative_tag, cta_type, weight }) {
  const candidates = getLinksByLang(lang);
  if (!candidates.length) return null;

  const w = typeof weight === "number" ? weight : 1;

  try {
    const stats = await getFunnelStats(lang);
    const bestType = stats.bestBySub ?? stats.bestByClick ?? null;
    if (bestType) {
      const best = candidates.find((c) => c.type === bestType);
      if (best) return best;
    }
  } catch (_) {}

  if (cta_type === "ATH_SURGE" && w >= 3) {
    const link = candidates.find((c) => c.type === "whop_regular");
    if (link) return link;
  }

  if (narrative_tag === "FOMO") {
    const link = candidates.find((c) => c.type === "vidalytics_regular");
    if (link) return link;
  }

  if (w <= 1) {
    const link = candidates.find((c) => c.type === "whop_minimal");
    if (link) return link;
  }

  const link = candidates.find((c) => c.type === "vidalytics_leadmagnet");
  if (link) return link;

  return candidates[0] || null;
}

module.exports = {
  ALL_LINKS,
  getLinksByLang,
  pickBestFunnelLink
};
