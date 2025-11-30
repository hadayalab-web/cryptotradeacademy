require('dotenv').config({ path: '.env.local' });

// cron.js は関数そのものを module.exports しているので、こう受け取る
const handler = require('../api/cron');

// Mock Request/Response objects for local testing
const req = { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } };
const res = {
  status: (code) => ({
    json: (data) => console.log(`[${code}] Response:`, JSON.stringify(data, null, 2))
  })
};

console.log("🚀 Starting Local Test Run...");

if (typeof handler === 'function') {
  handler(req, res)
    .then(() => console.log("✅ Test Complete"))
    .catch(err => console.error("❌ Test Error:", err));
} else {
  console.error("❌ Error: Imported handler is not a function. It is:", typeof handler);
}
