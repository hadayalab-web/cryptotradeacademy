// Função de formatação de texto para distribuição Telegram versão mínima gratuita de alta qualidade
// services/telegram/messages/user/pt-br/minimal-high-quality.pt-br.js
// Trap Score + Análise simplificada + Comentário simplificado de Dr. Grok + Mental Note

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
 * Gerar What to Avoid（Ações a evitar）
 */
function generateWhatToAvoid(trapScore, trapData = null) {
  if (!trapScore || trapScore < 50) {
    return null;
  }

  const avoidItems = [];
  
  // Extrair ações a evitar de Trap Data
  if (trapData) {
    if (trapData.trapAlert) {
      if (trapData.trapAlert.type === 'AVOID_LONG') {
        avoidItems.push('Evitar posições LONG - Alto risco de armadilha detectado');
      } else if (trapData.trapAlert.type === 'AVOID_SHORT') {
        avoidItems.push('Evitar posições SHORT - Alto risco de armadilha detectado');
      }
    }
  }

  // Ações a evitar por padrão
  if (avoidItems.length === 0) {
    if (trapScore >= 70) {
      avoidItems.push('Evitar abrir novas posições - Sinais fortes de armadilha detectados');
      avoidItems.push('Aguardar sinais de mercado mais claros antes de operar');
    } else if (trapScore >= 50) {
      avoidItems.push('Exercer cautela - Alguns indicadores de armadilha presentes');
      avoidItems.push('Considerar aguardar melhores oportunidades de entrada');
    }
  }

  return avoidItems;
}

/**
 * Gerar Evidence（Evidência）
 */
function generateEvidence(trapData = null, marketData = null) {
  const evidenceItems = [];

  // Extrair evidência de Trap Data
  if (trapData) {
    if (trapData.exchangeNetflow !== undefined && trapData.exchangeNetflow !== null) {
      const netflow = trapData.exchangeNetflow; // Em unidades BTC
      const sign = netflow >= 0 ? '+' : '';
      const absValue = Math.abs(netflow);
      const flowDir = netflow >= 0 ? 'entrada' : 'saída';
      // Mostrar em unidades BTC (unificado com a versão paga)
      evidenceItems.push(`Fluxo líquido nas exchanges: ${sign}${absValue.toFixed(0)} BTC (${flowDir})`);
    }

    if (trapData.whaleRatio !== undefined && trapData.whaleRatio !== null) {
      const whaleRatio = trapData.whaleRatio * 100;
      evidenceItems.push(`Proporção de baleias: ${whaleRatio.toFixed(0)}% (${whaleRatio >= 80 ? 'alta pressão de venda' : 'normal'})`);
    }
  }

  // Extrair evidência de Market Data
  if (marketData) {
    if (marketData.mpi !== undefined) {
      const mpi = marketData.mpi;
      if (mpi > 2.0) {
        evidenceItems.push(`Índice de Posição dos Mineradores: ${mpi.toFixed(2)} (mineradores vendendo)`);
      }
    }
  }

  // Evidência por padrão (se não houver dados)
  if (evidenceItems.length === 0) {
    evidenceItems.push('A análise de dados on-chain indica risco de armadilha');
  }

  return evidenceItems.slice(0, 2); // Máximo 2
}

/**
 * Gerar comentário simplificado de Dr. Grok
 */
function generateDrGrokComment(trapScore, sentimentData = null) {
  const comments = [];

  if (!trapScore || trapScore < 30) {
    // Mesmo quando o Trap Score é baixo, fornecer uma mensagem padrão
    comments.push('"A paciência é força estratégica. Continue aguardando oportunidades claras."');
  } else if (trapScore >= 70) {
    comments.push('"O FOMO está alto agora. Não deixe que a ganância anule sua estratégia de defesa. Aguarde."');
  } else if (trapScore >= 50) {
    comments.push('"Mantenha a disciplina. O mercado está testando sua paciência. Defesa primeiro."');
  } else {
    comments.push('"Boa disciplina. Continue aguardando oportunidades claras."');
  }

  // Comentário adicional de Sentiment Data
  if (sentimentData) {
    if (sentimentData.sentiment === 'FOMO' || sentimentData.sentiment === 'GREED') {
      comments.push('"O sentimento do mercado está emocional. É quando as armadilhas ocorrem. Mantenha a calma."');
    }
  }

  return comments[0] || null;
}

