// services/grok/psychologicalSupport.js
// Dr. Grokの心理分析サポート機能
// USP3: X解析からユーザーのリアルタイムセンチメントを予測し診断、心理分析によるサポートを提供

const { analyzeXSentimentLive } = require('./client');
const { analyzeXSentimentHighResolutionCompat } = require('./highResolution');

/**
 * ユーザーセンチメントを診断し、心理的サポートを提供
 * 
 * @param {Object} options - 診断オプション
 * @param {string} options.lang - 言語コード
 * @param {Object} options.marketData - 市場データ（価格、変動率など）
 * @param {Object} options.xSentiment - Xセンチメントデータ
 * @param {Object} options.highResX - 高解像度Xセンチメントデータ（オプション）
 * @returns {Promise<Object>} 心理的サポート診断結果
 */
async function diagnoseUserSentiment(options = {}) {
  const {
    lang = 'en',
    marketData = {},
    xSentiment = {},
    highResX = null,
  } = options;

  try {
    // ===== 1. ユーザーセンチメントの予測 =====
    // X上のトレーダーの発言から、典型的なユーザーの心理状態を推定
    
    // 高解像度データがあれば使用、なければ標準解析を使用
    let sentimentAnalysis = null;
    if (highResX && highResX.sentimentData) {
      sentimentAnalysis = highResX;
    } else {
      // 標準解析でユーザー心理を分析
      const grokResult = await analyzeXSentimentLive(
        'BTC trader emotions, fear, greed, FOMO, panic, euphoria, trader psychology on X',
        lang
      );
      
      if (grokResult && typeof grokResult === 'object') {
        sentimentAnalysis = {
          sentimentData: {
            retail: {
              fomo: grokResult.retailFomo || 50,
              summary: grokResult.summary || '',
            },
            whale: {
              bias: grokResult.whaleBias || 0,
              summary: grokResult.summary || '',
            },
          },
        };
      }
    }
    
    // ===== 2. 心理状態の診断 =====
    const retailFomo = sentimentAnalysis?.sentimentData?.retail?.fomo || xSentiment.retailFomo || 50;
    const whaleBias = sentimentAnalysis?.sentimentData?.whale?.bias || xSentiment.whaleBias || 0;
    const priceChange = marketData.change24h || marketData.change_24h || 0;
    
    // 典型的なユーザー心理パターンを診断
    let psychologicalState = 'NEUTRAL'; // 'NEUTRAL', 'FOMO', 'FEAR', 'GREED', 'PANIC', 'EUPHORIA', 'CONFUSION'
    let psychologicalRisk = 'LOW'; // 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    let psychologicalAdvice = '';
    let psychologicalSupportLevel = 'NONE'; // 'NONE', 'MONITORING', 'SUPPORT', 'INTERVENTION'
    
    // FOMO状態（リテールFOMOが高い + 価格上昇）
    if (retailFomo >= 75 && priceChange > 0) {
      psychologicalState = 'FOMO';
      psychologicalRisk = 'HIGH';
      psychologicalSupportLevel = 'SUPPORT';
      psychologicalAdvice = getFOMOAdvice(lang, priceChange, whaleBias);
    }
    // FEAR状態（リテールFOMOが低い + 価格下落）
    else if (retailFomo <= 25 && priceChange < 0) {
      psychologicalState = 'FEAR';
      psychologicalRisk = 'MEDIUM';
      psychologicalSupportLevel = 'MONITORING';
      psychologicalAdvice = getFearAdvice(lang, priceChange, whaleBias);
    }
    // GREED状態（価格急騰 + リテールFOMOが高い）
    else if (priceChange > 10 && retailFomo >= 80) {
      psychologicalState = 'GREED';
      psychologicalRisk = 'CRITICAL';
      psychologicalSupportLevel = 'INTERVENTION';
      psychologicalAdvice = getGreedAdvice(lang, priceChange, whaleBias);
    }
    // PANIC状態（価格急落 + リテールFOMOが低い）
    else if (priceChange < -10 && retailFomo <= 20) {
      psychologicalState = 'PANIC';
      psychologicalRisk = 'CRITICAL';
      psychologicalSupportLevel = 'INTERVENTION';
      psychologicalAdvice = getPanicAdvice(lang, priceChange, whaleBias);
    }
    // EUPHORIA状態（価格上昇 + クジラも強気）
    else if (priceChange > 5 && whaleBias > 0.5 && retailFomo >= 70) {
      psychologicalState = 'EUPHORIA';
      psychologicalRisk = 'HIGH';
      psychologicalSupportLevel = 'SUPPORT';
      psychologicalAdvice = getEuphoriaAdvice(lang, priceChange, whaleBias);
    }
    // CONFUSION状態（価格変動が小さい + センチメントが混在）
    else if (Math.abs(priceChange) < 2 && Math.abs(whaleBias) < 0.3 && retailFomo >= 40 && retailFomo <= 60) {
      psychologicalState = 'CONFUSION';
      psychologicalRisk = 'LOW';
      psychologicalSupportLevel = 'MONITORING';
      psychologicalAdvice = getConfusionAdvice(lang);
    }
    // NEUTRAL状態
    else {
      psychologicalState = 'NEUTRAL';
      psychologicalRisk = 'LOW';
      psychologicalSupportLevel = 'NONE';
      psychologicalAdvice = getNeutralAdvice(lang);
    }
    
    // ===== 3. 心理分析サポートメッセージ生成 =====
    const supportMessage = generateSupportMessage({
      lang,
      psychologicalState,
      psychologicalRisk,
      marketData,
      xSentiment,
      sentimentAnalysis,
    });
    
    return {
      psychologicalState,
      psychologicalRisk,
      psychologicalSupportLevel,
      medicalSupportLevel: psychologicalSupportLevel, // 後方互換性のため残す
      psychologicalAdvice,
      supportMessage,
      sentimentAnalysis: sentimentAnalysis ? {
        retailFomo,
        whaleBias,
        summary: sentimentAnalysis.sentimentData?.retail?.summary || sentimentAnalysis.sentimentData?.whale?.summary || '',
      } : null,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('[Dr. Grok Psychological Support] Error diagnosing user sentiment:', error);
    return {
      psychologicalState: 'UNKNOWN',
      psychologicalRisk: 'LOW',
      psychologicalSupportLevel: 'NONE',
      medicalSupportLevel: 'NONE', // 後方互換性のため残す
      psychologicalAdvice: '',
      supportMessage: '',
      error: error.message,
      timestamp: Date.now(),
    };
  }
}

/**
 * FOMO状態へのアドバイス
 */
function getFOMOAdvice(lang, priceChange, whaleBias) {
  const advice = {
    en: whaleBias < -0.3 
      ? '⚠️ FOMO detected. Whales are selling while retail is buying. This is a classic trap. Consider waiting for better entry points.'
      : '⚠️ High FOMO detected. Be cautious - extreme retail buying often precedes corrections.',
    ja: whaleBias < -0.3
      ? '⚠️ FOMO検知。クジラが売っている一方でリテールが買っている。典型的なトラップです。より良いエントリーポイントを待つことを検討してください。'
      : '⚠️ 高いFOMOを検知。注意が必要です - リテールの極端な買いはしばしば調整の前兆です。',
    ko: whaleBias < -0.3
      ? '⚠️ FOMO 감지. 고래는 매도하고 소매는 매수 중입니다. 전형적인 함정입니다. 더 나은 진입점을 기다리는 것을 고려하세요.'
      : '⚠️ 높은 FOMO 감지. 주의하세요 - 극단적인 소매 매수는 종종 조정의 전조입니다.',
  };
  return advice[lang] || advice.en;
}

/**
 * FEAR状態へのアドバイス
 */
function getFearAdvice(lang, priceChange, whaleBias) {
  const advice = {
    en: whaleBias > 0.3
      ? '💡 Fear detected, but whales are accumulating. This could be a buying opportunity. Monitor closely.'
      : '💡 Fear detected. Market sentiment is negative. Consider defensive positions.',
    ja: whaleBias > 0.3
      ? '💡 恐怖を検知しましたが、クジラは買い集めています。買い機会の可能性があります。注意深く監視してください。'
      : '💡 恐怖を検知。市場センチメントはネガティブです。防御的なポジションを検討してください。',
    ko: whaleBias > 0.3
      ? '💡 공포 감지, 하지만 고래는 축적 중입니다. 매수 기회일 수 있습니다. 면밀히 모니터링하세요.'
      : '💡 공포 감지. 시장 센티먼트가 부정적입니다. 방어적 포지션을 고려하세요.',
  };
  return advice[lang] || advice.en;
}

/**
 * GREED状態へのアドバイス
 */
function getGreedAdvice(lang, priceChange, whaleBias) {
  const advice = {
    en: '🚨 CRITICAL: Extreme greed detected. Price surge with high retail FOMO. Whales may be distributing. HIGH RISK of reversal. Consider taking profits or tightening stops.',
    ja: '🚨 重大: 極端な強欲を検知。価格急騰と高いリテールFOMO。クジラは配布している可能性があります。反転の高いリスク。利益確定またはストップロスを締めることを検討してください。',
    ko: '🚨 중요: 극단적인 탐욕 감지. 가격 급등과 높은 소매 FOMO. 고래가 분배 중일 수 있습니다. 반전의 높은 위험. 이익 실현 또는 손절매를 강화하는 것을 고려하세요.',
  };
  return advice[lang] || advice.en;
}

/**
 * PANIC状態へのアドバイス
 */
function getPanicAdvice(lang, priceChange, whaleBias) {
  const advice = {
    en: whaleBias > 0.3
      ? '🆘 PANIC detected, but whales are buying. This may be a contrarian opportunity. However, wait for confirmation before entering.'
      : '🆘 CRITICAL: Extreme panic detected. Market is oversold. Wait for stabilization before making decisions.',
    ja: whaleBias > 0.3
      ? '🆘 パニックを検知しましたが、クジラは買っています。逆張りの機会の可能性があります。ただし、エントリー前に確認を待ってください。'
      : '🆘 重要: 極端なパニックを検知。市場は売られすぎています。決定を下す前に安定化を待ってください。',
    ko: whaleBias > 0.3
      ? '🆘 공황 감지, 하지만 고래는 매수 중입니다. 역추세 기회일 수 있습니다. 그러나 진입 전 확인을 기다리세요.'
      : '🆘 중요: 극단적인 공황 감지. 시장이 과매도되었습니다. 결정을 내리기 전에 안정화를 기다리세요.',
  };
  return advice[lang] || advice.en;
}

/**
 * EUPHORIA状態へのアドバイス
 */
function getEuphoriaAdvice(lang, priceChange, whaleBias) {
  const advice = {
    en: '⚠️ Euphoria detected. Both whales and retail are bullish. Market may be overextended. Consider profit-taking.',
    ja: '⚠️ ユーフォリアを検知。クジラとリテールの両方が強気です。市場は過度に拡張している可能性があります。利益確定を検討してください。',
    ko: '⚠️ 유포리아 감지. 고래와 소매 모두 강세입니다. 시장이 과도하게 확장되었을 수 있습니다. 이익 실현을 고려하세요.',
  };
  return advice[lang] || advice.en;
}

/**
 * CONFUSION状態へのアドバイス
 */
function getConfusionAdvice(lang) {
  const advice = {
    en: '💭 Market sentiment is mixed. No clear direction. This is a "BUG STANDBY" situation. Wait for clearer signals.',
    ja: '💭 市場センチメントは混在しています。明確な方向性がありません。これは「BUG STANDBY」状況です。より明確なシグナルを待ってください。',
    ko: '💭 시장 센티먼트가 혼재되어 있습니다. 명확한 방향이 없습니다. 이것은 "BUG STANDBY" 상황입니다. 더 명확한 신호를 기다리세요.',
  };
  return advice[lang] || advice.en;
}

/**
 * NEUTRAL状態へのアドバイス
 */
function getNeutralAdvice(lang) {
  const advice = {
    en: '✅ Market sentiment is balanced. No extreme emotions detected. Continue monitoring for opportunities.',
    ja: '✅ 市場センチメントはバランスが取れています。極端な感情は検知されていません。機会を継続的に監視してください。',
    ko: '✅ 시장 센티먼트가 균형을 이루고 있습니다. 극단적인 감정이 감지되지 않았습니다. 기회를 계속 모니터링하세요.',
  };
  return advice[lang] || advice.en;
}

/**
 * 心理分析サポートメッセージを生成
 */
function generateSupportMessage(options = {}) {
  const {
    lang = 'en',
    psychologicalState,
    psychologicalRisk,
    marketData = {},
    xSentiment = {},
    sentimentAnalysis = null,
  } = options;
  
  const priceChange = marketData.change24h || marketData.change_24h || 0;
  const retailFomo = xSentiment.retailFomo || sentimentAnalysis?.sentimentData?.retail?.fomo || 50;
  const whaleBias = xSentiment.whaleBias || sentimentAnalysis?.sentimentData?.whale?.bias || 0;
  
  // 言語別のサポートメッセージ
  const messages = {
    en: {
      FOMO: `Dr. Grok's Psychological Analysis: You may be experiencing FOMO (Fear Of Missing Out). 
Current market shows retail buying pressure (FOMO: ${retailFomo.toFixed(0)}/100) while ${whaleBias < -0.3 ? 'whales are selling. This is a classic trap pattern.' : 'market conditions are mixed.'}
Psychological Advice: Take a step back. Extreme FOMO often leads to poor entry points. Wait for clearer signals.`,
      
      FEAR: `Dr. Grok's Psychological Analysis: Fear is present in the market.
Current sentiment shows low retail interest (FOMO: ${retailFomo.toFixed(0)}/100)${whaleBias > 0.3 ? ', but whales are accumulating. This could indicate a contrarian opportunity.' : '.'}
Psychological Advice: Fear can be paralyzing, but it can also signal potential opportunities. Monitor whale activity closely.`,
      
      GREED: `Dr. Grok's Psychological Analysis: ⚠️ CRITICAL - Extreme greed detected.
Market shows euphoric conditions (FOMO: ${retailFomo.toFixed(0)}/100, Price: ${priceChange > 0 ? '+' : ''}${priceChange.toFixed(2)}%).
Psychological Advice: Greed is the most dangerous emotion in trading. Consider taking profits. Protect your capital.`,
      
      PANIC: `Dr. Grok's Psychological Analysis: 🆘 CRITICAL - Panic detected.
Market shows extreme fear (FOMO: ${retailFomo.toFixed(0)}/100, Price: ${priceChange.toFixed(2)}%)${whaleBias > 0.3 ? ', but whales are buying. This may be a contrarian signal.' : '.'}
Psychological Advice: Panic leads to irrational decisions. Breathe. Wait for market stabilization before making moves.`,
      
      EUPHORIA: `Dr. Grok's Psychological Analysis: Euphoria detected - market is overextended.
Both whales and retail are bullish, but this often precedes corrections.
Psychological Advice: Euphoria is a warning sign. Consider defensive positions.`,
      
      CONFUSION: `Dr. Grok's Psychological Analysis: Market sentiment is mixed - confusion detected.
No clear direction. This is a "BUG STANDBY" situation.
Psychological Advice: When confused, the best action is often inaction. Wait for clarity.`,
      
      NEUTRAL: `Dr. Grok's Psychological Analysis: Market sentiment is balanced.
No extreme emotions detected. Conditions are stable.
Psychological Advice: Continue monitoring. Maintain discipline and wait for high-probability setups.`,
    },
    ja: {
      FOMO: `Dr. Grokの心理分析: FOMO（取り残される恐怖）を経験している可能性があります。
現在の市場はリテールの買い圧力（FOMO: ${retailFomo.toFixed(0)}/100）を示していますが、${whaleBias < -0.3 ? 'クジラは売っています。これは典型的なトラップパターンです。' : '市場状況は混在しています。'}
心理的アドバイス: 一歩下がってください。極端なFOMOはしばしば悪いエントリーポイントにつながります。より明確なシグナルを待ってください。`,
      
      FEAR: `Dr. Grokの心理分析: 市場に恐怖が存在します。
現在のセンチメントはリテールの関心が低い（FOMO: ${retailFomo.toFixed(0)}/100）ことを示しています${whaleBias > 0.3 ? 'が、クジラは買い集めています。これは逆張りの機会を示している可能性があります。' : '。'}
心理的アドバイス: 恐怖は麻痺を引き起こす可能性がありますが、潜在的な機会を示すこともあります。クジラの活動を注意深く監視してください。`,
      
      GREED: `Dr. Grokの心理分析: ⚠️ 重大 - 極端な強欲を検知。
市場はユーフォリックな状況（FOMO: ${retailFomo.toFixed(0)}/100、価格: ${priceChange > 0 ? '+' : ''}${priceChange.toFixed(2)}%）を示しています。
心理的アドバイス: 強欲はトレーディングで最も危険な感情です。利益確定を検討してください。資本を保護してください。`,
      
      PANIC: `Dr. Grokの心理分析: 🆘 重大 - パニックを検知。
市場は極端な恐怖（FOMO: ${retailFomo.toFixed(0)}/100、価格: ${priceChange.toFixed(2)}%）を示しています${whaleBias > 0.3 ? 'が、クジラは買っています。これは逆張りシグナルの可能性があります。' : '。'}
心理的アドバイス: パニックは非合理的な決定につながります。深呼吸してください。動く前に市場の安定化を待ってください。`,
      
      EUPHORIA: `Dr. Grokの心理分析: ユーフォリアを検知 - 市場は過度に拡張しています。
クジラとリテールの両方が強気ですが、これはしばしば調整の前兆です。
心理的アドバイス: ユーフォリアは警告サインです。防御的なポジションを検討してください。`,
      
      CONFUSION: `Dr. Grokの心理分析: 市場センチメントは混在しています - 混乱を検知。
明確な方向性がありません。これは「BUG STANDBY」状況です。
心理的アドバイス: 混乱しているとき、最善の行動はしばしば無行動です。明確さを待ってください。`,
      
      NEUTRAL: `Dr. Grokの心理分析: 市場センチメントはバランスが取れています。
極端な感情は検知されていません。条件は安定しています。
心理的アドバイス: 監視を継続してください。規律を維持し、高確率のセットアップを待ってください。`,
    },
    ko: {
      FOMO: `Dr. Grok 진단: FOMO(놓칠 것에 대한 두려움)를 경험하고 있을 수 있습니다.
현재 시장은 소매 매수 압력(FOMO: ${retailFomo.toFixed(0)}/100)을 보여주지만 ${whaleBias < -0.3 ? '고래는 매도 중입니다. 이것은 전형적인 함정 패턴입니다.' : '시장 조건이 혼재되어 있습니다.'}
의학적 조언: 한 걸음 물러서세요. 극단적인 FOMO는 종종 나쁜 진입점으로 이어집니다. 더 명확한 신호를 기다리세요.`,
      
      FEAR: `Dr. Grok 진단: 시장에 공포가 존재합니다.
현재 센티먼트는 낮은 소매 관심(FOMO: ${retailFomo.toFixed(0)}/100)을 보여줍니다${whaleBias > 0.3 ? ', 하지만 고래는 축적 중입니다. 이것은 역추세 기회를 나타낼 수 있습니다.' : '.'}
의학적 조언: 공포는 마비를 일으킬 수 있지만 잠재적 기회를 나타낼 수도 있습니다. 고래 활동을 면밀히 모니터링하세요.`,
      
      GREED: `Dr. Grok 진단: ⚠️ 중요 - 극단적인 탐욕 감지.
시장은 유포릭한 조건(FOMO: ${retailFomo.toFixed(0)}/100, 가격: ${priceChange > 0 ? '+' : ''}${priceChange.toFixed(2)}%)을 보여줍니다.
의학적 조언: 탐욕은 거래에서 가장 위험한 감정입니다. 이익 실현을 고려하세요. 자본을 보호하세요.`,
      
      PANIC: `Dr. Grok 진단: 🆘 중요 - 공황 감지.
시장은 극단적인 공포(FOMO: ${retailFomo.toFixed(0)}/100, 가격: ${priceChange.toFixed(2)}%)를 보여줍니다${whaleBias > 0.3 ? ', 하지만 고래는 매수 중입니다. 이것은 역추세 신호일 수 있습니다.' : '.'}
의학적 조언: 공황은 비이성적인 결정으로 이어집니다. 숨을 쉬세요. 움직이기 전에 시장 안정화를 기다리세요.`,
      
      EUPHORIA: `Dr. Grok 진단: 유포리아 감지 - 시장이 과도하게 확장되었습니다.
고래와 소매 모두 강세이지만 이것은 종종 조정의 전조입니다.
의학적 조언: 유포리아는 경고 신호입니다. 방어적 포지션을 고려하세요.`,
      
      CONFUSION: `Dr. Grok 진단: 시장 센티먼트가 혼재되어 있습니다 - 혼란 감지.
명확한 방향이 없습니다. 이것은 "BUG STANDBY" 상황입니다.
의학적 조언: 혼란스러울 때 최선의 행동은 종종 무행동입니다. 명확성을 기다리세요.`,
      
      NEUTRAL: `Dr. Grok 진단: 시장 센티먼트가 균형을 이루고 있습니다.
극단적인 감정이 감지되지 않았습니다. 조건이 안정적입니다.
의학적 조언: 모니터링을 계속하세요. 규율을 유지하고 고확률 설정을 기다리세요.`,
    },
  };
  
  const langMessages = messages[lang] || messages.en;
  return langMessages[psychologicalState] || langMessages.NEUTRAL;
}

/**
 * 後方互換性のためのラッパー関数
 * 既存のanalyzeXSentimentHighResolutionCompatと統合
 */
async function diagnoseUserSentimentCompat(marketData, xSentiment, lang = 'en') {
  // 高解像度Xデータを取得
  let highResX = null;
  try {
    const highResResult = await analyzeXSentimentHighResolutionCompat(
      'BTC trader emotions, fear, greed, FOMO, panic, euphoria, trader psychology on X',
      lang
    );
    if (highResResult && highResResult._highResolution) {
      highResX = highResResult._highResolution;
    }
  } catch (error) {
    console.warn('[Dr. Grok Psychological Support] Error fetching high-res X data:', error.message);
  }
  
  return diagnoseUserSentiment({
    lang,
    marketData,
    xSentiment,
    highResX,
  });
}

module.exports = {
  diagnoseUserSentiment,
  diagnoseUserSentimentCompat,
  generateSupportMessage,
};
