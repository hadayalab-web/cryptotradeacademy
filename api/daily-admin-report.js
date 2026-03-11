// api/daily-admin-report.js
// admin@cryptotradeacademy.io 宛ての日次レポート（WarriorPlus IPN 集計）。Vercel Cron で毎日実行するか手動で GET/POST する。

const { kv } = require('../utils/kv');
const { sendResendEmail } = require('../services/email/resendClient');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@cryptotradeacademy.io';

function dateStringUTC(daysAgo = 1) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

async function getDailyStats(dateStr) {
  if (!kv) return { grants: 0, access_emails: 0, revokes: 0, revoke_emails: 0, revenue: 0 };
  const [grants, access_emails, revokes, revoke_emails, revenue] = await Promise.all([
    kv.get(`warriorplus:daily:${dateStr}:grants`),
    kv.get(`warriorplus:daily:${dateStr}:access_emails`),
    kv.get(`warriorplus:daily:${dateStr}:revokes`),
    kv.get(`warriorplus:daily:${dateStr}:revoke_emails`),
    kv.get(`warriorplus:daily:${dateStr}:revenue`),
  ]);
  return {
    grants: parseInt(grants, 10) || 0,
    access_emails: parseInt(access_emails, 10) || 0,
    revokes: parseInt(revokes, 10) || 0,
    revoke_emails: parseInt(revoke_emails, 10) || 0,
    revenue: parseFloat(revenue) || 0,
  };
}

function buildReportHtml(dateStr, stats) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; background:#f5f5f5; padding:20px;">
  <div style="max-width:560px; margin:0 auto; background:#fff; border-radius:12px; box-shadow:0 2px 8px rgba(0,0,0,0.08); overflow:hidden;">
    <div style="background:linear-gradient(135deg,#1a365d 0%,#2c5282 100%); padding:24px; text-align:center;">
      <h1 style="margin:0; font-size:20px; color:#fff; font-weight:700;">Trap Defence BTC 日次レポート</h1>
      <p style="margin:8px 0 0 0; font-size:14px; color:rgba(255,255,255,0.9);">${dateStr} (UTC)</p>
    </div>
    <div style="padding:24px;">
      <h2 style="margin:0 0 16px 0; font-size:16px; color:#333;">WarriorPlus IPN 集計</h2>
      <table style="width:100%; border-collapse:collapse;">
        <tr style="border-bottom:1px solid #eee;"><td style="padding:10px 0;">新規獲得数（付与・アクセスメール送信）</td><td style="text-align:right; font-weight:600;">${stats.grants}</td></tr>
        <tr style="border-bottom:1px solid #eee;"><td style="padding:10px 0;">売上（USD）</td><td style="text-align:right; font-weight:600;">$${Number(stats.revenue).toFixed(2)}</td></tr>
        <tr style="border-bottom:1px solid #eee;"><td style="padding:10px 0;">アクセスメール送信数</td><td style="text-align:right; font-weight:600;">${stats.access_emails}</td></tr>
        <tr style="border-bottom:1px solid #eee;"><td style="padding:10px 0;">剥奪処理</td><td style="text-align:right; font-weight:600;">${stats.revokes}</td></tr>
        <tr style="border-bottom:1px solid #eee;"><td style="padding:10px 0;">剥奪メール送信数</td><td style="text-align:right; font-weight:600;">${stats.revoke_emails}</td></tr>
      </table>
      <p style="margin:20px 0 0 0; font-size:12px; color:#888;">集計は IPN 処理時の KV カウンタに基づきます。Cron で毎日 1 回実行する想定です。</p>
    </div>
    <div style="padding:16px 24px; background:#f8f9fa; border-top:1px solid #eee;">
      <p style="margin:0; font-size:12px; color:#888;">Trap Defence BTC Automation · Daily Admin Report</p>
    </div>
  </div>
</body>
</html>`.trim();
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).setHeader('Allow', 'GET, POST').json({ error: 'Method not allowed' });
  }

  const dateStr = (req.query && req.query.date) || dateStringUTC(1);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return res.status(400).json({ error: 'Invalid date. Use YYYY-MM-DD.' });
  }

  try {
    const stats = await getDailyStats(dateStr);
    const html = buildReportHtml(dateStr, stats);

    if (process.env.RESEND_API_KEY) {
      await sendResendEmail({
        to: ADMIN_EMAIL,
        subject: `[日次レポート] Trap Defence BTC ${dateStr} (UTC)`,
        html,
        from: 'support@cryptotradeacademy.io',
        fromName: 'CryptoTrade Academy',
        messageType: 'ADMIN_DAILY_REPORT',
      });
      console.log('[Daily Admin Report] Sent to', ADMIN_EMAIL, 'for', dateStr, stats);
    } else {
      console.warn('[Daily Admin Report] RESEND_API_KEY not set, skip send');
    }

    return res.status(200).json({
      ok: true,
      date: dateStr,
      stats,
      email_sent: !!process.env.RESEND_API_KEY,
      to: ADMIN_EMAIL,
    });
  } catch (e) {
    console.error('[Daily Admin Report] Failed:', e?.message);
    return res.status(500).json({ error: e?.message || 'Report failed' });
  }
};
