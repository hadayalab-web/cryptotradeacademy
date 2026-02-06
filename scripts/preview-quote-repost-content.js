#!/usr/bin/env node
/**
 * 引用リポストの「実際の投稿内容」を1本分生成して表示する。
 * Grok 本文 + リンクブロック + 社会的証明 = 本番と同じ並び。
 *
 * 実行:
 *   node scripts/preview-quote-repost-content.js [lang]     … Grok 呼び出しあり（XAI_API_KEY 要）
 *   node scripts/preview-quote-repost-content.js [lang] --dry  … リンクブロック＋社会的証明のみ（API 不要）
 *
 * 例: node scripts/preview-quote-repost-content.js en
 *     node scripts/preview-quote-repost-content.js ja --dry
 */

require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const args = process.argv.slice(2);
const dry = args.includes("--dry");
const lang = (args.find((a) => a !== "--dry") || "en").toLowerCase().replace("_", "-");

const { runGrokOnlySalesLetter, getLinkBlockGrokStyle } = require("../services/salesLetterContest");
const { getSocialProofText } = require("../services/telegram/reaction-counter");

const reportData = {
  trapScore: 28,
  priceUsd: 97200,
  change24h: -1.2,
  exchangeNetflow: "negative",
  whaleRatio: 0.42,
  mpi: 0.65,
  sentiment: "fear"
};

async function main() {
  console.log("========== 引用リポスト 投稿プレビュー ==========");
  console.log(`言語: ${lang}${dry ? " (--dry: リンク＋社会的証明のみ)" : ""}`);
  console.log("");

  let fullText;
  let linkBlock;

  if (dry) {
    linkBlock = getLinkBlockGrokStyle(lang, { influencerUsername: "PreviewUser" });
    fullText = null;
  } else {
    const result = await runGrokOnlySalesLetter({
      lang,
      reportData,
      influencerUsername: "PreviewUser"
    });
    fullText = result.fullText;
    linkBlock = result.linkBlock;
  }

  const socialProofText = await getSocialProofText(lang);
  const fullPost = fullText
    ? `${fullText}\n\n${socialProofText}`
    : `[ここに Grok が生成する本文: Headline → 鷲掴み → Product Intro → Objection handling → #BTC #TrapDefence …]\n\n${linkBlock}\n\n${socialProofText}`;

  console.log("---------- 実際に投稿される全文（1本分） ----------");
  console.log(fullPost);
  console.log("");
  console.log("---------- 文字数 ----------");
  console.log(fullPost.length);
  console.log("");
  if (dry) {
    console.log("---------- リンクブロックのみ抜粋 ----------");
    console.log(linkBlock);
    console.log("");
    console.log("---------- 社会的証明のみ抜粋 ----------");
    console.log(socialProofText);
  }
  console.log("");
  console.log("--- 以上が本番で postQuoteTweet に渡す quoteText です ---");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
