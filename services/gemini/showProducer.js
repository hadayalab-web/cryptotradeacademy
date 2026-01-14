// services/gemini/showProducer.js
// Gemini番組プロデューサー（簡素化版）- ストーリーブランド戦略2.0の7つのフレームワークを活用
// USP2: メール配信ニュースレター形式のテキストベース番組編集長（Editor）
// 
// 変更: Veo動画、NanoBanana画像、HeyGenを削除し、テキストベースの簡易版に変更

// const { generateMarketImage } = require('./imageGenerator'); // 削除: 画像生成は不要
// const { generateMarketVideo } = require('./videoGenerator'); // 削除: 動画生成は不要

// キーアイディア: すべてのストーリーに一貫性を与える核となる概念
const KEY_IDEA = {
  en: '70% of the time, do nothing. Defend until clear advantage emerges.',
  ja: '70%の時間、何もするな。明確な優位性が出るまで防御。',
  ko: '70%의 시간, 아무것도 하지 마세요. 명확한 우위가 나타날 때까지 방어하세요.',
  es: '70% del tiempo, no hagas nada. Defiende hasta que surja una ventaja clara.',
  'pt-br': '70% do tempo, não faça nada. Defenda até que uma vantagem clara surja.',
  ar: '70% من الوقت، لا تفعل شيئًا. دافع حتى تظهر ميزة واضحة.',
};

/**
 * ストーリーブランド戦略2.0の7つのフレームワークに基づいて番組スクリプトを生成
 * 
 * @param {Object} options - 番組生成オプション
 * @param {Object} options.marketData - 市場データ
 * @param {Object} options.cryptoQuantData - CryptoQuantオンチェーンデータ
 * @param {Object} options.trapDetection - トラップ検出情報
 * @param {Object} options.psychologicalSupport - 心理サポート情報
 * @param {string} options.lang - 言語コード
 * @returns {Promise<Object>} 番組スクリプト
 */
