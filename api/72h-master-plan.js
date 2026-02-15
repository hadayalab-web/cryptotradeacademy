/**
 * Trap Defence OS — 72h マスタープラン（FOMO → ATH → CRASH ローテ）
 * Cron: 6h ごと (vercel.json: "0 */6 * * *")
 * 現在のナラティブを KV に保存。build_structured_post 等が参照して bias に利用可能
 */

require("../utils/suppressKnownWarnings");

const { getKV } = require("../utils/kv");
const { nextNarrative, getNarrativeByIndex } = require("../services/narrative/narrativeRotator");

const KV_KEY = "chain_raid:72h_narrative_index";
const KV_TTL = 60 * 60 * 24; // 24h

module.exports = async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const kv = getKV();
    if (!kv) {
      return res.status(503).json({ ok: false, error: "KV not available" });
    }

    const raw = await kv.get(KV_KEY);
    const prevIndex = typeof raw === "number" ? raw : parseInt(String(raw || "0"), 10) || 0;
    const nextIndex = (prevIndex + 1) % 3;
    const narrative = nextNarrative(prevIndex);

    await kv.set(KV_KEY, nextIndex, { ex: KV_TTL });

    return res.status(200).json({
      ok: true,
      narrative,
      prevNarrative: getNarrativeByIndex(prevIndex),
      index: nextIndex
    });
  } catch (e) {
    console.warn("[72h-master-plan] Error:", e?.message);
    return res.status(500).json({ ok: false, error: e?.message });
  }
};
