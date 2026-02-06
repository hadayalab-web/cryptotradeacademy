// Función de formato de texto para distribución de Telegram versión mínima gratuita de alta calidad
// services/telegram/messages/user/es/minimal-high-quality.es.js
// Trap Score + Análisis simplificado + Comentario simplificado de Dr. Grok + Mental Note

/**
 * Obtener hook del Trap Score（ネイティブ調、ラテン系）
 */
function getTrapScoreHook(trapScore) {
  if (trapScore == null || trapScore === undefined) {
    return 'Trap Score calculando. Aguanta un poco.';
  }
  
  const score = Number(trapScore);
  if (isNaN(score)) {
    return 'Trap Score calculando. Aguanta un poco.';
  }

  if (score >= 70) {
    return 'No operes rápido. Protege capital. Modo defensa activo.';
  } else if (score >= 50) {
    return 'Zona mixta. Espera confirmación antes de entrar.';
  } else if (score >= 30) {
    return 'El mercado se ve feo… pero los datos no están gritando "peligro".';
  } else {
    return 'Se ve feo, los datos dicen limpio (por ahora). No te confíes.';
  }
}

/**
 * Generar What to Avoid（Acciones a evitar）
 */
function generateWhatToAvoid(trapScore, trapData = null) {
  const score = trapScore == null ? null : Number(trapScore);
  if (score == null || Number.isNaN(score) || score < 50) {
    return null;
  }

  const avoidItems = [];
  
  // Extraer acciones a evitar de Trap Data
  if (trapData) {
    if (trapData.trapAlert) {
      if (trapData.trapAlert.type === 'AVOID_LONG') {
        avoidItems.push('Evita LONG — Modo defensa activo');
      } else if (trapData.trapAlert.type === 'AVOID_SHORT') {
        avoidItems.push('Evita SHORT — Modo defensa activo');
      }
    }
  }

  // Acciones a evitar por defecto（ネイティブ調）
  if (avoidItems.length === 0) {
    if (score >= 70) {
      avoidItems.push('No operes rápido — Protege capital');
      avoidItems.push('Espera señales más claras');
    } else if (score >= 50) {
      avoidItems.push('Zona mixta — Espera confirmación');
      avoidItems.push('Mejores oportunidades vienen');
    }
  }

  return avoidItems;
}

/**
 * Generar Evidence（Evidencia）
 */
function generateEvidence(trapData = null, marketData = null) {
  const evidenceItems = [];

  // Extraer evidencia de Trap Data
  if (trapData) {
    if (trapData.exchangeNetflow !== undefined && trapData.exchangeNetflow !== null) {
      const netflow = trapData.exchangeNetflow; // En unidades BTC
      const absValue = Math.abs(netflow);
      if (netflow < 0) {
        // Salida: ネイティブ調な表現
        evidenceItems.push(`Netflow: **${absValue.toFixed(0)} BTC de salida** → menos presión de venta inmediata`);
      } else if (netflow > 0) {
        // Entrada: ネイティブ調な表現
        evidenceItems.push(`Netflow: **+${absValue.toFixed(0)} BTC de entrada** → presión de venta potencial`);
      } else {
        evidenceItems.push(`Netflow: Equilibrado`);
      }
    }

    if (trapData.whaleRatio !== undefined && trapData.whaleRatio !== null) {
      const whaleRatio = trapData.whaleRatio * 100;
      if (whaleRatio >= 80) {
        evidenceItems.push(`Whale ratio: **${whaleRatio.toFixed(0)}%** → vigila, pero no entres en pánico`);
      } else if (whaleRatio >= 50) {
        evidenceItems.push(`Whale ratio: **${whaleRatio.toFixed(0)}%** → presión moderada`);
      } else {
        evidenceItems.push(`Whale ratio: **${whaleRatio.toFixed(0)}%** → rango normal`);
      }
    }
  }

  // Extraer evidencia de Market Data
  if (marketData) {
    if (marketData.mpi !== undefined && marketData.mpi !== null) {
      const mpi = marketData.mpi;
      if (mpi > 2.0) {
        evidenceItems.push(`MPI: **${mpi.toFixed(2)}** → mineros vendiendo (cuidado)`);
      } else if (mpi < 0.5) {
        evidenceItems.push(`MPI: **${mpi.toFixed(2)}** → mineros aguantando`);
      } else {
        evidenceItems.push(`MPI: **${mpi.toFixed(2)}** → rango normal`);
      }
    }
  }

  // Evidencia por defecto (si no hay datos, ネイティブ調)
  if (evidenceItems.length === 0) {
    evidenceItems.push('En on-chain no se ve trampa fuerte');
  }

  return evidenceItems.slice(0, 2); // Máximo 2
}

