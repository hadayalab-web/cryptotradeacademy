// Função de formatação de texto para distribuição Telegram versão mínima gratuita
// services/telegram/messages/user/pt-br/minimal.pt-br.js
// Apenas exibe Trap Score (sem análise detalhada)

/**
 * Obter descrição do Trap Score
 */
function getTrapScoreDescription(trapScore) {
  if (trapScore == null || trapScore === undefined) {
    return 'Trap Score está sendo calculado. Por favor, verifique mais tarde.';
  }
  
  const score = Number(trapScore);
  if (isNaN(score)) {
    return 'Trap Score está sendo calculado. Por favor, verifique mais tarde.';
  }

  if (score >= 70) {
    return '⚠️ ALTO RISCO DE ARMADILHA: Sinais fortes indicam possíveis armadilhas do mercado. Exercite extrema cautela.';
  } else if (score >= 50) {
    return '⚡ RISCO MODERADO DE ARMADILHA: Alguns indicadores de armadilha detectados. Mantenha-se alerta.';
  } else if (score >= 30) {
    return '✅ BAIXO RISCO DE ARMADILHA: Indicadores de armadilha mínimos. As condições do mercado parecem relativamente seguras.';
  } else {
    return '✅ RISCO MUITO BAIXO DE ARMADILHA: Muito poucos indicadores de armadilha detectados. As condições do mercado parecem seguras.';
  }
}

/**
 * Gerar mensagem Telegram para versão mínima gratuita
 * Apenas exibe Trap Score (sem análise detalhada)
 * 
 * @param {Object} options - Opções de geração de mensagem
 * @param {Date} options.now - Hora atual
 * @param {number|null} options.trapScore - Trap Score (0-100)
 * @param {number|null} options.priceUsd - Preço do BTC (USD)
 * @param {number|null} options.change24h - Taxa de mudança de 24h (%)
 * @param {string} options.lang - Código de idioma (padrão: 'pt-br')
 * @returns {string} String de mensagem Telegram
 */
function formatMinimalBriefing({
  now = new Date(),
  trapScore = null,
  priceUsd = null,
  change24h = null,
  lang = 'pt-br',
} = {}) {
  const ts = now.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
  
  const scoreDisplay = trapScore != null ? Math.round(Number(trapScore)) : 'N/A';
  const scoreDescription = getTrapScoreDescription(trapScore);
  
  const priceLine = priceUsd != null && change24h != null
    ? `💰 Preço do BTC: $${priceUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })} (${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}% / 24h)`
    : '💰 Preço do BTC: Obtendo...';

  return `🌤️ Trap Defense BTC - Relatório Mínimo Gratuito
📅 ${ts}

🎯 Trap Score de Hoje
━━━━━━━━━━━━━━━━━━━━
${scoreDisplay}/100

${scoreDescription}

${priceLine}

━━━━━━━━━━━━━━━━━━━━
🔒 Quer Saber Por Quê?

A análise detalhada por trás deste Trap Score inclui:
• Por que AVOID_LONG ou AVOID_SHORT?
• Análise detalhada de dados on-chain
• Orientação de treinamento mental
• Suporte psicológico do Dr. Grok

🚀 Atualize para Acesso Completo
A partir de $69/mês • Cancele a qualquer momento

━━━━━━━━━━━━━━━━━━━━
Este é um relatório mínimo gratuito. Para análise detalhada e alertas de armadilhas, atualize para Trap Defense BTC.

Apenas para fins educacionais. Não é aconselhamento financeiro.`.trim();
}

module.exports = { formatMinimalBriefing };
