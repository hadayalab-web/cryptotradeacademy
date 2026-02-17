// services/cryptoquant/deepMetrics.js
// CryptoTrade Academy - Phase 2: 市場別深掘りデータ取得
// Strategic SSOT v4.0 Section 2.2

const { fetchCryptoQuant } = require('./client');
const { getExchangeInflow, getMinerPositionIndex } = require('./endpoints/btc');
const { isPathKnown } = require('./reference');

/**
 * CQ Pro fetch with retry: 404→null, 500→retry once, 429→wait+retry
 * @returns {Promise<any|null>}
 */
async function fetchCQWithRetry(path, params = {}, opts = {}, retryCount = 0) {
  try {
    return await fetchCryptoQuant(path, params, opts);
  } catch (e) {
    const msg = String(e?.message || '');
    if (msg.includes('404')) return null;
    if (msg.includes('500') && retryCount < 1) {
      await new Promise(r => setTimeout(r, 2000));
      return fetchCQWithRetry(path, params, opts, retryCount + 1);
    }
    if (msg.includes('429') && retryCount < 2) {
      await new Promise(r => setTimeout(r, 5000));
      return fetchCQWithRetry(path, params, opts, retryCount + 1);
    }
    throw e;
  }
}

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
 * Liquidations取得（CQ: /btc/market-data/liquidations 1本で long/short 含む）
 * 404→null相当で0を返す。500/429はリトライ。
 * @returns {Promise<Object>} { longLiquidations, shortLiquidations, totalLiquidations }
 */
