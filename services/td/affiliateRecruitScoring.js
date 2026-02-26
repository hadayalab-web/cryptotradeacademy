/**
 * アフィリエイトリクルート候補のスコアリングと除外
 *
 * フォーカス:
 * 1. すでにアフィリエイターとして活動中（DM募集中は廃止・Xの設定と一致しないため）
 * 2. ノイズになる条件は徹底排除
 * 3. 403 DM拒否は追いかけない（呼び出し元で 90 日再送しない）
 */

/** 煽り/hype 系キーワード。投稿に含まれると「痛みを抱える候補」としてボーナス（隠された敵戦略） */
const HYPE_PAIN_KEYWORDS = [
  "pump", "moon", "100x", "don't miss", "last chance", "buy now", "to the moon", "gem", "alpha", "dyor",
  "affiliate", "referral", "signals", "course", "vip", "alpha pass",
  "乗り遅れるな", "今すぐ", "買え", "絶対上がる", "逃すな", "爆益", "魔界", "アフィリエイト", "シグナル",
  "급등", "마지막 기회", "지금 사세요", "폼핑", "가즈아", "떡상", "제휴", "시그널",
  "compra ya", "no te pierdas", "última oportunidad", "sube", "a la luna", "afiliado", "señales",
  "compre agora", "não perca", "última chance", "lucro rápido", "vai explodir", "sinais",
  "شراء الآن", "لا تفوت", "فرصة", "ضخ", "صعود", "إشارات", "شراكة"
];

/** Bio キーワード（アフィリエイト・クリプト系）。2+で高得点 */
const BIO_KEYWORDS = [
  "affiliate",
  "crypto",
  "trading",
  "btc",
  "bitcoin",
  "signals",
  "whale",
  "passive",
  "income",
  "earn",
  "liquidity",
  "whop",
  "linktree",
  "telegram",
  "discord"
];

/** フォーカス1: すでにアフィリエイターとして活動中（Bio に含まれると高スコア）。DM募集中は廃止（Xの設定と一致しないため） */
const ACTIVE_AFFILIATE_KEYWORDS = [
  "link in bio",
  "link in my bio",
  "referral link",
  "my link",
  "affiliate link",
  "whop",
  "linktree",
  "link below",
  "プロフィールにリンク",
  "紹介リンク",
  "프로필 링크",
  "제휴 링크",
  "link en bio",
  "link na bio",
  "الرابط في البايو",
  "رابط الإحالة"
];

/** 競合・プラットフォーム: Bio または URL に含まれると「すでに商材を扱っている」強シグナル（Whop 戦略） */
const COMPETITOR_PLATFORM_KEYWORDS = [
  "gumroad", "clickbank", "digistore24", "stan store", "linktree", "discord", "telegram"
];

/** 泥臭さ・努力系プロフィールキーワード。DM募集中系は廃止（dm open / open dm / dm abierto 削除） */
const PROFILE_HUSTLE_KEYWORDS = [
  "hustle", "grind", "affiliate", "make money", "side income",
  "entrepreneur", "building", "learning", "improving", "trying", "beginner", "new journey",
  "side hustle", "extra income", "online income",
  "afiliado", "renda extra", "dinero", "ingresos",
  "aprendiendo", "empezando", "aprendendo", "iniciante",
  "시작합니다", "배우는 중", "부업",
  "初心者", "勉強中", "副業"
];

/** 除外: 動かない・詐欺系のみ（フォーカス3: ノイズ徹底排除） */
const PROFILE_EXCLUDE_KEYWORDS = [
  "growth hacker", "seo expert", "consultant", "coach", "agency owner", "mentor", "guru",
  "forex trader", "mlm"
];

/** 行動ログ系キーワード（投稿に含まれると初心者ファイターの証拠 — FIGHTER_CONDITIONS / BRICS） */
const ACTION_LOG_KEYWORDS = [
  "today i", "today's", "day 1", "day 2", "progress", "learned", "did today", "what i did",
  "daily", "building in public", "shipping", "posted today", "wrote",
  "今日の", "学び", "作業", "進捗", "反省", "日次",
  "aprendí", "hoje aprendi", "empezando día", "día 1",
  "오늘", "오늘의", "배움", "진행"
];

/** 除外: FF比の閾値（followers/following） */
const FF_RATIO_MAX = 10;
const FF_RATIO_MIN = 0.1;

/** 除外: アカウント年齢（日数） */
const MIN_ACCOUNT_AGE_DAYS = 180;

