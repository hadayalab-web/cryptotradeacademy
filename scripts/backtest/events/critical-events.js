// scripts/backtest/events/critical-events.js
// Critical market events for backtesting algorithm performance

/**
 * Critical market events with metadata for validation
 * Each event represents a significant market movement or event
 */
export const CRITICAL_EVENTS = [
  {
    id: 'us_election_rally_2024',
    name: 'US Election Rally',
    date: '2024-11-05T00:00:00Z',
    period: {
      start: '2024-11-05T00:00:00Z',
      end: '2024-11-15T23:59:59Z',
    },
    description: 'Bitcoin rally following US presidential election results',
    marketImpact: 'high',
    type: 'rally',
    expectedBehavior: {
      alerts: ['WATCH', 'REGULAR'],
      signals: ['BUY'],
      trapExpected: false,
    },
    metadata: {
      priceRangeUsd: { low: 67000, high: 93000 },
      volatility: 'high',
      volume: 'very_high',
    },
  },
  {
    id: 'frb_rate_shock_2024',
    name: 'FRB Rate Shock',
    date: '2024-08-01T00:00:00Z',
    period: {
      start: '2024-08-01T00:00:00Z',
      end: '2024-08-15T23:59:59Z',
    },
    description: 'Market volatility from Federal Reserve rate decision',
    marketImpact: 'high',
    type: 'volatility',
    expectedBehavior: {
      alerts: ['EMERGENCY', 'WATCH'],
      signals: ['BUY', 'SELL'],
      trapExpected: true,
    },
    metadata: {
      priceRangeUsd: { low: 49000, high: 62000 },
      volatility: 'very_high',
      volume: 'high',
    },
  },
  {
    id: 'summer_doldrums_2024',
    name: 'Summer Doldrums Range',
    date: '2024-06-15T00:00:00Z',
    period: {
      start: '2024-06-15T00:00:00Z',
      end: '2024-07-31T23:59:59Z',
    },
    description: 'Low volatility consolidation period during summer',
    marketImpact: 'low',
    type: 'consolidation',
    expectedBehavior: {
      alerts: ['STANDBY_BREAK', 'REGULAR'],
      signals: [],
      trapExpected: false,
    },
    metadata: {
      priceRangeUsd: { low: 53000, high: 70000 },
      volatility: 'low',
      volume: 'low',
    },
  },
  {
    id: 'btc_etf_approval_2024',
    name: 'Bitcoin ETF Approval',
    date: '2024-01-10T00:00:00Z',
    period: {
      start: '2024-01-10T00:00:00Z',
      end: '2024-01-25T23:59:59Z',
    },
    description: 'SEC approval of Bitcoin spot ETFs',
    marketImpact: 'high',
    type: 'rally',
    expectedBehavior: {
      alerts: ['WATCH', 'REGULAR'],
      signals: ['BUY'],
      trapExpected: false,
    },
    metadata: {
      priceRangeUsd: { low: 42000, high: 49000 },
      volatility: 'high',
      volume: 'very_high',
    },
  },
  {
    id: 'halving_anticipation_2024',
    name: 'Halving Anticipation',
    date: '2024-03-15T00:00:00Z',
    period: {
      start: '2024-03-15T00:00:00Z',
      end: '2024-04-20T23:59:59Z',
    },
    description: 'Bitcoin rally ahead of April 2024 halving',
    marketImpact: 'high',
    type: 'rally',
    expectedBehavior: {
      alerts: ['WATCH', 'REGULAR'],
      signals: ['BUY'],
      trapExpected: false,
    },
    metadata: {
      priceRangeUsd: { low: 60000, high: 73000 },
      volatility: 'medium',
      volume: 'high',
    },
  },
  {
    id: 'svb_contagion_panic_2023',
    name: 'SVB Contagion Panic',
    date: '2023-03-10T00:00:00Z',
    period: {
      start: '2023-03-10T00:00:00Z',
      end: '2023-03-20T23:59:59Z',
    },
    description: 'Silicon Valley Bank collapse and banking contagion fears',
    marketImpact: 'high',
    type: 'crash',
    expectedBehavior: {
      alerts: ['EMERGENCY', 'WATCH'],
      signals: ['SELL', 'BUY'],
      trapExpected: true,
    },
    metadata: {
      priceRangeUsd: { low: 19500, high: 28500 },
      volatility: 'very_high',
      volume: 'very_high',
    },
  },
  {
    id: 'inst_accumulation_2024',
    name: 'Institutional Accumulation',
    date: '2024-09-01T00:00:00Z',
    period: {
      start: '2024-09-01T00:00:00Z',
      end: '2024-10-31T23:59:59Z',
    },
    description: 'Steady institutional buying period post-summer',
    marketImpact: 'medium',
    type: 'accumulation',
    expectedBehavior: {
      alerts: ['WATCH', 'REGULAR'],
      signals: ['BUY'],
      trapExpected: false,
    },
    metadata: {
      priceRangeUsd: { low: 52000, high: 69000 },
      volatility: 'medium',
      volume: 'medium',
    },
  },
  {
    id: 'fomc_volatility_2024',
    name: 'FOMC Decision Volatility',
    date: '2024-12-18T00:00:00Z',
    period: {
      start: '2024-12-18T00:00:00Z',
      end: '2024-12-18T23:59:59Z',
    },
    description: 'Market volatility around FOMC rate decision',
    marketImpact: 'high',
    type: 'volatility',
    expectedBehavior: {
      alerts: ['WATCH', 'EMERGENCY'],
      signals: ['BUY', 'SELL'],
      trapExpected: true,
    },
    metadata: {
      priceRangeUsd: { low: 97000, high: 108000 },
      volatility: 'very_high',
      volume: 'very_high',
    },
  },
  {
    id: 'mtgox_payout_2025',
    name: 'Mt. Gox Payout Selling Pressure',
    date: '2025-01-10T00:00:00Z',
    period: {
      start: '2025-01-10T00:00:00Z',
      end: '2025-01-25T23:59:59Z',
    },
    description: 'Potential selling pressure from Mt. Gox creditor payouts',
    marketImpact: 'medium',
    type: 'selling_pressure',
    expectedBehavior: {
      alerts: ['WATCH', 'REGULAR'],
      signals: ['SELL'],
      trapExpected: false,
    },
    metadata: {
      priceRangeUsd: { low: 90000, high: 110000 },
      volatility: 'medium',
      volume: 'high',
    },
  },
  {
    id: 'trump_crypto_order_2025',
    name: 'Trump Crypto Order FOMO',
    date: '2025-01-18T00:00:00Z',
    period: {
      start: '2025-01-18T00:00:00Z',
      end: '2025-01-25T23:59:59Z',
    },
    description: 'Market reaction to potential pro-crypto executive orders',
    marketImpact: 'high',
    type: 'rally',
    expectedBehavior: {
      alerts: ['WATCH', 'REGULAR'],
      signals: ['BUY'],
      trapExpected: false,
    },
    metadata: {
      priceRangeUsd: { low: 95000, high: 110000 },
      volatility: 'high',
      volume: 'very_high',
    },
  },
];

