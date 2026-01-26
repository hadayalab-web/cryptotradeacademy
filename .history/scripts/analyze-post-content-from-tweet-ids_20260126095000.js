// scripts/analyze-post-content-from-tweet-ids.js
// ツイートIDから実際の投稿内容を取得して分析

const { getTweetMetrics } = require('../services/x/metrics');
const { xApiRequest } = require('../services/x/client');
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
 * 24時間レポートからツイートIDを抽出して分析
 */
async function analyzePostContentFromTweetIds() {
  console.log('📊 24時間レポートからツイートIDを抽出して分析中...\n');

  // 24時間レポートからツイートIDを抽出
  const tweetIds = [
    // English (EN)
    '2015515268605219243',
    '1841943905489454923',
    // Spanish (ES)
    '2015530377733968053',
    '1845678901234567894',
    // Arabic (AR)
    '2015575666993811921',
    '1845678901234567890',
    // UNKNOWN
    '1841822222222222222',
    '1845678901234567891',
    '1845678901234567897',
    '1841800000000000000',
    '1841844444444444444',
  ];

  const results = {
    analyzed: [],
    failed: [],
    analysis: {
      totalTweetIds: tweetIds.length,
      successCount: 0,
      failureCount: 0,
      engagementIssues: [],
      contentIssues: [],
    },
  };

  console.log(`📝 分析対象ツイートID: ${tweetIds.length}件\n`);

  for (const tweetId of tweetIds) {
    console.log(`   📝 ツイートID ${tweetId} を取得中...`);
    
    try {
      const content = await getTweetContent(tweetId);
      
      if (content) {
        results.analysis.successCount++;
        
        // メトリクスを取得
        const metrics = await getTweetMetrics(tweetId, true);
        const impressions = metrics?.nonPublicMetrics?.impression_count || metrics?.organicMetrics?.impression_count || 0;
        const engagements = (content.publicMetrics.like_count || 0) + 
                           (content.publicMetrics.retweet_count || 0) + 
                           (content.publicMetrics.reply_count || 0) + 
                           (content.publicMetrics.quote_count || 0);
        const engagementRate = impressions > 0 ? (engagements / impressions) * 100 : 0;

        const postAnalysis = {
          tweetId: tweetId,
          text: content.text,
          createdAt: content.created_at,
          impressions: impressions,
          engagements: engagements,
          engagementRate: engagementRate,
          publicMetrics: content.publicMetrics,
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

        // エンゲージメントを促す要素のチェック
        const hasEmoji = /[\u{1F300}-\u{1F9FF}]/u.test(content.text);
        const hasHashtag = content.text.includes('#');
        const hasMention = content.text.includes('@');
        const hasQuestion = content.text.includes('?') || content.text.includes('？');
        const hasCallToAction = /(click|visit|get|join|start|subscribe|upgrade|buy|purchase|download|sign|register|enroll|try|learn|discover|explore|check|see|watch|read|listen|follow|share|reply|comment|like|retweet|quote)/i.test(content.text);

        postAnalysis.engagementElements = {
          hasEmoji,
          hasHashtag,
          hasMention,
          hasQuestion,
          hasCallToAction,
        };

        if (!hasQuestion) {
          postAnalysis.issues.push({
            type: 'NO_QUESTION',
            severity: 'MEDIUM',
            message: '質問が含まれていない（リプライを促す要素がない）',
          });
        }

        if (!hasCallToAction) {
          postAnalysis.issues.push({
            type: 'NO_CTA',
            severity: 'HIGH',
            message: '明確なCTA（Call to Action）が含まれていない',
          });
        }

        results.analyzed.push(postAnalysis);
        
        console.log(`   ✅ 取得成功: ${content.text.substring(0, 50)}...`);
        console.log(`      インプレッション: ${impressions.toLocaleString()}, エンゲージメント: ${engagements}, エンゲージメント率: ${engagementRate.toFixed(3)}%`);
        
        // レート制限対策（1秒待機）
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        results.analysis.failureCount++;
        results.failed.push(tweetId);
        console.log(`   ❌ 取得失敗: ${tweetId}`);
      }
    } catch (error) {
      results.analysis.failureCount++;
      results.failed.push(tweetId);
      console.error(`   ❌ エラー: ${error.message}`);
    }
  }

  // 結果を表示
  console.log('\n📊 分析結果:');
  console.log('='.repeat(60));
  console.log(`📝 分析統計:`);
  console.log(`   総ツイートID数: ${results.analysis.totalTweetIds}件`);
  console.log(`   取得成功: ${results.analysis.successCount}件`);
  console.log(`   取得失敗: ${results.analysis.failureCount}件`);
  console.log('');
  
  if (results.analysis.engagementIssues.length > 0) {
    console.log('🚨 エンゲージメント問題:');
    results.analysis.engagementIssues.forEach((issue, idx) => {
      console.log(`   ${idx + 1}. ツイートID: ${issue.tweetId}`);
      console.log(`      問題: ${issue.issues[0].message}`);
      console.log(`      投稿内容（最初の150文字）: ${issue.text.substring(0, 150)}...`);
      console.log('');
    });
  }

  if (results.analysis.contentIssues.length > 0) {
    console.log('⚠️ 投稿内容の問題:');
    results.analysis.contentIssues.forEach((issue, idx) => {
      console.log(`   ${idx + 1}. ツイートID: ${issue.tweetId}`);
      issue.issues.forEach(problem => {
        console.log(`      - ${problem.type} (${problem.severity}): ${problem.message}`);
      });
      console.log(`      投稿内容（最初の150文字）: ${issue.text.substring(0, 150)}...`);
      console.log('');
    });
  }

  console.log('='.repeat(60));

  // 結果をファイルに保存
  const outputDir = path.join(__dirname, '../docs');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().split('T')[0];
  const outputFile = path.join(outputDir, `ACTUAL_POST_CONTENT_FROM_TWEET_IDS_${timestamp}.json`);
  fs.writeFileSync(outputFile, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`\n📄 結果を保存: ${outputFile}`);

  // Markdownレポートを生成
  const markdownFile = path.join(outputDir, `ACTUAL_POST_CONTENT_FROM_TWEET_IDS_${timestamp}.md`);
  let markdown = `# 実際の投稿内容分析レポート（ツイートIDから取得）（${timestamp}）

## 📋 分析概要

- **総ツイートID数**: ${results.analysis.totalTweetIds}件
- **取得成功**: ${results.analysis.successCount}件
- **取得失敗**: ${results.analysis.failureCount}件

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

**投稿内容**:
\`\`\`
${issue.text}
\`\`\`

**エンゲージメント要素**:
- 絵文字: ${issue.engagementElements?.hasEmoji ? '✅' : '❌'}
- ハッシュタグ: ${issue.engagementElements?.hasHashtag ? '✅' : '❌'}
- メンション: ${issue.engagementElements?.hasMention ? '✅' : '❌'}
- 質問: ${issue.engagementElements?.hasQuestion ? '✅' : '❌'}
- CTA: ${issue.engagementElements?.hasCallToAction ? '✅' : '❌'}

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

**エンゲージメント要素**:
- 絵文字: ${issue.engagementElements?.hasEmoji ? '✅' : '❌'}
- ハッシュタグ: ${issue.engagementElements?.hasHashtag ? '✅' : '❌'}
- メンション: ${issue.engagementElements?.hasMention ? '✅' : '❌'}
- 質問: ${issue.engagementElements?.hasQuestion ? '✅' : '❌'}
- CTA: ${issue.engagementElements?.hasCallToAction ? '✅' : '❌'}

---
`;
    });
  } else {
    markdown += `投稿内容の問題は検出されませんでした。

`;
  }

  markdown += `## 📊 全投稿の詳細

`;

  results.analyzed.forEach((post, idx) => {
    markdown += `### ${idx + 1}. ツイートID: ${post.tweetId}

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

**エンゲージメント要素**:
- 絵文字: ${post.engagementElements?.hasEmoji ? '✅' : '❌'}
- ハッシュタグ: ${post.engagementElements?.hasHashtag ? '✅' : '❌'}
- メンション: ${post.engagementElements?.hasMention ? '✅' : '❌'}
- 質問: ${post.engagementElements?.hasQuestion ? '✅' : '❌'}
- CTA: ${post.engagementElements?.hasCallToAction ? '✅' : '❌'}

${post.issues.length > 0 ? `**問題**:\n${post.issues.map(i => `- ${i.type} (${i.severity}): ${i.message}`).join('\n')}\n` : ''}
---
`;
  });

  fs.writeFileSync(markdownFile, markdown, 'utf-8');
  console.log(`📄 Markdownレポートを保存: ${markdownFile}`);

  return results;
}

// スクリプト実行
if (require.main === module) {
  analyzePostContentFromTweetIds()
    .then(() => {
      console.log('\n✅ スクリプト実行完了');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ スクリプト実行エラー:', error);
      process.exit(1);
    });
}

module.exports = { analyzePostContentFromTweetIds, getTweetContent };
