/**
 * アフィリエイトリクルート 1 本送信（Cron または手動 POST）
 * フォーカス: (1) すでにアフィリエイター (2) ノイズ徹底排除 (3) 同一ユーザー／403 ユーザーへは一切再送しない。DM募集中条件は廃止。
 * 言語別スロットで候補検索 → FirstPromoter 招待 URL 入り DM を 1 通。認証: CRON_SECRET / ?dryRun=1 で送信スキップ。
 */
require("../utils/suppressKnownWarnings");
const { kv } = require("../utils/kv");
const { fetchOneSearchPage } = require("../services/td/affiliateRecruitSearch");
const { sendRecruitDm } = require("../services/x/dmClient");
const { fillRecruitDmTemplate } = require("../config/affiliateRecruitDmTemplates");
const {
  getFirstPromoterInviteUrl,
  getWhopAffiliateProgramUrl,
  EN_RECRUIT_HOURS,
  EN_SEARCH_WINDOW_MINUTES,
  REGION_SEARCH_WINDOW_MINUTES,
  EN_QUEUE_LIST_PAGES,
  REGION_QUEUE_LIST_PAGES,
  EN_RECRUIT_BATCH_SIZE,
  RECRUIT_BATCH_SIZE_DEFAULT,
  EN_QUEUE_LIST_HOURS_UTC,
  SLOTS_BY_UTC_HOUR,
  getNextRecruitLangForUtcHour
} = require("../config/affiliateRecruitConfig");
const { computeCandidateScore } = require("../services/td/affiliateRecruitScoring");

const KV_KEY_DAILY_COUNT = (dateStr) => `affiliate_recruit:daily_count:${dateStr}`;
const KV_KEY_SENT_HANDLE = (handle) => `affiliate_recruit:sent:${handle.toLowerCase()}`;
const KV_KEY_HOUR_SENT = (dateStr, hour) => `affiliate_recruit:hour_sent:${dateStr}:${hour}`;
const KV_KEY_DM_NG = (userId) => `affiliate_recruit:dm_ng:${userId}`;
const KV_KEY_REF_SENT = (authorId) => `affiliate_recruit:ref_sent:${authorId}`;
const KV_KEY_STATS_LANG = (lang) => `affiliate_recruit:stats:lang:${lang}`;
const KV_KEY_STATS_LANG_BAND = (lang, band) => `affiliate_recruit:stats:lang:${lang}:band:${band}`;
const KV_KEY_QUEUE_EN = "affiliate_recruit:queue:en";
const KV_KEY_QUEUE_REGION = (lang) => `affiliate_recruit:queue:${lang}`;
const KV_KEY_403_WINDOW_EN = (dateStr, slot15) => `affiliate_recruit:403:en:${dateStr}:${slot15}`;
const KV_KEY_ATTEMPT_WINDOW_EN = (dateStr, slot15) => `affiliate_recruit:attempts:en:${dateStr}:${slot15}`;
const KV_KEY_DELIVERY_OUTCOME_AGG = "affiliate_recruit:delivery:agg:v1";
const AFFILIATE_RECRUIT_CLICK_TRACK_PATH = "/api/affiliate-recruit-click";
/** 地域キュー対応言語（EN は別キュー）。送信順。 */
const REGION_QUEUE_LANGS = ["ar", "es", "pt", "ja", "ko"];
/** 全キュー対象言語（取得/送信のグロス対象） */
const QUEUE_LANGS_ALL = ["en", ...REGION_QUEUE_LANGS];
const REGION_LIST_SCHEDULE_TEXT = "hourly gross refresh: en+ar+es+pt+ja+ko";
// DM→登録紐づけ用 KV の有効期限。90 日は送信から登録までの想定期間をカバーしつつストレージを抑える目安。運用指示で固定。短縮したい場合はコードまたは env で変更可。
const REF_SENT_TTL = 86400 * 90;
// operation_not_permitted の停止ブレーカーと cooldown は無効化（停止させない）
// 送信バースト防止: 15分窓の試行数 cap（成功/失敗を問わない）
const EN_QUEUE_ATTEMPT_CAP_PER_15MIN = Math.max(
  1,
  Number(
    process.env.EN_RECRUIT_ATTEMPT_CAP_PER_15MIN ||
    process.env.EN_RECRUIT_ATTEMPT_BREAKER_PER_15MIN ||
    15
  )
);
// 15分枠あたり送信試行上限（デフォルト 15）
const EN_QUEUE_MAX_ATTEMPTS_PER_RUN = Math.max(
  1,
  Number(process.env.EN_RECRUIT_ATTEMPTS_PER_RUN || 15)
);
const EN_QUEUE_ATTEMPT_WINDOW_TTL_SECONDS = Math.max(
  900,
  Number(process.env.EN_RECRUIT_ATTEMPT_WINDOW_TTL_SEC || 1200)
);
const EN_RECRUIT_SEND_RUN_HARD_STOP_MS = Math.max(
  60000,
  Number(process.env.EN_RECRUIT_SEND_RUN_HARD_STOP_MS || 285000)
);
// 同一実行で複数試行する場合の送信間隔（ms）。デフォルト 15 秒。
const EN_RECRUIT_SEND_DELAY_MS = Math.max(
  0,
  Number(process.env.EN_RECRUIT_SEND_DELAY_MS || 15000)
);
const RECRUIT_DM_ANGLES = ["crypto", "ai_saas", "side_hustle"];
// 推奨Angleを基準に 80:20（Exploit:Explore）で配信。0 で Explore 無効。
const RECRUIT_EXPLORE_PERCENT = Math.max(
  0,
  Math.min(100, Number(process.env.RECRUIT_RECOMMEND_EXPLORE_PERCENT || 20))
);

const RECRUIT_STATS_LANGS = ["en", "ja", "ko", "es", "pt", "ar"];
const SCORE_BANDS = ["0-49", "50-64", "65-79", "80-100"];
const DELIVERY_OUTCOME_KEYS = [
  "attempted",
  "sent",
  "recipient403",
  "operationNotPermitted403",
  "other403",
  "non403Errors"
];
const DELIVERY_OUTCOME_AGG_TTL_SECONDS = Math.max(
  86400 * 30,
  Number(process.env.EN_RECRUIT_DELIVERY_OUTCOME_TTL_SEC || 86400 * 120)
);
const EN_RECRUIT_DELIVERABILITY_PRIORITY_WEIGHT = Math.max(
  0,
  Number(process.env.EN_RECRUIT_DELIVERABILITY_PRIORITY_WEIGHT || 24)
);
const EN_RECRUIT_DELIVERABILITY_MIN_ATTEMPTS = Math.max(
  1,
  Number(process.env.EN_RECRUIT_DELIVERABILITY_MIN_ATTEMPTS || 5)
);
const EN_RECRUIT_LANG_RECIPIENT_403_SOFT_BLOCK_STREAK = Math.max(
  0,
  Number(process.env.EN_RECRUIT_LANG_RECIPIENT_403_SOFT_BLOCK_STREAK || 3)
);
const EN_RECRUIT_LANG_SOFT_BLOCK_ATTEMPTS = Math.max(
  1,
  Number(process.env.EN_RECRUIT_LANG_SOFT_BLOCK_ATTEMPTS || 4)
);

function resolveRequestOrigin(req) {
  const explicit =
    process.env.AFFILIATE_RECRUIT_CLICK_BASE_URL ||
    process.env.BASE_URL ||
    process.env.APP_BASE_URL;
  if (explicit) return String(explicit).trim().replace(/\/+$/, "");

  const forwardedHostRaw = req?.headers?.["x-forwarded-host"];
  const hostRaw = Array.isArray(forwardedHostRaw)
    ? forwardedHostRaw[0]
    : forwardedHostRaw || req?.headers?.host;
  const host = String(hostRaw || "").split(",")[0].trim();
  if (host) {
    const forwardedProtoRaw = req?.headers?.["x-forwarded-proto"];
    const proto = String(
      Array.isArray(forwardedProtoRaw) ? forwardedProtoRaw[0] : forwardedProtoRaw || "https"
    )
      .split(",")[0]
      .trim();
    return `${proto}://${host}`;
  }

  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "";
}

function buildTrackedInviteUrl(req, inviteUrl, metadata = {}) {
  const destination = String(inviteUrl || "").trim();
  if (!destination) return destination;
  const origin = resolveRequestOrigin(req);
  if (!origin) return destination;

  try {
    const tracked = new URL(`${origin}${AFFILIATE_RECRUIT_CLICK_TRACK_PATH}`);
    tracked.searchParams.set("to", destination);
    if (metadata.ref) tracked.searchParams.set("ref", String(metadata.ref));
    if (metadata.authorId) tracked.searchParams.set("author_id", String(metadata.authorId));
    if (metadata.lang) tracked.searchParams.set("lang", String(metadata.lang));
    if (metadata.angle) tracked.searchParams.set("angle", String(metadata.angle));
    if (metadata.handle) tracked.searchParams.set("handle", String(metadata.handle).replace(/^@/, ""));
    if (metadata.source) tracked.searchParams.set("source", String(metadata.source));
    return tracked.toString();
  } catch (_) {
    return destination;
  }
}

function getScoreBand(score) {
  if (score == null || typeof score !== "number") return "0-49";
  if (score < 50) return "0-49";
  if (score < 65) return "50-64";
  if (score < 80) return "65-79";
  return "80-100";
}

function normalizeBucketKey(value, fallback = "unknown") {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  return normalized || fallback;
}

function createDeliveryOutcomeCounter() {
  return {
    attempted: 0,
    sent: 0,
    recipient403: 0,
    operationNotPermitted403: 0,
    other403: 0,
    non403Errors: 0
  };
}

