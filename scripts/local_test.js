require('dotenv').config({ path: '.env.local' });
const { handler } = require('../api/cron');

// Mock Request/Response objects for local testing
const req = { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } };
const res = {
  status: (code) => ({
    json: (data) => console.log(`[${code}] Response:`, JSON.stringify(data, null, 2))
  })
};

console.log("🚀 Starting Local Test Run...");
handler(req, res).then(() => console.log("✅ Test Complete"));
