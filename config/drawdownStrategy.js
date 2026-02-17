// config/drawdownStrategy.js
// Grok（Xセンチメント/アルゴリズム）＋ Gemini（深層心理）＋ 統合分析に基づく
// 「投稿が回れば回るほどプログラムが渇望され売上爆増する」仕掛け

const SUPPORTED_LANGS = ["en", "ja", "es", "pt-br", "ar", "ko"];

/**
 * 現在の市場がドローダウンとみなすか
 * @param {Object} reportData - { trapScore, priceUsd, change24h }
 * @returns {boolean}
 */
function isDrawdown(reportData = {}) {
  if (!reportData) return false;
  const change24h = reportData.change24h;
  const trapScore = reportData.trapScore;
  // 24h が -1% 以下、または トラップスコアが 35 未満なら「荒れ」とみなす
  if (typeof change24h === "number" && change24h < -1) return true;
  if (typeof trapScore === "number" && trapScore < 35) return true;
  return false;
}

/** 70k 支持線テストとみなすか（セールストークの緊急フレーム用） */
const SUPPORT_70K_THRESHOLD_USD = 72500;

function isSupportTest70k(reportData = {}) {
  if (!reportData || reportData.priceUsd == null) return false;
  const priceUsd = Number(reportData.priceUsd);
  return priceUsd <= SUPPORT_70K_THRESHOLD_USD;
}

/**
 * ドローダウン時のバリアント重み（D を 50% にし、回るほど防御系メッセージが増える）
 * @returns {{ weights: Record<string, number>, ordered: string[] }}
 */
function getDrawdownVariantWeight() {
  return {
    weights: { D: 0.5, A: 0.17, B: 0.17, C: 0.16 },
    ordered: ["D", "A", "B", "C"]
  };
}

/**
 * 通常時のバリアント（均等）
 * @returns {string[]}
 */
function getDefaultVariantOrder() {
  return ["A", "B", "C", "D"];
}

/**
 * 重みに従ってバリアントを1つ選ぶ
 * @param {{ weights: Record<string, number>, ordered: string[] }} weightSpec
 * @returns {string}
 */
function pickVariantWithWeight(weightSpec) {
  const { weights, ordered } = weightSpec;
  const r = Math.random();
  let acc = 0;
  for (const v of ordered) {
    acc += weights[v] || 0;
    if (r < acc) return v;
  }
  return ordered[ordered.length - 1];
}

/**
 * ドローダウン用ショートフック（Grok: 100-150字・恐怖＋質問でリプライ誘発）
 * @param {string} lang
 * @returns {string}
 */
function getDrawdownHook(lang) {
  const normalizedLang = (lang || "en").toLowerCase().replace("_", "-");
  const hooks = {
    en: "BTC -40% from ATH. Next trap cleans out the rest. What's your exit rule?",
    ja: "ATHから-40%。次に来る罠が残りを一掃する。お前の出口ルールは？",
    es: "BTC -40% desde ATH. La próxima trampa limpia al resto. ¿Cuál es tu regla de salida?",
    "pt-br": "BTC -40% do ATH. A próxima armadilha limpa o resto. Qual sua regra de saída?",
    ar: "BTC -40% من ATH. الفخ الجاي ينضف الباقي. وين قاعدة خروجك؟",
    ko: "ATH 대비 -40%. 다음 함정이 남은 사람들 쓸어감. 너의 출구 룰은?"
  };
  return hooks[normalizedLang] || hooks.en;
}

/**
 * Gemini の心理原則に基づく CTA 文言（訴求・クリック誘導）
 * @param {string} lang
 * @param {'loss_aversion'|'bandwagon'|'control'} principle
 * @returns {string}
 */
