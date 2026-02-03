// scripts/subscribe-x-webhook.js
// X Account Activity API: アカウントをWebhookに購読してイベント（いいね/RT/リプライ）を受信する

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const OAuth = require("oauth-1.0a");
const crypto = require("crypto");

const CONSUMER_KEY = process.env.X_API_CONSUMER_KEY;
const CONSUMER_SECRET = process.env.X_API_CONSUMER_KEY_SECRET;
const ACCESS_TOKEN = process.env.X_API_ACCESS_TOKEN;
const ACCESS_TOKEN_SECRET = process.env.X_API_ACCESS_TOKEN_SECRET;
const ENV_NAME = process.env.X_ACCOUNT_ACTIVITY_ENV || "development";
const WEBHOOK_ID = process.env.X_WEBHOOK_ID;

const oauth = OAuth({
  consumer: { key: CONSUMER_KEY, secret: CONSUMER_SECRET },
  signature_method: "HMAC-SHA1",
  hash_function(baseString, key) {
    return crypto.createHmac("sha1", key).update(baseString).digest("base64");
  }
});

async function subscribe() {
  console.log("========================================");
  console.log("X Webhook サブスクリプション追加");
  console.log("========================================\n");

  if (!CONSUMER_KEY || !CONSUMER_SECRET || !ACCESS_TOKEN || !ACCESS_TOKEN_SECRET) {
    console.error("❌ 環境変数が不足しています:");
    console.error("   X_API_CONSUMER_KEY, X_API_CONSUMER_KEY_SECRET");
    console.error("   X_API_ACCESS_TOKEN, X_API_ACCESS_TOKEN_SECRET");
    process.exit(1);
  }

  // Account Activity API v1.1 形式（env_name 必須）
  const url = `https://api.twitter.com/1.1/account_activity/all/${ENV_NAME}/subscriptions.json`;
  const requestData = {
    url,
    method: "POST",
    data: undefined
  };
  const token = { key: ACCESS_TOKEN, secret: ACCESS_TOKEN_SECRET };
  const authHeader = oauth.toHeader(oauth.authorize(requestData, token));

  console.log(`📡 リクエスト: POST ${url}`);
  console.log(`   環境名: ${ENV_NAME}`);
  console.log("");

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        ...authHeader,
        "Content-Type": "application/x-www-form-urlencoded"
      }
    });

    if (res.status === 204 || res.status === 200) {
      console.log("✅ サブスクリプション追加成功！");
      console.log("");
      console.log("💡 これでいいね/RT/リプライのイベントがWebhookに届くようになります。");
      console.log("   数分後に npm run inspect:kv で Webhook統計を確認してください。");
      return;
    }

    const text = await res.text();
    let errBody;
    try {
      errBody = JSON.parse(text);
    } catch {
      errBody = { detail: text };
    }

    console.error(`❌ エラー: ${res.status}`, errBody);
    console.log("");
    if (res.status === 403 || res.status === 404) {
      console.log("💡 よくある原因:");
      console.log("   1. X_ACCOUNT_ACTIVITY_ENV が誤り（Developer Portalの環境名と一致させる）");
      console.log("   2. Account Activity API が有効化されていない（Pro/Enterprise等）");
      console.log("   3. 開発環境名が 'development' でない場合、.env に設定:");
      console.log("      X_ACCOUNT_ACTIVITY_ENV=your_env_name");
    }
    process.exit(1);
  } catch (e) {
    console.error("❌ リクエスト失敗:", e.message);
    process.exit(1);
  }
}

subscribe();
