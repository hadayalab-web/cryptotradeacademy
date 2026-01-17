#!/usr/bin/env node
/**
 * Multi-language high-risk and emergency delivery test
 * - Regular (high risk)
 * - Minimal (high risk)
 * - Emergency (trap alert)
 */

const path = require('path');
const dotenv = require('dotenv');

const envPath = path.join(__dirname, '..', '.env');
dotenv.config({ path: envPath });

const { sendMessageToChannel, sendMessageToAsset } = require('../services/telegram/bot');

const LANGUAGES = [
  { code: 'EN', lang: 'en', name: 'English', series: 'BTC' },
  { code: 'JA', lang: 'ja', name: 'Japanese', series: 'BTC' },
  { code: 'KO', lang: 'ko', name: 'Korean', series: 'BTC' },
  { code: 'ES', lang: 'es', name: 'Spanish', series: 'BTC' },
  { code: 'PT_BR', lang: 'pt-br', name: 'Portuguese (Brazil)', series: 'BTC' },
  { code: 'AR', lang: 'ar', name: 'Arabic', series: 'BTC' },
];

const NOW = new Date();

const HIGH_RISK_DATA = {
  now: NOW,
  inflow: 9850,
  mpi: 3.25,
  sentimentLabel: 'FEAR',
  priceUsd: 38250,
  change24h: -6.85,
  score: -45,
  tradeSignal: {
    signal: 'STANDBY',
    tp: null,
    sl: null,
    rr: null,
  },
  trap: {
    isTrap: true,
    confidence: 'HIGH',
    label: 'Whale Trap',
    note: 'Sudden inflow spike with distribution risk',
    hint: 'Avoid chasing pumps in this zone',
  },
  trapScore: 78,
  whaleFlows: {
    whaleRatio: 0.88,
    isHighPressure: true,
    netFlow: 5200,
  },
  liquidations: {
    longLiquidations: 78000000,
    shortLiquidations: 24000000,
    totalLiquidations: 102000000,
  },
  trapDetection: {
    trapDetected: true,
    trapScore: 78,
    trapSeverity: 'HIGH',
    trapType: 'WHALE_TRAP',
    details: {
      multipleDivergences: 3,
      anomalyDetected: true,
      accelerationDetected: true,
      onchainSocialDivergence: 60,
      priceOnchainDivergence: true,
      priceSocialDivergence: true,
    },
  },
  trapAlert: {
    alert: true,
    severity: 'HIGH',
    recommendation: 'AVOID_LONG',
    type: 'AVOID_LONG',
    confidence: 0.82,
  },
  psychologicalSupport: {
    psychologicalState: 'FOMO',
    psychologicalRisk: 'HIGH',
    psychologicalAdvice: 'Slow down. High risk zone. Defense first.',
  },
  gptReporterAnalysis:
    'High-risk zone detected. On-chain inflow spike, elevated MPI, and fear sentiment suggest a trap-prone environment. Avoid impulse entries and wait for clearer signals.',
  grokXAnalysisText:
    'High-risk sentiment signals are elevated. Avoid FOMO and protect capital.',
  grokXAnalysisSentiment: 'FEAR',
  grokXAnalysisRisk: 'HIGH',
  showContent: {
    narrativeArc: {
      open:
        'High-risk conditions detected. Market structure shows trap patterns and elevated distribution risk.',
    },
    dataPresentation: {
      problemVisualization:
        'Netflow spikes and miner distribution indicate a dangerous trap zone.',
    },
    evidence:
      'Trap Score: 78/100 indicates high trap risk. Multiple divergences and inflow anomalies suggest a defensive posture.',
    analysis: {
      trapDefenseEngine: {
        process:
          'The Trap Defense Engine detects strong divergences and abnormal inflow patterns. This is a high-risk zone.',
        promise:
          'By avoiding impulse entries and waiting for confirmation, you protect your capital.',
      },
    },
    callToAction: {
      avoidFailure:
        'Avoid leverage and chasing pumps. The data indicates a trap-prone environment.',
      successEnding:
        'Defense first. Wait for clear confirmation before any entry.',
    },
  },
  aiAnalysis:
    'High-risk trap zone. Avoid new positions and prioritize defense.',
};

