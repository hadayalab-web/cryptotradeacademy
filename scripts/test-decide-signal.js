// scripts/test-decide-signal.js
const { decideSignal } = require('../logic/core/marketCore');

// Case1 BUY Trap (もっと極端)
console.log('Case1 BUY Trap',
  decideSignal({
    asset: 'BTC',
    priceUsd: 90000,
    change24h: -4.5,
    onchain: { exchangeNetflow: -8000, minerMPI: -2.0 },
    social: { whaleBias: 1.0, retailFomo: 5, newsImpact: 80 },
  })
);


console.log('Case2 SELL Trap',
  decideSignal({
    asset: 'BTC',
    priceUsd: 95000,
    change24h: +5.0,
    onchain: { exchangeNetflow: 7000, minerMPI: 3.0 },
    social: { whaleBias: -0.9, retailFomo: 90, newsImpact: 70 },
  })
);

