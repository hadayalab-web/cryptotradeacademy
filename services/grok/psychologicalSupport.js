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
    
    // トラップ検出情報を取得（高リスク判定の補強に使用）
    const trapDetection = marketData.trapDetection || marketData.trap || null;
    const trapSeverity = trapDetection?.trapSeverity || trapDetection?.severity || 'NONE';
    const trapScore = trapDetection?.trapScore || trapDetection?.score || 0;
    const hasHighRiskTrap = trapSeverity === 'CRITICAL' || trapSeverity === 'HIGH' || trapScore >= 50;
    
    // 典型的なユーザー心理パターンを診断（トラップ検出情報を考慮）
    let psychologicalState = 'NEUTRAL'; // 'NEUTRAL', 'FOMO', 'FEAR', 'GREED', 'PANIC', 'EUPHORIA', 'CONFUSION'
    let psychologicalRisk = 'LOW'; // 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    let psychologicalAdvice = '';
    let psychologicalSupportLevel = 'NONE'; // 'NONE', 'MONITORING', 'SUPPORT', 'INTERVENTION'
    
    // トラップ検出がある場合は、リスクレベルを上昇させる
    if (hasHighRiskTrap) {
      // トラップ検出時は、心理状態に関わらずリスクを上昇
      if (trapSeverity === 'CRITICAL' || trapScore >= 70) {
        psychologicalRisk = 'CRITICAL';
        psychologicalSupportLevel = 'INTERVENTION';
      } else if (trapSeverity === 'HIGH' || trapScore >= 50) {
        psychologicalRisk = 'HIGH';
        psychologicalSupportLevel = 'SUPPORT';
      }
    }
    
    // FOMO状態（リテールFOMOが高い + 価格上昇）
    if (retailFomo >= 75 && priceChange > 0) {
      psychologicalState = 'FOMO';
      // トラップ検出があればリスクをCRITICALに引き上げ
      if (hasHighRiskTrap && psychologicalRisk !== 'CRITICAL') {
        psychologicalRisk = 'CRITICAL';
        psychologicalSupportLevel = 'INTERVENTION';
      } else if (psychologicalRisk === 'LOW') {
        psychologicalRisk = 'HIGH';
        psychologicalSupportLevel = 'SUPPORT';
      }
      psychologicalAdvice = getFOMOAdvice(lang, priceChange, whaleBias, hasHighRiskTrap, trapScore);
    }
    // FEAR状態（リテールFOMOが低い + 価格下落）
    else if (retailFomo <= 25 && priceChange < 0) {
      psychologicalState = 'FEAR';
      if (psychologicalRisk === 'LOW') {
        psychologicalRisk = 'MEDIUM';
        psychologicalSupportLevel = 'MONITORING';
      }
      psychologicalAdvice = getFearAdvice(lang, priceChange, whaleBias, hasHighRiskTrap);
    }
    // GREED状態（価格急騰 + リテールFOMOが高い）
    else if (priceChange > 10 && retailFomo >= 80) {
      psychologicalState = 'GREED';
      psychologicalRisk = 'CRITICAL';
      psychologicalSupportLevel = 'INTERVENTION';
      psychologicalAdvice = getGreedAdvice(lang, priceChange, whaleBias, hasHighRiskTrap, trapScore);
    }
    // PANIC状態（価格急落 + リテールFOMOが低い）
    else if (priceChange < -10 && retailFomo <= 20) {
      psychologicalState = 'PANIC';
      psychologicalRisk = 'CRITICAL';
      psychologicalSupportLevel = 'INTERVENTION';
      psychologicalAdvice = getPanicAdvice(lang, priceChange, whaleBias, hasHighRiskTrap);
    }
    // EUPHORIA状態（価格上昇 + クジラも強気）
    else if (priceChange > 5 && whaleBias > 0.5 && retailFomo >= 70) {
      psychologicalState = 'EUPHORIA';
      // トラップ検出があればリスクをCRITICALに引き上げ
      if (hasHighRiskTrap) {
        psychologicalRisk = 'CRITICAL';
        psychologicalSupportLevel = 'INTERVENTION';
      } else if (psychologicalRisk === 'LOW') {
        psychologicalRisk = 'HIGH';
        psychologicalSupportLevel = 'SUPPORT';
      }
      psychologicalAdvice = getEuphoriaAdvice(lang, priceChange, whaleBias, hasHighRiskTrap);
    }
    // CONFUSION状態（価格変動が小さい + センチメントが混在）
    else if (Math.abs(priceChange) < 2 && Math.abs(whaleBias) < 0.3 && retailFomo >= 40 && retailFomo <= 60) {
      psychologicalState = 'CONFUSION';
      if (hasHighRiskTrap && psychologicalRisk === 'LOW') {
        psychologicalRisk = 'MEDIUM';
        psychologicalSupportLevel = 'MONITORING';
      }
      psychologicalAdvice = getConfusionAdvice(lang, hasHighRiskTrap);
    }
    // NEUTRAL状態
    else {
      psychologicalState = 'NEUTRAL';
      // トラップ検出があればリスクを引き上げ
      if (hasHighRiskTrap) {
        psychologicalRisk = trapSeverity === 'CRITICAL' || trapScore >= 70 ? 'CRITICAL' : 'HIGH';
        psychologicalSupportLevel = trapSeverity === 'CRITICAL' || trapScore >= 70 ? 'INTERVENTION' : 'SUPPORT';
      }
      psychologicalAdvice = getNeutralAdvice(lang, hasHighRiskTrap);
    }
    
    // ===== 3. 心理分析サポートメッセージ生成 =====
    const supportMessage = generateSupportMessage({
      lang,
      psychologicalState,
      psychologicalRisk,
      marketData: {
        ...marketData,
        trapDetection: trapDetection || null,
      },
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
 * @param {string} lang - 言語コード
 * @param {number} priceChange - 価格変動率
 * @param {number} whaleBias - クジラバイアス
 * @param {boolean} hasHighRiskTrap - 高リスクトラップ検出フラグ
 * @param {number} trapScore - トラップスコア
 */
function getFOMOAdvice(lang, priceChange, whaleBias, hasHighRiskTrap = false, trapScore = 0) {
  if (hasHighRiskTrap && trapScore >= 70) {
    // CRITICALトラップ検出時は「辛口モード」
    const advice = {
      en: '🚨 CRITICAL: FOMO + HIGH-RISK TRAP detected. Whales are distributing while retail chases price. This is a CLASSIC TRAP pattern. DO NOT chase. Wait for pullback or avoid this setup entirely. Your capital is at HIGH RISK.',
      ja: '🚨 重大: FOMO + 高リスクトラップを検知。クジラが配布している一方でリテールが価格を追いかけています。これは典型的なトラップパターンです。追いかけてはいけません。プルバックを待つか、このセットアップを完全に回避してください。あなたの資金は高いリスクにさらされています。',
      ko: '🚨 중요: FOMO + 고위험 함정 감지. 고래가 분배하는 동안 소매가 가격을 추격하고 있습니다. 이것은 전형적인 함정 패턴입니다. 추격하지 마세요. 되돌림을 기다리거나 이 설정을 완전히 피하세요. 자본이 높은 위험에 노출되어 있습니다.',
      es: '🚨 CRÍTICO: FOMO + TRAMPA DE ALTO RIESGO detectada. Las ballenas se distribuyen mientras los minoristas persiguen el precio. Este es un patrón de TRAMPA CLÁSICA. NO persigas. Espera un retroceso o evita esta configuración por completo. Tu capital está en ALTO RIESGO.',
      'pt-br': '🚨 CRÍTICO: FOMO + ARMADILHA DE ALTO RISCO detectada. Baleias estão distribuindo enquanto varejo persegue o preço. Este é um padrão de ARMADILHA CLÁSSICA. NÃO persiga. Aguarde um recuo ou evite esta configuração completamente. Seu capital está em ALTO RISCO.',
      ar: '🚨 حرج: تم اكتشاف FOMO + فخ عالي المخاطر. الحيتان توزع بينما التجزئة تطارد السعر. هذا نمط فخ كلاسيكي. لا تطارد. انتظر التراجع أو تجنب هذا الإعداد بالكامل. رأس المال الخاص بك في خطر عالٍ.',
    };
    return advice[lang] || advice.en;
  }
  
  // 通常のFOMOアドバイス
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
    es: whaleBias < -0.3
      ? '⚠️ FOMO detectado. Las ballenas están vendiendo mientras los minoristas compran. Esta es una trampa clásica. Considere esperar mejores puntos de entrada.'
      : '⚠️ Alto FOMO detectado. Tenga cuidado: la compra minorista extrema a menudo precede a las correcciones.',
    'pt-br': whaleBias < -0.3
      ? '⚠️ FOMO detectado. Baleias estão vendendo enquanto varejo compra. Esta é uma armadilha clássica. Considere esperar melhores pontos de entrada.'
      : '⚠️ Alto FOMO detectado. Tenha cuidado - compra extrema de varejo frequentemente precede correções.',
    ar: whaleBias < -0.3
      ? '⚠️ تم اكتشاف FOMO. الحيتان تبيع بينما التجزئة تشتري. هذا فخ كلاسيكي. فكر في انتظار نقاط دخول أفضل.'
      : '⚠️ تم اكتشاف FOMO عالي. كن حذرًا - الشراء المتطرف من التجزئة غالبًا ما يسبق التصحيحات.',
  };
  return advice[lang] || advice.en;
}

/**
 * FEAR状態へのアドバイス
 * @param {string} lang - 言語コード
 * @param {number} priceChange - 価格変動率
 * @param {number} whaleBias - クジラバイアス
 * @param {boolean} hasHighRiskTrap - 高リスクトラップ検出フラグ
 */
function getFearAdvice(lang, priceChange, whaleBias, hasHighRiskTrap = false) {
  if (hasHighRiskTrap) {
    // 高リスクトラップ検出時は、より慎重なアドバイス
    const advice = {
      en: '⚠️ Fear detected + TRAP ALERT. Market sentiment is negative and trap conditions are present. DO NOT rush into positions. Wait for trap conditions to clear before considering any entries.',
      ja: '⚠️ 恐怖を検知 + トラップ警告。市場センチメントはネガティブで、トラップ条件が存在します。ポジションに急いで入らないでください。トラップ条件が解消されるまで待機してください。',
      ko: '⚠️ 공포 감지 + 함정 경고. 시장 센티먼트가 부정적이고 함정 조건이 존재합니다. 포지션에 서두르지 마세요. 함정 조건이 해제될 때까지 기다리세요.',
      es: '⚠️ Miedo detectado + ALERTA DE TRAMPA. El sentimiento del mercado es negativo y existen condiciones de trampa. NO se apresure a entrar en posiciones. Espere a que se aclaren las condiciones de trampa antes de considerar entradas.',
      'pt-br': '⚠️ Medo detectado + ALERTA DE ARMADILHA. Sentimento de mercado negativo e condições de armadilha presentes. NÃO se apresse em posições. Aguarde as condições de armadilha se dissiparem antes de considerar entradas.',
      ar: '⚠️ تم اكتشاف الخوف + تنبيه فخ. المشاعر السوقية سلبية وتوجد ظروف فخ. لا تتسرع في الدخول في المراكز. انتظر حتى تختفي ظروف الفخ قبل التفكير في الدخول.',
    };
    return advice[lang] || advice.en;
  }
  
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
    es: whaleBias > 0.3
      ? '💡 Miedo detectado, pero las ballenas se están acumulando. Podría ser una oportunidad de compra. Monitoree de cerca.'
      : '💡 Miedo detectado. El sentimiento del mercado es negativo. Considere posiciones defensivas.',
    'pt-br': whaleBias > 0.3
      ? '💡 Medo detectado, mas baleias estão acumulando. Poderia ser uma oportunidade de compra. Monitore de perto.'
      : '💡 Medo detectado. Sentimento de mercado negativo. Considere posições defensivas.',
    ar: whaleBias > 0.3
      ? '💡 تم اكتشاف الخوف، لكن الحيتان تتراكم. قد تكون فرصة شراء. راقب عن كثب.'
      : '💡 تم اكتشاف الخوف. مشاعر السوق سلبية. ضع في اعتبارك المراكز الدفاعية.',
  };
  return advice[lang] || advice.en;
}

