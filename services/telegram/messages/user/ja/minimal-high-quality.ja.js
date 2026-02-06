// 無料ハイクオリティ版Telegram配信用のテキストフォーマット関数
// services/telegram/messages/user/ja/minimal-high-quality.ja.js
// Trap Score + 簡易分析 + 簡易Dr. Grokコメント + Mental Note

/**
 * Trap Scoreの説明を取得（ネイティブ調）
 */
function getTrapScoreDescription(trapScore) {
  if (trapScore == null || trapScore === undefined || isNaN(Number(trapScore))) {
    return 'Trap Scoreは計算中。焦って先回りしないでOKです。';
  }
  const score = Number(trapScore);

  if (score >= 70) {
    return 'Trap Score高め。今日は"攻め"より"守り"優先。';
  } else if (score >= 50) {
    return '混合ゾーン。確認が出るまで無理に触らない。';
  } else if (score >= 30) {
    return '雰囲気は怖い。でもデータはまだ"罠"寄りじゃない。';
  } else {
    return 'Trap Scoreはかなり低め（ただし油断は禁物）。';
  }
}

/**
 * What to Avoid（回避行動）を生成
 */
function generateWhatToAvoid(trapScore, trapData = null) {
  const score = trapScore == null ? null : Number(trapScore);
  if (score == null || Number.isNaN(score) || score < 50) {
    return null;
  }

  const avoidItems = [];
  
  // Trap Dataから回避行動を抽出
  if (trapData) {
    if (trapData.trapAlert) {
      if (trapData.trapAlert.type === 'AVOID_LONG') {
        avoidItems.push('防御モード：今は無理にロング/ショートを作らない');
      } else if (trapData.trapAlert.type === 'AVOID_SHORT') {
        avoidItems.push('防御モード：今は無理にロング/ショートを作らない');
      }
    }
  }

  // デフォルトの回避行動（ネイティブ調）
  if (avoidItems.length === 0) {
    if (score >= 70) {
      avoidItems.push('ロング/ショートは無理に作らない — 防御モード');
      avoidItems.push('サイズ落として、損切りライン先に決める');
    } else if (score >= 50) {
      avoidItems.push('待つのもポジション — 確認待ち');
      avoidItems.push('混合ゾーン。無理にエントリーしない');
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
        evidenceItems.push(`クジラ比率：${whaleRatio.toFixed(0)}% — 売り圧は強め（でも過剰反応は不要）`);
      } else if (whaleRatio >= 50) {
        evidenceItems.push(`クジラ比率：${whaleRatio.toFixed(0)}% — 売り圧は中程度（警戒寄り）`);
      } else {
        evidenceItems.push(`クジラ比率: ${whaleRatio.toFixed(0)}% — 正常範囲内（クジラの動きは安定）`);
      }
    }
  }

  // Market Dataから根拠を抽出
  if (marketData) {
    if (marketData.mpi !== undefined && marketData.mpi !== null) {
      const mpi = marketData.mpi;
      if (mpi > 2.0) {
        evidenceItems.push(`マイナーポジションインデックス: ${mpi.toFixed(2)} — マイナーが売却中（注意が必要）`);
      } else if (mpi < 0.5) {
        evidenceItems.push(`マイナーポジションインデックス：${mpi.toFixed(2)} — マイナーは売り急いでいない`);
      } else {
        evidenceItems.push(`マイナーポジションインデックス: ${mpi.toFixed(2)} — 正常範囲`);
      }
    }
  }

  // デフォルトの根拠（データがない場合、ネイティブ調）
  if (evidenceItems.length === 0) {
    evidenceItems.push('オンチェーンはまだ決定打なし（だからこそ焦らない）');
  }

  return evidenceItems.slice(0, 2); // 最大2つまで
}

/**
 * 簡易的なDr. Grokコメントを生成
 */
