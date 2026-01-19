// services/email/ceo-report.js
// CEO宛てメール報告機能（Resend使用）

const { sendResendEmail } = require('./resendClient');

const CEO_EMAIL = process.env.CEO_EMAIL || 'chibaichi.work@gmail.com';

/**
 * 日付フォーマット（YYYY-MM-DD形式）
 */
function formatDate(date = new Date()) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 日時フォーマット（YYYY-MM-DD HH:MM:SS形式）
 */
function formatDateTime(date = new Date()) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * CEO宛てメール報告を送信
 * @param {Object} options
 * @param {string} options.subject - メール件名（日付は自動追加）
 * @param {string} options.html - HTML形式のメール本文
 * @param {string} [options.text] - プレーンテキスト形式（オプション）
 * @param {string} [options.category] - カテゴリ（VSL_WORKFLOW, DEPLOYMENT, ERROR等）
 * @param {Object} [options.metadata] - 追加メタデータ
 * @returns {Promise<Object>} Resend APIレスポンス
 */
async function sendCEOReport({
  subject,
  html,
  text,
  category = 'GENERAL',
  metadata = {},
}) {
  const date = formatDate();
  const dateTime = formatDateTime();
  
  // 件名に日付を追加
  const subjectWithDate = `[${date}] ${subject}`;
  
  // HTML本文に日付を追加（フッター）
  const htmlWithDate = `
${html}

<hr style="margin-top: 30px; border: none; border-top: 1px solid #e0e0e0;">
<p style="color: #666; font-size: 12px; margin-top: 20px;">
  <strong>報告日時:</strong> ${dateTime}<br>
  <strong>カテゴリ:</strong> ${category}<br>
  ${Object.keys(metadata).length > 0 ? Object.entries(metadata).map(([key, value]) => `<strong>${key}:</strong> ${value}`).join('<br>') + '<br>' : ''}
  <strong>送信元:</strong> Trap Defence BTC Automation Platform
</p>
  `.trim();

  // CCとBCCの設定
  const CC_EMAILS = [
    'treetop.chiba@gmail.com',
    'ruihadaya@gmail.com',
  ];
  const BCC_EMAILS = [
    'kyamada.aio@gmail.com',
  ];

  try {
    const result = await sendResendEmail({
      to: CEO_EMAIL,
      subject: subjectWithDate,
      html: htmlWithDate,
      from: 'onboarding@cryptotradeacademy.io',
      fromName: 'Trap Defence BTC - COO',
      cc: CC_EMAILS,
      bcc: BCC_EMAILS,
      tags: [
        { name: 'category', value: category },
        { name: 'report_date', value: date },
        // sourceタグはresendClient.jsで自動追加されるため除外
      ],
      lang: 'ja',
      messageType: 'REGULAR',
    });

    console.log(`✅ CEO報告メール送信成功: ${subjectWithDate}`);
    console.log(`   Resend ID: ${result.id || 'N/A'}`);
    
    return result;
  } catch (error) {
    console.error(`❌ CEO報告メール送信失敗: ${error.message}`);
    throw error;
  }
}

/**
 * VSLワークフロー完了報告をCEOに送信
 * @param {Object} options
 * @param {string} options.status - ステータス（SUCCESS, ERROR, WARNING）
 * @param {Object} options.summary - サマリー情報
 * @param {Array} [options.issues] - 課題リスト
 * @returns {Promise<Object>} Resend APIレスポンス
 */
async function sendVSLWorkflowReport({
  status,
  summary,
  issues = [],
}) {
  const statusEmoji = {
    SUCCESS: '✅',
    ERROR: '❌',
    WARNING: '⚠️',
  }[status] || 'ℹ️';

  const html = `
<h2 style="color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 10px;">
  ${statusEmoji} VSLワークフロー動作報告
</h2>

<h3 style="color: #555; margin-top: 20px;">📊 サマリー</h3>
<ul style="line-height: 1.8;">
  ${Object.entries(summary).map(([key, value]) => `<li><strong>${key}:</strong> ${value}</li>`).join('')}
</ul>

${issues.length > 0 ? `
<h3 style="color: #555; margin-top: 20px;">⚠️ 課題・対応事項</h3>
<ul style="line-height: 1.8;">
  ${issues.map(issue => `<li>${issue}</li>`).join('')}
</ul>
` : ''}

<h3 style="color: #555; margin-top: 20px;">📋 次のアクション</h3>
<p style="line-height: 1.8;">
  詳細は <code>docs/EXECUTIVE_MEETING_SUMMARY.md</code> を参照してください。
</p>
  `.trim();

  return sendCEOReport({
    subject: `VSLワークフロー動作報告 - ${status}`,
    html,
    category: 'VSL_WORKFLOW',
    metadata: {
      Status: status,
      'Report Type': 'VSL Workflow Status',
    },
  });
}

/**
 * デプロイメント完了報告をCEOに送信
 * @param {Object} options
 * @param {string} options.deploymentId - デプロイメントID
 * @param {string} options.url - デプロイメントURL
 * @param {string} options.status - ステータス
 * @param {Array} [options.changes] - 変更内容リスト
 * @returns {Promise<Object>} Resend APIレスポンス
 */
async function sendDeploymentReport({
  deploymentId,
  url,
  status,
  changes = [],
}) {
  const html = `
<h2 style="color: #333; border-bottom: 2px solid #2196F3; padding-bottom: 10px;">
  🚀 デプロイメント完了報告
</h2>

<h3 style="color: #555; margin-top: 20px;">📦 デプロイメント情報</h3>
<ul style="line-height: 1.8;">
  <li><strong>デプロイメントID:</strong> ${deploymentId}</li>
  <li><strong>URL:</strong> <a href="${url}">${url}</a></li>
  <li><strong>ステータス:</strong> ${status}</li>
</ul>

${changes.length > 0 ? `
<h3 style="color: #555; margin-top: 20px;">📝 変更内容</h3>
<ul style="line-height: 1.8;">
  ${changes.map(change => `<li>${change}</li>`).join('')}
</ul>
` : ''}
  `.trim();

  return sendCEOReport({
    subject: `デプロイメント完了 - ${status}`,
    html,
    category: 'DEPLOYMENT',
    metadata: {
      'Deployment ID': deploymentId,
      Status: status,
    },
  });
}

module.exports = {
  sendCEOReport,
  sendVSLWorkflowReport,
  sendDeploymentReport,
  formatDate,
  formatDateTime,
};
