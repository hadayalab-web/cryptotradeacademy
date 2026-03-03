/**
 * Xリプライ直販戦略（Gemini戦略統合版）
 * 出典: x_sales_strategy.md
 *
 * リプライ廃止に伴い、REPLY_* テンプレ（パターン・フック等）はすべて DM 専用。
 * buildReplyMessage は DM 本文を組み立てる（@メンションは含めない）。
 */

const SUPPORTED_REPLY_LANGS = ["en", "ja", "ko", "es", "pt", "ar"];

// 450ページ回して数件しか出ないのはクエリが狭い。strict/balanced は多めに OR で広げてヒット数を確保
const REPLY_SEARCH_QUERIES_BY_LANG = {
  en: {
    strict:
      '(liquidated OR rekt OR "stop hunted" OR "blown account" OR "lost money" OR "stop loss" OR wiped OR "wiped out" OR "margin call" OR "blown up" OR "blown") (btc OR crypto OR bitcoin OR trading OR chart OR eth) -giveaway -airdrop lang:en -is:retweet -is:reply',
    balanced:
      '(lost OR loss OR fomo OR "staring at charts" OR "staring at chart" OR overtrading OR "cant sleep" OR "can\'t sleep" OR chasing OR panic OR chart OR charts) (btc OR crypto OR bitcoin OR eth) -giveaway -airdrop lang:en -is:retweet -is:reply'
  },
  ja: {
    strict:
      "(ロスカット OR 焼かれた OR 全損 OR 退場 OR 損切り OR 含み損 OR 負け OR 損した OR ロス OR 暴落) (BTC OR 仮想通貨 OR ビットコイン OR トレード OR チャート) -プレゼント -エアドロ lang:ja -is:retweet -is:reply",
    balanced:
      "(ポジポジ病 OR 飛び乗り OR 高値掴み OR チャート見すぎ OR 寝不足 OR 迷い OR FOMO OR チャート OR トレード OR ポジション) (BTC OR 仮想通貨 OR ビットコイン OR 仮想) -プレゼント -エアドロ lang:ja -is:retweet -is:reply"
  },
  ko: {
    strict:
      "(청산 OR 뚝배기 OR 강제청산 OR 물렸다 OR 손절 OR 손실 OR 물림 OR 차트 OR 롱 OR 숏) (비트코인 OR 코인 OR BTC OR 트레이딩 OR 차트) -에어드랍 -증정금 lang:ko -is:retweet -is:reply",
    balanced:
      "(뇌동매매 OR 추격매수 OR 포모 OR 밤샘 OR 패닉 OR 초조 OR 차트 OR 트레이딩) (비트코인 OR 코인 OR BTC OR 트레이드) -에어드랍 -이벤트 lang:ko -is:retweet -is:reply"
  },
  es: {
    strict:
      '(liquidado OR "cuenta quemada" OR "stop loss" OR perdí OR perdida OR rekt OR "me barrió" OR "me fundí" OR caí OR quemé OR "margin call" OR "stop hunt") (btc OR crypto OR bitcoin OR trading OR cripto OR chart) -sorteo -airdrop lang:es -is:retweet -is:reply',
    balanced:
      '(fomo OR sobreoperando OR "mirando gráficos" OR "mirando graficos" OR perdida OR pérdida OR pánico OR persiguiendo OR operando OR chart OR gráfico) (btc OR crypto OR bitcoin OR cripto) -sorteo -airdrop lang:es -is:retweet -is:reply'
  },
  pt: {
    strict:
      '(liquidado OR "quebrei a banca" OR "stop caçado" OR "stop cacado" OR perdi OR rekt OR "margin call" OR "zerou" OR "perdi tudo" OR "quebrei" OR "me liquidaram") (btc OR cripto OR bitcoin OR trading OR crypto OR chart) -sorteio -airdrop lang:pt -is:retweet -is:reply',
    balanced:
      '(fomo OR overtrading OR "olhando gráficos" OR "olhando graficos" OR perda OR pânico OR panico OR perseguindo OR operando OR chart OR gráfico OR grafico) (btc OR cripto OR bitcoin OR crypto) -sorteio -airdrop lang:pt -is:retweet -is:reply'
  },
  ar: {
    strict:
      '(تصفية OR "ضرب الستوب" OR تمرجن OR "خسرت فلوسي" OR خسارة OR ضاع OR خسرت OR فقدت OR تداول OR شارت) (بتكوين OR كريبتو OR btc OR تداول OR شارت) -توزيع -ايردروب lang:ar -is:retweet -is:reply',
    balanced:
      '(فومو OR "تداول مفرط" OR "مراقبة الشارت" OR مراقبة OR خوف OR ذعر OR شارت OR تداول) (بتكوين OR كريبتو OR btc OR تداول) -توزيع -مجانا lang:ar -is:retweet -is:reply'
  }
};