function generateDrGrokComment(trapScore, sentimentData = null) {
  const comments = [];

  const score = trapScore == null ? null : Number(trapScore);
  if (score == null || Number.isNaN(score) || score < 30) {
    // Trap Scoreが低い場合：認知的不協和と油断の警告（ネイティブ調）
    const lowRiskMessages = [
      '"赤いローソクの不快感を消したくて売りたくなる。でも不安は現実じゃない。罠は下落ではなく、衝動的な撤退です。"',
      '"雰囲気は怖い。でもデータはまだ"罠"寄りじゃない。注意：0/100は油断を生む。"',
      '"誰も言わないこと：0/100は油断を生む。大きい罠は静かな時間に仕込まれる。"',
    ];
    comments.push(lowRiskMessages[Math.floor(Math.random() * lowRiskMessages.length)]);
  } else if (score >= 70) {
    comments.push('"FOMOが今高い。貪欲が防御戦略を上回らないように。待とう。今が最も危険な時だ。"');
  } else if (score >= 50) {
    comments.push('"規律を保とう。市場はあなたの忍耐を試している。防御第一。明確なシグナルを待て。"');
  } else {
    comments.push('"良い規律だ。明確な機会を待ち続けよう。低リスクでも警戒を怠るな。"');
  }

  // Sentiment Dataから追加コメント
  if (sentimentData) {
    if (sentimentData.sentiment === 'FOMO' || sentimentData.sentiment === 'GREED') {
      comments.push('"市場のセンチメントは感情的だ。これがトラップが発生する時だ。冷静さを保とう。"');
    } else if (sentimentData.sentiment === 'FEAR' || sentimentData.sentiment === 'Fear') {
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
    '待つのもポジション',
    '今日の勝ちは「削られないこと」',
    '手が動くなら、それは感情',
    '赤いローソク＝危険、ではない',
    '信号なしならノートレード',
    '現金もポジション。防御は能動的',
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
  score = null, // Market Score (optional, can also be in marketData.score)
  grokGeminiOptimization = null, // Grok Xアルゴリズム解析 × Gemini深層心理分析統合最適化結果
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

  // GPT設計書に完全準拠: 4-post thread形式（Telegram用に1メッセージに統合）
  const change24hFormatted = change24h != null ? (change24h >= 0 ? `+${change24h.toFixed(2)}` : change24h.toFixed(2)) : 'N/A';
  const sentimentRaw = sentimentData?.sentiment;
  const sentimentLabelJa =
    sentimentRaw === 'Extreme Fear' ? '極度の恐怖' :
    sentimentRaw === 'Extreme Greed' ? '極度の強欲' :
    (sentimentRaw === 'Fear' || sentimentRaw === 'FEAR') ? '恐怖' :
    (sentimentRaw === 'Greed' || sentimentRaw === 'GREED') ? '強欲' :
    sentimentRaw === 'FOMO' ? 'FOMO' :
    sentimentRaw === 'Neutral' ? '中立' : '中立';
  // trapScoreRoundedは上で既に定義済み
  
  // [1/4] Hook: Trap Score理由1行 + gut vs data
  let message = `[1/4] 🚨 Hook
━━━━━━━━━━━━━━━━━━━━`;
  
  if (scoreDisplay === 'N/A') {
    message += `\n🚨 BTCは${change24hFormatted}%、センチメントは「${sentimentLabelJa}」。
でもTrap Scoreは計算中。先回りで入らない。`;
  } else {
    const trapReasonLine = (trapData?.exchangeNetflow > 0 || marketData?.mpi > 2)
      ? ` Netflow＋MPI＋センチメント＝Trap Defence的にはStandby Mode。`
      : ``;
    message += `\n🚨 BTCは${change24hFormatted}%、センチメントは「${sentimentLabelJa}」。
でもTrap Scoreは **${scoreDisplay}/100**。${trapReasonLine}`;
  }
  
  message += `\n\n焦って触らない。確認待ち。直感 vs データ—データが勝つ。`;

  // [2/4] Quick reads (Netflow+MPIセット意味づけ + Trap Defence的解釈)
  message += `\n\n[2/4] 📊 要点だけ
━━━━━━━━━━━━━━━━━━━━`;
  
  if (trapData?.exchangeNetflow !== undefined && trapData.exchangeNetflow !== null) {
    const netflow = trapData.exchangeNetflow;
    const absValue = Math.abs(netflow);
    if (netflow < 0) {
      message += `\n・取引所Netflow：**${absValue.toFixed(0)} BTC（流出）**＝取引所から出ている（短期の売り圧は出にくい）`;
    } else if (netflow > 0) {
      message += `\n・取引所Netflow：**+${absValue.toFixed(0)} BTC（流入）**＝売却圧力の可能性`;
    }
  }
  
  if (marketData?.mpi !== undefined && marketData.mpi !== null) {
    const mpi = marketData.mpi;
    message += `\n・MPI：**${mpi.toFixed(2)}**＝マイナーは投げ売りしていない`;
  }
  
  message += `\n\nNetflow＋MPIを合わせると、Trap Defenceはローソクより先に読む。赤いローソク≠即トラップ。`;

  // [3/4] Psych coaching: 短く・刺さる・Dr. Grok世界観
  message += `\n\n[3/4] 🧠 心理コーチング（Dr. Grok）
━━━━━━━━━━━━━━━━━━━━`;
  
  if (trapScoreRounded == null) {
    message += `\nスコア計算中。先回りするな。`;
  } else if (trapScoreRounded < 30) {
    message += `\n${trapScoreRounded}/100＝油断リスク。大きい罠は静かな時間に仕込まれる。警戒維持。`;
  } else if (trapScoreRounded < 50) {
    message += `\n雰囲気は怖い。データはまだ"罠"寄りじゃない。恐怖にクリックさせるな。`;
  } else {
    message += `\n防御モード。ローソクは騒いでる。リスクはまだ。Standby Mode。`;
  }
  
  // [4/4] Poll + シンプルCTA（返信負荷軽減・1分で読める）
  message += `\n\n[4/4] 🗳️ 投票 + CTA
━━━━━━━━━━━━━━━━━━━━
投票：Trap Score ${scoreDisplay === 'N/A' ? '（計算中）' : `**${scoreDisplay}/100**`}、今どうする？
A) ホールド  B) 押し目買い  C) リスク落とす  D) 確認待ち

リアルタイム警告が欲しい？次に落ちる前に知りたい？ **TRAP** と返信でリンク送る。1つの見逃し＝資本減少。 #BTC #Bitcoin #TrapDefence`;

  return message.trim();
}

module.exports = { formatMinimalHighQualityBriefing };
