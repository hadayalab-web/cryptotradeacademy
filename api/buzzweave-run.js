/**
 * TD BuzzWeave Engine — 1サイクル実行 API
 * Cron: GET /api/buzzweave-run
 * 次1時間のスロット → バズ候補マッピング → 寄生コピー生成 → 引用リポスト
 *
 * 動作確認手順:
 * 1. npm run dev でローカルサーバーを起動
 * 2. Supabase に td_post_slots が存在することを確認（未作成なら docs/supabase-tweet-metrics-schema.sql を実行）
 * 3. curl "http://localhost:3000/api/buzzweave-run?dry_run=true"
 */

const { runBuzzWeaveCycle } = require("../services/td/buzzWeaveEngine");

module.exports = async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const dryRun = req.query?.dry_run === "true" || req.query?.dry_run === "1";

  try {
    const result = await runBuzzWeaveCycle({ dryRun });
    return res.status(200).json(result);
  } catch (e) {
    console.error("[buzzweave-run] error:", e.message);
    return res.status(500).json({
      ok: false,
      error: e.message
    });
  }
};