/**
 * GREED状態へのアドバイス
 * @param {string} lang - 言語コード
 * @param {number} priceChange - 価格変動率
 * @param {number} whaleBias - クジラバイアス
 * @param {boolean} hasHighRiskTrap - 高リスクトラップ検出フラグ
 * @param {number} trapScore - トラップスコア
 */
function getGreedAdvice(lang, priceChange, whaleBias, hasHighRiskTrap = false, trapScore = 0) {
  // 常にCRITICALメッセージを提供（GREED状態は常に高リスク）
  const advice = {
    en: hasHighRiskTrap && trapScore >= 70
      ? '🚨 CRITICAL: Extreme greed + HIGH-RISK TRAP detected. Price surge with extreme retail FOMO. Whales ARE distributing. This is a CLASSIC TRAP. HIGH RISK of immediate reversal. TAKE PROFITS NOW. Tighten stops aggressively. DO NOT add to positions. Protect your capital immediately.'
      : '🚨 CRITICAL: Extreme greed detected. Price surge with high retail FOMO. Whales may be distributing. HIGH RISK of reversal. Consider taking profits or tightening stops. If trap conditions are present, AVOID new entries.',
    ja: hasHighRiskTrap && trapScore >= 70
      ? '🚨 重大: 極端な強欲 + 高リスクトラップを検知。価格急騰と極端なリテールFOMO。クジラは配布中です。これは典型的なトラップです。即座に反転する高いリスク。今すぐ利益確定してください。積極的にストップロスを締めてください。ポジションを追加しないでください。すぐに資金を保護してください。'
      : '🚨 重大: 極端な強欲を検知。価格急騰と高いリテールFOMO。クジラは配布している可能性があります。反転の高いリスク。利益確定またはストップロスを締めることを検討してください。トラップ条件が存在する場合、新しいエントリーを避けてください。',
    ko: hasHighRiskTrap && trapScore >= 70
      ? '🚨 중요: 극단적인 탐욕 + 고위험 함정 감지. 가격 급등과 극단적인 소매 FOMO. 고래가 분배 중입니다. 이것은 전형적인 함정입니다. 즉각적인 반전의 높은 위험. 지금 이익을 실현하세요. 공격적으로 손절매를 강화하세요. 포지션에 추가하지 마세요. 즉시 자본을 보호하세요.'
      : '🚨 중요: 극단적인 탐욕 감지. 가격 급등과 높은 소매 FOMO. 고래가 분배 중일 수 있습니다. 반전의 높은 위험. 이익 실현 또는 손절매를 강화하는 것을 고려하세요. 함정 조건이 존재하는 경우, 새로운 진입을 피하세요.',
    es: hasHighRiskTrap && trapScore >= 70
      ? '🚨 CRÍTICO: Avaricia extrema + TRAMPA DE ALTO RIESGO detectada. Subida de precios con FOMO minorista extremo. Las ballenas SE ESTÁN distribuyendo. Esta es una TRAMPA CLÁSICA. ALTO RIESGO de reversión inmediata. TOME GANANCIAS AHORA. Ajuste los stops agresivamente. NO agregue a las posiciones. Proteja su capital inmediatamente.'
      : '🚨 CRÍTICO: Avaricia extrema detectada. Subida de precios con alto FOMO minorista. Las ballenas pueden estar distribuyendo. ALTO RIESGO de reversión. Considere tomar ganancias o ajustar stops. Si hay condiciones de trampa, EVITE nuevas entradas.',
    'pt-br': hasHighRiskTrap && trapScore >= 70
      ? '🚨 CRÍTICO: Ganância extrema + ARMADILHA DE ALTO RISCO detectada. Surto de preço com FOMO extremo de varejo. Baleias ESTÃO distribuindo. Esta é uma ARMADILHA CLÁSSICA. ALTO RISCO de reversão imediata. REALIZE LUCROS AGORA. Ajuste stops agressivamente. NÃO adicione às posições. Proteja seu capital imediatamente.'
      : '🚨 CRÍTICO: Ganância extrema detectada. Surto de preço com alto FOMO de varejo. Baleias podem estar distribuindo. ALTO RISCO de reversão. Considere realizar lucros ou ajustar stops. Se houver condições de armadilha, EVITE novas entradas.',
    ar: hasHighRiskTrap && trapScore >= 70
      ? '🚨 حرج: تم اكتشاف الجشع المتطرف + فخ عالي المخاطر. ارتفاع الأسعار مع FOMO متطرف من التجزئة. الحيتان تتوزع. هذا فخ كلاسيكي. خطر عالي للانعكاس الفوري. أخذ الأرباح الآن. شد نقاط الإيقاف بقوة. لا تضف إلى المراكز. احم رأس المال فورًا.'
      : '🚨 حرج: تم اكتشاف الجشع المتطرف. ارتفاع الأسعار مع FOMO عالي من التجزئة. قد تكون الحيتان توزع. خطر عالي للانعكاس. فكر في أخذ الأرباح أو تشديد نقاط الإيقاف. إذا كانت هناك ظروف فخ، تجنب الدخول الجديد.',
  };
  return advice[lang] || advice.en;
}

