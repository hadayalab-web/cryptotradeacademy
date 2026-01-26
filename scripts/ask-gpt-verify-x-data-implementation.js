// scripts/ask-gpt-verify-x-data-implementation.js
// GPTにX投稿データ取得の実装をチェックしてもらう

require("dotenv").config({ path: ".env" });
const OpenAI = require("openai");

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.argv[2];

if (!OPENAI_API_KEY) {
  console.error("❌ OPENAI_API_KEY is not set");
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY
});

/**
 * GPTに実装をチェックしてもらう
 */
async function verifyImplementation() {
  const prompt = `あなたはX（Twitter）API v2の専門家で、データ取得の正確性を検証するエキスパートです。

以下の実装が正確にX APIからデータを取得できるか、徹底的にチェックしてください。

## 実装されたコード

### 1. services/x/metrics.js の getTweetMetrics 関数

\`\`\`javascript
async function getTweetMetrics(tweetId, includeNonPublic = false, options = {}) {
  if (!tweetId) {
    throw new Error('CRITICAL: Tweet ID is required');
  }

  const maxRetries = options.maxRetries || 3;
  const retryDelay = options.retryDelay || 1000;
  
  let lastError = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const tweetFields = includeNonPublic
        ? 'id,text,author_id,created_at,public_metrics,non_public_metrics,organic_metrics'
        : 'id,text,author_id,created_at,public_metrics';

      const response = await xApiRequest(\`/tweets/\${tweetId}\`, {
        method: 'GET',
        params: {
          'tweet.fields': tweetFields,
        },
      });

      if (!response || !response.data) {
        throw new Error(\`X API returned no data for tweet \${tweetId}\`);
      }

      const tweet = response.data;
      
      if (!tweet.id) {
        throw new Error(\`Invalid tweet data: missing id\`);
      }
      
      const metrics = {
        tweetId: tweet.id,
        createdAt: tweet.created_at || null,
        publicMetrics: tweet.public_metrics || {
          retweet_count: 0,
          like_count: 0,
          quote_count: 0,
          reply_count: 0,
        },
        nonPublicMetrics: includeNonPublic && tweet.non_public_metrics ? {
          impression_count: tweet.non_public_metrics.impression_count || 0,
          url_link_clicks: tweet.non_public_metrics.url_link_clicks || 0,
          user_profile_clicks: tweet.non_public_metrics.user_profile_clicks || 0,
        } : null,
        organicMetrics: includeNonPublic && tweet.organic_metrics ? {
          impression_count: tweet.organic_metrics.impression_count || 0,
          like_count: tweet.organic_metrics.like_count || 0,
          retweet_count: tweet.organic_metrics.retweet_count || 0,
          reply_count: tweet.organic_metrics.reply_count || 0,
          url_link_clicks: tweet.organic_metrics.url_link_clicks || 0,
          user_profile_clicks: tweet.organic_metrics.user_profile_clicks || 0,
        } : null,
      };

      if (!metrics.publicMetrics) {
        throw new Error(\`Invalid metrics data: missing publicMetrics\`);
      }

      return metrics;
    } catch (error) {
      lastError = error;
      const isRateLimit = error.message?.includes('429') || error.message?.includes('rate limit');
      const delay = isRateLimit ? retryDelay * Math.pow(2, attempt) : retryDelay;
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw new Error(\`CRITICAL: Failed to get metrics for tweet \${tweetId} after \${maxRetries + 1} attempts. Last error: \${lastError?.message || 'Unknown error'}\`);
}
\`\`\`

### 2. api/x-engagement-metrics.js の updateMetricsForDate 関数

\`\`\`javascript
async function updateMetricsForDate(dateString) {
  // ...
  for (const post of posts) {
    let retries = 3;
    let success = false;
    
    while (retries > 0 && !success) {
      try {
        const metrics = await getTweetMetrics(post.tweetId, true, { maxRetries: 2 });
        
        if (!metrics || !metrics.publicMetrics) {
          throw new Error(\`Invalid metrics data for tweet \${post.tweetId}\`);
        }
        
        const engagementMetrics = {
          impressions: metrics.nonPublicMetrics?.impression_count || metrics.organicMetrics?.impression_count || 0,
          engagements: (metrics.publicMetrics?.like_count || 0) +
                      (metrics.publicMetrics?.retweet_count || 0) +
                      (metrics.publicMetrics?.reply_count || 0) +
                      (metrics.publicMetrics?.quote_count || 0),
          // ...
        };
        
        if (engagementMetrics.impressions === 0) {
          const postTime = new Date(post.postedAt);
          const now = new Date();
          const minutesSincePost = (now - postTime) / (1000 * 60);
          
          if (minutesSincePost < 10) {
            console.log(\`Impressions is 0 (posted \${minutesSincePost.toFixed(1)} minutes ago - normal)\`);
          }
        }
        
        const recordSuccess = await recordEngagementMetrics(post.tweetId, {
          ...engagementMetrics,
          dataSource: {
            impressions: 'x_api_actual',
            engagements: 'x_api_actual',
          },
          isInitialRecord: false,
        });
        
        if (recordSuccess) {
          success = true;
        } else {
          throw new Error(\`Failed to record metrics\`);
        }
      } catch (error) {
        retries--;
        if (retries > 0) {
          // リトライ
        }
      }
    }
  }
}
\`\`\`

### 3. services/x/postTracker.js の savePostId 関数

\`\`\`javascript
async function savePostId(tweetId, postType, lang, metadata = {}) {
  validatePostData(tweetId, postType, lang);
  
  try {
    await testKvConnection();
  } catch (error) {
    throw error;
  }
  
  try {
    // KVに保存
    await kv.set(key, existing, { ex: 86400 * 30 });
    return true;
  } catch (error) {
    throw new Error(\`CRITICAL: Failed to save post ID \${tweetId}: \${error.message}\`);
  }
}
\`\`\`

## チェック項目

以下の観点から、実装が正確にX APIからデータを取得できるか徹底的にチェックしてください：

### 1. X API v2の仕様準拠
- \`tweet.fields\`パラメータの指定が正しいか
- \`non_public_metrics\`と\`organic_metrics\`の取得方法が正しいか
- エラーレスポンスの処理が適切か

### 2. エラーハンドリング
- リトライロジックが適切か
- エラーを無視していないか
- 致命的なエラーを適切に処理しているか

### 3. データの正確性
- インプレッション数の取得方法が正しいか（\`non_public_metrics\` vs \`organic_metrics\`）
- データソースの区別が明確か（実測値 vs 推定値）
- データの妥当性チェックが適切か

### 4. タイミングの問題
- 投稿直後のインプレッション数が0の場合の処理が適切か
- Cron Jobでの更新タイミングが適切か

### 5. データ整合性
- 重複チェックが適切か
- データの更新が正確か
- 合計値の計算が正確か

## 出力形式

以下の形式で分析結果を出力してください：

### 1. 実装の正確性評価（総合）
- ✅ 正確に実装されている点
- ❌ 問題がある点
- ⚠️ 改善が必要な点

### 2. 詳細なチェック結果
各チェック項目について、具体的な問題点と改善案を提示

### 3. 潜在的な問題
- エッジケースでの問題
- レート制限時の問題
- データ不整合の可能性

### 4. 推奨される改善
- 即座に修正すべき問題
- 短期で改善すべき問題
- 長期で改善すべき問題

### 5. 結論
- 実装は正確にX APIからデータを取得できるか
- 信頼性はどの程度か
- 追加で必要な対策は何か

日本語で回答してください。`;

  try {
    console.log("🔄 GPTに実装をチェックしてもらっています...\n");

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "あなたはX（Twitter）API v2の専門家で、データ取得の正確性を検証するエキスパートです。実装コードを徹底的にチェックし、問題点と改善案を具体的に提示してください。"
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
    console.log("GPTによる実装チェック結果");
    console.log("=".repeat(80));
    console.log(response);
    console.log("=".repeat(80));

    // 結果をファイルに保存
    const fs = require("fs");
    const path = require("path");
    const outputPath = path.join(
      __dirname,
      "../docs/GPT_X_DATA_IMPLEMENTATION_REVIEW_2026-01-26.md"
    );
    const output = `# GPTによるX APIデータ取得実装のレビュー
**作成日**: 2026-01-26  
**レビュー対象**: X APIからのメトリクス取得実装

${response}
`;

    fs.writeFileSync(outputPath, output, "utf-8");
    console.log(`\n✅ レビュー結果を保存しました: ${outputPath}`);

    return response;
  } catch (error) {
    console.error("❌ GPT API呼び出しエラー:", error.message);
    console.error(error.stack);
    throw error;
  }
}

/**
 * メイン処理
 */
async function main() {
  try {
    await verifyImplementation();
  } catch (error) {
    console.error("❌ エラー:", error.message);
    process.exit(1);
  }
}

main();
