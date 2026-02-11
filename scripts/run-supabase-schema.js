/**
 * Trap Defence OS: Supabase スキーマ実行
 * node -r dotenv/config scripts/run-supabase-schema.js
 */
const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

async function main() {
  const url =
    process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
  if (!url) {
    console.error("POSTGRES_URL or POSTGRES_URL_NON_POOLING required");
    process.exit(1);
  }

  const sqlPath = path.join(__dirname, "../docs/supabase-tweet-metrics-schema.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");

  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false }
  });
  try {
    await client.connect();
    await client.query(sql);
    console.log("✅ Supabase schema executed: tweet_queue, tweet_metrics");
  } catch (e) {
    console.error("❌ Schema execution failed:", e.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