function normalizeDeliveryOutcomeCounter(raw) {
  const normalized = createDeliveryOutcomeCounter();
  if (!raw || typeof raw !== "object") return normalized;
  for (const key of DELIVERY_OUTCOME_KEYS) {
    normalized[key] = Math.max(0, parseInt(raw[key], 10) || 0);
  }
  return normalized;
}

function createDeliveryOutcomeAggregate() {
  return {
    totals: createDeliveryOutcomeCounter(),
    byLang: {},
    byScoreBand: {},
    byHighIntent: {},
    byIntentSegment: {},
    byAngle: {},
    byDetectedVia: {},
    updatedAt: null
  };
}

function normalizeDeliveryOutcomeMap(rawMap) {
  if (!rawMap || typeof rawMap !== "object" || Array.isArray(rawMap)) return {};
  const normalized = {};
  for (const [bucket, value] of Object.entries(rawMap)) {
    normalized[String(bucket)] = normalizeDeliveryOutcomeCounter(value);
  }
  return normalized;
}

function normalizeDeliveryOutcomeAggregate(rawValue) {
  let raw = rawValue;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch (_) {
      raw = null;
    }
  }
  const base = createDeliveryOutcomeAggregate();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return base;
  base.totals = normalizeDeliveryOutcomeCounter(raw.totals);
  base.byLang = normalizeDeliveryOutcomeMap(raw.byLang);
  base.byScoreBand = normalizeDeliveryOutcomeMap(raw.byScoreBand);
  base.byHighIntent = normalizeDeliveryOutcomeMap(raw.byHighIntent);
  base.byIntentSegment = normalizeDeliveryOutcomeMap(raw.byIntentSegment);
  base.byAngle = normalizeDeliveryOutcomeMap(raw.byAngle);
  base.byDetectedVia = normalizeDeliveryOutcomeMap(raw.byDetectedVia);
  base.updatedAt = raw.updatedAt || null;
  return base;
}

function mergeDeliveryOutcomeCounter(baseCounter, deltaCounter) {
  const merged = createDeliveryOutcomeCounter();
  const base = normalizeDeliveryOutcomeCounter(baseCounter);
  const delta = normalizeDeliveryOutcomeCounter(deltaCounter);
  for (const key of DELIVERY_OUTCOME_KEYS) {
    merged[key] = Math.max(0, base[key] + delta[key]);
  }
  return merged;
}

function mergeDeliveryOutcomeMap(baseMap, deltaMap) {
  const merged = {};
  const keys = new Set([
    ...Object.keys(baseMap || {}),
    ...Object.keys(deltaMap || {})
  ]);
  for (const bucket of keys) {
    merged[bucket] = mergeDeliveryOutcomeCounter(baseMap?.[bucket], deltaMap?.[bucket]);
  }
  return merged;
}

function mergeDeliveryOutcomeAggregate(baseAggregate, deltaAggregate) {
  const base = normalizeDeliveryOutcomeAggregate(baseAggregate);
  const delta = normalizeDeliveryOutcomeAggregate(deltaAggregate);
  return {
    totals: mergeDeliveryOutcomeCounter(base.totals, delta.totals),
    byLang: mergeDeliveryOutcomeMap(base.byLang, delta.byLang),
    byScoreBand: mergeDeliveryOutcomeMap(base.byScoreBand, delta.byScoreBand),
    byHighIntent: mergeDeliveryOutcomeMap(base.byHighIntent, delta.byHighIntent),
    byIntentSegment: mergeDeliveryOutcomeMap(base.byIntentSegment, delta.byIntentSegment),
    byAngle: mergeDeliveryOutcomeMap(base.byAngle, delta.byAngle),
    byDetectedVia: mergeDeliveryOutcomeMap(base.byDetectedVia, delta.byDetectedVia),
    updatedAt: new Date().toISOString()
  };
}

function createDeliveryOutcomeAccumulator() {
  return createDeliveryOutcomeAggregate();
}

function buildDeliveryFeatureMeta(item, lang, angleForSend) {
  const scoreRaw = Number(item?.score);
  const score = Number.isFinite(scoreRaw) ? scoreRaw : null;
  const scoreBand = score != null ? getScoreBand(score) : "0-49";
  const highIntent = item?.is_high_intent === true ? "1" : "0";
  const intentSegment = normalizeBucketKey(item?.intent_segment, "unknown");
  const detectedVia = normalizeBucketKey(item?.detected_via || item?.detectedVia, "default");
  const angle = normalizeRecruitAngle(
    angleForSend || item?.recommended_angle || item?.recommendedAngle || item?.angle
  );
  return {
    lang: normalizeBucketKey(lang, "unknown"),
    scoreBand,
    highIntent,
    intentSegment,
    detectedVia,
    angle: angle || "unknown"
  };
}

function getOrCreateDeliveryBucketCounter(map, bucketKey) {
  const key = String(bucketKey || "unknown");
  if (!map[key]) {
    map[key] = createDeliveryOutcomeCounter();
  }
  return map[key];
}

function incrementDeliveryOutcomeCounter(counter, outcomeKey) {
  const target = counter || createDeliveryOutcomeCounter();
  target.attempted += 1;
  if (outcomeKey && DELIVERY_OUTCOME_KEYS.includes(outcomeKey) && outcomeKey !== "attempted") {
    target[outcomeKey] += 1;
  }
  return target;
}

function recordDeliveryOutcome(accumulator, featureMeta, outcomeKey) {
  if (!accumulator || !featureMeta) return;
  incrementDeliveryOutcomeCounter(accumulator.totals, outcomeKey);

  const langCounter = getOrCreateDeliveryBucketCounter(accumulator.byLang, featureMeta.lang);
  const scoreBandCounter = getOrCreateDeliveryBucketCounter(accumulator.byScoreBand, featureMeta.scoreBand);
  const highIntentCounter = getOrCreateDeliveryBucketCounter(accumulator.byHighIntent, featureMeta.highIntent);
  const intentSegmentCounter = getOrCreateDeliveryBucketCounter(
    accumulator.byIntentSegment,
    featureMeta.intentSegment
  );
  const angleCounter = getOrCreateDeliveryBucketCounter(accumulator.byAngle, featureMeta.angle);
  const detectedViaCounter = getOrCreateDeliveryBucketCounter(
    accumulator.byDetectedVia,
    featureMeta.detectedVia
  );

  incrementDeliveryOutcomeCounter(langCounter, outcomeKey);
  incrementDeliveryOutcomeCounter(scoreBandCounter, outcomeKey);
  incrementDeliveryOutcomeCounter(highIntentCounter, outcomeKey);
  incrementDeliveryOutcomeCounter(intentSegmentCounter, outcomeKey);
  incrementDeliveryOutcomeCounter(angleCounter, outcomeKey);
  incrementDeliveryOutcomeCounter(detectedViaCounter, outcomeKey);
}

function getDeliverabilitySentRate(counter) {
  const normalized = normalizeDeliveryOutcomeCounter(counter);
  const attempted = Math.max(0, normalized.attempted);
  return (normalized.sent + 1) / (attempted + 2);
}

function estimateDeliverabilityProbability(featureMeta, aggregate) {
  const normalized =
    aggregate && typeof aggregate === "object" && aggregate.totals
      ? aggregate
      : normalizeDeliveryOutcomeAggregate(aggregate);
  const globalRate = getDeliverabilitySentRate(normalized.totals);
  const sources = [
    normalized.byLang[featureMeta.lang],
    normalized.byScoreBand[featureMeta.scoreBand],
    normalized.byHighIntent[featureMeta.highIntent],
    normalized.byIntentSegment[featureMeta.intentSegment],
    normalized.byAngle[featureMeta.angle],
    normalized.byDetectedVia[featureMeta.detectedVia]
  ];
  let weighted = globalRate;
  let totalWeight = 1;
  for (const source of sources) {
    const attempted = Math.max(0, parseInt(source?.attempted, 10) || 0);
    if (attempted < EN_RECRUIT_DELIVERABILITY_MIN_ATTEMPTS) continue;
    const weight = Math.min(4, Math.log2(attempted + 1));
    weighted += getDeliverabilitySentRate(source) * weight;
    totalWeight += weight;
  }
  const probability = weighted / totalWeight;
  return Math.max(0.05, Math.min(0.95, probability));
}

async function flushDeliveryOutcomeAccumulator(accumulator) {
  const attempted = parseInt(accumulator?.totals?.attempted, 10) || 0;
  if (!kv || attempted <= 0) return null;
  try {
    const current = normalizeDeliveryOutcomeAggregate(await kv.get(KV_KEY_DELIVERY_OUTCOME_AGG));
    const merged = mergeDeliveryOutcomeAggregate(current, accumulator);
    await kv.set(KV_KEY_DELIVERY_OUTCOME_AGG, merged, {
      ex: DELIVERY_OUTCOME_AGG_TTL_SECONDS
    });
    return merged;
  } catch (e) {
    console.warn("[affiliate-recruit-run] flushDeliveryOutcomeAccumulator failed:", e?.message);
    return null;
  }
}

