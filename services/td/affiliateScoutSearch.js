/**
 * アフィリエイトスカウト用 X 検索のみ。引用リポスト・リプライは行わない。
 * fetchCandidatesFromSearch を提供（survey-affiliate-pool-by-lang.js および今後の DM スカウトで利用）。
 */
const { searchPostsRecent } = require("../x/client");

// 検索キーワード（6 言語・クリプト/トレード系。アフィリエイター候補の投稿を拾う想定）
const SEARCH_KEYWORDS_BY_LANG = {
  en: [
    "bitcoin", "btc", "crypto", "pump", "moon", "ath", "breakout", "halving", "spot etf", "all time high",
    "don't miss", "last chance", "buy now", "100x", "to the moon", "next 100x", "going to the moon", "pump it now",
    "gem", "alpha", "next pump", "dyor", "$SOL", "$ETH"
  ],
  ja: [
    "ビットコイン", "BTC", "仮想通貨", "急騰", "乗り遅れるな", "半減期", "ETF", "暴落", "新高",
    "今すぐ", "最後のチャンス", "100倍", "月まで", "買え", "絶対上がる", "逃すな",
    "養分", "靴磨き", "エアドロ", "ギブアウェイ", "爆益", "魔界", "銘柄", "アルト"
  ],
  ko: [
    "비트코인", "BTC", "암호화폐", "급등", "반등", "반감기", "ETF", "상승",
    "지금 사세요", "마지막 기회", "100배", "달까지", "폼핑", "놓치지", "급등주",
    "김프", "구조대", "가즈아", "떡상", "코인", "매수"
  ],
  es: [
    "bitcoin", "btc", "crypto", "pump", "moon", "sube", "oportunidad", "etf", "halving",
    "compra ya", "no te pierdas", "última oportunidad", "subida inminente", "a la luna", "pump en marcha", "gana con cripto",
    "estafa", "gemas"
  ],
  pt: [
    "bitcoin", "btc", "crypto", "pump", "lua", "alta", "etf", "halving",
    "última chance", "não perca", "compre agora", "pump agora", "lucro rápido", "vai explodir", "sinal vip", "cripto milionário"
  ],
  ar: [
    "bitcoin", "btc", "crypto", "pump", "moon",
    "بيتكوين", "البيتكوين", "كريبتو", "صعود", "فرصة", "سعر", "ارتفاع",
    "عملات رقمية", "عملات مشفرة", "تنصيف البيتكوين", "etf", "btc usd",
    "ضخ", "شراء الآن", "لا تفوت", "فرصة ذهبية", "استثمر الآن",
    "حلال", "نصب", "تداول", "توصية",
    "$BTC", "$ETH", "$SOL"
  ]
};

const SEARCH_WINDOW_MINUTES = Number(process.env.BUZZWEAVE_SEARCH_WINDOW_MIN || 30);
const SEARCH_QUERY_BUCKET_SIZE = Math.max(1, Number(process.env.BUZZWEAVE_QUERY_BUCKET_SIZE || 3));
const SEARCH_PAGES_PER_BUCKET = Math.max(1, Number(process.env.BUZZWEAVE_SEARCH_PAGES_PER_BUCKET || 3));
const SEARCH_QUERY_MAX_CHARS = Math.max(128, Number(process.env.BUZZWEAVE_SEARCH_QUERY_MAX_CHARS || 480));
const LOW_VOLUME_LANGS = new Set(
  String(process.env.BUZZWEAVE_LOW_VOLUME_LANGS || "ar,ko").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
);
const LOW_VOLUME_WINDOW_MINUTES = Math.max(
  SEARCH_WINDOW_MINUTES,
  Number(process.env.BUZZWEAVE_LOW_VOLUME_SEARCH_WINDOW_MIN || 60)
);
const LANGUAGE_WINDOW_OVERRIDE_MINUTES = {
  ar: Number(process.env.BUZZWEAVE_AR_WINDOW_MIN || 90)
};

