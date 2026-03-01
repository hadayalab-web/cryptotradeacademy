/**
 * アフィリエイトリクルート候補のスコアリングと除外
 *
 * フォーカス:
 * 1. すでにアフィリエイターとして活動中（DM募集中は廃止・Xの設定と一致しないため）
 * 2. ノイズになる条件は徹底排除
 * 3. 403 DM拒否は追いかけない（呼び出し元で 90 日再送しない）
 */
const {
  RECRUIT_ANGLE_KEYWORDS,
  normalizeRecruitAngle
} = require("../../config/affiliateRecruitConfig");

/** 煽り/hype 系キーワード。投稿に含まれるとリスク補正で減点するための観測用。 */
const HYPE_PAIN_KEYWORDS = [
  "pump",
  "moon",
  "100x",
  "get rich",
  "guaranteed",
  "risk free",
  "alpha calls",
  "signal provider",
  "casino",
  "爆益",
  "絶対上がる",
  "떡상",
  "급등",
  "lucro rapido",
  "dinero facil"
];

/** Bio キーワード（高意図）。 */
const BIO_KEYWORDS = [
  "affiliate",
  "affiliates",
  "referral",
  "partner",
  "partnership",
  "crypto",
  "side hustle",
  "side income",
  "online income",
  "creator economy",
  "growth",
  "marketing",
  "commission",
  "monetize",
  "monetise",
  "earn",
  "income",
  "btc",
  "bitcoin",
  "saas",
  "ai tools",
  "copywriting",
  "アフィリエイト",
  "副業",
  "成果報酬",
  "제휴",
  "부업",
  "afiliado",
  "afiliados",
  "afiliacao",
  "afiliados",
  "afiliado",
  "مسوق",
  "عمولة",
  "إحالة",
  "telegram",
  "discord",
  "whop",
  "gumroad",
  "clickbank",
  "linktree"
];

/** すでに紹介活動中の強シグナル。 */
const ACTIVE_AFFILIATE_KEYWORDS = [
  "link in bio",
  "link in my bio",
  "referral link",
  "affiliate link",
  "my referral",
  "promo code",
  "use my code",
  "commission",
  "partner link",
  "my link",
  "join via my link",
  "whop",
  "linktree",
  "beacons",
  "stan.store",
  "gumroad",
  "clickbank",
  "impact.com",
  "link below",
  "プロフィールにリンク",
  "紹介リンク",
  "成果報酬",
  "提携リンク",
  "프로필 링크",
  "제휴 링크",
  "추천 링크",
  "link en bio",
  "enlace de referido",
  "link na bio",
  "link de afiliado",
  "الرابط في البايو",
  "رابط الإحالة"
];

/** 「案件を探している」顕在需要シグナル。 */
const SEEKING_INTENT_KEYWORDS = [
  "looking for affiliate",
  "looking for partners",
  "open to collab",
  "dm open for collab",
  "seeking affiliates",
  "affiliate opportunities",
  "best affiliate program",
  "high ticket affiliate",
  "partner with",
  "アフィリエイト募集",
  "案件 募集",
  "提携先 募集",
  "提携募集",
  "コラボ募集",
  "제휴 모집",
  "파트너 모집",
  "콜라보 모집",
  "제휴 찾는 중",
  "busco programa de afiliados",
  "buscando afiliados",
  "colaboracion abierta",
  "dm abierto para colaboracion",
  "procuro programa de afiliados",
  "buscando afiliados",
  "parceria aberta",
  "dm aberto para parceria",
  "ابحث عن برنامج افلييت",
  "ابحث عن شراكة",
  "مفتوح للتعاون",
  "الرسائل مفتوحة للتعاون"
];