/** 検索結果＋ユーザーから送信候補を構築。EN/regions 共通。スコア優先→同点時は recency。 */
function buildEligibleCandidates(allPosts, usersById, lang) {
  const tweetsByAuthor = {};
  for (const p of allPosts) {
    const uid = p?.author_id;
    if (!uid) continue;
    if (!tweetsByAuthor[uid]) tweetsByAuthor[uid] = [];
    tweetsByAuthor[uid].push(p);
  }
  const candidates = [];
  for (const uid of Object.keys(tweetsByAuthor)) {
    const u = usersById[uid];
    if (!u?.username) continue;
    const tweets = tweetsByAuthor[uid] || [];
    const {
      score,
      excluded,
      reason,
      breakdown,
      angle,
      recommendedAngle,
      angleConfidence,
      exploreEligible,
      isHighIntent,
      intentSegment,
      detectedVia
    } = computeCandidateScore(u, tweets, lang);
    const mostRecentTime = tweets.length
      ? Math.max(...tweets.map((t) => new Date(t?.created_at || 0).getTime()))
      : 0;
    candidates.push({
      author_id: uid,
      username: u.username,
      user: u,
      tweets,
      score,
      excluded,
      reason,
      breakdown,
      angle: normalizeRecruitAngle(angle) || null,
      recommendedAngle: normalizeRecruitAngle(recommendedAngle || angle) || null,
      angleConfidence: Number.isFinite(Number(angleConfidence)) ? Number(angleConfidence) : 0,
      exploreEligible: Boolean(exploreEligible),
      isHighIntent: Boolean(isHighIntent),
      intentSegment: intentSegment || null,
      detectedVia: detectedVia || null,
      priority: score != null ? score / 100 : 0,
      mostRecentTime
    });
  }
  return candidates
    .filter((c) => !c.excluded)
    .sort((a, b) => {
      const scoreDiff = (b.score ?? 0) - (a.score ?? 0);
      if (scoreDiff !== 0) return scoreDiff;
      return (b.mostRecentTime ?? 0) - (a.mostRecentTime ?? 0);
    });
}

/** 送信数集計（言語×スコア帯）。観測ダッシュボード用。失敗しても送信処理は続行 */
async function incrementSentStats(lang, score) {
  if (!kv || !lang) return;
  try {
    await kv.incr(KV_KEY_STATS_LANG(lang));
    await kv.incr(KV_KEY_STATS_LANG_BAND(lang, getScoreBand(score)));
  } catch (e) {
    console.warn("[affiliate-recruit-run] incrementSentStats failed:", e?.message);
  }
}

async function getTodaySentCount() {
  if (!kv) return 0;
  const dateStr = new Date().toISOString().split("T")[0];
  const v = await kv.get(KV_KEY_DAILY_COUNT(dateStr));
  return Math.max(0, parseInt(v, 10) || 0);
}

async function incrementTodaySentCount() {
  if (!kv) return;
  const dateStr = new Date().toISOString().split("T")[0];
  const key = KV_KEY_DAILY_COUNT(dateStr);
  const cur = await kv.get(key);
  const next = Math.max(0, parseInt(cur, 10) || 0) + 1;
  await kv.set(key, String(next), { ex: 86400 * 2 });
}

async function isAlreadySent(handle) {
  if (!kv) return false;
  const v = await kv.get(KV_KEY_SENT_HANDLE(handle));
  return !!v;
}

/**
 * 送信済みマーク。payload を渡すと送信ログとして
 * lang/score/priority/author_id/angle/recommended_angle/angle_mode/dm_variant/detected_via
 * を保存（返信率・登録率の国×言語×訴求軸観測用）
 * @param {string} handle - 送信先 @username
 * @param {{ lang?: string; score?: number; priority?: number; author_id?: string; angle?: string; recommended_angle?: string; angle_mode?: string; angle_confidence?: number; is_high_intent?: boolean; intent_segment?: string; dm_variant?: string; detected_via?: string }} [payload] - 検索時の言語・スコア・優先度・author_id・訴求軸・推奨軸・送信モード・意図セグメント・DMバリアント・角度検出経路
 */
async function markSent(handle, payload = {}) {
  if (!kv) return;
  const ts = Date.now();
  const value =
    Object.keys(payload).length > 0
      ? JSON.stringify({
          ts,
          handle: (handle || "").toLowerCase(),
          lang: payload.lang ?? null,
          score: payload.score ?? null,
          priority: payload.priority ?? null,
          author_id: payload.author_id ?? null,
          angle: payload.angle ?? null,
          recommended_angle: payload.recommended_angle ?? null,
          angle_mode: payload.angle_mode ?? null,
          angle_confidence: payload.angle_confidence ?? null,
          is_high_intent: payload.is_high_intent ?? null,
          intent_segment: payload.intent_segment ?? null,
          dm_variant: payload.dm_variant ?? null,
          detected_via: payload.detected_via ?? null
        })
      : String(ts);
  await kv.set(KV_KEY_SENT_HANDLE(handle), value); // 同一ユーザーへは一切再送しない（有効期限なし）
}

/** ref 紐づけ用: 送信時に author_id をキーに lang/score を保存。FirstPromoter 登録時の ref と突き合わせ可能にする */
async function saveRefSent(authorId, data) {
  if (!kv || !authorId) return;
  try {
    await kv.set(
      KV_KEY_REF_SENT(String(authorId)),
      JSON.stringify({
        handle: data.handle ?? null,
        lang: data.lang ?? null,
        score: data.score ?? null,
        priority: data.priority ?? null,
        angle: data.angle ?? null,
        recommended_angle: data.recommended_angle ?? null,
        angle_mode: data.angle_mode ?? null,
        angle_confidence: data.angle_confidence ?? null,
        is_high_intent: data.is_high_intent ?? null,
        intent_segment: data.intent_segment ?? null,
        dm_variant: data.dm_variant ?? null,
        detected_via: data.detected_via ?? null,
        ts: Date.now()
      }),
      { ex: REF_SENT_TTL }
    );
  } catch (e) {
    console.warn("[affiliate-recruit-run] saveRefSent failed:", e?.message);
  }
}

async function isDmNg(userId) {
  if (!kv || !userId) return false;
  const v = await kv.get(KV_KEY_DM_NG(String(userId)));
  return !!v;
}

async function markDmNg(userId, data = {}) {
  if (!kv || !userId) return;
  const payload = {
    userId: String(userId),
    username: data.username || null,
    score: data.score ?? null,
    lang: data.lang || null,
    breakdown: data.breakdown || null,
    ts: Date.now(),
    reason: "403",
  };
  await kv.set(KV_KEY_DM_NG(String(userId)), JSON.stringify(payload)); // 403 ユーザーへは一切再送しない（有効期限なし）
}

/**
 * DM送信エラーを分類する
 * - recipient_not_open: 受信者がDM未開放（dm_ng登録対象）
 * - operation_not_permitted: 送信側の一時制限/ポリシー要因が疑われる（dm_ng登録しない）
 * - other_403: 403だが詳細不明（dm_ng登録しない）
 */
function classifyDmSendError(errorMessage) {
  const msg = String(errorMessage || "").toLowerCase();
  const is403 = msg.includes("403");
  if (!is403) return { is403: false, type: "non_403" };
  if (
    msg.includes("you do not have permission to dm one or more participants") ||
    msg.includes("permission to dm")
  ) {
    return { is403: true, type: "recipient_not_open" };
  }
  if (msg.includes("this operation is not permitted")) {
    return { is403: true, type: "operation_not_permitted" };
  }
  return { is403: true, type: "other_403" };
}

function normalizeRecruitAngle(angle) {
  const normalized = String(angle || "").toLowerCase();
  if (normalized === "saas") return "side_hustle";
  return RECRUIT_DM_ANGLES.includes(normalized) ? normalized : null;
}

function hashStringToUint32(raw) {
  const text = String(raw || "");
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) >>> 0;
  }
  return hash >>> 0;
}

function pickRecruitAngleByKey(key) {
  const raw = String(key || "");
  if (!raw) return "crypto";
  const hash = hashStringToUint32(raw);
  return RECRUIT_DM_ANGLES[hash % RECRUIT_DM_ANGLES.length];
}

function pickRecruitAngleDecisionFromItem(item) {
  const key = String(item?.author_id || item?.username || "");
  const recommended = normalizeRecruitAngle(
    item?.recommended_angle || item?.recommendedAngle || item?.angle
  );
  const fallback = pickRecruitAngleByKey(key);
  const baseAngle = recommended || fallback;
  const confidenceRaw = Number(item?.angle_confidence ?? item?.angleConfidence);
  const lowConfidence = Number.isFinite(confidenceRaw) ? confidenceRaw <= 1 : false;
  const exploreEligible = Boolean(item?.explore_eligible ?? item?.exploreEligible) || lowConfidence;

  if (!exploreEligible || RECRUIT_EXPLORE_PERCENT <= 0 || !key) {
    return {
      angle: baseAngle,
      angleMode: "exploit",
      recommendedAngle: baseAngle,
      exploreEligible
    };
  }

  const bucket = hashStringToUint32(`${key}:angle_mode`) % 100;
  const shouldExplore = bucket < RECRUIT_EXPLORE_PERCENT;
  if (!shouldExplore) {
    return {
      angle: baseAngle,
      angleMode: "exploit",
      recommendedAngle: baseAngle,
      exploreEligible
    };
  }

  const alternatives = RECRUIT_DM_ANGLES.filter((angle) => angle !== baseAngle);
  if (!alternatives.length) {
    return {
      angle: baseAngle,
      angleMode: "exploit",
      recommendedAngle: baseAngle,
      exploreEligible
    };
  }

  const altIndex = hashStringToUint32(`${key}:angle_explore`) % alternatives.length;
  return {
    angle: alternatives[altIndex],
    angleMode: "explore",
    recommendedAngle: baseAngle,
    exploreEligible
  };
}

function pickRecruitAngleFromItem(item) {
  return pickRecruitAngleDecisionFromItem(item).angle;
}

function getQueueItemKey(item) {
  if (!item || typeof item !== "object") return "";
  const authorId = String(item.author_id || "").trim();
  if (authorId) return `aid:${authorId}`;
  const username = String(item.username || "").trim().toLowerCase();
  return username ? `un:${username}` : "";
}

