// services/cryptoquant/deepMetrics.js
// CryptoTrade Academy - Phase 2: 市場別深掘りデータ取得
// Strategic SSOT v4.0 Section 2.2

const { fetchCryptoQuant } = require('./client');
const { getExchangeInflow, getMinerPositionIndex } = require('./endpoints/btc');

// Valid market codes
const VALID_MARKETS = ['EN', 'AR', 'KO', 'JA', 'ES', 'PT-BR'];

/**
 * Whale Inflow/Outflow取得（EN市場用）
 * @returns {Promise<Object>} { inflow, outflow, netflow }
 */
async function getWhaleFlows() {
  try {
    // 大型取引（>100 BTC）のフローを取得
    // 注意: CryptoQuant APIの実際のエンドポイントは要確認
    // ここでは基本実装のみ（後で実際のAPI仕様に合わせて調整）

    const inflowData = await fetchCryptoQuant('/btc/exchange-flows/inflow-sum', {
      size: 'large',
      window: 'day',
      limit: 1,
    });

    const outflowData = await fetchCryptoQuant('/btc/exchange-flows/outflow-sum', {
      size: 'large',
      window: 'day',
      limit: 1,
    });

    const inflow = inflowData?.result?.data?.[0]?.value ?? 0;
    const outflow = outflowData?.result?.data?.[0]?.value ?? 0;
    const netflow = inflow - outflow;

    return { inflow, outflow, netflow };
  } catch (error) {
    console.warn('[deepMetrics] Error fetching whale flows:', error.message);
    // Return safe defaults on error
    return { inflow: 0, outflow: 0, netflow: 0 };
  }
}

/**
 * Liquidations 24h取得（EN市場用）
 * @returns {Promise<number>} 24時間の清算額（USD）
 */
async function getLiquidations() {
  try {
    const data = await fetchCryptoQuant('/btc/derivatives/liquidations-24h', {
      limit: 1,
    });

    const liquidations = data?.result?.data?.[0]?.value ??
                        data?.result?.data?.[0]?.total_liquidations ??
                        data?.result?.data?.[0]?.liquidations ??
                        0;

    return Number(liquidations) || 0;
  } catch (error) {
    console.warn('[deepMetrics] Error fetching liquidations:', error.message);
    return 0;
  }
}

/**
 * Upbit Inflow取得（KO市場用）
 * @returns {Promise<number>} Upbitへの流入量（BTC）
 */
async function getUpbitInflow() {
  try {
    const data = await fetchCryptoQuant('/btc/exchange-flows/inflow-sum', {
      exchange: 'upbit',
      window: 'day',
      limit: 1,
    });

    return Number(data?.result?.data?.[0]?.value ?? 0);
  } catch (error) {
    console.warn('[deepMetrics] Error fetching Upbit inflow:', error.message);
    return 0;
  }
}

/**
 * Binance Inflow取得（KO市場用）
 * @returns {Promise<number>} Binanceへの流入量（BTC）
 */
async function getBinanceInflow() {
  try {
    const data = await fetchCryptoQuant('/btc/exchange-flows/inflow-sum', {
      exchange: 'binance',
      window: 'day',
      limit: 1,
    });

    return Number(data?.result?.data?.[0]?.value ?? 0);
  } catch (error) {
    console.warn('[deepMetrics] Error fetching Binance inflow:', error.message);
    return 0;
  }
}

/**
 * Kimchi Premium計算（KO市場用）
 * @param {number} upbitPrice - Upbit BTC価格（KRW）
 * @param {number} binancePrice - Binance BTC価格（USD）
 * @param {number} usdKrwRate - USD/KRW為替レート
 * @returns {number} Kimchi Premium（decimal, e.g., 0.05 for 5%）
 */
function calculateKimchiPremium(upbitPrice, binancePrice, usdKrwRate) {
  if (!upbitPrice || !binancePrice || !usdKrwRate) return 0;

  const binancePriceKrw = binancePrice * usdKrwRate;
  const premium = (upbitPrice - binancePriceKrw) / binancePriceKrw;

  return premium;
}

/**
 * NUPL取得（JA市場用）
 * @returns {Promise<number>} Net Unrealized Profit/Loss
 */
async function getNUPL() {
  try {
    const data = await fetchCryptoQuant('/btc/nupl/current', {
      limit: 1,
    });

    return Number(data?.result?.data?.[0]?.value ??
                  data?.result?.data?.[0]?.nupl ??
                  0);
  } catch (error) {
    console.warn('[deepMetrics] Error fetching NUPL:', error.message);
    return 0;
  }
}