/**
 * Get event by ID
 * @param {string} eventId - Event identifier
 * @returns {Object|null} Event object or null if not found
 */
export function getEventById(eventId) {
  return CRITICAL_EVENTS.find((e) => e.id === eventId) || null;
}

/**
 * Get events by type
 * @param {string} type - Event type (rally, crash, volatility, etc.)
 * @returns {Array} Array of matching events
 */
export function getEventsByType(type) {
  return CRITICAL_EVENTS.filter((e) => e.type === type);
}

/**
 * Get events by market impact
 * @param {string} impact - Market impact level (high, medium, low)
 * @returns {Array} Array of matching events
 */
export function getEventsByImpact(impact) {
  return CRITICAL_EVENTS.filter((e) => e.marketImpact === impact);
}

/**
 * Get events in date range
 * @param {string} startDate - Start date (ISO string)
 * @param {string} endDate - End date (ISO string)
 * @returns {Array} Array of events in range
 */
export function getEventsInRange(startDate, endDate) {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  
  return CRITICAL_EVENTS.filter((e) => {
    const eventStart = new Date(e.period.start).getTime();
    const eventEnd = new Date(e.period.end).getTime();
    return (eventStart >= start && eventStart <= end) ||
           (eventEnd >= start && eventEnd <= end) ||
           (eventStart <= start && eventEnd >= end);
  });
}
