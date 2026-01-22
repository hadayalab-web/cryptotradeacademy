// scripts/optimize-x-profile-bio.js
// XプロフィールBioの160文字制限内最適化

const CURRENT_BIO = 'Defense-First Trading by AIO Media. Powered by CryptoQuant & AI. The 1st "Anti-Trap" protocol for all assets. Stop being liquidity.';

// 160文字制限内の最適化案
const OPTIMIZED_BIOS = [
  {
    text: 'Trap Defence BTC: Defense-First Trading. CryptoQuant + AI. #1 Anti-Trap Protocol. Stop being liquidity! 🚀 [link] #Bitcoin #AITrading',
    length: 0,
    features: ['ブランド名先頭', 'CTA明確', 'ハッシュタグ2個', '絵文字使用']
  },
  {
    text: 'AI-Driven Anti-Trap Defense for Crypto. CryptoQuant Data + Grok AI. Protect from Liquidity Traps. Trade Safe! 👉 [link] #TrapDefence #BTC',
    length: 0,
    features: ['AI強調', 'CTA明確', 'ハッシュタグ2個', '絵文字使用']
  },
  {
    text: 'Trap Defence BTC: The 1st Anti-Trap Protocol. CryptoQuant + AI Real-Time Alerts. No More Traps! Follow for Signals ➡️ [link] #BTC #Trading',
    length: 0,
    features: ['ブランド名先頭', '価値提案明確', 'CTA明確', 'ハッシュタグ2個']
  },
  {
    text: 'Defense-First BTC Trading: CryptoQuant + AI Anti-Trap. Fear & Greed + Network Flows. Stop Liquidity Traps! 🔒 [link] #Web3 #DeFi',
    length: 0,
    features: ['防御優先強調', 'データソース明記', 'CTA明確', 'ハッシュタグ2個']
  },
  {
    text: 'Trap Defence: Stop Liquidity Traps w/ AI & CryptoQuant. BTC Defense Protocol #1. Signals & Alerts. DM for Beta! 📈 [link] #CryptoTrading',
    length: 0,
    features: ['簡潔', 'CTA明確', 'DM誘導', 'ハッシュタグ1個']
  },
  {
    text: 'Trap Defence BTC | Anti-Trap Protocol. CryptoQuant Data + AI. Real-Time BTC Flow Alerts. Protect Your Capital! 🛡️ [link] #Bitcoin',
    length: 0,
    features: ['ブランド名先頭', 'シンプル', '価値提案', 'ハッシュタグ1個']
  },
  {
    text: 'Defense-First Trading by AIO Media. CryptoQuant + AI. Anti-Trap Protocol for BTC & All Assets. Stop being liquidity! 🚀 [link]',
    length: 0,
    features: ['現在のBioベース', 'CTA追加', '絵文字追加', 'リンク追加']
  }
];

// 文字数を計算
OPTIMIZED_BIOS.forEach(bio => {
  bio.length = bio.text.length;
});

console.log('='.repeat(80));
console.log('📊 XプロフィールBio最適化案（160文字制限内）');
console.log('='.repeat(80));
console.log(`\n現在のBio: "${CURRENT_BIO}"`);
console.log(`現在の文字数: ${CURRENT_BIO.length}文字\n`);

console.log('最適化案:\n');
OPTIMIZED_BIOS.forEach((bio, index) => {
  const status = bio.length <= 160 ? '✅' : '❌';
  console.log(`${status} 案${index + 1} (${bio.length}文字):`);
  console.log(`  "${bio.text}"`);
  console.log(`  特徴: ${bio.features.join(', ')}`);
  console.log('');
});

// 160文字以内の最適案を選定
const validBios = OPTIMIZED_BIOS.filter(bio => bio.length <= 160);
const bestBio = validBios.reduce((best, current) => {
  // キーワード密度、CTA明確性、ブランド名の有無を考慮
  let bestScore = 0;
  let currentScore = 0;
  
  if (best.text.includes('Trap Defence BTC')) bestScore += 3;
  if (best.text.includes('[link]')) bestScore += 2;
  if (best.text.includes('🚀') || best.text.includes('👉') || best.text.includes('🛡️')) bestScore += 1;
  
  if (current.text.includes('Trap Defence BTC')) currentScore += 3;
  if (current.text.includes('[link]')) currentScore += 2;
  if (current.text.includes('🚀') || current.text.includes('👉') || current.text.includes('🛡️')) currentScore += 1;
  
  return currentScore > bestScore ? current : best;
}, validBios[0]);

console.log('='.repeat(80));
console.log('🎯 推奨最適案');
console.log('='.repeat(80));
console.log(`\n${bestBio.text}`);
console.log(`文字数: ${bestBio.length}文字（残り${160 - bestBio.length}文字）`);
console.log(`特徴: ${bestBio.features.join(', ')}`);
