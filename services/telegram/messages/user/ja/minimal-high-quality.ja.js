// 無料ハイクオリティ版Telegram配信用のテキストフォーマット関数
// services/telegram/messages/user/ja/minimal-high-quality.ja.js
// Trap Score + 簡易分析 + 簡易Dr. Grokコメント + Mental Note

/**
 * Trap Scoreの説明を取得
 */
function getTrapScoreDescription(trapScore) {
  if (trapScore == null || trapScore === undefined) {
    return 'Trap Scoreを計算中です。しばらくしてから再度ご確認ください。';
  }
  
  const score = Number(trapScore);
  if (isNaN(score)) {
    return 'Trap Scoreを計算中です。しばらくしてから再度ご確認ください。';
  }

  if (score >= 70) {
    return '⚠️ 高リスク: 市場トラップの可能性が高いシグナルが検出されました。極度の注意が必要です';
  } else if (score >= 50) {
    return '⚡ 中リスク: 一部のトラップ指標が検出されました。警戒を怠らないでください';
  } else if (score >= 30) {
    return '✅ 低リスク: トラップ指標は最小限です。市場状況は比較的安全に見えます';
  } else {
    return '✅ 非常に低リスク: トラップ指標はほとんど検出されていません。市場状況は安全に見えます';
  }
}

/**
 * What to Avoid（回避行動）を生成
 */
function generateWhatToAvoid(trapScore, trapData = null) {
  if (!trapScore || trapScore < 50) {
    return null;
  }

  const avoidItems = [];
  
  // Trap Dataから回避行動を抽出
  if (trapData) {
    if (trapData.trapAlert) {
      if (trapData.trapAlert.type === 'AVOID_LONG') {
        avoidItems.push('LONGポジションを避ける — 高いトラップリスクが検出されました');
      } else if (trapData.trapAlert.type === 'AVOID_SHORT') {
        avoidItems.push('SHORTポジションを避ける — 高いトラップリスクが検出されました');
      }
    }
  }

  // デフォルトの回避行動
  if (avoidItems.length === 0) {
    if (trapScore >= 70) {
      avoidItems.push('新しいポジションを開くことを避ける — 強いトラップシグナルが検出されました');
      avoidItems.push('取引前に市場シグナルがより明確になるまで待つ');
    } else if (trapScore >= 50) {
      avoidItems.push('注意を払う — 一部のトラップ指標が存在します');
      avoidItems.push('より良いエントリー機会を待つことを検討する');
    }
  }

  return avoidItems;
}

/**
 * Evidence（根拠）を生成
 */
function generateEvidence(trapData = null, marketData = null) {
  const evidenceItems = [];

  // Trap Dataから根拠を抽出
  if (trapData) {
    if (trapData.exchangeNetflow !== undefined && trapData.exchangeNetflow !== null) {
      const netflow = trapData.exchangeNetflow; // BTC単位
      const absValue = Math.abs(netflow);
      if (netflow < 0) {
        // 流出の場合：ポジティブなシグナルとして表現
        evidenceItems.push(`取引所ネットフロー: ${absValue.toFixed(0)} BTC (流出) — ホルダーが資産を保持中`);
      } else if (netflow > 0) {
        // 流入の場合：注意喚起として表現
        evidenceItems.push(`取引所ネットフロー: +${absValue.toFixed(0)} BTC (流入) — 売却圧力の可能性`);
      } else {
        evidenceItems.push(`取引所ネットフロー: 均衡状態`);
      }
    }

    if (trapData.whaleRatio !== undefined && trapData.whaleRatio !== null) {
      const whaleRatio = trapData.whaleRatio * 100;
      if (whaleRatio >= 80) {
        evidenceItems.push(`クジラ比率: ${whaleRatio.toFixed(0)}% — 高い売り圧力が検出されています`);
      } else if (whaleRatio >= 50) {
        evidenceItems.push(`クジラ比率: ${whaleRatio.toFixed(0)}% — やや高い売り圧力`);
      } else {
        evidenceItems.push(`クジラ比率: ${whaleRatio.toFixed(0)}% — 正常範囲内（クジラの動きは安定）`);
      }
    }
  }

  // Market Dataから根拠を抽出
  if (marketData) {
    if (marketData.mpi !== undefined) {
      const mpi = marketData.mpi;
      if (mpi > 2.0) {
        evidenceItems.push(`マイナーポジションインデックス: ${mpi.toFixed(2)} — マイナーが売却中（注意が必要）`);
      } else if (mpi < 0.5) {
        evidenceItems.push(`マイナーポジションインデックス: ${mpi.toFixed(2)} — マイナーが保持中（ポジティブシグナル）`);
      }
    }
  }

  // デフォルトの根拠（データがない場合）
  if (evidenceItems.length === 0) {
    evidenceItems.push('オンチェーンデータ分析がトラップリスクを示しています');
  }

  return evidenceItems.slice(0, 2); // 最大2つまで
}

