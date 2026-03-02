/**
 * Xリプライ直販戦略（Gemini戦略統合版）
 * 出典: x_sales_strategy.md
 */

const SUPPORTED_REPLY_LANGS = ["en", "ja", "ko", "es", "pt", "ar"];

const REPLY_SEARCH_QUERIES_BY_LANG = {
  en: {
    strict:
      '(liquidated OR rekt OR "stop hunted" OR "blown account") (btc OR crypto OR trading) -giveaway -airdrop -free lang:en -is:retweet -is:reply',
    balanced:
      '("lost money" OR fomo OR "staring at charts" OR overtrading) (btc OR crypto) -airdrop -giveaway lang:en -is:retweet -is:reply'
  },
  ja: {
    strict:
      "(ロスカット OR 焼かれた OR 全損 OR 退場) (BTC OR 仮想通貨 OR ビットコイン) -プレゼント -エアドロ -無料 lang:ja -is:retweet -is:reply",
    balanced:
      "(ポジポジ病 OR 飛び乗り OR 高値掴み OR チャート見すぎ) (BTC OR 仮想通貨) -プレゼント -エアドロ lang:ja -is:retweet -is:reply"
  },
  ko: {
    strict:
      "(청산 OR 뚝배기 OR 강제청산 OR 물렸다) (비트코인 OR 코인 OR BTC) -에어드랍 -무료 -증정금 lang:ko -is:retweet -is:reply",
    balanced:
      "(뇌동매매 OR 추격매수 OR 포모 OR 밤샘) (비트코인 OR 코인) -에어드랍 -이벤트 lang:ko -is:retweet -is:reply"
  },
  es: {
    strict:
      '(liquidado OR "cuenta quemada" OR "stop loss") (btc OR crypto OR bitcoin) -sorteo -airdrop -gratis lang:es -is:retweet -is:reply',
    balanced:
      '(fomo OR sobreoperando OR "mirando gráficos") (btc OR crypto) -sorteo -airdrop lang:es -is:retweet -is:reply'
  },
  pt: {
    strict:
      '(liquidado OR "quebrei a banca" OR "stop caçado") (btc OR cripto OR bitcoin) -sorteio -airdrop -grátis lang:pt -is:retweet -is:reply',
    balanced:
      '(fomo OR overtrading OR "olhando gráficos") (btc OR cripto) -sorteio -airdrop lang:pt -is:retweet -is:reply'
  },
  ar: {
    strict:
      '(تصفية OR "ضرب الستوب" OR تمرجن OR "خسرت فلوسي") (بتكوين OR كريبتو OR btc) -توزيع -ايردروب -مجانا lang:ar -is:retweet -is:reply',
    balanced:
      '(فومو OR "تداول مفرط" OR "مراقبة الشارت") (بتكوين OR كريبتو) -توزيع -مجانا lang:ar -is:retweet -is:reply'
  }
};

const REPLY_POST_TYPE_PRIORITY = {
  loss_report: 4,
  fomo_mental: 3,
  prediction_confusion: 2,
  beginner_learning: 1
};