/**
 * SOPR 30-day MA取得（JA市場用）
 * @returns {Promise<number>} SOPR 30日移動平均
 */
async function getSOPR30d() {
  try {
    const data = await fetchCryptoQuant('/btc/sopr', {
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
 * @param {number} whaleNetflow - Whale純流出（BTC）
 * @param {number} liquidations - 24時間清算額（USD）
 * @param {number} retailNetflow - Retail純流入（BTC、推定）
 * @returns {number} trapScore (0-100)
 */
function calculateTrapScore(whaleNetflow, liquidations, retailNetflow = 0) {
  let score = 0;

  // Whale売り + Retail買い = Trap
  if (whaleNetflow < -1000 && retailNetflow > 1000) {
    score += 40;
  }

  // Liquidation多い = リスク高
  if (liquidations > 100000000) {
    score += 20;
  }

  // 追加判定: Whale流出が極端に大きい場合
  if (whaleNetflow < -2000) {
    score += 20;
  }

  // 追加判定: 清算額が極端に大きい場合
  if (liquidations > 500000000) {
    score += 20;
  }

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

  // 含み損多い = 底値候補
  if (nupl < 0) {
    rr += 0.5;
  }
  if (nupl < -0.2) {
    rr += 0.5;
  }

  // 売り圧力弱い = 上昇余地
  if (sopr30d < 1.0) {
    rr += 0.5;
  }
  if (sopr30d < 0.95) {
    rr += 0.5;
  }

  return rr;
}

/**
 * 市場別深掘りデータ取得（Phase 2）
 * @param {string} market - 市場コード (EN/AR/KO/JA/ES/PT-BR)
 * @param {Object} options - 追加オプション（価格情報など）
 * @returns {Promise<Object>} 市場別深掘りデータ
 */
async function getCQDeepMetrics(market, options = {}) {
  // Validate market code
  if (!VALID_MARKETS.includes(market)) {
    console.warn(`[deepMetrics] Invalid market code: ${market}, using EN as default`);
    market = 'EN';
  }

  try {
    // 基本データ取得
    const [inflowData, mpiData] = await Promise.all([
      getExchangeInflow(),
      getMinerPositionIndex(),
    ]);

    const exchangeInflow = inflowData?.value ?? 0;
    const exchangeOutflow = 0; // 算出が必要な場合は実装
    const netflow = exchangeInflow - exchangeOutflow;
    const minerMPI = mpiData?.value ?? 0;

    const baseResult = {
      exchangeInflow,
      exchangeOutflow,
      netflow,
      minerMPI,
      activeAddresses: 0, // 必要に応じて実装
    };

    switch (market) {
      case 'EN': {
        // EN市場: Whale Flows + Liquidations + trapScore
        const [whaleFlows, liquidations] = await Promise.all([
          getWhaleFlows(),
          getLiquidations(),
        ]);

        // Retail Netflow推定（全体 - Whale）
        const retailNetflow = netflow - whaleFlows.netflow;

        const trapScore = calculateTrapScore(
          whaleFlows.netflow,
          liquidations,
          retailNetflow
        );

        return {
          ...baseResult,
          whaleFlows,
          liquidations,
          trapScore,
          longShortRatio: 1.0, // 必要に応じて実装
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
        const binancePrice = options.binancePrice ?? 0;
        const usdKrwRate = options.usdKrwRate ?? 1300; // デフォルト為替レート

        const kimchiPremium = calculateKimchiPremium(
          upbitPrice,
          binancePrice,
          usdKrwRate
        );

        const isTrap = kimchiPremium > 0.05; // 5%以上でTrap判定

        return {
          ...baseResult,
          upbitInflow,
          binanceInflow,
          kimchiPremium,
          upbitPrice,
          binancePrice,
          isTrap,
        };
      }

      case 'JA': {
        // JA市場: NUPL + SOPR + Risk/Reward
        const [nupl, sopr30d] = await Promise.all([
          getNUPL(),
          getSOPR30d(),
        ]);

        const riskReward = calculateRiskReward(nupl, sopr30d);

        return {
          ...baseResult,
          longTerm: {
            nupl,
            sopr: 1.0, // 現在値（必要に応じて実装）
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
  getSOPR30d,
  calculateTrapScore,
  calculateRiskReward,
};