async function generateShowScript(options = {}) {
  const {
    marketData = {},
    cryptoQuantData = {},
    trapDetection = null,
    psychologicalSupport = null,
    lang = 'en',
  } = options;

  const keyIdea = KEY_IDEA[lang] || KEY_IDEA.en;
  
  // 1. 主人公（ユーザー/トレーダー）
  const hero = {
    desire: {
      en: 'Protect your capital and avoid falling into traps',
      ja: '資金を守り、トラップに嵌らないようにする',
      ko: '자본을 보호하고 함정에 빠지지 않기',
      es: 'Proteger tu capital y evitar caer en trampas',
      'pt-br': 'Proteger seu capital e evitar cair em armadilhas',
      ar: 'حماية رأس مالك وتجنب الوقوع في الفخاخ',
    }[lang] || KEY_IDEA.en,
  };

  // 2. 問題の特定（悪役）
  // CryptoQuantデータの構造を確認: Exchange Flows, Market Indicator, Miner Flows, Network Indicator, Fund Data
  const villain = identifyVillain(marketData, cryptoQuantData, trapDetection, psychologicalSupport, lang);

  // 3. 導き手の登場（Trap Defense BTC）
  const guide = {
    name: 'Trap Defense BTC',
    empathy: {
      en: 'We understand your fear of losing capital. We\'ve been there.',
      ja: '資金を失う恐怖を理解しています。私たちも同じ経験をしました。',
      ko: '자본을 잃는 두려움을 이해합니다. 우리도 그곳에 있었습니다.',
      es: 'Entendemos tu miedo a perder capital. Hemos estado allí.',
      'pt-br': 'Entendemos seu medo de perder capital. Estivemos lá.',
      ar: 'نفهم خوفك من فقدان رأس المال. لقد كنا هناك.',
    }[lang] || 'We understand your fear of losing capital.',
    authority: {
      en: 'USP1: Trap Defense Engine | USP2: Gemini Content | USP3: GPT Mental Trainer + Dr. Grok',
      ja: 'USP1: トラップ防御エンジン | USP2: Geminiコンテンツ | USP3: GPTメンタルトレーナー + Dr. Grok',
      ko: 'USP1: 함정 방어 엔진 | USP2: Gemini 콘텐츠 | USP3: GPT 멘탈 트레이너 + Dr. Grok',
      es: 'USP1: Motor de Defensa de Trampas | USP2: Contenido Gemini | USP3: Entrenador Mental GPT + Dr. Grok',
      'pt-br': 'USP1: Motor de Defesa de Armadilhas | USP2: Conteúdo Gemini | USP3: Treinador Mental GPT + Dr. Grok',
      ar: 'USP1: محرك الدفاع عن الفخاخ | USP2: محتوى Gemini | USP3: مدرب عقلي GPT + Dr. Grok',
    }[lang] || 'USP1: Trap Defense Engine | USP2: Gemini Content | USP3: GPT Mental Trainer + Dr. Grok',
  };

  // 4. 計画の提示
  const plan = createPlan(marketData, trapDetection, lang, keyIdea);

  // 5. 行動喚起
  const callToAction = createCallToAction(lang, keyIdea);

  // 6. 回避したい失敗
  const failureToAvoid = {
    en: 'Losing capital by falling into traps. Making emotional decisions driven by FOMO/FEAR/GREED.',
      ja: 'トラップに嵌って資金を失うこと。FOMO/FEAR/GREEDに駆られた感情的な決定をすること。',
      ko: '함정에 빠져 자본을 잃는 것. FOMO/FEAR/GREED에 의해 추진된 감정적 결정을 내리는 것.',
      es: 'Perder capital cayendo en trampas. Tomar decisiones emocionales impulsadas por FOMO/FEAR/GREED.',
      'pt-br': 'Perder capital caindo em armadilhas. Tomar decisões emocionais impulsionadas por FOMO/FEAR/GREED.',
      ar: 'فقدان رأس المال من خلال الوقوع في الفخاخ. اتخاذ قرارات عاطفية مدفوعة بـ FOMO/FEAR/GREED.',
    }[lang] || 'Losing capital by falling into traps.';

  // 7. 成功する結末
  const successEnding = {
    en: 'Become a disciplined trader who protects capital. Avoid traps and trade only when clear advantage emerges. Unlock your potential by removing mental blocks.',
      ja: '資金を保護する規律あるトレーダーになる。トラップを回避し、明確な優位性が出たときのみ取引する。メンタルブロックを解除して潜在能力を引き出す。',
      ko: '자본을 보호하는 규율 있는 트레이더가 되기. 함정을 피하고 명확한 우위가 나타날 때만 거래하기. 정신적 블록을 제거하여 잠재력을 발휘하기.',
      es: 'Conviértete en un trader disciplinado que protege el capital. Evita trampas y opera solo cuando surja una ventaja clara. Desbloquea tu potencial eliminando bloqueos mentales.',
      'pt-br': 'Torne-se um trader disciplinado que protege o capital. Evite armadilhas e negocie apenas quando uma vantagem clara surgir. Desbloqueie seu potencial removendo bloqueios mentais.',
      ar: 'كن متداولًا منضبطًا يحمي رأس المال. تجنب الفخاخ وتداول فقط عندما تظهر ميزة واضحة. أطلق العنان لإمكاناتك من خلال إزالة الحواجز العقلية.',
    }[lang] || 'Become a disciplined trader who protects capital.';

  return {
    keyIdea,
    hero,
    villain,
    guide,
    plan,
    callToAction,
    failureToAvoid,
    successEnding,
  };
}

/**
 * 悪役（問題）を特定
 * ストーリーブランド戦略2.0: 外的問題、内的問題、哲学的問題の3レベル
 */
