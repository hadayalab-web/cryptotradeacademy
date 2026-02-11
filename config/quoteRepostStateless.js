/**
 * Trap Defence X Repost OS — Stateless 設定・ヘルパー
 * KV 禁止・完全 stateless・Search → Pick → Shoot
 */

// ========================================
// VIDALYTICS_LINKS（12本：Regular/Minimal × 6言語）
// 環境変数 VID_LINK_REGULAR_XX / VID_LINK_MINIMAL_XX から読み込み
// ========================================
const VID_ENV_KEYS = {
  en: { reg: "VID_LINK_REGULAR_EN", min: "VID_LINK_MINIMAL_EN" },
  es: { reg: "VID_LINK_REGULAR_ES", min: "VID_LINK_MINIMAL_ES" },
  pt: { reg: "VID_LINK_REGULAR_PT_BR", min: "VID_LINK_MINIMAL_PT_BR" },
  ja: { reg: "VID_LINK_REGULAR_JA", min: "VID_LINK_MINIMAL_JA" },
  ko: { reg: "VID_LINK_REGULAR_KO", min: "VID_LINK_MINIMAL_KO" },
  ar: { reg: "VID_LINK_REGULAR_AR", min: "VID_LINK_MINIMAL_AR" },
};

// 環境変数未設定時のフォールバック（12本）
const VID_FALLBACK = {
  regular: {
    en: "https://preview.vidalytics.com/vid/R_qh_0xq5QcqNsT2",
    es: "https://preview.vidalytics.com/vid/Sn0Ksfoqayhn19Hu",
    pt: "https://preview.vidalytics.com/vid/4nFpiTEQLXbOruxk",
    ja: "https://preview.vidalytics.com/vid/ksCwzN2p2nOGUSso",
    ko: "https://preview.vidalytics.com/vid/7SP9FG5F9ox6PNYS",
    ar: "https://preview.vidalytics.com/vid/E3_5s_i7QfqcZnkm",
  },
  minimal: {
    en: "https://preview.vidalytics.com/vid/r7EVEIvFx66Nj3dp",
    es: "https://preview.vidalytics.com/vid/C7qhJZh6N8reco2h",
    pt: "https://preview.vidalytics.com/vid/0uqYb_5TWoSfBl6Y",
    ja: "https://preview.vidalytics.com/vid/iQUVsxj5j522r_sf",
    ko: "https://preview.vidalytics.com/vid/OQNbnGJNtF6_W5zC",
    ar: "https://preview.vidalytics.com/vid/rBzQDrGv2xSyZKtK",
  },
};

function pickVidalyticsLink(lang, tier = "mixed") {
  const normalLang = lang === "pt-br" ? "pt" : (lang || "en");
  const keys = VID_ENV_KEYS[normalLang] || VID_ENV_KEYS.en;

  const getReg = () => process.env[keys.reg] || VID_FALLBACK.regular[normalLang] || VID_FALLBACK.regular.en;
  const getMin = () => process.env[keys.min] || VID_FALLBACK.minimal[normalLang] || VID_FALLBACK.minimal.en;

  if (tier === "regular") return getReg();
  if (tier === "minimal") return getMin();
  // tier=mixed: 70% regular / 30% minimal（CVR 最大化・黄金比率）
  return Math.floor(Math.random() * 100) < 70 ? getReg() : getMin();
}

function getLinkKind(lang, link) {
  const normalLang = lang === "pt-br" ? "pt" : (lang || "en");
  const keys = VID_ENV_KEYS[normalLang] || VID_ENV_KEYS.en;
  const reg = process.env[keys.reg] || VID_FALLBACK.regular[normalLang] || VID_FALLBACK.regular.en;
  return link === reg ? "regular" : "minimal";
}

// 後方互換
const VIDALYTICS_LINKS = VID_FALLBACK;

// ========================================
// SEARCH_CONFIG + buildSearchQuery（後方互換）
// ========================================
const SEARCH_CONFIG = {
  en: { minFaves: 80, minRt: 15 },
  ja: { minFaves: 50, minRt: 10 },
  es: { minFaves: 40, minRt: 8 },
  pt: { minFaves: 40, minRt: 8 },
  ko: { minFaves: 50, minRt: 10 },
  ar: { minFaves: 30, minRt: 5 },
};

// Note: min_faves/min_retweets not supported by /2/tweets/search/recent; use buildQuery for crypto.
function buildSearchQuery(lang) {
  const normalLang = lang === "pt-br" ? "pt" : lang;
  return `lang:${normalLang} -is:reply -is:quote -is:retweet`;
}

