// scripts/check-ja-channel-ids.js
// JA版のチャンネルID設定を確認するスクリプト

// 環境変数を読み込む
const path = require('path');
const dotenv = require('dotenv');

// 親ディレクトリの.envを読み込む（優先）
const parentEnvPath = path.resolve(__dirname, '..', '..', '.env');
if (require('fs').existsSync(parentEnvPath)) {
  dotenv.config({ path: parentEnvPath, override: false });
}

// cryptosignal-ai/.envも読み込む（存在する場合、上書き）
const localEnvPath = path.resolve(__dirname, '..', '.env');
if (require('fs').existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath, override: true });
}

// デフォルトの.envも読み込む（現在のディレクトリ）
dotenv.config({ override: false });

console.log('🔍 JA版チャンネルID設定確認\n');
console.log('='.repeat(80));

// 正しい設定値（ユーザー提供の情報から）
const CORRECT_PAID_CHANNEL_ID = '-1003451216720'; // 有料版（Regular Briefing）
const CORRECT_MINIMAL_CHANNEL_ID = '-1003423418139'; // 無料版（Minimal Version）

// 現在の設定値
const currentPaidChannelId = process.env.TELEGRAM_CHAT_ID_BTC_JA;
const currentMinimalChannelId = process.env.TELEGRAM_CHAT_ID_MINIMAL_JA;

console.log('\n📋 現在の設定:');
console.log(`  TELEGRAM_CHAT_ID_BTC_JA: ${currentPaidChannelId || '❌ 未設定'}`);
console.log(`  TELEGRAM_CHAT_ID_MINIMAL_JA: ${currentMinimalChannelId || '❌ 未設定'}`);

console.log('\n✅ 正しい設定:');
console.log(`  TELEGRAM_CHAT_ID_BTC_JA: ${CORRECT_PAID_CHANNEL_ID} (有料版 / Regular Briefing)`);
console.log(`  TELEGRAM_CHAT_ID_MINIMAL_JA: ${CORRECT_MINIMAL_CHANNEL_ID} (無料版 / Minimal Version)`);

console.log('\n' + '='.repeat(80));

// チェック
let hasError = false;

if (!currentPaidChannelId) {
  console.log('\n❌ エラー: TELEGRAM_CHAT_ID_BTC_JA が設定されていません');
  hasError = true;
} else if (currentPaidChannelId !== CORRECT_PAID_CHANNEL_ID) {
  console.log('\n❌ エラー: TELEGRAM_CHAT_ID_BTC_JA の値が正しくありません');
  console.log(`   現在: ${currentPaidChannelId}`);
  console.log(`   正しい値: ${CORRECT_PAID_CHANNEL_ID}`);
  
  if (currentPaidChannelId === CORRECT_MINIMAL_CHANNEL_ID) {
    console.log('   ⚠️  無料版チャンネルIDが設定されています！値が逆になっています。');
  }
  hasError = true;
}

if (!currentMinimalChannelId) {
  console.log('\n❌ エラー: TELEGRAM_CHAT_ID_MINIMAL_JA が設定されていません');
  hasError = true;
} else if (currentMinimalChannelId !== CORRECT_MINIMAL_CHANNEL_ID) {
  console.log('\n❌ エラー: TELEGRAM_CHAT_ID_MINIMAL_JA の値が正しくありません');
  console.log(`   現在: ${currentMinimalChannelId}`);
  console.log(`   正しい値: ${CORRECT_MINIMAL_CHANNEL_ID}`);
  
  if (currentMinimalChannelId === CORRECT_PAID_CHANNEL_ID) {
    console.log('   ⚠️  有料版チャンネルIDが設定されています！値が逆になっています。');
  }
  hasError = true;
}

// 値が逆になっているかチェック
if (currentPaidChannelId === CORRECT_MINIMAL_CHANNEL_ID && 
    currentMinimalChannelId === CORRECT_PAID_CHANNEL_ID) {
  console.log('\n🔴 重大な問題: チャンネルIDが完全に逆になっています！');
  console.log('   有料版チャンネルに無料版IDが設定されています');
  console.log('   無料版チャンネルに有料版IDが設定されています');
  hasError = true;
}

if (!hasError) {
  console.log('\n✅ 設定は正しいです！');
} else {
  console.log('\n📝 修正方法:');
  console.log('   1. Vercel Dashboardにアクセス');
  console.log('   2. Settings → Environment Variables を開く');
  console.log('   3. 以下のように設定:');
  console.log(`      TELEGRAM_CHAT_ID_BTC_JA=${CORRECT_PAID_CHANNEL_ID}`);
  console.log(`      TELEGRAM_CHAT_ID_MINIMAL_JA=${CORRECT_MINIMAL_CHANNEL_ID}`);
  console.log('   4. 保存して再デプロイ');
}

console.log('\n' + '='.repeat(80));