const REPLY_POST_TYPE_KEYWORDS_BY_LANG = {
  en: {
    loss_report: [
      "liquidated",
      "rekt",
      "stop hunted",
      "stop loss",
      "blown account",
      "wiped out",
      "lost money"
    ],
    fomo_mental: ["fomo", "can't sleep", "cant sleep", "overtrading", "chasing candles", "panic"],
    prediction_confusion: ["where next", "up or down", "no idea", "confused", "market structure"],
    beginner_learning: ["beginner", "new to crypto", "learning", "how to trade", "first trade"]
  },
  ja: {
    loss_report: ["ロスカット", "損切り", "焼かれた", "全損", "退場", "含み損"],
    fomo_mental: ["fomo", "寝不足", "ポジポジ病", "飛び乗り", "パニック"],
    prediction_confusion: ["予想", "わからない", "どっち", "迷子", "相場環境"],
    beginner_learning: ["初心者", "勉強中", "学習", "初めて", "どうやる"]
  },
  ko: {
    loss_report: ["청산", "손절", "물렸다", "뚝배기", "손실", "강제청산"],
    fomo_mental: ["포모", "밤샘", "뇌동매매", "추격매수", "패닉"],
    prediction_confusion: ["모르겠다", "헷갈", "어디로", "예측", "구조"],
    beginner_learning: ["초보", "입문", "배우", "공부", "처음"]
  },
  es: {
    loss_report: ["liquidado", "stop loss", "cuenta quemada", "perdido dinero", "rekt"],
    fomo_mental: ["fomo", "sin dormir", "sobreoperando", "pánico", "persiguiendo velas"],
    prediction_confusion: ["confundido", "no sé", "arriba o abajo", "predicción", "estructura"],
    beginner_learning: ["principiante", "aprendiendo", "nuevo", "cómo operar", "estudiando"]
  },
  pt: {
    loss_report: ["liquidado", "stop caçado", "quebrei a banca", "perdi dinheiro", "fumo"],
    fomo_mental: ["fomo", "sem dormir", "overtrading", "pânico", "comprando topo"],
    prediction_confusion: ["confuso", "não sei", "pra onde", "previsão", "estrutura"],
    beginner_learning: ["iniciante", "aprendendo", "novo", "como operar", "estudando"]
  },
  ar: {
    loss_report: ["تصفية", "ضرب الستوب", "خسرت فلوسي", "تمرجن", "خسارة فادحة"],
    fomo_mental: ["فومو", "بدون نوم", "تداول مفرط", "ذعر", "ملاحقة الشموع"],
    prediction_confusion: ["محتار", "مش فاهم", "وين رايح", "توقع", "هيكل"],
    beginner_learning: ["مبتدئ", "أتعلم", "جديد", "كيف أتداول", "تعليم"]
  }
};

const REPLY_ONE_WORD_HOOK_BY_LANG = {
  en: {
    loss_report: "Ouch.",
    fomo_mental: "Breathe.",
    prediction_confusion: "Structure.",
    beginner_learning: "Defense."
  },
  ja: {
    loss_report: "痛い。",
    fomo_mental: "深呼吸。",
    prediction_confusion: "構造。",
    beginner_learning: "防御。"
  },
  ko: {
    loss_report: "아픔.",
    fomo_mental: "호흡.",
    prediction_confusion: "구조.",
    beginner_learning: "방어."
  },
  es: {
    loss_report: "Ojo.",
    fomo_mental: "Respira.",
    prediction_confusion: "Estructura.",
    beginner_learning: "Defensa."
  },
  pt: {
    loss_report: "Atenção.",
    fomo_mental: "Respira.",
    prediction_confusion: "Estrutura.",
    beginner_learning: "Defesa."
  },
  ar: {
    loss_report: "انتبه.",
    fomo_mental: "تنفس.",
    prediction_confusion: "هيكل.",
    beginner_learning: "دفاع."
  }
};

