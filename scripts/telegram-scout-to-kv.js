#!/usr/bin/env node
/**
 * Telegram スカウト用 JSON を KV に投入する。
 * 使い方: node scripts/telegram-scout-to-kv.js [data/telegram-scout-targets.json]
 * 前提: Python scrape_members.py で出力した JSON を指定。未指定なら data/telegram-scout-targets.json
 */
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { kv } = require("../utils/kv");

const KV_PREFIX = "tg_scout";
const KEY_IDS = `${KV_PREFIX}:ids`;

async function main() {
  const jsonPath = path.resolve(
    process.cwd(),
    process.argv[2] || "data/telegram-scout-targets.json"
  );
  if (!fs.existsSync(jsonPath)) {
    console.error("File not found:", jsonPath);
    console.error("Run: python scripts/telegram_scout/scrape_members.py first");
    process.exit(1);
  }

  const raw = fs.readFileSync(jsonPath, "utf8");
  let list;
  try {
    list = JSON.parse(raw);
  } catch (e) {
    console.error("Invalid JSON:", e.message);
    process.exit(1);
  }
  if (!Array.isArray(list)) {
    console.error("JSON must be an array of targets");
    process.exit(1);
  }

  const ids = [];
  for (const t of list) {
    const id = String(t.user_id ?? t.userId ?? "");
    if (!id) continue;
    const key = `${KV_PREFIX}:target:${id}`;
    await kv.set(key, JSON.stringify(t));
    ids.push(id);
  }

  await kv.set(KEY_IDS, JSON.stringify(ids));
  console.log(`[telegram-scout-to-kv] Written ${ids.length} targets to KV (${KEY_IDS}, tg_scout:target:*)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
