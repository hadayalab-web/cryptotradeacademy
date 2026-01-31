// scripts/analyze-grok-response.js
// Grokのレスポンスを分析

const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '..', 'data', 'grok-influencers');

function analyzeGrokResponse(filePath) {
  console.log('='.repeat(80));
  console.log('Grokレスポンス分析');
  console.log('='.repeat(80));
  console.log(`ファイル: ${filePath}`);
  console.log();
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ ファイルが見つかりません: ${filePath}`);
    return;
  }
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    
    if (!Array.isArray(data)) {
      console.error('❌ データが配列ではありません');
      console.log('データ型:', typeof data);
      console.log('データ:', JSON.stringify(data, null, 2).substring(0, 500));
      return;
    }
    
    console.log(`✅ インフルエンサー数: ${data.length}人`);
    console.log();
    
    // データ品質分析
    const analysis = {
      total: data.length,
      withTweetId: 0,
      validTweetId: 0,
      withUsername: 0,
      withTweetText: 0,
      withEngagementRate: 0,
      withFollowerCount: 0,
      validData: 0,
      invalidData: []
    };
    
    data.forEach((inf, index) => {
      // tweetIdチェック
      if (inf.tweetId) {
        analysis.withTweetId++;
        const tweetIdStr = String(inf.tweetId).trim();
        if (/^\d{18,19}$/.test(tweetIdStr)) {
          analysis.validTweetId++;
        } else {
          analysis.invalidData.push({
            index,
            username: inf.username || 'N/A',
            reason: `Invalid tweetId: ${tweetIdStr} (length: ${tweetIdStr.length})`,
            tweetId: tweetIdStr
          });
        }
      } else {
        analysis.invalidData.push({
          index,
          username: inf.username || 'N/A',
          reason: 'Missing tweetId'
        });
      }
      
      // usernameチェック
      if (inf.username && inf.username.trim()) {
        analysis.withUsername++;
      } else {
        analysis.invalidData.push({
          index,
          username: inf.username || 'N/A',
          reason: 'Missing or empty username'
        });
      }
      
      // tweetTextチェック
      if (inf.tweetText && inf.tweetText.trim()) {
        analysis.withTweetText++;
      } else {
        analysis.invalidData.push({
          index,
          username: inf.username || 'N/A',
          reason: 'Missing or empty tweetText'
        });
      }
      
      // engagementRateチェック
      if (inf.engagementRate !== undefined && inf.engagementRate !== null) {
        analysis.withEngagementRate++;
      }
      
      // followerCountチェック
      if (inf.followerCount !== undefined && inf.followerCount !== null) {
        analysis.withFollowerCount++;
      }
      
      // 完全に有効なデータ
      if (inf.tweetId && /^\d{18,19}$/.test(String(inf.tweetId).trim()) &&
          inf.username && inf.username.trim() &&
          inf.tweetText && inf.tweetText.trim()) {
        analysis.validData++;
      }
    });
    
    console.log('📊 データ品質分析:');
    console.log(`   - 総数: ${analysis.total}人`);
    console.log(`   - tweetIdあり: ${analysis.withTweetId}人 (${((analysis.withTweetId/analysis.total)*100).toFixed(1)}%)`);
    console.log(`   - 有効なtweetId: ${analysis.validTweetId}人 (${((analysis.validTweetId/analysis.total)*100).toFixed(1)}%)`);
    console.log(`   - usernameあり: ${analysis.withUsername}人 (${((analysis.withUsername/analysis.total)*100).toFixed(1)}%)`);
    console.log(`   - tweetTextあり: ${analysis.withTweetText}人 (${((analysis.withTweetText/analysis.total)*100).toFixed(1)}%)`);
    console.log(`   - engagementRateあり: ${analysis.withEngagementRate}人 (${((analysis.withEngagementRate/analysis.total)*100).toFixed(1)}%)`);
    console.log(`   - followerCountあり: ${analysis.withFollowerCount}人 (${((analysis.withFollowerCount/analysis.total)*100).toFixed(1)}%)`);
    console.log(`   - 完全に有効なデータ: ${analysis.validData}人 (${((analysis.validData/analysis.total)*100).toFixed(1)}%)`);
    console.log();
    
    if (analysis.invalidData.length > 0) {
      console.log(`❌ 無効なデータ: ${analysis.invalidData.length}件`);
      console.log();
      console.log('無効なデータの詳細:');
      analysis.invalidData.slice(0, 10).forEach(item => {
        console.log(`   [${item.index}] @${item.username}: ${item.reason}`);
        if (item.tweetId) {
          console.log(`       tweetId: ${item.tweetId} (length: ${item.tweetId.length})`);
        }
      });
      if (analysis.invalidData.length > 10) {
        console.log(`   ... 他 ${analysis.invalidData.length - 10}件`);
      }
      console.log();
    }
    
    // サンプルデータ表示
    if (analysis.validData > 0) {
      const validSample = data.find(inf => 
        inf.tweetId && /^\d{18,19}$/.test(String(inf.tweetId).trim()) &&
        inf.username && inf.username.trim() &&
        inf.tweetText && inf.tweetText.trim()
      );
      
      if (validSample) {
        console.log('✅ 有効なサンプルデータ:');
        console.log(JSON.stringify(validSample, null, 2));
        console.log();
      }
    }
    
    // 無効なサンプルデータ表示
    if (analysis.invalidData.length > 0) {
      const invalidSample = data[analysis.invalidData[0].index];
      console.log('❌ 無効なサンプルデータ:');
      console.log(JSON.stringify(invalidSample, null, 2));
      console.log();
    }
    
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
    console.error('スタック:', error.stack);
  }
}

// 最新のファイルを探す
function findLatestFile(lang) {
  if (!fs.existsSync(OUTPUT_DIR)) {
    console.error(`❌ ディレクトリが存在しません: ${OUTPUT_DIR}`);
    return null;
  }
  
  const files = fs.readdirSync(OUTPUT_DIR)
    .filter(f => f.startsWith(`influencers-${lang}-`) && f.endsWith('.json'))
    .map(f => ({
      name: f,
      path: path.join(OUTPUT_DIR, f),
      time: fs.statSync(path.join(OUTPUT_DIR, f)).mtime
    }))
    .sort((a, b) => b.time - a.time);
  
  if (files.length === 0) {
    console.error(`❌ ${lang}のファイルが見つかりません`);
    return null;
  }
  
  return files[0].path;
}

// メイン処理
const lang = process.argv[2] || 'en';
const filePath = process.argv[3] || findLatestFile(lang);

if (!filePath) {
  console.error('❌ ファイルが見つかりません');
  console.error('使用方法: node scripts/analyze-grok-response.js [lang] [filePath]');
  process.exit(1);
}

analyzeGrokResponse(filePath);
