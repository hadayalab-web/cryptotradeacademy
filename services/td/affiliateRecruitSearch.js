/**
 * アフィリエイトリクルート用 X 検索のみ。引用リポスト・リプライは行わない。
 *
 * クエリの唯一の定義: docs/AFFILIATE_RECRUIT_BOOKMARK_SPEC.md §2（意図・式・2.3 group1/group2・2.4 ネガティブ）。
 * 以下の SEARCH_REQUIRED_GROUPS_BY_LANG は §2.3 と、SEARCH_NEGATIVE_* は §2.4 と完全一致させること。
 * 変更時は必ず仕様書を先に更新し、コードを同期する。
 */
const { searchPostsRecent } = require("../x/client");

/** §2.3 証拠語（group1）・プラットフォーム語（group2）。AND で結合。 */
const SEARCH_REQUIRED_GROUPS_BY_LANG = {
  en: [
    [
      "referral link",
      "affiliate link",
      "promo code",
      "discount code",
      "use my code",
      "link in bio",
      "sign up using",
      "my referral"
    ],
    [
      "clickbank",
      "shareasale",
      "awin",
      "rakuten advertising",
      "cj affiliate",
      "impact radius",
      "amazon associates"
    ]
  ],
  ja: [
    [
      "招待コード",
      "紹介コード",
      "プロモコード",
      "紹介リンク",
      "アフィリエイト",
      "プロフリンク",
      "プロフィールのリンク",
      "クーポンコード",
      "登録はこちら"
    ],
    [
      "a8.net",
      "afb",
      "バリューコマース",
      "アクセストレード",
      "楽天アフィリエイト",
      "amazonアソシエイト",
      "インフォトップ",
      "infotop",
      "tips",
      "brain"
    ]
  ],
  ko: [
    [
      "추천인 코드",
      "초대 코드",
      "가입 링크",
      "할인 코드",
      "프로모션 코드",
      "프로필 링크",
      "가입시",
      "제휴 링크"
    ],
    ["쿠팡 파트너스", "텐핑", "애드픽", "링크프라이스", "아마존 어소시에이트"]
  ],
  es: [
    [
      "código de referido",
      "mi código",
      "código de descuento",
      "enlace en mi bio",
      "link en bio",
      "enlace de afiliado",
      "regístrate con",
      "código promocional"
    ],
    ["hotmart", "clickbank", "awin", "amazon afiliados", "tradetracker", "admitad"]
  ],
  pt: [
    [
      "código de indicação",
      "use meu código",
      "cupom de desconto",
      "link na bio",
      "link de afiliado",
      "cadastre-se com",
      "código promocional",
      "meu cupom"
    ],
    ["hotmart", "monetizze", "eduzz", "braip", "amazon associados", "awin"]
  ],
  ar: [
    [
      "كود خصم",
      "رمز ترويجي",
      "رابط الإحالة",
      "استخدم كودي",
      "الرابط في البايو",
      "سجل من خلال",
      "كود الدعوة"
    ],
    ["عرب كليكس", "arabclicks", "أمازون أفلييت", "كليك بانك", "clickbank", "admitad"]
  ]
};

const SEARCH_KEYWORDS_BY_LANG = Object.fromEntries(
  Object.entries(SEARCH_REQUIRED_GROUPS_BY_LANG).map(([lang, groups]) => [lang, groups.flat()])
);

/** §2.4 全言語共通ネガティブ（解説・相談・依頼系） */
const SEARCH_NEGATIVE_COMMON_TERMS = ["what is", "how do i", "recommend me"];

