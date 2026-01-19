// scripts/find-telegram-crypto-groups.js
// Telegram Cryptoグループを探すスクリプト

require('dotenv').config({ path: '.env' });

const https = require('https');

/**
 * TGStatからCryptoグループを検索
 */
async function searchTGStat(query, lang = 'en') {
  return new Promise((resolve, reject) => {
    // TGStat APIは存在しないため、手動で検索する必要がある
    // ここでは検索方法を案内するのみ
    console.log(`\n📋 TGStatで検索: https://tgstat.com/crypto?q=${encodeURIComponent(query)}`);
    console.log(`   言語フィルタ: ${lang}`);
    resolve([]);
  });
}

/**
 * Telegramグループ探索の案内
 */
function showGroupSearchGuide() {
  console.log('🔍 Telegram Cryptoグループ探索ガイド\n');
  console.log('='.repeat(80));
  
  console.log('\n📱 方法1: Telegramアプリ内で検索');
  console.log('   1. Telegramアプリを開く');
  console.log('   2. 検索バーで以下を検索:');
  console.log('      - "Bitcoin trading"');
  console.log('      - "Crypto signals"');
  console.log('      - "BTC analysis"');
  console.log('      - 言語別: "Bitcoin español", "Bitcoin 日本語", "비트코인"');
  console.log('   3. グループタイプを確認（Group = 監視可能、Channel = 監視不可）');
  
  console.log('\n🌐 方法2: TGStatで検索');
  console.log('   URL: https://tgstat.com/crypto');
  console.log('   - Cryptoグループをカテゴリ別に検索');
  console.log('   - メンバー数、アクティビティ、言語でフィルタ可能');
  
  console.log('\n📋 方法3: 既存グループから拡張');
  console.log('   1. 既に参加しているCryptoグループを確認');
  console.log('   2. そのグループのメンバーが参加している他のグループを確認');
  console.log('   3. 関連グループに参加');
  
  console.log('\n🤖 方法4: Botで自動取得');
  console.log('   1. 監視したいグループにBotを追加');
  console.log('   2. 以下のコマンドでグループIDを取得:');
  console.log('      node scripts/get-telegram-group-id.js');
  
  console.log('\n' + '='.repeat(80));
  
  console.log('\n✅ 探索すべきグループの条件:');
  console.log('   - グループ（Group）であること（チャンネルではない）');
  console.log('   - メンバー数: 1,000人以上');
  console.log('   - 言語: 対象言語（EN, ES, PT-BR, AR, JA, KO）');
  console.log('   - トピック: Bitcoin/Crypto関連');
  console.log('   - アクティビティ: 1日10投稿以上');
  
  console.log('\n📝 グループID取得後の設定:');
  console.log('   Vercel環境変数に追加:');
  console.log('   TELEGRAM_MONITORED_GROUPS_EN=-1001234567890,-1001234567891');
  console.log('   TELEGRAM_MONITORED_GROUPS_ES=-1001234567892');
  console.log('   # ... 他の言語も同様');
}

/**
 * 言語別検索キーワードを表示
 */
function showLanguageKeywords() {
  console.log('\n🎯 言語別探索キーワード:\n');
  
  const keywords = {
    en: ['Bitcoin trading signals', 'BTC analysis group', 'Crypto trading community', 'Bitcoin discussion'],
    es: ['Bitcoin trading español', 'Señales de Bitcoin', 'Comunidad crypto', 'Bitcoin Latino'],
    'pt-br': ['Bitcoin trading Brasil', 'Sinais de Bitcoin', 'Comunidade crypto', 'Bitcoin Brasil'],
    ar: ['تداول البيتكوين', 'إشارات البيتكوين', 'مجتمع البيتكوين'],
    ja: ['ビットコイントレード', 'BTC分析', '暗号通貨コミュニティ'],
    ko: ['비트코인 트레이딩', 'BTC 시그널', '암호화폐 커뮤니티'],
  };
  
  for (const [lang, words] of Object.entries(keywords)) {
    console.log(`   ${lang.toUpperCase()}:`);
    words.forEach(word => console.log(`     - ${word}`));
    console.log('');
  }
}

// 実行
if (require.main === module) {
  showGroupSearchGuide();
  showLanguageKeywords();
  
  console.log('\n📚 詳細は `docs/TELEGRAM_GROUPS_FINDER.md` を参照してください。\n');
}

module.exports = { showGroupSearchGuide, showLanguageKeywords };