/** 低意図寄り（メディア/インフルエンサー運用）判定補助。 */
const INFLUENCER_PROFILE_KEYWORDS = [
  "influencer",
  "content creator",
  "youtuber",
  "streamer",
  "podcaster",
  "newsletter",
  "kol",
  "kols",
  "インフルエンサー",
  "クリエイター",
  "유튜버",
  "크리에이터",
  "influenciador",
  "creador de contenido",
  "criador de conteúdo",
  "صانع محتوى"
];

/** 競合・プラットフォーム: すでに販売/紹介を行っている強シグナル。 */
const COMPETITOR_PLATFORM_KEYWORDS = [
  "gumroad",
  "clickbank",
  "digistore24",
  "stan.store",
  "stan store",
  "whop",
  "linktree",
  "beacons",
  "koji",
  "systeme.io",
  "teachable",
  "kajabi"
];

/** 努力/行動系プロフィールキーワード。 */
const PROFILE_HUSTLE_KEYWORDS = [
  "hustle",
  "grind",
  "building",
  "learning",
  "improving",
  "trying",
  "day 1",
  "journey",
  "side hustle",
  "extra income",
  "online income",
  "aprendiendo",
  "empezando",
  "aprendendo",
  "iniciante",
  "시작합니다",
  "배우는 중",
  "오늘의",
  "初心者",
  "勉強中",
  "副業"
];

/** APIでは削れないノイズをプロフィール全域で除外。 */
const PROFILE_EXCLUDE_KEYWORDS = [
  "official",
  "news",
  "media",
  "bot",
  "support",
  "alert",
  "gov",
  "government",
  "ministry",
  "police",
  "department",
  "press",
  "staff",
  "customer support",
  "helpdesk",
  "公式",
  "速報",
  "広報",
  "ニュース",
  "ボット",
  "サポート",
  "정부",
  "공식",
  "뉴스",
  "봇",
  "suporte",
  "oficial",
  "noticias",
  "notícias",
  "soporte",
  "الرسمي",
  "أخبار",
  "دعم"
];

/** 投稿の行動ログキーワード。 */
const ACTION_LOG_KEYWORDS = [
  "today i",
  "today's",
  "day 1",
  "day 2",
  "progress",
  "learned",
  "did today",
  "what i did",
  "daily",
  "building in public",
  "shipping",
  "posted today",
  "wrote",
  "今日の",
  "学び",
  "作業",
  "進捗",
  "日次",
  "aprendi",
  "aprendí",
  "hoje aprendi",
  "empezando",
  "día 1",
  "dia 1",
  "오늘",
  "오늘의",
  "배움",
  "진행"
];

/** 検索言語 → 国係数 C。crConfig / cr-update のデフォルト用。並び順・除外には未使用。 */
const COEFFICIENT_BY_LANG = {
  en: 1.15,
  pt: 1.15,
  es: 1.1,
  ar: 1.0,
  ja: 1.0,
  ko: 1.0
};

/** リスク補正 R=0.6（高リスク）。 */
const RISK_KEYWORDS_06 = [
  "pump",
  "100x",
  "guaranteed profit",
  "risk free",
  "get rich quick",
  "casino",
  "signal provider",
  "free alpha",
  "airdrop hunter",
  "mlm"
];

/** リスク補正 R=0.8（グレー・注意） */
const RISK_KEYWORDS_08 = ["get rich", "moon", "gem", "alpha calls", "flip", "degen"];

/** BR（PT）用: Hotmart系詐欺商材 → R=0.6 */
const BR_HOTMART_KEYWORDS = [
  "hotmart", "eduzz", "monetizze", "produtor digital", "lançamento", "fórmula",
  "7 em 7", "6 em 7", "milionário"
];

const BASE_SCORE = 50;
const BONUS_COMPETITOR = 20;
const BONUS_SEEKING_INTENT = 15;
const BONUS_ACTIVE_AFFILIATE = 15;
const BONUS_BIO_MATCH = 10;
const BONUS_HUSTLE_ACTION = 5;

function normalizeText(value) {
  return String(value || "").toLowerCase();
}

