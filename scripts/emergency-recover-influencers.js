// scripts/emergency-recover-influencers.js
// 緊急: Grokが集めた760人のリストを復旧

const fs = require('fs');
const path = require('path');
const { saveInfluencersToStock } = require('../services/x/influencerStock');

const OUTPUT_DIR = path.join(__dirname, '..', 'data', 'grok-influencers');

console.log('='.repeat(80));
console.log('🚨 緊急: Grokが集めたインフルエンサーリスト復旧');
console.log('='.repeat(80));
console.log();

// ステップ1: ローカルファイルを探す
console.log('📁 ステップ1: ローカルファイルを確認中...');
if (!fs.existsSync(OUTPUT_DIR)) {
  console.error('❌ ディレクトリが存在しません:', OUTPUT_DIR);
  console.error('💡 Grokが集めたデータがローカルに保存されていません');
  process.exit(1);
}

const files = fs.readdirSync(OUTPUT_DIR)
  .filter(f => f.endsWith('.json') && !f.includes('validated'))
  .map(f => ({
    name: f,
    path: path.join(OUTPUT_DIR, f),
    time: fs.statSync(path.join(OUTPUT_DIR, f)).mtime
  }))
  .sort((a, b) => b.time - a.time);

if (files.length === 0) {
  console.error('❌ JSONファイルが見つかりません');
  console.error('💡 Grokが集めたデータがローカルに保存されていません');
  process.exit(1);
}

console.log(`✅ ${files.length}個のファイルが見つかりました`);
console.log();

// ステップ2: 最新のファイルを読み込む
console.log('📖 ステップ2: 最新のファイルを読み込み中...');
const latestFile = files[0];
console.log(`   ファイル: ${latestFile.name}`);
console.log(`   更新日時: ${latestFile.time.toISOString()}`);
console.log();

let allInfluencers = [];

for (const file of files) {
  try {
    const content = fs.readFileSync(file.path, 'utf-8');
    const data = JSON.parse(content);
    
    if (Array.isArray(data)) {
      console.log(`✅ ${file.name}: ${data.length}人`);
      allInfluencers = allInfluencers.concat(data);
    } else {
      console.warn(`⚠️ ${file.name}: 配列ではありません`);
    }
  } catch (error) {
    console.error(`❌ ${file.name}: 読み込みエラー - ${error.message}`);
  }
}

console.log();
console.log(`📊 合計: ${allInfluencers.length}人のインフルエンサーが見つかりました`);
console.log();

if (allInfluencers.length === 0) {
  console.error('❌ CRITICAL: インフルエンサーが0人です');
  console.error('💡 Grokが集めたデータが失われています');
  process.exit(1);
}

// ステップ3: データ検証
console.log('🔍 ステップ3: データ検証中...');
const validInfluencers = allInfluencers.filter(inf => {
  if (!inf.tweetId) return false;
  const tweetIdStr = String(inf.tweetId).trim();
  if (!/^\d{18,19}$/.test(tweetIdStr)) return false;
  if (!inf.username || !inf.username.trim()) return false;
  if (!inf.tweetText || !inf.tweetText.trim()) return false;
  return true;
});

console.log(`✅ 検証後: ${validInfluencers.length}人（元: ${allInfluencers.length}人）`);
console.log();

if (validInfluencers.length === 0) {
  console.error('❌ CRITICAL: 検証後0人です');
  console.error('💡 Grokが返したデータに問題があります');
  process.exit(1);
}

// ステップ4: 言語別に分類
console.log('🌍 ステップ4: 言語別に分類中...');
const byLang = {};
validInfluencers.forEach(inf => {
  const lang = (inf.lang || 'en').toLowerCase();
  if (!byLang[lang]) {
    byLang[lang] = [];
  }
  byLang[lang].push(inf);
});

console.log('言語別分布:');
Object.entries(byLang).forEach(([lang, infs]) => {
  console.log(`   ${lang.toUpperCase()}: ${infs.length}人`);
});
console.log();

// ステップ5: KVに保存
console.log('💾 ステップ5: KVに保存中...');
const results = [];

for (const [lang, influencers] of Object.entries(byLang)) {
  try {
    console.log(`   [${lang.toUpperCase()}] ${influencers.length}人を保存中...`);
    const saved = await saveInfluencersToStock(lang, influencers);
    
    if (saved) {
      console.log(`   ✅ [${lang.toUpperCase()}] KV保存成功`);
      results.push({ lang, success: true, count: influencers.length });
    } else {
      console.error(`   ❌ [${lang.toUpperCase()}] KV保存失敗`);
      results.push({ lang, success: false, count: influencers.length });
    }
  } catch (error) {
    console.error(`   ❌ [${lang.toUpperCase()}] エラー: ${error.message}`);
    results.push({ lang, success: false, count: influencers.length, error: error.message });
  }
}

console.log();
console.log('='.repeat(80));
console.log('📊 復旧結果');
console.log('='.repeat(80));

const success = results.filter(r => r.success);
const failed = results.filter(r => !r.success);
const totalSaved = success.reduce((sum, r) => sum + r.count, 0);

console.log(`✅ 成功: ${success.length}言語 (${totalSaved}人)`);
console.log(`❌ 失敗: ${failed.length}言語`);

if (success.length > 0) {
  console.log();
  console.log('成功した言語:');
  success.forEach(r => {
    console.log(`   ✅ ${r.lang.toUpperCase()}: ${r.count}人`);
  });
}

if (failed.length > 0) {
  console.log();
  console.log('失敗した言語:');
  failed.forEach(r => {
    console.log(`   ❌ ${r.lang.toUpperCase()}: ${r.count}人 - ${r.error || 'KV保存失敗'}`);
  });
}

console.log();
console.log('='.repeat(80));

if (totalSaved > 0) {
  console.log(`✅ 復旧成功: ${totalSaved}人がKVに保存されました`);
  console.log('💡 次のステップ: KVストック確認');
  console.log('   node scripts/check-kv-stock-status.js');
} else {
  console.error('❌ CRITICAL: 復旧失敗 - KVに保存できませんでした');
  console.error('💡 ローカルファイルは保存済み:', OUTPUT_DIR);
  console.error('💡 KV接続を確認してください');
  process.exit(1);
}
