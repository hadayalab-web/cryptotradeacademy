// api/v1/content/minimal/handler.js
// 無料版コンテンツAPI共通ハンドラ（6言語同一ロジック）
// Snapshot-native: KV から btcSnapshot を取得し getMinimalContentForLang に渡す

const {
  getMinimalContentForLang,
  isSupportedLang
} = require("../../../../services/content/minimalContent");
const { getKV } = require("../../../../utils/kv");
const { BTC_SNAPSHOT_KV_KEY, BTC_SNAPSHOT_EARLY_KV_KEY } = require("../../../../services/snapshot/btcSnapshotSchema");

/**
 * GET /api/v1/content/minimal/:lang 用ハンドラを生成
 * @param {string} lang - 言語コード（en, es, pt-br, ar, ja, ko）
 * @returns {function} (req, res) => void
 */
function createMinimalContentHandler(lang) {
  return async function handler(req, res) {
    if (req.method && req.method !== "GET") {
      res.status(405).setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ error: "Method not allowed" }));
    }

    if (!isSupportedLang(lang)) {
      res.status(400).setHeader("Content-Type", "application/json");
      return res.end(
        JSON.stringify({
          error: `No resource found for path api/v1/content/minimal/${lang}.`,
          supported: ["en", "es", "pt-br", "ar", "ja", "ko"]
        })
      );
    }

    try {
      let snapshot = null;
      const kv = getKV();
      if (kv) {
        snapshot = await kv.get(BTC_SNAPSHOT_EARLY_KV_KEY) || await kv.get(BTC_SNAPSHOT_KV_KEY);
      }
      const content = await getMinimalContentForLang(lang, snapshot);
      if (!content) {
        res.status(400).setHeader("Content-Type", "application/json");
        return res.end(
          JSON.stringify({
            error: `No resource found for path api/v1/content/minimal/${lang}.`
          })
        );
      }
      res.status(200).setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify(content));
    } catch (err) {
      console.warn(`[api/v1/content/minimal/${lang}]`, err.message);
      res.status(500).setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ error: "Internal server error" }));
    }
  };
}

module.exports = { createMinimalContentHandler };
