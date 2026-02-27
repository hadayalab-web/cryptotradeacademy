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

/** 泥臭さ・努力系プロフィールキーワード。DM募集中系は廃止。P2E/LatAm 稼ぐ系は Whop 戦略でボーナス。 */
const PROFILE_HUSTLE_KEYWORDS = [
  "hustle", "grind", "affiliate", "make money", "side income",
  "entrepreneur", "building", "learning", "improving", "trying", "beginner", "new journey",
  "side hustle", "extra income", "online income",
  "play to earn", "scholarship", "ganar dinero", "renda passiva",
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

/** 検索言語 → 国係数 C。crConfig / cr-update のデフォルト用。並び順・除外には未使用。 */
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

function checkExclusions(user) {
  const metrics = user?.public_metrics || {};
  const followers = Number(metrics.followers_count) || 0;
  const following = Number(metrics.following_count) || 0;
  const description = (user?.description || "").trim();

  if (followers === 0 && following === 0) {
    return { excluded: true, reason: "no_metrics" };
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

/** 泥臭さプロフィール: hustle / affiliate / DM open 等が含まれると 1 */
function scoreHustleProfile(description) {
  const text = (description || "").toLowerCase();
  for (const kw of PROFILE_HUSTLE_KEYWORDS) {
    if (text.includes(kw.toLowerCase())) return 1;
  }
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

function computeCandidateScore(user, userTweets = []) {
  const exclusion = checkExclusions(user);
  if (exclusion.excluded) {
    return {
      score: 0,
      excluded: true,
      reason: exclusion.reason,
      breakdown: {}
    };
  }

  // 並び順・除外にはスコアを使わない（recency のみ・除外は checkExclusions のみ）。スコアは stats/response 用の目安。ウェイト・係数は因果が薄いため廃止し固定値にする。
  return {
    score: 50,
    excluded: false,
    breakdown: {}
  };
}

module.exports = {
  computeCandidateScore,
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
  scoreActionLog,
  COEFFICIENT_BY_LANG,
  HYPE_PAIN_KEYWORDS,
  BIO_KEYWORDS,
  ACTIVE_AFFILIATE_KEYWORDS,
  ACTION_LOG_KEYWORDS,
  PROFILE_HUSTLE_KEYWORDS,
  PROFILE_EXCLUDE_KEYWORDS,
  COMPETITOR_PLATFORM_KEYWORDS
};
