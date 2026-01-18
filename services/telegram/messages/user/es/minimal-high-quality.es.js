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
    return '⚠️ ALTO RIESGO DE TRAMPA: Fuertes señales indican posibles trampas del mercado. Ejercita extrema precaución.';
  } else if (score >= 50) {
    return '⚡ RIESGO MODERADO DE TRAMPA: Se detectaron algunos indicadores de trampa. Mantente alerta.';
  } else if (score >= 30) {
    return '✅ BAJO RIESGO DE TRAMPA: Indicadores de trampa mínimos. Las condiciones del mercado parecen relativamente seguras.';
  } else {
    return '✅ RIESGO MUY BAJO DE TRAMPA: Muy pocos indicadores de trampa detectados. Las condiciones del mercado parecen seguras.';
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
        avoidItems.push('Evitar posiciones LONG - Alto riesgo de trampa detectado');
      } else if (trapData.trapAlert.type === 'AVOID_SHORT') {
        avoidItems.push('Evitar posiciones SHORT - Alto riesgo de trampa detectado');
      }
    }
  }

  // Acciones a evitar por defecto
  if (avoidItems.length === 0) {
    if (trapScore >= 70) {
      avoidItems.push('Evitar abrir nuevas posiciones - Fuertes señales de trampa detectadas');
      avoidItems.push('Esperar señales de mercado más claras antes de operar');
    } else if (trapScore >= 50) {
      avoidItems.push('Ejercitar precaución - Algunos indicadores de trampa presentes');
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
      const sign = netflow >= 0 ? '+' : '';
      const absValue = Math.abs(netflow);
      const flowDir = netflow >= 0 ? 'entrada' : 'salida';
      // Mostrar en unidades BTC (unificado con la versión de pago)
      evidenceItems.push(`Flujo neto de exchanges: ${sign}${absValue.toFixed(0)} BTC (${flowDir})`);
    }

    if (trapData.whaleRatio !== undefined && trapData.whaleRatio !== null) {
      const whaleRatio = trapData.whaleRatio * 100;
      evidenceItems.push(`Ratio de ballenas: ${whaleRatio.toFixed(0)}% (${whaleRatio >= 80 ? 'alta presión de venta' : 'normal'})`);
    }
  }

  // Extraer evidencia de Market Data
  if (marketData) {
    if (marketData.mpi !== undefined) {
      const mpi = marketData.mpi;
      if (mpi > 2.0) {
        evidenceItems.push(`Índice de posición de mineros: ${mpi.toFixed(2)} (mineros vendiendo)`);
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
    // Incluso cuando el Trap Score es bajo, proporcionar un mensaje por defecto
    comments.push('"La paciencia es fuerza estratégica. Sigue esperando oportunidades claras."');
  } else if (trapScore >= 70) {
    comments.push('"El FOMO está alto ahora. No dejes que la codicia anule tu estrategia de defensa. Espera."');
  } else if (trapScore >= 50) {
    comments.push('"Mantén la disciplina. El mercado está probando tu paciencia. Defensa primero."');
  } else {
    comments.push('"Buena disciplina. Sigue esperando oportunidades claras."');
  }

  // Comentario adicional de Sentiment Data
  if (sentimentData) {
    if (sentimentData.sentiment === 'FOMO' || sentimentData.sentiment === 'GREED') {
      comments.push('"El sentimiento del mercado es emocional. Es cuando ocurren las trampas. Mantén la calma."');
    }
  }

  return comments[0] || null;
}

/**
 * Generar Mental Note
 */
function generateMentalNote() {
  return '"70% del tiempo, no hagas nada. Defensa hasta que surja una ventaja clara."';
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
  const mentalNote = generateMentalNote();

  // 【Mejora 1: Adición de formato de programa de noticias】Agregar sección Opening
  let message = `🌤️ Trap Defense BTC - Informe Gratuito
🚨 BREAKING: BRIEFING DE DEFENSA DE TRAMPAS
📺 【Apertura】Briefing de Inteligencia de Mercado
📅 ${ts}

━━━━━━━━━━━━━━━━━━━━
🎯 Trap Score de Hoy
━━━━━━━━━━━━━━━━━━━━
${scoreDisplay}/100
${scoreDescription}

${priceLine}`;

  // 【Mejora 1: Adición de estructura de historia】Agregar sección de presentación del problema
  // Paso 1: Presentación del problema (basado en Trap Score)
  if (trapScore !== null && trapScore >= 30) {
    const trapScoreRounded = Math.round(trapScore);
    message += `\n\n━━━━━━━━━━━━━━━━━━━━
📖 【Historia de Mercado】El Problema
━━━━━━━━━━━━━━━━━━━━`;
    
    if (trapScoreRounded >= 70) {
      message += `\n🚨 El mercado está mostrando fuertes señales de trampa. A pesar de lo que los gráficos de precios puedan sugerir, los datos on-chain revelan riesgos ocultos.`;
      message += `\n💡 El Problema: Múltiples divergencias y anomalías indican posibles trampas del mercado. Entrar ahora podría exponerte a un riesgo significativo.`;
    } else if (trapScoreRounded >= 50) {
      message += `\n⚡ El mercado está mostrando indicadores moderados de trampa. Algunas divergencias sugieren precaución.`;
      message += `\n💡 El Problema: Las señales de trampa están presentes. Apresurarse a operar ahora podría llevar a pérdidas.`;
    } else {
      message += `\n✅ Las condiciones del mercado parecen relativamente seguras, pero los patrones de trampa pueden emerger rápidamente.`;
      message += `\n💡 El Problema: Incluso en condiciones de bajo riesgo, la paciencia es fuerza estratégica.`;
    }
  }

  // Paso 2: Sección de evidencia (Evidence)
  if (evidence && evidence.length > 0) {
    message += `\n\n━━━━━━━━━━━━━━━━━━━━
📊 【Evidencia】¿Por Qué Esperar? Razones Basadas en Datos
PROBADO POR DATOS ON-CHAIN
━━━━━━━━━━━━━━━━━━━━`;
    evidence.forEach(item => {
      message += `\n• ${item}`;
    });
    
    // 【Mejora 2: Integración de explicación basada en evidencia de "estrategia de espera del 70%"】Vincular Evidence y Mental Note
    if (trapScore !== null && trapScore >= 30) {
      const trapScoreRounded = Math.round(trapScore);
      message += `\n\n💡 ¿Por Qué Esperar? (Basado en Evidencia)`;
      if (trapScoreRounded >= 70) {
        message += `\n   🚨 Trap Score ${trapScoreRounded}/100: Fuertes señales indican posibles trampas del mercado.`;
        message += `\n   🛡️ La preparación estratégica no es debilidad—es preparación para la victoria. 70% del tiempo, prepárate para la victoria.`;
      } else if (trapScoreRounded >= 50) {
        message += `\n   ⚡ Trap Score ${trapScoreRounded}/100: Indicadores moderados de trampa detectados.`;
        message += `\n   🛡️ Defensa primero. Espera señales de mercado más claras.`;
      } else {
        message += `\n   ✅ Trap Score ${trapScoreRounded}/100: Bajo riesgo de trampa, pero mantente alerta.`;
        message += `\n   🛡️ Incluso en condiciones de bajo riesgo, la preparación estratégica es preparación para la victoria.`;
      }
    }
  }

  // Paso 3: Solución (What to Avoid)
  if (whatToAvoid && whatToAvoid.length > 0) {
    message += `\n\n━━━━━━━━━━━━━━━━━━━━
🚫 【Solución】Qué Evitar
━━━━━━━━━━━━━━━━━━━━`;
    whatToAvoid.forEach(item => {
      message += `\n• ${item}`;
    });
  }

  // Paso 4: Final exitoso (Comentario de Dr. Grok + Mental Note)
  // 【Mejora 1: Adición de formato de programa de noticias】Sección de comentarista
  if (drGrokComment) {
    message += `\n\n━━━━━━━━━━━━━━━━━━━━
💊 【Comentarista】Insight Rápido de Dr. Grok
━━━━━━━━━━━━━━━━━━━━
${drGrokComment}`;
  }

  // 【Mejora 1: Adición de estructura de historia】Final exitoso (Mental Note)
  if (mentalNote) {
    message += `\n\n━━━━━━━━━━━━━━━━━━━━
✅ 【Final Exitoso】Mental Note
━━━━━━━━━━━━━━━━━━━━
${mentalNote}`;
  }
  
  // 【Mejora 1: Adición de formato de programa de noticias】Agregar sección Closing
  message += `\n\n━━━━━━━━━━━━━━━━━━━━
📺 【Cierre】No te pierdas el próximo episodio
━━━━━━━━━━━━━━━━━━━━`;

  // CTA (Optimización de upsell: CTA con urgencia para asegurar fondos de desarrollo)
  // VSL2 y enlace de Whop se distribuyen por separado, por lo que no se incluyen en el Minimal Briefing regular
  
  message += `\n\n━━━━━━━━━━━━━━━━━━━━
🚀 Desbloquea el Informe Completo de Inteligencia

Estás viendo un vistazo. Los miembros completos obtienen:

✨ Informe Completo de Inteligencia
• Análisis completo on-chain (todos los indicadores)
• Insights de mercado impulsados por IA y detección de trampas
• Alertas en tiempo real: EVITAR-LONG / EVITAR-SHORT / STANDBY
• Mapa de Salida y guía de Entrenamiento Mental
• Apoyo psicológico completo de Dr. Grok
• Análisis de sentimiento X en tiempo real

💡 ¿Por Qué Actualizar?
La diferencia entre proteger el capital y perderlo a menudo es solo una señal de trampa perdida.

━━━━━━━━━━━━━━━━━━━━
Este es un informe gratuito. Para análisis detallado y alertas de trampas, actualiza a Trap Defense BTC.

Solo con fines educativos. No es asesoramiento financiero.`;

  return message.trim();
}

module.exports = { formatMinimalHighQualityBriefing };
