/**
 * Xリプライ直販: 24hフォローDM → 48hアフィリ案内DM ＋ 3日後フォロー解除
 * Cron: :10, :25, :40, :55 で実行（:00 リスト・:05 送信のあとで詰まらないように）
 */
const { kv } = require("../utils/kv");
const { unfollowUser } = require("../services/x/client");
const { sendRecruitDm } = require("../services/x/dmClient");
const { X_REPLY_UNFOLLOW_DAYS } = require("../config/xReplySalesConfig");
const { normalizeReplyLang } = require("../config/xReplySalesStrategy");
const { fillRecruitDmTemplate } = require("../config/affiliateRecruitDmTemplates");
const { getFirstPromoterInviteUrl } = require("../config/affiliateRecruitConfig");

const KV_KEY_FOLLOWED_USERS_DAILY = (dateStr) => `x_reply_sales:followed_users:${dateStr}`;
const KV_KEY_FOLLOWUP_PENDING = "x_reply_sales:followup_pending";
const KV_KEY_FOLLOWUP_24H_SENT = (authorId, tweetId) => `x_reply_sales:followup_24h_sent:${authorId}:${tweetId}`;
const KV_KEY_FOLLOWUP_48H_SENT = (authorId, tweetId) => `x_reply_sales:followup_48h_sent:${authorId}:${tweetId}`;
const UNFOLLOW_MAX_PER_RUN = 50;
const FOLLOWUP_AFTER_MS_24H = 24 * 60 * 60 * 1000;
const FOLLOWUP_AFTER_MS_48H = 48 * 60 * 60 * 1000;
const FOLLOWUP_DM_MAX_PER_RUN = 30;
const FOLLOWUP_PENDING_TTL_SECONDS = 86400 * 10;

/** 24h: フォローアップDM（CTA・defend50・50%オフ） */
const FOLLOWUP_24H_CTA_BY_LANG = {
  en: "About to blow your account revenge trading? Use 50% off coupon: defend50 to dodge whale traps right now!! Try it free for 1 day 🚀",
  ja: "ムキになって資金が溶ける寸前になっていませんか？50%オフクーポン：defend50で今すぐにクジラの罠を回避してください！！1日限定で無料でお試しできます🚀",
  ko: "뇌동매매로 시드가 다 녹아내리기 직전이신가요? 50% 할인 쿠폰: defend50으로 당장 고래의 함정을 피하세요!! 1일 한정 무료로 체험할 수 있습니다🚀",
  es: "¿A punto de quemar tu cuenta por hacer trading de revancha? ¡Usa el cupón de 50%: defend50 para esquivar las trampas de ballenas ahora mismo! Pruébalo gratis por 1 día 🚀",
  pt: "Tá quase zerando a banca no trade de vingança? Use o cupom de 50%: defend50 pra fugir das armadilhas das baleias agora mesmo!! Teste grátis por 1 dia 🚀",
  ar: "هل أنت على وشك تصفية حسابك بسبب التداول الانتقامي؟ استخدم كوبون خصم 50%: defend50 لتجنب فخاخ الحيتان الآن!! جربه مجانًا ليوم واحد 🚀"
};