function collectText(user, userTweets = []) {
  const description = String(user?.description || "");
  const username = String(user?.username || "");
  const name = String(user?.name || "");
  const url = String(user?.url || "");
  const tweetTexts = (userTweets || [])
    .map((t) => (typeof t?.text === "string" ? t.text : ""))
    .join(" ");
  return {
    description,
    username,
    name,
    url,
    descriptionLower: normalizeText(description),
    usernameLower: normalizeText(username),
    nameLower: normalizeText(name),
    urlLower: normalizeText(url),
    tweetTextsLower: normalizeText(tweetTexts),
    fullTextLower: normalizeText(`${name} ${username} ${description} ${url} ${tweetTexts}`)
  };
}

function findMatchedKeywords(text, keywords, maxMatches = 10) {
  const lower = normalizeText(text);
  const matched = [];
  for (const kw of keywords) {
    const needle = normalizeText(kw);
    if (!needle) continue;
    if (lower.includes(needle)) matched.push(kw);
    if (matched.length >= maxMatches) break;
  }
  return matched;
}

function scoreAnglesFromText(text) {
  const scores = {};
  for (const [angle, keywords] of Object.entries(RECRUIT_ANGLE_KEYWORDS || {})) {
    scores[angle] = findMatchedKeywords(text, keywords, 100).length;
  }
  return scores;
}

function pickBestAngle(angleScores, fallbackAngle = "crypto") {
  const entries = Object.entries(angleScores || {});
  if (!entries.length) return { angle: fallbackAngle, score: 0, tied: false };
  entries.sort((a, b) => b[1] - a[1]);
  const best = entries[0];
  const second = entries[1];
  const bestScore = Number(best?.[1] || 0);
  const secondScore = Number(second?.[1] || 0);
  const tied = Boolean(second && secondScore === bestScore && bestScore > 0);
  return {
    angle: normalizeRecruitAngle(best[0] || fallbackAngle),
    score: bestScore,
    secondScore,
    confidence: Math.max(0, bestScore - secondScore),
    tied
  };
}

/**
 * DM訴求軸を推定する。
 * 優先順: 投稿文（query意図） -> Bio（補正） -> default(crypto)
 */
function detectRecruitAngle(user, userTweets = []) {
  const text = collectText(user, userTweets);
  const queryScores = scoreAnglesFromText(text.tweetTextsLower);
  const bestQuery = pickBestAngle(queryScores);
  if (bestQuery.score > 0 && !bestQuery.tied) {
    return {
      angle: bestQuery.angle,
      recommendedAngle: bestQuery.angle,
      detectedVia: "query",
      angleConfidence: bestQuery.confidence,
      exploreEligible: bestQuery.confidence <= 1,
      angleScores: { query: queryScores, bio: null }
    };
  }

  const bioScores = scoreAnglesFromText(
    `${text.descriptionLower} ${text.nameLower} ${text.usernameLower}`
  );
  const bestBio = pickBestAngle(bioScores);
  if (bestBio.score > 0 && !bestBio.tied) {
    return {
      angle: bestBio.angle,
      recommendedAngle: bestBio.angle,
      detectedVia: "bio",
      angleConfidence: bestBio.confidence,
      exploreEligible: bestBio.confidence <= 1,
      angleScores: { query: queryScores, bio: bioScores }
    };
  }

  // 同点時は query -> bio の優先順で最初の有効角度を使う
  if (bestQuery.score > 0) {
    return {
      angle: bestQuery.angle,
      recommendedAngle: bestQuery.angle,
      detectedVia: "query",
      angleConfidence: bestQuery.confidence,
      exploreEligible: true,
      angleScores: { query: queryScores, bio: bioScores }
    };
  }
  if (bestBio.score > 0) {
    return {
      angle: bestBio.angle,
      recommendedAngle: bestBio.angle,
      detectedVia: "bio",
      angleConfidence: bestBio.confidence,
      exploreEligible: true,
      angleScores: { query: queryScores, bio: bioScores }
    };
  }

  return {
    angle: "crypto",
    recommendedAngle: "crypto",
    detectedVia: "default",
    angleConfidence: 0,
    exploreEligible: true,
    angleScores: { query: queryScores, bio: bioScores }
  };
}

