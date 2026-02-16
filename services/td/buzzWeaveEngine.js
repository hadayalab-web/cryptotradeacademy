/**
 * TD BuzzWeave Engine — 引用リポスト最適化エンジン
 * 北極星: 100成約/日（KPI）。ここからすべて逆算。高インプレ・高エンゲ・高CVRは成約への経路指標。
 * フロー: Search → バズ抽出 → Fisherman スロット → テンプレ（buildPqt）→ 引用リポスト。旧 GPT 寄生コピー経路は廃止。
 */
const { loadEnv } = require("../../utils/loadEnv");
const { getKV } = require("../../utils/kv");
loadEnv();

const {
  searchPostsRecent,
  getUserByUsername,
  getUserTweets,
  postQuoteTweet: postQuoteTweetDefault,
  postTweet,
  replyToTweet
} = require("../x/client");
const { pickVidalyticsLink } = require("../../config/buzzweaveLinks");
const { sortSlotsByWeight } = require("../scheduler/peakClusterScheduler");
const { buildBestSlot } = require("./autonomousSlotGenerator");
const {
  getTdInfluencers,
  getTdOfficialAccounts,
  getTdEmotionDictionary,
  insertTdPostSlots,
  getTdPostSlotsInNextHour,
  consumeTdPostSlot,
  deferTdPostSlot,
  cleanupOldTdPostSlots,
  insertTdCopyArchive,
  insertTdCopyMeta,
  inferCopyMeta,
  insertXPost,
  getQuotedTweetIdsInLast30Days,
  insertQuotedTweets,
  insertBuzzweavePostLog,
  getBuzzweaveRecentPostStats
} = require("../../utils/supabase");
const { buildStructuredPostFromSlot } = require("../textgen/buildStructuredPost");
const { getBtcSnapshot } = require("../market/getBtcSnapshot");
const { selectFishermanSlotsTopPercent, selectSlotsFallback } = require("./fishermanDetector");
const { quoteTargetQualityScore, selectByQualityScore, filterCandidatesByImpressionPotential } = require("./quoteTargetQuality");
const { buildPqt, recordPqtUse } = require("./pqtCtaEngine");
const { buildProofSnippetFromSnapshot } = require("./pqtProofSnippet");
const { allocatePqtPerLanguageFromSchedule } = require("./pqtPlanner");
const { GLOBAL_LIMITS } = require("./mlPqtScheduleConfig");
const { orderedCandidatesWithTier3Cap, orderCandidatesByPerformanceTiers } = require("./fishermanPriority");
const { scoreShiteshiCandidate } = require("./shiteshiScoring");
const { pickBestFunnelLink } = require("../links");


// バズ閾値（指示書準拠）
const BUZZ_THRESHOLD = { influencer: 200, official: 500 };

// 時間帯分布（JST）400枠/日
const SLOT_DISTRIBUTION_JST = [
  { start: 8, end: 11, count: 80 },
  { start: 12, end: 14, count: 54 },
  { start: 17, end: 20, count: 94 },
  { start: 21, end: 24, count: 120 },
  { start: 0, end: 2, count: 26 },
  { start: 2, end: 6, count: 6 },
  { start: 6, end: 8, count: 20 }
];
const DAILY_SLOT_COUNT = 400;
// 投稿したい時間帯だけスロットを生成（X API を叩く時間を絞る）。未設定なら全時間帯。例: "8,9,10,11,12,13,14,17,18,19,20,21,22,23"
const BUZZWEAVE_ACTIVE_HOURS_JST = (() => {
  const raw = process.env.BUZZWEAVE_ACTIVE_HOURS_JST;
  if (!raw || typeof raw !== "string") return null;
  const hours = raw
    .split(",")
    .map((h) => parseInt(h.trim(), 10))
    .filter((h) => Number.isFinite(h) && h >= 0 && h <= 23);
  return hours.length ? new Set(hours) : null;
})();
const DEFAULT_DEADLINE_MS = Number(process.env.BUZZWEAVE_DEADLINE_MS || 55000);
const BUZZWEAVE_MAX_TARGETS = Number(process.env.BUZZWEAVE_MAX_TARGETS || 12);
const BUZZWEAVE_GPT_CLASSIFY_TOP_N = Number(process.env.BUZZWEAVE_GPT_CLASSIFY_TOP_N || 10);
const BUZZWEAVE_ENOUGH_CANDIDATES = Number(process.env.BUZZWEAVE_ENOUGH_CANDIDATES || 24);
/** 引用リポストのターゲット候補としてスロット選定に渡す最大件数。従来は classifyTopN(10) で打ち切っており Fisherman の母数が常に10だった。50 に引き上げて意図どおり抽出させる。 */
const BUZZWEAVE_MAX_CANDIDATES = Math.max(10, Number(process.env.BUZZWEAVE_MAX_CANDIDATES || 50));
const CLEANUP_OLDER_THAN_HOURS = Number(process.env.BUZZWEAVE_SLOT_RETENTION_HOURS || 48);
const LOG_LEVEL = process.env.BUZZWEAVE_LOG_LEVEL || "info";
const LOG_MAX_PER_RUN = 5;
let runLogCount = 0;

const API_CALL_CAP = Number(process.env.BUZZWEAVE_API_CALL_CAP) || 100;
const PQT_ONLY_MODE = process.env.BUZZWEAVE_PQT_ONLY === "true" || process.env.BUZZWEAVE_PQT_ONLY === "1";
let runApiCallCount = 0;
const DYNAMIC_TARGET_ENABLED = process.env.BUZZWEAVE_DYNAMIC_TARGET !== "false" && process.env.BUZZWEAVE_DYNAMIC_TARGET !== "0";
const DAILY_CONVERSION_TARGET = Math.max(1, Number(process.env.BUZZWEAVE_DAILY_CONVERSION_TARGET || 100));
const BASE_POSTS_PER_CONVERSION = Math.max(1, Number(process.env.BUZZWEAVE_BASE_POSTS_PER_CONVERSION || 5));
const POSTS_PER_CONVERSION_MIN = Math.max(1, Number(process.env.BUZZWEAVE_POSTS_PER_CONVERSION_MIN || 2.5));
const POSTS_PER_CONVERSION_MAX = Math.max(POSTS_PER_CONVERSION_MIN, Number(process.env.BUZZWEAVE_POSTS_PER_CONVERSION_MAX || 12));
const DYNAMIC_LOOKBACK_DAYS = Math.max(1, Number(process.env.BUZZWEAVE_DYNAMIC_LOOKBACK_DAYS || 3));
const DYNAMIC_FULL_TRUST_CONVERSIONS = Math.max(1, Number(process.env.BUZZWEAVE_DYNAMIC_FULL_TRUST_CONVERSIONS || 20));
const RUNS_PER_DAY_FOR_TARGET = Math.max(1, Number(process.env.BUZZWEAVE_RUNS_PER_DAY_FOR_TARGET || 8));
const MAX_CAP_PER_RUN = Math.max(1, Number(process.env.BUZZWEAVE_MAX_CAP_PER_RUN || 200));
const MAX_CAP_PER_RUN_WARP = Math.max(MAX_CAP_PER_RUN, Number(process.env.BUZZWEAVE_MAX_CAP_PER_RUN_WARP || (MAX_CAP_PER_RUN * 2)));

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function countApiCall() {
  runApiCallCount += 1;
  if (runApiCallCount > API_CALL_CAP) {
    throw new Error("api_call_cap_exceeded");
  }
}

function logOnce(level, ...args) {
  runLogCount += 1;
  if (runLogCount <= LOG_MAX_PER_RUN) {
    const fn = level === "warn" ? console.warn : level === "error" ? console.error : console.log;
    fn("[BuzzWeave]", ...args);
  }
}

function logInfo(...args) {
  logOnce("info", ...args);
}
function logWarn(...args) {
  logOnce("warn", ...args);
}
function logError(...args) {
  logOnce("error", ...args);
}

function isDeadlineExceeded(startMs, deadlineMs) {
  return Date.now() - startMs > deadlineMs;
}

function deadlineSnapshot(startMs, deadlineMs) {
  return { elapsedMs: Date.now() - startMs, deadlineMs };
}

// 言語比率 EN 40%, ES 20%, PT/JA/KO/AR 各10%
const LANG_WEIGHTS = { en: 40, es: 20, pt: 10, ja: 10, ko: 10, ar: 10 };

// ターゲット比率 influencer 70%, official 20%, flexible 10%
const TARGET_WEIGHTS = { influencer: 70, official: 20, flexible: 10 };

// モード比率 regular 70%, minimal 30%
const MODE_WEIGHTS = { regular: 70, minimal: 30 };

/**
 * エンゲージメントスコア算出（指示書準拠）
 * score = likes + 2*retweets + 3*quotes + replies
 */
function calculateEngagementScore(metrics = {}) {
  const likes = Number(metrics.like_count) || 0;
  const retweets = Number(metrics.retweet_count) || 0;
  const quotes = Number(metrics.quote_count) || 0;
  const replies = Number(metrics.reply_count) || 0;
  return likes + 2 * retweets + 3 * quotes + replies;
}

/**
 * search/recent 用バズスコア（impressions + engagement 合成）
 */
function scorePostByMetrics(metrics = {}) {
  const impressions = Number(metrics.impression_count) || 0;
  const likes = Number(metrics.like_count) || 0;
  const retweets = Number(metrics.retweet_count) || 0;
  const quotes = Number(metrics.quote_count) || 0;
  const replies = Number(metrics.reply_count) || 0;
  return impressions * 1 + likes * 50 + retweets * 80 + quotes * 60 + replies * 40;
}