function toDateString(d) {
  return d.toISOString().split("T")[0];
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!kv) {
    return res.status(503).json({ ok: false, error: "KV not available" });
  }

  const now = new Date();
  const results = { unfollow: { done: 0, errors: 0 }, followup24h: { sent: 0, skipped: 0, errors: 0 }, followup48h: { sent: 0, skipped: 0, errors: 0 } };

  console.log("[X Reply Sales][followup] run start", { runAt: now.toISOString() });

  // 1) N日前（デフォルト3日）にフォローしたユーザーを解除（X API 50/15min 順守）
  if (X_REPLY_UNFOLLOW_DAYS > 0) {
    const dPast = new Date(now);
    dPast.setUTCDate(dPast.getUTCDate() - X_REPLY_UNFOLLOW_DAYS);
    const dateStrPast = toDateString(dPast);
    const keyPast = KV_KEY_FOLLOWED_USERS_DAILY(dateStrPast);
    const rawPast = await kv.get(keyPast);
    const listPast = Array.isArray(rawPast)
      ? rawPast
      : typeof rawPast === "string"
        ? (() => {
            try {
              return JSON.parse(rawPast);
            } catch (_) {
              return [];
            }
          })()
        : [];
    const toUnfollow = listPast.slice(0, UNFOLLOW_MAX_PER_RUN);
    const remaining = listPast.slice(UNFOLLOW_MAX_PER_RUN);
    let stoppedAt = toUnfollow.length;
    for (let i = 0; i < toUnfollow.length; i += 1) {
      const authorId = toUnfollow[i];
      try {
        const r = await unfollowUser(String(authorId).trim());
        if (r.ok) {
          results.unfollow.done += 1;
        }
      } catch (err) {
        if (err?.message?.includes("429") || err?.message?.includes("rate limit")) {
          stoppedAt = i;
          break;
        }
        results.unfollow.errors += 1;
      }
    }
    const newRemaining = toUnfollow.slice(stoppedAt).concat(remaining);
    if (newRemaining.length > 0) {
      await kv.set(keyPast, newRemaining, { ex: 86400 * 2 });
    } else {
      await kv.del(keyPast);
    }
    console.log("[X Reply Sales][followup] unfollow", {
      dateStrPast: dateStrPast,
      candidates: toUnfollow.length,
      done: results.unfollow.done,
      errors: results.unfollow.errors
    });
  }

  // 2) 24h経過 → フォローDM / 48h経過 → アフィリ案内DM（24h送信済みのみ）
  const raw = await kv.get(KV_KEY_FOLLOWUP_PENDING);
  const list = Array.isArray(raw) ? raw : (typeof raw === "string" ? (() => { try { return JSON.parse(raw); } catch (_) { return []; } })() : []);
  const nowMs = Date.now();
  const cutoff24h = nowMs - FOLLOWUP_AFTER_MS_24H;
  const cutoff48h = nowMs - FOLLOWUP_AFTER_MS_48H;

  const due24h = [];
  const due48h = [];
  const stillPending = [];
  for (const x of list) {
    const t = new Date(x.deliveredAt).getTime();
    if (t >= cutoff24h) {
      stillPending.push(x);
      continue;
    }
    if (t < cutoff48h) {
      due48h.push(x);
    } else {
      due24h.push(x);
    }
  }

  console.log("[X Reply Sales][followup] pending", {
    total: list.length,
    due24h: due24h.length,
    due48h: due48h.length,
    stillPending: stillPending.length
  });

  const dueToRetry = [];
  let sentTotal = 0;

  // 2a) 24h: フォローDM（最大 FOLLOWUP_DM_MAX_PER_RUN の半分）
  const cap24 = Math.min(due24h.length, Math.ceil(FOLLOWUP_DM_MAX_PER_RUN / 2));
  for (let i = 0; i < cap24 && sentTotal < FOLLOWUP_DM_MAX_PER_RUN; i++) {
    const item = due24h[i];
    const { authorId, tweetId, lang, handle } = item;
    if (await kv.get(KV_KEY_FOLLOWUP_24H_SENT(authorId, tweetId))) {
      results.followup24h.skipped += 1;
      continue;
    }
    const msg24 = FOLLOWUP_24H_CTA_BY_LANG[normalizeReplyLang(lang)] || FOLLOWUP_24H_CTA_BY_LANG.en;
    try {
      const dm = await sendRecruitDm(handle, msg24, { participantId: authorId });
      if (!dm.error) {
        await kv.set(KV_KEY_FOLLOWUP_24H_SENT(authorId, tweetId), "1", { ex: 86400 * 30 });
        sentTotal += 1;
        results.followup24h.sent += 1;
      } else {
        results.followup24h.errors += 1;
        dueToRetry.push(item);
      }
    } catch (e) {
      results.followup24h.errors += 1;
      dueToRetry.push(item);
    }
  }
  for (let i = cap24; i < due24h.length; i++) dueToRetry.push(due24h[i]);

  // 2a') 48h経過だが24h未送の分はここで24hフォローDMを送る（遅れ挽回）
  for (const item of due48h) {
    const { authorId, tweetId, lang, handle } = item;
    if (await kv.get(KV_KEY_FOLLOWUP_24H_SENT(authorId, tweetId))) continue;
    if (sentTotal >= FOLLOWUP_DM_MAX_PER_RUN) {
      dueToRetry.push(item);
      continue;
    }
    const msg24 = FOLLOWUP_24H_CTA_BY_LANG[normalizeReplyLang(lang)] || FOLLOWUP_24H_CTA_BY_LANG.en;
    try {
      const dm = await sendRecruitDm(handle, msg24, { participantId: authorId });
      if (!dm.error) {
        await kv.set(KV_KEY_FOLLOWUP_24H_SENT(authorId, tweetId), "1", { ex: 86400 * 30 });
        sentTotal += 1;
        results.followup24h.sent += 1;
      } else {
        results.followup24h.errors += 1;
        dueToRetry.push(item);
      }
    } catch (e) {
      results.followup24h.errors += 1;
      dueToRetry.push(item);
    }
  }

  // 2b) 48h: アフィリ案内（24h送信済みのみ。残り枠で送信）
  for (const item of due48h) {
    if (sentTotal >= FOLLOWUP_DM_MAX_PER_RUN) {
      dueToRetry.push(item);
      continue;
    }
    const { authorId, tweetId, lang, handle } = item;
    if (!(await kv.get(KV_KEY_FOLLOWUP_24H_SENT(authorId, tweetId)))) {
      continue;
    }
    if (await kv.get(KV_KEY_FOLLOWUP_48H_SENT(authorId, tweetId))) {
      results.followup48h.skipped += 1;
      continue;
    }
    const inviteUrl = getFirstPromoterInviteUrl(lang, { ref: authorId });
    const { text: msg48 } = fillRecruitDmTemplate(lang, { inviteUrl, handle, angle: "crypto" });
    try {
      const dm = await sendRecruitDm(handle, msg48, { participantId: authorId });
      if (!dm.error) {
        await kv.set(KV_KEY_FOLLOWUP_48H_SENT(authorId, tweetId), "1", { ex: 86400 * 30 });
        sentTotal += 1;
        results.followup48h.sent += 1;
      } else {
        results.followup48h.errors += 1;
        dueToRetry.push(item);
      }
    } catch (e) {
      results.followup48h.errors += 1;
      dueToRetry.push(item);
    }
  }

  await kv.set(KV_KEY_FOLLOWUP_PENDING, stillPending.concat(dueToRetry), { ex: FOLLOWUP_PENDING_TTL_SECONDS });

  console.log("[X Reply Sales][followup] done", {
    followup24h: results.followup24h,
    followup48h: results.followup48h
  });

  return res.status(200).json({
    ok: true,
    runAt: now.toISOString(),
    ...results
  });
};