/**
 * リスク補正 R（0.6 | 0.8 | 1.0）。プロフィール＋投稿から算出。
 * 0.6=怪しい、0.8=グレー、1.0=クリーン。
 */
function getRiskFactor(user, userTweets = [], lang) {
  const { fullTextLower } = collectText(user, userTweets);
  const risk06Matches = findMatchedKeywords(fullTextLower, RISK_KEYWORDS_06, 1);
  if (risk06Matches.length > 0) return 0.6;
  if (lang && String(lang).toLowerCase() === "pt") {
    const brRisk = findMatchedKeywords(fullTextLower, BR_HOTMART_KEYWORDS, 1);
    if (brRisk.length > 0) return 0.6;
  }
  const risk08Matches = findMatchedKeywords(fullTextLower, RISK_KEYWORDS_08, 1);
  if (risk08Matches.length > 0) return 0.8;
  return 1.0;
}

/** プロフィールにURLがあるか（NGリンク即除外・Priority用） */
function hasProfileLink(user) {
  const url = user?.url;
  if (url === undefined || url === null) return false;
  return typeof url === "string" && url.trim().length > 0;
}

/** NG（ナイジェリア）推定: プロフィールに nigeria/naija/lagos があるか */
function hasNigeriaKeyword(description) {
  if (!description || typeof description !== "string") return false;
  return /nigeria|naija|lagos/i.test(description);
}

function checkExclusions(user) {
  const metrics = user?.public_metrics || {};
  const followers = Number(metrics.followers_count) || 0;
  const following = Number(metrics.following_count) || 0;
  const text = collectText(user);
  const description = text.description.trim();

  if (followers === 0 && following === 0) {
    return { excluded: true, reason: "no_metrics" };
  }

  if (!description) {
    return { excluded: true, reason: "empty_bio" };
  }

  const excludeMatches = findMatchedKeywords(
    `${text.nameLower} ${text.usernameLower} ${text.descriptionLower}`,
    PROFILE_EXCLUDE_KEYWORDS,
    3
  );
  if (excludeMatches.length > 0) {
    return {
      excluded: true,
      reason: "profile_exclude_keywords",
      keyword: excludeMatches[0],
      matched: excludeMatches
    };
  }

  if (/(bot|news|support|alerts?)$/.test(text.usernameLower)) {
    return { excluded: true, reason: "username_noise_suffix" };
  }

  return { excluded: false };
}

function scoreBio(description) {
  const matches = findMatchedKeywords(description, BIO_KEYWORDS, 10).length;
  if (matches >= 3) return 1;
  if (matches >= 2) return 0.8;
  if (matches >= 1) return 0.4;
  return 0;
}

/** 努力系プロフィール。 */
function scoreHustleProfile(description) {
  return findMatchedKeywords(description, PROFILE_HUSTLE_KEYWORDS, 1).length > 0 ? 1 : 0;
}

/** 競合・プラットフォームの利用シグナル。 */
function scoreCompetitorPlatform(user) {
  const text = collectText(user);
  const combined = `${text.descriptionLower} ${text.urlLower}`;
  return findMatchedKeywords(combined, COMPETITOR_PLATFORM_KEYWORDS, 1).length > 0 ? 1 : 0;
}

/** 「案件探索中」を示す顕在需要シグナル。 */
function scoreSeekingIntent(user, userTweets = []) {
  const text = collectText(user, userTweets);
  const combined = `${text.descriptionLower} ${text.tweetTextsLower}`;
  const matches = findMatchedKeywords(combined, SEEKING_INTENT_KEYWORDS, 10).length;
  if (matches >= 2) return 1;
  if (matches >= 1) return 0.7;
  return 0;
}

