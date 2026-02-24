/**
 * アフィリエイトリクルート候補のスコアリングと除外
 * 出典: docs/AFFILIATE_RECRUIT_3AI_SYNTHESIS.md, docs/AFFILIATE_RECRUIT_SCREENING_PRINCIPLES.md
 * 戦略: 「隠された敵」×「島への招待」ハイブリッド — 煽り商材を紹介している候補（痛みを抱えている）を優先
 * 泥臭さ: プロフィールの hustle/affiliate/DM open 等はボーナス、coach/consultant 等は除外
 * ファイター: 実績ゼロ〜少ないがモチベ高い層 — 努力系ワード・30–1500フォロワー帯（docs/AFFILIATE_RECRUIT_FIGHTER_CONDITIONS.md）
 *
 * Phase 1: ER・Bio・フォロワーで基本スコア
 * Phase 2: 煽り/hype 系投稿ボーナス
 * Phase 3: 泥臭さ・努力系プロフィールボーナス、泥臭ゾーン(100–3000)・初心者ファイターゾーン(30–1500)
 * Phase 4: リンクなしボーナス（初心者ファイター強シグナル）・行動ログボーナス
 * Phase 5: 除外条件（FF比、年齢、bio空、プロフィール除外キーワード）
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

/** 泥臭さ・努力系プロフィールキーワード（焦り・野心・行動量・初心者モチベ）。含むとボーナス — SCREENING_PRINCIPLES + FIGHTER_CONDITIONS */
const PROFILE_HUSTLE_KEYWORDS = [
  "hustle", "grind", "affiliate", "dm open", "make money", "side income",
  "entrepreneur", "building", "learning", "improving", "trying", "beginner", "new journey",
  "side hustle", "extra income", "open dm", "online income",
  "afiliado", "renda extra", "dinero", "ingresos", "dm abierto",
  "aprendiendo", "empezando", "aprendendo", "iniciante",
  "시작합니다", "배우는 중", "부업",
  "初心者", "勉強中", "副業"
];

/** 除外: プロフィールに含むと動かない・プライド高い・詐欺系 — SCREENING_PRINCIPLES + アフリカ/中東等 FIGHTER 条件 */
const PROFILE_EXCLUDE_KEYWORDS = [
  "growth hacker", "seo expert", "consultant", "coach", "agency owner", "mentor", "guru",
  "forex trader", "crypto signals", "mlm"
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

/** スコアウェイト（0–100 正規化） */
const WEIGHT_ER = 0.1;
const WEIGHT_BIO = 0.2;
const WEIGHT_FOLLOWERS = 0.2;
const WEIGHT_HYPE_PAIN = 0.1;
const WEIGHT_HUSTLE_PROFILE = 0.1;
const WEIGHT_HUSTLE_ZONE = 0.1;
const WEIGHT_BEGINNER_ZONE = 0.05;
const WEIGHT_NO_LINK = 0.05;
const WEIGHT_ACTION_LOG = 0.05;

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

/** リンクなし: プロフィールに URL がなければ 1（売るものがない＝動ける初心者ファイター強シグナル） */
function scoreNoLink(user) {
  const url = user?.url;
  if (url === undefined || url === null) return 1;
  if (typeof url !== "string" || !url.trim()) return 1;
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

  const score = Math.round(
    WEIGHT_ER * norm_er * 100 +
      WEIGHT_BIO * norm_bio * 100 +
      WEIGHT_FOLLOWERS * norm_followers * 100 +
      WEIGHT_HYPE_PAIN * norm_hype_pain * 100 +
      WEIGHT_HUSTLE_PROFILE * norm_hustle_profile * 100 +
      WEIGHT_HUSTLE_ZONE * norm_hustle_zone * 100 +
      WEIGHT_BEGINNER_ZONE * norm_beginner_zone * 100 +
      WEIGHT_NO_LINK * norm_no_link * 100 +
      WEIGHT_ACTION_LOG * norm_action_log * 100
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
      erPct,
      followers
    },
    raw: { erPct, followers }
  };
}

module.exports = {
  computeCandidateScore,
  checkExclusions,
  scoreBio,
  scoreFollowers,
  scoreEr,
  scoreHypePain,
  scoreHustleProfile,
  scoreHustleZone,
  scoreBeginnerZone,
  scoreNoLink,
  scoreActionLog,
  HYPE_PAIN_KEYWORDS,
  BIO_KEYWORDS,
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
  BEGINNER_FIGHTER_ZONE_MAX
};
