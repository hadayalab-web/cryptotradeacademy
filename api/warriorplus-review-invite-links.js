// api/warriorplus-review-invite-links.js
// WarriorPlus 審査用: Regular チャンネルの1回限り招待リンクを API で発行する
// GET /api/warriorplus-review-invite-links?secret=xxx または Authorization: Bearer xxx
// 返却の paste_block をそのまま WarriorPlus チャットに貼ればよい

const REGULAR_LANGS = ['EN', 'ES', 'PT_BR', 'AR', 'KO', 'JA'];

const MINIMAL_LINKS = {
  EN: 'https://t.me/cryptotradeacademytrialenglish',
  ES: 'https://t.me/cryptotradeacademytrialspanish',
  PT_BR: 'https://t.me/cryptotradeacademytrialportugues',
  AR: 'https://t.me/cryptotradeacademytriaarabic',
  KO: 'https://t.me/cryptotradeacademytrialkorean',
  JA: 'https://t.me/cryptotradeacademytrialjapanese',
};

/**
 * Telegram Bot API createChatInviteLink で1回用招待リンクを発行
 */
async function createTelegramInviteLink(botToken, chatId, opts = {}) {
  if (!botToken || !chatId) return null;
  const body = {
    chat_id: chatId,
    ...(opts.member_limit != null && { member_limit: Math.min(99999, Math.max(1, opts.member_limit)) }),
    ...(opts.expire_date != null && { expire_date: opts.expire_date }),
  };
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/createChatInviteLink`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!data.ok || !data.result?.invite_link) return null;
    return data.result.invite_link;
  } catch (e) {
    console.warn('[review-invite-links] createChatInviteLink failed:', e?.message);
    return null;
  }
}

function checkAuth(req) {
  const secret = process.env.WARRIORPLUS_REVIEW_LINKS_SECRET || process.env.CRON_SECRET;
  if (!secret) return false;
  const q = req.url ? new URL(req.url, 'https://x').searchParams.get('secret') : null;
  if (q && q === secret) return true;
  const auth = req.headers?.authorization;
  if (auth && auth.startsWith('Bearer ') && auth.slice(7) === secret) return true;
  return false;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!checkAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return res.status(500).json({ error: 'TELEGRAM_BOT_TOKEN not set' });
  }

  const expireDate = Math.floor(Date.now() / 1000) + 86400 * 7; // 7日
  const regular = {};

  for (const lang of REGULAR_LANGS) {
    const chatId = process.env[`TELEGRAM_CHAT_ID_BTC_${lang}`];
    if (!chatId) {
      regular[lang] = null;
      continue;
    }
    const link = await createTelegramInviteLink(botToken, String(chatId).trim(), {
      member_limit: 1,
      expire_date: expireDate,
    });
    regular[lang] = link;
  }

  const pasteBlock = buildPasteBlock(regular);
  return res.status(200).json({
    regular,
    expires_in_days: 7,
    member_limit: 1,
    /** これをそのまま WarriorPlus の承認チャットに貼る */
    paste_block: pasteBlock,
  });
};

function buildPasteBlock(regular) {
  const lines = [
    'Telegram invite links (for delivery verification)',
    '',
    'Regular (6 languages) – one-time links, 7 days valid',
    '| Lang | Invite link |',
    '|------|-------------|',
  ];
  for (const lang of REGULAR_LANGS) {
    const link = regular[lang] || '(not configured)';
    lines.push(`| ${lang} | ${link} |`);
  }
  lines.push('', 'Minimal (6 languages)', '| Lang | Invite link |', '|------|-------------|');
  for (const lang of REGULAR_LANGS) {
    lines.push(`| ${lang} | ${MINIMAL_LINKS[lang]} |`);
  }
  return lines.join('\n');
}