/** メディア/インフルエンサー運用寄りの判定補助。 */
function scoreInfluencerProfile(description) {
  return findMatchedKeywords(description, INFLUENCER_PROFILE_KEYWORDS, 1).length > 0 ? 1 : 0;
}

/** リンクなし: プロフィールに URL がなければ 1（売るものがない＝動ける初心者ファイター強シグナル） */
function scoreNoLink(user) {
  const url = user?.url;
  if (url === undefined || url === null) return 1;
  if (typeof url !== "string" || !url.trim()) return 1;
  return 0;
}

/** 既存アフィリエイター: Bio に「link in bio」「dm for link」「referral link」「whop」等があれば 1。すでに紹介活動している層 */
function scoreActiveAffiliate(description) {
  const matches = findMatchedKeywords(description, ACTIVE_AFFILIATE_KEYWORDS, 10).length;
  if (matches >= 2) return 1;
  if (matches >= 1) return 0.7;
  return 0;
}

/** 行動ログ: 投稿に「今日の学び・作業・進捗」系の文言があれば 1 */
function scoreActionLog(userTweets = []) {
  const text = collectText(null, userTweets).tweetTextsLower;
  return findMatchedKeywords(text, ACTION_LOG_KEYWORDS, 1).length > 0 ? 1 : 0;
}

function scoreHypePain(userTweets = []) {
  const text = collectText(null, userTweets).tweetTextsLower;
  const matches = findMatchedKeywords(text, HYPE_PAIN_KEYWORDS, 10).length;
  if (matches >= 3) return 1;
  if (matches >= 1) return 0.5;
  return 0;
}

