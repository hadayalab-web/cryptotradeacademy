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
  const flowLine = `📊 取引所ネットフロー: ${flowDir} ${flowAbs.toFixed(0)} BTC`;

  const mpiLine = `⛏ Miners' Position Index (MPI): ${(mpi ?? 0).toFixed(2)}`;
  const sentimentLine = `🧠 投資家センチメント: *${sentimentLabel || '不明'}*`;

  const scoreLine = `📈 マーケットスコア: ${Math.round(score ?? 0)}/100`;

  // Phase 2: Risk/Reward表示（JA市場専用）
  if (riskReward != null) {
    // riskRewardは後でメッセージに追加
  }

  const trapLine = trap?.isTrap
    ? `🧨 トラップ検知: ${trap.label || 'トラップの可能性'} (${trap.confidence} 信頼度)`
    : '✅ トラップ検知: 重大なトラップは検知されていません。';

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

  const entryLine = `• 想定エントリー（スポット参考）: ${formatUsd(priceUsd)}`;
  const tpLine = tradeSignal?.tp != null ? `• Take Profit: ${formatUsd(tradeSignal.tp)}` : '• Take Profit: n/a';
  const slLine = tradeSignal?.sl != null ? `• Stop Loss: ${formatUsd(tradeSignal.sl)}` : '• Stop Loss: n/a';
  const rrLine = tradeSignal?.rr != null ? `• リスクリワード (RR): ${tradeSignal.rr.toFixed(2)}` : '';

  const isNoTrade = true; // 常に待機モード（BUY/SELLシグナルは完全削除）
  const modeLine = isNoTrade
    ? '• モード: Trap Standby — 明確な優位性が出るまで待機。守りを優先。'
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
  lines.push('🌤️ CryptoWeather Alert - Trap Defense Report');
  lines.push(`📺 ニュース番組 @ ${ts}`);
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

  // ===== 【USPハイライト】3つの独自機能 =====
  lines.push('✨ 本日のハイライト (3つのUSP)');
  lines.push('');
  
  // USP1: トラップ防御（透明性向上：スコア算出根拠を表示）
  const trapData = trapDetection || marketBug; // 後方互換性
  if (trapData && (trapData.trapDetected || trapData.bugDetected)) {
    const trapSeverity = trapData.trapSeverity || trapData.bugSeverity;
    const trapScore = trapData.trapScore || trapData.bugScore;
    const trapType = trapData.trapType || trapData.bugType;
    const trapEmoji = trapSeverity === 'CRITICAL' ? '🚨' :
                     trapSeverity === 'HIGH' ? '⚠️' :
                     trapSeverity === 'MEDIUM' ? '⚡' : '💡';
    lines.push(`🛡️ USP1: トラップ防御 - ${trapEmoji} ${trapType || '異常検知'} (スコア: ${trapScore.toFixed(0)}/100)`);
    
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
      lines.push(`   ${alertEmoji} トラップアラート: ${trapAlert.type} (深刻度: ${trapAlert.severity})`);
      if (trapAlert.recommendation && trapAlert.recommendation !== 'NONE') {
        const recText = trapAlert.recommendation === 'AVOID_LONG' ? 'ロング回避 - 待機推奨' :
                       trapAlert.recommendation === 'AVOID_SHORT' ? 'ショート回避 - 待機推奨' :
                       trapAlert.recommendation === 'STANDBY' ? '待機推奨' : '注意';
        lines.push(`   ⚠️ 推奨: ${recText}`);
      }
      lines.push(`   📊 確度: ${(trapAlert.confidence * 100).toFixed(0)}%`);
    }
  } else {
    lines.push('🛡️ USP1: トラップ防御 - 現在トラップは検知されていません');
  }
  
  // ===== 【ニュース番組構造】オープニング → データ → 解説 → コメンテーター → クロージング =====
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('📺 【オープニング】GPTリポーターからの緊急トラップニュース');
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  
  // GPTリポーター: CryptoQuantデータ解析に基づくトラップニュース
  const gptNewsText = gptReporterAnalysis || aiAnalysis || 'データ解析中...';
  const gptNewsLimit = 800;
  const gptNewsDisplay = gptNewsText.length > gptNewsLimit 
    ? `${gptNewsText.slice(0, gptNewsLimit)}…` 
    : gptNewsText;
  lines.push(`📰 ${gptNewsDisplay}`);
  lines.push('');
  
  // USP2: Geminiコンテンツ生成（データ提示セクション）
  if (hasGeminiContent) {
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push('📊 【データ提示】NanoBananaインフォグラフィック');
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push('🎬 添付画像/動画をチェック！');
    lines.push('');
  }
  
  // 【解説】GPTリポーターの詳細解説（既にオープニングで表示済みの場合は省略）
  // 必要に応じて追加の解説セクションをここに追加可能
  
  // 【コメンテーター】Dr. Grok癒し系コメンテーター（固定コーナー）
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('💊 【コメンテーター】Dr. Grok の見立て');
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  
  // Grok X解析結果（Xセンチメント分析）
  if (grokXAnalysis && typeof grokXAnalysis === 'string' && grokXAnalysis.trim()) {
    const grokXLimit = 600;
    const grokXDisplay = grokXAnalysis.length > grokXLimit 
      ? `${grokXAnalysis.slice(0, grokXLimit)}…` 
      : grokXAnalysis;
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
  } else {
    lines.push('💚 心理分析: データ取得中...');
  }
  
  lines.push('');
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('📺 【クロージング】次回をお楽しみに');
  lines.push('━━━━━━━━━━━━━━━━━━━━');
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
