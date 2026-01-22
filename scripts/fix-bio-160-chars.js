// scripts/fix-bio-160-chars.js
// 161文字のBioを160文字以内に修正

const currentBio = 'Trap Defence BTC: Defense-First Trading. CryptoQuant + AI. #1 Anti-Trap Protocol. Stop being liquidity! 🚀 #Bitcoin #AITrading';

console.log('='.repeat(80));
console.log('📊 Bio 160文字制限修正案');
console.log('='.repeat(80));
console.log(`\n現在のBio: "${currentBio}"`);
console.log(`現在の文字数: ${currentBio.length}文字（1文字超過）\n`);

const options = [
  {
    text: 'Trap Defence BTC: Defense-First Trading. CryptoQuant + AI. #1 Anti-Trap Protocol. Stop being liquidity! 🚀 #Bitcoin #AI',
    change: '#AITrading → #AI（7文字削減）',
    reason: 'ハッシュタグ短縮、検索性維持'
  },
  {
    text: 'Trap Defence BTC: Defense-First Trading. CryptoQuant + AI. #1 Anti-Trap Protocol. Stop being liquidity! 🚀 #BTC #AITrading',
    change: '#Bitcoin → #BTC（4文字削減）',
    reason: 'ハッシュタグ短縮、検索性維持'
  },
  {
    text: 'Trap Defence BTC: Defense-First Trading. CryptoQuant + AI. #1 Anti-Trap Protocol. Stop being liquidity! #Bitcoin #AITrading',
    change: '絵文字🚀削除（2文字削減）',
    reason: '絵文字削除、ハッシュタグ維持'
  },
  {
    text: 'Trap Defence BTC: Defense-First Trading. CryptoQuant + AI. #1 Anti-Trap Protocol. Stop being liquidity! 🚀 #Bitcoin',
    change: '#AITrading削除（10文字削減）',
    reason: 'ハッシュタグ1つ削除、シンプル化'
  },
  {
    text: 'Trap Defence BTC: Defense-First Trading. CryptoQuant + AI. #1 Anti-Trap Protocol. Stop liquidity! 🚀 #Bitcoin #AITrading',
    change: 'being削除（6文字削減）',
    reason: '文法的に問題なし、自然'
  }
];

console.log('修正案:\n');
options.forEach((opt, index) => {
  opt.length = opt.text.length;
  const status = opt.length <= 160 ? '✅' : '❌';
  console.log(`${status} 案${index + 1} (${opt.length}文字):`);
  console.log(`  "${opt.text}"`);
  console.log(`  変更: ${opt.change}`);
  console.log(`  理由: ${opt.reason}`);
  console.log('');
});

// 最適案を選定
const validOptions = options.filter(opt => opt.length <= 160);
const bestOption = validOptions.reduce((best, current) => {
  // スコアリング: ブランド名、ハッシュタグ数、絵文字、検索性
  let bestScore = 0;
  let currentScore = 0;
  
  if (best.text.includes('Trap Defence BTC')) bestScore += 3;
  if (best.text.match(/#\w+/g)?.length >= 2) bestScore += 2;
  if (best.text.includes('🚀')) bestScore += 1;
  if (best.text.includes('Stop being liquidity')) bestScore += 1;
  
  if (current.text.includes('Trap Defence BTC')) currentScore += 3;
  if (current.text.match(/#\w+/g)?.length >= 2) currentScore += 2;
  if (current.text.includes('🚀')) currentScore += 1;
  if (current.text.includes('Stop being liquidity')) currentScore += 1;
  
  return currentScore > bestScore ? current : best;
}, validOptions[0]);

console.log('='.repeat(80));
console.log('🎯 推奨修正案');
console.log('='.repeat(80));
console.log(`\n${bestOption.text}`);
console.log(`文字数: ${bestOption.length}文字（残り${160 - bestOption.length}文字）`);
console.log(`変更: ${bestOption.change}`);
console.log(`理由: ${bestOption.reason}`);
