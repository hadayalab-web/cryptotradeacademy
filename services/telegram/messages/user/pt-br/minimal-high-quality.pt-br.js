// Função de formatação de texto para distribuição Telegram versão mínima gratuita de alta qualidade
// services/telegram/messages/user/pt-br/minimal-high-quality.pt-br.js
// Trap Score + Análise simplificada + Comentário simplificado de Dr. Grok + Mental Note

/**
 * Obter hook do Trap Score（ネイティブ調、ブラジル系）
 */
function getTrapScoreHook(trapScore) {
  if (trapScore == null || trapScore === undefined) {
    return 'Trap Score ainda está calculando. Aguenta aí.';
  }
  
  const score = Number(trapScore);
  if (isNaN(score)) {
    return 'Trap Score ainda está calculando. Aguenta aí.';
  }

  if (score >= 70) {
    return 'Não opera rápido. Protege capital. Modo defesa ativo.';
  } else if (score >= 50) {
    return 'Zona mista. Espera confirmação antes de entrar.';
  } else if (score >= 30) {
    return 'O gráfico assusta… mas os dados não tão gritando "perigo".';
  } else {
    return 'Parece feio, os dados dizem limpo (por enquanto). Não relaxa demais.';
  }
}

/**
 * Gerar What to Avoid（Ações a evitar）
 */
function generateWhatToAvoid(trapScore, trapData = null) {
  const score = trapScore == null ? null : Number(trapScore);
  if (score == null || Number.isNaN(score) || score < 50) {
    return null;
  }

  const avoidItems = [];
  
  // Extrair ações a evitar de Trap Data
  if (trapData?.trapAlert?.type === 'AVOID_LONG') {
    avoidItems.push('Evita LONG — Modo defesa ativo');
  } else if (trapData?.trapAlert?.type === 'AVOID_SHORT') {
    avoidItems.push('Evita SHORT — Modo defesa ativo');
  }

  // Ações a evitar por padrão（ネイティブ調、ブラジル系）
  if (avoidItems.length === 0) {
    if (score >= 70) {
      avoidItems.push('Não acelera. Sem trade no impulso — defesa total');
      avoidItems.push('Se operar, reduz tamanho e define stop antes');
    } else { // 50–69
      avoidItems.push('Zona mista — espera confirmação');
      avoidItems.push('Evita overtrade (essa é a armadilha)');
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
        // Saída: ネイティブ調な表現
        evidenceItems.push(`Netflow: **${absValue.toFixed(0)} BTC de saída** → menos moeda em corretora (menos pressão imediata)`);
      } else if (netflow > 0) {
        // Entrada: ネイティブ調な表現
        evidenceItems.push(`Netflow: **+${absValue.toFixed(0)} BTC de entrada** → pressão de venda potencial`);
      } else {
        evidenceItems.push(`Netflow: Equilibrado`);
      }
    }

    if (trapData.whaleRatio !== undefined && trapData.whaleRatio !== null) {
      const whaleRatio = trapData.whaleRatio * 100;
      if (whaleRatio >= 80) {
        evidenceItems.push(`Whale ratio: **${whaleRatio.toFixed(0)}%** → fica no radar, mas não entra em pânico`);
      } else if (whaleRatio >= 50) {
        evidenceItems.push(`Whale ratio: **${whaleRatio.toFixed(0)}%** → pressão moderada`);
      } else {
        evidenceItems.push(`Whale ratio: **${whaleRatio.toFixed(0)}%** → faixa normal`);
      }
    }
  }

  // Extrair evidência de Market Data
  if (marketData) {
    if (marketData.mpi !== undefined && marketData.mpi !== null) {
      const mpi = marketData.mpi;
      if (mpi > 2.0) {
        evidenceItems.push(`MPI: **${mpi.toFixed(2)}** → mineradores vendendo (cuidado)`);
      } else if (mpi < 0.5) {
        evidenceItems.push(`MPI: **${mpi.toFixed(2)}** → mineradores segurando`);
      } else {
        evidenceItems.push(`MPI: **${mpi.toFixed(2)}** → faixa normal`);
      }
    }
  }

  // Evidência por padrão (se não houver dados, ネイティブ調)
  if (evidenceItems.length === 0) {
    evidenceItems.push('No on-chain tá misto — sem sinal claro de trampa agora.');
  }

  return evidenceItems.slice(0, 2); // Máximo 2
}

