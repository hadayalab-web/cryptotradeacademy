// scripts/save-local-influencers-to-kv.js
// ローカルに保存されたGrokのデータをKVに保存（シンプル版）

const fs = require('fs');
const path = require('path');
const { saveInfluencersToStock } = require('../services/x/influencerStock');

// 深掘り分析に基づく最適配分
const TARGET_DISTRIBUTION = {
  'en': 210,
  'es': 168,
  'pt-br': 168,
  'ar': 112,
  'ja': 98,
  'ko': 84
};

/**
 * ローカルファイルからKVに保存
 */
async function saveLocalToKV() {
  const dataDir = path.join(__dirname, '../data/grok-influencers');
  
  if (!fs.existsSync(dataDir)) {
    console.error('❌ data/grok-influencers ディレクトリが見つかりません');
    console.error('💡 まず discover-and-stock-influencers-840.js を実行してGrokのデータをローカルに保存してください');
    return;
  }
  
  // 検証済みファイルと生データファイルの両方を探す
  const validatedFiles = fs.readdirSync(dataDir).filter(f => f.endsWith('-validated.json'));
  const rawFiles = fs.readdirSync(dataDir).filter(f => f.endsWith('.json') && !f.endsWith('-validated.json'));
  
  const files = validatedFiles.length > 0 ? validatedFiles : rawFiles;
  
  if (files.length === 0) {
    console.error('❌ ファイルが見つかりません');
    console.error(`💡 ディレクトリ: ${dataDir}`);
    console.error('💡 まず discover-and-stock-influencers-840.js を実行してGrokのデータをローカルに保存してください');
    return;
  }
  
  console.log(`📁 検証済みファイル: ${validatedFiles.length}個`);
  console.log(`📁 生データファイル: ${rawFiles.length}個`);
  
  console.log(`📁 検証済みファイル: ${files.length}個`);
  
  for (const filename of files) {
    const langMatch = filename.match(/influencers-(\w+)-/);
    if (!langMatch) {
      console.warn(`⚠️ ファイル名から言語を特定できません: ${filename}`);
      continue;
    }
    
    const lang = langMatch[1];
    const filepath = path.join(dataDir, filename);
    
    console.log(`\n${'='.repeat(80)}`);
    console.log(`[${lang.toUpperCase()}] 処理開始: ${filename}`);
    console.log(`${'='.repeat(80)}`);
    
    try {
      const rawData = fs.readFileSync(filepath, 'utf-8');
      const influencers = JSON.parse(rawData);
      
      if (!Array.isArray(influencers) || influencers.length === 0) {
        console.error(`[${lang.toUpperCase()}] ❌ 有効なデータがありません`);
        continue;
      }
      
      console.log(`[${lang.toUpperCase()}] 📊 読み込み: ${influencers.length}人`);
      console.log(`[${lang.toUpperCase()}] 🔵 サンプル:`, JSON.stringify(influencers[0] || {}, null, 2));
      
      // KVに保存
      const saved = await saveInfluencersToStock(lang, influencers);
      
      if (saved) {
        console.log(`[${lang.toUpperCase()}] ✅✅✅ KVに保存完了: ${influencers.length}人`);
      } else {
        console.error(`[${lang.toUpperCase()}] ❌❌❌ KVへの保存に失敗`);
      }
      
    } catch (error) {
      console.error(`[${lang.toUpperCase()}] ❌ エラー:`, error.message);
      console.error(`[${lang.toUpperCase()}] Stack:`, error.stack);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('処理完了');
  console.log('='.repeat(80));
}

// 実行
saveLocalToKV().catch(error => {
  console.error('❌ 致命的なエラー:', error.message);
  console.error('スタックトレース:', error.stack);
  process.exit(1);
});
