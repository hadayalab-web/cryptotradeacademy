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
    return '⚠️ 高リスク: 市場トラップの可能性が高いシグナルが検出されました。極度の注意が必要です。';
  } else if (score >= 50) {
    return '⚡ 中リスク: 一部のトラップ指標が検出されました。警戒を怠らないでください。';
  } else if (score >= 30) {
    return '✅ 低リスク: トラップ指標は最小限です。市場状況は比較的安全に見えます。';
  } else {
    return '✅ 非常に低リスク: トラップ指標はほとんど検出されていません。市場状況は安全に見えます。';
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
        avoidItems.push('LONGポジションを避ける - 高いトラップリスクが検出されました');
      } else if (trapData.trapAlert.type === 'AVOID_SHORT') {
        avoidItems.push('SHORTポジションを避ける - 高いトラップリスクが検出されました');
      }
    }
  }

  // デフォルトの回避行動
  if (avoidItems.length === 0) {
    if (trapScore >= 70) {
      avoidItems.push('新しいポジションを開くことを避ける - 強いトラップシグナルが検出されました');
      avoidItems.push('取引前に市場シグナルがより明確になるまで待つ');
    } else if (trapScore >= 50) {
      avoidItems.push('注意を払う - 一部のトラップ指標が存在します');
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
      const sign = netflow >= 0 ? '+' : '';
      const absValue = Math.abs(netflow);
      const flowDir = netflow >= 0 ? '流入' : '流出';
      // BTC単位で表示（有料版と統一）
      evidenceItems.push(`取引所ネットフロー: ${sign}${absValue.toFixed(0)} BTC (${flowDir})`);
    }

    if (trapData.whaleRatio !== undefined && trapData.whaleRatio !== null) {
      const whaleRatio = trapData.whaleRatio * 100;
      evidenceItems.push(`クジラ比率: ${whaleRatio.toFixed(0)}% (${whaleRatio >= 80 ? '高い売り圧力' : '正常'})`);
    }
  }

  // Market Dataから根拠を抽出
  if (marketData) {
    if (marketData.mpi !== undefined) {
      const mpi = marketData.mpi;
      if (mpi > 2.0) {
        evidenceItems.push(`マイナーポジションインデックス: ${mpi.toFixed(2)} (マイナーが売却中)`);
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
    // Trap Scoreが低い場合でも、デフォルトのメッセージを提供
    comments.push('"忍耐は戦略的な強さだ。明確な機会を待ち続けよう。"');
  } else if (trapScore >= 70) {
    comments.push('"FOMOが今高い。貪欲が防御戦略を上回らないように。待とう。"');
  } else if (trapScore >= 50) {
    comments.push('"規律を保とう。市場はあなたの忍耐を試している。防御第一。"');
  } else {
    comments.push('"良い規律だ。明確な機会を待ち続けよう。"');
  }

  // Sentiment Dataから追加コメント
  if (sentimentData) {
    if (sentimentData.sentiment === 'FOMO' || sentimentData.sentiment === 'GREED') {
      comments.push('"市場のセンチメントは感情的だ。これがトラップが発生する時だ。冷静さを保とう。"');
    }
  }

  return comments[0] || null;
}

/**
 * Mental Noteを生成
 */
function generateMentalNote() {
  return '"70%の時間、何もしない。明確な優位性が現れるまで防御する。"';
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
  const mentalNote = generateMentalNote();

  // 【改善1: ニュース番組形式の追加】Openingセクションを追加
  let message = `🌤️ Trap Defense BTC - 無料レポート
🚨 BREAKING: トラップ防御ブリーフィング
📺 【オープニング】市場インテリジェンスブリーフィング
📅 ${ts}

━━━━━━━━━━━━━━━━━━━━
🎯 本日のTrap Score
━━━━━━━━━━━━━━━━━━━━
${scoreDisplay}/100
${scoreDescription}

${priceLine}`;

  // 【改善1: ストーリー構造の追加】問題の提示セクションを追加
  // Step 1: 問題の提示（Trap Scoreに基づいて問題を提示）
  if (trapScore !== null && trapScore >= 30) {
    const trapScoreRounded = Math.round(trapScore);
    message += `\n\n━━━━━━━━━━━━━━━━━━━━
📖 【市場ストーリー】問題
━━━━━━━━━━━━━━━━━━━━`;
    
    if (trapScoreRounded >= 70) {
      message += `\n🚨 市場は強いトラップシグナルを示しています。価格チャートが示唆するものにもかかわらず、オンチェーンデータは隠れたリスクを明らかにしています。`;
      message += `\n💡 問題: 複数のダイバージェンスと異常が潜在的な市場トラップを示しています。今入場すると、重大なリスクにさらされる可能性があります。`;
    } else if (trapScoreRounded >= 50) {
      message += `\n⚡ 市場は中程度のトラップ指標を示しています。一部のダイバージェンスが注意を促しています。`;
      message += `\n💡 問題: トラップシグナルが存在します。今急いで取引すると損失につながる可能性があります。`;
    } else {
      message += `\n✅ 市場状況は比較的安全に見えますが、トラップパターンは急速に出現する可能性があります。`;
      message += `\n💡 問題: 低リスク条件でも、忍耐は戦略的な強さです。`;
    }
  }

  // Step 2: 証拠（Evidence）セクション
  if (evidence && evidence.length > 0) {
    message += `\n\n━━━━━━━━━━━━━━━━━━━━
📊 【証拠】なぜ待つのか？データに基づく理由
オンチェーンデータで証明済み
━━━━━━━━━━━━━━━━━━━━`;
    evidence.forEach(item => {
      message += `\n• ${item}`;
    });
    
    // 【改善2: 「70%待機戦略」の証拠ベース説明の統合】EvidenceとMental Noteを連動
    if (trapScore !== null && trapScore >= 30) {
      const trapScoreRounded = Math.round(trapScore);
      message += `\n\n💡 なぜ待つのか？（証拠ベース）`;
      if (trapScoreRounded >= 70) {
        message += `\n   🚨 Trap Score ${trapScoreRounded}/100: 強いシグナルが潜在的な市場トラップを示しています。`;
        message += `\n   🛡️ 戦略的な準備は弱さではない—それは勝利への準備だ。70%の時間、勝利のために準備しよう。`;
      } else if (trapScoreRounded >= 50) {
        message += `\n   ⚡ Trap Score ${trapScoreRounded}/100: 中程度のトラップ指標が検出されました。`;
        message += `\n   🛡️ 防御第一。より明確な市場シグナルを待とう。`;
      } else {
        message += `\n   ✅ Trap Score ${trapScoreRounded}/100: 低トラップリスクだが、警戒を怠らない。`;
        message += `\n   🛡️ 低リスク条件でも、戦略的な準備は勝利への準備だ。`;
      }
    }
  }

  // Step 3: 解決策（What to Avoid）
  if (whatToAvoid && whatToAvoid.length > 0) {
    message += `\n\n━━━━━━━━━━━━━━━━━━━━
🚫 【解決策】避けるべきこと
━━━━━━━━━━━━━━━━━━━━`;
    whatToAvoid.forEach(item => {
      message += `\n• ${item}`;
    });
  }

  // Step 4: 成功する結末（Dr. Grok Comment + Mental Note）
  // 【改善1: ニュース番組形式の追加】コメンテーターセクション
  if (drGrokComment) {
    message += `\n\n━━━━━━━━━━━━━━━━━━━━
💊 【コメンテーター】Dr. Grokのクイックインサイト
━━━━━━━━━━━━━━━━━━━━
${drGrokComment}`;
  }

  // 【改善1: ストーリー構造の追加】成功する結末（Mental Note）
  if (mentalNote) {
    message += `\n\n━━━━━━━━━━━━━━━━━━━━
✅ 【成功する結末】メンタルノート
━━━━━━━━━━━━━━━━━━━━
${mentalNote}`;
  }
  
  // 【改善1: ニュース番組形式の追加】Closingセクションを追加
  message += `\n\n━━━━━━━━━━━━━━━━━━━━
📺 【クロージング】次回もお楽しみに
━━━━━━━━━━━━━━━━━━━━`;

  // CTA（アップセル最適化：開発資金確保のため緊迫感のあるCTA）
  // VSL2とWhopリンクは別途配信されるため、定期配信のMinimal Briefingには含めない
  
  message += `\n\n━━━━━━━━━━━━━━━━━━━━
🚀 完全なインテリジェンスレポートを解除

あなたは一部を見ています。フルメンバーは以下を取得します：

✨ 完全なインテリジェンスレポート
• 完全なオンチェーン分析（すべての指標）
• AI駆動の市場インサイトとトラップ検出
• リアルタイムアラート: AVOID-LONG / AVOID-SHORT / STANDBY
• エグジットマップとメンタルトレーニングガイダンス
• 完全なDr. Grokの心理的サポート
• リアルタイムXセンチメント分析

💡 なぜアップグレードするのか？
資本を保護することと失うことの違いは、しばしば1つの見逃したトラップシグナルだけです。

━━━━━━━━━━━━━━━━━━━━
これは無料レポートです。詳細分析とトラップアラートについては、Trap Defense BTCにアップグレードしてください。

教育目的のみ。金融アドバイスではありません。`;

  return message.trim();
}

module.exports = { formatMinimalHighQualityBriefing };
