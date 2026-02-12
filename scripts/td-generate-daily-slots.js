/**
 * TD BuzzWeave Engine — 日次600枠スロット生成（スタンドアロン）
 * 実行: node scripts/td-generate-daily-slots.js
 *
 * 前提: Supabase に td_post_slots テーブルが存在すること。
 * 作成: docs/supabase-tweet-metrics-schema.sql を Supabase SQL Editor で実行。
 */
require("dotenv").config({ path: ".env.local" });
require("dotenv").config();

const { getSupabase } = require("../utils/supabase");
const { generateDailySlots } = require("../services/td/buzzWeaveEngine");

async function main() {
  const sb = getSupabase();
  if (!sb) {
    console.error("[TD-Slots] Supabase が未設定です。環境変数を確認してください。");
    process.exit(1);
  }
  const { error: checkError } = await sb.from("td_post_slots").select("id").limit(1);
  if (checkError) {
    console.error(
      "[TD-Slots] td_post_slots が存在しません。Supabase SQL Editor で docs/supabase-tweet-metrics-schema.sql を実行してテーブルを作成してください。"
    );
    process.exit(1);
  }

  const result = await generateDailySlots();
  console.log("[TD-Slots]", result.ok ? "OK" : "FAIL", "count:", result.count);
  process.exit(result.ok ? 0 : 1);
}

main().catch((e) => {
  console.error("[TD-Slots] Fatal:", e);
  process.exit(1);
});
