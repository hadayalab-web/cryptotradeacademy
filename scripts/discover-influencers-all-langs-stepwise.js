// scripts/discover-influencers-all-langs-stepwise.js
// 全言語を段階的に実行するオーケストレーター

const { spawn } = require('child_process');
const path = require('path');

const TARGET_DISTRIBUTION = {
  'en': 210,
  'es': 168,
  'pt-br': 168,
  'ar': 112,
  'ja': 98,
  'ko': 84
};

const LANGUAGES = Object.keys(TARGET_DISTRIBUTION);

/**
 * 一言語ずつ実行
 */
async function runForLanguage(lang, targetCount) {
  return new Promise((resolve, reject) => {
    console.log('\n' + '='.repeat(80));
    console.log(`🚀 ${lang.toUpperCase()} の処理を開始（目標: ${targetCount}人）`);
    console.log('='.repeat(80));
    
    const scriptPath = path.join(__dirname, 'discover-influencers-single-lang-robust.js');
    const child = spawn('node', [scriptPath, lang, targetCount.toString()], {
      stdio: 'inherit',
      shell: true
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${lang.toUpperCase()} の処理が完了しました`);
        resolve();
      } else {
        console.error(`❌ ${lang.toUpperCase()} の処理が失敗しました（コード: ${code}）`);
        reject(new Error(`Process exited with code ${code}`));
      }
    });
    
    child.on('error', (error) => {
      console.error(`❌ ${lang.toUpperCase()} の処理でエラー: ${error.message}`);
      reject(error);
    });
  });
}

/**
 * メイン処理
 */
async function main() {
  console.log('='.repeat(80));
  console.log('インフルエンサーリスト構築（全言語・段階的実行）');
  console.log('='.repeat(80));
  console.log(`対象言語: ${LANGUAGES.join(', ')}`);
  console.log(`合計目標数: ${Object.values(TARGET_DISTRIBUTION).reduce((a, b) => a + b, 0)}人`);
  
  // 一言語ずつ実行（順次実行で確実に）
  for (const lang of LANGUAGES) {
    const targetCount = TARGET_DISTRIBUTION[lang];
    
    try {
      await runForLanguage(lang, targetCount);
      
      // 言語間で少し待機（レート制限回避）
      if (lang !== LANGUAGES[LANGUAGES.length - 1]) {
        console.log('\n⏳ 次の言語に進む前に5秒待機...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    } catch (error) {
      console.error(`\n❌ ${lang.toUpperCase()} の処理でエラーが発生しました`);
      console.error(`エラー: ${error.message}`);
      console.log(`\n⚠️  次の言語に進みます...`);
      // エラーが発生しても次の言語に進む
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('✅ 全言語の処理が完了しました');
  console.log('='.repeat(80));
}

main().catch(error => {
  console.error('❌ 致命的エラー:', error);
  process.exit(1);
});
