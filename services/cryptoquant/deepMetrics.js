// services/cryptoquant/deepMetrics.js
// CryptoTrade Academy - Phase 2: 市場別深掘りデータ取得
// Strategic SSOT v4.0 Section 2.2

const { fetchCryptoQuant } = require('./client');
const { getExchangeInflow, getMinerPositionIndex } = require('./endpoints/btc');

// Valid market codes
const VALID_MARKETS = ['EN', 'AR', 'KO', 'JA', 'ES', 'PT-BR'];

// Whale Ratio thresholds
const WHALE_RATIO_HIGH_PRESSURE_THRESHOLD = 0.85;  // 85% indicates strong selling pressure
const WHALE_RATIO_MEDIUM_PRESSURE_THRESHOLD = 0.75; // 75% indicates moderate pressure

// Trap score weights（Liquidations関連は削除 - CryptoQuant APIで提供されていない）
const SCORE_WHALE_RATIO_HIGH = 40;
const SCORE_WHALE_RATIO_MEDIUM = 20;
// 注意: Liquidationsによるスコア加算は削除（404エンドポイントのため）

/**
 * Whale Ratio取得（EN市場用）
 * Step 2-4: EMERGENCY判定指標のキャッシュバイパス対応
 *
 * Exchange Whale Ratio represents the proportion of the top 10 largest inflow transactions
 * versus total inflow. High values (>85%) indicate whale selling pressure.
 *
 * Endpoint: /btc/flow-indicator/exchange-whale-ratio
 * Parameters: exchange=all_exchange, window=day, limit=1
 *
 * @param {object} options - オプション
 * @param {boolean} options.skipCache - キャッシュをスキップするか（EMERGENCY判定時など）
 * @returns {Promise<Object>} { whaleRatio, interpretation }
 */
async function getWhaleFlows(options = {}) {
  try {
    // Exchange Whale Ratioを取得（トップ10のインフロー / 全体のインフロー）
    // Step 2-4: EMERGENCY判定指標のキャッシュバイパス（trapScore計算に使用）
    const whaleRatioData = await fetchCryptoQuant('/btc/flow-indicator/exchange-whale-ratio', {
      exchange: 'all_exchange',
      window: 'day',
      limit: 1,
    }, { skipCache: options.skipCache });

    const point = whaleRatioData?.result?.data?.[0];
    const whaleRatio = point?.exchange_whale_ratio ?? point?.value ?? point?.whale_ratio ?? 0;

    // Whale Ratioが閾値以上は売り圧力が高い
    const isHighPressure = whaleRatio > WHALE_RATIO_HIGH_PRESSURE_THRESHOLD;

    return {
      whaleRatio,
      isHighPressure,
      interpretation: isHighPressure ? 'high_selling_pressure' : 'normal'
    };
  } catch (error) {
    // 404エラー（エンドポイントが存在しない）の場合はdebugレベルでログ出力
    if (error.message && error.message.includes('404')) {
      // Loggerが利用可能な場合はdebugレベルで、そうでない場合はwarningを抑制
      try {
        const { Logger } = require('../utils/logger');
        Logger.debug('deepMetrics', 'Exchange whale ratio endpoint not available (expected)', { error: error.message });
      } catch {
        // Loggerが利用不可の場合はログ出力なし（404は期待される動作）
      }
    } else {
      console.warn('[deepMetrics] Error fetching whale ratio:', error.message);
    }
    // Return safe defaults on error
    return { whaleRatio: 0, isHighPressure: false, interpretation: 'unknown' };
  }
}

/**
 * Liquidations取得（EN市場用）
 *
 * CryptoQuant provides separate long and short liquidation metrics.
 * We combine both to get total liquidations.
 *
 * Endpoints:
 * - /derivatives/liquidations-long/btc
 * - /derivatives/liquidations-short/btc
 *
 * Phase 3: 機能フラグで制御（404エンドポイントを呼ばない）
 *
 * @returns {Promise<Object>} { longLiquidations, shortLiquidations, totalLiquidations }
 */
/**
 * Liquidations取得
 * 
 * 注意: CryptoQuant APIでは Liquidations エンドポイントが提供されていないため（404エラー）、
 * 常に0を返します。trapScore計算ではLiquidationsによるスコア加算は行われません。
 * 
 * @param {object} options - オプション（互換性のため残すが使用しない）
 * @returns {Promise<Object>} 常に0を返す
 */
