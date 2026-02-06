/**
 * ペルソナ風 testimonial（ハッタリ戦法・社会的証明）
 * ガンガン盛る。I'm Safe / Trap Avoided / 桁の大きい数字を前面に。
 */

const TESTIMONIALS = {
  en: [
    "Trap Score 28 saved me from a $52,400 loss. I didn't even click buy. — Alex, 32",
    "🔥 I'm Safe. Score 12/100—I sat out. Would've lost $80k+. Trap avoided. — J, swing",
    "This week's trap? Score 25. Stayed out. 🔥 Trap Avoided. First time I didn't revenge-trade. — M, 34",
    "One miss used to cost me 6 figures. Now I wait for the number. Account saved. — R, 3y",
    "Whale-retail divergence = I didn't FOMO. -15% dump came. I'm Safe. — K",
    "Regular Exit Map saved my account. No joke. 🔥 I'm Safe (Trap Avoided). — D",
    "6 languages live. Got the alert. Trap avoided. Scale is insane. — S, worldwide",
    "Would've been rekt 3x this month without the Score. 🔥 I'm Safe. — T",
    "Score 18/100 = didn't touch it. Trap avoided. Still have my stack. — V"
  ],
  ja: [
    "Trap Score 28で$52,400の損を回避。買いすら押さなかった。— Alex, 32",
    "🔥 I'm Safe。スコア12で待った。あのままなら$80k飛んでた。トラップ回避。— J, スイング",
    "今週のトラップ、スコア25で完全回避。初めて復讐トレードしなかった。🔥 — M, 34",
    "1回のミスで6桁飛んだ時代。今は数字見てから。口座守れた。— R, 3年目",
    "クジラ逆行アラートでFOMOしなかった。-15%ドンプ来た。I'm Safe。— K",
    "先週のExit Mapが口座救った。🔥 トラップ回避。— D",
    "6言語で展開。自分の言語でアラート来た。トラップ回避。規模やばい。— S",
    "スコアがなかったら今月3回死んでた。🔥 I'm Safe。— T",
    "スコア18で手を出さなかった。トラップ回避。まだスタックある。— V"
  ],
  es: [
    "Trap Score 28 me salvó de perder $52,400. Ni siquiera hice clic en comprar. — Alex, 32",
    "🔥 I'm Safe. Score 12/100—me quedé fuera. Me hubiera costado $80k+. Trampa evitada. — J",
    "Trampa de esta semana? Score 25. Me quedé fuera. 🔥 Trap Avoided. — M, 34",
    "Un error me costaba 6 cifras. Ahora espero el número. Cuenta salvada. — R",
    "Divergencia ballena-retail = no FOMO. Cayó -15%. I'm Safe. — K",
    "Exit Map de Regular me salvó la cuenta. 🔥 Trampa evitada. — D",
    "6 idiomas en vivo. Llegó la alerta. Trampa evitada. Escala brutal. — S",
    "Sin el Score me rekt 3 veces este mes. 🔥 I'm Safe. — T",
    "Score 18/100 = no toqué. Trampa evitada. Sigo con mi stack. — V"
  ],
  "pt-br": [
    "Trap Score 28 me salvou de uma perda de $52.400. Nem cliquei em comprar. — Alex, 32",
    "🔥 I'm Safe. Score 12/100—fiquei fora. Teria perdido $80k+. Armadilha evitada. — J",
    "Armadilha desta semana? Score 25. Fiquei fora. 🔥 Trap Avoided. — M, 34",
    "Um erro me custava 6 dígitos. Agora espero o número. Conta salva. — R",
    "Divergência baleia-retail = não FOMO. Caiu -15%. I'm Safe. — K",
    "Exit Map do Regular salvou minha conta. 🔥 Armadilha evitada. — D",
    "6 idiomas ao vivo. Recebi o alerta. Armadilha evitada. Escala absurda. — S",
    "Sem o Score teria rekt 3x este mês. 🔥 I'm Safe. — T",
    "Score 18/100 = não mexi. Armadilha evitada. Stack intacto. — V"
  ],
  ar: [
    "Trap Score 28 انقذني من خسارة $52,400. ما ضغطت شراء أصلاً. — Alex, 32",
    "🔥 I'm Safe. Score 12/100—وقفت برا. كنت هخسر $80k+. الفخ اتجنب. — J",
    "فخ الاسبوع؟ Score 25. وقفت برا. 🔥 Trap Avoided. — M",
    "غلطة وحدة كانت 6 أرقام. دلوقتي أستنى الرقم. الحساب انقذ. — R",
    "تباعد الحوت = ما دخلتش FOMO. نزل -15%. I'm Safe. — K",
    "Exit Map من Regular انقذ الحساب. 🔥 الفخ اتجنب. — D",
    "6 لغات مباشر. وصل التنبيه. الفخ اتجنب. الحجم مجنون. — S",
    "بدون الScore كنت rekt 3 مرات الشهر. 🔥 I'm Safe. — T",
    "Score 18/100 = ما لمسته. الفخ اتجنب. الstack لسه معايا. — V"
  ],
  ko: [
    "Trap Score 28이 $52,400 손실을 막아줬어요. 매수 버튼도 안 눌렀어요. — Alex, 32",
    "🔥 I'm Safe. 스코어 12/100—안 들어갔다. $80k 날렸을 뻔. 함정 회피. — J",
    "이번 주 함정? 스코어 25. 안 들어감. 🔥 Trap Avoided. — M, 34",
    "한 번 실수가 6자리 날렸음. 이제 숫자 보고 움직임. 계좌 살았음. — R",
    "고래 역행 알림 = FOMO 안 함. -15% 폭락 왔음. I'm Safe. — K",
    "Regular Exit Map이 계좌 살렸음. 🔥 함정 회피. — D",
    "6개국어 라이브. 알림 왔음. 함정 회피. 스케일 미쳤음. — S",
    "스코어 없었으면 이번 달 3번 망했을 듯. 🔥 I'm Safe. — T",
    "스코어 18로 안 건드림. 함정 회피. 스택 아직 있음. — V"
  ]
};

/**
 * 言語用の testimonial を1つランダムに返す（シード指定で再現可能）
 * @param {string} lang
 * @param {number} [seed] - 未指定なら Math.random
 */
function getRandomTestimonial(lang, seed = null) {
  const normalized = (lang || "en").toLowerCase().replace("_", "-");
  const pool = TESTIMONIALS[normalized] || TESTIMONIALS.en;
  const idx =
    seed != null ? Math.abs(Math.floor(seed)) % pool.length : Math.floor(Math.random() * pool.length);
  return pool[idx];
}

/**
 * プロンプト用に2つまで返す（OBJECTION と Product Intro で使い分け可能）
 * @param {string} lang
 * @param {number} [seed]
 */
function getTestimonialsForPrompt(lang, seed = null) {
  const normalized = (lang || "en").toLowerCase().replace("_", "-");
  const pool = TESTIMONIALS[normalized] || TESTIMONIALS.en;
  if (pool.length <= 2) return pool;
  const s = seed != null ? Math.abs(Math.floor(seed)) % 1000 : Date.now() % 1000;
  const i = s % pool.length;
  const j = (s + 1) % pool.length;
  return [pool[i], pool[j]];
}

module.exports = {
  TESTIMONIALS,
  getRandomTestimonial,
  getTestimonialsForPrompt
};
