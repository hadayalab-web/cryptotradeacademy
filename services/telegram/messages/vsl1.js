// services/telegram/messages/vsl1.js
// VSL1投稿メッセージテンプレート（多言語対応）
// Created by Gemini: CMO - Optimized for high conversion & cultural relevance

const VSL1_MESSAGES = {
  // ------------------------------------------------------------------
  // English (Global Standard)
  // Strategy: Direct Response. Emphasis on "Whale vs Retail".
  // ------------------------------------------------------------------
  en: (deepLink, vsl1Link) => `🎬 **Two traders. Same capital. Different outcomes.**

${vsl1Link}

Three months later:
❌ **Trader A:** Liquidity for whales. Lost months of gains in 1 week.
✅ **Trader B:** Secured profits. Relaxed. Avoided the crash.

The difference? Trader B stopped guessing and used **Trap Defence BTC**.

⚠️ **Stop donating your money to the market.**
Watch this 4-minute video before your next trade.

🚀 **Get the "Whale Trap" filter used by pros (FREE):**
👉 ${deepLink}

#Bitcoin #CryptoTrading #TrapDefence #StopLoss #SmartMoney`,

  // ------------------------------------------------------------------
  // Japanese (Trust & Reality)
  // Strategy: Use "養分" (market fodder) - a powerful trigger word in JP Crypto Twitter.
  // ------------------------------------------------------------------
  ja: (deepLink, vsl1Link) => `🎬 **【実話】同じ資金で始めた2人のトレーダーの末路...**

${vsl1Link}

3ヶ月後の明暗：
❌ **トレーダーA：** たった1週間で利益を全焼。「相場の養分」となり退場。
✅ **トレーダーB：** 暴落前に撤退し、利益を確保。余裕の静観。

違いはたった一つ。トレーダーBは「Trap Defence」で罠を回避していました。

⚠️ **大切なお金を失う前に、この4分間の動画を見てください。**
「なぜ、あなたのロームは狩られるのか？」その答えがここにあります。

🚀 **プロが使う「トラップ回避ロジック」を無料で入手：**
👉 ${deepLink}

#Bitcoin #BTC #仮想通貨 #トレード #TrapDefence #養分回避`,

  // ------------------------------------------------------------------
  // Spanish (Smart Decisions)
  // Strategy: Emphasis on not being the "fool" of the market.
  // ------------------------------------------------------------------
  es: (deepLink, vsl1Link) => `🎬 **Dos traders. El mismo capital. El mismo mercado.**

${vsl1Link}

Tres meses después:
❌ **Trader A:** Perdió meses de ganancias en una semana. El mercado se lo comió.
✅ **Trader B:** Aseguró ganancias. Evitó la caída. Durmió tranquilo.

¿La diferencia? El Trader B dejó de adivinar y usó **Trap Defence BTC**.

⚠️ **Deja de regalar tu dinero a las ballenas.**
Antes de abrir tu próxima operación, mira este video de 4 minutos.

🚀 **Obtén la lógica "Anti-Trampas" de los profesionales (GRATIS):**
👉 ${deepLink}

#Bitcoin #Criptomonedas #Trading #TrapDefence #SmartMoney`,

  // ------------------------------------------------------------------
  // Portuguese (Brazil - Opportunity & Edge)
  // Strategy: Focus on "Whales" (Baleias) and stopping losses.
  // ------------------------------------------------------------------
  'pt-br': (deepLink, vsl1Link) => `🎬 **Veja isto: Dois traders começaram com o mesmo capital...**

${vsl1Link}

Três meses depois:
❌ **Trader A:** Virou liquidez para as baleias. Perdeu tudo em 1 semana.
✅ **Trader B:** Garantiu o lucro. Saiu antes da queda.

A diferença? O Trader B usou o **Trap Defence BTC**.

⚠️ **Pare de entregar seu lucro para o mercado.**
Assista a este vídeo de 4 minutos antes de operar novamente.

🚀 **Pegue a lógica que os profissionais usam para evitar armadilhas (GRÁTIS):**
👉 ${deepLink}

#Bitcoin #Cripto #DayTrade #TrapDefence #Baleias`,

  // ------------------------------------------------------------------
  // Arabic (Wisdom & Protection)
  // Strategy: Respectful tone, emphasizing protection of wealth.
  // ------------------------------------------------------------------
  ar: (deepLink, vsl1Link) => `🎬 **شاهد هذا: متداولان بدأا بنفس رأس المال...**

${vsl1Link}

بعد ثلاثة أشهر:
❌ **التاجر (أ):** خسر أرباح أشهر في أسبوع واحد. أصبح ضحية للسوق.
✅ **التاجر (ب):** حافظ على أرباحه. تجنب الانهيار. يتداول بذكاء.

الفرق؟ التاجر (ب) استخدم **Trap Defence BTC**.

⚠️ **قبل أن تخسر رأس مالك، شاهد هذا الفيديو لمدة 4 دقائق.**
تعلم كيف تتجنب فخاخ الحيتان.

🚀 **احصل على "منطق كشف الفخاخ" الذي يستخدمه المحترفون (مجاناً):**
👉 ${deepLink}

#Bitcoin #Crypto #تداول #بيتكوين #TrapDefence`,

  // ------------------------------------------------------------------
  // Korean (Speed & Competition)
  // Strategy: Use "Seoryeok" (Forces/Whales) and "Ants" (Retail). High urgency.
  // ------------------------------------------------------------------
  ko: (deepLink, vsl1Link) => `🎬 **똑같은 자본금으로 시작한 두 명의 트레이더...**

${vsl1Link}

3개월 후의 충격적인 결과:
❌ **트레이더 A:** 1주일 만에 수익 전액 반납. 세력의 설거지 대상이 됨.
✅ **트레이더 B:** 폭락 전 탈출, 수익 확정. 여유로운 관망.

차이점은 단 하나. 트레이더 B는 **Trap Defence BTC**를 사용했습니다.

⚠️ **세력에게 당하기 전에 이 4분짜리 영상을 꼭 시청하세요.**
여러분의 시드머니를 지키는 방법이 담겨 있습니다.

🚀 **상위 1%가 사용하는 '함정 회피 로직' 무료 받기:**
👉 ${deepLink}

#Bitcoin #비트코인 #코인 #트레이딩 #개미털기방지 #TrapDefence`,
};

/**
 * 言語に応じたVSL1メッセージを生成
 * @param {string} lang - 言語コード (en, ja, es, pt-br, ar, ko)
 * @param {string} deepLink - Telegram Botへのディープリンク
 * @param {string} vsl1Link - VSL1動画（YouTube）へのリンク
 */
function generateVSL1Message(lang, deepLink, vsl1Link) {
  // 言語コードの正規化 (例: pt_br -> pt-br, PT-BR -> pt-br)
  const normalizedLang = lang && typeof lang === 'string' 
    ? lang.toLowerCase().replace('_', '-') 
    : 'en';
    
  // 対応するメッセージ関数を取得（デフォルトは英語）
  const messageFn = VSL1_MESSAGES[normalizedLang] || VSL1_MESSAGES.en;
  
  return messageFn(deepLink, vsl1Link);
}

module.exports = { generateVSL1Message, VSL1_MESSAGES };
