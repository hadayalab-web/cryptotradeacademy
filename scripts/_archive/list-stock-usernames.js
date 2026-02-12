#!/usr/bin/env node
// scripts/list-stock-usernames.js
// KV ストックに溜まったインフルエンサーを @username 一覧で表示（集まったリストを確認用）
//
// 使い方:
//   node scripts/list-stock-usernames.js
//   node scripts/list-stock-usernames.js --lang=en
//   node scripts/list-stock-usernames.js --lang=ja --count

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const { getInfluencersFromStock } = require("../services/x/influencerStock");

const LANGS = ["en", "es", "pt-br", "ar", "ja", "ko"];

async function main() {
  const langArg = process.argv.find((a) => a.startsWith("--lang="));
  const onlyLang = langArg ? langArg.replace("--lang=", "").trim() || null : null;
  const countOnly = process.argv.includes("--count");

  const langs = onlyLang ? [onlyLang] : LANGS;

  if (!require("../utils/kv").kv) {
    console.error("KV が利用できません。.env を確認してください。");
    process.exit(1);
  }

  console.log("");
  console.log("=== KV ストック @username 一覧 ===");
  if (onlyLang) console.log("  言語:", onlyLang);
  console.log("");

  let total = 0;
  for (const lang of langs) {
    const list = await getInfluencersFromStock(lang, { enableScoring: false });
    const usernames = (list || []).map((inf) => inf.username || inf.userId || inf.id).filter(Boolean);
    total += usernames.length;

    if (countOnly) {
      console.log(`  ${lang}: ${usernames.length} 件`);
      continue;
    }

    console.log(`--- ${lang.toUpperCase()} (${usernames.length} 件) ---`);
    usernames.forEach((u) => console.log(`  @${u}`));
    console.log("");
  }

  console.log("--- 合計 ---");
  console.log(`  総数: ${total} 件`);
  console.log("");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
