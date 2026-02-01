// services/telegram/messages/vsl2.js
// VSL2（アップセル/クーポン配信）メッセージテンプレート（多言語対応）
// Created by Gemini: CMO - Optimized for high conversion & urgency

const VSL2_MESSAGES = {
  // ------------------------------------------------------------------
  // English (Global Standard)
  // Strategy: Emphasize the "Unfair Advantage" + Crypto Community Language
  // Optimized: Added "whale tactics", "pro's edge", and more specific value propositions
  // ------------------------------------------------------------------
  en: (
    userName,
    vsl2Link,
    whopUrl,
    promoCode
  ) => `🚨 **${userName}, Don't Miss This - Your Trading Is At Risk!**

💭 Still getting exhausted watching charts 24/7? **95% of traders lose money because they trade blind.**

The "Minimal Version" shows you the trap. The **Full Version** saves you from it.

**Stop Losing 10-20% on Every Dump:**
✅ **Complete On-Chain Analysis:** See the "whale tactics" BEFORE price moves.
✅ **Real-Time Alerts:** Get notified BEFORE traps hit - avoid 10-20% losses.
✅ **Dr. Grok Support:** Your personal AI trading psychologist prevents emotional mistakes.

🎬 **Watch why the top 5% always win (while 95% lose):**
${vsl2Link}
💡 Subtitles available in 6 languages (EN, JA, ES, PT-BR, AR, KO)

💰 **URGENT: 50% OFF Expires in 24 Hours**
Code: \`${promoCode}\`
⏰ No limit for now—but this campaign ends someday. We don't know when.

🚀 **Join 1,000+ Profitable Traders NOW:**
${whopUrl}?promo=${promoCode}

💡 *One missed signal = -10% loss. Upgrade = bulletproof defense.*`,

  // ------------------------------------------------------------------
  // Japanese (Trust & Detail)
  // Strategy: "Half-measures are dangerous" (中途半端は危険).
  // ------------------------------------------------------------------
  ja: (
    userName,
    vsl2Link,
    whopUrl,
    promoCode
  ) => `🚨 **${userName}さん、見逃すな - あなたのトレードは危険にさらされています！**

💭 まだチャートに24時間張り付いて消耗中？**95%のトレーダーは盲目トレードで損をしています。**

無料版は「罠」を見せる。**完全版**はあなたを救う。

**10-20%の損失を回避せよ:**
✅ **完全なオンチェーン分析:** 価格変動の「前」に「クジラの手口」を察知
✅ **リアルタイムアラート:** トラップ発生「前」に通知 - 10-20%損失を回避
✅ **Dr. Grokサポート:** 感情的なミスを防ぐAI心理サポート

🎬 **なぜ上位5%は常に勝ち、95%は負けるのか？（理由を公開）:**
${vsl2Link}
💡 6言語字幕対応（EN, JA, ES, PT-BR, AR, KO）

💰 **緊急: 50%OFF、24時間で終了**
コード: \`${promoCode}\`
⏰ 今は枠数無制限。いつかキャンペーンは終了する。いつかはわからない。

🚀 **利益を出す1,000人以上のトレーダーに今すぐ参加:**
${whopUrl}?promo=${promoCode}

💡 *1つのシグナルを逃す = -10%損失。アップグレード = 鉄壁の防御。*`,

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
⏰ Sin límite por ahora—esta campaña termina algún día. No sabemos cuándo.

🚀 **Obtén la ventaja del profesional a mitad de precio:**
${whopUrl}?promo=${promoCode}

💡 *Oferta por tiempo limitado. No te lo pierdas.*`,

  // ------------------------------------------------------------------
  // Portuguese (Brazil - Opportunity)
  // Strategy: "Don't leave money on the table." + Crypto Community Language
  // Optimized: Added "táticas das baleias", "vantagem do profissional", and more specific value propositions
  // ------------------------------------------------------------------
  "pt-br": (
    userName,
    vsl2Link,
    whopUrl,
    promoCode
  ) => `🎁 **Oferta Especial para você, ${userName}!**

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
⏰ Sem limite por agora—esta campanha termina algum dia. Não sabemos quando.

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
⏰ بدون حد الآن—الحملة تنتهي يوماً. لا نعرف متى.

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
⏰ 지금은 제한 없음—캠페인은 언젠가 종료. 언제인지는 모름.

🚀 **프로의 무기를 반값에 획득하세요:**
${whopUrl}?promo=${promoCode}

💡 *한정된 시간 동안만 유효합니다. 놓치지 마세요.*`
};

/**
 * YouTubeリンクに字幕パラメータを追加
 * @param {string} videoUrl - YouTube動画URL
 * @param {string} lang - 言語コード
 * @returns {string} 字幕パラメータ付きYouTube URL
 */
function addSubtitleParamsToYouTubeUrl(videoUrl, lang) {
  if (!videoUrl || (!videoUrl.includes("youtu.be/") && !videoUrl.includes("youtube.com/"))) {
    return videoUrl; // YouTubeリンクでない場合はそのまま返す
  }

  // 言語コードの正規化
  const normalizedLang =
    lang && typeof lang === "string" ? lang.toLowerCase().replace("_", "-") : "en";

  // YouTubeの言語コードマッピング（ISO 639-1形式）
  const youtubeLangMap = {
    en: "en",
    ja: "ja",
    es: "es",
    "pt-br": "pt", // YouTubeはpt-brをptとして扱う
    ar: "ar",
    ko: "ko"
  };

  const youtubeLang = youtubeLangMap[normalizedLang] || "en";

  // URLにパラメータを追加（既存のパラメータがある場合は&、ない場合は?）
  const separator = videoUrl.includes("?") ? "&" : "?";
  return `${videoUrl}${separator}cc_lang_pref=${youtubeLang}&cc_load_policy=1`;
}

/**
 * 言語に応じたVSL2メッセージを生成
 * @param {string} lang - 言語コード
 * @param {string} userName - ユーザー名
 * @param {string} vsl2Link - VSL2動画リンク
 * @param {string} whopUrl - Whop商品ページURL
 * @param {string} promoCode - プロモーションコード
 * @param {string} source - ソース（'telegram', 'x_direct', 'x_quote'）
 */
function generateVSL2Message(lang, userName, vsl2Link, whopUrl, promoCode, source = "telegram") {
  const normalizedLang =
    lang && typeof lang === "string" ? lang.toLowerCase().replace("_", "-") : "en";

  // YouTubeリンクに字幕パラメータを追加
  const vsl2LinkWithSubtitles = addSubtitleParamsToYouTubeUrl(vsl2Link, normalizedLang);

  // X経由ユーザー用のメッセージを使用
  if (source === "x_direct" || source === "x_quote") {
    const messageFn = VSL2_MESSAGES_X[normalizedLang] || VSL2_MESSAGES_X.en;
    return messageFn(userName, vsl2LinkWithSubtitles, whopUrl, promoCode);
  }

  const messageFn = VSL2_MESSAGES[normalizedLang] || VSL2_MESSAGES.en;

  return messageFn(userName, vsl2LinkWithSubtitles, whopUrl, promoCode);
}

module.exports = {
  generateVSL2Message,
  VSL2_MESSAGES,
  addSubtitleParamsToYouTubeUrl
};