/** §2.4 言語別ネガティブ。仕様書の表と完全一致させること。 */
const SEARCH_NEGATIVE_TERMS_BY_LANG = {
  en: [
    "colab",
    "collab",
    "hiring",
    "job",
    "agency",
    "looking for",
    "open to",
    "which one",
    "giveaway",
    "airdrop",
    "official",
    "news",
    "support",
    "sponsor"
  ],
  ja: [
    "案件募集",
    "募集中",
    "お仕事募集",
    "おすすめ教えて",
    "どれがいい",
    "何がおすすめ",
    "プレゼント企画",
    "プレゼント",
    "ギブアウェイ",
    "エアドロップ",
    "公式",
    "ニュース",
    "サポート",
    "コラボ",
    "PR依頼"
  ],
  ko: [
    "협찬 문의",
    "구인",
    "채용",
    "공식",
    "뉴스",
    "이벤트",
    "에어드랍",
    "리트윗",
    "팔로우",
    "콜라보",
    "협찬",
    "추천해줘",
    "뭐가 좋아",
    "어떤 게 좋아"
  ],
  es: [
    "colab",
    "busco trabajo",
    "busco",
    "agencia",
    "qué es",
    "cuál recomiendan",
    "sorteio",
    "giveaway",
    "airdrop",
    "oficial",
    "noticias",
    "soporte",
    "patrocinador",
    "trabajo"
  ],
  pt: [
    "colab",
    "vaga",
    "emprego",
    "agência",
    "agencia",
    "qual recomenda",
    "o que é",
    "sorteio",
    "giveaway",
    "airdrop",
    "oficial",
    "notícias",
    "noticias",
    "suporte",
    "patrocínio",
    "patrocinio"
  ],
  ar: [
    "توظيف",
    "وظيفة",
    "وكالة",
    "سحب",
    "giveaway",
    "airdrop",
    "رسمي",
    "أخبار",
    "دعم",
    "تعاون",
    "رعاية",
    "ما هو",
    "أي واحد",
    "انصحني"
  ]
};

