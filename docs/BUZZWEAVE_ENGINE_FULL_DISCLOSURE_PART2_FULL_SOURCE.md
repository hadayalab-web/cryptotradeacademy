# BuzzWeave Engine 完全開示 Part 2 — 各ファイル全文（1文字も省略なし）

- **Part 1（構造・ロジック・依存・フロー）**: [BUZZWEAVE_ENGINE_FULL_DISCLOSURE.md](./BUZZWEAVE_ENGINE_FULL_DISCLOSURE.md) をクリックで開く

以下のファイルは、リポジトリの該当パスと完全に同一の内容です。

---

## ファイル1: services/td/buzzWeaveEngine.js 全文

```javascript
/**
 * TD BuzzWeave Engine — 引用リポスト最適化エンジン
 * 目的: 高インプレッション・高エンゲージメント・高CVR（すべて逆算）
 *
 * フロー: Search recent Posts → バズ抽出 → 文脈タグ付け → スロット生成 → マッピング → 寄生コピー生成 → 引用リポスト
 */
const { loadEnv } = require("../../utils/loadEnv");
const { getKV } = require("../../utils/kv");
loadEnv();

const OpenAI = require("openai");
const { searchPostsRecent, getUserByUsername, getUserTweets, postQuoteTweet: postQuoteTweetDefault } = require("../x/client");
const { pickVidalyticsLink } = require("../../config/buzzweaveLinks");
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
  upsertBuzzweaveStatus402
} = require("../../utils/supabase");
const { generateXPost } = require("../ai/gpt5mini");

const MODEL = process.env.GPT_MODEL_X_POST || "gpt-4o-mini";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

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
const DEFAULT_DEADLINE_MS = Number(process.env.BUZZWEAVE_DEADLINE_MS || 55000);
const BUZZWEAVE_MAX_TARGETS = Number(process.env.BUZZWEAVE_MAX_TARGETS || 12);
const BUZZWEAVE_GPT_CLASSIFY_TOP_N = Number(process.env.BUZZWEAVE_GPT_CLASSIFY_TOP_N || 10);
const BUZZWEAVE_ENOUGH_CANDIDATES = Number(process.env.BUZZWEAVE_ENOUGH_CANDIDATES || 24);
const CLEANUP_OLDER_THAN_HOURS = Number(process.env.BUZZWEAVE_SLOT_RETENTION_HOURS || 48);
const LOG_LEVEL = process.env.BUZZWEAVE_LOG_LEVEL || "info";
const LOG_MAX_PER_RUN = 5;
let runLogCount = 0;

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
  ar: ["bitcoin", "btc", "crypto"]
};
const SEARCH_WINDOW_MINUTES = Number(process.env.BUZZWEAVE_SEARCH_WINDOW_MIN || 5);
const DYNAMIC_MEDIAN_MULTIPLIER = Number(process.env.BUZZWEAVE_MEDIAN_MULTIPLIER || 1.2);

function buildSearchQuery(lang) {
  const kw = SEARCH_KEYWORDS_BY_LANG[lang] || SEARCH_KEYWORDS_BY_LANG.en;
  const orPart = kw.map((k) => (k.includes(" ") ? `"${k}"` : k)).join(" OR ");
  return `${orPart} -is:retweet -is:reply`;
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
 * gpt-4o で投稿を topic/tone/lang に分類
 */
async function classifyPostWithGpt4o(postText) {
  if (!OPENAI_API_KEY || !postText || postText.length < 10) {
    return { topic: "crypto", tone: "neutral", lang: "en" };
  }
  try {
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            "Return ONLY a JSON object. Keys: topic (crypto/ai/finance/tech/general), tone (urgent/neutral/bullish/bearish/fear), lang (en/ja/es/pt/ko/ar). No markdown."
        },
        {
          role: "user",
          content: `Classify this X post:\n"${String(postText).slice(0, 500)}"\nJSON:`
        }
      ],
      max_completion_tokens: 80,
      temperature: 0.2
    });
    const raw = completion?.choices?.[0]?.message?.content?.trim() || "{}";
    const cleaned = raw.replace(/```json?\n?/gi, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return {
      topic: parsed.topic || "crypto",
      tone: parsed.tone || "neutral",
      lang: parsed.lang || "en"
    };
  } catch (e) {
    logWarn("classifyPostWithGpt4o error:", e.message);
    return { topic: "crypto", tone: "neutral", lang: "en" };
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
      const slotDate = new Date(base);
      slotDate.setUTCHours(Math.floor(hour) - 9, Math.floor(Math.random() * 60), 0, 0);

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
  try {
    const now = Date.now();
    const windowMin = options.windowMinutes ?? SEARCH_WINDOW_MINUTES;
    const endTime = new Date(now - 10 * 1000); // API制約: 10秒以上前
    const startTime = new Date(now - windowMin * 60 * 1000);
    const query = buildSearchQuery(slotLang);
    const res = await searchPostsRecent(query, {
      maxResults: options.maxResults || 50,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      sortOrder: options.sortOrder || "recency"
    });
    const data = Array.isArray(res?.data) ? res.data : [];
    console.log("[BuzzWeave] BWE SCAN: X API accessed OK, posts fetched:", data.length, "| lang:", slotLang, "| query:", (query || "").slice(0, 60));
    return {
      data,
      includes: res?.includes || {},
      query,
      slotLang
    };
  } catch (e) {
    const msg = String(e?.message || "");
    const statusMatch = msg.match(/X API Error: (\d+)/);
    const status = statusMatch ? statusMatch[1] : null;
    const is402 = msg.includes("402");
    if (is402) {
      console.warn("[BuzzWeave] search/recent 402 (Payment Required)", { slotLang });
      logError("fetchCandidatesFromSearch 402: run aborted", slotLang);
      return { data: [], includes: {}, query: "", slotLang, fatal402: true };
    }
    console.warn("[BuzzWeave] search/recent error", { slotLang, status, message: msg.slice(0, 200) });
    logWarn("fetchCandidatesFromSearch error:", slotLang, e.message);
    return { data: [], includes: {}, query: "", slotLang };
  }
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

  // 1-1: slot.lang に合わせたクエリで直近 1〜5 分の投稿を取得（1言語のみ）
  const searchResult = await fetchCandidatesFromSearch(slotLang, {
    maxResults: 50,
    sortOrder: "recency",
    windowMinutes: SEARCH_WINDOW_MINUTES
  });

  if (searchResult.fatal402) {
    console.log("[BuzzWeave] BWE SCAN: X API 402, run aborted");
    return { candidates: [], deadlineExceeded: false, clusters: {}, clusterScores: {}, fatal402: true, postsFetched: 0 };
  }

  const { data: posts, includes, query } = searchResult;

  if (isDeadlineExceeded(startMs, deadlineMs)) {
    console.log("[BuzzWeave] BWE SCAN: deadline exceeded after search, posts_fetched=" + posts.length);
    return { candidates, deadlineExceeded: true, clusters: {}, clusterScores: {}, postsFetched: posts.length };
  }

  if (!posts.length) {
    console.log("[BuzzWeave] BWE SCAN: 0 posts from search, no buzz candidates");
    logInfo("candidate summary (search/recent)", { rawCandidates: 0, candidates: 0, clusters: {}, clusterScores: {} });
    return { candidates, deadlineExceeded: false, clusters: {}, clusterScores: {}, postsFetched: 0 };
  }

  const quotedIds = await getQuotedTweetIdsInLast30Days(posts.map((p) => String(p.id)));
  const usersById = (includes?.users || []).reduce((acc, u) => {
    acc[u.id] = u;
    return acc;
  }, {});

  for (const post of posts) {
    if (quotedIds.has(String(post.id))) continue;
    const metrics = post.public_metrics || {};
    const score = scorePostByMetrics(metrics);
    const user = post.author_id ? usersById[post.author_id] : null;
    const handle = user?.username || post.author_id || "unknown";
    rawCandidates.push({
      target: { handle: String(handle).replace(/^@/, ""), org_type: null, lang: post.lang || slotLang, target_type: "flexible" },
      post: { id: post.id, text: post.text, created_at: post.created_at },
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
    console.log("[BuzzWeave] BWE SCAN: deadline after median filter, posts_fetched=" + posts.length + " buzz_candidates=" + filteredByMedian.length);
    return { candidates: filteredByMedian.slice(0, classifyTopN).map(c => ({ ...c, context: { topic: "crypto", tone: "neutral", lang: c.target?.lang || "en" }, cluster: classifyCluster(c.post?.text) })), deadlineExceeded: true, clusters: {}, clusterScores: {}, postsFetched: posts.length };
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

  logInfo("clusterScore (search/recent)", clusterScores);

  const toClassify = filteredByMedian.slice(0, Math.max(1, classifyTopN));
  let deadlineExceeded = false;

  if (isDeadlineExceeded(startMs, deadlineMs)) {
    deadlineExceeded = true;
    console.log("[BuzzWeave] BWE SCAN: deadline exceeded during classify, posts_fetched=" + posts.length + " buzz_candidates=" + toClassify.length);
    for (const c of toClassify) {
      candidates.push({ ...c, context: { topic: "crypto", tone: "neutral", lang: c.target?.lang || "en" } });
    }
  } else {
    for (const c of toClassify) {
      if (isDeadlineExceeded(startMs, deadlineMs)) {
        deadlineExceeded = true;
        break;
      }
      const context = await classifyPostWithGpt4o(c.post.text);
      candidates.push({ ...c, context: { ...context, lang: context.lang || c.target?.lang || "en" } });
    }
    for (const c of toClassify.slice(candidates.length)) {
      candidates.push({ ...c, context: { topic: "crypto", tone: "neutral", lang: c.target?.lang || "en" } });
    }
  }

  candidates.sort((a, b) => b.engagementScore - a.engagementScore);
  console.log("[BuzzWeave] BWE SCAN: posts_fetched=" + posts.length + " buzz_candidates=" + candidates.length + " (median_filtered=" + filteredByMedian.length + ")");
  logInfo("candidate summary (search/recent)", {
    rawCandidates: rawCandidates.length,
    filteredByMedian: filteredByMedian.length,
    candidates: candidates.length,
    clusterScores,
    deadlineExceeded
  });
  return { candidates, deadlineExceeded, clusters, clusterScores, postsFetched: posts.length };
}

/**
 * 寄生コピー生成（3-1 + クジラのカモ救済ミッション準拠）
 * usedMode で trap_defence_warning / neutral_insight / educational_boost を切り替え
 * Unified OS: btcSnapshot を渡し、TD と同一市場状態で投稿する（必須）
 */
async function generateParasiticCopy(slot, buzzCandidate, videoUrl, btcSnapshot = null) {
  const { target, post, context } = buzzCandidate;
  const dict = await getTdEmotionDictionary(null, slot.lang, 10);
  const phrases = dict.map((d) => d.phrase).filter(Boolean);
  const buzzInsights = buildBuzzInsights(buzzCandidate, slot.lang);
  const { usedMode } = buzzInsights;

  const result = await generateXPost({
    mode: slot.mode,
    language: slot.lang,
    video_url: videoUrl || pickVidalyticsLink(slot.lang, slot.mode),
    orgType: target.org_type || undefined,
    dictionaryPhrases: phrases,
    usedMode,
    buzzContext: {
      quotedText: post.text?.slice(0, 200),
      topic: context?.topic || "crypto",
      tone: context?.tone || "neutral",
      lang: context?.lang || target?.lang || slot.lang,
      ...buzzInsights
    },
    btcSnapshot
  });

  return result.body;
}

/**
 * 1サイクル実行: 次1時間のスロット取得（1言語のみ）→ マッピング → 生成 → 投稿
 */
async function runBuzzWeaveCycle(options = {}) {
  runLogCount = 0;
  const dryRun = options.dryRun !== false;
  const deadlineMs = Number(options.deadlineMs || DEFAULT_DEADLINE_MS);
  const langFilter = options.langFilter || null;
  const btcSnapshot = options.btcSnapshot || null;
  const postQuoteTweet = options.postQuoteTweet || postQuoteTweetDefault;
  const startMs = Date.now();
  const runId = `bw-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  logInfo("cycle start", { runId, dryRun, langFilter, hasBtcSnapshot: !!btcSnapshot });

  const cleanup = await cleanupOldSlots(CLEANUP_OLDER_THAN_HOURS);

  const slots = await getTdPostSlotsInNextHour(langFilter);
  const slot = slots[0];
  console.log("[BuzzWeave] slots", {
    count: slots.length,
    langFilter: langFilter || "(round-robin)",
    firstSlot: slot ? { id: slot.id, lang: slot.lang, datetime_jst: slot.datetime_jst } : null
  });
  logInfo("slot", slot || null);
  if (!slots.length) {
    console.log("[BuzzWeave] stop: no slots in next hour", { langFilter });
    return { ok: true, message: langFilter ? `No slots for lang=${langFilter}` : "No slots in next hour", posted: 0, runId };
  }

  if (isDeadlineExceeded(startMs, deadlineMs)) {
    logWarn("deadline exceeded", {
      stage: "before-collectBuzzCandidates",
      runId,
      ...deadlineSnapshot(startMs, deadlineMs)
    });
    return {
      ok: true,
      message: "deadline exceeded before collectBuzzCandidates",
      posted: 0,
      runId,
      deadlineExceeded: true
    };
  }

  const collectResult = await collectBuzzCandidates({
    slotLang: slot.lang,
    startMs,
    deadlineMs,
    classifyTopN: BUZZWEAVE_GPT_CLASSIFY_TOP_N
  });

  if (collectResult.fatal402) {
    upsertBuzzweaveStatus402().catch(() => {});
    logError("fatal402: run aborted");
    return { ok: false, message: "X API 402 - run aborted", posted: 0, runId, fatal402: true };
  }

  const buzzCandidates = collectResult.candidates || [];
  const clusterScores = collectResult.clusterScores || {};
  const postsFetched = collectResult.postsFetched ?? "?";
  console.log("[BuzzWeave] BWE SCAN RESULT: posts_fetched=" + postsFetched + " buzz_candidates=" + buzzCandidates.length + (collectResult.deadlineExceeded ? " (deadline)" : ""));
  if (!buzzCandidates.length) {
    const reason = collectResult.fatal402
      ? "X API 402"
      : collectResult.deadlineExceeded
        ? "deadline exceeded"
        : "search returned 0 or all filtered";
    console.log("[BuzzWeave] stop: no candidates", { reason });
    return {
      ok: true,
      message: collectResult.deadlineExceeded ? "deadline exceeded during candidate collection" : "No buzz candidates",
      posted: 0,
      runId,
      deadlineExceeded: !!collectResult.deadlineExceeded
    };
  }

  if (isDeadlineExceeded(startMs, deadlineMs)) {
    logWarn("deadline exceeded", { stage: "before-pickBestBuzzCandidate", runId, ...deadlineSnapshot(startMs, deadlineMs) });
  }

  const results = [];
  let candidate = pickBestBuzzCandidate(buzzCandidates, slot, clusterScores);
  if (!candidate) {
    candidate = buzzCandidates.sort((a, b) => (b.engagementScore || 0) - (a.engagementScore || 0))[0];
  }
  console.log("[BuzzWeave] best candidate", { candidateId: candidate?.post?.id ?? null, hasCandidate: !!candidate });
  logInfo("best candidate", candidate ? candidate.post?.id : null);
  if (!candidate) {
    console.log("[BuzzWeave] stop: no matching candidate for slot");
    return { ok: true, message: "No matching candidate for slot", posted: 0, runId };
  }

  const videoUrl = pickVidalyticsLink(slot.lang, slot.mode);
  const body = await generateParasiticCopy(slot, candidate, videoUrl, btcSnapshot);

  if (!dryRun) {
    if (isDeadlineExceeded(startMs, deadlineMs)) {
      logWarn("deadline exceeded", {
        stage: "before-x-post",
        runId,
        ...deadlineSnapshot(startMs, deadlineMs)
      });
      results.push({
        slot,
        candidate: { handle: candidate.target.handle, postId: candidate.post.id },
        body,
        deadlineExceeded: true,
        success: false
      });
      return {
        ok: true,
        message: "deadline exceeded before posting",
        posted: 0,
        runId,
        deadlineExceeded: true,
        results
      };
    }

    try {
      console.log("[BuzzWeave] posting", { quotedId: candidate.post.id, dryRun: false });
      logInfo("ready to post", candidate.post.id);
      const postResult = await postQuoteTweet(body, candidate.post.id);
      console.log("[BuzzWeave] BWE SCAN: REPOSTED quoted_id=" + candidate.post.id + " our_tweet_id=" + (postResult?.id || "null"));
      try {
        const kv = getKV();
        if (kv) await kv.set("health:bwe:lastPost", Date.now());
      } catch (_) {}
      // 集中投下ログ（市場回収用 + ミッション検証用）
      const buzzInsights = buildBuzzInsights(candidate, slot.lang);
      await insertBuzzweavePostLog({
        slotLang: slot.lang,
        clusterLabel: candidate.cluster || "other",
        clusterScore: clusterScores[candidate.cluster] ?? 0,
        candidateTweetId: String(candidate.post.id),
        engagementScore: candidate.engagementScore ?? 0,
        postedAt: new Date().toISOString(),
        ourTweetId: postResult?.id || null,
        slotMode: slot.mode,
        buzzSummary: buzzInsights.buzzSummary,
        clusterPsych: buzzInsights.clusterPsych,
        trapDefenceInsight: buzzInsights.trapDefenceInsight,
        dangerLabel: candidate.dangerLabel || "neutral",
        usedMode: buzzInsights.usedMode || "neutral_insight"
      });
      // 30日重複防止へ登録（成功投稿時）
      await insertQuotedTweets([{ tweet_id: String(candidate.post.id), lang: slot.lang }]);
      const consume = await consumeTdPostSlot(slot.id);
      let compensation = null;
      if (!consume.ok) {
        // 補償: 削除失敗時は将来時刻へ退避し、同slotの即時再利用を防ぐ
        const deferred = await deferTdPostSlot(slot.id, 180);
        compensation = {
          slotConsumeFailed: true,
          deferred: deferred.ok,
          deferredTo: deferred.deferred_to || null
        };
        logWarn("slot consume failed, compensation applied", { runId, slotId: slot.id, compensation });
      }
      await insertTdCopyArchive({ text: body, lang: slot.lang, mode: slot.mode });
      await insertTdCopyMeta(inferCopyMeta(body, slot.mode, slot.lang));
      const xpostResult = await insertXPost({
        lang: slot.lang,
        mode: slot.mode,
        body,
        video_url: videoUrl
      });
      if (!xpostResult.ok) {
        logError("insertXPost failed, run stopping (no retry)");
        return {
          ok: true,
          message: "insertXPost failed",
          posted: 0,
          runId,
          results
        };
      }
      results.push({
        slot,
        candidate: { handle: candidate.target.handle, postId: candidate.post.id },
        tweetId: postResult?.id,
        compensation,
        success: true
      });
    } catch (e) {
      logError("post cycle failed", { runId, message: e.message });
      results.push({
        slot,
        error: e.message,
        success: false
      });
    }
  } else {
    console.log("[BuzzWeave] BWE SCAN: DRY RUN would_repost quoted_id=" + candidate.post.id);
    results.push({
      slot,
      candidate: { handle: candidate.target.handle, postId: candidate.post.id },
      body,
      dryRun: true
    });
  }

  return {
    ok: true,
    posted: dryRun ? 0 : results.filter((r) => r.success).length,
    runId,
    deadlineExceeded: !!collectResult.deadlineExceeded,
    results
  };
}

/**
 * 日次スロット生成（Cron用）
 */
async function generateDailySlots() {
  await cleanupOldSlots(CLEANUP_OLDER_THAN_HOURS);
  const slots = generateSlotsForDay(new Date());
  const result = await insertTdPostSlots(slots);
  return { ok: result.ok, count: slots.length, targetDailySlots: DAILY_SLOT_COUNT };
}

module.exports = {
  calculateEngagementScore,
  scorePostByMetrics,
  fetchRecentPostsFromX,
  fetchCandidatesFromSearch,
  classifyPostWithGpt4o,
  generateSlotsForDay,
  cleanupOldSlots,
  pickBestBuzzCandidate,
  collectBuzzCandidates,
  generateParasiticCopy,
  runBuzzWeaveCycle,
  generateDailySlots,
  BUZZ_THRESHOLD,
  SLOT_DISTRIBUTION_JST
};
```

---

## ファイル2: api/buzzweave-run.js 全文

```javascript
/**
 * TD BuzzWeave Engine — 1サイクル実行 API
 * Cron: GET /api/buzzweave-run?lang=en など（1 run で 1 言語のみ、round-robin で lang を渡す）
 *
 * 緊急停止: BUZZWEAVE_EMERGENCY_STOP=true で即 return
 * ロック: 多重実行防止のため buzzweave_locks で排他。取得後は try/finally で必ず解放。TTL 60秒で自動解除。
 *
 * Runtime: Node.js を強制（Edge では console.log 等が期待どおり動かないため）
 */
require("../utils/suppressKnownWarnings");

const { runBuzzWeaveCycle } = require("../services/td/buzzWeaveEngine");
const { loadEnv } = require("../utils/loadEnv");
const { getKV } = require("../utils/kv");
const { BTC_SNAPSHOT_KV_KEY, BTC_SNAPSHOT_MAX_AGE_MS } = require("../services/snapshot/btcSnapshotSchema");
const { assetSnapshotKvKey } = require("../services/snapshot/assetSnapshotSchema");
const {
  acquireBuzzweaveLock,
  releaseBuzzweaveLock,
  upsertBuzzweaveStatusEmergencyStop,
  getBuzzweaveStatus,
  isSupabaseConfigured,
  getBuzzweaveLockState
} = require("../utils/supabase");
loadEnv();

const BUZZWEAVE_LANGS = ["en", "es", "pt", "ja", "ko", "ar"];

async function handler(req, res) {
  console.log("[buzzweave-run] handler start");

  if (req.method !== "GET" && req.method !== "POST") {
    console.log("[buzzweave-run] early return: method not allowed");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  const querySecret = req.query?.cron_secret;
  const authOk = !cronSecret || authHeader === `Bearer ${cronSecret}` || querySecret === cronSecret;
  if (!authOk) {
    console.log("[buzzweave-run] early return: 401 Unauthorized (cronSecret set, Bearer or cron_secret mismatch)");
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  if (process.env.BUZZWEAVE_EMERGENCY_STOP === "true" || process.env.BUZZWEAVE_EMERGENCY_STOP === "1") {
    console.log("[buzzweave-run] early return: Emergency stop active");
    await upsertBuzzweaveStatusEmergencyStop("env_flag");
    return res.status(200).json({ ok: true, message: "Emergency stop active", posted: 0 });
  }

  const status = await getBuzzweaveStatus();
  if (status.x_api_blocked) {
    console.log("[buzzweave-run] early return: X API blocked flag active");
    return res.status(200).json({ ok: true, message: "X API blocked flag active", posted: 0 });
  }

  if (!isSupabaseConfigured()) {
    console.error("[buzzweave-run] early return: Supabase NOT configured (NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY missing on Vercel)");
    return res.status(503).json({ ok: false, message: "Supabase not configured", posted: 0 });
  }

  const acquired = await acquireBuzzweaveLock();
  if (!acquired) {
    const lockState = await getBuzzweaveLockState();
    console.log("[buzzweave-run] early return: Locked", lockState.ok ? { locked: lockState.locked, updated_at: lockState.updated_at } : { reason: lockState.reason });
    return res.status(200).json({
      ok: true,
      message: "Locked (another run in progress)",
      posted: 0,
      debug_lock: lockState.ok
        ? { locked: lockState.locked, updated_at: lockState.updated_at, hint: "ロック取得に失敗。DB上で locked=true なら他リクエストが保持中。updated_at が60秒以上前ならTTLで解除されるはず。" }
        : { reason: lockState.reason, error: lockState.error }
    });
  }

  console.log("[buzzweave-run] lock acquired");

  const dryRun = req.query?.dry_run === "true" || req.query?.dry_run === "1";
  const assetParam = (req.query?.asset || "BTC").toUpperCase();
  const langParam = req.query?.lang;
  const langFilter = langParam && BUZZWEAVE_LANGS.includes(langParam)
    ? langParam
    : BUZZWEAVE_LANGS[Math.floor(Date.now() / 60000) % BUZZWEAVE_LANGS.length];

  try {
    let btcSnapshot = null;
    let kv = null;
    try {
      kv = getKV();
      if (kv) {
        const assetKey = assetSnapshotKvKey(assetParam);
        let raw = await kv.get(assetKey);
        if (!raw && assetParam === "BTC") raw = await kv.get(BTC_SNAPSHOT_KV_KEY);
        if (raw && raw.as_of_utc) {
          const age = Date.now() - new Date(raw.as_of_utc).getTime();
          if (age <= BTC_SNAPSHOT_MAX_AGE_MS) btcSnapshot = raw;
          else console.warn("[buzzweave-run] snapshot too old, age_ms=" + age);
        } else {
          console.warn("[buzzweave-run] no snapshot in KV for asset=" + assetParam + " (run /api/cron first)");
        }
      }
    } catch (e) {
      console.warn("[buzzweave-run] KV get snapshot failed:", e.message);
    }

    if (!btcSnapshot) {
      console.log("[buzzweave-run] early return: SKIP_NO_SNAPSHOT (no btcSnapshot in KV)");
      console.warn("[BWE] No btcSnapshot available, skipping BuzzWeave cycle.");
      return res.status(200).json({ ok: true, status: "SKIP_NO_SNAPSHOT", message: "No btcSnapshot in KV (run /api/cron first)", posted: 0 });
    }

    if (kv && !btcSnapshot.macroContext) {
      try {
        const [nasdaq, gold] = await Promise.all([
          kv.get(assetSnapshotKvKey("NASDAQ")),
          kv.get(assetSnapshotKvKey("GOLD"))
        ]);
        if (nasdaq || gold) {
          const { buildMacroContextFromAssets } = require("../logic/macroRiskEvaluator");
          const macroContext = buildMacroContextFromAssets({
            nasdaqSnapshot: nasdaq || null,
            goldSnapshot: gold || null
          });
          btcSnapshot = { ...btcSnapshot, macroContext };
        }
      } catch (_) {}
    }

    console.log("[buzzweave-run] run started");
    const result = await runBuzzWeaveCycle({ dryRun, langFilter, btcSnapshot });
    console.log("[buzzweave-run] run completed");
    return res.status(200).json(result);
  } catch (e) {
    console.error("[buzzweave-run] ❌ Error in runBuzzWeave", e.message);
    console.error("[buzzweave-run] Stack trace for lock:", e.stack);
    return res
      .status(500)
      .setHeader("x-vercel-no-retry", "1")
      .json({ ok: false, message: "Internal error", posted: 0 });
  } finally {
    await releaseBuzzweaveLock();
    console.log("[buzzweave-run] lock released");
  }
}

module.exports = handler;
module.exports.config = { runtime: "nodejs" };
```

---

## ファイル3: api/buzzweave-slots.js 全文

```javascript
/**
 * TD BuzzWeave Engine — 日次400枠スロット生成 API
 * Cron: GET /api/buzzweave-slots（日1回・0:00 JST 等）
 */

require("../utils/suppressKnownWarnings");
const { getSupabase } = require("../utils/supabase");
const { generateDailySlots } = require("../services/td/buzzWeaveEngine");
const { loadEnv } = require("../utils/loadEnv");
loadEnv();

module.exports = async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  const sb = getSupabase();
  if (!sb) {
    return res.status(503).json({
      ok: false,
      error:
        "Supabase が未設定です。NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY を確認してください。"
    });
  }
  const { error: slotTableError } = await sb.from("td_post_slots").select("id").limit(1);
  if (slotTableError) {
    return res.status(500).json({
      ok: false,
      error:
        "td_post_slots が存在しません。Supabase SQL Editor で docs/supabase-tweet-metrics-schema.sql を実行してテーブルを作成してください。"
    });
  }

  try {
    const result = await generateDailySlots();
    return res.status(200).json(result);
  } catch (e) {
    console.error("[buzzweave-slots] error:", e.message);
    return res.status(500).json({
      ok: false,
      error: e.message
    });
  }
};
```

---

## ファイル4: api/buzzweave-health.js 全文

```javascript
/**
 * TD BuzzWeave Engine — Health Check API
 * GET /api/buzzweave-health
 * Authorization: Bearer ${CRON_SECRET}
 */

const {
  getSupabase,
  getTdInfluencers,
  getTdOfficialAccounts,
  getTdPostSlotsInNextHour,
  getTdPostSlotsHealthStats,
  getBuzzweaveLockState,
  isSupabaseConfigured
} = require("../utils/supabase");
require("../utils/suppressKnownWarnings");
const { loadEnv } = require("../utils/loadEnv");
loadEnv();

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  const querySecret = req.query?.cron_secret;
  const authOk = !cronSecret || authHeader === `Bearer ${cronSecret}` || querySecret === cronSecret;
  if (!authOk) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  const supabaseConfigured = isSupabaseConfigured();
  const lockState = await getBuzzweaveLockState();

  if (!supabaseConfigured || !lockState.ok) {
    return res.status(503).json({
      ok: false,
      status: "degraded",
      reason: lockState.reason || "supabase_not_configured",
      hint: "Vercel の環境変数 NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY がローカル .env と一致しているか確認してください。",
      checks: { supabase_configured: supabaseConfigured, lock_read_ok: lockState.ok }
    });
  }

  const sb = getSupabase();
  if (!sb) {
    return res.status(503).json({
      ok: false,
      status: "degraded",
      reason: "supabase_not_configured"
    });
  }

  try {
    const env = {
      OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
      X_API_CONSUMER_KEY: !!process.env.X_API_CONSUMER_KEY,
      X_API_CONSUMER_KEY_SECRET: !!process.env.X_API_CONSUMER_KEY_SECRET,
      X_API_ACCESS_TOKEN: !!process.env.X_API_ACCESS_TOKEN,
      X_API_ACCESS_TOKEN_SECRET: !!process.env.X_API_ACCESS_TOKEN_SECRET
    };
    const [slotsHealth, nextHourSlots, influencers, officials] = await Promise.all([
      getTdPostSlotsHealthStats(),
      getTdPostSlotsInNextHour(),
      getTdInfluencers(null, 1),
      getTdOfficialAccounts(null, 1)
    ]);

    const ok =
      slotsHealth.ok &&
      Array.isArray(nextHourSlots) &&
      influencers.length > 0 &&
      officials.length > 0 &&
      Object.values(env).every(Boolean);

    return res.status(ok ? 200 : 503).json({
      ok,
      status: ok ? "healthy" : "degraded",
      checks: {
        env,
        supabase: {
          configured: true,
          lock: {
            locked: lockState.locked,
            updated_at: lockState.updated_at
          },
          hint: "lock.locked=true かつ buzzweave-run が毎回 Locked なら、TTL 60秒待つか release-buzzweave-lock.js を実行。Vercel とローカルで別 DB を見ている可能性あり。"
        },
        slots: {
          total: slotsHealth.total_slots ?? null,
          nextHour: Array.isArray(nextHourSlots) ? nextHourSlots.length : null
        },
        targets: {
          influencers_has_data: influencers.length > 0,
          officials_has_data: officials.length > 0
        }
      },
      ts: new Date().toISOString()
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      status: "error",
      error: e.message
    });
  }
};
```

---

## ファイル5: api/buzzweave-metrics-poll.js 全文

```javascript
/**
 * BuzzWeave 集中投下ログ: public_metrics ポーリング
 * Vercel Cron または手動で呼び出し。metrics_fetched_at が null のログに対して
 * X API から自分の引用リポストの public_metrics を取得し、buzzweave_post_log に紐づけて保存する。
 */
const { fetchBuzzweavePostLogsPendingMetrics, updateBuzzweavePostLogWithMetrics } = require("../utils/supabase");
const { getTweetMetrics } = require("../services/x/metrics");

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  try {
    const limit = parseInt(req.query?.limit, 10) || 20;
    const minAgeMinutes = parseInt(req.query?.minAgeMinutes, 10) || 5;

    const { ok, rows } = await fetchBuzzweavePostLogsPendingMetrics(limit, minAgeMinutes);
    if (!ok || !rows?.length) {
      return res.status(200).json({
        ok: true,
        message: "No pending metrics",
        updated: 0,
        errors: []
      });
    }

    const results = [];
    const errors = [];
    for (const row of rows) {
      const tweetId = row.our_tweet_id;
      if (!tweetId) continue;
      try {
        const data = await getTweetMetrics(tweetId, true);
        const pm = data?.publicMetrics || {};
        const impressions =
          data?.nonPublicMetrics?.impression_count ??
          data?.organicMetrics?.impression_count ??
          pm.impression_count ??
          null;
        const metrics = {
          impressions: impressions ?? null,
          likes: pm.like_count ?? null,
          retweets: pm.retweet_count ?? null,
          quotes: pm.quote_count ?? null,
          replies: pm.reply_count ?? null
        };
        const update = await updateBuzzweavePostLogWithMetrics(tweetId, metrics);
        if (update.ok) {
          results.push({ tweetId, ...metrics });
        } else {
          errors.push({ tweetId, error: "update failed" });
        }
      } catch (e) {
        errors.push({ tweetId, error: e.message });
      }
    }

    return res.status(200).json({
      ok: true,
      updated: results.length,
      results,
      errors: errors.length ? errors : undefined
    });
  } catch (e) {
    console.error("[buzzweave-metrics-poll]", e.message);
    return res.status(500).json({ ok: false, error: e.message });
  }
};
```

---

次のファイルはクリックで開けます: [config/buzzweaveLinks.js](../config/buzzweaveLinks.js)、[services/ai/gpt5mini.js](../services/ai/gpt5mini.js)、[services/x/client.js](../services/x/client.js)、[utils/supabase.js](../utils/supabase.js)。Part 1 [BUZZWEAVE_ENGINE_FULL_DISCLOSURE.md](./BUZZWEAVE_ENGINE_FULL_DISCLOSURE.md) に「5. X API」「6. GPT」「7. pickVidalyticsLink」「8. generateParasiticCopy」「9. テンプレート」および supabase の BuzzWeave 関連関数の抜粋を記載済みです。