// 無料版（Minimal Version）Telegram配信用
// services/telegram/messages/user/pt-br/minimal-high-quality.pt-br.js
// Trap Defence Minimal Engine v1.5（Zeigarnik Edition 完全体）— ポルトガル語版
// Minimal High Quality（4-post）は廃止。Zeigarnik Edition のみ。

/**
 * X Sentiment を無料版用に軽量化（心理の空気だけ。深度を出さない）
 * v1.4: Market Snapshot の X Sentiment は "Extreme Fear" → "Fear-dominant" 等に変換
 * PT-BR: ポルトガル語ラベル
 */
function toSurfaceSentiment(raw) {
  if (!raw || typeof raw !== 'string') return 'Silêncio de sentimento';
  const s = raw.toLowerCase();
  if (s.includes('extreme fear') || s.includes('fear') || s.includes('panic') || s.includes('medo') || s.includes('pânico')) return 'Medo dominante';
  if (s.includes('extreme greed') || s.includes('greed') || s.includes('fomo') || s.includes('euphoria') || s.includes('ganância') || s.includes('euforia')) return 'Ganância dominante';
  if (s.includes('neutral')) return 'Neutro';
  return 'Silêncio de sentimento';
}

/**
 * Trap Defence Minimal Engine v1.5（Zeigarnik Edition 完全体）— ポルトガル語版
 */
function formatMinimalBriefingOSv26({
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
  const trapScoreDisplay = trapScore != null ? Math.round(Number(trapScore)) : 'N/A';
  const sentimentLabel = sentimentData?.sentiment || 'Desconhecido';
  const netflow = trapData?.exchangeNetflow ?? 0;
  const netflowStr = netflow >= 0 ? `+${netflow.toFixed(0)} BTC` : `${netflow.toFixed(0)} BTC`;
  const mpi = marketData?.mpi ?? 0;
  const priceStr = priceUsd != null ? `$${priceUsd.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}` : 'N/A';
  const cqBase = netflow >= 0
    ? 'Alta entrada em exchanges → pressão de venda no curto prazo'
    : 'Saída → detentores garantindo ativos';
  const cqSummary = `${cqBase} (visão superficial)`;
  const xSummary = toSurfaceSentiment(sentimentData?.sentiment);
  const macroSummary = 'Risk-off dominante; condições de liquidez apertadas';
  const insight = trapScore != null && trapScore < 30
    ? 'A estrutura superficial mostra liquidez se deslocando sob pressão de medo; a dinâmica baleia-algo mais profunda só se revela no briefing completo.'
    : trapScore != null && trapScore >= 50
      ? 'Os fluxos visíveis indicam reconfiguração; os motores estruturais subjacentes permanecem fora deste snapshot mínimo.'
      : 'Deslocamentos de liquidez impulsionados por medo são evidentes; o mapa estrutural completo está disponível apenas no Briefing Regular.';

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
📊 Métricas-Chave
━━━━━━━━━━━━━━━━━━━━
• Preço: ${priceStr}
• Netflow: ${netflowStr}
• MPI: ${mpi.toFixed(2)}
• Sentimento: ${sentimentLabel}

━━━━━━━━━━━━━━━━━━━━
🧠 Insight
━━━━━━━━━━━━━━━━━━━━
${insight}

Apenas para fins educacionais.
*(Este snapshot está intencionalmente incompleto; o desdobramento estrutural completo está disponível no Briefing Regular.)*`.trim();
}

/**
 * Phase 3: Snapshot-native Minimal Briefing (PT-BR)
 */
function formatMinimalBriefing(snapshotOrPayload, lang = 'pt-br') {
  if (!snapshotOrPayload || typeof snapshotOrPayload !== 'object') {
    return '🌤️ Trap Defence BTC — Sem dados disponíveis.';
  }
  const isSnapshot = snapshotOrPayload.raw != null && snapshotOrPayload.as_of_utc != null;
  const snapshot = isSnapshot ? snapshotOrPayload : {
    raw: {
      priceUsd: snapshotOrPayload.priceUsd,
      change24h: snapshotOrPayload.change24h,
      inflow: snapshotOrPayload.trapData?.exchangeNetflow ?? 0,
      mpi: snapshotOrPayload.minimalMarketData?.mpi ?? 0,
      sentimentLabel: snapshotOrPayload.sentimentLabel ?? snapshotOrPayload.sentimentData?.sentiment
    },
    as_of_utc: snapshotOrPayload.now,
    trapDetection: { trapScore: snapshotOrPayload.minimalTrapScore },
    cqDeep: { whaleRatio: snapshotOrPayload.trapData?.whaleRatio, mpi: snapshotOrPayload.minimalMarketData?.mpi },
    meta: {}
  };
  const raw = snapshot.raw || {};
  const trapScore = snapshot.trapDetection?.trapScore ?? snapshot.cqDeep?.trapScore ?? null;
  const priceUsd = raw.priceUsd ?? null;
  const inflow = raw.inflow ?? 0;
  const sentimentLabel = raw.sentimentLabel ?? 'Desconhecido';
  const mpi = raw.mpi ?? snapshot.cqDeep?.mpi ?? snapshot.cqDeep?.minerMPI ?? 0;
  const meta = snapshot.meta || {};
  const watchNote = meta.watch ? '\n⚠️ WATCH: Condições requerem atenção.' : '';

  const asOf = snapshot.as_of_utc ?? snapshotOrPayload?.now;
  const tsRaw = typeof asOf === 'string' ? asOf : (asOf && typeof asOf.toISOString === 'function' ? asOf.toISOString() : new Date().toISOString());
  const ts = tsRaw.replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
  const trapScoreDisplay = trapScore != null ? Math.round(Number(trapScore)) : 'N/A';
  const netflowStr = inflow >= 0 ? `+${Number(inflow).toFixed(0)} BTC` : `${Number(inflow).toFixed(0)} BTC`;
  const priceStr = priceUsd != null ? `$${Number(priceUsd).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}` : 'N/A';
  const cqBase = inflow >= 0
    ? 'Alta entrada em exchanges → pressão de venda no curto prazo'
    : 'Saída → detentores garantindo ativos';
  const cqSummary = `${cqBase} (visão superficial)`;
  const xSummary = toSurfaceSentiment(sentimentLabel);
  const macroSummary = 'Risk-off dominante; condições de liquidez apertadas';
  const insight = trapScore != null && trapScore < 30
    ? 'A estrutura superficial mostra liquidez se deslocando sob pressão de medo; a dinâmica baleia-algo mais profunda só se revela no briefing completo.'
    : trapScore != null && trapScore >= 50
      ? 'Os fluxos visíveis indicam reconfiguração; os motores estruturais subjacentes permanecem fora deste snapshot mínimo.'
      : 'Deslocamentos de liquidez impulsionados por medo são evidentes; o mapa estrutural completo está disponível apenas no Briefing Regular.';

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
📊 Métricas-Chave
━━━━━━━━━━━━━━━━━━━━
• Preço: ${priceStr}
• Netflow: ${netflowStr}
• MPI: ${Number(mpi).toFixed(2)}
• Sentimento: ${sentimentLabel}

━━━━━━━━━━━━━━━━━━━━
🧠 Insight
━━━━━━━━━━━━━━━━━━━━
${insight}${watchNote}

Apenas para fins educacionais.
*(Este snapshot está intencionalmente incompleto; o desdobramento estrutural completo está disponível no Briefing Regular.)*`.trim();
}

const formatMinimalHighQualityBriefing = formatMinimalBriefing;

module.exports = { formatMinimalBriefingOSv26, formatMinimalBriefing, formatMinimalHighQualityBriefing };
