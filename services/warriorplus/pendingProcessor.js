// services/warriorplus/pendingProcessor.js
// W+ IPN の失敗（リンク不足/Resend失敗）を KV キューから再処理する
const querystring = require('querystring');

function safeJsonParse(s) {
  try {
    return JSON.parse(s);
  } catch (_) {
    return null;
  }
}

async function processWarriorPlusPendingOnce({ limit = 6 } = {}) {
  // eslint-disable-next-line global-require
  const { kv } = require('../../utils/kv');
  const instance = kv && typeof kv.getInstance === 'function' ? kv.getInstance() : null;
  if (!instance || typeof instance.rpop !== 'function' || typeof instance.get !== 'function') {
    return { processed: 0, reason: 'kv_list_not_available' };
  }

  let processed = 0;
  // eslint-disable-next-line global-require
  const whopWebhookHandler = require('../../api/whop-webhook');

  for (let i = 0; i < limit; i++) {
    const key = await instance.rpop('warriorplus:pending:queue');
    if (!key) break;

    try {
      const raw = await instance.get(key);
      await instance.del(key);
      const payload = typeof raw === 'string' ? safeJsonParse(raw) : raw;
      if (!payload || !payload.buyerEmail || !payload.itemNumber) continue;

      const now = Date.now();
      const ipnPayload = {
        WP_ACTION: 'sale',
        WP_BUYER_EMAIL: payload.buyerEmail,
        WP_ITEM_NUMBER: payload.itemNumber,
        WP_SALEID: payload.saleId || `retry-${now}`,
        IPN_ID: `retry:${payload.id || 'unknown'}:${now}`,
        WP_SECURITYKEY: String(process.env.WARRIORPLUS_SECURITY_KEY || '').trim(),
      };
      const rawBody = querystring.stringify(ipnPayload);

      const fakeReq = {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        query: { output: 'text' },
        body: rawBody,
      };
      const fakeRes = {
        status(code) {
          this._status = code;
          return this;
        },
        setHeader() { /* noop */ },
        json(obj) {
          this._json = obj;
          return this;
        },
        send(text) {
          this._text = text;
          return this;
        },
      };

      await whopWebhookHandler(fakeReq, fakeRes);
      processed += 1;
    } catch (e) {
      // 失敗したら戻す（無限ループ防止に新規キーとして短TTLで戻す）
      try {
        const backKey = `warriorplus:pending:retry_back:${Date.now()}:${Math.random().toString(16).slice(2)}`;
        await instance.set(backKey, JSON.stringify({ error: e?.message || String(e) }), { ex: 3600 });
      } catch (_) {}
    }
  }

  return { processed };
}

module.exports = {
  processWarriorPlusPendingOnce,
};