/**
 * PANIC状態へのアドバイス
 * @param {string} lang - 言語コード
 * @param {number} priceChange - 価格変動率
 * @param {number} whaleBias - クジラバイアス
 * @param {boolean} hasHighRiskTrap - 高リスクトラップ検出フラグ
 */
function getPanicAdvice(lang, priceChange, whaleBias, hasHighRiskTrap = false) {
  if (hasHighRiskTrap) {
    // 高リスクトラップ検出時は、より慎重なアドバイス
    const advice = {
      en: '🆘 CRITICAL: Extreme panic + TRAP ALERT detected. Market is oversold BUT trap conditions are present. DO NOT rush to buy. This panic may be a BEAR TRAP. Wait for trap conditions to clear and confirmation of reversal before considering entries.',
      ja: '🆘 重大: 極端なパニック + トラップ警告を検知。市場は売られすぎていますが、トラップ条件が存在します。急いで買わないでください。このパニックはベアートラップの可能性があります。トラップ条件が解消され、反転の確認が取れるまで待ってください。',
      ko: '🆘 중요: 극단적인 공황 + 함정 경고 감지. 시장이 과매도되었지만 함정 조건이 존재합니다. 급히 매수하지 마세요. 이 공황은 베어 함정일 수 있습니다. 함정 조건이 해제되고 반전 확인이 나올 때까지 기다리세요.',
      es: '🆘 CRÍTICO: Pánico extremo + ALERTA DE TRAMPA detectada. El mercado está sobrevendido PERO existen condiciones de trampa. NO se apresure a comprar. Este pánico puede ser una TRAMPA BAJISTA. Espere a que se aclaren las condiciones de trampa y confirmación de reversión antes de considerar entradas.',
      'pt-br': '🆘 CRÍTICO: Pânico extremo + ALERTA DE ARMADILHA detectada. Mercado sobrevendido MAS condições de armadilha presentes. NÃO se apresse a comprar. Este pânico pode ser uma ARMADILHA BAIXISTA. Aguarde condições de armadilha se dissiparem e confirmação de reversão antes de considerar entradas.',
      ar: '🆘 حرج: تم اكتشاف الذعر المتطرف + تنبيه فخ. السوق في حالة بيع مفرط لكن توجد ظروف فخ. لا تتسرع في الشراء. قد يكون هذا الذعر فخًا هبوطيًا. انتظر حتى تختفي ظروف الفخ وتأكيد الانعكاس قبل التفكير في الدخول.',
    };
    return advice[lang] || advice.en;
  }
  
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
    es: whaleBias > 0.3
      ? '🆘 Pánico detectado, pero las ballenas están comprando. Podría ser una oportunidad contraria. Sin embargo, espere confirmación antes de entrar.'
      : '🆘 CRÍTICO: Pánico extremo detectado. El mercado está sobrevendido. Espere estabilización antes de tomar decisiones.',
    'pt-br': whaleBias > 0.3
      ? '🆘 Pânico detectado, mas baleias estão comprando. Pode ser uma oportunidade contrária. No entanto, aguarde confirmação antes de entrar.'
      : '🆘 CRÍTICO: Pânico extremo detectado. Mercado sobrevendido. Aguarde estabilização antes de tomar decisões.',
    ar: whaleBias > 0.3
      ? '🆘 تم اكتشاف الذعر، لكن الحيتان تشتري. قد تكون فرصة معاكسة. ومع ذلك، انتظر التأكيد قبل الدخول.'
      : '🆘 حرج: تم اكتشاف الذعر المتطرف. السوق في حالة بيع مفرط. انتظر الاستقرار قبل اتخاذ القرارات.',
  };
  return advice[lang] || advice.en;
}

