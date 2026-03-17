// api/whop-webhook.js
// 互換エイリアス: WarriorPlus（W+）IPN専用エンドポイントの旧パス。
// 目的: 旧設定のままでもIPNを受けられるようにするだけ（内部的にはW+専用）。

const querystring = require('querystring');
const crypto = require('crypto');

const { kv } = require('../utils/kv');

function safeLower(s) {
  return String(s || '').toLowerCase().trim();
}

function getPublicBaseUrl() {
  const explicit = String(process.env.PUBLIC_BASE_URL || '').trim();
  if (explicit) return explicit.replace(/\/+$/, '');
  const vercelUrl = String(process.env.VERCEL_URL || '').trim();
  if (vercelUrl) return `https://${vercelUrl}`.replace(/\/+$/, '');
  return 'https://cryptotradeacademy.vercel.app';
}

function appendRescueSection(html, rescueUrl, accessUrl, copy) {
  const safeHtml = String(html || '');
  const c = copy || {};
  const title = c.somethingWrongTitle || 'If something went wrong';
  const body = c.somethingWrongBody || 'If you did not receive the Telegram invite link, you can retry delivery here:';
  const accessLine = accessUrl ? `<p style="margin:0; font-size:13px; color:#555; line-height:1.5;">Access page: <a href="${accessUrl}" style="color:#0088cc;">${accessUrl}</a></p>` : '';
  const block = [
    '<hr style="border:none; border-top:1px solid #eee; margin:18px 0;" />',
    `<h3 style="margin:0 0 8px; font-size:16px; line-height:1.3;">${title}</h3>`,
    `<p style="margin:0 0 8px; font-size:13px; color:#555; line-height:1.5;">${body}</p>`,
    `<p style="margin:0 0 8px; font-size:13px; line-height:1.5;"><a href="${rescueUrl}" style="color:#0088cc; font-weight:600;">Re-send access email (Rescue)</a></p>`,
    accessLine,
  ].filter(Boolean).join('\n');
  if (!safeHtml) return block;
  return safeHtml.replace(/<\/body>\s*<\/html>\s*$/i, `${block}\n</body></html>`) + (safeHtml.match(/<\/body>\s*<\/html>\s*$/i) ? '' : `\n${block}`);
}

async function sendAdminAlert(subject, text) {
  const to = String(process.env.WARRIORPLUS_ADMIN_ALERT_EMAIL || '').trim();
  if (!to || !process.env.RESEND_API_KEY) return false;
  try {
    const { sendResendEmail } = require('../services/email/resendClient');
    const html = `<pre style="white-space:pre-wrap; font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-size:12px; line-height:1.5;">${String(text || '')}</pre>`;
    await sendResendEmail({
      to,
      subject: `[W+ ALERT] ${subject}`,
      html,
      from: 'support@cryptotradeacademy.io',
      fromName: 'CryptoTrade Academy',
      messageType: 'WARRIORPLUS_ADMIN_ALERT',
    });
    return true;
  } catch (e) {
    console.error('[WarriorPlus IPN] Admin alert failed:', e?.message);
    return false;
  }
}

async function enqueuePendingGrant(kvWrapper, payload) {
  const instance = kvWrapper && typeof kvWrapper.getInstance === 'function' ? kvWrapper.getInstance() : null;
  if (!instance || typeof instance.lpush !== 'function' || typeof instance.set !== 'function') return false;
  const id = crypto.randomUUID();
  const key = `warriorplus:pending:${id}`;
  try {
    await instance.set(key, JSON.stringify({ ...payload, id, createdAt: new Date().toISOString() }), { ex: 86400 * 7 });
    await instance.lpush('warriorplus:pending:queue', key);
    return true;
  } catch (e) {
    console.warn('[WarriorPlus IPN] Pending enqueue failed:', e?.message);
    return false;
  }
}

function isLikelyWarriorPlusPayload(obj) {
  if (!obj || typeof obj !== 'object') return false;
  return Boolean(obj.WP_ACTION || obj.WP_SALEID || obj.WP_SALE || obj.IPN_ID || obj.WP_ITEM_NUMBER || obj.WP_BUYER_EMAIL);
}

function parseBodyAsObject(rawBody) {
  const text = String(rawBody || '').trim();
  if (!text) return null;
  if (text.startsWith('{') && text.endsWith('}')) {
    try {
      const j = JSON.parse(text);
      return (j && typeof j === 'object') ? j : null;
    } catch (_) {
      return null;
    }
  }
  return null;
}

