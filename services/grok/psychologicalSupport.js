// services/grok/psychologicalSupport.js
// プロンプトに基づく Grok 出力で Dr. Grok 心理サポート文言を生成。Grok は X を直接スキャンしない。

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
    
    // ===== 3. メンタルブロック検出 =====
    const sentimentDataForBlocks = {
      retailFomo,
      whaleBias,
      ...xSentiment,
    };
    const mentalBlocks = detectMentalBlocks(
      sentimentDataForBlocks,
      { ...marketData, change24h: priceChange },
      psychologicalState,
      trapDetection
    );
    
    // ===== 4. 心理分析サポートメッセージ生成 =====
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
      mentalBlocks,
    });
    
    return {
      psychologicalState,
      psychologicalRisk,
      psychologicalSupportLevel,
      medicalSupportLevel: psychologicalSupportLevel, // 後方互換性のため残す
      psychologicalAdvice,
      supportMessage,
      mentalBlocks, // メンタルブロック検出結果を追加
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
 * メンタルブロックを検出
 * トレーダーの無意識にある「思い込みのフタ（メンタルブロック）」を特定
 * 
 * @param {Object} sentimentData - Xセンチメントデータ
 * @param {Object} marketData - 市場データ
 * @param {string} psychologicalState - 心理状態
 * @param {Object} trapDetection - トラップ検出情報
 * @returns {Array} 検出されたメンタルブロックの配列
 */
function detectMentalBlocks(sentimentData, marketData, psychologicalState, trapDetection = null) {
  const blocks = [];
  const retailFomo = sentimentData?.retailFomo || sentimentData?.fomo || 50;
  const whaleBias = sentimentData?.whaleBias || sentimentData?.bias || 0;
  const priceChange = marketData?.change24h || marketData?.change_24h || 0;
  const trapScore = trapDetection?.trapScore || trapDetection?.score || 0;
  const trapSeverity = trapDetection?.trapSeverity || trapDetection?.severity || 'NONE';
  const hasHighRiskTrap = trapSeverity === 'CRITICAL' || trapSeverity === 'HIGH' || trapScore >= 50;
  
  // FOMOブロック: 高retailFomo + 価格上昇時の「取り残される恐怖」
  if (retailFomo >= 75 && priceChange > 0) {
    blocks.push({
      type: 'FOMO',
      severity: retailFomo >= 85 ? 'CRITICAL' : 'HIGH',
      description: retailFomo >= 85 
        ? '極端な取り残される恐怖が判断を曇らせている。価格を追いかける衝動が強い。'
        : '取り残される恐怖が判断を曇らせている。',
      removalAdvice: 'FOMOは最も危険な感情の一つ。70%の時間は待つことが最強の戦略。今は待機の時。',
      coachingMessage: 'あなたの潜在能力は、FOMOに負けない規律から生まれる。今、待つ勇気が未来の成功を決める。'
    });
  }
  
  // FEARブロック: 低retailFomo + 価格下落時の「過度な恐怖」
  if (retailFomo <= 25 && priceChange < 0) {
    blocks.push({
      type: 'FEAR',
      severity: retailFomo <= 15 ? 'CRITICAL' : 'HIGH',
      description: retailFomo <= 15
        ? '極端な恐怖が麻痺を引き起こしている。機会を見逃している可能性がある。'
        : '過度な恐怖が判断を歪めている。',
      removalAdvice: '恐怖は自然な感情だが、過度な恐怖は機会を奪う。クジラの動きを監視し、冷静に判断を。',
      coachingMessage: '恐怖を克服する力が、真のトレーダーへの道。今の恐怖は、未来の強さの種。'
    });
  }
  
  // GREEDブロック: 極端な強欲状態
  if (priceChange > 10 && retailFomo >= 80) {
    blocks.push({
      type: 'GREED',
      severity: 'CRITICAL',
      description: '極端な強欲がリスク管理を無視している。利益確定のタイミングを見失っている。',
      removalAdvice: '強欲は最も危険な感情。今すぐ利益確定を。70%の時間は待つ - これが最強の戦略。',
      coachingMessage: '強欲をコントロールできるトレーダーが最後に勝つ。今、規律を示す時。'
    });
  }
  
  // Always Tradingブロック: 常に取引する必要があるという思い込み
  // 心理状態に関わらず、頻繁な取引を促す傾向がある場合
  // (STANDBY推奨時でも取引を求める傾向、または複数の心理状態が短時間で切り替わる場合)
  if (psychologicalState !== 'NEUTRAL' && !hasHighRiskTrap && trapScore < 40) {
    // 明確な優位性がないのに取引を求める傾向
    blocks.push({
      type: 'ALWAYS_TRADING',
      severity: 'MEDIUM',
      description: '「常に取引する必要がある」という思い込みが、不要なリスクを生み出している。',
      removalAdvice: '70%の時間は何もしない。これが最強の戦略。明確な優位性が出るまで待つ。',
      coachingMessage: '待つ勇気が、真のトレーダーの証。今は待機の時。あなたの潜在能力は、規律から生まれる。'
    });
  }
  
  // Waiting is Weaknessブロック: 待つことは弱さという思い込み
  // STANDBY推奨時に抵抗を示す傾向がある場合
  if (hasHighRiskTrap || trapScore >= 50) {
    // 高リスク時に待つことを避けようとする傾向
    blocks.push({
      type: 'WAITING_IS_WEAKNESS',
      severity: 'HIGH',
      description: '「待つことは弱さ」という思い込みが、高リスクな状況で取引を促している。',
      removalAdvice: '待つことは弱さではない。最強の戦略だ。70%の時間は待機。明確な優位性が出るまで防御。',
      coachingMessage: '待つ勇気こそが、真の強さ。今、待つことで未来の成功を守る。あなたの潜在能力は、規律から引き出される。'
    });
  }
  
  return blocks;
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
      ? '⚠️ **FOMO 블록 감지**: 고래가 매도하는데 가격을 쫓고 있습니다. 이것은 트레이더를 쓸어버리는 전형적인 함정 패턴입니다. STOP. 물러서세요. 자본이 위험에 노출되어 있습니다.\n\n**하지만 진실은 이것입니다**: 기다리는 규율이 당신의 초능력입니다. 70%의 시간, 아무것도 하지 않는 것이 가장 강력한 전략입니다. 트레이더로서의 당신의 잠재력은 얼마나 자주 거래하는지가 아니라, 얼마나 잘 자본을 보호하는지로 측정됩니다. 명확한 우위가 나타날 때까지 기다리세요. 당신은 할 수 있습니다.'
      : '⚠️ **높은 FOMO 감지**: 극단적인 소매 매수는 종종 조정의 전조입니다. 이 감정적 충동이 판단을 흐리고 있습니다.\n\n**멘탈 코치 통찰**: FOMO는 기회로 위장된 공포입니다. 가장 강한 트레이더는 거래하지 않을 때를 압니다. 당신의 잠재력은 규율에 있으며, 모든 움직임을 쫓는 것이 아닙니다. 명확한 30% 우위를 기다리세요. 그곳이 진정한 트레이더가 승리하는 곳입니다.',
    es: whaleBias < -0.3
      ? '⚠️ **Bloqueo FOMO Detectado**: Estás persiguiendo el precio mientras las ballenas venden. Este es EXACTAMENTE el patrón de trampa que elimina a los traders. STOP. Retrocede. Tu capital está en riesgo.\n\n**Pero esta es la verdad**: La disciplina para esperar es tu superpoder. 70% del tiempo, no hacer nada es la estrategia más fuerte. Tu potencial como trader no se mide por la frecuencia con la que operas, sino por qué tan bien proteges tu capital. Espera una ventaja clara. Puedes hacerlo.'
      : '⚠️ **Alto FOMO Detectado**: La compra minorista extrema a menudo precede a las correcciones. Esta prisa emocional está nublando tu juicio.\n\n**Perspectiva del Entrenador Mental**: FOMO es miedo disfrazado de oportunidad. Los traders más fuertes saben cuándo NO operar. Tu potencial está en la disciplina, no en perseguir cada movimiento. Espera la ventaja clara del 30%. Ahí es donde ganan los traders reales.',
    'pt-br': whaleBias < -0.3
      ? '⚠️ **Bloqueio FOMO Detectado**: Você está perseguindo o preço enquanto baleias vendem. Este é EXATAMENTE o padrão de armadilha que elimina traders. PARE. Dê um passo atrás. Seu capital está em risco.\n\n**Mas esta é a verdade**: A disciplina para esperar é seu superpoder. 70% do tempo, não fazer nada é a estratégia mais forte. Seu potencial como trader não é medido pela frequência com que você negocia, mas por quão bem você protege seu capital. Aguarde uma vantagem clara. Você consegue.'
      : '⚠️ **Alto FOMO Detectado**: Compra extrema de varejo frequentemente precede correções. Esta pressa emocional está nublando seu julgamento.\n\n**Insight do Treinador Mental**: FOMO é medo disfarçado de oportunidade. Os traders mais fortes sabem quando NÃO negociar. Seu potencial está na disciplina, não em perseguir cada movimento. Aguarde a vantagem clara de 30%. É aí que traders reais ganham.',
    ar: whaleBias < -0.3
      ? '⚠️ **تم اكتشاف حاجز FOMO**: أنت تطارد السعر بينما الحيتان تبيع. هذا هو بالضبط نمط الفخ الذي يمحو المتداولين. توقف. تراجع. رأس مالك في خطر.\n\n**لكن هذه هي الحقيقة**: الانضباط للانتظار هو قوتك الخارقة. 70% من الوقت، عدم فعل أي شيء هو أقوى استراتيجية. إمكاناتك كمتداول لا تُقاس بمدى تكرار تداولك، بل بمدى حماية رأس مالك. انتظر ميزة واضحة. يمكنك فعل ذلك.'
      : '⚠️ **تم اكتشاف FOMO عالي**: الشراء المتطرف من التجزئة غالبًا ما يسبق التصحيحات. هذا الاندفاع العاطفي يغيم على حكمك.\n\n**رؤية المدرب العقلي**: FOMO هو خوف متنكر في شكل فرصة. أقوى المتداولين يعرفون متى لا يتداولون. إمكاناتك تكمن في الانضباط، وليس في مطاردة كل حركة. انتظر الميزة الواضحة البالغة 30%. هذا هو المكان الذي يفوز فيه المتداولون الحقيقيون.',
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
      ? '💡 **공포 블록 감지**: 당신의 공포가 마비를 일으키고 있지만, 고래는 축적 중입니다. 이 공포가 기회를 보는 능력을 차단하고 있습니다.\n\n**블록 제거**: 공포는 자연스러운 것이지만, 과도한 공포는 기회를 빼앗습니다. 고래 활동을 지켜보세요. 공포 시 고래가 축적할 때, 그것은 종종 역추세 신호입니다. 트레이더로서의 당신의 잠재력은 공포를 피하는 것이 아니라, 그것을 관리하는 것입니다. 침착하게. 면밀히 모니터링하세요. 당신은 이것을 처리할 수 있습니다.'
      : '💡 **공포 블록 감지**: 과도한 공포가 판단을 흐리고 있습니다. 시장 센티먼트가 부정적이지만, 공포에 의한 결정은 종종 나쁜 결과로 이어집니다.\n\n**멘탈 코치 통찰**: 공포는 마비를 일으킬 수 있지만, 잠재적 기회를 나타낼 수도 있습니다. 가장 강한 트레이더는 공포를 제거하는 것이 아니라 관리합니다. 당신의 잠재력은 다른 사람들이 패닉에 빠질 때 침착함에 있습니다. 고래 활동을 면밀히 모니터링하세요. 당신의 규율이 당신을 인도할 것입니다.',
    es: whaleBias > 0.3
      ? '💡 **Bloqueo de Miedo Detectado**: Tu miedo te está paralizando, pero las ballenas se están acumulando. Este miedo está BLOQUEANDO tu capacidad de ver oportunidades.\n\n**Eliminación del Bloqueo**: El miedo es natural, pero el miedo excesivo roba oportunidades. Observa la actividad de las ballenas. Cuando las ballenas se acumulan durante el miedo, a menudo es una señal contraria. Tu potencial como trader no se trata de evitar el miedo, sino de manejarlo. Mantén la calma. Monitorea de cerca. Puedes manejar esto.'
      : '💡 **Bloqueo de Miedo Detectado**: El miedo excesivo está nublando tu juicio. El sentimiento del mercado es negativo, pero las decisiones impulsadas por el miedo a menudo llevan a malos resultados.\n\n**Perspectiva del Entrenador Mental**: El miedo puede ser paralizante, pero también puede señalar oportunidades potenciales. Los traders más fuertes no eliminan el miedo, lo manejan. Tu potencial está en mantener la calma cuando otros entran en pánico. Monitorea la actividad de las ballenas de cerca. Tu disciplina te guiará.',
    'pt-br': whaleBias > 0.3
      ? '💡 **Bloqueio de Medo Detectado**: Seu medo está paralisando você, mas baleias estão acumulando. Este medo está BLOQUEANDO sua capacidade de ver oportunidades.\n\n**Remoção do Bloqueio**: O medo é natural, mas o medo excessivo rouba oportunidades. Observe a atividade das baleias. Quando baleias acumulam durante o medo, muitas vezes é um sinal contrário. Seu potencial como trader não é sobre evitar o medo, mas sobre gerenciá-lo. Mantenha a calma. Monitore de perto. Você pode lidar com isso.'
      : '💡 **Bloqueio de Medo Detectado**: Medo excessivo está nublando seu julgamento. Sentimento de mercado negativo, mas decisões impulsionadas pelo medo frequentemente levam a resultados ruins.\n\n**Insight do Treinador Mental**: O medo pode ser paralisante, mas também pode sinalizar oportunidades potenciais. Os traders mais fortes não eliminam o medo, eles o gerenciam. Seu potencial está em manter a calma quando outros entram em pânico. Monitore a atividade das baleias de perto. Sua disciplina o guiará.',
    ar: whaleBias > 0.3
      ? '💡 **تم اكتشاف حاجز الخوف**: خوفك يشللك، لكن الحيتان تتراكم. هذا الخوف يحجب قدرتك على رؤية الفرصة.\n\n**إزالة الحاجز**: الخوف طبيعي، لكن الخوف المفرط يسرق الفرص. راقب نشاط الحيتان. عندما تتراكم الحيتان أثناء الخوف، غالبًا ما يكون ذلك إشارة معاكسة. إمكاناتك كمتداول ليست حول تجنب الخوف، بل حول إدارته. ابق هادئًا. راقب عن كثب. يمكنك التعامل مع هذا.'
      : '💡 **تم اكتشاف حاجز الخوف**: الخوف المفرط يغيم على حكمك. مشاعر السوق سلبية، لكن القرارات التي يدفعها الخوف غالبًا ما تؤدي إلى نتائج سيئة.\n\n**رؤية المدرب العقلي**: يمكن أن يكون الخوف شللاً، لكنه يمكن أن يشير أيضًا إلى فرص محتملة. أقوى المتداولين لا يزيلون الخوف، بل يديرونه. إمكاناتك تكمن في البقاء هادئًا عندما يدخل الآخرون في حالة ذعر. راقب نشاط الحيتان عن كثب. سيقودك انضباطك.',
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
  // 常にCRITICALメッセージを提供（GREED状態は常に高リスク）- 「厳しいが励ましも含む」トーン
  const advice = {
    en: hasHighRiskTrap && trapScore >= 70
      ? '🚨 **CRITICAL: Greed Block Detected** + HIGH-RISK TRAP: Extreme greed is BLINDING you. Price surge with extreme retail FOMO. Whales ARE distributing. This is EXACTLY the trap that wipes out traders. Your greed is making you ignore the danger.\n\n**STOP NOW**: TAKE PROFITS IMMEDIATELY. Tighten stops aggressively. DO NOT add to positions. Your capital is at CRITICAL RISK.\n\n**Mental Coach Truth**: Greed is the most dangerous emotion. But here\'s what separates winners from losers: Winners control greed. Losers let greed control them. You have the discipline to protect your capital. Use it NOW. Your potential as a trader isn\'t about maximizing every trade - it\'s about surviving to trade another day. Protect your capital. You\'ve got this.'
      : '🚨 **CRITICAL: Greed Block Detected**: Extreme greed is clouding your judgment. Price surge with high retail FOMO. Whales may be distributing. HIGH RISK of reversal.\n\n**Block Removal**: Greed makes you ignore risk management. This is EXACTLY when you need discipline most. Consider taking profits or tightening stops. If trap conditions are present, AVOID new entries.\n\n**Mental Coach Insight**: Greed is fear of missing out disguised as opportunity. The strongest traders know when to take profits. Your potential lies in controlling greed, not letting it control you. Protect your capital. That\'s how winners stay in the game.',
    ja: hasHighRiskTrap && trapScore >= 70
      ? '🚨 **重大: 強欲ブロック検出** + 高リスクトラップ: 極端な強欲があなたを盲目にしています。価格急騰と極端なリテールFOMO。クジラは配布中です。これはトレーダーを一掃する典型的なトラップです。あなたの強欲が危険を無視させています。\n\n**今すぐSTOP**: 今すぐ利益確定してください。積極的にストップロスを締めてください。ポジションを追加しないでください。あなたの資金は重大なリスクにさらされています。\n\n**メンタルコーチの真実**: 強欲は最も危険な感情です。しかし、勝者と敗者を分けるものはこれです：勝者は強欲をコントロールします。敗者は強欲にコントロールされます。あなたには資金を保護する規律があります。今すぐそれを使ってください。トレーダーとしてのあなたの潜在能力は、すべての取引を最大化することではなく、別の日に取引するために生き残ることです。資金を保護してください。あなたならできます。'
      : '🚨 **重大: 強欲ブロック検出**: 極端な強欲が判断を曇らせています。価格急騰と高いリテールFOMO。クジラは配布している可能性があります。反転の高いリスク。\n\n**ブロック解除**: 強欲はリスク管理を無視させます。これは最も規律が必要な時です。利益確定またはストップロスを締めることを検討してください。トラップ条件が存在する場合、新しいエントリーを避けてください。\n\n**メンタルコーチの洞察**: 強欲は機会に偽装された取り残される恐怖です。最強のトレーダーは利益確定のタイミングを知っています。あなたの潜在能力は強欲をコントロールすることにあり、それにコントロールされることではありません。資金を保護してください。それが勝者がゲームに残る方法です。',
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
      ? '🆘 **Panic Block Detected**: Your panic is making you irrational, but whales are buying. This panic is BLOCKING your ability to see opportunity.\n\n**Block Removal**: Panic leads to irrational decisions. Breathe. When whales buy during panic, it\'s often a contrarian signal. But WAIT for confirmation. Your potential as a trader isn\'t about eliminating panic - it\'s about managing it. Stay calm. Wait for confirmation before entering. You can handle this.'
      : '🆘 **CRITICAL: Panic Block Detected**: Extreme panic is paralyzing you. Market is oversold, but panic-driven decisions often lead to poor outcomes.\n\n**Mental Coach Truth**: Panic is fear amplified. The strongest traders don\'t eliminate panic - they breathe through it. Your potential lies in staying calm when others panic. Wait for stabilization before making decisions. Your discipline will guide you through this. You\'ve got this.',
    ja: whaleBias > 0.3
      ? '🆘 **パニックブロック検出**: あなたのパニックが非合理的にさせていますが、クジラは買っています。このパニックが機会を見る能力をブロックしています。\n\n**ブロック解除**: パニックは非合理的な決定につながります。深呼吸してください。パニック時にクジラが買う場合、それはしばしば逆張りシグナルです。しかし、確認を待ってください。トレーダーとしてのあなたの潜在能力は、パニックを排除することではなく、それを管理することです。冷静に。エントリー前に確認を待ってください。あなたなら対処できます。'
      : '🆘 **重大: パニックブロック検出**: 極端なパニックが麻痺を引き起こしています。市場は売られすぎていますが、パニックに駆られた決定はしばしば悪い結果につながります。\n\n**メンタルコーチの真実**: パニックは増幅された恐怖です。最強のトレーダーはパニックを排除するのではなく、それを乗り越えます。あなたの潜在能力は、他の人がパニックになるときに冷静でいることにあります。決定を下す前に安定化を待ってください。あなたの規律があなたを導きます。あなたならできます。',
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
    en: '⚠️ **Euphoria Block Detected**: Euphoria is making you ignore risk. Both whales and retail are bullish, but this often precedes corrections. Market may be overextended.\n\n**Block Removal**: Euphoria is a warning sign disguised as success. The strongest traders take profits during euphoria. Your potential lies in recognizing when euphoria is masking danger. Consider profit-taking. Your discipline will protect your gains.',
    ja: '⚠️ **ユーフォリアブロック検出**: ユーフォリアがリスクを無視させています。クジラとリテールの両方が強気ですが、これはしばしば調整の前兆です。市場は過度に拡張している可能性があります。\n\n**ブロック解除**: ユーフォリアは成功に偽装された警告サインです。最強のトレーダーはユーフォリア時に利益確定します。あなたの潜在能力は、ユーフォリアが危険を隠しているときを認識することにあります。利益確定を検討してください。あなたの規律が利益を保護します。',
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
    en: '💭 **Confusion Block Detected**: Market sentiment is mixed - confusion is clouding your judgment. No clear direction. This is a "BUG STANDBY" situation.\n\n**Block Removal**: When confused, the best action is often inaction. This confusion is BLOCKING your ability to make clear decisions. Wait for clarity. 70% of the time, doing nothing is the strongest strategy.\n\n**Mental Coach Insight**: Confusion is uncertainty amplified. The strongest traders know when NOT to trade. Your potential lies in waiting for clarity, not forcing trades in confusion. Wait for clearer signals. Your discipline will protect your capital.',
    ja: '💭 **混乱ブロック検出**: 市場センチメントは混在しています - 混乱が判断を曇らせています。明確な方向性がありません。これは「BUG STANDBY」状況です。\n\n**ブロック解除**: 混乱しているとき、最善の行動はしばしば無行動です。この混乱が明確な決定をする能力をブロックしています。明確さを待ってください。70%の時間、何もしないことが最強の戦略です。\n\n**メンタルコーチの洞察**: 混乱は増幅された不確実性です。最強のトレーダーは取引しない時を知っています。あなたの潜在能力は、混乱の中で取引を強制することではなく、明確さを待つことにあります。より明確なシグナルを待ってください。あなたの規律が資金を保護します。',
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
    en: '✅ **Neutral State - No Mental Blocks Detected**: Market sentiment is balanced. No extreme emotions detected. Conditions are stable.\n\n**Mental Coach Insight**: This is the ideal state. No mental blocks are clouding your judgment. Continue monitoring. Maintain discipline and wait for high-probability setups. Your potential as a trader shines when you can maintain this calm state. Keep protecting your capital. You\'re doing great.',
    ja: '✅ **中立状態 - メンタルブロック未検出**: 市場センチメントはバランスが取れています。極端な感情は検知されていません。条件は安定しています。\n\n**メンタルコーチの洞察**: これは理想的な状態です。メンタルブロックが判断を曇らせていません。監視を継続してください。規律を維持し、高確率のセットアップを待ってください。トレーダーとしてのあなたの潜在能力は、この冷静な状態を維持できるときに輝きます。資金の保護を続けてください。素晴らしいです。',
    ko: '✅ **중립 상태 - 정신적 블록 미감지**: 시장 센티먼트가 균형을 이루고 있습니다. 극단적인 감정이 감지되지 않았습니다. 조건이 안정적입니다.\n\n**멘탈 코치 통찰**: 이것은 이상적인 상태입니다. 정신적 블록이 판단을 흐리지 않고 있습니다. 모니터링을 계속하세요. 규율을 유지하고 고확률 설정을 기다리세요. 트레이더로서의 당신의 잠재력은 이 차분한 상태를 유지할 수 있을 때 빛납니다. 자본 보호를 계속하세요. 잘하고 있습니다.',
    es: '✅ **Estado Neutral - Sin Bloqueos Mentales Detectados**: El sentimiento del mercado está equilibrado. No se detectaron emociones extremas. Las condiciones son estables.\n\n**Perspectiva del Entrenador Mental**: Este es el estado ideal. No hay bloqueos mentales nublando tu juicio. Continúa monitoreando. Mantén la disciplina y espera configuraciones de alta probabilidad. Tu potencial como trader brilla cuando puedes mantener este estado tranquilo. Sigue protegiendo tu capital. Lo estás haciendo genial.',
    'pt-br': '✅ **Estado Neutro - Sem Bloqueios Mentais Detectados**: Sentimento de mercado equilibrado. Nenhuma emoção extrema detectada. Condições estão estáveis.\n\n**Insight do Treinador Mental**: Este é o estado ideal. Nenhum bloqueio mental está nublando seu julgamento. Continue monitorando. Mantenha a disciplina e aguarde configurações de alta probabilidade. Seu potencial como trader brilha quando você pode manter este estado calmo. Continue protegendo seu capital. Você está indo muito bem.',
    ar: '✅ **حالة محايدة - لم يتم اكتشاف حواجز عقلية**: مشاعر السوق متوازنة. لم يتم اكتشاف عواطف متطرفة. الظروف مستقرة.\n\n**رؤية المدرب العقلي**: هذه هي الحالة المثالية. لا توجد حواجز عقلية تغيم على حكمك. استمر في المراقبة. حافظ على الانضباط وانتظر الإعدادات عالية الاحتمالية. إمكاناتك كمتداول تتألق عندما يمكنك الحفاظ على هذه الحالة الهادئة. استمر في حماية رأس مالك. أنت تبلي بلاءً حسناً.',
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
    mentalBlocks = [],
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
  const baseMessage = langMessages[psychologicalState] || langMessages.NEUTRAL;
  
  // メンタルブロック検出結果を統合
  let mentalBlockSection = '';
  if (Array.isArray(mentalBlocks) && mentalBlocks.length > 0) {
    // メンタルブロックを文字列に変換
    const blockMessages = mentalBlocks.map(block => {
      const severityEmoji = block.severity === 'CRITICAL' ? '🚨' :
                           block.severity === 'HIGH' ? '⚠️' : '💡';
      return `\n\n${severityEmoji} **${block.type} Block**: ${block.description}\n💡 ${block.removalAdvice}`;
    });
    mentalBlockSection = '\n\n**Mental Blocks Detected:**' + blockMessages.join('');
  }
  
  return baseMessage + mentalBlockSection;
}

/**
 * 後方互換性のためのラッパー関数
 * 既存のanalyzeXSentimentHighResolutionCompatと統合
 *
 * Task 10 オーバーロード: (snapshot, lang) を受け取る形式を追加
 * - 第1引数が snapshot（.raw を持つ）の場合: snapshot から marketData / xSentiment を抽出して呼び出し
 * - 従来の (marketData, xSentiment, lang) も引き続きサポート
 */
async function diagnoseUserSentimentCompat(marketDataOrSnapshot, xSentimentOrLang, lang = 'en') {
  let marketData, xSentiment;
  if (marketDataOrSnapshot && typeof marketDataOrSnapshot === 'object' && marketDataOrSnapshot.raw) {
    // (snapshot, lang) オーバーロード
    const snapshot = marketDataOrSnapshot;
    const targetLang = typeof xSentimentOrLang === 'string' ? xSentimentOrLang : 'en';
    const raw = snapshot.raw || {};
    marketData = {
      price_usd_display: raw.priceUsd ?? raw.price,
      change_24h: raw.change24h ?? 0,
      market_score: snapshot.market_score ?? 0,
      trapDetection: snapshot.trapDetection ?? null,
      marketBug: snapshot.trapDetection ?? null,
      trapAlert: snapshot.trapAlert ?? null,
      divergenceSignal: snapshot.divergenceSignal ?? null,
    };
    xSentiment = snapshot.xSentiment || { whaleBias: 0, retailFomo: 50 };
    lang = targetLang;
  } else {
    marketData = marketDataOrSnapshot;
    xSentiment = xSentimentOrLang;
    if (typeof xSentiment !== 'object') {
      lang = xSentimentOrLang || 'en';
      xSentiment = {};
    }
  }
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
