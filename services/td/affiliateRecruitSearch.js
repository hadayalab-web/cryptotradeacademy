/**
 * アフィリエイトリクルート用 X 検索のみ。引用リポスト・リプライは行わない。
 * fetchCandidatesFromSearch を提供（survey-affiliate-pool-by-lang.js および DM リクルートで利用）。
 */
const { searchPostsRecent } = require("../x/client");

// 検索: すでにアフィリエイターとして活動中。DM募集中は条件から外す（XのDM設定と一致しないため）。
// es/pt: LatAm 稼ぐ系（ganar dinero, ingresos pasivos 等）。en: APAC P2E 系（play to earn, scholarship 等）。
// 並び順: 戦略キーワード（アフィリ・P2E・稼ぐ系）を前に、crypto 系を後ろに。480字超過時は末尾から削られるため、戦略キーワードが残る。
// id を言語スロットで追加する場合: affiliateRecruitConfig / cron / affiliateRecruitDmTemplates / run の stats を要追加。
const SEARCH_KEYWORDS_BY_LANG = {
  en: [
    "affiliate", "referral", "link in bio", "my link", "referral link", "whop affiliate",
    "play to earn", "scholarship", "airdrop", "bounty hunter",
    "bitcoin", "btc", "crypto", "etf", "halving"
  ],
  ja: [
    "アフィリエイト", "紹介", "プロフィールにリンク", "紹介リンク", "whop",
    "ビットコイン", "BTC", "仮想通貨", "ETF", "半減期"
  ],
  ko: [
    "제휴", "리퍼럴", "프로필 링크", "제휴 링크", "whop",
    "비트코인", "BTC", "암호화폐", "ETF", "반감기"
  ],
  es: [
    "afiliado", "referido", "link en bio", "mi link", "link de referido", "whop",
    "ganar dinero", "ingresos pasivos", "marketing de afiliados", "libertad financiera",
    "bitcoin", "btc", "crypto", "etf", "halving"
  ],
  pt: [
    "afiliado", "indicado", "link na bio", "meu link", "link de indicação", "whop",
    "ganhar dinheiro", "renda passiva", "marketing de afiliados",
    "bitcoin", "btc", "crypto", "etf", "halving"
  ],
  ar: [
    "شراكة", "إحالة", "الرابط في البايو", "رابط الإحالة", "whop",
    "بيتكوين", "كريبتو", "etf", "تنصيف"
  ]
};

/** アフィリエイトリクルート用: user.fields 拡張（スコアリングに必要。url＝リンクなしボーナス用） */
const AFFILIATE_RECRUIT_USER_FIELDS =
  "id,name,username,public_metrics,description,created_at,url";

const SEARCH_WINDOW_MINUTES = Number(process.env.BUZZWEAVE_SEARCH_WINDOW_MIN || 30);
const SEARCH_QUERY_BUCKET_SIZE = Math.max(1, Number(process.env.BUZZWEAVE_QUERY_BUCKET_SIZE || 3));
// Read 抑制: 1 クエリで多ページ取得するためデフォルト 8（候補数を確保し Create を伸ばす）
const SEARCH_PAGES_PER_BUCKET = Math.max(1, Number(process.env.BUZZWEAVE_SEARCH_PAGES_PER_BUCKET || 8));
const SEARCH_QUERY_MAX_CHARS = Math.max(128, Number(process.env.BUZZWEAVE_QUERY_MAX_CHARS || 480));
/** true なら 1 言語 1 クエリ（Read 最小化）。false なら従来のバケット分割 */
const SINGLE_QUERY_PER_LANG = process.env.AFFILIATE_RECRUIT_SINGLE_QUERY !== "0";
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

/**
 * 1 言語 1 クエリを組み立て（Read 最小化）。全キーワードを 1 つの OR にまとめ、文字数制限まで。
 */
function buildSearchQueriesSingle(lang) {
  const kw = SEARCH_KEYWORDS_BY_LANG[lang] || SEARCH_KEYWORDS_BY_LANG.en;
  const suffix = [`lang:${lang}`, "-is:retweet", "-is:reply"].join(" ");
  let terms = kw.map((k) => (k.includes(" ") ? `"${k}"` : k));
  while (terms.length > 0) {
    const query = `(${terms.join(" OR ")}) ${suffix}`.trim();
    if (query.length <= SEARCH_QUERY_MAX_CHARS) return [query];
    terms.pop();
  }
  return [`bitcoin ${suffix}`.trim()];
}

/** 従来: バケット分割で複数クエリ（Read 多め） */
function buildSearchQueriesBucketed(lang) {
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

function buildSearchQueries(lang) {
  return SINGLE_QUERY_PER_LANG ? buildSearchQueriesSingle(lang) : buildSearchQueriesBucketed(lang);
}

/**
 * 1 クエリで 1 ページだけ取得し、nextToken を返す。Read 抑制用（ラン側で必要になるまで次のページを呼ばない）。
 * @param {string} slotLang - 言語
 * @param {{ nextToken?: string, maxResults?: number, windowMinutes?: number }} [options]
 * @returns {Promise<{ data: object[], includes: { users: object[] }, nextToken?: string, fatal402?: boolean }>}
 */
async function fetchOneSearchPage(slotLang, options = {}) {
  const queries = buildSearchQueries(slotLang);
  const query = queries && queries[0];
  if (!query) {
    return { data: [], includes: { users: [] } };
  }
  const now = Date.now();
  const windowMin = Math.max(1, Number(options.windowMinutes ?? SEARCH_WINDOW_MINUTES));
  const endTime = new Date(now - 30 * 1000);
  const startTime = new Date(now - windowMin * 60 * 1000);
  const maxResults = Math.min(100, Math.max(10, Number(options.maxResults || 30)));

  try {
    const res = await searchPostsRecent(query, {
      maxResults,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      sortOrder: options.sortOrder || "recency",
      nextToken: options.nextToken || undefined,
      userFields: options.userFields === false ? undefined : options.userFields || AFFILIATE_RECRUIT_USER_FIELDS
    });
    const pageData = Array.isArray(res?.data) ? res.data : [];
    const users = res?.includes?.users || [];
    const nextToken = res?.meta?.next_token || null;
    return {
      data: pageData,
      includes: { users },
      ...(nextToken ? { nextToken } : {})
    };
  } catch (e) {
    const msg = String(e?.message || "");
    if (msg.includes("402")) {
      return { data: [], includes: { users: [] }, fatal402: true };
    }
    throw e;
  }
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
  fetchOneSearchPage,
  buildSearchQueries,
  SEARCH_KEYWORDS_BY_LANG
};
