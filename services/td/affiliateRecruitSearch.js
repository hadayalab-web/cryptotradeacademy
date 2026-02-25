/**
 * アフィリエイトリクルート用 X 検索のみ。引用リポスト・リプライは行わない。
 * fetchCandidatesFromSearch を提供（survey-affiliate-pool-by-lang.js および DM リクルートで利用）。
 */
const { searchPostsRecent } = require("../x/client");

// 検索: すでにアフィリエイター＋DMで案件募集中。ノイズは徹底排除（煽り系なし）。
const SEARCH_KEYWORDS_BY_LANG = {
  en: [
    "affiliate", "dm open", "open dm", "dm for collab", "dm for partnership", "looking for affiliate", "open to collab",
    "referral", "link in bio", "dm for link", "my link", "referral link", "whop affiliate",
    "bitcoin", "btc", "crypto", "etf", "halving"
  ],
  ja: [
    "アフィリエイト", "DM募集中", "DMで募集", "DMオープン", "案件募集中", "紹介パートナー募集",
    "紹介", "プロフィールにリンク", "DMでリンク", "紹介リンク", "whop",
    "ビットコイン", "BTC", "仮想通貨", "ETF", "半減期"
  ],
  ko: [
    "제휴", "DM 오픈", "DM으로 문의", "제휴 문의", "협찬 DM", "파트너십 DM",
    "리퍼럴", "프로필 링크", "DM으로 링크", "제휴 링크", "whop",
    "비트코인", "BTC", "암호화폐", "ETF", "반감기"
  ],
  es: [
    "afiliado", "dm abierto", "dm para colaborar", "busco afiliados", "colab por dm", "dm para parceria",
    "referido", "link en bio", "dm por link", "mi link", "link de referido", "whop",
    "bitcoin", "btc", "crypto", "etf", "halving"
  ],
  pt: [
    "afiliado", "dm aberto", "dm para parceria", "busco afiliados", "colab no dm", "parceria por dm",
    "indicado", "link na bio", "dm para link", "meu link", "link de indicação", "whop",
    "bitcoin", "btc", "crypto", "etf", "halving"
  ],
  ar: [
    "شراكة", "DM مفتوح", "DM للتعاون", "أبحث عن شركاء", "تعاون عبر DM",
    "إحالة", "الرابط في البايو", "DM للرابط", "رابط الإحالة", "whop",
    "بيتكوين", "كريبتو", "etf", "تنصيف"
  ]
};

/** アフィリエイトリクルート用: user.fields 拡張（スコアリングに必要。url＝リンクなしボーナス用） */
const AFFILIATE_RECRUIT_USER_FIELDS =
  "id,name,username,public_metrics,description,created_at,url";

const SEARCH_WINDOW_MINUTES = Number(process.env.BUZZWEAVE_SEARCH_WINDOW_MIN || 30);
const SEARCH_QUERY_BUCKET_SIZE = Math.max(1, Number(process.env.BUZZWEAVE_QUERY_BUCKET_SIZE || 3));
const SEARCH_PAGES_PER_BUCKET = Math.max(1, Number(process.env.BUZZWEAVE_SEARCH_PAGES_PER_BUCKET || 3));
const SEARCH_QUERY_MAX_CHARS = Math.max(128, Number(process.env.BUZZWEAVE_QUERY_MAX_CHARS || 480));
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
          const userFields =
            options.userFields === false ? undefined : options.userFields || AFFILIATE_RECRUIT_USER_FIELDS;
          const res = await searchPostsRecent(query, {
            maxResults,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            sortOrder,
            nextToken,
            ...(userFields ? { userFields } : {})
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
            console.warn("[affiliateRecruitSearch] search/recent 402 (Payment Required)", { slotLang });
            return { fatal402: true, data: [], usersById: {}, queryStats };
          }
          console.warn("[affiliateRecruitSearch] search/recent error", { slotLang, message: msg.slice(0, 200) });
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
