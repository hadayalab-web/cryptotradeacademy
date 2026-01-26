// scripts/upload-to-thinkific.js
// 自動生成コンテンツをThinkificにアップロードするスクリプト

const thinkificClient = require('../services/thinkific/client');
const fs = require('fs');
const path = require('path');

/**
 * 日次コンテンツをThinkificにアップロード
 */
async function uploadDailyContentToThinkific(article, images = [], videos = []) {
  try {
    console.log('📤 Thinkificに日次コンテンツをアップロード中...');

    // 1. コースIDを取得
    const courseId = await thinkificClient.getCourseIdByName('Trap Defence BTC - 実践編');
    if (!courseId) {
      throw new Error('コース「Trap Defence BTC - 実践編」が見つかりません');
    }

    // 2. セクションIDを取得（日次分析セクション）
    let sectionId = await thinkificClient.getSectionIdByName(courseId, '日次分析');
    
    // セクションが存在しない場合は作成
    if (!sectionId) {
      const section = await thinkificClient.createSection(courseId, {
        name: '日次分析',
        position: 1,
      });
      sectionId = section.id;
    }

    // 3. チャプターを作成（記事）
    const dateStr = new Date().toLocaleDateString('ja-JP', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    const chapter = await thinkificClient.createChapter(courseId, sectionId, {
      name: `市場分析 - ${dateStr}`,
      content: article,
      position: 1,
    });

    console.log(`✅ チャプターを作成: ${chapter.name}`);

    // 4. 画像をアップロード（ファイルパスの場合）
    for (const image of images) {
      if (typeof image === 'string' && fs.existsSync(image)) {
        // ファイルをS3などにアップロードしてからURLを取得する必要がある
        // ここでは仮の実装
        console.log(`📷 画像をアップロード: ${image}`);
        // await thinkificClient.uploadChapterFile(courseId, sectionId, chapter.id, imageUrl, path.basename(image));
      } else if (typeof image === 'string' && image.startsWith('http')) {
        // URLの場合は直接使用
        console.log(`📷 画像URLを追加: ${image}`);
        // await thinkificClient.uploadChapterFile(courseId, sectionId, chapter.id, image, 'image.png');
      }
    }

    // 5. 動画をアップロード
    for (const video of videos) {
      if (typeof video === 'string' && fs.existsSync(video)) {
        console.log(`🎬 動画をアップロード: ${video}`);
        // await thinkificClient.uploadChapterFile(courseId, sectionId, chapter.id, videoUrl, path.basename(video));
      } else if (typeof video === 'string' && video.startsWith('http')) {
        console.log(`🎬 動画URLを追加: ${video}`);
        // await thinkificClient.uploadChapterFile(courseId, sectionId, chapter.id, video, 'video.mp4');
      }
    }

    console.log('✅ 日次コンテンツのアップロードが完了しました');
    return { courseId, sectionId, chapterId: chapter.id };

  } catch (error) {
    console.error('❌ Thinkificアップロードエラー:', error);
    throw error;
  }
}

/**
 * 週次コンテンツをThinkificにアップロード
 */
async function uploadWeeklyContentToThinkific(summary, report) {
  try {
    console.log('📤 Thinkificに週次コンテンツをアップロード中...');

    // 1. コースIDを取得
    const courseId = await thinkificClient.getCourseIdByName('Trap Defence BTC - 基礎編');
    if (!courseId) {
      throw new Error('コース「Trap Defence BTC - 基礎編」が見つかりません');
    }

    // 2. セクションIDを取得（週次サマリーセクション）
    let sectionId = await thinkificClient.getSectionIdByName(courseId, '週次サマリー');
    
    if (!sectionId) {
      const section = await thinkificClient.createSection(courseId, {
        name: '週次サマリー',
        position: 1,
      });
      sectionId = section.id;
    }

    // 3. チャプターを作成
    const weekRange = getWeekRange();
    const chapter = await thinkificClient.createChapter(courseId, sectionId, {
      name: `週次サマリー - ${weekRange}`,
      content: summary + '\n\n' + report,
      position: 1,
    });

    console.log(`✅ 週次サマリーチャプターを作成: ${chapter.name}`);
    return { courseId, sectionId, chapterId: chapter.id };

  } catch (error) {
    console.error('❌ Thinkificアップロードエラー:', error);
    throw error;
  }
}

/**
 * 週の範囲を取得
 */
function getWeekRange() {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  return `${startOfWeek.toLocaleDateString('ja-JP')} - ${endOfWeek.toLocaleDateString('ja-JP')}`;
}

/**
 * メイン処理
 */
async function main() {
  console.log('🚀 Thinkificアップロードスクリプト\n');
  
  // テスト用のコンテンツ
  const testArticle = `**データ：BTCマイナーの売り枯渇、MPIは極低水準の-1.55——Trap Scoreは「警戒レベル」を示唆**

CryptoQuantの最新オンチェーンデータによると、ビットコイン（BTC）市場は現在、極めて稀な「均衡状態」とマイナーによる強力な「保有姿勢」を示しています。`;

  try {
    // 日次コンテンツのアップロードテスト
    await uploadDailyContentToThinkific(testArticle);
    
    console.log('\n✅ アップロードが完了しました\n');
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

// スクリプト実行
if (require.main === module) {
  main();
}

module.exports = {
  uploadDailyContentToThinkific,
  uploadWeeklyContentToThinkific,
};
