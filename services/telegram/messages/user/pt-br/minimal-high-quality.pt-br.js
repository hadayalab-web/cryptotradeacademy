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
    return '⚠️ ALTO RISCO DE ARMADILHA: Sinais fortes indicam possíveis armadilhas do mercado. Exercite extrema cautela';
  } else if (score >= 50) {
    return '⚡ RISCO MODERADO DE ARMADILHA: Alguns indicadores de armadilha detectados. Mantenha-se alerta';
  } else if (score >= 30) {
    return '✅ BAIXO RISCO DE ARMADILHA: Indicadores de armadilha mínimos. As condições do mercado parecem relativamente seguras';
  } else {
    return '✅ RISCO MUITO BAIXO DE ARMADILHA: Muito poucos indicadores de armadilha detectados. As condições do mercado parecem seguras';
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
        avoidItems.push('Evitar posições LONG — Alto risco de armadilha detectado');
      } else if (trapData.trapAlert.type === 'AVOID_SHORT') {
        avoidItems.push('Evitar posições SHORT — Alto risco de armadilha detectado');
      }
    }
  }

  // Ações a evitar por padrão
  if (avoidItems.length === 0) {
    if (trapScore >= 70) {
      avoidItems.push('Evitar abrir novas posições — Sinais fortes de armadilha detectados');
      avoidItems.push('Aguardar sinais de mercado mais claros antes de operar');
    } else if (trapScore >= 50) {
      avoidItems.push('Exercer cautela — Alguns indicadores de armadilha presentes');
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
      const absValue = Math.abs(netflow);
      if (netflow < 0) {
        // Saída: sinal positivo
        evidenceItems.push(`Fluxo líquido nas exchanges: ${absValue.toFixed(0)} BTC (saída) — Detentores estão mantendo ativos`);
      } else if (netflow > 0) {
        // Entrada: advertência
        evidenceItems.push(`Fluxo líquido nas exchanges: +${absValue.toFixed(0)} BTC (entrada) — Possível pressão de venda`);
      } else {
        evidenceItems.push(`Fluxo líquido nas exchanges: Equilibrado`);
      }
    }

    if (trapData.whaleRatio !== undefined && trapData.whaleRatio !== null) {
      const whaleRatio = trapData.whaleRatio * 100;
      if (whaleRatio >= 80) {
        evidenceItems.push(`Proporção de baleias: ${whaleRatio.toFixed(0)}% — Alta pressão de venda detectada`);
      } else if (whaleRatio >= 50) {
        evidenceItems.push(`Proporção de baleias: ${whaleRatio.toFixed(0)}% — Pressão de venda moderadamente alta`);
      } else {
        evidenceItems.push(`Proporção de baleias: ${whaleRatio.toFixed(0)}% — Faixa normal (atividade de baleias estável)`);
      }
    }
  }

  // Extrair evidência de Market Data
  if (marketData) {
    if (marketData.mpi !== undefined) {
      const mpi = marketData.mpi;
      if (mpi > 2.0) {
        evidenceItems.push(`Índice de Posição dos Mineradores: ${mpi.toFixed(2)} — Mineradores estão vendendo (requer cautela)`);
      } else if (mpi < 0.5) {
        evidenceItems.push(`Índice de Posição dos Mineradores: ${mpi.toFixed(2)} — Mineradores estão mantendo (sinal positivo)`);
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
    // Trap Score baixo: fornecer valor mesmo em risco baixo
    const lowRiskMessages = [
      '"A paciência é força estratégica. Continue aguardando oportunidades claras."',
      '"Risco baixo agora, mas os mercados sempre mudam. Não se preparar é o caminho para a derrota."',
      '"A defesa não é fraqueza. 70% do tempo, não fazer nada é a estratégia mais forte."',
    ];
    comments.push(lowRiskMessages[Math.floor(Math.random() * lowRiskMessages.length)]);
  } else if (trapScore >= 70) {
    comments.push('"O FOMO está alto agora. Não deixe que a ganância anule sua estratégia de defesa. Aguarde. Este é o momento mais perigoso."');
  } else if (trapScore >= 50) {
    comments.push('"Mantenha a disciplina. O mercado está testando sua paciência. Defesa primeiro. Aguarde sinais claros."');
  } else {
    comments.push('"Boa disciplina. Continue aguardando oportunidades claras. Risco baixo não significa baixar a guarda."');
  }

  // Comentário adicional de Sentiment Data
  if (sentimentData) {
    if (sentimentData.sentiment === 'FOMO' || sentimentData.sentiment === 'GREED') {
      comments.push('"O sentimento do mercado está emocional. É quando as armadilhas ocorrem. Mantenha a calma."');
    } else if (sentimentData.sentiment === 'FEAR') {
      comments.push('"O medo é natural. Mas decisões baseadas em dados te protegem."');
    }
  }

  return comments[0] || null;
}

/**
 * Gerar Mental Note
 */
function generateMentalNote(trapScore = null, avoidProTraderMessage = false, drGrokComment = null) {
  const allMentalNotes = [
    '"70% do tempo, não faça nada. Defesa até que surja uma vantagem clara."',
    '"Proteger o capital é a prioridade #1. Não perder é mais importante que ganhar."',
    '"70% do mercado é ruído. Reaja apenas a sinais claros. Esse é o caminho para a vitória."',
    '"Aguardar não é fraqueza. É a estratégia mais forte."',
    '"A defesa é a forma mais alta de ataque. Proteger o capital é onde tudo começa."',
    '"90% dos traders profissionais priorizam o tempo de espera. Adote a mesma estratégia."',
  ];
  
  // Se usar "traders profissionais priorizam o tempo de espera" em insights estratégicos, evitar em Mental Note
  let availableNotes = allMentalNotes;
  if (avoidProTraderMessage) {
    availableNotes = availableNotes.filter(note => !note.includes('traders profissionais'));
  }
  
  // Evitar duplicação com comentário de Dr. Grok
  if (drGrokComment) {
    // Se o comentário contém "70% do tempo", evitar a mesma frase em Mental Note
    if (drGrokComment.includes('70% do tempo') || drGrokComment.includes('70%')) {
      availableNotes = availableNotes.filter(note => !note.includes('70% do tempo') && !note.includes('70%'));
    }
    // Se o comentário contém "A defesa não é fraqueza", evitar a mesma frase em Mental Note
    if (drGrokComment.includes('A defesa não é fraqueza')) {
      availableNotes = availableNotes.filter(note => !note.includes('A defesa não é fraqueza'));
    }
    // Se o comentário contém "não é fraqueza", evitar a mesma frase em Mental Note
    if (drGrokComment.includes('não é fraqueza')) {
      availableNotes = availableNotes.filter(note => !note.includes('não é fraqueza'));
    }
    // Se o comentário contém "estratégia mais forte", evitar a mesma frase em Mental Note
    if (drGrokComment.includes('estratégia mais forte')) {
      availableNotes = availableNotes.filter(note => !note.includes('estratégia mais forte'));
    }
  }
  
  // Se não houver mensagens disponíveis, escolher de todas
  if (availableNotes.length === 0) {
    availableNotes = allMentalNotes;
  }
  
  const selectedNote = availableNotes[Math.floor(Math.random() * availableNotes.length)];
  return selectedNote;
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
  
  // Se houver possibilidade de usar "traders profissionais priorizam o tempo de espera" em insights estratégicos, evitar em Mental Note
  const trapScoreRounded = trapScore !== null ? Math.round(trapScore) : null;
  const useProTraderMessageInInsight = trapScoreRounded !== null && trapScoreRounded < 50 && trapScoreRounded >= 0;
  const mentalNote = generateMentalNote(trapScore, useProTraderMessageInInsight, drGrokComment);

  let message = `🌤️ Trap Defence BTC - Relatório Gratuito
🚨 BREAKING: BRIEFING DE DEFESA DE ARMADILHAS
📅 ${ts}

━━━━━━━━━━━━━━━━━━━━
🎯 Trap Score de Hoje
━━━━━━━━━━━━━━━━━━━━
${scoreDisplay}/100
${scoreDescription}

${priceLine}`;

  // Seção de apresentação do problema (baseado em Trap Score)
  if (trapScore !== null && trapScore >= 30) {
    const trapScoreRounded = Math.round(trapScore);
    
    if (trapScoreRounded >= 70) {
      message += `\n\n🚨 O mercado está mostrando sinais fortes de armadilha. Apesar do que os gráficos de preços possam sugerir, os dados on-chain revelam riscos ocultos`;
      message += `\n💡 Múltiplas divergências e anomalias indicam possíveis armadilhas do mercado. Entrar agora pode expor você a um risco significativo`;
    } else if (trapScoreRounded >= 50) {
      message += `\n\n⚡ O mercado está mostrando indicadores moderados de armadilha. Algumas divergências sugerem cautela`;
      message += `\n💡 Os sinais de armadilha estão presentes. Apressar-se para operar agora pode levar a perdas`;
    } else {
      message += `\n\n✅ As condições do mercado parecem relativamente seguras, mas os padrões de armadilha podem emergir rapidamente`;
      message += `\n💡 Mesmo em condições de baixo risco, a paciência é força estratégica`;
    }
  } else if (trapScore !== null && trapScore < 30) {
    // Mesmo em risco baixo, apresentar estado do mercado de forma concisa
    message += `\n\n💡 As condições atuais do mercado são relativamente estáveis, mas é importante manter-se sempre alerta`;
  }

  // Passo 2: Seção de evidência (Evidence)
  // Mostrar seção de evidência sempre, mesmo em risco baixo (para fornecer valor)
  if (evidence && evidence.length > 0) {
    message += `\n\n━━━━━━━━━━━━━━━━━━━━
📊 Razões Baseadas em Dados
━━━━━━━━━━━━━━━━━━━━`;
    evidence.forEach(item => {
      message += `\n• ${item}`;
    });
    
    // 【Melhoria 2: Integração de explicação baseada em evidência de "estratégia de espera de 70%"】Vincular Evidence e Mental Note
    // Adicionar explicação mesmo em risco baixo (para fornecer valor)
    if (trapScore !== null) {
      const trapScoreRounded = Math.round(trapScore);
      message += `\n\n💡 Insights Estratégicos`;
      if (trapScoreRounded >= 70) {
        message += `\n  🚨 Trap Score ${trapScoreRounded}/100: Sinais fortes indicam possíveis armadilhas do mercado`;
        message += `\n  🛡️ A preparação estratégica não é fraqueza—é preparação para a vitória. 70% do tempo, prepare-se para a vitória`;
      } else if (trapScoreRounded >= 50) {
        message += `\n  ⚡ Trap Score ${trapScoreRounded}/100: Indicadores moderados de armadilha detectados`;
        message += `\n  🛡️ Defesa primeiro. Aguarde sinais de mercado mais claros`;
      } else {
        // Fornecer valor mesmo em risco baixo
        message += `\n  ✅ Trap Score ${trapScoreRounded}/100: Risco de armadilha baixo atualmente, mas os mercados sempre mudam`;
        message += `\n  🛡️ Os tempos de baixo risco são quando mais importa a preparação estratégica. Continue a defesa até que surja uma vantagem clara`;
        message += `\n  💎 Os traders profissionais priorizam o "tempo de espera" acima de tudo. Adote a mesma estratégia`;
      }
    }
  }

  // Passo 3: Solução (What to Avoid)
  if (whatToAvoid && whatToAvoid.length > 0) {
    message += `\n\n━━━━━━━━━━━━━━━━━━━━
🚫 O Que Evitar
━━━━━━━━━━━━━━━━━━━━`;
    whatToAvoid.forEach(item => {
      message += `\n• ${item}`;
    });
  }

  // Passo 4: Final bem-sucedido (Comentário de Dr. Grok + Mental Note)
  if (drGrokComment) {
    message += `\n\n━━━━━━━━━━━━━━━━━━━━
💊 Insight Rápido de Dr. Grok
━━━━━━━━━━━━━━━━━━━━
${drGrokComment}`;
  }

  // Mental Note
  if (mentalNote) {
    message += `\n\n━━━━━━━━━━━━━━━━━━━━
✅ Mental Note
━━━━━━━━━━━━━━━━━━━━
${mentalNote}`;
  }

  // CTA (Otimização de upsell: CTA com urgência para garantir fundos de desenvolvimento)
  // VSL2 e link do Whop são distribuídos separadamente, portanto não são incluídos no Minimal Briefing regular
  
  message += `\n\n━━━━━━━━━━━━━━━━━━━━
🚀 Desbloqueie o Relatório Completo de Inteligência

Você está vendo uma prévia. Membros completos obtêm:

✨ Relatório Completo de Inteligência
• Análise completa on-chain (todos os indicadores em tempo real)
• Insights de mercado impulsionados por IA e detecção de armadilhas (monitoramento 24/7)
• Alertas em tempo real: AVOID-LONG / AVOID-SHORT / STANDBY (notificações instantâneas)
• Mapa de Saída e guia de Treinamento Mental (estratégias práticas)
• Suporte psicológico completo de Dr. Grok (resolução de bloqueios mentais)
• Análise de sentimento X em tempo real (prevê emoções do mercado)

💎 Tudo isso foi projetado para proteger seu capital

📊 Versão Gratuita vs Versão Completa
• Gratuita: Apenas Trap Score (dica direcional)
• Completa: Todos os dados + Alertas em tempo real (plano de ação específico)

🛡️ Um sinal perdido pode determinar se você protege ou perde seu capital

🎯 Atualize agora e obtenha o sistema de defesa completo

━━━━━━━━━━━━━━━━━━━━
Este é um relatório gratuito. Para análise detalhada e alertas de armadilhas, atualize para Trap Defence BTC

Apenas para fins educacionais. Não é aconselhamento financeiro`;

  return message.trim();
}

module.exports = { formatMinimalHighQualityBriefing };
