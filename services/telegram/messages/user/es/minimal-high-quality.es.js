// Función de formato de texto para distribución de Telegram versión mínima gratuita de alta calidad
// services/telegram/messages/user/es/minimal-high-quality.es.js
// Trap Score + Análisis simplificado + Comentario simplificado de Dr. Grok + Mental Note

/**
 * Obtener descripción del Trap Score
 */
function getTrapScoreDescription(trapScore) {
  if (trapScore == null || trapScore === undefined) {
    return 'El Trap Score se está calculando. Por favor, verifica más tarde.';
  }
  
  const score = Number(trapScore);
  if (isNaN(score)) {
    return 'El Trap Score se está calculando. Por favor, verifica más tarde.';
  }

  if (score >= 70) {
    return '⚠️ ALTO RIESGO DE TRAMPA: Fuertes señales indican posibles trampas del mercado. Ejercita extrema precaución';
  } else if (score >= 50) {
    return '⚡ RIESGO MODERADO DE TRAMPA: Se detectaron algunos indicadores de trampa. Mantente alerta';
  } else if (score >= 30) {
    return '✅ BAJO RIESGO DE TRAMPA: Indicadores de trampa mínimos. Las condiciones del mercado parecen relativamente seguras';
  } else {
    return '✅ RIESGO MUY BAJO DE TRAMPA: Muy pocos indicadores de trampa detectados. Las condiciones del mercado parecen seguras';
  }
}

/**
 * Generar What to Avoid（Acciones a evitar）
 */
function generateWhatToAvoid(trapScore, trapData = null) {
  if (!trapScore || trapScore < 50) {
    return null;
  }

  const avoidItems = [];
  
  // Extraer acciones a evitar de Trap Data
  if (trapData) {
    if (trapData.trapAlert) {
      if (trapData.trapAlert.type === 'AVOID_LONG') {
        avoidItems.push('Evitar posiciones LONG — Alto riesgo de trampa detectado');
      } else if (trapData.trapAlert.type === 'AVOID_SHORT') {
        avoidItems.push('Evitar posiciones SHORT — Alto riesgo de trampa detectado');
      }
    }
  }

  // Acciones a evitar por defecto
  if (avoidItems.length === 0) {
    if (trapScore >= 70) {
      avoidItems.push('Evitar abrir nuevas posiciones — Fuertes señales de trampa detectadas');
      avoidItems.push('Esperar señales de mercado más claras antes de operar');
    } else if (trapScore >= 50) {
      avoidItems.push('Ejercitar precaución — Algunos indicadores de trampa presentes');
      avoidItems.push('Considerar esperar mejores oportunidades de entrada');
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
        // Salida: señal positiva
        evidenceItems.push(`Flujo neto de exchanges: ${absValue.toFixed(0)} BTC (salida) — Los tenedores están manteniendo activos`);
      } else if (netflow > 0) {
        // Entrada: advertencia
        evidenceItems.push(`Flujo neto de exchanges: +${absValue.toFixed(0)} BTC (entrada) — Posible presión de venta`);
      } else {
        evidenceItems.push(`Flujo neto de exchanges: Equilibrado`);
      }
    }

    if (trapData.whaleRatio !== undefined && trapData.whaleRatio !== null) {
      const whaleRatio = trapData.whaleRatio * 100;
      if (whaleRatio >= 80) {
        evidenceItems.push(`Ratio de ballenas: ${whaleRatio.toFixed(0)}% — Alta presión de venta detectada`);
      } else if (whaleRatio >= 50) {
        evidenceItems.push(`Ratio de ballenas: ${whaleRatio.toFixed(0)}% — Presión de venta moderadamente alta`);
      } else {
        evidenceItems.push(`Ratio de ballenas: ${whaleRatio.toFixed(0)}% — Rango normal (actividad de ballenas estable)`);
      }
    }
  }

  // Extraer evidencia de Market Data
  if (marketData) {
    if (marketData.mpi !== undefined) {
      const mpi = marketData.mpi;
      if (mpi > 2.0) {
        evidenceItems.push(`Índice de posición de mineros: ${mpi.toFixed(2)} — Los mineros están vendiendo (se requiere precaución)`);
      } else if (mpi < 0.5) {
        evidenceItems.push(`Índice de posición de mineros: ${mpi.toFixed(2)} — Los mineros están manteniendo (señal positiva)`);
      }
    }
  }

  // Evidencia por defecto (si no hay datos)
  if (evidenceItems.length === 0) {
    evidenceItems.push('El análisis de datos on-chain indica riesgo de trampa');
  }

  return evidenceItems.slice(0, 2); // Máximo 2
}

