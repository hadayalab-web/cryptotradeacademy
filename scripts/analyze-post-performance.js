// scripts/analyze-post-performance.js
// 投稿パフォーマンス分析スクリプト（サービス層を使用）

require('dotenv').config({ path: '.env' });

const { analyzePostPerformance } = require('../services/x/postPerformanceAnalyzer');
const fs = require('fs');
const path = require('path');

// 投稿タイプの日本語名
const POST_TYPE_NAMES = {
  quote_repost: '引用リポスト',
  free_report: '無料レポート',
  minimal_version: 'Minimal Version',
};

// マークダウンレポートを生成
function generateMarkdownReport(analysisResult, dateString) {
  const { posts, summary } = analysisResult;
  
  let markdown = `# 投稿パフォーマンス分析レポート（${dateString}）\n\n`;
  markdown += `**生成日時**: ${new Date().toISOString()}\n`;
  markdown += `**分析者**: COO（Cursor/Composer 1）\n\n`;
  markdown += `---\n\n`;
  
  // サマリー
  markdown += `## 📊 全体サマリー\n\n`;
  markdown += `- **総投稿数**: ${summary.totalPosts}件\n`;
  markdown += `- **投稿タイプ別**:\n`;
  Object.entries(summary.postsByType).forEach(([type, count]) => {
    markdown += `  - ${POST_TYPE_NAMES[type] || type}: ${count}件\n`;
  });
  markdown += `- **総期待インプレッション**: ${summary.totalExpectedImpressions.toLocaleString()}\n`;
  markdown += `- **総期待エンゲージメント**: ${summary.totalExpectedEngagements.toLocaleString()}\n`;
  
  if (summary.totalTelegramOptIns) {
    markdown += `- **総期待Telegramオプトイン**: ${summary.totalTelegramOptIns.conservative.toLocaleString()}-${summary.totalTelegramOptIns.optimistic.toLocaleString()}人（保守的-楽観的）\n`;
  }
  
  if (summary.totalWhopConversions) {
    markdown += `- **総期待Whopコンバージョン**: ${summary.totalWhopConversions.conservative.toLocaleString()}-${summary.totalWhopConversions.optimistic.toLocaleString()}件（保守的-楽観的）\n`;
  }
  
  markdown += `\n---\n\n`;
  
  // 投稿タイプ別詳細
  markdown += `## 📋 投稿タイプ別詳細分析\n\n`;
  
  const postsByType = {};
  posts.forEach(post => {
    if (!postsByType[post.postType]) {
      postsByType[post.postType] = [];
    }
    postsByType[post.postType].push(post);
  });
  
  Object.entries(postsByType).forEach(([type, typePosts]) => {
    markdown += `### ${POST_TYPE_NAMES[type] || type} (${typePosts.length}件)\n\n`;
    
    typePosts.forEach((post, index) => {
      markdown += `#### ${index + 1}. ${post.influencer ? `@${post.influencer.username}` : 'インフルエンサーなし'} (${post.lang.toUpperCase()})\n\n`;
      
      if (post.influencer) {
        markdown += `**インフルエンサー情報**:\n`;
        markdown += `- エンゲージメント率: ${post.performance.engagementRate.toFixed(2)}%\n`;
        markdown += `- 期待インプレッション: ${post.performance.impressions.toLocaleString()}\n`;
        markdown += `- 期待エンゲージメント: ${post.performance.expectedEngagements.toLocaleString()}\n`;
      } else {
        const avgImpressions = summary.avgImpressionsByLang[post.lang] || 100000;
        markdown += `**期待インプレッション**: ${avgImpressions.toLocaleString()}（言語平均値）\n`;
      }
      
      markdown += `\n**投稿情報**:\n`;
      markdown += `- ツイートID: ${post.tweetId}\n`;
      markdown += `- 投稿時刻: ${post.postedAt}\n`;
      
      if (post.metadata?.trapScore) {
        markdown += `- Trap Score: ${post.metadata.trapScore}\n`;
      }
      
      if (post.metadata?.isThread) {
        markdown += `- スレッド形式: はい（${post.metadata.threadIndex || 'N/A'}番目のツイート）\n`;
      }
      
      if (post.performance) {
        markdown += `\n**期待パフォーマンス**:\n`;
        
        if (post.performance.telegramOptIns) {
          markdown += `- Telegramオプトイン: ${post.performance.telegramOptIns.conservative}-${post.performance.telegramOptIns.optimistic}人（保守的-楽観的）\n`;
        }
        
        if (post.performance.whopConversions) {
          markdown += `- Whopコンバージョン: ${post.performance.whopConversions.conservative}-${post.performance.whopConversions.optimistic}件（保守的-楽観的）\n`;
        }
      }
      
      markdown += `\n`;
    });
  });
  
  // インフルエンサー別サマリー
  const influencerSummary = {};
  posts.filter(p => p.influencer).forEach(post => {
    const username = post.influencer.username;
    if (!influencerSummary[username]) {
      influencerSummary[username] = {
        username,
        lang: post.lang,
        engagementRate: post.performance.engagementRate,
        posts: [],
        totalImpressions: 0,
        totalEngagements: 0,
      };
    }
    influencerSummary[username].posts.push(post);
    influencerSummary[username].totalImpressions += post.performance.impressions;
    influencerSummary[username].totalEngagements += post.performance.expectedEngagements;
  });
  
  if (Object.keys(influencerSummary).length > 0) {
    markdown += `---\n\n`;
    markdown += `## 🏆 インフルエンサー別サマリー\n\n`;
    
    const influencers = Object.values(influencerSummary).sort((a, b) => b.totalEngagements - a.totalEngagements);
    
    influencers.forEach((inf, index) => {
      markdown += `### ${index + 1}. @${inf.username} (${inf.lang.toUpperCase()})\n\n`;
      markdown += `- **エンゲージメント率**: ${inf.engagementRate.toFixed(2)}%\n`;
      markdown += `- **投稿数**: ${inf.posts.length}件\n`;
      markdown += `- **総期待インプレッション**: ${inf.totalImpressions.toLocaleString()}\n`;
      markdown += `- **総期待エンゲージメント**: ${inf.totalEngagements.toLocaleString()}\n`;
      markdown += `\n`;
    });
  }
  
  markdown += `---\n\n`;
  markdown += `**最終更新**: ${new Date().toISOString()}\n`;
  markdown += `**作成者**: COO（Cursor/Composer 1）\n`;
  
  return markdown;
}

