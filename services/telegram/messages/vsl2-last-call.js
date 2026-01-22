// services/telegram/messages/vsl2-last-call.js
// VSL2 Last Call（終了直前リマインド）メッセージテンプレート（多言語対応）
// Created by Gemini: CMO - Optimized for urgency & clarity

const VSL2_LAST_CALL_MESSAGES = {
  // ------------------------------------------------------------------
  // English (Global Standard)
  // Strategy: Clear "last call" with benefits recap + Value Clarity
  // Optimized: Added "complete defense system" and clearer value proposition
  // ------------------------------------------------------------------
  en: (userName, vsl2Link, whopUrl, promoCode) => `⏰ **Last Call, ${userName}!**

If you haven't upgraded yet, this is your final chance. Get the complete defense system with the Full Version.

✅ Complete on-chain analysis  
✅ Real-time trap alerts  
✅ Dr. Grok support

🎬 **Watch why the pros always win:**
${vsl2Link}
💡 Subtitles available in 6 languages (EN, JA, ES, PT-BR, AR, KO) - enable in video settings

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

🎬 **勝てる人の理由を見る:**
${vsl2Link}
💡 動画の設定で字幕（日本語・英語・スペイン語・ポルトガル語・アラビア語・韓国語）を表示できます

💰 **50%OFFクーポン:**
コード: \`${promoCode}\`

🚀 **申込はこちら:**
${whopUrl}?promo=${promoCode}`,

  // ------------------------------------------------------------------
  // Spanish (Urgency & Value)
  // Strategy: Clear "last call" with benefits recap + Value Clarity
  // Optimized: Added "última oportunidad" and "sistema de defensa completo" for clearer value proposition
  // ------------------------------------------------------------------
  es: (userName, vsl2Link, whopUrl, promoCode) => `⏰ **¡Último aviso, ${userName}!**

Si aún no actualizaste, esta es tu última oportunidad. Obtén el sistema de defensa completo con la Versión Completa.

✅ Análisis on-chain completo  
✅ Alertas de trampas en tiempo real  
✅ Soporte Dr. Grok

🎬 **Mira por qué los pros siempre ganan:**
${vsl2Link}
💡 Subtítulos disponibles en 6 idiomas (EN, JA, ES, PT-BR, AR, KO) - activa en configuración del video

💰 **Cupón 50% OFF:**
Código: \`${promoCode}\`

🚀 **Activa tu upgrade aquí:**
${whopUrl}?promo=${promoCode}`,

  // ------------------------------------------------------------------
  // Portuguese (Brazil - Urgency & Clarity)
  // Strategy: Clear "last call" with benefits recap + Value Clarity
  // Optimized: Added "última chance" and "sistema de defesa completo" for clearer value proposition
  // ------------------------------------------------------------------
  'pt-br': (userName, vsl2Link, whopUrl, promoCode) => `⏰ **Último aviso, ${userName}!**

Se você ainda não fez o upgrade, esta é sua última chance. Obtenha o sistema de defesa completo com a Versão Completa.

✅ Análise on-chain completa  
✅ Alertas de armadilhas em tempo real  
✅ Suporte Dr. Grok

🎬 **Veja por que os profissionais sempre vencem:**
${vsl2Link}
💡 Legendas disponíveis em 6 idiomas (EN, JA, ES, PT-BR, AR, KO) - ative nas configurações do vídeo

💰 **Cupom 50% OFF:**
Código: \`${promoCode}\`

🚀 **Garanta seu upgrade aqui:**
${whopUrl}?promo=${promoCode}`,

  // ------------------------------------------------------------------
  // Arabic (Respectful Urgency)
  // Strategy: Clear "last call" with benefits recap + Value Clarity
  // Optimized: Added "فرصتك الأخيرة" and "نظام الدفاع الكامل" for clearer value proposition
  // ------------------------------------------------------------------
  ar: (userName, vsl2Link, whopUrl, promoCode) => `⏰ **آخر تذكير لك يا ${userName}!**

إذا لم تقم بالترقية بعد، فهذه فرصتك الأخيرة. احصل على نظام الدفاع الكامل مع النسخة الكاملة.

✅ تحليل كامل للسلسلة (On-Chain)  
✅ تنبيهات فورية للفخاخ  
✅ دعم Dr. Grok

🎬 **شاهد لماذا يربح المحترفون دائماً:**
${vsl2Link}
💡 الترجمات متاحة بـ 6 لغات (EN, JA, ES, PT-BR, AR, KO) - قم بتفعيلها في إعدادات الفيديو

💰 **كوبون خصم 50%:**
الرمز: \`${promoCode}\`

🚀 **احصل على الترقية هنا:**
${whopUrl}?promo=${promoCode}`,

  // ------------------------------------------------------------------
  // Korean (Urgency & Benefit Recap)
  // Strategy: Clear "last call" with benefits recap + Value Clarity
  // Optimized: Added "마지막 기회" and "완전한 방어 시스템" for clearer value proposition
  // ------------------------------------------------------------------
  ko: (userName, vsl2Link, whopUrl, promoCode) => `⏰ **${userName}님, 마지막 안내입니다!**

아직 업그레이드하지 않았다면 지금이 마지막 기회입니다. 완전판으로 완전한 방어 시스템을 확보하세요.

✅ 완전한 온체인 분석  
✅ 실시간 트랩 알림  
✅ Dr. Grok 지원

🎬 **상위 1%가 항상 이기는 이유 확인:**
${vsl2Link}
💡 자막 6개 언어 지원 (EN, JA, ES, PT-BR, AR, KO) - 영상 설정에서 활성화 가능

💰 **50% 할인 쿠폰:**
코드: \`${promoCode}\`

🚀 **업그레이드 신청:**
${whopUrl}?promo=${promoCode}`,
};

