/**
 * アフィリエイトリクルート設定: X DM リクルート → FirstPromoter 登録 → Whop 販売
 * 戦略: docs/AFFILIATE_STRATEGY_X_DM_FIRSTPROMOTER_WHOP.md
 */

/** リクルート対象言語（Whop 6 市場と一致） */
const AFFILIATE_RECRUIT_LANGS = ["en", "es", "pt", "ar", "ko", "ja"];

/** 言語の表示名（DM 文案・ログ用） */
const AFFILIATE_LANG_NAMES = {
  en: "English",
  es: "Spanish",
  pt: "Portuguese",
  ar: "Arabic",
  ko: "Korean",
  ja: "Japanese"
};

/** DM 訴求軸（Who/What マッチング用）。saas は side_hustle へ正規化する。 */
const RECRUIT_PRIMARY_ANGLES = ["crypto", "ai_saas", "side_hustle"];
const RECRUIT_ANGLE_ALIASES = {
  crypto: "crypto",
  ai_saas: "ai_saas",
  side_hustle: "side_hustle",
  saas: "side_hustle"
};

/** Angle 判定キーワード（検索意図/プロフィール補正で使用） */
const RECRUIT_ANGLE_KEYWORDS = {
  crypto: [
    "bitcoin", "btc", "crypto", "trading", "signals", "signal", "gem", "altcoin",
    "マーケット", "仮想通貨", "ビットコイン", "트레이딩", "코인",
    "cripto", "trader", "mercado", "mercado btc",
    "mercado crypto", "سوق", "بيتكوين", "كريبتو"
  ],
  ai_saas: [
    "ai", "gpt", "llm", "saas", "tool", "automation", "agent", "workflow",
    "ai saas", "ai tool", "sistema", "automacao", "自動化", "生成ai", "aiツール",
    "자동화", "ai 도구", "ذكاء اصطناعي", "اداة"
  ],
  side_hustle: [
    "affiliate", "referral", "side hustle", "income", "earn", "commission", "partner",
    "make money", "online income", "extra income", "monetize", "monetise",
    "副業", "収益化", "成果報酬", "紹介", "제휴", "부업", "수익화",
    "afiliado", "afiliados", "ingresos", "renda", "dinheiro",
    "عمولة", "إحالة", "دخل إضافي"
  ]
};

const RECRUIT_ANGLE_LABELS = {
  en: {
    crypto: "crypto trading",
    ai_saas: "AI SaaS",
    side_hustle: "affiliate side-hustle"
  },
  es: {
    crypto: "crypto trading",
    ai_saas: "AI SaaS",
    side_hustle: "afiliados/side hustle"
  },
  pt: {
    crypto: "trading crypto",
    ai_saas: "AI SaaS",
    side_hustle: "afiliados/side hustle"
  },
  ar: {
    crypto: "تداول الكريبتو",
    ai_saas: "AI SaaS",
    side_hustle: "الأفلييت / دخل جانبي"
  },
  ko: {
    crypto: "크립토 트레이딩",
    ai_saas: "AI SaaS",
    side_hustle: "제휴/부업"
  },
  ja: {
    crypto: "Crypto",
    ai_saas: "AI SaaS",
    side_hustle: "副業アフィリエイト"
  }
};

const RECRUIT_PRODUCT_NAME_BY_ANGLE = {
  crypto: {
    en: "BTC market briefing via Telegram",
    es: "briefing de mercado BTC por Telegram",
    pt: "briefing de mercado BTC via Telegram",
    ar: "موجز سوق BTC عبر تيليغرام",
    ko: "BTC 마켓 브리핑 텔레그램 서비스",
    ja: "BTCマーケットTGブリーフィング"
  },
  ai_saas: {
    en: "AI-assisted BTC market intelligence via Telegram",
    es: "inteligencia de mercado BTC asistida por IA vía Telegram",
    pt: "inteligência de mercado BTC com IA via Telegram",
    ar: "ذكاء سوق BTC مدعوم بالذكاء الاصطناعي عبر تيليغرام",
    ko: "AI 보조 BTC 마켓 인텔리전스 텔레그램 브리핑",
    ja: "AI支援型BTCマーケットTGブリーフィング"
  },
  side_hustle: {
    en: "Beginner-friendly recurring affiliate package (Whop + Telegram assets)",
    es: "paquete de afiliación recurrente para principiantes (Whop + activos Telegram)",
    pt: "pacote de afiliado recorrente para iniciantes (Whop + ativos Telegram)",
    ar: "حزمة أفلييت متكررة مناسبة للمبتدئين (Whop + مواد تيليغرام)",
    ko: "초보자용 리커링 제휴 패키지 (Whop + 텔레그램 소재)",
    ja: "初心者向けリカーリング・アフィリエイトパッケージ（Whop＋TG素材）"
  }
};

