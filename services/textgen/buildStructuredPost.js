/**
 * Trap Defence OS v5.2 — スロットから構造化投稿を自律生成
 * テンプレート × 言語心理 × 市場スナップショット × 導線レイヤー（24本）
 */

const { adaptToneByLang } = require("./psychLanguageAdapter");
const { buildFomoTemplate, buildAthTemplate, buildCrashTemplate } = require("./templates/fomo");
const { pickBestFunnelLink } = require("../links");

function buildCTA({ lang, cta_type }) {
  const l = (lang || "en").replace("pt-br", "pt").toLowerCase();

  if (cta_type === "FOMO_RIDE") {
    return (
      {
        en: "Don't watch this wave from the sidelines.",
        ja: "この波を「外側」から眺める側に回るな。",
        ko: "이번 파동, 밖에서 구경만 하지 마라.",
        es: "No mires esta ola desde fuera.",
        pt: "Não fique só olhando essa onda.",
        ar: "لا تكتفِ بمشاهدة هذه الموجة من الخارج."
      }[l] || "Don't sit out this wave."
    );
  }

  if (cta_type === "ATH_SURGE") {
    return (
      {
        en: "If you misread ATH, you don't get a second chance.",
        ja: "ATH を読み違えたトレーダーに、二度目のチャンスは来ない。",
        ko: "ATH를 잘못 읽으면, 두 번째 기회는 없다.",
        es: "Si lees mal el ATH, no hay segunda oportunidad.",
        pt: "Se você erra o ATH, não tem segunda chance.",
        ar: "إذا قرأت ATH بشكل خاطئ، لن تحصل على فرصة ثانية."
      }[l] || "You don't get a second chance at ATH."
    );
  }

  return (
    {
      en: "Stop being exit liquidity.",
      ja: "出口流動性で終わるな。",
      ko: "exit liquidity로 끝나지 마라.",
      es: "Deja de ser liquidez de salida.",
      pt: "Pare de ser liquidez de saída.",
      ar: "توقف عن أن تكون سيولة خروج."
    }[l] || "Stop being exit liquidity."
  );
}

async function buildMainAndReplies({ lang, narrative_tag, cta_type, market, slot }) {
  let base;

  if (narrative_tag === "ATH") {
    base = buildAthTemplate({ lang, market });
  } else if (narrative_tag === "CRASH") {
    base = buildCrashTemplate({ lang, market });
  } else {
    base = buildFomoTemplate({ lang, market, narrative_tag });
  }

  const cta = buildCTA({ lang, cta_type });

  const composed = adaptToneByLang(
    {
      hook: base.hook,
      body: base.body,
      cta
    },
    lang
  );

  const main_text = `${composed.hook}\n\n${composed.body}\n\n${composed.cta}`;
  const reply_text_1 =
    "Dr.Grok is tracking this structure in real-time.\n\nTrap Score / Netflow / Whale Ratio are not opinions—they're diagnostics.";

  const link = await pickBestFunnelLink({
    lang,
    narrative_tag,
    cta_type,
    weight: slot?.weight ?? slot?._weight ?? 2
  });
  const linkUrl = link?.url ?? "https://whop.com/trapdefence";
  const linkSource = link?.type?.includes("vidalytics") ? "Vidalytics" : "Whop";
  const reply_text_2 =
    "If you want the full briefing instead of fragments:\n\nMinimal (free) → Regular (full protocol)\n" +
    `${linkSource} → ${linkUrl}`;

  return { main_text, reply_text_1, reply_text_2, link };
}

/**
 * スロット + 市場スナップショットから投稿本文を生成
 * @param {Object} slot - { lang, narrative_tag, cta_type, weight }
 * @param {Object} market_snapshot - { dogeMove, xrpMove, trapScore, netflowState, whaleRatio, cvdState, liquidationBias, fundingRate, athLevel }
 */
async function buildStructuredPostFromSlot(slot, market_snapshot = {}) {
  const { lang = "en", narrative_tag = "FOMO", cta_type = "FOMO_RIDE" } = slot || {};

  const market = {
    asset: "BTC",
    dogeMove: market_snapshot?.dogeMove ?? "+12%",
    xrpMove: market_snapshot?.xrpMove ?? "+8%",
    trapScore: market_snapshot?.trapScore ?? "elevated",
    netflowState: market_snapshot?.netflowState ?? "absorption",
    whaleRatio: market_snapshot?.whaleRatio ?? "unknown",
    cvdState: market_snapshot?.cvdState ?? "neutral",
    liquidationBias: market_snapshot?.liquidationBias ?? "neutral",
    fundingRate: market_snapshot?.fundingRate ?? "neutral",
    athLevel: market_snapshot?.athLevel ?? "$69K–$72K"
  };

  return buildMainAndReplies({
    lang,
    narrative_tag,
    cta_type,
    market,
    slot
  });
}

module.exports = { buildStructuredPostFromSlot, buildMainAndReplies, buildCTA };
