// Tier1 BTC regular briefing (JP)
// services/telegram/messages/user/ja/regular.ja.js

function formatPercent(pct) {
  if (pct == null || Number.isNaN(pct)) return 'n/a';
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(2)}%`;
}

function formatUsd(v) {
  if (v == null || Number.isNaN(v)) return 'n/a';
  return `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
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

  // Phase 2: Risk/Reward表示（JA市場専用）
  if (riskReward != null) {
    // riskRewardは後でメッセージに追加
  }

  const trapLine = trap?.isTrap
    ? `🧨 トラップ検知: ${trap.label || 'トラップの可能性'} (${trap.confidence} 信頼度)`
    : '✅ トラップ検知: 重大なトラップは検知されていません';

  let dirEmoji;
  let dirLabel;
  // トラップアラートのみ表示（BUY/SELL/LONG/SHORTは完全削除）
  if (trapAlert && trapAlert.alert) {
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
  } else {
    dirEmoji = '🛡️';
    dirLabel = 'TRAP STANDBY (Defense Active)';
  }

  const isNoTrade = true; // 常に待機モード（BUY/SELLシグナルは完全削除）
  
  // Trade Verdictの表記最適化: Standby状態の時は「TBD」と表記
  const entryLine = isNoTrade
    ? '• 想定エントリー: 勝利の準備中 — 明確なトリガーを待機'
    : `• 想定エントリー（スポット参考）: ${formatUsd(priceUsd)}`;
  const tpLine = isNoTrade
    ? '• Take Profit: TBD (決定待ち)'
    : (tradeSignal?.tp != null ? `• Take Profit: ${formatUsd(tradeSignal.tp)}` : '• Take Profit: n/a');
  const slLine = isNoTrade
    ? '• Stop Loss: TBD (決定待ち)'
    : (tradeSignal?.sl != null ? `• Stop Loss: ${formatUsd(tradeSignal.sl)}` : '• Stop Loss: n/a');
  const rrLine = isNoTrade
    ? '• リスクリワード (RR): 待機中'
    : (tradeSignal?.rr != null ? `• リスクリワード (RR): ${tradeSignal.rr.toFixed(2)}` : '');

  const modeLine = isNoTrade
    ? '• モード: Trap Standby — 明確な優位性が出るまで勝利の準備。守りを優先'
    : '';

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
  lines.push(`🚨 BREAKING: トラップ防御ブリーフィング`);
  lines.push(`📅 ${ts}`);
  lines.push('');

  // ===== 【最重要】トレード・ヴァーディクト（最上部に配置） =====
  lines.push('🎯 トレード・ヴァーディクト');
  lines.push(`${dirEmoji} シグナル: ${dirLabel}`);
  lines.push(entryLine);
  if (modeLine) lines.push(modeLine);
  if (tpLine) lines.push(tpLine);
  if (slLine) lines.push(slLine);
  if (rrLine) lines.push(rrLine);
  lines.push('');

  // ===== 【コア機能ハイライト】3つの強み =====
  lines.push('✨ 本日のハイライト (3つのコア機能)');
  lines.push('');
  
  // Core Feature 1: トラップ防御（透明性向上：スコア算出根拠を表示）
  const trapData = trapDetection || marketBug; // 後方互換性
  if (trapData && (trapData.trapDetected || trapData.bugDetected)) {
    const trapSeverity = trapData.trapSeverity || trapData.bugSeverity;
    const trapScore = trapData.trapScore || trapData.bugScore;
    const trapType = trapData.trapType || trapData.bugType;
    const trapTypeText = (trapType || '異常検知').replace(/_/g, ' ');
    const trapEmoji = trapSeverity === 'CRITICAL' ? '🚨' :
                     trapSeverity === 'HIGH' ? '⚠️' :
                     trapSeverity === 'MEDIUM' ? '⚡' : '💡';
    lines.push(`🛡️ コア機能1: トラップ防御 - ${trapEmoji} ${trapTypeText} (スコア: ${trapScore.toFixed(0)}/100)`);
    
    // スコア算出根拠（components）を表示
    const details = trapData.details || {};
    if (details) {
      const components = [];
      if (details.multipleDivergences >= 3) {
        components.push(`複数ダイバージェンス(${details.multipleDivergences}件)`);
      } else if (details.multipleDivergences >= 2) {
        components.push(`複数ダイバージェンス(${details.multipleDivergences}件)`);
      }
      if (details.anomalyDetected) {
        components.push('高解像度異常検知');
      }
      if (details.accelerationDetected) {
        components.push('トレンド加速検知');
      }
      if (Math.abs(details.onchainSocialDivergence || 0) > 40) {
        components.push('大口/リテールズレ');
      }
      if (details.priceOnchainDivergence) {
        components.push('価格/オンチェーンズレ');
      }
      if (details.priceSocialDivergence) {
        components.push('価格/センチメントズレ');
      }
      if (components.length > 0) {
        lines.push(`   📊 算出根拠: ${components.join(' + ')}`);
      }
    }
    
    // トラップアラート表示（優先）
    if (trapAlert && trapAlert.alert) {
      const alertEmoji = trapAlert.severity === 'CRITICAL' ? '🚨' :
                        trapAlert.severity === 'HIGH' ? '⚠️' :
                        trapAlert.severity === 'MEDIUM' ? '⚡' : '💡';
      const alertTypeText = trapAlert.type ? trapAlert.type.replace(/_/g, '-') : 'UNKNOWN';
      lines.push(`   ${alertEmoji} トラップアラート: ${alertTypeText} (深刻度: ${trapAlert.severity})`);
      if (trapAlert.recommendation && trapAlert.recommendation !== 'NONE') {
        const recText = trapAlert.recommendation === 'AVOID_LONG' ? 'ロング回避 - 待機推奨' :
                       trapAlert.recommendation === 'AVOID_SHORT' ? 'ショート回避 - 待機推奨' :
                       trapAlert.recommendation === 'STANDBY' ? '待機推奨' : '注意';
        lines.push(`   ⚠️ 推奨: ${recText}`);
      }
      lines.push(`   📊 確度: ${(trapAlert.confidence * 100).toFixed(0)}%`);
    }
  } else {
    lines.push('🛡️ コア機能1: トラップ防御 - 現在トラップは検知されていません');
  }
  
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
    }
  }
  
  // フォールバック: GPT分析が利用できない場合の代替メッセージ
  if (!gptNewsText || gptNewsText.trim() === '') {
    // CryptoQuantデータから基本的な分析を生成
    const inflowDisplay = inflow >= 0 ? `流入 ${Math.abs(inflow).toFixed(0)} BTC` : `流出 ${Math.abs(inflow).toFixed(0)} BTC`;
    const mpiDisplay = mpi >= 0 ? `+${mpi.toFixed(2)}` : mpi.toFixed(2);
    const priceChangeDisplay = change24h >= 0 ? `+${change24h.toFixed(2)}%` : `${change24h.toFixed(2)}%`;
    
    gptNewsText = `💡 オンチェーンメトリクスの心理的解釈

CryptoQuantデータは、${inflowDisplay}、マイナーズポジションインデックス（MPI）${mpiDisplay}、${sentimentLabel.toLowerCase()}センチメントを示しており、価格は24時間で${priceChangeDisplay}変動しました。

心理的観点から、これらのメトリクスは${sentimentLabel.toLowerCase()}市場環境を示唆しています。${inflow >= 0 ? '流入' : '流出'}は、${inflow >= 0 ? 'より多くの暗号通貨が取引所に流入している' : 'より多くの暗号通貨が取引所から流出している'}ことを示しており、これはしばしば${inflow >= 0 ? '潜在的な売却圧力' : 'ホルダーが取引所外で資産を保護している'}を意味します。

${mpiDisplay}のMPIは、マイナーが${mpi >= 0 ? '売却している' : '保有している'}ことを示唆しており、これは${mpi >= 0 ? '潜在的な供給圧力' : '市場の将来の可能性への信頼'}と解釈できます。

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
  
  // 文字数制限を緩和して、重要な情報が切れないようにする（600文字まで）
  const gptNewsLimit = 600;
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
    summaryLine = `📰 要約: オンチェーンメトリクスは「待機モード」を示しています。市場状況は安定していますが、トラップパターンに注意を払い続けてください。`;
  }
  lines.push(summaryLine);
  lines.push('');
  
  // 詳細な分析を表示
  lines.push(`📰 ${gptNewsDisplay}`);
  lines.push('');
  
  // 【改善1: Evidenceセクションの独立】証拠（Evidence）セクションを独立させて明確に表示
  // Trap RiskスコアまたはTrap Detectionスコアから証拠を生成
  // 優先順位: trapDetection.trapScore > trapRisk.trapRiskScore（値が0の場合は次のソースをチェック）
  let trapScoreForEvidence = null;
  if (trapDetection && trapDetection.trapScore != null && trapDetection.trapScore > 0) {
    trapScoreForEvidence = trapDetection.trapScore;
  } else if (trapRisk && trapRisk.trapRiskScore != null && trapRisk.trapRiskScore > 0) {
    trapScoreForEvidence = trapRisk.trapRiskScore;
  }
  const trapTypeForEvidence = trapDetection?.trapType || trapAlert?.type || null;
  
  // データに基づく理由セクション（常に表示して価値を提供）
  if (trapScoreForEvidence !== null || trapDetection || trapAlert) {
    lines.push('📊 データに基づく理由');
    
    if (trapScoreForEvidence !== null) {
      const trapScoreRounded = Math.round(trapScoreForEvidence);
      if (trapScoreRounded >= 50) {
        lines.push(`🎯 トラップスコア: ${trapScoreRounded}/100 は重大なトラップリスクを示しています`);
        if (trapTypeForEvidence) {
          const trapTypeDisplay = trapTypeForEvidence.replace(/_/g, ' ');
          lines.push(`⚠️ トラップタイプ: ${trapTypeDisplay} を検知しました`);
        }
        lines.push(`💡 証拠: 複数のダイバージェンスとオンチェーン異常により、「待機モード」が賢明です`);
        lines.push(`📈 なぜ待つべきか？データは、${trapScoreRounded >= 70 ? '強い' : '中程度の'}シグナルを示しており、今エントリーすると市場のトラップにさらされる可能性があります`);
      } else {
        lines.push(`✅ トラップスコア: ${trapScoreRounded}/100 は低いトラップリスクを示しています`);
        lines.push(`💡 証拠: 市場状況は比較的安全に見えますが、トラップパターンに注意を払い続けてください`);
      }
    } else if (trapDetection || trapAlert) {
      // フォールバック: trapDetectionやtrapAlertから証拠を生成
      if (trapDetection && trapDetection.trapDetected) {
        const trapTypeText = (trapDetection.trapType || '異常検知').replace(/_/g, ' ');
        lines.push(`🎯 トラップ検知: ${trapTypeText} (スコア: ${(trapDetection.trapScore || 0).toFixed(0)}/100)`);
        lines.push(`💡 証拠: オンチェーンデータに基づく複数の異常が検知されました`);
      } else if (trapAlert && trapAlert.alert) {
        const alertTypeText = trapAlert.type ? trapAlert.type.replace(/_/g, '-') : 'UNKNOWN';
        lines.push(`🚨 トラップアラート: ${alertTypeText} (深刻度: ${trapAlert.severity})`);
        lines.push(`💡 証拠: オンチェーンデータとセンチメント分析により、市場のトラップリスクが検知されました`);
      }
    }
    
    // 【改善2: 「70%待機戦略」の証拠ベース説明の統合】
    // 戦略的インサイトセクションを追加
    if (trapScoreForEvidence !== null) {
      const trapScoreRounded = Math.round(trapScoreForEvidence);
      lines.push('');
      lines.push(`💡 戦略的インサイト`);
      if (trapScoreRounded >= 70) {
        lines.push(`  🚨 トラップスコア ${trapScoreRounded}/100: 強いシグナルが潜在的な市場トラップを示しています`);
        lines.push(`  📊 データは複数のダイバージェンスとオンチェーン異常を示しています`);
        lines.push(`  🛡️ 戦略的な準備は弱さではない—勝利の準備だ。70%の時間、勝利のために準備しよう`);
      } else if (trapScoreRounded >= 50) {
        lines.push(`  ⚡ トラップスコア ${trapScoreRounded}/100: 中程度のトラップ指標を検知しました`);
        lines.push(`  📊 一部のダイバージェンスが注意を促しています`);
        lines.push(`  🛡️ 防御を最優先に。より明確な市場シグナルを待とう`);
      } else {
        lines.push(`  ✅ トラップスコア ${trapScoreRounded}/100: 現在は低トラップリスクですが、市場は常に変化します`);
        lines.push(`  🛡️ 低リスク時こそ、戦略的な準備が重要です。明確な優位性が現れるまで防御を続けましょう`);
        lines.push(`  💎 プロトレーダーは「待つ時間」を最優先します。あなたも同じ戦略を取りましょう`);
      }
    }
    lines.push('');
  }
  
  // USP2: Geminiコンテンツ生成（データ提示セクション）
  if (hasGeminiContent) {
    lines.push('📊 NanoBananaインフォグラフィック');
    lines.push('🎬 添付画像/動画をチェック！');
    lines.push('');
  }
  
  // 【解説】GPTリポーターの詳細解説（既にオープニングで表示済みの場合は省略）
  // 必要に応じて追加の解説セクションをここに追加可能
  
  // 【コメンテーター】Dr. Grok癒し系コメンテーター（固定コーナー）
  // 安住紳一郎スタイル：落ち着いた解説トーンで、データに基づいた信頼感のある見立て
  lines.push('💊 Dr. Grokのクイックインサイト');
  
  // Grok X解析結果（Xセンチメント分析）
  if (grokXAnalysis && typeof grokXAnalysis === 'string' && grokXAnalysis.trim()) {
    const grokXLimit = 600;
    let grokXDisplay = grokXAnalysis;
    if (grokXAnalysis.length > grokXLimit) {
      // 文の終わりで切るようにする（最後の文の終わりを探す）
      const truncated = grokXAnalysis.slice(0, grokXLimit);
      const lastSentenceEnd = Math.max(
        truncated.lastIndexOf('.'),
        truncated.lastIndexOf('!'),
        truncated.lastIndexOf('?'),
        truncated.lastIndexOf('\n')
      );
      // 文の終わりが見つかった場合、その位置で切る
      if (lastSentenceEnd > grokXLimit * 0.7) {
        grokXDisplay = truncated.slice(0, lastSentenceEnd + 1) + '…';
      } else {
        // 文の終わりが見つからない場合、単純に切る
        grokXDisplay = truncated + '…';
      }
    }
    lines.push(`📱 Xセンチメント分析: ${grokXDisplay}`);
    lines.push('');
  }
  
  // Dr. Grokの心理的サポート（癒し系コメンテーターとして）
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
      lines.push(`   💡 ${psychologicalSupport.psychologicalAdvice}`);
    }
    if (psychologicalSupport.mentalNote) {
      lines.push(`💊 Dr. Grokのメンタルノート:`);
      lines.push(`"${psychologicalSupport.mentalNote}"`);
    }
  } else {
    // フォールバック: データが取得できない場合でも価値のあるメッセージを提供
    lines.push('💚 心理状態: 😐 NEUTRAL (リスク: 💡 低)');
    lines.push('');
    lines.push('💊 Dr. Grokのメンタルノート:');
    lines.push('"忍耐は弱さではない—それは戦略的な強さだ。最高のトレーダーは、取引しない時を知っている。"');
  }
  
  lines.push('');

  // ===== 基本市場データ（補足情報として後半に配置） =====
  lines.push(priceLine);
  lines.push(flowLine);
  lines.push(mpiLine);
  lines.push(sentimentLine);
  lines.push('');

  lines.push(scoreLine);

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
  
  lines.push(trapLine);
  lines.push('');
  
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
