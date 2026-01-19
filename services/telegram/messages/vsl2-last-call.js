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

🎬 **VSL2はこちら:**
${vsl2Link}
💡 動画の設定で字幕（日本語・英語・スペイン語・ポルトガル語・アラビア語・韓国語）を表示できます

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
💡 Subtítulos disponibles en 6 idiomas (EN, JA, ES, PT-BR, AR, KO) - activa en configuración del video

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
💡 الترجمات متاحة بـ 6 لغات (EN, JA, ES, PT-BR, AR, KO) - قم بتفعيلها في إعدادات الفيديو

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

  // YouTubeリンクに字幕パラメータを追加
  const vsl2LinkWithSubtitles = addSubtitleParamsToYouTubeUrl(vsl2Link, normalizedLang);

  const messageFn = VSL2_LAST_CALL_MESSAGES[normalizedLang] || VSL2_LAST_CALL_MESSAGES.en;
  return messageFn(userName, vsl2LinkWithSubtitles, whopUrl, promoCode);
}

module.exports = { 
  generateVSL2LastCallMessage, 
  VSL2_LAST_CALL_MESSAGES,
  addSubtitleParamsToYouTubeUrl,
};
