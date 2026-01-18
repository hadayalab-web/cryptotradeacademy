// services/gemini/swipes.js
// Legendary Swipes Library for CryptoTrade Academy
// 世界中の伝説的な広告コピーの「型」を定義

const SWIPES = [
  {
    id: 'two_young_men',
    name: 'The Two Young Men (WSJ)',
    description: '対比構造：同じスタート地点にいた二人の現在の違いを描く',
    structure: 'Introduction of two similar people -> Divergent outcomes -> The "Secret" difference -> Solution',
    promptTemplate: `
Use the "Two Young Men" narrative structure (Wall Street Journal style).
Start with: "On a beautiful late afternoon, two traders sat down to check their portfolios..."
The story must compare two traders:
1. One who trades based on emotions/news (The Loser/Struggler)
2. One who uses Trap Defense/On-chain data (The Winner/Protected)
Explain that the only difference between them is NOT intelligence or capital, but "The Knowledge" (specifically, Trap Defense signals).
Keep it short (2-3 sentences max) and dramatic.
Context: {{context}}
`
  },
  {
    id: 'they_laughed',
    name: 'They Laughed (John Caples)',
    description: '嘲笑からの逆転劇：周囲の反対を押し切って成功する',
    structure: 'Social pressure/Mockery -> Action taken anyway -> Proof/Vindication',
    promptTemplate: `
Use the "They Laughed When I Sat Down" narrative structure.
Start with: "They laughed when I said..."
The story:
1. The protagonist warns about a market trap or decides to "do nothing" (70% standby).
2. Others (Twitter/X crowd) mock him for being bearish/inactive.
3. The market crashes (or trap triggers), vindicating the protagonist.
Keep it short (2-3 sentences max) and dramatic.
Context: {{context}}
`
  },
  {
    id: 'mistakes',
    name: 'Do You Make These Mistakes? (Maxwell Sackheim)',
    description: '問題提起：読者に自分の行動を振り返らせる',
    structure: 'Provocative question -> List of common errors -> The consequence',
    promptTemplate: `
Use the "Do You Make These Mistakes" narrative structure.
Start with: "Do you make these mistakes in..."
The story:
1. Ask if the trader is making common emotional mistakes (FOMO, revenge trading, ignoring on-chain data).
2. Highlight the cost of these mistakes (liquidation, capital loss).
3. Hint that these can be easily avoided.
Keep it short (2-3 sentences max) and provocative.
Context: {{context}}
`
  },
  {
    id: 'news_flash',
    name: 'A Few Hours Ago (News Angle)',
    description: '緊急性と臨場感：直近の出来事にフォーカス',
    structure: 'Time stamp -> Specific event -> Implication',
    promptTemplate: `
Use the "News Flash / A Few Hours Ago" narrative structure.
Start with: "A few hours ago..." or "Just moments ago..."
The story:
1. Report a specific on-chain event (Whale movement, Exchange Inflow, etc.).
2. Explain why most people missed it.
3. State the immediate implication for the reader's capital.
Keep it short (2-3 sentences max) and urgent.
Context: {{context}}
`
  },
  {
    id: 'if_you_are',
    name: 'If You Are... (Qualification)',
    description: 'ターゲットの選別：特定の条件に当てはまる人へのメッセージ',
    structure: 'Qualification -> Problem -> Solution',
    promptTemplate: `
Use the "If You Are..." narrative structure.
Start with: "If you are currently..."
The story:
1. Address traders who are feeling a specific emotion (e.g., "If you are feeling FOMO right now...").
2. Validate that feeling but warn of the danger.
3. Offer the antidote (Data/Discipline).
Keep it short (2-3 sentences max) and empathetic.
Context: {{context}}
`
  }
];

/**
 * ランダムにスワイプを選択する
 * @returns {Object} 選択されたスワイプ
 */
function getRandomSwipe() {
  const randomIndex = Math.floor(Math.random() * SWIPES.length);
  return SWIPES[randomIndex];
}

/**
 * 指定されたIDのスワイプを取得する
 * @param {string} id - スワイプID
 * @returns {Object|null} スワイプオブジェクト
 */
function getSwipeById(id) {
  return SWIPES.find(s => s.id === id) || null;
}

module.exports = {
  SWIPES,
  getRandomSwipe,
  getSwipeById
};