function getDrawdownCTA(lang, principle) {
  const normalizedLang = (lang || "en").toLowerCase().replace("_", "-");
  const ctas = {
    en: {
      loss_aversion:
        "The bottom is unknown. Missing the reversal signal means you never get this price again. Wait for that signal only.",
      bandwagon: "Smart money is already moving. Get the same exit map they use.",
      control: "Start by not losing. Only those who kept capital in this dump will win the next bubble."
    },
    ja: {
      loss_aversion: "底値は誰にも分からない。反転の合図を見逃すと、二度とこの価格では拾えない。その合図だけを待て。",
      bandwagon: "機関はもう動いている。彼らと同じ出口マップを手に入れろ。",
      control: "まずは負けないことから。この下落で資産を守った者だけが、次のバブルの勝者になる。"
    },
    es: {
      loss_aversion:
        "El fondo es desconocido. Perder la señal de reversa significa no ver este precio de nuevo. Espera solo esa señal.",
      bandwagon: "El smart money ya se mueve. Consigue el mismo mapa de salida que usan ellos.",
      control: "Empieza por no perder. Solo quien preservó capital en este dump ganará la próxima burbuja."
    },
    "pt-br": {
      loss_aversion:
        "O fundo é incerto. Perder o sinal de reversão significa nunca mais ver esse preço. Espere só esse sinal.",
      bandwagon: "O smart money já está se movendo. Tenha o mesmo mapa de saída que eles usam.",
      control: "Comece por não perder. Só quem preservou capital neste dump ganhará a próxima bolha."
    },
    ar: {
      loss_aversion: "القاع مجهول. تفويت إشارة الانعكاس يعني ما ترى هذا السعر مرة ثانية. استنى الإشارة بس.",
      bandwagon: "المال الذكي تحرك. خذ نفس خريطة الخروج اللي يستخدمونها.",
      control: "ابدأ بعدم الخسارة. اللي حافظ على رأس المال بهالانخفاض راح يكسب الفقاعة الجاية."
    },
    ko: {
      loss_aversion: "바닥은 아무도 모름. 반전 신호를 놓치면 이 가격을 다시 못 본다. 그 신호만 기다려.",
      bandwagon: "스마트 머니는 이미 움직이고 있음. 그들이 쓰는 출구 맵을 가져와.",
      control: "먼저 지지 않기부터. 이 하락에서 자산을 지킨 자만 다음 버블 승자."
    }
  };
  const langCtas = ctas[normalizedLang] || ctas.en;
  return langCtas[principle] || langCtas.loss_aversion;
}

/** Grok 推奨のドローダウン時ハッシュタグ（アルゴブースト用） */
const DRAWDOWN_HASHTAGS = ["#BTC", "#TrapScore", "#RiskOff", "#TrapDefence"];

/**
 * コンテンツ最適化プロンプトに注入する「統合戦略」テキスト
 * （Grok アルゴ＋ Gemini 心理＋ 仕掛けの要約）
 */
const INTEGRATED_STRATEGY_FOR_PROMPT = `
## ドローダウン時・統合戦略（Grok＋Gemini＋仕掛け）

- **アルゴ（Grok）**: 100–150字の短文＋恐怖＋質問フック。CTA必須。「RT同意」「コメント損切り額」でリプライ率20%↑→アルゴ24h持続。#TrapScore #RiskOff #BTC で防御クラスタ拡大。赤チャート＋緑「罠スコア」オーバレイでフック。
- **心理（Gemini）**: ①損失回避の逆手＝「次のATHへの初動に乗り遅れることこそ最大の損失」。②バンドワゴン＝「大口はあなたが恐怖している間に仕込んでいる。同じ出口マップを」。③コントロール感＝「まずは負けないことから。この下落で守った者だけが次のバブルの勝者」。
- **仕掛け**: 投稿が回るほど「罠スコア／出口マップ／トラップスタンバイ」への渇望が増す。FUD過熱で防御論のコントラリアン需要が爆増。毎回の投稿で上記3原則のいずれかをCTAに織り込み、回数を重ねるごとに売上に直結させる。
`;

/** BTCが$70k支持線付近のときのセールスレター用プロンプト（ドローダウン未満だが緊急性あり） */
const SUPPORT_70K_PROMPT = `
## 市場コンテキスト: BTC が $70k 支持線をテスト中

- 価格が重要支持（$70k付近）を試している。ここで感情売りや「ナイフ拾い」が増える。
- トーン: 緊急性を出しつつ「底値は誰にも分からない。Trap Score のシグナルだけを待て」「ナイフに飛びつくな。枠組み（フレームワーク）があって初めて入る」と訴求。
- CTA: 無料 Trap Score で「今は待つべきか」を判断→有料で出口マップと5分パルス（KIBA）。defend50 で50%オフ。
`;

module.exports = {
  SUPPORTED_LANGS,
  isDrawdown,
  isSupportTest70k,
  SUPPORT_70K_THRESHOLD_USD,
  getDrawdownVariantWeight,
  getDefaultVariantOrder,
  pickVariantWithWeight,
  getDrawdownHook,
  getDrawdownCTA,
  DRAWDOWN_HASHTAGS,
  INTEGRATED_STRATEGY_FOR_PROMPT,
  SUPPORT_70K_PROMPT
};
