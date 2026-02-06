// Tier1 BTC regular briefing (JP)
// services/telegram/messages/user/ja/regular.ja.js

const { hasJapanese, filterJapaneseFromArray, cleanTimingInfo, hasJapaneseInPsychologicalInsights, formatViralScore } = require('../../shared/contentFilters');

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
 * EN版 getEnglishPsychologicalAdvice と同構造
 */
function getJapanesePsychologicalAdvice(psychologicalState, psychologicalRisk) {
  if (psychologicalState === 'NEUTRAL' && psychologicalRisk === 'LOW') {
    return '✅ 中立状態 - メンタルブロック未検出: 市場センチメントはバランスが取れています。極端な感情は検出されていません。条件は安定しています。';
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

function formatRegularBriefing({
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
  stats, // reserved
  trapScore, // Phase 2: トラップスコア（ENと同様）
  riskReward, // Phase 2: JA市場専用
  nupl, // Phase 2: JA市場専用
  sopr30d, // Phase 2: JA市場専用
  // Phase1-Product: 新機能データ
  noTradeAlert, // NO TRADEアラート結果
  trapRisk, // Trap Riskスコア結果
  exitMap, // Exit Map結果
  // USP1: トラップ防御結果
  trapDetection, // トラップ検知結果（優先）
  marketBug, // トラップ防御結果（後方互換性）
  trapAlert, // トラップアラート
  divergenceSignal, // ダイバージェンスシグナル
  // USP3: Dr. Grokの心理的サポート
  psychologicalSupport, // 心理的サポート診断結果
  // USP2: Geminiコンテンツ生成
  hasGeminiContent = false, // Gemini画像・動画が生成されたかどうか
  // ニュース番組構造用パラメータ
  gptReporterAnalysis, // GPTリポーターのトラップニュース分析（CryptoQuantデータ解析）
  grokXAnalysis, // Grok X解析結果（Xセンチメント分析）
  sosovalueArticle = null, // Gemini: CQ+過去比較SoSoValue風記事
  integratedOptimization = null, // 廃止
  // Phase 2: 市場別深掘りデータ
  whaleFlows, // Whale Flows（ENと同様）
  liquidations = null, // ENと同様（24h清算データ）
}) {
  const ts = now.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');

  const priceLine = `💰 BTC 現在価格: ${formatUsd(priceUsd)} (${formatPercent(change24h)} / 24h)`;

  const flowDir = inflow >= 0 ? 'Inflow' : 'Outflow';
  const flowAbs = Math.abs(inflow || 0);
  let flowLine = '';
  if (inflow < 0) {
    // 流出の場合：ポジティブなシグナルとして表現
    flowLine = `📊 取引所ネットフロー: Outflow ${flowAbs.toFixed(0)} BTC — ホルダーが資産を保持中`;
  } else if (inflow > 0) {
    // 流入の場合：注意喚起として表現
    flowLine = `📊 取引所ネットフロー: Inflow ${flowAbs.toFixed(0)} BTC — 売却圧力の可能性`;
  } else {
    flowLine = `📊 取引所ネットフロー: 均衡状態`;
  }

  const mpiLine = `⛏ Miners' Position Index (MPI): ${(mpi ?? 0).toFixed(2)}`;
  const sentimentLine = `🧠 投資家センチメント: *${sentimentLabel || '不明'}*`;

  // Market Scoreの解釈補助を追加
  const marketScore = Math.round(score ?? 0);
  let scoreInterpretation = '';
  if (marketScore >= 50) {
    scoreInterpretation = ' (強気)';
  } else if (marketScore >= 20) {
    scoreInterpretation = ' (中立/安定)';
  } else if (marketScore >= -20) {
    scoreInterpretation = ' (中立/安定)';
  } else if (marketScore >= -50) {
    scoreInterpretation = ' (弱気)';
  } else {
    scoreInterpretation = ' (非常に弱気)';
  }
  const scoreLine = `📈 マーケットスコア: ${marketScore}/100${scoreInterpretation}`;

  // 低トラップ判定: ポジション・レバレッジ検討の可否（閾値 35）
  const LOW_TRAP_RISK_THRESHOLD = 35;
  const effectiveTrapScore = trapDetection?.trapScore ?? trapScore ?? trapRisk?.trapRiskScore ?? null;
  const isLowTrapRisk = effectiveTrapScore != null && effectiveTrapScore < LOW_TRAP_RISK_THRESHOLD;
  const hasActiveTrapAlert = trapAlert && trapAlert.alert;

  let trapLine = '✅ トラップ検知: 重大なトラップは検知されていません';
  if (trapDetection && trapDetection.trapDetected) {
    const trapSev = trapDetection.trapSeverity || 'NONE';
    const trapSc = trapDetection.trapScore || 0;
    if (trapSev !== 'NONE' && trapSc > 0) {
      const trapEmoji = trapSev === 'CRITICAL' ? '🚨' : trapSev === 'HIGH' ? '⚠️' : trapSev === 'MEDIUM' ? '⚡' : '💡';
      const trapTypeLabel = (trapDetection.trapType || 'トラップ').replace(/_/g, ' ');
      trapLine = `${trapEmoji} トラップ検知: ${trapTypeLabel} (深刻度: ${trapSev}, スコア: ${trapSc}/100)`;
    }
  } else if (trap?.isTrap) {
    trapLine = `🧨 トラップ検知: ${trap.label || 'トラップの可能性'} (${trap.confidence} 信頼度)`;
  }

  let dirEmoji;
  let dirLabel;
  if (hasActiveTrapAlert) {
    dirEmoji = trapAlert.severity === 'CRITICAL' ? '🚨' :
               trapAlert.severity === 'HIGH' ? '⚠️' :
               trapAlert.severity === 'MEDIUM' ? '⚡' : '🛡️';
    if (trapAlert.recommendation === 'AVOID_LONG') {
      dirLabel = '🛡️ トラップアラート: ロング回避推奨';
    } else if (trapAlert.recommendation === 'AVOID_SHORT') {
      dirLabel = '🛡️ トラップアラート: ショート回避推奨';
    } else {
      dirLabel = '🛡️ トラップアラート: 待機推奨';
    }
  } else if (isLowTrapRisk) {
    dirEmoji = '📐';
    dirLabel = '低トラップリスク — ポジション検討の窓';
  } else {
    dirEmoji = '🛡️';
    dirLabel = 'TRAP STANDBY (Defense Active)';
  }

  const isPositioningWindow = isLowTrapRisk && !hasActiveTrapAlert;
  const entryLine = isPositioningWindow
    ? `• 想定エントリー: 優位性が明確なときに質の高いセットアップを検討（参考価格 ${formatUsd(priceUsd)}）`
    : (!isLowTrapRisk && !hasActiveTrapAlert
      ? '• 想定エントリー: 勝利の準備中 — 明確なトリガーを待機'
      : `• 想定エントリー（スポット参考）: ${formatUsd(priceUsd)}`);
  const tpLine = isPositioningWindow
    ? '• Take Profit: エントリー前に水準を設定'
    : (tradeSignal?.tp != null ? `• Take Profit: ${formatUsd(tradeSignal.tp)}` : '• Take Profit: TBD (決定待ち)');
  const slLine = isPositioningWindow
    ? '• Stop Loss: エントリー前に設定'
    : (tradeSignal?.sl != null ? `• Stop Loss: ${formatUsd(tradeSignal.sl)}` : '• Stop Loss: TBD (決定待ち)');
  const rrLine = tradeSignal?.rr != null ? `• リスクリワード (RR): ${tradeSignal.rr.toFixed(2)}` : (isPositioningWindow ? '• リスクリワード (RR): セットアップごとに設定' : '• リスクリワード (RR): 待機中');

  const modeLine = isPositioningWindow
    ? '• モード: 低トラップリスク — リスクを決めた上でロング/ショート・レバレッジを検討可。優位性が明確なときのみレバレッジ。'
    : (!isLowTrapRisk ? '• モード: Trap Standby — 明確な優位性が出るまで待機。守りを優先' : '');

  const raw = typeof aiAnalysis === 'string' ? aiAnalysis.trim() : '';
  const isOffline = !raw || /grok offline/i.test(raw) || /Live Search unavailable/i.test(raw);
  let grokText = raw;

  const GROK_LIMIT = 1500;
  if (!grokText || isOffline) {
    grokText = 'Grokは現在オフラインです（オンチェーン/価格データのみで判定中）。';
  } else if (grokText.length > GROK_LIMIT) {
    grokText = `${grokText.slice(0, GROK_LIMIT)}…`;
  }

  const lines = [];
  lines.push('🌤️ Trap Defence BTC - 有料レポート');
  const trapSeverityForHeader = trapDetection?.trapSeverity || trapAlert?.severity || 'LOW';
  const isHighTrapForHeader = trapSeverityForHeader === 'CRITICAL' || trapSeverityForHeader === 'HIGH';
  if (isHighTrapForHeader) {
    lines.push(`🚨 トラップ防御アラート — ${trapSeverityForHeader} トラップリスク`);
  } else {
    lines.push('📋 トラップ防御ブリーフィング');
  }
  lines.push(`📅 ${ts}`);
  lines.push('');

  lines.push('🎯 トレード・ヴァーディクト');
  lines.push(`${dirEmoji} シグナル: ${dirLabel}`);
  lines.push(entryLine);
  if (modeLine) lines.push(modeLine);
  if (tpLine) lines.push(tpLine);
  if (slLine) lines.push(slLine);
  if (rrLine) lines.push(rrLine);
  lines.push('');

  let actionPreview = '';
  if (sosovalueArticle && typeof sosovalueArticle === 'string' && sosovalueArticle.trim()) {
    const firstSentence = sosovalueArticle.trim().split(/[.\n。\n]/)[0].trim();
    actionPreview = firstSentence.length > 120 ? firstSentence.slice(0, 117) + '…' : firstSentence;
    if (actionPreview) {
      lines.push('📌 あなたの一手: ' + actionPreview);
      lines.push('');
    }
  }

  if (score <= 25 && inflow > 0 && sentimentLabel.toLowerCase().includes('fear')) {
    const whaleRatioEstimate = Math.min(100, Math.max(0, (inflow / 1000) * 10 + 40));
    const contextNote = whaleRatioEstimate >= 80
      ? '流入の多くが売り圧力に転じる可能性があります。リスク管理のため注視してください。'
      : '流入の相当部分が大口関連の可能性があります。リスク管理のため注視してください。';
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push('📊 コンテキスト');
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push(`マーケットスコア: ${Math.round(score)}/100${scoreInterpretation}`);
    lines.push(`取引所ネットフロー: +${Math.abs(inflow).toFixed(0)} BTC 流入`);
    lines.push(`センチメント: ${sentimentLabel}`);
    lines.push('');
    lines.push(contextNote);
    lines.push('');
  }

  lines.push('✨ 本日のハイライト');
  lines.push('');
  const trapData = trapDetection || marketBug;
  const trapOneLine = trapData && (trapData.trapDetected || trapData.bugDetected)
    ? `🛡️ トラップ: ${(trapData.trapType || trapData.bugType || '異常').replace(/_/g, ' ')} (${Math.round(trapData.trapScore || trapData.bugScore || 0)}/100)`
    : '🛡️ トラップ: 検知なし';
  const trapRiskLabel = isLowTrapRisk ? '低' : (effectiveTrapScore != null && effectiveTrapScore >= 50 ? '高' : '中');
  const cqOneLine = inflow >= 0
    ? `📊 CQ: ネットフロー +${Math.abs(inflow).toFixed(0)} BTC。トラップリスク${trapRiskLabel}。`
    : `📊 CQ: ネットフロー −${Math.abs(inflow).toFixed(0)} BTC。トラップリスク${trapRiskLabel}。`;
  lines.push(trapOneLine);
  lines.push(cqOneLine);
  lines.push(`📌 アクション: ${actionPreview || '明確な優位性が出るまで待機。'}`);
  lines.push('');

  // ===== 【ニュース番組構造】データ → 解説 → コメンテーター =====
  
  // GPTリポーター: CryptoQuantデータ解析に基づくトラップニュース
  // エラーメッセージやnullの場合は、フォールバック処理
  let gptNewsText = gptReporterAnalysis || aiAnalysis || null;
  
  // エラーメッセージを検出（API error, unavailable, error等のキーワード）
  if (gptNewsText && typeof gptNewsText === 'string') {
    const errorKeywords = ['api error', 'unavailable', 'error', 'failed', 'timeout'];
    const isError = errorKeywords.some(keyword => 
      gptNewsText.toLowerCase().includes(keyword)
    );
    if (isError) {
      gptNewsText = null; // エラーメッセージの場合はnullに設定してフォールバック
    } else {
      // JA市場用: 英文が混入している場合を検出（日本語文字が含まれていない場合は英文と判断）
      const hasJapaneseChars = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(gptNewsText);
      if (!hasJapaneseChars && gptNewsText.length > 50) {
        // 英文が混入している場合はnullに設定して日本語フォールバックを使用
        gptNewsText = null;
      }
    }
  }
  
  // フォールバック: GPT分析が利用できない場合の代替メッセージ
  if (!gptNewsText || gptNewsText.trim() === '') {
    // CryptoQuantデータから基本的な分析を生成
    const inflowDisplay = inflow >= 0 ? `流入 ${Math.abs(inflow).toFixed(0)} BTC` : `流出 ${Math.abs(inflow).toFixed(0)} BTC`;
    const mpiDisplay = mpi >= 0 ? `+${mpi.toFixed(2)}` : mpi.toFixed(2);
    const priceChangeDisplay = change24h >= 0 ? `+${change24h.toFixed(2)}%` : `${change24h.toFixed(2)}%`;
    
    // COO最適化: ストーリーテリング改善
    gptNewsText = `📖 データの背後にある物語

あなたが眠っている間、クジラはポジショニング中。今まさに起きていること:

1. 🏦 取引所流入: ${inflowDisplay}
   → ${inflow >= 0 ? '売り手が蓄積中。これは正常ではありません。' : 'ホルダーが資産を保護中。これは強気です。'}

2. ⛏️ マイナー${mpi >= 0 ? '売却中' : '保有中'}: MPI ${mpiDisplay}
   → ${mpi >= 0 ? 'マイナーが売却中。これは短期で弱気です。' : 'マイナーは売却していません。これは長期で強気です。'}

3. 🧠 ${sentimentLabel}センチメント
   → ${sentimentLabel.toLowerCase().includes('fear') ? '小口投資家のパニック。これは賢い資金にとっての機会です。' : sentimentLabel.toLowerCase().includes('greed') ? '小口投資家のユーフォリア。これは遅れて買う人にとってのリスクです。' : '中立条件。警戒を維持。'}

💡 心理的解釈:

CryptoQuantデータは、${inflowDisplay}、マイナーズポジションインデックス（MPI）${mpiDisplay}、${sentimentLabel.toLowerCase()}センチメントを示しており、価格は24時間で${priceChangeDisplay}変動しました。

心理的観点から、これらのメトリクスは${sentimentLabel.toLowerCase()}市場環境を示唆しています。${inflow >= 0 ? '流入' : '流出'}は、${inflow >= 0 ? 'より多くの暗号通貨が取引所に流入している' : 'より多くの暗号通貨が取引所から流出している'}ことを示しており、これはしばしば${inflow >= 0 ? '潜在的な売却圧力' : 'ホルダーが取引所外で資産を保護している'}を意味します。

${score <= 25 && inflow > 0 ? '⚠️ 矛盾: 低リスクスコアなのに高い売り圧力。これはまさにトラップが形成される時です。警戒を維持してください。' : '市場は待機モードにあり、トレーダーは条件を慎重に監視しています。'}

▼ 市場コンテキスト

${sentimentLabel.toLowerCase()}センチメントは、${sentimentLabel === 'Neutral' ? 'トレーダー間で恐怖や貪欲などの強い感情的ドライバーが不足している' : sentimentLabel === 'Greed' ? '楽観的な市場状況だが潜在的な過度な拡張' : '慎重な市場状況'}を反映しています。これは、トレーダーが条件を慎重に監視している待機モードの市場を示唆しています。`;
  }
  
  // Telegram互換性: Markdown見出し（###）を削除してTelegramネイティブな形式に変換（先に実行）
  let gptNewsDisplay = gptNewsText
    .replace(/^###\s+/gm, '') // ###見出しを削除
    .replace(/^##\s+/gm, '')   // ##見出しを削除
    .replace(/^#\s+/gm, '');   // #見出しを削除
  // プレーンテキストの見出しも改善（「オンチェーンメトリクスの心理的解釈」など）
  gptNewsDisplay = gptNewsDisplay.replace(/^オンチェーンメトリクスの心理的解釈$/gm, '💡 オンチェーンメトリクスの心理的解釈');
  
  // 要約1行＋短めの本文で全体長を抑える（420文字まで）
  const gptNewsLimit = 420;
  if (gptNewsDisplay.length > gptNewsLimit) {
    // 文の終わりで切るようにする（最後の文の終わりを探す）
    const truncated = gptNewsDisplay.slice(0, gptNewsLimit);
    // 文の終わりを探す（ピリオド、感嘆符、疑問符、改行）
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
    
    // 文の終わりが見つかった場合、その位置で切る（50%以上の場合のみ）
    if (lastSentenceEnd > gptNewsLimit * 0.5) {
      // 文の終わりの後にスペースがある場合は、その位置で切る
      const endPos = truncated[lastSentenceEnd + 1] === ' ' ? lastSentenceEnd + 1 : lastSentenceEnd;
      gptNewsDisplay = truncated.slice(0, endPos) + '…';
    } else {
      // 文の終わりが見つからない場合、単純に切る
      gptNewsDisplay = truncated + '…';
    }
  }
  
  // モバイル最適化: 冒頭に1行の要約を追加（100点満点への最後の仕上げ）
  // トラップ検出状況に基づいて要約を生成
  const trapDataForSummary = trapDetection || marketBug;
  const hasTrapForSummary = trapDataForSummary && (trapDataForSummary.trapDetected || trapDataForSummary.bugDetected);
  const trapTypeForSummary = trapDataForSummary?.trapType || trapDataForSummary?.bugType || '';
  const trapSeverityForSummary = trapDataForSummary?.trapSeverity || trapDataForSummary?.bugSeverity || 'NONE';
  
  let summaryLine = '';
  if (hasTrapForSummary && trapSeverityForSummary !== 'NONE') {
    const trapTypeDisplay = trapTypeForSummary.replace(/_/g, ' ');
    // Telegram Markdownでは [text] がリンクとして解釈されるため、[Summary]ではなく Summary: を使用
    summaryLine = `📰 要約: オンチェーンメトリクスは「待機モード」を示しています。${trapTypeDisplay}は安定した価格にもかかわらず、隠れたトラップを示唆しています。`;
  } else {
    summaryLine = `📰 要約: オンチェーンメトリクスは「待機モード」を示しています。データはクリーンですが、油断は禁物です。`;
  }
  lines.push(summaryLine);
  lines.push('');
  
  // 詳細な分析を表示
  lines.push(`📰 ${gptNewsDisplay}`);
  lines.push('');

  // ===== EN版と同一構成: hasGeminiContent → sosovalueArticle → Data-Backed =====
  if (hasGeminiContent) {
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push('📊 【Data Presentation】NanoBananaインフォグラフィック');
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push('🎬 添付画像/動画をチェック！');
    lines.push('');
  }
  if (sosovalueArticle) {
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push('📰 オンチェーン示唆（CQ＋過去コンテキスト）');
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push(sosovalueArticle);
    lines.push('');
  }
  // Data-Backed Reasons（ENと同一ロジック）
  let trapScoreForEvidence = null;
  if (trapDetection && trapDetection.trapScore != null && trapDetection.trapScore > 0) {
    trapScoreForEvidence = trapDetection.trapScore;
  } else if (trapScore != null && trapScore > 0) {
    trapScoreForEvidence = trapScore;
  } else if (trapRisk && trapRisk.trapRiskScore != null && trapRisk.trapRiskScore > 0) {
    trapScoreForEvidence = trapRisk.trapRiskScore;
  }
  const trapTypeForEvidence = trapDetection?.trapType || trapAlert?.type || null;
  if (trapScoreForEvidence !== null || trapDetection || trapAlert) {
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push('📊 データに基づく理由');
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    const trapScoreRounded = trapScoreForEvidence != null ? Math.round(trapScoreForEvidence) : (trapDetection?.trapScore != null ? Math.round(trapDetection.trapScore) : 0);
    const isLowTrap = trapScoreRounded < 30;
    const isHighTrap = trapScoreRounded >= 50;
    if (trapScoreForEvidence !== null) {
      if (isHighTrap) {
        lines.push(`🎯 トラップスコア ${trapScoreRounded}/100 → トラップリスク高`);
        if (trapTypeForEvidence) lines.push(`⚠️ ${(trapTypeForEvidence || '').replace(/_/g, ' ')} 検知`);
        lines.push(`💡 待機推奨。今のエントリーはトラップに巻き込まれる可能性あり。`);
      } else if (isLowTrap) {
        lines.push(`✅ トラップスコア ${trapScoreRounded}/100 → 低トラップリスク`);
        lines.push(`📐 ポジション検討の窓 — 優位性が明確なときはロング/ショート・レバレッジをリスク決済の上で検討可。`);
      } else {
        lines.push(`⚡ トラップスコア ${trapScoreRounded}/100 → 要警戒`);
        lines.push(`💡 確認を待ってから動こう。`);
      }
    } else if (trapDetection?.trapDetected) {
      const trapTypeText = (trapDetection.trapType || '異常').replace(/_/g, ' ');
      lines.push(`🎯 ${trapTypeText} (スコア: ${(trapDetection.trapScore || 0).toFixed(0)}/100)`);
      lines.push(`💡 オンチェーン異常により待機推奨。`);
    } else if (trapAlert?.alert) {
      const alertTypeText = (trapAlert.type || 'UNKNOWN').replace(/_/g, '-');
      lines.push(`🚨 ${alertTypeText} (深刻度: ${trapAlert.severity})`);
      lines.push(`💡 明確な優位性が出るまで守りを優先。`);
    }
    lines.push('');
  }
  
  // 【コメンテーター】Dr. Grok（ENと同一: 区切り線）
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('💊 Dr. Grokのクイックインサイト');
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  
  // Grok X解析: JAは日本語含む場合のみ表示（ENと同一方針・言語逆）
  if (grokXAnalysis && typeof grokXAnalysis === 'string' && grokXAnalysis.trim()) {
    if (hasJapanese(grokXAnalysis)) {
      const grokXLimit = 600;
      let grokXDisplay = grokXAnalysis;
      if (grokXAnalysis.length > grokXLimit) {
        const truncated = grokXAnalysis.slice(0, grokXLimit);
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
      lines.push(`📱 Xセンチメント分析: ${grokXDisplay}`);
      lines.push('');
    } else {
      console.warn('[Regular JA] 英語のみ検出 in grokXAnalysis, skipping');
    }
  }
  
  // Dr. Grokの心理的サポート（ENと同様: 誤言語時フォールバック＋固定Mental Note）
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
    lines.push(`💚 心理状態: ${stateEmoji} ${psychologicalSupport.psychologicalState} (リスク: ${riskEmoji} ${psychologicalSupport.psychologicalRisk})`);
    if (psychologicalSupport.psychologicalAdvice) {
      const advHasJapanese = hasJapanese(psychologicalSupport.psychologicalAdvice);
      if (!advHasJapanese) {
        const jaAdvice = getJapanesePsychologicalAdvice(
          psychologicalSupport.psychologicalState,
          psychologicalSupport.psychologicalRisk
        );
        if (jaAdvice) lines.push(`   💡 ${jaAdvice}`);
      } else {
        lines.push(`   💡 ${psychologicalSupport.psychologicalAdvice}`);
      }
    }
    lines.push('');
    lines.push('');
    let mentalNote = '';
    if (psychologicalSupport.psychologicalState === 'FOMO' && psychologicalSupport.psychologicalRisk === 'CRITICAL') {
      mentalNote = '今、脳のドーパミン系が強く反応している。これがトラップだ。3回深呼吸しろ。追いかける衝動は洞察ではない—化学反応だ。プルバックを待て。';
    } else if (psychologicalSupport.psychologicalState === 'FEAR') {
      mentalNote = '恐怖はあなたを守っているが、麻痺も招く。市場は崩壊していない—正常なボラティリティだ。感情ではなくデータを確認しろ。';
    } else if (psychologicalSupport.psychologicalState === 'GREED') {
      mentalNote = '強欲はドーパミン過多だ。脳はもっと欲しがるが、市場は待てと言っている。このユーフォリアはトラップだ。まず資本を守れ。';
    } else if (psychologicalSupport.psychologicalState === 'PANIC') {
      mentalNote = 'パニックは扁桃体が前頭前皮質を乗っ取っている状態。止まれ。息をしろ。データは一時的だと示している。パニックモードで決断するな。';
    } else if (psychologicalSupport.psychologicalState === 'NEUTRAL' && psychologicalSupport.psychologicalRisk === 'CRITICAL') {
      mentalNote = '退屈耐性はレバレッジより強力な武器だ。今日は画面を閉じる勇気を持て。この「中立」センチメントはトラップ条件を隠している可能性がある。';
    } else if (psychologicalSupport.psychologicalState === 'EUPHORIA') {
      mentalNote = 'ユーフォリアは市場がリスクを忘れさせる手段。みんなが祝っているときこそトラップが仕掛けられる。規律を維持しろ。';
    } else if (psychologicalSupport.psychologicalState === 'CONFUSION') {
      mentalNote = '混乱は脳が明確さを求めている状態。無理にトレードするな。迷ったら待て。市場は準備ができたら姿を見せる。';
    } else {
      mentalNote = '忍耐は弱さではない—戦略的な強さだ。最高のトレーダーは、取引しない時を知っている。';
    }
    if (mentalNote) {
      lines.push(`💊 Dr. Grokのメンタルノート:`);
      lines.push(`"${mentalNote}"`);
    }
  } else {
    lines.push('💚 心理状態: 😐 NEUTRAL (リスク: 💡 低)');
    lines.push('');
    lines.push('   💡 市場条件は比較的安定。規律を維持。');
    lines.push('');
    lines.push('💊 Dr. Grokのメンタルノート:');
    lines.push('"忍耐は弱さではない—戦略的な強さだ。最高のトレーダーは、取引しない時を知っている。"');
  }
  
  lines.push('');
  
  // 有料版の価値（簡潔に）
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('💎 これがこのレポートに支払った理由です');
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('');
  lines.push('🎯 アクションシグナル（AVOID-LONG/SHORT、STANDBY）＋エグジットマップ＋NO TRADEアラート');
  lines.push('📊 完全なCQ分析＋トラップ検知＋Xセンチメント（Dr. Grok）');
  lines.push('💊 メンタルコーチング＆心理状態診断');
  lines.push('');
  lines.push('🛡️ 1つの見逃したシグナル = 失われた資本。');
  lines.push('');
  
  // ===== 基本市場データ（スキャンしやすい1ブロック） =====
  lines.push('📋 スナップショット');
  lines.push(priceLine);
  lines.push(flowLine);
  lines.push(mpiLine);
  lines.push(sentimentLine);
  lines.push(scoreLine);
  lines.push('');

  // Trap Score表示（ENと同一）
  let displayTrapScore = null;
  if (trapDetection && trapDetection.trapScore != null && trapDetection.trapScore >= 0) {
    displayTrapScore = trapDetection.trapScore;
  } else if (trapScore != null && trapScore >= 0) {
    displayTrapScore = trapScore;
  } else if (trapRisk && trapRisk.trapRiskScore != null && trapRisk.trapRiskScore >= 0) {
    displayTrapScore = trapRisk.trapRiskScore;
  }
  if (displayTrapScore != null && displayTrapScore >= 0) {
    const trapScoreRounded = Math.round(displayTrapScore);
    const trapScoreEmoji = displayTrapScore >= 60 ? '🚨 高リスク' : displayTrapScore >= 40 ? '⚠️ 中' : '✅ 低';
    lines.push(`🎯 トラップスコア: ${trapScoreRounded}/100 ${trapScoreEmoji}`);
    lines.push('');
  }

  // Whale Ratio情報（ENと同一）
  // PR #14: whaleFlows の構造が { whaleRatio, isHighPressure, interpretation } に変更
  // 重要: whaleFlowsが存在し、whaleRatioがnullでない場合に表示
  if (whaleFlows && whaleFlows.whaleRatio != null) {
    // whaleRatioは0-1の範囲の数値として返される（deepMetrics.js参照）
    // パーセンテージに変換（0.56 -> 56%）
    const whaleRatioValue = typeof whaleFlows.whaleRatio === 'number' 
      ? whaleFlows.whaleRatio * 100 
      : parseFloat(whaleFlows.whaleRatio) * 100 || 0;
    const isHighPressure = whaleFlows.isHighPressure === true || whaleRatioValue >= 80;
    const whaleLine = `🐋 クジラ比率: ${whaleRatioValue.toFixed(1)}% ${isHighPressure ? '(高圧力)' : '(正常)'}`;
    lines.push(whaleLine);
  } else if (whaleFlows) {
    console.warn('[Regular JA] whaleFlows exists but whaleRatio is null:', whaleFlows);
  }

  // 24h清算（ENと同一）
  const totalLiquidations = typeof liquidations === 'number'
    ? liquidations
    : (liquidations?.totalLiquidations ?? 0);
  if (totalLiquidations > 0) {
    if (typeof liquidations === 'object' && liquidations.longLiquidations != null && liquidations.shortLiquidations != null) {
      const liqLine = `💥 24h清算: ${formatUsd(totalLiquidations)} (ロング: ${formatUsd(liquidations.longLiquidations)}, ショート: ${formatUsd(liquidations.shortLiquidations)})`;
      lines.push(liqLine);
    } else {
      lines.push(`💥 24h清算: ${formatUsd(totalLiquidations)}`);
    }
  }

  lines.push(trapLine);

  // Phase 2: Risk/Reward表示（JA市場専用）
  if (riskReward != null) {
    const rrLine = `⚖️ リスクリワード比: ${riskReward.toFixed(2)} ${riskReward >= 2.0 ? '✅ 良好' : riskReward >= 1.5 ? '⚠️ 注意' : '❌ 低い'}`;
    lines.push(rrLine);
    if (nupl != null) {
      lines.push(`• NUPL (含み損益): ${nupl.toFixed(3)}`);
    }
    if (sopr30d != null) {
      lines.push(`• SOPR 30日平均: ${sopr30d.toFixed(3)}`);
    }
  }

  // Phase1-Product: Trap Riskスコア表示
  if (trapRisk && trapRisk.trapRiskScore != null) {
    const riskEmoji = trapRisk.riskLevel === 'CRITICAL' ? '🚨' : 
                      trapRisk.riskLevel === 'HIGH' ? '⚠️' : 
                      trapRisk.riskLevel === 'MEDIUM' ? '⚡' : '✅';
    const trapRiskLine = `${riskEmoji} トラップリスクスコア: ${trapRisk.trapRiskScore}/100 (${trapRisk.riskLevel})`;
    lines.push(trapRiskLine);
    
    // 主要なリスク要因を表示（最大3つ）
    if (trapRisk.riskFactors && trapRisk.riskFactors.length > 0) {
      const topRisks = trapRisk.riskFactors.slice(0, 3);
      topRisks.forEach(risk => {
        if (risk.score >= 20) {
          lines.push(`   • ${risk.factor}: ${risk.description.substring(0, 60)}...`);
        }
      });
    }
  }
  
  // Phase1-Product: NO TRADEアラート表示
  if (noTradeAlert && noTradeAlert.shouldNoTrade) {
    const noTradeEmoji = noTradeAlert.confidence === 'HIGH' ? '🚫' : 
                         noTradeAlert.confidence === 'MEDIUM' ? '⚠️' : '⏸️';
    const noTradeLine = `${noTradeEmoji} NO TRADEアラート (${noTradeAlert.confidence} 信頼度、リスクスコア: ${noTradeAlert.riskScore}/100)`;
    lines.push(noTradeLine);
    
    // 主要な理由を表示（最大3つ）
    if (noTradeAlert.reasons && noTradeAlert.reasons.length > 0) {
      const topReasons = noTradeAlert.reasons.slice(0, 3);
      topReasons.forEach(reason => {
        lines.push(`   • ${reason}`);
      });
    }
    
    lines.push(`   💡 ${noTradeAlert.recommendation}`);
  }
  
  // Phase1-Product: Exit Map表示（簡略化：最大8行）
  if (exitMap && exitMap.hasActivePosition) {
    lines.push('');
    lines.push('🗺️ エグジットマップ（撤退マップ）');
    lines.push(`   ポジション状態: ${exitMap.positionStatus}`);
    if (exitMap.unrealizedPnlPct !== 0) {
      const pnlEmoji = exitMap.unrealizedPnlPct > 0 ? '📈' : '📉';
      lines.push(`   ${pnlEmoji} 未実現P&L: ${exitMap.unrealizedPnlPct > 0 ? '+' : ''}${exitMap.unrealizedPnlPct.toFixed(2)}% ($${exitMap.unrealizedPnl.toLocaleString()})`);
    }
    
    // 最重要利確ゾーン（最大2つ）
    if (exitMap.exitMap.zones && exitMap.exitMap.zones.length > 0) {
      lines.push('   📍 利確ゾーン:');
      const highPriorityZones = exitMap.exitMap.zones
        .filter(zone => zone.priority === 'HIGH')
        .slice(0, 2);
      if (highPriorityZones.length === 0) {
        exitMap.exitMap.zones.slice(0, 2).forEach(zone => {
          const priorityEmoji = zone.priority === 'HIGH' ? '🔴' : 
                                zone.priority === 'MEDIUM' ? '🟡' : '🟢';
          lines.push(`   ${priorityEmoji} ゾーン${zone.zone}: $${zone.price.toLocaleString()} (${zone.takeProfitPct}%利確)`);
        });
      } else {
        highPriorityZones.forEach(zone => {
          lines.push(`   🔴 ゾーン${zone.zone}: $${zone.price.toLocaleString()} (${zone.takeProfitPct}%利確)`);
        });
      }
    }
    
    // 最重要撤退条件（最大2つ）
    if (exitMap.exitMap.exitConditions && exitMap.exitMap.exitConditions.length > 0) {
      lines.push('   ⚠️ 撤退条件:');
      const criticalConditions = exitMap.exitMap.exitConditions
        .filter(condition => condition.priority === 'CRITICAL' || condition.priority === 'HIGH')
        .slice(0, 2);
      if (criticalConditions.length === 0) {
        exitMap.exitMap.exitConditions.slice(0, 2).forEach(condition => {
          const priorityEmoji = condition.priority === 'CRITICAL' ? '🚨' : 
                                condition.priority === 'HIGH' ? '⚠️' : '⚡';
          lines.push(`   ${priorityEmoji} ${condition.condition}`);
        });
      } else {
        criticalConditions.forEach(condition => {
          const priorityEmoji = condition.priority === 'CRITICAL' ? '🚨' : '⚠️';
          lines.push(`   ${priorityEmoji} ${condition.condition}`);
        });
      }
    }
    
    if (exitMap.exitMap.recommendation) {
      lines.push(`   💡 ${exitMap.exitMap.recommendation}`);
    }
  }
  
  lines.push('本情報は教育目的で提供されるものであり、投資助言・金融商品の勧誘を行うものではありません。');

  return lines.join('\n');
}

module.exports = { formatRegularBriefing };