// ========================================
// buildQuery（利益最大化モード・インプレッション最大化）
// ========================================
// Note: min_faves/min_retweets are NOT supported by /2/tweets/search/recent.
// Engagement filtering is done client-side in pickTopN/scoreTweet via public_metrics.
const CRYPTO_QUERIES = {
  en: [
    "(lang:en)",
    "(btc OR bitcoin OR crypto OR market OR macro OR \"ETF\" OR \"liquidation\")",
    "-is:retweet -is:reply -is:quote"
  ],
  es: [
    "(lang:es)",
    "(btc OR bitcoin OR crypto OR \"criptomonedas\" OR \"Bitcoin\" OR \"ETF\")",
    "-is:retweet -is:reply -is:quote"
  ],
  pt: [
    "(lang:pt)",
    "(btc OR bitcoin OR crypto OR \"criptomoedas\" OR \"ETF\")",
    "-is:retweet -is:reply -is:quote"
  ],
  ja: [
    "(lang:ja)",
    "(btc OR bitcoin OR ビットコイン OR 仮想通貨 OR クリプト OR ETF OR 清算)",
    "-is:retweet -is:reply -is:quote"
  ],
  ko: [
    "(lang:ko)",
    "(btc OR bitcoin OR 비트코인 OR 크립토 OR 암호화폐 OR ETF)",
    "-is:retweet -is:reply -is:quote"
  ],
  ar: [
    "(lang:ar)",
    "(btc OR bitcoin OR \"بيتكوين\" OR \"كريبتو\" OR \"عملة رقمية\" OR ETF)",
    "-is:retweet -is:reply -is:quote"
  ]
};

function buildQuery(lang) {
  const normalLang = lang === "pt-br" ? "pt" : lang;
  const parts = CRYPTO_QUERIES[normalLang] ?? CRYPTO_QUERIES.en;
  return parts.join(" ");
}

// ========================================
// 6言語テンプレ
// ========================================
const TEMPLATES_JA = [
  "市場は緑なのに含み損が膨らんでるなら、ここから。→ {link}",
  "ダッシュボード真っ赤のまま気づかなければ後悔する。数字で確認。→ {link}",
  "今のうちにポジション確認。この動き、まだ巻き返し効く。→ {link}",
  "清算されそうで眠れない人、数字で状況掴む。→ {link}",
];

const TEMPLATES_EN = [
  "If the market is green but your PnL isn't, start here → {link}",
  "When your dashboard's all red, see the numbers → {link}",
  "Still bleeding despite the pump? Check this → {link}",
  "Market moved and you missed it. Position yourself → {link}",
];

const TEMPLATES_ES = [
  "Si el mercado está en verde pero tu PnL no, empieza aquí → {link}",
  "Cuando el panel está rojo, los números aclaran. → {link}",
  "Aún sangrando tras el pump? Revisa tu posición → {link}",
  "El mercado se movió y te perdiste. Posiciónate → {link}",
];

const TEMPLATES_PT = [
  "Se o mercado está verde mas seu PnL não, comece aqui → {link}",
  "Quando o painel está vermelho, os números acalmam. → {link}",
  "Ainda sangrando após o pump? Confira sua posição → {link}",
  "O mercado se moveu e você perdeu. Posicione-se → {link}",
];

const TEMPLATES_KO = [
  "시장은 초록인데 PnL은 빨갛다면, 여기서 시작. → {link}",
  "대시보드가 빨간데 모르면 후회. 숫자로 확인. → {link}",
  "펌프에도 피 흘리는 중? 포지션 체크. → {link}",
  "시장이 움직였는데 놓쳤다면, 여기서. → {link}",
];

const TEMPLATES_AR = [
  "السوق أخضر لكن ربحك ينزف؟ ابدأ هنا → {link}",
  "الشاشة حمراء والوقت يمر. الأرقام توضح. → {link}",
  "ما زلت تنزف بعد الضخ؟ راجع موقعك → {link}",
  "السوق تحرك وفاتك. موضّع نفسك → {link}",
];

function getTemplatesForLang(lang) {
  const normalLang = lang === "pt-br" ? "pt" : lang;
  switch (normalLang) {
    case "ja": return TEMPLATES_JA;
    case "en": return TEMPLATES_EN;
    case "es": return TEMPLATES_ES;
    case "pt": return TEMPLATES_PT;
    case "ko": return TEMPLATES_KO;
    case "ar": return TEMPLATES_AR;
    default: return TEMPLATES_EN;
  }
}

function buildBody(lang, index, tier = "mixed") {
  const templates = getTemplatesForLang(lang);
  const tpl = templates[index % templates.length];
  return tpl.replace("{link}", pickVidalyticsLink(lang, tier));
}

/** 本文とリンクの間にスペースを保証（"wordhttps://" → "word https://"） */
function ensureSpaceBeforeLink(text) {
  if (!text || typeof text !== "string") return text;
  return text.replace(/([a-zA-Z0-9])(https?:\/\/)/g, "$1 $2");
}

/**
 * mode=template → テンプレのみ（link を {link} に差し込み）
 * mode=grok → Grokプールのみ（空ならテンプレ）。Grok文に link が含まれていなければ付加
 * mode=hybrid → Grokプール優先、足りない分はテンプレで埋める
 */
