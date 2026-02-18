/**
 * 3パターン集約（パターン=1メッセージ）の EN / JA サンプル出力
 * 実行: node scripts/sample-pqt-3patterns-en-ja.js
 */
const { PQT_TEMPLATES_3PATTERNS, getPatternFromDangerLabel, getScarcityLine, getPromoLine } = require("../services/td/pqtTemplates");

const SAMPLE_CTX = {
  coin: "BTC",
  proofSnippet: "[サンプル] 急騰後の戻しで押し目形成の可能性。構造の変わり目を一つ確認。",
  link: "https://whop.com/trapdefence/btc-regular-ja/",
  funnelType: "whop_regular",
  mirrorWords: ""
};

const REPLY_MAX = 280;

function run() {
  console.log("=== PQT 3パターン集約 — EN / JA サンプル ===\n");

  for (const lang of ["en", "ja"]) {
    const langLabel = lang === "en" ? "EN" : "JA";
    const byPattern = PQT_TEMPLATES_3PATTERNS[lang] || PQT_TEMPLATES_3PATTERNS.en;

    console.log(`\n--- ${langLabel} ---\n`);

    for (const dangerLabel of ["whale_trap", "educational", "neutral"]) {
      const pattern = getPatternFromDangerLabel(dangerLabel);
      const patternLabel = { fear: "1. 恐怖訴求 (fear)", authority: "2. 権威訴求 (authority)", elitism: "3. 選民訴求 (elitism)" }[pattern];
      const fn = byPattern[pattern] || byPattern.elitism;
      let text = fn(SAMPLE_CTX);
      const promo = getPromoLine(lang);
      const scarcity = getScarcityLine(lang, 50, dangerLabel);
      if (text.length + promo.length <= REPLY_MAX) text += promo;
      if (text.length + scarcity.length <= REPLY_MAX) text += scarcity;

      console.log(`【${patternLabel}】 dangerLabel=${dangerLabel}`);
      console.log(text);
      console.log(`\n(長さ: ${text.length}${text.length > REPLY_MAX ? " — 280字超過" : ""})\n`);
    }
  }

  console.log("=== 以上 EN/JA 各3パターン（本文＋プロモ＋希少性）===");
}

run();
