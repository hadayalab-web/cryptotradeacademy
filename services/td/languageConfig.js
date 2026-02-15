/**
 * PQT 用 6言語メタデータ（CTR最大化・言語別トーン）
 * Grok の数字は使わず、weight で配分・tone でテンプレニュアンスを揃える。
 */
const LANGUAGE_CONFIG = {
  en: { weight: 1.0, tone: "greed_scarcity" },
  es: { weight: 0.9, tone: "community_urgency" },
  pt: { weight: 0.9, tone: "party_scarcity" },
  ar: { weight: 0.7, tone: "authority_prophetic" },
  ko: { weight: 0.7, tone: "speed_exclusive" },
  ja: { weight: 0.6, tone: "safety_proof" }
};

const PQT_LANGS = Object.keys(LANGUAGE_CONFIG);

module.exports = { LANGUAGE_CONFIG, PQT_LANGS };
