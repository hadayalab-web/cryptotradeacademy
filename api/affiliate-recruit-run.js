/**
 * アフィリエイトリクルート 1 本送信（Cron または手動 POST）
 * フォーカス: (1) すでにアフィリエイター (2) DMで案件募集中 (3) ノイズ徹底排除 (4) 403は追いかけない（DM_NG 90日）
 * 言語別スロットで候補検索 → FirstPromoter 招待 URL 入り DM を 1 通。認証: CRON_SECRET / ?dryRun=1 で送信スキップ。
 */
require("../utils/suppressKnownWarnings");
const { kv } = require("../utils/kv");
const { fetchCandidatesFromSearch } = require("../services/td/affiliateRecruitSearch");
const { sendRecruitDm } = require("../services/x/dmClient");
const { fillRecruitDmTemplate } = require("../config/affiliateRecruitDmTemplates");
const {
  getFirstPromoterInviteUrl,
  getWhopAffiliateProgramUrl,
  AFFILIATE_DM_DAILY_CAP,
  EN_RECRUIT_HOURS,
  EN_RECRUIT_BATCH_SIZE,
  SLOT_BLOCK_HOURS,
  SLOT_BLOCKS,
  SLOTS_BY_UTC_HOUR,
  getNextRecruitLangForUtcHour
} = require("../config/affiliateRecruitConfig");
const {
  computeCandidateScore,
  getRegionCoefficientByLang,
  getRiskFactor,
  hasProfileLink,
  hasNigeriaKeyword,
  PRIORITY_MIN_SEND
} = require("../services/td/affiliateRecruitScoring");
const { getCrConfig } = require("../services/td/affiliateRecruitCrConfig");

const KV_KEY_DAILY_COUNT = (dateStr) => `affiliate_recruit:daily_count:${dateStr}`;
const KV_KEY_SENT_HANDLE = (handle) => `affiliate_recruit:sent:${handle.toLowerCase()}`;
const KV_KEY_HOUR_SENT = (dateStr, hour) => `affiliate_recruit:hour_sent:${dateStr}:${hour}`;
const KV_KEY_DM_NG = (userId) => `affiliate_recruit:dm_ng:${userId}`;
const KV_KEY_REF_SENT = (authorId) => `affiliate_recruit:ref_sent:${authorId}`;
const KV_KEY_STATS_LANG = (lang) => `affiliate_recruit:stats:lang:${lang}`;
const KV_KEY_STATS_LANG_BAND = (lang, band) => `affiliate_recruit:stats:lang:${lang}:band:${band}`;
const SENT_TTL = 86400 * 90; // 90日（同一 handle に再送しない期間）
const DM_NG_TTL = 86400 * 90; // 90日（403 だったユーザーに再送しない期間）
const REF_SENT_TTL = 86400 * 90; // 90日（DM→登録紐づけ用）

const RECRUIT_STATS_LANGS = ["en", "ja", "ko", "es", "pt", "ar"];
const SCORE_BANDS = ["0-49", "50-64", "65-79", "80-100"];