/** 除外: 低ER・高フォロワー（followers > 10k AND ER < 0.05%） */
const LOW_ER_FOLLOWERS_THRESHOLD = 10000;
const LOW_ER_PCT_THRESHOLD = 0.05;

/** ミッドティア最適帯（フォロワー数） */
const OPTIMAL_FOLLOWERS_MIN = 1000;
const OPTIMAL_FOLLOWERS_MAX = 50000;

/** 泥臭いゾーン（100–3000は最も動く層。この帯にボーナス） */
const HUSTLE_ZONE_FOLLOWERS_MIN = 100;
const HUSTLE_ZONE_FOLLOWERS_MAX = 3000;

/** 初心者ファイターゾーン（30–1500は伸びたい初心者ファイターの密集帯 — FIGHTER_CONDITIONS） */
const BEGINNER_FIGHTER_ZONE_MIN = 30;
const BEGINNER_FIGHTER_ZONE_MAX = 1500;

/** マイクロ・ナノインフルエンサー帯（1K〜10K: Whop 商材と親和性が高い） */
const MICRO_NANO_FOLLOWERS_MIN = 1000;
const MICRO_NANO_FOLLOWERS_MAX = 10000;

/**
 * 地域係数（国別）。検索言語＝その国の候補とみなして C を掛ける。
 * BRICS＋周辺の「最初に攻める国」優先度に合わせた設計。
 */
const REGION_COEFFICIENT = {
  IN: 1.2,
  PH: 1.2,
  BR: 1.15,
  MX: 1.1,
  VN: 1.05,
  NG: 1.0,
  CO: 1.0,
  SA: 1.0,
  RU: 0.9,
  ZA: 0.9
};

/** 検索言語 → 国係数 C（EN=IN/PH混合等）。Priority = S×C×L×R で使用 */
const COEFFICIENT_BY_LANG = {
  en: 1.15,
  pt: 1.15,
  es: 1.1,
  ar: 1.0,
  ja: 1.0,
  ko: 1.0
};

/** リスク補正 R=0.6（怪しい・ほぼ除外）。crypto signals は廃止（アフィリエイターと被る） */
const RISK_KEYWORDS_06 = [
  "forex trader", "mlm",
  "religion", "god", "jesus", "allah", "politics", "conservative", "liberal", "patriot",
  "freedom fighter", "resistance", "jihad", "martyr", "army", "military", "soldier"
];

/** リスク補正 R=0.8（グレー・注意） */
const RISK_KEYWORDS_08 = ["get rich", "make $100/day", "investing", "entrepreneur"];

/** BR（PT）用: Hotmart系詐欺商材 → R=0.6 */
const BR_HOTMART_KEYWORDS = [
  "hotmart", "eduzz", "monetizze", "produtor digital", "lançamento", "fórmula",
  "7 em 7", "6 em 7", "milionário"
];

/** スコアウェイト。フォーカス4本柱に合わせノイズは0（hype/action_log/consistency/pain/no_link/beginner_zone） */
const WEIGHT_ER = 0.08;
const WEIGHT_BIO = 0.2;
const WEIGHT_FOLLOWERS = 0.2;
const WEIGHT_HYPE_PAIN = 0;
const WEIGHT_HUSTLE_PROFILE = 0.06;
const WEIGHT_HUSTLE_ZONE = 0.06;
const WEIGHT_BEGINNER_ZONE = 0;
const WEIGHT_NO_LINK = 0;
const WEIGHT_ACTION_LOG = 0;
const WEIGHT_CONSISTENCY = 0;
const WEIGHT_PAIN_ACTION = 0;
const WEIGHT_ACTIVE_AFFILIATE = 0.4;
const WEIGHT_COMPETITOR_PLATFORM = 0.1;
const WEIGHT_MICRO_NANO = 0.06;

/**
 * 検索言語から国係数 C を返す。Priority = S×C×L×R で使用。
 * 検索言語＝その国の候補とみなす運用。
 */
function getRegionCoefficientByLang(lang) {
  if (!lang || typeof lang !== "string") return 1.0;
  const key = lang.toLowerCase().trim();
  return COEFFICIENT_BY_LANG[key] ?? 1.0;
}

/**
 * リスク補正 R（0.6 | 0.8 | 1.0）。プロフィール＋投稿から算出。
 * 0.6=怪しい、0.8=グレー、1.0=クリーン。
 */
