/**
 * Trap Defence OS v5.2 — スロットから構造化投稿を自律生成
 * 画像なし戦略: 文章 × 自リプ × 市場同期 × 多言語心理で CTR 最大化
 * 自リプ仕様: reply_text_2 = リンク先行, reply_text_1 = Dr.Grok + 質問
 */

const { adaptToneByLang } = require("./psychLanguageAdapter");
const { buildFomoTemplate, buildAthTemplate, buildCrashTemplate } = require("./templates/fomo");
const { pickBestFunnelLink } = require("../links");

// ---- CTA 強度プリセット（画像の代わりに文章圧力でクリックを取る） ----
const CTA_PRESETS = {
  ATH_SURGE: {
    level: "strong",
    templates: {
      en: "If you misread this move, you don't get a second chance.",
      ja: "この動きを読み違えたら、二度目のチャンスはない。",
      es: "Si lees mal este movimiento, no hay segunda oportunidad.",
      pt: "Se você errar este movimento, não tem segunda chance.",
      ko: "이 움직임을 잘못 읽으면, 두 번째 기회는 없다.",
      ar: "إذا أخطأت قراءة هذه الحركة، لن تحصل على فرصة ثانية."
    }
  },
  REVERSAL_ALERT: {
    level: "medium",
    templates: {
      en: "This is where the trap flips. If you're late here, you're liquidity.",
      ja: "罠が反転するポイントだ。ここで遅れたら流動性になる。",
      es: "Aquí es donde la trampa se invierte. Si llegas tarde, eres liquidez.",
      pt: "É aqui que a armadilha vira. Se atrasar, vira liquidez.",
      ko: "함정이 뒤집히는 지점이다. 여기서 늦으면 유동성이 된다.",
      ar: "هنا تنقلب الفخاخ. إن تأخرت هنا، أنت السيولة."
    }
  },
  DIAGNOSTIC: {
    level: "soft",
    templates: {
      en: "Full briefing instead of fragments → Minimal (free) → Regular (full protocol).",
      ja: "断片ではなく完全ブリーフィング → Minimal (無料) → Regular (完全プロトコル)。",
      es: "Briefing completo en lugar de fragmentos → Minimal (gratis) → Regular (protocolo completo).",
      pt: "Briefing completo em vez de fragmentos → Minimal (grátis) → Regular (protocolo completo).",
      ko: "조각이 아닌 전체 브리핑 → Minimal(무료) → Regular(전체 프로토コル).",
      ar: "إحاطة كاملة بدلاً من أجزاء → Minimal (مجاني) → Regular (البروتوكول الكامل)."
    }
  }
};

/** snapshot に応じて CTA プリセットを選択（ボラティリティ高 → ATH_SURGE） */
function pickCtaPreset(slot, snapshot) {
  if (!snapshot) return null;
  const trapScore = String(snapshot.trapScore ?? "").toLowerCase();
  const netflowState = String(snapshot.netflowState ?? "").toLowerCase();
  const fundingRate = String(snapshot.fundingRate ?? "").toLowerCase();
  const liquidationBias = String(snapshot.liquidationBias ?? "").toLowerCase();
  const trapNum = typeof snapshot.trapScore === "number" ? snapshot.trapScore : null;

  if (trapScore === "elevated" || trapScore === "high" || (trapNum != null && trapNum > 0.7)) {
    return "ATH_SURGE";
  }
  if (
    (fundingRate === "overheated" || fundingRate === "high") &&
    (liquidationBias === "long" || liquidationBias === "short")
  ) {
    return "REVERSAL_ALERT";
  }
  return "DIAGNOSTIC";
}

/** リンク先行リプライ（自リプ 1 本目 = 導線） */
function buildLinkReply(link, lang) {
  const linkUrl = link?.url ?? "https://whop.com/trapdefence";
  const linkSource = link?.type?.includes("vidalytics") ? "Vidalytics" : "Whop";
  return [
    "If you want the full briefing instead of fragments:",
    "Minimal (free) → Regular (full protocol)",
    `${linkSource} → ${linkUrl}`
  ].join("\n\n");
}

/** Dr.Grok + 質問リプライ（自リプ 2 本目 = Engagement bait） */
function buildGrokReply(snapshot, lang) {
  const l = (lang || "en").replace("pt-br", "pt").toLowerCase();
  const base = [
    "Dr.Grok is tracking this structure in real-time.",
    "Trap Score / Netflow / Whale Ratio are not opinions—they're diagnostics."
  ];
  const questionByLang = {
    en: "Do you see the same structure, or are you fading this?",
    ja: "あなたはこの構造を同じように見ていますか？それとも逆張りしますか？",
    es: "¿Ves la misma estructura o vas en contra?",
    pt: "Você vê a mesma estrutura ou está indo contra?",
    ko: "같은 구조로 보이나요, 아니면 역으로 가고 있나요?",
    ar: "هل ترى نفس الهيكل أم أنك تعاكسه؟"
  };
  base.push(questionByLang[l] || questionByLang.en);
  return base.join("\n\n");
}