/**
 * EUPHORIA状態へのアドバイス
 * @param {string} lang - 言語コード
 * @param {number} priceChange - 価格変動率
 * @param {number} whaleBias - クジラバイアス
 * @param {boolean} hasHighRiskTrap - 高リスクトラップ検出フラグ
 */
function getEuphoriaAdvice(lang, priceChange, whaleBias, hasHighRiskTrap = false) {
  if (hasHighRiskTrap) {
    // 高リスクトラップ検出時は、より批判的なアドバイス
    const advice = {
      en: '🚨 CRITICAL: Euphoria + HIGH-RISK TRAP detected. Market is overextended and trap conditions are present. This euphoria is DANGEROUS. Whales may be distributing at these levels. TAKE PROFITS aggressively. Tighten stops. DO NOT add to positions. Protect capital NOW.',
      ja: '🚨 重大: ユーフォリア + 高リスクトラップを検知。市場は過度に拡張され、トラップ条件が存在します。このユーフォリアは危険です。クジラはこれらの水準で配布している可能性があります。積極的に利益確定してください。ストップロスを締めてください。ポジションを追加しないでください。今すぐ資金を保護してください。',
      ko: '🚨 중요: 유포리아 + 고위험 함정 감지. 시장이 과도하게 확장되었고 함정 조건이 존재합니다. 이 유포리아는 위험합니다. 고래가 이러한 수준에서 분배 중일 수 있습니다. 공격적으로 이익을 실현하세요. 손절매를 강화하세요. 포지션에 추가하지 마세요. 지금 자본을 보호하세요.',
      es: '🚨 CRÍTICO: Euforia + TRAMPA DE ALTO RIESGO detectada. Mercado sobre extendido y condiciones de trampa presentes. Esta euforia es PELIGROSA. Las ballenas pueden estar distribuyendo en estos niveles. TOME GANANCIAS agresivamente. Ajuste stops. NO agregue a las posiciones. Proteja el capital AHORA.',
      'pt-br': '🚨 CRÍTICO: Euforia + ARMADILHA DE ALTO RISCO detectada. Mercado sobre extendido e condições de armadilha presentes. Esta euforia é PERIGOSA. Baleias podem estar distribuindo nestes níveis. REALIZE LUCROS agressivamente. Ajuste stops. NÃO adicione às posições. Proteja o capital AGORA.',
      ar: '🚨 حرج: تم اكتشاف النشوة + فخ عالي المخاطر. السوق ممتد بشكل مفرط وتوجد ظروف فخ. هذه النشوة خطيرة. قد تكون الحيتان توزع عند هذه المستويات. أخذ الأرباح بقوة. شد نقاط الإيقاف. لا تضف إلى المراكز. احم رأس المال الآن.',
    };
    return advice[lang] || advice.en;
  }
  
  const advice = {
    en: '⚠️ Euphoria detected. Both whales and retail are bullish. Market may be overextended. Consider profit-taking.',
    ja: '⚠️ ユーフォリアを検知。クジラとリテールの両方が強気です。市場は過度に拡張している可能性があります。利益確定を検討してください。',
    ko: '⚠️ 유포리아 감지. 고래와 소매 모두 강세입니다. 시장이 과도하게 확장되었을 수 있습니다. 이익 실현을 고려하세요.',
    es: '⚠️ Euforia detectada. Tanto ballenas como minoristas son alcistas. El mercado puede estar sobre extendido. Considere tomar ganancias.',
    'pt-br': '⚠️ Euforia detectada. Tanto baleias quanto varejo são altistas. O mercado pode estar sobre extendido. Considere realizar lucros.',
    ar: '⚠️ تم اكتشاف النشوة. كل من الحيتان والتجزئة صاعدون. قد يكون السوق ممتدًا بشكل مفرط. فكر في أخذ الأرباح.',
  };
  return advice[lang] || advice.en;
}

