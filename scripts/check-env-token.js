#!/usr/bin/env node
/**
 * .envファイル内のVercelトークンを確認
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

console.log('🔍 .envファイル内のVercelトークンを確認中...\n');

const VERCEL_TOKEN = process.env.VERCEL_TOKEN || process.env.VERCEL_API_TOKEN;
const VERCEL_AUTH_TOKEN = process.env.VERCEL_AUTH_TOKEN;

if (VERCEL_TOKEN) {
  const masked = VERCEL_TOKEN.substring(0, 10) + '...' + VERCEL_TOKEN.substring(VERCEL_TOKEN.length - 4);
  console.log('✅ VERCEL_TOKEN: 設定済み');
  console.log(`   マスク済みトークン: ${masked}`);
  console.log(`   長さ: ${VERCEL_TOKEN.length} 文字`);
} else {
  console.log('❌ VERCEL_TOKEN: 未設定');
}

if (VERCEL_AUTH_TOKEN) {
  const masked = VERCEL_AUTH_TOKEN.substring(0, 10) + '...' + VERCEL_AUTH_TOKEN.substring(VERCEL_AUTH_TOKEN.length - 4);
  console.log('✅ VERCEL_AUTH_TOKEN: 設定済み');
  console.log(`   マスク済みトークン: ${masked}`);
  console.log(`   長さ: ${VERCEL_AUTH_TOKEN.length} 文字`);
} else {
  console.log('❌ VERCEL_AUTH_TOKEN: 未設定');
}

console.log();

if (VERCEL_TOKEN || VERCEL_AUTH_TOKEN) {
  console.log('✅ Vercelトークンが見つかりました！');
  console.log('📝 確認スクリプトを実行します...\n');
  console.log('='.repeat(80));
} else {
  console.log('⚠️  Vercelトークンが見つかりませんでした');
  console.log('📝 .envファイルに以下を追加してください:');
  console.log('   VERCEL_TOKEN=your-vercel-api-token-here');
  console.log();
  process.exit(1);
}
