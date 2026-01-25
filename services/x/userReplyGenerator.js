// services/x/userReplyGenerator.js
// ユーザーリプライへのパーソナライズされた自動返信テキスト生成（Grok推奨）

const { analyzeXSentimentLive } = require('../grok/client');

/**
 * ユーザーリプライへのパーソナライズされた自動返信テキストを生成
 * Grok推奨: パーソナライズされた価値提供
 * @param {string} lang - 言語コード
 * @param {Object} reply - リプライオブジェクト {id, text, author, metrics, ...}
 * @param {Object} reportData - レポートデータ
 * @returns {Promise<string>} 返信テキスト
 */
async function generateUserReplyText(lang, reply, reportData = null) {
  const normalizedLang = (lang || 'en').toLowerCase();
  const { trapScore = 25, priceUsd = null, change24h = null } = reportData || {};
  const replyText = reply.text || '';
  const authorUsername = reply.author?.username || 'there';

  // Grok推奨: リプライ内容を分析してパーソナライズ
  let personalizedContext = '';
  try {
    // リプライの感情/意図を分析（簡易版）
    const isQuestion = replyText.includes('?') || replyText.toLowerCase().includes('how') || replyText.toLowerCase().includes('what');
    const isPositive = replyText.toLowerCase().includes('thanks') || replyText.toLowerCase().includes('great') || replyText.toLowerCase().includes('awesome');
    const isNegative = replyText.toLowerCase().includes('scam') || replyText.toLowerCase().includes('fake') || replyText.toLowerCase().includes('bad');

    if (isQuestion) {
      personalizedContext = 'question';
    } else if (isPositive) {
      personalizedContext = 'positive';
    } else if (isNegative) {
      personalizedContext = 'negative';
    } else {
      personalizedContext = 'neutral';
    }
  } catch (error) {
    console.warn('[User Reply Generator] Failed to analyze reply context:', error.message);
    personalizedContext = 'neutral';
  }

  // 言語別テンプレート（パーソナライズ対応）
  const replyTemplates = {
    'en': {
      question: `@${authorUsername} Great question! The Trap Score combines exchange netflow, whale activity, and market sentiment. Want to see how I use it? Check the free version: [link]`,
      positive: `@${authorUsername} Thanks! 🙏 The Trap Score saved me from a dump last week. The free version is powerful - try it! [link]`,
      negative: `@${authorUsername} I understand your concern. The Trap Score is based on on-chain data from CryptoQuant. You can verify it yourself - free version available: [link]`,
      neutral: `@${authorUsername} The Trap Score is 🔥! It combines multiple signals to detect traps. Try the free version to see it in action: [link]`,
    },
    'ja': {
      question: `@${authorUsername} 良い質問ですね！Trap Scoreは取引所のネットフロー、クジラの動き、市場センチメントを組み合わせています。使い方を見たいですか？無料版をチェック: [link]`,
      positive: `@${authorUsername} ありがとうございます！🙏 Trap Scoreが先週の暴落から救ってくれました。無料版も強力です - 試してみてください！[link]`,
      negative: `@${authorUsername} ご懸念は理解できます。Trap ScoreはCryptoQuantのオンチェーンデータに基づいています。自分で確認できます - 無料版があります: [link]`,
      neutral: `@${authorUsername} Trap Scoreは🔥です！複数のシグナルを組み合わせてトラップを検出します。無料版を試して実際に使ってみてください: [link]`,
    },
    'es': {
      question: `@${authorUsername} ¡Buena pregunta! El Trap Score combina el flujo neto de intercambio, la actividad de ballenas y el sentimiento del mercado. ¿Quieres ver cómo lo uso? Revisa la versión gratuita: [link]`,
      positive: `@${authorUsername} ¡Gracias! 🙏 El Trap Score me salvó de una caída la semana pasada. La versión gratuita es poderosa - ¡pruébala! [link]`,
      negative: `@${authorUsername} Entiendo tu preocupación. El Trap Score se basa en datos on-chain de CryptoQuant. Puedes verificarlo tú mismo - versión gratuita disponible: [link]`,
      neutral: `@${authorUsername} ¡El Trap Score es 🔥! Combina múltiples señales para detectar trampas. Prueba la versión gratuita para verlo en acción: [link]`,
    },
    'pt-br': {
      question: `@${authorUsername} Ótima pergunta! O Trap Score combina o fluxo líquido de exchange, atividade de baleias e sentimento do mercado. Quer ver como eu uso? Confira a versão gratuita: [link]`,
      positive: `@${authorUsername} Obrigado! 🙏 O Trap Score me salvou de uma queda na semana passada. A versão gratuita é poderosa - experimente! [link]`,
      negative: `@${authorUsername} Entendo sua preocupação. O Trap Score é baseado em dados on-chain do CryptoQuant. Você pode verificar você mesmo - versão gratuita disponível: [link]`,
      neutral: `@${authorUsername} O Trap Score é 🔥! Combina múltiplos sinais para detectar armadilhas. Experimente a versão gratuita para ver em ação: [link]`,
    },
    'ar': {
      question: `@${authorUsername} سؤال رائع! Trap Score يجمع بين صافي تدفق البورصة ونشاط الحيتان ومشاعر السوق. تريد أن ترى كيف أستخدمه؟ تحقق من النسخة المجانية: [link]`,
      positive: `@${authorUsername} شكراً! 🙏 Trap Score أنقذني من انهيار الأسبوع الماضي. النسخة المجانية قوية - جربها! [link]`,
      negative: `@${authorUsername} أفهم قلقك. Trap Score يعتمد على بيانات on-chain من CryptoQuant. يمكنك التحقق بنفسك - النسخة المجانية متاحة: [link]`,
      neutral: `@${authorUsername} Trap Score رائع! 🔥 يجمع بين إشارات متعددة للكشف عن الفخاخ. جرب النسخة المجانية لرؤيتها في العمل: [link]`,
    },
    'ko': {
      question: `@${authorUsername} 좋은 질문이에요! Trap Score는 거래소 순유입, 고래 활동, 시장 심리를 결합합니다. 사용법을 보고 싶으신가요? 무료 버전 확인: [link]`,
      positive: `@${authorUsername} 감사합니다! 🙏 Trap Score가 지난주 폭락에서 저를 구해줬어요. 무료 버전도 강력합니다 - 시도해보세요! [link]`,
      negative: `@${authorUsername} 걱정을 이해합니다. Trap Score는 CryptoQuant의 온체인 데이터를 기반으로 합니다. 직접 확인할 수 있습니다 - 무료 버전 제공: [link]`,
      neutral: `@${authorUsername} Trap Score는 🔥입니다! 여러 신호를 결합하여 함정을 감지합니다. 무료 버전을 시도해 실제로 사용해보세요: [link]`,
    },
  };

  const templates = replyTemplates[normalizedLang] || replyTemplates['en'];
  let template = templates[personalizedContext] || templates.neutral;

  // Telegram Deep Linkを生成
  const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'TrapDefenceBot';
  const deepLink = `https://t.me/${botUsername.replace(/^@/, '')}?start=minimal_${normalizedLang}_x_reply`;

  // テンプレートの[link]を実際のリンクに置換
  template = template.replace('[link]', deepLink);

  return template;
}

module.exports = {
  generateUserReplyText,
};