/**
 * 簡易的なDr. Grokコメントを生成
 */
function generateDrGrokComment(trapScore, sentimentData = null) {
  const comments = [];

  if (!trapScore || trapScore < 30) {
    // Trap Scoreが低い場合：低リスクでも価値を提供
    const lowRiskMessages = [
      '"忍耐は戦略的な強さだ。明確な機会を待ち続けよう。"',
      '"今は低リスクだが、市場は常に変化する。準備を怠らないことが勝利への鍵だ。"',
      '"防御は弱さではない。70%の時間、何もしないことが最強の戦略だ。"',
    ];
    comments.push(lowRiskMessages[Math.floor(Math.random() * lowRiskMessages.length)]);
  } else if (trapScore >= 70) {
    comments.push('"FOMOが今高い。貪欲が防御戦略を上回らないように。待とう。今が最も危険な時だ。"');
  } else if (trapScore >= 50) {
    comments.push('"規律を保とう。市場はあなたの忍耐を試している。防御第一。明確なシグナルを待て。"');
  } else {
    comments.push('"良い規律だ。明確な機会を待ち続けよう。低リスクでも警戒を怠るな。"');
  }

  // Sentiment Dataから追加コメント
  if (sentimentData) {
    if (sentimentData.sentiment === 'FOMO' || sentimentData.sentiment === 'GREED') {
      comments.push('"市場のセンチメントは感情的だ。これがトラップが発生する時だ。冷静さを保とう。"');
    } else if (sentimentData.sentiment === 'FEAR') {
      comments.push('"恐怖は自然な感情だ。しかし、データに基づいた判断があなたを守る。"');
    }
  }

  return comments[0] || null;
}

/**
 * Mental Noteを生成
 */
function generateMentalNote(trapScore = null, avoidProTraderMessage = false, drGrokComment = null) {
  const allMentalNotes = [
    '"70%の時間、何もしない。明確な優位性が現れるまで防御する。"',
    '"資本を守ることが最優先。勝つことより、負けないことが重要だ。"',
    '"市場の70%はノイズだ。明確なシグナルだけに反応する。それが勝利への道だ。"',
    '"待つことは弱さではない。それは最強の戦略だ。"',
    '"防御は攻撃の最高の形。資本を守ることがすべての始まりだ。"',
    '"プロトレーダーの90%は待つ時間を最優先する。あなたも同じ戦略を取ろう。"',
  ];
  
  // 戦略的インサイトで「プロトレーダーは待つ時間を最優先」を使った場合は、メンタルノートでは別のメッセージを選ぶ
  let availableNotes = allMentalNotes;
  if (avoidProTraderMessage) {
    availableNotes = availableNotes.filter(note => !note.includes('プロトレーダー'));
  }
  
  // Dr. Grokコメントと重複を避ける
  if (drGrokComment) {
    // コメントに「70%の時間」が含まれる場合は、Mental Noteで同じフレーズを避ける
    if (drGrokComment.includes('70%の時間') || drGrokComment.includes('70%')) {
      availableNotes = availableNotes.filter(note => !note.includes('70%の時間') && !note.includes('70%'));
    }
    // コメントに「防御は弱さではない」が含まれる場合は、Mental Noteで同じフレーズを避ける
    if (drGrokComment.includes('防御は弱さではない')) {
      availableNotes = availableNotes.filter(note => !note.includes('防御は弱さではない'));
    }
    // コメントに「弱さではない」が含まれる場合は、Mental Noteで同じフレーズを避ける
    if (drGrokComment.includes('弱さではない')) {
      availableNotes = availableNotes.filter(note => !note.includes('弱さではない'));
    }
    // コメントに「最強の戦略」が含まれる場合は、Mental Noteで同じフレーズを避ける
    if (drGrokComment.includes('最強の戦略')) {
      availableNotes = availableNotes.filter(note => !note.includes('最強の戦略'));
    }
  }
  
  // 利用可能なメッセージがない場合は、すべてから選ぶ
  if (availableNotes.length === 0) {
    availableNotes = allMentalNotes;
  }
  
  const selectedNote = availableNotes[Math.floor(Math.random() * availableNotes.length)];
  return selectedNote;
}