function chunkArray(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function buildSearchQueries(lang) {
  const kw = SEARCH_KEYWORDS_BY_LANG[lang] || SEARCH_KEYWORDS_BY_LANG.en;
  const suffix = [`lang:${lang}`, "-is:retweet", "-is:reply"].join(" ");
  const buckets = chunkArray(kw, SEARCH_QUERY_BUCKET_SIZE);
  const queries = [];

  if (lang === "ar") {
    const arIds = process.env.BUZZWEAVE_AR_INFLUENCER_IDS;
    if (arIds && typeof arIds === "string") {
      const ids = arIds.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 10);
      if (ids.length) {
        const fromQuery = `(from:${ids.join(" OR from:")}) ${suffix}`.trim();
        if (fromQuery.length <= SEARCH_QUERY_MAX_CHARS) queries.push(fromQuery);
      }
    }
  }

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

  if (!queries.length) queries.push(`bitcoin ${suffix}`.trim());
  return Array.from(new Set(queries));
}

/**
 * search/recent で指定言語の投稿を取得。アフィリエイト候補調査・キュー補充用。
 * @param {string} slotLang - 言語コード (en, ja, es, pt, ar, ko)
 * @param {{ windowMinutes?: number, maxResults?: number, pagesPerBucket?: number, sortOrder?: string, queries?: string[], enableLowVolumeBackfill?: boolean }} options
 * @returns {Promise<{ data: object[], includes: { users: object[] }, queries: string[], slotLang: string, fatal402?: boolean, windowMinutesUsed?: number, lowVolumeBackfillUsed?: boolean }>}
 */
async function fetchCandidatesFromSearch(slotLang, options = {}) {
  const now = Date.now();
  const windowMin = Math.max(1, Number(options.windowMinutes ?? SEARCH_WINDOW_MINUTES));
  const queries = Array.isArray(options.queries) && options.queries.length
    ? options.queries
    : buildSearchQueries(slotLang);
  const pagesPerBucket = Math.max(1, Number(options.pagesPerBucket ?? SEARCH_PAGES_PER_BUCKET));
  const maxResults = Math.min(100, Math.max(10, Number(options.maxResults || 50)));
  const sortOrder = options.sortOrder || "recency";

  async function runSearchPass(currentWindowMin) {
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
          if (msg.includes("402")) {
            console.warn("[affiliateScoutSearch] search/recent 402 (Payment Required)", { slotLang });
            return { fatal402: true, data: [], usersById: {}, queryStats };
          }
          console.warn("[affiliateScoutSearch] search/recent error", { slotLang, message: msg.slice(0, 200) });
          break;
        }
      }
      queryStats.push({ query: query.slice(0, 80), pagesFetched });
    }

    const dedupMap = new Map();
    for (const post of allPosts) {
      if (post?.id && !dedupMap.has(post.id)) dedupMap.set(post.id, post);
    }
    return { fatal402: false, data: Array.from(dedupMap.values()), usersById, queryStats };
  }

  const slotLangKey = String(slotLang || "").toLowerCase();
  const allowLowVolumeBackfill = options.enableLowVolumeBackfill !== false;
  let windowsToTry = [windowMin];
  const langOverrideWindow = LANGUAGE_WINDOW_OVERRIDE_MINUTES[slotLangKey];
  if (allowLowVolumeBackfill && (langOverrideWindow || (LOW_VOLUME_LANGS.has(slotLangKey) && LOW_VOLUME_WINDOW_MINUTES > windowMin))) {
    const firstWindow = langOverrideWindow > 0 ? langOverrideWindow : LOW_VOLUME_WINDOW_MINUTES;
    if (firstWindow > windowMin) windowsToTry = [firstWindow, windowMin];
  }

  let passResult = null;
  let usedWindowMinutes = windowMin;
  for (const win of windowsToTry) {
    usedWindowMinutes = win;
    passResult = await runSearchPass(win);
    if (passResult?.fatal402) {
      return { data: [], includes: {}, queries, slotLang, fatal402: true, windowMinutesUsed: win };
    }
    if ((passResult?.data || []).length > 0) break;
  }

  const data = passResult?.data || [];
  const usersById = passResult?.usersById || {};
  return {
    data,
    includes: { users: Object.values(usersById) },
    queries,
    slotLang,
    windowMinutesUsed: usedWindowMinutes,
    lowVolumeBackfillUsed: windowsToTry.length > 1 && usedWindowMinutes !== windowsToTry[0]
  };
}

module.exports = {
  fetchCandidatesFromSearch,
  buildSearchQueries,
  SEARCH_KEYWORDS_BY_LANG
};