function parseQueueValue(rawValue) {
  if (Array.isArray(rawValue)) return rawValue;
  if (typeof rawValue === "string") {
    try {
      const parsed = JSON.parse(rawValue);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }
  return [];
}

function sleepMs(ms) {
  const waitMs = Math.max(0, Number(ms) || 0);
  if (waitMs <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, waitMs));
}

/**
 * 新規候補を先頭に、既存キューを後ろへ結合しつつ重複を排除
 * - 同一 author_id または同一 username(小文字化) を重複扱い
 * - username が空の要素は無効として破棄
 */
function mergeRecruitQueueEntries(freshItems, existingItems) {
  const queue = [];
  const seenAuthorIds = new Set();
  const seenUsernames = new Set();
  let addedFromFresh = 0;
  let retainedFromExisting = 0;
  let droppedDuplicateCount = 0;
  let droppedInvalidCount = 0;

  const tryPush = (item, source) => {
    const username = String(item?.username || "").trim().toLowerCase();
    const authorId = String(item?.author_id || "").trim();
    if (!username) {
      droppedInvalidCount += 1;
      return;
    }
    if ((authorId && seenAuthorIds.has(authorId)) || seenUsernames.has(username)) {
      droppedDuplicateCount += 1;
      return;
    }
    if (authorId) seenAuthorIds.add(authorId);
    seenUsernames.add(username);
    queue.push(item);
    if (source === "fresh") {
      addedFromFresh += 1;
    } else {
      retainedFromExisting += 1;
    }
  };

  for (const item of Array.isArray(freshItems) ? freshItems : []) tryPush(item, "fresh");
  for (const item of Array.isArray(existingItems) ? existingItems : []) tryPush(item, "existing");

  return {
    queue,
    addedFromFresh,
    retainedFromExisting,
    droppedDuplicateCount,
    droppedInvalidCount
  };
}

function createSendStatsByLang(langs) {
  const stats = {};
  for (const lang of langs) {
    stats[lang] = {
      queueStart: 0,
      attempted: 0,
      sent: 0,
      recipient403: 0,
      operationNotPermitted403: 0,
      other403: 0,
      non403Errors: 0
    };
  }
  return stats;
}

function computeQueueLengthsByLang(queuesByLang, langs) {
  const lengths = {};
  for (const lang of langs) {
    const queue = Array.isArray(queuesByLang[lang]) ? queuesByLang[lang] : [];
    lengths[lang] = queue.length;
  }
  return lengths;
}

function getQueueItemPriorityValue(item) {
  const scoreRaw = Number(item?.score);
  if (Number.isFinite(scoreRaw)) return scoreRaw;
  const priorityRaw = Number(item?.priority);
  if (Number.isFinite(priorityRaw)) return priorityRaw * 100;
  return 0;
}

function getQueueItemCompositePriority(item, lang, deliveryAggregate) {
  const basePriority = getQueueItemPriorityValue(item);
  if (EN_RECRUIT_DELIVERABILITY_PRIORITY_WEIGHT <= 0) return basePriority;
  const featureMeta = buildDeliveryFeatureMeta(item, lang);
  const deliverabilityProbability = estimateDeliverabilityProbability(featureMeta, deliveryAggregate);
  const adjustment = (deliverabilityProbability - 0.5) * EN_RECRUIT_DELIVERABILITY_PRIORITY_WEIGHT;
  return basePriority + adjustment;
}

function isLangTemporarilySoftBlocked(lang, attemptsThisRun, softBlockedLangUntilAttempt) {
  const untilAttempt = parseInt(softBlockedLangUntilAttempt?.[lang], 10) || 0;
  return untilAttempt > 0 && attemptsThisRun < untilAttempt;
}

function hasAlternativeQueueItems(queuesByLang, langs, excludedLang) {
  for (const lang of langs) {
    if (lang === excludedLang) continue;
    const queue = Array.isArray(queuesByLang[lang]) ? queuesByLang[lang] : [];
    if (queue.length > 0) return true;
  }
  return false;
}

/**
 * 6言語グロス優先順:
 * - 各言語キューを横断して「最高priority(score)」の1件を取り出す
 * - op_not_permitted で同一枠ブロック済みの候補は選択対象から除外
 */
function popNextGrossPriorityCandidate(
  queuesByLang,
  langs,
  blockedKeys,
  deliveryAggregate,
  options = {}
) {
  const attemptsThisRun = Math.max(0, parseInt(options.attemptsThisRun, 10) || 0);
  const softBlockedLangUntilAttempt = options.softBlockedLangUntilAttempt || {};

  const pickCandidate = (ignoreLangSoftBlock) => {
    let selectedLang = null;
    let selectedIndex = -1;
    let selectedScore = Number.NEGATIVE_INFINITY;
    for (const lang of langs) {
      if (
        !ignoreLangSoftBlock &&
        isLangTemporarilySoftBlocked(lang, attemptsThisRun, softBlockedLangUntilAttempt)
      ) {
        continue;
      }
      const queue = Array.isArray(queuesByLang[lang]) ? queuesByLang[lang] : [];
      for (let idx = 0; idx < queue.length; idx += 1) {
        const item = queue[idx];
        if (!item?.username) {
          queue.splice(idx, 1);
          idx -= 1;
          continue;
        }
        const itemKey = getQueueItemKey(item);
        if (itemKey && blockedKeys.has(itemKey)) continue;
        const score = getQueueItemCompositePriority(item, lang, deliveryAggregate);
        if (score > selectedScore) {
          selectedLang = lang;
          selectedIndex = idx;
          selectedScore = score;
        }
      }
    }
    if (selectedLang == null || selectedIndex < 0) return null;
    return { selectedLang, selectedIndex };
  };

  let selected = pickCandidate(false);
  if (!selected) {
    // すべての言語が一時ブロック中の場合は、ブロックを無視して候補を選ぶ
    selected = pickCandidate(true);
  }
  if (!selected) return null;
  const selectedQueue = queuesByLang[selected.selectedLang] || [];
  const selectedItem = selectedQueue.splice(selected.selectedIndex, 1)[0];
  if (!selectedItem?.username) return null;
  return {
    lang: selected.selectedLang,
    item: selectedItem,
    itemKey: getQueueItemKey(selectedItem)
  };
}

async function getHourSentCount(dateStr, hour) {
  if (!kv) return 0;
  const v = await kv.get(KV_KEY_HOUR_SENT(dateStr, hour));
  return Math.max(0, parseInt(v, 10) || 0);
}

async function incrementHourSent(dateStr, hour) {
  if (!kv) return;
  const key = KV_KEY_HOUR_SENT(dateStr, hour);
  const cur = await kv.get(key);
  const next = Math.max(0, parseInt(cur, 10) || 0) + 1;
  await kv.set(key, String(next), { ex: 86400 * 2 });
}

function getGrossListTargetLangs(forcedLangRaw) {
  const forcedLang = String(forcedLangRaw || "")
    .trim()
    .toLowerCase();
  if (forcedLang) {
    if (forcedLang === "en" || REGION_QUEUE_LANGS.includes(forcedLang)) {
      return [forcedLang];
    }
    return [];
  }
  return [...QUEUE_LANGS_ALL];
}

function aggregateGrossListSummary(perLang) {
  const rows = Array.isArray(perLang) ? perLang : [];
  const sumBy = (key) => rows.reduce((acc, row) => acc + (parseInt(row?.[key], 10) || 0), 0);
  return {
    targets: rows.map((row) => row?.lang).filter(Boolean),
    pagesFetchedTotal: sumBy("pagesFetched"),
    fetchedPostsTotal: sumBy("fetchedPosts"),
    eligibleCandidatesTotal: sumBy("eligibleCandidates"),
    enqueuedTotal: sumBy("enqueued"),
    addedFromFreshTotal: sumBy("addedFromFresh"),
    droppedDuplicatesTotal: sumBy("droppedDuplicates"),
    skippedAlreadySentTotal: sumBy("skippedAlreadySent"),
    skippedDmNgTotal: sumBy("skippedDmNg")
  };
}

function resolveQueueListConfig(lang) {
  const normalizedLang = String(lang || "").toLowerCase().trim();
  const isEn = normalizedLang === "en";
  return {
    lang: normalizedLang,
    isEn,
    listPages: isEn ? EN_QUEUE_LIST_PAGES : REGION_QUEUE_LIST_PAGES,
    windowMinutes: isEn ? EN_SEARCH_WINDOW_MINUTES : REGION_SEARCH_WINDOW_MINUTES,
    queueKey: isEn ? KV_KEY_QUEUE_EN : KV_KEY_QUEUE_REGION(normalizedLang)
  };
}

