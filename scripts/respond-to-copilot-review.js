// scripts/respond-to-copilot-review.js
// Copilot Agentのレビュー結果に基づいて返信コメントを追加

const { execSync } = require('child_process');
const readline = require('readline');

/**
 * Copilot Agentのレビュー結果に返信
 * 
 * 使用方法:
 *   node scripts/respond-to-copilot-review.js [PR_NUMBER] [RESPONSE_TEXT]
 * 
 * 例:
 *   node scripts/respond-to-copilot-review.js 9 "修正を実施しました。レビューお願いします。"
 */
function respondToCopilotReview(prNumber = 9, responseText = null) {
  try {
    console.log(`📝 Preparing response to Copilot Agent review for PR #${prNumber}...\n`);

    // PRの詳細を取得
    const prData = JSON.parse(
      execSync(`gh pr view ${prNumber} --json number,title,url,comments`, { encoding: 'utf-8' })
    );

    console.log(`📋 PR #${prData.number}: ${prData.title}`);
    console.log(`🔗 URL: ${prData.url}\n`);

    // Copilot Agentの最新コメントを取得
    const copilotComments = prData.comments.filter(
      comment => comment.author.login === 'copilot-swe-agent'
    );

    if (copilotComments.length === 0) {
      console.log('⚠️  Copilot Agentのコメントが見つかりませんでした。');
      return;
    }

    const latestComment = copilotComments[copilotComments.length - 1];
    console.log(`📅 Latest Review: ${new Date(latestComment.createdAt).toLocaleString('ja-JP')}`);
    console.log(`🔗 Review URL: ${latestComment.url}\n`);

    // 返信テキストを準備
    let response;
    if (responseText) {
      response = `@copilot-swe-agent ${responseText}`;
    } else {
      // デフォルトの返信テキスト
      response = `@copilot-swe-agent レビューありがとうございます。

修正を実施しました。再度レビューをお願いします。`;
    }

    // PRにコメントを追加
    console.log('💬 Adding response comment...');
    execSync(`gh pr comment ${prNumber} --body "${response.replace(/"/g, '\\"')}"`, { stdio: 'inherit' });

    console.log('\n✅ Response comment added successfully!');
    console.log(`🔗 PR URL: ${prData.url}\n`);

  } catch (error) {
    console.error('❌ Error responding to review:', error.message);
    process.exit(1);
  }
}

// メイン実行
const prNumber = process.argv[2] ? parseInt(process.argv[2], 10) : 9;
const responseText = process.argv[3] || null;
respondToCopilotReview(prNumber, responseText);

module.exports = { respondToCopilotReview };

