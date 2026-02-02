/**
 * ペルソナ解析（Grok & Gemini 2026-02）に基づく戦略・メッセージの共通定義
 * 参照: docs/ai-analysis-results/PERSONA_ANALYSIS_GROK_GEMINI_REVIEW_2026-02-02.md
 * 用途: X投稿・Whop導線・コンテンツのトーンとCTAを一貫させる
 */

/** 戦略テーマ（Gemini: 全チャネルで一貫） */
const STRATEGY_THEME_EN = "Don't Trust Your Gut, Trust the Trap Score";
const STRATEGY_THEME_JA = "感情を捨てろ、データを買え";

/** コアフレーズ集（Grok: 状態・安さ・無料→有料・心理） */
const CORE_PHRASES = {
  state: {
    en: "Stuck in the 'just watching' loop with unrealized loss? Many are. The way out is a framework.",
    ja: "含み損で『見るだけ』ループ？多くの人がハマる。抜け道は枠組みだけ。"
  },
  price: {
    en: "0.2% of a $50k loss = your defense framework. One miss = $10k. $99 = defense.",
    ja: "$50k損の0.2%で判断枠組み。1回のミス=$10k損失 vs $99防御。"
  },
  minimalToRegular: {
    en: "Got gut vs data from Minimal? Regular = 15min Alerts + Exit Map. No more missed windows.",
    ja: "Minimalでgut vs data知った？Regularで15分Alert+Exit Map=見逃しゼロ。"
  },
  psych: {
    en: "Score 25/100? Wait. Don't revenge-trade.",
    ja: "スコア25/100で待て。復讐トレードの罠を避けろ。"
  },
  trial: {
    en: "1-day trial. See the report. Cancel if it's not for you. Risk zero.",
    ja: "1日トライアル。レポートを見て、合わなければ即解約。リスクゼロ。"
  }
};

/** 狙い打つターゲット優先順位（Grok: 痛みピーク・即決ミレニアルを最優先） */
const SEGMENT_PRIORITY = [
  {
    id: "pain-peak-millennial",
    nameEn: "Pain-peak instant-decision Millennial",
    nameJa: "痛みピーク・即決ミレニアル",
    cvRateTarget: "20%",
    plan: "月額$99トライアル起点",
    who: "28-35歳、含み損$30k-$80k、XトレードTL、過去勝ち依存"
  },
  {
    id: "z-recovery",
    nameEn: "Z-gen first-dependence recovery",
    nameJa: "Z世代・初依存回復組",
    cvRateTarget: "15%",
    plan: "年額$845移行率高",
    who: "22-27歳、含み損$10k-$30k、Discord連動、サブスク経験豊富"
  },
  {
    id: "x-gen-migration",
    nameEn: "X-gen migration",
    nameJa: "X世代移行組",
    cvRateTarget: "8%",
    plan: "3ヶ月$237安定",
    who: "36-42歳、含み損$50k超、X新規ヘビー、導線シンプル時のみ"
  }
];

/** 除外条件（Grok & Gemini 共通: 狙わない層） */
const EXCLUDE_TARGETS = [
  "損失小($10k未満): 様子見離脱",
  "プロ/ルール保有者: 無料版で満足",
  "X非ユーザー/40代超: Whop摩擦大",
  "希望依存過多: 「必ず戻る」のみRT層",
  "Moon Boys: 防御・待機の価値理解せず",
  "資金枯渇層: $99払うと生活支障"
];

/** KPI 簡易版（Grok: 計測して検証） */
const KPI_TARGETS = {
  x: { impressionsPerWeek: 100000, optInRatePercent: 5 },
  whop: { cvRatePercent: 2, ltvUsd: 500 },
  note: "施策ごとのCV率はGrokの数字をベースに計測して検証"
};

/** 価格の語り方（両モデル一致） */
const PRICE_FRAMING = {
  monthly: "$99/月 = 含み損の0.2–0.5%。1日トライアルでリスクゼロ。",
  quarterly: "3ヶ月$237（20% off）= 月$79。矯正プログラム。",
  yearly: "年額$845（29% off）= 月$70。コーヒー1杯分で24時間監視。"
};

/** メッセージトーン（責めない＋希望の売りすぎしない） */
const TONE = "共感80% + ロジック20%。「君だけじゃない。枠組みで抜けろ」";

/**
 * Grok/Gemini プロンプトに注入するペルソナ文脈（CVR・LTV 最大化の SSOT）
 * 引用リポスト・コンテンツ最適化の生成文をペルソナに縛る
 * @returns {string} EN でプロンプト用 1 ブロック
 */
function getPersonaPromptContext() {
  const segmentOneLiner = SEGMENT_PRIORITY.slice(0, 2)
    .map((s) => `${s.nameEn} (${s.who})`)
    .join("; ");
  return (
    `PERSONA-DRIVEN (CVR/LTV): Strategy theme: "${STRATEGY_THEME_EN}". ` +
    `Core hooks: state="${CORE_PHRASES.state.en}"; price="${CORE_PHRASES.price.en}"; trial="${CORE_PHRASES.trial.en}". ` +
    `Price framing: ${PRICE_FRAMING.monthly} ` +
    `Tone: ${TONE} ` +
    `Target first: ${segmentOneLiner}. ` +
    `Every post must align with this persona; use these phrases or close variants to maximize CVR and LTV.`
  );
}

module.exports = {
  STRATEGY_THEME_EN,
  STRATEGY_THEME_JA,
  CORE_PHRASES,
  SEGMENT_PRIORITY,
  EXCLUDE_TARGETS,
  KPI_TARGETS,
  PRICE_FRAMING,
  TONE,
  getPersonaPromptContext
};
