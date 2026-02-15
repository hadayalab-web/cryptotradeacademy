// services/email/resendClient.js
// Resend APIクライアント - メール送信機能

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_API_URL = 'https://api.resend.com/emails';

/**
 * Resend APIを使用してメールを送信
 * 
 * @param {Object} options - メール送信オプション
 * @param {string|string[]} options.to - 送信先メールアドレス（単一または配列）
 * @param {string} options.subject - メール件名
 * @param {string} options.html - HTML形式のメール本文
 * @param {string} [options.from] - 送信元メールアドレス（デフォルト: onboarding@cryptotradeacademy.io）
 * @param {string} [options.fromName] - 送信元表示名（デフォルト: CryptoTrade Academy）
 * @param {string|string[]} [options.cc] - CCメールアドレス（単一または配列）
 * @param {string|string[]} [options.bcc] - BCCメールアドレス（単一または配列）
 * @param {string} [options.replyTo] - 返信先メールアドレス
 * @param {Array<{name: string, value: string}>} [options.tags] - トラッキング用タグ
 * @param {string} [options.lang] - 言語コード（タグに使用）
 * @param {string} [options.messageType] - メッセージタイプ（REGULAR, EMERGENCY等）
 * @returns {Promise<Object>} Resend APIレスポンス
 */
async function sendResendEmail(options = {}) {
  const {
    to,
    subject,
    html,
    from = 'onboarding@cryptotradeacademy.io',
    fromName = 'CryptoTrade Academy',
    cc,
    bcc,
    replyTo,
    tags = [],
    lang = 'en',
    messageType = 'REGULAR',
  } = options;

  if (!RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not set in environment variables');
  }

  if (!to || !subject || !html) {
    throw new Error('Missing required parameters: to, subject, html');
  }

  // 送信元アドレスのフォーマット
  const fromAddress = fromName ? `${fromName} <${from}>` : from;

  // タグに言語とメッセージタイプを追加
  const emailTags = [
    ...tags,
    { name: 'lang', value: lang },
    { name: 'message_type', value: messageType },
    { name: 'source', value: 'trap-defense-btc' },
  ];

  try {
    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress,
        to: Array.isArray(to) ? to : [to],
        subject: subject,
        html: html,
        ...(cc && { cc: Array.isArray(cc) ? cc : [cc] }),
        ...(bcc && { bcc: Array.isArray(bcc) ? bcc : [bcc] }),
        ...(replyTo && { replyTo }),
        ...(emailTags.length > 0 && { tags: emailTags }),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Resend API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[Resend] Email send error:', error);
    throw error;
  }
}

module.exports = {
  sendResendEmail,
};