function getMultipartBoundary(contentType) {
  const ct = String(contentType || '');
  const m = ct.match(/boundary=([^\s;]+)/i);
  if (!m) return null;
  return m[1].replace(/^["']|["']$/g, '').trim();
}

function parseMultipartFormData(bodyText, contentType) {
  const boundary = getMultipartBoundary(contentType);
  if (!boundary) return null;
  const raw = String(bodyText || '');
  const delim = `--${boundary}`;
  if (!raw.includes(delim)) return null;

  const parts = raw.split(delim);
  const out = {};

  for (const part of parts) {
    const p = part.replace(/^\r?\n/, '').trim();
    if (!p || p === '--') continue;

    const idx = p.indexOf('\r\n\r\n') >= 0 ? p.indexOf('\r\n\r\n') : p.indexOf('\n\n');
    if (idx < 0) continue;
    const headerBlock = p.slice(0, idx);
    let valueBlock = p.slice(idx + (p.includes('\r\n\r\n') ? 4 : 2));

    valueBlock = valueBlock.replace(/\r?\n--\s*$/g, '').replace(/\r?\n$/g, '').trim();

    const nameMatch = headerBlock.match(/name=["']([^"']+)["']/i);
    if (!nameMatch) continue;
    const name = nameMatch[1];
    if (/filename=/i.test(headerBlock)) continue;

    out[name] = valueBlock;
  }

  return Object.keys(out).length ? out : null;
}

const WARRIORPLUS_ALLOWED_EMAIL_TTL_SECONDS = 3600; // 1時間
const WARRIORPLUS_DAILY_STAT_TTL_SECONDS = 86400 * 32; // 日次レポート用32日保持

/** 日次レポート用に KV カウンタをインクリメント（UTC 日付） */
async function incrementWarriorPlusDailyStat(kvStore, suffix) {
  if (!kvStore || !suffix) return;
  const dateStr = new Date().toISOString().slice(0, 10);
  const key = `warriorplus:daily:${dateStr}:${suffix}`;
  try {
    const n = await kvStore.incr(key, 1);
    if (n === 1) await kvStore.expire(key, WARRIORPLUS_DAILY_STAT_TTL_SECONDS);
  } catch (e) {
    console.warn('[WarriorPlus IPN] Daily stat incr failed:', e?.message);
  }
}

/** 日次レポート用に売上金額を加算（WP_SALE_AMOUNT / WP_AMOUNT、USD） */
async function addWarriorPlusDailyRevenue(kvStore, amount) {
  if (!kvStore || amount == null || Number(amount) <= 0) return;
  const num = parseFloat(amount);
  if (!Number.isFinite(num)) return;
  const dateStr = new Date().toISOString().slice(0, 10);
  const key = `warriorplus:daily:${dateStr}:revenue`;
  try {
    const current = await kvStore.get(key);
    const prev = parseFloat(current) || 0;
    const next = prev + num;
    await kvStore.set(key, String(next), { ex: WARRIORPLUS_DAILY_STAT_TTL_SECONDS });
  } catch (e) {
    console.warn('[WarriorPlus IPN] Daily revenue add failed:', e?.message);
  }
}

/** W+（WarriorPlus）IPN で Resend+KV 顧客管理にする場合は 1 */
const WARRIORPLUS_USE_RESEND_TG = process.env.WARRIORPLUS_USE_RESEND_TG === '1';
/** 固定招待リンクを優先する場合のみ 1（デフォルトは Bot で1回限定リンクを発行） */
const WARRIORPLUS_PREFER_STATIC_INVITE_LINKS = process.env.WARRIORPLUS_PREFER_STATIC_INVITE_LINKS === '1';
const WARRIORPLUS_CUSTOMER_TTL_SECONDS = 86400 * 365; // 1年（解約で無効化するまで保持）

/** WP_ITEM_NUMBER → TELEGRAM_CHAT_ID_BTC_* のサフィックス（EN, ES, AR, PT_BR, KO, JA） */
const WARRIORPLUS_ITEM_TO_LANG = {
  wso_vqp3r4: 'EN',
  wso_lxd2wq: 'ES',
  wso_dqz789: 'PT_BR',
  wso_zn9g7p: 'AR',
  wso_vm68d9: 'KO',
  wso_zv25jy: 'JA',
};

/** 6言語マルチパック用：1回の購入で6チャンネル分の1回限りリンクを発行。環境変数 WARRIORPLUS_MULTIPACK_ITEM_NUMBER と一致する商品がこれ */
const MULTIPACK_LANGS = ['EN', 'ES', 'PT_BR', 'AR', 'KO', 'JA'];
const MULTIPACK_LANG_LABELS = { EN: 'English', ES: 'Spanish', PT_BR: 'Portuguese', AR: 'Arabic', KO: 'Korean', JA: 'Japanese' };

/** 導線言語別の購入完了メール文案（件名・本文）。itemNumber から決めた言語で送る */
const WP_EMAIL_COPY = {
  EN: {
    subject: 'Your Telegram access – Trap Defence BTC',
    headerSubSix: 'Your Telegram access — 6 languages',
    headerSubSingle: 'Your Telegram access',
    headerSubSupport: 'Purchase confirmed',
    introSix: 'This is your access email. You bought the 6-language pack. Below are links to join the Telegram channel in English, Spanish, Portuguese, Arabic, Korean, and Japanese. Pick the language you want and follow the steps.',
    whatToDo: 'What to do now',
    step1Six: 'Find your language in the list below (e.g. English, Spanish, Japanese).',
    step2Six: 'Tap the blue Join channel button for that language.',
    step3Six: 'Telegram will open (app or browser). Tap Join in Telegram to enter the channel.',
    telegramNote: 'You need the Telegram app (free) on your phone or desktop. If the button doesn’t open Telegram, copy the link under the button and paste it into your browser or Telegram.',
    chooseLang: 'Choose your language and join',
    oneTimeNote: 'Each link is one-time use. You can join more than one language if you like.',
    somethingWrong: 'Something wrong?',
    somethingWrongBody: 'Link expired, button didn’t work, or you didn’t receive access? Email us at',
    fromSameAddress: 'from the same address you used to buy. We’ll send you a new link.',
    introSingle: 'This is your access email. Use the link below to join the Trap Defence BTC Telegram channel.',
    step1Single: 'Tap the blue Join Telegram button below.',
    step2Single: 'Telegram will open (app or browser). Tap Join to enter the channel.',
    orCopy: 'Or copy this link:',
    linkFailed: 'Link didn’t work? Email',
    introSupport: 'Your purchase is confirmed. We couldn’t generate your Telegram link automatically. No problem — we’ll send it to you by email.',
    step1Support: 'Reply to this email or send a new email to the address below.',
    step2Support: 'Use the same email address you used to buy (so we can find your order).',
    step3Support: 'We’ll send you your Telegram link within 24 hours (usually much sooner).',
    contactSupport: 'Contact support',
    reassurance: 'You’re in the right place — we’ll take care of you.',
    joinChannelBtn: 'Join channel',
    joinTelegramBtn: 'Join Telegram',
  },
  ES: {
    subject: 'Tu acceso a Telegram – Trap Defence BTC',
    headerSubSix: 'Tu acceso a Telegram — 6 idiomas',
    headerSubSingle: 'Tu acceso a Telegram',
    headerSubSupport: 'Compra confirmada',
    introSix: 'Este es tu correo de acceso. Compraste el pack de 6 idiomas. Abajo están los enlaces para unirte al canal de Telegram en inglés, español, portugués, árabe, coreano y japonés. Elige tu idioma y sigue los pasos.',
    whatToDo: 'Qué hacer ahora',
    step1Six: 'Encuentra tu idioma en la lista (ej. English, Español, Japonés).',
    step2Six: 'Toca el botón azul Unirse al canal de ese idioma.',
    step3Six: 'Se abrirá Telegram (app o navegador). Toca Unirse en Telegram para entrar al canal.',
    telegramNote: 'Necesitas la app Telegram (gratis). Si el botón no abre Telegram, copia el enlace y pégalo en tu navegador o en Telegram.',
    chooseLang: 'Elige tu idioma y únete',
    oneTimeNote: 'Cada enlace es de un solo uso. Puedes unirte a más de un idioma si quieres.',
    somethingWrong: '¿Algo falló?',
    somethingWrongBody: '¿Enlace caducado o botón que no funciona? Escríbenos a',
    fromSameAddress: 'desde el mismo correo con el que compraste. Te enviaremos un nuevo enlace.',
    introSingle: 'Este es tu correo de acceso. Usa el enlace de abajo para unirte al canal de Telegram Trap Defence BTC.',
    step1Single: 'Toca el botón azul Unirse a Telegram abajo.',
    step2Single: 'Se abrirá Telegram. Toca Unirse para entrar al canal.',
    orCopy: 'O copia este enlace:',
    linkFailed: '¿No funcionó? Escribe a',
    introSupport: 'Tu compra está confirmada. No pudimos generar tu enlace de Telegram. No hay problema: te lo enviaremos por correo.',
    step1Support: 'Responde a este correo o envía uno nuevo a la dirección de abajo.',
    step2Support: 'Usa el mismo correo con el que compraste (para localizar tu pedido).',
    step3Support: 'Te enviaremos tu enlace de Telegram en 24 horas (normalmente antes).',
    contactSupport: 'Contactar soporte',
    reassurance: 'Estás en el lugar correcto; te atenderemos.',
    joinChannelBtn: 'Unirse al canal',
    joinTelegramBtn: 'Unirse a Telegram',
  },
  PT_BR: {
    subject: 'Seu acesso ao Telegram – Trap Defence BTC',
    headerSubSix: 'Seu acesso ao Telegram — 6 idiomas',
    headerSubSingle: 'Seu acesso ao Telegram',
    headerSubSupport: 'Compra confirmada',
    introSix: 'Este é seu e-mail de acesso. Você comprou o pacote de 6 idiomas. Abaixo estão os links para entrar no canal do Telegram em inglês, espanhol, português, árabe, coreano e japonês. Escolha seu idioma e siga os passos.',
    whatToDo: 'O que fazer agora',
    step1Six: 'Encontre seu idioma na lista (ex.: English, Español, Japonês).',
    step2Six: 'Toque no botão azul Entrar no canal daquele idioma.',
    step3Six: 'O Telegram abrirá (app ou navegador). Toque em Entrar no Telegram para acessar o canal.',
    telegramNote: 'Você precisa do app Telegram (grátis). Se o botão não abrir o Telegram, copie o link e cole no navegador ou no Telegram.',
    chooseLang: 'Escolha seu idioma e entre',
    oneTimeNote: 'Cada link é de uso único. Você pode entrar em mais de um idioma se quiser.',
    somethingWrong: 'Algo errado?',
    somethingWrongBody: 'Link expirado ou botão não funcionou? Envie um e-mail para',
    fromSameAddress: 'do mesmo e-mail que usou na compra. Enviaremos um novo link.',
    introSingle: 'Este é seu e-mail de acesso. Use o link abaixo para entrar no canal Telegram Trap Defence BTC.',
    step1Single: 'Toque no botão azul Entrar no Telegram abaixo.',
    step2Single: 'O Telegram abrirá. Toque em Entrar para acessar o canal.',
    orCopy: 'Ou copie este link:',
    linkFailed: 'Não funcionou? Envie e-mail para',
    introSupport: 'Sua compra foi confirmada. Não conseguimos gerar seu link do Telegram. Sem problemas — enviaremos por e-mail.',
    step1Support: 'Responda este e-mail ou envie um novo para o endereço abaixo.',
    step2Support: 'Use o mesmo e-mail da compra (para localizarmos seu pedido).',
    step3Support: 'Enviaremos seu link do Telegram em até 24 horas (geralmente antes).',
    contactSupport: 'Fale com o suporte',
    reassurance: 'Você está no lugar certo — vamos resolver.',
    joinChannelBtn: 'Entrar no canal',
    joinTelegramBtn: 'Entrar no Telegram',
  },
  AR: {
    subject: 'وصولك إلى تليجرام – Trap Defence BTC',
    headerSubSix: 'وصولك إلى تليجرام — 6 لغات',
    headerSubSingle: 'وصولك إلى تليجرام',
    headerSubSupport: 'تم تأكيد الشراء',
    introSix: 'هذا بريد الوصول الخاص بك. اشتريت باقة الـ 6 لغات. أدناه روابط الانضمام لقناة تليجرام بالإنجليزية والإسبانية والبرتغالية والعربية والكورية واليابانية. اختر لغتك واتبع الخطوات.',
    whatToDo: 'ماذا تفعل الآن',
    step1Six: 'ابحث عن لغتك في القائمة (مثلاً English، Español، 日本語).',
    step2Six: 'اضغط زر الانضمام للأزرق لتلك اللغة.',
    step3Six: 'سيفتح تليجرام (التطبيق أو المتصفح). اضغط انضم في تليجرام لدخول القناة.',
    telegramNote: 'تحتاج تطبيق تليجرام (مجاني). إن لم يفتح الزر التطبيق، انسخ الرابط وألصقه في المتصفح أو تليجرام.',
    chooseLang: 'اختر لغتك وانضم',
    oneTimeNote: 'كل رابط لاستخدام واحد. يمكنك الانضمام لأكثر من لغة إن رغبت.',
    somethingWrong: 'مشكلة؟',
    somethingWrongBody: 'انتهى الرابط أو الزر لا يعمل؟ راسلنا على',
    fromSameAddress: 'من نفس البريد الذي اشتريت به. سنرسل لك رابطاً جديداً.',
    introSingle: 'هذا بريد الوصول. استخدم الرابط أدناه للانضمام لقناة تليجرام Trap Defence BTC.',
    step1Single: 'اضغط زر انضم لتليجرام الأزرق أدناه.',
    step2Single: 'سيفتح تليجرام. اضغط انضم لدخول القناة.',
    orCopy: 'أو انسخ هذا الرابط:',
    linkFailed: 'لم يعمل؟ راسل',
    introSupport: 'تم تأكيد شرائك. لم نتمكن من إنشاء رابط تليجرام تلقائياً. سنرسله لك بالبريد.',
    step1Support: 'رد على هذا البريد أو أرسل بريداً جديداً للعنوان أدناه.',
    step2Support: 'استخدم نفس البريد الذي اشتريت به (لنتمكن من إيجاد طلبك).',
    step3Support: 'سنرسل رابط تليجرام خلال 24 ساعة (غالباً أسرع).',
    contactSupport: 'التواصل مع الدعم',
    reassurance: 'أنت في المكان الصحيح — سنعتنى بك.',
    joinChannelBtn: 'انضم للقناة',
    joinTelegramBtn: 'انضم لتليجرام',
  },
  KO: {
    subject: 'Telegram 접속 링크 – Trap Defence BTC',
    headerSubSix: 'Telegram 접속 — 6개 언어',
    headerSubSingle: 'Telegram 접속',
    headerSubSupport: '구매 확인됨',
    introSix: '접속용 이메일입니다. 6개국어 팩을 구매하셨습니다. 아래에서 영어, 스페인어, 포르투갈어, 아랍어, 한국어, 일본어 Telegram 채널 링크를 확인하세요. 원하는 언어를 선택한 뒤 단계를 따라주세요.',
    whatToDo: '지금 할 일',
    step1Six: '아래 목록에서 사용할 언어를 찾으세요 (예: English, Español, 日本語).',
    step2Six: '해당 언어의 파란색 채널 참가 버튼을 누르세요.',
    step3Six: 'Telegram이 열립니다(앱 또는 브라우저). Telegram에서 참가를 눌러 채널에 들어가세요.',
    telegramNote: 'Telegram 앱(무료)이 필요합니다. 버튼이 동작하지 않으면 아래 링크를 복사해 브라우저나 Telegram에 붙여넣으세요.',
    chooseLang: '언어를 선택하고 참가하세요',
    oneTimeNote: '링크는 1회 사용입니다. 여러 언어 채널에 참가할 수 있습니다.',
    somethingWrong: '문제가 있나요?',
    somethingWrongBody: '링크 만료, 버튼이 안 눌리거나 접속이 안 되나요? 구매 시 사용한 이메일로',
    fromSameAddress: '문의해 주시면 새 링크를 보내드립니다.',
    introSingle: '접속용 이메일입니다. 아래 링크로 Trap Defence BTC Telegram 채널에 참가하세요.',
    step1Single: '아래 파란색 Telegram 참가 버튼을 누르세요.',
    step2Single: 'Telegram이 열리면 참가를 눌러 채널에 들어가세요.',
    orCopy: '또는 아래 링크를 복사하세요:',
    linkFailed: '안 되나요? 구매 시 사용한 이메일로',
    introSupport: '구매가 확인되었습니다. Telegram 링크를 자동 생성하지 못했습니다. 이메일로 보내드리겠습니다.',
    step1Support: '이 이메일에 회신하거나 아래 주소로 새 이메일을 보내주세요.',
    step2Support: '구매 시 사용한 이메일 주소를 사용해 주세요(주문 확인용).',
    step3Support: '24시간 이내에 Telegram 링크를 보내드립니다(보통 더 빠름).',
    contactSupport: '고객 지원',
    reassurance: '올바른 곳에 문의하신 것입니다. 처리해 드리겠습니다.',
    joinChannelBtn: '채널 참가',
    joinTelegramBtn: 'Telegram 참가',
  },
  JA: {
    subject: 'Telegramアクセス – Trap Defence BTC',
    headerSubSix: 'Telegramアクセス — 6言語',
    headerSubSingle: 'Telegramアクセス',
    headerSubSupport: '購入確認',
    introSix: 'こちらがアクセス用メールです。6言語パックをご購入いただきました。以下から、英語・スペイン語・ポルトガル語・アラビア語・韓国語・日本語のTelegramチャンネルへのリンクを選んで手順に従ってください。',
    whatToDo: '今すぐやること',
    step1Six: '下のリストからご希望の言語を選んでください（例: English、Español、日本語）。',
    step2Six: 'その言語の青い「チャンネルに参加」ボタンを押してください。',
    step3Six: 'Telegramが開きます（アプリまたはブラウザ）。Telegram内で「参加」を押してチャンネルに入ってください。',
    telegramNote: 'Telegramアプリ（無料）が必要です。ボタンで開かない場合は、下のリンクをコピーしてブラウザまたはTelegramに貼り付けてください。',
    chooseLang: '言語を選んで参加',
    oneTimeNote: '各リンクは1回限りです。複数の言語に参加しても構いません。',
    somethingWrong: 'うまくいかない場合',
    somethingWrongBody: 'リンクの有効期限切れ・ボタンが反応しない・アクセスできない場合は、購入時と同じメールアドレスから',
    fromSameAddress: 'までご連絡ください。新しいリンクをお送りします。',
    introSingle: 'こちらがアクセス用メールです。下のリンクから Trap Defence BTC のTelegramチャンネルに参加してください。',
    step1Single: '下の青い「Telegramに参加」ボタンを押してください。',
    step2Single: 'Telegramが開いたら「参加」を押してチャンネルに入ってください。',
    orCopy: 'またはこのリンクをコピー:',
    linkFailed: '開かない場合は、購入時と同じメールアドレスから',
    introSupport: 'ご購入は確認されました。Telegramリンクを自動発行できませんでした。メールでお送りします。',
    step1Support: 'このメールに返信するか、下のアドレスに新規メールを送ってください。',
    step2Support: '購入時と同じメールアドレスを使ってください（ご注文を照合します）。',
    step3Support: '24時間以内にTelegramリンクをお送りします（通常はもっと早く）。',
    contactSupport: 'サポートに連絡',
    reassurance: '正しい窓口です。対応いたします。',
    joinChannelBtn: 'チャンネルに参加',
    joinTelegramBtn: 'Telegramに参加',
  },
};

/** 剥奪系IPN用メール文案（解約・返金・dispute・支払失敗・停止）。6言語 */
const WP_REVOKE_EMAIL_COPY = {
  EN: {
    cancel: { subject: 'Subscription cancelled – Trap Defence BTC', intro: 'Your subscription has been cancelled. Access to the Telegram channels has been revoked.', outro: 'To get access again, you can resubscribe from the same link you used to purchase. Questions?', support: 'support@cryptotradeacademy.io' },
    refund: { subject: 'Refund processed – Trap Defence BTC', intro: 'Your refund has been processed. You will receive the amount according to your payment provider’s timeline.', outro: 'Access to the Telegram channels has been revoked. Questions?', support: 'support@cryptotradeacademy.io' },
    dispute: { subject: 'Dispute received – Trap Defence BTC', intro: 'We received a dispute for your purchase. Access has been revoked while the dispute is in progress.', outro: 'If you have questions or believe this was an error, please contact us at', support: 'support@cryptotradeacademy.io' },
    payment_failed: { subject: 'Payment failed – please update to keep access – Trap Defence BTC', intro: 'Your last payment for Trap Defence BTC could not be completed. Your access to the Telegram channels has been paused.', cta: 'To keep your access, please update your payment method in your membership or billing area, or contact support.', outro: 'If you need help, email us at', support: 'support@cryptotradeacademy.io' },
    suspended: { subject: 'Subscription suspended – Trap Defence BTC', intro: 'Your subscription has been suspended. Access to the Telegram channels has been revoked.', outro: 'If you believe this was an error or need to resolve an issue, contact us at', support: 'support@cryptotradeacademy.io' },
    subscr_refunded: { subject: 'Subscription refunded – Trap Defence BTC', intro: 'Your subscription has been refunded. You will receive the amount according to your payment provider’s timeline.', outro: 'Access to the Telegram channels has been revoked. Questions?', support: 'support@cryptotradeacademy.io' },
  },
  ES: {
    cancel: { subject: 'Suscripción cancelada – Trap Defence BTC', intro: 'Tu suscripción ha sido cancelada. El acceso a los canales de Telegram ha sido revocado.', outro: 'Para volver a acceder, puedes suscribirte de nuevo desde el mismo enlace de compra. ¿Preguntas?', support: 'support@cryptotradeacademy.io' },
    refund: { subject: 'Reembolso procesado – Trap Defence BTC', intro: 'Tu reembolso ha sido procesado. Recibirás el importe según los plazos de tu proveedor de pago.', outro: 'El acceso a los canales de Telegram ha sido revocado. ¿Preguntas?', support: 'support@cryptotradeacademy.io' },
    dispute: { subject: 'Disputa recibida – Trap Defence BTC', intro: 'Hemos recibido una disputa por tu compra. El acceso ha sido revocado mientras se resuelve.', outro: 'Si tienes dudas o crees que fue un error, escríbenos a', support: 'support@cryptotradeacademy.io' },
    payment_failed: { subject: 'Pago fallido – actualiza para mantener el acceso – Trap Defence BTC', intro: 'Tu último pago de Trap Defence BTC no pudo completarse. Tu acceso a los canales de Telegram ha sido pausado.', cta: 'Para mantener el acceso, actualiza tu método de pago en tu área de membresía o de facturación, o contacta a soporte.', outro: 'Si necesitas ayuda, escríbenos a', support: 'support@cryptotradeacademy.io' },
    suspended: { subject: 'Suscripción suspendida – Trap Defence BTC', intro: 'Tu suscripción ha sido suspendida. El acceso a los canales de Telegram ha sido revocado.', outro: 'Si crees que fue un error o necesitas resolver algo, escríbenos a', support: 'support@cryptotradeacademy.io' },
    subscr_refunded: { subject: 'Suscripción reembolsada – Trap Defence BTC', intro: 'Tu suscripción ha sido reembolsada. Recibirás el importe según los plazos de tu proveedor de pago.', outro: 'El acceso a los canales de Telegram ha sido revocado. ¿Preguntas?', support: 'support@cryptotradeacademy.io' },
  },
  PT_BR: {
    cancel: { subject: 'Assinatura cancelada – Trap Defence BTC', intro: 'Sua assinatura foi cancelada. O acesso aos canais do Telegram foi revogado.', outro: 'Para acessar novamente, você pode reassinar pelo mesmo link de compra. Dúvidas?', support: 'support@cryptotradeacademy.io' },
    refund: { subject: 'Reembolso processado – Trap Defence BTC', intro: 'Seu reembolso foi processado. Você receberá o valor conforme o prazo do seu provedor de pagamento.', outro: 'O acesso aos canais do Telegram foi revogado. Dúvidas?', support: 'support@cryptotradeacademy.io' },
    dispute: { subject: 'Disputa recebida – Trap Defence BTC', intro: 'Recebemos uma disputa sobre sua compra. O acesso foi revogado enquanto a disputa está em andamento.', outro: 'Se tiver dúvidas ou achar que foi um erro, entre em contato em', support: 'support@cryptotradeacademy.io' },
    payment_failed: { subject: 'Pagamento falhou – atualize para manter o acesso – Trap Defence BTC', intro: 'Seu último pagamento do Trap Defence BTC não pôde ser concluído. Seu acesso aos canais do Telegram foi pausado.', cta: 'Para manter o acesso, atualize seu método de pagamento na área de assinatura ou de cobrança, ou fale com o suporte.', outro: 'Se precisar de ajuda, envie um e-mail para', support: 'support@cryptotradeacademy.io' },
    suspended: { subject: 'Assinatura suspensa – Trap Defence BTC', intro: 'Sua assinatura foi suspensa. O acesso aos canais do Telegram foi revogado.', outro: 'Se achar que foi um erro ou precisar resolver algo, entre em contato em', support: 'support@cryptotradeacademy.io' },
    subscr_refunded: { subject: 'Assinatura reembolsada – Trap Defence BTC', intro: 'Sua assinatura foi reembolsada. Você receberá o valor conforme o prazo do provedor de pagamento.', outro: 'O acesso aos canais do Telegram foi revogado. Dúvidas?', support: 'support@cryptotradeacademy.io' },
  },
  AR: {
    cancel: { subject: 'تم إلغاء الاشتراك – Trap Defence BTC', intro: 'تم إلغاء اشتراكك. تم إلغاء الوصول إلى قنوات تليجرام.', outro: 'للوصول مرة أخرى يمكنك إعادة الاشتراك من نفس الرابط الذي اشتريت منه. أسئلة؟', support: 'support@cryptotradeacademy.io' },
    refund: { subject: 'تم معالجة الاسترداد – Trap Defence BTC', intro: 'تم معالجة استردادك. ستستلم المبلغ وفقاً لجدول مزود الدفع.', outro: 'تم إلغاء الوصول إلى قنوات تليجرام. أسئلة؟', support: 'support@cryptotradeacademy.io' },
    dispute: { subject: 'تم استلام نزاع – Trap Defence BTC', intro: 'استلمنا نزاعاً بخصوص شرائك. تم إلغاء الوصول أثناء معالجة النزاع.', outro: 'إن كان لديك سؤال أو تعتقد أن هذا خطأ، راسلنا على', support: 'support@cryptotradeacademy.io' },
    payment_failed: { subject: 'فشل الدفع – يرجى التحديث لاستمرار الوصول – Trap Defence BTC', intro: 'لم يكتمل آخر دفع لك لـ Trap Defence BTC. تم إيقاف الوصول إلى قنوات تليجرام مؤقتاً.', cta: 'لاستمرار الوصول، يرجى تحديث طريقة الدفع في منطقة العضوية أو الفواتير، أو التواصل مع الدعم.', outro: 'إن احتجت مساعدة، راسلنا على', support: 'support@cryptotradeacademy.io' },
    suspended: { subject: 'تم تعليق الاشتراك – Trap Defence BTC', intro: 'تم تعليق اشتراكك. تم إلغاء الوصول إلى قنوات تليجرام.', outro: 'إن اعتقدت أن هذا خطأ أو تحتاج حل مشكلة، راسلنا على', support: 'support@cryptotradeacademy.io' },
    subscr_refunded: { subject: 'تم استرداد الاشتراك – Trap Defence BTC', intro: 'تم استرداد اشتراكك. ستستلم المبلغ وفقاً لجدول مزود الدفع.', outro: 'تم إلغاء الوصول إلى قنوات تليجرام. أسئلة؟', support: 'support@cryptotradeacademy.io' },
  },
  KO: {
    cancel: { subject: '구독이 취소되었습니다 – Trap Defence BTC', intro: '구독이 취소되었습니다. Telegram 채널 접속 권한이 해지되었습니다.', outro: '다시 이용하시려면 구매 시 사용한 링크에서 재구독하실 수 있습니다. 문의:', support: 'support@cryptotradeacademy.io' },
    refund: { subject: '환불 처리됨 – Trap Defence BTC', intro: '환불이 처리되었습니다. 결제 수단 제공업체 일정에 따라 금액이 입금됩니다.', outro: 'Telegram 채널 접속 권한이 해지되었습니다. 문의:', support: 'support@cryptotradeacademy.io' },
    dispute: { subject: '이의 제기 접수됨 – Trap Defence BTC', intro: '구매에 대한 이의 제기가 접수되었습니다. 처리되는 동안 접속이 해지되었습니다.', outro: '문의 사항이나 오류로 보이시면', support: 'support@cryptotradeacademy.io', outroAfter: '로 연락해 주세요.' },
    payment_failed: { subject: '결제 실패 – 접속 유지를 위해 결제 수단을 업데이트해 주세요 – Trap Defence BTC', intro: 'Trap Defence BTC 최근 결제가 완료되지 않았습니다. Telegram 채널 접속이 일시 중지되었습니다.', cta: '접속을 유지하려면 멤버십 또는 결제 정보에서 결제 수단을 업데이트하시거나 고객 지원에 연락해 주세요.', outro: '도움이 필요하시면', support: 'support@cryptotradeacademy.io', outroAfter: '로 이메일 보내 주세요.' },
    suspended: { subject: '구독이 일시 중지됨 – Trap Defence BTC', intro: '구독이 일시 중지되었습니다. Telegram 채널 접속 권한이 해지되었습니다.', outro: '오류로 보이시거나 해결이 필요하시면', support: 'support@cryptotradeacademy.io', outroAfter: '로 연락해 주세요.' },
    subscr_refunded: { subject: '구독 환불됨 – Trap Defence BTC', intro: '구독이 환불 처리되었습니다. 결제 수단 제공업체 일정에 따라 금액이 입금됩니다.', outro: 'Telegram 채널 접속 권한이 해지되었습니다. 문의:', support: 'support@cryptotradeacademy.io' },
  },
  JA: {
    cancel: { subject: '解約のお知らせ – Trap Defence BTC', intro: 'ご契約の解約が完了しました。Telegramチャンネルへのアクセスは停止されています。', outro: '再度ご利用になる場合は、購入時と同じリンクから再購読いただけます。ご質問は', support: 'support@cryptotradeacademy.io' },
    refund: { subject: '返金処理のお知らせ – Trap Defence BTC', intro: '返金処理が完了しました。決済業者の手続きに従い、ご指定の口座等に返金されます。', outro: 'Telegramチャンネルへのアクセスは停止されています。ご質問は', support: 'support@cryptotradeacademy.io' },
    dispute: { subject: 'チャージバック（異議申し立て）のご連絡 – Trap Defence BTC', intro: 'ご購入について異議申し立てが届いています。処理中のためアクセスを停止しています。', outro: 'ご不明点や誤りと思われる場合は', support: 'support@cryptotradeacademy.io', outroAfter: 'までご連絡ください。' },
    payment_failed: { subject: 'お支払いが完了しませんでした – アクセス継続にはお支払い方法の更新をお願いします – Trap Defence BTC', intro: 'Trap Defence BTC の直近のお支払いが完了しませんでした。Telegramチャンネルへのアクセスを一時停止しています。', cta: 'アクセスを継続するには、会員・お支払い情報からお支払い方法を更新するか、サポートまでご連絡ください。', outro: 'ご不明点は', support: 'support@cryptotradeacademy.io', outroAfter: 'までお問い合わせください。' },
    suspended: { subject: 'サブスクリプション停止のお知らせ – Trap Defence BTC', intro: 'サブスクリプションが停止されました。Telegramチャンネルへのアクセスは停止されています。', outro: '誤りと思われる場合やご不明点は', support: 'support@cryptotradeacademy.io', outroAfter: 'までご連絡ください。' },
    subscr_refunded: { subject: 'サブスク解約・返金のお知らせ – Trap Defence BTC', intro: 'サブスクリプションの返金が完了しました。決済業者の手続きに従い返金されます。', outro: 'Telegramチャンネルへのアクセスは停止されています。ご質問は', support: 'support@cryptotradeacademy.io' },
  },
};

/** 剥奪系 action → メールタイプ（WP_REVOKE_EMAIL_COPY のキー） */
const WP_REVOKE_ACTION_TO_EMAIL_TYPE = {
  refund: 'refund',
  dispute: 'dispute',
  subscr_cancelled: 'cancel',
  subscr_ended: 'cancel',
  subscr_refunded: 'subscr_refunded',
  subscr_suspended: 'suspended',
  subscr_failed_invalid: 'payment_failed',
  subscr_failed_declined: 'payment_failed',
  subscr_failed_unavailable: 'payment_failed',
  subscr_paused: 'suspended',
};

/** メール言語を取得（導線の itemNumber から）。未対応は EN */
function getWarriorPlusEmailLang(itemNumber) {
  const lang = itemNumber && WARRIORPLUS_ITEM_TO_LANG[itemNumber];
  return (lang && WP_EMAIL_COPY[lang]) ? lang : 'EN';
}

/**
 * 6言語パック購入者向けメール本文（HTML）。言語別コピーを使用
 * @param {{ lang: string, label: string, link: string }[]} multipackLinks
 * @param {Record<string,string>} copy - WP_EMAIL_COPY[lang]
 * @returns {string}
 */
function buildWarriorPlusSixLangEmailHtml(multipackLinks, copy) {
  const c = copy || WP_EMAIL_COPY.EN;
  const langCards = multipackLinks.map(
    ({ label, link }) => `
    <tr><td style="padding:14px 18px; border:1px solid #e0e0e0; border-radius:8px; background:#fafafa;">
      <span style="font-weight:600; color:#1a1a1a;">${label}</span>
      <a href="${link}" style="display:inline-block; margin-left:12px; padding:10px 20px; background:#0088cc; color:#fff; text-decoration:none; border-radius:6px; font-weight:600;">${c.joinChannelBtn}</a>
      <p style="margin:8px 0 0 0; font-size:12px; color:#666; word-break:break-all;">${link}</p>
    </td></tr>`
  ).join('');
  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; background:#f0f2f5; padding:24px;">
  <div style="max-width:560px; margin:0 auto; background:#fff; border-radius:12px; box-shadow:0 2px 12px rgba(0,0,0,0.08); overflow:hidden;">
    <div style="background:linear-gradient(135deg,#1a365d 0%,#2c5282 100%); padding:28px 24px; text-align:center;">
      <h1 style="margin:0; font-size:22px; color:#fff; font-weight:700;">Trap Defence BTC</h1>
      <p style="margin:8px 0 0 0; font-size:14px; color:rgba(255,255,255,0.9);">${c.headerSubSix}</p>
    </div>
    <div style="padding:28px 24px;">
      <p style="margin:0 0 20px 0; font-size:16px; color:#333; line-height:1.6;">${c.introSix}</p>
      <div style="background:#e8f4fc; border-left:4px solid #0088cc; padding:14px 18px; margin:0 0 24px 0; border-radius:0 8px 8px 0;">
        <p style="margin:0 0 8px 0; font-size:14px; font-weight:600; color:#1a1a1a;">${c.whatToDo}</p>
        <p style="margin:0 0 4px 0; font-size:14px; color:#333; line-height:1.5;"><strong>Step 1.</strong> ${c.step1Six}</p>
        <p style="margin:0 0 4px 0; font-size:14px; color:#333; line-height:1.5;"><strong>Step 2.</strong> ${c.step2Six}</p>
        <p style="margin:0 0 4px 0; font-size:14px; color:#333; line-height:1.5;"><strong>Step 3.</strong> ${c.step3Six}</p>
        <p style="margin:0; font-size:13px; color:#555;">${c.telegramNote}</p>
      </div>
      <p style="margin:0 0 8px 0; font-size:14px; font-weight:600; color:#1a1a1a;">${c.chooseLang}</p>
      <p style="margin:0 0 16px 0; font-size:13px; color:#666;">${c.oneTimeNote}</p>
      <table style="width:100%; border-collapse:separate; border-spacing:0 10px;">${langCards}</table>
      <div style="margin-top:24px; padding:14px 18px; background:#fff8e6; border-radius:8px;">
        <p style="margin:0 0 6px 0; font-size:13px; font-weight:600; color:#8a6d00;">${c.somethingWrong}</p>
        <p style="margin:0; font-size:13px; color:#555; line-height:1.5;">${c.somethingWrongBody} <a href="mailto:support@cryptotradeacademy.io" style="color:#0088cc;">support@cryptotradeacademy.io</a> ${c.fromSameAddress}</p>
      </div>
    </div>
    <div style="padding:20px 24px; background:#f8f9fa; border-top:1px solid #eee;">
      <p style="margin:0; font-size:12px; color:#888;">CryptoTrade Academy · <a href="mailto:support@cryptotradeacademy.io" style="color:#0088cc;">support@cryptotradeacademy.io</a></p>
    </div>
  </div>
</body>
</html>`.trim();
}

/**
 * 単一言語フォールバック用メール本文（HTML）。言語別コピーを使用
 */
function buildWarriorPlusSingleLinkEmailHtml(tgLink, copy) {
  const c = copy || WP_EMAIL_COPY.EN;
  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; background:#f0f2f5; padding:24px;">
  <div style="max-width:560px; margin:0 auto; background:#fff; border-radius:12px; box-shadow:0 2px 12px rgba(0,0,0,0.08); overflow:hidden;">
    <div style="background:linear-gradient(135deg,#1a365d 0%,#2c5282 100%); padding:28px 24px; text-align:center;">
      <h1 style="margin:0; font-size:22px; color:#fff; font-weight:700;">Trap Defence BTC</h1>
      <p style="margin:8px 0 0 0; font-size:14px; color:rgba(255,255,255,0.9);">${c.headerSubSingle}</p>
    </div>
    <div style="padding:28px 24px;">
      <p style="margin:0 0 20px 0; font-size:16px; color:#333; line-height:1.6;">${c.introSingle}</p>
      <div style="background:#e8f4fc; border-left:4px solid #0088cc; padding:14px 18px; margin:0 0 24px 0; border-radius:0 8px 8px 0;">
        <p style="margin:0 0 8px 0; font-size:14px; font-weight:600; color:#1a1a1a;">${c.whatToDo}</p>
        <p style="margin:0 0 4px 0; font-size:14px; color:#333; line-height:1.5;"><strong>Step 1.</strong> ${c.step1Single}</p>
        <p style="margin:0 0 4px 0; font-size:14px; color:#333; line-height:1.5;"><strong>Step 2.</strong> ${c.step2Single}</p>
        <p style="margin:0; font-size:13px; color:#555;">${c.telegramNote}</p>
      </div>
      <p style="margin:0 0 16px 0;"><a href="${tgLink}" style="display:inline-block; padding:14px 28px; background:#0088cc; color:#fff; text-decoration:none; border-radius:8px; font-weight:600;">${c.joinTelegramBtn}</a></p>
      <p style="margin:0 0 24px 0; font-size:13px; color:#666; word-break:break-all;">${c.orCopy} ${tgLink}</p>
      <div style="padding:14px 18px; background:#fff8e6; border-radius:8px;">
        <p style="margin:0; font-size:13px; color:#555; line-height:1.5;">${c.linkFailed} <a href="mailto:support@cryptotradeacademy.io" style="color:#0088cc;">support@cryptotradeacademy.io</a> ${c.fromSameAddress}</p>
      </div>
    </div>
    <div style="padding:20px 24px; background:#f8f9fa; border-top:1px solid #eee;">
      <p style="margin:0; font-size:12px; color:#888;">CryptoTrade Academy · <a href="mailto:support@cryptotradeacademy.io" style="color:#0088cc;">support@cryptotradeacademy.io</a></p>
    </div>
  </div>
</body>
</html>`.trim();
}

/**
 * 招待リンク発行失敗時のサポート案内メール本文（HTML）。言語別コピーを使用
 */
function buildWarriorPlusSupportFallbackEmailHtml(copy) {
  const c = copy || WP_EMAIL_COPY.EN;
  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; background:#f0f2f5; padding:24px;">
  <div style="max-width:560px; margin:0 auto; background:#fff; border-radius:12px; box-shadow:0 2px 12px rgba(0,0,0,0.08); overflow:hidden;">
    <div style="background:linear-gradient(135deg,#1a365d 0%,#2c5282 100%); padding:28px 24px; text-align:center;">
      <h1 style="margin:0; font-size:22px; color:#fff; font-weight:700;">Trap Defence BTC</h1>
      <p style="margin:8px 0 0 0; font-size:14px; color:rgba(255,255,255,0.9);">${c.headerSubSupport}</p>
    </div>
    <div style="padding:28px 24px;">
      <p style="margin:0 0 16px 0; font-size:16px; color:#333; line-height:1.6;">${c.introSupport}</p>
      <div style="background:#e8f4fc; border-left:4px solid #0088cc; padding:14px 18px; margin:0 0 20px 0; border-radius:0 8px 8px 0;">
        <p style="margin:0 0 8px 0; font-size:14px; font-weight:600; color:#1a1a1a;">${c.whatToDo}</p>
        <p style="margin:0 0 4px 0; font-size:14px; color:#333; line-height:1.5;"><strong>Step 1.</strong> ${c.step1Support}</p>
        <p style="margin:0 0 4px 0; font-size:14px; color:#333; line-height:1.5;"><strong>Step 2.</strong> ${c.step2Support}</p>
        <p style="margin:0; font-size:14px; color:#333; line-height:1.5;"><strong>Step 3.</strong> ${c.step3Support}</p>
      </div>
      <p style="margin:0 0 8px 0; font-size:14px; font-weight:600; color:#1a1a1a;">${c.contactSupport}</p>
      <p style="margin:0;"><a href="mailto:support@cryptotradeacademy.io" style="color:#0088cc; font-weight:600;">support@cryptotradeacademy.io</a></p>
      <p style="margin:8px 0 0 0; font-size:13px; color:#666;">${c.reassurance}</p>
    </div>
    <div style="padding:20px 24px; background:#f8f9fa; border-top:1px solid #eee;">
      <p style="margin:0; font-size:12px; color:#888;">CryptoTrade Academy · <a href="mailto:support@cryptotradeacademy.io" style="color:#0088cc;">support@cryptotradeacademy.io</a></p>
    </div>
  </div>
</body>
</html>`.trim();
}

/**
 * 剥奪系メール本文（解約・返金・dispute・支払失敗・停止）。言語別コピーを使用
 * @param {'cancel'|'refund'|'dispute'|'payment_failed'|'suspended'|'subscr_refunded'} type
 * @param {Record<string,string>} revokeCopy - WP_REVOKE_EMAIL_COPY[lang][type]
 * @returns {string} HTML
 */
function buildWarriorPlusRevokeEmailHtml(type, revokeCopy) {
  if (!revokeCopy || !revokeCopy.subject) return '';
  const c = revokeCopy;
  const supportLink = `<a href="mailto:${c.support}" style="color:#0088cc;">${c.support}</a>`;
  const outroLine = c.outroAfter ? `${c.outro} ${supportLink} ${c.outroAfter}` : `${c.outro} ${supportLink}`;
  const ctaBlock = c.cta ? `<p style="margin:0 0 16px 0; font-size:15px; color:#333; line-height:1.5;">${c.cta}</p>` : '';
  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; background:#f0f2f5; padding:24px;">
  <div style="max-width:560px; margin:0 auto; background:#fff; border-radius:12px; box-shadow:0 2px 12px rgba(0,0,0,0.08); overflow:hidden;">
    <div style="background:linear-gradient(135deg,#6b2d2d 0%,#8b3a3a 100%); padding:28px 24px; text-align:center;">
      <h1 style="margin:0; font-size:22px; color:#fff; font-weight:700;">Trap Defence BTC</h1>
    </div>
    <div style="padding:28px 24px;">
      <p style="margin:0 0 20px 0; font-size:16px; color:#333; line-height:1.6;">${c.intro}</p>
      ${ctaBlock}
      <p style="margin:0; font-size:14px; color:#555; line-height:1.5;">${outroLine}</p>
    </div>
    <div style="padding:20px 24px; background:#f8f9fa; border-top:1px solid #eee;">
      <p style="margin:0; font-size:12px; color:#888;">CryptoTrade Academy · <a href="mailto:${c.support}" style="color:#0088cc;">${c.support}</a></p>
    </div>
  </div>
</body>
</html>`.trim();
}

/**
 * Telegram Bot API createChatInviteLink で1回用招待リンクを発行
 * @param {string} botToken
 * @param {string} chatId
 * @param {{ member_limit?: number, expire_date?: number }} [opts]
 * @returns {Promise<string|null>} invite_link or null
 */
async function createTelegramInviteLink(botToken, chatId, opts = {}) {
  if (!botToken || !chatId) return null;
  const body = {
    chat_id: chatId,
    ...(opts.member_limit != null && { member_limit: Math.min(99999, Math.max(1, opts.member_limit)) }),
    ...(opts.expire_date != null && { expire_date: opts.expire_date }),
  };
  try {
    const controller = new AbortController();
    const timeoutMs = Math.max(1000, Number(process.env.TELEGRAM_API_TIMEOUT_MS || 8000));
    const t = setTimeout(() => controller.abort(), timeoutMs);
    let res;
    try {
      res = await fetch(`https://api.telegram.org/bot${botToken}/createChatInviteLink`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(t);
    }

    let data = null;
    try {
      data = await res.json();
    } catch (_) {
      data = null;
    }

    // Telegram 429 対応（retry_after 秒が返る場合がある）
    const retryAfterSec = data?.parameters?.retry_after != null ? Number(data.parameters.retry_after) : null;
    if (!res.ok || !data?.ok) {
      const err = data?.description || `HTTP ${res.status}`;
      const e = new Error(err);
      e.status = res.status;
      if (Number.isFinite(retryAfterSec) && retryAfterSec > 0) e.retryAfterSec = retryAfterSec;
      throw e;
    }

    if (!data.result?.invite_link) return null;
    return data.result.invite_link;
  } catch (e) {
    console.warn('[WarriorPlus IPN] createChatInviteLink failed:', e?.message);
    return null;
  }
}

function sleepMs(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Telegram createChatInviteLink をバースト耐性つきで実行（429/5xx/ネットワークをリトライ）
 * - デフォルトは小さめのリトライ回数（W+ IPNの再送を招かない）
 * - 429 は retry_after を尊重
 */
async function createTelegramInviteLinkWithRetry(botToken, chatId, opts = {}) {
  const maxAttempts = Math.max(1, Math.min(6, Number(process.env.TELEGRAM_INVITE_MAX_ATTEMPTS || 3)));
  const baseDelayMs = Math.max(50, Number(process.env.TELEGRAM_INVITE_RETRY_BASE_MS || 350));
  const maxDelayMs = Math.max(baseDelayMs, Number(process.env.TELEGRAM_INVITE_RETRY_MAX_MS || 2500));

  let lastErr = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const link = await createTelegramInviteLink(botToken, chatId, opts);
      if (link) return link;
      // link が null の場合も一応リトライ対象（稀）
      lastErr = new Error('No invite_link returned');
    } catch (e) {
      lastErr = e;
    }

    if (attempt >= maxAttempts) break;

    const retryAfterSec = lastErr?.retryAfterSec;
    const exp = Math.min(maxDelayMs, Math.round(baseDelayMs * (2 ** (attempt - 1))));
    const jitter = Math.round(Math.random() * Math.min(300, exp));
    const waitMs = Number.isFinite(retryAfterSec) && retryAfterSec > 0
      ? Math.min(maxDelayMs * 3, Math.round(retryAfterSec * 1000) + jitter)
      : Math.min(maxDelayMs * 3, exp + jitter);

    // 429/ネットワーク/一時失敗の可能性が高いので少し待つ
    await sleepMs(waitMs);
  }

  console.warn('[WarriorPlus IPN] TG invite link retry exhausted:', {
    chatId: String(chatId || '').slice(0, 12),
    error: lastErr?.message || String(lastErr || ''),
  });
  return null;
}

async function handleWarriorPlusIPN({ req, res, rawBody }) {
  const parsed = querystring.parse(String(rawBody || ''));
  const action = safeLower(parsed.WP_ACTION);
  const ipnId = String(parsed.IPN_ID || '').trim();
  const saleId = String(parsed.WP_SALEID || parsed.WP_SALE || '').trim();
  const buyerEmail = String(parsed.WP_BUYER_EMAIL || '').trim();
  const itemNumber = String(parsed.WP_ITEM_NUMBER || '').trim();
  const itemName = String(parsed.WP_ITEM_NAME || '').trim();
  const securityKey = String(parsed.WP_SECURITYKEY || '').trim();

  // W+ テスト/疎通で「空POST」や「WP_* が一切ない」通知が来ることがある。
  // 実購入IPNではないため、運用の不安要素（errorログ）を出さずに 200 で無視する。
  const hasAnyWpField = Boolean(action || ipnId || saleId || buyerEmail || itemNumber || itemName || securityKey);
  if (!hasAnyWpField) {
    console.warn('[WarriorPlus IPN] Ignored empty notification');
    return res.status(200).json({ received: true, provider: 'warriorplus', ignored: true });
  }

  const requiredKey = String(process.env.WARRIORPLUS_SECURITY_KEY || '').trim();
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
  if (requiredKey) {
    if (!securityKey || securityKey !== requiredKey) {
      if (isProduction) {
        // W+ の「Send Test」が WP_SECURITYKEY を付けない/不正なことがある。
        // ただし本物の購入IPN（buyerEmail + itemNumber + (saleId|ipnId) が揃う）は厳格に拒否する。
        const explicitMultipackItem = String(process.env.WARRIORPLUS_MULTIPACK_ITEM_NUMBER || '').trim();
        const isKnownItemNumber = Boolean(
          (itemNumber && WARRIORPLUS_ITEM_TO_LANG[itemNumber]) ||
          (explicitMultipackItem && itemNumber === explicitMultipackItem)
        );
        const looksLikeRealPurchase = Boolean(buyerEmail && itemNumber && (saleId || ipnId) && isKnownItemNumber);
        if (!looksLikeRealPurchase) {
          console.warn('[WarriorPlus IPN] Ignored test notification (invalid/missing WP_SECURITYKEY)', {
            action,
            hasKey: !!securityKey,
            ipnId: ipnId || null,
            saleId: saleId || null,
            buyerEmail: buyerEmail || null,
            itemNumber: itemNumber || null,
          });
          return res.status(200).json({ received: true, provider: 'warriorplus', ignored: true });
        }
        const mask = (s) => (s && s.length >= 4 ? s.slice(0, 4) + '…' : '(empty)');
        console.error('[WarriorPlus IPN] ❌ Invalid WP_SECURITYKEY', {
          hasKey: !!securityKey,
          receivedPrefix: mask(securityKey),
          receivedLen: (securityKey || '').length,
          expectedPrefix: mask(requiredKey),
          expectedLen: requiredKey.length,
          action,
          ipnId,
          saleId,
          itemNumber: itemNumber || null,
        });
        return res.status(401).json({ received: false, provider: 'warriorplus', error: 'Invalid WP_SECURITYKEY' });
      }
    }
  } else if (isProduction) {
    console.warn('[WarriorPlus IPN] ⚠️ WARRIORPLUS_SECURITY_KEY not set (authenticity check disabled in production)');
  }

  // 重複防止（同じIPN_IDは1回のみ処理）
  if (kv && ipnId) {
    const dedupKey = `warriorplus:ipn:${ipnId}`;
    const already = await kv.get(dedupKey);
    if (already) {
      return res.status(200).json({ received: true, provider: 'warriorplus', dedup: true });
    }
    await kv.set(dedupKey, '1', { ex: 86400 * 14 });
  }

  console.log('[WarriorPlus IPN] 📨 Received:', {
    action,
    ipnId,
    saleId,
    itemNumber,
    itemName: itemName ? itemName.slice(0, 120) : null,
    buyerEmail,
    ts: new Date().toISOString(),
  });

  const grantActions = new Set(['sale', 'subscr_created', 'subscr_completed', 'subscr_reactivated', 'refund_reversal', 'subscr_resumed']);
  const revokeActions = new Set([
    'refund',
    'dispute',
    'subscr_cancelled',
    'subscr_refunded',
    'subscr_suspended',
    'subscr_ended',
    'subscr_failed_invalid',
    'subscr_failed_declined',
    'subscr_failed_unavailable',
    'subscr_paused',
  ]);
  if (action && !grantActions.has(action) && !revokeActions.has(action)) {
    console.warn('[WarriorPlus IPN] Unknown action (no grant/revoke):', action);
  }
  if (action && (grantActions.has(action) || revokeActions.has(action)) && !buyerEmail) {
    console.warn('[WarriorPlus IPN] Missing buyerEmail for action:', action, 'ipnId:', ipnId);
  }

  // WarriorPlus→自前KV＋Resend＋Telegram のみ
  const canGrant = WARRIORPLUS_USE_RESEND_TG &&
    grantActions.has(action) &&
    buyerEmail &&
    itemNumber &&
    (WARRIORPLUS_ITEM_TO_LANG[itemNumber] || itemNumber === String(process.env.WARRIORPLUS_MULTIPACK_ITEM_NUMBER || '').trim());

  let resendTgSent = false;
  let resendTgGrantHandled = false; // 自前DBモードで付与処理をしたか（KeyGen で固定 URL を返すため）

  if (canGrant) {
    const normEmail = safeLower(buyerEmail);
    const customerPlanOrItem = itemNumber;

    resendTgGrantHandled = true;
    // 販売プロダクトは6言語パック1つ。導線は言語別6 item だが、どの item でも常に6本リンクを送る
    const isKnownItem = itemNumber && WARRIORPLUS_ITEM_TO_LANG[itemNumber];
    const explicitMultipackItem = String(process.env.WARRIORPLUS_MULTIPACK_ITEM_NUMBER || '').trim();
    const isMultipack = (explicitMultipackItem && itemNumber === explicitMultipackItem) || isKnownItem;

    let tgLink = null;
    let multipackLinks = []; // [{ lang, label, link }]
    const publicBaseUrl = getPublicBaseUrl();
    const rescueToken = crypto.randomUUID();
    const rescueUrl = `${publicBaseUrl}/api/warriorplus-rescue?token=${encodeURIComponent(rescueToken)}`;
    if (kv) {
      try {
        await kv.set(`warriorplus:rescue:${rescueToken}`, {
          buyerEmail,
          itemNumber,
          saleId: saleId || null,
          ipnId: ipnId || null,
          action: action || null,
        }, { ex: 86400 * 7 });
      } catch (e) {
        console.warn('[WarriorPlus IPN] Rescue token KV set failed:', e?.message);
      }
    }

    if (isMultipack) {
      // 6言語パック: 各チャンネルの1回限りリンクを発行（固定リンク優先、なければ Bot API）
      const expireDate = Math.floor(Date.now() / 1000) + 86400 * 7;
      for (const lang of MULTIPACK_LANGS) {
        if (WARRIORPLUS_PREFER_STATIC_INVITE_LINKS) {
          const staticLink = process.env[`WARRIORPLUS_TG_INVITE_LINK_${lang}`];
          if (staticLink && String(staticLink).trim()) {
            multipackLinks.push({ lang, label: MULTIPACK_LANG_LABELS[lang] || lang, link: String(staticLink).trim() });
            continue;
          }
        }
        const chatIdEnv = process.env[`TELEGRAM_CHAT_ID_BTC_${lang}`];
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        if (chatIdEnv && botToken) {
          const link = await createTelegramInviteLinkWithRetry(botToken, String(chatIdEnv).trim(), {
            member_limit: 1,
            expire_date: expireDate,
          });
          if (link) multipackLinks.push({ lang, label: MULTIPACK_LANG_LABELS[lang] || lang, link });
        }

          // バースト時に Telegram 側へ瞬間的に叩きすぎないための「小さな間引き」
          const spacingMs = Math.max(0, Number(process.env.TELEGRAM_INVITE_SPACING_MS || 120));
          if (spacingMs > 0) await sleepMs(spacingMs);
      }
      console.log('[WarriorPlus IPN] 6-language pack: created', multipackLinks.length, 'invite links');
    } else {
      // 未知の item: 単一言語フォールバック（通常は使わない）
      tgLink = String(process.env.WARRIORPLUS_TG_CHANNEL_INVITE_LINK || '').trim();
      if (!tgLink && itemNumber) {
        const lang = WARRIORPLUS_ITEM_TO_LANG[itemNumber];
        if (lang && WARRIORPLUS_PREFER_STATIC_INVITE_LINKS) {
          const staticLink = process.env[`WARRIORPLUS_TG_INVITE_LINK_${lang}`];
          if (staticLink && String(staticLink).trim()) tgLink = String(staticLink).trim();
        }
        if (!tgLink && lang) {
          const chatIdEnv = process.env[`TELEGRAM_CHAT_ID_BTC_${lang}`];
          const botToken = process.env.TELEGRAM_BOT_TOKEN;
          if (chatIdEnv && botToken) {
            const expireDate = Math.floor(Date.now() / 1000) + 86400 * 7;
            tgLink = await createTelegramInviteLinkWithRetry(botToken, String(chatIdEnv).trim(), {
              member_limit: 1,
              expire_date: expireDate,
            }) || tgLink;
            if (tgLink) console.log('[WarriorPlus IPN] TG invite link created for lang:', lang);
          }
        }
        if (!tgLink && !lang) console.warn('[WarriorPlus IPN] Unknown WP_ITEM_NUMBER for TG channel:', itemNumber);
      }
    }

    if (kv) {
      const customerKey = `warriorplus:customer:${customerPlanOrItem}:${normEmail}`;
      const customer = {
        paidAt: new Date().toISOString(),
        saleId: saleId || null,
        ipnId: ipnId || null,
        action: action || null,
        revoked: false,
      };
      await kv.set(customerKey, JSON.stringify(customer), { ex: WARRIORPLUS_CUSTOMER_TTL_SECONDS });
      console.log('[WarriorPlus IPN] ✅ Customer registered (KV):', { planIdOrItem: customerPlanOrItem, email: normEmail });
    }

    const hasLinks = tgLink || multipackLinks.length > 0;
    if (process.env.RESEND_API_KEY) {
      try {
        const { sendResendEmail } = require('../services/email/resendClient');
        const emailLang = getWarriorPlusEmailLang(itemNumber);
        const emailCopy = WP_EMAIL_COPY[emailLang] || WP_EMAIL_COPY.EN;
        const subjectEnv = process.env[`WARRIORPLUS_POST_PURCHASE_EMAIL_SUBJECT_${emailLang}`] || process.env.WARRIORPLUS_POST_PURCHASE_EMAIL_SUBJECT || emailCopy.subject;
        let html;
        if (multipackLinks.length > 0) {
          html = buildWarriorPlusSixLangEmailHtml(multipackLinks, emailCopy);
        } else if (tgLink) {
          html = buildWarriorPlusSingleLinkEmailHtml(tgLink, emailCopy);
        } else {
          html = buildWarriorPlusSupportFallbackEmailHtml(emailCopy);
        }
        const accessUrl = String(process.env.WARRIORPLUS_ACCESS_URL || '').trim();
        html = appendRescueSection(html, rescueUrl, accessUrl, emailCopy);
        const subject = hasLinks ? subjectEnv : emailCopy.headerSubSupport;
        await sendResendEmail({
          to: buyerEmail,
          subject,
          html,
          from: 'support@cryptotradeacademy.io',
          fromName: 'CryptoTrade Academy',
          messageType: 'WARRIORPLUS_POST_PURCHASE',
        });
        resendTgSent = true;
        console.log('[WarriorPlus IPN] ✅ Resend email sent:', normEmail, 'lang:', emailLang, isMultipack ? `(multipack ${multipackLinks.length} links)` : (tgLink ? '(with TG link)' : '(fallback: contact support)'));
        await incrementWarriorPlusDailyStat(kv, 'grants');
        await incrementWarriorPlusDailyStat(kv, 'access_emails');
        const saleAmount = parseFloat(parsed.WP_SALE_AMOUNT || parsed.WP_AMOUNT || 0);
        if (Number.isFinite(saleAmount) && saleAmount > 0) await addWarriorPlusDailyRevenue(kv, saleAmount);

        // 招待リンクが作れていない/不足している場合は自動リトライ用にキューへ
        if (!hasLinks || (isMultipack && multipackLinks.length < MULTIPACK_LANGS.length)) {
          const enq = await enqueuePendingGrant(kv, { buyerEmail, itemNumber, saleId: saleId || null, reason: 'missing_invite_links' });
          if (enq) {
            await sendAdminAlert('Invite link missing (queued retry)', JSON.stringify({
              buyerEmail,
              itemNumber,
              saleId: saleId || null,
              multipackLinks: multipackLinks.length,
              expected: MULTIPACK_LANGS.length,
              rescueUrl,
            }, null, 2));
          }
        }
      } catch (e) {
        console.error('[WarriorPlus IPN] Resend email failed:', e?.message);
        await enqueuePendingGrant(kv, { buyerEmail, itemNumber, saleId: saleId || null, reason: 'resend_failed' });
        await sendAdminAlert('Resend failed (queued retry)', JSON.stringify({
          buyerEmail,
          itemNumber,
          saleId: saleId || null,
          error: e?.message || String(e),
        }, null, 2));
      }
    } else {
      console.warn('[WarriorPlus IPN] RESEND_API_KEY not set');
      await sendAdminAlert('RESEND_API_KEY missing', JSON.stringify({ buyerEmail, itemNumber, saleId: saleId || null }, null, 2));
    }
  }

  // 剥奪: KV を revoked に更新（解約・返金・dispute・支払失敗・停止）
  const revokePlanOrItem = itemNumber;
  if (revokeActions.has(action) && buyerEmail && (WARRIORPLUS_USE_RESEND_TG && itemNumber)) {
    const normEmail = safeLower(buyerEmail);
    if (kv) {
      try {
        const customerKey = `warriorplus:customer:${revokePlanOrItem}:${normEmail}`;
        const raw = await kv.get(customerKey);
        if (raw) {
          const customer = typeof raw === 'string' ? JSON.parse(raw) : raw;
          customer.revoked = true;
          customer.revokedAt = new Date().toISOString();
          customer.revokeAction = action || null;
          await kv.set(customerKey, JSON.stringify(customer), { ex: WARRIORPLUS_CUSTOMER_TTL_SECONDS });
          console.log('[WarriorPlus IPN] ✅ Customer revoked (KV):', { planIdOrItem: revokePlanOrItem, email: normEmail, action });
        } else {
          console.warn('[WarriorPlus IPN] No KV customer found to revoke', { buyerEmail, planIdOrItem: revokePlanOrItem });
        }
      } catch (e) {
        console.warn('[WarriorPlus IPN] KV revoke failed:', e?.message);
      }
    }
    // 剥奪系ユーザー向けメール（解約・返金・dispute・支払失敗・停止）を6言語で送信
    const emailType = WP_REVOKE_ACTION_TO_EMAIL_TYPE[action];
    if (emailType && buyerEmail && process.env.RESEND_API_KEY) {
      try {
        const emailLang = getWarriorPlusEmailLang(itemNumber);
        const revokeCopyByLang = WP_REVOKE_EMAIL_COPY[emailLang] || WP_REVOKE_EMAIL_COPY.EN;
        const revokeCopy = revokeCopyByLang[emailType];
        if (revokeCopy) {
          const html = buildWarriorPlusRevokeEmailHtml(emailType, revokeCopy);
          if (html) {
            const { sendResendEmail } = require('../services/email/resendClient');
            await sendResendEmail({
              to: buyerEmail,
              subject: revokeCopy.subject,
              html,
              from: 'support@cryptotradeacademy.io',
              fromName: 'CryptoTrade Academy',
              messageType: 'WARRIORPLUS_REVOKE',
            });
            console.log('[WarriorPlus IPN] ✅ Revoke email sent:', normEmail, 'type:', emailType, 'lang:', emailLang);
            await incrementWarriorPlusDailyStat(kv, 'revokes');
            await incrementWarriorPlusDailyStat(kv, 'revoke_emails');
          }
        }
      } catch (e) {
        console.error('[WarriorPlus IPN] Revoke email failed:', e?.message);
      }
    }
  }

  // KVに生データを保存（監査用）。セキュリティキーは保存しない
  if (kv) {
    try {
      const key = `warriorplus:ipn:raw:${ipnId || saleId || Date.now()}`;
      const toStore = { ...parsed };
      if (Object.prototype.hasOwnProperty.call(toStore, 'WP_SECURITYKEY')) toStore.WP_SECURITYKEY = '[REDACTED]';
      await kv.set(key, toStore, { ex: 86400 * 30 });
    } catch (e) {
      console.warn('[WarriorPlus IPN] KV save failed:', e?.message);
    }
  }

  const output = safeLower(req.query.output || '');
  if (output === 'text') {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    const accessUrl = process.env.WARRIORPLUS_ACCESS_URL || '';
    if (WARRIORPLUS_USE_RESEND_TG && resendTgGrantHandled) {
      return res.status(200).send(accessUrl || 'Check your email for the Telegram invite link.');
    }
  }

  return res.status(200).json({
    received: true,
    provider: 'warriorplus',
    action: action || null,
    ...(WARRIORPLUS_USE_RESEND_TG && {
      resend_tg_grant_handled: resendTgGrantHandled,
      resend_tg_email_sent: resendTgSent,
    }),
  });
}

/**
 * WarriorPlus IPN Handler（旧URL互換エイリアス）
 * POST /api/whop-webhook
 */
async function handler(req, res) {
  // W+ Key Generation URL（Thank Youページ）用: GETでも200を返せるようにする
  // ここで返すのは「アクセス案内ページURL」なので秘匿情報は含めない前提
  if (req.method === 'GET') {
    const output = safeLower(req.query.output || '');
    if (output === 'text') {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      const accessUrl = String(process.env.WARRIORPLUS_ACCESS_URL || '').trim();
      // accessUrl未設定でも200で返す（W+側UIでの失敗表示を避ける）
      return res.status(200).send(accessUrl || 'Check your email for the Telegram invite link.');
    }
    return res.status(200).json({ ok: true, provider: 'warriorplus' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Raw bodyを取得（W+ form-urlencoded の parse 用）
    const getRawBody = require('raw-body');
    let rawBody;
    let rawBodyWasFromStream = false;
    try {
      rawBody = await getRawBody(req, {
        encoding: 'utf8',
        limit: '10mb',
      });
      rawBodyWasFromStream = true;
    } catch (rawBodyError) {
      // フォールバック: req.bodyから再構築
      if (typeof req.body === 'string') {
        rawBody = req.body;
      } else if (req.body) {
        rawBody = JSON.stringify(req.body);
      } else {
        rawBody = '';
      }
    }

    const ct = safeLower(req.headers['content-type']);
    const bodyText = rawBodyWasFromStream ? rawBody : (typeof rawBody === 'string' ? rawBody : '');
    const bodyLen = typeof bodyText === 'string' ? bodyText.length : 0;
    // 実購入IPNが「空」で届く原因切り分け用（PIIは出さない）
    console.log('[WarriorPlus IPN] POST received', { contentType: ct || '(none)', bodyLength: bodyLen, hasWpInBody: bodyLen > 0 && bodyText.includes('WP_') });

    // W+ は multipart/form-data で送ってくることがある（実売で確認済み）。必ず先に判定する。
    // ※multipart の生 body も "=" と "WP_" を含むため、後続の「form っぽい」分岐に入ると querystring.parse で壊れる
    if (ct.includes('multipart/form-data')) {
      const obj = parseMultipartFormData(bodyText, ct);
      if (obj && isLikelyWarriorPlusPayload(obj)) {
        const bodyForWp = querystring.stringify(obj);
        return await handleWarriorPlusIPN({ req, res, rawBody: bodyForWp });
      }
    }

    // WarriorPlusの「Send Test」は JSON で送ることがあるため、JSONでも受ける
    if (ct.includes('application/json')) {
      const obj = parseBodyAsObject(bodyText) || (req.body && typeof req.body === 'object' ? req.body : null);
      if (obj && isLikelyWarriorPlusPayload(obj)) {
        const bodyForWp = querystring.stringify(obj);
        return await handleWarriorPlusIPN({ req, res, rawBody: bodyForWp });
      }
    }

    // 通常のIPN（form-urlencoded）
    if (ct.includes('application/x-www-form-urlencoded')) {
      return await handleWarriorPlusIPN({ req, res, rawBody: bodyText });
    }

    // Content-Type が不正でも、中身が form-urlencoded っぽい（key=value）なら処理を試みる（multipart は除外）
    if (!ct.includes('multipart/form-data') && bodyText && bodyText.includes('=') && bodyText.includes('WP_')) {
      return await handleWarriorPlusIPN({ req, res, rawBody: bodyText });
    }

    // W+ のテスト機能が「W+形式ではない」ペイロードを送る場合があるため、
    // 415で弾いてUI上のテストを失敗させず、200で受理（ただしIPNとしては無視）する。
    console.warn('[WarriorPlus IPN] Ignored test notification (unsupported content-type)', { ct: ct || null, len: bodyText ? bodyText.length : 0 });
    return res.status(200).json({ received: true, provider: 'warriorplus', ignored: true });
  } catch (error) {
    console.error('[WarriorPlus IPN] ❌ Error processing IPN:', error.message);
    console.error('[WarriorPlus IPN] Stack:', error.stack);
    return res.status(200).json({ received: false, provider: 'warriorplus', error: error.message });
  }
}

module.exports = handler;