/** 全6言語: strict+balanced が 0 件のとき使う広めクエリ（broad）。450ページ回して2件は異常のため OR を多めに */
const REPLY_SEARCH_QUERIES_BROAD_BY_LANG = {
  en: '(lost OR loss OR liquidated OR rekt OR trading OR chart OR charts OR long OR short OR scalp OR wiped OR blown) (btc OR crypto OR bitcoin OR eth) -giveaway -airdrop lang:en -is:retweet -is:reply',
  ja: '(損 OR ロス OR 焼けた OR トレード OR 仮想通貨 OR チャート OR ロング OR ショート OR 暴落 OR 急騰 OR ポジション) (BTC OR ビットコイン OR crypto OR 仮想) -プレゼント -エアドロ lang:ja -is:retweet -is:reply',
  ko: '(손실 OR 청산 OR 물림 OR 트레이딩 OR 코인 OR 차트 OR 롱 OR 숏 OR 스캘핑) (비트코인 OR BTC OR crypto) -에어드랍 -무료 lang:ko -is:retweet -is:reply',
  es: '(perdí OR perdida OR pérdida OR liquidado OR trading OR gráfico OR grafico OR chart OR largo OR corto OR dump OR pump OR operando) (btc OR crypto OR bitcoin OR cripto) -sorteo -airdrop lang:es -is:retweet -is:reply',
  pt: '(perdi OR perda OR liquidado OR trading OR gráfico OR grafico OR chart OR long OR short OR longo OR curto OR dump OR pump OR operando) (btc OR cripto OR bitcoin OR crypto) -sorteio -airdrop lang:pt -is:retweet -is:reply',
  ar: "(خسر OR خسرت OR خسارة OR تصفية OR تداول OR شارت OR لونج OR شورت OR ذعر OR فومو) (بتكوين OR كريبتو OR btc) -توزيع -مجانا lang:ar -is:retweet -is:reply"
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
    loss_report: ["liquidado", "stop caçado", "quebrei a banca", "perdi dinheiro", "perdi tudo"],
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

/** DM冒頭用：「クエリが拾ったワード」フック。{keyword} は該当 post_type の代表キーワードに置換（省略可） */
const REPLY_QUERY_HOOK_TEMPLATE_BY_LANG = {
  en: "That word we picked up — for real?",
  ja: "クエリが拾ったワード、本当ですか？",
  ko: "검색이 잡은 그 단어, 진짜예요?",
  es: "Esa palabra que detectamos — ¿en serio?",
  pt: "Aquela palavra que pegamos — sério?",
  ar: "الكلمة اللي طلعت لنا — جد؟"
};

/** キーワードあり版（{keyword} を代表キーワードに置換）。キーワードがない場合は REPLY_QUERY_HOOK_TEMPLATE_BY_LANG をそのまま使用 */
const REPLY_QUERY_HOOK_WITH_KEYWORD_BY_LANG = {
  en: "That word we picked up («{keyword}») — for real?",
  ja: "クエリが拾ったワード（{keyword}）、本当ですか？",
  ko: "검색이 잡은 그 단어(«{keyword}»), 진짜예요?",
  es: "Esa palabra que detectamos («{keyword}») — ¿en serio?",
  pt: "Aquela palavra que pegamos («{keyword}») — sério?",
  ar: "الكلمة اللي طلعت («{keyword}») — جد؟"
};

/** DM用：冒頭の一言（クエリフックの直後）。会話調・1:1向け */
const REPLY_ONE_WORD_HOOK_BY_LANG = {
  en: {
    loss_report: "Ouch — been there.",
    fomo_mental: "Breathe first.",
    prediction_confusion: "Structure helps.",
    beginner_learning: "Defense first."
  },
  ja: {
    loss_report: "痛いですよね。",
    fomo_mental: "ひと呼吸おきましょう。",
    prediction_confusion: "構造、大事です。",
    beginner_learning: "防御から。"
  },
  ko: {
    loss_report: "아프시죠. 저도 겪어봤어요.",
    fomo_mental: "먼저 숨 고르세요.",
    prediction_confusion: "구조가 답이에요.",
    beginner_learning: "방어가 먼저예요."
  },
  es: {
    loss_report: "Duele — ya me ha pasado.",
    fomo_mental: "Respira un momento.",
    prediction_confusion: "La estructura ayuda.",
    beginner_learning: "Primero la defensa."
  },
  pt: {
    loss_report: "Dói — já passei por isso.",
    fomo_mental: "Respira um pouco.",
    prediction_confusion: "Estrutura ajuda.",
    beginner_learning: "Defesa primeiro."
  },
  ar: {
    loss_report: "موجع — مرّ معي.",
    fomo_mental: "تنفّس شوي.",
    prediction_confusion: "الهيكل يساعد.",
    beginner_learning: "الدفاع أولاً."
  }
};

/** DM用：本文前の短い共感・洞察（1:1向け・やや長め可） */
const REPLY_HOOKS_BY_LANG_AND_TYPE = {
  en: {
    loss_report: [
      "When your stop gets hunted it's usually not bad luck — it's liquidity being taken where the book showed it.",
      "That dump you got caught in? Often the structure was visible before the move. Worth learning to read it.",
      "Stop hunts suck. The good news: you can learn where they're likely to happen before they trigger."
    ],
    fomo_mental: [
      "FOMO is just chemistry. When you feel the urge to chase, that's exactly when algos are set up to take liquidity.",
      "If you're losing sleep over the chart, take 3 breaths. The urge to jump in is what they're built to exploit.",
      "When everyone's panicking, that's when the real traps get set. Pausing helps more than reacting."
    ],
    prediction_confusion: [
      "Charts alone won't tell you where whales are aiming. Hidden liquidity does — and it's learnable.",
      "Guessing the next candle is exhausting. Reading structure (where stops sit, where liquidity pools) is the shift.",
      "You're not bad at this — you're just looking at the wrong layer. Structure first, then price."
    ],
    beginner_learning: [
      "The edge isn't trading more — it's doing nothing most of the time and acting only when structure lines up.",
      "Trading isn't about catching every move. It's about not being the liquidity that gets hunted.",
      "Best first step: learn how institutions hunt retail. Then you stop being the target."
    ]
  },
  ja: {
    loss_report: [
      "ストップが刈られたとき、運じゃなくて「流動性がここにある」とブックに出ていたことが多いです。",
      "あの急落、実は動く前に構造で読めたことが多い。読めるようになるとだいぶ楽になります。",
      "ストップ狩りはきついですよね。どこで起こりやすいか、発動前に読む方法はあります。"
    ],
    fomo_mental: [
      "FOMOは脳の化学反応です。飛び乗りたくなった瞬間こそ、アルゴが流動性を取る仕掛けができていることが多い。",
      "チャートで眠れなくなったら、深呼吸3回。飛び乗りたい衝動は、彼らが一番利用する感情です。",
      "みんながパニックのときこそ罠が仕掛けられる。反応するより一呼吸おく方が助かります。"
    ],
    prediction_confusion: [
      "チャートだけではクジラの狙いは読めません。隠れた流動性を読むと見えてきます。それも学べます。",
      "次の足を当てるのは疲れます。構造（ストップがどこにたまっているか、流動性のプール）を読むのが転換点です。",
      "センスがないのではなく、見るレイヤーが違うだけ。まず構造、その次に価格です。"
    ],
    beginner_learning: [
      "優位性はたくさんトレードすることじゃなく、大半は何もしないで構造が揃ったときだけ動くこと。",
      "トレードは全部の動きを取ることじゃない。狩られる流動性にならないことです。",
      "最初の一歩は、機関がどう個人を狩るかを知ること。そうするとターゲット側から外れます。"
    ]
  },
  ko: {
    loss_report: [
      "스탑이 헌팅당했을 땐 운이 아니라, 오더북에 유동성이 여기 있다고 보였던 경우가 많아요.",
      "그 급락, 움직이기 전에 구조로 읽을 수 있는 경우가 많습니다. 읽는 법을 배우면 훨씬 수월해져요.",
      "스탑 헌팅 당하면 정말 힘들죠. 어디서 자주 터지는지, 터지기 전에 읽는 방법이 있어요."
    ],
    fomo_mental: [
      "FOMO는 화학 반응이에요. 추격 매수하고 싶을 때가 바로 알고가 유동성 빼가는 덫을 놓을 때예요.",
      "차트 때문에 잠 못 이루면 심호흡 3번. 추격하고 싶은 충동이 그들이 가장 이용하는 감정이에요.",
      "다들 패닉일 때가 진짜 덫이 설치될 때예요. 반응하기보다 한 번 숨 고르는 게 도움이 됩니다."
    ],
    prediction_confusion: [
      "차트만으로는 고래의 의도를 못 읽어요. 숨겨진 유동성을 읽으면 보여요. 그건 배울 수 있어요.",
      "다음 캔들 맞추기는 지쳐요. 구조(스탑이 어디 쌓였는지, 유동성 풀)를 읽는 게 전환점이에요.",
      "실력이 없는 게 아니라 보는 레이어가 다른 거예요. 먼저 구조, 그다음 가격이에요."
    ],
    beginner_learning: [
      "엣지는 많이 매매하는 게 아니라, 대부분은 가만히 있다가 구조가 맞을 때만 움직이는 거예요.",
      "트레이딩은 모든 움직임을 잡는 게 아니라, 헌팅당하는 유동성이 되지 않는 거예요.",
      "첫 단계는 기관이 개인을 어떻게 사냥하는지 아는 거예요. 그러면 타깃에서 빠져나올 수 있어요."
    ]
  },
  es: {
    loss_report: [
      "Cuando te cazan el stop suele ser liquidez que estaba marcada en el libro, no mala suerte.",
      "Esa caída en la que te pillaron a menudo se podía leer en la estructura antes. Aprender a leerla ayuda.",
      "Que te cacen el stop duele. La buena noticia: se puede aprender dónde es más probable que pase antes de que pase."
    ],
    fomo_mental: [
      "El FOMO es química. Cuando te entran ganas de perseguir precio, es cuando los algos suelen estar preparados para tomar liquidez.",
      "Si no duermes por el gráfico, respira 3 veces. Las ganas de entrar son lo que más explotan.",
      "Cuando todos están en pánico es cuando montan las trampas. Pausar ayuda más que reaccionar."
    ],
    prediction_confusion: [
      "Solo con gráficos no ves a dónde apuntan las ballenas. La liquidez oculta sí — y se puede aprender.",
      "Adivinar la siguiente vela cansa. Leer la estructura (dónde están los stops, dónde la liquidez) es el cambio.",
      "No es que se te dé mal — es que miras la capa equivocada. Primero estructura, luego precio."
    ],
    beginner_learning: [
      "La ventaja no es operar más, sino no hacer nada la mayoría del tiempo y actuar solo cuando la estructura cuadra.",
      "Operar no es capturar cada movimiento. Es no ser la liquidez que cazan.",
      "El mejor primer paso: aprender cómo las instituciones cazan al retail. Así dejas de ser el blanco."
    ]
  },
  pt: {
    loss_report: [
      "Quando seu stop é caçado, muitas vezes não é azar — é liquidez que estava no livro. Vale aprender a ler.",
      "Aquela queda em que você foi pego? Muitas vezes dava para ler na estrutura antes. Aprender a ler ajuda.",
      "Stop caçado dói. A boa notícia: dá para aprender onde é mais provável acontecer antes de disparar."
    ],
    fomo_mental: [
      "FOMO é química. Quando der vontade de perseguir preço, é quando os algos costumam estar armando para tomar liquidez.",
      "Se não dormir por causa do gráfico, respire 3 vezes. A vontade de entrar é o que mais exploram.",
      "Quando todo mundo está em pânico é quando armam as armadilhas. Pausar ajuda mais que reagir."
    ],
    prediction_confusion: [
      "Só gráfico não mostra para onde as baleias estão mirando. Liquidez oculta mostra — e dá para aprender.",
      "Adivinhar o próximo candle cansa. Ler a estrutura (onde estão os stops, onde está a liquidez) é a virada.",
      "Não é que você seja ruim — é que está olhando a camada errada. Primeiro estrutura, depois preço."
    ],
    beginner_learning: [
      "A vantagem não é operar mais — é não fazer nada na maior parte do tempo e agir só quando a estrutura fecha.",
      "Trading não é pegar cada movimento. É não ser a liquidez que eles caçam.",
      "Melhor primeiro passo: aprender como as instituições caçam o varejo. Aí você deixa de ser o alvo."
    ]
  },
  ar: {
    loss_report: [
      "لما يصيدوا الستوب غالباً مو حظ — سيولة كانت واضحة في الكتاب. يستاهل تتعلم تقراه.",
      "الهبوط اللي انمسكت فيه؟ كثير كان يُقرى من الهيكل قبل ما يصير. تعلّم القراءة يساعد.",
      "صيد الستوب يؤلم. الخبر الحلو: تقدر تتعلم وين غالباً يصير قبل ما يتحرك."
    ],
    fomo_mental: [
      "الفومو كيمياء. لما تحس تبي تلحق السعر، غالباً الخوارزميات جاهزة تاخذ سيولة.",
      "إذا ما تنام من الشارت، تنفّس 3 مرات. الرغبة تدخل هي اللي يستغلونها.",
      "لما الكل يبان عليه رعب، وقتها يجهّزون الفخاخ. التوقف يفيد أكثر من الرد."
    ],
    prediction_confusion: [
      "الرسوم وحدها ما توصل نية الحيتان. السيولة المخفية توصل — وتقدر تتعلمها.",
      "تخمين الشمعة الجاية ينهك. قراءة الهيكل (وين الوقفات، وين السيولة) هي الانعطافة.",
      "مو إنك ضعيف — إنك تشوف الطبقة الغلط. أولاً الهيكل، بعدين السعر."
    ],
    beginner_learning: [
      "الميزة مو تكثر التداول — إنك ما تسوي شيء أغلب الوقت وتتحرك فقط لما الهيكل يطابق.",
      "التداول مو التقاط كل حركة. إنك ما تكون السيولة اللي يصيدونها.",
      "أفضل خطوة: تتعلم كيف المؤسسات تصطاد التجزئة. بعدين تطلع من الهدف."
    ]
  }
};

/** DM用：本文＋CTA。1:1向け・少し長めの文で誘導してからリンク */
const REPLY_PATTERNS_BY_LANG = {
  en: {
    A: [
      "If you want to see where traps tend to form before they hit, we built Trap Defence BTC for that — hidden liquidity and algo behavior in one place. 50% OFF + 1-day trial: [LINK]",
      "Tired of being the liquidity institutions hunt? You can learn to read structure first and react less. 50% OFF + 1-day trial: [LINK]"
    ],
    B: [
      "Charts only show the surface. We focus on hidden liquidity and where algos are likely to step in — that's what Trap Defence BTC is for. 50% OFF + 1-day trial: [LINK]",
      "A lot of trading edge is just not doing anything most of the time. When you do act, structure helps. 50% OFF + 1-day trial to try it: [LINK]"
    ],
    C: [
      "When your stop gets hunted it really stings. Shifting to clarity instead of emotion is doable — we built the tool for that. 50% OFF + 1-day trial: [LINK]",
      "I've been there: hours on the chart and still getting rekt. Defending better starts with reading where the traps are. 50% OFF + 1-day trial: [LINK]"
    ]
  },
  ja: {
    A: [
      "罠がどこで仕掛けられやすいか、発動前に見たいなら Trap Defence BTC を用意してあります。隠れた流動性とアルゴの動きをひとまとめに。50%OFF + 1日トライアル: [LINK]",
      "機関の養分になるの、もうやめたいなら、構造を先に読んでから動く練習ができます。50%OFF + 1日トライアル: [LINK]"
    ],
    B: [
      "チャートは表面だけ。隠れた流動性とアルゴが入りやすいポイントにフォーカスしたのが Trap Defence BTC です。50%OFF + 1日トライアル: [LINK]",
      "トレードの優位性の多くは「大半は何もしない」こと。動くときは構造が助けになります。50%OFF + 1日トライアルで試せます: [LINK]"
    ],
    C: [
      "ストップ狩り、きついですよね。感情より根拠で守るほうに切り替えるのは可能で、そのためのツールを作りました。50%OFF + 1日トライアル: [LINK]",
      "チャートで何時間も消耗してまだやられる感覚、わかります。罠がどこにあるか読むことから防御を始められます。50%OFF + 1日トライアル: [LINK]"
    ]
  },
  ko: {
    A: [
      "덫이 어디서 자주 설치되는지, 터지기 전에 보고 싶다면 Trap Defence BTC 만들어 뒀어요. 숨겨진 유동성과 알고 움직임을 한곳에. 50% 할인 + 1일 트라이얼: [LINK]",
      "기관한테 유동성 먹잇감 되기 싫으면, 구조 먼저 읽고 반응 줄이는 연습 할 수 있어요. 50% 할인 + 1일 트라이얼: [LINK]"
    ],
    B: [
      "차트는 표면만 보여요. 숨겨진 유동성이랑 알고가 개입하기 쉬운 지점에 초점 맞춘 게 Trap Defence BTC예요. 50% 할인 + 1일 트라이얼: [LINK]",
      "트레이딩 엣지의 상당 부분은 대부분 가만히 있는 거예요. 움직일 땐 구조가 도움이 됩니다. 50% 할인 + 1일 트라이얼로 써보세요: [LINK]"
    ],
    C: [
      "스탑 헌팅당하면 정말 아프죠. 감정 대신 근거로 방어하는 쪽으로 바꾸는 건 가능해요. 그걸 위한 도구 만들어 뒀어요. 50% 할인 + 1일 트라이얼: [LINK]",
      "차트 오래 보다가 여전히 당하는 느낌, 저도 겪었어요. 덫이 어디 있는지 읽는 것부터 방어 시작할 수 있어요. 50% 할인 + 1일 트라이얼: [LINK]"
    ]
  },
  es: {
    A: [
      "Si quieres ver dónde suelen montarse las trampas antes de que disparen, Trap Defence BTC es para eso: liquidez oculta y comportamiento de algos en un solo sitio. 50% OFF + prueba 1 día: [LINK]",
      "¿Cansado de ser la liquidez que cazan las instituciones? Puedes aprender a leer estructura primero y reaccionar menos. 50% OFF + prueba 1 día: [LINK]"
    ],
    B: [
      "Los gráficos solo muestran la superficie. Nosotros nos centramos en liquidez oculta y dónde es más probable que entren los algos — Trap Defence BTC es para eso. 50% OFF + prueba 1 día: [LINK]",
      "Buena parte de la ventaja en trading es no hacer nada la mayor parte del tiempo. Cuando actúas, la estructura ayuda. 50% OFF + prueba 1 día: [LINK]"
    ],
    C: [
      "Cuando te cazan el stop duele. Pasar a claridad en vez de emoción es posible — tenemos la herramienta para eso. 50% OFF + prueba 1 día: [LINK]",
      "Lo he vivido: horas en el gráfico y sigues perdiendo. Defender mejor empieza por leer dónde están las trampas. 50% OFF + prueba 1 día: [LINK]"
    ]
  },
  pt: {
    A: [
      "Se quiser ver onde as armadilhas costumam aparecer antes de disparar, fizemos o Trap Defence BTC pra isso — liquidez oculta e comportamento de algos num lugar. 50% OFF + 1 dia de teste: [LINK]",
      "Cansado de ser a liquidez que as instituições caçam? Dá pra aprender a ler estrutura primeiro e reagir menos. 50% OFF + 1 dia de teste: [LINK]"
    ],
    B: [
      "Gráficos mostram só a superfície. Nosso foco é liquidez oculta e onde os algos tendem a entrar — Trap Defence BTC é pra isso. 50% OFF + 1 dia de teste: [LINK]",
      "Muita da vantagem em trading é não fazer nada na maior parte do tempo. Quando você age, estrutura ajuda. 50% OFF + 1 dia de teste: [LINK]"
    ],
    C: [
      "Quando caçam seu stop dói. Mudar pra clareza em vez de emoção é possível — fizemos a ferramenta pra isso. 50% OFF + 1 dia de teste: [LINK]",
      "Já passei por isso: horas no gráfico e ainda levando rekt. Defender melhor começa lendo onde estão as armadilhas. 50% OFF + 1 dia de teste: [LINK]"
    ]
  },
  ar: {
    A: [
      "إذا تبي تشوف وين غالباً تنصب الفخاخ قبل ما تتحرك، سوينا Trap Defence BTC لهذا — سيولة مخفية وسلوك الخوارزميات في مكان واحد. خصم 50% + تجربة يوم: [LINK]",
      "تعبت من كونك السيولة اللي المؤسسات تصطادها؟ تقدر تتعلم تقرأ الهيكل أولاً وتقلّل ردة فعلك. خصم 50% + تجربة يوم: [LINK]"
    ],
    B: [
      "الرسوم توضح السطح فقط. نحن نركّز على السيولة المخفية وين الخوارزميات غالباً تدخل — Trap Defence BTC لهذا. خصم 50% + تجربة يوم: [LINK]",
      "كثير من الميزة في التداول إنك ما تسوي شيء أغلب الوقت. لما تتحرك، الهيكل يساعد. خصم 50% + تجربة يوم: [LINK]"
    ],
    C: [
      "لما يصيدون ستوبك يؤلم. الانتقال لوضوح بدل عاطفة ممكن — عندنا الأداة لهذا. خصم 50% + تجربة يوم: [LINK]",
      "مرّ معي: ساعات على الشارت ولسا تخسر. الدفاع الأحسن يبدأ بقراءة وين الفخاخ. خصم 50% + تجربة يوم: [LINK]"
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

/** 全言語共通。strict+balanced が 0 件のときの広めクエリ。未対応言語は en にフォールバック */
function getReplySearchQueryBroad(lang) {
  const normalized = normalizeReplyLang(lang);
  return REPLY_SEARCH_QUERIES_BROAD_BY_LANG[normalized] || REPLY_SEARCH_QUERIES_BROAD_BY_LANG.en || null;
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

  // DM専用のため @メンションは含めない（oneWordHook + hook + body のみ）
  const composed = [oneWordHook, hook, body].filter(Boolean).join(" ").trim();

  return {
    text: composed,
    postType,
    priority: REPLY_POST_TYPE_PRIORITY[postType] || 1,
    pattern: patternLabel,
    oneWordHook,
    hook
  };
}

/**
 * DM冒頭に挿入する「クエリが拾ったワード」フック文を返す。
 * @param {string} lang - 言語 (en, ja, ko, es, pt, ar)
 * @param {string} [postType] - post_type (loss_report, fomo_mental 等)。指定時はそのタイプの代表キーワードを埋め込む
 * @returns {string} フック文。未対応言語や空の場合は ""
 */
function getDmQueryHook(lang, postType) {
  const normalizedLang = normalizeReplyLang(lang);
  const template =
    REPLY_QUERY_HOOK_TEMPLATE_BY_LANG[normalizedLang] ||
    REPLY_QUERY_HOOK_TEMPLATE_BY_LANG.en;
  const withKeywordTemplate =
    REPLY_QUERY_HOOK_WITH_KEYWORD_BY_LANG[normalizedLang] ||
    REPLY_QUERY_HOOK_WITH_KEYWORD_BY_LANG.en;
  const catalog = REPLY_POST_TYPE_KEYWORDS_BY_LANG[normalizedLang] || REPLY_POST_TYPE_KEYWORDS_BY_LANG.en;
  const keywords = postType && catalog[postType] ? catalog[postType] : [];
  const keyword = Array.isArray(keywords) && keywords.length > 0 ? String(keywords[0]).trim() : "";
  if (keyword) {
    return String(withKeywordTemplate || template).replace(/\{keyword\}/g, keyword);
  }
  return template || "";
}

/** DM文末用：「その秘密に気づいた人はもう使ってるよ、あなたも試してみて」の多言語版 */
const DM_CLOSING_BY_LANG = {
  en: "People who got that secret are already using it — give it a try yourself.",
  ja: "その秘密に気づいた人はもう使ってるよ、あなたも試してみて。",
  ko: "그 비밀을 안 사람들은 이미 쓰고 있어요. 당신도 한번 써보세요.",
  es: "Quien se dio cuenta de ese secreto ya lo usa — pruébalo tú también.",
  pt: "Quem percebeu esse segredo já está usando — experimenta você também.",
  ar: "اللي اكتشفوا السر ده من زمان يستخدمونه — جربه أنت كمان."
};

function getDmClosing(lang) {
  const normalized = normalizeReplyLang(lang);
  return DM_CLOSING_BY_LANG[normalized] || DM_CLOSING_BY_LANG.en;
}

module.exports = {
  SUPPORTED_REPLY_LANGS,
  REPLY_SEARCH_QUERIES_BY_LANG,
  REPLY_SEARCH_QUERIES_BROAD_BY_LANG,
  REPLY_POST_TYPE_PRIORITY,
  REPLY_QUERY_HOOK_TEMPLATE_BY_LANG,
  REPLY_QUERY_HOOK_WITH_KEYWORD_BY_LANG,
  DM_CLOSING_BY_LANG,
  normalizeReplyLang,
  detectReplyPostType,
  getReplySearchQuery,
  getReplySearchQueryBroad,
  buildReplyMessage,
  getDmQueryHook,
  getDmClosing
};
