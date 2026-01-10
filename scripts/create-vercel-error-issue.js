#!/usr/bin/env node
// scripts/create-vercel-error-issue.js
// Vercelエラーが検出されたら自動的にGitHub Issueを作成

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ERROR_LOG_FILE = path.join(__dirname, '..', 'data', 'vercel-logs', 'error-logs.json');
const ANALYSIS_FILE = path.join(__dirname, '..', 'data', 'vercel-logs', 'error-analysis.json');
const CSV_FILE = path.join(__dirname, '..', 'data', 'vercel-logs', 'latest-vercel-errors.csv');

/**
 * GitHub Issueを作成
 */
async function createErrorIssue(errorAnalysis) {
  try {
    // Issueのタイトルと本文を作成
    const title = `🚨 Vercel Error Detected: ${errorAnalysis.totalErrors} errors found`;
    
    // トップエラーを抽出
    const topErrors = errorAnalysis.topErrors?.slice(0, 5) || [];
    const errorTypes = errorAnalysis.errorTypes || {};
    const errorFiles = errorAnalysis.errorFiles || {};
    
    // Issue本文を作成
    let body = `## Vercel Error Report\n\n`;
    body += `**Total Errors**: ${errorAnalysis.totalErrors}\n`;
    body += `**Generated**: ${new Date().toISOString()}\n\n`;
    
    if (Object.keys(errorTypes).length > 0) {
      body += `### Error Types\n\n`;
      Object.entries(errorTypes)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .forEach(([type, count]) => {
          body += `- **${type}**: ${count}件\n`;
        });
      body += `\n`;
    }
    
    if (topErrors.length > 0) {
      body += `### Top 5 Errors\n\n`;
      topErrors.forEach((error, index) => {
        body += `${index + 1}. \`${error.pattern.substring(0, 100)}${error.pattern.length > 100 ? '...' : ''}\` (${error.count}回)\n`;
      });
      body += `\n`;
    }
    
    if (Object.keys(errorFiles).length > 0) {
      body += `### Affected Files\n\n`;
      Object.entries(errorFiles)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .forEach(([file, count]) => {
          body += `- \`${file}\`: ${count}件\n`;
        });
      body += `\n`;
    }
    
    body += `### Details\n\n`;
    body += `- Error Log: \`data/vercel-logs/error-logs.json\`\n`;
    body += `- Error Analysis: \`data/vercel-logs/error-analysis.json\`\n`;
    body += `- CSV Format: \`data/vercel-logs/latest-vercel-errors.csv\`\n\n`;
    body += `### How to Fix\n\n`;
    body += `1. Check the error logs: \`npm run vercel:logs\`\n`;
    body += `2. Analyze errors: \`npm run vercel:analyze\`\n`;
    body += `3. Review the CSV file for detailed error information\n`;
    body += `4. Fix the issues and redeploy\n\n`;
    body += `### Automation\n\n`;
    body += `This issue was automatically created by the Vercel error monitoring system.\n`;
    
    // 既存のエラーIssueを検索（重複を防ぐ）
    try {
      const existingIssues = JSON.parse(
        execSync('gh issue list --label "vercel-error" --state open --json number,title,updatedAt', {
          encoding: 'utf-8',
          stdio: 'pipe'
        })
      );
      
      // 最近（1時間以内）に作成された同じエラーのIssueがあるかチェック
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      const recentIssue = existingIssues.find(issue => {
        const updated = new Date(issue.updatedAt).getTime();
        return updated > oneHourAgo && issue.title.includes('Vercel Error');
      });
      
      if (recentIssue) {
        console.log(`⚠️  最近のエラーIssueが見つかりました: #${recentIssue.number}`);
        console.log(`   既存のIssueにコメントを追加します。`);
        
        // 既存のIssueにコメントを追加
        const comment = `## Error Update\n\n**Time**: ${new Date().toISOString()}\n**Total Errors**: ${errorAnalysis.totalErrors}\n\n${body}`;
        
        execSync(
          `gh issue comment ${recentIssue.number} --body "${comment.replace(/"/g, '\\"')}"`,
          { stdio: 'inherit' }
        );
        
        console.log(`✅ Issue #${recentIssue.number}にコメントを追加しました。`);
        return recentIssue.number;
      }
    } catch (error) {
      // 既存Issueの検索に失敗した場合は新規作成を続行
      console.log('⚠️  既存Issueの検索に失敗しました。新規Issueを作成します。');
    }
    
    // 新規Issueを作成
    console.log('📝 Creating new GitHub Issue...');
    
    const issueCommand = `gh issue create --title "${title.replace(/"/g, '\\"')}" --body "${body.replace(/"/g, '\\"')}" --label "vercel-error,automated,urgent"`;
    
    const issueUrl = execSync(issueCommand, { encoding: 'utf-8' }).trim();
    const issueNumber = issueUrl.match(/#(\d+)/)?.[1];
    
    console.log(`✅ Issueを作成しました: ${issueUrl}`);
    
    // CSVファイルを添付（GitHub CLIはファイル添付をサポートしていないため、コメントで参照）
    if (fs.existsSync(CSV_FILE)) {
      console.log(`💡 CSVログは以下のパスから確認できます: ${CSV_FILE}`);
      console.log(`   Cursorで読み取るには: @data/vercel-logs/latest-vercel-errors.csv`);
    }
    
    return issueNumber;
    
  } catch (error) {
    console.error('❌ GitHub Issueの作成に失敗しました:', error.message);
    
    // GitHub CLIがインストールされていない、または認証されていない場合
    if (error.message.includes('gh: command not found') || 
        error.message.includes('not found') ||
        error.code === 'ENOENT') {
      console.error('\n💡 GitHub CLIがインストールされていないか、認証されていません。');
      console.error('   インストール: https://cli.github.com/');
      console.error('   認証: gh auth login');
    }
    
    return null;
  }
}

/**
 * メイン処理
 */
async function main() {
  // エラーログファイルの存在確認
  if (!fs.existsSync(ERROR_LOG_FILE)) {
    console.error(`❌ エラーログファイルが見つかりません: ${ERROR_LOG_FILE}`);
    console.error('   先に npm run vercel:logs を実行してください。');
    process.exit(1);
  }
  
  // エラーログを読み込み
  let errorLogs;
  try {
    errorLogs = JSON.parse(fs.readFileSync(ERROR_LOG_FILE, 'utf-8'));
  } catch (error) {
    console.error(`❌ エラーログファイルの読み込みに失敗しました: ${error.message}`);
    process.exit(1);
  }
  
  // エラーがない場合は何もしない
  if (!Array.isArray(errorLogs) || errorLogs.length === 0) {
    console.log('✅ エラーログはありません。Issueは作成しません。');
    process.exit(0);
  }
  
  // 分析結果を読み込み
  let errorAnalysis = {};
  if (fs.existsSync(ANALYSIS_FILE)) {
    try {
      errorAnalysis = JSON.parse(fs.readFileSync(ANALYSIS_FILE, 'utf-8'));
    } catch (error) {
      console.warn('⚠️  分析結果ファイルの読み込みに失敗しました。基本情報のみでIssueを作成します。');
      errorAnalysis = { totalErrors: errorLogs.length };
    }
  } else {
    errorAnalysis = { totalErrors: errorLogs.length };
  }
  
  // GitHub Issueを作成
  const issueNumber = await createErrorIssue(errorAnalysis);
  
  if (issueNumber) {
    console.log(`\n✅ エラーIssueを作成しました: #${issueNumber}`);
    console.log(`\n💡 次のステップ:`);
    console.log(`   1. Issueを確認: gh issue view ${issueNumber}`);
    console.log(`   2. エラーを修正`);
    console.log(`   3. 修正後、Issueをクローズ`);
  } else {
    console.log('\n⚠️  Issueは作成されませんでした。手動で確認してください。');
  }
}

main().catch(error => {
  console.error('❌ 予期しないエラー:', error);
  process.exit(1);
});
