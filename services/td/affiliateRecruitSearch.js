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

// 能動的な「案件探索中」シグナル。高意図候補を先に拾う。
const SEARCH_INTENT_ACTION_KEYWORDS_BY_LANG = {
  en: [
    "looking for affiliate",
    "open to collab",
    "dm open for collab",
    "affiliate opportunities",
    "best affiliate program"
  ],
  ja: ["アフィリエイト募集", "提携先 募集", "案件 募集", "コラボ募集", "案件探し"],
  ko: ["제휴 모집", "파트너 모집", "콜라보 모집", "제휴 찾는 중"],
  es: [
    "busco programa de afiliados",
    "buscando afiliados",
    "colaboracion abierta",
    "dm abierto para colaboracion"
  ],
  pt: [
    "procuro programa de afiliados",
    "buscando afiliados",
    "parceria aberta",
    "dm aberto para parceria"
  ],
  ar: ["ابحث عن برنامج افلييت", "ابحث عن شراكة", "مفتوح للتعاون", "الرسائل مفتوحة للتعاون"]
};

// 高意図2軸（必須）:
// - group1: すでに提携文脈にいる人
// - group2: 報酬/案件条件を探している人
// 1言語1クエリ時は group1 AND group2 を満たす投稿に寄せる。
const SEARCH_REQUIRED_GROUPS_BY_LANG = {
  en: [
    [
      "looking for affiliate",
      "open to collab",
      "affiliate program",
      "partner program",
      "referral program",
      "affiliate network"
    ],
    ["revshare", "revenue share", "recurring commission", "lifetime commission", "cpa offer", "cpl offer", "cps offer", "high payout affiliate", "high ticket affiliate", "whop affiliate"]
  ],
  ja: [
    ["アフィリエイト案件", "アフィリエイト募集", "提携先 募集", "提携プログラム", "パートナープログラム"],
    ["成果報酬", "リカーリング報酬", "継続報酬", "高単価アフィリエイト", "CPA案件", "CPL案件", "CPS案件", "Whopアフィリエイト"]
  ],
  ko: [
    ["제휴 모집", "콜라보 모집", "제휴 프로그램", "파트너 프로그램", "추천 프로그램"],
    ["레브쉐어", "수익 쉐어", "리카링 수수료", "반복 수수료", "고수익 제휴", "고단가 제휴", "CPA 오퍼", "CPL 오퍼", "CPS 오퍼", "Whop 제휴"]
  ],
  es: [
    ["busco programa de afiliados", "colaboracion abierta", "programa de afiliados", "programa de socios", "programa de referidos", "network de afiliados"],
    ["revshare", "revenue share", "comision recurrente", "comision de por vida", "oferta cpa", "oferta cpl", "oferta cps", "afiliado alto payout", "whop afiliados"]
  ],
  pt: [
    ["procuro programa de afiliados", "parceria aberta", "programa de afiliados", "programa de parceiros", "programa de indicacao", "rede de afiliados"],
    ["revshare", "revenue share", "comissao recorrente", "comissao vitalicia", "oferta cpa", "oferta cpl", "oferta cps", "afiliado alto payout", "whop afiliado"]
  ],
  ar: [
    ["ابحث عن برنامج افلييت", "مفتوح للتعاون", "برنامج افلييت", "برنامج شراكة", "برنامج احالة", "شريك احالة"],
    ["عمولة متكررة", "عمولة شهرية", "عمولة مدى الحياة", "ربح متكرر", "عرض cpa", "عرض cpl", "عرض cps", "whop affiliate"]
  ]
};

// ノイズ寄りの文脈を軽減（単語のみ。空白を含む語は避ける）
const SEARCH_NEGATIVE_COMMON_TERMS = ["bot", "official", "news", "support", "alert"];

