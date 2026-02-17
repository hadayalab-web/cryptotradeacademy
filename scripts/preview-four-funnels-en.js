/**
 * 4導線のリプライ本文を EN で出力（確認用）
 * node scripts/preview-four-funnels-en.js
 */
const { buildPqt } = require("../services/td/pqtCtaEngine");
const { getPromoLine } = require("../services/td/pqtTemplates");
const { pickVidalyticsLink } = require("../config/buzzweaveLinks");
const path = require("path");
const fs = require("fs");

const whopMinimalEn = "https://whop.com/checkout/plan_9zf3nrYeweovV";
const whopRegularEn = "https://whop.com/trapdefence/btc-regular-en/";

const FUNNELS = [
  { name: "1. Vidalytics → Minimal", funnelType: "vidalytics_leadmagnet", link: () => pickVidalyticsLink("en", "minimal") },
  { name: "2. Vidalytics → Regular", funnelType: "vidalytics_regular", link: () => pickVidalyticsLink("en", "regular") },
  { name: "3. Whop直 → Minimal", funnelType: "whop_minimal", link: () => whopMinimalEn },
  { name: "4. Whop直 → Regular", funnelType: "whop_regular", link: () => whopRegularEn },
];

const proofSnippet = "Structure suggests one clear level to watch before adding risk.";
const REPLY_MAX_LEN = 280;

function appendPromoIfRegular(text, funnelType, lang) {
  const isRegular = funnelType === "vidalytics_regular" || funnelType === "whop_regular";
  const promoLine = getPromoLine(lang);
  if (isRegular && text.length + promoLine.length <= REPLY_MAX_LEN) return text + promoLine;
  return text;
}

console.log("=== 4導線 リプライ本文 (EN, Bot テンプレ templateIndex=0)\n");

for (const f of FUNNELS) {
  const link = typeof f.link === "function" ? f.link() : f.link;
  const built = buildPqt("en", {
    coin: "BTC",
    proofSnippet,
    link,
    funnelType: f.funnelType,
    useBotTemplates: true,
  });
  if (!built || !built.text) {
    console.log(`${f.name}: (build failed)\n`);
    continue;
  }
  let replyText = built.text;
  replyText = appendPromoIfRegular(replyText, f.funnelType, "en");
  console.log(`--- ${f.name} ---`);
  console.log(replyText);
  console.log(`\n( length: ${replyText.length}${replyText.length > REPLY_MAX_LEN ? " — 要短縮" : ""} )\n`);
}
