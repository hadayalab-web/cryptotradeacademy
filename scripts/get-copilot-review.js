// scripts/get-copilot-review.js
// GitHub Copilot Agentのレビュー結果を取得・表示

const { execSync } = require('child_process');

/**
 * PRのCopilot Agentレビュー結果を取得
 *
 * 使用方法:
 *   node scripts/get-copilot-review.js [PR_NUMBER]
 *
 * 例:
 *   node scripts/get-copilot-review.js 9
 */
function getCopilotReview(prNumber = 9) {
  try {
    console.log(`🔍 Fetching Copilot Agent review for PR #${prNumber}...\n`);

    // PRの詳細を取得
    const prData = JSON.parse(
      execSync(`gh pr view ${prNumber} --json number,title,url,state,comments`, { encoding: 'utf-8' })
    );

    console.log(`📋 PR #${prData.number}: ${prData.title}`);
    console.log(`🔗 URL: ${prData.url}`);
    console.log(`📊 State: ${prData.state}\n`);

    // Copilot Agentのコメントをフィルタ
    const copilotComments = prData.comments.filter(
      comment => comment.author.login === 'copilot-swe-agent'
    );

    if (copilotComments.length === 0) {
      console.log('⚠️  Copilot Agentのコメントが見つかりませんでした。');
      return;
    }

    console.log(`✅ Copilot Agentのコメント: ${copilotComments.length}件\n`);

    // 各コメントを表示
    copilotComments.forEach((comment, index) => {
      console.log(`--- コメント ${index + 1} ---`);
      console.log(`📅 Date: ${new Date(comment.createdAt).toLocaleString('ja-JP')}`);
      console.log(`🔗 URL: ${comment.url}`);
      console.log(`\n💬 Content:\n${comment.body}\n`);
      console.log('─'.repeat(80));
      console.log('');
    });

    // 最新のコメントURLを出力（共有用）
    if (copilotComments.length > 0) {
      const latestComment = copilotComments[copilotComments.length - 1];
      console.log(`\n📌 最新のレビューコメントURL（共有用）:`);
      console.log(`${latestComment.url}\n`);
    }

    // PRのURLも出力
    console.log(`📌 PR URL（共有用）:`);
    console.log(`${prData.url}\n`);

  } catch (error) {
    console.error('❌ Error fetching review:', error.message);
    process.exit(1);
  }
}

// メイン実行
const prNumber = process.argv[2] ? parseInt(process.argv[2], 10) : 9;
getCopilotReview(prNumber);

module.exports = { getCopilotReview };

