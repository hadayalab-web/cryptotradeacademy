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
 * 言語に応じたVSL1リマインドメッセージを生成
 * @param {string} lang - 言語コード (en, ja, es, pt-br, ar, ko)
 * @param {string} userName - ユーザー名（デフォルト: 'there'）
 * @param {string} deepLink - Telegram Botへのディープリンク
 * @param {string} vsl1Link - VSL1動画（YouTube）へのリンク
 * @param {number} hoursLeft - 残り時間（1-12時間のランダム）
 */
function generateVSL1ReminderMessage(lang, userName = 'there', deepLink, vsl1Link, hoursLeft = null) {
  // 言語コードの正規化 (例: pt_br -> pt-br, PT-BR -> pt-br)
  const normalizedLang = lang && typeof lang === 'string' 
    ? lang.toLowerCase().replace('_', '-') 
    : 'en';
  
  // 残り時間が指定されていない場合はランダム生成（1-12時間）
  const finalHoursLeft = hoursLeft || Math.floor(Math.random() * 12) + 1;
  
  // YouTubeリンクに字幕パラメータを追加
  const vsl1LinkWithSubtitles = addSubtitleParamsToYouTubeUrl(vsl1Link, normalizedLang);
  
  // 対応するメッセージ関数を取得（デフォルトは英語）
  const messageFn = VSL1_REMINDER_MESSAGES[normalizedLang] || VSL1_REMINDER_MESSAGES.en;
  
  return messageFn(userName, deepLink, vsl1LinkWithSubtitles, finalHoursLeft);
}

module.exports = { 
  generateVSL1ReminderMessage, 
  VSL1_REMINDER_MESSAGES,
  addSubtitleParamsToYouTubeUrl,
};