/**
 * Generar comentario simplificado de Dr. Grok
 */
function generateDrGrokComment(trapScore, sentimentData = null) {
  const comments = [];

  const score = trapScore == null ? null : Number(trapScore);
  if (score == null || Number.isNaN(score) || score < 30) {
    // Trap Score bajo: 認知的不協和と油断の警告（ネイティブ調、LATAM系）
    const lowRiskMessages = [
      '"Tu cabeza quiere vender para calmar el rojo. No confundas ansiedad con realidad. La trampa no es la caída: es salir por impulso."',
      '"Se ve feo… pero los datos no gritan \'peligro\'. Ojo: un 0/100 también te puede dormir."',
      '"Lo que nadie dice: 0/100 puede volverte confiado. Las trampas grandes se arman en silencio."',
    ];
    comments.push(lowRiskMessages[Math.floor(Math.random() * lowRiskMessages.length)]);
  } else if (score >= 70) {
    comments.push('"No es día de velocidad. Protege capital. Modo defensa activo."');
  } else if (score >= 50) {
    comments.push('"Mantén la disciplina. El mercado está probando tu paciencia. Defensa primero. Espera señales claras."');
  } else {
    comments.push('"Buena disciplina. Sigue esperando oportunidades claras. El riesgo bajo no significa bajar la guardia."');
  }

  // Comentario adicional de Sentiment Data
  if (sentimentData) {
    if (sentimentData.sentiment === 'FOMO' || sentimentData.sentiment === 'GREED') {
      comments.push('"El sentimiento del mercado es emocional. Es cuando ocurren las trampas. Mantén la calma."');
    } else if (sentimentData.sentiment === 'FEAR' || sentimentData.sentiment === 'Fear') {
      comments.push('"El miedo es natural. Pero las decisiones basadas en datos te protegen."');
    }
  }

  return comments[0] || null;
}

/**
 * Generar Mental Note
 */
function generateMentalNote(trapScore = null, avoidProTraderMessage = false, drGrokComment = null) {
  const allMentalNotes = [
    '"70% del tiempo, no hagas nada. Defensa hasta que surja una ventaja clara."',
    '"Proteger el capital es la prioridad #1. No perder es más importante que ganar."',
    '"70% del mercado es ruido. Reacciona solo a señales claras. Ese es el camino a la victoria."',
    '"Esperar no es debilidad. Es la estrategia más fuerte."',
    '"La defensa es la forma más alta de ataque. Proteger el capital es donde todo comienza."',
    '"90% de los traders profesionales priorizan el tiempo de espera. Toma la misma estrategia."',
  ];
  
  // Si se usa "traders profesionales priorizan el tiempo de espera" en insights estratégicos, evitarlo en Mental Note
  let availableNotes = allMentalNotes;
  if (avoidProTraderMessage) {
    availableNotes = availableNotes.filter(note => !note.includes('traders profesionales'));
  }
  
  // Evitar duplicación con comentario de Dr. Grok
  if (drGrokComment) {
    // Si el comentario contiene "70% del tiempo", evitar la misma frase en Mental Note
    if (drGrokComment.includes('70% del tiempo') || drGrokComment.includes('70%')) {
      availableNotes = availableNotes.filter(note => !note.includes('70% del tiempo') && !note.includes('70%'));
    }
    // Si el comentario contiene "La defensa no es debilidad", evitar la misma frase en Mental Note
    if (drGrokComment.includes('La defensa no es debilidad')) {
      availableNotes = availableNotes.filter(note => !note.includes('La defensa no es debilidad'));
    }
    // Si el comentario contiene "no es debilidad", evitar la misma frase en Mental Note
    if (drGrokComment.includes('no es debilidad')) {
      availableNotes = availableNotes.filter(note => !note.includes('no es debilidad'));
    }
    // Si el comentario contiene "estrategia más fuerte", evitar la misma frase en Mental Note
    if (drGrokComment.includes('estrategia más fuerte')) {
      availableNotes = availableNotes.filter(note => !note.includes('estrategia más fuerte'));
    }
  }
  
  // Si no hay mensajes disponibles, elegir de todos
  if (availableNotes.length === 0) {
    availableNotes = allMentalNotes;
  }
  
  const selectedNote = availableNotes[Math.floor(Math.random() * availableNotes.length)];
  return selectedNote;
}

