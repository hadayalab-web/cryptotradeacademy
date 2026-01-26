// scripts/ask-grok-post-metrics.js
// Grokに投稿後のインプレッションとエンゲージメントを正確に取得する方法を質問

const OpenAI = require("openai");

const XAI_API_KEY =
  process.env.XAI_API_KEY ||
  "xai-jxO7HGeeFcEguSmqMTvxUqijZHnRT3fAP50iaDQnOzRE2aY1q86bNJLfMKxD18RMclcIoue426vV6vii";
const BASE_URL = process.env.XAI_BASE_URL || "https://api.x.ai/v1";

const openai = new OpenAI({
  apiKey: XAI_API_KEY,
  baseURL: BASE_URL
});

async function askGrokAboutPostMetrics() {
  console.log("=".repeat(80));
  console.log("📊 Grokに投稿後のインプレッションとエンゲージメントを正確に取得する方法を質問");
  console.log("=".repeat(80));
  console.log();

  const prompt = `あなたはX（Twitter）API v2の専門家で、Xのリアルタイムデータに直接アクセスできる唯一のモデルです。以下の問題について、正確な解決方法を教えてください。

## 現在の問題

1. **投稿直後にインプレッション数が0**: X API v2の\`impression_count\`を投稿直後に取得すると0になる
2. **データソースの混在**: Grokの推定値（\`influencer.recentImpressions\`）と実際のX APIから取得したインプレッション数を混同してしまった
3. **エンゲージメント率の計算ミス**: 推定値に対するエンゲージメント率を計算してしまった

## コードの状況

### 投稿時のコード（api/x-quote-repost.js）
\`\`\`javascript
// 746行目: 投稿直後にX APIから取得したインプレッション数
engagementMetrics = {
  impressions: quoteMetrics.nonPublicMetrics?.impression_count || quoteMetrics.organicMetrics?.impression_count || 0,
  engagements: (quoteMetrics.publicMetrics?.like_count || 0) +
              (quoteMetrics.publicMetrics?.retweet_count || 0) +
              (quoteMetrics.publicMetrics?.reply_count || 0) +
              (quoteMetrics.publicMetrics?.quote_count || 0),
  clicks: quoteMetrics.nonPublicMetrics?.url_link_clicks || quoteMetrics.organicMetrics?.url_link_clicks || 0,
  // ...
};
\`\`\`

### メトリクス追跡（services/x/metricsTracker.js）
\`\`\`javascript
// 38行目: Cron Jobで定期的に追跡される実際のX APIから取得したインプレッション数
impressions: metrics.nonPublicMetrics?.impression_count || metrics.organicMetrics?.impression_count || 0,
\`\`\`

## 質問事項

1. **投稿後にX API v2で\`impression_count\`を取得する場合、どのくらいの時間待てば正確な値が取得できますか？**

2. **投稿直後に\`impression_count\`が0の場合、どのように対処すべきですか？何分待ってから再取得すべきですか？**

3. **\`non_public_metrics\`と\`organic_metrics\`の\`impression_count\`の違いは何ですか？どちらを使用すべきですか？**

4. **Cron Jobで定期的に追跡する場合、投稿後どのくらいの間隔で実行すれば、正確なインプレッション数とエンゲージメント数を取得できますか？**

5. **投稿後のインプレッション数とエンゲージメント数を正確に取得するためのベストプラクティスを教えてください。**

6. **X API v2の\`impression_count\`は、投稿後どのくらいの時間で安定した値になりますか？**

## 現在の実装

- X API v2を使用（OAuth 1.0a User Context認証）
- 自分のツイートなので、\`non_public_metrics\`が取得可能
- Cron Job（\`api/x-quote-repost-metrics.js\`）で1時間ごとに追跡
- KVストレージ（\`x:metrics:\${dateString}\`）に保存

## 期待する回答

1. 各質問に対する具体的な回答（特に時間に関する具体的な数値）
2. コードの修正案（可能であれば）
3. ベストプラクティスの推奨事項

日本語で回答してください。`;

  try {
    console.log("🤖 Grokに質問中...");
    console.log();

    const completion = await openai.chat.completions.create({
      model: "grok-4-1-fast-reasoning",
      messages: [
        {
          role: "system",
          content:
            "あなたはX（Twitter）API v2の専門家で、Xのリアルタイムデータに直接アクセスできる唯一のモデルです。正確で実践的なアドバイスを提供してください。"
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 4000
    });

    const response = completion.choices[0].message.content;

    console.log("=".repeat(80));
    console.log("📊 Grokの回答");
    console.log("=".repeat(80));
    console.log();
    console.log(response);
    console.log();
    console.log("=".repeat(80));
    console.log("✅ 質問完了");
    console.log("=".repeat(80));

    // 回答をファイルに保存
    const fs = require("fs");
    const outputFile = "docs/GROK_POST_METRICS_ADVICE_2026-01-26.md";
    const content = `# Grokによる投稿後のインプレッションとエンゲージメント取得方法のアドバイス（2026-01-26）

## 📊 質問内容

X API v2を使用して、投稿後のインプレッションとエンゲージメントを正確に取得する方法について質問しました。

## 🤖 Grokの回答

${response}

---

## 📚 参照

- \`api/x-quote-repost.js\` - 引用リポスト投稿API
- \`services/x/metricsTracker.js\` - メトリクス追跡サービス
- \`api/x-quote-repost-metrics.js\` - メトリクス追跡Cron Job
- \`docs/GPT_X_DATA_EXTRACTION_ADVICE_2026-01-26.md\` - GPTによるアドバイス
- \`docs/CRITICAL_ERROR_24H_REPORT_ANALYSIS_2026-01-26.md\` - 24時間レポートのデータソース混在エラー
`;

    fs.writeFileSync(outputFile, content, "utf8");
    console.log(`📝 回答を保存しました: ${outputFile}`);
  } catch (error) {
    console.error("❌ エラー:", error.message);
    console.error("Stack:", error.stack);
    process.exit(1);
  }
}

// 実行
askGrokAboutPostMetrics().catch((error) => {
  console.error("❌ 実行エラー:", error);
  process.exit(1);
});
