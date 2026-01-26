// scripts/analyze-actual-post-content.js
// 実際に投稿されたツイートの内容を取得して分析

const { getTweetMetrics } = require('../services/x/metrics');
const { xApiRequest } = require('../services/x/client');
const { getPostsForDate } = require('../services/x/postTracker');
const fs = require('fs');
const path = require('path');

/**
 * ツイートIDから実際の投稿内容を取得
 */
async function getTweetContent(tweetId) {
  try {
    const response = await xApiRequest(`/tweets/${tweetId}`, {
      method: 'GET',
      params: {
        'tweet.fields': 'id,text,created_at,public_metrics,author_id',
      },
    });

    if (!response.data) {
      return null;
    }

    return {
      tweetId: response.data.id,
      text: response.data.text,
      createdAt: response.data.created_at,
      publicMetrics: response.data.public_metrics || {},
      authorId: response.data.author_id,
    };
  } catch (error) {
    console.error(`[Analyze Post Content] Failed to get tweet ${tweetId}:`, error.message);
    return null;
  }
}

/**
 * 実際の投稿内容を分析
 */
async function analyzeActualPostContent(dateString = null) {
  const targetDate = dateString || new Date().toISOString().split('T')[0];
  const yesterday = new Date(targetDate);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayString = yesterday.toISOString().split('T')[0];

  console.log('📊 実際の投稿内容を分析中...\n');
  console.log(`📅 対象日: ${yesterdayString} (昨日)`);
  console.log(`📅 今日: ${targetDate}\n`);

  const results = {
    date: {
      target: targetDate,
      yesterday: yesterdayString,
    },
    posts: [],
    analysis: {
      totalPosts: 0,
      postsWithContent: 0,
      postsWithoutContent: 0,
      averageLength: 0,
      engagementIssues: [],
      contentIssues: [],
    },
  };

  try {
    // 1. 投稿IDを取得
    console.log('1️⃣ 投稿IDを取得中...');
    const yesterdayPosts = await getPostsForDate(yesterdayString);
    const todayPosts = await getPostsForDate(targetDate);
    
    const allPosts = [...yesterdayPosts, ...todayPosts];
    results.analysis.totalPosts = allPosts.length;
    
    console.log(`   ✅ 昨日の投稿数: ${yesterdayPosts.length}件`);
    console.log(`   ✅ 今日の投稿数: ${todayPosts.length}件`);
    console.log(`   ✅ 合計: ${allPosts.length}件\n`);

    // 2. 各投稿の内容を取得
    console.log('2️⃣ 投稿内容を取得中...');
    let totalLength = 0;
    let postsWithContentCount = 0;

    for (const post of allPosts) {
      const tweetId = post.tweetId || post.id;
      if (!tweetId) {
        console.warn(`   ⚠️ ツイートIDが不明: ${JSON.stringify(post)}`);
        results.analysis.postsWithoutContent++;
        continue;
      }

      console.log(`   📝 ツイートID ${tweetId} を取得中...`);
      const content = await getTweetContent(tweetId);
      
      if (content) {
        postsWithContentCount++;
        totalLength += content.text.length;
        
        // エンゲージメント率を計算
        const impressions = post.impressions || 0;
        const engagements = (post.publicMetrics?.like_count || 0) + 
                           (post.publicMetrics?.retweet_count || 0) + 
                           (post.publicMetrics?.reply_count || 0) + 
                           (post.publicMetrics?.quote_count || 0);
        const engagementRate = impressions > 0 ? (engagements / impressions) * 100 : 0;

        const postAnalysis = {
          tweetId: tweetId,
          text: content.text,
          createdAt: content.created_at,
          impressions: impressions,
          engagements: engagements,
          engagementRate: engagementRate,
          publicMetrics: content.publicMetrics,
          postType: post.postType || 'unknown',
          lang: post.lang || 'unknown',
          influencer: post.influencer || null,
          issues: [],
        };

        // 投稿内容の問題を検出
        if (engagementRate < 0.1 && impressions > 100000) {
          postAnalysis.issues.push({
            type: 'LOW_ENGAGEMENT',
            severity: 'HIGH',
            message: `エンゲージメント率が極端に低い: ${engagementRate.toFixed(3)}% (インプレッション: ${impressions.toLocaleString()})`,
          });
          results.analysis.engagementIssues.push(postAnalysis);
        }

        // 投稿内容の問題を検出
        if (!content.text.includes('?') && !content.text.includes('？')) {
          postAnalysis.issues.push({
            type: 'NO_QUESTION',
            severity: 'MEDIUM',
            message: '質問が含まれていない（エンゲージメントを促す要素がない）',
          });
          results.analysis.contentIssues.push(postAnalysis);
        }

        if (!content.text.includes('http') && !content.text.includes('t.me')) {
          postAnalysis.issues.push({
            type: 'NO_LINK',
            severity: 'HIGH',
            message: 'リンクが含まれていない（CTAがない）',
          });
          results.analysis.contentIssues.push(postAnalysis);
        }

        if (content.text.length < 50) {
          postAnalysis.issues.push({
            type: 'TOO_SHORT',
            severity: 'MEDIUM',
            message: `投稿が短すぎる: ${content.text.length}文字`,
          });
          results.analysis.contentIssues.push(postAnalysis);
        }

        if (content.text.length > 280) {
          postAnalysis.issues.push({
            type: 'TOO_LONG',
            severity: 'LOW',
            message: `投稿が長すぎる可能性: ${content.text.length}文字`,
          });
        }

        results.posts.push(postAnalysis);
        
        // レート制限対策（1秒待機）
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        results.analysis.postsWithoutContent++;
      }
    }

    results.analysis.postsWithContent = postsWithContentCount;
    results.analysis.averageLength = postsWithContentCount > 0 ? totalLength / postsWithContentCount : 0;

    // 3. 結果を表示
    console.log('\n📊 分析結果:');
    console.log('='.repeat(60));
    console.log(`📅 対象日: ${yesterdayString} (昨日)`);
    console.log(`📅 今日: ${targetDate}`);
    console.log('');
    console.log('📝 投稿統計:');
    console.log(`   総投稿数: ${results.analysis.totalPosts}件`);
    console.log(`   内容取得成功: ${results.analysis.postsWithContent}件`);
    console.log(`   内容取得失敗: ${results.analysis.postsWithoutContent}件`);
    console.log(`   平均文字数: ${results.analysis.averageLength.toFixed(0)}文字`);
    console.log('');
    
    if (results.analysis.engagementIssues.length > 0) {
      console.log('🚨 エンゲージメント問題:');
      results.analysis.engagementIssues.forEach((issue, idx) => {
        console.log(`   ${idx + 1}. ツイートID: ${issue.tweetId}`);
        console.log(`      問題: ${issue.issues[0].message}`);
        console.log(`      投稿内容（最初の100文字）: ${issue.text.substring(0, 100)}...`);
        console.log('');
      });
    }

    if (results.analysis.contentIssues.length > 0) {
      console.log('⚠️ 投稿内容の問題:');
      results.analysis.contentIssues.forEach((issue, idx) => {
        console.log(`   ${idx + 1}. ツイートID: ${issue.tweetId}`);
        issue.issues.forEach(problem => {
          console.log(`      - ${problem.type}: ${problem.message}`);
        });
        console.log(`      投稿内容（最初の100文字）: ${issue.text.substring(0, 100)}...`);
        console.log('');
      });
    }

    console.log('='.repeat(60));

    // 4. 結果をファイルに保存
    const outputDir = path.join(__dirname, '../docs');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputFile = path.join(outputDir, `ACTUAL_POST_CONTENT_ANALYSIS_${targetDate}.json`);
    fs.writeFileSync(outputFile, JSON.stringify(results, null, 2), 'utf-8');
    console.log(`\n📄 結果を保存: ${outputFile}`);

    // 5. Markdownレポートを生成
    const markdownFile = path.join(outputDir, `ACTUAL_POST_CONTENT_ANALYSIS_${targetDate}.md`);
    let markdown = `# 実際の投稿内容分析レポート（${targetDate}）

## 📋 分析概要

- **対象日**: ${yesterdayString} (昨日) ～ ${targetDate} (今日)
- **総投稿数**: ${results.analysis.totalPosts}件
- **内容取得成功**: ${results.analysis.postsWithContent}件
- **内容取得失敗**: ${results.analysis.postsWithoutContent}件
- **平均文字数**: ${results.analysis.averageLength.toFixed(0)}文字

---

## 🚨 エンゲージメント問題

`;

    if (results.analysis.engagementIssues.length > 0) {
      results.analysis.engagementIssues.forEach((issue, idx) => {
        markdown += `### ${idx + 1}. ツイートID: ${issue.tweetId}

- **エンゲージメント率**: ${issue.engagementRate.toFixed(3)}%
- **インプレッション**: ${issue.impressions.toLocaleString()}
- **エンゲージメント**: ${issue.engagements}
- **問題**: ${issue.issues[0].message}
- **投稿タイプ**: ${issue.postType}
- **言語**: ${issue.lang}
- **インフルエンサー**: ${issue.influencer || 'N/A'}

**投稿内容**:
\`\`\`
${issue.text}
\`\`\`

---
`;
      });
    } else {
      markdown += `エンゲージメント問題は検出されませんでした。

`;
    }

    markdown += `## ⚠️ 投稿内容の問題

`;

    if (results.analysis.contentIssues.length > 0) {
      results.analysis.contentIssues.forEach((issue, idx) => {
        markdown += `### ${idx + 1}. ツイートID: ${issue.tweetId}

- **投稿タイプ**: ${issue.postType}
- **言語**: ${issue.lang}
- **インフルエンサー**: ${issue.influencer || 'N/A'}

**問題**:
`;
        issue.issues.forEach(problem => {
          markdown += `- **${problem.type}** (${problem.severity}): ${problem.message}\n`;
        });

        markdown += `
**投稿内容**:
\`\`\`
${issue.text}
\`\`\`

---
`;
      });
    } else {
      markdown += `投稿内容の問題は検出されませんでした。

`;
    }

    markdown += `## 📊 全投稿の詳細

`;

    results.posts.forEach((post, idx) => {
      markdown += `### ${idx + 1}. ツイートID: ${post.tweetId}

- **投稿タイプ**: ${post.postType}
- **言語**: ${post.lang}
- **インフルエンサー**: ${post.influencer || 'N/A'}
- **作成日時**: ${post.createdAt}
- **インプレッション**: ${post.impressions.toLocaleString()}
- **エンゲージメント**: ${post.engagements}
- **エンゲージメント率**: ${post.engagementRate.toFixed(3)}%
- **文字数**: ${post.text.length}文字

**投稿内容**:
\`\`\`
${post.text}
\`\`\`

**メトリクス**:
- いいね: ${post.publicMetrics.like_count || 0}
- リツイート: ${post.publicMetrics.retweet_count || 0}
- リプライ: ${post.publicMetrics.reply_count || 0}
- 引用: ${post.publicMetrics.quote_count || 0}

${post.issues.length > 0 ? `**問題**:\n${post.issues.map(i => `- ${i.type}: ${i.message}`).join('\n')}\n` : ''}
---
`;
    });

    fs.writeFileSync(markdownFile, markdown, 'utf-8');
    console.log(`📄 Markdownレポートを保存: ${markdownFile}`);

    return results;
  } catch (error) {
    console.error('❌ 分析エラー:', error);
    throw error;
  }
}

// スクリプト実行
if (require.main === module) {
  const dateString = process.argv[2] || null;
  analyzeActualPostContent(dateString)
    .then(() => {
      console.log('\n✅ スクリプト実行完了');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ スクリプト実行エラー:', error);
      process.exit(1);
    });
}

module.exports = { analyzeActualPostContent, getTweetContent };
