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
  EN_QUEUE_DAILY_CAP,
  EN_QUEUE_403_BREAKER_PER_15MIN,
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
/** 地域キュー対応言語（EN は別キュー）。送信順。 */
const REGION_QUEUE_LANGS = ["ja", "ko", "ar", "es", "pt"];
/** 他地域リスト取得: 言語ごとの取得時刻（UTC）。1日1ページずつ、時間帯を地域に合わせる。 */
const REGION_LIST_HOUR_BY_LANG = { ja: 12, ko: 13, ar: 17, es: 21, pt: 22 };
// DM→登録紐づけ用 KV の有効期限。90 日は送信から登録までの想定期間をカバーしつつストレージを抑える目安。運用指示で固定。短縮したい場合はコードまたは env で変更可。
const REF_SENT_TTL = 86400 * 90;
// 403 detail が "This operation is not permitted." の連続時に早期停止する閾値（送信側制限の可能性を想定）
const DM_OPERATION_NOT_PERMITTED_STREAK_BREAKER = Math.max(
  1,
  Number(process.env.EN_RECRUIT_OP_NOT_PERMITTED_BREAKER || 5)
);
const DM_OPERATION_NOT_PERMITTED_WINDOW_BREAKER = Math.max(
  1,
  Number(process.env.EN_RECRUIT_OP_NOT_PERMITTED_WINDOW_BREAKER || 5)
);

const RECRUIT_STATS_LANGS = ["en", "ja", "ko", "es", "pt", "ar"];
const SCORE_BANDS = ["0-49", "50-64", "65-79", "80-100"];

function getScoreBand(score) {
  if (score == null || typeof score !== "number") return "0-49";
  if (score < 50) return "0-49";
  if (score < 65) return "50-64";
  if (score < 80) return "65-79";
  return "80-100";
}