async function getLiquidations(options = {}) {
  // CryptoQuant APIでは提供されていないため、常に0を返す
  return {
    longLiquidations: 0,
    shortLiquidations: 0,
    totalLiquidations: 0,
  };
}

/**
 * Upbit Inflow取得（KO市場用）
 *
 * Endpoint: /btc/exchange-flows/inflow
 * Parameters: exchange=upbit, window=day, limit=1
 *
 * @returns {Promise<number>} Upbitへの流入量（BTC）
 */
async function getUpbitInflow() {
  try {
    const data = await fetchCryptoQuant('/btc/exchange-flows/inflow', {
      exchange: 'upbit',
      window: 'day',
      limit: 1,
    });

    const point = data?.result?.data?.[0];
    return Number(point?.value ?? point?.inflow_total ?? point?.inflow ?? 0);
  } catch (error) {
    console.warn('[deepMetrics] Error fetching Upbit inflow:', error.message);
    return 0;
  }
}

/**
 * Binance Inflow取得（KO市場用）
 *
 * Endpoint: /btc/exchange-flows/inflow
 * Parameters: exchange=binance, window=day, limit=1
 *
 * @returns {Promise<number>} Binanceへの流入量（BTC）
 */
async function getBinanceInflow() {
  try {
    const data = await fetchCryptoQuant('/btc/exchange-flows/inflow', {
      exchange: 'binance',
      window: 'day',
      limit: 1,
    });

    const point = data?.result?.data?.[0];
    return Number(point?.value ?? point?.inflow_total ?? point?.inflow ?? 0);
  } catch (error) {
    console.warn('[deepMetrics] Error fetching Binance inflow:', error.message);
    return 0;
  }
}

/**
 * Kimchi Premium計算（KO市場用）
 * @param {number} upbitPrice - Upbit BTC価格（KRW）
 * @param {number} usdPrice - BTC USD価格
 * @param {number} usdKrwRate - USD/KRW為替レート
 * @returns {number} Kimchi Premium（decimal, e.g., 0.05 for 5%）
 */
function calculateKimchiPremium(upbitPrice, usdPrice, usdKrwRate) {
  if (!upbitPrice || !usdPrice || !usdKrwRate) return 0;

  const usdPriceKrw = usdPrice * usdKrwRate;
  const premium = (upbitPrice - usdPriceKrw) / usdPriceKrw;

  return premium;
}

/**
 * NUPL取得（JA市場用）
 *
 * 注意: CryptoQuant APIでは NUPL エンドポイントが提供されていないため（404エラー）、
 * 常に0を返します。riskReward計算ではNUPLによる加算は行われません。
 *
 * @returns {Promise<number>} 常に0を返す
 */
async function getNUPL() {
  // CryptoQuant APIでは提供されていないため、常に0を返す
  return 0;
}

/**
 * SOPR (Spent Output Profit Ratio) 取得（JA市場用）
 *
 * SOPR shows whether spent outputs are being sold at a profit (>1) or loss (<1).
 *
 * Endpoint: /market-indicator/sopr/btc
 * Parameters: window=day, limit=1
 *
 * @returns {Promise<number>} Current SOPR value
 */
async function getSOPR() {
  try {
    const data = await fetchCryptoQuant('/btc/market-indicator/sopr', {
      window: 'day',
      limit: 1,
    });

    const point = data?.result?.data?.[0];
    const sopr = Number(point?.value ?? point?.sopr ?? 1.0);

    return sopr;
  } catch (error) {
    console.warn('[deepMetrics] Error fetching SOPR:', error.message);
    return 1.0;
  }
}

/**
 * SOPR 30-day MA取得（JA市場用）
 *
 * 30-day moving average of SOPR to smooth out daily volatility.
 *
 * Endpoint: /market-indicator/sopr/btc
 * Parameters: window=day, limit=30
 *
 * Interpretation:
 * - Rising 30d MA: Profit realization, bullish sentiment
 * - Falling 30d MA: Capitulation, potential bottom formation
 *
 * @returns {Promise<number>} SOPR 30日移動平均
 */
