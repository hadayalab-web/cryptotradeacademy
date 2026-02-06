/**
 * ペルソナ風 testimonial（ハッタリ戦法・社会的証明）
 * Grok セールスレターの OBJECTION HANDLING や Product Intro 周りで使用。
 * 「I'm Safe (Trap Avoided)」系を前面に、大げさに・ドラマチックに。
 */

const TESTIMONIALS = {
  en: [
    "🔥 I'm Safe. Trap avoided. Score was 12/100—I sat out. Would've been rekt. — J, swing",
    "This morning's trap? Score 25. I stayed out. 🔥 Trap Avoided. First time I didn't revenge-trade. — M, 34",
    "One miss used to cost me 6 figures. Now I wait for the number. Saved again. — R, 3y",
    "Whale-retail divergence alert = I didn't FOMO. Dump came. I'm Safe. — K",
    "Regular Exit Map saved my account last week. No joke. 🔥 I'm Safe (Trap Avoided). — D",
    "Live in 6 languages. I got the alert in my feed. Trap avoided. Scale is real. — S, worldwide"
  ],
  ja: [
    "🔥 I'm Safe。トラップ回避。スコア12で待った。あのまま飛び乗ってたら死んでた。— J, スイング",
    "今朝のトラップ、スコア25で完全回避。初めて復讐トレードしなかった。🔥 — M, 34",
    "1回のミスで6桁飛んだ時代。今は数字見てから。また助かった。— R, 3年目",
    "クジラと個人の逆行アラートでFOMOしなかった。ドンプ来た。I'm Safe。— K",
    "先週のExit Mapが口座救った。🔥 トラップ回避。— D",
    "6言語で展開してる。自分の言語でアラート来た。トラップ回避。規模が違う。— S"
  ],
  es: [
    "🔥 I'm Safe. Trampa evitada. Score 12/100—me quedé fuera. Me hubiera rekt. — J",
    "Trampa de esta mañana? Score 25. Me quedé fuera. 🔥 Trap Avoided. — M, 34",
    "Un error me costaba 6 cifras. Ahora espero el número. Me salvé de nuevo. — R",
    "Alerta divergencia ballena-retail = no FOMO. Bajó. I'm Safe. — K",
    "Exit Map de Regular me salvó la semana pasada. 🔥 Trampa evitada. — D",
    "En vivo en 6 idiomas. Me llegó la alerta. Trampa evitada. La escala es real. — S"
  ],
  "pt-br": [
    "🔥 I'm Safe. Armadilha evitada. Score 12/100—fiquei fora. Teria sido rekt. — J",
    "Armadilha desta manhã? Score 25. Fiquei fora. 🔥 Trap Avoided. — M, 34",
    "Um erro me custava 6 dígitos. Agora espero o número. Salvo de novo. — R",
    "Alerta divergência baleia-retail = não FOMO. Caiu. I'm Safe. — K",
    "Exit Map do Regular salvou minha conta semana passada. 🔥 Armadilha evitada. — D",
    "Ao vivo em 6 idiomas. Recebi o alerta. Armadilha evitada. Escala é real. — S"
  ],
  ar: [
    "🔥 I'm Safe. الفخ اتجنب. Score 12/100—وقفت برا. كنت هتخسر. — J",
    "فخ النهاردة؟ Score 25. وقفت برا. 🔥 Trap Avoided. — M",
    "غلطة وحدة كانت 6 أرقام. دلوقتي أستنى الرقم. انقذت تاني. — R",
    "تنبيه تباعد الحوت = ما دخلتش FOMO. نزل. I'm Safe. — K",
    "Exit Map من Regular انقذني الأسبوع اللي فات. 🔥 الفخ اتجنب. — D",
    "مباشر بـ 6 لغات. وصلني التنبيه. الفخ اتجنب. الحجم حقيقي. — S"
  ],
  ko: [
    "🔥 I'm Safe. 함정 회피. 스코어 12/100—안 들어갔다. 들어갔으면 망했을 듯. — J",
    "오늘 아침 함정? 스코어 25. 안 들어감. 🔥 Trap Avoided. — M, 34",
    "한 번 실수가 6자리 날렸음. 이제 숫자 보고 움직임. 또 살았음. — R",
    "고래-개인 역행 알림 = FOMO 안 함. 폭락 왔음. I'm Safe. — K",
    "Regular Exit Map이 지난주 계좌 살렸음. 🔥 함정 회피. — D",
    "6개국어로 진행 중. 내 언어로 알림 왔음. 함정 회피. 스케일 다름. — S"
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
