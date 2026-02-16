/**
 * 6言語×8パターンのテンプレサンプルを標準出力に表示する
 * 実行: node services/td/pqtSampleTemplates.js        … 通常テンプレ
 *       node services/td/pqtSampleTemplates.js --bot  … 仕手Bot攻略用テンプレ
 */
const { PQT_TEMPLATES, PQT_TEMPLATES_BOT } = require("./pqtTemplates");

const LANGS = ["en", "ja", "es", "pt", "ar", "ko"];
const SAMPLE_CTX = {
  coin: "BTC",
  proofSnippet: "[サンプル] 急騰後の戻しで押し目形成の可能性",
  link: "https://example.com/pqt",
  funnelType: "vidalytics_regular",
  mirrorWords: "pump moon"
};

const useBot = process.argv.includes("--bot");
const templatesByLang = useBot ? PQT_TEMPLATES_BOT : PQT_TEMPLATES;
const title = useBot ? "仕手Bot攻略用テンプレ（6言語×4パターン）" : "PQT テンプレサンプル（6言語×8パターン）";

console.log("=== " + title + " ===\n");

for (const lang of LANGS) {
  const templates = templatesByLang[lang];
  if (!templates || templates.length === 0) continue;
  console.log("\n--- " + lang.toUpperCase() + " (" + templates.length + " パターン) ---\n");
  for (let i = 0; i < templates.length; i++) {
    const text = templates[i](SAMPLE_CTX);
    const len = text.length;
    const over280 = len > 280 ? " [280字超過]" : "";
    console.log("[%s #%d] %d字%s", lang, i + 1, len, over280);
    console.log(text);
    console.log("");
  }
}

console.log("\n=== 以上 ===");