async function getSOPR30d() {
  try {
    const data = await fetchCryptoQuant('/btc/market-indicator/sopr', {
      window: 'day',
      limit: 30,
    });

    const soprValues = data?.result?.data ?? [];
    if (soprValues.length === 0) return 1.0;

    const sum = soprValues.reduce((acc, point) => {
      const value = Number(point.sopr ?? point.value ?? 1.0);
      return acc + value;
    }, 0);

    return sum / soprValues.length;
  } catch (error) {
    console.warn('[deepMetrics] Error fetching SOPR 30d:', error.message);
    return 1.0;
  }
}

/**
 * trapScore計算（EN市場専用）
 *
 * Calculates a trap score (0-100) based on whale activity and market conditions.
 * Higher scores indicate higher risk of a market trap.
 *
 * @param {number} whaleRatio - Exchange Whale Ratio (0-1, where >0.85 is high selling pressure)
 * @param {Object} liquidations - Liquidation data
 * @param {number} liquidations.longLiquidations - Long position liquidations in USD
 * @param {number} liquidations.shortLiquidations - Short position liquidations in USD
 * @param {number} liquidations.totalLiquidations - Total liquidations (long + short) in USD
 * @returns {number} trapScore (0-100)
 */
function calculateTrapScore(whaleRatio, liquidations) {
  let score = 0;

  // High Whale Ratio indicates strong selling pressure
  if (whaleRatio > WHALE_RATIO_HIGH_PRESSURE_THRESHOLD) {
    score += SCORE_WHALE_RATIO_HIGH;
  } else if (whaleRatio > WHALE_RATIO_MEDIUM_PRESSURE_THRESHOLD) {
    score += SCORE_WHALE_RATIO_MEDIUM;
  }

  // 注意: Liquidationsによるスコア加算は削除（CryptoQuant APIで提供されていないため）
  // liquidationsパラメータは互換性のため残すが、使用しない

  return Math.min(100, score);
}

/**
 * riskReward計算（JA市場専用）
 * @param {number} nupl - Net Unrealized Profit/Loss
 * @param {number} sopr30d - SOPR 30日移動平均
 * @returns {number} Risk/Reward比率
 */
function calculateRiskReward(nupl, sopr30d) {
  let rr = 1.0;

  // 注意: NUPLによる加算は削除（CryptoQuant APIで提供されていないため）
  // nuplパラメータは互換性のため残すが、使用しない

  // 売り圧力弱い = 上昇余地（SOPRのみで計算）
  if (sopr30d < 1.0) {
    rr += 0.5;
  }
  if (sopr30d < 0.95) {
    rr += 0.5;
  }

  return rr;
}

/**
 * 高解像度データから基本値（inflow/mpi）を取得（重複API呼び出し回避）
 * @param {Object} highResCQ - getHighResolutionCQData() の戻り値
 * @returns {{ exchangeInflow: number, minerMPI: number } | null}
 */
function deriveBaseFromHighRes(highResCQ) {
  if (!highResCQ || typeof highResCQ !== 'object') return null;
  const netflowCurrent = highResCQ.netflow?.timeframes?.day?.current;
  const mpiCurrent = highResCQ.mpi?.timeframes?.day?.current;
  if (netflowCurrent == null && mpiCurrent == null) return null;
  return {
    exchangeInflow: typeof netflowCurrent === 'number' ? netflowCurrent : Number(netflowCurrent) || 0,
    minerMPI: typeof mpiCurrent === 'number' ? mpiCurrent : Number(mpiCurrent) || 0,
  };
}

/**
 * 市場別深掘りデータ取得（Phase 2）
 * Step 2-4: EMERGENCY判定指標のキャッシュバイパス対応
 * オーバースペック対策: options.highResCQ を渡すと netflow/mpi/whale の再取得をスキップ（同一エンドポイント重複呼び出し回避）
 * @param {string} market - 市場コード (EN/AR/KO/JA/ES/PT-BR)
 * @param {Object} options - 追加オプション（価格情報など）
 * @param {Object} options.highResCQ - getHighResolutionCQData() の戻り値（省略時は自前で取得）
 * @param {boolean} options.skipCache - キャッシュをスキップするか（EMERGENCY判定時など）
 * @returns {Promise<Object>} 市場別深掘りデータ
 */