/**
 * Generar comentario simplificado de Dr. Grok
 */
function generateDrGrokComment(trapScore, sentimentData = null) {
  const comments = [];

  if (!trapScore || trapScore < 30) {
    // Trap Score bajo: proporcionar valor incluso en riesgo bajo
    const lowRiskMessages = [
      '"La paciencia es fuerza estratégica. Sigue esperando oportunidades claras."',
      '"Riesgo bajo ahora, pero los mercados siempre cambian. No prepararse es el camino a la derrota."',
      '"La defensa no es debilidad. 70% del tiempo, no hacer nada es la estrategia más fuerte."',
    ];
    comments.push(lowRiskMessages[Math.floor(Math.random() * lowRiskMessages.length)]);
  } else if (trapScore >= 70) {
    comments.push('"El FOMO está alto ahora. No dejes que la codicia anule tu estrategia de defensa. Espera. Este es el momento más peligroso."');
  } else if (trapScore >= 50) {
    comments.push('"Mantén la disciplina. El mercado está probando tu paciencia. Defensa primero. Espera señales claras."');
  } else {
    comments.push('"Buena disciplina. Sigue esperando oportunidades claras. El riesgo bajo no significa bajar la guardia."');
  }

  // Comentario adicional de Sentiment Data
  if (sentimentData) {
    if (sentimentData.sentiment === 'FOMO' || sentimentData.sentiment === 'GREED') {
      comments.push('"El sentimiento del mercado es emocional. Es cuando ocurren las trampas. Mantén la calma."');
    } else if (sentimentData.sentiment === 'FEAR') {
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
} = {}) {
  const ts = now.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
  
  const scoreDisplay = trapScore != null ? Math.round(Number(trapScore)) : 'N/A';
  const scoreDescription = getTrapScoreDescription(trapScore);
  
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

  let message = `🌤️ Trap Defence BTC - Informe Gratuito
🚨 BREAKING: BRIEFING DE DEFENSA DE TRAMPAS
📅 ${ts}

━━━━━━━━━━━━━━━━━━━━
🎯 Trap Score de Hoy
━━━━━━━━━━━━━━━━━━━━
${scoreDisplay}/100
${scoreDescription}

${priceLine}`;

  // Sección de presentación del problema (basado en Trap Score)
  if (trapScore !== null && trapScore >= 30) {
    const trapScoreRounded = Math.round(trapScore);
    
    if (trapScoreRounded >= 70) {
      message += `\n\n🚨 El mercado está mostrando fuertes señales de trampa. A pesar de lo que los gráficos de precios puedan sugerir, los datos on-chain revelan riesgos ocultos`;
      message += `\n💡 Múltiples divergencias y anomalías indican posibles trampas del mercado. Entrar ahora podría exponerte a un riesgo significativo`;
    } else if (trapScoreRounded >= 50) {
      message += `\n\n⚡ El mercado está mostrando indicadores moderados de trampa. Algunas divergencias sugieren precaución`;
      message += `\n💡 Las señales de trampa están presentes. Apresurarse a operar ahora podría llevar a pérdidas`;
    } else {
      message += `\n\n✅ Las condiciones del mercado parecen relativamente seguras, pero los patrones de trampa pueden emerger rápidamente`;
      message += `\n💡 Incluso en condiciones de bajo riesgo, la paciencia es fuerza estratégica`;
    }
  } else if (trapScore !== null && trapScore < 30) {
    // Incluso en riesgo bajo, presentar estado del mercado de forma concisa
    message += `\n\n💡 Las condiciones actuales del mercado son relativamente estables, pero es importante mantenerse siempre alerta`;
  }

  // Paso 2: Sección de evidencia (Evidence)
  // Mostrar sección de evidencia siempre, incluso en riesgo bajo (para proporcionar valor)
  if (evidence && evidence.length > 0) {
    message += `\n\n━━━━━━━━━━━━━━━━━━━━
📊 Razones Basadas en Datos
━━━━━━━━━━━━━━━━━━━━`;
    evidence.forEach(item => {
      message += `\n• ${item}`;
    });
    
    // 【Mejora 2: Integración de explicación basada en evidencia de "estrategia de espera del 70%"】Vincular Evidence y Mental Note
    // Agregar explicación incluso en riesgo bajo (para proporcionar valor)
    if (trapScore !== null) {
      const trapScoreRounded = Math.round(trapScore);
      message += `\n\n💡 Insights Estratégicos`;
      if (trapScoreRounded >= 70) {
        message += `\n  🚨 Trap Score ${trapScoreRounded}/100: Fuertes señales indican posibles trampas del mercado`;
        message += `\n  🛡️ La preparación estratégica no es debilidad—es preparación para la victoria. 70% del tiempo, prepárate para la victoria`;
      } else if (trapScoreRounded >= 50) {
        message += `\n  ⚡ Trap Score ${trapScoreRounded}/100: Indicadores moderados de trampa detectados`;
        message += `\n  🛡️ Defensa primero. Espera señales de mercado más claras`;
      } else {
        // Proporcionar valor incluso en riesgo bajo
        message += `\n  ✅ Trap Score ${trapScoreRounded}/100: Riesgo de trampa bajo actualmente, pero los mercados siempre cambian`;
        message += `\n  🛡️ Los tiempos de bajo riesgo son cuando más importa la preparación estratégica. Continúa la defensa hasta que surja una ventaja clara`;
        message += `\n  💎 Los traders profesionales priorizan el "tiempo de espera" sobre todo. Toma la misma estrategia`;
      }
    }
  }

  // Paso 3: Solución (What to Avoid)
  if (whatToAvoid && whatToAvoid.length > 0) {
    message += `\n\n━━━━━━━━━━━━━━━━━━━━
🚫 Qué Evitar
━━━━━━━━━━━━━━━━━━━━`;
    whatToAvoid.forEach(item => {
      message += `\n• ${item}`;
    });
  }

  // Paso 4: Final exitoso (Comentario de Dr. Grok + Mental Note)
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

  // CTA (Optimización de upsell: CTA con urgencia para asegurar fondos de desarrollo)
  // VSL2 y enlace de Whop se distribuyen por separado, por lo que no se incluyen en el Minimal Briefing regular
  
  message += `\n\n━━━━━━━━━━━━━━━━━━━━
🚀 Desbloquea el Informe Completo de Inteligencia

Estás viendo un vistazo. Los miembros completos obtienen:

✨ Informe Completo de Inteligencia
• Análisis completo on-chain (todos los indicadores en tiempo real)
• Insights de mercado impulsados por IA y detección de trampas (monitoreo 24/7)
• Alertas en tiempo real: AVOID-LONG / AVOID-SHORT / STANDBY (notificaciones instantáneas)
• Mapa de Salida y guía de Entrenamiento Mental (estrategias prácticas)
• Apoyo psicológico completo de Dr. Grok (resolución de bloqueos mentales)
• Análisis de sentimiento X en tiempo real (predice emociones del mercado)

💎 Todo esto está diseñado para proteger tu capital

📊 Versión Gratuita vs Versión Completa
• Gratuita: Solo Trap Score (pista direccional)
• Completa: Todos los datos + Alertas en tiempo real (plan de acción específico)

🛡️ Una señal perdida puede determinar si proteges o pierdes tu capital

🎯 Actualiza ahora y obtén el sistema de defensa completo

━━━━━━━━━━━━━━━━━━━━
Este es un informe gratuito. Para análisis detallado y alertas de trampas, actualiza a Trap Defence BTC

Solo con fines educativos. No es asesoramiento financiero`;

  return message.trim();
}

module.exports = { formatMinimalHighQualityBriefing };