function getScoreBand(score) {
  if (score == null || typeof score !== "number") return "0-49";
  if (score < 50) return "0-49";
  if (score < 65) return "50-64";
  if (score < 80) return "65-79";
  return "80-100";
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
 * 送信済みマーク。payload を渡すと送信ログとして lang/score/priority/author_id を保存（返信率・登録率の国×言語×スコア帯観測用）
 * @param {string} handle - 送信先 @username
 * @param {{ lang?: string; score?: number; priority?: number; author_id?: string }} [payload] - 検索時の言語・スコア・優先度・author_id
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
          author_id: payload.author_id ?? null
        })
      : String(ts);
  await kv.set(KV_KEY_SENT_HANDLE(handle), value, { ex: SENT_TTL });
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
  await kv.set(KV_KEY_DM_NG(String(userId)), JSON.stringify(payload), { ex: DM_NG_TTL });
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
    const inviteUrl = getFirstPromoterInviteUrl(lang);
    const whopUrl = getWhopAffiliateProgramUrl(lang);
    const { text } = fillRecruitDmTemplate(lang, {
      inviteUrl,
      whopAffiliateUrl: whopUrl,
      handle: targetHandle
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
      dmEventId: sendResult.dmEventId
    });
  }

  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  const utcHour = now.getUTCHours();
  const utcMinute = now.getUTCMinutes();

  const dailyCap = AFFILIATE_DM_DAILY_CAP > 0 ? AFFILIATE_DM_DAILY_CAP : Infinity;
  const sentToday = await getTodaySentCount();
  if (sentToday >= dailyCap) {
    return res.status(200).json({
      ok: false,
      reason: "daily_cap_reached",
      sentToday,
      dailyCap
    });
  }

  const forceMode = req.query?.mode || req.body?.mode;
  const isSlotBlockRun = forceMode === "slot" && SLOT_BLOCK_HOURS.includes(utcHour);
  if (forceMode === "slot" && !SLOT_BLOCK_HOURS.includes(utcHour)) {
    return res.status(200).json({
      ok: false,
      reason: "no_slot_this_hour",
      utcHour,
      slotBlockHours: SLOT_BLOCK_HOURS,
      sentToday,
      dailyCap
    });
  }

  if (isSlotBlockRun) {
    const crConfig = await getCrConfig();
    const block = SLOT_BLOCKS[utcHour] || [];
    const blockSummary = block.map((p) => `${p.lang}=${p.count}`).join(", ");
    console.log("[affiliate-recruit-run] slot block utcHour=" + utcHour + " parts=[" + blockSummary + "]");
    let totalSent = 0;
    const sentHandles = [];
    for (const part of block) {
      if (sentToday + totalSent >= dailyCap) break;
      const { lang, count } = part;
      console.log("[affiliate-recruit-run] slot part lang=" + lang + " count=" + count);
      let result;
      try {
        result = await fetchCandidatesFromSearch(lang, { maxResults: 30, pagesPerBucket: 1 });
      } catch (e) {
        console.error("[affiliate-recruit-run] slot block fetch error:", lang, e?.message);
        continue;
      }
      const posts = result?.data || [];
      const usersList = result?.includes?.users || [];
      const usersById = {};
      for (const u of usersList) if (u?.id) usersById[u.id] = u;
      const tweetsByAuthor = {};
      for (const p of posts) {
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
        const { score, excluded, reason, breakdown } = computeCandidateScore(u, tweets);
        const C = crConfig.C[lang] ?? getRegionCoefficientByLang(lang);
        const B = crConfig.B[getScoreBand(score)] ?? 1.0;
        const priority =
          !excluded && score != null
            ? (score / 100) * C * getRiskFactor(u, tweets, lang) * B
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
          priority
        });
      }
      const ngFilter = (c) =>
        lang !== "en" || !hasProfileLink(c.user) || !hasNigeriaKeyword(c.user?.description || "");
      const eligible = candidates
        .filter((c) => !c.excluded && (c.priority ?? 0) >= PRIORITY_MIN_SEND && ngFilter(c))
        .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
      const whopUrl = getWhopAffiliateProgramUrl(lang);
      let sentForPart = 0;
      for (const c of eligible) {
        if (sentForPart >= count || sentToday + totalSent >= dailyCap) break;
        if (await isAlreadySent(c.username)) continue;
        if (await isDmNg(c.author_id)) continue;
        const inviteUrl = getFirstPromoterInviteUrl(lang, { ref: c.author_id });
        const { text } = fillRecruitDmTemplate(lang, { inviteUrl, whopAffiliateUrl: whopUrl, handle: c.username });
        const sendResult = await sendRecruitDm(c.username, text, { participantId: c.author_id });
        if (sendResult?.error) {
          const is403 = String(sendResult.error).includes("403") || String(sendResult.error).toLowerCase().includes("permission to dm");
          if (is403) {
            await markDmNg(c.author_id, { username: c.username, score: c.score, lang, breakdown: c.breakdown });
            continue;
          }
          break;
        }
        await markSent(c.username, {
          lang,
          score: c.score,
          priority: c.priority,
          author_id: c.author_id
        });
        await saveRefSent(c.author_id, { handle: c.username, lang, score: c.score, priority: c.priority });
        await incrementSentStats(lang, c.score);
        await incrementTodaySentCount();
        sentForPart++;
        totalSent++;
        sentHandles.push(c.username);
      }
    }
    return res.status(200).json({
      ok: true,
      slotBlock: true,
      utcHour,
      sent: totalSent,
      handles: sentHandles,
      sentToday: sentToday + totalSent,
      dailyCap
    });
  }

  const isEnBatchRun =
    forceMode === "en"
      ? true
      : forceMode === "slot"
        ? false
        : EN_RECRUIT_HOURS.includes(utcHour) && utcMinute === 0;
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
      sentToday,
      dailyCap
    });
  }

  const batchSize = isEnBatchRun
    ? Math.min(EN_RECRUIT_BATCH_SIZE, Math.max(0, dailyCap - sentToday))
    : 1;
  console.log("[affiliate-recruit-run] mode:", forceMode || (isEnBatchRun ? "en" : "slot"), "utcHour:", utcHour, "lang:", lang, "batchSize:", batchSize);
  if (isEnBatchRun && batchSize <= 0) {
    return res.status(200).json({
      ok: false,
      reason: "daily_cap_reached",
      sentToday,
      dailyCap,
      enBatch: true
    });
  }

  const crConfig = await getCrConfig();
  let result;
  try {
    result = await fetchCandidatesFromSearch(lang, { maxResults: 30, pagesPerBucket: 1 });
  } catch (e) {
    console.error("[affiliate-recruit-run] fetchCandidatesFromSearch error:", e?.message);
    return res.status(500).json({ ok: false, reason: "search_failed", error: e?.message });
  }

  const posts = result?.data || [];
  const usersList = result?.includes?.users || [];
  const usersById = {};
  for (const u of usersList) {
    if (u?.id) usersById[u.id] = u;
  }

  const tweetsByAuthor = {};
  for (const p of posts) {
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
    const { score, excluded, reason, breakdown } = computeCandidateScore(u, tweets);
    const C = crConfig.C[lang] ?? getRegionCoefficientByLang(lang);
    const B = crConfig.B[getScoreBand(score)] ?? 1.0;
    const priority =
      !excluded && score != null
        ? (score / 100) * C * getRiskFactor(u, tweets, lang) * B
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
      priority
    });
  }

  const ngFilter = (c) =>
    lang !== "en" || !hasProfileLink(c.user) || !hasNigeriaKeyword(c.user?.description || "");
  const eligible = candidates
    .filter((c) => !c.excluded && (c.priority ?? 0) >= PRIORITY_MIN_SEND && ngFilter(c))
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

  const whopUrl = getWhopAffiliateProgramUrl(lang);

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
        totalCandidates: candidates.length,
        eligibleCount: eligible.length,
        sentToday,
        dailyCap,
        enBatch: isEnBatchRun
      });
    }
    const inviteUrlDryRun = getFirstPromoterInviteUrl(lang, { ref: c.author_id });
    const { text, variant, variantName } = fillRecruitDmTemplate(lang, {
      inviteUrl: inviteUrlDryRun,
      whopAffiliateUrl: whopUrl,
      handle: c.username
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
        dmVariant: variant,
        dmVariantName: variantName
      },
      wouldSendCount: isEnBatchRun ? wouldSendList.length : 1,
      enBatch: isEnBatchRun,
      sentToday,
      dailyCap,
      note: !auth ? "Set CRON_SECRET or ?secret= for actual send" : "dryRun"
    });
  }

  let tried403 = [];
  let sentCount = 0;
  const sentHandles = [];
  for (const c of eligible) {
    if (sentCount >= batchSize) break;
    if (await isAlreadySent(c.username)) continue;
    if (await isDmNg(c.author_id)) continue;

    const inviteUrl = getFirstPromoterInviteUrl(lang, { ref: c.author_id });
    const { text, variant, variantName } = fillRecruitDmTemplate(lang, {
      inviteUrl,
      whopAffiliateUrl: whopUrl,
      handle: c.username
    });
    const sendResult = await sendRecruitDm(c.username, text, { participantId: c.author_id });

    if (sendResult?.error) {
      const is403 =
        String(sendResult.error).includes("403") ||
        String(sendResult.error).toLowerCase().includes("permission to dm");
      if (is403) {
        await markDmNg(c.author_id, {
          username: c.username,
          score: c.score,
          lang,
          breakdown: c.breakdown,
        });
        tried403.push(c.username);
        console.warn("[affiliate-recruit-run] DM 403, next candidate:", c.username, c.author_id);
        continue;
      }
      return res.status(200).json({
        ok: false,
        reason: "dm_send_failed",
        handle: c.username,
        error: sendResult.error,
        sentToday: sentToday + sentCount,
        dailyCap,
        enBatch: isEnBatchRun,
        sentInThisRun: sentCount
      });
    }

    await markSent(c.username, {
      lang,
      score: c.score,
      priority: c.priority,
      author_id: c.author_id
    });
    await saveRefSent(c.author_id, { handle: c.username, lang, score: c.score, priority: c.priority });
    await incrementSentStats(lang, c.score);
    await incrementTodaySentCount();
    if (!isEnBatchRun) await incrementHourSent(dateStr, utcHour);
    sentCount += 1;
    console.log("[affiliate-recruit-run] sent:", c.username, "lang:", lang);
    if (isEnBatchRun) sentHandles.push(c.username);
    if (!isEnBatchRun) {
      return res.status(200).json({
        ok: true,
        sent: 1,
        handle: c.username,
        lang,
        score: c.score,
        dmVariant: variant,
        dmVariantName: variantName,
        dmEventId: sendResult.dmEventId,
        sentToday: sentToday + 1,
        dailyCap,
        tried403Count: tried403.length
      });
    }
  }

  if (isEnBatchRun && sentCount > 0) {
    return res.status(200).json({
      ok: true,
      sent: sentCount,
      lang: "en",
      enBatch: true,
      handles: sentHandles,
      sentToday: sentToday + sentCount,
      dailyCap,
      tried403Count: tried403.length
    });
  }
  if (isEnBatchRun && sentCount === 0) {
    return res.status(200).json({
      ok: false,
      reason: "no_eligible_or_all_403",
      lang: "en",
      enBatch: true,
      tried403,
      sentToday,
      dailyCap
    });
  }

  return res.status(200).json({
    ok: false,
    reason: "dm_send_failed",
    message: "all_eligible_tried",
    tried403,
    sentToday,
    dailyCap
  });
};