/** §2.3 ニッチ絞り: crypto/trading 関連語（group3）。CryptoTrade Academy 案件に合うアフィに限定。AFFILIATE_RECRUIT_CRYPTO_NICHE=0 で無効（2軸のみ）。 */
const CRYPTO_NICHE_ENABLED = process.env.AFFILIATE_RECRUIT_CRYPTO_NICHE !== "0";
const CRYPTO_TRADING_TERMS_BY_LANG = {
  en: ["crypto", "trading", "bitcoin", "btc", "trader"],
  ja: ["仮想通貨", "ビットコイン", "トレード", "暗号資産", "マーケット"],
  ko: ["암호화폐", "비트코인", "트레이딩", "코인", "거래"],
  es: ["crypto", "trading", "bitcoin", "cripto", "trader"],
  pt: ["crypto", "trading", "bitcoin", "cripto", "trader"],
  ar: ["بيتكوين", "كريبتو", "تداول", "عملات", "سوق"]
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
/** §2.2 必須: group1 と group2 は AND のみ。OR はノイズのため使用しない。 */
const REQUIRED_GROUP_OPERATOR = "AND";
/** 少数ヒット時にも緩和フォールバックを発火させる閾値。0で無効。既定0＝フォールバックは使わない（緩和クエリはOR＋ネガティブなしのためガラクタ混入リスクあり）。 */
const LOW_HIT_FALLBACK_THRESHOLD = Math.max(
  0,
  Number(process.env.AFFILIATE_RECRUIT_LOW_HIT_FALLBACK_THRESHOLD || 0)
);

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

function renderQueryTerm(term) {
  const t = String(term || "").trim();
  if (!t) return "";
  return /\s/.test(t) ? `"${t}"` : t;
}

function renderNegativeQueryTerm(term) {
  const rendered = renderQueryTerm(term);
  return rendered ? `-${rendered}` : "";
}

function getSearchKeywords(lang) {
  const base = SEARCH_KEYWORDS_BY_LANG[lang] || SEARCH_KEYWORDS_BY_LANG.en;
  return uniqueList(base);
}

function getSearchSuffixParts(lang) {
  const negatives = SEARCH_NEGATIVE_TERMS_BY_LANG[lang] || SEARCH_NEGATIVE_TERMS_BY_LANG.en || [];
  const negativeTerms = uniqueList([...SEARCH_NEGATIVE_COMMON_TERMS, ...negatives]);
  return [
    `lang:${lang}`,
    "-is:retweet",
    "-is:reply",
    ...negativeTerms.map((term) => renderNegativeQueryTerm(term)).filter(Boolean)
  ];
}

/**
 * §2.2 に従い 1 言語 1 本の strict クエリを組み立て。(group1) AND (group2) [AND (group3)] + サフィックス。
 * group3 = crypto/trading ニッチ（有効時のみ）。§2.5: ヒットが閾値以下なら 1 回だけ緩和フォールバックを試す。
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
  if (CRYPTO_NICHE_ENABLED) {
    const cryptoTerms = uniqueList(CRYPTO_TRADING_TERMS_BY_LANG[lang] || CRYPTO_TRADING_TERMS_BY_LANG.en || []);
    if (cryptoTerms.length > 0) requiredGroups.push(cryptoTerms);
  }

  const kw = getSearchKeywords(lang);
  const requiredSet = new Set(requiredGroups.flat().map((v) => String(v).toLowerCase()));
  const optionalTerms = kw.filter((term) => !requiredSet.has(String(term).toLowerCase()));
  let suffixParts = getSearchSuffixParts(lang);

  const renderStrictQuery = () => {
    const joinToken = REQUIRED_GROUP_OPERATOR === "AND" ? " " : " OR ";
    const requiredExpr = requiredGroups
      .map((group) => `(${group.map((term) => renderQueryTerm(term)).filter(Boolean).join(" OR ")})`)
      .join(joinToken);
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
    // 各 group が 1 語ずつになっても長い場合のみネガティブを削る（根拠: 文字数制限のやむを得ない妥協。可能な限り group 削減で収める）
    if (suffixParts.length > 3) {
      suffixParts.pop();
      strictQuery = renderStrictQuery();
      continue;
    }
    break;
  }

  if (strictQuery.length > SEARCH_QUERY_MAX_CHARS) {
    const g1 = requiredGroups[0]?.[0] ? renderQueryTerm(requiredGroups[0][0]) : "affiliate";
    const g2 = requiredGroups[1]?.[0] ? renderQueryTerm(requiredGroups[1][0]) : "commission";
    const g3 = requiredGroups[2]?.[0] ? renderQueryTerm(requiredGroups[2][0]) : null;
    strictQuery = [g1, g2, g3, suffixParts.join(" ")].filter(Boolean).join(" ").trim();
  }

  // 緩和フォールバック（初回0件時のみ使用）: OR広め・negative無し
  const fallbackTerms = uniqueList([...requiredGroups.flat(), ...optionalTerms]);
  const fallbackSuffixParts = [`lang:${lang}`, "-is:retweet", "-is:reply"];
  while (fallbackTerms.length > 0) {
    const fallbackQuery = `(${fallbackTerms
      .map((term) => renderQueryTerm(term))
      .filter(Boolean)
      .join(" OR ")}) ${fallbackSuffixParts.join(" ")}`.trim();
    if (fallbackQuery.length <= SEARCH_QUERY_MAX_CHARS) {
      if (fallbackQuery !== strictQuery) return [strictQuery, fallbackQuery];
      return [strictQuery];
    }
    fallbackTerms.pop();
  }

  return [strictQuery];
}

/** 従来: バケット分割で複数クエリ。§2 に非準拠（OR のみで AND なし）。ガラクタ混入リスクあり。SINGLE_QUERY_PER_LANG=0 のときのみ。 */
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
    if (!options.nextToken) {
      console.log("[affiliate-recruit-search] query", {
        lang: slotLang,
        queryPreview: query.length > 200 ? query.slice(0, 200) + "…" : query
      });
    }
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
    const primaryHits = Array.isArray(primaryResult?.data) ? primaryResult.data.length : 0;

    // page1 が low-hit（既定 <=2件）以下のとき、緩和クエリを 1 回だけ試す（Read 追加は最小）
    if (
      !options.nextToken &&
      primaryHits <= LOW_HIT_FALLBACK_THRESHOLD &&
      !primaryResult?.nextToken &&
      Array.isArray(queries) &&
      queries.length > 1 &&
      queries[1]
    ) {
      const fallbackResult = await executeQuery(queries[1], null);
      const fallbackHits = Array.isArray(fallbackResult?.data) ? fallbackResult.data.length : 0;
      if (fallbackHits > 0 || fallbackResult?.nextToken) {
        const mergedById = new Map();
        const mergedUsersById = new Map();
        const primaryData = Array.isArray(primaryResult?.data) ? primaryResult.data : [];
        const fallbackData = Array.isArray(fallbackResult?.data) ? fallbackResult.data : [];
        for (const row of [...primaryData, ...fallbackData]) {
          if (!row?.id) continue;
          if (!mergedById.has(row.id)) mergedById.set(row.id, row);
        }
        const primaryUsers = Array.isArray(primaryResult?.includes?.users)
          ? primaryResult.includes.users
          : [];
        const fallbackUsers = Array.isArray(fallbackResult?.includes?.users)
          ? fallbackResult.includes.users
          : [];
        for (const user of [...primaryUsers, ...fallbackUsers]) {
          if (!user?.id) continue;
          if (!mergedUsersById.has(user.id)) mergedUsersById.set(user.id, user);
        }
        const mergedNextToken = fallbackResult?.nextToken || primaryResult?.nextToken || null;
        return {
          data: Array.from(mergedById.values()),
          includes: { users: Array.from(mergedUsersById.values()) },
          ...(mergedNextToken ? { nextToken: mergedNextToken } : {}),
          fallbackQueryUsed: true,
          primaryHits,
          fallbackHits
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
