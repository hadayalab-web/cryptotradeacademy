// scripts/test-thumbnail-loading.js
// サムネイル画像の読み込みテスト

const fs = require('fs');
const path = require('path');

function testThumbnailLoading() {
  console.log('\n' + '='.repeat(80));
  console.log('🖼️ サムネイル画像読み込みテスト');
  console.log('='.repeat(80));
  
  const thumbnails = [
    {
      name: 'VSL1 Thumbnail',
      path: path.join(process.cwd(), 'public/images/thumbnails/vsl1_thumbnail.png')
    },
    {
      name: 'VSL2 Thumbnail',
      path: path.join(process.cwd(), 'public/images/thumbnails/vsl2_thumbnail.png')
    }
  ];
  
  for (const thumbnail of thumbnails) {
    console.log(`\n📸 ${thumbnail.name}`);
    console.log(`   パス: ${thumbnail.path}`);
    
    try {
      if (fs.existsSync(thumbnail.path)) {
        const stats = fs.statSync(thumbnail.path);
        const fileSizeKB = (stats.size / 1024).toFixed(2);
        console.log(`   ✅ ファイルが存在します`);
        console.log(`   📏 ファイルサイズ: ${fileSizeKB} KB`);
        
        // 画像を読み込んでBase64に変換（実際のコードと同じ処理）
        const imageBuffer = fs.readFileSync(thumbnail.path);
        const base64Image = imageBuffer.toString('base64');
        const dataUrl = `data:image/png;base64,${base64Image}`;
        
        console.log(`   ✅ Base64変換成功`);
        console.log(`   📏 Base64長: ${base64Image.length} 文字`);
        console.log(`   📏 Data URL長: ${dataUrl.length} 文字`);
        
        // 最初の50文字を表示（確認用）
        console.log(`   🔍 Data URLプレビュー: ${dataUrl.substring(0, 50)}...`);
      } else {
        console.log(`   ❌ ファイルが見つかりません`);
      }
    } catch (error) {
      console.log(`   ❌ エラー: ${error.message}`);
    }
  }
  
  // フォルダ内の全ファイルを確認
  console.log('\n📁 フォルダ内の全ファイル:');
  console.log('─'.repeat(80));
  try {
    const thumbnailsDir = path.join(process.cwd(), 'public/images/thumbnails');
    const files = fs.readdirSync(thumbnailsDir);
    files.forEach(file => {
      const filePath = path.join(thumbnailsDir, file);
      const stats = fs.statSync(filePath);
      const fileSizeKB = (stats.size / 1024).toFixed(2);
      console.log(`   📄 ${file} (${fileSizeKB} KB)`);
    });
  } catch (error) {
    console.error(`   ❌ フォルダ読み込みエラー: ${error.message}`);
  }
  
  console.log('\n' + '='.repeat(80));
}

testThumbnailLoading();