const REPLY_HOOKS_BY_LANG_AND_TYPE = {
  en: {
    loss_report: [
      "Ouch, looks like a classic algo liquidity hunt.",
      "Stop losses getting hunted is exactly how whales accumulate.",
      "That dump wasn't random, it was a structural trap."
    ],
    fomo_mental: [
      "FOMO is just a chemical reaction. Don't let it trigger a trap.",
      "When everyone is fearful, algos are hunting.",
      "Take 3 breaths. The urge to chase is exactly what they want."
    ],
    prediction_confusion: [
      "Charts alone won't show you whale intent.",
      "You're trying to predict surface noise. Look at the hidden liquidity.",
      "Stop guessing the next candle and start reading the structure."
    ],
    beginner_learning: [
      "The most powerful skill is doing nothing 70% of the time.",
      "Trading isn't about constant buying. It's about defense.",
      "Start by learning how institutions hunt retail."
    ]
  },
  ja: {
    loss_report: [
      "典型的なアルゴの流動性刈りですね…",
      "ストップ狩りはクジラの集める手口です。",
      "その急落、実は事前に構造的な罠が見えていました。"
    ],
    fomo_mental: [
      "FOMOは脳の化学反応です。罠に飛び込まないで。",
      "大衆がパニックの時こそ、アルゴは動きます。",
      "深呼吸を3回。飛び乗りたくなる感情こそが彼らの狙いです。"
    ],
    prediction_confusion: [
      "チャートだけではクジラの意図は読めません。",
      "表面のノイズを予想するより、隠れた流動性を見るべきです。",
      "次のロウソクを当てるのではなく、相場の構造を読み解きましょう。"
    ],
    beginner_learning: [
      "トレードで最強のスキルは70%は何もしないことです。",
      "常に買うことがトレードではありません。防御こそが要です。",
      "まずは機関投資家がいかに個人を狩るかを学ぶべきです。"
    ]
  },
  ko: {
    loss_report: [
      "전형적인 알고리즘의 유동성 사냥이네요...",
      "스탑 헌팅은 고래가 매집하는 방식입니다.",
      "그 하락은 우연이 아니라 구조적인 덫이었습니다."
    ],
    fomo_mental: [
      "FOMO는 화학 반응일 뿐입니다. 덫에 걸리지 마세요.",
      "모두가 두려워할 때 알고리즘은 사냥을 시작합니다.",
      "심호흡을 3번 하세요. 추격 매수 충동이 바로 그들이 원하는 것입니다."
    ],
    prediction_confusion: [
      "차트만으로는 고래의 의도를 알 수 없습니다.",
      "표면 노이즈를 예측하지 말고 숨겨진 유동성을 보세요.",
      "다음 캔들을 추측하지 말고 구조를 읽기 시작하세요."
    ],
    beginner_learning: [
      "가장 강력한 기술은 70%의 시간 동안 아무것도 하지 않는 것입니다.",
      "트레이딩은 끊임없이 사는 것이 아니라 방어하는 것입니다.",
      "기관이 어떻게 개인을 사냥하는지 배우는 것으로 시작하세요."
    ]
  },
  es: {
    loss_report: [
      "Ouch, parece una clásica caza de liquidez de algoritmos.",
      "La caza de stop losses es exactamente como acumulan las ballenas.",
      "Esa caída no fue al azar, fue una trampa estructural."
    ],
    fomo_mental: [
      "El FOMO es solo una reacción química. No caigas en la trampa.",
      "Cuando todos tienen miedo, los algoritmos están cazando.",
      "Respira 3 veces. El impulso de perseguir es exactamente lo que quieren."
    ],
    prediction_confusion: [
      "Los gráficos por sí solos no te mostrarán la intención de las ballenas.",
      "Estás intentando predecir ruido superficial. Mira la liquidez oculta.",
      "Deja de adivinar la próxima vela y empieza a leer la estructura."
    ],
    beginner_learning: [
      "La habilidad más poderosa es no hacer nada el 70% del tiempo.",
      "El trading no es comprar constantemente. Se trata de defensa.",
      "Comienza aprendiendo cómo las instituciones cazan a los minoristas."
    ]
  },
  pt: {
    loss_report: [
      "Ouch, parece uma clássica caça à liquidez de algoritmos.",
      "Caçar stop losses é exatamente como as baleias acumulam.",
      "Essa queda não foi aleatória, foi uma armadilha estrutural."
    ],
    fomo_mental: [
      "FOMO é apenas uma reação química. Não caia na armadilha.",
      "Quando todos têm medo, os algoritmos estão caçando.",
      "Respire 3 vezes. A vontade de perseguir o preço é exatamente o que eles querem."
    ],
    prediction_confusion: [
      "Gráficos sozinhos não mostram a intenção das baleias.",
      "Você está prevendo ruído superficial. Olhe para a liquidez oculta.",
      "Pare de adivinhar a próxima vela e comece a ler a estrutura."
    ],
    beginner_learning: [
      "A habilidade mais poderosa é não fazer nada 70% do tempo.",
      "Trading não é comprar constantemente. É sobre defesa.",
      "Comece aprendendo como as instituições caçam os varejistas."
    ]
  },
  ar: {
    loss_report: [
      "يبدو أنه صيد سيولة تقليدي من الخوارزميات.",
      "صيد وقف الخسارة هو بالضبط كيف تجمع الحيتان.",
      "هذا الهبوط لم يكن عشوائياً، كان فخاً هيكلياً."
    ],
    fomo_mental: [
      "الفومو مجرد تفاعل كيميائي. لا تقع في الفخ.",
      "عندما يكون الجميع خائفين، الخوارزميات تصطاد.",
      "خذ 3 أنفاس. الرغبة في الملاحقة هي بالضبط ما يريدونه."
    ],
    prediction_confusion: [
      "الرسوم البيانية وحدها لن تظهر نية الحيتان.",
      "أنت تحاول التنبؤ بالضوضاء السطحية. انظر إلى السيولة المخفية.",
      "توقف عن تخمين الشمعة التالية وابدأ في قراءة الهيكل."
    ],
    beginner_learning: [
      "أقوى مهارة هي عدم فعل أي شيء 70% من الوقت.",
      "التداول ليس شراءً مستمراً. إنه دفاع.",
      "ابدأ بتعلم كيف تصطاد المؤسسات المتداولين الأفراد."
    ]
  }
};