/**
 * YouTubeリンクに字幕パラメータを追加
 * @param {string} videoUrl - YouTube動画URL
 * @param {string} lang - 言語コード
 * @returns {string} 字幕パラメータ付きYouTube URL
 */
function addSubtitleParamsToYouTubeUrl(videoUrl, lang) {
  if (!videoUrl || (!videoUrl.includes('youtu.be/') && !videoUrl.includes('youtube.com/'))) {
    return videoUrl; // YouTubeリンクでない場合はそのまま返す
  }
  
  // 言語コードの正規化
  const normalizedLang = lang && typeof lang === 'string' 
    ? lang.toLowerCase().replace('_', '-') 
    : 'en';
  
  // YouTubeの言語コードマッピング（ISO 639-1形式）
  const youtubeLangMap = {
    'en': 'en',
    'ja': 'ja',
    'es': 'es',
    'pt-br': 'pt', // YouTubeはpt-brをptとして扱う
    'ar': 'ar',
    'ko': 'ko',
  };
  
  const youtubeLang = youtubeLangMap[normalizedLang] || 'en';
  
  // URLにパラメータを追加（既存のパラメータがある場合は&、ない場合は?）
  const separator = videoUrl.includes('?') ? '&' : '?';
  return `${videoUrl}${separator}cc_lang_pref=${youtubeLang}&cc_load_policy=1`;
}

/**
 * X経由ユーザー用のVSL2 Last Callメッセージ（パーソナライズ版）
 */
