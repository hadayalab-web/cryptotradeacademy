#!/usr/bin/env node
/**
 * ドキュメントの日付を更新するスクリプト
 * 既存ドキュメントに日付フォーマット標準を適用
 */

const fs = require('fs');
const path = require('path');

function formatDate(date = new Date()) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateTime(date = new Date()) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function updateDocumentDates(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const date = formatDate();
    const dateTime = formatDateTime();
    
    // 既存の日付フィールドを更新または追加
    const datePatterns = {
      '作成日': formatDate(),
      '作成日時': formatDateTime(),
      '最終更新': formatDateTime(),
    };
    
    let updated = false;
    
    // 各日付フィールドをチェック・更新
    for (const [field, value] of Object.entries(datePatterns)) {
      const pattern = new RegExp(`\\*\\*${field}\\*\\*:\\s*[^\\n]+`, 'g');
      if (pattern.test(content)) {
        // 既存のフィールドを更新
        content = content.replace(pattern, `**${field}**: ${value}`);
        updated = true;
      } else {
        // フィールドが存在しない場合は追加（最初の行の後に追加）
        const firstLineMatch = content.match(/^#\s+.+$/m);
        if (firstLineMatch) {
          const insertPos = content.indexOf('\n', firstLineMatch.index) + 1;
          const dateLine = `**${field}**: ${value}  \n`;
          content = content.slice(0, insertPos) + dateLine + content.slice(insertPos);
          updated = true;
        }
      }
    }
    
    if (updated) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ ${filePath} を更新しました`);
      return true;
    } else {
      console.log(`ℹ️  ${filePath} は更新不要です`);
      return false;
    }
  } catch (error) {
    console.error(`❌ ${filePath} の更新に失敗: ${error.message}`);
    return false;
  }
}

function main() {
  const docsDir = path.join(__dirname, '..', 'docs');
  const files = fs.readdirSync(docsDir).filter(f => f.endsWith('.md'));
  
  console.log('📝 ドキュメントの日付を更新中...\n');
  
  let updatedCount = 0;
  for (const file of files) {
    const filePath = path.join(docsDir, file);
    if (updateDocumentDates(filePath)) {
      updatedCount++;
    }
  }
  
  console.log(`\n✅ ${updatedCount}件のドキュメントを更新しました`);
}

if (require.main === module) {
  main();
}

module.exports = { updateDocumentDates, formatDate, formatDateTime };
