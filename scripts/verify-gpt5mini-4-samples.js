require("dotenv").config({ path: ".env.local" });
require("dotenv").config();
const { generateXPost } = require("../services/ai/gpt5mini");
const VIDEO_URL = "https://example.com/vsl";
const SAMPLES = [
  { lang: "ja", mode: "minimal" },
  { lang: "ja", mode: "regular" },
  { lang: "en", mode: "minimal" },
  { lang: "en", mode: "regular" }
];
async function main() {
  const results = [];
  for (const s of SAMPLES) {
    const r = await generateXPost({ language: s.lang, mode: s.mode, video_url: VIDEO_URL });
    results.push({ ...s, ...r });
    console.log(`[${s.lang}/${s.mode}] ${r.body.substring(0, 60)}...`);
  }
  console.log(JSON.stringify(results, null, 2));
}
main().catch((e) => { console.error(e); process.exit(1); });