async function refreshQueueForLang(lang, now, modeLabel, options = {}) {
  const cfg = resolveQueueListConfig(lang);
  if (!cfg.lang || (!cfg.isEn && !REGION_QUEUE_LANGS.includes(cfg.lang))) {
    return {
      ok: false,
      reason: "unsupported_lang",
      lang: cfg.lang || String(lang || "")
    };
  }

  let pagesFetched = 0;
  let nextToken = null;
  let allPosts = [];
  const usersById = {};
  let fallbackPagesUsed = 0;
  let primaryHitsTotal = 0;
  let fallbackHitsTotal = 0;
  while (pagesFetched < cfg.listPages) {
    const pageResult = await fetchOneSearchPage(cfg.lang, {
      maxResults: 100,
      windowMinutes: cfg.windowMinutes,
      nextToken: nextToken || undefined
    });
    if (pageResult?.fatal402) {
      return {
        ok: false,
        reason: "search_402",
        mode: modeLabel,
        lang: cfg.lang,
        pagesFetched
      };
    }
    const pageData = pageResult?.data || [];
    const pageUsers = pageResult?.includes?.users || [];
    if (pageResult?.fallbackQueryUsed) fallbackPagesUsed += 1;
    primaryHitsTotal += Number(pageResult?.primaryHits || 0);
    fallbackHitsTotal += Number(pageResult?.fallbackHits || 0);
    allPosts = allPosts.concat(pageData);
    for (const u of pageUsers) {
      if (u?.id) usersById[u.id] = u;
    }
    pagesFetched += 1;
    nextToken = pageResult?.nextToken || null;
    if (!nextToken) break;
  }

  const deliveryAggregate = options.deliveryAggregate || null;
  const eligible = buildEligibleCandidates(allPosts, usersById, cfg.lang);
  const toEnqueue = [];
  let skippedAlreadySent = 0;
  let skippedDmNg = 0;
  for (const c of eligible) {
    if (await isAlreadySent(c.username)) {
      skippedAlreadySent += 1;
      continue;
    }
    if (await isDmNg(c.author_id)) {
      skippedDmNg += 1;
      continue;
    }
    toEnqueue.push({
      author_id: c.author_id,
      username: c.username,
      score: c.score,
      breakdown: c.breakdown,
      angle: normalizeRecruitAngle(c.angle) || pickRecruitAngleByKey(c.author_id || c.username),
      recommended_angle:
        normalizeRecruitAngle(c.recommendedAngle || c.angle) ||
        pickRecruitAngleByKey(c.author_id || c.username),
      angle_confidence: c.angleConfidence ?? 0,
      explore_eligible: Boolean(c.exploreEligible),
      is_high_intent: Boolean(c.isHighIntent),
      intent_segment: c.intentSegment || null,
      detected_via: c.detectedVia || "default"
    });
  }
  toEnqueue.sort((a, b) => {
    const priorityDiff =
      getQueueItemCompositePriority(b, cfg.lang, deliveryAggregate) -
      getQueueItemCompositePriority(a, cfg.lang, deliveryAggregate);
    if (priorityDiff !== 0) return priorityDiff;
    return String(a.username || "").localeCompare(String(b.username || ""));
  });

  const prevQueue = parseQueueValue(await kv.get(cfg.queueKey));
  const prevQueueLength = prevQueue.length;
  const mergeResult = mergeRecruitQueueEntries(toEnqueue, prevQueue);
  const queue = mergeResult.queue;
  await kv.set(cfg.queueKey, JSON.stringify(queue), { ex: 86400 * 2 });

  const listSummary = {
    mode: modeLabel,
    lang: cfg.lang,
    listSelectionMode: "gross_quality_composite",
    deliverabilityWeight: EN_RECRUIT_DELIVERABILITY_PRIORITY_WEIGHT,
    utcHour: now.getUTCHours(),
    runAt: now.toISOString(),
    pagesFetched,
    configuredPages: cfg.listPages,
    fallbackPagesUsed,
    primaryHitsTotal,
    fallbackHitsTotal,
    fetchedPosts: allPosts.length,
    fetchedUsers: Object.keys(usersById).length,
    eligibleCandidates: eligible.length,
    skippedAlreadySent,
    skippedDmNg,
    enqueued: toEnqueue.length,
    addedFromFresh: mergeResult.addedFromFresh,
    retainedFromPrev: mergeResult.retainedFromExisting,
    droppedDuplicates: mergeResult.droppedDuplicateCount,
    droppedInvalid: mergeResult.droppedInvalidCount,
    prevQueueLength,
    nextQueueLength: queue.length,
    sampleHandles: toEnqueue.slice(0, 3).map((x) => x.username)
  };
  console.log("[affiliate-recruit-run] list summary:", listSummary);
  const linePrefix = cfg.isEn ? "affiliate-recruit-en-list" : "affiliate-recruit-regions-list";
  console.log(
    `[${linePrefix}] lang=${cfg.lang} utcHour=${listSummary.utcHour} pages=${pagesFetched}/${cfg.listPages} fallbackPages=${fallbackPagesUsed} primaryHits=${primaryHitsTotal} fallbackHits=${fallbackHitsTotal} fetchedPosts=${allPosts.length} eligible=${eligible.length} skippedSent=${skippedAlreadySent} skippedDmNg=${skippedDmNg} enqueued=${toEnqueue.length} addedFresh=${mergeResult.addedFromFresh} retainedPrev=${mergeResult.retainedFromExisting} droppedDup=${mergeResult.droppedDuplicateCount} droppedInvalid=${mergeResult.droppedInvalidCount} prevQueue=${prevQueueLength} nextQueue=${queue.length}`
  );

  return {
    ok: true,
    ...listSummary
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    res.setHeader("Allow", "POST, GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const dryRun = req.query?.dryRun === "1" || req.body?.dryRun === true;
  const auth =
    (process.env.CRON_SECRET && req.headers?.authorization === `Bearer ${process.env.CRON_SECRET}`) ||
    req.query?.secret === process.env.CRON_SECRET;
  const willSend = auth && !dryRun;

  const targetHandle = (req.query?.targetHandle || req.body?.targetHandle || "").trim().replace(/^@/, "");
  if (targetHandle && auth) {
    const lang = req.query?.lang || req.body?.lang || "ja";
    const angle = normalizeRecruitAngle(req.query?.angle || req.body?.angle) || pickRecruitAngleByKey(targetHandle);
    const inviteUrlRaw = getFirstPromoterInviteUrl(lang);
    const inviteUrl = buildTrackedInviteUrl(req, inviteUrlRaw, {
      lang,
      angle,
      handle: targetHandle,
      source: "target_handle"
    });
    const whopUrl = getWhopAffiliateProgramUrl(lang);
    const { text, dmVariant } = fillRecruitDmTemplate(lang, {
      inviteUrl,
      whopAffiliateUrl: whopUrl,
      handle: targetHandle,
      angle,
      variant: req.query?.variant || req.body?.variant,
      recipientKey: targetHandle
    });
    if (dryRun) {
      return res.status(200).json({
        ok: true,
        dryRun: true,
        targetHandle: true,
        wouldSend: { handle: targetHandle, lang, textLength: text.length }
      });
    }
    const sendResult = await sendRecruitDm(targetHandle, text);
    if (sendResult?.error) {
      return res.status(200).json({
        ok: false,
        reason: "dm_send_failed",
        handle: targetHandle,
        error: sendResult.error
      });
    }
    return res.status(200).json({
      ok: true,
      sent: 1,
      handle: targetHandle,
      lang,
      targetHandle: true,
      dmEventId: sendResult.dmEventId,
      dmVariant
    });
  }

  const forceMode = req.query?.mode || req.body?.mode;

  // ----- EN キューライン: リスト取得（高品質順でキュー更新） -----
  if (forceMode === "en-queue-list") {
    const now = new Date();
    const utcHour = now.getUTCHours();
    if (!EN_QUEUE_LIST_HOURS_UTC.includes(utcHour)) {
      console.log(
        `[affiliate-recruit-en-list] skip utcHour=${utcHour} expected=0-23`
      );
      return res.status(200).json({
        ok: true,
        reason: "en_queue_list_skip_hour",
        utcHour,
        message: "Run hourly at UTC minute 2"
      });
    }
    try {
      const deliveryAggregate = normalizeDeliveryOutcomeAggregate(
        await kv.get(KV_KEY_DELIVERY_OUTCOME_AGG)
      );
      const result = await refreshQueueForLang("en", now, "en-queue-list", {
        deliveryAggregate
      });
      if (!result.ok) {
        return res.status(200).json({
          ok: false,
          reason: result.reason || "en_queue_list_failed",
          enQueueList: true,
          pagesFetched: result.pagesFetched || 0
        });
      }
      return res.status(200).json({
        ok: true,
        enQueueList: true,
        listSelectionMode: "gross_quality_composite",
        lang: "en",
        added: result.addedFromFresh,
        enqueuedFresh: result.enqueued,
        retainedFromPrev: result.retainedFromPrev,
        droppedDuplicates: result.droppedDuplicates,
        droppedInvalid: result.droppedInvalid,
        queueLength: result.nextQueueLength,
        readPage: result.pagesFetched,
        configuredPages: result.configuredPages,
        fallbackPagesUsed: result.fallbackPagesUsed,
        primaryHitsTotal: result.primaryHitsTotal,
        fallbackHitsTotal: result.fallbackHitsTotal,
        skippedAlreadySent: result.skippedAlreadySent,
        skippedDmNg: result.skippedDmNg,
        eligibleCandidates: result.eligibleCandidates,
        fetchedPosts: result.fetchedPosts,
        prevQueueLength: result.prevQueueLength,
        sampleHandles: result.sampleHandles
      });
    } catch (e) {
      console.error("[affiliate-recruit-run] en-queue-list error:", e?.message);
      return res.status(500).json({ ok: false, reason: "en_queue_list_failed", error: e?.message });
    }
  }

  // ----- 他地域キューライン: 全言語グロス取得（高品質順でキュー更新） -----
  if (forceMode === "regions-queue-list") {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const forcedLang = req.query?.lang || req.body?.lang;
    const targets = getGrossListTargetLangs(forcedLang);
    try {
      if (!targets.length) {
        return res.status(200).json({
          ok: false,
          reason: "regions_queue_list_invalid_target_lang",
          utcHour,
          forcedLang: String(forcedLang || "")
        });
      }

      const deliveryAggregate = normalizeDeliveryOutcomeAggregate(
        await kv.get(KV_KEY_DELIVERY_OUTCOME_AGG)
      );
      const perLang = [];
      for (const lang of targets) {
        const result = await refreshQueueForLang(lang, now, "regions-queue-list", {
          deliveryAggregate
        });
        perLang.push(result);
      }
      const grossSummary = aggregateGrossListSummary(perLang);

      const firstError = perLang.find((row) => !row.ok);
      if (firstError) {
        return res.status(200).json({
          ok: false,
          reason: firstError.reason || "regions_queue_list_failed",
          utcHour,
          targets,
          perLang
        });
      }

      return res.status(200).json({
        ok: true,
        regionsQueueList: true,
        listSelectionMode: "gross_quality_composite",
        scheduleMode: REGION_LIST_SCHEDULE_TEXT,
        utcHour,
        targets,
        perLang,
        grossSummary
      });
    } catch (e) {
      console.error("[affiliate-recruit-run] regions-queue-list error:", e?.message);
      return res.status(500).json({ ok: false, reason: "regions_queue_list_failed", error: e?.message });
    }
  }

  // ----- EN ＋ 地域 キュー送信: 15 分ごと（6言語グロス優先。15分15試行cap + 間隔送信） -----
  if (forceMode === "en-queue-send") {
    const now = new Date();
    const nowMs = now.getTime();
    const runStartedAtMs = nowMs;
    const dateStr = now.toISOString().split("T")[0];
    const utcMinute = now.getUTCMinutes();
    const slot15 = [0, 15, 30, 45].find((m) => utcMinute >= m && utcMinute < m + 15) ?? 0;
    const key403 = KV_KEY_403_WINDOW_EN(dateStr, slot15);
    const keyAttempt = KV_KEY_ATTEMPT_WINDOW_EN(dateStr, slot15);
    let sentToday = await getTodaySentCount();
    let attemptsThisWindow = parseInt(await kv.get(keyAttempt), 10) || 0;
    if (attemptsThisWindow >= EN_QUEUE_ATTEMPT_CAP_PER_15MIN) {
      console.log("[affiliate-recruit-run] en-queue-send skip (attempt cap):", {
        attemptsThisWindow,
        cap: EN_QUEUE_ATTEMPT_CAP_PER_15MIN,
        slot15
      });
      return res.status(200).json({
        ok: true,
        reason: "en_queue_attempt_cap",
        attemptsThisWindow,
        attemptCap: EN_QUEUE_ATTEMPT_CAP_PER_15MIN,
        slot15
      });
    }
    let count403 = parseInt(await kv.get(key403), 10) || 0;
    const raw = await kv.get(KV_KEY_QUEUE_EN);
    let queue = parseQueueValue(raw);
    const regionQueues = {};
    for (const regionLang of REGION_QUEUE_LANGS) {
      const rawRegion = await kv.get(KV_KEY_QUEUE_REGION(regionLang));
      regionQueues[regionLang] = parseQueueValue(rawRegion);
    }
    const sendTurnRaw = "global_priority";
    const sendQueueLangs = ["en", ...REGION_QUEUE_LANGS];
    const queuesByLang = {
      en: queue,
      ...regionQueues
    };
    const deliveryAggregateSnapshot = normalizeDeliveryOutcomeAggregate(
      await kv.get(KV_KEY_DELIVERY_OUTCOME_AGG)
    );
    const queueLengthsStart = computeQueueLengthsByLang(queuesByLang, sendQueueLangs);
    const sendStatsByLang = createSendStatsByLang(sendQueueLangs);
    for (const statLang of sendQueueLangs) {
      sendStatsByLang[statLang].queueStart = queueLengthsStart[statLang] || 0;
    }
    console.log("[affiliate-recruit-run] en-queue-send preflight:", {
      slot15,
      sentToday,
      count403,
      attemptsThisWindow,
      attemptCapPer15min: EN_QUEUE_ATTEMPT_CAP_PER_15MIN,
      maxAttemptsPerRun: EN_QUEUE_MAX_ATTEMPTS_PER_RUN,
      sendDelayMs: EN_RECRUIT_SEND_DELAY_MS,
      sendRunHardStopMs: EN_RECRUIT_SEND_RUN_HARD_STOP_MS,
      selectionMode: "6lang_gross_priority",
      deliverabilityWeight: EN_RECRUIT_DELIVERABILITY_PRIORITY_WEIGHT,
      deliverabilityMinAttempts: EN_RECRUIT_DELIVERABILITY_MIN_ATTEMPTS,
      recipient403SoftBlockStreak: EN_RECRUIT_LANG_RECIPIENT_403_SOFT_BLOCK_STREAK,
      recipient403SoftBlockAttempts: EN_RECRUIT_LANG_SOFT_BLOCK_ATTEMPTS,
      deliverabilityHistoryAttempts: deliveryAggregateSnapshot?.totals?.attempted || 0,
      queueLengthsStart,
    });
    let sentThisWindow = 0;
    let attemptsThisRun = 0;
    let sendDelayWaitedMsThisRun = 0;
    let firstAttemptSource = null;
    let lastAttemptStartedAtMs = 0;
    const sentHandles = [];
    const deliveryOutcomeAccumulator = createDeliveryOutcomeAccumulator();
    const opNotPermittedBlockedKeys = new Set();
    const opNotPermittedDeferredByLang = sendQueueLangs.reduce((acc, candidateLang) => {
      acc[candidateLang] = 0;
      return acc;
    }, {});
    const recipient403StreakByLang = sendQueueLangs.reduce((acc, candidateLang) => {
      acc[candidateLang] = 0;
      return acc;
    }, {});
    const softBlockedLangUntilAttempt = sendQueueLangs.reduce((acc, candidateLang) => {
      acc[candidateLang] = 0;
      return acc;
    }, {});
    const recipient403SoftBlockedByLang = sendQueueLangs.reduce((acc, candidateLang) => {
      acc[candidateLang] = 0;
      return acc;
    }, {});
    let opNotPermittedCountInWindow = 0;
    let enRecipient403StreakMax = 0;
    const enFailoverTriggered = false;
    const regionFailoverTriggeredLangs = [];
    const regionRecipient403StreakMaxByLang = REGION_QUEUE_LANGS.reduce((acc, candidateLang) => {
      acc[candidateLang] = 0;
      return acc;
    }, {});
    let stopReason = null;
    let stopAllSends = false;
    const canContinueRun = () => Date.now() - runStartedAtMs < EN_RECRUIT_SEND_RUN_HARD_STOP_MS;
    const registerAttempt = async (sourceLang) => {
      if (!canContinueRun()) return false;
      if (!firstAttemptSource && sourceLang) firstAttemptSource = sourceLang;
      attemptsThisRun += 1;
      attemptsThisWindow += 1;
      await kv.set(keyAttempt, String(attemptsThisWindow), {
        ex: EN_QUEUE_ATTEMPT_WINDOW_TTL_SECONDS
      });
      return true;
    };
    const waitBeforeNextAttempt = async () => {
      if (EN_RECRUIT_SEND_DELAY_MS <= 0 || lastAttemptStartedAtMs <= 0) return;
      const elapsed = Date.now() - lastAttemptStartedAtMs;
      const remaining = EN_RECRUIT_SEND_DELAY_MS - elapsed;
      if (remaining > 0) {
        await sleepMs(remaining);
        sendDelayWaitedMsThisRun += remaining;
      }
    };
    while (
      !stopAllSends &&
      attemptsThisRun < EN_QUEUE_MAX_ATTEMPTS_PER_RUN &&
      attemptsThisWindow < EN_QUEUE_ATTEMPT_CAP_PER_15MIN &&
      canContinueRun()
    ) {
      const picked = popNextGrossPriorityCandidate(
        queuesByLang,
        sendQueueLangs,
        opNotPermittedBlockedKeys,
        deliveryAggregateSnapshot,
        {
          attemptsThisRun,
          softBlockedLangUntilAttempt
        }
      );
      if (!picked) {
        stopReason = "queue_exhausted";
        break;
      }

      const { lang, item, itemKey } = picked;
      sendStatsByLang[lang].attempted += 1;

      const angleDecision = pickRecruitAngleDecisionFromItem(item);
      const angle = angleDecision.angle;
      const deliveryFeatureMeta = buildDeliveryFeatureMeta(
        item,
        lang,
        angleDecision.recommendedAngle || angle
      );
      const inviteUrlRaw = getFirstPromoterInviteUrl(lang, { ref: item.author_id });
      const inviteUrl = buildTrackedInviteUrl(req, inviteUrlRaw, {
        ref: item.author_id,
        authorId: item.author_id,
        lang,
        angle,
        handle: item.username,
        source: lang === "en" ? "en_queue_send" : "region_queue_send"
      });
      const whopUrl = getWhopAffiliateProgramUrl(lang);
      const { text, dmVariant } = fillRecruitDmTemplate(lang, {
        inviteUrl,
        whopAffiliateUrl: whopUrl,
        handle: item.username,
        angle,
        variant: req.query?.variant || req.body?.variant || item.dm_variant,
        recipientKey: item.author_id || item.username
      });

      await waitBeforeNextAttempt();
      const attempted = await registerAttempt(lang);
      if (!attempted) {
        queuesByLang[lang] = Array.isArray(queuesByLang[lang]) ? queuesByLang[lang] : [];
        queuesByLang[lang].unshift(item);
        stopReason = "run_time_limit";
        stopAllSends = true;
        break;
      }

      lastAttemptStartedAtMs = Date.now();
      const sendResult = await sendRecruitDm(item.username, text, { participantId: item.author_id });
      if (sendResult?.error) {
        const classified = classifyDmSendError(sendResult.error);
        if (classified.is403) {
          if (classified.type === "recipient_not_open") {
            sendStatsByLang[lang].recipient403 += 1;
            recordDeliveryOutcome(deliveryOutcomeAccumulator, deliveryFeatureMeta, "recipient403");
            await markDmNg(item.author_id, {
              username: item.username,
              score: item.score,
              lang,
              breakdown: item.breakdown
            });
            const nextRecipientStreak = (recipient403StreakByLang[lang] || 0) + 1;
            recipient403StreakByLang[lang] = nextRecipientStreak;
            if (lang === "en") {
              enRecipient403StreakMax = Math.max(enRecipient403StreakMax, nextRecipientStreak);
            } else {
              regionRecipient403StreakMaxByLang[lang] = Math.max(
                regionRecipient403StreakMaxByLang[lang] || 0,
                nextRecipientStreak
              );
            }
            if (
              EN_RECRUIT_LANG_RECIPIENT_403_SOFT_BLOCK_STREAK > 0 &&
              nextRecipientStreak >= EN_RECRUIT_LANG_RECIPIENT_403_SOFT_BLOCK_STREAK &&
              hasAlternativeQueueItems(queuesByLang, sendQueueLangs, lang)
            ) {
              const softBlockUntilAttempt = attemptsThisRun + EN_RECRUIT_LANG_SOFT_BLOCK_ATTEMPTS;
              softBlockedLangUntilAttempt[lang] = Math.max(
                softBlockedLangUntilAttempt[lang] || 0,
                softBlockUntilAttempt
              );
              recipient403SoftBlockedByLang[lang] = (recipient403SoftBlockedByLang[lang] || 0) + 1;
              recipient403StreakByLang[lang] = 0;
              console.warn("[affiliate-recruit-run] recipient403 soft-block language:", {
                lang,
                streak: nextRecipientStreak,
                streakThreshold: EN_RECRUIT_LANG_RECIPIENT_403_SOFT_BLOCK_STREAK,
                softBlockAttempts: EN_RECRUIT_LANG_SOFT_BLOCK_ATTEMPTS,
                attemptsThisRun,
                softBlockUntilAttempt
              });
            }
          } else if (classified.type === "operation_not_permitted") {
            sendStatsByLang[lang].operationNotPermitted403 += 1;
            recordDeliveryOutcome(
              deliveryOutcomeAccumulator,
              deliveryFeatureMeta,
              "operationNotPermitted403"
            );
            if (itemKey) opNotPermittedBlockedKeys.add(itemKey);
            queuesByLang[lang] = Array.isArray(queuesByLang[lang]) ? queuesByLang[lang] : [];
            queuesByLang[lang].push(item);
            opNotPermittedDeferredByLang[lang] = (opNotPermittedDeferredByLang[lang] || 0) + 1;
            opNotPermittedCountInWindow += 1;
            recipient403StreakByLang[lang] = 0;
            console.warn(
              "[affiliate-recruit-run] DM 403 operation_not_permitted windowCount:",
              opNotPermittedCountInWindow,
              "handle:",
              item.username,
              "lang:",
              lang,
              "deferredUntilNextWindow:",
              true
            );
          } else {
            sendStatsByLang[lang].other403 += 1;
            recordDeliveryOutcome(deliveryOutcomeAccumulator, deliveryFeatureMeta, "other403");
            recipient403StreakByLang[lang] = 0;
          }
          count403 += 1;
          await kv.set(key403, String(count403), { ex: 1200 });
          continue;
        }
        sendStatsByLang[lang].non403Errors += 1;
        recordDeliveryOutcome(deliveryOutcomeAccumulator, deliveryFeatureMeta, "non403Errors");
        queuesByLang[lang] = Array.isArray(queuesByLang[lang]) ? queuesByLang[lang] : [];
        queuesByLang[lang].unshift(item);
        stopReason = "dm_send_failed";
        stopAllSends = true;
        break;
      }

      await markSent(item.username, {
        lang,
        score: item.score,
        priority: item.score != null ? item.score / 100 : 0,
        author_id: item.author_id,
        angle,
        recommended_angle: angleDecision.recommendedAngle,
        angle_mode: angleDecision.angleMode,
        angle_confidence: item.angle_confidence ?? null,
        is_high_intent: item.is_high_intent ?? null,
        intent_segment: item.intent_segment ?? null,
        dm_variant: dmVariant,
        detected_via: item.detected_via || "default"
      });
      await saveRefSent(item.author_id, {
        handle: item.username,
        lang,
        score: item.score,
        priority: item.score != null ? item.score / 100 : 0,
        angle,
        recommended_angle: angleDecision.recommendedAngle,
        angle_mode: angleDecision.angleMode,
        angle_confidence: item.angle_confidence ?? null,
        is_high_intent: item.is_high_intent ?? null,
        intent_segment: item.intent_segment ?? null,
        dm_variant: dmVariant,
        detected_via: item.detected_via || "default"
      });
      await incrementSentStats(lang, item.score);
      await incrementTodaySentCount();
      recordDeliveryOutcome(deliveryOutcomeAccumulator, deliveryFeatureMeta, "sent");
      recipient403StreakByLang[lang] = 0;
      sentThisWindow += 1;
      sendStatsByLang[lang].sent += 1;
      sentToday += 1;
      sentHandles.push(lang === "en" ? item.username : `${item.username}(${lang})`);
    }

    queue = queuesByLang.en || [];
    await kv.set(KV_KEY_QUEUE_EN, JSON.stringify(queue), { ex: 86400 * 2 });
    for (const regionLang of REGION_QUEUE_LANGS) {
      regionQueues[regionLang] = queuesByLang[regionLang] || [];
      await kv.set(KV_KEY_QUEUE_REGION(regionLang), JSON.stringify(regionQueues[regionLang]), {
        ex: 86400 * 2
      });
    }
    const deliveryAggregateMerged = await flushDeliveryOutcomeAccumulator(deliveryOutcomeAccumulator);
    const deliveryOutcomeThisRun = normalizeDeliveryOutcomeCounter(
      deliveryOutcomeAccumulator?.totals
    );

    if (!stopReason) {
      if (attemptsThisRun >= EN_QUEUE_MAX_ATTEMPTS_PER_RUN) {
        stopReason = "attempts_per_run_reached";
      } else if (attemptsThisWindow >= EN_QUEUE_ATTEMPT_CAP_PER_15MIN) {
        stopReason = "attempts_per_15min_reached";
      } else if (!canContinueRun()) {
        stopReason = "run_time_limit";
      }
    }

    const queueLengthsEnd = {
      en: queue.length,
      ja: regionQueues.ja?.length || 0,
      ko: regionQueues.ko?.length || 0,
      ar: regionQueues.ar?.length || 0,
      es: regionQueues.es?.length || 0,
      pt: regionQueues.pt?.length || 0
    };
    const sendSummary = {
      slot15,
      sentThisWindow,
      runElapsedMs: Date.now() - runStartedAtMs,
      attemptsThisRun,
      attemptsThisWindow,
      maxAttemptsPerRun: EN_QUEUE_MAX_ATTEMPTS_PER_RUN,
      attemptCapPer15min: EN_QUEUE_ATTEMPT_CAP_PER_15MIN,
      sendDelayMs: EN_RECRUIT_SEND_DELAY_MS,
      sendDelayWaitedMsThisRun,
      selectionMode: "6lang_gross_priority",
      deliverabilityWeight: EN_RECRUIT_DELIVERABILITY_PRIORITY_WEIGHT,
      recipient403SoftBlockStreak: EN_RECRUIT_LANG_RECIPIENT_403_SOFT_BLOCK_STREAK,
      recipient403SoftBlockAttempts: EN_RECRUIT_LANG_SOFT_BLOCK_ATTEMPTS,
      sendTurn: sendTurnRaw,
      firstAttemptSource,
      count403ThisWindow: count403,
      sentToday,
      stopReason: stopReason || null,
      queueLengthsStart,
      queueLengthsEnd,
      sendStatsByLang,
      enFailoverTriggered,
      enRecipient403StreakMax,
      recipient403SoftBlockedByLang,
      softBlockedLangUntilAttempt,
      opNotPermittedCountInWindow,
      opNotPermittedDeferredByLang,
      regionFailoverTriggeredLangs,
      regionRecipient403StreakMaxByLang,
      deliveryOutcomeThisRun,
      deliveryHistoryAttempts: deliveryAggregateMerged?.totals?.attempted || 0
    };
    console.log("[affiliate-recruit-run] en-queue-send summary:", sendSummary);

    return res.status(200).json({
      ok: true,
      enQueueSend: true,
      sent: sentHandles.length,
      handles: sentHandles,
      sentToday,
      attemptsThisRun,
      attemptsThisWindow,
      runElapsedMs: Date.now() - runStartedAtMs,
      maxAttemptsPerRun: EN_QUEUE_MAX_ATTEMPTS_PER_RUN,
      attemptCapPer15min: EN_QUEUE_ATTEMPT_CAP_PER_15MIN,
      sendDelayMs: EN_RECRUIT_SEND_DELAY_MS,
      sendDelayWaitedMsThisRun,
      selectionMode: "6lang_gross_priority",
      deliverabilityWeight: EN_RECRUIT_DELIVERABILITY_PRIORITY_WEIGHT,
      recipient403SoftBlockStreak: EN_RECRUIT_LANG_RECIPIENT_403_SOFT_BLOCK_STREAK,
      recipient403SoftBlockAttempts: EN_RECRUIT_LANG_SOFT_BLOCK_ATTEMPTS,
      sendTurn: sendTurnRaw,
      firstAttemptSource,
      queueLength: queue.length,
      count403ThisWindow: count403,
      queueLengthsStart,
      queueLengthsEnd,
      sendStatsByLang,
      enFailoverTriggered,
      enRecipient403StreakMax,
      recipient403SoftBlockedByLang,
      softBlockedLangUntilAttempt,
      opNotPermittedCountInWindow,
      opNotPermittedDeferredByLang,
      regionFailoverTriggeredLangs,
      regionRecipient403StreakMaxByLang,
      deliveryOutcomeThisRun,
      deliveryHistoryAttempts: deliveryAggregateMerged?.totals?.attempted || 0,
      ...(stopReason ? { stopReason } : {})
    });
  }

  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  const utcHour = now.getUTCHours();
  const utcMinute = now.getUTCMinutes();

  const sentToday = await getTodaySentCount();

  const isEnBatchRun =
    forceMode === "en" ? true : forceMode === "slot" ? false : EN_RECRUIT_HOURS.includes(utcHour) && utcMinute === 0;
  const hourSent = await getHourSentCount(dateStr, utcHour);
  const slotsThisHour = SLOTS_BY_UTC_HOUR[utcHour];
  const lang = isEnBatchRun
    ? "en"
    : slotsThisHour && hourSent < slotsThisHour.length
      ? getNextRecruitLangForUtcHour(utcHour, hourSent)
      : null;

  if (!lang) {
    return res.status(200).json({
      ok: false,
      reason: "no_slot_this_hour",
      utcHour,
      utcMinute,
      sentToday
    });
  }

  const batchSize = isEnBatchRun ? EN_RECRUIT_BATCH_SIZE : RECRUIT_BATCH_SIZE_DEFAULT;
  const maxReadPages = Math.max(1, Number(process.env.AFFILIATE_RECRUIT_MAX_READ_PAGES || 3));
  console.log("[affiliate-recruit-run] mode:", forceMode || (isEnBatchRun ? "en" : "region"), "utcHour:", utcHour, "lang:", lang, "batchSize:", batchSize, "maxReadPages:", maxReadPages);

  const whopUrl = getWhopAffiliateProgramUrl(lang);

  let allPosts = [];
  let usersById = {};
  let nextToken = null;
  let pagesFetched = 0;
  let tried403 = [];
  let sentCount = 0;
  const sentHandles = [];

  const windowMinutes = isEnBatchRun ? EN_SEARCH_WINDOW_MINUTES : REGION_SEARCH_WINDOW_MINUTES;
  while (pagesFetched < maxReadPages) {
    try {
      const pageResult = await fetchOneSearchPage(lang, {
        nextToken: nextToken || undefined,
        maxResults: 100,
        windowMinutes
      });
      if (pageResult?.fatal402) {
        console.warn("[affiliate-recruit-run] search 402, stopping");
        break;
      }
      const pageData = pageResult?.data || [];
      const pageUsers = pageResult?.includes?.users || [];
      allPosts = allPosts.concat(pageData);
      for (const u of pageUsers) {
        if (u?.id) usersById[u.id] = u;
      }
      nextToken = pageResult?.nextToken || null;
      pagesFetched += 1;
      console.log("[affiliate-recruit-run] Read page", pagesFetched, "posts:", pageData.length, "nextToken:", !!nextToken);
    } catch (e) {
      console.error("[affiliate-recruit-run] fetchOneSearchPage error:", e?.message);
      return res.status(500).json({ ok: false, reason: "search_failed", error: e?.message });
    }

    const eligible = buildEligibleCandidates(allPosts, usersById, lang);

    if (!willSend) {
      const wouldSendList = [];
      for (const c of eligible) {
        if (wouldSendList.length >= batchSize) break;
        const already = await isAlreadySent(c.username);
        const isNg = await isDmNg(c.author_id);
        if (!already && !isNg) wouldSendList.push(c);
      }
      const c = wouldSendList[0];
      if (!c) {
        return res.status(200).json({
          ok: false,
          reason: "no_eligible_candidate",
          lang,
          totalCandidates: eligible.length,
          eligibleCount: eligible.length,
          sentToday,
          enBatch: isEnBatchRun,
          readPages: pagesFetched
        });
      }
      const angleDecision = pickRecruitAngleDecisionFromItem(c);
      const angle = angleDecision.angle;
      const inviteUrlDryRunRaw = getFirstPromoterInviteUrl(lang, { ref: c.author_id });
      const inviteUrlDryRun = buildTrackedInviteUrl(req, inviteUrlDryRunRaw, {
        ref: c.author_id,
        authorId: c.author_id,
        lang,
        angle,
        handle: c.username,
        source: "dry_run"
      });
      const { text, variant, dmVariant, variantName } = fillRecruitDmTemplate(lang, {
        inviteUrl: inviteUrlDryRun,
        whopAffiliateUrl: whopUrl,
        handle: c.username,
        angle,
        variant: req.query?.variant || req.body?.variant,
        recipientKey: c.author_id || c.username
      });
      return res.status(200).json({
        ok: true,
        dryRun: true,
        wouldSend: {
          handle: c.username,
          lang,
          textLength: text.length,
          score: c.score,
          priority: c.priority,
          breakdown: c.breakdown,
          dmAngle: angle,
          recommendedAngle: angleDecision.recommendedAngle,
          angleMode: angleDecision.angleMode,
          angleConfidence: c.angleConfidence ?? 0,
          isHighIntent: Boolean(c.isHighIntent),
          intentSegment: c.intentSegment || null,
          dmVariantIndex: variant,
          dmVariant: dmVariant,
          dmVariantName: variantName,
          detectedVia: c.detectedVia || "default"
        },
        wouldSendCount: wouldSendList.length,
        enBatch: isEnBatchRun,
        sentToday,
        readPages: pagesFetched,
        note: !auth ? "Set CRON_SECRET or ?secret= for actual send" : "dryRun"
      });
    }

    for (const c of eligible) {
      if (sentCount >= batchSize) break;
      if (await isAlreadySent(c.username)) continue;
      if (await isDmNg(c.author_id)) continue;

      const angleDecision = pickRecruitAngleDecisionFromItem(c);
      const angle = angleDecision.angle;
      const inviteUrlRaw = getFirstPromoterInviteUrl(lang, { ref: c.author_id });
      const inviteUrl = buildTrackedInviteUrl(req, inviteUrlRaw, {
        ref: c.author_id,
        authorId: c.author_id,
        lang,
        angle,
        handle: c.username,
        source: isEnBatchRun ? "en_batch_send" : "legacy_send"
      });
      const { text, variant, dmVariant, variantName } = fillRecruitDmTemplate(lang, {
        inviteUrl,
        whopAffiliateUrl: whopUrl,
        handle: c.username,
        angle,
        variant: req.query?.variant || req.body?.variant,
        recipientKey: c.author_id || c.username
      });
      const sendResult = await sendRecruitDm(c.username, text, { participantId: c.author_id });

      if (sendResult?.error) {
        const classified = classifyDmSendError(sendResult.error);
        if (classified.is403) {
          if (classified.type === "recipient_not_open") {
            await markDmNg(c.author_id, {
              username: c.username,
              score: c.score,
              lang,
              breakdown: c.breakdown,
            });
          }
          tried403.push(c.username);
          console.warn(
            "[affiliate-recruit-run] DM 403, next candidate:",
            c.username,
            c.author_id,
            "type:",
            classified.type
          );
          continue;
        }
        return res.status(200).json({
          ok: false,
          reason: "dm_send_failed",
          handle: c.username,
          error: sendResult.error,
          sentToday: sentToday + sentCount,
          enBatch: isEnBatchRun,
          sentInThisRun: sentCount,
          readPages: pagesFetched
        });
      }

      await markSent(c.username, {
        lang,
        score: c.score,
        priority: c.priority,
        author_id: c.author_id,
        angle,
        recommended_angle: angleDecision.recommendedAngle,
        angle_mode: angleDecision.angleMode,
        angle_confidence: c.angleConfidence ?? null,
        is_high_intent: c.isHighIntent ?? null,
        intent_segment: c.intentSegment ?? null,
        dm_variant: dmVariant,
        detected_via: c.detectedVia || "default"
      });
      await saveRefSent(c.author_id, {
        handle: c.username,
        lang,
        score: c.score,
        priority: c.priority,
        angle,
        recommended_angle: angleDecision.recommendedAngle,
        angle_mode: angleDecision.angleMode,
        angle_confidence: c.angleConfidence ?? null,
        is_high_intent: c.isHighIntent ?? null,
        intent_segment: c.intentSegment ?? null,
        dm_variant: dmVariant,
        detected_via: c.detectedVia || "default"
      });
      await incrementSentStats(lang, c.score);
      await incrementTodaySentCount();
      if (!isEnBatchRun) await incrementHourSent(dateStr, utcHour);
      sentCount += 1;
      console.log(
        "[affiliate-recruit-run] sent:",
        c.username,
        "lang:",
        lang,
        "angle:",
        angle,
        "angleMode:",
        angleDecision.angleMode,
        "recommendedAngle:",
        angleDecision.recommendedAngle,
        "dmVariant:",
        dmVariant,
        "detectedVia:",
        c.detectedVia || "default"
      );
      sentHandles.push(c.username);
    }

    if (sentCount >= batchSize) break;
    if (!nextToken) break;
  }

  if (sentCount > 0) {
    return res.status(200).json({
      ok: true,
      sent: sentCount,
      lang,
      ...(isEnBatchRun ? { enBatch: true, handles: sentHandles } : {}),
      sentToday: sentToday + sentCount,
      tried403Count: tried403.length,
      readPages: pagesFetched
    });
  }
  return res.status(200).json({
    ok: false,
    reason: "no_eligible_or_all_403",
    lang,
    ...(isEnBatchRun ? { enBatch: true } : {}),
    tried403,
    sentToday,
    readPages: pagesFetched
  });
};
