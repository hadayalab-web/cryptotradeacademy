// config/quoteRepostTemplatesIntegrated.js
// 引用リポスト用テンプレート: 無料版（Minimal）と有料版（Regular）導線を1投稿に統合
// 設計: ヘッドラインで引き→無料/有料TG配信をチラ見せ（ツァイガルニク）→VSL＋Whop。目標 800〜1000 文字。
// ペルソナ決め打ち: バリアントEは config/personaStrategy.js の CORE_PHRASES.state を参照する。

const {
  getMinimalVersionCheckoutUrl,
  getRegularWhopLinkOnly,
  getPromoCode
} = require("../services/telegram/whop-links");
const { CORE_PHRASES } = require("./personaStrategy");
const { VSL_MINIMAL, VSL_REGULAR } = require("./vslLinks");
const { getHeadline } = require("./quoteRepostHeadlines");
const {
  getMinimalTeaser,
  getRegularTeaser,
  getMinimalLinkExplanation,
  getRegularLinkExplanation,
  getCtaBlock,
  getObjectionFixed
} = require("./quoteRepostVariantGCopy");

const VSL_MINIMAL_URL = VSL_MINIMAL.url;
const VSL_REGULAR_URL = VSL_REGULAR.url;

/** 有料導線: Whopはリンクだけ（X投稿ポリシー・リッチプレビューを避ける） */
function getRegularCtaLine(lang) {
  return getRegularWhopLinkOnly(lang);
}

/**
 * バリアントG用: ヘッドライン＋Minimal/Regularブロック（チラ見せ＋リンク説明）＋反論定型＋CTAブロック。
 * 構成: ヘッドライン → [Gemini: 市況＋無様なペルソナ言及] → 無料チラ見せ＋説明＋VSL/Whop → 有料チラ見せ＋説明＋VSL/Whop → 反論定型 → CTA（価格・トライアル・コード）
 * @param {string} lang - 言語コード
 * @param {Object} options - { influencerUsername }
 * @returns {{ headline, minimalBlock, regularBlock, objectionFixed, promoBlock }}
 */
function getQuoteRepostGeminiStructureParts(lang, options = {}) {
  const normalizedLang = (lang || "en").toLowerCase().replace("_", "-");
  const minimalUrl =
    getMinimalVersionCheckoutUrl(normalizedLang, {
      utm_content: options.influencerUsername
        ? `influencer_${options.influencerUsername}`
        : "integrated",
      ...options
    }) || getMinimalVersionCheckoutUrl("en", options);
  const regularCta = getRegularCtaLine(normalizedLang);
  const promoCode = getPromoCode && getPromoCode() ? getPromoCode().toUpperCase() : "DEFEND50";

  const headline = getHeadline(normalizedLang);
  const minimalTeaser = getMinimalTeaser(normalizedLang);
  const minimalExplain = getMinimalLinkExplanation(normalizedLang);
  const minimalBlock = `${minimalTeaser}\n\n${minimalExplain}\n${VSL_MINIMAL_URL}\n${minimalUrl}`;

  const regularTeaser = getRegularTeaser(normalizedLang);
  const regularExplain = getRegularLinkExplanation(normalizedLang);
  const regularBlock = `${regularTeaser}\n\n${regularExplain}\n${VSL_REGULAR_URL}\n${regularCta}`;

  const objectionFixed = getObjectionFixed(normalizedLang);
  const promoBlock = `${getCtaBlock(normalizedLang, promoCode)}\n${regularCta}\n\n#BTC #TrapDefence`;

  return { headline, minimalBlock, regularBlock, objectionFixed, promoBlock };
}

/**
 * 統合テンプレート: 無料＋有料の両導線を1投稿で出す
 * @param {string} lang - 言語コード (en, es, pt-br, ar, ko, ja)
 * @param {Object} options - { influencerUsername, utm_content, variant: 'A'|'B'|'C'|'D'|'E'|'F'|'G' }
 * @returns {string} 引用リポスト用テキスト
 */
