// services/telegram/messages/vsl1-reminder.js
// VSL1リマインドメッセージテンプレート（多言語対応）
// Created by Gemini: CMO - Optimized for high conversion & FOMO elements

const VSL1_REMINDER_MESSAGES = {
  // ------------------------------------------------------------------
  // English (Global Standard)
  // Strategy: Urgency + FOMO + Social Proof + Problem Statement
  // Optimized: Added "Why is your capital being hunted?" question for deeper engagement
  // ------------------------------------------------------------------
  en: (userName, deepLink, vsl1Link, hoursLeft) => `⏰ **${userName}, did you watch the video yet?**

The market doesn't wait. Every moment counts.

🔥 **TODAY'S PROOF:**
• Trap Defence identified a potential trap
• Users avoided significant losses TODAY
• Market moved as predicted

⚠️ **Don't lose your capital. Watch this 1-minute video NOW before your next trade.**
"Why is your capital being hunted?" The answer is here.

${vsl1Link}
💡 Subtitles available in 6 languages (EN, JA, ES, PT-BR, AR, KO) - enable in video settings

🚀 **Get the trap avoidance logic that pros use (FREE):**
👉 ${deepLink}

#Bitcoin #CryptoTrading #TrapDefence #StopLoss #SmartMoney #WhaleFood`,

  // ------------------------------------------------------------------
  // Japanese (Trust & Reality)
  // Strategy: Urgency + Social Proof + Protection
  // ------------------------------------------------------------------
  ja: (userName, deepLink, vsl1Link, hoursLeft) => `⏰ **${userName}さん、動画はもうご覧になりましたか？**

市場は待ってくれません。今この瞬間が重要です。

🔥 **本日の実績:**
• Trap Defenceが潜在的な罠を特定
• ユーザーが本日、大きな損失を回避
• 市場は予測通りに動きました

⚠️ **大切なお金を失う前に、この1分間の動画を今すぐ見てください。**
「なぜ、あなたの資金は狩られるのか？」その答えがここにあります。

${vsl1Link}
💡 動画の設定で字幕（日本語・英語・スペイン語・ポルトガル語・アラビア語・韓国語）を表示できます

🚀 **プロが使う「トラップ回避ロジック」を無料で入手：**
👉 ${deepLink}

#Bitcoin #BTC #仮想通貨 #トレード #TrapDefence #養分回避`,

  // ------------------------------------------------------------------
  // Spanish (Smart Decisions)
  // Strategy: Urgency + Social Proof + Problem Statement
  // Optimized: Added "¿Por qué tu capital está siendo cazado?" question for deeper engagement
  // ------------------------------------------------------------------
  es: (userName, deepLink, vsl1Link, hoursLeft) => `⏰ **${userName}, ¿ya viste el video?**

El mercado no espera. Cada momento cuenta.

🔥 **PRUEBA DE HOY:**
• Trap Defence identificó una trampa potencial
• Los usuarios evitaron pérdidas significativas HOY
• El mercado se movió como se predijo

⚠️ **No pierdas tu capital. Mira este video de 1 minuto AHORA antes de tu próxima operación.**
"¿Por qué tu capital está siendo cazado?" La respuesta está aquí.

${vsl1Link}
💡 Subtítulos disponibles en 6 idiomas (EN, JA, ES, PT-BR, AR, KO) - activa en configuración del video

🚀 **Obtén la lógica "Anti-Trampas" de los profesionales (GRATIS):**
👉 ${deepLink}

#Bitcoin #Criptomonedas #Trading #TrapDefence #SmartMoney #ComidaDeBallenas`,

  // ------------------------------------------------------------------
  // Portuguese (Brazil - Opportunity & Edge)
  // Strategy: Urgency + Social Proof + Problem Statement
  // Optimized: Added "Por que seu capital está sendo caçado?" question for deeper engagement
  // ------------------------------------------------------------------
  'pt-br': (userName, deepLink, vsl1Link, hoursLeft) => `⏰ **${userName}, você já assistiu ao vídeo?**

O mercado não espera. Cada momento conta.

🔥 **PROVA DE HOJE:**
• Trap Defence identificou uma armadilha potencial
• Usuários evitaram perdas significativas HOJE
• O mercado se moveu como previsto

⚠️ **Não perca seu capital. Assista a este vídeo de 1 minuto AGORA antes da sua próxima operação.**
"Por que seu capital está sendo caçado?" A resposta está aqui.

${vsl1Link}
💡 Legendas disponíveis em 6 idiomas (EN, JA, ES, PT-BR, AR, KO) - ative nas configurações do vídeo

🚀 **Pegue a lógica que os profissionais usam para evitar armadilhas (GRÁTIS):**
👉 ${deepLink}

#Bitcoin #Cripto #DayTrade #TrapDefence #Baleias #ComidaDeBaleias`,

  // ------------------------------------------------------------------
  // Arabic (Wisdom & Protection)
  // Strategy: Respectful tone + Urgency + Problem Statement
  // Optimized: Added "لماذا يتم صيد رأس مالك؟" question for deeper engagement
  // ------------------------------------------------------------------
  ar: (userName, deepLink, vsl1Link, hoursLeft) => `⏰ **${userName}، هل شاهدت الفيديو بعد؟**

السوق لا ينتظر. كل لحظة مهمة.

🔥 **دليل اليوم:**
• Trap Defence حدد فخاً محتملاً
• تجنب المستخدمون خسائر كبيرة اليوم
• تحرك السوق كما تم التنبؤ

⚠️ **لا تخسر رأس مالك. شاهد هذا الفيديو لمدة دقيقة واحدة الآن قبل صفقتك القادمة.**
"لماذا يتم صيد رأس مالك؟" الجواب هنا.

${vsl1Link}
💡 الترجمات متاحة بـ 6 لغات (EN, JA, ES, PT-BR, AR, KO) - قم بتفعيلها في إعدادات الفيديو

🚀 **احصل على "منطق كشف الفخاخ" الذي يستخدمه المحترفون (مجاناً):**
👉 ${deepLink}

#Bitcoin #Crypto #تداول #بيتكوين #TrapDefence #طعامالحيتان`,

  // ------------------------------------------------------------------
  // Korean (Speed & Competition)
  // Strategy: High urgency + Social Proof + Problem Statement
  // Optimized: Added "왜 당신의 자본이 사냥당하는가?" question for deeper engagement
  // ------------------------------------------------------------------
  ko: (userName, deepLink, vsl1Link, hoursLeft) => `⏰ **${userName}님, 영상은 이미 보셨나요?**

시장은 기다려주지 않습니다. 지금 이 순간이 중요합니다.

🔥 **오늘의 증거:**
• Trap Defence가 잠재적 함정을 식별
• 사용자들이 오늘 큰 손실을 회피
• 시장이 예측대로 움직였습니다

⚠️ **자금을 잃기 전에 이 1분짜리 영상을 지금 시청하세요.**
"왜 당신의 자본이 사냥당하는가?" 답이 여기 있습니다.

${vsl1Link}
💡 자막 6개 언어 지원 (EN, JA, ES, PT-BR, AR, KO) - 영상 설정에서 활성화 가능

🚀 **상위 1%가 사용하는 '함정 회피 로직' 무료 받기:**
👉 ${deepLink}

#Bitcoin #비트코인 #코인 #트레이딩 #개미털기방지 #TrapDefence #고래밥`,
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
 * X経由ユーザー用のVSL1リマインドメッセージ（パーソナライズ版）
 */
const VSL1_REMINDER_MESSAGES_X = {
  en: (userName, deepLink, vsl1Link, hoursLeft) => `⏰ **${userName}, you found us on X!**

You saw our Trap Score analysis. Now watch the video that explains WHY traps happen.

🔥 **You came from X because:**
• You saw our breaking trap analysis
• You clicked because you need protection
• This video shows you HOW to avoid traps

⚠️ **Don't lose your capital. Watch this 1-minute video NOW:**
${vsl1Link}
💡 Subtitles available in 6 languages (EN, JA, ES, PT-BR, AR, KO)

🚀 **Get the FREE trap avoidance logic:**
👉 ${deepLink}

#Bitcoin #CryptoTrading #TrapDefence`,
  
  ja: (userName, deepLink, vsl1Link, hoursLeft) => `⏰ **${userName}さん、Xから来てくれてありがとう！**

トラップスコア分析を見てくれたんですね。なぜトラップが発生するのか、その理由を動画で説明します。

🔥 **Xから来た理由:**
• トラップ分析を見た
• 保護が必要だと感じた
• この動画で回避方法がわかる

⚠️ **資金を失う前に、この1分間の動画を今すぐ見てください:**
${vsl1Link}
💡 字幕6言語対応

🚀 **無料トラップ回避ロジックを入手:**
👉 ${deepLink}

#Bitcoin #BTC #仮想通貨 #トレード #TrapDefence`,
  
  es: (userName, deepLink, vsl1Link, hoursLeft) => `⏰ **${userName}, ¡nos encontraste en X!**

Viste nuestro análisis de Trap Score. Ahora mira el video que explica POR QUÉ ocurren las trampas.

🔥 **Viniste de X porque:**
• Viste nuestro análisis de trampas
• Hiciste clic porque necesitas protección
• Este video te muestra CÓMO evitar trampas

⚠️ **No pierdas tu capital. Mira este video de 1 minuto AHORA:**
${vsl1Link}
💡 Subtítulos en 6 idiomas

🚀 **Obtén la lógica anti-trampas GRATIS:**
👉 ${deepLink}

#Bitcoin #Cripto #Trading #TrapDefence`,
  
  'pt-br': (userName, deepLink, vsl1Link, hoursLeft) => `⏰ **${userName}, você nos encontrou no X!**

Você viu nossa análise de Trap Score. Agora assista ao vídeo que explica POR QUE as armadilhas acontecem.

🔥 **Você veio do X porque:**
• Viu nossa análise de armadilhas
• Clicou porque precisa de proteção
• Este vídeo mostra COMO evitar armadilhas

⚠️ **Não perca seu capital. Assista a este vídeo de 1 minuto AGORA:**
${vsl1Link}
💡 Legendas em 6 idiomas

🚀 **Obtenha a lógica anti-armadilhas GRÁTIS:**
👉 ${deepLink}

#Bitcoin #Cripto #Trading #TrapDefence`,
  
  ar: (userName, deepLink, vsl1Link, hoursLeft) => `⏰ **${userName}، وجدتنا على X!**

رأيت تحليل Trap Score الخاص بنا. الآن شاهد الفيديو الذي يشرح لماذا تحدث الفخاخ.

🔥 **جئت من X لأن:**
• رأيت تحليل الفخاخ
• نقرت لأنك تحتاج الحماية
• هذا الفيديو يوضح كيفية تجنب الفخاخ

⚠️ **لا تخسر رأس مالك. شاهد هذا الفيديو لمدة دقيقة واحدة الآن:**
${vsl1Link}
💡 ترجمات بـ 6 لغات

🚀 **احصل على منطق تجنب الفخاخ مجاناً:**
👉 ${deepLink}

#Bitcoin #Crypto #تداول #TrapDefence`,
  
  ko: (userName, deepLink, vsl1Link, hoursLeft) => `⏰ **${userName}님, X에서 찾아주셨네요!**

Trap Score 분석을 보셨군요. 이제 함정이 왜 발생하는지 설명하는 영상을 보세요.

🔥 **X에서 온 이유:**
• 함정 분석을 봤음
• 보호가 필요하다고 느꼈음
• 이 영상에서 회피 방법을 알 수 있음

⚠️ **자금을 잃기 전에 이 1분짜리 영상을 지금 시청하세요:**
${vsl1Link}
💡 자막 6개 언어 지원

🚀 **무료 함정 회피 로직 받기:**
👉 ${deepLink}

#Bitcoin #비트코인 #코인 #트레이딩 #TrapDefence`,
};

/**
 * 言語に応じたVSL1リマインドメッセージを生成
 * @param {string} lang - 言語コード (en, ja, es, pt-br, ar, ko)
 * @param {string} userName - ユーザー名（デフォルト: 'there'）
 * @param {string} deepLink - Telegram Botへのディープリンク
 * @param {string} vsl1Link - VSL1動画（YouTube）へのリンク
 * @param {number} hoursLeft - 残り時間（1-12時間のランダム）
 * @param {string} source - ソース（'telegram', 'x_direct', 'x_quote'）
 */
function generateVSL1ReminderMessage(lang, userName = 'there', deepLink, vsl1Link, hoursLeft = null, source = 'telegram') {
  // 言語コードの正規化 (例: pt_br -> pt-br, PT-BR -> pt-br)
  const normalizedLang = lang && typeof lang === 'string' 
    ? lang.toLowerCase().replace('_', '-') 
    : 'en';
  
  // 残り時間が指定されていない場合はランダム生成（1-12時間）
  const finalHoursLeft = hoursLeft || Math.floor(Math.random() * 12) + 1;
  
  // YouTubeリンクに字幕パラメータを追加
  const vsl1LinkWithSubtitles = addSubtitleParamsToYouTubeUrl(vsl1Link, normalizedLang);
  
  // X経由ユーザー用のメッセージを使用
  if (source === 'x_direct' || source === 'x_quote') {
    const messageFn = VSL1_REMINDER_MESSAGES_X[normalizedLang] || VSL1_REMINDER_MESSAGES_X.en;
    return messageFn(userName, deepLink, vsl1LinkWithSubtitles, finalHoursLeft);
  }
  
  // 通常のメッセージ関数を取得（デフォルトは英語）
  const messageFn = VSL1_REMINDER_MESSAGES[normalizedLang] || VSL1_REMINDER_MESSAGES.en;
  
  return messageFn(userName, deepLink, vsl1LinkWithSubtitles, finalHoursLeft);
}

module.exports = { 
  generateVSL1ReminderMessage, 
  VSL1_REMINDER_MESSAGES,
  addSubtitleParamsToYouTubeUrl,
};