function identifyVillain(marketData, cryptoQuantData, trapDetection, psychologicalSupport, lang) {
  const villain = {
    external: null, // 外的問題: 市場のトラップ
    internal: null, // 内的問題: FOMO/FEAR/GREED、メンタルブロック
    philosophical: null, // 哲学的問題: 「常に取引する必要がある」「待つことは弱さ」
  };

  // 外的問題: トラップ検出
  if (trapDetection) {
    const trapSeverity = trapDetection.trapSeverity || trapDetection.severity || 'NONE';
    const trapScore = trapDetection.trapScore || trapDetection.score || 0;
    const trapType = trapDetection.trapType || trapDetection.type || 'UNKNOWN';

    if (trapSeverity !== 'NONE' || trapScore > 0) {
      villain.external = {
        type: trapType,
        severity: trapSeverity,
        score: trapScore,
        description: {
          en: `Market trap detected: ${trapType} (Severity: ${trapSeverity}, Score: ${trapScore}/100). This trap is designed to liquidate traders.`,
          ja: `市場トラップ検出: ${trapType} (重大度: ${trapSeverity}, スコア: ${trapScore}/100)。このトラップはトレーダーを清算するために設計されています。`,
          ko: `시장 함정 감지: ${trapType} (심각도: ${trapSeverity}, 점수: ${trapScore}/100). 이 함정은 트레이더를 청산하기 위해 설계되었습니다.`,
          es: `Trampa de mercado detectada: ${trapType} (Severidad: ${trapSeverity}, Puntuación: ${trapScore}/100). Esta trampa está diseñada para liquidar traders.`,
          'pt-br': `Armadilha de mercado detectada: ${trapType} (Severidade: ${trapSeverity}, Pontuação: ${trapScore}/100). Esta armadilha é projetada para liquidar traders.`,
          ar: `تم اكتشاف فخ السوق: ${trapType} (الشدة: ${trapSeverity}, النقاط: ${trapScore}/100). تم تصميم هذا الفخ لتصفية المتداولين.`,
        }[lang] || `Market trap detected: ${trapType}`,
      };
    }
  }

  // 内的問題: メンタルブロック
  if (psychologicalSupport && psychologicalSupport.mentalBlocks && psychologicalSupport.mentalBlocks.length > 0) {
    const mentalBlocks = psychologicalSupport.mentalBlocks;
    villain.internal = {
      blocks: mentalBlocks,
      description: {
        en: `Mental blocks detected: ${mentalBlocks.map(b => b.type).join(', ')}. These blocks are clouding your judgment and preventing you from making clear decisions.`,
        ja: `メンタルブロック検出: ${mentalBlocks.map(b => b.type).join(', ')}。これらのブロックが判断を曇らせ、明確な決定を妨げています。`,
        ko: `정신적 블록 감지: ${mentalBlocks.map(b => b.type).join(', ')}. 이러한 블록이 판단을 흐리게 하고 명확한 결정을 방해하고 있습니다.`,
        es: `Bloqueos mentales detectados: ${mentalBlocks.map(b => b.type).join(', ')}. Estos bloqueos están nublando tu juicio y evitando que tomes decisiones claras.`,
        'pt-br': `Bloqueios mentais detectados: ${mentalBlocks.map(b => b.type).join(', ')}. Esses bloqueios estão nublando seu julgamento e impedindo você de tomar decisões claras.`,
        ar: `تم اكتشاف الحواجز العقلية: ${mentalBlocks.map(b => b.type).join(', ')}. هذه الحواجز تغيم على حكمك وتمنعك من اتخاذ قرارات واضحة.`,
      }[lang] || `Mental blocks detected: ${mentalBlocks.map(b => b.type).join(', ')}`,
    };
  }

  // 哲学的問題: 「常に取引する必要がある」「待つことは弱さ」
  villain.philosophical = {
    en: 'The belief that "I must always trade" and "Waiting is weakness". This philosophical problem prevents you from following the 70% waiting strategy.',
    ja: '「常に取引する必要がある」「待つことは弱さ」という思い込み。この哲学的問題が70%待機戦略に従うことを妨げています。',
    ko: '"항상 거래해야 한다"와 "기다리는 것은 약점이다"라는 믿음. 이 철학적 문제가 70% 대기 전략을 따르는 것을 방해합니다.',
    es: 'La creencia de que "Debo operar siempre" y "Esperar es debilidad". Este problema filosófico te impide seguir la estrategia de espera del 70%.',
    'pt-br': 'A crença de que "Devo sempre negociar" e "Esperar é fraqueza". Este problema filosófico impede você de seguir a estratégia de espera de 70%.',
    ar: 'الاعتقاد بأن "يجب أن أتداول دائمًا" و"الانتظار ضعف". هذه المشكلة الفلسفية تمنعك من اتباع استراتيجية الانتظار بنسبة 70%.',
  }[lang] || 'The belief that "I must always trade" and "Waiting is weakness".';

  return villain;
}

/**
 * 計画の提示を生成
 */