const REPLY_PATTERNS_BY_LANG = {
  en: {
    A: [
      "Stop chasing green candles. See whale traps before they trigger. 50% OFF coupon + 1-day trial for Trap Defence BTC: [LINK]",
      "Tired of being liquidity for institutions? Read structure before reaction. 50% OFF + 1-day trial: [LINK]"
    ],
    B: [
      "Charts are surface-level. We visualize hidden liquidity and algo behavior. Trap Defence BTC with 50% OFF coupon + 1-day trial: [LINK]",
      "Trading is often doing nothing 70% of the time. Learn structural reads with 50% OFF + 1-day trial: [LINK]"
    ],
    C: [
      "It hurts when whales hunt your stops. Trade from clarity, not emotion. 50% OFF coupon + 1-day trial: [LINK]",
      "I've been there, watching charts for hours and still getting rekt. 50% OFF + 1-day trial starts here: [LINK]"
    ]
  },
  ja: {
    A: [
      "もう緑のロウソクを追うのはやめましょう。クジラの罠を先に見る。Trap Defence BTC 50%OFFクーポン + 1日トライアル: [LINK]",
      "機関の養分になる流れを止めましょう。防御プロトコルを起動。50%OFF + 1日トライアル: [LINK]"
    ],
    B: [
      "チャートは表面です。隠れた流動性とアルゴ行動を可視化します。Trap Defence BTC 50%OFFクーポン + 1日トライアル: [LINK]",
      "トレードは70%何もしない規律が鍵。構造を読む訓練を50%OFF + 1日トライアルで: [LINK]"
    ],
    C: [
      "ストップ狩り、きついですよね。感情ではなく根拠で守る。50%OFFクーポン + 1日トライアル: [LINK]",
      "チャート監視で消耗する感覚、わかります。防御型で再構築。50%OFF + 1日トライアル: [LINK]"
    ]
  },
  ko: {
    A: [
      "더 이상 녹색 캔들을 쫓지 마세요. 고래의 덫을 먼저 보세요. Trap Defence BTC 50% 할인 쿠폰 + 1일 트라이얼: [LINK]",
      "기관의 유동성 먹잇감이 되는 흐름을 끊으세요. 50% 할인 + 1일 트라이얼: [LINK]"
    ],
    B: [
      "차트는 표면일 뿐입니다. 숨겨진 유동성과 알고리즘 움직임을 시각화합니다. 50% 할인 쿠폰 + 1일 트라이얼: [LINK]",
      "트레이딩의 70%는 기다림입니다. 구조 읽기를 50% 할인 + 1일 트라이얼로 시작하세요: [LINK]"
    ],
    C: [
      "스탑 헌팅 당하면 정말 아프죠. 감정보다 근거로 방어하세요. 50% 할인 쿠폰 + 1일 트라이얼: [LINK]",
      "차트를 오래 봐도 청산당하던 시기, 저도 겪었습니다. 50% 할인 + 1일 트라이얼: [LINK]"
    ]
  },
  es: {
    A: [
      "Deja de perseguir velas verdes. Detecta las trampas antes de que se activen. 50% OFF + prueba de 1 día en Trap Defence BTC: [LINK]",
      "¿Cansado de ser liquidez para instituciones? Activa defensa estructural. 50% OFF + prueba de 1 día: [LINK]"
    ],
    B: [
      "Los gráficos son la superficie. Visualizamos liquidez oculta y comportamiento algorítmico. 50% OFF + prueba de 1 día: [LINK]",
      "El trading también es no hacer nada el 70% del tiempo. Aprende estructura con 50% OFF + prueba de 1 día: [LINK]"
    ],
    C: [
      "Duele cuando cazan tu stop loss. Opera con claridad, no con emoción. 50% OFF + prueba de 1 día: [LINK]",
      "Mirar gráficos horas y perder igual es agotador. Reinicia con defensa estructural: 50% OFF + prueba de 1 día: [LINK]"
    ]
  },
  pt: {
    A: [
      "Pare de perseguir velas verdes. Veja as armadilhas antes do gatilho. 50% OFF + 1 dia de teste no Trap Defence BTC: [LINK]",
      "Cansado de ser liquidez para instituições? Ative defesa estrutural. 50% OFF + 1 dia de teste: [LINK]"
    ],
    B: [
      "Gráficos são só superfície. Visualizamos liquidez oculta e comportamento de algoritmos. 50% OFF + 1 dia de teste: [LINK]",
      "Trading também é não fazer nada 70% do tempo. Leia estrutura com 50% OFF + 1 dia de teste: [LINK]"
    ],
    C: [
      "Dói quando caçam seu stop. Opere com clareza, não emoção. 50% OFF + 1 dia de teste: [LINK]",
      "Ficar horas no gráfico e perder igual é desgastante. Reinicie com defesa: 50% OFF + 1 dia de teste: [LINK]"
    ]
  },
  ar: {
    A: [
      "توقف عن ملاحقة الشموع الخضراء. اكتشف الفخاخ قبل أن تعمل. خصم 50% + تجربة يوم واحد في Trap Defence BTC: [LINK]",
      "هل تعبت من كونك سيولة للمؤسسات؟ فعّل الدفاع الهيكلي. خصم 50% + تجربة يوم واحد: [LINK]"
    ],
    B: [
      "الرسوم البيانية مجرد سطح. نحن نوضح السيولة المخفية وسلوك الخوارزميات. خصم 50% + تجربة يوم واحد: [LINK]",
      "التداول ليس حركة مستمرة. 70% منه انضباط وانتظار. ابدأ بخصم 50% + تجربة يوم واحد: [LINK]"
    ],
    C: [
      "مؤلم حين يتم صيد وقف الخسارة الخاص بك. تداول بوضوح لا بعاطفة. خصم 50% + تجربة يوم واحد: [LINK]",
      "أعرف تعب مراقبة الشارت لساعات ثم الخسارة. ابدأ من جديد بالدفاع: خصم 50% + تجربة يوم واحد: [LINK]"
    ]
  }
};