async function main() {
  const dateString = process.argv[2] || null;
  
  console.log('📊 投稿パフォーマンス分析を開始...\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // サービス層を使用して分析
  const result = await analyzePostPerformance(dateString);
  
  if (result.summary.totalPosts === 0) {
    console.log(`⚠️ ${result.dateString}の投稿が見つかりませんでした`);
    return;
  }
  
  // コンソール出力
  console.log(`📅 分析対象日: ${result.dateString}\n`);
  console.log(`📊 総投稿数: ${result.summary.totalPosts}件\n`);
  
  console.log('📋 投稿タイプ別:');
  Object.entries(result.summary.postsByType).forEach(([type, count]) => {
    console.log(`   - ${POST_TYPE_NAMES[type] || type}: ${count}件`);
  });
  console.log('');
  
  console.log(`📊 総期待インプレッション: ${result.summary.totalExpectedImpressions.toLocaleString()}`);
  console.log(`📊 総期待エンゲージメント: ${result.summary.totalExpectedEngagements.toLocaleString()}\n`);
  
  if (result.summary.totalTelegramOptIns) {
    console.log(`📱 総期待Telegramオプトイン:`);
    console.log(`   - 保守的: ${result.summary.totalTelegramOptIns.conservative.toLocaleString()}人`);
    console.log(`   - 中程度: ${result.summary.totalTelegramOptIns.moderate.toLocaleString()}人`);
    console.log(`   - 楽観的: ${result.summary.totalTelegramOptIns.optimistic.toLocaleString()}人\n`);
  }
  
  if (result.summary.totalWhopConversions) {
    console.log(`💰 総期待Whopコンバージョン:`);
    console.log(`   - 保守的: ${result.summary.totalWhopConversions.conservative.toLocaleString()}件`);
    console.log(`   - 中程度: ${result.summary.totalWhopConversions.moderate.toLocaleString()}件`);
    console.log(`   - 楽観的: ${result.summary.totalWhopConversions.optimistic.toLocaleString()}件\n`);
  }
  
  // マークダウンレポートを生成
  const markdown = generateMarkdownReport(result, result.dateString);
  
  // ファイルに保存
  const outputDir = path.join(__dirname, '../docs');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const outputPath = path.join(outputDir, `POST_PERFORMANCE_ANALYSIS_${result.dateString}.md`);
  fs.writeFileSync(outputPath, markdown, 'utf-8');
  console.log(`✅ レポートを保存しました: ${outputPath}\n`);
}

// 実行
if (require.main === module) {
  main()
    .then(() => {
      console.log('✅ 分析完了');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ エラー:', error);
      process.exit(1);
    });
}

module.exports = { main };
