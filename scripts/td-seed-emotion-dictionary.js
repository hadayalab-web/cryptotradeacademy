/**
 * Trap Defence OS: td_emotion_dictionary 初期シード
 * 実行: node scripts/td-seed-emotion-dictionary.js
 * 前提: .env に NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY を設定
 */
require("dotenv").config({ path: ".env.local" });
require("dotenv").config();

const { insertTdEmotionPhrases, getTdEmotionDictionary } = require("../utils/supabase");

const SEED = [
  { category: "fear", phrase: "冷える", lang: "ja" },
  { category: "fear", phrase: "tight", lang: "en" },
  { category: "fear", phrase: "fear", lang: "en" },
  { category: "anxiety", phrase: "ざわつく", lang: "ja" },
  { category: "anxiety", phrase: "unease", lang: "en" },
  { category: "anxiety", phrase: "不安", lang: "ja" },
  { category: "sadness", phrase: "崩れる", lang: "ja" },
  { category: "sadness", phrase: "ache", lang: "en" },
  { category: "disappointment", phrase: "後悔", lang: "ja" },
  { category: "whale", phrase: "クジラ", lang: "ja" },
  { category: "whale", phrase: "whale", lang: "en" },
  { category: "algo", phrase: "アルゴ", lang: "ja" },
  { category: "algo", phrase: "algo", lang: "en" }
];

async function main() {
  const existing = await getTdEmotionDictionary(null, null, 5);
  if (existing.length > 0) {
    console.log("[TD-Seed] td_emotion_dictionary already has data, skipping seed");
    return;
  }
  const result = await insertTdEmotionPhrases(SEED);
  if (result.ok) {
    console.log("[TD-Seed] Inserted " + SEED.length + " emotion phrases");
  } else {
    console.error("[TD-Seed] Insert failed");
  }
}

main().catch(function (e) {
  console.error("[TD-Seed] Fatal:", e);
  process.exit(1);
});