/**
 * Gerar comentário simplificado de Dr. Grok
 */
function generateDrGrokComment(trapScore, sentimentData = null) {
  const comments = [];

  const score = trapScore == null ? null : Number(trapScore);
  if (score == null || Number.isNaN(score) || score < 30) {
    // Trap Score baixo: 認知的不協和と油断の警告（ネイティブ調、ブラジル系）
    const lowRiskMessages = [
      '"Sua cabeça quer vender só pra parar o desconforto de ver vermelho. Não confunde ansiedade com realidade. A armadilha não é a queda: é sair por impulso."',
      '"O gráfico assusta… mas os dados não tão gritando \'perigo\'. O perigo hoje não tá no gráfico… tá na ansiedade."',
      '"A parte que ninguém fala: 0/100 pode te deixar confiante demais. As armadilhas grandes se montam quando \'não tá acontecendo nada\'."',
    ];
    comments.push(lowRiskMessages[Math.floor(Math.random() * lowRiskMessages.length)]);
  } else if (trapScore >= 70) {
    comments.push('"Não opera rápido. Protege capital. Modo defesa ativo. Esse é o momento mais perigoso."');
  } else if (trapScore >= 50) {
    comments.push('"Zona mista. Espera confirmação. Defesa primeiro. Não se apressa."');
  } else {
    comments.push('"Parece feio, os dados dizem limpo (por enquanto). Não confunde ansiedade com realidade do mercado."');
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
  score = null, // Market Score (optional, can also be in marketData.score)
  grokGeminiOptimization = null, // Grok Xアルゴリズム解析 × Gemini深層心理分析統合最適化結果
  grokReasoningMinimal = null, // Grok 4.1 Fast Reasoning: なぜこのTrap Scoreか・何を見るか（2バレット）
  geminiInsight = null, // Gemini 3 Flash: 心理の罠＋1アクション（1–2文）
} = {}) {
  const ts = now.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
  
  const scoreDisplay = trapScore != null ? Math.round(Number(trapScore)) : 'N/A';
  
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

  // GPT設計書に完全準拠: 4-post thread形式（Telegram用に1メッセージに統合）
  const change24hFormatted = change24h != null ? (change24h >= 0 ? `+${change24h.toFixed(2)}` : change24h.toFixed(2)) : 'N/A';
  const sentimentLabel = sentimentData?.sentiment || 'Medo Extremo';
  const sentimentLabelPt = sentimentLabel === 'Extreme Fear' ? 'Medo Extremo' :
                           sentimentLabel === 'Fear' ? 'Medo' :
                           sentimentLabel === 'Greed' ? 'Ganância' :
                           sentimentLabel === 'FOMO' ? 'FOMO' : 'Neutral';
  // trapScoreRoundedは上で既に定義済み
  
  // [1/4] Hook: Fear vs Trap Score contradiction + immediate action
  let message = `[1/4] 🚨 Hook
━━━━━━━━━━━━━━━━━━━━`;
  
  if (scoreDisplay === 'N/A') {
    message += `\n🚨 BTC caindo (${change24hFormatted}%) e o sentimento em **${sentimentLabelPt}**…
mas o Trap Score ainda tá calculando. Não se adianta.`;
  } else {
    message += `\n🚨 BTC caindo (${change24hFormatted}%) e o sentimento em **${sentimentLabelPt}**…
mas o Trap Score tá **${scoreDisplay}/100**.`;
  }
  
  message += `\n\nÉ aquela hora em que o estômago grita e os dados falam o contrário.

Agora: calma. Respira. Nada de operar no impulso.`;

  // [2/4] Quick reads (2 bullets max, trader interpretation)
  message += `\n\n[2/4] 📊 Rápido e Direto
━━━━━━━━━━━━━━━━━━━━`;
  
  // Exchange netflow（ネイティブ調）
  if (trapData?.exchangeNetflow !== undefined && trapData.exchangeNetflow !== null) {
    const netflow = trapData.exchangeNetflow;
    const absValue = Math.abs(netflow);
    if (netflow < 0) {
      message += `\n• Netflow: **${absValue.toFixed(0)} BTC de saída** → moeda saindo de corretora`;
    } else if (netflow > 0) {
      message += `\n• Netflow: **+${absValue.toFixed(0)} BTC de entrada** → pressão de venda potencial`;
    }
  }
  
  // MPI
  if (marketData?.mpi !== undefined && marketData.mpi !== null) {
    const mpi = marketData.mpi;
    message += `\n• MPI: **${mpi.toFixed(2)}** → mineradores não estão vendendo com pressa`;
  }
  
  message += `\n\nVela vermelha assusta, mas não é sinônimo de armadilha.`;

  // Grok 4.1 Fast Reasoning: なぜこのスコアか・何を見るか（密度強化）
  if (grokReasoningMinimal && typeof grokReasoningMinimal === 'string' && grokReasoningMinimal.trim()) {
    message += `\n\n🔍 **Dr. Grok** (por que esse score + o que vigiar):\n${grokReasoningMinimal.trim()}`;
  }

  // [3/4] Psych coaching: latency anxiety (低スコア時の認知的不協和)
  message += `\n\n[3/4] 🧠 Coaching Psicológico
━━━━━━━━━━━━━━━━━━━━`;
  
  if (trapScoreRounded == null) {
    message += `\nO score ainda tá calculando. Até sair, não se adianta.`;
  } else if (trapScoreRounded < 30) {
    message += `\nSó um alerta: **${trapScoreRounded}/100 dá uma falsa calma.**\nMuita armadilha nasce no silêncio.\n\nSe o score virar enquanto você dorme, o "grátis" não cobre aquela janela de 15 minutos.`;
  } else if (trapScoreRounded < 50) {
    message += `\nO gráfico assusta… mas os dados não tão gritando "perigo".\nSua função aqui: não deixa o medo te empurrar pra um clique ruim.\n\n(Ainda assim: se virar enquanto você dorme, o grátis perde esses 15 minutos.)`;
  } else {
    message += `\nDefesa ativa. Não confunda vela vermelha com risco real. A armadilha não é o dip—é sair no impulso.`;
  }

  // Gemini 3 Flash: 心理の罠＋1アクション（密度強化）
  if (geminiInsight && typeof geminiInsight === 'string' && geminiInsight.trim()) {
    message += `\n\n💡 **Armadilha de hoje + uma ação:**\n${geminiInsight.trim()}`;
  }
  
  // [4/4] Poll + question + soft CTA (GPT設計書に完全準拠)
  message += `\n\n[4/4] 🗳️ Enquete + Pergunta + CTA
━━━━━━━━━━━━━━━━━━━━
Enquete: Trap Score ${scoreDisplay === 'N/A' ? '*(calculando)*' : `**${scoreDisplay}/100**`} — você vai:
A) Segurar
B) Comprar o dip
C) Vender / reduzir
D) Esperar confirmação

Responde A/B/C/D + teu timeframe (scalp/swing).

Quer alerta em tempo real? Responde **TRAP** que eu te mando o link no DM. #BTC #Bitcoin #TrapDefence`;

  return message.trim();
}

module.exports = { formatMinimalHighQualityBriefing };