async function getCQDeepMetrics(market, options = {}) {
  // Validate market code
  if (!VALID_MARKETS.includes(market)) {
    console.warn(`[deepMetrics] Invalid market code: ${market}, using EN as default`);
    market = 'EN';
  }

  try {
    const reused = deriveBaseFromHighRes(options.highResCQ);
    let exchangeInflow, minerMPI;

    if (reused) {
      exchangeInflow = reused.exchangeInflow;
      minerMPI = reused.minerMPI;
    } else {
      const [inflowData, mpiData] = await Promise.all([
        getExchangeInflow(),
        getMinerPositionIndex(),
      ]);
      exchangeInflow = inflowData?.value ?? 0;
      minerMPI = mpiData?.value ?? 0;
    }

    const exchangeOutflow = 0; // 算出が必要な場合は実装
    const netflow = exchangeInflow - exchangeOutflow;

    const baseResult = {
      exchangeInflow,
      exchangeOutflow,
      netflow,
      minerMPI,
      activeAddresses: 0, // 必要に応じて実装
    };

    switch (market) {
      case 'EN': {
        let whaleData;
        if (options.highResCQ?.whaleRatio != null && options.highResCQ.whaleRatio.current != null) {
          const whaleRatio = Number(options.highResCQ.whaleRatio.current) || 0;
          whaleData = {
            whaleRatio,
            isHighPressure: whaleRatio > WHALE_RATIO_HIGH_PRESSURE_THRESHOLD,
            interpretation: whaleRatio > WHALE_RATIO_HIGH_PRESSURE_THRESHOLD ? 'high_selling_pressure' : 'normal',
          };
        } else {
          const [whale, liquidations] = await Promise.all([
            getWhaleFlows({ skipCache: options.skipCache }),
            getLiquidations({ skipCache: options.skipCache }),
          ]);
          whaleData = whale;
        }
        const liquidations = { longLiquidations: 0, shortLiquidations: 0, totalLiquidations: 0 };
        const trapScore = calculateTrapScore(
          whaleData.whaleRatio || 0,
          liquidations,
          null
        );

        return {
          ...baseResult,
          whaleFlows: whaleData,
          liquidations,
          trapScore,
        };
      }

      case 'KO': {
        // KO市場: Kimchi Premium計算
        const [upbitInflow, binanceInflow] = await Promise.all([
          getUpbitInflow(),
          getBinanceInflow(),
        ]);

        // 価格情報が必要（optionsから取得、または別途取得）
        const upbitPrice = options.upbitPrice ?? 0;
        const usdPrice = options.usdPrice ?? 0; // USD価格を使用
        const usdKrwRate = options.usdKrwRate ?? 1300; // デフォルト為替レート

        const kimchiPremium = calculateKimchiPremium(
          upbitPrice,
          usdPrice,
          usdKrwRate
        );

        const isTrap = kimchiPremium > 0.05; // 5%以上でTrap判定

        return {
          ...baseResult,
          upbitInflow,
          binanceInflow,
          kimchiPremium,
          upbitPrice,
          isTrap,
        };
      }

      case 'JA': {
        // JA市場: NUPL + SOPR + Risk/Reward
        const [nupl, sopr, sopr30d] = await Promise.all([
          getNUPL(),
          getSOPR(),
          getSOPR30d(),
        ]);

        const riskReward = calculateRiskReward(nupl, sopr30d);

        return {
          ...baseResult,
          longTerm: {
            nupl,
            sopr,
            sopr30d,
          },
          riskReward,
        };
      }

      case 'AR':
      case 'ES':
      case 'PT-BR':
      default:
        // AR/LATAM市場: 基本データのみ
        return baseResult;
    }
  } catch (error) {
    console.error(`[deepMetrics] Error fetching deep metrics for ${market}:`, error);
    // Return safe defaults on error
    return {
      exchangeInflow: 0,
      exchangeOutflow: 0,
      netflow: 0,
      minerMPI: 0,
      activeAddresses: 0,
    };
  }
}

module.exports = {
  getCQDeepMetrics,
  getWhaleFlows,
  getLiquidations,
  getUpbitInflow,
  getBinanceInflow,
  calculateKimchiPremium,
  getNUPL,
  getSOPR,
  getSOPR30d,
  calculateTrapScore,
  calculateRiskReward,
};

