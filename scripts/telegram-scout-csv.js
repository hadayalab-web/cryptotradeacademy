#!/usr/bin/env node
/**
 * CSV から Telegram スカウト用「一通目＋キット」を一括生成。
 * 使い方: node scripts/telegram-scout-csv.js [CSVパス]
 * CSV: channel,admin,lang または handle,channel,lang（ヘッダー1行目）
 * inviteUrl は env FIRSTPROMOTER_INVITE_URL または第2引数で指定可。
 */
const fs = require("fs");
const path = require("path");
const { fillScoutFirstMessage, fillScoutKit, getSearchKeywords } = require("../config/telegramScoutTemplates");

const DEFAULT_INVITE_URL = process.env.FIRSTPROMOTER_INVITE_URL || "https://firstpromoter.com";

function parseCsv(content) {
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const header = lines[0].split(",").map((c) => c.trim().toLowerCase());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((c) => c.trim());
    const row = {};
    header.forEach((h, j) => {
      row[h] = values[j] || "";
    });
    rows.push(row);
  }
  return rows;
}

function normalizeRow(row) {
  const channel = row.channel || row.channelname || "";
  const admin = row.admin || row.handle || "";
  let lang = (row.lang || row.language || "en").toLowerCase().split("-")[0];
  if (!["en", "es", "pt", "ko", "ar"].includes(lang)) lang = "en";
  return { channel, admin, lang };
}

function main() {
  const csvPath = process.argv[2] || path.join(__dirname, "../data/telegram-scout-targets.csv");
  const inviteUrl = process.argv[3] || DEFAULT_INVITE_URL;

  if (!fs.existsSync(csvPath)) {
    console.error("CSV not found:", csvPath);
    console.error("Create a CSV with columns: channel, admin, lang (or handle, channel, lang)");
    process.exit(1);
  }

  const content = fs.readFileSync(csvPath, "utf8");
  const rows = parseCsv(content);
  if (rows.length === 0) {
    console.error("No rows in CSV");
    process.exit(1);
  }

  console.log("--- Telegram Scout Messages (inviteUrl:", inviteUrl, ") ---\n");

  rows.forEach((row, i) => {
    const { channel, admin, lang } = normalizeRow(row);
    const firstMessage = fillScoutFirstMessage(lang, {
      handle: admin,
      Channel_Name: channel,
      inviteUrl
    });
    const kit = fillScoutKit(lang, { inviteUrl });
    console.log(`\n========== #${i + 1} [${lang}] @${admin} / ${channel} ==========`);
    console.log("\n[1] First message (copy and send + attach proof image):\n");
    console.log(firstMessage);
    console.log("\n[2] After OK - Kit:\n");
    console.log(kit);
    console.log("\n---");
  });

  console.log("\nDone. Search keywords by lang:", getSearchKeywords("en"));
}

main();
