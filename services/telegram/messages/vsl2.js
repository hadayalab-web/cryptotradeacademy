// services/telegram/messages/vsl2.js
// VSL2（アップセル/クーポン配信）メッセージテンプレート（多言語対応）
// Created by Gemini: CMO - Optimized for high conversion & urgency

const VSL2_MESSAGES = {
  // ------------------------------------------------------------------
  // English (Global Standard)
  // Strategy: Emphasize the "Unfair Advantage" + Crypto Community Language
  // Optimized: Added "whale tactics", "pro's edge", and more specific value propositions
  // ------------------------------------------------------------------
  en: (userName, vsl2Link, whopUrl, promoCode) => `🎁 **Special Offer for You, ${userName}!**

💭 Still manually watching charts every day, getting exhausted?

The "Minimal Version" is just a compass. The **Full Version** is the complete treasure map.

**Why Upgrade?**
✅ **Complete On-Chain Analysis:** See the "whale tactics" behind price movements, not just price action.
✅ **Real-Time Alerts:** Never miss a trap or a pump. Get notified the moment it happens.
✅ **Dr. Grok Support:** Your personal AI trading psychologist for mental management and strategy.

🎬 **Watch why the "Pros" always win:**
${vsl2Link}
💡 Subtitles available in 6 languages (EN, JA, ES, PT-BR, AR, KO) - enable in video settings

💰 **Exclusive 50% OFF Coupon:**
Code: \`${promoCode}\`

🚀 **Get the pro's edge at half price:**
${whopUrl}?promo=${promoCode}

💡 *Offer valid for a limited time. Don't miss out.*`,

  // ------------------------------------------------------------------
  // Japanese (Trust & Detail)
  // Strategy: "Half-measures are dangerous" (中途半端は危険).
  // ------------------------------------------------------------------
  ja: (userName, vsl2Link, whopUrl, promoCode) => `🎁 **${userName}さんへ、特別なご提案です**

💭 まだ、チャートに張り付いて消耗していますか？

無料版のシグナルは「コンパス」に過ぎません。**完全版**は「宝の地図」そのものです。

**なぜアップグレードが必要なのか？**
✅ **完全なオンチェーン分析:** 価格変動の裏にある「クジラの手口」を可視化
✅ **リアルタイムアラート:** トラップ発生の瞬間を逃さず通知
✅ **Dr. Grokサポート:** メンタル管理から戦略立案までAIが完全サポート

🎬 **なぜ「勝てる人」は常に余裕なのか？その理由を公開:**
${vsl2Link}
💡 動画の設定で字幕（日本語・英語・スペイン語・ポルトガル語・アラビア語・韓国語）を表示できます

💰 **50%OFF 限定クーポン:**
コード: \`${promoCode}\`

🚀 **「プロの武器」を半額で手に入れる:**
${whopUrl}?promo=${promoCode}

💡 *このオファーは期間限定です。お見逃しなく。*`,

  // ------------------------------------------------------------------
  // Spanish (Smart Investment)
  // Strategy: "Stop guessing, start knowing." + Crypto Community Language
  // Optimized: Added "tácticas de ballenas", "ventaja del profesional", and more specific value propositions
  // ------------------------------------------------------------------
  es: (userName, vsl2Link, whopUrl, promoCode) => `🎁 **¡Oferta Especial para ti, ${userName}!**

💭 ¿Sigues agotándote mirando gráficos todo el día?

La versión gratuita es solo una brújula. La **Versión Completa** es el mapa del tesoro completo.

**¿Por qué actualizar?**
✅ **Análisis On-Chain Completo:** Ve las "tácticas de ballenas" detrás de los movimientos de precio, no solo el precio.
✅ **Alertas en Tiempo Real:** Nunca pierdas una trampa o una subida. Recibe notificaciones al instante.
✅ **Soporte Dr. Grok:** Tu psicólogo de trading personal con IA para gestión mental y estrategia.

🎬 **Mira por qué los "Pros" siempre ganan:**
${vsl2Link}
💡 Subtítulos disponibles en 6 idiomas (EN, JA, ES, PT-BR, AR, KO) - activa en configuración del video

💰 **Cupón Exclusivo 50% OFF:**
Código: \`${promoCode}\`

🚀 **Obtén la ventaja del profesional a mitad de precio:**
${whopUrl}?promo=${promoCode}

💡 *Oferta por tiempo limitado. No te lo pierdas.*`,

  // ------------------------------------------------------------------
  // Portuguese (Brazil - Opportunity)
  // Strategy: "Don't leave money on the table." + Crypto Community Language
  // Optimized: Added "táticas das baleias", "vantagem do profissional", and more specific value propositions
  // ------------------------------------------------------------------
  'pt-br': (userName, vsl2Link, whopUrl, promoCode) => `🎁 **Oferta Especial para você, ${userName}!**

💭 Ainda se esgotando olhando gráficos o dia todo?

A versão gratuita é apenas uma bússola. A **Versão Completa** é o mapa do tesouro completo.

**Por que fazer o upgrade?**
✅ **Análise On-Chain Completa:** Veja as "táticas das baleias" por trás dos movimentos de preço, não apenas o preço.
✅ **Alertas em Tempo Real:** Nunca perca uma armadilha ou pump. Receba notificações no instante.
✅ **Suporte Dr. Grok:** Seu psicólogo de trading pessoal com IA para gestão mental e estratégia.

🎬 **Veja por que os profissionais sempre vencem:**
${vsl2Link}
💡 Legendas disponíveis em 6 idiomas (EN, JA, ES, PT-BR, AR, KO) - ative nas configurações do vídeo

💰 **Cupom Exclusivo 50% OFF:**
Código: \`${promoCode}\`

🚀 **Obtenha a vantagem do profissional pela metade do preço:**
${whopUrl}?promo=${promoCode}

💡 *Oferta por tempo limitado. Não perca.*`,

  // ------------------------------------------------------------------
  // Arabic (Exclusivity & Wisdom)
  // Strategy: "The complete tool for the wise trader." + Crypto Community Language
  // Optimized: Added "تكتيكات الحيتان", "ميزة المحترفين", and more specific value propositions
  // ------------------------------------------------------------------
  ar: (userName, vsl2Link, whopUrl, promoCode) => `🎁 **عرض خاص لك يا ${userName}!**

💭 هل ما زلت تستنزف نفسك في مراقبة الرسوم البيانية كل يوم؟

النسخة المجانية هي مجرد بوصلة. **النسخة الكاملة** هي خريطة الكنز الكاملة.

**لماذا الترقية؟**
✅ **تحليل كامل للسلسلة (On-Chain):** شاهد "تكتيكات الحيتان" وراء تحركات الأسعار، وليس فقط السعر.
✅ **تنبيهات فورية:** لا تفوت أي فخ أو صعود مفاجئ. احصل على إشعارات فورية.
✅ **دعم Dr. Grok:** مستشارك النفسي للتداول بالذكاء الاصطناعي لإدارة العقلية والاستراتيجية.

🎬 **شاهد لماذا يربح "المحترفون" دائماً:**
${vsl2Link}
💡 الترجمات متاحة بـ 6 لغات (EN, JA, ES, PT-BR, AR, KO) - قم بتفعيلها في إعدادات الفيديو

💰 **كوبون خصم حصري 50%:**
الرمز: \`${promoCode}\`

🚀 **احصل على ميزة المحترفين بنصف السعر:**
${whopUrl}?promo=${promoCode}

💡 *العرض ساري لفترة محدودة. لا تفوت الفرصة.*`,

  // ------------------------------------------------------------------
  // Korean (Winning & Speed)
  // Strategy: "Overwrite your limits." (限界突破) + Crypto Community Language
  // Optimized: Added "지치고 있나요?", "고래의 전략", and more specific value propositions
  // ------------------------------------------------------------------
  ko: (userName, vsl2Link, whopUrl, promoCode) => `🎁 **${userName}님을 위한 특별 제안!**

💭 아직도 하루 종일 차트만 보고 지치고 있나요?

무료 버전은 나침반일 뿐입니다. **완전판(Full Version)**은 완전한 보물지도입니다.

**왜 업그레이드해야 할까요?**
✅ **완벽한 온체인 분석:** 가격 움직임 뒤에 있는 "고래의 전략"을 보세요, 가격만이 아닙니다.
✅ **실시간 알림:** 함정이나 급등 신호를 놓치지 마세요. 즉시 알림을 받으세요.
✅ **Dr. Grok 지원:** 멘탈 관리부터 전략까지 AI가 완전 지원하는 개인 트레이딩 심리 상담사.

🎬 **상위 1%가 항상 이기는 이유를 확인하세요:**
${vsl2Link}
💡 자막 6개 언어 지원 (EN, JA, ES, PT-BR, AR, KO) - 영상 설정에서 활성화 가능

💰 **50% 할인 한정 쿠폰:**
코드: \`${promoCode}\`

🚀 **프로의 무기를 반값에 획득하세요:**
${whopUrl}?promo=${promoCode}

💡 *한정된 시간 동안만 유효합니다. 놓치지 마세요.*`,
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
 * 言語に応じたVSL2メッセージを生成
 * @param {string} lang - 言語コード
 * @param {string} userName - ユーザー名
 * @param {string} vsl2Link - VSL2動画リンク
 * @param {string} whopUrl - Whop商品ページURL
 * @param {string} promoCode - プロモーションコード
 */
function generateVSL2Message(lang, userName, vsl2Link, whopUrl, promoCode) {
  const normalizedLang = lang && typeof lang === 'string' 
    ? lang.toLowerCase().replace('_', '-') 
    : 'en';
  
  // YouTubeリンクに字幕パラメータを追加
  const vsl2LinkWithSubtitles = addSubtitleParamsToYouTubeUrl(vsl2Link, normalizedLang);
    
  const messageFn = VSL2_MESSAGES[normalizedLang] || VSL2_MESSAGES.en;
  
  return messageFn(userName, vsl2LinkWithSubtitles, whopUrl, promoCode);
}

module.exports = { 
  generateVSL2Message, 
  VSL2_MESSAGES,
  addSubtitleParamsToYouTubeUrl,
};
