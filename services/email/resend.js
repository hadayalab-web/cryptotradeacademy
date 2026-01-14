// Eメール配信サービス（Resend API）
// services/email/resend.js

const { Resend } = require('resend');

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.EMAIL_FROM || 'Trap Defense BTC <reports@cryptotradeacademy.io>';

if (!RESEND_API_KEY) {
  console.warn('⚠️ RESEND_API_KEY is not set in environment variables');
}

const resend = new Resend(RESEND_API_KEY);

/**
 * Send Trap Defense BTC report via email
 * @param {Object} params
 * @param {string|string[]} params.to - Recipient email address(es)
 * @param {string} params.subject - Email subject
 * @param {string} params.html - HTML content
 * @param {string} [params.text] - Plain text content (optional)
 * @param {string} [params.geminiImageUrl] - Gemini generated image URL (optional)
 * @param {string} [params.geminiVideoUrl] - Gemini generated video URL (optional)
 * @returns {Promise<Object>} Resend API response
 */
async function sendTrapDefenseReport({
  to,
  subject,
  html,
  text,
  geminiImageUrl,
  geminiVideoUrl,
}) {
  if (!RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not set');
  }

  try {
    const attachments = [];
    
    // Gemini生成画像を添付（オプション）
    if (geminiImageUrl) {
      attachments.push({
        filename: 'market-analysis.png',
        path: geminiImageUrl,
      });
    }

    // Gemini生成動画を添付（オプション）
    if (geminiVideoUrl) {
      attachments.push({
        filename: 'market-analysis.mp4',
        path: geminiVideoUrl,
      });
    }

    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''), // HTMLからテキストを抽出
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    console.log('✅ Email sent successfully:', result);
    return result;
  } catch (error) {
    console.error('❌ Email send failed:', error.message);
    throw error;
  }
}

/**
 * Send emergency trap alert via email
 * @param {Object} params
 * @param {string|string[]} params.to - Recipient email address(es)
 * @param {string} params.subject - Email subject
 * @param {string} params.html - HTML content
 * @param {string} [params.text] - Plain text content (optional)
 * @returns {Promise<Object>} Resend API response
 */
async function sendEmergencyAlert({
  to,
  subject,
  html,
  text,
}) {
  return sendTrapDefenseReport({
    to,
    subject: `🚨 ${subject}`,
    html,
    text,
  });
}

module.exports = {
  sendTrapDefenseReport,
  sendEmergencyAlert,
};
