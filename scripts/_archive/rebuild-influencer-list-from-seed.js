// scripts/rebuild-influencer-list-from-seed.js
// シード JSON（手動リスト）を読み、tweetId を X API で検証してから KV に投入する
// 用途: インフルエンサーリストを一から作り直す（高視聴率番組＝高品質リスト）
//
// 使い方:
//   node scripts/rebuild-influencer-list-from-seed.js --lang en
//   node scripts/rebuild-influencer-list-from-seed.js --all
//
// 前提:
//   - data/influencers-seed/influencers-{lang}.json に [ { "username", "tweetId" }, ... ] を用意
//   - .env に X API 認証、KV 環境変数が設定されていること

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const path = require("path");
const fs = require("fs");

const LANGS = ["en", "es", "pt-br", "ar", "ja", "ko"];
const SEED_DIR = path.join(__dirname, "../data/influencers-seed");

function parseArgs() {
  const args = process.argv.slice(2);
  let lang = null;
  let all = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--lang" && args[i + 1]) {
      lang = args[i + 1].toLowerCase();
      i++;
    } else if (args[i] === "--all") {
      all = true;
    }
  }
  return { lang, all };
}

function loadSeed(lang) {
  const filepath = path.join(SEED_DIR, `influencers-${lang}.json`);
  if (!fs.existsSync(filepath)) {
    return null;
  }
  const raw = fs.readFileSync(filepath, "utf-8");
  const data = JSON.parse(raw);
  const list = Array.isArray(data) ? data : data.influencers || [];
  return list.filter(
    (entry) => entry && (entry.username || entry.handle) && (entry.tweetId || entry.tweet_id)
  );
}

async function fetchTweet(tweetId) {
  const { xApiRequest } = require("../services/x/client");
  const response = await xApiRequest(`/tweets/${tweetId}`, {
    method: "GET",
    params: { "tweet.fields": "id,text,author_id,created_at,public_metrics" }
  });
  if (!response || !response.data) {
    throw new Error("No tweet data");
  }
  return response.data;
}

async function main() {
  const { lang, all } = parseArgs();

  const targetLangs = [];
  if (all) {
    targetLangs.push(...LANGS.filter((l) => loadSeed(l)));
  } else if (lang && LANGS.includes(lang)) {
    if (!loadSeed(lang)) {
      console.error(
        `No seed file for lang=${lang}. Create data/influencers-seed/influencers-${lang}.json`
      );
      process.exit(1);
    }
    targetLangs.push(lang);
  } else {
    console.error(
      "Usage: node scripts/rebuild-influencer-list-from-seed.js --lang <en|es|pt-br|ar|ja|ko> | --all"
    );
    process.exit(1);
  }

  const { saveInfluencersToStock } = require("../services/x/influencerStock");

  for (const targetLang of targetLangs) {
    const seed = loadSeed(targetLang);
    if (!seed || seed.length === 0) {
      console.warn(`[${targetLang}] No seed entries, skip`);
      continue;
    }

    console.log(`\n[${targetLang.toUpperCase()}] Processing ${seed.length} seed entries...`);

    const valid = [];
    for (let i = 0; i < seed.length; i++) {
      const entry = seed[i];
      const username = (entry.username || entry.handle || "").trim().replace(/^@/, "");
      const tweetId = String(entry.tweetId || entry.tweet_id || "").trim();
      if (!username || !tweetId || !/^\d{18,19}$/.test(tweetId)) {
        console.warn(`  Skip invalid entry: username=${username}, tweetId=${tweetId}`);
        continue;
      }

      try {
        const tweet = await fetchTweet(tweetId);
        const text = tweet.text || "";
        const pm = tweet.public_metrics || {};
        const engagements = (pm.like_count || 0) + (pm.retweet_count || 0) + (pm.reply_count || 0);
        valid.push({
          username,
          tweetId,
          tweetText: text.slice(0, 500),
          lang: targetLang,
          engagementRate: 0,
          followerCount: 0,
          recentImpressions: 0,
          _engagements: engagements
        });
        process.stdout.write(".");
      } catch (err) {
        console.warn(`  x @${username} tweetId=${tweetId}: ${err.message}`);
        process.stdout.write("x");
      }

      if (i < seed.length - 1) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }
    console.log(`\n[${targetLang.toUpperCase()}] Valid: ${valid.length}/${seed.length}`);

    if (valid.length === 0) {
      console.warn(`[${targetLang.toUpperCase()}] No valid influencers, skip KV save`);
      continue;
    }

    const saved = await saveInfluencersToStock(targetLang, valid);
    if (saved) {
      console.log(`[${targetLang.toUpperCase()}] ✅ Saved ${valid.length} influencers to KV`);
    } else {
      console.error(`[${targetLang.toUpperCase()}] ❌ saveInfluencersToStock returned false`);
    }
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
