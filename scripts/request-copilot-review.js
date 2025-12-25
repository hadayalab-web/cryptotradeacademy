// scripts/request-copilot-review.js
// GitHub Copilot Agentへのレビュー依頼自動化スクリプト

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * GitHub Copilot Agentへのレビュー依頼
 * 
 * 使用方法:
 *   node scripts/request-copilot-review.js [issue-number]
 * 
 * 例:
 *   node scripts/request-copilot-review.js 3
 *   node scripts/request-copilot-review.js  # 最新のレビューIssueを自動検出
 */
async function requestCopilotReview(issueNumber = null) {
  try {
    // Issue番号が指定されていない場合、最新のレビューIssueを検索
    let targetIssue = issueNumber;
    
    if (!targetIssue) {
      console.log('🔍 Searching for latest review request issue...');
      const issues = JSON.parse(
        execSync('gh issue list --limit 10 --json number,title,state', { encoding: 'utf-8' })
      );
      
      const reviewIssues = issues.filter(issue => 
        issue.state === 'OPEN' && 
        (issue.title.includes('Review') || issue.title.includes('review'))
      );
      
      if (reviewIssues.length === 0) {
        throw new Error('No review request issues found. Please create one first.');
      }
      
      // 最新のIssueを使用
      targetIssue = reviewIssues[0].number;
      console.log(`✅ Found review issue: #${targetIssue} - ${reviewIssues[0].title}`);
    }

    console.log(`\n📋 Preparing Copilot review request for issue #${targetIssue}...`);

    // Issueの詳細を取得
    const issue = JSON.parse(
      execSync(`gh issue view ${targetIssue} --json number,title,body,url`, { encoding: 'utf-8' })
    );

    console.log(`\n📄 Issue: #${issue.number} - ${issue.title}`);
    console.log(`🔗 URL: ${issue.url}\n`);

    // Copilot Agent用のコメントを作成
    const copilotComment = `@copilot Please review the code changes mentioned in this issue.

## Review Instructions

Please review the following:

### Files to Review
${extractFilesFromIssue(issue.body)}

### Review Focus Areas
1. **Code Quality**: Style, consistency, best practices
2. **Logic Correctness**: Algorithm implementation, data flow
3. **Error Handling**: Edge cases, error recovery
4. **Performance**: Optimization opportunities
5. **Documentation**: Code comments, README updates

### Related Documentation
- See \`docs/COPILOT_REVIEW_REQUEST.md\` for detailed review questions
- See \`docs/IMPLEMENTATION_REVIEW.md\` for implementation review

Please provide:
- Code quality feedback
- Logic validation
- Performance optimization suggestions
- Edge case identification
- Best practice recommendations

Thank you! 🙏`;

    // Issueにコメントを追加
    console.log('💬 Adding Copilot review request comment...');
    execSync(
      `gh issue comment ${targetIssue} --body "${copilotComment.replace(/"/g, '\\"')}"`,
      { stdio: 'inherit' }
    );

    console.log('\n✅ Copilot review request added successfully!');
    console.log(`\n📌 Next steps:`);
    console.log(`   1. Check issue #${targetIssue}: ${issue.url}`);
    console.log(`   2. Wait for Copilot Agent to process the review`);
    console.log(`   3. Monitor issue comments for review feedback\n`);

    // Issue URLを出力（GitHub Actions等で使用可能）
    console.log(`Issue URL: ${issue.url}`);

    return issue.url;
  } catch (error) {
    console.error('❌ Error requesting Copilot review:', error.message);
    process.exit(1);
  }
}

/**
 * Issue本文からレビュー対象ファイルを抽出
 */
function extractFilesFromIssue(body) {
  const filePattern = /- `([^`]+)`/g;
  const files = [];
  let match;
  
  while ((match = filePattern.exec(body)) !== null) {
    files.push(match[1]);
  }
  
  if (files.length === 0) {
    return '- See issue description for files to review';
  }
  
  return files.map(f => `- \`${f}\``).join('\n');
}

// メイン実行
const issueNumber = process.argv[2] ? parseInt(process.argv[2], 10) : null;
requestCopilotReview(issueNumber);

module.exports = { requestCopilotReview };



