// scripts/validate-influencer-tweet-ids.js
// インフルエンサーリストの tweetId が X 上に実在するかサンプル検証する
// 用途: Grok が返した tweetId の精度を確認し、リストの質を判断する材料にする
//
// 使い方:
//   node scripts/validate-influencer-tweet-ids.js --lang ko
//   node scripts/validate-influencer-tweet-ids.js --lang en --sample 20
//
// 前提: .env に X API 認証（BEARER_TOKEN または OAuth）が設定されていること

const path = require('path');
const fs = require('fs');

const LANGS = ['en', 'es', 'pt-br', 'ar', 'ja', 'ko'];

function parseArgs() {
  const args = process.argv.slice(2);
  let lang = 'ko';
  let sample = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--lang' && args[i + 1]) {
      lang = args[i + 1].toLowerCase();
      i++;
    } else if (args[i] === '--sample' && args[i + 1]) {
      sample = parseInt(args[i + 1], 10);
      i++;
    }
  }
  return { lang, sample };
}

function loadInfluencersFromFile(lang) {
  const filepath = path.join(__dirname, '../data/influencers', `influencers-${lang}.json`);
  if (!fs.existsSync(filepath)) {
    return null;
  }
  const raw = fs.readFileSync(filepath, 'utf-8');
  const data = JSON.parse(raw);
  const list = Array.isArray(data.influencers) ? data.influencers : data;
  return list.filter(inf => inf && inf.tweetId);
}

async function main() {
  const { lang, sample } = parseArgs();
  if (!LANGS.includes(lang)) {
    console.error('Usage: node scripts/validate-influencer-tweet-ids.js --lang <en|es|pt-br|ar|ja|ko> [--sample N]');
    process.exit(1);
  }

  const influencers = loadInfluencersFromFile(lang);
  if (!influencers || influencers.length === 0) {
    console.error(`No influencers found for lang=${lang}. Check data/influencers/influencers-${lang}.json`);
    process.exit(1);
  }

  let toCheck = influencers;
  if (sample && sample > 0) {
    const shuffled = [...influencers].sort(() => Math.random() - 0.5);
    toCheck = shuffled.slice(0, Math.min(sample, influencers.length));
  }

  console.log(`[Validate] lang=${lang}, checking ${toCheck.length} tweetIds (total in file: ${influencers.length})`);
  console.log('');

  let getTweetMetrics;
  try {
    const metrics = require('../services/x/metrics');
    getTweetMetrics = metrics.getTweetMetrics;
    if (!getTweetMetrics) {
      console.error('getTweetMetrics not found in services/x/metrics.js');
      process.exit(1);
    }
  } catch (e) {
    console.error('Failed to load services/x/metrics:', e.message);
    process.exit(1);
  }

  let exists = 0;
  let notExists = 0;
  const errors = [];

  for (let i = 0; i < toCheck.length; i++) {
    const inf = toCheck[i];
    const tweetId = String(inf.tweetId || '').trim();
    const username = inf.username || '?';
    try {
      await getTweetMetrics(tweetId, false, { maxRetries: 0 });
      exists++;
      process.stdout.write('.');
    } catch (err) {
      notExists++;
      const msg = err?.message || String(err);
      errors.push({ username, tweetId, message: msg.slice(0, 80) });
      process.stdout.write('x');
    }
    if ((i + 1) % 10 === 0) console.log(` ${i + 1}/${toCheck.length}`);
    // レート制限対策: 少し待機
    if (i < toCheck.length - 1) {
      await new Promise(r => setTimeout(r, 500));
    }
  }
  console.log('');

  const total = toCheck.length;
  const existRate = total ? ((exists / total) * 100).toFixed(1) : '0';
  console.log('');
  console.log('--- Result ---');
  console.log(`Checked: ${total}`);
  console.log(`Exists on X: ${exists}`);
  console.log(`Not found / error: ${notExists}`);
  console.log(`Exist rate: ${existRate}%`);
  if (errors.length > 0) {
    console.log('');
    console.log('Sample errors (first 5):');
    errors.slice(0, 5).forEach(e => {
      console.log(`  @${e.username} tweetId=${e.tweetId} ${e.message}`);
    });
  }
  if (parseFloat(existRate) < 80 && total >= 10) {
    console.log('');
    console.log('⚠️ 実在率が低いです。Grok の tweetId が推測・誤りの可能性があります。リストの見直しを推奨します。');
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
