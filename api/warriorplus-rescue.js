// api/warriorplus-rescue.js
// 購入者向けセルフ救済: 招待リンク再送をトリガーする（トークン方式）
const querystring = require('querystring');

const { kv } = require('../utils/kv');

module.exports = async function warriorPlusRescueHandler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = String(req.query.token || '').trim();
  if (!token) {
    return res.status(400).json({ error: 'Missing token' });
  }

  const recordKey = `warriorplus:rescue:${token}`;
  const record = kv ? await kv.get(recordKey) : null;
  if (!record || typeof record !== 'object') {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.status(404).send('Rescue link is invalid or expired. Please contact support@cryptotradeacademy.io.');
  }

  // 既存のIPN処理を再利用するため、擬似 form-urlencoded を作って whop-webhook の handler を直接呼ぶ
  // （重複防止が IPN_ID 単位なので、rescue は毎回ユニークにして「再送」を許可）
  const now = Date.now();
  const payload = {
    WP_ACTION: 'sale',
    WP_BUYER_EMAIL: record.buyerEmail,
    WP_ITEM_NUMBER: record.itemNumber,
    WP_SALEID: record.saleId || `rescue-${now}`,
    IPN_ID: `rescue:${token}:${now}`,
    WP_SECURITYKEY: String(process.env.WARRIORPLUS_SECURITY_KEY || '').trim(),
  };

  const rawBody = querystring.stringify(payload);
  try {
    // eslint-disable-next-line global-require
    const whopWebhookHandler = require('./whop-webhook');
    // whopWebhookHandler は (req,res) なので、req.body を持たせて POST で呼ぶ
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

    // 購入者には「メールを確認して」とだけ返す（詳細は出さない）
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.status(200).send('OK. Please check your email (including spam). If it does not arrive within a few minutes, contact support@cryptotradeacademy.io.');
  } catch (e) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.status(200).send('We could not retry delivery right now. Please contact support@cryptotradeacademy.io.');
  }
};

