/**
 * アフィリエイトリクルート候補のスコアリングと除外
 * 出典: docs/AFFILIATE_RECRUIT_3AI_SYNTHESIS.md, docs/AFFILIATE_RECRUIT_SCREENING_PRINCIPLES.md
 * 戦略: 「隠された敵」×「島への招待」ハイブリッド — 煽り商材を紹介している候補（痛みを抱えている）を優先
 * 泥臭さ: プロフィールの hustle/affiliate/DM open 等はボーナス、coach/consultant 等は除外
 *
 * Phase 1: ER・Bio・フォロワーで基本スコア
 * Phase 2: 煽り/hype 系投稿ボーナス
 * Phase 3: 泥臭さプロフィールボーナス・フォロワー泥臭ゾーン(100–3000)ボーナス
 * Phase 4: 除外条件（FF比、年齢、bio空、プロフィール除外キーワード）
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

/** 泥臭さプロフィールキーワード（焦り・野心・行動量）。含むとボーナス — docs/AFFILIATE_RECRUIT_SCREENING_PRINCIPLES.md */
const PROFILE_HUSTLE_KEYWORDS = [
  "hustle", "grind", "affiliate", "dm open", "make money", "side income",
  "entrepreneur", "building", "learning", "side hustle", "extra income",
  "afiliado", "renda extra", "dinero", "ingresos", "dm abierto", "open dm", "online income"
];

/** 除外: プロフィールに含むと動かない・プライド高い・返信率低い — 同上 */
const PROFILE_EXCLUDE_KEYWORDS = [
  "growth hacker", "seo expert", "consultant", "coach", "agency owner", "mentor"
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

/** スコアウェイト（0–100 正規化） */
const WEIGHT_ER = 0.25;
const WEIGHT_BIO = 0.2;
const WEIGHT_FOLLOWERS = 0.2;
const WEIGHT_HYPE_PAIN = 0.15;
const WEIGHT_HUSTLE_PROFILE = 0.1;
const WEIGHT_HUSTLE_ZONE = 0.1;

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

  const score = Math.round(
    WEIGHT_ER * norm_er * 100 +
      WEIGHT_BIO * norm_bio * 100 +
      WEIGHT_FOLLOWERS * norm_followers * 100 +
      WEIGHT_HYPE_PAIN * norm_hype_pain * 100 +
      WEIGHT_HUSTLE_PROFILE * norm_hustle_profile * 100 +
      WEIGHT_HUSTLE_ZONE * norm_hustle_zone * 100
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
  HYPE_PAIN_KEYWORDS,
  BIO_KEYWORDS,
  PROFILE_HUSTLE_KEYWORDS,
  PROFILE_EXCLUDE_KEYWORDS,
  FF_RATIO_MAX,
  FF_RATIO_MIN,
  MIN_ACCOUNT_AGE_DAYS,
  OPTIMAL_FOLLOWERS_MIN,
  OPTIMAL_FOLLOWERS_MAX,
  HUSTLE_ZONE_FOLLOWERS_MIN,
  HUSTLE_ZONE_FOLLOWERS_MAX
};
