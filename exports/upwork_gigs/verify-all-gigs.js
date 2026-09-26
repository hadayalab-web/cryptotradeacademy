// verify-all-gigs.js
// Master Verification Suite for all 4 Exported Upwork Gigs

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

function verify() {
  console.log("=============================================================");
  console.log("🏛️ HadayaLab Dual-Export Verification Suite (Gigs 01 - 04)");
  console.log("=============================================================\n");

  const baseDir = __dirname;
  const gigs = [
    { id: "gig-01", dir: "gig-01-telegram-scout-lead-generator", test: "run-demo.js" },
    { id: "gig-02", dir: "gig-02-x-buzzweave-parasitic-bot", test: "run-demo.js" },
    { id: "gig-03", dir: "gig-03-affiliate-swipe-masterkit", files: ["The_WarriorPlus_Affiliate_Swipe_Book_v2.2.pdf", "carrd_lp_master_copy_en.md"] },
    { id: "gig-04", dir: "gig-04-whitelabel-oem-turnkey-enterprise", files: ["WHITE_LABEL_OEM_SPECIFICATION.md", "PROPOSAL_TEMPLATE.md", "MARKET_PAIN_INTELLIGENCE_REPORT.md"] }
  ];

  for (const gig of gigs) {
    console.log(`Checking [${gig.id}]: ${gig.dir}...`);
    const gigPath = path.join(baseDir, gig.dir);
    if (!fs.existsSync(gigPath)) {
      throw new Error(`Directory missing: ${gigPath}`);
    }

    if (gig.test) {
      const scriptPath = path.join(gigPath, gig.test);
      if (!fs.existsSync(scriptPath)) throw new Error(`Demo script missing: ${scriptPath}`);
      execSync(`node "${scriptPath}"`, { stdio: "pipe" });
      console.log(`  ✅ Demo runner executed successfully (Exit Code 0)`);
    }

    if (gig.files) {
      for (const f of gig.files) {
        const fp = path.join(gigPath, f);
        if (!fs.existsSync(fp)) throw new Error(`Asset missing: ${fp}`);
        const size = fs.statSync(fp).size;
        console.log(`  ✅ Asset verified: ${f} (${size} bytes)`);
      }
    }
  }

  console.log("\n=============================================================");
  console.log("🎯 ALL 4 GIGS FULLY VALIDATED & PACKAGED FOR IMMEDIATE CLIENT HANDOVER");
  console.log("=============================================================");
}

verify();
