#!/usr/bin/env node
// scripts/verify-syntax.js
// 構文エラーチェックスクリプト

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const API_DIR = path.join(__dirname, '..', 'api');
const files = fs.readdirSync(API_DIR)
  .filter(file => file.endsWith('.js'))
  .map(file => path.join(API_DIR, file));

let hasError = false;
const errors = [];

console.log('🔍 Checking syntax for API files...\n');

files.forEach(file => {
  const relativePath = path.relative(process.cwd(), file);
  try {
    execSync(`node --check "${file}"`, { stdio: 'pipe' });
    console.log(`✅ ${relativePath}: Syntax OK`);
  } catch (error) {
    console.error(`❌ ${relativePath}: Syntax Error`);
    console.error(error.stdout?.toString() || error.stderr?.toString());
    errors.push({ file: relativePath, error: error.message });
    hasError = true;
  }
});

// 変数の重複宣言チェック
console.log('\n🔍 Checking for duplicate variable declarations...\n');

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf-8');
  const lines = content.split('\n');
  const variableDeclarations = new Map();
  
  lines.forEach((line, index) => {
    // let/const/var の宣言を検出
    const letMatch = line.match(/^\s*(let|const|var)\s+(\w+)/);
    if (letMatch) {
      const varName = letMatch[2];
      const lineNum = index + 1;
      
      if (variableDeclarations.has(varName)) {
        const prevLine = variableDeclarations.get(varName);
        console.error(`❌ ${path.relative(process.cwd(), file)}:${lineNum}: Duplicate declaration of '${varName}' (previously declared at line ${prevLine})`);
        errors.push({
          file: path.relative(process.cwd(), file),
          line: lineNum,
          variable: varName,
          type: 'duplicate_declaration'
        });
        hasError = true;
      } else {
        variableDeclarations.set(varName, lineNum);
      }
    }
  });
});

if (hasError) {
  console.error(`\n❌ Found ${errors.length} error(s)`);
  process.exit(1);
} else {
  console.log('\n✅ All syntax checks passed!');
  process.exit(0);
}