function createPlan(marketData, trapDetection, lang, keyIdea) {
  const hasTrap = trapDetection && (trapDetection.trapSeverity !== 'NONE' || (trapDetection.trapScore || 0) > 0);
  
  const plan = {
    process: {
      en: hasTrap
        ? 'Step 1: Recognize the trap. Step 2: Standby (70% waiting strategy). Step 3: Wait for clear advantage. Step 4: Act only when odds are unfairly in your favor.'
        : 'Step 1: Monitor market conditions. Step 2: Use Trap Defense Engine to detect traps. Step 3: Follow 70% waiting strategy. Step 4: Act only when clear advantage emerges.',
      ja: hasTrap
        ? 'ステップ1: トラップを認識する。ステップ2: 待機（70%待機戦略）。ステップ3: 明確な優位性を待つ。ステップ4: 勝率が不公平にあなたの味方になったときのみ行動する。'
        : 'ステップ1: 市場状況を監視する。ステップ2: Trap Defense Engineを使用してトラップを検出する。ステップ3: 70%待機戦略に従う。ステップ4: 明確な優位性が出たときのみ行動する。',
      ko: hasTrap
        ? '단계 1: 함정을 인식합니다. 단계 2: 대기(70% 대기 전략). 단계 3: 명확한 우위를 기다립니다. 단계 4: 확률이 불공정하게 당신 편에 설 때만 행동합니다.'
        : '단계 1: 시장 상황을 모니터링합니다. 단계 2: Trap Defense Engine을 사용하여 함정을 감지합니다. 단계 3: 70% 대기 전략을 따릅니다. 단계 4: 명확한 우위가 나타날 때만 행동합니다.',
      es: hasTrap
        ? 'Paso 1: Reconocer la trampa. Paso 2: Esperar (estrategia de espera del 70%). Paso 3: Esperar una ventaja clara. Paso 4: Actuar solo cuando las probabilidades estén injustamente a tu favor.'
        : 'Paso 1: Monitorear las condiciones del mercado. Paso 2: Usar Trap Defense Engine para detectar trampas. Paso 3: Seguir la estrategia de espera del 70%. Paso 4: Actuar solo cuando surja una ventaja clara.',
      'pt-br': hasTrap
        ? 'Passo 1: Reconhecer a armadilha. Passo 2: Aguardar (estratégia de espera de 70%). Passo 3: Aguardar uma vantagem clara. Passo 4: Agir apenas quando as probabilidades estiverem injustamente a seu favor.'
        : 'Passo 1: Monitorar as condições do mercado. Passo 2: Usar Trap Defense Engine para detectar armadilhas. Passo 3: Seguir a estratégia de espera de 70%. Passo 4: Agir apenas quando uma vantagem clara surgir.',
      ar: hasTrap
        ? 'الخطوة 1: التعرف على الفخ. الخطوة 2: الانتظار (استراتيجية الانتظار 70%). الخطوة 3: انتظار ميزة واضحة. الخطوة 4: التصرف فقط عندما تكون الاحتمالات غير عادلة لصالحك.'
        : 'الخطوة 1: مراقبة ظروف السوق. الخطوة 2: استخدام محرك الدفاع عن الفخاخ لاكتشاف الفخاخ. الخطوة 3: اتباع استراتيجية الانتظار 70%. الخطوة 4: التصرف فقط عندما تظهر ميزة واضحة.',
    }[lang] || (hasTrap ? 'Step 1: Recognize the trap. Step 2: Standby.' : 'Step 1: Monitor market conditions. Step 2: Use Trap Defense Engine.'),
    promise: {
      en: `Key Idea: ${keyIdea} This is not a bug - it's a feature. The strongest strategy is often doing nothing.`,
      ja: `キーアイディア: ${keyIdea} これはバグではありません - 機能です。最強の戦略はしばしば何もしないことです。`,
      ko: `핵심 아이디어: ${keyIdea} 이것은 버그가 아닙니다 - 기능입니다. 가장 강력한 전략은 종종 아무것도 하지 않는 것입니다.`,
      es: `Idea Clave: ${keyIdea} Esto no es un error, es una característica. La estrategia más fuerte a menudo es no hacer nada.`,
      'pt-br': `Ideia Chave: ${keyIdea} Isso não é um bug, é uma característica. A estratégia mais forte geralmente é não fazer nada.`,
      ar: `الفكرة الرئيسية: ${keyIdea} هذا ليس خطأ - إنها ميزة. أقوى استراتيجية غالبًا هي عدم فعل أي شيء.`,
    }[lang] || `Key Idea: ${keyIdea}`,
  };

  return plan;
}

/**
 * 行動喚起を生成
 */
