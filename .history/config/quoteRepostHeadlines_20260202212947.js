// config/quoteRepostHeadlines.js
// 引用リポスト用ヘッドラインのプール（バリアントG: Gemini構造で使用）

const HEADLINES = {
  ja: [
    "【なぜ、毎日見ている\"あの銘柄\"が突然暴れ始めたのか】",
    "【含み損のまま「見るだけ」で終わる人の共通点】",
    "【動く\"前\"に理由を掴める人だけが、静かに勝ち続ける】",
  ],
  en: [
    "Why does \"that coin\" you watch every day suddenly go crazy?",
    "What everyone stuck in the \"just watching\" loop has in common.",
    "Only those who grasp the reason before the move win quietly.",
  ],
  es: [
    "¿Por qué \"esa moneda\" que ves cada día de repente se vuelve loca?",
    "Lo que tienen en común los atrapados en el bucle de \"solo mirar\".",
    "Solo quien agarra la razón antes del movimiento gana en silencio.",
  ],
  "pt-br": [
    "Por que \"aquela moeda\" que você vê todo dia de repente enlouquece?",
    "O que quem está preso no loop de \"só assistir\" tem em comum.",
    "Só quem agarra o motivo antes do movimento ganha em silêncio.",
  ],
  ar: [
    "ليش \"هاي العملة\" اللي تشوفها كل يوم فجأة تصير مجنونة؟",
    "اللي عالقين في حلقة \"فقط أشاهد\" يشتركون في شيء واحد.",
    "اللي يمسك السبب قبل الحركة يكسب بصمت.",
  ],
  ko: [
    "왜 매일 보는 \"그 코인\"이 갑자기 미친 듯이 움직이기 시작할까?",
    "\"그냥 보기\" 루프에 갇힌 사람들의 공통점.",
    "움직이기 전에 이유를 잡는 사람만 조용히 이긴다.",
  ],
};

function getHeadline(lang) {
  const normalizedLang = (lang || "en").toLowerCase().replace("_", "-");
  const pool = HEADLINES[normalizedLang] || HEADLINES.en;
  return pool[Math.floor(Math.random() * pool.length)];
}

module.exports = {
  HEADLINES,
  getHeadline,
};