/** 言語別 Hook / Warning（EN/JA/ES 最低限） */
function localizeHookAndWarning(lang) {
  const l = (lang || "en").replace("pt-br", "pt").toLowerCase();
  const variants = {
    en: {
      hook: "Why is {ALT} moving *before* BTC?",
      warning: "If you misread this structure, you don't get a second chance."
    },
    ja: {
      hook: "なぜ {ALT} が *BTC より先に* 動いているのか？",
      warning: "この構造を誤読すると、次はありません。"
    },
    es: {
      hook: "¿Por qué {ALT} se mueve *antes* que BTC?",
      warning: "Si lees mal este movimiento, no hay segunda oportunidad."
    },
    pt: {
      hook: "Por que {ALT} está se movendo *antes* do BTC?",
      warning: "Se você errar este movimento, não tem segunda chance."
    },
    ko: {
      hook: "왜 {ALT}가 BTC보다 *먼저* 움직이나요?",
      warning: "이 구조를 잘못 읽으면, 두 번째 기회는 없다."
    },
    ar: {
      hook: "لماذا يتحرك {ALT} *قبل* BTC؟",
      warning: "إذا أخطأت قراءة هذا الهيكل، لن تحصل على فرصة ثانية."
    }
  };
  return variants[l] || variants.en;
}

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

  if (cta_type === "REVERSAL_ALERT") {
    return (
      {
        en: "This is where the trap flips. If you're late here, you're liquidity.",
        ja: "罠が反転するポイントだ。ここで遅れたら流動性になる。",
        ko: "함정이 뒤집히는 지점이다. 여기서 늦으면 유동성이 된다.",
        es: "Aquí es donde la trampa se invierte. Si llegas tarde, eres liquidez.",
        pt: "É aqui que a armadilha vira. Se atrasar, vira liquidez.",
        ar: "هنا تنقلب الفخاخ. إن تأخرت هنا، أنت السيولة."
      }[l] || "This is where the trap flips."
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

async function buildMainAndReplies({ lang, narrative_tag, cta_type, market, slot, snapshot }) {
  let base;

  if (narrative_tag === "ATH") {
    base = buildAthTemplate({ lang, market });
  } else if (narrative_tag === "CRASH") {
    base = buildCrashTemplate({ lang, market });
  } else {
    base = buildFomoTemplate({ lang, market, narrative_tag });
  }

  const presetKey = pickCtaPreset(slot, snapshot);
  let cta;
  if (presetKey && CTA_PRESETS[presetKey]) {
    const l = (lang || "en").replace("pt-br", "pt").toLowerCase();
    cta = CTA_PRESETS[presetKey].templates[l] || CTA_PRESETS[presetKey].templates.en;
  } else {
    cta = buildCTA({ lang, cta_type });
  }

  const composed = adaptToneByLang(
    {
      hook: base.hook,
      body: base.body,
      cta
    },
    lang
  );

  const main_text = `${composed.hook}\n\n${composed.body}\n\n${composed.cta}`;

  const link = await pickBestFunnelLink({
    lang,
    narrative_tag,
    cta_type,
    weight: slot?.weight ?? slot?._weight ?? 2
  });

  const reply_text_2 = buildLinkReply(link, lang);
  const reply_text_1 = buildGrokReply(snapshot, lang);

  return { main_text, reply_text_1, reply_text_2, link };
}

/**
 * スロット + 市場スナップショットから投稿本文を生成
 * @param {Object} slot - { lang, narrative_tag, cta_type, weight }
 * @param {Object} market_snapshot - { dogeMove, xrpMove, trapScore, netflowState, is_stale, ... }
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

  const result = await buildMainAndReplies({
    lang,
    narrative_tag,
    cta_type,
    market,
    slot,
    snapshot: market_snapshot
  });

  console.info("[BuzzWeave] structured_post_decision", {
    lang,
    cta_type,
    narrative_tag,
    snapshot_flags: {
      is_stale: !!market_snapshot?.is_stale,
      trap_score: market_snapshot?.trap_score_label ?? market_snapshot?.trapScore,
      netflow_state: market_snapshot?.netflow_state ?? market_snapshot?.netflowState
    }
  });

  return result;
}

module.exports = {
  buildStructuredPostFromSlot,
  buildMainAndReplies,
  buildCTA,
  CTA_PRESETS,
  pickCtaPreset,
  buildLinkReply,
  buildGrokReply,
  localizeHookAndWarning
};