// 言語別キーワードセット（1-2 準拠：slot.lang に合わせたクエリ構築）
const SEARCH_KEYWORDS_BY_LANG = {
  en: ["bitcoin", "btc", "crypto", "halving", "spot etf", "all time high"],
  ja: ["ビットコイン", "BTC", "仮想通貨", "半減期", "ETF"],
  ko: ["비트코인", "BTC", "암호화폐", "반감기", "ETF"],
  es: ["bitcoin", "btc", "crypto", "etf", "halving"],
  pt: ["bitcoin", "btc", "crypto", "etf", "halving"],
  ar: [
    "bitcoin",
    "btc",
    "crypto",
    "بيتكوين",
    "البيتكوين",
    "كريبتو",
    "عملات رقمية",
    "عملات مشفرة",
    "تنصيف البيتكوين",
    "etf",
    "btc usd"
  ]
};
const SEARCH_WINDOW_MINUTES = Number(process.env.BUZZWEAVE_SEARCH_WINDOW_MIN || 30);
const DYNAMIC_MEDIAN_MULTIPLIER = Number(process.env.BUZZWEAVE_MEDIAN_MULTIPLIER || 1.2);
const SEARCH_QUERY_BUCKET_SIZE = Math.max(1, Number(process.env.BUZZWEAVE_QUERY_BUCKET_SIZE || 3));
const SEARCH_PAGES_PER_BUCKET = Math.max(1, Number(process.env.BUZZWEAVE_SEARCH_PAGES_PER_BUCKET || 3));
const SEARCH_QUERY_MAX_CHARS = Math.max(128, Number(process.env.BUZZWEAVE_SEARCH_QUERY_MAX_CHARS || 480));
const LOW_VOLUME_LANGS = new Set(
  String(process.env.BUZZWEAVE_LOW_VOLUME_LANGS || "ar,ko,ja")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
);
const LOW_VOLUME_WINDOW_MINUTES = Math.max(
  SEARCH_WINDOW_MINUTES,
  Number(process.env.BUZZWEAVE_LOW_VOLUME_SEARCH_WINDOW_MIN || 30)
);
const SEARCH_USE_MIN_OPERATORS = process.env.BUZZWEAVE_USE_MIN_OPERATORS === "true" || process.env.BUZZWEAVE_USE_MIN_OPERATORS === "1";
const SEARCH_MIN_FAVES = Math.max(0, Number(process.env.BUZZWEAVE_SEARCH_MIN_FAVES || 0));
const SEARCH_MIN_RETWEETS = Math.max(0, Number(process.env.BUZZWEAVE_SEARCH_MIN_RETWEETS || 0));
const SEARCH_MIN_REPLIES = Math.max(0, Number(process.env.BUZZWEAVE_SEARCH_MIN_REPLIES || 0));
const IMPRESSION_WEIGHT_VELOCITY = Number(process.env.BUZZWEAVE_IMPRESSION_W_VELOCITY || 0.4);
const IMPRESSION_WEIGHT_CONVERSATION = Number(process.env.BUZZWEAVE_IMPRESSION_W_CONVERSATION || 0.25);
const IMPRESSION_WEIGHT_REPOST = Number(process.env.BUZZWEAVE_IMPRESSION_W_REPOST || 0.2);
const IMPRESSION_WEIGHT_FRESHNESS = Number(process.env.BUZZWEAVE_IMPRESSION_W_FRESHNESS || 0.15);
const MAX_SLOTS_PER_AUTHOR = Math.max(1, Number(process.env.BUZZWEAVE_MAX_SLOTS_PER_AUTHOR || 1));
const MAX_CLUSTER_SHARE = Math.min(1, Math.max(0.2, Number(process.env.BUZZWEAVE_MAX_CLUSTER_SHARE || 0.4)));