function computeCandidateScore(user, userTweets = [], lang = "en") {
  const angleDecision = detectRecruitAngle(user, userTweets);
  const exclusion = checkExclusions(user);
  const recommendedAngle = angleDecision.recommendedAngle || angleDecision.angle;
  const angleConfidence = Number.isFinite(Number(angleDecision.angleConfidence))
    ? Number(angleDecision.angleConfidence)
    : 0;
  const exploreEligible = Boolean(angleDecision.exploreEligible);
  if (exclusion.excluded) {
    return {
      score: 0,
      excluded: true,
      reason: exclusion.reason,
      angle: angleDecision.angle,
      recommendedAngle,
      angleConfidence,
      exploreEligible,
      detectedVia: angleDecision.detectedVia,
      isHighIntent: false,
      intentSegment: "excluded",
      breakdown: {
        angleScores: angleDecision.angleScores,
        exclusion
      }
    };
  }

  const text = collectText(user, userTweets);
  const competitorScore = scoreCompetitorPlatform(user);
  const seekingIntentScore = scoreSeekingIntent(user, userTweets);
  const activeAffiliateScore = scoreActiveAffiliate(text.descriptionLower);
  const bioScore = scoreBio(text.descriptionLower);
  const influencerProfileScore = scoreInfluencerProfile(text.descriptionLower);
  const hustleActionScore = Math.max(
    scoreHustleProfile(text.descriptionLower),
    scoreActionLog(userTweets)
  );
  const riskFactor = getRiskFactor(user, userTweets, lang);
  const isHighIntent = competitorScore >= 1 || seekingIntentScore >= 0.7;
  const intentSegment =
    competitorScore >= 1
      ? "competitor_users"
      : seekingIntentScore >= 0.7
        ? "active_seekers"
        : hustleActionScore >= 1 || activeAffiliateScore >= 0.7
          ? "hustlers"
          : influencerProfileScore >= 1
            ? "influencers"
            : "beginners";

  const bonusCompetitor = competitorScore * BONUS_COMPETITOR;
  const bonusSeekingIntent = seekingIntentScore * BONUS_SEEKING_INTENT;
  const bonusActiveAffiliate = activeAffiliateScore * BONUS_ACTIVE_AFFILIATE;
  const bonusBio = bioScore * BONUS_BIO_MATCH;
  const bonusHustleAction = hustleActionScore * BONUS_HUSTLE_ACTION;
  const rawScore =
    BASE_SCORE +
    bonusCompetitor +
    bonusSeekingIntent +
    bonusActiveAffiliate +
    bonusBio +
    bonusHustleAction;
  const weightedScore = rawScore * riskFactor;
  const score = Math.max(0, Math.min(100, Math.round(weightedScore)));

  if (score <= 0) {
    return {
      score: 0,
      excluded: true,
      reason: "score_zero",
      angle: angleDecision.angle,
      recommendedAngle,
      angleConfidence,
      exploreEligible,
      detectedVia: angleDecision.detectedVia,
      isHighIntent,
      intentSegment,
      breakdown: {
        base: BASE_SCORE,
        bonusCompetitor,
        bonusSeekingIntent,
        bonusActiveAffiliate,
        bonusBio,
        bonusHustleAction,
        riskFactor,
        angleScores: angleDecision.angleScores,
        isHighIntent,
        intentSegment
      }
    };
  }

  return {
    score,
    excluded: false,
    angle: angleDecision.angle,
    recommendedAngle,
    angleConfidence,
    exploreEligible,
    detectedVia: angleDecision.detectedVia,
    isHighIntent,
    intentSegment,
    breakdown: {
      base: BASE_SCORE,
      bonusCompetitor,
      bonusSeekingIntent,
      bonusActiveAffiliate,
      bonusBio,
      bonusHustleAction,
      riskFactor,
      rawScore: Math.round(rawScore * 100) / 100,
      weightedScore: Math.round(weightedScore * 100) / 100,
      angleScores: angleDecision.angleScores,
      isHighIntent,
      intentSegment,
      matched: {
        competitor: findMatchedKeywords(
          `${text.descriptionLower} ${text.urlLower}`,
          COMPETITOR_PLATFORM_KEYWORDS,
          3
        ),
        seekingIntent: findMatchedKeywords(
          `${text.descriptionLower} ${text.tweetTextsLower}`,
          SEEKING_INTENT_KEYWORDS,
          5
        ),
        activeAffiliate: findMatchedKeywords(text.descriptionLower, ACTIVE_AFFILIATE_KEYWORDS, 3),
        bio: findMatchedKeywords(text.descriptionLower, BIO_KEYWORDS, 5),
        hustleProfile: findMatchedKeywords(text.descriptionLower, PROFILE_HUSTLE_KEYWORDS, 3),
        actionLog: findMatchedKeywords(text.tweetTextsLower, ACTION_LOG_KEYWORDS, 3),
        influencerProfile: findMatchedKeywords(text.descriptionLower, INFLUENCER_PROFILE_KEYWORDS, 3)
      }
    }
  };
}

module.exports = {
  computeCandidateScore,
  detectRecruitAngle,
  checkExclusions,
  getRiskFactor,
  hasProfileLink,
  hasNigeriaKeyword,
  scoreBio,
  scoreHypePain,
  scoreHustleProfile,
  scoreCompetitorPlatform,
  scoreNoLink,
  scoreActiveAffiliate,
  scoreSeekingIntent,
  scoreInfluencerProfile,
  scoreActionLog,
  COEFFICIENT_BY_LANG,
  HYPE_PAIN_KEYWORDS,
  BIO_KEYWORDS,
  ACTIVE_AFFILIATE_KEYWORDS,
  ACTION_LOG_KEYWORDS,
  PROFILE_HUSTLE_KEYWORDS,
  PROFILE_EXCLUDE_KEYWORDS,
  COMPETITOR_PLATFORM_KEYWORDS,
  SEEKING_INTENT_KEYWORDS,
  INFLUENCER_PROFILE_KEYWORDS
};