/**
 * Generar mensaje de Telegram para versión mínima gratuita de alta calidad
 * Trap Score + Análisis simplificado + Comentario simplificado de Dr. Grok + Mental Note
 * 
 * @param {Object} options - Opciones de generación de mensaje
 * @param {Date} options.now - Hora actual
 * @param {number|null} options.trapScore - Trap Score (0-100)
 * @param {number|null} options.priceUsd - Precio de BTC (USD)
 * @param {number|null} options.change24h - Tasa de cambio de 24h (%)
 * @param {Object} options.trapData - Trap Data (opcional)
 * @param {Object} options.marketData - Market Data (opcional)
 * @param {Object} options.sentimentData - Sentiment Data (opcional)
 * @param {string} options.lang - Código de idioma (por defecto: 'es')
 * @returns {string} Cadena de mensaje de Telegram
 */
function formatMinimalHighQualityBriefing({
  now = new Date(),
  trapScore = null,
  priceUsd = null,
  change24h = null,
  trapData = null,
  marketData = null,
  sentimentData = null,
  lang = 'es',
  score = null, // Market Score (optional, can also be in marketData.score)
  grokGeminiOptimization = null, // Grok Xアルゴリズム解析 × Gemini深層心理分析統合最適化結果
} = {}) {
  const ts = now.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
  
  const scoreDisplay = trapScore != null ? Math.round(Number(trapScore)) : 'N/A';
  
  const priceLine = priceUsd != null && change24h != null
    ? `💰 Precio de BTC: $${priceUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })} (${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}% / 24h)`
    : '💰 Precio de BTC: Obteniendo...';

  const whatToAvoid = generateWhatToAvoid(trapScore, trapData);
  const evidence = generateEvidence(trapData, marketData);
  const drGrokComment = generateDrGrokComment(trapScore, sentimentData);
  
  // Si hay posibilidad de usar "traders profesionales priorizan el tiempo de espera" en insights estratégicos, evitarlo en Mental Note
  const trapScoreRounded = trapScore !== null ? Math.round(trapScore) : null;
  const useProTraderMessageInInsight = trapScoreRounded !== null && trapScoreRounded < 50 && trapScoreRounded >= 0;
  const mentalNote = generateMentalNote(trapScore, useProTraderMessageInInsight, drGrokComment);

  // GPT設計書に完全準拠: 4-post thread形式（Telegram用に1メッセージに統合）
  const change24hFormatted = change24h != null ? (change24h >= 0 ? `+${change24h.toFixed(2)}` : change24h.toFixed(2)) : 'N/A';
  const sentimentRaw = sentimentData?.sentiment;
  const sentimentLabelEs =
    sentimentRaw === 'Extreme Fear' ? 'Miedo Extremo' :
    sentimentRaw === 'Extreme Greed' ? 'Codicia Extrema' :
    (sentimentRaw === 'Fear' || sentimentRaw === 'FEAR') ? 'Miedo' :
    (sentimentRaw === 'Greed' || sentimentRaw === 'GREED') ? 'Codicia' :
    sentimentRaw === 'FOMO' ? 'FOMO' :
    sentimentRaw === 'Neutral' ? 'Neutral' :
    (sentimentRaw && typeof sentimentRaw === 'string') ? sentimentRaw : 'Neutral';
  // trapScoreRoundedは上で既に定義済み
  
  // [1/4] Hook: Fear vs Trap Score contradiction + immediate action
  let message = `[1/4] 🚨 Hook
━━━━━━━━━━━━━━━━━━━━`;
  
  if (scoreDisplay === 'N/A') {
    message += `\n🚨 BTC rojo (${change24hFormatted}%) y el mercado en **${sentimentLabelEs}**…
pero el Trap Score está calculando. No te lances.`;
  } else {
    message += `\n🚨 BTC rojo (${change24hFormatted}%) y el mercado en **${sentimentLabelEs}**…
pero el Trap Score está en **${scoreDisplay}/100**.`;
  }
  
  message += `\n\nSí, suena raro. Ahora mismo: nada de operar por desquite. Justo ahí es donde la mano te pica… y te cobra.`;

  // [2/4] Quick reads (2 bullets max, trader interpretation)
  message += `\n\n[2/4] 📊 En Corto, Sin Humo
━━━━━━━━━━━━━━━━━━━━`;
  
  // Exchange netflow（ネイティブ調）
  if (trapData?.exchangeNetflow !== undefined && trapData.exchangeNetflow !== null) {
    const netflow = trapData.exchangeNetflow;
    const absValue = Math.abs(netflow);
    if (netflow < 0) {
      message += `\n• Netflow: **${absValue.toFixed(0)} BTC de salida** → la gente está sacando coins del exchange`;
    } else if (netflow > 0) {
      message += `\n• Netflow: **+${absValue.toFixed(0)} BTC de entrada** → presión de venta potencial`;
    }
  }
  
  // MPI
  if (marketData?.mpi !== undefined && marketData.mpi !== null) {
    const mpi = marketData.mpi;
    message += `\n• MPI: **${mpi.toFixed(2)}** → los mineros no están vendiendo a lo loco`;
  }
  
  message += `\n\nLa vela roja asusta… pero no siempre es trampa.`;

  // [3/4] Psych coaching: latency anxiety (低スコア時の認知的不協和)
  message += `\n\n[3/4] 🧠 Coaching Psicológico
━━━━━━━━━━━━━━━━━━━━`;
  
  if (trapScoreRounded == null) {
    message += `\nEl score está calculando. Hasta que salga, no te adelantes.`;
  } else if (trapScoreRounded < 30) {
    message += `\nOjo: un **${trapScoreRounded}/100** también puede ser peligroso… por confianza.\nLas trampas grandes se arman cuando "no pasa nada".\n\nY si el score se dispara mientras duermes, el reporte gratis llega tarde. Y esos 15 minutos te cambian la jugada.`;
  } else if (trapScoreRounded < 50) {
    message += `\nEl mercado se ve feo… pero los datos no gritan "peligro".\nTu trabajo aquí: no dejes que el miedo te empuje a una entrada fea.\n\n(Igual ojo: si se da vuelta mientras duermes, el gratis se come esos 15 minutos.)`;
  } else {
    message += `\nDefensa activa. No confundas velas rojas con riesgo real. La trampa no es la caída—es salir por impulso.`;
  }
  
  // [4/4] Poll + question + soft CTA (GPT設計書に完全準拠)
  message += `\n\n[4/4] 🗳️ Encuesta + Pregunta + CTA
━━━━━━━━━━━━━━━━━━━━
Encuesta: Trap Score ${scoreDisplay === 'N/A' ? '*(calculando)*' : `**${scoreDisplay}/100**`} — ¿tu jugada?
A) Aguanto
B) Compro el dip
C) Vendo / reduzco
D) Espero confirmación

Responde A/B/C/D + tu timeframe (scalp/swing).

Si quieres alertas en tiempo real, comenta **TRAP** y te paso el enlace por DM. #BTC #Bitcoin #TrapDefence`;

  return message.trim();
}

module.exports = { formatMinimalHighQualityBriefing };
