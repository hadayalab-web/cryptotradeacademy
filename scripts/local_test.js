// scripts/local_test.js
import 'dotenv/config';

import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';          // ★ 追加

const require = createRequire(import.meta.url || __filename);

// ESM で __dirname を再現
const __filename = fileURLToPath(import.meta.url);   // ★ 追加
const __dirname = path.dirname(__filename);          // ★ 追加

// cron.js は関数そのものを export default しているので、こう受け取る
const cronModule = require('../api/cron');
const handler = cronModule.default || cronModule;

// Mock Request/Response objects for local testing
const req = {
  headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
  query: { force: 'true' }, // REGULAR を強制送信
};

const res = {
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    console.log('Response:', JSON.stringify(body, null, 2));

    const logPath = path.join(__dirname, '..', 'data', 'signals_log.jsonl');
    fs.mkdirSync(path.dirname(logPath), { recursive: true });

    const line =
      JSON.stringify(
        {
          ts: new Date().toISOString(),
          ...body, // body.metrics, body.trap など全部入る
        }
      ) + '\n';

    fs.appendFileSync(logPath, line, 'utf8');
    console.log('Appended to', logPath);
  },
};

console.log('🚀 Starting Local Test Run...');

if (typeof handler === 'function') {
  handler(req, res)
    .then(() => console.log('✅ Test Complete'))
    .catch(err => console.error('❌ Test Error:', err));
} else {
  console.error('❌ Error: Imported handler is not a function. It is:', typeof handler);
}