const RECRUIT_DM_VARIANTS = ["v1_requirements", "v2_partnership"];
const RECRUIT_DM_AB_TEST_ENABLED = process.env.RECRUIT_DM_AB_TEST_ENABLED !== "0";
const RECRUIT_DM_AB_SPLIT_PERCENT = Math.max(
  0,
  Math.min(100, Number(process.env.RECRUIT_DM_AB_SPLIT_PERCENT || 50))
);

function normalizeRecruitAngle(angle) {
  const normalized = String(angle || "").toLowerCase().trim();
  return RECRUIT_ANGLE_ALIASES[normalized] || "crypto";
}

function hashStringToUint32(raw) {
  const text = String(raw || "");
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) >>> 0;
  }
  return hash >>> 0;
}

function pickRecruitDmVariantByKey(key) {
  if (!RECRUIT_DM_AB_TEST_ENABLED) return "v1_requirements";
  const normalizedKey = String(key || "").trim();
  if (!normalizedKey) return "v1_requirements";
  const bucket = hashStringToUint32(normalizedKey) % 100;
  return bucket < RECRUIT_DM_AB_SPLIT_PERCENT ? "v1_requirements" : "v2_partnership";
}

function normalizeRecruitLang(lang) {
  const normalized = String(lang || "").toLowerCase().trim();
  return AFFILIATE_RECRUIT_LANGS.includes(normalized) ? normalized : "en";
}

function getRecruitProductName(angle, lang) {
  const resolvedAngle = normalizeRecruitAngle(angle);
  const resolvedLang = normalizeRecruitLang(lang);
  const byLang = RECRUIT_PRODUCT_NAME_BY_ANGLE[resolvedAngle] || RECRUIT_PRODUCT_NAME_BY_ANGLE.crypto;
  return byLang[resolvedLang] || byLang.en;
}

function getRecruitAngleLabel(angle, lang) {
  const resolvedAngle = normalizeRecruitAngle(angle);
  const resolvedLang = normalizeRecruitLang(lang);
  const labels = RECRUIT_ANGLE_LABELS[resolvedLang] || RECRUIT_ANGLE_LABELS.en;
  return labels[resolvedAngle] || labels.crypto;
}

/**
 * 言語別 FirstPromoter 招待 URL の env キー（Vercel で FIRSTPROMOTER_INVITE_URL_EN 等を設定している場合に使用）
 */
function getFirstPromoterInviteUrlEnvKey(lang) {
  if (!lang || typeof lang !== "string") return null;
  const key = `FIRSTPROMOTER_INVITE_URL_${lang.toUpperCase()}`;
  return process.env[key] ? key : null;
}

/**
 * FirstPromoter 招待 URL。ref を渡すと DM→登録の紐づけ用にクエリに付与する（v2.0 ref対応）
 * 優先: FIRSTPROMOTER_INVITE_URL_XX（言語別）→ FIRSTPROMOTER_INVITE_URL → firstpromoter.com
 * @param {string} [lang="en"]
 * @param {{ ref?: string }} [options] - ref: X の author_id（送信先識別子）
 */
function getFirstPromoterInviteUrl(lang = "en", options = {}) {
  const langKey = getFirstPromoterInviteUrlEnvKey(lang);
  const base =
    (langKey && process.env[langKey]) ||
    process.env.FIRSTPROMOTER_INVITE_URL ||
    "https://firstpromoter.com";
  const params = new URLSearchParams();
  if (!langKey && lang && lang !== "en") params.set("lang", lang);
  if (options.ref) params.set("ref", String(options.ref));
  const qs = params.toString();
  return qs ? `${base}${base.includes("?") ? "&" : "?"}${qs}` : base;
}

function getWhopAffiliateProgramUrl(lang = "en") {
  const base = process.env.WHOP_AFFILIATE_PROGRAM_URL || "https://whop.com/affiliates";
  const langParam = lang && lang !== "en" ? `?lang=${lang}` : "";
  return base + langParam;
}

/**
 * X プロフィールの「ウェブサイト」欄に貼る FirstPromoter 招待 URL（1本のみ）。
 * 優先: FIRSTPROMOTER_INVITE_URL_EN → FIRSTPROMOTER_INVITE_URL → firstpromoter.com。utm_source=x_profile で出所識別。
 */
