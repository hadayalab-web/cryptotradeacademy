// 無料版（Minimal Version）Telegram配信用
// services/telegram/messages/user/es/minimal-high-quality.es.js
// Trap Defence Minimal Engine v1.5（Zeigarnik Edition 完全体）— スペイン語版
// Minimal High Quality（4-post）は廃止。Zeigarnik Edition のみ。

/**
 * X Sentiment を無料版用に軽量化（心理の空気だけ。深度を出さない）
 * v1.4: Market Snapshot の X Sentiment は "Extreme Fear" → "Fear-dominant" 等に変換
 * ES: スペイン語ラベル
 */
function toSurfaceSentiment(raw) {
  if (!raw || typeof raw !== 'string') return 'Silencio de sentimiento';
  const s = raw.toLowerCase();
  if (s.includes('extreme fear') || s.includes('fear') || s.includes('panic') || s.includes('miedo') || s.includes('pánico')) return 'Miedo dominante';
  if (s.includes('extreme greed') || s.includes('greed') || s.includes('fomo') || s.includes('euphoria') || s.includes('codicia') || s.includes('euforia')) return 'Codicia dominante';
  if (s.includes('neutral')) return 'Neutral';
  return 'Silencio de sentimiento';
}

/**
 * Trap Defence Minimal Engine v1.5（Zeigarnik Edition 完全体）— スペイン語版
 * Market Snapshot + Key Metrics + Insight + ツァイガルニク効果（未完の緊張）
 */
function formatMinimalBriefingOSv26({
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
  const trapScoreDisplay = trapScore != null ? Math.round(Number(trapScore)) : 'N/A';
  const sentimentLabel = sentimentData?.sentiment || 'Desconocido';
  const netflow = trapData?.exchangeNetflow ?? 0;
  const netflowStr = netflow >= 0 ? `+${netflow.toFixed(0)} BTC` : `${netflow.toFixed(0)} BTC`;
  const mpi = marketData?.mpi ?? 0;
  const priceStr = priceUsd != null ? `$${priceUsd.toLocaleString('es-ES', { maximumFractionDigits: 0 })}` : 'N/A';
  const cqBase = netflow >= 0
    ? 'Alta entrada a exchanges → presión de venta a corto plazo'
    : 'Salida → tenedores asegurando activos';
  const cqSummary = `${cqBase} (vista superficial)`;
  const xSummary = toSurfaceSentiment(sentimentData?.sentiment);
  const macroSummary = 'Risk-off dominante; condiciones de liquidez ajustadas';
  const insight = trapScore != null && trapScore < 30
    ? 'La estructura superficial muestra liquidez desplazándose bajo presión de miedo; la dinámica ballena-algo más profunda solo se revela en el briefing completo.'
    : trapScore != null && trapScore >= 50
      ? 'Los flujos visibles indican reconfiguración; los impulsores estructurales subyacentes quedan fuera de este snapshot mínimo.'
      : 'Los desplazamientos de liquidez impulsados por miedo son evidentes; el mapa estructural completo está disponible solo en el briefing Regular.';

  return `🌤️ Trap Defence BTC — Briefing Mínimo
📅 ${ts}

━━━━━━━━━━━━━━━━━━━━
📡 Market Snapshot
━━━━━━━━━━━━━━━━━━━━
• Trap Score: ${trapScoreDisplay}/100
• CQ Summary: ${cqSummary}
• X Sentiment: ${xSummary}
• Macro Summary: ${macroSummary}

━━━━━━━━━━━━━━━━━━━━
📊 Métricas Clave
━━━━━━━━━━━━━━━━━━━━
• Precio: ${priceStr}
• Netflow: ${netflowStr}
• MPI: ${mpi.toFixed(2)}
• Sentimiento: ${sentimentLabel}

━━━━━━━━━━━━━━━━━━━━
🧠 Insight
━━━━━━━━━━━━━━━━━━━━
${insight}

Solo para fines educativos.
*(Este snapshot está intencionalmente incompleto; el desglose estructural completo está disponible en el Briefing Regular.)*`.trim();
}

const formatMinimalBriefing = formatMinimalBriefingOSv26;
const formatMinimalHighQualityBriefing = formatMinimalBriefingOSv26;

module.exports = { formatMinimalBriefingOSv26, formatMinimalBriefing, formatMinimalHighQualityBriefing };
