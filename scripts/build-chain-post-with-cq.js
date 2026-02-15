#!/usr/bin/env node
/**
 * v4.2: Chain モード StructuredPost を cq:latest 参照で構築
 * KV に cq:latest があれば --cq-metrics として Python に渡す
 */

const { spawn } = require("child_process");
const path = require("path");
const { getKV } = require("../utils/kv");
const { getCqLatest, cqLatestToCqMetrics } = require("../services/snapshot/cqLatestWriter");

async function buildChainPostWithCq(detection, options = {}) {
  const { lang = "en", postId = "" } = options;
  const kv = getKV();
  let cqMetricsJson = null;
  if (kv) {
    const cqLatest = await getCqLatest(kv);
    if (cqLatest) {
      const metrics = cqLatestToCqMetrics(cqLatest);
      cqMetricsJson = JSON.stringify(metrics);
    }
  }
  const detectionStr = typeof detection === "string" ? detection : JSON.stringify(detection);
  const args = [
    path.join(__dirname, "build_structured_post.py"),
    "--mode",
    "chain",
    "--lang",
    lang,
    "--post-id",
    postId || (typeof detection === "object" && detection.post_id) || "",
    "--detection",
    detectionStr
  ];
  if (cqMetricsJson) {
    args.push("--cq-metrics", cqMetricsJson);
  } else {
    args.push("--fetch-cq");
  }
  return new Promise((resolve, reject) => {
    const proc = spawn("python", args, {
      cwd: path.join(__dirname, ".."),
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d) => (stdout += d.toString()));
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `exit ${code}`));
        return;
      }
      try {
        resolve(JSON.parse(stdout));
      } catch (e) {
        reject(new Error("Invalid JSON from build_structured_post"));
      }
    });
  });
}

module.exports = { buildChainPostWithCq };

if (require.main === module) {
  const detection = process.argv[2]
    ? JSON.parse(process.argv[2])
    : { post_id: "test", initial_boost_factor: 50, cluster_events: [], bot_suspects: [] };
  const lang = process.argv[3] || "en";
  buildChainPostWithCq(detection, { lang })
    .then((sp) => console.log(JSON.stringify(sp, null, 2)))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
