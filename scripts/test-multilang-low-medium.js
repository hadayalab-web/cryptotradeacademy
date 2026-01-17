#!/usr/bin/env node
/**
 * Multi-language low/medium risk delivery test
 * - Regular (low + medium)
 * - Minimal (low + medium)
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

const LOW_RISK_DATA = {
  now: NOW,
  inflow: -820,
  mpi: 0.35,
  sentimentLabel: 'NEUTRAL',
  priceUsd: 43250,
  change24h: 1.25,
  score: 12,
  tradeSignal: {
    signal: 'STANDBY',
    tp: null,
    sl: null,
    rr: null,
  },
  trap: {
    isTrap: false,
    confidence: 'LOW',
    label: 'No trap detected',
  },
  trapScore: 25,
  whaleFlows: {
    whaleRatio: 0.32,
    isHighPressure: false,
    netFlow: -420,
  },
  liquidations: {
    longLiquidations: 6500000,
    shortLiquidations: 4200000,
    totalLiquidations: 10700000,
  },
  trapDetection: {
    trapDetected: false,
    trapScore: 25,
    trapSeverity: 'LOW',
    trapType: null,
  },
  trapAlert: null,
  psychologicalSupport: {
    psychologicalState: 'NEUTRAL',
    psychologicalRisk: 'LOW',
    psychologicalAdvice: 'Stay disciplined and keep monitoring the market.',
  },
  gptReporterAnalysis:
    'Low-risk conditions. On-chain metrics are stable and sentiment is neutral. Continue monitoring and avoid overtrading.',
  grokXAnalysisText:
    'Neutral sentiment with low risk. Maintain discipline and wait for clear setups.',
  grokXAnalysisSentiment: 'NEUTRAL',
  grokXAnalysisRisk: 'LOW',
  showContent: {
    narrativeArc: {
      open:
        'Market conditions are stable with low trap risk. Patience remains a strategic advantage.',
    },
    dataPresentation: {
      problemVisualization:
        'On-chain metrics show stability with minimal divergence.',
    },
    evidence:
      'Trap Score: 25/100 indicates low trap risk. Market conditions are stable.',
    analysis: {
      trapDefenseEngine: {
        process:
          'The Trap Defense Engine detects minimal anomalies. Maintain a defensive stance and wait for clearer signals.',
        promise:
          'By waiting for stronger confirmation, you protect your capital and avoid false signals.',
      },
    },
    callToAction: {
      avoidFailure:
        'Avoid forcing trades when conditions are neutral. Wait for confirmation.',
      successEnding:
        'Defense first. Patience protects capital in low-signal environments.',
    },
  },
  aiAnalysis:
    'Low-risk environment. Stay disciplined and wait for clearer opportunities.',
};

const MEDIUM_RISK_DATA = {
  now: NOW,
  inflow: 2450,
  mpi: 1.45,
  sentimentLabel: 'CAUTION',
  priceUsd: 40150,
  change24h: -2.85,
  score: -12,
  tradeSignal: {
    signal: 'STANDBY',
    tp: null,
    sl: null,
    rr: null,
  },
  trap: {
    isTrap: true,
    confidence: 'MEDIUM',
    label: 'Distribution Trap',
    note: 'Moderate inflow and divergence signals detected',
    hint: 'Avoid chasing volatility spikes',
  },
  trapScore: 55,
  whaleFlows: {
    whaleRatio: 0.62,
    isHighPressure: false,
    netFlow: 1250,
  },
  liquidations: {
    longLiquidations: 22000000,
    shortLiquidations: 13500000,
    totalLiquidations: 35500000,
  },
  trapDetection: {
    trapDetected: true,
    trapScore: 55,
    trapSeverity: 'MEDIUM',
    trapType: 'DISTRIBUTION_TRAP',
    details: {
      multipleDivergences: 2,
      anomalyDetected: true,
      accelerationDetected: false,
      onchainSocialDivergence: 45,
      priceOnchainDivergence: true,
      priceSocialDivergence: false,
    },
  },
  trapAlert: {
    alert: true,
    severity: 'MEDIUM',
    recommendation: 'AVOID_SHORT',
    type: 'AVOID_SHORT',
    confidence: 0.66,
  },
  psychologicalSupport: {
    psychologicalState: 'CONFUSION',
    psychologicalRisk: 'MEDIUM',
    psychologicalAdvice: 'Signals are mixed. Slow down and wait for clarity.',
  },
  gptReporterAnalysis:
    'Moderate-risk zone. Mixed signals and inflow suggest caution. Avoid aggressive entries and wait for confirmation.',
  grokXAnalysisText:
    'Cautionary sentiment. Avoid overreaction and wait for clearer signals.',
  grokXAnalysisSentiment: 'CAUTION',
  grokXAnalysisRisk: 'MEDIUM',
  showContent: {
    narrativeArc: {
      open:
        'Moderate trap indicators detected. The market is unstable and requires caution.',
    },
    dataPresentation: {
      problemVisualization:
        'Inflow increases and divergence signals suggest a potential trap zone.',
    },
    evidence:
      'Trap Score: 55/100 indicates moderate trap risk. Market signals are mixed.',
    analysis: {
      trapDefenseEngine: {
        process:
          'The Trap Defense Engine detects moderate divergences and anomaly signals. Maintain defense and wait for clearer trends.',
        promise:
          'By avoiding premature entries, you reduce trap exposure.',
      },
    },
    callToAction: {
      avoidFailure:
        'Avoid impulsive entries. The data favors patience until signals align.',
      successEnding:
        'Defense first. Wait for clear confirmation before engaging.',
    },
  },
  aiAnalysis:
    'Moderate trap risk. Stay defensive and avoid overexposure.',
};

const SCENARIOS = [
  { key: 'LOW', name: 'Low Risk', data: LOW_RISK_DATA },
  { key: 'MEDIUM', name: 'Medium Risk', data: MEDIUM_RISK_DATA },
];

function loadTemplates(lang) {
  const templates = {
    regular: null,
    minimal: null,
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

  return templates;
}

function buildMinimalMessage(template, scenario, lang) {
  const trapData = {
    trapAlert: scenario.trapAlert,
    exchangeNetflow: scenario.inflow,
    whaleRatio: scenario.whaleFlows?.whaleRatio || null,
  };

  const marketData = {
    mpi: scenario.mpi,
    priceUsd: scenario.priceUsd,
    change24h: scenario.change24h,
  };

  const sentimentData = {
    sentiment: scenario.grokXAnalysisSentiment,
    risk: scenario.grokXAnalysisRisk,
  };

  return template({
    now: scenario.now,
    trapScore: scenario.trapScore,
    priceUsd: scenario.priceUsd,
    change24h: scenario.change24h,
    trapData,
    marketData,
    sentimentData,
    lang,
  });
}

function buildRegularMessage(template, scenario, lang) {
  return template({
    now: scenario.now,
    inflow: scenario.inflow,
    mpi: scenario.mpi,
    sentimentLabel: scenario.sentimentLabel,
    priceUsd: scenario.priceUsd,
    change24h: scenario.change24h,
    score: scenario.score,
    tradeSignal: scenario.tradeSignal,
    trap: scenario.trap,
    aiAnalysis: scenario.aiAnalysis,
    trapScore: scenario.trapScore,
    whaleFlows: scenario.whaleFlows,
    liquidations: scenario.liquidations,
    trapDetection: scenario.trapDetection,
    trapAlert: scenario.trapAlert,
    psychologicalSupport: scenario.psychologicalSupport,
    gptReporterAnalysis: scenario.gptReporterAnalysis,
    grokXAnalysis: scenario.grokXAnalysisText,
    showContent: scenario.showContent,
    lang,
  });
}

async function run() {
  console.log('Starting multi-language low/medium risk test...');
  console.log(`Timestamp: ${NOW.toISOString()}`);
  console.log('This will send messages to configured Telegram channels.');

  const results = {};

  for (const langInfo of LANGUAGES) {
    const { code, lang, name, series } = langInfo;
    console.log('\n' + '-'.repeat(80));
    console.log(`Language: ${name} (${code})`);

    const templates = loadTemplates(lang);
    results[code] = results[code] || {};

    for (const scenario of SCENARIOS) {
      const scenarioKey = scenario.key;
      results[code][scenarioKey] = { regular: null, minimal: null };

      if (templates.regular) {
        try {
          const message = buildRegularMessage(templates.regular, scenario.data, lang);
          const sendResult = await sendMessageToChannel(message, series, code.replace('_', '-'));
          const messageId = sendResult?.result?.message_id || sendResult?.message_id || 'N/A';
          results[code][scenarioKey].regular = { success: true, messageId };
          console.log(`${scenario.name} Regular: sent, message_id=${messageId}`);
        } catch (error) {
          results[code][scenarioKey].regular = { success: false, error: error.message };
          console.error(`${scenario.name} Regular: failed: ${error.message}`);
        }
      }

      if (templates.minimal) {
        try {
          const message = buildMinimalMessage(templates.minimal, scenario.data, lang);
          const sendResult = await sendMessageToAsset(message, 'MINIMAL', code.replace('_', '-'));
          const messageId = sendResult?.result?.message_id || sendResult?.message_id || 'N/A';
          results[code][scenarioKey].minimal = { success: true, messageId };
          console.log(`${scenario.name} Minimal: sent, message_id=${messageId}`);
        } catch (error) {
          results[code][scenarioKey].minimal = { success: false, error: error.message };
          console.error(`${scenario.name} Minimal: failed: ${error.message}`);
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 800));
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log('\n' + '='.repeat(80));
  console.log('Summary');
  console.log('='.repeat(80));

  for (const langInfo of LANGUAGES) {
    const { code, name } = langInfo;
    console.log(`\n${name} (${code}):`);
    const perLang = results[code] || {};
    for (const scenario of SCENARIOS) {
      const res = perLang[scenario.key] || {};
      console.log(`  ${scenario.name} Regular: ${res.regular?.success ? 'OK' : 'FAIL'}`);
      if (res.regular?.error) console.log(`    Error: ${res.regular.error}`);
      console.log(`  ${scenario.name} Minimal: ${res.minimal?.success ? 'OK' : 'FAIL'}`);
      if (res.minimal?.error) console.log(`    Error: ${res.minimal.error}`);
    }
  }

  console.log('\nDone.');
}

run().catch((error) => {
  console.error('Unexpected error:', error.message);
  process.exit(1);
});