const EMERGENCY_DATA = {
  inflow: HIGH_RISK_DATA.inflow,
  mpi: HIGH_RISK_DATA.mpi,
  priceUsd: HIGH_RISK_DATA.priceUsd,
  trap: {
    label: 'Whale Trap',
    confidence: 'HIGH',
    note: 'Rapid inflow and distribution risk detected',
    hint: 'Avoid long exposure until risk clears',
  },
  aiAnalysis: 'Emergency trap alert. Avoid new positions and protect capital.',
};

function loadTemplates(lang) {
  const templates = {
    regular: null,
    minimal: null,
    emergency: null,
  };

  try {
    const regularPath = path.join(
      __dirname,
      '..',
      'services',
      'telegram',
      'messages',
      'user',
      lang,
      `regular.${lang}.js`,
    );
    templates.regular = require(regularPath).formatRegularBriefing;
  } catch (error) {
    console.error(`Failed to load regular template for ${lang}: ${error.message}`);
  }

  try {
    const minimalHQPath = path.join(
      __dirname,
      '..',
      'services',
      'telegram',
      'messages',
      'user',
      lang,
      `minimal-high-quality.${lang}.js`,
    );
    templates.minimal = require(minimalHQPath).formatMinimalHighQualityBriefing;
  } catch (error) {
    try {
      const minimalPath = path.join(
        __dirname,
        '..',
        'services',
        'telegram',
        'messages',
        'user',
        lang,
        `minimal.${lang}.js`,
      );
      templates.minimal = require(minimalPath).formatMinimalBriefing;
    } catch (error2) {
      console.error(`Failed to load minimal template for ${lang}: ${error2.message}`);
    }
  }

  try {
    const emergencyPath = path.join(
      __dirname,
      '..',
      'services',
      'telegram',
      'messages',
      'user',
      lang,
      `emergency.${lang}.js`,
    );
    templates.emergency = require(emergencyPath).formatTrapAlert;
  } catch (error) {
    console.error(`Failed to load emergency template for ${lang}: ${error.message}`);
  }

  return templates;
}

function buildMinimalMessage(template, lang) {
  const trapData = {
    trapAlert: HIGH_RISK_DATA.trapAlert,
    exchangeNetflow: HIGH_RISK_DATA.inflow,
    whaleRatio: HIGH_RISK_DATA.whaleFlows?.whaleRatio || null,
  };

  const marketData = {
    mpi: HIGH_RISK_DATA.mpi,
    priceUsd: HIGH_RISK_DATA.priceUsd,
    change24h: HIGH_RISK_DATA.change24h,
  };

  const sentimentData = {
    sentiment: HIGH_RISK_DATA.grokXAnalysisSentiment,
    risk: HIGH_RISK_DATA.grokXAnalysisRisk,
  };

  return template({
    now: HIGH_RISK_DATA.now,
    trapScore: HIGH_RISK_DATA.trapScore,
    priceUsd: HIGH_RISK_DATA.priceUsd,
    change24h: HIGH_RISK_DATA.change24h,
    trapData,
    marketData,
    sentimentData,
    lang,
  });
}

function buildRegularMessage(template, lang) {
  return template({
    now: HIGH_RISK_DATA.now,
    inflow: HIGH_RISK_DATA.inflow,
    mpi: HIGH_RISK_DATA.mpi,
    sentimentLabel: HIGH_RISK_DATA.sentimentLabel,
    priceUsd: HIGH_RISK_DATA.priceUsd,
    change24h: HIGH_RISK_DATA.change24h,
    score: HIGH_RISK_DATA.score,
    tradeSignal: HIGH_RISK_DATA.tradeSignal,
    trap: HIGH_RISK_DATA.trap,
    aiAnalysis: HIGH_RISK_DATA.aiAnalysis,
    trapScore: HIGH_RISK_DATA.trapScore,
    whaleFlows: HIGH_RISK_DATA.whaleFlows,
    liquidations: HIGH_RISK_DATA.liquidations,
    trapDetection: HIGH_RISK_DATA.trapDetection,
    trapAlert: HIGH_RISK_DATA.trapAlert,
    psychologicalSupport: HIGH_RISK_DATA.psychologicalSupport,
    gptReporterAnalysis: HIGH_RISK_DATA.gptReporterAnalysis,
    grokXAnalysis: HIGH_RISK_DATA.grokXAnalysisText,
    showContent: HIGH_RISK_DATA.showContent,
    lang,
  });
}

