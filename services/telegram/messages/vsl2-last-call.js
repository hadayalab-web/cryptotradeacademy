// services/telegram/messages/vsl2-last-call.js
// VSL2 Last Call（終了直前リマインド）メッセージテンプレート（多言語対応）
// Created by Gemini: CMO - Optimized for urgency & clarity

const VSL2_LAST_CALL_MESSAGES = {
  // ------------------------------------------------------------------
  // English (Global Standard)
  // Strategy: Clear "last call" with benefits recap.
  // ------------------------------------------------------------------
  en: (userName, vsl2Link, whopUrl, promoCode) => `⏰ **Last Call, ${userName}!**

If you haven't upgraded yet, this is your final reminder to unlock the full Trap Defence BTC system.

✅ Complete on-chain analysis  
✅ Real-time trap alerts  
✅ Dr. Grok support

🎬 **Watch VSL2 now:**
${vsl2Link}

💰 **50% OFF Coupon:**
Code: \`${promoCode}\`

🚀 **Claim your upgrade here:**
${whopUrl}?promo=${promoCode}`,

  // ------------------------------------------------------------------
  // Japanese (Trust & Clarity)
  // Strategy: Polite urgency, clear recap of value.
  // ------------------------------------------------------------------
  ja: (userName, vsl2Link, whopUrl, promoCode) => `⏰ **${userName}さん、最終案内です**

まだアップグレードしていないなら、今が最後のチャンスです。フル版で完全な防衛体制を手に入れてください。

✅ 完全オンチェーン分析  
✅ リアルタイムトラップ検知  
✅ Dr. Grokサポート

🎬 **VSL2はこちら:**
${vsl2Link}

💰 **50%OFFクーポン:**
コード: \`${promoCode}\`

🚀 **申込はこちら:**
${whopUrl}?promo=${promoCode}`,

  // ------------------------------------------------------------------
  // Spanish (Urgency & Value)
  // ------------------------------------------------------------------
  es: (userName, vsl2Link, whopUrl, promoCode) => `⏰ **¡Último aviso, ${userName}!**

Si aún no actualizaste, este es tu recordatorio final para desbloquear Trap Defence BTC completo.

✅ Análisis on-chain completo  
✅ Alertas de trampas en tiempo real  
✅ Soporte Dr. Grok

🎬 **Mira el VSL2 ahora:**
${vsl2Link}

💰 **Cupón 50% OFF:**
Código: \`${promoCode}\`

🚀 **Activa tu upgrade aquí:**
${whopUrl}?promo=${promoCode}`,

  // ------------------------------------------------------------------
  // Portuguese (Brazil - Urgency & Clarity)
  // ------------------------------------------------------------------
  'pt-br': (userName, vsl2Link, whopUrl, promoCode) => `⏰ **Último aviso, ${userName}!**

Se você ainda não fez o upgrade, este é o lembrete final para liberar o Trap Defence BTC completo.

✅ Análise on-chain completa  
✅ Alertas de armadilhas em tempo real  
✅ Suporte Dr. Grok

🎬 **Assista ao VSL2 agora:**
${vsl2Link}

💰 **Cupom 50% OFF:**
Código: \`${promoCode}\`

🚀 **Garanta seu upgrade aqui:**
${whopUrl}?promo=${promoCode}`,

  // ------------------------------------------------------------------
  // Arabic (Respectful Urgency)
  // ------------------------------------------------------------------
  ar: (userName, vsl2Link, whopUrl, promoCode) => `⏰ **آخر تذكير لك يا ${userName}!**

إذا لم تقم بالترقية بعد، فهذا آخر نداء للحصول على Trap Defence BTC الكامل.

✅ تحليل كامل للسلسلة (On-Chain)  
✅ تنبيهات فورية للفخاخ  
✅ دعم Dr. Grok

🎬 **شاهد VSL2 الآن:**
${vsl2Link}

💰 **كوبون خصم 50%:**
الرمز: \`${promoCode}\`

🚀 **احصل على الترقية هنا:**
${whopUrl}?promo=${promoCode}`,

  // ------------------------------------------------------------------
  // Korean (Urgency & Benefit Recap)
  // ------------------------------------------------------------------
  ko: (userName, vsl2Link, whopUrl, promoCode) => `⏰ **${userName}님, 마지막 안내입니다!**

아직 업그레이드하지 않았다면 지금이 마지막 기회입니다. 풀버전으로 완전한 방어 체계를 확보하세요.

✅ 완전한 온체인 분석  
✅ 실시간 트랩 알림  
✅ Dr. Grok 지원

🎬 **VSL2 지금 시청:**
${vsl2Link}

💰 **50% 할인 쿠폰:**
코드: \`${promoCode}\`

🚀 **업그레이드 신청:**
${whopUrl}?promo=${promoCode}`,
};

/**
 * 言語に応じたVSL2 Last Callメッセージを生成
 * @param {string} lang - 言語コード
 * @param {string} userName - ユーザー名
 * @param {string} vsl2Link - VSL2動画リンク
 * @param {string} whopUrl - Whop商品ページURL
 * @param {string} promoCode - プロモーションコード
 */
function generateVSL2LastCallMessage(lang, userName, vsl2Link, whopUrl, promoCode) {
  const normalizedLang = lang && typeof lang === 'string'
    ? lang.toLowerCase().replace('_', '-')
    : 'en';

  const messageFn = VSL2_LAST_CALL_MESSAGES[normalizedLang] || VSL2_LAST_CALL_MESSAGES.en;
  return messageFn(userName, vsl2Link, whopUrl, promoCode);
}

module.exports = { generateVSL2LastCallMessage, VSL2_LAST_CALL_MESSAGES };
