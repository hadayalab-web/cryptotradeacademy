/**
 * アフィリエイトスカウト 1 本送信（Cron または手動 POST）
 * 言語別スロットに従い候補を検索し、FirstPromoter 招待 URL 入り DM を 1 通送る。
 * 認証: CRON_SECRET または手動テスト用に ?dryRun=1 で送信スキップ。
 */
const { kv } = require("../utils/kv");
const { fetchCandidatesFromSearch } = require("../services/td/affiliateScoutSearch");
const { sendScoutDm } = require("../services/x/dmClient");
const { fillScoutDmTemplate } = require("../config/affiliateScoutDmTemplates");
const {
  getFirstPromoterInviteUrl,
  getWhopAffiliateProgramUrl,
  AFFILIATE_DM_DAILY_CAP,
  SLOTS_BY_UTC_HOUR,
  getNextScoutLangForUtcHour
} = require("../config/affiliateScoutConfig");

const KV_KEY_DAILY_COUNT = (dateStr) => `affiliate_scout:daily_count:${dateStr}`;
const KV_KEY_SENT_HANDLE = (handle) => `affiliate_scout:sent:${handle.toLowerCase()}`;
const KV_KEY_HOUR_SENT = (dateStr, hour) => `affiliate_scout:hour_sent:${dateStr}:${hour}`;
const SENT_TTL = 86400 * 90; // 90日（同一 handle に再送しない期間）

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

async function markSent(handle) {
  if (!kv) return;
  await kv.set(KV_KEY_SENT_HANDLE(handle), Date.now().toString(), { ex: SENT_TTL });
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

  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  const utcHour = now.getUTCHours();

  const dailyCap = Math.max(1, AFFILIATE_DM_DAILY_CAP);
  const sentToday = await getTodaySentCount();
  if (sentToday >= dailyCap) {
    return res.status(200).json({
      ok: false,
      reason: "daily_cap_reached",
      sentToday,
      dailyCap
    });
  }

  const slotsThisHour = SLOTS_BY_UTC_HOUR[utcHour];
  const hourSent = await getHourSentCount(dateStr, utcHour);
  const lang =
    slotsThisHour && hourSent < slotsThisHour.length
      ? getNextScoutLangForUtcHour(utcHour, hourSent)
      : null;

  if (!lang) {
    return res.status(200).json({
      ok: false,
      reason: "no_slot_this_hour",
      utcHour,
      hourSent,
      sentToday,
      dailyCap
    });
  }

  let result;
  try {
    result = await fetchCandidatesFromSearch(lang, { maxResults: 30, pagesPerBucket: 1 });
  } catch (e) {
    console.error("[affiliate-scout-run] fetchCandidatesFromSearch error:", e?.message);
    return res.status(500).json({ ok: false, reason: "search_failed", error: e?.message });
  }

  const posts = result?.data || [];
  const usersList = result?.includes?.users || [];
  const usersById = {};
  for (const u of usersList) {
    if (u?.id) usersById[u.id] = u;
  }
  const authors = [];
  const seen = new Set();
  for (const p of posts) {
    const uid = p?.author_id;
    if (!uid || seen.has(uid)) continue;
    seen.add(uid);
    const u = usersById[uid] || {};
    const username = u?.username;
    if (username) authors.push({ author_id: uid, username });
  }

  let chosen = null;
  for (const a of authors) {
    const already = await isAlreadySent(a.username);
    if (!already) {
      chosen = a;
      break;
    }
  }

  if (!chosen) {
    return res.status(200).json({
      ok: false,
      reason: "no_eligible_candidate",
      lang,
      candidatesChecked: authors.length,
      sentToday,
      dailyCap
    });
  }

  const inviteUrl = getFirstPromoterInviteUrl(lang);
  const whopUrl = getWhopAffiliateProgramUrl(lang);
  const text = fillScoutDmTemplate(lang, {
    inviteUrl,
    whopAffiliateUrl: whopUrl,
    handle: chosen.username
  });

  if (!willSend) {
    return res.status(200).json({
      ok: true,
      dryRun: true,
      wouldSend: { handle: chosen.username, lang, textLength: text.length },
      sentToday,
      dailyCap,
      note: !auth ? "Set CRON_SECRET or ?secret= for actual send" : "dryRun"
    });
  }

  const sendResult = await sendScoutDm(chosen.username, text);
  if (sendResult?.error) {
    return res.status(200).json({
      ok: false,
      reason: "dm_send_failed",
      handle: chosen.username,
      error: sendResult.error,
      sentToday,
      dailyCap
    });
  }

  await markSent(chosen.username);
  await incrementTodaySentCount();
  await incrementHourSent(dateStr, utcHour);

  return res.status(200).json({
    ok: true,
    sent: 1,
    handle: chosen.username,
    lang,
    dmEventId: sendResult.dmEventId,
    sentToday: sentToday + 1,
    dailyCap
  });
};