function getRiskFactor(user, userTweets = [], lang) {
  const desc = (user?.description || "").toLowerCase();
  const tweetTexts = (userTweets || [])
    .map((t) => (typeof t?.text === "string" ? t.text : ""))
    .join(" ")
    .toLowerCase();
  const text = `${desc} ${tweetTexts}`;

  for (const kw of RISK_KEYWORDS_06) {
    if (text.includes(kw.toLowerCase())) return 0.6;
  }
  if (lang && String(lang).toLowerCase() === "pt") {
    for (const kw of BR_HOTMART_KEYWORDS) {
      if (text.includes(kw.toLowerCase())) return 0.6;
    }
  }
  for (const kw of RISK_KEYWORDS_08) {
    if (text.includes(kw.toLowerCase())) return 0.8;
  }
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

function checkExclusions(user, erPct) {
  const metrics = user?.public_metrics || {};
  const followers = Number(metrics.followers_count) || 0;
  const following = Number(metrics.following_count) || 0;
  const description = (user?.description || "").trim();

  if (followers === 0 && following === 0) {
    return { excluded: true, reason: "no_metrics" };
  }

  const ffRatio = following > 0 ? followers / following : followers;
  if (ffRatio > FF_RATIO_MAX) {
    return { excluded: true, reason: "ff_ratio_high", value: ffRatio.toFixed(1) };
  }
  if (followers > 0 && ffRatio < FF_RATIO_MIN) {
    return { excluded: true, reason: "ff_ratio_low", value: ffRatio.toFixed(3) };
  }

  const created = user?.created_at;
  if (created) {
    const ageMs = Date.now() - new Date(created).getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    if (ageDays < MIN_ACCOUNT_AGE_DAYS) {
      return { excluded: true, reason: "account_too_new", days: Math.floor(ageDays) };
    }
  }

  if (!description) {
    return { excluded: true, reason: "empty_bio" };
  }

  const descLower = description.toLowerCase();
  for (const kw of PROFILE_EXCLUDE_KEYWORDS) {
    if (descLower.includes(kw.toLowerCase())) {
      return { excluded: true, reason: "profile_exclude_keywords", keyword: kw };
    }
  }

  if (
    erPct !== undefined &&
    followers > LOW_ER_FOLLOWERS_THRESHOLD &&
    erPct < LOW_ER_PCT_THRESHOLD
  ) {
    return {
      excluded: true,
      reason: "low_er_high_followers",
      er: erPct.toFixed(3),
      followers
    };
  }

  return { excluded: false };
}

function scoreBio(description) {
  const text = (description || "").toLowerCase();
  let matches = 0;
  for (const kw of BIO_KEYWORDS) {
    if (text.includes(kw.toLowerCase())) matches += 1;
  }
  if (matches === 0) return 0;
  if (matches >= 2) return 1;
  return 0.5;
}

function scoreFollowers(followers) {
  if (followers <= 0) return 0;
  const log = Math.log10(Math.max(1, followers));
  if (followers >= OPTIMAL_FOLLOWERS_MIN && followers <= OPTIMAL_FOLLOWERS_MAX) {
    return 1;
  }
  if (followers < OPTIMAL_FOLLOWERS_MIN) {
    return Math.max(0, log / Math.log10(OPTIMAL_FOLLOWERS_MIN));
  }
  const maxLog = Math.log10(200000);
  return Math.max(0, 1 - (log - Math.log10(OPTIMAL_FOLLOWERS_MAX)) / (maxLog - Math.log10(OPTIMAL_FOLLOWERS_MAX)));
}

/** 泥臭さプロフィール: hustle / affiliate / DM open 等が含まれると 1 */
function scoreHustleProfile(description) {
  const text = (description || "").toLowerCase();
  for (const kw of PROFILE_HUSTLE_KEYWORDS) {
    if (text.includes(kw.toLowerCase())) return 1;
  }
  return 0;
}

/** 泥臭いゾーン: フォロワー 100〜3000 なら 1（最も動く層） */
function scoreHustleZone(followers) {
  if (followers >= HUSTLE_ZONE_FOLLOWERS_MIN && followers <= HUSTLE_ZONE_FOLLOWERS_MAX) return 1;
  return 0;
}

/** 初心者ファイターゾーン: フォロワー 30〜1500 なら 1（伸びたい初心者ファイターの密集帯） */
function scoreBeginnerZone(followers) {
  if (followers >= BEGINNER_FIGHTER_ZONE_MIN && followers <= BEGINNER_FIGHTER_ZONE_MAX) return 1;
  return 0;
}

/** マイクロ・ナノ帯: フォロワー 1K〜10K なら 1（Whop 商材とコンバージョン率が高い層） */
function scoreMicroNanoZone(followers) {
  if (followers >= MICRO_NANO_FOLLOWERS_MIN && followers <= MICRO_NANO_FOLLOWERS_MAX) return 1;
  return 0;
}

/** 競合・プラットフォーム: description または url に Gumroad / ClickBank / Discord / Telegram 等があれば 1 */
function scoreCompetitorPlatform(user) {
  const desc = (user?.description || "").toLowerCase();
  const url = (user?.url || "").toLowerCase();
  const combined = `${desc} ${url}`;
  for (const kw of COMPETITOR_PLATFORM_KEYWORDS) {
    if (combined.includes(kw.toLowerCase())) return 1;
  }
  return 0;
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
  if (!description || typeof description !== "string") return 0;
  const text = description.toLowerCase();
  let matches = 0;
  for (const kw of ACTIVE_AFFILIATE_KEYWORDS) {
    if (text.includes(kw.toLowerCase())) matches += 1;
  }
  if (matches >= 2) return 1;
  if (matches >= 1) return 0.7;
  return 0;
}

/** 行動ログ: 投稿に「今日の学び・作業・進捗」系の文言があれば 1 */
function scoreActionLog(userTweets = []) {
  const texts = (userTweets || [])
    .map((t) => (typeof t?.text === "string" ? t.text : ""))
    .join(" ")
    .toLowerCase();
  if (!texts) return 0;
  for (const kw of ACTION_LOG_KEYWORDS) {
    if (texts.includes(kw.toLowerCase())) return 1;
  }
  return 0;
}

/**
 * 擬似・継続力スコア（タイムラインからの近似）
 * 反応ゼロでも投稿継続・日付のばらつきを見る。7日分が取れない前提の近似。
 */
function scoreConsistencyFromRecentTweets(userTweets = []) {
  const tweets = userTweets || [];
  if (tweets.length < 2) return 0;
  const days = new Set();
  let lowEngagementCount = 0;
  for (const t of tweets) {
    const created = t?.created_at;
    if (created) {
      const day = created.slice(0, 10);
      days.add(day);
    }
    const likes = Number(t?.public_metrics?.like_count) ?? 0;
    if (likes <= 3) lowEngagementCount += 1;
  }
  const uniqueDays = days.size;
  const daySpreadNorm = uniqueDays >= 3 ? 1 : uniqueDays >= 2 ? 0.7 : uniqueDays >= 1 ? 0.3 : 0;
  const lowEngagementRatio = Math.min(1, lowEngagementCount / tweets.length);
  return (daySpreadNorm + lowEngagementRatio) / 2;
}

function scoreHypePain(userTweets = []) {
  const texts = (userTweets || [])
    .map((t) => (typeof t?.text === "string" ? t.text : ""))
    .join(" ")
    .toLowerCase();
  if (!texts) return 0;
  let matches = 0;
  for (const kw of HYPE_PAIN_KEYWORDS) {
    if (texts.includes(kw.toLowerCase())) matches += 1;
  }
  if (matches >= 3) return 1;
  if (matches >= 1) return 0.5;
  return 0;
}

function scoreEr(erPct) {
  if (erPct <= 0) return 0;
  if (erPct >= 2) return 1;
  if (erPct >= 0.1 && erPct <= 1) return 0.5 + (erPct - 0.1) / 1.8;
  if (erPct < 0.1) return Math.max(0, erPct / 0.1) * 0.5;
  return 0.5 + (erPct - 1) / 2;
}

function computeCandidateScore(user, userTweets = []) {
  const metrics = user?.public_metrics || {};
  const followers = Number(metrics.followers_count) || 0;
  const description = (user?.description || "").trim();

  let erPct = 0;
  if (userTweets.length > 0 && followers > 0) {
    let totalEngagement = 0;
    for (const t of userTweets) {
      const m = t?.public_metrics || {};
      totalEngagement +=
        (Number(m.like_count) || 0) +
        (Number(m.retweet_count) || 0) +
        (Number(m.reply_count) || 0) +
        (Number(m.quote_count) || 0);
    }
    erPct = (totalEngagement / (followers * userTweets.length)) * 100;
  }

  const exclusion = checkExclusions(user, erPct);
  if (exclusion.excluded) {
    return {
      score: 0,
      excluded: true,
      reason: exclusion.reason,
      breakdown: { norm_er: 0, norm_bio: 0, norm_followers: 0 }
    };
  }

  const norm_er = scoreEr(erPct);
  const norm_bio = scoreBio(description);
  const norm_followers = scoreFollowers(followers);
  const norm_hype_pain = scoreHypePain(userTweets);
  const norm_hustle_profile = scoreHustleProfile(description);
  const norm_hustle_zone = scoreHustleZone(followers);
  const norm_beginner_zone = scoreBeginnerZone(followers);
  const norm_no_link = scoreNoLink(user);
  const norm_action_log = scoreActionLog(userTweets);
  const norm_consistency = scoreConsistencyFromRecentTweets(userTweets);
  const norm_pain_action =
    norm_hype_pain >= 0.5 && norm_action_log === 1 ? 1 : 0;
  const norm_active_affiliate = scoreActiveAffiliate(description);
  const norm_competitor_platform = scoreCompetitorPlatform(user);
  const norm_micro_nano = scoreMicroNanoZone(followers);

  const score = Math.round(
    WEIGHT_ER * norm_er * 100 +
      WEIGHT_BIO * norm_bio * 100 +
      WEIGHT_FOLLOWERS * norm_followers * 100 +
      WEIGHT_HYPE_PAIN * norm_hype_pain * 100 +
      WEIGHT_HUSTLE_PROFILE * norm_hustle_profile * 100 +
      WEIGHT_HUSTLE_ZONE * norm_hustle_zone * 100 +
      WEIGHT_BEGINNER_ZONE * norm_beginner_zone * 100 +
      WEIGHT_NO_LINK * norm_no_link * 100 +
      WEIGHT_ACTION_LOG * norm_action_log * 100 +
      WEIGHT_CONSISTENCY * norm_consistency * 100 +
      WEIGHT_PAIN_ACTION * norm_pain_action * 100 +
      WEIGHT_ACTIVE_AFFILIATE * norm_active_affiliate * 100 +
      WEIGHT_COMPETITOR_PLATFORM * norm_competitor_platform * 100 +
      WEIGHT_MICRO_NANO * norm_micro_nano * 100
  );

  return {
    score: Math.min(100, Math.max(0, score)),
    excluded: false,
    breakdown: {
      norm_er,
      norm_bio,
      norm_followers,
      norm_hype_pain,
      norm_hustle_profile,
      norm_hustle_zone,
      norm_beginner_zone,
      norm_no_link,
      norm_action_log,
      norm_consistency,
      norm_pain_action,
      norm_active_affiliate,
      norm_competitor_platform,
      norm_micro_nano,
      erPct,
      followers
    },
    raw: { erPct, followers }
  };
}

/** Priority 閾値（Copilot 決定版）: 0.4未満はDM送らない、0.6以上で送信 */
const PRIORITY_MIN_SEND = 0.4;
const PRIORITY_TIER_HIGH = 0.8;
const PRIORITY_TIER_NORMAL = 0.6;

module.exports = {
  computeCandidateScore,
  checkExclusions,
  getRegionCoefficientByLang,
  getRiskFactor,
  hasProfileLink,
  hasNigeriaKeyword,
  scoreBio,
  scoreFollowers,
  scoreEr,
  scoreHypePain,
  scoreHustleProfile,
  scoreHustleZone,
  scoreBeginnerZone,
  scoreMicroNanoZone,
  scoreCompetitorPlatform,
  scoreNoLink,
  scoreActiveAffiliate,
  scoreActionLog,
  scoreConsistencyFromRecentTweets,
  REGION_COEFFICIENT,
  COEFFICIENT_BY_LANG,
  PRIORITY_MIN_SEND,
  PRIORITY_TIER_HIGH,
  PRIORITY_TIER_NORMAL,
  HYPE_PAIN_KEYWORDS,
  BIO_KEYWORDS,
  ACTIVE_AFFILIATE_KEYWORDS,
  ACTION_LOG_KEYWORDS,
  PROFILE_HUSTLE_KEYWORDS,
  PROFILE_EXCLUDE_KEYWORDS,
  FF_RATIO_MAX,
  FF_RATIO_MIN,
  MIN_ACCOUNT_AGE_DAYS,
  OPTIMAL_FOLLOWERS_MIN,
  OPTIMAL_FOLLOWERS_MAX,
  HUSTLE_ZONE_FOLLOWERS_MIN,
  HUSTLE_ZONE_FOLLOWERS_MAX,
  BEGINNER_FIGHTER_ZONE_MIN,
  BEGINNER_FIGHTER_ZONE_MAX,
  MICRO_NANO_FOLLOWERS_MIN,
  MICRO_NANO_FOLLOWERS_MAX,
  COMPETITOR_PLATFORM_KEYWORDS
};
