require('dotenv').config({ path: '.env.local' });
/**
 * Long-running process monitor (Alternative to Cron)
 * Derived from monitor.js
 */
const cron = require('node-cron'); // 必要なら npm install node-cron
const { handler } = require('../api/cron');

console.log("👀 Monitor Process Started");

// Schedule task every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  console.log("Running scheduled task...");
  // Mock req/res
  const req = { headers: {} };
  const res = { status: () => ({ json: (d) => console.log(d) }) };
  await handler(req, res);
});