function createCallToAction(lang, keyIdea) {
  return {
    direct: {
      en: 'Join Trap Defense BTC on Whop. Learn the 70% waiting strategy. Protect your capital.',
      ja: 'WhopでTrap Defense BTCに参加してください。70%待機戦略を学びましょう。資金を保護してください。',
      ko: 'Whop에서 Trap Defense BTC에 가입하세요. 70% 대기 전략을 배우세요. 자본을 보호하세요.',
      es: 'Únete a Trap Defense BTC en Whop. Aprende la estrategia de espera del 70%. Protege tu capital.',
      'pt-br': 'Junte-se ao Trap Defense BTC no Whop. Aprenda a estratégia de espera de 70%. Proteja seu capital.',
      ar: 'انضم إلى Trap Defense BTC على Whop. تعلم استراتيجية الانتظار 70%. احم رأس مالك.',
    }[lang] || 'Join Trap Defense BTC on Whop.',
    transitional: {
      en: 'Read this email → Understand traps → Learn defensive approach → Join Whop → Practice 70% waiting strategy',
      ja: 'このメールを読む → トラップを理解する → 防御的アプローチを学ぶ → Whopに参加する → 70%待機戦略を実践する',
      ko: '이 이메일 읽기 → 함정 이해하기 → 방어적 접근법 배우기 → Whop 가입하기 → 70% 대기 전략 실천하기',
      es: 'Lee este correo → Entiende las trampas → Aprende el enfoque defensivo → Únete a Whop → Practica la estrategia de espera del 70%',
      'pt-br': 'Leia este email → Entenda as armadilhas → Aprenda a abordagem defensiva → Junte-se ao Whop → Pratique a estratégia de espera de 70%',
      ar: 'اقرأ هذا البريد الإلكتروني → افهم الفخاخ → تعلم النهج الدفاعي → انضم إلى Whop → مارس استراتيجية الانتظار 70%',
    }[lang] || 'Read → Understand → Learn → Join → Practice',
  };
}

/**
 * リソースを統合して番組を構成（簡素化版）
 * テキストベースのみ、動画・画像生成は削除
 */
async function integrateResources(options = {}) {
  const {
    marketData = {},
    cryptoQuantData = {},
    trapDetection = null,
    psychologicalSupport = null,
    lang = 'en',
  } = options;

  // 番組スクリプトを生成
  const script = await generateShowScript({
    marketData,
    cryptoQuantData,
    trapDetection,
    psychologicalSupport,
    lang,
  });

  // 簡素化版: テキストベースのみ
  // 1. Opening（オープニング）: テキストのみ（動画生成削除）
  // 2. Data Presentation（データ提示）: テキスト表のみ（画像生成削除）
  // 3. Analysis（分析）: GPT Mental Trainerの解説は既に生成済み（cron.jsで）
  // 4. Commentary（コメンタリー）: Dr. Grokの心理サポートは既に生成済み（cron.jsで）

  return {
    script,
    opening: {
      // video: null, // 削除: 動画生成は不要
      narrative: script.hero.desire,
      problem: script.villain.external?.description || script.villain.philosophical,
    },
    dataPresentation: {
      // image: null, // 削除: 画像生成は不要
      cryptoQuantData: {
        // Exchange Flows
        exchangeInflow: cryptoQuantData?.exchangeInflow || cryptoQuantData?.netflow?.timeframes?.day?.current || null,
        netflow: cryptoQuantData?.netflow || null,
        // Market Indicator
        whaleFlows: cryptoQuantData?.whaleFlows || cryptoQuantData?.whaleRatio || null,
        liquidations: cryptoQuantData?.liquidations || null,
        trapScore: cryptoQuantData?.trapScore || null,
        // Miner Flows
        minerMPI: cryptoQuantData?.minerMPI || cryptoQuantData?.mpi?.timeframes?.day?.current || null,
        // Network Indicator
        nupl: cryptoQuantData?.longTerm?.nupl || null,
        sopr: cryptoQuantData?.longTerm?.sopr || null,
        sopr30d: cryptoQuantData?.longTerm?.sopr30d || null,
        // Fund Data (ETF Flows - 将来実装予定)
        etfFlows: cryptoQuantData?.etfFlows || null,
      },
      // Data Presentation: 問題の可視化（Story Arcと重複しないよう、詳細なデータ説明を含める）
      // Story Arcが最初の文のみを使用するため、Data Presentationには全文を含める
      problemVisualization: script.villain.external?.description 
        ? `Market trap detected: ${script.villain.external.type || 'TRAP'} (Severity: ${script.villain.external.severity || 'NONE'}, Score: ${script.villain.external.score || 0}/100). ${script.villain.external.description}`
        : (script.villain.philosophical ? `Market conditions require careful analysis. ${script.villain.philosophical}` : null),
    },
    analysis: {
      // GPT Mental Trainerの解説は後で統合
      trapDefenseEngine: script.plan,
    },
    commentary: {
      // Dr. Grokの心理サポートは後で統合
      mentalBlocks: script.villain.internal || null,
    },
    callToAction: {
      avoidFailure: script.failureToAvoid,
      successEnding: script.successEnding,
      cta: script.callToAction,
    },
  };
}

