/**
 * Trap Defence OS: KV インフルエンサー → Supabase td_influencers 移設
 * 実行: node scripts/td-migrate-influencers-to-supabase.js
 * 前提: .env に NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, KV_* を設定
 */
require("dotenv").config({ path: ".env.local" });
require("dotenv").config();

const { kv } = require("../utils/kv");
const { insertTdInfluencers, getTdInfluencers } = require("../utils/supabase");

const LANGS = ["en", "es", "pt-br", "ar", "ja", "ko"];
const STOCK_KEY_PREFIX = "x:influencer_stock:";

async function main() {
  const allRows = [];
  const seen = new Set();

  for (const lang of LANGS) {
    const key = STOCK_KEY_PREFIX + lang;
    const stock = await kv?.get(key);
    if (!Array.isArray(stock) || stock.length === 0) {
      console.log("[TD-Migrate] No stock for " + lang);
      continue;
    }

    const targetLang = lang === "pt-br" ? "pt" : lang;
    for (const inf of stock) {
      const handle = String(inf.username || inf.handle || "").replace(/^@/, "").trim();
      if (!handle) continue;
      const dedupeKey = handle + ":" + targetLang;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      allRows.push({
        handle,
        platform: "x",
        lang: targetLang,
        category: "crypto",
        followers: inf.followers ?? inf.recentImpressions ?? null,
        notes: inf.source ? "source:" + inf.source : null
      });
    }
    console.log("[TD-Migrate] " + lang + ": " + stock.length + " entries");
  }

  if (allRows.length === 0) {
    console.log("[TD-Migrate] No influencers to migrate");
    return;
  }

  const result = await insertTdInfluencers(allRows);
  if (result.ok) {
    const list = await getTdInfluencers();
    console.log("[TD-Migrate] Inserted " + allRows.length + " -> td_influencers total: " + list.length);
  } else {
    console.error("[TD-Migrate] Insert failed:", result.error);
  }
}

main().catch(function (e) {
  console.error("[TD-Migrate] Fatal:", e);
  process.exit(1);
});
