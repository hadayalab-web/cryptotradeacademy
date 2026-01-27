// api/x-dashboard-performance.js
// インフルエンサー別パフォーマンスダッシュボードAPI（Phase 1: データ確認基盤）

const {
  getInfluencerDailyPerformance,
  getInfluencerRolling,
} = require("../services/x/influencerPerformance");

// Vercel KV
let kv = null;
try {
  const kvModule = require("@vercel/kv");
  kv = kvModule.kv;
} catch (error) {
  console.warn("[X Dashboard] @vercel/kv not available:", error.message);
}

/**
 * KVからキーをリスト（プレフィックス検索）
 */
async function listKeysByPrefix(prefix) {
  if (!kv) return [];
  try {
    if (typeof kv.scan === "function") {
      const keys = [];
      let cursor = 0;
      do {
        const res = await kv.scan(cursor, { match: `${prefix}*`, count: 200 });
        cursor = res?.[0] ?? 0;
        const batch = res?.[1] ?? [];
        keys.push(...batch);
        if (cursor === 0 || cursor === "0") break;
      } while (cursor && cursor !== "0");
      return keys;
    }
    if (typeof kv.keys === "function") {
      return await kv.keys(`${prefix}*`);
    }
  } catch (error) {
    console.warn("[X Dashboard] KV listKeysByPrefix failed:", error.message);
  }
  return [];
}

/**
 * 日次パフォーマンス取得API
 * GET /api/x-dashboard-performance?date=YYYY-MM-DD&lang=en&username=username
 * GET /api/x-dashboard-performance?date=YYYY-MM-DD&lang=en (全インフルエンサー)
 * GET /api/x-dashboard-performance?date=YYYY-MM-DD&lang=en&window=7d (Rolling集計含む)
 */
async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { date, lang, username, window } = req.query;

    // dateのデフォルトは今日
    const dateString = date || new Date().toISOString().slice(0, 10);
    const langCode = lang || "en";

    // 日次パフォーマンス取得
    if (username) {
      // 特定インフルエンサーの日次パフォーマンス
      const daily = await getInfluencerDailyPerformance(
        dateString,
        langCode,
        username
      );

      // Rolling集計も取得（window指定があれば）
      let rolling = null;
      if (window === "7d" || window === "30d") {
        const windowDays = window === "7d" ? 7 : 30;
        rolling = await getInfluencerRolling(windowDays, langCode, username);
      }

      return res.status(200).json({
        success: true,
        date: dateString,
        lang: langCode,
        username,
        daily,
        rolling,
        timestamp: new Date().toISOString(),
      });
    } else {
      // 全インフルエンサーの日次パフォーマンス（Phase 1: 簡易版）
      // キーパターン: x:perf:influencer:day:{date}:{lang}:{username}
      const prefix = `x:perf:influencer:day:${dateString}:${langCode}:`;
      const keys = await listKeysByPrefix(prefix);

      // キーからusernameを抽出してデータを取得
      const influencers = [];
      for (const key of keys.slice(0, 100)) {
        // キーからusernameを抽出: x:perf:influencer:day:2026-01-27:en:username
        const parts = key.split(":");
        if (parts.length >= 6) {
          const username = parts[5];
          const daily = await getInfluencerDailyPerformance(
            dateString,
            langCode,
            username
          );
          if (daily) {
            influencers.push({
              username,
              daily,
            });
          }
        }
      }

      // Rolling集計も取得（window指定があれば）
      let rollingData = null;
      if (window === "7d" || window === "30d") {
        const windowDays = window === "7d" ? 7 : 30;
        rollingData = {};
        for (const item of influencers) {
          const rolling = await getInfluencerRolling(
            windowDays,
            langCode,
            item.username
          );
          if (rolling) {
            rollingData[item.username] = rolling;
          }
        }
      }

      // ERでソート（降順）
      influencers.sort((a, b) => {
        const erA = a.daily?.avgEngagementRate || 0;
        const erB = b.daily?.avgEngagementRate || 0;
        return erB - erA;
      });

      return res.status(200).json({
        success: true,
        date: dateString,
        lang: langCode,
        totalInfluencers: influencers.length,
        influencers,
        rolling: rollingData,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("[X Dashboard] Error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
}

module.exports = handler;
