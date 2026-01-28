// scripts/copy-telegram-messages.js
// Vercelデプロイ用: 
// 1. services/telegram/messages/をapi/services/telegram/messages/にコピー
// 2. config/をapi/config/にコピー

const fs = require('fs');
const path = require('path');

// ディレクトリ構造を作成
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// ファイルをコピー
function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

// ディレクトリを再帰的にコピー
function copyDir(src, dest) {
  ensureDir(dest);
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      copyFile(srcPath, destPath);
    }
  }
}

// コピー実行関数
function copyDirectory(srcDir, destDir, description) {
  if (fs.existsSync(srcDir)) {
    copyDir(srcDir, destDir);
    console.log(`✅ Copied ${description}: ${srcDir} → ${destDir}`);
    return true;
  } else {
    console.warn(`⚠️ Source directory not found: ${srcDir}`);
    return false;
  }
}

// 1. services/telegram/messages/をコピー
const telegramSrcDir = path.join(__dirname, '../services/telegram/messages');
const telegramDestDir = path.join(__dirname, '../api/services/telegram/messages');
const telegramCopied = copyDirectory(telegramSrcDir, telegramDestDir, 'Telegram messages');

// 2. config/をコピー
const configSrcDir = path.join(__dirname, '../config');
const configDestDir = path.join(__dirname, '../api/config');
const configCopied = copyDirectory(configSrcDir, configDestDir, 'Config files');

// エラー処理
if (!telegramCopied) {
  console.error('❌ Failed to copy Telegram messages directory');
  process.exit(1);
}

if (!configCopied) {
  console.error('❌ Failed to copy config directory');
  process.exit(1);
}

console.log('✅ Build completed successfully');
