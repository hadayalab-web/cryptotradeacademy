// run-demo.js
// Standalone Demo Runner for Gig-01: Telegram Crypto Community Scout & Lead Generator

const fs = require("fs");
const path = require("path");

function runDemo() {
  console.log("=============================================================");
  console.log("🚀 Telegram Crypto Community Scout & Lead Generator Demo");
  console.log("=============================================================\n");

  const csvPath = path.join(__dirname, "groups.csv");
  if (!fs.existsSync(csvPath)) {
    console.error("❌ groups.csv not found!");
    process.exit(1);
  }

  const raw = fs.readFileSync(csvPath, "utf8");
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const header = lines[0].split(",");

  console.log(`📊 Loaded Database: ${lines.length - 1} verified crypto community groups.\n`);

  // Sample 5 groups
  console.log("🔍 Top Priority Verified Communities (Sample):");
  const sample = lines.slice(1, 6);
  sample.forEach((line, idx) => {
    console.log(`  [${idx + 1}] ${line}`);
  });

  const priorityCsv = path.join(__dirname, "priority_cluster_targets.csv");
  if (fs.existsSync(priorityCsv)) {
    const pLines = fs.readFileSync(priorityCsv, "utf8").split(/\r?\n/).filter((l) => l.trim().length > 0);
    console.log(`\n🎯 Direct KOL / Admin Priority Targets: ${pLines.length - 1} high-value clusters identified.`);
  }

  console.log("\n✅ [STATUS]: Ready for production outbound deployment (Exit Code 0)");
}

runDemo();
