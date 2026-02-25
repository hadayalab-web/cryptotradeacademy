// Tier1 BTC regular briefing (JP)
// services/telegram/messages/user/ja/regular.ja.js
// EN v2.8 構造適用 — Market State Radar, Behind-the-Scenes 4要素

const { hasJapanese } = require('../../shared/contentFilters');

function formatPercent(pct) {
  if (pct == null || Number.isNaN(pct)) return 'n/a';
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(2)}%`;
}

function formatUsd(v) {
  if (v == null || Number.isNaN(v)) return 'n/a';
  return `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

/**
 * 日本語の心理的アドバイスを取得（英語が含まれている場合のフォールバック）
 */
function getJapanesePsychologicalAdvice(psychologicalState, psychologicalRisk) {
  if (psychologicalState === 'NEUTRAL' && psychologicalRisk === 'LOW') {
    return '✅ 中立状態 - メンタルブロック未検出: 市場センチメントはバランスが取れている。極端な感情は検出されておらず、条件は安定している。';
  } else if (psychologicalState === 'NEUTRAL' && psychologicalRisk === 'MEDIUM') {
    return '⚠️ 中立状態 - 要注視: 市場センチメントはバランス取れていますが、条件が変わる可能性があります。警戒を維持してください。';
  } else if (psychologicalState === 'NEUTRAL' && psychologicalRisk === 'HIGH') {
    return '🚨 中立状態 - 高リスク: この「中立」センチメントはトラップ条件を隠している可能性があります。規律を維持してください。';
  } else if (psychologicalState === 'FOMO') {
    return '🚨 FOMO検知 - 極端な買い圧力: リテールが追いかける一方でクジラが配布している可能性。典型的なトラップパターンです。';
  } else if (psychologicalState === 'FEAR') {
    return '😨 恐怖検知 - 市場はリテールの関心が低い: 恐怖は麻痺を招くが、潜在的な機会のシグナルにもなる。';
  } else if (psychologicalState === 'GREED') {
    return '😍 強欲検知 - ユーフォリア状態: 強欲はトレードで最も危険な感情。利益確定を検討してください。';
  } else if (psychologicalState === 'PANIC') {
    return '😱 パニック検知 - 極端な恐怖: パニックは扁桃体が前頭前皮質を乗っ取っている状態。止まれ。息をして。データを確認。';
  } else if (psychologicalState === 'EUPHORIA') {
    return '😄 ユーフォリア検知 - 市場の祝賀: ユーフォリアは市場がリスクを忘れさせる手段。規律を維持。';
  } else if (psychologicalState === 'CONFUSION') {
    return '🤔 混乱検知 - 不明確なシグナル: 混乱は脳が明確さを求めている状態。無理にトレードしない。迷ったら待て。';
  }
  return '市場条件は比較的安定。規律を維持し、質の高いセットアップを待て。';
}

/**
 * Phase 3: Extract payload from snapshot + opts
 */
