/**
 * PQT 用 6言語メタデータ（CTR最大化・言語別トーン）
 * Grok の数字は使わず、weight で配分・tone でテンプレニュアンスを揃える。
 * Grok エッセンス（docs/COPILOT_VS_GROK_ENGAGEMENT_COPY.md）: EN=直接FOMO/統計, ES=¡Exacto!等の温かみ,
 * PT=Mano spot on 等カジュアル, AR=敬語的同意・攻撃的焦りは避ける, KO=婉曲・맞아요 체크리스트,
 * JA=謙虚・最小emoji・リストで権威（その通りです。要チェック）
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
