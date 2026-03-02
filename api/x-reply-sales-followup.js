/**
 * Xリプライ直販: 48hフォローアップDM ＋ 3日後フォロー解除（デフォルト72時間で解除してフォロー数膨張を防ぐ）
 * Cron: :10, :25, :40, :55 で実行（:00 リスト・:05 送信のあとで詰まらないように）
 */
const { kv } = require("../utils/kv");
const { unfollowUser } = require("../services/x/client");
const { sendRecruitDm } = require("../services/x/dmClient");
const { X_REPLY_UNFOLLOW_DAYS } = require("../config/xReplySalesConfig");
const { normalizeReplyLang } = require("../config/xReplySalesStrategy");

const KV_KEY_FOLLOWED_USERS_DAILY = (dateStr) => `x_reply_sales:followed_users:${dateStr}`;
const KV_KEY_FOLLOWUP_PENDING = "x_reply_sales:followup_pending";
const KV_KEY_FOLLOWUP_SENT = (authorId, tweetId) => `x_reply_sales:followup_sent:${authorId}:${tweetId}`;
const UNFOLLOW_MAX_PER_RUN = 50;
const FOLLOWUP_AFTER_MS = 48 * 60 * 60 * 1000;
const FOLLOWUP_DM_MAX_PER_RUN = 30;
const FOLLOWUP_PENDING_TTL_SECONDS = 86400 * 10;

const FOLLOWUP_MESSAGE_BY_LANG = {
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
  const results = { unfollow: { done: 0, errors: 0 }, followup: { sent: 0, skipped: 0, errors: 0 } };

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

  // 2) 48h経過した配信先にフォローアップDM
  const raw = await kv.get(KV_KEY_FOLLOWUP_PENDING);
  const list = Array.isArray(raw) ? raw : (typeof raw === "string" ? (() => { try { return JSON.parse(raw); } catch (_) { return []; } })() : []);
  const cutoff = Date.now() - FOLLOWUP_AFTER_MS;
  const due = list.filter((x) => new Date(x.deliveredAt).getTime() < cutoff);
  const stillPending = list.filter((x) => new Date(x.deliveredAt).getTime() >= cutoff);

  console.log("[X Reply Sales][followup] pending", {
    total: list.length,
    due: due.length,
    stillPending: stillPending.length
  });
  const dueToRetry = [];
  let sent = 0;
  let processed = 0;
  for (const item of due) {
    if (sent >= FOLLOWUP_DM_MAX_PER_RUN) break;
    processed += 1;
    const { authorId, tweetId, lang, handle } = item;
    const sentKey = KV_KEY_FOLLOWUP_SENT(authorId, tweetId);
    if (await kv.get(sentKey)) {
      results.followup.skipped += 1;
      continue;
    }
    const msg = FOLLOWUP_MESSAGE_BY_LANG[normalizeReplyLang(lang)] || FOLLOWUP_MESSAGE_BY_LANG.en;
    try {
      const dm = await sendRecruitDm(handle, msg, { participantId: authorId });
      if (!dm.error) {
        await kv.set(sentKey, "1", { ex: 86400 * 30 });
        sent += 1;
        results.followup.sent += 1;
      } else {
        results.followup.errors += 1;
        dueToRetry.push(item);
      }
    } catch (e) {
      results.followup.errors += 1;
      dueToRetry.push(item);
    }
  }
  const remainingDue = dueToRetry.concat(due.slice(processed));
  await kv.set(KV_KEY_FOLLOWUP_PENDING, stillPending.concat(remainingDue), { ex: FOLLOWUP_PENDING_TTL_SECONDS });

  console.log("[X Reply Sales][followup] done", {
    sent: results.followup.sent,
    skipped: results.followup.skipped,
    errors: results.followup.errors
  });

  return res.status(200).json({
    ok: true,
    runAt: now.toISOString(),
    ...results
  });
};