function extractPayloadFromSnapshot(snapshot, lang = 'ja', opts = {}) {
  if (!snapshot || typeof snapshot !== 'object') return null;
  const raw = snapshot.raw || {};
  const cqDeep = snapshot.cqDeep || {};
  const td = snapshot.trapDetection || {};
  const asOf = snapshot.as_of_utc || new Date().toISOString();
  const now = typeof asOf === 'string' ? new Date(asOf) : asOf;
  return {
    now,
    inflow: raw.inflow ?? cqDeep.exchangeNetflow ?? 0,
    mpi: raw.mpi ?? cqDeep.minerMPI ?? cqDeep.mpi ?? 0,
    sentimentLabel: raw.sentimentLabel ?? '不明',
    priceUsd: raw.priceUsd ?? null,
    change24h: raw.change24h ?? null,
    score: snapshot.market_score ?? 0,
    tradeSignal: snapshot.tradeSignal || { signal: 'STANDBY', tp: null, sl: null, rr: null },
    trap: td.trapDetected ? { isTrap: true, label: td.label ?? 'Trap', confidence: td.trapSeverity ?? 'MEDIUM' } : { isTrap: false, label: 'No trap', confidence: 'LOW' },
    aiAnalysis: snapshot.drGrok?.base ?? (typeof snapshot.gptStructureReasoning === 'string' ? snapshot.gptStructureReasoning : null),
    stats: null,
    trapScore: cqDeep.trapScore ?? td.trapScore ?? null,
    whaleFlows: cqDeep.whaleFlows ?? null,
    liquidations: cqDeep.liquidations ?? null,
    noTradeAlert: null,
    trapRisk: null,
    exitMap: null,
    trapDetection: td,
    marketBug: opts.marketBug ?? null,
    trapAlert: snapshot.trapAlert ?? null,
    divergenceSignal: snapshot.divergenceSignal ?? null,
    psychologicalSupport: opts.psychologicalSupport ?? null,
    hasGeminiContent: !!(snapshot.sosovalueArticle && snapshot.sosovalueArticle.trim()),
    sosovalueArticle: snapshot.sosovalueArticle ?? null,
    gptReporterAnalysis: snapshot.gptStructureReasoning ?? null,
    grokXAnalysis: opts.grokXAnalysis ?? snapshot.highResX ?? null,
    riskReward: cqDeep.riskReward ?? null,
    nupl: cqDeep.longTerm?.nupl ?? cqDeep.nupl ?? null,
    sopr30d: cqDeep.longTerm?.sopr30d ?? cqDeep.sopr30d ?? null,
    kimchiPremium: cqDeep.kimchiPremium ?? null,
    upbitPrice: cqDeep.upbitPrice ?? null
  };
}

/**
 * Phase 3: Snapshot-native Regular Briefing (JA)
 * Backward compat: legacy payload (now, inflow, ...) also accepted until cron migrates.
 */
function formatRegularBriefing(snapshotOrPayload, lang = 'ja', opts = {}) {
  if (!snapshotOrPayload || typeof snapshotOrPayload !== 'object') {
    return '🌤️ Trap Defence BTC - Regular Briefing — スナップショットデータなし';
  }
  const isSnapshot = snapshotOrPayload.raw != null;
  if (isSnapshot) {
    const payload = extractPayloadFromSnapshot(snapshotOrPayload, lang, opts);
    if (!payload) return '🌤️ Trap Defence BTC - Regular Briefing — 無効なスナップショット';
    return formatRegularBriefingCore(payload);
  }
  return formatRegularBriefingCore(snapshotOrPayload);
}

