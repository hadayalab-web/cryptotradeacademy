/**
 * アフィリエイトリクルート設定: X DM リクルート → LP → WarriorPlus（W+）決済
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
    en: "Beginner-friendly recurring affiliate package (WarriorPlus + Telegram assets)",
    es: "paquete recurrente para afiliados (WarriorPlus + activos de Telegram)",
    pt: "pacote recorrente de afiliado (WarriorPlus + materiais do Telegram)",
    ar: "حزمة أفلييت متكررة (WarriorPlus + مواد تيليغرام)",
    ko: "초보자용 리커링 제휴 패키지 (WarriorPlus + 텔레그램 소재)",
    ja: "初心者向けリカーリング・アフィリエイトパッケージ（WarriorPlus＋TG素材）"
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

function resolveAffiliateInviteBaseUrl(lang = "en") {
  const resolvedLang = normalizeRecruitLang(lang);
  const key = `AFFILIATE_INVITE_URL_${resolvedLang.toUpperCase()}`;
  if (process.env[key]) return String(process.env[key]).trim();
  if (process.env.AFFILIATE_INVITE_URL) return String(process.env.AFFILIATE_INVITE_URL).trim();
  // デフォルトはLP（Carrd）。CTA クリックで WarriorPlus 決済へ。
  const { getLandingPageUrl } = require("../services/telegram/lp-links");
  return getLandingPageUrl(resolvedLang);
}

/**
 * 互換: 旧 getFirstPromoterInviteUrl 名を維持しつつ、実体は LP（→W+決済）へ。
 * ref を渡すとクエリに付与（DM→LPクリックの紐づけ用途）。
 */
function getFirstPromoterInviteUrl(lang = "en", options = {}) {
  const base = resolveAffiliateInviteBaseUrl(lang);
  const params = new URLSearchParams();
  if (options.ref) params.set("ref", String(options.ref));
  const qs = params.toString();
  return qs ? `${base}${base.includes("?") ? "&" : "?"}${qs}` : base;
}

/**
 * 互換: 旧 getWhopAffiliateProgramUrl 名を維持（LPに集約）
 */
function getWhopAffiliateProgramUrl(lang = "en") {
  return resolveAffiliateInviteBaseUrl(lang);
}

/**
 * 互換: 旧 getFirstPromoterProfileUrl 名を維持（Xプロフィール用URL）
 */
function getFirstPromoterProfileUrl() {
  const base = resolveAffiliateInviteBaseUrl("en");
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}utm_source=x_profile`;
}

// EN 実行時刻（UTC）。従来モード用（mode 指定なし /api/affiliate-recruit-run 互換）。
const EN_RECRUIT_HOURS = [0, 4, 8, 12, 16, 20];

/** EN キューライン: 4h ごとリスト取得・15 分ごと送信。docs/AFFILIATE_RECRUIT_EN_LINE_SPEC.md */
const EN_QUEUE_LIST_HOURS_UTC = [0, 4, 8, 12, 16, 20];
/** EN リスト取得ページ数（1実行あたり）。4h 補充の既定は 1 ページ、env で調整可。 */
const EN_QUEUE_LIST_PAGES = Math.max(1, Number(process.env.EN_RECRUIT_LIST_PAGES || 1));
/** EN: 1時間補充向けに窓90分（重複を抑えつつ供給を確保）。 */
const EN_SEARCH_WINDOW_MINUTES = Number(process.env.EN_SEARCH_WINDOW_MIN || 90);
/** 他地域: 1日1回実行 → EN同様「1回の窓で1日分をカバー」に揃え、24時間。 */
const REGION_SEARCH_WINDOW_MINUTES = Number(process.env.REGION_SEARCH_WINDOW_MIN || 1440);
/** 他地域リスト取得ページ数（1実行あたり）。デフォルト 1、env で調整可。 */
const REGION_QUEUE_LIST_PAGES = Math.max(1, Number(process.env.REGION_RECRUIT_LIST_PAGES || 1));
/** 言語別キュー上限（ユーザー直販DM戦略の応用）。0 で無制限。 */
const AFFILIATE_RECRUIT_QUEUE_CAP_PER_LANG = Math.max(0, Number(process.env.AFFILIATE_RECRUIT_QUEUE_CAP_PER_LANG ?? 30));
/** unified のみ（地域の窓拡張をスキップし、1クエリ・早期終了で Read 抑制）。 */
const AFFILIATE_RECRUIT_UNIFIED_ONLY = process.env.AFFILIATE_RECRUIT_UNIFIED_ONLY !== "0";
/** 候補条件: フォロワー100人以上（運用指示に基づく）。0 で無効。 */
const AFFILIATE_RECRUIT_MIN_FOLLOWERS = Math.max(0, Number(process.env.AFFILIATE_RECRUIT_MIN_FOLLOWERS ?? 100));
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
  AFFILIATE_RECRUIT_QUEUE_CAP_PER_LANG,
  AFFILIATE_RECRUIT_UNIFIED_ONLY,
  AFFILIATE_RECRUIT_MIN_FOLLOWERS,
  EN_RECRUIT_BATCH_SIZE,
  RECRUIT_BATCH_SIZE_DEFAULT,
  EN_QUEUE_LIST_HOURS_UTC,
  SLOTS_BY_UTC_HOUR,
  getNextRecruitLangForUtcHour
};
