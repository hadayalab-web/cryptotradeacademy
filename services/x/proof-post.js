// services/x/proof-post.js
// 有料版メッセージの一部をマスクしてXに投稿（証拠として）

const { postTweet, uploadMedia } = require('./client');
const { generateTrapScoreCard } = require('./image-generator');

/**
 * 有料版メッセージの一部をマスクして証拠用テキストを生成
 * Geminiのアドバイスに基づき、証拠として使える部分を残しつつ機密情報を隠す
 * 
 * @param {string} fullMessage - 完全な有料版メッセージ
 * @param {Object} options - オプション
 * @param {number} options.trapScore - Trap Score
 * @param {Object} options.trapDetection - Trap Detection結果
 * @param {Object} options.trapAlert - Trap Alert結果
 * @param {string} options.lang - 言語コード（デフォルト: 'en'）
 * @param {string} options.socialProofText - 社会的証明テキスト（オプション）
 * @returns {string} マスク済みメッセージ（X投稿用）
 */
function maskMessageForProof(fullMessage, options = {}) {
  const {
    trapScore = null,
    trapDetection = null,
    trapAlert = null,
    lang = 'en',
    socialProofText = null, // 追加: 社会的証明テキスト
  } = options;

  // 証拠として残すべき要素を抽出
  const proofElements = [];

  // 1. Trap Score（最重要）
  if (trapScore !== null) {
    const scoreRounded = Math.round(trapScore);
    const riskLevel = scoreRounded >= 70 ? 'HIGH RISK' : 
                     scoreRounded >= 50 ? 'MODERATE RISK' : 'LOW RISK';
    proofElements.push(`🎯 Trap Score: ${scoreRounded}/100 (${riskLevel})`);
  }

  // 2. Trap Detection結果（AIエンジンが検知した事実）
  if (trapDetection && trapDetection.trapDetected) {
    const trapType = (trapDetection.trapType || 'Trap').replace(/_/g, ' ');
    const severity = trapDetection.trapSeverity || 'UNKNOWN';
    proofElements.push(`⚠️ AI Detected: ${trapType} (Severity: ${severity})`);
    
    // 詳細な証拠データ（複数ダイバージェンスなど）
    if (trapDetection.details) {
      const details = trapDetection.details;
      const evidenceParts = [];
      
      if (details.multipleDivergences >= 3) {
        evidenceParts.push(`${details.multipleDivergences} divergences`);
      }
      if (details.anomalyDetected) {
        evidenceParts.push('high-res anomaly');
      }
      if (details.accelerationDetected) {
        evidenceParts.push('trend acceleration');
      }
      
      if (evidenceParts.length > 0) {
        proofElements.push(`📊 Evidence: ${evidenceParts.join(' + ')}`);
      }
    }
  }

  // 3. Trap Alert（推奨アクション）
  if (trapAlert && trapAlert.alert) {
    const alertType = trapAlert.type ? trapAlert.type.replace(/_/g, '-') : 'UNKNOWN';
    const recommendation = trapAlert.recommendation ? trapAlert.recommendation.replace(/_/g, '-') : 'STANDBY';
    proofElements.push(`🛡️ Alert: ${alertType} → ${recommendation}`);
    
    if (trapAlert.confidence) {
      const confidencePct = Math.round(trapAlert.confidence * 100);
      proofElements.push(`📊 Confidence: ${confidencePct}%`);
    }
  }

  // 4. 4つのAIエンジン同期の証拠（Geminiのアドバイスに基づく）
  const aiEngines = [];
  if (trapDetection) aiEngines.push('Trap Defense Engine');
  if (trapAlert) aiEngines.push('Alert System');
  // GPT ReporterとGrok Xはメッセージ内に含まれる
  
  if (aiEngines.length > 0) {
    proofElements.push(`🤖 AI Engines Synced: ${aiEngines.join(', ')}`);
  }

  // 5. ビフォー・アフター比較のヒント（Geminiのアドバイスに基づく）
  if (trapScore !== null && trapScore >= 50) {
    proofElements.push(`💡 If you entered here, you'd be whale food. Defense protocol avoided it.`);
  }

  // 追加: 社会的証明（Social Proof）を表示
  if (socialProofText) {
    proofElements.push(`\n${socialProofText}`);
  }

  // X投稿用テキストを構築（280文字制限内）
  let proofText = '';
  
  if (lang === 'en') {
    proofText = `🚨 AI Trap Detection Alert\n\n${proofElements.join('\n')}\n\n`;
    proofText += `📺 Full Intelligence Report available for members\n`;
    proofText += `🔗 cryptotradeacademy.io\n\n`;
    proofText += `#Bitcoin #TrapDefense #AI`;
  } else if (lang === 'ja') {
    proofText = `🚨 AIトラップ検知アラート\n\n${proofElements.join('\n')}\n\n`;
    proofText += `📺 メンバー向け完全インテリジェンスレポート\n`;
    proofText += `🔗 cryptotradeacademy.io\n\n`;
    proofText += `#ビットコイン #トラップ防御 #AI`;
  } else {
    // その他の言語は英語版を使用
    proofText = `🚨 AI Trap Detection Alert\n\n${proofElements.join('\n')}\n\n`;
    proofText += `📺 Full Intelligence Report available for members\n`;
    proofText += `🔗 cryptotradeacademy.io\n\n`;
    proofText += `#Bitcoin #TrapDefense #AI`;
  }

  // 280文字制限チェック
  if (proofText.length > 280) {
    // 最後の要素を削除して調整
    const lines = proofText.split('\n');
    while (proofText.length > 280 && lines.length > 3) {
      lines.pop();
      proofText = lines.join('\n');
    }
    
    // それでも長い場合は切り詰め
    if (proofText.length > 280) {
      proofText = proofText.substring(0, 277) + '...';
    }
  }

  return proofText;
}