function getIntegratedMinimalRegularQuoteTemplate(lang, options = {}) {
  const normalizedLang = (lang || "en").toLowerCase().replace("_", "-");
  const minimalUrl =
    getMinimalVersionCheckoutUrl(normalizedLang, {
      utm_content: options.influencerUsername
        ? `influencer_${options.influencerUsername}`
        : "integrated",
      ...options
    }) || getMinimalVersionCheckoutUrl("en", options);
  const regularCta = getRegularCtaLine(normalizedLang);
  const promoCode = getPromoCode && getPromoCode() ? getPromoCode().toUpperCase() : "DEFEND50";
  const priceHookEn = CORE_PHRASES.price.en;
  const priceHookJa = CORE_PHRASES.price.ja;

  // バリアントA: ヘッドライン→無料/有料TGチラ見せ（ツァイガルニク）→VSL＋Whop（約1000文字）
  const teaserEn =
    "Today's free TG snippet: «Score 12/100. Exit map—» Rest in Telegram. Regular Briefing snippet: «Whales loading. Next trap in 48h—» Rest in Whop.";
  const teaserJa =
    "今日の無料TG一切れ: «スコア12/100。出口マップは—» 続きはTGで。有料ブリーフ一切れ: «クジラ積み中。次の罠は48h—» 続きはWhopで。";
  const variantA = {
    en: () =>
      `Can't stop trading? Most people lose because they act without a frame. We show the trap score for free—so you know when to sit tight. The exit map? That's in Regular Briefing. ${priceHookEn}\n\n${teaserEn}\n\nWatch the free VSL. Get the score. Then level up.\n${VSL_MINIMAL_URL}\n${minimalUrl} ${regularCta}\n#BTC #TrapDefence`,
    ja: () =>
      `「待てない」で負けてない？多くの人が枠なしで動いて負ける。罠スコアは無料で—いつ飛び込むかがわかる。出口マップは有料ブリーフの奥に。${priceHookJa}\n\n${teaserJa}\n\n無料VSLを視聴。スコアを取ってから次へ。\n${VSL_MINIMAL_URL}\n${minimalUrl} ${regularCta}\n#BTC #TrapDefence`,
    es: () =>
      `¿No puedes dejar de operar? Mostramos el trap score (gratis). ¿Mapa de salida? En Regular Briefing. Hoy en TG gratis: «Score 12/100. Mapa—» Resto en Telegram. Regular Briefing: «Ballenas cargando. Siguiente trampa—» Resto en Whop. Mira: ${VSL_MINIMAL_URL} ${minimalUrl} ${regularCta} #BTC #TrapDefence`,
    "pt-br": () =>
      `Não para de operar? Mostramos o trap score (grátis). Mapa de saída? Está no Regular Briefing. Hoje no TG grátis: «Score 12/100. Mapa—» Resto no Telegram. Regular Briefing: «Baleias carregando. Próxima armadilha—» Resto no Whop. Assista: ${VSL_MINIMAL_URL} ${minimalUrl} ${regularCta} #BTC #TrapDefence`,
    ar: () =>
      `ما تقدر توقف التداول؟ نوري trap score (مجاني). خريطة الخروج؟ في Regular Briefing. اليوم في TG مجاني: «Score 12/100. خريطة—» الباقي في تيليجرام. Regular Briefing: «حيتان تحمّل. الفخ الجاي—» الباقي في Whop. شوف: ${VSL_MINIMAL_URL} ${minimalUrl} ${regularCta} #BTC #TrapDefence`,
    ko: () =>
      `못 참고 매매해? 트랩 스코어는 무료. 출구 맵? Regular Briefing 안에 있어. 오늘 무료 TG 한 조각: «스코어 12/100. 출구 맵—» 나머지는 TG에서. Regular Briefing: «고래 로딩. 다음 함정—» 나머지는 Whop에서. 시청: ${VSL_MINIMAL_URL} ${minimalUrl} ${regularCta} #BTC #TrapDefence`
  };

  // バリアントB: 「彼らは笑った」＋ 無料/有料TGチラ見せ（ツァイガルニク）→VSL＋Whop
  const variantB = {
    en: () =>
      `They laughed when I said "wait for the trap." Then the dump came. Score + exit map: free tier & Regular Briefing. Today's free TG: «Score 12/100. Exit map—» Rest in Telegram. Regular Briefing: «Whales loading. Next trap—» Rest in Whop. Watch: ${VSL_MINIMAL_URL} ${minimalUrl} ${regularCta} #BTC #TrapDefence`,
    ja: () =>
      `「罠を待て」と言ったら笑われた。そのあとダンプが来た。スコア＋出口は無料と有料で。今日の無料TG: «スコア12/100。出口マップ—» 続きはTGで。有料: «クジラ積み中。次の罠—» 続きはWhopで。視聴: ${VSL_MINIMAL_URL} ${minimalUrl} ${regularCta} #BTC #TrapDefence`,
    es: () =>
      `Se rieron cuando dije "espera la trampa." Luego vino el dump. Score + mapa salida: gratis y Regular Briefing. Hoy TG gratis: «Score 12/100. Mapa—» Resto en Telegram. Regular Briefing: «Ballenas. Siguiente trampa—» Resto en Whop. Mira: ${VSL_MINIMAL_URL} ${minimalUrl} ${regularCta} #BTC #TrapDefence`,
    "pt-br": () =>
      `Riram quando falei "espere a armadilha." Veio o dump. Score + mapa saída: grátis e Regular Briefing. Hoje TG grátis: «Score 12/100. Mapa—» Resto no Telegram. Regular Briefing: «Baleias. Próxima armadilha—» Resto no Whop. Assista: ${VSL_MINIMAL_URL} ${minimalUrl} ${regularCta} #BTC #TrapDefence`,
    ar: () =>
      `ضحكوا لما قلت "استنى الفخ." بعدين جت الـ dump. سكور + خريطة خروج: مجاني و Regular Briefing. اليوم TG مجاني: «Score 12/100. خريطة—» الباقي في تيليجرام. Regular Briefing: «حيتان. الفخ الجاي—» الباقي في Whop. شوف: ${VSL_MINIMAL_URL} ${minimalUrl} ${regularCta} #BTC #TrapDefence`,
    ko: () =>
      `"함정 기다려" 하니까 비웃더라. 그다음 덤프 왔음. 스코어+출구: 무료랑 Regular Briefing. 오늘 무료 TG: «스코어 12/100. 출구 맵—» 나머지는 TG. Regular Briefing: «고래. 다음 함정—» 나머지는 Whop. 시청: ${VSL_MINIMAL_URL} ${minimalUrl} ${regularCta} #BTC #TrapDefence`
  };

  // バリアントC: 「90%が嵌る罠」＋ 無料でスコア・有料で全文
  const variantC = {
    en: () =>
      `The trap 90% of traders fall into. Score free; "where to exit" in Regular Briefing. Watch: ${VSL_MINIMAL_URL} Free: ${minimalUrl} ${regularCta} #BTC #TrapDefence`,
    ja: () =>
      `トレーダー90%が嵌る罠。スコアは無料。「どこで出口」は有料ブリーフで。視聴: ${VSL_MINIMAL_URL} 無料: ${minimalUrl} ${regularCta} #BTC #TrapDefence`,
    es: () =>
      `La trampa en la que caen 90% de traders. Score gratis; "dónde salir" en Regular Briefing. Mira: ${VSL_MINIMAL_URL} Gratis: ${minimalUrl} ${regularCta} #BTC #TrapDefence`,
    "pt-br": () =>
      `A armadilha em que 90% dos traders caem. Score grátis; "onde sair" no Regular Briefing. Assista: ${VSL_MINIMAL_URL} Grátis: ${minimalUrl} ${regularCta} #BTC #TrapDefence`,
    ar: () =>
      `الفخ اللي 90% من المتداولين يقعوا فيه. سكور مجاني؛ "وين تخرج" في Regular Briefing. شوف: ${VSL_MINIMAL_URL} مجاني: ${minimalUrl} ${regularCta} #BTC #TrapDefence`,
    ko: () =>
      `트레이더 90%가 걸리는 함정. 스코어 무료. "어디서 출구"는 Regular Briefing에. 시청: ${VSL_MINIMAL_URL} 무료: ${minimalUrl} ${regularCta} #BTC #TrapDefence`
  };

  // バリアントD: ドローダウン特化＋TGチラ見せ→VSL＋Whop
  const variantD = {
    en: () =>
      `Market bleeding? Don't jump in without the trap score. Free score; exit map in Regular Briefing. Today's free TG: «Score 12/100. Exit map—» Rest in Telegram. Regular Briefing: «Next trap. On-chain—» Rest in Whop. ${VSL_MINIMAL_URL} ${minimalUrl} ${regularCta} #BTC #TrapScore #RiskOff #TrapDefence`,
    ja: () =>
      `相場が血の海のとき、スコア見ずに飛び込むな。無料スコア；出口マップは有料ブリーフで。今日の無料TG: «スコア12/100。出口マップ—» 続きはTGで。有料: «次の罠。オンチェーン—» 続きはWhopで。${VSL_MINIMAL_URL} ${minimalUrl} ${regularCta} #BTC #TrapScore #RiskOff #TrapDefence`,
    es: () =>
      `¿Mercado en rojo? No entres sin el trap score. Score gratis; mapa salida en Regular Briefing. Hoy TG gratis: «Score 12/100. Mapa—» Resto en Telegram. Regular Briefing: «Próxima trampa. On-chain—» Resto en Whop. ${VSL_MINIMAL_URL} ${minimalUrl} ${regularCta} #BTC #TrapScore #RiskOff #TrapDefence`,
    "pt-br": () =>
      `Mercado sangrando? Não entre sem o trap score. Score grátis; mapa saída no Regular Briefing. Hoje TG grátis: «Score 12/100. Mapa—» Resto no Telegram. Regular Briefing: «Próxima armadilha. On-chain—» Resto no Whop. ${VSL_MINIMAL_URL} ${minimalUrl} ${regularCta} #BTC #TrapScore #RiskOff #TrapDefence`,
    ar: () =>
      `السوق ينزف؟ لا تدخل بدون trap score. سكور مجاني؛ خريطة خروج في Regular Briefing. اليوم TG مجاني: «Score 12/100. خريطة—» الباقي في تيليجرام. Regular Briefing: «الفخ الجاي. On-chain—» الباقي في Whop. ${VSL_MINIMAL_URL} ${minimalUrl} ${regularCta} #BTC #TrapScore #RiskOff #TrapDefence`,
    ko: () =>
      `시장 피터지는데 스코어 안 보고 들어가? 무료 스코어；출구 맵은 Regular Briefing에. 오늘 무료 TG: «스코어 12/100. 출구 맵—» 나머지는 TG. Regular Briefing: «다음 함정. On-chain—» 나머지는 Whop. ${VSL_MINIMAL_URL} ${minimalUrl} ${regularCta} #BTC #TrapScore #RiskOff #TrapDefence`
  };

  // バリアントE: ペルソナ決め打ち（personaStrategy.CORE_PHRASES.state をSSOTとして使用）
  const stateHookEn = CORE_PHRASES.state.en;
  const stateHookJa = CORE_PHRASES.state.ja;
  const variantE = {
    en: () =>
      `${stateHookEn} Trap Score = data vs gut. Free TG: «Score 12/100. Exit map—» Rest in Telegram. Regular Briefing: «Next trap—» Rest in Whop. Free: ${minimalUrl} ${regularCta} Watch: ${VSL_MINIMAL_URL} #BTC #TrapDefence`,
    ja: () =>
      `${stateHookJa} Trap Scoreでdata vs gut。無料TG: «スコア12/100。出口マップ—» 続きはTGで。有料: «次の罠—» 続きはWhopで。無料: ${minimalUrl} ${regularCta} 視聴: ${VSL_MINIMAL_URL} #BTC #TrapDefence`,
    es: () =>
      `¿Atrapado en el bucle de "solo mirar" con pérdida no realizada? Sin reglas = cada movimiento una suposición. Trap Score = datos vs instinto. TG gratis: «Score 12/100. Mapa—» Resto en Telegram. Regular Briefing: «Próxima trampa—» Resto en Whop. Gratis: ${minimalUrl} ${regularCta} Mira: ${VSL_MINIMAL_URL} #BTC #TrapDefence`,
    "pt-br": () =>
      `Preso no loop de "só assistir" com perda não realizada? Sem regras = cada movimento um chute. Trap Score = dados vs gut. TG grátis: «Score 12/100. Mapa—» Resto no Telegram. Regular Briefing: «Próxima armadilha—» Resto no Whop. Grátis: ${minimalUrl} ${regularCta} Assista: ${VSL_MINIMAL_URL} #BTC #TrapDefence`,
    ar: () =>
      `عالق في حلقة "فقط أشاهد" مع خسارة غير محققة؟ بدون قواعد = كل خطوة تخمين. Trap Score = بيانات vs غريزة. TG مجاني: «Score 12/100. خريطة—» الباقي في تيليجرام. Regular Briefing: «الفخ الجاي—» الباقي في Whop. مجاني: ${minimalUrl} ${regularCta} شوف: ${VSL_MINIMAL_URL} #BTC #TrapDefence`,
    ko: () =>
      `미실현 손실로 "그냥 보기" 루프에 갇혀? 룰 없음 = 매번 추측. Trap Score = 데이터 vs 직감. 무료 TG: «스코어 12/100. 출구 맵—» 나머지는 TG. Regular Briefing: «다음 함정—» 나머지는 Whop. 무료: ${minimalUrl} ${regularCta} 시청: ${VSL_MINIMAL_URL} #BTC #TrapDefence`
  };

  // バリアントF: ヘッドライン→含み損/思考停止/トレード依存の自覚→Minimal/Regularチラ見せ→必要性→VSL＋Whop＋プロモコード
  const variantF = {
    ja: () =>
      `【なぜ、毎日見ている"あの銘柄"が突然暴れ始めたのか】

市場は常に理由を隠す。
そして、多くの人は「動いた後」に理由を探し始める。
でも、動く"前"に理由を掴める人間だけが、静かに勝ち続ける。

含み損で「見るだけ」ループにハマってない？チャートを眺めては手を出せず、でも離れられない。それ、トレード依存の思考停止状態。多くの人が同じ穴に落ちる。抜け道は「枠組み」だけ。

今日の無料配信（Minimal Version）の一切れ:
«スコア12/100。出口マップは—» 続きはTGで。

有料ブリーフ（Regular Briefing）の一切れ:
«クジラ積み中。次の罠は48h—» 続きはWhopで。

なぜこれが必要か。この情報はリアルタイムで見ないと意味がない。知っているかどうかで、"勝てる相場"と"ただのギャンブル"の境界線が決まる。

無料の全体像はVSLで。有料の続きはWhopで。コード ${promoCode} で50%オフ。

▼ 無料 Trap Defence VSL
${VSL_MINIMAL_URL}
▼ 無料版（Minimal）登録
${minimalUrl}

▼ 有料アップグレード VSL
${VSL_REGULAR_URL}
▼ Regular Briefing（コード ${promoCode}）
${regularCta}

#BTC #TrapDefence`,
    en: () =>
      `【Why does "that coin" you watch every day suddenly go crazy?】

The market always hides the reason.
Most people start looking for the reason after the move.
Only those who grasp the reason before the move win quietly.

Stuck in the "just watching" loop with unrealized loss? Can't pull the trigger, can't walk away. That's trade addiction + mental freeze. Many are in the same hole. The way out is a framework.

Today's free (Minimal Version) snippet:
«Score 12/100. Exit map—» Rest in Telegram.

Regular Briefing snippet:
«Whales loading. Next trap in 48h—» Rest in Whop.

Why you need this: this intel only works in real time. Whether you have it or not decides "tradeable edge" vs "pure gamble."

Full free story in the VSL. Full paid story on Whop. Code ${promoCode} for 50% off.

▼ Free Trap Defence VSL
${VSL_MINIMAL_URL}
▼ Minimal (free) signup
${minimalUrl}

▼ Upgrade VSL
${VSL_REGULAR_URL}
▼ Regular Briefing (code ${promoCode})
${regularCta}

#BTC #TrapDefence`,
    es: () =>
      `【¿Por qué "esa moneda" que ves cada día de repente se vuelve loca?】

El mercado siempre esconde la razón.
La mayoría busca la razón después del movimiento.
Solo quien la agarra antes del movimiento gana en silencio.

¿Atrapado en el bucle de "solo mirar" con pérdida no realizada? No disparas, no te vas. Eso es adicción al trading + parálisis. Muchos en el mismo agujero. La salida es un marco.

Hoy gratis (Minimal Version): «Score 12/100. Mapa—» Resto en Telegram.
Regular Briefing: «Ballenas. Próxima trampa 48h—» Resto en Whop.

Por qué lo necesitas: esta info solo sirve en tiempo real. Tenerla o no marca "borde tradeable" vs "pura apuesta."

VSL = historia gratis. Whop = historia de pago. Código ${promoCode} 50% off.

▼ VSL gratis: ${VSL_MINIMAL_URL}
▼ Minimal: ${minimalUrl}
▼ VSL upgrade: ${VSL_REGULAR_URL}
▼ Regular (code ${promoCode}): ${regularCta}
#BTC #TrapDefence`,
    "pt-br": () =>
      `【Por que "aquela moeda" que você vê todo dia de repente enlouquece?】

O mercado sempre esconde o motivo.
A maioria procura o motivo depois do movimento.
Só quem agarra antes do movimento ganha em silêncio.

Preso no loop de "só assistir" com perda não realizada? Não puxa o gatilho, não sai. Isso é vício em trading + paralisia. Muitos no mesmo buraco. A saída é um framework.

Hoje grátis (Minimal): «Score 12/100. Mapa—» Resto no Telegram.
Regular Briefing: «Baleias. Próxima armadilha 48h—» Resto no Whop.

Por que precisa: essa info só vale em tempo real. Ter ou não define "edge tradeável" vs "aposta pura."

VSL = história grátis. Whop = história paga. Código ${promoCode} 50% off.

▼ VSL grátis: ${VSL_MINIMAL_URL}
▼ Minimal: ${minimalUrl}
▼ VSL upgrade: ${VSL_REGULAR_URL}
▼ Regular (code ${promoCode}): ${regularCta}
#BTC #TrapDefence`,
    ar: () =>
      `【ليش "هاي العملة" اللي تشوفها كل يوم فجأة تصير مجنونة؟】

السوق دايم يخبي السبب.
أغلب الناس يبدون يبحثون بعد الحركة.
اللي يمسك السبب قبل الحركة يكسب بصمت.

عالق في حلقة "فقط أشاهد" مع خسارة غير محققة؟ ما تضغط، ما تطلع. هذي إدمان تداول + تجمد. كثير في نفس الحفرة. المخرج = إطار.

اليوم مجاني (Minimal): «Score 12/100. خريطة—» الباقي في تيليجرام.
Regular Briefing: «حيتان. الفخ الجاي 48h—» الباقي في Whop.

ليش تحتاجها: هالمعلومة تخدم فقط بالوقت الحقيقي. وجودها يحدد "edge" vs "قمار."

VSL = قصة مجانية. Whop = قصة مدفوعة. كود ${promoCode} خصم 50%.

▼ VSL مجاني: ${VSL_MINIMAL_URL}
▼ Minimal: ${minimalUrl}
▼ VSL ترقية: ${VSL_REGULAR_URL}
▼ Regular (code ${promoCode}): ${regularCta}
#BTC #TrapDefence`,
    ko: () =>
      `【왜 매일 보는 "그 코인"이 갑자기 미친 듯이 움직이기 시작할까?】

시장은 항상 이유를 숨긴다.
대부분은 움직인 뒤에 이유를 찾기 시작한다.
움직이기 전에 이유를 잡는 사람만 조용히 이긴다.

미실현 손실로 "그냥 보기" 루프에 갇혀? 트리거를 당기지도, 떠나지도 못한다. 그게 트레이드 중독 + 멘탈 프리즈. 같은 구덩이에 많은 사람. 출구는 프레임워크뿐.

오늘 무료(Minimal) 한 조각: «스코어 12/100. 출구 맵—» 나머지는 TG에서.
Regular Briefing: «고래 로딩. 다음 함정 48h—» 나머지는 Whop에서.

왜 필요한지: 이 정보는 실시간으로 봐야 의미 있다. 갖고 있느냐에 따라 "트레이더블 엣지" vs "순수 도박"이 갈린다.

VSL = 무료 스토리. Whop = 유료 스토리. 코드 ${promoCode} 50% 할인.

▼ 무료 VSL: ${VSL_MINIMAL_URL}
▼ Minimal: ${minimalUrl}
▼ 업그레이드 VSL: ${VSL_REGULAR_URL}
▼ Regular (code ${promoCode}): ${regularCta}
#BTC #TrapDefence`
  };

  const variant = options.variant || "A";
  const map =
    variant === "F"
      ? variantF
      : variant === "B"
        ? variantB
        : variant === "C"
          ? variantC
          : variant === "D"
            ? variantD
            : variant === "E"
              ? variantE
              : variantA;
  const fn = map[normalizedLang] || map.en;
  return fn();
}

/** 統合テンプレートのバリアント名（A〜F。F=ヘッドライン→含み損/依存自覚→Minimal/Regularチラ見せ→VSL/Whop+DEFEND50） */
const INTEGRATED_VARIANTS = ["A", "B", "C", "D", "E", "F"];

function getAllIntegratedTemplates(options = {}) {
  const langs = ["en", "ja", "es", "pt-br", "ar", "ko"];
  return Object.fromEntries(
    langs.map((lang) => [lang, getIntegratedMinimalRegularQuoteTemplate(lang, options)])
  );
}

module.exports = {
  VSL_MINIMAL_URL,
  VSL_REGULAR_URL,
  INTEGRATED_VARIANTS,
  getIntegratedMinimalRegularQuoteTemplate,
  getQuoteRepostGeminiStructureParts,
  getAllIntegratedTemplates,
  getRegularCtaLine,
  getRegularWhopLinkOnly
};
