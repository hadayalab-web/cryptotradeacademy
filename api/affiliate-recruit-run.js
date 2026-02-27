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
  EN_RECRUIT_BATCH_SIZE,
  RECRUIT_BATCH_SIZE_DEFAULT,
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
// DM→登録紐づけ用 KV の有効期限。90 日は送信から登録までの想定期間をカバーしつつストレージを抑える目安。運用指示で固定。短縮したい場合はコードまたは env で変更可。
const REF_SENT_TTL = 86400 * 90;

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

  const sentToday = await getTodaySentCount();

  const forceMode = req.query?.mode || req.body?.mode;
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