function chunkArray(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function buildSearchMetricOperators() {
  if (!SEARCH_USE_MIN_OPERATORS) return [];
  const ops = [];
  if (SEARCH_MIN_FAVES > 0) ops.push(`min_faves:${SEARCH_MIN_FAVES}`);
  if (SEARCH_MIN_RETWEETS > 0) ops.push(`min_retweets:${SEARCH_MIN_RETWEETS}`);
  if (SEARCH_MIN_REPLIES > 0) ops.push(`min_replies:${SEARCH_MIN_REPLIES}`);
  return ops;
}

function buildSearchQueries(lang) {
  const kw = SEARCH_KEYWORDS_BY_LANG[lang] || SEARCH_KEYWORDS_BY_LANG.en;
  const metricOps = buildSearchMetricOperators();
  const suffixParts = [`lang:${lang}`, "-is:retweet", "-is:reply", ...metricOps];
  const suffix = suffixParts.join(" ");
  const buckets = chunkArray(kw, SEARCH_QUERY_BUCKET_SIZE);
  const queries = [];

  for (const bucket of buckets) {
    const terms = bucket.map((k) => (k.includes(" ") ? `"${k}"` : k));
    while (terms.length > 0) {
      const query = `(${terms.join(" OR ")}) ${suffix}`.trim();
      if (query.length <= SEARCH_QUERY_MAX_CHARS) {
        queries.push(query);
        break;
      }
      terms.pop();
    }
  }

  if (!queries.length) {
    queries.push(`bitcoin ${suffix}`.trim());
  }
  return Array.from(new Set(queries));
}

function normalizeTextForDedup(text = "") {
  return String(text)
    .toLowerCase()
    .replace(/https?:\/\/[^\s]+/gi, "")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function computeFreshnessScore(ageSec) {
  if (!Number.isFinite(ageSec) || ageSec <= 0) return 0;
  // 2〜7分窓の中心（約4分）に近いほど高スコア
  const center = 240;
  const halfRange = 180;
  return clamp(1 - Math.abs(ageSec - center) / halfRange, 0, 1);
}

function computeImpressionScore(candidate, clusterScores, nowMs = Date.now()) {
  const metrics = candidate?.post?.public_metrics || {};
  const replies = Number(metrics.reply_count) || 0;
  const retweets = Number(metrics.retweet_count) || 0;
  const quotes = Number(metrics.quote_count) || 0;
  const likes = Number(metrics.like_count) || 0;
  const engagementBase = Math.max(1, replies + retweets + quotes + likes);
  const createdMs = candidate?.post?.created_at ? new Date(candidate.post.created_at).getTime() : 0;
  const ageSec = createdMs > 0 ? Math.max(1, (nowMs - createdMs) / 1000) : 999999;
  const ageMin = Math.max(1, ageSec / 60);

  const velocityRaw = (candidate?.engagementScore || 0) / ageMin;
  const velocityNorm = clamp(Math.log10(1 + velocityRaw) / 3, 0, 1);
  const conversationNorm = clamp(replies / engagementBase, 0, 1);
  const repostNorm = clamp((retweets + quotes) / engagementBase, 0, 1);
  const freshnessNorm = computeFreshnessScore(ageSec);

  const clusterMax = Math.max(
    1,
    ...Object.values(clusterScores || {}).map((v) => Number(v) || 0)
  );
  const clusterNorm = clamp((Number(clusterScores?.[candidate?.cluster]) || 0) / clusterMax, 0, 1);
  const repostWithCluster = clamp(repostNorm * 0.7 + clusterNorm * 0.3, 0, 1);

  const weightSum =
    IMPRESSION_WEIGHT_VELOCITY +
    IMPRESSION_WEIGHT_CONVERSATION +
    IMPRESSION_WEIGHT_REPOST +
    IMPRESSION_WEIGHT_FRESHNESS;
  const normalizedWeightSum = weightSum > 0 ? weightSum : 1;
  const weighted =
    IMPRESSION_WEIGHT_VELOCITY * velocityNorm +
    IMPRESSION_WEIGHT_CONVERSATION * conversationNorm +
    IMPRESSION_WEIGHT_REPOST * repostWithCluster +
    IMPRESSION_WEIGHT_FRESHNESS * freshnessNorm;

  return Number((weighted / normalizedWeightSum).toFixed(6));
}

// 話題クラスタ（2-1 準拠）：キーワードヒューリスティックで分類
const CLUSTER_KEYWORDS = {
  etf: ["etf", "spot etf", "btc etf", "approval", "承認", "ETF"],
  price_surge: ["ath", "all time high", "pump", "breakout", "moon", "新高", "急騰", "반등", "상승"],
  fud: ["dump", "crash", "fear", "bearish", "sell", "暴落", "下落", "공포", "매도"],
  regulation: ["regulation", "sec", "ban", "legal", "規制", "법규"],
  meme: ["meme", "doge", "lol", "ミーム", "개미"]
};

function classifyCluster(text = "") {
  const t = String(text).toLowerCase();
  for (const [cluster, kws] of Object.entries(CLUSTER_KEYWORDS)) {
    if (kws.some((k) => t.includes(k.toLowerCase()))) return cluster;
  }
  return "other";
}

// トレンド危険度分類（クジラのカモ救済ミッション準拠）
const DANGER_WHALE_TRAP_KEYWORDS = [
  "今すぐ", "乗り遅れるな", "簡単に", "誰でも", "100x", "1000x", "レバレッジ", "leverage",
  "moon", "pump", "lambo", "get rich", "easy money", "free money", "guaranteed",
  "上がるしかない", "下がるしかない", "絶対", "確実", "儲かる", "必ず",
  "last chance", "don't miss", "easy win", "no risk", "risk-free"
];
const DANGER_EDUCATIONAL_KEYWORDS = [
  "リスク", "注意", "慎重に", "危険", "騙され", "怪しい", "気をつけ",
  "risk", "caution", "warning", "beware", "scam", "rug", "dyor",
  "do your own research", "not financial advice", "nfа", "nfa"
];

function classifyDanger(text = "") {
  const t = String(text).toLowerCase();
  if (DANGER_EDUCATIONAL_KEYWORDS.some((k) => t.includes(k.toLowerCase()))) return "educational";
  if (DANGER_WHALE_TRAP_KEYWORDS.some((k) => t.includes(k.toLowerCase()))) return "whale_trap";
  return "neutral";
}

// 引用リポスト用・品質パターン（完全パターン化：GPTに頼らない）
const QUOTE_QUALITY_BLOCKLIST = [
  "follow me", "dm for", "link in bio", "click here", "airdrop", "free nft", "giveaway",
  "retweet to win", "like and follow", "comment below", "tag 3 friends",
  "subscribe to my", "check out my", "promo code", "discount code"
];
const MIN_POST_LENGTH = Number(process.env.BUZZWEAVE_MIN_POST_LENGTH || 20);
const MAX_URLS_IN_POST = Number(process.env.BUZZWEAVE_MAX_URLS_IN_POST || 2);
const MIN_REPLY_RETWEET_SUM = Math.max(0, Number(process.env.BUZZWEAVE_MIN_REPLY_RETWEET_SUM || 0));
const MIN_TOTAL_INTERACTIONS = Math.max(0, Number(process.env.BUZZWEAVE_MIN_TOTAL_INTERACTIONS || 0));

function passesQuoteQualityPattern(post) {
  const text = String(post?.text || "").trim();
  if (text.length < MIN_POST_LENGTH) return false;
  const urlCount = (text.match(/https?:\/\/[^\s]+/gi) || []).length;
  if (urlCount > MAX_URLS_IN_POST) return false;
  const lower = text.toLowerCase();
  if (QUOTE_QUALITY_BLOCKLIST.some((k) => lower.includes(k))) return false;
  return true;
}

/**
 * dangerLabel から usedMode を解決（投稿モード分岐）
 */
function resolveUsedMode(dangerLabel) {
  if (dangerLabel === "whale_trap") return "trap_defence_warning";
  if (dangerLabel === "educational") return "educational_boost";
  return "neutral_insight";
}

// 3-1 準拠：buzz要約・市場心理・Trap Defence洞察（ヒューリスティック・deadlineフレンドリー）
const CLUSTER_PSYCH_BY_LANG = {
  en: {
    etf: "Institutional flow driving sentiment.",
    price_surge: "FOMO and momentum chasing.",
    fud: "Fear selling pressure.",
    regulation: "Policy uncertainty.",
    meme: "Community hype.",
    other: "Crypto volatility sentiment."
  },
  ja: { etf: "機関投資家の資金流入がセンチメントを牽引。", price_surge: "FOMOによるモメンタム追い。", fud: "恐怖の売り圧力。", regulation: "政策不透明感。", meme: "コミュニティの盛り上がり。", other: "ボラティリティへの反応。" },
  ko: { etf: "기관 유입이 심리를 이끔.", price_surge: "FOMO 모멘텀 추격.", fud: "공포 매도 압력.", regulation: "정책 불확실성.", meme: "커뮤니티 열기.", other: "변동성에 대한 반응." }
};

const TRAP_DEFENCE_INSIGHT_BY_LANG = {
  ja: "ボラティリティ＝罠の機会。防御マインドが必須。",
  ko: "변동성은 함정의 기회. 방어 마인드셋 필수.",
  en: "Volatility creates trap opportunities; defence mindset essential."
};

// 危険度別のミッション情報（クジラのカモ救済用）
const DANGER_INSIGHTS_BY_LANG = {
  en: {
    whale_trap: {
      dangerWhyRetail: "Retail FOMO into one-sided narrative without risk disclosure.",
      whaleTrapHow: "Whales create pump/dump via coordinated flow; retail chases without structure.",
      doNotDoActions: "Do NOT FOMO buy at highs, leverage without hedge, or copy-paste without DYOR."
    },
    neutral: {
      dangerWhyRetail: "News/info without clear risk context.",
      whaleTrapHow: "Neutral; no explicit trap structure.",
      doNotDoActions: "Do NOT act on headlines alone."
    },
    educational: {
      dangerWhyRetail: "Original post already educational.",
      whaleTrapHow: "N/A – reinforcing awareness.",
      doNotDoActions: "Do NOT ignore risk disclosures in original."
    }
  },
  ja: {
    whale_trap: {
      dangerWhyRetail: "一方向の煽りでリスク説明がなく個人トレーダーがカモにされやすい。",
      whaleTrapHow: "クジラが流動性で上げ下げし、素人が追従する構造。",
      doNotDoActions: "高値でFOMO買い、レバレッジ無防備、DYORなしでコピペするな。"
    },
    neutral: { dangerWhyRetail: "ニュース中心でリスク文脈が不明瞭。", whaleTrapHow: "明確な罠構造なし。", doNotDoActions: "見出しだけで行動するな。" },
    educational: { dangerWhyRetail: "元投稿はすでに教育的。", whaleTrapHow: "注意喚起を強化。", doNotDoActions: "元投稿のリスク開示を無視するな。" }
  },
  ko: {
    whale_trap: {
      dangerWhyRetail: "일방적 선동에 리스크 설명 없이 개인 트레이더가 희생되기 쉬움.",
      whaleTrapHow: "고래가 유동성으로 급등락, 개미가 추종하는 구조.",
      doNotDoActions: "고점 FOMO 매수, 레버리지 방비 없음, DYOR 없이 복붙 금지."
    },
    neutral: { dangerWhyRetail: "뉴스 중심, 리스크 문맥 불명확.", whaleTrapHow: "명시적 함정 구조 없음.", doNotDoActions: "헤드라인만으로 행동 금지." },
    educational: { dangerWhyRetail: "원글은 이미 교육적.", whaleTrapHow: "인지 강화.", doNotDoActions: "원글 리스크 고지 무시 금지." }
  }
};

function buildBuzzInsights(candidate, slotLang = "en") {
  const cluster = candidate?.cluster || "other";
  const dangerLabel = candidate?.dangerLabel || "neutral";
  const lang = ["en", "ja", "ko"].includes(slotLang) ? slotLang : "en";
  const psychMap = CLUSTER_PSYCH_BY_LANG[lang] || CLUSTER_PSYCH_BY_LANG.en;
  const dangerMap = DANGER_INSIGHTS_BY_LANG[lang] || DANGER_INSIGHTS_BY_LANG.en;
  const dangerIns = dangerMap[dangerLabel] || dangerMap.neutral;
  const buzzSummary = lang === "ja" ? "高エンゲージメント投稿（" + cluster + "系）" : lang === "ko" ? "고참여도 게시물 (" + cluster + " 클러스터)" : "High-engagement post (" + cluster + " cluster)";
  const clusterPsych = psychMap[cluster] || psychMap.other;
  const trapDefenceInsight = TRAP_DEFENCE_INSIGHT_BY_LANG[lang] || TRAP_DEFENCE_INSIGHT_BY_LANG.en;
  return {
    buzzSummary,
    clusterPsych,
    trapDefenceInsight,
    dangerWhyRetail: dangerIns.dangerWhyRetail,
    whaleTrapHow: dangerIns.whaleTrapHow,
    doNotDoActions: dangerIns.doNotDoActions,
    dangerLabel,
    usedMode: resolveUsedMode(dangerLabel)
  };
}

/**
 * ターゲットの直近投稿を取得
 */
async function fetchRecentPostsFromX(handle, options = {}) {
  const limit = options.limit || 5;
  try {
    const user = await getUserByUsername(handle.replace(/^@/, ""));
    const userId = user?.id;
    if (!userId) return [];
    const { data } = await getUserTweets(userId, { maxResults: limit });
    return Array.isArray(data) ? data : [];
  } catch (e) {
    logWarn("fetchRecentPostsFromX error:", handle, e.message);
    return [];
  }
}

/**
 * 400枠/日のスロットを生成（JST 時間帯分布）
 */
function generateSlotsForDay(date = new Date()) {
  const slots = [];
  const base = new Date(date);
  base.setUTCHours(0, 0, 0, 0);

  const langs = ["en", "es", "pt", "ja", "ko", "ar"];
  const targets = ["influencer", "official", "flexible"];
  // CVR要件を満たすため mode は日次固定配分にする（regular 70% / minimal 30%）
  const modeSequence = buildWeightedSequence(DAILY_SLOT_COUNT, MODE_WEIGHTS);
  let modeIndex = 0;

  for (const range of SLOT_DISTRIBUTION_JST) {
    const count = range.count;
    const startH = range.start;
    const endH = range.end === 0 ? 24 : range.end;

    for (let i = 0; i < count; i++) {
      const lang = weightedRandom(langs, LANG_WEIGHTS);
      const target = weightedRandom(targets, TARGET_WEIGHTS);
      const mode = modeSequence[modeIndex] || "regular";
      modeIndex++;

      const hour = startH + Math.random() * (endH - startH);
      const hourJst = Math.floor(hour);
      // 投稿したい時間帯だけスロットを生成（BUZZWEAVE_ACTIVE_HOURS_JST 未設定の場合は従来どおり全時間帯）
      if (BUZZWEAVE_ACTIVE_HOURS_JST && !BUZZWEAVE_ACTIVE_HOURS_JST.has(hourJst)) continue;

      const slotDate = new Date(base);
      slotDate.setUTCHours(hourJst - 9, Math.floor(Math.random() * 60), 0, 0);

      slots.push({
        datetime_jst: slotDate.toISOString(),
        lang,
        target_type: target,
        mode
      });
    }
  }

  return slots.slice(0, DAILY_SLOT_COUNT);
}

function buildWeightedSequence(total, weights) {
  const keys = Object.keys(weights);
  const weightSum = keys.reduce((sum, k) => sum + (weights[k] || 0), 0);
  if (!weightSum || total <= 0) return [];
  const raw = keys.map((k) => ({
    key: k,
    exact: (total * (weights[k] || 0)) / weightSum
  }));
  const baseCounts = raw.map((r) => ({ ...r, count: Math.floor(r.exact), rem: r.exact % 1 }));
  let assigned = baseCounts.reduce((s, r) => s + r.count, 0);
  const left = total - assigned;
  baseCounts.sort((a, b) => b.rem - a.rem);
  for (let i = 0; i < left; i++) {
    baseCounts[i % baseCounts.length].count += 1;
    assigned += 1;
  }
  const sequence = [];
  for (const row of baseCounts) {
    for (let i = 0; i < row.count; i++) sequence.push(row.key);
  }
  // 均一化のため軽くシャッフル
  for (let i = sequence.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [sequence[i], sequence[j]] = [sequence[j], sequence[i]];
  }
  return sequence;
}

function weightedRandom(items, weights) {
  const total = items.reduce((s, k) => s + (weights[k] || 0), 0);
  let r = Math.random() * total;
  for (const k of items) {
    r -= weights[k] || 0;
    if (r <= 0) return k;
  }
  return items[items.length - 1];
}

/**
 * 古いスロット削除（定期メンテ）
 */
async function cleanupOldSlots(olderThanHours = CLEANUP_OLDER_THAN_HOURS) {
  return cleanupOldTdPostSlots(olderThanHours);
}

/**
 * バズ候補をスロットに最適マッピング（2-3 準拠：clusterScore優先・null禁止）
 * 優先順位: ①clusterScore最大クラスタ内でscore最大 → ②lang一致 → ③en → ④全候補最大
 */
function pickBestBuzzCandidate(buzzCandidates, slot, clusterScores = {}) {
  if (!buzzCandidates?.length) return null;

  const slotLang = slot?.lang || "en";
  const candTargetType = (c) => c.target?.target_type || c.target_type;
  const targetMatch = (c) => {
    const ct = candTargetType(c);
    return slot.target_type === "flexible" || ct === slot.target_type || ct === "flexible";
  };

  let pool = buzzCandidates.filter((c) => targetMatch(c));
  if (!pool.length) pool = buzzCandidates;

  const langMatch = (c) => (c.context?.lang || c.target?.lang) === slotLang;
  const langEn = (c) => (c.context?.lang || c.target?.lang) === "en";
  const topicGood = (c) => ["crypto", "finance", "ai"].includes(c.context?.topic);

  const scored = (arr) =>
    arr
      .map((c) => {
        let s = c.engagementScore || 0;
        if (topicGood(c)) s *= 1.3;
        return { ...c, matchScore: s };
      })
      .sort((a, b) => b.matchScore - a.matchScore);

  // ① clusterScore 最大クラスタの中で score 最大
  const maxCluster = Object.entries(clusterScores).sort((a, b) => b[1] - a[1])[0]?.[0];
  if (maxCluster) {
    const inCluster = pool.filter((c) => c.cluster === maxCluster);
    if (inCluster.length) {
      const byLang = inCluster.filter(langMatch);
      const byEn = inCluster.filter(langEn);
      const best = scored(byLang.length ? byLang : byEn.length ? byEn : inCluster)[0];
      logInfo("candidate selection", { slotLang, fallbackUsed: "cluster", cluster: maxCluster, clusterScore: clusterScores[maxCluster] });
      return best;
    }
  }

  // ② candidate.lang === slot.lang
  const exact = pool.filter(langMatch);
  if (exact.length) {
    const best = scored(exact)[0];
    logInfo("candidate selection", { slotLang, fallbackUsed: "exact" });
    return best;
  }

  // ③ candidate.lang === "en"
  const enCandidates = pool.filter(langEn);
  if (enCandidates.length) {
    const best = scored(enCandidates)[0];
    logInfo("candidate selection", { slotLang, fallbackUsed: "en" });
    return best;
  }

  // ④ 全候補からスコア最大（null 禁止）
  const best = scored(pool)[0];
  logInfo("candidate selection", { slotLang, fallbackUsed: "any" });
  return best;
}

/**
 * search/recent でトレンド投稿を取得（1-1 準拠：直近1〜5分・recency・50件）
 * 402 発生時は即停止・再試行なし。fatal402 を返して run 全体を即 return する。
 */
async function fetchCandidatesFromSearch(slotLang, options = {}) {
  const now = Date.now();
  const windowMin = Math.max(1, Number(options.windowMinutes ?? SEARCH_WINDOW_MINUTES));
  const queries = Array.isArray(options.queries) && options.queries.length
    ? options.queries
    : buildSearchQueries(slotLang);
  const pagesPerBucket = Math.max(1, Number(options.pagesPerBucket || SEARCH_PAGES_PER_BUCKET));
  const maxResults = Math.min(100, Math.max(10, Number(options.maxResults || 50)));
  const sortOrder = options.sortOrder || "recency";

  async function runSearchPass(currentWindowMin) {
    // X API: end_time は十分マージンを取る（clock skew / 端数秒対策）
    const endTime = new Date(now - 30 * 1000);
    const startTime = new Date(now - currentWindowMin * 60 * 1000);
    const allPosts = [];
    const usersById = {};
    const queryStats = [];

    for (const query of queries) {
      let nextToken = null;
      let pagesFetched = 0;
      while (pagesFetched < pagesPerBucket) {
        try {
          countApiCall();
          const res = await searchPostsRecent(query, {
            maxResults,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            sortOrder,
            nextToken
          });
          const pageData = Array.isArray(res?.data) ? res.data : [];
          allPosts.push(...pageData);
          for (const u of (res?.includes?.users || [])) {
            if (u?.id) usersById[u.id] = u;
          }
          pagesFetched += 1;
          nextToken = res?.meta?.next_token || null;
          if (!nextToken) break;
        } catch (e) {
          const msg = String(e?.message || "");
          const statusMatch = msg.match(/X API Error: (\d+)/);
          const status = statusMatch ? statusMatch[1] : null;
          const is402 = msg.includes("402");
          if (is402) {
            console.warn("[BuzzWeave] search/recent 402 (Payment Required)", { slotLang });
            logError("fetchCandidatesFromSearch 402: run aborted", slotLang);
            return { fatal402: true, data: [], usersById: {}, queryStats };
          }
          console.warn("[BuzzWeave] search/recent error", {
            slotLang,
            status,
            message: msg.slice(0, 200),
            query: query.slice(0, 80)
          });
          logWarn("fetchCandidatesFromSearch error:", slotLang, e.message);
          break;
        }
      }
      queryStats.push({ query: query.slice(0, 80), pagesFetched });
    }

    const dedupMap = new Map();
    for (const post of allPosts) {
      if (post?.id && !dedupMap.has(post.id)) dedupMap.set(post.id, post);
    }
    return {
      fatal402: false,
      data: Array.from(dedupMap.values()),
      usersById,
      queryStats
    };
  }

  const slotLangKey = String(slotLang || "").toLowerCase();
  const allowLowVolumeBackfill = options.enableLowVolumeBackfill !== false;
  const windowsToTry = [windowMin];
  if (
    allowLowVolumeBackfill &&
    LOW_VOLUME_LANGS.has(slotLangKey) &&
    windowMin < LOW_VOLUME_WINDOW_MINUTES
  ) {
    windowsToTry.push(LOW_VOLUME_WINDOW_MINUTES);
  }

  let passResult = null;
  let usedWindowMinutes = windowMin;
  for (const win of windowsToTry) {
    usedWindowMinutes = win;
    passResult = await runSearchPass(win);
    if (passResult?.fatal402) {
      return {
        data: [],
        includes: {},
        queries,
        slotLang,
        fatal402: true,
        windowMinutesUsed: win
      };
    }
    if ((passResult?.data || []).length > 0) break;
  }

  const data = passResult?.data || [];
  const usersById = passResult?.usersById || {};
  const queryStats = passResult?.queryStats || [];
  const lowVolumeBackfillUsed =
    windowsToTry.length > 1 && usedWindowMinutes !== windowsToTry[0];

  console.log(
    "[BuzzWeave] BWE SCAN: X API accessed OK, posts fetched:",
    data.length,
    "| lang:",
    slotLang,
    "| queries:",
    queries.length,
    "| pages/bucket:",
    pagesPerBucket,
    "| window_min:",
    usedWindowMinutes
  );
  return {
    data,
    includes: { users: Object.values(usersById) },
    queries,
    queryStats,
    slotLang,
    windowMinutesUsed: usedWindowMinutes,
    lowVolumeBackfillUsed
  };
}

/**
 * クラスタの集中投下スコア（2-2 準拠）
 * clusterScore = (cluster内投稿数*1000) + (最大スコア*1.5) + (直近投稿の新しさ*係数)
 */
function computeClusterScore(clusterPosts, nowMs = Date.now()) {
  if (!clusterPosts?.length) return 0;
  const scores = clusterPosts.map((c) => c.engagementScore || 0);
  const maxScore = Math.max(...scores);
  const newest = clusterPosts.reduce((acc, c) => {
    const at = c.post?.created_at ? new Date(c.post.created_at).getTime() : 0;
    return at > acc ? at : acc;
  }, 0);
  const recencySec = (nowMs - newest) / 1000;
  const recencyFactor = Math.max(0, 300 - recencySec) * 2; // 5分以内ほど高スコア
  return clusterPosts.length * 1000 + maxScore * 1.5 + recencyFactor;
}

/**
 * バズ候補を収集（1-1〜2-2 準拠：search/recent・動的中央値・クラスタリング）
 */
async function collectBuzzCandidates(options = {}) {
  const startMs = Number(options.startMs || Date.now());
  const deadlineMs = Number(options.deadlineMs || DEFAULT_DEADLINE_MS);
  const classifyTopN = Number(options.classifyTopN || BUZZWEAVE_GPT_CLASSIFY_TOP_N);
  const maxCandidates = Number(options.maxCandidates || BUZZWEAVE_MAX_CANDIDATES);
  const slotLang = options.slotLang || "en";
  const candidates = [];
  const rawCandidates = [];
  let clusters = {};
  let clusterScores = {};

  if (isDeadlineExceeded(startMs, deadlineMs)) {
    console.log("[BuzzWeave] BWE SCAN: deadline exceeded before search, posts_fetched=0");
    logWarn("deadline exceeded", { stage: "before-search", ...deadlineSnapshot(startMs, deadlineMs) });
    return { candidates, deadlineExceeded: true, clusters: {}, clusterScores: {}, postsFetched: 0 };
  }

  // 1-1: slot.lang に合わせたクエリで直近 window 分の投稿を取得（1言語のみ）
  const searchResult = await fetchCandidatesFromSearch(slotLang, {
    maxResults: 50,
    sortOrder: "recency",
    windowMinutes: SEARCH_WINDOW_MINUTES,
    pagesPerBucket: SEARCH_PAGES_PER_BUCKET
  });

  if (searchResult.fatal402) {
    console.log("[BuzzWeave] BWE SCAN: X API 402, run aborted");
    return { candidates: [], deadlineExceeded: false, clusters: {}, clusterScores: {}, fatal402: true, postsFetched: 0 };
  }

  const {
    data: posts,
    includes,
    queries,
    queryStats,
    windowMinutesUsed,
    lowVolumeBackfillUsed
  } = searchResult;

  if (isDeadlineExceeded(startMs, deadlineMs)) {
    console.log("[BuzzWeave] BWE SCAN: deadline exceeded after search, posts_fetched=" + posts.length);
    return { candidates, deadlineExceeded: true, clusters: {}, clusterScores: {}, postsFetched: posts.length };
  }

  if (!posts.length) {
    console.log("[BuzzWeave] BWE SCAN: 0 posts from search, no buzz candidates");
    logInfo("candidate summary (search/recent)", {
      rawCandidates: 0,
      candidates: 0,
      clusters: {},
      clusterScores: {},
      queries: Array.isArray(queries) ? queries.length : 0,
      queryStats: queryStats || [],
      windowMinutesUsed: windowMinutesUsed ?? SEARCH_WINDOW_MINUTES,
      lowVolumeBackfillUsed: !!lowVolumeBackfillUsed
    });
    return { candidates, deadlineExceeded: false, clusters: {}, clusterScores: {}, postsFetched: 0 };
  }

  const quotedIds = await getQuotedTweetIdsInLast30Days(posts.map((p) => String(p.id)));
  const usersById = (includes?.users || []).reduce((acc, u) => {
    acc[u.id] = u;
    return acc;
  }, {});

  const seenPostIds = new Set();
  const seenNormalizedTexts = new Set();
  for (const post of posts) {
    const postId = String(post?.id || "");
    if (!postId || seenPostIds.has(postId)) continue;
    seenPostIds.add(postId);
    if (quotedIds.has(String(post.id))) continue;
    if (!passesQuoteQualityPattern(post)) continue;
    const metrics = post.public_metrics || {};
    const replies = Number(metrics.reply_count) || 0;
    const retweets = Number(metrics.retweet_count) || 0;
    const likes = Number(metrics.like_count) || 0;
    const quotes = Number(metrics.quote_count) || 0;
    if (replies + retweets < MIN_REPLY_RETWEET_SUM) continue;
    if (likes + replies + retweets + quotes < MIN_TOTAL_INTERACTIONS) continue;
    const normalizedText = normalizeTextForDedup(post.text);
    if (normalizedText && seenNormalizedTexts.has(normalizedText)) continue;
    if (normalizedText) seenNormalizedTexts.add(normalizedText);
    const score = scorePostByMetrics(metrics);
    const user = post.author_id ? usersById[post.author_id] : null;
    const handle = user?.username || post.author_id || "unknown";
    rawCandidates.push({
      target: {
        handle: String(handle).replace(/^@/, ""),
        org_type: null,
        lang: post.lang || slotLang,
        target_type: "flexible",
        author: user ? { id: user.id, name: user.name, username: user.username, description: user.description, profile_image_url: user.profile_image_url, public_metrics: user.public_metrics } : null
      },
      post: { id: post.id, author_id: post.author_id || null, text: post.text, created_at: post.created_at, public_metrics: post.public_metrics || metrics },
      engagementScore: score
    });
  }

  // 1-3: 動的中央値フィルタ（score >= median * 1.2）
  const scores = rawCandidates.map((c) => c.engagementScore);
  const median = scores.length ? (() => { const s = [...scores].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; })() : 0;
  const threshold = Math.max(median * DYNAMIC_MEDIAN_MULTIPLIER, 500);
  let filteredByMedian = rawCandidates.filter((c) => c.engagementScore >= threshold);
  if (!filteredByMedian.length) filteredByMedian = rawCandidates.slice(0, 20);

  if (isDeadlineExceeded(startMs, deadlineMs)) {
    logWarn("deadline exceeded", { stage: "after-median-filter", ...deadlineSnapshot(startMs, deadlineMs) });
    const take = Math.min(filteredByMedian.length, maxCandidates);
    console.log("[BuzzWeave] BWE SCAN: deadline after median filter, posts_fetched=" + posts.length + " buzz_candidates=" + take);
    return { candidates: filteredByMedian.slice(0, take).map(c => ({ ...c, context: { topic: "crypto", tone: "neutral", lang: c.target?.lang || "en" }, cluster: classifyCluster(c.post?.text) })), deadlineExceeded: true, clusters: {}, clusterScores: {}, postsFetched: posts.length };
  }

  // 2-1: トレンドクラスタリング + 危険度分類
  for (const c of filteredByMedian) {
    const cluster = classifyCluster(c.post?.text);
    const dangerLabel = classifyDanger(c.post?.text);
    c.cluster = cluster;
    c.dangerLabel = dangerLabel;
    if (!clusters[cluster]) clusters[cluster] = [];
    clusters[cluster].push(c);
  }

  // 2-2: clusterScore 算出
  const nowMs = Date.now();
  for (const [cluster, items] of Object.entries(clusters)) {
    clusterScores[cluster] = computeClusterScore(items, nowMs);
  }
  for (const c of filteredByMedian) {
    c.clusterScore = clusterScores[c.cluster] || 0;
    c.impressionScore = computeImpressionScore(c, clusterScores, nowMs);
  }

  logInfo("clusterScore (search/recent)", clusterScores);

  const rankedByImpression = [...filteredByMedian].sort((a, b) => {
    const s = (b.impressionScore || 0) - (a.impressionScore || 0);
    if (s !== 0) return s;
    return (b.engagementScore || 0) - (a.engagementScore || 0);
  });
  // ターゲット抽出: 従来は classifyTopN(10) のみ渡しており Fisherman の母数が常に10だった。maxCandidates まで渡して意図どおり選定させる。
  const toClassify = rankedByImpression.slice(0, Math.max(1, Math.min(rankedByImpression.length, maxCandidates)));
  let deadlineExceeded = false;
  // 完全パターン化: GPT は使わず context は固定
  for (const c of toClassify) {
    candidates.push({ ...c, context: { topic: "crypto", tone: "neutral", lang: c.target?.lang || slotLang || "en" } });
  }

  candidates.sort((a, b) => {
    const s = (b.impressionScore || 0) - (a.impressionScore || 0);
    if (s !== 0) return s;
    return (b.engagementScore || 0) - (a.engagementScore || 0);
  });
  console.log("[BuzzWeave] BWE SCAN: posts_fetched=" + posts.length + " buzz_candidates=" + candidates.length + " (median_filtered=" + filteredByMedian.length + ")");
  logInfo("candidate summary (search/recent)", {
    rawCandidates: rawCandidates.length,
    filteredByMedian: filteredByMedian.length,
    candidates: candidates.length,
    topImpressionScore: candidates.length ? Number(candidates[0].impressionScore || 0).toFixed(4) : null,
    queries: Array.isArray(queries) ? queries.length : 0,
    queryStats: queryStats || [],
    windowMinutesUsed: windowMinutesUsed ?? SEARCH_WINDOW_MINUTES,
    lowVolumeBackfillUsed: !!lowVolumeBackfillUsed,
    clusterScores,
    deadlineExceeded
  });
  return { candidates, deadlineExceeded, clusters, clusterScores, postsFetched: posts.length };
}

/**
 * 自律投稿: スロット + テンプレートから本文を生成し、スタンドアロン投稿 + 自リプライ
 * AUTONOMOUS_SLOT_MODE 時に呼ばれる
 * v5.2: getBtcSnapshot で市場データ取得、pickBestFunnelLink で導線を自律選択
 */
async function buildAndPostFromSlot(slot, btcSnapshot, options = {}) {
  const { dryRun = true, postTweet: postFn = postTweet, replyToTweet: replyFn = replyToTweet } = options;

  // 市場スナップショット: btcSnapshot があれば優先、なければ getBtcSnapshot() で DB から取得
  let market_snapshot;
  if (btcSnapshot?.cqDeep || btcSnapshot?.raw || btcSnapshot?.trapDetection) {
    market_snapshot = {
      trapScore: btcSnapshot?.cqDeep?.trapScore ?? btcSnapshot?.trapDetection?.trapScore ?? btcSnapshot?.trap_score ?? "elevated",
      netflowState: btcSnapshot?.cqDeep?.raw?.netflow ?? btcSnapshot?.raw?.netflow ?? "absorption",
      whaleRatio: btcSnapshot?.cqDeep?.whaleRatio ?? btcSnapshot?.raw?.whale_ratio ?? "unknown",
      cvdState: btcSnapshot?.cqDeep?.cvdState ?? btcSnapshot?.raw?.cvd_state ?? "neutral",
      liquidationBias: btcSnapshot?.raw?.liquidation_bias ?? btcSnapshot?.raw?.bias ?? "neutral",
      fundingRate: btcSnapshot?.raw?.funding_state ?? "neutral",
      athLevel: btcSnapshot?.raw?.ath_level ?? "$69K–$72K",
      dogeMove: btcSnapshot?.raw?.doge_move ?? btcSnapshot?.raw?.dogeChange ?? "+12%",
      xrpMove: btcSnapshot?.raw?.xrp_move ?? btcSnapshot?.raw?.xrpChange ?? "+8%"
    };
  } else {
    market_snapshot = await getBtcSnapshot();
  }

  const { main_text, reply_text_1, reply_text_2, link } = await buildStructuredPostFromSlot(slot, market_snapshot);

  if (dryRun) {
    console.log("[BuzzWeave] buildAndPostFromSlot dryRun", { lang: slot.lang, narrative_tag: slot.narrative_tag, cta_type: slot.cta_type });
    return { ok: true, posted: 0, dryRun: true, autonomous: true, main_text: main_text?.slice(0, 200) + "...", runId: `bw-${Date.now()}` };
  }

  try {
    countApiCall();
    const result = await postFn(main_text);
    const postId = result?.id || null;
    if (!postId) throw new Error("postTweet returned no id");

    // X の安全性チェック: リンク入りを先に投稿すると通過率UP。失敗時は retry
    async function safeReply(text) {
      if (!text || typeof text !== "string") return false;
      countApiCall();
      try {
        await replyFn(text, postId);
        return true;
      } catch (e) {
        console.error("[BuzzWeave] reply failed, retry in 1.5s:", e?.message);
        await new Promise((r) => setTimeout(r, 1500));
        try {
          await replyFn(text, postId);
          return true;
        } catch (e2) {
          console.error("[BuzzWeave] reply retry failed:", e2?.message);
          return false;
        }
      }
    }

    let selfReplyCount = 0;
    if (reply_text_2?.trim()) {
      if (await safeReply(reply_text_2)) selfReplyCount++;
    }
    if (reply_text_1?.trim()) {
      if (await safeReply(reply_text_1)) selfReplyCount++;
    }

    const lang = slot.lang || "en";
    await consumeTdPostSlot(slot.id);
    await insertXPost({ lang, mode: "autonomous", body: main_text });
    await insertBuzzweavePostLog({
      slotLang: lang,
      clusterLabel: slot.cluster_id || "autonomous",
      clusterScore: 0,
      candidateTweetId: null,
      engagementScore: 0,
      postedAt: new Date().toISOString(),
      ourTweetId: postId,
      slotMode: "autonomous",
      buzzSummary: `autonomous ${slot.narrative_tag} / ${slot.cta_type}`,
      clusterPsych: null,
      trapDefenceInsight: reply_text_1?.slice(0, 100) || null,
      dangerLabel: slot.narrative_tag?.toLowerCase() || "autonomous",
      usedMode: "autonomous",
      funnelType: link?.type ?? null,
      funnelUrl: link?.url ?? null,
      narrativeTag: slot.narrative_tag ?? null,
      ctaType: slot.cta_type ?? null
    });

    console.log("[BuzzWeave] buildAndPostFromSlot success", { postId, lang, narrative_tag: slot.narrative_tag, cta_type: slot.cta_type, selfReplyCount });
    return { ok: true, posted: 1, autonomous: true, tweetId: postId, selfReplyCount, runId: `bw-${Date.now()}` };
  } catch (e) {
    console.error("[BuzzWeave] buildAndPostFromSlot error:", e?.message);
    const deferred = await deferTdPostSlot(slot.id, 180);
    return { ok: false, posted: 0, autonomous: true, error: e?.message, deferred: !!deferred.ok, runId: `bw-${Date.now()}` };
  }
}

function toUtcDateKey(daysAgo = 0) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().split("T")[0];
}

async function getRecentConversionsFromKv(lookbackDays = DYNAMIC_LOOKBACK_DAYS) {
  const kv = getKV();
  if (!kv) {
    return { available: false, source: "kv", lookbackDays, totalConversions: 0, byDay: [] };
  }
  try {
    const byDay = [];
    let totalConversions = 0;
    for (let i = 0; i < lookbackDays; i++) {
      const dateKey = toUtcDateKey(i);
      const [minimalRaw, regularRaw] = await Promise.all([
        kv.get(`conversion:minimal:${dateKey}:count`),
        kv.get(`conversion:regular:${dateKey}:count`)
      ]);
      const minimal = Number(minimalRaw) || 0;
      const regular = Number(regularRaw) || 0;
      const total = minimal + regular;
      byDay.push({ date: dateKey, minimal, regular, total });
      totalConversions += total;
    }
    return { available: true, source: "kv_webhook", lookbackDays, totalConversions, byDay };
  } catch (e) {
    logWarn("getRecentConversionsFromKv error:", e?.message);
    return { available: false, source: "kv", lookbackDays, totalConversions: 0, byDay: [] };
  }
}

async function resolveDailyPqtTarget() {
  const hardTarget = Number(process.env.BUZZWEAVE_DAILY_PQT_TARGET_HARD || 0);
  const legacyTarget = Number(process.env.BUZZWEAVE_DAILY_PQT_TARGET || 0);
  if (hardTarget > 0) {
    return {
      dailyTarget: Math.round(hardTarget),
      postsPerConversion: null,
      mode: "hard_override"
    };
  }

  if (!DYNAMIC_TARGET_ENABLED) {
    if (legacyTarget > 0) {
      return {
        dailyTarget: Math.round(legacyTarget),
        postsPerConversion: null,
        mode: "legacy_override"
      };
    }
    return {
      dailyTarget: Math.round(DAILY_CONVERSION_TARGET * BASE_POSTS_PER_CONVERSION),
      postsPerConversion: BASE_POSTS_PER_CONVERSION,
      mode: "dynamic_disabled_fallback"
    };
  }

  const lookbackHours = DYNAMIC_LOOKBACK_DAYS * 24;
  const [postStats, kvConversions] = await Promise.all([
    getBuzzweaveRecentPostStats(lookbackHours),
    getRecentConversionsFromKv(DYNAMIC_LOOKBACK_DAYS)
  ]);

  const posts = Number(postStats?.posts) || 0;
  const conversionsFromKv = Number(kvConversions?.totalConversions) || 0;
  const conversionsFromPostLog = Number(postStats?.subs) || 0;
  const observedConversions = conversionsFromKv > 0 ? conversionsFromKv : conversionsFromPostLog;
  const observedSource = conversionsFromKv > 0 ? "kv_webhook" : conversionsFromPostLog > 0 ? "post_log_subs" : "none";
  const observedPostsPerConversion = observedConversions > 0 && posts > 0 ? posts / observedConversions : null;

  let trust = 0;
  let effectivePostsPerConversion = BASE_POSTS_PER_CONVERSION;
  if (Number.isFinite(observedPostsPerConversion)) {
    trust = clamp(observedConversions / DYNAMIC_FULL_TRUST_CONVERSIONS, 0, 1);
    effectivePostsPerConversion =
      BASE_POSTS_PER_CONVERSION * (1 - trust) + observedPostsPerConversion * trust;
  }
  effectivePostsPerConversion = clamp(
    effectivePostsPerConversion,
    POSTS_PER_CONVERSION_MIN,
    POSTS_PER_CONVERSION_MAX
  );

  const kpiFloor = DAILY_CONVERSION_TARGET * BASE_POSTS_PER_CONVERSION;
  const rawTarget = Math.max(1, Math.round(DAILY_CONVERSION_TARGET * effectivePostsPerConversion));
  const dailyTarget = Math.min(GLOBAL_LIMITS.max_pqt_per_day, Math.max(rawTarget, kpiFloor));

  return {
    dailyTarget,
    postsPerConversion: Number(effectivePostsPerConversion.toFixed(2)),
    mode: "dynamic",
    observedPostsPerConversion: Number.isFinite(observedPostsPerConversion)
      ? Number(observedPostsPerConversion.toFixed(2))
      : null,
    observedConversions,
    observedPosts: posts,
    observedSource,
    lookbackDays: DYNAMIC_LOOKBACK_DAYS,
    trust: Number(trust.toFixed(2))
  };
}

function applyDiversityCaps(slots, opts = {}) {
  const list = Array.isArray(slots) ? slots : [];
  if (!list.length) return list;
  const maxPerAuthor = Math.max(1, Number(opts.maxPerAuthor || MAX_SLOTS_PER_AUTHOR));
  const maxClusterShare = clamp(Number(opts.maxClusterShare || MAX_CLUSTER_SHARE), 0.2, 1);
  const maxPerCluster = Math.max(1, Math.floor(list.length * maxClusterShare));
  const authorCounts = new Map();
  const clusterCounts = new Map();
  const filtered = [];

  for (const slot of list) {
    const authorKey = String(
      slot?.post?.author_id ||
      slot?.target?.handle ||
      slot?.post?.id ||
      "unknown"
    ).toLowerCase();
    const clusterKey = String(slot?.cluster || "other");
    const authorUsed = authorCounts.get(authorKey) || 0;
    const clusterUsed = clusterCounts.get(clusterKey) || 0;
    if (authorUsed >= maxPerAuthor) continue;
    if (clusterUsed >= maxPerCluster) continue;
    filtered.push(slot);
    authorCounts.set(authorKey, authorUsed + 1);
    clusterCounts.set(clusterKey, clusterUsed + 1);
  }

  // 制約が強すぎて空に近づくのを避ける
  if (filtered.length < Math.min(3, list.length)) {
    return list;
  }
  return filtered;
}

/**
 * PQT-ONLY 1サイクル: スロット不要。Fisherman 検出 → 上位 5〜10% → 4要素テンプレ → 引用投稿のみ。
 * 投稿数 = trapScore + Fisherman 活動量。API クレジットで cap。
 */
async function runBuzzWeaveCyclePqtOnly(options = {}) {
  runLogCount = 0;
  runApiCallCount = 0;
  const dryRun = options.dryRun !== false;
  const langFilter = options.langFilter || "en";
  const collectSamples = options.collectSamples === true || dryRun;
  const sampleLimit = Math.max(1, Number(options.sampleLimit || process.env.BUZZWEAVE_DRYRUN_SAMPLE_LIMIT || 8));
  const generatedSamples = [];
  const snapshot = options.btcSnapshot || (await getBtcSnapshot());
  try {
    const { collectPerformanceMetricsForSnapshot } = require("./mlPqtMetrics");
    snapshot.performanceMetrics = await collectPerformanceMetricsForSnapshot(new Date());
  } catch (_) {}
  const postQuoteTweet = options.postQuoteTweet || postQuoteTweetDefault;
  const startMs = Date.now();
  const runId = `bw-pqt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  logInfo("pqt-only cycle start", { runId, dryRun, langFilter });

  const collectResult = await collectBuzzCandidates({
    slotLang: langFilter,
    startMs,
    deadlineMs: DEFAULT_DEADLINE_MS,
    classifyTopN: BUZZWEAVE_GPT_CLASSIFY_TOP_N
  });
  if (collectResult.fatal402) {
    return { ok: false, message: "X API 402", posted: 0, runId, fatal402: true };
  }

  const candidates = collectResult.candidates || [];
  const perLang = allocatePqtPerLanguageFromSchedule(snapshot);
  let cap = Math.max(1, Math.min(perLang[langFilter] || API_CALL_CAP, API_CALL_CAP));
  const targetResolution = await resolveDailyPqtTarget();
  if (targetResolution?.dailyTarget > 0) {
    cap = Math.min(Math.ceil(targetResolution.dailyTarget / RUNS_PER_DAY_FOR_TARGET), MAX_CAP_PER_RUN);
  } else {
    const volumeMult = Math.min(10, Math.max(1, Number(process.env.BUZZWEAVE_VOLUME_MULTIPLIER) || 1));
    if (volumeMult > 1) cap = Math.min(Math.ceil(cap * volumeMult), MAX_CAP_PER_RUN);
  }
  logInfo("daily target resolved", {
    mode: targetResolution?.mode || "unknown",
    dailyTarget: targetResolution?.dailyTarget ?? null,
    postsPerConversion: targetResolution?.postsPerConversion ?? null,
    observedPostsPerConversion: targetResolution?.observedPostsPerConversion ?? null,
    observedConversions: targetResolution?.observedConversions ?? null,
    observedPosts: targetResolution?.observedPosts ?? null,
    observedSource: targetResolution?.observedSource ?? null,
    lookbackDays: targetResolution?.lookbackDays ?? null,
    trust: targetResolution?.trust ?? null,
    runsPerDayForTarget: RUNS_PER_DAY_FOR_TARGET,
    maxCapPerRun: MAX_CAP_PER_RUN,
    maxCapPerRunWarp: MAX_CAP_PER_RUN_WARP
  });
  const utcDay = new Date().getUTCDay();
  const isTueWedThu = utcDay >= 2 && utcDay <= 4;
  const weekdayWarp = process.env.BUZZWEAVE_WEEKDAY_WARP === "true" || process.env.BUZZWEAVE_WEEKDAY_WARP === "1";
  if (weekdayWarp && isTueWedThu) cap = Math.min(cap * 2, MAX_CAP_PER_RUN_WARP);
  const effectiveCap = cap;
  const FALLBACK_SLOT_COUNT = Math.max(3, Math.min(15, Number(process.env.BUZZWEAVE_FALLBACK_SLOT_COUNT || 10)));
  const useQualityScoreSelection = process.env.BUZZWEAVE_USE_QUALITY_SCORE_SELECTION === "true" || process.env.BUZZWEAVE_USE_QUALITY_SCORE_SELECTION === "1";
  const fallbackFillCap = process.env.BUZZWEAVE_FALLBACK_FILL_CAP === "true" || process.env.BUZZWEAVE_FALLBACK_FILL_CAP === "1";
  const volumeTopUp = process.env.BUZZWEAVE_VOLUME_TOPUP !== "false" && process.env.BUZZWEAVE_VOLUME_TOPUP !== "0";
  // 品質スコア選定時はインプレ足切りをデフォルト有効（BUZZWEAVE_IMPRESSION_FILTER=false で無効化可能）
  const impressionFilter = useQualityScoreSelection && (process.env.BUZZWEAVE_IMPRESSION_FILTER !== "false" && process.env.BUZZWEAVE_IMPRESSION_FILTER !== "0");

  // インプレが伸びる候補だけに絞る（品質スコア選定時・BUZZWEAVE_IMPRESSION_FILTER 有効時）
  let candidatesForSlots = candidates;
  if (useQualityScoreSelection && impressionFilter) {
    const minVelocity = Math.max(0, Number(process.env.BUZZWEAVE_MIN_VELOCITY || 0));
    const minTopicFit = Math.max(0, Math.min(1, Number(process.env.BUZZWEAVE_MIN_TOPIC_FIT || 0)));
    const minCopyFit = Math.max(0, Math.min(1, Number(process.env.BUZZWEAVE_MIN_COPY_FIT || 0)));
    const filtered = filterCandidatesByImpressionPotential(candidates, { minVelocity, minTopicFit, minCopyFit }, Date.now());
    candidatesForSlots = filtered.passed;
    if (filtered.dropped > 0) {
      logInfo("pqt impression filter applied", { before: candidates.length, after: filtered.passed.length, dropped: filtered.dropped, reasons: filtered.reasons, minVelocity, minTopicFit, minCopyFit });
    }
  }

  // 100成約/日がノルマ。仕手・提灯にこだわらず volume 確保。Fisherman 0 件時は fallback で投稿数を確保する。
  let slots;
  if (useQualityScoreSelection) {
    slots = selectByQualityScore(candidatesForSlots, cap, Date.now());
    logInfo("pqt slots by quality score", { count: slots.length, cap: effectiveCap, mode: "quality_score" });
  } else {
    slots = selectFishermanSlotsTopPercent(candidates, langFilter, { maxCount: cap });
    if (slots.length === 0) {
      const fallbackCount = fallbackFillCap ? effectiveCap : Math.min(FALLBACK_SLOT_COUNT, cap);
      slots = selectSlotsFallback(candidates, fallbackCount);
      logInfo("pqt slots fallback (Fisherman=0)", { count: slots.length, fallbackCount, fillCap: fallbackFillCap });
    }
  }

  // 検証に基づく volume トップアップ: slots が cap に満たず候補が余っていれば、engagement 降順で埋める（インプレ・成約の機会を増やす）。
  if (volumeTopUp && slots.length < effectiveCap && candidatesForSlots.length > slots.length) {
    const selectedIds = new Set(slots.map((s) => s?.post?.id ?? s?.id).filter(Boolean));
    const rest = candidatesForSlots.filter((c) => !selectedIds.has(c?.post?.id ?? c?.id));
    const need = effectiveCap - slots.length;
    if (rest.length > 0 && need > 0) {
      rest.sort((a, b) => (b.engagementScore ?? 0) - (a.engagementScore ?? 0));
      const topped = rest.slice(0, need);
      slots = slots.concat(topped);
      logInfo("pqt slots volume top-up", { added: topped.length, before: slots.length - topped.length, after: slots.length, cap: effectiveCap });
    }
  }

  const nowMs = Date.now();
  const WINDOW_2_7MIN_SEC = { min: 120, max: 420 };
  const WINDOW_RISING_MAX_SEC = Number(process.env.BUZZWEAVE_RISING_WINDOW_MAX_SEC || 420);
  const MOMENTUM_LIKES_PER_10MIN = 50;
  for (const slot of slots) {
    const createdAt = slot?.post?.created_at ? new Date(slot.post.created_at).getTime() : 0;
    slot._ageSec = createdAt ? (nowMs - createdAt) / 1000 : 999999;
    const likeCount = Number(slot?.post?.public_metrics?.like_count) || 0;
    slot._likesPer10min = slot._ageSec > 0 ? (likeCount / (slot._ageSec / 60)) * 10 : 0;
    slot._in2_7Window = slot._ageSec >= WINDOW_2_7MIN_SEC.min && slot._ageSec <= WINDOW_2_7MIN_SEC.max;
    slot._inRisingWindow = slot._ageSec >= WINDOW_2_7MIN_SEC.min && slot._ageSec <= WINDOW_RISING_MAX_SEC;
    slot._quoteQualityScore = quoteTargetQualityScore(slot, nowMs);
  }
  if (!useQualityScoreSelection) {
    const inWindow = slots.filter((s) => s._in2_7Window);
    if (inWindow.length > 0) slots = inWindow;
    slots.sort((a, b) => {
      if (a._in2_7Window !== b._in2_7Window) return a._in2_7Window ? -1 : 1;
      return (b._likesPer10min ?? 0) - (a._likesPer10min ?? 0);
    });
  } else {
    const inRising = slots.filter((s) => s._inRisingWindow);
    if (inRising.length > 0) slots = inRising;
    slots.sort((a, b) => (b._quoteQualityScore ?? 0) - (a._quoteQualityScore ?? 0));
  }

  const shiteshiStats = {};
  const VELOCITY_SCALE = 500;
  for (const slot of slots) {
    const id = slot?.post?.id ?? slot?.id ?? String(slot);
    const candidateMetrics = {
      velocity: Math.min(1, (slot.engagementScore ?? 0) / VELOCITY_SCALE),
      volatilityImpact: 0.5,
      followerQuality: 0.5,
      networkCentrality: 0.5,
      spikeFrequency: 0.5,
      lastSpikeAt: Date.now()
    };
    slot.shiteshiScore = scoreShiteshiCandidate(candidateMetrics);
    shiteshiStats[id] = { shiteshiScore: slot.shiteshiScore };
  }

  if (snapshot?.performanceMetrics) {
    try {
      const { normalizePerformanceMetrics } = require("./mlPqtNormalizer");
      const normalized = normalizePerformanceMetrics(snapshot.performanceMetrics);
      slots = orderCandidatesByPerformanceTiers(slots, normalized, 2);
      slots.sort((a, b) => (b.shiteshiScore ?? 0) - (a.shiteshiScore ?? 0));
    } catch (_) {
      slots = orderedCandidatesWithTier3Cap(slots, shiteshiStats, 2);
    }
  } else {
    slots = orderedCandidatesWithTier3Cap(slots, shiteshiStats, 2);
  }
  const slotsBeforeDiversity = slots.length;
  slots = applyDiversityCaps(slots, {
    maxPerAuthor: MAX_SLOTS_PER_AUTHOR,
    maxClusterShare: MAX_CLUSTER_SHARE
  });
  if (slots.length !== slotsBeforeDiversity) {
    logInfo("slots diversity cap applied", {
      before: slotsBeforeDiversity,
      after: slots.length,
      maxPerAuthor: MAX_SLOTS_PER_AUTHOR,
      maxClusterShare: MAX_CLUSTER_SHARE
    });
  }

  const REPLY_FIRST_ALL_MAX_PCT = 0.3;
  console.log("[BuzzWeave] pqt-only slots ready", "candidates=" + candidates.length, "slots=" + slots.length, "cap=" + effectiveCap, "runId=" + runId);
  logInfo("pqt-only slots ready", { candidates: candidates.length, slots: slots.length, cap: effectiveCap, runId });
  let posted = 0;
  for (let slotIndex = 0; slotIndex < slots.length; slotIndex++) {
    const slot = slots[slotIndex];
    if (runApiCallCount >= effectiveCap) break;
    const sourceId = slot?.post?.id;
    if (!sourceId) continue;

    let link = null;
    let funnelType = null;
    try {
      const best = await pickBestFunnelLink({ lang: langFilter, narrative_tag: "FOMO", cta_type: "ATH_SURGE", weight: 1 });
      link = best?.url || pickVidalyticsLink(langFilter, "regular");
      funnelType = best?.type || "vidalytics_regular";
    } catch (_) {
      link = pickVidalyticsLink(langFilter, "regular");
      funnelType = "vidalytics_regular";
    }
    if (!link) continue;

    const coin = /BTC|bitcoin/i.test(slot?.post?.text || "") ? "BTC" : /ETH/i.test(slot?.post?.text || "") ? "ETH" : "BTC";
    const proofSnippet = buildProofSnippetFromSnapshot(snapshot, langFilter, slot);
    const built = buildPqt(langFilter, { coin, proofSnippet, link, funnelType, quotedText: slot?.post?.text });
    if (!built || !built.text) continue;
    if (collectSamples && generatedSamples.length < sampleLimit) {
      const text = String(built.text || "");
      const questionCount = (text.match(/[?？]/g) || []).length;
      generatedSamples.push({
        templateIndex: built.templateIndex,
        funnelType,
        cluster: slot.cluster || "pqt",
        impressionScore: Number(slot.impressionScore || 0),
        engagementScore: Number(slot.engagementScore || 0),
        sourceTweetId: String(sourceId),
        textLength: text.length,
        questionCount,
        text
      });
    }

    if (dryRun) {
      posted += 1;
      recordPqtUse(langFilter, built.templateIndex);
      continue;
    }

    logInfo("pqt_quote_target", {
      runId,
      slotIndex,
      lang: langFilter,
      target_post: {
        id: slot?.post?.id,
        author_id: slot?.post?.author_id,
        text: slot?.post?.text,
        created_at: slot?.post?.created_at,
        public_metrics: slot?.post?.public_metrics
      },
      target_account: slot?.target
        ? {
            handle: slot.target.handle,
            lang: slot.target.lang,
            author: slot.target.author,
            org_type: slot.target.org_type,
            target_type: slot.target.target_type
          }
        : { author_id: slot?.post?.author_id },
      slot_metrics: {
        engagementScore: slot?.engagementScore,
        impressionScore: slot?.impressionScore,
        cluster: slot?.cluster,
        clusterScore: slot?.clusterScore,
        shiteshiScore: slot?.shiteshiScore,
        _ageSec: slot?._ageSec,
        _likesPer10min: slot?._likesPer10min,
        _in2_7Window: slot?._in2_7Window,
        quoteQualityScore: slot?._quoteQualityScore
      }
    });

    const replyFirstQtRaw = process.env.BUZZWEAVE_REPLY_FIRST_QT || "";
    const replyFirstQt = replyFirstQtRaw === "true" || replyFirstQtRaw === "1" || replyFirstQtRaw === "all" || replyFirstQtRaw === "every";
    const replyFirstQtEverySlot = replyFirstQtRaw === "all" || replyFirstQtRaw === "every";
    const isFirstSlot = posted === 0;
    const replyFirstWithinCap = replyFirstQtEverySlot ? slotIndex < Math.ceil(slots.length * REPLY_FIRST_ALL_MAX_PCT) : isFirstSlot;
    try {
      if (replyFirstQt && replyToTweet && replyFirstWithinCap) {
        const oneLiner = langFilter === "en" ? "Key level most miss 👇" : langFilter === "ja" ? "要チェック 👇" : "Key level 👇";
        countApiCall();
        const replyResult = await replyToTweet(oneLiner, sourceId);
        const replyId = replyResult?.data?.id ?? replyResult?.id;
        if (replyId) {
          countApiCall();
          const postResult = await postQuoteTweet(built.text, replyId);
          posted += 1;
          recordPqtUse(langFilter, built.templateIndex);
          await insertQuotedTweets([{ tweet_id: String(sourceId), lang: langFilter }]);
          await insertBuzzweavePostLog({
            slotLang: langFilter,
            clusterLabel: slot.cluster || "pqt",
            clusterScore: slot.clusterScore ?? 0,
            candidateTweetId: String(sourceId),
            engagementScore: slot.engagementScore ?? 0,
            postedAt: new Date().toISOString(),
            ourTweetId: postResult?.id ?? null,
            slotMode: "pqt_only",
            buzzSummary: `PQT-only Reply-first QT (imp=${Number(slot.impressionScore || 0).toFixed(4)})`,
            usedMode: "pqt_only",
            funnelType,
            funnelUrl: link,
            narrativeTag: "FOMO",
            ctaType: "ATH_SURGE"
          });
        }
      } else {
        countApiCall();
        const postResult = await postQuoteTweet(built.text, sourceId);
        posted += 1;
        recordPqtUse(langFilter, built.templateIndex);
        await insertQuotedTweets([{ tweet_id: String(sourceId), lang: langFilter }]);
        await insertBuzzweavePostLog({
          slotLang: langFilter,
          clusterLabel: slot.cluster || "pqt",
          clusterScore: slot.clusterScore ?? 0,
          candidateTweetId: String(sourceId),
          engagementScore: slot.engagementScore ?? 0,
          postedAt: new Date().toISOString(),
          ourTweetId: postResult?.id ?? null,
          slotMode: "pqt_only",
          buzzSummary: `PQT-only Fisherman (imp=${Number(slot.impressionScore || 0).toFixed(4)})`,
          usedMode: "pqt_only",
          funnelType,
          funnelUrl: link,
          narrativeTag: "FOMO",
          ctaType: "ATH_SURGE"
        });
      }
    } catch (e) {
      logWarn("pqt post failed", sourceId, e?.message);
    }
  }

  const sampleSummary = generatedSamples.length
    ? {
        count: generatedSamples.length,
        avgLength: Number(
          (generatedSamples.reduce((sum, s) => sum + (s.textLength || 0), 0) / generatedSamples.length).toFixed(1)
        ),
        avgQuestionCount: Number(
          (generatedSamples.reduce((sum, s) => sum + (s.questionCount || 0), 0) / generatedSamples.length).toFixed(2)
        ),
        overOneQuestionCount: generatedSamples.filter((s) => (s.questionCount || 0) > 1).length
      }
    : null;
  if (sampleSummary) {
    logInfo("pqt-only generated sample summary", {
      runId,
      langFilter,
      ...sampleSummary
    });
  }

  const posts_fetched = collectResult.postsFetched ?? 0;
  const fill_rate = effectiveCap > 0 ? posted / effectiveCap : 0;
  return {
    ok: true,
    posted,
    runId,
    pqtOnly: true,
    generatedSamples,
    sampleSummary,
    shortReport: {
      run_id: runId,
      lang: langFilter,
      posts_fetched,
      candidates: candidates.length,
      slots: slots.length,
      cap: effectiveCap,
      posted,
      fill_rate: Math.round(fill_rate * 10000) / 10000
    }
  };
}

/**
 * 1サイクル実行: 常に PQT-only（テンプレ）に委譲。旧 GPT 寄生コピー経路は廃止。
 */
async function runBuzzWeaveCycle(options = {}) {
  return runBuzzWeaveCyclePqtOnly(options);
}

const AUTONOMOUS_SLOT_MODE = process.env.AUTONOMOUS_SLOT_MODE === "true" || process.env.AUTONOMOUS_SLOT_MODE === "1";

/**
 * 日次スロット生成（Cron用）
 * AUTONOMOUS_SLOT_MODE=true のときは最適スロット 1 個のみ生成
 */
async function generateDailySlots() {
  if (PQT_ONLY_MODE) {
    return { ok: true, count: 0, targetDailySlots: 0, pqtOnly: true };
  }
  await cleanupOldSlots(CLEANUP_OLDER_THAN_HOURS);

  if (AUTONOMOUS_SLOT_MODE) {
    const bestSlot = await buildBestSlot();
    if (!bestSlot) {
      logWarn("autonomous mode: buildBestSlot returned null, falling back to legacy");
      const slots = generateSlotsForDay(new Date());
      const result = await insertTdPostSlots(slots);
      return { ok: result.ok, count: result.ok ? slots.length : 0, targetDailySlots: DAILY_SLOT_COUNT, autonomous: false };
    }
    const result = await insertTdPostSlots([bestSlot]);
    return {
      ok: result.ok,
      count: result.ok ? 1 : 0,
      targetDailySlots: 1,
      autonomous: true,
      slot: { lang: bestSlot.lang, cluster_id: bestSlot.cluster_id, narrative_tag: bestSlot.narrative_tag, cta_type: bestSlot.cta_type, weight: bestSlot.weight }
    };
  }

  const slots = generateSlotsForDay(new Date());
  const result = await insertTdPostSlots(slots);
  return { ok: result.ok, count: result.ok ? slots.length : 0, targetDailySlots: DAILY_SLOT_COUNT };
}

module.exports = {
  calculateEngagementScore,
  scorePostByMetrics,
  fetchRecentPostsFromX,
  fetchCandidatesFromSearch,
  generateSlotsForDay,
  cleanupOldSlots,
  pickBestBuzzCandidate,
  collectBuzzCandidates,
  runBuzzWeaveCycle,
  runBuzzWeaveCyclePqtOnly,
  generateDailySlots,
  BUZZ_THRESHOLD,
  SLOT_DISTRIBUTION_JST,
  PQT_ONLY_MODE
};