/**
 * CONFUSION状態へのアドバイス
 * @param {string} lang - 言語コード
 * @param {boolean} hasHighRiskTrap - 高リスクトラップ検出フラグ
 */
function getConfusionAdvice(lang, hasHighRiskTrap = false) {
  if (hasHighRiskTrap) {
    // 高リスクトラップ検出時は、より明確な警告
    const advice = {
      en: '⚠️ Confusion + TRAP ALERT: Market sentiment is mixed, but TRAP conditions are present. No clear direction means HIGH UNCERTAINTY. DO NOT enter positions. Wait for trap conditions to clear. This is not a time to trade.',
      ja: '⚠️ 混乱 + トラップ警告: 市場センチメントは混在していますが、トラップ条件が存在します。明確な方向性がないことは高い不確実性を意味します。ポジションに入らないでください。トラップ条件が解消されるまで待ってください。これは取引する時ではありません。',
      ko: '⚠️ 혼란 + 함정 경고: 시장 센티먼트가 혼재되어 있지만 함정 조건이 존재합니다. 명확한 방향이 없다는 것은 높은 불확실성을 의미합니다. 포지션에 들어가지 마세요. 함정 조건이 해제될 때까지 기다리세요. 이것은 거래할 때가 아닙니다.',
      es: '⚠️ Confusión + ALERTA DE TRAMPA: El sentimiento del mercado está mezclado, pero existen condiciones de trampa. Sin dirección clara significa ALTA INCERTIDUMBRE. NO entre en posiciones. Espere a que se aclaren las condiciones de trampa. Este no es el momento para operar.',
      'pt-br': '⚠️ Confusão + ALERTA DE ARMADILHA: Sentimento de mercado misto, mas condições de armadilha presentes. Sem direção clara significa ALTA INCERTEZA. NÃO entre em posições. Aguarde condições de armadilha se dissiparem. Este não é o momento para negociar.',
      ar: '⚠️ ارتباك + تنبيه فخ: مشاعر السوق مختلطة، لكن توجد ظروف فخ. عدم وجود اتجاه واضح يعني عدم اليقين العالي. لا تدخل في المراكز. انتظر حتى تختفي ظروف الفخ. هذا ليس الوقت للتداول.',
    };
    return advice[lang] || advice.en;
  }
  
  const advice = {
    en: '💭 Market sentiment is mixed. No clear direction. This is a "BUG STANDBY" situation. Wait for clearer signals.',
    ja: '💭 市場センチメントは混在しています。明確な方向性がありません。これは「BUG STANDBY」状況です。より明確なシグナルを待ってください。',
    ko: '💭 시장 센티먼트가 혼재되어 있습니다. 명확한 방향이 없습니다. 이것은 "BUG STANDBY" 상황입니다. 더 명확한 신호를 기다리세요.',
    es: '💭 El sentimiento del mercado está mezclado. Sin dirección clara. Esta es una situación "BUG STANDBY". Espere señales más claras.',
    'pt-br': '💭 Sentimento de mercado misto. Sem direção clara. Esta é uma situação "BUG STANDBY". Aguarde sinais mais claros.',
    ar: '💭 مشاعر السوق مختلطة. لا يوجد اتجاه واضح. هذه حالة "BUG STANDBY". انتظر إشارات أكثر وضوحًا.',
  };
  return advice[lang] || advice.en;
}

