#!/usr/bin/env node
/**
 * ポルトガル語版メッセージのフォーマット確認
 */

const { formatMinimalHighQualityBriefing } = require('../services/telegram/messages/user/pt-br/minimal-high-quality.pt-br.js');
const { formatRegularBriefing } = require('../services/telegram/messages/user/pt-br/regular.pt-br.js');

// ユーザー提供のサンプルデータ
const testData = {
  now: new Date('2026-01-26T06:00:22Z'),
  trapScore: 25,
  priceUsd: 87760,
  change24h: -0.75,
  inflow: 987,
  mpi: -1.32,
  sentimentLabel: 'Extreme Fear',
  score: -6,
};

console.log('='.repeat(80));
console.log('📱 Versão Gratuita (Minimal Version) Mensagem');
console.log('='.repeat(80));
console.log('');

const minimalMessage = formatMinimalHighQualityBriefing({
  now: testData.now,
  trapScore: testData.trapScore,
  priceUsd: testData.priceUsd,
  change24h: testData.change24h,
  trapData: {
    exchangeNetflow: testData.inflow,
  },
  marketData: {
    mpi: testData.mpi,
  },
  sentimentData: {
    sentiment: testData.sentimentLabel,
  },
  lang: 'pt-br',
});

console.log(minimalMessage);
console.log('');
console.log('='.repeat(80));
console.log('💎 Versão Paga (Regular Briefing) Mensagem');
console.log('='.repeat(80));
console.log('');

const regularMessage = formatRegularBriefing({
  now: testData.now,
  inflow: testData.inflow,
  mpi: testData.mpi,
  sentimentLabel: testData.sentimentLabel,
  priceUsd: testData.priceUsd,
  change24h: testData.change24h,
  score: testData.score,
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
  trapDetection: {
    trapDetected: false,
    trapScore: testData.trapScore,
    trapSeverity: 'LOW',
    trapType: null,
  },
  trapAlert: null,
  psychologicalSupport: {
    psychologicalState: 'NEUTRAL',
    psychologicalRisk: 'LOW',
    psychologicalAdvice: '✅ Estado neutro - Nenhum bloqueio mental detectado: O sentimento do mercado está equilibrado. Nenhuma emoção extrema detectada. As condições estão estáveis.',
  },
  gptReporterAnalysis: null,
  grokXAnalysis: null,
  aiAnalysis: null,
  lang: 'pt-br',
});

console.log(regularMessage);
console.log('');
console.log('='.repeat(80));
console.log('✅ Geração de mensagens completa');
console.log('='.repeat(80));
