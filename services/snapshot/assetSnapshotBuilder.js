/**
 * Phase 4: Multi-asset snapshot builder
 * runAssetSnapshot(assetCode, existingSnapshot?)
 * - For BTC with existingSnapshot: persists to asset:snapshot:BTC, returns snapshot
 * - For other assets: uses adapter, builds minimal snapshot (stub for now)
 */
const { getKV } = require("../../utils/kv");
const { assetSnapshotKvKey, buildAssetSnapshot, VALID_ASSETS } = require("./assetSnapshotSchema");
const btcAdapter = require("./adapters/btcAdapter");
const ethAdapter = require("./adapters/ethAdapter");
const solAdapter = require("./adapters/solAdapter");
const xrpAdapter = require("./adapters/xrpAdapter");
const trxAdapter = require("./adapters/trxAdapter");
const stablecoinAdapter = require("./adapters/stablecoinAdapter");
const erc20Adapter = require("./adapters/erc20Adapter");
const altAdapter = require("./adapters/altAdapter");
const nasdaqAdapter = require("./adapters/nasdaqAdapter");
const goldAdapter = require("./adapters/goldAdapter");

const ADAPTERS = {
  BTC: btcAdapter,
  ETH: ethAdapter,
  SOL: solAdapter,
  XRP: xrpAdapter,
  TRX: trxAdapter,
  STABLECOIN: stablecoinAdapter,
  ERC20: erc20Adapter,
  ALT: altAdapter,
  NASDAQ: nasdaqAdapter,
  GOLD: goldAdapter
};

/**
 * Persist snapshot to KV at asset:snapshot:{assetCode}
 * 正式仕様: writeAssetSnapshot(asset, snapshot) の実体。
 */
async function writeAssetSnapshotToKv(assetCode, snapshot) {
  const kv = getKV();
  if (!kv) return false;
  const key = assetSnapshotKvKey(assetCode);
  try {
    await kv.set(key, snapshot);
    return true;
  } catch (e) {
    console.warn("[assetSnapshotBuilder] KV write error:", e.message);
    return false;
  }
}

/** Alias for multi-asset 仕様: writeAssetSnapshot(asset, snapshot) */
async function writeAssetSnapshot(asset, snapshot) {
  return writeAssetSnapshotToKv(String(asset || "BTC").toUpperCase(), snapshot);
}

/**
 * Read asset snapshot from KV. 正式仕様: readAssetSnapshot(asset)
 * BTC の場合は btc:snapshot をフォールバックとして読む。
 */
async function readAssetSnapshot(asset) {
  const kv = getKV();
  if (!kv) return null;
  const code = String(asset || "BTC").toUpperCase();
  const primaryKey = assetSnapshotKvKey(code);
  try {
    let value = await kv.get(primaryKey);
    if (value) return value;
    if (code === "BTC") {
      value = await kv.get("btc:snapshot");
      if (value) return value;
    }
    return null;
  } catch (e) {
    console.warn("[assetSnapshotBuilder] readAssetSnapshot error:", e.message);
    return null;
  }
}

/**
 * Run asset snapshot pipeline
 * @param {string} assetCode - BTC | ETH | SOL | NASDAQ | GOLD
 * @param {Object} [existingSnapshot] - For BTC: pre-built snapshot from cron (skip adapter)
 * @returns {Promise<Object|null>} snapshot or null
 */
async function runAssetSnapshot(assetCode, existingSnapshot = null) {
  const code = String(assetCode || "BTC").toUpperCase();
  if (!VALID_ASSETS.includes(code)) {
    console.warn("[assetSnapshotBuilder] Invalid asset:", assetCode);
    return null;
  }

  if (existingSnapshot && code === "BTC") {
    const snapshot = buildAssetSnapshot({
      ...existingSnapshot,
      asset_code: code
    });
    await writeAssetSnapshotToKv(code, snapshot);
    return snapshot;
  }

  const adapter = ADAPTERS[code];
  if (!adapter || !adapter.fetchRaw) {
    return null;
  }

  try {
    if (adapter.fetchMacroSnapshot && (code === "NASDAQ" || code === "GOLD")) {
      const macro = await adapter.fetchMacroSnapshot();
      if (macro) {
        const raw = { ...macro.raw, priceUsd: macro.raw.priceIndex ?? macro.raw.priceUsd, inflow: 0, mpi: 0, sentimentLabel: "Unknown", fng: null };
        const snapshot = buildAssetSnapshot({
          asset_code: code,
          raw,
          cqDeep: macro.deep || null,
          market_score: 0,
          as_of_utc: macro.as_of_utc
        });
        await writeAssetSnapshotToKv(code, snapshot);
        return snapshot;
      }
    }
    if (adapter.fetchAssetSnapshot && code !== "BTC") {
      const assetSnapshot = await adapter.fetchAssetSnapshot();
      if (assetSnapshot) {
        const snapshot = buildAssetSnapshot({
          asset_code: code,
          raw: assetSnapshot.raw,
          cqDeep: assetSnapshot.cqDeep,
          market_score: 0,
          as_of_utc: assetSnapshot.as_of_utc
        });
        await writeAssetSnapshotToKv(code, snapshot);
        return snapshot;
      }
    }
    const raw = await adapter.fetchRaw();
    const snapshot = buildAssetSnapshot({
      asset_code: code,
      raw,
      market_score: 0
    });
    await writeAssetSnapshotToKv(code, snapshot);
    return snapshot;
  } catch (e) {
    console.warn("[assetSnapshotBuilder] runAssetSnapshot error:", e.message);
    return null;
  }
}

module.exports = {
  runAssetSnapshot,
  writeAssetSnapshotToKv,
  writeAssetSnapshot,
  readAssetSnapshot
};