/** 検索結果＋ユーザーから送信候補を構築。EN/regions 共通。並び順は recency のみ（スコア・係数は使わない）。 */
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
    const { score, excluded, reason, breakdown } = computeCandidateScore(u, tweets);
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
      priority: score != null ? score / 100 : 0,
      mostRecentTime
    });
  }
  return candidates
    .filter((c) => !c.excluded)
    .sort((a, b) => (b.mostRecentTime ?? 0) - (a.mostRecentTime ?? 0));
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

  const forceMode = req.query?.mode || req.body?.mode;

  // ----- EN キューライン: 6h ごとリスト取得（複数ページ → キュー投入） -----
  if (forceMode === "en-queue-list") {
    const now = new Date();
    const utcHour = now.getUTCHours();
    if (!EN_QUEUE_LIST_HOURS_UTC.includes(utcHour)) {
      console.log(
        `[affiliate-recruit-en-list] skip utcHour=${utcHour} expected=0,6,12,18`
      );
      return res.status(200).json({
        ok: true,
        reason: "en_queue_list_skip_hour",
        utcHour,
        message: "Run only at 0,6,12,18 UTC"
      });
    }
    try {
      const windowMinutes = EN_SEARCH_WINDOW_MINUTES;
      const listPages = EN_QUEUE_LIST_PAGES;
      let pagesFetched = 0;
      let nextToken = null;
      let allPosts = [];
      const usersById = {};
      while (pagesFetched < listPages) {
        const pageResult = await fetchOneSearchPage("en", {
          maxResults: 100,
          windowMinutes,
          nextToken: nextToken || undefined
        });
        if (pageResult?.fatal402) {
          return res.status(200).json({
            ok: false,
            reason: "search_402",
            enQueueList: true,
            pagesFetched
          });
        }
        const pageData = pageResult?.data || [];
        const pageUsers = pageResult?.includes?.users || [];
        allPosts = allPosts.concat(pageData);
        for (const u of pageUsers) {
          if (u?.id) usersById[u.id] = u;
        }
        pagesFetched += 1;
        nextToken = pageResult?.nextToken || null;
        if (!nextToken) break;
      }
      const eligible = buildEligibleCandidates(allPosts, usersById, "en");
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
          breakdown: c.breakdown
        });
      }
      // 6h ごとにそのブロック用でキューを上書き（リスト鮮度・キュー肥大化防止）
      const queue = toEnqueue;
      const prevQueueLength = parseQueueValue(await kv.get(KV_KEY_QUEUE_EN)).length;
      await kv.set(KV_KEY_QUEUE_EN, JSON.stringify(queue), { ex: 86400 * 2 });
      const listSummary = {
        mode: "en-queue-list",
        lang: "en",
        utcHour,
        runAt: now.toISOString(),
        pagesFetched,
        configuredPages: listPages,
        fetchedPosts: allPosts.length,
        fetchedUsers: Object.keys(usersById).length,
        eligibleCandidates: eligible.length,
        skippedAlreadySent,
        skippedDmNg,
        enqueued: toEnqueue.length,
        prevQueueLength,
        nextQueueLength: queue.length,
        sampleHandles: toEnqueue.slice(0, 3).map((x) => x.username)
      };
      console.log("[affiliate-recruit-run] list summary:", listSummary);
      console.log(
        `[affiliate-recruit-en-list] utcHour=${utcHour} pages=${pagesFetched}/${listPages} fetchedPosts=${allPosts.length} eligible=${eligible.length} skippedSent=${skippedAlreadySent} skippedDmNg=${skippedDmNg} enqueued=${toEnqueue.length} prevQueue=${prevQueueLength} nextQueue=${queue.length}`
      );
      return res.status(200).json({
        ok: true,
        enQueueList: true,
        added: toEnqueue.length,
        queueLength: queue.length,
        readPage: pagesFetched,
        configuredPages: listPages,
        skippedAlreadySent,
        skippedDmNg,
        eligibleCandidates: eligible.length,
        fetchedPosts: allPosts.length,
        prevQueueLength,
        sampleHandles: listSummary.sampleHandles
      });
    } catch (e) {
      console.error("[affiliate-recruit-run] en-queue-list error:", e?.message);
      return res.status(500).json({ ok: false, reason: "en_queue_list_failed", error: e?.message });
    }
  }

  // ----- 他地域キューライン: リスト取得（1日複数ページ/言語・言語ごとの時間帯で取得 → キュー上書き。1日かけて枯渇まで送信） -----
  if (forceMode === "regions-queue-list") {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const lang = Object.keys(REGION_LIST_HOUR_BY_LANG).find((l) => REGION_LIST_HOUR_BY_LANG[l] === utcHour);
    if (!lang) {
      console.log(
        `[affiliate-recruit-regions-list] skip utcHour=${utcHour} expected=12(ja),13(ko),17(ar),21(es),22(pt)`
      );
      return res.status(200).json({
        ok: true,
        reason: "regions_queue_list_skip_hour",
        utcHour,
        message: "Run at 12(ja), 13(ko), 17(ar), 21(es), 22(pt) UTC"
      });
    }
    try {
      const windowMinutes = REGION_SEARCH_WINDOW_MINUTES;
      const listPages = REGION_QUEUE_LIST_PAGES;
      let pagesFetched = 0;
      let nextToken = null;
      let allPosts = [];
      const usersById = {};
      while (pagesFetched < listPages) {
        const pageResult = await fetchOneSearchPage(lang, {
          maxResults: 100,
          windowMinutes,
          nextToken: nextToken || undefined
        });
        if (pageResult?.fatal402) {
          return res.status(200).json({
            ok: false,
            reason: "search_402",
            regionsQueueList: true,
            lang,
            pagesFetched
          });
        }
        const pageData = pageResult?.data || [];
        const pageUsers = pageResult?.includes?.users || [];
        allPosts = allPosts.concat(pageData);
        for (const u of pageUsers) {
          if (u?.id) usersById[u.id] = u;
        }
        pagesFetched += 1;
        nextToken = pageResult?.nextToken || null;
        if (!nextToken) break;
      }
      const eligible = buildEligibleCandidates(allPosts, usersById, lang);
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
          breakdown: c.breakdown
        });
      }
      const prevQueueLength = parseQueueValue(await kv.get(KV_KEY_QUEUE_REGION(lang))).length;
      await kv.set(KV_KEY_QUEUE_REGION(lang), JSON.stringify(toEnqueue), { ex: 86400 * 2 });
      const listSummary = {
        mode: "regions-queue-list",
        lang,
        utcHour,
        runAt: now.toISOString(),
        pagesFetched,
        configuredPages: listPages,
        fetchedPosts: allPosts.length,
        fetchedUsers: Object.keys(usersById).length,
        eligibleCandidates: eligible.length,
        skippedAlreadySent,
        skippedDmNg,
        enqueued: toEnqueue.length,
        prevQueueLength,
        nextQueueLength: toEnqueue.length,
        sampleHandles: toEnqueue.slice(0, 3).map((x) => x.username)
      };
      console.log("[affiliate-recruit-run] list summary:", listSummary);
      console.log(
        `[affiliate-recruit-regions-list] lang=${lang} utcHour=${utcHour} pages=${pagesFetched}/${listPages} fetchedPosts=${allPosts.length} eligible=${eligible.length} skippedSent=${skippedAlreadySent} skippedDmNg=${skippedDmNg} enqueued=${toEnqueue.length} prevQueue=${prevQueueLength} nextQueue=${toEnqueue.length}`
      );
      return res.status(200).json({
        ok: true,
        regionsQueueList: true,
        lang,
        utcHour,
        added: toEnqueue.length,
        queueLength: toEnqueue.length,
        readPage: pagesFetched,
        configuredPages: listPages,
        skippedAlreadySent,
        skippedDmNg,
        eligibleCandidates: eligible.length,
        fetchedPosts: allPosts.length,
        prevQueueLength,
        sampleHandles: listSummary.sampleHandles
      });
    } catch (e) {
      console.error("[affiliate-recruit-run] regions-queue-list error:", e?.message);
      return res.status(500).json({ ok: false, reason: "regions_queue_list_failed", lang, error: e?.message });
    }
  }

  // ----- EN ＋ 地域 キュー送信: 15 分ごと（EN 優先で枯渇まで。15 成功/窓・403 ブレーカー 20 はアカウント共通） -----
  if (forceMode === "en-queue-send") {
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    const utcMinute = now.getUTCMinutes();
    const slot15 = [0, 15, 30, 45].find((m) => utcMinute >= m && utcMinute < m + 15) ?? 0;
    const key403 = KV_KEY_403_WINDOW_EN(dateStr, slot15);
    const MAX_SUCCESS_PER_15MIN = 15;
    let sentToday = await getTodaySentCount();
    const dailyCapActive = EN_QUEUE_DAILY_CAP > 0;
    if (dailyCapActive && sentToday >= EN_QUEUE_DAILY_CAP) {
      console.log("[affiliate-recruit-run] en-queue-send skip (daily cap):", {
        sentToday,
        cap: EN_QUEUE_DAILY_CAP
      });
      return res.status(200).json({
        ok: true,
        reason: "en_queue_send_cap",
        sentToday,
        cap: EN_QUEUE_DAILY_CAP
      });
    }
    let count403 = parseInt(await kv.get(key403), 10) || 0;
    if (count403 >= EN_QUEUE_403_BREAKER_PER_15MIN) {
      console.log("[affiliate-recruit-run] en-queue-send skip (403 breaker):", {
        count403,
        breaker: EN_QUEUE_403_BREAKER_PER_15MIN,
        slot15
      });
      return res.status(200).json({
        ok: true,
        reason: "en_queue_send_breaker",
        count403,
        breaker: EN_QUEUE_403_BREAKER_PER_15MIN
      });
    }
    const raw = await kv.get(KV_KEY_QUEUE_EN);
    let queue = parseQueueValue(raw);
    const regionQueues = {};
    for (const regionLang of REGION_QUEUE_LANGS) {
      const rawRegion = await kv.get(KV_KEY_QUEUE_REGION(regionLang));
      regionQueues[regionLang] = parseQueueValue(rawRegion);
    }
    const queueLengthsStart = {
      en: queue.length,
      ja: regionQueues.ja?.length || 0,
      ko: regionQueues.ko?.length || 0,
      ar: regionQueues.ar?.length || 0,
      es: regionQueues.es?.length || 0,
      pt: regionQueues.pt?.length || 0
    };
    const sendStatsByLang = createSendStatsByLang(["en", ...REGION_QUEUE_LANGS]);
    for (const statLang of Object.keys(queueLengthsStart)) {
      sendStatsByLang[statLang].queueStart = queueLengthsStart[statLang];
    }
    console.log("[affiliate-recruit-run] en-queue-send preflight:", {
      slot15,
      sentToday,
      count403,
      queueLengthsStart,
    });
    const lang = "en";
    const whopUrl = getWhopAffiliateProgramUrl(lang);
    let sentThisWindow = 0;
    const sentHandles = [];
    let opNotPermittedStreak = 0;
    let opNotPermittedCountInWindow = 0;
    let stopReason = null;
    let stopAllSends = false;
    while (
      (!dailyCapActive || sentToday < EN_QUEUE_DAILY_CAP) &&
      sentThisWindow < MAX_SUCCESS_PER_15MIN &&
      count403 < EN_QUEUE_403_BREAKER_PER_15MIN &&
      queue.length > 0
    ) {
      const item = queue.shift();
      if (!item?.username) continue;
      sendStatsByLang.en.attempted += 1;
      const inviteUrl = getFirstPromoterInviteUrl(lang, { ref: item.author_id });
      const { text } = fillRecruitDmTemplate(lang, { inviteUrl, whopAffiliateUrl: whopUrl, handle: item.username });
      const sendResult = await sendRecruitDm(item.username, text, { participantId: item.author_id });
      if (sendResult?.error) {
        const classified = classifyDmSendError(sendResult.error);
        if (classified.is403) {
          if (classified.type === "recipient_not_open") {
            sendStatsByLang.en.recipient403 += 1;
            await markDmNg(item.author_id, { username: item.username, score: item.score, lang, breakdown: item.breakdown });
            opNotPermittedStreak = 0;
          } else if (classified.type === "operation_not_permitted") {
            sendStatsByLang.en.operationNotPermitted403 += 1;
            opNotPermittedStreak += 1;
            opNotPermittedCountInWindow += 1;
            console.warn(
              "[affiliate-recruit-run] DM 403 operation_not_permitted streak:",
              opNotPermittedStreak,
              "windowCount:",
              opNotPermittedCountInWindow,
              "handle:",
              item.username
            );
          } else {
            sendStatsByLang.en.other403 += 1;
            opNotPermittedStreak = 0;
          }
          count403 += 1;
          await kv.set(key403, String(count403), { ex: 1200 });
          if (opNotPermittedStreak >= DM_OPERATION_NOT_PERMITTED_STREAK_BREAKER) {
            stopReason = "operation_not_permitted_streak";
            stopAllSends = true;
            break;
          }
          if (opNotPermittedCountInWindow >= DM_OPERATION_NOT_PERMITTED_WINDOW_BREAKER) {
            stopReason = "operation_not_permitted_window";
            stopAllSends = true;
            break;
          }
          if (count403 >= EN_QUEUE_403_BREAKER_PER_15MIN) {
            stopReason = "en_queue_send_breaker";
            stopAllSends = true;
            break;
          }
          continue;
        }
        sendStatsByLang.en.non403Errors += 1;
        queue.unshift(item);
        stopReason = "dm_send_failed";
        stopAllSends = true;
        break;
      }
      await markSent(item.username, { lang, score: item.score, priority: item.score != null ? item.score / 100 : 0, author_id: item.author_id });
      await saveRefSent(item.author_id, { handle: item.username, lang, score: item.score, priority: item.score != null ? item.score / 100 : 0 });
      await incrementSentStats(lang, item.score);
      await incrementTodaySentCount();
      opNotPermittedStreak = 0;
      sentThisWindow += 1;
      sendStatsByLang.en.sent += 1;
      sentToday += 1;
      sentHandles.push(item.username);
    }
    await kv.set(KV_KEY_QUEUE_EN, JSON.stringify(queue), { ex: 86400 * 2 });

    // 同一 15/15min・20 ブレーカーで地域キューも消化（EN の残り枠で）
    for (const regionLang of REGION_QUEUE_LANGS) {
      if (stopAllSends) break;
      if (sentThisWindow >= MAX_SUCCESS_PER_15MIN || count403 >= EN_QUEUE_403_BREAKER_PER_15MIN) break;
      if (dailyCapActive && sentToday >= EN_QUEUE_DAILY_CAP) break;
      let rQueue = regionQueues[regionLang] || [];
      while (
        (!dailyCapActive || sentToday < EN_QUEUE_DAILY_CAP) &&
        sentThisWindow < MAX_SUCCESS_PER_15MIN &&
        count403 < EN_QUEUE_403_BREAKER_PER_15MIN &&
        rQueue.length > 0
      ) {
        const item = rQueue.shift();
        if (!item?.username) continue;
        sendStatsByLang[regionLang].attempted += 1;
        const inviteUrl = getFirstPromoterInviteUrl(regionLang, { ref: item.author_id });
        const whopUrlR = getWhopAffiliateProgramUrl(regionLang);
        const { text } = fillRecruitDmTemplate(regionLang, { inviteUrl, whopAffiliateUrl: whopUrlR, handle: item.username });
        const sendResult = await sendRecruitDm(item.username, text, { participantId: item.author_id });
        if (sendResult?.error) {
          const classified = classifyDmSendError(sendResult.error);
          if (classified.is403) {
            if (classified.type === "recipient_not_open") {
              sendStatsByLang[regionLang].recipient403 += 1;
              await markDmNg(item.author_id, { username: item.username, score: item.score, lang: regionLang, breakdown: item.breakdown });
              opNotPermittedStreak = 0;
            } else if (classified.type === "operation_not_permitted") {
              sendStatsByLang[regionLang].operationNotPermitted403 += 1;
              opNotPermittedStreak += 1;
              opNotPermittedCountInWindow += 1;
              console.warn(
                "[affiliate-recruit-run] DM 403 operation_not_permitted streak:",
                opNotPermittedStreak,
                "windowCount:",
                opNotPermittedCountInWindow,
                "handle:",
                item.username
              );
            } else {
              sendStatsByLang[regionLang].other403 += 1;
              opNotPermittedStreak = 0;
            }
            count403 += 1;
            await kv.set(key403, String(count403), { ex: 1200 });
            if (opNotPermittedStreak >= DM_OPERATION_NOT_PERMITTED_STREAK_BREAKER) {
              stopReason = "operation_not_permitted_streak";
              stopAllSends = true;
              break;
            }
            if (opNotPermittedCountInWindow >= DM_OPERATION_NOT_PERMITTED_WINDOW_BREAKER) {
              stopReason = "operation_not_permitted_window";
              stopAllSends = true;
              break;
            }
            if (count403 >= EN_QUEUE_403_BREAKER_PER_15MIN) {
              stopReason = "en_queue_send_breaker";
              stopAllSends = true;
              break;
            }
            continue;
          }
          sendStatsByLang[regionLang].non403Errors += 1;
          rQueue.unshift(item);
          stopReason = "dm_send_failed";
          stopAllSends = true;
          break;
        }
        await markSent(item.username, { lang: regionLang, score: item.score, priority: item.score != null ? item.score / 100 : 0, author_id: item.author_id });
        await saveRefSent(item.author_id, { handle: item.username, lang: regionLang, score: item.score, priority: item.score != null ? item.score / 100 : 0 });
        await incrementSentStats(regionLang, item.score);
        await incrementTodaySentCount();
        opNotPermittedStreak = 0;
        sentThisWindow += 1;
        sendStatsByLang[regionLang].sent += 1;
        sentToday += 1;
        sentHandles.push(`${item.username}(${regionLang})`);
      }
      regionQueues[regionLang] = rQueue;
      await kv.set(KV_KEY_QUEUE_REGION(regionLang), JSON.stringify(rQueue), { ex: 86400 * 2 });
      if (stopAllSends) break;
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
      count403ThisWindow: count403,
      sentToday,
      stopReason: stopReason || null,
      queueLengthsStart,
      queueLengthsEnd,
      sendStatsByLang,
    };
    console.log("[affiliate-recruit-run] en-queue-send summary:", sendSummary);

    return res.status(200).json({
      ok: true,
      enQueueSend: true,
      sent: sentHandles.length,
      handles: sentHandles,
      sentToday,
      queueLength: queue.length,
      count403ThisWindow: count403,
      queueLengthsStart,
      queueLengthsEnd,
      sendStatsByLang,
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

      const inviteUrl = getFirstPromoterInviteUrl(lang, { ref: c.author_id });
      const { text, variant, variantName } = fillRecruitDmTemplate(lang, {
        inviteUrl,
        whopAffiliateUrl: whopUrl,
        handle: c.username
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
        author_id: c.author_id
      });
      await saveRefSent(c.author_id, { handle: c.username, lang, score: c.score, priority: c.priority });
      await incrementSentStats(lang, c.score);
      await incrementTodaySentCount();
      if (!isEnBatchRun) await incrementHourSent(dateStr, utcHour);
      sentCount += 1;
      console.log("[affiliate-recruit-run] sent:", c.username, "lang:", lang);
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
