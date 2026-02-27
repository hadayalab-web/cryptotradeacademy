/**
 * アフィリエイトリクルート用 X 検索のみ。引用リポスト・リプライは行わない。
 * fetchOneSearchPage を run がループで利用。buildSearchQueries は 1 クエリ目を run が使用。
 */
const { searchPostsRecent } = require("../x/client");

// 検索: すでにアフィリエイターとして活動中。DM募集中は条件から外す。
// 並び: アフィリ・P2E・稼ぐ系を前、crypto を後（480字超過で末尾から削られるため）。
const SEARCH_KEYWORDS_BY_LANG = {
  en: [
    "affiliate", "referral", "link in bio", "my link", "referral link", "whop affiliate",
    "play to earn", "scholarship", "airdrop", "bounty hunter", "passive income", "side hustle",
    "bitcoin", "btc", "crypto", "etf", "halving"
  ],
  ja: [
    "アフィリエイト", "紹介", "プロフィールにリンク", "紹介リンク", "whop", "副業",
    "ビットコイン", "BTC", "仮想通貨", "ETF", "半減期"
  ],
  ko: [
    "제휴", "리퍼럴", "프로필 링크", "제휴 링크", "whop", "부업",
    "비트코인", "BTC", "암호화폐", "ETF", "반감기"
  ],
  es: [
    "afiliado", "referido", "link en bio", "mi link", "link de referido", "whop",
    "ganar dinero", "ingresos pasivos", "marketing de afiliados", "libertad financiera", "ingresos extra",
    "bitcoin", "btc", "crypto", "etf", "halving"
  ],
  pt: [
    "afiliado", "indicado", "link na bio", "meu link", "link de indicação", "whop",
    "ganhar dinheiro", "renda passiva", "marketing de afiliados", "renda extra",
    "bitcoin", "btc", "crypto", "etf", "halving"
  ],
  ar: [
    "شراكة", "إحالة", "الرابط في البايو", "رابط الإحالة", "whop", "دخل إضافي",
    "بيتكوين", "كريبتو", "etf", "تنصيف"
  ]
};

/** アフィリエイトリクルート用: user.fields 拡張（スコアリングに必要。url＝リンクなしボーナス用） */
const AFFILIATE_RECRUIT_USER_FIELDS =
  "id,name,username,public_metrics,description,created_at,url";

/** 検索窓の幅（分）。直近に投稿した人を狙うため短め。ヒット数と鮮度のバランスで 30 分をデフォルト。要調整時は BUZZWEAVE_SEARCH_WINDOW_MIN で上書き。 */
const SEARCH_WINDOW_MINUTES = Number(process.env.BUZZWEAVE_SEARCH_WINDOW_MIN || 30);
// 従来モード（AFFILIATE_RECRUIT_SINGLE_QUERY=0）時のみ使用。1 クエリが MAX_CHARS を超えないようバケット分割するときのサイズ。3 は 1 クエリに収まりやすい目安。通常は 1 言語 1 クエリのため未使用。env BUZZWEAVE_QUERY_BUCKET_SIZE で上書き可。
const SEARCH_QUERY_BUCKET_SIZE = Math.max(1, Number(process.env.BUZZWEAVE_QUERY_BUCKET_SIZE || 3));
// X API v2 GET /2/tweets/search/recent: Essential/Elevated でクエリ上限 512 文字。480 はその範囲内の安全値（env BUZZWEAVE_QUERY_MAX_CHARS で上書き可）。
const SEARCH_QUERY_MAX_CHARS = Math.max(128, Number(process.env.BUZZWEAVE_QUERY_MAX_CHARS || 480));
/** true なら 1 言語 1 クエリ（Read 最小化）。false なら従来のバケット分割 */
const SINGLE_QUERY_PER_LANG = process.env.AFFILIATE_RECRUIT_SINGLE_QUERY !== "0";

function chunkArray(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/**
 * 1 言語 1 クエリを組み立て（Read 最小化）。全キーワードを 1 つの OR にまとめ、文字数制限まで。
 * 引用符は使わず部分一致で拾い、候補を増やす。ノイズはスコアリングで落とす。
 */
function buildSearchQueriesSingle(lang) {
  const kw = SEARCH_KEYWORDS_BY_LANG[lang] || SEARCH_KEYWORDS_BY_LANG.en;
  const suffix = [`lang:${lang}`, "-is:retweet", "-is:reply"].join(" ");
  let terms = kw.map((k) => k);
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
    const terms = bucket.map((k) => k);
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
  const endTime = new Date(now - 30 * 1000); // 検索 API のインデックス遅延を避けるため直近 30 秒を除外
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

module.exports = {
  fetchOneSearchPage,
  buildSearchQueries,
  SEARCH_KEYWORDS_BY_LANG
};
