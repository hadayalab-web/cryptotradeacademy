// Tier1 BTC regular briefing (KR)
// services/telegram/messages/user/ko/regular.ko.js

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
  stats,
  kimchiPremium, // Phase 2: KO市場専用
  upbitPrice, // Phase 2: KO市場専用
  binancePrice, // Phase 2: KO市場専用
  // Phase1-Product: 新機能データ
  noTradeAlert, // NO TRADEアラート結果
  trapRisk, // Trap Riskスコア結果
  exitMap, // Exit Map結果
  // USP1: トラップ防御結果
  trapDetection, // トラップ防御結果（優先）
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

  const priceLine = `💰 BTC 가격: ${formatUsd(priceUsd)} (${formatPercent(change24h)} / 24h)`;
  const flowDir = inflow >= 0 ? 'Inflow' : 'Outflow';
  const flowAbs = Math.abs(inflow || 0);
  const flowLine = `📊 거래소 순유입: ${flowDir} ${flowAbs.toFixed(0)} BTC`;
  const mpiLine = `⛏ Miners' Position Index (MPI): ${(mpi ?? 0).toFixed(2)}`;
  const sentimentLine = `🧠 시장 심리: ${sentimentLabel || '알 수 없음'}`;

  const scoreLine = `📈 시장 점수: ${Math.round(score ?? 0)}/100`;
  const trapLine = trap?.isTrap
    ? `🧨 트랩 감지기: ${trap.label || '잠재적 트랩'} (${trap.confidence} 신뢰도)`
    : '✅ 트랩 감지기: 치명적인 트랩은 감지되지 않았습니다.';

  let dirEmoji;
  let dirLabel;
  // 트랩 알림만 표시 (BUY/SELL/LONG/SHORT 완전 삭제)
  if (trapAlert && trapAlert.alert) {
    dirEmoji = trapAlert.severity === 'CRITICAL' ? '🚨' :
               trapAlert.severity === 'HIGH' ? '⚠️' :
               trapAlert.severity === 'MEDIUM' ? '⚡' : '🛡️';
    if (trapAlert.recommendation === 'AVOID_LONG') {
      dirLabel = '🛡️ 트랩 알림: 롱 회피 권장';
    } else if (trapAlert.recommendation === 'AVOID_SHORT') {
      dirLabel = '🛡️ 트랩 알림: 숏 회피 권장';
    } else {
      dirLabel = '🛡️ 트랩 알림: 대기 권장';
    }
  } else {
    dirEmoji = '🛡️';
    dirLabel = 'TRAP STANDBY (Defense Active)';
  }

  const entryLine = `• 진입가 (스팟 기준): ${formatUsd(priceUsd)}`;
  const tpLine = tradeSignal?.tp != null ? `• Take Profit: ${formatUsd(tradeSignal.tp)}` : '• Take Profit: n/a';
  const slLine = tradeSignal?.sl != null ? `• Stop Loss: ${formatUsd(tradeSignal.sl)}` : '• Stop Loss: n/a';
  const rrLine = tradeSignal?.rr != null ? `• 손익비 (RR): ${tradeSignal.rr.toFixed(2)}` : '';

  const isNoTrade = true; // 항상 대기 모드 (BUY/SELL 시그널 완전 삭제)
  const modeLine = isNoTrade ? '• 모드: Trap Standby — 명확한 에지까지 승리 준비. 방어 우선.' : '';

  const raw = typeof aiAnalysis === 'string' ? aiAnalysis.trim() : '';
  const isOffline = !raw || /grok offline/i.test(raw) || /Live Search unavailable/i.test(raw);
  let grokText = raw;

  const GROK_LIMIT = 1500;
  if (!grokText || isOffline) {
    grokText = 'Grok이 현재 오프라인입니다(온체인/가격 신호만 사용 중).';
  } else if (grokText.length > GROK_LIMIT) {
    grokText = `${grokText.slice(0, GROK_LIMIT)}…`;
  }

  const lines = [];
  lines.push('🌤️ CryptoWeather Alert - Trap Defense Report');
  lines.push(`📺 뉴스 프로그램 @ ${ts}`);
  lines.push('');

  // ===== 【最重要】Trade Verdict（最上部に配置） =====
  lines.push('🎯 트레이드 verdict');
  lines.push(`${dirEmoji} 시그널: ${dirLabel}`);
  lines.push(entryLine);
  if (modeLine) lines.push(modeLine);
  if (tpLine) lines.push(tpLine);
  if (slLine) lines.push(slLine);
  if (rrLine) lines.push(rrLine);
  lines.push('');

  // ===== 【コア機能ハイライト】3つの強み =====
  lines.push('✨ 오늘의 하이라이트 (3가지 핵심 기능)');
  lines.push('');
  
  // Core Feature 1: Trap Defense (prioritize trapDetection, fallback to marketBug for backward compatibility)
  const trapData = trapDetection || marketBug;
  if (trapData && (trapData.trapDetected || trapData.bugDetected)) {
    const trapEmoji = trapData.trapSeverity === 'CRITICAL' || trapData.bugSeverity === 'CRITICAL' ? '🚨' :
                     trapData.trapSeverity === 'HIGH' || trapData.bugSeverity === 'HIGH' ? '⚠️' :
                     trapData.trapSeverity === 'MEDIUM' || trapData.bugSeverity === 'MEDIUM' ? '⚡' : '💡';
    const trapType = trapData.trapType || trapData.bugType || '이상';
    const trapTypeText = trapType.replace(/_/g, ' ');
    const trapScore = trapData.trapScore || trapData.bugScore || 0;
    lines.push(`🛡️ 핵심 기능 1: 트랩 방어 - ${trapEmoji} ${trapTypeText} (점수: ${trapScore.toFixed(0)}/100)`);
    
    // Display trap alert details if available
    if (trapAlert && trapAlert.alert) {
      const alertTypeText = trapAlert.type ? trapAlert.type.replace(/_/g, '-') : 'UNKNOWN';
      const recommendationText = trapAlert.recommendation ? trapAlert.recommendation.replace(/_/g, '-') : 'UNKNOWN';
      lines.push(`   🚨 알림 유형: ${alertTypeText} (심각도: ${trapAlert.severity})`);
      lines.push(`   💡 권장사항: ${recommendationText}`);
      if (trapAlert.confidence) {
        lines.push(`   📊 신뢰도: ${(trapAlert.confidence * 100).toFixed(0)}%`);
      }
    }
  } else {
    lines.push('🛡️ 핵심 기능 1: 트랩 방어 - 현재 감지된 트랩 없음');
  }
  
  // ===== 【ニュース番組構造】オープニング → データ → 解説 → コメンテーター → クロージング =====
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('📺 【오프닝】GPT 리포터의 긴급 트랩 뉴스');
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  
  // GPTリポーター: CryptoQuantデータ解析に基づくトラップニュース
  const gptNewsText = gptReporterAnalysis || aiAnalysis || '데이터 분석 중...';
  const gptNewsLimit = 800;
  const gptNewsDisplay = gptNewsText.length > gptNewsLimit 
    ? `${gptNewsText.slice(0, gptNewsLimit)}…` 
    : gptNewsText;
  lines.push(`📰 ${gptNewsDisplay}`);
  lines.push('');
  
  // 【改善1: Evidenceセクションの独立】証拠（Evidence）セクションを独立させて明確に表示
  // Trap RiskスコアまたはTrap Detectionスコアから証拠を生成（KO版はデータ重視）
  const trapScoreForEvidence = trapRisk?.trapRiskScore ?? trapDetection?.trapScore ?? null;
  const trapTypeForEvidence = trapDetection?.trapType || trapAlert?.type || null;
  
  if (trapScoreForEvidence !== null || trapDetection || trapAlert) {
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push('📊 【증거】왜 기다려야 하는가? 데이터 기반 이유');
    lines.push('[온체인 데이터로 입증됨]');
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    
    if (trapScoreForEvidence !== null) {
      const trapScoreRounded = Math.round(trapScoreForEvidence);
      if (trapScoreRounded >= 50) {
        lines.push(`🎯 트랩 점수: ${trapScoreRounded}/100은 상당한 트랩 위험을 나타냅니다.`);
        if (trapTypeForEvidence) {
          const trapTypeDisplay = trapTypeForEvidence.replace(/_/g, ' ');
          lines.push(`⚠️ 트랩 유형: ${trapTypeDisplay} 감지됨.`);
        }
        // KO版はデータ重視のため、より詳細なデータ説明を追加
        lines.push(`💡 증거: 다중 다이버전스와 온체인 이상 징후가 "관망 모드"가 신중함을 시사합니다.`);
        lines.push(`📈 상세 데이터:`);
        if (trapDetection?.details) {
          const details = trapDetection.details;
          if (details.multipleDivergences >= 2) {
            lines.push(`   • 다중 다이버전스: ${details.multipleDivergences}건`);
          }
          if (details.anomalyDetected) {
            lines.push(`   • 고해상도 이상 감지: 확인됨`);
          }
          if (Math.abs(details.onchainSocialDivergence || 0) > 40) {
            lines.push(`   • 온체인/소셜 다이버전스: ${Math.abs(details.onchainSocialDivergence).toFixed(1)}%`);
          }
        }
        lines.push(`📈 왜 기다려야 하는가? 데이터는 ${trapScoreRounded >= 70 ? '강한' : '중간 정도의'} 신호를 보여주며, 지금 진입하면 시장 트랩에 노출될 수 있습니다.`);
      } else {
        lines.push(`✅ 트랩 점수: ${trapScoreRounded}/100은 낮은 트랩 위험을 나타냅니다.`);
        lines.push(`💡 증거: 시장 상황이 상대적으로 안전해 보이지만, 트랩 패턴에 대해 경계를 유지하세요.`);
      }
    } else if (trapDetection || trapAlert) {
      // フォールバック: trapDetectionやtrapAlertから証拠を生成
      if (trapDetection && trapDetection.trapDetected) {
        const trapTypeText = (trapDetection.trapType || '이상 감지').replace(/_/g, ' ');
        lines.push(`🎯 트랩 감지: ${trapTypeText} (점수: ${(trapDetection.trapScore || 0).toFixed(0)}/100)`);
        lines.push(`💡 증거: 온체인 데이터 기반 다중 이상이 감지되었습니다.`);
      } else if (trapAlert && trapAlert.alert) {
        const alertTypeText = trapAlert.type ? trapAlert.type.replace(/_/g, '-') : 'UNKNOWN';
        lines.push(`🚨 트랩 알림: ${alertTypeText} (심각도: ${trapAlert.severity})`);
        lines.push(`💡 증거: 온체인 데이터와 센티먼트 분석에 의해 시장 트랩 위험이 감지되었습니다.`);
      }
    }
    
    // 【改善2: 「70%待機戦略」の証拠ベース説明の統合】
    if (trapScoreForEvidence !== null && trapScoreForEvidence >= 30) {
      const trapScoreRounded = Math.round(trapScoreForEvidence);
      lines.push('');
      lines.push(`💡 왜 기다려야 하는가? (증거 기반)`);
      if (trapScoreRounded >= 70) {
        lines.push(`   🚨 트랩 점수 ${trapScoreRounded}/100: 강한 신호가 잠재적인 시장 트랩을 나타냅니다.`);
        lines.push(`   📊 데이터는 다중 다이버전스와 온체인 이상을 보여줍니다.`);
        lines.push(`   🛡️ 전략적 준비는 약점이 아닙니다—승리 준비입니다. 70%의 시간은 승리 준비를 하세요.`);
      } else if (trapScoreRounded >= 50) {
        lines.push(`   ⚡ 트랩 점수 ${trapScoreRounded}/100: 중간 정도의 트랩 지표가 감지되었습니다.`);
        lines.push(`   📊 일부 다이버전스가 주의를 촉구합니다.`);
        lines.push(`   🛡️ 방어를 최우선으로. 승리 준비를—더 명확한 시장 신호를 기다리세요.`);
      } else {
        lines.push(`   ✅ 트랩 점수 ${trapScoreRounded}/100: 낮은 트랩 위험이지만 경계를 유지하세요.`);
        lines.push(`   🛡️ 낮은 위험 상황에서도 인내는 전략적 강점입니다.`);
      }
    }
    lines.push('');
  }
  
  // USP2: Geminiコンテンツ生成（データ提示セクション）
  if (hasGeminiContent) {
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push('📊 【데이터 제시】NanoBanana 인포그래픽');
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push('🎬 첨부된 미디어를 확인하세요!');
    lines.push('');
  }
  
  // 【コメンテーター】Dr. Grok癒し系コメンテーター（固定コーナー）
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('💊 【코멘테이터】Dr. Grok의 의견');
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  
  // Grok X解析結果（Xセンチメント分析）
  if (grokXAnalysis && typeof grokXAnalysis === 'string' && grokXAnalysis.trim()) {
    const grokXLimit = 600;
    const grokXDisplay = grokXAnalysis.length > grokXLimit 
      ? `${grokXAnalysis.slice(0, grokXLimit)}…` 
      : grokXAnalysis;
    lines.push(`📱 X 센티먼트 분석: ${grokXDisplay}`);
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
    lines.push(`💚 심리 상태: ${stateEmoji} ${psychologicalSupport.psychologicalState} (위험: ${riskEmoji} ${psychologicalSupport.psychologicalRisk})`);
    if (psychologicalSupport.psychologicalAdvice) {
      lines.push(`   💡 ${psychologicalSupport.psychologicalAdvice}`);
    }
    if (psychologicalSupport.mentalNote) {
      lines.push(`💊 Dr. Grok의 멘탈 노트:`);
      lines.push(`"${psychologicalSupport.mentalNote}"`);
    }
  } else {
    // 폴백: 데이터를 가져올 수 없는 경우에도 가치 있는 메시지 제공
    lines.push('💚 심리 상태: 😐 NEUTRAL (위험: 💡 낮음)');
    lines.push('');
    lines.push('💊 Dr. Grok의 멘탈 노트:');
    lines.push('"인내는 약점이 아니다—전략적 강점이다. 최고의 트레이더는 거래하지 않을 때를 안다."');
  }
  
  lines.push('');
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('📺 【클로징】다음 회차를 기대해 주세요');
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('');

  // ===== 基本市場データ（補足情報として後半に配置） =====
  lines.push(priceLine);
  lines.push(flowLine);
  lines.push(mpiLine);
  lines.push(sentimentLine);
  lines.push('');

  lines.push(scoreLine);

  // Phase 2: Kimchi Premium表示（KO市場専用）
  if (kimchiPremium != null) {
    const premiumPct = kimchiPremium * 100; // Convert decimal to percentage
    const premiumLine = `🥟 김치 프리미엄: ${premiumPct.toFixed(2)}% ${premiumPct > 5 ? '🚨 함정' : premiumPct > 3 ? '⚠️ 주의' : '✅ 정상'}`;
    lines.push(premiumLine);
    if (upbitPrice) lines.push(`• 업비트: ₩${upbitPrice.toLocaleString('ko-KR')}`);
    if (binancePrice) lines.push(`• 바이낸스: $${binancePrice.toLocaleString('en-US')}`);
  }

  // Phase1-Product: Trap Riskスコア表示
  if (trapRisk && trapRisk.trapRiskScore != null) {
    const riskEmoji = trapRisk.riskLevel === 'CRITICAL' ? '🚨' : 
                      trapRisk.riskLevel === 'HIGH' ? '⚠️' : 
                      trapRisk.riskLevel === 'MEDIUM' ? '⚡' : '✅';
    const trapRiskLine = `${riskEmoji} 트랩 리스크 점수: ${trapRisk.trapRiskScore}/100 (${trapRisk.riskLevel})`;
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
    const noTradeLine = `${noTradeEmoji} NO TRADE 알림 (${noTradeAlert.confidence} 신뢰도, 리스크 점수: ${noTradeAlert.riskScore}/100)`;
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
  
  // Phase1-Product: Exit Map表示（簡略化：最大8行）
  if (exitMap && exitMap.hasActivePosition) {
    lines.push('');
    lines.push('🗺️ 출구 지도');
    lines.push(`   포지션 상태: ${exitMap.positionStatus}`);
    if (exitMap.unrealizedPnlPct !== 0) {
      const pnlEmoji = exitMap.unrealizedPnlPct > 0 ? '📈' : '📉';
      lines.push(`   ${pnlEmoji} 미실현 손익: ${exitMap.unrealizedPnlPct > 0 ? '+' : ''}${exitMap.unrealizedPnlPct.toFixed(2)}% ($${exitMap.unrealizedPnl.toLocaleString()})`);
    }
    
    // 最重要利確ゾーン（最大2つ）
    if (exitMap.exitMap.zones && exitMap.exitMap.zones.length > 0) {
      lines.push('   📍 이익 실현 구간:');
      const highPriorityZones = exitMap.exitMap.zones
        .filter(zone => zone.priority === 'HIGH')
        .slice(0, 2);
      if (highPriorityZones.length === 0) {
        exitMap.exitMap.zones.slice(0, 2).forEach(zone => {
          const priorityEmoji = zone.priority === 'HIGH' ? '🔴' : 
                                zone.priority === 'MEDIUM' ? '🟡' : '🟢';
          lines.push(`   ${priorityEmoji} 구간 ${zone.zone}: $${zone.price.toLocaleString()} (${zone.takeProfitPct}% 실현)`);
        });
      } else {
        highPriorityZones.forEach(zone => {
          lines.push(`   🔴 구간 ${zone.zone}: $${zone.price.toLocaleString()} (${zone.takeProfitPct}% 실현)`);
        });
      }
    }
    
    // 最重要撤退条件（最大2つ）
    if (exitMap.exitMap.exitConditions && exitMap.exitMap.exitConditions.length > 0) {
      lines.push('   ⚠️ 출구 조건:');
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
  
  lines.push('');

  lines.push('교육 목적의 정보 제공일 뿐이며, 투자/재무 자문을 구성하지 않습니다.');

  return lines.join('\n');
}

module.exports = { formatRegularBriefing };
