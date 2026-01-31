#!/usr/bin/env node
/**
 * Gemini 3 Flash + CryptoQuant リアルタイムオンチェーンデータで、
 * 「過去の似た状況で相場がどう動いたか」を分析し、SoSoValue風の記事を生成する。
 *
 * 目的: 有料版（Regular Briefing）の変なシグナル生成より、
 *       データ駆動・歴史的類似局面の解説記事のほうが価値があるコンテンツにする。
 *
 * 使い方:
 *   GEMINI_API_KEY=xxx CRYPTOQUANT_API_KEY=xxx node scripts/ask-gemini-sosovalue-article-from-cryptoquant.js
 *   または .env に GEMINI_API_KEY, CRYPTOQUANT_API_KEY を設定して node scripts/ask-gemini-sosovalue-article-from-cryptoquant.js
 *
 * 出力: docs/SOSOVALUE_ARTICLE_GEMINI_CRYPTOQUANT_YYYY-MM-DDTHH-mm-ss.md
 *
 * 注意: APIキーは .env に設定し、リポジトリにコミットしないこと。
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';

if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY is not set. Set it in .env or as an environment variable.');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const geminiModel = genAI.getGenerativeModel({
  model: GEMINI_MODEL,
  generationConfig: {
    temperature: 0.6,
    maxOutputTokens: 8192,
  },
});

async function fetchBtcPrice() {
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true'
    );
    const data = await res.json();
    const btc = data?.bitcoin;
    if (!btc) return null;
    return { priceUsd: btc.usd, change24h: btc.usd_24h_change ?? 0 };
  } catch (e) {
    console.warn('[Price] CoinGecko fetch failed:', e.message);
    return null;
  }
}

async function gatherCryptoQuantData() {
  const { getExchangeInflow, getMinerPositionIndex } = require('../services/cryptoquant/endpoints/btc');
  const { getCQDeepMetrics, getSOPR, getSOPR30d } = require('../services/cryptoquant/deepMetrics');

  const [inflowRes, mpiRes, deepRes, soprRes, sopr30Res] = await Promise.allSettled([
    getExchangeInflow(),
    getMinerPositionIndex(),
    getCQDeepMetrics('EN'),
    getSOPR(),
    getSOPR30d(),
  ]);

  const inflow = inflowRes.status === 'fulfilled' ? inflowRes.value : null;
  const mpi = mpiRes.status === 'fulfilled' ? mpiRes.value : null;
  const deep = deepRes.status === 'fulfilled' ? deepRes.value : null;
  const sopr = soprRes.status === 'fulfilled' ? soprRes.value : 1.0;
  const sopr30 = sopr30Res.status === 'fulfilled' ? sopr30Res.value : 1.0;

  return {
    exchangeNetflow: inflow?.value ?? inflow?.raw ?? null,
    minerPositionIndex: mpi?.value ?? mpi?.raw ?? null,
    deepMetrics: deep,
    sopr,
    sopr30d: sopr30,
  };
}

function buildOnChainSummary(cq, price) {
  const lines = [
    '## Current on-chain data (CryptoQuant, real-time)',
    '',
    `- **Exchange Netflow (all exchanges, 1D)**: ${cq.exchangeNetflow != null ? cq.exchangeNetflow : 'N/A'} (kBTC or raw)`,
    `- **Miners' Position Index (MPI)**: ${cq.minerPositionIndex != null ? cq.minerPositionIndex : 'N/A'}`,
    `- **SOPR (Spent Output Profit Ratio)**: ${cq.sopr}`,
    `- **SOPR 30-day MA**: ${cq.sopr30d}`,
  ];
  if (cq.deepMetrics) {
    const d = cq.deepMetrics;
    if (d.whaleFlows?.whaleRatio != null) lines.push(`- **Exchange Whale Ratio**: ${d.whaleFlows.whaleRatio}`);
    if (d.trapScore != null) lines.push(`- **Trap Score (EN)**: ${d.trapScore}`);
  }
  if (price) {
    lines.push('');
    lines.push('## Market context');
    lines.push(`- **BTC/USD**: $${price.priceUsd} (24h change: ${price.change24h != null ? price.change24h.toFixed(2) + '%' : 'N/A'})`);
  }
  return lines.join('\n');
}

async function askGeminiSoSoValueArticle(onChainSummary) {
  const systemPrompt = `You are an on-chain analyst writing for a SoSoValue-style crypto research platform. Your style is:
- Data-driven and narrative: explain what the metrics mean and how they have behaved in the past.
- Historical parallels: when similar on-chain setups occurred (e.g. exchange netflow, MPI, SOPR, whale ratio), describe how the market moved in the following days/weeks—cite typical patterns, not specific dates unless you are confident.
- No trading signals: do NOT generate buy/sell/hold signals. Do NOT say "you should" or "we recommend". Focus on context and education.
- Structure: short intro, then "Current setup", then "Historical parallels" (what usually happened in similar situations), then "What to watch" (which metrics to monitor next). Use clear headings and bullet points where helpful.
- Tone: professional, analytical, slightly accessible. Avoid hype and fear.`;

  const userPrompt = `Using the following real-time CryptoQuant on-chain data and market context, write a SoSoValue-style analytical article.

Requirements:
1. Analyze what the current readings (exchange netflow, MPI, SOPR, whale ratio if available) imply in terms of supply/demand and sentiment.
2. Recall past similar situations: when netflow, MPI, and SOPR were in comparable zones, how did BTC typically behave in the following 1–4 weeks? Describe general patterns, not guarantees.
3. Write the article in a clear, readable format with headings. No trading signals—only context and historical parallels.
4. Length: roughly 400–800 words.

${onChainSummary}`;

  const result = await geminiModel.generateContent({
    contents: [
      { role: 'user', parts: [{ text: `${systemPrompt}\n\n---\n\n${userPrompt}` }] },
    ],
  });
  const response = result.response;
  if (!response || !response.text) throw new Error('Gemini returned no text');
  return response.text();
}

async function main() {
  console.log('[SoSoValue Article] Fetching CryptoQuant real-time data...');
  const cq = await gatherCryptoQuantData();
  console.log('[SoSoValue Article] Fetching BTC price (CoinGecko)...');
  const price = await fetchBtcPrice();

  const onChainSummary = buildOnChainSummary(cq, price);
  console.log('[SoSoValue Article] Asking Gemini (gemini-3-flash-preview) for SoSoValue-style article...');
  const article = await askGeminiSoSoValueArticle(onChainSummary);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outputDir = path.join(__dirname, '..', 'docs');
  const outputFile = path.join(outputDir, `SOSOVALUE_ARTICLE_GEMINI_CRYPTOQUANT_${timestamp}.md`);

  const fullDoc = [
    '# SoSoValue-style On-Chain Article (Gemini + CryptoQuant)',
    '',
    `**Generated**: ${new Date().toISOString()}`,
    `**Model**: ${GEMINI_MODEL}`,
    '',
    '---',
    '',
    onChainSummary,
    '',
    '---',
    '',
    '## Article',
    '',
    article,
  ].join('\n');

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputFile, fullDoc, 'utf8');
  console.log('[SoSoValue Article] Written:', outputFile);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
