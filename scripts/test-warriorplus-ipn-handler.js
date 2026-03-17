const { Readable } = require("stream");

function createMockRes() {
  const headers = {};
  return {
    statusCode: 200,
    headers,
    body: null,
    setHeader(key, value) {
      headers[String(key).toLowerCase()] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(obj) {
      this.body = obj;
      return this;
    },
    send(text) {
      this.body = text;
      return this;
    }
  };
}

function createMockReq({ method, headers, query, body }) {
  const stream = Readable.from([body]);
  stream.method = method;
  stream.headers = headers;
  stream.query = query || {};
  stream.body = undefined;
  return stream;
}

async function main() {
  // 本スクリプトは「Whop/FirstPromoter削除後も、W+ IPN処理が落ちない」ことの最低確認用。
  // Resend・KVは未設定でもOK（メール送信はスキップされる）。

  process.env.WARRIORPLUS_USE_RESEND_TG = "0";
  process.env.VERCEL_ENV = "development";
  process.env.NODE_ENV = "development";

  const handler = require("../api/whop-webhook.js");

  const form = new URLSearchParams({
    WP_ACTION: "sale",
    IPN_ID: `delivery_test_local_${Date.now()}`,
    WP_ITEM_NUMBER: "wso_vqp3r4",
    WP_ITEM_NAME: "Trap Defence BTC English",
    WP_BUYER_EMAIL: "test@example.com",
    WP_SECURITYKEY: "TEST"
  }).toString();

  const req = createMockReq({
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "user-agent": "curl/8.0"
    },
    query: {},
    body: form
  });
  const res = createMockRes();

  await handler(req, res);

  console.log(JSON.stringify({ statusCode: res.statusCode, body: res.body }, null, 2));

  if (res.statusCode !== 200) process.exit(1);
  if (!res.body || res.body.received !== true || res.body.provider !== "warriorplus") process.exit(2);
}

main().catch((e) => {
  console.error(e);
  process.exit(99);
});

