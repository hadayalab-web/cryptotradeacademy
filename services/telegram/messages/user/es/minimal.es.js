// Función de formato de texto para distribución de Telegram versión mínima gratuita
// services/telegram/messages/user/es/minimal.es.js
// Solo muestra Trap Score (sin análisis detallado)

/**
 * Obtener descripción del Trap Score
 */
function getTrapScoreDescription(trapScore) {
  if (trapScore == null || trapScore === undefined) {
    return 'Trap Score se está calculando. Por favor, verifica más tarde.';
  }
  
  const score = Number(trapScore);
  if (isNaN(score)) {
    return 'Trap Score se está calculando. Por favor, verifica más tarde.';
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
 * Generar mensaje de Telegram para versión mínima gratuita
 * Solo muestra Trap Score (sin análisis detallado)
 * 
 * @param {Object} options - Opciones de generación de mensaje
 * @param {Date} options.now - Hora actual
 * @param {number|null} options.trapScore - Trap Score (0-100)
 * @param {number|null} options.priceUsd - Precio de BTC (USD)
 * @param {number|null} options.change24h - Tasa de cambio de 24h (%)
 * @param {string} options.lang - Código de idioma (por defecto: 'es')
 * @returns {string} Cadena de mensaje de Telegram
 */
function formatMinimalBriefing({
  now = new Date(),
  trapScore = null,
  priceUsd = null,
  change24h = null,
  lang = 'es',
} = {}) {
  const ts = now.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
  
  const scoreDisplay = trapScore != null ? Math.round(Number(trapScore)) : 'N/A';
  const scoreDescription = getTrapScoreDescription(trapScore);
  
  const priceLine = priceUsd != null && change24h != null
    ? `💰 Precio de BTC: $${priceUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })} (${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}% / 24h)`
    : '💰 Precio de BTC: Obteniendo...';

  return `🌤️ Trap Defence BTC - Informe Mínimo Gratuito
📅 ${ts}

🎯 Trap Score de Hoy
${scoreDisplay}/100

${scoreDescription}

${priceLine}

🔒 ¿Quieres Saber Por Qué?

El análisis detallado detrás de este Trap Score incluye:
• ¿Por qué AVOID_LONG o AVOID_SHORT?
• Análisis detallado de datos on-chain
• Guía de entrenamiento mental
• Apoyo psicológico del Dr. Grok

🚀 Actualiza a Acceso Completo
Desde $69/mes • Cancela en cualquier momento

Este es un informe mínimo gratuito. Para análisis detallado y alertas de trampas, actualiza a Trap Defence BTC.

Solo con fines educativos. No es asesoramiento financiero.`.trim();
}

module.exports = { formatMinimalBriefing };
