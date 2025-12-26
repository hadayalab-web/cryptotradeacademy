// scripts/create-copilot-review-pr.js
// GitHub Copilot Agentレビュー用のPull Requestを作成

const { execSync } = require('child_process');

/**
 * Copilot Agentレビュー用のPR作成
 *
 * 使用方法:
 *   node scripts/create-copilot-review-pr.js [issue-number]
 */
async function createCopilotReviewPR(issueNumber = 3) {
  try {
    console.log(`🚀 Creating Pull Request for Copilot Agent review (Issue #${issueNumber})...\n`);

    // 現在のブランチを確認
    const currentBranch = execSync('git branch --show-current', { encoding: 'utf-8' }).trim();
    console.log(`📌 Current branch: ${currentBranch}`);

    // レビューブランチを作成
    const reviewBranch = `copilot-review-issue-${issueNumber}`;
    console.log(`\n🔀 Creating review branch: ${reviewBranch}`);

    try {
      execSync(`git checkout -b ${reviewBranch}`, { stdio: 'inherit' });
    } catch (error) {
      // ブランチが既に存在する場合
      console.log(`Branch ${reviewBranch} already exists, switching to it...`);
      execSync(`git checkout ${reviewBranch}`, { stdio: 'inherit' });
    }

    // 空のコミットを作成（PRを作成するため）
    try {
      execSync('git commit --allow-empty -m "chore: Trigger Copilot Agent review"', { stdio: 'inherit' });
    } catch (error) {
      console.log('No changes to commit or already committed');
    }

    // ブランチをプッシュ
    console.log(`\n📤 Pushing branch ${reviewBranch}...`);
    execSync(`git push -u origin ${reviewBranch}`, { stdio: 'inherit' });

    // PR作成用のbodyを作成
    const prBody = `## Copilot Agent Review Request

This PR is created for GitHub Copilot Agent code review.

### Related Issue
Closes #${issueNumber}

### Review Request for @copilot

Please review the following changes:

### Key Files to Review

- \`services/binance/client.js\` (new)
- \`services/cryptoquant/deepMetrics.js\` (modified)
- \`logic/core/marketCore.js\` (modified)
- \`api/cron.js\` (modified)
- \`scripts/backtest/autoTuner.js\` (new)

### Review Focus Areas

1. **Code Quality**: Style, consistency, best practices
2. **Logic Correctness**: Algorithm implementation, data flow
3. **Error Handling**: Edge cases, error recovery
4. **Performance**: Optimization opportunities
5. **Documentation**: Code comments, README updates

### Related Documentation

- Review request details: \`docs/COPILOT_REVIEW_REQUEST.md\`
- Implementation review: \`docs/IMPLEMENTATION_REVIEW.md\`
- Backtest improvement plan: \`docs/BACKTEST_IMPROVEMENT_PLAN.md\`

---

**Note**: This PR is specifically created for Copilot Agent review. Please review the code changes and provide feedback.

Thank you! 🙏`;

    // PRを作成
    console.log(`\n📝 Creating Pull Request...`);
    const prUrl = execSync(
      `gh pr create --title "Copilot Agent Review: Binance API Integration & Backtest Improvements" --body "${prBody.replace(/"/g, '\\"')}" --base main --head ${reviewBranch}`,
      { encoding: 'utf-8' }
    ).trim();

    console.log(`\n✅ Pull Request created successfully!`);
    console.log(`🔗 PR URL: ${prUrl}\n`);

    // PRにCopilot Agentをアサイン（可能な場合）
    try {
      execSync(`gh pr comment ${prUrl} --body "@copilot Please review this PR and provide feedback on code quality, logic correctness, error handling, performance, and documentation."`, { stdio: 'inherit' });
      console.log('✅ Added Copilot review comment to PR\n');
    } catch (error) {
      console.log('⚠️ Could not add Copilot comment (this is optional)\n');
    }

    console.log('📌 Next steps:');
    console.log(`   1. Check PR: ${prUrl}`);
    console.log('   2. Copilot Agent should automatically review the PR');
    console.log('   3. Monitor PR comments for review feedback\n');

    // 元のブランチに戻る
    console.log(`\n🔄 Switching back to ${currentBranch}...`);
    execSync(`git checkout ${currentBranch}`, { stdio: 'inherit' });

    return prUrl;
  } catch (error) {
    console.error('❌ Error creating PR:', error.message);
    process.exit(1);
  }
}

// メイン実行
const issueNumber = process.argv[2] ? parseInt(process.argv[2], 10) : 3;
createCopilotReviewPR(issueNumber);

module.exports = { createCopilotReviewPR };