/**
 * 無料ハイクオリティ版のTelegramメッセージを生成
 * Trap Score + 簡易分析 + 簡易Dr. Grokコメント + Mental Note
 * 
 * @param {Object} options - メッセージ生成オプション
 * @param {Date} options.now - 現在時刻
 * @param {number|null} options.trapScore - Trap Score (0-100)
 * @param {number|null} options.priceUsd - BTC価格（USD）
 * @param {number|null} options.change24h - 24時間変動率（%）
 * @param {Object} options.trapData - Trap Data（オプション）
 * @param {Object} options.marketData - Market Data（オプション）
 * @param {Object} options.sentimentData - Sentiment Data（オプション）
 * @param {string} options.lang - 言語コード（デフォルト: 'ja'）
 * @returns {string} Telegramメッセージ文字列
 */
function formatMinimalHighQualityBriefing({
  now = new Date(),
  trapScore = null,
  priceUsd = null,
  change24h = null,
  trapData = null,
  marketData = null,
  sentimentData = null,
  lang = 'ja',
} = {}) {
  const ts = now.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
  
  const scoreDisplay = trapScore != null ? Math.round(Number(trapScore)) : 'N/A';
  const scoreDescription = getTrapScoreDescription(trapScore);
  
  const priceLine = priceUsd != null && change24h != null
    ? `💰 BTC価格: $${priceUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })} (${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}% / 24h)`
    : '💰 BTC価格: 取得中...';

  const whatToAvoid = generateWhatToAvoid(trapScore, trapData);
  const evidence = generateEvidence(trapData, marketData);
  const drGrokComment = generateDrGrokComment(trapScore, sentimentData);
  
  // 戦略的インサイトで「プロトレーダーは待つ時間を最優先」を使う可能性がある場合は、メンタルノートで避ける
  const trapScoreRounded = trapScore !== null ? Math.round(trapScore) : null;
  const useProTraderMessageInInsight = trapScoreRounded !== null && trapScoreRounded < 50 && trapScoreRounded >= 0;
  const mentalNote = generateMentalNote(trapScore, useProTraderMessageInInsight, drGrokComment);

  let message = `🌤️ Trap Defence BTC - 無料レポート
🚨 BREAKING: トラップ防御ブリーフィング
📅 ${ts}

━━━━━━━━━━━━━━━━━━━━
🎯 本日のTrap Score
━━━━━━━━━━━━━━━━━━━━
${scoreDisplay}/100
${scoreDescription}

${priceLine}`;

  // 問題の提示セクション（Trap Scoreに基づいて問題を提示）
  if (trapScore !== null && trapScore >= 30) {
    const trapScoreRounded = Math.round(trapScore);
    
    if (trapScoreRounded >= 70) {
      message += `\n\n🚨 市場は強いトラップシグナルを示しています。価格チャートが示唆するものにもかかわらず、オンチェーンデータは隠れたリスクを明らかにしています`;
      message += `\n💡 複数のダイバージェンスと異常が潜在的な市場トラップを示しています。今入場すると、重大なリスクにさらされる可能性があります`;
    } else if (trapScoreRounded >= 50) {
      message += `\n\n⚡ 市場は中程度のトラップ指標を示しています。一部のダイバージェンスが注意を促しています`;
      message += `\n💡 トラップシグナルが存在します。今急いで取引すると損失につながる可能性があります`;
    } else {
      message += `\n\n✅ 市場状況は比較的安全に見えますが、トラップパターンは急速に出現する可能性があります`;
      message += `\n💡 低リスク条件でも、忍耐は戦略的な強さです`;
    }
  } else if (trapScore !== null && trapScore < 30) {
    // 低リスク時でも簡潔な市場状況を提示
    message += `\n\n💡 現在の市場状況は比較的安定していますが、常に警戒を怠らないことが重要です`;
  }

  // Step 2: 証拠（Evidence）セクション
  // 低リスク時でも証拠セクションを常に表示（価値提供のため）
  if (evidence && evidence.length > 0) {
    message += `\n\n━━━━━━━━━━━━━━━━━━━━
📊 データに基づく理由
━━━━━━━━━━━━━━━━━━━━`;
    evidence.forEach(item => {
      message += `\n• ${item}`;
    });
    
    // 【改善2: 「70%待機戦略」の証拠ベース説明の統合】EvidenceとMental Noteを連動
    // 低リスク時でも説明を追加（価値提供のため）
    if (trapScore !== null) {
      const trapScoreRounded = Math.round(trapScore);
      message += `\n\n💡 戦略的インサイト`;
      if (trapScoreRounded >= 70) {
        message += `\n  🚨 Trap Score ${trapScoreRounded}/100: 強いシグナルが潜在的な市場トラップを示しています`;
        message += `\n  🛡️ 戦略的な準備は弱さではない—それは勝利への準備だ。70%の時間、勝利のために準備しよう`;
      } else if (trapScoreRounded >= 50) {
        message += `\n  ⚡ Trap Score ${trapScoreRounded}/100: 中程度のトラップ指標が検出されました`;
        message += `\n  🛡️ 防御第一。より明確な市場シグナルを待とう`;
      } else {
        // 低リスク時でも価値を提供
        message += `\n  ✅ Trap Score ${trapScoreRounded}/100: 現在は低トラップリスクですが、市場は常に変化します`;
        message += `\n  🛡️ 低リスク時こそ、戦略的な準備が重要です。明確な優位性が現れるまで防御を続けましょう`;
        message += `\n  💎 プロトレーダーは「待つ時間」を最優先します。あなたも同じ戦略を取りましょう`;
      }
    }
  }

  // Step 3: 解決策（What to Avoid）
  if (whatToAvoid && whatToAvoid.length > 0) {
    message += `\n\n━━━━━━━━━━━━━━━━━━━━
🚫 避けるべきこと
━━━━━━━━━━━━━━━━━━━━`;
    whatToAvoid.forEach(item => {
      message += `\n• ${item}`;
    });
  }

  // Step 4: 成功する結末（Dr. Grok Comment + Mental Note）
  if (drGrokComment) {
    message += `\n\n━━━━━━━━━━━━━━━━━━━━
💊 Dr. Grokのクイックインサイト
━━━━━━━━━━━━━━━━━━━━
${drGrokComment}`;
  }

  // Mental Note
  if (mentalNote) {
    message += `\n\n━━━━━━━━━━━━━━━━━━━━
✅ メンタルノート
━━━━━━━━━━━━━━━━━━━━
${mentalNote}`;
  }

  // CTA（アップセル最適化：開発資金確保のため緊迫感のあるCTA）
  // VSL2とWhopリンクは別途配信されるため、定期配信のMinimal Briefingには含めない
  
  message += `\n\n━━━━━━━━━━━━━━━━━━━━
🚀 完全なインテリジェンスレポートを解除

あなたは一部を見ています。フルメンバーは以下を取得します：

✨ 完全なインテリジェンスレポート
• 完全なオンチェーン分析（すべての指標をリアルタイムで）
• AI駆動の市場インサイトとトラップ検出（24時間監視）
• リアルタイムアラート: AVOID-LONG / AVOID-SHORT / STANDBY（即座に通知）
• エグジットマップとメンタルトレーニングガイダンス（実践的な戦略）
• 完全なDr. Grokの心理的サポート（メンタルブロックの解消）
• リアルタイムXセンチメント分析（市場の感情を先読み）

💎 これらすべてが、あなたの資本を守るために設計されています

📊 無料版 vs 完全版
• 無料版：Trap Scoreのみ（方向性のヒント）
• 完全版：全データ + リアルタイムアラート（具体的な行動指針）

🛡️ 1つの見逃したシグナルが、あなたの資本を守るか失うかを分けます

🎯 今すぐアップグレードして、完全な防御システムを手に入れましょう

━━━━━━━━━━━━━━━━━━━━
これは無料レポートです。詳細分析とトラップアラートについては、Trap Defence BTCにアップグレードしてください

教育目的のみ。金融アドバイスではありません`;

  return message.trim();
}

module.exports = { formatMinimalHighQualityBriefing };
