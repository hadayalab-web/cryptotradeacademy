/**
 * PQT メインフロー統合（1 run / 1日想定）
 * 外部ツールは使わず、snapshot + candidatesByLang + linkResolver を渡して実行。
 */
const { allocatePqtPerLanguage } = require("./pqtPlanner");
const { selectFishermanSlots, selectSlotsFallback } = require("./fishermanDetector");
const { buildPqt, recordPqtUse } = require("./pqtCtaEngine");
const { buildProofSnippetFromSnapshot } = require("./pqtProofSnippet");
const { getBtcSnapshot } = require("../market/getBtcSnapshot");
const { pickBestFunnelLink } = require("../links");

const COIN_SYMBOL_DEFAULT = "BTC";

function extractCoinFromText(text) {
  if (!text || typeof text !== "string") return COIN_SYMBOL_DEFAULT;
  const u = text.toUpperCase();
  if (u.includes("BTC") || u.includes("BITCOIN")) return "BTC";
  if (u.includes("ETH")) return "ETH";
  if (u.includes("SOL")) return "SOL";
  return COIN_SYMBOL_DEFAULT;
}

/**
 * 言語＋スロット（候補）から導線 URL を解決
 * @param {string} lang
 * @param {Object} slot - candidate オブジェクト（post, cluster, ...）
 */
async function defaultLinkResolver(lang, slot) {
  const link = await pickBestFunnelLink({
    lang,
    narrative_tag: "FOMO",
    cta_type: "ATH_SURGE",
    weight: 1
  });
  return link?.url ?? null;
}

/**
 * 1日分の PQT 実行（言語別目標数 × Fisherman スロット選定 × 投稿）
 * @param {Object} options
 * @param {Object} [options.snapshot] - 未指定なら getBtcSnapshot() で取得
 * @param {Object} options.candidatesByLang - { en: [...], ja: [...], ... }
 * @param {Object} [options.fisherActivityByLang] - { en: 1.2, ja: 0.8, ... } 0.5〜1.5
 * @param {Function} [options.linkResolver] - (lang, slot) => Promise<string>
 * @param {Function} [options.postQuoteTweet] - (text, sourcePostId) => Promise<{ id }>
 * @param {boolean} [options.dryRun=true]
 */
async function runPqtDay(options = {}) {
  const snapshot = options.snapshot || (await getBtcSnapshot());
  const candidatesByLang = options.candidatesByLang || {};
  const fisherActivityByLang = options.fisherActivityByLang || {};
  const linkResolver = options.linkResolver || defaultLinkResolver;
  const postQuoteTweet = options.postQuoteTweet || (async () => ({ id: null }));
  const dryRun = options.dryRun !== false;

  const perLangTarget = allocatePqtPerLanguage(snapshot, fisherActivityByLang);
  const results = { posted: 0, failed: 0, byLang: {} };

  for (const [lang, targetCount] of Object.entries(perLangTarget)) {
    if (targetCount <= 0) continue;

    const candidates = candidatesByLang[lang] || [];
    const slots = selectFishermanSlots(candidates, lang, targetCount);
    const slotsToUse = slots.length ? slots : selectSlotsFallback(candidates, targetCount);
    results.byLang[lang] = { target: targetCount, slots: slotsToUse.length, posted: 0 };

    for (const slot of slotsToUse) {
      const sourcePostId = slot?.post?.id || slot?.id;
      if (!sourcePostId) continue;

      const link = await linkResolver(lang, slot);
      if (!link) {
        results.failed += 1;
        continue;
      }

      const coin = slot?.coin_symbol || extractCoinFromText(slot?.post?.text);
      const proofSnippet = buildProofSnippetFromSnapshot(snapshot, lang, slot);
      const built = buildPqt(lang, { coin, proofSnippet, link });
      if (!built || !built.text) {
        results.failed += 1;
        continue;
      }

      if (dryRun) {
        results.byLang[lang].posted += 1;
        results.posted += 1;
        recordPqtUse(lang, built.templateIndex);
        continue;
      }

      try {
        await postQuoteTweet(built.text, sourcePostId);
        results.posted += 1;
        results.byLang[lang].posted += 1;
        recordPqtUse(lang, built.templateIndex);
      } catch (e) {
        results.failed += 1;
      }
    }
  }

  return results;
}

module.exports = {
  runPqtDay,
  defaultLinkResolver,
  extractCoinFromText
};