function buildEmergencyMessage(template) {
  return template({
    inflow: EMERGENCY_DATA.inflow,
    mpi: EMERGENCY_DATA.mpi,
    priceUsd: EMERGENCY_DATA.priceUsd,
    trap: EMERGENCY_DATA.trap,
    aiAnalysis: EMERGENCY_DATA.aiAnalysis,
  });
}

async function run() {
  console.log('Starting multi-language high-risk and emergency test...');
  console.log(`Timestamp: ${NOW.toISOString()}`);
  console.log('This will send messages to configured Telegram channels.');

  const results = {};

  for (const langInfo of LANGUAGES) {
    const { code, lang, name, series } = langInfo;
    console.log('\n' + '-'.repeat(80));
    console.log(`Language: ${name} (${code})`);

    const templates = loadTemplates(lang);
    results[code] = { regular: null, minimal: null, emergency: null };

    if (templates.regular) {
      try {
        const message = buildRegularMessage(templates.regular, lang);
        const sendResult = await sendMessageToChannel(message, series, code.replace('_', '-'));
        const messageId = sendResult?.result?.message_id || sendResult?.message_id || 'N/A';
        results[code].regular = { success: true, messageId };
        console.log(`Regular (high risk): sent, message_id=${messageId}`);
      } catch (error) {
        results[code].regular = { success: false, error: error.message };
        console.error(`Regular (high risk): failed: ${error.message}`);
      }
    }

    if (templates.minimal) {
      try {
        const message = buildMinimalMessage(templates.minimal, lang);
        const sendResult = await sendMessageToAsset(message, 'MINIMAL', code.replace('_', '-'));
        const messageId = sendResult?.result?.message_id || sendResult?.message_id || 'N/A';
        results[code].minimal = { success: true, messageId };
        console.log(`Minimal (high risk): sent, message_id=${messageId}`);
      } catch (error) {
        results[code].minimal = { success: false, error: error.message };
        console.error(`Minimal (high risk): failed: ${error.message}`);
      }
    }

    if (templates.emergency) {
      try {
        const message = buildEmergencyMessage(templates.emergency);
        const sendResult = await sendMessageToChannel(message, series, code.replace('_', '-'));
        const messageId = sendResult?.result?.message_id || sendResult?.message_id || 'N/A';
        results[code].emergency = { success: true, messageId };
        console.log(`Emergency: sent, message_id=${messageId}`);
      } catch (error) {
        results[code].emergency = { success: false, error: error.message };
        console.error(`Emergency: failed: ${error.message}`);
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log('\n' + '='.repeat(80));
  console.log('Summary');
  console.log('='.repeat(80));

  for (const langInfo of LANGUAGES) {
    const { code, name } = langInfo;
    const res = results[code];
    console.log(`\n${name} (${code}):`);
    console.log(`  Regular: ${res.regular?.success ? 'OK' : 'FAIL'}`);
    if (res.regular?.error) console.log(`    Error: ${res.regular.error}`);
    console.log(`  Minimal: ${res.minimal?.success ? 'OK' : 'FAIL'}`);
    if (res.minimal?.error) console.log(`    Error: ${res.minimal.error}`);
    console.log(`  Emergency: ${res.emergency?.success ? 'OK' : 'FAIL'}`);
    if (res.emergency?.error) console.log(`    Error: ${res.emergency.error}`);
  }

  console.log('\nDone.');
}

if (require.main === module) {
  run().catch((error) => {
    console.error('Unexpected error:', error.message);
    process.exit(1);
  });
}

module.exports = {
  HIGH_RISK_DATA,
  EMERGENCY_DATA,
  loadTemplates,
  buildMinimalMessage,
  buildRegularMessage,
  buildEmergencyMessage,
};