function normalizeReplyLang(lang) {
  const normalized = String(lang || "")
    .toLowerCase()
    .trim();
  return SUPPORTED_REPLY_LANGS.includes(normalized) ? normalized : "en";
}

function normalizeText(rawText) {
  return String(rawText || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function includesAny(text, keywords) {
  return (keywords || []).some((term) => text.includes(String(term || "").toLowerCase()));
}

function hashStringToUint32(raw) {
  const text = String(raw || "");
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) >>> 0;
  }
  return hash >>> 0;
}

function pickBySeed(list, seed, fallback = "") {
  const arr = Array.isArray(list) ? list.filter(Boolean) : [];
  if (!arr.length) return fallback;
  const index = hashStringToUint32(seed) % arr.length;
  return arr[index];
}

function detectReplyPostType(lang, tweetText) {
  const normalizedLang = normalizeReplyLang(lang);
  const catalog = REPLY_POST_TYPE_KEYWORDS_BY_LANG[normalizedLang] || REPLY_POST_TYPE_KEYWORDS_BY_LANG.en;
  const text = normalizeText(tweetText);
  if (!text) return "prediction_confusion";

  if (includesAny(text, catalog.loss_report)) return "loss_report";
  if (includesAny(text, catalog.fomo_mental)) return "fomo_mental";
  if (includesAny(text, catalog.beginner_learning)) return "beginner_learning";
  if (includesAny(text, catalog.prediction_confusion)) return "prediction_confusion";
  return "prediction_confusion";
}