function formatRegularBriefingCore({
  now,
  inflow,
  mpi,
  sentimentLabel,
  priceUsd,
  change24h,
  score,
  tradeSignal,
  trap,
  aiAnalysis,
  stats,
  trapScore,
  riskReward,
  nupl,
  sopr30d,
  noTradeAlert,
  trapRisk,
  exitMap,
  trapDetection,
  marketBug,
  trapAlert,
  divergenceSignal,
  psychologicalSupport,
  hasGeminiContent = false,
  gptReporterAnalysis,
  grokXAnalysis,
  sosovalueArticle = null,
  integratedOptimization = null,
  whaleFlows,
  liquidations = null,
}) {
  const ts = now.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');

  const priceLine = `💰 BTC 現在価格: ${formatUsd(priceUsd)} (${formatPercent(change24h)} / 24h)`;
  const flowDir = inflow >= 0 ? 'Inflow' : 'Outflow';
  const flowAbs = Math.abs(inflow || 0);
  const flowLine = `📊 取引所ネットフロー: ${flowDir} ${flowAbs.toFixed(0)} BTC${inflow < 0 ? ' — ホルダーが資産を保持中' : ' — 売却圧力の可能性'}`;
  const mpiLine = `⛏ Miners' Position Index (MPI): ${(mpi ?? 0).toFixed(2)}`;
  const sentimentLine = `🧠 投資家センチメント: ${sentimentLabel || '不明'}`;

  const LOW_TRAP_RISK_THRESHOLD = 35;
  const effectiveTrapScore = trapDetection?.trapScore ?? trapScore ?? trapRisk?.trapRiskScore ?? null;
  const isLowTrapRisk = effectiveTrapScore != null && effectiveTrapScore < LOW_TRAP_RISK_THRESHOLD;
  const hasActiveTrapAlert = trapAlert && trapAlert.alert;

  let grokDisplaySource = grokXAnalysis;
  if (grokXAnalysis && typeof grokXAnalysis === 'object') {
    grokDisplaySource = grokXAnalysis.xEngineReport || grokXAnalysis.summary || null;
  }
  const hasGrokData = grokDisplaySource && typeof grokDisplaySource === 'string' && grokDisplaySource.trim();
  const isGrokOffline = !hasGrokData || /grok offline|live search unavailable|data unavailable/i.test(grokDisplaySource || '');

  const sentimentLabelLower = (sentimentLabel || '').toLowerCase();

  const trapSeverityForHeader = trapDetection?.trapSeverity || trapAlert?.severity || 'LOW';
  const isHighTrapForHeader = trapSeverityForHeader === 'CRITICAL' || trapSeverityForHeader === 'HIGH';

  const lines = [];
  lines.push('🌤️ Trap Defence BTC - 正規レポート');
  if (isHighTrapForHeader) {
    lines.push(`🚨 Trap Defence アラート — ${trapSeverityForHeader} トラップリスク`);
  } else {
    lines.push('📋 トラップ防御ブリーフィング');
  }
  lines.push(`📅 ${ts}`);
  lines.push('CQ × X × 3AI — 裏側構造レポート');
  lines.push('');

  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('📡 市場状態レーダー');
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  const trapScoreRadar = effectiveTrapScore != null ? Math.round(effectiveTrapScore) : null;
  const trapRiskLabelRadar = trapScoreRadar != null
    ? (trapScoreRadar < 30 ? '低リスク' : trapScoreRadar >= 50 ? '高リスク' : '中')
    : 'N/A';
  const cqRiskText = inflow >= 0
    ? '取引所流入増加 → 供給が市場へ戻る、短期売り圧力'
    : `流出 ${Math.abs(inflow || 0).toFixed(0)} BTC → ホルダーが資産を保持中`;
  const volatilityMode = sentimentLabelLower.includes('fear') || sentimentLabelLower.includes('panic') || /恐怖|パニック|恐慌/.test(sentimentLabelLower)
    ? '拡大局面（パニック主導の変動）'
    : sentimentLabelLower.includes('greed') || /強欲|ユーフォリア/.test(sentimentLabelLower) ? '拡大局面（ユーフォリア主導）' : '安定';
  const liquidityRegimeText = inflow >= 0
    ? '価格下の売り側流動性濃厚；価格上は流動性薄'
    : '買い累積；流動性再調整';
  lines.push(`• Trap Score: ${trapScoreRadar != null ? trapScoreRadar + '/100 (' + trapRiskLabelRadar + ')' : 'N/A'}`);
  lines.push(`• CQ Risk: ${cqRiskText}`);
  lines.push(`• X Sentiment: ${hasGrokData && !isGrokOffline ? '利用可能' : 'データ不足 → 「センチメント沈黙」解釈（不確実性上昇）'}`);
  lines.push('• Macro Pressure: Risk-off優位');
  lines.push(`• Liquidity Regime: ${liquidityRegimeText}`);
  lines.push(`• Volatility Mode: ${volatilityMode}`);
  lines.push('');
  lines.push('### Key Metrics');
  lines.push(`• BTC Price: ${formatUsd(priceUsd)}`);
  lines.push(`• Netflow: ${inflow >= 0 ? '+' : ''}${(inflow || 0).toFixed(0)} BTC`);
  lines.push(`• MPI: ${(mpi ?? 0).toFixed(2)}`);
  lines.push(`• Sentiment: ${sentimentLabel || '不明'}`);
  lines.push('');

  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('🔬 裏側構造');
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('');

  let gptNewsText = gptReporterAnalysis || aiAnalysis || null;
  if (gptNewsText != null && typeof gptNewsText !== "string") {
    console.warn("[REGULAR] gptNewsText is not a string (type: " + typeof gptNewsText + "), using empty");
    gptNewsText = "";
  }
  if (gptNewsText && typeof gptNewsText === 'string') {
    const errorKeywords = ['api error', 'unavailable', 'error', 'failed', 'timeout'];
    const isError = errorKeywords.some(keyword => gptNewsText.toLowerCase().includes(keyword));
    if (isError) {
      gptNewsText = null;
    } else {
      const hasJapaneseChars = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(gptNewsText);
      if (!hasJapaneseChars && gptNewsText.length > 50) {
        console.info('[Regular JA] Non-Japanese language detected in GPT analysis, using fallback');
        gptNewsText = null;
      }
    }
  }

  if (!gptNewsText || String(gptNewsText || "").trim() === '') {
    const mpiDisplay = mpi >= 0 ? `+${mpi.toFixed(2)}` : mpi.toFixed(2);
    gptNewsText = `## 2-1. Whale Intent (構造的推論)
${inflow >= 0 ? 'クジラはパニックゾーンで供給を吸収しているように見え、価格が流動性ポケットへ落ちた後に静かに累積する前に吸収している。' : 'クジラの流出はホルダーが資産を保護中であることを示唆。流出は累積または再調整を示す。'}

## 2-2. Algo Behavior Patterns
アルゴは感情的な売りで生じた薄い流動性ゾーンを活用。パターンとしては、同期的な流動性狩りの後に平均回帰が発生する—自動システムが価格リセット前に流動性を収穫。

## 2-3. Retail Psychological Distortion
リテールセンチメントは${sentimentLabel || '中立'}に支配。Xデータ不足時は「センチメント沈黙」が意味を持つ：リテールの離脱は変動性拡大に先行しがち。

## 2-4. Liquidity Map
${inflow >= 0 ? '強制売却とマイナー配布(MPI ' + mpiDisplay + ')で価格下の売り側流動性濃厚。価格上は流動性薄—流入反転で上昇モメンタム加速の可能性。' : '買い累積顕著。流動性再調整進行中。'}`;
  }
  gptNewsText = gptNewsText.replace(/(\*\*Scenario Map\*\*|## Scenario Map|Scenario Map\s*\().*$/s, '').trim();
  gptNewsText = gptNewsText.replace(/\*\*Trap Defence Value\*\*.*$/s, '').trim();
  gptNewsText = gptNewsText.replace(/\*\*Whale Intent \(structural inference( only)?\)\*\*/g, '## 2-1. Whale Intent (構造的推論)');
  gptNewsText = gptNewsText.replace(/\*\*Whale Intent\*\*(?!\s*\()/g, '## 2-1. Whale Intent');
  gptNewsText = gptNewsText.replace(/\*\*Algo Behavior Patterns\*\*/g, '## 2-2. Algo Behavior Patterns');
  gptNewsText = gptNewsText.replace(/\*\*Retail Psychological Distortion\*\*/g, '## 2-3. Retail Psychological Distortion');
  gptNewsText = gptNewsText.replace(/\*\*Liquidity Map\*\*/g, '## 2-4. Liquidity Map');
  let gptNewsDisplay = gptNewsText
    .replace(/^###\s+/gm, '')
    .replace(/^##\s+(?!2-[1-4]\.)/gm, '')
    .replace(/^#\s+(?!2-[1-4]\.)/gm, '');
  gptNewsDisplay = gptNewsDisplay.replace(/^Psychological Interpretation of On-Chain Metrics$/gm, '💡 オンチェーンメトリクスの心理的解釈');
  const gptNewsLimit = 1400;
  if (gptNewsDisplay.length > gptNewsLimit) {
    const truncated = gptNewsDisplay.slice(0, gptNewsLimit);
    const sentenceEnds = [
      truncated.lastIndexOf('. '),
      truncated.lastIndexOf('.\n'),
      truncated.lastIndexOf('! '),
      truncated.lastIndexOf('!\n'),
      truncated.lastIndexOf('? '),
      truncated.lastIndexOf('?\n'),
      truncated.lastIndexOf('\n\n'),
      truncated.lastIndexOf('\n')
    ].filter(pos => pos !== -1);
    const lastSentenceEnd = sentenceEnds.length > 0 ? Math.max(...sentenceEnds) : -1;
    if (lastSentenceEnd > gptNewsLimit * 0.5) {
      const endPos = truncated[lastSentenceEnd + 1] === ' ' ? lastSentenceEnd + 1 : lastSentenceEnd;
      gptNewsDisplay = truncated.slice(0, endPos) + '…';
    } else {
      gptNewsDisplay = truncated + '…';
    }
  }
  lines.push(gptNewsDisplay);
  lines.push('');

  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('📐 現在のBTC構造');
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  const currentStructureNote = inflow >= 0 && (sentimentLabelLower.includes('fear') || /恐怖|パニック/.test(sentimentLabelLower))
    ? 'BTCは「パニック主導の供給放出局面」。トレンド反転ではなく流動性再構成。'
    : inflow >= 0
      ? '供給が取引所へ戻る。構造はディストリビューションまたは吸収局面を示唆。'
      : 'ホルダーが資産を保護中。構造は累積または下落を示唆。';
  lines.push(`• Price: ${formatUsd(priceUsd)} (${formatPercent(change24h)} / 24h)`);
  lines.push(`• Structural meaning: ${currentStructureNote}`);
  const keyLevelsNote = inflow >= 0
    ? `• Netflow: +${Math.abs(inflow).toFixed(0)} BTC → 供給が取引所へ移動`
    : `• Netflow: −${Math.abs(inflow).toFixed(0)} BTC → ホルダーが資産を保護中`;
  lines.push(keyLevelsNote);
  lines.push('');

  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('🗺️ シナリオマップ');
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  const scenarioBullets = [];
  if (inflow > 0) {
    scenarioBullets.push(`• 供給ショック継続 — 取引所流入 ${Math.abs(inflow).toFixed(0)} BTCが売り圧力維持の可能性`);
  }
  if (mpi != null && mpi > 0.5) {
    scenarioBullets.push(`• マイナー圧力 — MPI ${mpi.toFixed(2)}がマイナー配布示唆、近い変動性リスク`);
  }
  const sentimentLower = (sentimentLabel || '').toLowerCase();
  if (sentimentLower.includes('fear') || sentimentLower.includes('panic') || /恐怖|パニック|恐慌/.test(sentimentLower)) {
    scenarioBullets.push(`• リテールパニック — ${sentimentLabel}センチメントが投げ売り・強制売却を引き起こす可能性`);
  }
  if (sentimentLower.includes('greed') || sentimentLower.includes('euphoria') || /強欲|ユーフォリア/.test(sentimentLower)) {
    scenarioBullets.push(`• リテールユーフォリア — ${sentimentLabel}センチメントが配布トラップに先行する可能性`);
  }
  if (trapDetection?.trapDetected || hasActiveTrapAlert) {
    scenarioBullets.push(`• アルゴ主導変動 — トラップ条件(${trapDetection?.trapType || '異常'})が流動性狩りを引き起こす可能性`);
  }
  scenarioBullets.push('• マクロ環境 — ETF流入、金利政策、外部ショックが構造を変化させる可能性');
  scenarioBullets.slice(0, 5).forEach(b => lines.push(b));
  lines.push('');

  // すべてのセクションで同一の Trap Score を使用して表示の不整合を防ぐ
  const trapScoreForEvidence = effectiveTrapScore;
  const trapTypeForEvidence = trapDetection?.trapType || trapAlert?.type || null;
  if (trapScoreForEvidence != null || trapDetection || trapAlert) {
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push('📊 データに基づく理由');
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    const trapScoreRounded = trapScoreForEvidence != null ? Math.round(trapScoreForEvidence) : null;
    const isLowTrap = trapScoreRounded != null && trapScoreRounded < 30;
    const isHighTrap = trapScoreRounded != null && trapScoreRounded >= 50;
    if (trapScoreForEvidence != null) {
      if (isHighTrap) {
        lines.push(`🎯 Trap Score ${trapScoreRounded}/100 → トラップリスク高`);
        if (trapTypeForEvidence) lines.push(`⚠️ ${(trapTypeForEvidence || '').replace(/_/g, ' ')} 検知`);
        lines.push(`• ネットフロー急増 → 取引所への供給流入`);
        lines.push(`• マイナーMPI上昇 → ディストリビューション圧力`);
        lines.push(`• 極端な恐怖＋価格乖離 → 典型的なトラップセットアップ`);
      } else if (isLowTrap) {
        lines.push(`✅ Trap Score ${trapScoreRounded}/100 → 低トラップリスク`);
        lines.push(`• 構造は流動性狩り圧力の軽減を示唆`);
      } else {
        lines.push(`⚡ Trap Score ${trapScoreRounded}/100 → 中程度警戒`);
        lines.push(`• 混在構造 — 流動性条件不明瞭`);
      }
    } else if (trapDetection?.trapDetected) {
      const trapTypeText = (trapDetection.trapType || '異常').replace(/_/g, ' ');
      lines.push(`🎯 ${trapTypeText} (スコア: ${(trapDetection.trapScore || 0).toFixed(0)}/100)`);
      lines.push(`• オンチェーン異常検出 — 構造が高トラップ条件を示唆`);
    } else if (trapAlert?.alert) {
      const alertTypeText = (trapAlert.type || 'UNKNOWN').replace(/_/g, '-');
      lines.push(`🚨 ${alertTypeText} (深刻度: ${trapAlert.severity})`);
      lines.push(`• 構造が高トラップリスクを示唆`);
    }
    lines.push('');
  }

  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('💊 心理インサイト (Dr. Grok)');
  lines.push('━━━━━━━━━━━━━━━━━━━━');

  if (hasGrokData && !isGrokOffline) {
    if (hasJapanese(grokDisplaySource)) {
      const grokXLimit = 600;
      let grokXDisplay = grokDisplaySource;
      if (grokDisplaySource.length > grokXLimit) {
        const truncated = grokDisplaySource.slice(0, grokXLimit);
        const lastSentenceEnd = Math.max(
          truncated.lastIndexOf('.'),
          truncated.lastIndexOf('!'),
          truncated.lastIndexOf('?'),
          truncated.lastIndexOf('\n')
        );
        if (lastSentenceEnd > grokXLimit * 0.7) {
          grokXDisplay = truncated.slice(0, lastSentenceEnd + 1) + '…';
        } else {
          grokXDisplay = truncated + '…';
        }
      }
      lines.push(`📱 X Sentiment: ${grokXDisplay}`);
      lines.push('');
    } else {
      console.info('[Regular JA] 日本語以外検出 in grokXAnalysis, skipping');
    }
  }
  if (!hasGrokData || isGrokOffline) {
    lines.push('📱 X Sentiment: 「センチメント沈黙」 — データ不足が意味を持つ。恐怖でリテールが凍結するとポストが減る。市場は心理的真空に入る—アルゴがより自由に動く条件。');
    lines.push('');
  }

  if (psychologicalSupport && psychologicalSupport.psychologicalState !== 'UNKNOWN') {
    const stateEmoji = psychologicalSupport.psychologicalState === 'FOMO' ? '😰' :
                       psychologicalSupport.psychologicalState === 'FEAR' ? '😨' :
                       psychologicalSupport.psychologicalState === 'GREED' ? '😍' :
                       psychologicalSupport.psychologicalState === 'PANIC' ? '😱' :
                       psychologicalSupport.psychologicalState === 'EUPHORIA' ? '😄' :
                       psychologicalSupport.psychologicalState === 'CONFUSION' ? '🤔' : '😐';
    const riskEmoji = psychologicalSupport.psychologicalRisk === 'CRITICAL' ? '🚨' :
                      psychologicalSupport.psychologicalRisk === 'HIGH' ? '⚠️' :
                      psychologicalSupport.psychologicalRisk === 'MEDIUM' ? '⚡' : '💡';
    const isNeutralLow = psychologicalSupport.psychologicalState === 'NEUTRAL' && psychologicalSupport.psychologicalRisk === 'LOW';
    lines.push(isNeutralLow
      ? '心理状態: 中立 (低リスク)'
      : `💚 心理状態: ${stateEmoji} ${psychologicalSupport.psychologicalState} (リスク: ${riskEmoji} ${psychologicalSupport.psychologicalRisk})`);
    const rawAdvice = psychologicalSupport.psychologicalAdvice || '';
    const advHasJapanese = hasJapanese(rawAdvice);
    const jaAdvice = getJapanesePsychologicalAdvice(psychologicalSupport.psychologicalState, psychologicalSupport.psychologicalRisk);
    // Regular JA: NEUTRAL/LOW 時はだ/である調を維持するため常に jaAdvice を使用
    const adviceLine = (psychologicalSupport.psychologicalState === 'NEUTRAL' && psychologicalSupport.psychologicalRisk === 'LOW')
      ? jaAdvice : (advHasJapanese ? (rawAdvice.slice(0, 80) + (rawAdvice.length > 80 ? '…' : '')) : jaAdvice);
    lines.push(`   💡 ${adviceLine}`);
    let mentalNote = '';
    if (psychologicalSupport.psychologicalState === 'FOMO' && psychologicalSupport.psychologicalRisk === 'CRITICAL') {
      mentalNote = 'ドーパミン発火＝トラップ。3回深呼吸。追いかける衝動＝化学反応、洞察ではない。プルバックを待て。';
    } else if (psychologicalSupport.psychologicalState === 'FEAR') {
      mentalNote = '恐怖は守るが麻痺も招く。感情よりデータを確認。';
    } else if (psychologicalSupport.psychologicalState === 'GREED') {
      mentalNote = 'ユーフォリア＝トラップ。まず資本を守れ。';
    } else if (psychologicalSupport.psychologicalState === 'PANIC') {
      mentalNote = '止まれ。息をしろ。データは一時的。パニックで決断するな。';
    } else if (psychologicalSupport.psychologicalState === 'NEUTRAL' && psychologicalSupport.psychologicalRisk === 'CRITICAL') {
      mentalNote = '退屈耐性＞レバレッジ。今日は画面を閉じろ。';
    } else if (psychologicalSupport.psychologicalState === 'EUPHORIA') {
      mentalNote = '祝賀＝トラップ設置中。規律を維持。';
    } else if (psychologicalSupport.psychologicalState === 'CONFUSION') {
      mentalNote = '無理にトレードするな。迷ったら待て。';
    } else {
      mentalNote = '忍耐＝戦略的強さ。最高のトレーダーは「取引しない時」を知っている。';
    }
    lines.push(`💊 Dr. Grokのメンタルノート: "${mentalNote}"`);
  } else {
    lines.push('心理状態: 中立 (低リスク)');
    lines.push('   💡 市場条件は比較的安定。規律を維持。');
    lines.push('💊 Dr. Grokのメンタルノート: "忍耐＝戦略的強さ。最高のトレーダーは取引しない時を知っている。"');
  }

  lines.push('');

  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('💎 Trap Defence価値');
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('');
  lines.push('• 構造的明確性 — 裏側の可視性 (Whale / Algo / Retail / Liquidity)');
  lines.push('• 心理インサイト — リテール心理診断');
  lines.push('• CQ × X × 3AI統合 — 市場メカニズムの統合分析');
  lines.push('');

  lines.push('📋 本日の要点');
  const structureSummaryJa = inflow >= 0 ? '取引所流入 → 短期売り圧力' : '流出 → ホルダーが資産を保持';
  lines.push(`• 構造: ${structureSummaryJa}`);
  const displayTrapScore = effectiveTrapScore;
  if (displayTrapScore != null && displayTrapScore >= 0) {
    const trapScoreRounded = Math.round(displayTrapScore);
    const trapRiskTierJa = displayTrapScore >= 60 ? '高' : displayTrapScore >= 40 ? '中' : '低';
    lines.push(`• トラップリスク: ${trapRiskTierJa} (${trapScoreRounded}/100)`);
    const actionLineJa = displayTrapScore >= 60 ? 'エクスポージャーを減らす。新規エントリーは控える。' : displayTrapScore >= 40 ? '注意を保ち、レバレッジは避ける。' : '構造は支えている。忍耐が報われる。';
    lines.push(`• アクション: ${actionLineJa}`);
  } else {
    lines.push('• トラップリスク: N/A');
    lines.push('• アクション: 規律を保ち、状況が明確になるまで待つ。');
  }
  lines.push('');

  if (exitMap && exitMap.hasActivePosition) {
    lines.push('');
    lines.push('🗺️ エグジットマップ（撤退マップ）');
    lines.push(`   ポジション状態: ${exitMap.positionStatus}`);
    if (exitMap.unrealizedPnlPct !== 0) {
      const pnlEmoji = exitMap.unrealizedPnlPct > 0 ? '📈' : '📉';
      lines.push(`   ${pnlEmoji} 未実現P&L: ${exitMap.unrealizedPnlPct > 0 ? '+' : ''}${exitMap.unrealizedPnlPct.toFixed(2)}% ($${exitMap.unrealizedPnl.toLocaleString()})`);
    }
    if (exitMap.exitMap.zones && exitMap.exitMap.zones.length > 0) {
      lines.push('   📍 利確ゾーン:');
      const highPriorityZones = exitMap.exitMap.zones.filter(zone => zone.priority === 'HIGH').slice(0, 2);
      (highPriorityZones.length > 0 ? highPriorityZones : exitMap.exitMap.zones.slice(0, 2)).forEach(zone => {
        lines.push(`   🔴 ゾーン${zone.zone}: $${zone.price.toLocaleString()} (${zone.takeProfitPct}%利確)`);
      });
    }
    if (exitMap.exitMap.exitConditions && exitMap.exitMap.exitConditions.length > 0) {
      lines.push('   ⚠️ 撤退条件:');
      const criticalConditions = exitMap.exitMap.exitConditions
        .filter(condition => condition.priority === 'CRITICAL' || condition.priority === 'HIGH')
        .slice(0, 2);
      (criticalConditions.length > 0 ? criticalConditions : exitMap.exitMap.exitConditions.slice(0, 2)).forEach(condition => {
        const priorityEmoji = condition.priority === 'CRITICAL' ? '🚨' : '⚠️';
        lines.push(`   ${priorityEmoji} ${condition.condition}`);
      });
    }
    if (exitMap.exitMap.recommendation) {
      lines.push(`   💡 ${exitMap.exitMap.recommendation}`);
    }
  }

  lines.push('');
  lines.push('本情報は教育目的で提供されるものであり、投資助言・金融商品の勧誘を行うものではありません。');

  return lines.join('\n');
}

module.exports = { formatRegularBriefing };
