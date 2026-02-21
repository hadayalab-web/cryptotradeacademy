/**
 * FirstPromoter Track Sale API
 * Whop Webhook 受信後に成約を FirstPromoter に送る。サポート外決済用パターン。
 * 参照: docs/INTEGRATION_WHOP_X_FIRSTPROMOTER.md §2, §2.6
 */
const FIRSTPROMOTER_API_KEY = process.env.FIRSTPROMOTER_API_KEY;
const TRACK_SALE_URL = "https://firstpromoter.com/api/v1/track/sale";

/**
 * 売上を FirstPromoter に送信
 * @param {Object} params
 * @param {string} params.event_id - 重複防止用の一意 ID（例: Whop checkout.id）
 * @param {number} params.amount - 金額（セント。JPY 等ゼロ小数通貨は整数）
 * @param {string} [params.email] - 購入者メール（uid とどちらか必須）
 * @param {string} [params.uid] - FirstPromoter 側のリード uid
 * @param {string} [params.ref_id] - 紹介者 ref_id（リード未登録でも紐付け可能）
 * @param {string} [params.promo_code] - プロモーター用プロモコード
 * @param {string} [params.currency] - 通貨（例: USD, JPY）
 * @param {string} [params.plan] - プラン ID（プラン別報酬用）
 * @returns {Promise<{ ok: boolean; status: number; reward?: object; error?: string }>}
 */
async function trackSale(params) {
  if (!FIRSTPROMOTER_API_KEY) {
    console.warn("[FirstPromoter] FIRSTPROMOTER_API_KEY not set, skipping track/sale");
    return { ok: false, status: 0, error: "FIRSTPROMOTER_API_KEY not set" };
  }

  const {
    event_id,
    amount,
    email,
    uid,
    ref_id,
    promo_code,
    currency,
    plan
  } = params;

  if (!event_id || amount == null) {
    return { ok: false, status: 0, error: "event_id and amount are required" };
  }

  const q = new URLSearchParams();
  q.set("event_id", String(event_id));
  q.set("amount", String(Math.round(amount)));
  if (email) q.set("email", email);
  if (uid) q.set("uid", uid);
  if (ref_id) q.set("ref_id", ref_id);
  if (promo_code) q.set("promo_code", promo_code);
  if (currency) q.set("currency", currency);
  if (plan) q.set("plan", plan);

  const url = `${TRACK_SALE_URL}?${q.toString()}`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "X-API-KEY": FIRSTPROMOTER_API_KEY,
        "Content-Type": "application/json"
      }
    });

    if (response.status === 200) {
      const data = await response.json().catch(() => ({}));
      return { ok: true, status: 200, reward: data?.reward };
    }
    if (response.status === 204) {
      return { ok: true, status: 204 };
    }

    const text = await response.text();
    console.warn("[FirstPromoter] track/sale non-2xx:", response.status, text?.slice(0, 200));
    return { ok: false, status: response.status, error: text?.slice(0, 200) };
  } catch (e) {
    console.warn("[FirstPromoter] track/sale request error:", e?.message);
    return { ok: false, status: 0, error: e?.message };
  }
}

module.exports = {
  trackSale
};