function getReplySearchQuery(lang, mode = "strict") {
  const normalizedLang = normalizeReplyLang(lang);
  const modeKey = String(mode || "strict").toLowerCase() === "balanced" ? "balanced" : "strict";
  const row = REPLY_SEARCH_QUERIES_BY_LANG[normalizedLang] || REPLY_SEARCH_QUERIES_BY_LANG.en;
  return row[modeKey] || row.strict;
}

function buildReplyMessage({
  lang,
  username,
  tweetText,
  tweetId,
  offerUrl,
  seedSalt = "",
  forcedPattern = null
}) {
  const normalizedLang = normalizeReplyLang(lang);
  const safeTweetId = String(tweetId || `${username || "candidate"}:${Date.now()}`);
  const postType = detectReplyPostType(normalizedLang, tweetText);
  const oneWordMap =
    REPLY_ONE_WORD_HOOK_BY_LANG[normalizedLang] || REPLY_ONE_WORD_HOOK_BY_LANG.en;
  const hookMap =
    REPLY_HOOKS_BY_LANG_AND_TYPE[normalizedLang] || REPLY_HOOKS_BY_LANG_AND_TYPE.en;
  const patternMap = REPLY_PATTERNS_BY_LANG[normalizedLang] || REPLY_PATTERNS_BY_LANG.en;

  const oneWordHook = oneWordMap[postType] || oneWordMap.prediction_confusion || "Focus.";
  const postTypeHooks = hookMap[postType] || hookMap.prediction_confusion || [];
  const hook = pickBySeed(postTypeHooks, `${safeTweetId}:hook`, "");

  const seedBase = `${safeTweetId}:${String(seedSalt || "")}`;
  const patternLabel =
    forcedPattern && ["A", "B", "C"].includes(forcedPattern)
      ? forcedPattern
      : pickBySeed(["A", "B", "C"], `${seedBase}:pattern`, "A");
  const patternCandidates = patternMap[patternLabel] || patternMap.A || [];
  const patternLine = pickBySeed(patternCandidates, `${seedBase}:line`, patternCandidates[0] || "");
  const body = String(patternLine || "").replace(/\[LINK\]/g, String(offerUrl || "").trim());

  const mention = username ? `@${String(username).replace(/^@/, "")}` : "";
  const composed = [mention, oneWordHook, hook, body].filter(Boolean).join(" ").trim();

  return {
    text: composed,
    postType,
    priority: REPLY_POST_TYPE_PRIORITY[postType] || 1,
    pattern: patternLabel,
    oneWordHook,
    hook
  };
}

module.exports = {
  SUPPORTED_REPLY_LANGS,
  REPLY_SEARCH_QUERIES_BY_LANG,
  REPLY_POST_TYPE_PRIORITY,
  normalizeReplyLang,
  detectReplyPostType,
  getReplySearchQuery,
  buildReplyMessage
};
