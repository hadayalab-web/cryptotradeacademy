#!/usr/bin/env node
/**
 * カスタムサムネイル画像を設定するスクリプト
 * ユーザーが指定した画像ファイルを適切な場所にコピー
 */

const fs = require('fs');
const path = require('path');

// コピー元とコピー先のマッピング
const imageMappings = [
  {
    source: 'C:\\Users\\chiba\\Downloads\\Trap Defence BTC Minimal Opt-in.png',
    destination: path.join(__dirname, '..', 'public', 'images', 'thumbnails', 'vsl1_thumbnail.png'),
    description: 'VSL1のサムネ'
  },
  {
    source: 'C:\\Users\\chiba\\Downloads\\Trap Defence BTC Minimal Coupon.png',
    destination: path.join(__dirname, '..', 'public', 'images', 'thumbnails', 'vsl2_thumbnail.png'),
    description: 'VSL2のサムネ'
  },
  {
    source: 'C:\\Users\\chiba\\Downloads\\Whop_Trap Defense BTC.png',
    destination: path.join(__dirname, '..', 'public', 'images', 'thumbnails', 'cartoon_manipulation.png'),
    description: 'TG/Xの投稿用画像'
  }
];

async function setupThumbnails() {
  console.log('🖼️  カスタムサムネイル画像の設定を開始します...\n');

  // 出力ディレクトリの確認・作成
  const outputDir = path.join(__dirname, '..', 'public', 'images', 'thumbnails');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`✅ ディレクトリを作成しました: ${outputDir}`);
  }

  let successCount = 0;
  let failCount = 0;

  for (const mapping of imageMappings) {
    try {
      // ソースファイルの存在確認
      if (!fs.existsSync(mapping.source)) {
        console.error(`❌ ファイルが見つかりません: ${mapping.source}`);
        failCount++;
        continue;
      }

      // ファイルをコピー
      fs.copyFileSync(mapping.source, mapping.destination);
      console.log(`✅ ${mapping.description}`);
      console.log(`   ${mapping.source}`);
      console.log(`   → ${mapping.destination}\n`);
      successCount++;

    } catch (error) {
      console.error(`❌ エラー: ${mapping.description}`);
      console.error(`   ファイル: ${mapping.source}`);
      console.error(`   エラー内容: ${error.message}\n`);
      failCount++;
    }
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✨ 設定完了: 成功 ${successCount}件, 失敗 ${failCount}件`);
  
  if (successCount === imageMappings.length) {
    console.log('\n🎉 すべての画像が正常に設定されました！');
    console.log('   次回のVSL1/VSL2配信から、これらの画像が使用されます。');
  } else if (failCount > 0) {
    console.log('\n⚠️  一部の画像の設定に失敗しました。');
    console.log('   ファイルパスと権限を確認してください。');
  }
}

setupThumbnails();