/**
 * 有料版メッセージをマスクしてXに投稿（証拠として）
 * 画像付きで投稿する
 * 
 * @param {string} fullMessage - 完全な有料版メッセージ
 * @param {Object} options - オプション
 * @param {number} options.trapScore - Trap Score
 * @param {Object} options.trapDetection - Trap Detection結果
 * @param {Object} options.trapAlert - Trap Alert結果
 * @param {string} options.lang - 言語コード（デフォルト: 'en'）
 * @param {string} options.socialProofText - 社会的証明テキスト（オプション）
 * @returns {Promise<Object>} 投稿結果 {id, text, url}
 */
async function postProofToX(fullMessage, options = {}) {
  const maskedText = maskMessageForProof(fullMessage, options);
  
  let mediaId = null;

  try {
    // 画像生成とアップロード
    console.log('[X Proof Post] Generating Trap Score Card image...');
    
    const { trapScore, trapDetection } = options;
    
    let riskLevel = 'LOW';
    if (trapScore >= 70) riskLevel = 'HIGH';
    else if (trapScore >= 50) riskLevel = 'MODERATE';
    
    let trapType = 'None';
    if (trapDetection && trapDetection.trapDetected) {
       trapType = (trapDetection.trapType || 'Trap').replace(/_/g, ' ');
    }
    
    // 日付フォーマット YYYY-MM-DD
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];

    const imageBuffer = await generateTrapScoreCard({
        trapScore: trapScore || 0,
        riskLevel,
        trapType,
        date: dateStr
    });
    
    console.log('[X Proof Post] Uploading image to X...');
    mediaId = await uploadMedia(imageBuffer);
    console.log(`[X Proof Post] Image uploaded successfully. Media ID: ${mediaId}`);
    
  } catch (imgError) {
    console.error('[X Proof Post] Image generation/upload failed, proceeding with text only:', imgError.message);
    // 画像生成失敗でもテキスト投稿は継続する
  }

  try {
    const mediaIds = mediaId ? [mediaId] : [];
    const result = await postTweet(maskedText, mediaIds);
    const tweetUrl = `https://twitter.com/i/web/status/${result.id}`;
    
    console.log(`[X Proof Post] Posted successfully: ${tweetUrl}`);
    
    return {
      id: result.id,
      text: result.text,
      url: tweetUrl,
      maskedText,
      hasMedia: !!mediaId
    };
  } catch (error) {
    console.error('[X Proof Post] Failed to post:', error.message);
    throw error;
  }
}

module.exports = {
  maskMessageForProof,
  postProofToX,
};
