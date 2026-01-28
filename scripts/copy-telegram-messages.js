// scripts/copy-telegram-messages.js
// Vercelデプロイ用: services/telegram/messages/をapi/services/telegram/messages/にコピー

const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../services/telegram/messages');
const destDir = path.join(__dirname, '../api/services/telegram/messages');

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

// コピー実行
if (fs.existsSync(srcDir)) {
  copyDir(srcDir, destDir);
  console.log(`✅ Copied ${srcDir} to ${destDir}`);
  console.log(`✅ ContentFilters should be available at: ${path.join(destDir, 'shared/contentFilters.js')}`);
} else {
  console.warn(`⚠️ Source directory not found: ${srcDir}`);
  process.exit(1);
}
