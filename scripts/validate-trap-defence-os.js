/**
 * Trap Defence OS 整合性検証スクリプト
 * macroContext / macroRiskOnOff 一元化 / KV キー / 内部エンジン配信
 * 実行: node scripts/validate-trap-defence-os.js
 */
const path = require("path");

function assert(condition, message) {
  if (!condition) {
    console.error("[FAIL]", message);
    process.exitCode = 1;
    return false;
  }
  console.log("[OK]", message);
  return true;
}

let passed = 0;
let failed = 0;

// 1. macroRiskEvaluator が存在し、inferMacroRiskOnOff / buildMacroContextFromAssets を export している
try {
  const macroRisk = require("../logic/macroRiskEvaluator");
  assert(typeof macroRisk.inferMacroRiskOnOff === "function", "macroRiskEvaluator.inferMacroRiskOnOff exists");
  assert(typeof macroRisk.buildMacroContextFromAssets === "function", "macroRiskEvaluator.buildMacroContextFromAssets exists");
  passed += 2;
} catch (e) {
  console.error("[FAIL] macroRiskEvaluator:", e.message);
  failed += 2;
}

// 2. 同一入力で macroRiskOnOff が MACRO_THRESHOLDS に従う
try {
  const { inferMacroRiskOnOff } = require("../logic/macroRiskEvaluator");
  const r1 = inferMacroRiskOnOff({ nasdaqChange24h: 1.5, goldChange24h: -0.5 });
  assert(r1 === "RISK_ON", "macroRiskOnOff(1.5, -0.5) === RISK_ON");
  const r2 = inferMacroRiskOnOff({ nasdaqChange24h: -1.5, goldChange24h: 0.5 });
  assert(r2 === "RISK_OFF", "macroRiskOnOff(-1.5, 0.5) === RISK_OFF");
  passed += 2;
} catch (e) {
  console.error("[FAIL] macroRiskOnOff consistency:", e.message);
  failed += 2;
}

// 3. kiba/run の BTC_SNAPSHOT_KEYS に btc:snapshot:full:latest が含まれていない
try {
  const runPath = path.join(__dirname, "../api/kiba/run.js");
  const runSrc = require("fs").readFileSync(runPath, "utf8");
  assert(
    !runSrc.includes("btc:snapshot:full:latest"),
    "BTC_SNAPSHOT_KEYS does not contain btc:snapshot:full:latest"
  );
  assert(
    runSrc.includes('"asset:snapshot:BTC"') && runSrc.includes('"btc:snapshot"'),
    "BTC_SNAPSHOT_KEYS contains asset:snapshot:BTC and btc:snapshot"
  );
  passed += 2;
} catch (e) {
  console.error("[FAIL] KV keys:", e.message);
  failed += 2;
}

// 4. minimal-tg-delivery のコメントが btc:snapshot:early / btc:snapshot を読むと明記
try {
  const minPath = path.join(__dirname, "../api/minimal-tg-delivery.js");
  const minSrc = require("fs").readFileSync(minPath, "utf8");
  assert(
    minSrc.includes("btc:snapshot:early") && minSrc.includes("btc:snapshot"),
    "minimal-tg-delivery comment mentions btc:snapshot:early and btc:snapshot"
  );
  assert(
    minSrc.includes("minimal:btc:latest") && (minSrc.includes("フォールバック") || minSrc.includes("fallback")),
    "minimal:btc:latest is documented as fallback"
  );
  passed += 2;
} catch (e) {
  console.error("[FAIL] minimal-tg-delivery comment:", e.message);
  failed += 2;
}

// 5. cron が buildFullSnapshot に macroContext を渡している
try {
  const cronPath = path.join(__dirname, "../api/cron.js");
  const cronSrc = require("fs").readFileSync(cronPath, "utf8");
  assert(
    cronSrc.includes("macroContext") && cronSrc.includes("buildFullSnapshot"),
    "cron passes macroContext to buildFullSnapshot"
  );
  assert(
    cronSrc.includes("buildMacroContextFromAssets"),
    "cron uses buildMacroContextFromAssets"
  );
  passed += 2;
} catch (e) {
  console.error("[FAIL] cron macroContext:", e.message);
  failed += 2;
}

// 6. cron が内部エンジン発火時に Telegram 送信（sendMessageToChannel）を呼んでいる
try {
  const cronPath = path.join(__dirname, "../api/cron.js");
  const cronSrc = require("fs").readFileSync(cronPath, "utf8");
  assert(
    cronSrc.includes("dispatchPayload") && cronSrc.includes("alerts") && cronSrc.includes("sendMessageToChannel"),
    "cron sends internal engine alerts via sendMessageToChannel"
  );
  assert(cronSrc.includes("/api/kiba/run"), "cron calls /api/kiba/run");
  passed += 2;
} catch (e) {
  console.error("[FAIL] internal engine Telegram delivery:", e.message);
  failed += 2;
}

console.log("\n---");
console.log("Passed:", passed, "Failed:", failed);
if (failed > 0) process.exit(1);
