// scripts/copy-config.js
// Vercelデプロイ用: config/フォルダをapi/config/にコピー

const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '../config');
const dest = path.join(__dirname, '../api/config');

// config/フォルダの存在確認
if (!fs.existsSync(src)) {
  console.error('Error: config/フォルダが見つかりません:', src);
  process.exit(1);
}

// api/configディレクトリを作成
if (!fs.existsSync(dest)) {
  fs.mkdirSync(dest, { recursive: true });
  console.log('api/config/ディレクトリを作成しました');
}

// config/内のファイルをコピー
const files = fs.readdirSync(src);
let copiedCount = 0;

files.forEach(file => {
  const srcFile = path.join(src, file);
  const destFile = path.join(dest, file);
  
  // ファイルのみをコピー（ディレクトリはスキップ）
  if (fs.statSync(srcFile).isFile()) {
    fs.copyFileSync(srcFile, destFile);
    copiedCount++;
    console.log(`✓ コピー: ${file}`);
  }
});

console.log(`\n✅ config/フォルダの${copiedCount}個のファイルをapi/config/にコピーしました`);