const SEARCH_NEGATIVE_TERMS_BY_LANG = {
  en: ["giveaway", "airdrop", "casino"],
  ja: ["公式", "速報", "広報", "プレゼント", "ニュース", "無料"],
  ko: ["공식", "뉴스", "봇", "에어드랍", "무료", "증정"],
  es: ["oficial", "noticias", "bot", "sorteo", "airdrop", "gratis"],
  pt: ["oficial", "noticias", "notícias", "bot", "sorteio", "airdrop", "gratis"],
  ar: ["رسمي", "أخبار", "بوت", "ايردروب", "مجاني"]
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

function uniqueList(items) {
  const normalized = (items || [])
    .map((v) => String(v || "").trim())
    .filter(Boolean);
  return Array.from(new Set(normalized));
}

function getSearchKeywords(lang) {
  const base = SEARCH_KEYWORDS_BY_LANG[lang] || SEARCH_KEYWORDS_BY_LANG.en;
  const intent =
    SEARCH_INTENT_ACTION_KEYWORDS_BY_LANG[lang] ||
    SEARCH_INTENT_ACTION_KEYWORDS_BY_LANG.en ||
    [];
  return uniqueList([...intent, ...base]);
}

function getSearchSuffixParts(lang) {
  const negatives = SEARCH_NEGATIVE_TERMS_BY_LANG[lang] || SEARCH_NEGATIVE_TERMS_BY_LANG.en || [];
  const negativeTerms = uniqueList([...SEARCH_NEGATIVE_COMMON_TERMS, ...negatives]);
  return [
    `lang:${lang}`,
    "-is:retweet",
    "-is:reply",
    ...negativeTerms.map((term) => `-${term}`)
  ];
}

/**
 * 1 言語 1 クエリを組み立て（Read 最小化）。
 * - 第1クエリ: 高意図2軸（group1 AND group2）を必須化
 * - 第2クエリ: 0件時のみ使う緩和フォールバック（OR広め）
 */
function buildSearchQueriesSingle(lang) {
  const requiredGroupsRaw =
    SEARCH_REQUIRED_GROUPS_BY_LANG[lang] || SEARCH_REQUIRED_GROUPS_BY_LANG.en || [];
  let requiredGroups = requiredGroupsRaw.map((group) => uniqueList(group));
  if (requiredGroups.length < 2) {
    const kw = getSearchKeywords(lang);
    const mid = Math.max(1, Math.floor(kw.length / 2));
    requiredGroups = [kw.slice(0, mid), kw.slice(mid)];
  }

  const kw = getSearchKeywords(lang);
  const requiredSet = new Set(requiredGroups.flat().map((v) => String(v).toLowerCase()));
  const optionalTerms = kw.filter((term) => !requiredSet.has(String(term).toLowerCase()));
  let suffixParts = getSearchSuffixParts(lang);

  const renderStrictQuery = () => {
    const requiredExpr = requiredGroups
      .map((group) => `(${group.join(" OR ")})`)
      .join(" ");
    return [requiredExpr, suffixParts.join(" ")].filter(Boolean).join(" ").trim();
  };

  let strictQuery = renderStrictQuery();
  while (strictQuery.length > SEARCH_QUERY_MAX_CHARS) {
    let groupShrunk = false;
    for (let i = requiredGroups.length - 1; i >= 0; i -= 1) {
      if (requiredGroups[i].length > 1) {
        requiredGroups[i].pop();
        groupShrunk = true;
        break;
      }
    }
    if (groupShrunk) {
      strictQuery = renderStrictQuery();
      continue;
    }

    // 最後に negative を削って長さを収める（必須2軸は維持）
    if (suffixParts.length > 3) {
      suffixParts.pop();
      strictQuery = renderStrictQuery();
      continue;
    }
    break;
  }

  if (strictQuery.length > SEARCH_QUERY_MAX_CHARS) {
    const fallbackIntent = requiredGroups[0]?.[0] || "affiliate program";
    const fallbackOffer = requiredGroups[1]?.[0] || "commission";
    const fallbackSuffix = [`lang:${lang}`, "-is:retweet", "-is:reply"].join(" ");
    strictQuery = `(${fallbackIntent}) (${fallbackOffer}) ${fallbackSuffix}`.trim();
  }

  // 緩和フォールバック（初回0件時のみ使用）: OR広め・negative無し
  const fallbackTerms = uniqueList([...requiredGroups.flat(), ...optionalTerms]);
  const fallbackSuffixParts = [`lang:${lang}`, "-is:retweet", "-is:reply"];
  while (fallbackTerms.length > 0) {
    const fallbackQuery = `(${fallbackTerms.join(" OR ")}) ${fallbackSuffixParts.join(" ")}`.trim();
    if (fallbackQuery.length <= SEARCH_QUERY_MAX_CHARS) {
      if (fallbackQuery !== strictQuery) return [strictQuery, fallbackQuery];
      return [strictQuery];
    }
    fallbackTerms.pop();
  }

  return [strictQuery];
}

/** 従来: バケット分割で複数クエリ（Read 多め） */
function buildSearchQueriesBucketed(lang) {
  const kw = getSearchKeywords(lang);
  const suffix = getSearchSuffixParts(lang).join(" ");
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
    const executeQuery = async (queryString, nextTokenValue) => {
      const res = await searchPostsRecent(queryString, {
        maxResults,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        sortOrder: options.sortOrder || "recency",
        nextToken: nextTokenValue || undefined,
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
    };

    const primaryResult = await executeQuery(query, options.nextToken);

    // page1 が 0 件のときだけ、緩和クエリを 1 回だけ試す（Read 追加を最小化）
    if (
      !options.nextToken &&
      (!primaryResult?.data || primaryResult.data.length === 0) &&
      !primaryResult?.nextToken &&
      Array.isArray(queries) &&
      queries.length > 1 &&
      queries[1]
    ) {
      const fallbackResult = await executeQuery(queries[1], null);
      if ((fallbackResult?.data && fallbackResult.data.length > 0) || fallbackResult?.nextToken) {
        return {
          ...fallbackResult,
          fallbackQueryUsed: true
        };
      }
    }

    return primaryResult;
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
