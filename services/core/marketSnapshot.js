// services/core/marketSnapshot.js
// Market Snapshot Service - Single Source of Truth for all languages

const { buildMarketContext, decideSignal } = require('../../logic/core/marketCore');

/**
 * Market Snapshot Service
 * 全言語で同一のsnapshot_idを参照し、データ一貫性を確保
 */
class MarketSnapshotService {
  constructor() {
    // メモリキャッシュ（本番環境ではRedis推奨）
    this.snapshots = new Map();
    // 最新スナップショットID（5分ごとに更新）
    this.latestSnapshotId = null;
  }

  /**
   * スナップショット生成（全言語共通のベースデータ）
   * @param {Object} params - 市場データ
   * @returns {Object} スナップショット
   */
  createSnapshot({
    priceUsd,
    change24h,
    inflow,
    mpi,
    sentimentLabel,
    xSentiment,
    trap,
  }) {
    const snapshotId = `snapshot_${Date.now()}`;
    const asOf = new Date().toISOString();

    // コアスコア計算（EN市場基準で統一）
    // 重要: 全言語で同一のスコアを生成するため、market='EN'で固定
    const ctx = buildMarketContext({
      asset: 'BTC',
      priceUsd,
      change24h,
      inflow,
      mpi,
      xSentiment,
      market: 'EN', // ベースはEN、市場別補正は表示時に適用しない
    });

    const coreDecision = decideSignal(ctx);

    // 価格の統一丸めルール（全言語で同一）
    const priceDisplay = Math.round(priceUsd);

    // Trap Scoreの計算（統一）
    const trapScore = trap?.score ?? 0;

    const snapshot = {
      snapshot_id: snapshotId,
      as_of_utc: asOf,
      symbol: 'BTC',
      price_usd_raw: priceUsd,
      price_usd_display: priceDisplay, // 統一丸め済み
      change_24h: change24h,
      market_score: Math.round(coreDecision.score), // 統一スコア（EN基準）
      market_score_version: 'v1.2',
      trap_score: Math.round(trapScore),
      signal: coreDecision.signal,
      confidence: coreDecision.confidence,
      regime: coreDecision.regime,
      inflow,
      mpi,
      sentiment_label: sentimentLabel,
      x_sentiment: xSentiment,
      // 市場別オプション（後で追加可能）
      local_optional: {
        kimchi_premium: null,
        whale_flows: null,
        liquidations: null,
        trap_score_detailed: trap,
      },
    };

    // キャッシュに保存
    this.snapshots.set(snapshotId, snapshot);
    this.latestSnapshotId = snapshotId;

    // 古いスナップショットをクリーンアップ（24時間以上古いもの）
    this.cleanupOldSnapshots();

    return snapshot;
  }

  /**
   * スナップショット取得
   * @param {string} snapshotId - スナップショットID（省略時は最新）
   * @returns {Object|null} スナップショット
   */
  getSnapshot(snapshotId = null) {
    const id = snapshotId || this.latestSnapshotId;
    if (!id) return null;
    return this.snapshots.get(id) || null;
  }

  /**
   * 最新スナップショット取得
   * @returns {Object|null} 最新スナップショット
   */
  getLatestSnapshot() {
    return this.getSnapshot(this.latestSnapshotId);
  }

  /**
   * 古いスナップショットのクリーンアップ
   */
  cleanupOldSnapshots() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24時間

    for (const [id, snapshot] of this.snapshots.entries()) {
      const snapshotTime = new Date(snapshot.as_of_utc).getTime();
      if (now - snapshotTime > maxAge) {
        this.snapshots.delete(id);
        if (id === this.latestSnapshotId) {
          this.latestSnapshotId = null;
        }
      }
    }
  }

  /**
   * 市場別オプションデータの追加
   * @param {string} snapshotId - スナップショットID
   * @param {string} market - 市場コード
   * @param {Object} localData - 市場別データ
   */
  addLocalOptional(snapshotId, market, localData) {
    const snapshot = this.getSnapshot(snapshotId);
    if (!snapshot) return;

    switch (market) {
      case 'KO':
        snapshot.local_optional.kimchi_premium = localData.kimchiPremium;
        snapshot.local_optional.upbit_price = localData.upbitPrice;
        snapshot.local_optional.binance_price = localData.binancePrice;
        break;
      case 'EN':
        snapshot.local_optional.trap_score = localData.trapScore;
        snapshot.local_optional.whale_flows = localData.whaleFlows;
        snapshot.local_optional.liquidations = localData.liquidations;
        break;
      default:
        // その他の市場は必要に応じて追加
        break;
    }
  }
}

// シングルトンインスタンス
const marketSnapshotService = new MarketSnapshotService();

module.exports = marketSnapshotService;