const VSL2_LAST_CALL_MESSAGES_X = {
  en: (userName, vsl2Link, whopUrl, promoCode) => `⏰ **Last Call, ${userName}! You came from X.**

You saw our Trap Score and joined. Don't miss the upgrade.

This is your final chance to get the complete defense system.

✅ Complete on-chain analysis  
✅ Real-time trap alerts  
✅ Dr. Grok support

🎬 **Watch why pros always win:**
${vsl2Link}
💡 Subtitles in 6 languages

💰 **50% OFF Coupon:**
Code: \`${promoCode}\`

🚀 **Claim your upgrade:**
${whopUrl}?promo=${promoCode}`,
  
  ja: (userName, vsl2Link, whopUrl, promoCode) => `⏰ **${userName}さん、最終案内です。Xから来てくれてありがとう。**

トラップスコアを見て参加してくれたんですね。アップグレードをお見逃しなく。

完全な防衛体制を手に入れる最後のチャンスです。

✅ 完全オンチェーン分析  
✅ リアルタイムトラップ検知  
✅ Dr. Grokサポート

🎬 **勝てる人の理由を見る:**
${vsl2Link}
💡 字幕6言語対応

💰 **50%OFFクーポン:**
コード: \`${promoCode}\`

🚀 **申込はこちら:**
${whopUrl}?promo=${promoCode}`,
  
  es: (userName, vsl2Link, whopUrl, promoCode) => `⏰ **¡Último aviso, ${userName}! Viniste de X.**

Viste nuestro Trap Score y te uniste. No te pierdas el upgrade.

Esta es tu última oportunidad de obtener el sistema de defensa completo.

✅ Análisis on-chain completo  
✅ Alertas de trampas en tiempo real  
✅ Soporte Dr. Grok

🎬 **Mira por qué los pros siempre ganan:**
${vsl2Link}
💡 Subtítulos en 6 idiomas

💰 **Cupón 50% OFF:**
Código: \`${promoCode}\`

🚀 **Activa tu upgrade:**
${whopUrl}?promo=${promoCode}`,
  
  'pt-br': (userName, vsl2Link, whopUrl, promoCode) => `⏰ **Último aviso, ${userName}! Você veio do X.**

Você viu nosso Trap Score e se juntou. Não perca o upgrade.

Esta é sua última chance de obter o sistema de defesa completo.

✅ Análise on-chain completa  
✅ Alertas de armadilhas em tempo real  
✅ Suporte Dr. Grok

🎬 **Veja por que os profissionais sempre vencem:**
${vsl2Link}
💡 Legendas em 6 idiomas

💰 **Cupom 50% OFF:**
Código: \`${promoCode}\`

🚀 **Garanta seu upgrade:**
${whopUrl}?promo=${promoCode}`,
  
  ar: (userName, vsl2Link, whopUrl, promoCode) => `⏰ **آخر تذكير لك يا ${userName}! جئت من X.**

رأيت Trap Score الخاص بنا وانضممت. لا تفوت الترقية.

هذه فرصتك الأخيرة للحصول على نظام الدفاع الكامل.

✅ تحليل On-Chain كامل  
✅ تنبيهات فورية للفخاخ  
✅ دعم Dr. Grok

🎬 **شاهد لماذا يربح المحترفون دائماً:**
${vsl2Link}
💡 ترجمات بـ 6 لغات

💰 **كوبون خصم 50%:**
الرمز: \`${promoCode}\`

🚀 **احصل على الترقية:**
${whopUrl}?promo=${promoCode}`,
  
  ko: (userName, vsl2Link, whopUrl, promoCode) => `⏰ **${userName}님, 마지막 안내입니다. X에서 오셨네요.**

Trap Score를 보고 가입하셨군요. 업그레이드를 놓치지 마세요.

완전한 방어 시스템을 얻을 수 있는 마지막 기회입니다.

✅ 완전한 온체인 분석  
✅ 실시간 트랩 알림  
✅ Dr. Grok 지원

🎬 **상위 1%가 항상 이기는 이유 확인:**
${vsl2Link}
💡 자막 6개 언어 지원

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
 * @param {string} source - ソース（'telegram', 'x_direct', 'x_quote'）
 */
function generateVSL2LastCallMessage(lang, userName, vsl2Link, whopUrl, promoCode, source = 'telegram') {
  const normalizedLang = lang && typeof lang === 'string'
    ? lang.toLowerCase().replace('_', '-')
    : 'en';

  // YouTubeリンクに字幕パラメータを追加
  const vsl2LinkWithSubtitles = addSubtitleParamsToYouTubeUrl(vsl2Link, normalizedLang);

  // X経由ユーザー用のメッセージを使用
  if (source === 'x_direct' || source === 'x_quote') {
    const messageFn = VSL2_LAST_CALL_MESSAGES_X[normalizedLang] || VSL2_LAST_CALL_MESSAGES_X.en;
    return messageFn(userName, vsl2LinkWithSubtitles, whopUrl, promoCode);
  }

  const messageFn = VSL2_LAST_CALL_MESSAGES[normalizedLang] || VSL2_LAST_CALL_MESSAGES.en;
  return messageFn(userName, vsl2LinkWithSubtitles, whopUrl, promoCode);
}

module.exports = { 
  generateVSL2LastCallMessage, 
  VSL2_LAST_CALL_MESSAGES,
  addSubtitleParamsToYouTubeUrl,
};