/**
 * NEUTRAL状態へのアドバイス
 * @param {string} lang - 言語コード
 * @param {boolean} hasHighRiskTrap - 高リスクトラップ検出フラグ
 */
function getNeutralAdvice(lang, hasHighRiskTrap = false) {
  if (hasHighRiskTrap) {
    // 高リスクトラップ検出時は、NEUTRAL状態でも警告
    const advice = {
      en: '⚠️ Market sentiment appears balanced, BUT HIGH-RISK TRAP conditions are present. This "neutral" sentiment may be masking trap conditions. Be EXTRA cautious. Monitor trap indicators closely. Avoid entering positions until trap conditions clear.',
      ja: '⚠️ 市場センチメントはバランスが取れているように見えますが、高リスクトラップ条件が存在します。この「中立」センチメントはトラップ条件を隠している可能性があります。特に注意してください。トラップ指標を注意深く監視してください。トラップ条件が解消されるまでポジションに入らないでください。',
      ko: '⚠️ 시장 센티먼트가 균형을 이루는 것처럼 보이지만 고위험 함정 조건이 존재합니다. 이 "중립" 센티먼트는 함정 조건을 숨기고 있을 수 있습니다. 특히 주의하세요. 함정 지표를 면밀히 모니터링하세요. 함정 조건이 해제될 때까지 포지션에 들어가지 마세요.',
      es: '⚠️ El sentimiento del mercado parece equilibrado, PERO existen condiciones de TRAMPA DE ALTO RIESGO. Este sentimiento "neutral" puede estar ocultando condiciones de trampa. Sea EXTRA cauteloso. Monitoree los indicadores de trampa de cerca. Evite entrar en posiciones hasta que se aclaren las condiciones de trampa.',
      'pt-br': '⚠️ Sentimento de mercado parece equilibrado, MAS existem condições de ARMADILHA DE ALTO RISCO. Este sentimento "neutro" pode estar mascarando condições de armadilha. Seja EXTRA cauteloso. Monitore os indicadores de armadilha de perto. Evite entrar em posições até que as condições de armadilha se dissipem.',
      ar: '⚠️ يبدو أن مشاعر السوق متوازنة، لكن توجد ظروف فخ عالي المخاطر. قد تخفي هذه المشاعر "المحايدة" ظروف الفخ. كن حذرًا جدًا. راقب مؤشرات الفخ عن كثب. تجنب الدخول في المراكز حتى تختفي ظروف الفخ.',
    };
    return advice[lang] || advice.en;
  }
  
  const advice = {
    en: '✅ Market sentiment is balanced. No extreme emotions detected. Continue monitoring for opportunities.',
    ja: '✅ 市場センチメントはバランスが取れています。極端な感情は検知されていません。機会を継続的に監視してください。',
    ko: '✅ 시장 센티먼트가 균형을 이루고 있습니다. 극단적인 감정이 감지되지 않았습니다. 기회를 계속 모니터링하세요.',
    es: '✅ El sentimiento del mercado está equilibrado. No se detectaron emociones extremas. Continúe monitoreando oportunidades.',
    'pt-br': '✅ Sentimento de mercado equilibrado. Nenhuma emoção extrema detectada. Continue monitorando oportunidades.',
    ar: '✅ مشاعر السوق متوازنة. لم يتم اكتشاف عواطف متطرفة. استمر في مراقبة الفرص.',
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
  
  // trapDetection情報をmarketDataに統合（diagnoseUserSentimentで使用される）
  const marketDataWithTrap = {
    ...marketData,
    trapDetection: marketData.trapDetection || null,
  };
  
  return diagnoseUserSentiment({
    lang,
    marketData: marketDataWithTrap,
    xSentiment,
    highResX,
  });
}

module.exports = {
  diagnoseUserSentiment,
  diagnoseUserSentimentCompat,
  generateSupportMessage,
};
