// scripts/rebuild-influencer-list-with-grok.js
// 手順書「インフルエンサーリストを一から作り直す」パターンBに基づく:
// Grok で候補を出す → X API で tweetId を検証 → 実在したものだけ KV に投入
//
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

// 使い方:
//   node scripts/rebuild-influencer-list-with-grok.js --lang en
//   node scripts/rebuild-influencer-list-with-grok.js --all
//   node scripts/rebuild-influencer-list-with-grok.js --all --per-lang 30
//
// 前提: .env に XAI_API_KEY（Grok）、X API 認証、KV 環境変数が設定されていること

const path = require('path');
const fs = require('fs');

const LANGS = ['en', 'es', 'pt-br', 'ar', 'ja', 'ko'];
const DEFAULT_PER_LANG = 20; // 再構築時は質優先で少なめ

function parseArgs() {
  const args = process.argv.slice(2);
  let lang = null;
  let all = false;
  let perLang = DEFAULT_PER_LANG;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--lang' && args[i + 1]) {
      lang = args[i + 1].toLowerCase();
      i++;
    } else if (args[i] === '--all') {
      all = true;
    } else if (args[i] === '--per-lang' && args[i + 1]) {
      perLang = Math.max(5, parseInt(args[i + 1], 10));
      i++;
    }
  }
  return { lang, all, perLang };
}

async function fetchTweet(tweetId) {
  const { xApiRequest } = require('../services/x/client');
  const response = await xApiRequest(`/tweets/${tweetId}`, {
    method: 'GET',
    params: { 'tweet.fields': 'id,text,author_id,created_at,public_metrics' }
  });
  if (!response || !response.data) throw new Error('No tweet data');
  return response.data;
}

function buildInfluencer(inf, lang, tweetText = '') {
  const tweetIdStr = String(inf.tweetId || '').trim();
  const username = String(inf.username || '').trim().replace(/^@/, '');
  const followerCount = typeof inf.followerCount === 'number' ? inf.followerCount : 0;
  const tier = followerCount >= 10000 ? 'top' : followerCount >= 1000 ? 'mid' : 'bottom';
  return {
    username,
    tweetId: tweetIdStr,
    tweetText: (tweetText || inf.tweetText || '').slice(0, 500),
    lang: (lang || 'en').toLowerCase(),
    engagementRate: typeof inf.engagementRate === 'number' ? inf.engagementRate : 0,
    followerCount,
    recentImpressions: typeof inf.recentImpressions === 'number' ? inf.recentImpressions : 0,
    tier,
    discoveredAt: new Date().toISOString(),
    lastQuoteAt: null,
    quoteCount: 0,
    totalQuotes: 0,
    totalImpressions: 0,
    totalEngagements: 0,
    conversions: 0,
    shadowbanFlagged: false,
    isActive: true,
  };
}

async function main() {
  const { lang, all, perLang } = parseArgs();

  const targetLangs = [];
  if (all) {
    targetLangs.push(...LANGS);
  } else if (lang && LANGS.includes(lang)) {
    targetLangs.push(lang);
  } else {
    console.error('Usage: node scripts/rebuild-influencer-list-with-grok.js --lang <en|es|pt-br|ar|ja|ko> | --all [--per-lang N]');
    process.exit(1);
  }

  const { discoverInfluencersForQuoteRepost } = require('../services/grok/client');
  const { saveInfluencersToStock } = require('../services/x/influencerStock');

  const BATCH_SIZE = 10;
  const DELAY_BETWEEN_BATCHES_MS = 3000;
  const DELAY_BETWEEN_VALIDATE_MS = 500;

  console.log('');
  console.log('=== インフルエンサーリスト再構築（Grok → X API 検証 → KV）===');
  console.log(`対象言語: ${targetLangs.join(', ')} | 目標/言語: ${perLang}人`);
  console.log('');

  for (const targetLang of targetLangs) {
    console.log(`\n--- ${targetLang.toUpperCase()} ---`);

    const candidates = [];
    let batches = Math.ceil(perLang / BATCH_SIZE);

    for (let b = 0; b < batches; b++) {
      const want = Math.min(BATCH_SIZE, perLang - candidates.length);
      if (want <= 0) break;
      try {
        const chunk = await discoverInfluencersForQuoteRepost(targetLang, { maxResults: want });
        if (chunk && chunk.length) {
          candidates.push(...chunk);
          console.log(`  Grok batch ${b + 1}: +${chunk.length} (total ${candidates.length})`);
        }
      } catch (err) {
        console.warn(`  Grok batch ${b + 1} error:`, err.message);
      }
      if (b < batches - 1) {
        await new Promise(r => setTimeout(r, DELAY_BETWEEN_BATCHES_MS));
      }
    }

    if (candidates.length === 0) {
      console.warn(`  [${targetLang.toUpperCase()}] No candidates from Grok, skip`);
      continue;
    }

    const valid = [];
    for (let i = 0; i < candidates.length; i++) {
      const inf = candidates[i];
      const username = (inf.username || '').trim().replace(/^@/, '');
      const tweetId = String(inf.tweetId || '').trim();
      if (!username || !/^\d{18,19}$/.test(tweetId)) {
        process.stdout.write('x');
        continue;
      }
      try {
        const tweet = await fetchTweet(tweetId);
        const text = (tweet && tweet.text) || '';
        valid.push(buildInfluencer(inf, targetLang, text));
        process.stdout.write('.');
      } catch (err) {
        process.stdout.write('x');
      }
      if (i < candidates.length - 1) {
        await new Promise(r => setTimeout(r, DELAY_BETWEEN_VALIDATE_MS));
      }
    }
    console.log(`\n  X API 検証: ${valid.length}/${candidates.length} 実在`);

    if (valid.length === 0) {
      console.warn(`  [${targetLang.toUpperCase()}] No valid influencers, skip KV save`);
      continue;
    }

    const saved = await saveInfluencersToStock(targetLang, valid);
    if (saved) {
      console.log(`  [${targetLang.toUpperCase()}] ✅ KV に ${valid.length} 人保存`);
    } else {
      console.error(`  [${targetLang.toUpperCase()}] ❌ KV 保存失敗`);
    }
  }

  console.log('\n=== 完了 ===\n');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
