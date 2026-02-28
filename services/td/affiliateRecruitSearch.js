/**
 * アフィリエイトリクルート用 X 検索のみ。引用リポスト・リプライは行わない。
 * fetchOneSearchPage を run がループで利用。buildSearchQueries は 1 クエリ目を run が使用。
 */
const { searchPostsRecent } = require("../x/client");

// 検索: すでにアフィリエイターとして活動中。DM募集中は条件から外す。
// 並び: 案件探索の高意図語を先頭（480字超過時は末尾から削られるため）。
const SEARCH_KEYWORDS_BY_LANG = {
  en: [
    "affiliate program", "partner program", "referral program", "revshare", "revenue share",
    "recurring commission", "lifetime commission", "high payout affiliate", "high ticket affiliate",
    "saas affiliate", "ai saas affiliate", "ai tool affiliate", "whop affiliate",
    "cpa offer", "cpl offer", "cps offer", "affiliate network", "influencer affiliate"
  ],
  ja: [
    "アフィリエイト案件", "アフィリエイト募集", "提携プログラム", "パートナープログラム", "紹介プログラム",
    "成果報酬", "リカーリング報酬", "継続報酬", "高単価アフィリエイト",
    "SaaSアフィリエイト", "AI SaaSアフィリエイト", "AIツールアフィリエイト", "Whopアフィリエイト",
    "CPA案件", "CPL案件", "CPS案件", "インフルエンサー案件", "紹介リンク"
  ],
  ko: [
    "제휴 프로그램", "파트너 프로그램", "추천 프로그램", "레브쉐어", "수익 쉐어",
    "리카링 수수료", "반복 수수료", "고수익 제휴", "고단가 제휴",
    "SaaS 제휴", "AI SaaS 제휴", "AI 툴 제휴", "Whop 제휴",
    "CPA 오퍼", "CPL 오퍼", "CPS 오퍼", "인플루언서 제휴", "제휴 링크"
  ],
  es: [
    "programa de afiliados", "oferta de afiliados", "programa de socios", "programa de referidos",
    "revshare", "revenue share", "comision recurrente", "comision de por vida",
    "afiliado alto payout", "afiliado saas", "afiliado ai saas", "afiliado herramientas ai",
    "whop afiliados", "oferta cpa", "oferta cpl", "oferta cps", "network de afiliados", "link de referido"
  ],
  pt: [
    "programa de afiliados", "oferta de afiliado", "programa de parceiros", "programa de indicacao",
    "revshare", "revenue share", "comissao recorrente", "comissao vitalicia",
    "afiliado alto payout", "afiliado saas", "afiliado ai saas", "afiliado ferramenta ai",
    "whop afiliado", "oferta cpa", "oferta cpl", "oferta cps", "rede de afiliados", "link de indicacao"
  ],
  ar: [
    "برنامج افلييت", "برنامج شراكة", "برنامج احالة", "عرض افلييت", "عمولة متكررة",
    "عمولة شهرية", "عمولة مدى الحياة", "ربح متكرر",
    "saas affiliate", "ai saas affiliate", "whop affiliate",
    "عرض cpa", "عرض cpl", "عرض cps", "network affiliate",
    "لينك احالة", "مسوق بالعمولة", "شريك احالة"
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
  const fallbackTerm = kw[0] || "affiliate program";
  return [`${fallbackTerm} ${suffix}`.trim()];
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

  if (!queries.length) {
    const fallbackTerm = kw[0] || "affiliate program";
    queries.push(`${fallbackTerm} ${suffix}`.trim());
  }
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