/**
 * 物語の円環を開く/閉じる
 * ストーリーブランド戦略2.0: 物語の円環を開く（問題の提示）、物語の円環を閉じる（成功する結末）
 * 改善: Story ArcとData Presentationの重複を避けるため、Story Arcには問題の提示のみを含める
 */
function createNarrativeArc(script, lang) {
  const keyIdea = KEY_IDEA[lang] || KEY_IDEA.en;
  
  // 物語の円環を開く: 問題の提示（データの詳細は含めない）
  // villain.external.descriptionの全文ではなく、最初の文のみを使用して重複を避ける
  let villainDescription = '';
  if (script.villain.external?.description) {
    // 最初の文のみを抽出（ピリオドまたは句点で区切る）
    const firstSentence = script.villain.external.description.split(/[。.]/)[0];
    villainDescription = firstSentence ? `${firstSentence}.` : script.villain.external.description;
  } else {
    villainDescription = script.villain.philosophical || '';
  }
  
  const open = {
    en: `You want to protect your capital, but traps are everywhere. ${villainDescription}`,
    ja: `あなたは資金を守りたいが、トラップは至る所にあります。${villainDescription}`,
    ko: `당신은 자본을 보호하고 싶지만 함정은 어디에나 있습니다. ${villainDescription}`,
    es: `Quieres proteger tu capital, pero las trampas están en todas partes. ${villainDescription}`,
    'pt-br': `Você quer proteger seu capital, mas as armadilhas estão em todos os lugares. ${villainDescription}`,
    ar: `تريد حماية رأس مالك، لكن الفخاخ في كل مكان. ${villainDescription}`,
  }[lang] || `You want to protect your capital, but traps are everywhere.`;
  
  // 物語の円環を閉じる: 成功する結末
  const close = {
    en: `${script.successEnding} Key Idea: ${keyIdea}`,
    ja: `${script.successEnding} キーアイディア: ${keyIdea}`,
    ko: `${script.successEnding} 핵심 아이디어: ${keyIdea}`,
    es: `${script.successEnding} Idea Clave: ${keyIdea}`,
    'pt-br': `${script.successEnding} Ideia Chave: ${keyIdea}`,
    ar: `${script.successEnding} الفكرة الرئيسية: ${keyIdea}`,
  }[lang] || script.successEnding;
  
  return {
    open,
    close,
  };
}

/**
 * 番組全体を生成（メイン関数）
 */
async function produceShow(options = {}) {
  const {
    marketData = {},
    cryptoQuantData = {},
    trapDetection = null,
    psychologicalSupport = null,
    gptMentalTrainerAnalysis = null,
    lang = 'en',
  } = options;

  try {
    // リソースを統合
    const showContent = await integrateResources({
      marketData,
      cryptoQuantData,
      trapDetection,
      psychologicalSupport,
      lang,
    });

    // 物語の円環を作成
    const narrativeArc = createNarrativeArc(showContent.script, lang);

    // GPT Mental TrainerとDr. Grokの分析を統合
    showContent.analysis.gptMentalTrainer = gptMentalTrainerAnalysis || null;
    showContent.commentary.drGrok = psychologicalSupport || null;

    return {
      ...showContent,
      narrativeArc,
      keyIdea: KEY_IDEA[lang] || KEY_IDEA.en,
    };
  } catch (error) {
    console.error('[Gemini Show Producer] Error producing show:', error);
    return null;
  }
}

module.exports = {
  generateShowScript,
  integrateResources,
  createNarrativeArc,
  produceShow,
  KEY_IDEA,
};