function buildBodyWithMode(lang, index, tier, mode, grokPool = []) {
  const link = pickVidalyticsLink(lang, tier);
  const templateFallback = () => {
    const templates = getTemplatesForLang(lang);
    const tpl = templates[index % templates.length];
    return tpl.replace(/\{link\}/g, link);
  };

  if (mode === "template") return templateFallback();

  const grokText = grokPool[index] && String(grokPool[index]).trim();
  if (grokText) {
    const hasLink = grokText.includes("vidalytics") || grokText.includes(link);
    const body = hasLink ? grokText : `${grokText} → ${link}`;
    return ensureSpaceBeforeLink(body);
  }
  return templateFallback();
}

// ========================================
// スコアリング（CTR/CVR 最大化・本番仕様）
// ========================================
function getFollowersCount(tweet, includes = {}) {
  const users = includes.users || [];
  const user = users.find((u) => u.id === tweet.author_id);
  const pm = user?.public_metrics;
  return pm?.followers_count ?? 0;
}

function scoreTweet(t, includes = {}) {
  const m = t.public_metrics ?? {};
  const followers = getFollowersCount(t, includes) || 0;
  const text = t.text || "";
  const ageMinutes =
    (Date.now() - new Date(t.created_at || 0).getTime()) / 60000;

  let score = 1;

  // 1. 時間減衰（古い投稿は自然に下げる）
  // 120分で 0.37、240分で 0.14
  const timeDecay = Math.exp(-ageMinutes / 120);
  score *= timeDecay;

  // 2. エンゲージメント（対数スケール）
  score += Math.log(1 + (m.like_count ?? 0)) * 1.2;
  score += Math.log(1 + (m.retweet_count ?? 0)) * 1.5;
  score += Math.log(1 + (m.reply_count ?? 0)) * 0.8;

  // 3. フォロワー数補正
  if (followers < 3000) score *= 0.7;       // 小さすぎる
  if (followers > 200000) score *= 0.8;    // 大きすぎる（CTR が落ちる）

  // 4. テキスト長補正（短文は CTR が高い）
  if (text.length < 80) score *= 1.1;

  return score;
}

function passesQuality(t) {
  const m = t.public_metrics ?? {};
  const ageMinutes = (Date.now() - new Date(t.created_at || 0).getTime()) / 60000;
  // 90分以内の新着ツイートは like=0 & rt=0 でも許可（伸び始め拾い）
  if (ageMinutes <= 90 && (m.like_count ?? 0) === 0 && (m.retweet_count ?? 0) === 0) return true;
  if ((m.like_count ?? 0) === 0 && (m.retweet_count ?? 0) === 0) return false;
  return true;
}

// 30分以内に3回以上投稿している author を除外（1h/2回→30min/3回に緩和）
function getSpamAuthorIds(tweets) {
  const byAuthor = {};
  for (const t of tweets || []) {
    const aid = t.author_id;
    if (!aid) continue;
    if (!byAuthor[aid]) byAuthor[aid] = [];
    byAuthor[aid].push(new Date(t.created_at || 0).getTime());
  }
  const excluded = new Set();
  const WINDOW_MS = 30 * 60 * 1000;
  const MIN_POSTS = 3;
  for (const [aid, times] of Object.entries(byAuthor)) {
    if (times.length < MIN_POSTS) continue;
    times.sort((a, b) => a - b);
    for (let i = 0; i < times.length; i++) {
      const windowEnd = times[i] + WINDOW_MS;
      const countInWindow = times.filter((ts) => ts >= times[i] && ts <= windowEnd).length;
      if (countInWindow >= MIN_POSTS) {
        excluded.add(aid);
        break;
      }
    }
  }
  return excluded;
}

// スコア上位 CANDIDATE_POOL 件を候補にし、その中からランダムに N 件選ぶ（パターン検知・スパム判定リスク低減）
const CANDIDATE_POOL = 20;

function pickTopN(tweets, count, includes = {}) {
  const seenTweet = new Set();
  const seenAuthor = new Set();
  const spamAuthors = getSpamAuthorIds(tweets);

  const scored = (tweets || [])
    .filter((t) => t && t.public_metrics)
    .filter((t) => !spamAuthors.has(t.author_id))
    .map((t) => ({ t, s: scoreTweet(t, includes) }))
    .sort((a, b) => b.s - a.s);

  const candidates = [];
  for (const { t, s } of scored) {
    if (candidates.length >= CANDIDATE_POOL) break;
    if (seenTweet.has(t.id)) continue;
    if (seenAuthor.has(t.author_id)) continue;
    if (!passesQuality(t)) continue;
    seenTweet.add(t.id);
    seenAuthor.add(t.author_id);
    candidates.push({ t, s });
  }

  // ランダムシャッフルしてから先頭 N 件を選択（スコア × ランダム性のハイブリッド）
  const shuffled = candidates.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const picked = shuffled.slice(0, count);
  return {
    tweets: picked.map((x) => x.t),
    scores: picked.map((x) => x.s)
  };
}

module.exports = {
  VIDALYTICS_LINKS,
  pickVidalyticsLink,
  getLinkKind,
  SEARCH_CONFIG,
  buildSearchQuery,
  buildQuery,
  getTemplatesForLang,
  buildBody,
  buildBodyWithMode,
  scoreTweet,
  passesQuality,
  pickTopN,
};
