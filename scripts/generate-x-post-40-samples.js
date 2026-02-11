/**
 * Trap Defence OS — 40本 dry_run 生成スクリプト
 * ja/en × minimal/regular の4カテゴリ × 10本
 */
require("dotenv").config({ path: ".env.local" });
require("dotenv").config();

const { generateXPost } = require("../services/ai/gpt5mini");

const VIDEO_URL = "https://example.com/vsl";
const CATEGORIES = [
  { key: "ja_minimal", lang: "ja", mode: "minimal" },
  { key: "ja_regular", lang: "ja", mode: "regular" },
  { key: "en_minimal", lang: "en", mode: "minimal" },
  { key: "en_regular", lang: "en", mode: "regular" }
];
const PER_CATEGORY = 10;

async function main() {
  const result = {};
  for (const cat of CATEGORIES) {
    result[cat.key] = [];
    for (let i = 0; i < PER_CATEGORY; i++) {
      const r = await generateXPost({
        language: cat.lang,
        mode: cat.mode,
        video_url: VIDEO_URL
      });
      result[cat.key].push({
        body: r.body,
        variant: r.variant,
        mode: cat.mode
      });
      process.stdout.write(".");
    }
    process.stdout.write(` ${cat.key}\n`);
  }
  console.log(JSON.stringify(result, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
