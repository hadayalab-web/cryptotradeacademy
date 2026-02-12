/**
 * Trap Defence OS: config/officialCryptoXAccounts.js → Supabase td_official_accounts 移設
 * 実行: node scripts/td-migrate-official-accounts-to-supabase.js
 * 前提: .env に NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY を設定
 */
require("dotenv").config({ path: ".env.local" });
require("dotenv").config();

const {
  EXCHANGES,
  PROJECTS_AND_FOUNDATIONS,
  COMPANIES_AND_MEDIA
} = require("../config/officialCryptoXAccounts");
const { insertTdOfficialAccounts, getTdOfficialAccounts } = require("../utils/supabase");

// org_type マッピング（指示書準拠）
// media | ai | finance | corporate | government
const MEDIA_HANDLES = new Set([
  "CoinDesk",
  "Cointelegraph",
  "TheBlock__",
  "decrypt",
  "Blockworks_",
  "BanklessHQ",
  "MessariCrypto"
]);
const AI_HANDLES = new Set(["xai"]);
const FINANCE_HANDLES = new Set([
  "a16z",
  "paradigm",
  "MulticoinCap",
  "Polychain",
  "DCGco",
  "grayscale",
  "CryptoQuant",
  "Glassnode",
  "Nansen",
  "DuneAnalytics",
  "DefiLlama"
]);

function orgTypeFor(handle, category) {
  if (EXCHANGES.includes(handle)) return "finance";
  if (PROJECTS_AND_FOUNDATIONS.includes(handle)) return "corporate";
  if (MEDIA_HANDLES.has(handle)) return "media";
  if (AI_HANDLES.has(handle)) return "ai";
  if (FINANCE_HANDLES.has(handle)) return "finance";
  return "corporate";
}

async function main() {
  const rows = [];
  const seen = new Set();

  for (const handle of EXCHANGES) {
    const h = String(handle).replace(/^@/, "").trim();
    if (!h || seen.has(h)) continue;
    seen.add(h);
    rows.push({
      handle: h,
      platform: "x",
      org_type: "finance",
      lang: "en",
      region: "US",
      priority: 1
    });
  }
  for (const handle of PROJECTS_AND_FOUNDATIONS) {
    const h = String(handle).replace(/^@/, "").trim();
    if (!h || seen.has(h)) continue;
    seen.add(h);
    rows.push({
      handle: h,
      platform: "x",
      org_type: "corporate",
      lang: "en",
      region: "US",
      priority: 2
    });
  }
  for (const handle of COMPANIES_AND_MEDIA) {
    const h = String(handle).replace(/^@/, "").trim();
    if (!h || seen.has(h)) continue;
    seen.add(h);
    rows.push({
      handle: h,
      platform: "x",
      org_type: orgTypeFor(h, "companies"),
      lang: "en",
      region: "US",
      priority: 2
    });
  }

  const { ok, error } = await insertTdOfficialAccounts(rows);
  if (ok) {
    const count = (await getTdOfficialAccounts()).length;
    console.log(`[TD-Migrate] ✅ Inserted ${rows.length} → td_official_accounts total: ${count}`);
  } else {
    console.error("[TD-Migrate] ❌ Insert failed:", error);
  }
}

main().catch((e) => {
  console.error("[TD-Migrate] Fatal:", e);
  process.exit(1);
});
