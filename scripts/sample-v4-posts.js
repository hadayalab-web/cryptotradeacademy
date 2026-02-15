/**
 * BuzzDefence v4 投稿サンプル出力 — 6言語すべて
 */
const v4 = require("../services/td/buzzDefenceEngineV4.js");
const { pickVidalyticsLink } = require("../config/buzzweaveLinks");

const LANGS = ["en", "es", "pt", "ar", "ko", "ja"];
const LANG_LABELS = { en: "EN", es: "ES", pt: "PT", ar: "AR", ko: "KO", ja: "JA" };

// 言語別 hook（BotNet）
const BOTNET_HOOK = {
  en: "Bot cluster detected. Structure says:",
  es: "Cluster de bots detectado. La estructura dice:",
  pt: "Cluster de bots detectado. A estrutura diz:",
  ar: "عنقود بوتات مُكتشف. الهيكل يقول:",
  ko: "봇 클러스터 검출. 구조가 말해요:",
  ja: "ボットクラスタ検出。構造が示すのは:"
};

// 言語別 hook（Trap FOMO）
const TRAP_FOMO_HOOK = {
  en: "Trap or real? Structure says:",
  es: "¿Trampa o real? La estructura dice:",
  pt: "Trampa ou real? A estrutura diz:",
  ar: "فخ أم حقيقي؟ الهيكل يقول:",
  ko: "함정일까, 진짜일까? 구조가 말해요:",
  ja: "罠か、本物か？構造が示す:"
};

// 言語別 hashtags ベース
const HASHTAGS_BY_LANG = {
  en: ["#Bitcoin", "#Crypto"],
  es: ["#BitcoinES", "#Crypto"],
  pt: ["#BitcoinPT", "#Crypto"],
  ar: ["#BitcoinAR", "#Crypto"],
  ko: ["#BitcoinKO", "#Crypto"],
  ja: ["#BitcoinJA", "#Crypto"]
};

const VID = pickVidalyticsLink("en", "regular");

// BotNet (BOTNET) — 6言語
console.log("========== BotNet (BOTNET) ==========\n");
for (const lang of LANGS) {
  const sp = {
    mode: "botnet",
    lang,
    hook: BOTNET_HOOK[lang],
    bullets: ["• Clusters: 3", "• Initial boost: 45x", "• Bot suspects: 12"],
    structure_note:
      "Bot amplification (10-50x...) — artificial virality pushes into ForYou.",
    data_sources: ["Data: Dune / Glassnode / CryptoQuant"],
    cta_core: "RT to save someone.",
    hashtags: [...HASHTAGS_BY_LANG[lang], "#BotNetAlert", "#TrapDefence"],
    psychology_tag: "BOTNET"
  };
  const b = v4.buildXPost(sp, pickVidalyticsLink(lang, "regular"));
  console.log(`--- ${LANG_LABELS[lang]} ---\n${b.mainPost}\n`);
}

// Trap FOMO — 6言語
console.log("========== Trap FOMO ==========\n");
for (const lang of LANGS) {
  const sp = {
    mode: "trap",
    lang,
    hook: TRAP_FOMO_HOOK[lang],
    bullets: [
      "• Flow: strong",
      "• Liquidity: clustered",
      "• Sentiment: FOMO"
    ],
    structure_note:
      "Clustered liquidity + FOMO flow — assess if accumulation or distribution.",
    data_sources: ["Data: Dune / Glassnode / CryptoQuant"],
    cta_core: "RT to save someone.",
    hashtags: [...HASHTAGS_BY_LANG[lang], "#TrapDefence"],
    psychology_tag: "FOMO"
  };
  const b = v4.buildXPost(sp, pickVidalyticsLink(lang, "regular"));
  console.log(`--- ${LANG_LABELS[lang]} ---\n${b.mainPost}\n`);
}