function getFirstPromoterProfileUrl() {
  const base =
    process.env.FIRSTPROMOTER_INVITE_URL_EN ||
    process.env.FIRSTPROMOTER_INVITE_URL ||
    "https://firstpromoter.com";
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}utm_source=x_profile`;
}

// EN 実行時刻（UTC）。従来モード用（mode 指定なし /api/affiliate-recruit-run 互換）。
const EN_RECRUIT_HOURS = [0, 4, 8, 12, 16, 20];

/** EN キューライン: 1h ごとリスト取得・15 分ごと送信。docs/AFFILIATE_RECRUIT_EN_LINE_SPEC.md */
const EN_QUEUE_LIST_HOURS_UTC = Array.from({ length: 24 }, (_, hour) => hour);
/** EN リスト取得ページ数（1実行あたり）。1h 補充の既定は 1 ページ、env で調整可。 */
const EN_QUEUE_LIST_PAGES = Math.max(1, Number(process.env.EN_RECRUIT_LIST_PAGES || 1));
/** 0 = キャップなし（枯渇まで送信）。正の値で日次成功数上限。 */
const EN_QUEUE_DAILY_CAP = Number(process.env.EN_RECRUIT_DAILY_CAP || 0);
const EN_QUEUE_403_BREAKER_PER_15MIN = Number(process.env.EN_RECRUIT_403_BREAKER || 22);
/** EN: 1時間補充向けに窓90分（重複を抑えつつ供給を確保）。 */
const EN_SEARCH_WINDOW_MINUTES = Number(process.env.EN_SEARCH_WINDOW_MIN || 90);
/** 他地域: 1日1回実行 → EN同様「1回の窓で1日分をカバー」に揃え、24時間。 */
const REGION_SEARCH_WINDOW_MINUTES = Number(process.env.REGION_SEARCH_WINDOW_MIN || 1440);
/** 他地域リスト取得ページ数（1実行あたり）。候補不足対策でデフォルト2、envで調整可。 */
const REGION_QUEUE_LIST_PAGES = Math.max(1, Number(process.env.REGION_RECRUIT_LIST_PAGES || 2));
/** 全言語共通: スロットあたりの送信成功目標。403 は次候補へ進み、この数だけ成功するまで試行（Read 1・多ページで候補確保） */
/** 1 ランあたり送信成功 10 件をマストで達成するための目標値。#4 で根拠明記。 */
const RECRUIT_BATCH_SIZE_DEFAULT = 10;
/** EN スロット用 */
const EN_RECRUIT_BATCH_SIZE = Number(process.env.EN_RECRUIT_BATCH_SIZE || RECRUIT_BATCH_SIZE_DEFAULT);

/** 各 UTC 時刻に対応する言語（vercel.json の affiliate-recruit-regions の cron と対応）。スロット数は運用指示。送信成功目標10以外はどうでもよい。 */
const SLOTS_BY_UTC_HOUR = {
  12: Array(10).fill("ja"),
  13: Array(10).fill("ko"),
  17: Array(10).fill("ar"),
  21: Array(10).fill("es"),
  22: Array(10).fill("pt")
};

function getNextRecruitLangForUtcHour(utcHour, indexInHour) {
  const slots = SLOTS_BY_UTC_HOUR[utcHour];
  if (!slots || indexInHour < 0 || indexInHour >= slots.length) return null;
  return slots[indexInHour];
}

module.exports = {
  AFFILIATE_RECRUIT_LANGS,
  AFFILIATE_LANG_NAMES,
  RECRUIT_PRIMARY_ANGLES,
  RECRUIT_ANGLE_KEYWORDS,
  RECRUIT_DM_VARIANTS,
  RECRUIT_DM_AB_TEST_ENABLED,
  RECRUIT_DM_AB_SPLIT_PERCENT,
  normalizeRecruitAngle,
  pickRecruitDmVariantByKey,
  getRecruitProductName,
  getRecruitAngleLabel,
  getFirstPromoterInviteUrl,
  getFirstPromoterProfileUrl,
  getWhopAffiliateProgramUrl,
  EN_RECRUIT_HOURS,
  EN_SEARCH_WINDOW_MINUTES,
  REGION_SEARCH_WINDOW_MINUTES,
  EN_QUEUE_LIST_PAGES,
  REGION_QUEUE_LIST_PAGES,
  EN_RECRUIT_BATCH_SIZE,
  RECRUIT_BATCH_SIZE_DEFAULT,
  EN_QUEUE_LIST_HOURS_UTC,
  EN_QUEUE_DAILY_CAP,
  EN_QUEUE_403_BREAKER_PER_15MIN,
  SLOTS_BY_UTC_HOUR,
  getNextRecruitLangForUtcHour
};