/**
 * Gerar Mental Note
 */
function generateMentalNote() {
  return '"70% do tempo, não faça nada. Defesa até que surja uma vantagem clara."';
}

/**
 * Gerar mensagem Telegram para versão mínima gratuita de alta qualidade
 * Trap Score + Análise simplificada + Comentário simplificado de Dr. Grok + Mental Note
 * 
 * @param {Object} options - Opções de geração de mensagem
 * @param {Date} options.now - Hora atual
 * @param {number|null} options.trapScore - Trap Score (0-100)
 * @param {number|null} options.priceUsd - Preço do BTC (USD)
 * @param {number|null} options.change24h - Taxa de mudança de 24h (%)
 * @param {Object} options.trapData - Trap Data (opcional)
 * @param {Object} options.marketData - Market Data (opcional)
 * @param {Object} options.sentimentData - Sentiment Data (opcional)
 * @param {string} options.lang - Código de idioma (padrão: 'pt-br')
 * @returns {string} String de mensagem Telegram
 */
function formatMinimalHighQualityBriefing({
  now = new Date(),
  trapScore = null,
  priceUsd = null,
  change24h = null,
  trapData = null,
  marketData = null,
  sentimentData = null,
  lang = 'pt-br',
} = {}) {
  const ts = now.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
  
  const scoreDisplay = trapScore != null ? Math.round(Number(trapScore)) : 'N/A';
  const scoreDescription = getTrapScoreDescription(trapScore);
  
  const priceLine = priceUsd != null && change24h != null
    ? `💰 Preço do BTC: $${priceUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })} (${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}% / 24h)`
    : '💰 Preço do BTC: Obtendo...';

  const whatToAvoid = generateWhatToAvoid(trapScore, trapData);
  const evidence = generateEvidence(trapData, marketData);
  const drGrokComment = generateDrGrokComment(trapScore, sentimentData);
  const mentalNote = generateMentalNote();

  // 【Melhoria 1: Adição de formato de programa de notícias】Adicionar seção Opening
  let message = `🌤️ Trap Defense BTC - Relatório Gratuito
🚨 BREAKING: BRIEFING DE DEFESA DE ARMADILHAS
📺 【Abertura】Briefing de Inteligência de Mercado
📅 ${ts}

━━━━━━━━━━━━━━━━━━━━
🎯 Trap Score de Hoje
━━━━━━━━━━━━━━━━━━━━
${scoreDisplay}/100
${scoreDescription}

${priceLine}`;

  // 【Melhoria 1: Adição de estrutura de história】Adicionar seção de apresentação do problema
  // Passo 1: Apresentação do problema (baseado em Trap Score)
  if (trapScore !== null && trapScore >= 30) {
    const trapScoreRounded = Math.round(trapScore);
    message += `\n\n━━━━━━━━━━━━━━━━━━━━
📖 【História do Mercado】O Problema
━━━━━━━━━━━━━━━━━━━━`;
    
    if (trapScoreRounded >= 70) {
      message += `\n🚨 O mercado está mostrando sinais fortes de armadilha. Apesar do que os gráficos de preços possam sugerir, os dados on-chain revelam riscos ocultos.`;
      message += `\n💡 O Problema: Múltiplas divergências e anomalias indicam possíveis armadilhas do mercado. Entrar agora pode expor você a um risco significativo.`;
    } else if (trapScoreRounded >= 50) {
      message += `\n⚡ O mercado está mostrando indicadores moderados de armadilha. Algumas divergências sugerem cautela.`;
      message += `\n💡 O Problema: Os sinais de armadilha estão presentes. Apressar-se para operar agora pode levar a perdas.`;
    } else {
      message += `\n✅ As condições do mercado parecem relativamente seguras, mas os padrões de armadilha podem emergir rapidamente.`;
      message += `\n💡 O Problema: Mesmo em condições de baixo risco, a paciência é força estratégica.`;
    }
  }

  // Passo 2: Seção de evidência (Evidence)
  if (evidence && evidence.length > 0) {
    message += `\n\n━━━━━━━━━━━━━━━━━━━━
📊 【Evidência】Por Que Aguardar? Razões Baseadas em Dados
PROVADO POR DADOS ON-CHAIN
━━━━━━━━━━━━━━━━━━━━`;
    evidence.forEach(item => {
      message += `\n• ${item}`;
    });
    
    // 【Melhoria 2: Integração de explicação baseada em evidência de "estratégia de espera de 70%"】Vincular Evidence e Mental Note
    if (trapScore !== null && trapScore >= 30) {
      const trapScoreRounded = Math.round(trapScore);
      message += `\n\n💡 Por Que Aguardar? (Baseado em Evidência)`;
      if (trapScoreRounded >= 70) {
        message += `\n   🚨 Trap Score ${trapScoreRounded}/100: Sinais fortes indicam possíveis armadilhas do mercado.`;
        message += `\n   🛡️ A preparação estratégica não é fraqueza—é preparação para a vitória. 70% do tempo, prepare-se para a vitória.`;
      } else if (trapScoreRounded >= 50) {
        message += `\n   ⚡ Trap Score ${trapScoreRounded}/100: Indicadores moderados de armadilha detectados.`;
        message += `\n   🛡️ Defesa primeiro. Aguarde sinais de mercado mais claros.`;
      } else {
        message += `\n   ✅ Trap Score ${trapScoreRounded}/100: Baixo risco de armadilha, mas mantenha-se alerta.`;
        message += `\n   🛡️ Mesmo em condições de baixo risco, a preparação estratégica é preparação para a vitória.`;
      }
    }
  }

  // Passo 3: Solução (What to Avoid)
  if (whatToAvoid && whatToAvoid.length > 0) {
    message += `\n\n━━━━━━━━━━━━━━━━━━━━
🚫 【Solução】O Que Evitar
━━━━━━━━━━━━━━━━━━━━`;
    whatToAvoid.forEach(item => {
      message += `\n• ${item}`;
    });
  }

  // Passo 4: Final bem-sucedido (Comentário de Dr. Grok + Mental Note)
  // 【Melhoria 1: Adição de formato de programa de notícias】Seção de comentarista
  if (drGrokComment) {
    message += `\n\n━━━━━━━━━━━━━━━━━━━━
💊 【Comentarista】Insight Rápido de Dr. Grok
━━━━━━━━━━━━━━━━━━━━
${drGrokComment}`;
  }

  // 【Melhoria 1: Adição de estrutura de história】Final bem-sucedido (Mental Note)
  if (mentalNote) {
    message += `\n\n━━━━━━━━━━━━━━━━━━━━
✅ 【Final Bem-Sucedido】Mental Note
━━━━━━━━━━━━━━━━━━━━
${mentalNote}`;
  }
  
  // 【Melhoria 1: Adição de formato de programa de notícias】Adicionar seção Closing
  message += `\n\n━━━━━━━━━━━━━━━━━━━━
📺 【Encerramento】Não perca o próximo episódio
━━━━━━━━━━━━━━━━━━━━`;

  // CTA (Otimização de upsell: CTA com urgência para garantir fundos de desenvolvimento)
  // VSL2 e link do Whop são distribuídos separadamente, portanto não são incluídos no Minimal Briefing regular
  
  message += `\n\n━━━━━━━━━━━━━━━━━━━━
🚀 Desbloqueie o Relatório Completo de Inteligência

Você está vendo uma prévia. Membros completos obtêm:

✨ Relatório Completo de Inteligência
• Análise completa on-chain (todos os indicadores)
• Insights de mercado impulsionados por IA e detecção de armadilhas
• Alertas em tempo real: EVITAR-LONG / EVITAR-SHORT / STANDBY
• Mapa de Saída e guia de Treinamento Mental
• Suporte psicológico completo de Dr. Grok
• Análise de sentimento X em tempo real

💡 Por Que Atualizar?
A diferença entre proteger o capital e perdê-lo muitas vezes é apenas um sinal de armadilha perdido.

━━━━━━━━━━━━━━━━━━━━
Este é um relatório gratuito. Para análise detalhada e alertas de armadilhas, atualize para Trap Defense BTC.

Apenas para fins educacionais. Não é aconselhamento financeiro.`;

  return message.trim();
}

module.exports = { formatMinimalHighQualityBriefing };
