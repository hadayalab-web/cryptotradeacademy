// services/x/proof-post.js
// 有料版メッセージの一部をマスクしてXに投稿（証拠として）

const { postTweet, uploadMedia } = require('./client');
const { generateTrapScoreCard } = require('./image-generator');
const fs = require('fs');
const path = require('path');

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

  // X投稿用テキストを構築（X Premium前提: 280文字制限は適用しない）
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
 * @param {boolean} options.useCartoon - 風刺画を追加するか（デフォルト: false）
 * @returns {Promise<Object>} 投稿結果 {id, text, url}
 */
async function postProofToX(fullMessage, options = {}) {
  const maskedText = maskMessageForProof(fullMessage, options);
  
  const mediaIds = [];
  const { useCartoon = false } = options;

  // 1. Trap Score Card画像を生成・アップロード
  try {
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
    
    console.log('[X Proof Post] Uploading Trap Score Card to X...');
    const scoreCardMediaId = await uploadMedia(imageBuffer);
    mediaIds.push(scoreCardMediaId);
    console.log(`[X Proof Post] Trap Score Card uploaded successfully. Media ID: ${scoreCardMediaId}`);
    
  } catch (imgError) {
    console.error('[X Proof Post] Trap Score Card generation/upload failed:', imgError.message);
    // スコアカード生成失敗でも続行
  }

  // 2. 風刺画を追加（オプション）
  if (useCartoon) {
    try {
      const cartoonPath = path.join(process.cwd(), 'public/images/thumbnails/cartoon_manipulation.png');
      if (fs.existsSync(cartoonPath)) {
        console.log('[X Proof Post] Loading editorial cartoon...');
        const cartoonBuffer = fs.readFileSync(cartoonPath);
        const cartoonMediaId = await uploadMedia(cartoonBuffer);
        mediaIds.push(cartoonMediaId);
        console.log(`[X Proof Post] Editorial cartoon uploaded successfully. Media ID: ${cartoonMediaId}`);
      } else {
        console.warn('[X Proof Post] Editorial cartoon not found at:', cartoonPath);
      }
    } catch (cartoonError) {
      console.error('[X Proof Post] Editorial cartoon upload failed:', cartoonError.message);
      // 風刺画アップロード失敗でも続行
    }
  }

  try {
    const result = await postTweet(maskedText, mediaIds.length > 0 ? mediaIds : undefined);
    const tweetUrl = `https://twitter.com/i/web/status/${result.id}`;
    
    console.log(`[X Proof Post] Posted successfully: ${tweetUrl} (Media count: ${mediaIds.length})`);
    
    return {
      id: result.id,
      text: result.text,
      url: tweetUrl,
      maskedText,
      hasMedia: mediaIds.length > 0,
      mediaCount: mediaIds.length
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
