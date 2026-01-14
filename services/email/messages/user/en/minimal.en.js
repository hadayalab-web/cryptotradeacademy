// 無料ミニマム版Eメール配信用のHTMLフォーマット関数
// services/email/messages/user/en/minimal.en.js
// Trap Score表示のみ（詳細分析なし）

const fs = require('fs');
const path = require('path');

/**
 * ロゴをbase64エンコードして取得
 */
function getLogoBase64(transparent = true) {
  try {
    const projectRoot = path.resolve(__dirname, '../../../../..');
    const logoPath = transparent
      ? path.join(projectRoot, 'data/vsl-assets/logos/cryptotradeacademy-logo-transparent.png')
      : path.join(projectRoot, 'data/vsl-assets/logos/cryptotradeacademy-logo.png');
    
    if (fs.existsSync(logoPath)) {
      const logoBuffer = fs.readFileSync(logoPath);
      const base64Logo = logoBuffer.toString('base64');
      return `data:image/png;base64,${base64Logo}`;
    }
    return null;
  } catch (error) {
    console.warn(`[Email] Error loading logo: ${error.message}`);
    return null;
  }
}

function getEmailStyles() {
  return `
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        line-height: 1.6;
        color: #333;
        max-width: 600px;
        margin: 0 auto;
        padding: 20px;
        background-color: #f5f5f5;
      }
      @media only screen and (max-width: 600px) {
        body {
          padding: 10px;
        }
        .email-container {
          padding: 20px;
        }
        .header {
          padding: 20px 15px;
        }
        .trap-score-section {
          padding: 15px;
        }
      }
      .email-container {
        background-color: #ffffff;
        border-radius: 8px;
        padding: 30px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
      .header {
        text-align: center;
        border-bottom: 3px solid #007bff;
        padding-bottom: 20px;
        margin-bottom: 30px;
      }
      .header .logo {
        max-width: 200px;
        margin-bottom: 15px;
      }
      .header h1 {
        margin: 0;
        font-size: 28px;
        color: #007bff;
      }
      .header h2 {
        margin: 10px 0 0 0;
        font-size: 18px;
        color: #666;
        font-weight: normal;
      }
      .trap-score-section {
        text-align: center;
        padding: 40px 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 12px;
        color: #fff;
        margin: 30px 0;
      }
      .trap-score-value {
        font-size: 72px;
        font-weight: bold;
        margin: 20px 0;
        text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
      }
      .trap-score-label {
        font-size: 18px;
        opacity: 0.9;
        margin-bottom: 10px;
      }
      .trap-score-description {
        font-size: 14px;
        opacity: 0.8;
        margin-top: 20px;
        padding-top: 20px;
        border-top: 1px solid rgba(255,255,255,0.3);
      }
      .upgrade-cta {
        text-align: center;
        padding: 30px 20px;
        background-color: #f8f9fa;
        border-radius: 8px;
        margin: 30px 0;
      }
      .upgrade-cta h3 {
        color: #007bff;
        margin-bottom: 15px;
      }
      .upgrade-cta p {
        color: #666;
        margin-bottom: 20px;
      }
      .cta-button {
        display: inline-block;
        padding: 15px 30px;
        background-color: #007bff;
        color: #fff;
        text-decoration: none;
        border-radius: 6px;
        font-weight: bold;
        font-size: 16px;
      }
      .cta-button:hover {
        background-color: #0056b3;
      }
      .footer {
        text-align: center;
        padding-top: 30px;
        border-top: 1px solid #e0e0e0;
        margin-top: 30px;
        color: #999;
        font-size: 12px;
      }
    </style>
  `;
}

/**
 * Trap Scoreの説明を取得
 */
function getTrapScoreDescription(trapScore) {
  if (trapScore == null || trapScore === undefined) {
    return 'Trap Score is being calculated. Please check back later.';
  }
  
  const score = Number(trapScore);
  if (isNaN(score)) {
    return 'Trap Score is being calculated. Please check back later.';
  }

  if (score >= 70) {
    return '⚠️ HIGH TRAP RISK: Strong signals indicate potential market traps. Exercise extreme caution.';
  } else if (score >= 50) {
    return '⚡ MODERATE TRAP RISK: Some trap indicators detected. Stay vigilant.';
  } else if (score >= 30) {
    return '✅ LOW TRAP RISK: Minimal trap indicators. Market conditions appear relatively safe.';
  } else {
    return '✅ VERY LOW TRAP RISK: Very few trap indicators detected. Market conditions appear safe.';
  }
}

/**
 * 無料ミニマム版のEメールHTMLを生成
 * Trap Score表示のみ（詳細分析なし）
 * 
 * @param {Object} options - メール生成オプション
 * @param {Date} options.now - 現在時刻
 * @param {number|null} options.trapScore - Trap Score (0-100)
 * @param {string} options.lang - 言語コード（デフォルト: 'en'）
 * @returns {string} HTML文字列
 */
function formatMinimalBriefingHTML({
  now = new Date(),
  trapScore = null,
  lang = 'en',
} = {}) {
  const logoBase64 = getLogoBase64(true);
  const logoImg = logoBase64 ? `<img src="${logoBase64}" alt="CryptoTrade Academy" class="logo" />` : '';
  
  const formattedDate = now.toISOString().split('T')[0];
  const formattedTime = now.toUTCString().split(' ')[4] + ' UTC';
  
  const scoreDisplay = trapScore != null ? Math.round(Number(trapScore)) : 'N/A';
  const scoreDescription = getTrapScoreDescription(trapScore);

  return `
<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Trap Defense BTC - Free Minimal Report</title>
  ${getEmailStyles()}
</head>
<body>
  <div class="email-container">
    <div class="header">
      ${logoImg}
      <h1>🌤️ Trap Defense BTC</h1>
      <h2>Free Minimal Report</h2>
      <p style="color: #999; font-size: 14px; margin-top: 10px;">${formattedDate} ${formattedTime}</p>
    </div>

    <div class="trap-score-section">
      <div class="trap-score-label">Today's Trap Score</div>
      <div class="trap-score-value">${scoreDisplay}</div>
      <div class="trap-score-description">
        ${scoreDescription}
      </div>
    </div>

    <div class="upgrade-cta">
      <h3>🔒 Want to Know Why?</h3>
      <p>
        The detailed analysis behind this Trap Score, including:
      </p>
      <ul style="text-align: left; display: inline-block; color: #666;">
        <li>Why AVOID_LONG or AVOID_SHORT?</li>
        <li>Detailed on-chain data analysis</li>
        <li>Mental training guidance</li>
        <li>Dr. Grok's psychological support</li>
      </ul>
      <p style="margin-top: 20px;">
        <a href="https://cryptotradeacademy.io" class="cta-button">🚀 Upgrade to Full Access</a>
      </p>
      <p style="font-size: 12px; color: #999; margin-top: 15px;">
        Starting at $69/month • 1-day free trial • Cancel anytime
      </p>
    </div>

    <div class="footer">
      <p>This is a free minimal report. For detailed analysis and trap alerts, upgrade to Trap Defense BTC.</p>
      <p style="margin-top: 10px;">
        <a href="#" style="color: #999; text-decoration: underline;">Unsubscribe</a> | 
        <a href="https://cryptotradeacademy.io" style="color: #999; text-decoration: underline;">Learn More</a>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

module.exports = { formatMinimalBriefingHTML };
