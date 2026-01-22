// scripts/optimize-bio-with-linktree.js
// Linktreeを使用したBio最適化案

const LINKTREE_URL = 'https://linktr.ee/trapdefence';

const bioOptions = [
  {
    text: 'Trap Defence BTC: Defense-First Trading. CryptoQuant + AI. #1 Anti-Trap Protocol. Stop being liquidity! 🚀 ' + LINKTREE_URL + ' #Bitcoin #AITrading',
    length: 0,
    features: ['Linktreeリンク', 'ハッシュタグ2個', '絵文字使用']
  },
  {
    text: 'Trap Defence BTC: Defense-First Trading. CryptoQuant + AI. #1 Anti-Trap Protocol. Stop being liquidity! 🚀 ' + LINKTREE_URL + ' #BTC',
    length: 0,
    features: ['Linktreeリンク', 'ハッシュタグ1個', '絵文字使用', 'シンプル']
  },
  {
    text: 'Trap Defence BTC: Defense-First Trading. CryptoQuant + AI. #1 Anti-Trap Protocol. Stop liquidity! 🚀 ' + LINKTREE_URL + ' #Bitcoin #AI',
    length: 0,
    features: ['Linktreeリンク', 'ハッシュタグ2個', '絵文字使用', 'being削除']
  },
  {
    text: 'Trap Defence BTC: Defense-First Trading. CryptoQuant + AI. #1 Anti-Trap Protocol. Stop being liquidity! ' + LINKTREE_URL + ' #Bitcoin #AITrading',
    length: 0,
    features: ['Linktreeリンク', 'ハッシュタグ2個', '絵文字なし']
  },
  {
    text: 'Trap Defence BTC: Defense-First Trading. CryptoQuant + AI. #1 Anti-Trap Protocol. Stop liquidity! 🚀 ' + LINKTREE_URL + ' #Bitcoin',
    length: 0,
    features: ['Linktreeリンク', 'ハッシュタグ1個', '絵文字使用', 'シンプル']
  }
];

console.log('='.repeat(80));
console.log('📊 Linktreeを使用したBio最適化案（160文字制限内）');
console.log('='.repeat(80));
console.log(`\nLinktree URL: ${LINKTREE_URL}\n`);

bioOptions.forEach((bio, index) => {
  bio.length = bio.text.length;
  const status = bio.length <= 160 ? '✅' : '❌';
  console.log(`${status} 案${index + 1} (${bio.length}文字):`);
  console.log(`  "${bio.text}"`);
  console.log(`  特徴: ${bio.features.join(', ')}`);
  console.log('');
});

// 最適案を選定
const validBios = bioOptions.filter(bio => bio.length <= 160);
const bestBio = validBios.reduce((best, current) => {
  // スコアリング: ブランド名、ハッシュタグ数、絵文字、Linktreeリンク
  let bestScore = 0;
  let currentScore = 0;
  
  if (best.text.includes('Trap Defence BTC')) bestScore += 3;
  if (best.text.match(/#\w+/g)?.length >= 2) bestScore += 2;
  if (best.text.includes('🚀')) bestScore += 1;
  if (best.text.includes('linktr.ee')) bestScore += 2;
  if (best.text.includes('Stop being liquidity')) bestScore += 1;
  
  if (current.text.includes('Trap Defence BTC')) currentScore += 3;
  if (current.text.match(/#\w+/g)?.length >= 2) currentScore += 2;
  if (current.text.includes('🚀')) currentScore += 1;
  if (current.text.includes('linktr.ee')) currentScore += 2;
  if (current.text.includes('Stop being liquidity')) currentScore += 1;
  
  return currentScore > bestScore ? current : best;
}, validBios[0]);

console.log('='.repeat(80));
console.log('🎯 推奨最適案');
console.log('='.repeat(80));
console.log(`\n${bestBio.text}`);
console.log(`文字数: ${bestBio.length}文字（残り${160 - bestBio.length}文字）`);
console.log(`特徴: ${bestBio.features.join(', ')}`);

console.log('\n' + '='.repeat(80));
console.log('📋 Linktreeに追加すべきリンク');
console.log('='.repeat(80));
console.log(`
1. Telegram Bot（メイン）: https://t.me/TrapDefenceBot
2. Whop（購入ページ）: https://whop.com/aio-media-llc
3. Discord（コミュニティ）: [Discordサーバーリンク]
4. YouTube（VSL1）: https://youtu.be/OqvqngJOiXc
5. YouTube（VSL2）: https://youtu.be/fXgVsKhqDjI
6. X（Twitter）: https://x.com/trapdefence
7. ウェブサイト: [ウェブサイトURL]
`);