async function getLiquidations(options = {}) {
  try {
    const data = await fetchCQWithRetry('/btc/market-data/liquidations', { exchange: 'all_exchange', window: 'day', limit: 1 }, options);
    const point = data?.result?.data?.[0];
    if (!point) return { longLiquidations: 0, shortLiquidations: 0, totalLiquidations: 0 };
    const longL = Number(point?.long_liquidations ?? point?.liquidations_long ?? point?.value ?? 0) || 0;
    const shortL = Number(point?.short_liquidations ?? point?.liquidations_short ?? 0) || 0;
    const total = Number(point?.total_liquidations ?? point?.liquidations ?? point?.value ?? 0) || (longL + shortL);
    return {
      longLiquidations: longL,
      shortLiquidations: shortL,
      totalLiquidations: total,
    };
  } catch {
    return { longLiquidations: 0, shortLiquidations: 0, totalLiquidations: 0 };
  }
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
 * NUPL取得（CQ Pro）
 * 404の場合はnullを返し、ログを残す。取得可能なら値を返す。
 * @returns {Promise<number|null>}
 */
async function getNUPL() {
  const endpoints = ['/btc/network-indicator/nupl', '/btc/market-indicator/nupl'];
  for (const path of endpoints) {
    try {
      const data = await fetchCQWithRetry(path, { window: 'day', limit: 1 });
      const point = data?.result?.data?.[0];
      const v = Number(point?.value ?? point?.nupl ?? 0);
      return Number.isFinite(v) ? v : null;
    } catch (e) {
      if (e.message && String(e.message).includes('404')) {
        try { require('../utils/logger').Logger.debug('deepMetrics', `NUPL ${path} 404`, {}); } catch (_) {}
      } else {
        console.warn('[deepMetrics] NUPL fetch error:', e.message);
      }
    }
  }
  return null;
}

/**
 * LTH-NUPL取得（Long-Term Holder NUPL）
 * CQ は /btc/network-indicator/nupl で nupl（lth_nupl 等を含む場合あり）を提供。
 * @returns {Promise<number|null>}
 */
async function getLTHNUPL() {
  const paths = ['/btc/network-indicator/nupl', '/btc/network-indicator/lth-nupl', '/btc/market-indicator/lth-nupl'];
  for (const p of paths) {
    try {
      const data = await fetchCQWithRetry(p, { window: 'day', limit: 1 });
      const point = data?.result?.data?.[0];
      const v = Number(point?.lth_nupl ?? point?.value ?? point?.nupl ?? 0);
      return Number.isFinite(v) ? v : null;
    } catch {
      // 404: try next
    }
  }
  return null;
}

/**
 * Funding Rate取得（CQ: /btc/market-data/funding-rates）
 * 404の場合はnull、取得可能なら値（小数、例: 0.0001 = 0.01%）
 * @returns {Promise<number|null>}
 */
async function getFundingRate() {
  try {
    const data = await fetchCQWithRetry('/btc/market-data/funding-rates', { exchange: 'all_exchange', window: '8hour', limit: 1 });
    if (!data) return null; // 403/400 等で client が null を返した場合
    const point = data?.result?.data?.[0];
    const v = Number(point?.value ?? point?.funding_rate ?? point?.rate ?? 0);
    return Number.isFinite(v) ? v : null;
  } catch (e) {
    const msg = String(e?.message || '');
    if (msg.includes('404') || msg.includes('403')) {
      try { require('../utils/logger').Logger.debug('deepMetrics', 'Funding funding-rates 404/403 (plan limit)', {}); } catch (_) {}
    } else {
      console.warn('[deepMetrics] Funding fetch error:', e.message);
    }
    return null;
  }
}

/**
 * Open Interest取得（CQ: /btc/market-data/open-interest）
 * 404の場合はnull、取得可能なら値（USD）
 * @returns {Promise<number|null>}
 */
async function getOpenInterest() {
  try {
    const data = await fetchCQWithRetry('/btc/market-data/open-interest', { exchange: 'all_exchange', window: 'day', limit: 1 });
    const point = data?.result?.data?.[0];
    const v = Number(point?.value ?? point?.open_interest ?? point?.oi ?? 0);
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch (e) {
    if (e.message && String(e.message).includes('404')) {
      try { require('../utils/logger').Logger.debug('deepMetrics', 'OI open-interest 404', {}); } catch (_) {}
    } else {
      console.warn('[deepMetrics] OpenInterest fetch error:', e.message);
    }
    return null;
  }
}

/**
 * Miner Flows取得（CQ Pro、MPI以外の鉱夫指標）
 * 404の場合はnull、取得可能なら { outflow, inflow, netflow } 等
 * @returns {Promise<Object|null>}
 */
async function getMinerFlows() {
  const paths = ['/btc/miner-flows/outflow', '/btc/flow-indicator/miner-outflow'];
  const minerParams = { window: 'day', limit: 1, miner: 'all_miner' };
  for (const path of paths) {
    try {
      const params = path.includes('miner-flows') ? minerParams : { window: 'day', limit: 1 };
      const data = await fetchCQWithRetry(path, params);
      const point = data?.result?.data?.[0];
      const outflow = Number(point?.outflow_total ?? point?.value ?? point?.outflow ?? point?.miner_outflow ?? 0);
      if (Number.isFinite(outflow)) {
        return { outflow, inflow: point?.inflow ?? null, netflow: point?.netflow ?? null };
      }
    } catch (e) {
      if (e.message && String(e.message).includes('404')) {
        try { require('../utils/logger').Logger.debug('deepMetrics', `MinerFlows ${path} 404`, {}); } catch (_) {}
      } else {
        console.warn('[deepMetrics] MinerFlows fetch error:', e.message);
      }
    }
  }
  return null;
}

/**
 * Stablecoin metrics取得（CQ: /stablecoin/exchange-flows/reserve 等）
 * /stablecoin/* は token 必須。USDT を指定。
 * @returns {Promise<Object|null>}
 */
async function getStablecoinMetrics() {
  const paths = [
    '/stablecoin/exchange-flows/reserve',
    '/btc/exchange-flows/reserve',
  ];
  const baseParams = { exchange: 'all_exchange', window: 'day', limit: 1 };
  for (const p of paths) {
    try {
      const params = p.startsWith('/stablecoin/') ? { ...baseParams, token: 'usdt' } : baseParams;
      const data = await fetchCQWithRetry(p, params);
      const point = data?.result?.data?.[0];
      if (point && typeof point === 'object') {
        return {
          exchangeReserve: point?.value ?? point?.reserve ?? null,
          supplyRatio: point?.supply_ratio ?? null,
          ...point,
        };
      }
    } catch {
      // 404: try next path
    }
  }
  return null;
}

/**
 * ETF flows取得（CQ に ETF 専用パスが無い場合は呼び出さず null）
 * @returns {Promise<Object|null>}
 */
async function getETFFlows() {
  const paths = ['/btc/etf-flows', '/btc/etf/flows'];
  const toTry = paths.filter((p) => isPathKnown(p));
  if (toTry.length === 0) return null;
  for (const p of toTry) {
    try {
      const data = await fetchCQWithRetry(p, { window: 'day', limit: 1 });
      const point = data?.result?.data?.[0];
      if (point && typeof point === 'object') {
        return {
          inflow: point?.inflow ?? point?.value ?? null,
          outflow: point?.outflow ?? null,
          netflow: point?.netflow ?? null,
          ...point,
        };
      }
    } catch {
      // 404: try next path
    }
  }
  return null;
}

/**
 * Exchange flows（詳細）取得
 * netflowは既存。inflow/outflowを個別に取得可能な場合
 * @returns {Promise<Object|null>}
 */
async function getExchangeFlowsDetailed() {
  try {
    const inflowData = await fetchCQWithRetry('/btc/exchange-flows/inflow', { exchange: 'all_exchange', window: 'day', limit: 1 });
    const outflowData = await fetchCQWithRetry('/btc/exchange-flows/outflow', { exchange: 'all_exchange', window: 'day', limit: 1 });
    const inflowPoint = inflowData?.result?.data?.[0];
    const outflowPoint = outflowData?.result?.data?.[0];
    const inflow = Number(inflowPoint?.value ?? inflowPoint?.inflow ?? 0) || null;
    const outflow = Number(outflowPoint?.value ?? outflowPoint?.outflow ?? 0) || null;
    if (inflow != null || outflow != null) {
      return { inflow, outflow, netflow: (inflow ?? 0) - (outflow ?? 0) };
    }
  } catch { /* 404 */ }
  return null;
}

/**
 * Liquidity取得（CQ に該当パスが存在する場合のみ呼び出し、なければ null）
 * @returns {Promise<Object|null>}
 */
async function getLiquidity() {
  const paths = ['/btc/liquidity/depth', '/btc/market-indicator/liquidity'];
  const toTry = paths.filter((p) => isPathKnown(p));
  if (toTry.length === 0) return null;
  for (const p of toTry) {
    try {
      const data = await fetchCQWithRetry(p, { window: 'day', limit: 1 });
      const point = data?.result?.data?.[0];
      if (point && typeof point === 'object') {
        return {
          value: point?.value ?? null,
          depth: point?.depth ?? null,
          bidAskSpread: point?.bid_ask_spread ?? null,
          ...point,
        };
      }
    } catch (e) {
      if (e.message && String(e.message).includes('404')) {
        try { require('../utils/logger').Logger.debug('deepMetrics', `Liquidity ${p} 404`, {}); } catch (_) {}
      } else {
        console.warn('[deepMetrics] Liquidity fetch error:', e.message);
      }
    }
  }
  return null;
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
 * CQ Pro 共通フィールド取得（derivatives, liquidity, miner flows, LTH, stablecoin, exchange flows, ETF flows）
 * 404のものはnullでスキップ。並列取得。
 * @returns {Promise<Object>}
 */
async function fetchCQProCommonFields() {
  const [
    sopr, sopr30d, nupl, lthNupl, funding, openInterest, liquidations, minerFlows, liquidity,
    stablecoinMetrics, etfFlows, exchangeFlowsDetailed,
  ] = await Promise.all([
    getSOPR().catch(() => null),
    getSOPR30d().catch(() => null),
    getNUPL().catch(() => null),
    getLTHNUPL().catch(() => null),
    getFundingRate().catch(() => null),
    getOpenInterest().catch(() => null),
    getLiquidations().catch(() => ({ longLiquidations: 0, shortLiquidations: 0, totalLiquidations: 0 })),
    getMinerFlows().catch(() => null),
    getLiquidity().catch(() => null),
    getStablecoinMetrics().catch(() => null),
    getETFFlows().catch(() => null),
    getExchangeFlowsDetailed().catch(() => null),
  ]);
  const out = {
    sopr: sopr != null && Number.isFinite(sopr) ? sopr : null,
    sopr30d: sopr30d != null && Number.isFinite(sopr30d) ? sopr30d : null,
    nupl: nupl != null && Number.isFinite(nupl) ? nupl : null,
    lthNupl: lthNupl != null && Number.isFinite(lthNupl) ? lthNupl : null,
    funding: funding != null && Number.isFinite(funding) ? funding : null,
    openInterest: openInterest != null && Number.isFinite(openInterest) ? openInterest : null,
    liquidations: liquidations && typeof liquidations === 'object' ? liquidations : null,
    minerFlows: minerFlows && typeof minerFlows === 'object' ? minerFlows : null,
    liquidity: liquidity && typeof liquidity === 'object' ? liquidity : null,
    stablecoinMetrics: stablecoinMetrics && typeof stablecoinMetrics === 'object' ? stablecoinMetrics : null,
    etfFlows: etfFlows && typeof etfFlows === 'object' ? etfFlows : null,
    exchangeFlowsDetailed: exchangeFlowsDetailed && typeof exchangeFlowsDetailed === 'object' ? exchangeFlowsDetailed : null,
  };
  return out;
}

/**
 * 市場別深掘りデータ取得（Phase 2）
 * Step 2-4: EMERGENCY判定指標のキャッシュバイパス対応
 * CQ Pro 100%: sopr, sopr30d, nupl, funding, openInterest, minerFlows, liquidity を全市場で受け皿として含む
 * @param {string} market - 市場コード (EN/AR/KO/JA/ES/PT-BR)
 * @param {Object} options - 追加オプション（価格情報など）
 * @param {Object} options.highResCQ - getHighResolutionCQData() の戻り値（省略時は自前で取得）
 * @param {boolean} options.skipCache - キャッシュをスキップするか（EMERGENCY判定時など）
 * @returns {Promise<Object>} 市場別深掘りデータ（cqDeep）
 */
async function getCQDeepMetrics(market, options = {}) {
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

    const exchangeOutflow = 0;
    const netflow = exchangeInflow - exchangeOutflow;

    const baseResult = {
      exchangeInflow,
      exchangeOutflow,
      netflow,
      minerMPI,
      mpi: minerMPI,
      activeAddresses: 0,
    };

    // CQ Pro 共通フィールド（全市場で受け皿を用意、404はnull）
    const cqPro = await fetchCQProCommonFields();
    Object.assign(baseResult, cqPro);

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
          whaleData = await getWhaleFlows({ skipCache: options.skipCache });
        }
        const liquidationsData = baseResult.liquidations ?? { longLiquidations: 0, shortLiquidations: 0, totalLiquidations: 0 };
        const trapScore = calculateTrapScore(whaleData.whaleRatio || 0, liquidationsData, null);

        return {
          ...baseResult,
          whaleFlows: whaleData,
          whaleRatio: whaleData.whaleRatio,
          liquidations: liquidationsData,
          trapScore,
        };
      }

      case 'KO': {
        const [upbitInflow, binanceInflow] = await Promise.all([
          getUpbitInflow(),
          getBinanceInflow(),
        ]);
        const upbitPrice = options.upbitPrice ?? 0;
        const usdPrice = options.usdPrice ?? 0;
        const usdKrwRate = options.usdKrwRate ?? 1300;
        const kimchiPremium = calculateKimchiPremium(upbitPrice, usdPrice, usdKrwRate);
        const isTrap = kimchiPremium > 0.05;

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
        const nupl = baseResult.nupl ?? null;
        const sopr30d = baseResult.sopr30d ?? 1.0;
        const riskReward = calculateRiskReward(nupl, sopr30d);

        return {
          ...baseResult,
          longTerm: {
            nupl: baseResult.nupl,
            sopr: baseResult.sopr,
            sopr30d: baseResult.sopr30d,
          },
          riskReward,
        };
      }

      case 'AR':
      case 'ES':
      case 'PT-BR':
      default:
        return baseResult;
    }
  } catch (error) {
    console.error(`[deepMetrics] Error fetching deep metrics for ${market}:`, error);
    return {
      exchangeInflow: 0,
      exchangeOutflow: 0,
      netflow: 0,
      minerMPI: 0,
      mpi: 0,
      sopr: null,
      sopr30d: null,
      nupl: null,
      funding: null,
      openInterest: null,
      minerFlows: null,
      liquidity: null,
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
  getLTHNUPL,
  getSOPR,
  getSOPR30d,
  getFundingRate,
  getOpenInterest,
  getMinerFlows,
  getLiquidity,
  getStablecoinMetrics,
  getETFFlows,
  getExchangeFlowsDetailed,
  fetchCQProCommonFields,
  calculateTrapScore,
  calculateRiskReward,
};

