// api/whop-webhook.js
// Whop Webhookエンドポイント（購入イベント受信・X投稿との紐付け）

const crypto = require('crypto');
const querystring = require('querystring');

// 🚀 シームレスなKVアクセス（utils/kv.js経由）
const { kv } = require('../utils/kv');

// Whop Webhook Secret（署名検証用、環境変数から取得）
const WHOP_WEBHOOK_SECRET = process.env.WHOP_WEBHOOK_SECRET;
// Whop ダッシュボードの「Test webhook」は署名を送らないため、テスト時に1を設定してスキップ可能
const WHOP_SKIP_SIGNATURE_FOR_TEST = process.env.WHOP_SKIP_SIGNATURE_FOR_TEST === '1';
const AFFILIATE_CONVERSION_COUNT_KEY = (type, dateStr) =>
  `affiliate_recruit:conversion:affiliate:${type}:${dateStr}:count`;
const AFFILIATE_CONVERSION_EVENTS_KEY = (dateStr) =>
  `affiliate_recruit:conversion:affiliate:${dateStr}:events`;
const AFFILIATE_CONVERSION_TTL_SECONDS = 86400 * 30;
const X_REPLY_SALES_TRIAL_START_KEY = (dateStr) => `x_reply_sales:trial_start:${dateStr}`;
const X_REPLY_SALES_TRIAL_START_LANG_KEY = (dateStr, lang) =>
  `x_reply_sales:trial_start:${dateStr}:${lang}`;
const X_REPLY_SALES_TRIAL_EVENT_DEDUP_KEY = (eventId) =>
  `x_reply_sales:trial_start:event:${eventId}`;
const X_REPLY_SALES_TRIAL_EVENTS_KEY = (dateStr) => `x_reply_sales:trial_start_events:${dateStr}`;
const X_REPLY_SALES_CONVERSION_KEY = (dateStr) => `x_reply_sales:conversion:${dateStr}`;
const X_REPLY_SALES_CONVERSION_LANG_KEY = (dateStr, lang) =>
  `x_reply_sales:conversion:${dateStr}:${lang}`;
const X_REPLY_SALES_CONVERSION_EVENT_DEDUP_KEY = (eventId) =>
  `x_reply_sales:conversion:event:${eventId}`;
const X_REPLY_SALES_TTL_SECONDS = 86400 * 90;
const X_REPLY_SALES_SUPPORTED_LANGS = new Set(['en', 'ja', 'ko', 'es', 'pt', 'ar']);

/**
 * WHOP_WEBHOOK_SECRET から HMAC 用キーの候補を返す
 * Whop 公式: "use the webhook_secret as-is (keep the whsec_ prefix)" を最優先
 * - whsec_ 付きのまま文字列で使用
 * - whsec_ 除去 + base64 デコード（Standard Webhooks スタイル）
 * - そのまま + base64 デコード試行
 */
function getWebhookSigningKeyVariants(secret) {
  if (!secret) return [];
  const keys = [];
  keys.push(secret); // as-is（whsec_ 含む）を最優先
  if (secret.startsWith('whsec_')) {
    try {
      keys.push(Buffer.from(secret.slice(6), 'base64'));
    } catch (_) { /* ignore */ }
  }
  try {
    const decoded = Buffer.from(secret, 'base64');
    if (decoded.length > 0) keys.push(decoded);
  } catch (_) { /* ignore */ }
  return keys;
}

/**
 * Whop Webhook署名を検証（Standard Webhooks 準拠）
 * ペイロードは id.timestamp.body と timestamp.body の両方を試行
 */
function verifyWhopWebhookSignature(signatureHeader, body, timestamp, webhookId) {
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';

  if (!WHOP_WEBHOOK_SECRET) {
    if (isProduction) {
      console.error('[Whop Webhook] ❌ CRITICAL: WHOP_WEBHOOK_SECRET not set in production');
      return false;
    }
    console.warn('[Whop Webhook] WHOP_WEBHOOK_SECRET not set, skipping signature verification (development mode)');
    return true;
  }

  try {
    const ts = String(timestamp).trim();
    const timestampNum = parseInt(ts, 10);
    const now = Math.floor(Date.now() / 1000);
    const timeDiff = Math.abs(now - timestampNum);
    const MAX_TIME_DIFF = 5 * 60;
    if (isNaN(timestampNum) || timeDiff > MAX_TIME_DIFF) {
      console.warn('[Whop Webhook] ⚠️ Timestamp out of range:', { timestamp: ts, diff: timeDiff });
      return false;
    }

    const keyVariants = getWebhookSigningKeyVariants(WHOP_WEBHOOK_SECRET);
    const payloads = [];
    if (webhookId) payloads.push({ signed: `${webhookId}.${ts}.${body}`, name: 'id.timestamp.body' });
    payloads.push({ signed: `${ts}.${body}`, name: 'timestamp.body' });

    const parts = String(signatureHeader).split(/\s+/);
    for (const part of parts) {
      const trimmed = part.trim();
      const match = trimmed.match(/^v1,(.+)$/);
      const rawSig = match ? match[1].trim() : trimmed;
      if (!rawSig) continue;

      for (const key of keyVariants) {
        for (const { signed } of payloads) {
          const hmacHex = crypto.createHmac('sha256', key);
          hmacHex.update(signed);
          const expectedHex = hmacHex.digest('hex');
          const hmacBase64 = crypto.createHmac('sha256', key);
          hmacBase64.update(signed);
          const expectedBase64 = hmacBase64.digest('base64');
          if (rawSig.length === 64 && /^[a-fA-F0-9]+$/.test(rawSig) && rawSig === expectedHex) return true;
          try {
            const sigBuf = Buffer.from(rawSig, 'base64');
            const expBuf = Buffer.from(expectedBase64, 'base64');
            if (sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf)) return true;
          } catch (_) { /* ignore */ }
        }
      }
    }
    if (process.env.WHOP_WEBHOOK_DEBUG === '1') {
      console.log('[Whop Webhook] DEBUG paste to Whop:', JSON.stringify({
        'webhook-id': webhookId || null,
        'webhook-timestamp': ts,
        'webhook-signature': signatureHeader,
        body: body,
      }));
    }
    console.warn('[Whop Webhook] ⚠️ Invalid signature (tried hex and base64, multiple key/payload variants)');
    return false;
  } catch (error) {
    console.error('[Whop Webhook] ❌ Signature verification error:', error.message);
    return false;
  }
}

function safeLower(s) {
  return String(s || '').toLowerCase().trim();
}

function isLikelyWarriorPlusRequest(req, parsedForm) {
  const ct = safeLower(req.headers['content-type']);
  if (ct.includes('application/x-www-form-urlencoded')) return true;
  if (parsedForm && typeof parsedForm === 'object' && (parsedForm.WP_ACTION || parsedForm.WP_SALEID || parsedForm.IPN_ID)) {
    return true;
  }
  return false;
}

function resolveWhopPlanIdForWarriorPlus({ itemNumber, itemName }) {
  const num = String(itemNumber || '').trim();
  const name = String(itemName || '').trim();

  if (num) {
    const directKey = `WARRIORPLUS_ITEM_NUMBER_${num}_WHOP_PLAN_ID`;
    if (process.env[directKey]) return process.env[directKey];
  }

  if (name) {
    const slug = name
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    if (slug) {
      const byNameKey = `WARRIORPLUS_ITEM_NAME_${slug}_WHOP_PLAN_ID`;
      if (process.env[byNameKey]) return process.env[byNameKey];
    }
  }

  const mappingJson = process.env.WARRIORPLUS_ITEM_TO_WHOP_PLAN_ID_JSON;
  if (mappingJson) {
    try {
      const mapping = JSON.parse(mappingJson);
      if (num && mapping[num]) return mapping[num];
      if (name && mapping[name]) return mapping[name];
    } catch (e) {
      console.warn('[WarriorPlus IPN] WARRIORPLUS_ITEM_TO_WHOP_PLAN_ID_JSON parse failed:', e?.message);
    }
  }

  return null;
}

/** WarriorPlus 連携で使用している Whop plan_id の一覧（照合用） */
function getWarriorPlusPlanIds() {
  const set = new Set();
  const prefix = 'WARRIORPLUS_ITEM_NUMBER_';
  const suffix = '_WHOP_PLAN_ID';
  for (const key of Object.keys(process.env)) {
    if (key.startsWith(prefix) && key.endsWith(suffix)) {
      const val = process.env[key];
      if (val && String(val).trim()) set.add(String(val).trim());
    }
  }
  const json = process.env.WARRIORPLUS_ITEM_TO_WHOP_PLAN_ID_JSON;
  if (json) {
    try {
      const obj = JSON.parse(json);
      for (const v of Object.values(obj)) {
        if (v && String(v).trim()) set.add(String(v).trim());
      }
    } catch (_) { /* ignore */ }
  }
  return set;
}

const WARRIORPLUS_ALLOWED_EMAIL_TTL_SECONDS = 3600; // 1時間
/** Whop を使わず Resend で TG 招待＋KV 顧客管理にする場合は 1 */
const WARRIORPLUS_USE_RESEND_TG = process.env.WARRIORPLUS_USE_RESEND_TG === '1';
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
    const res = await fetch(`https://api.telegram.org/bot${botToken}/createChatInviteLink`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!data.ok || !data.result?.invite_link) return null;
    return data.result.invite_link;
  } catch (e) {
    console.warn('[WarriorPlus IPN] createChatInviteLink failed:', e?.message);
    return null;
  }
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

  const requiredKey = String(process.env.WARRIORPLUS_SECURITY_KEY || '').trim();
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
  if (requiredKey) {
    if (!securityKey || securityKey !== requiredKey) {
      console.error('[WarriorPlus IPN] ❌ Invalid WP_SECURITYKEY', {
        hasKey: !!securityKey,
        action,
        ipnId,
        saleId,
      });
      if (isProduction) {
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

  const planId = resolveWhopPlanIdForWarriorPlus({ itemNumber, itemName });

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

  // WarriorPlus→自前DB＋Resend（Whop は LP のみ） or WarriorPlus→Whop
  // TG専用モードでは planId がなくても、itemNumber が WARRIORPLUS_ITEM_TO_LANG またはマルチパックに含まれていれば Resend 送信する
  const canGrantResendTgOnly = WARRIORPLUS_USE_RESEND_TG && itemNumber && (
    WARRIORPLUS_ITEM_TO_LANG[itemNumber] ||
    itemNumber === String(process.env.WARRIORPLUS_MULTIPACK_ITEM_NUMBER || '').trim()
  );
  const canGrant = grantActions.has(action) && buyerEmail && (planId || canGrantResendTgOnly);

  let whopCheckout = null;
  let directGrantSuccess = false;
  let resendTgSent = false;
  let resendTgGrantHandled = false; // 自前DBモードで付与処理をしたか（KeyGen で固定 URL を返すため）

  if (canGrant) {
    const normEmail = safeLower(buyerEmail);
    const customerPlanOrItem = planId || itemNumber; // KV キー用（TG専用で planId なしのときは itemNumber）

    if (WARRIORPLUS_USE_RESEND_TG) {
      resendTgGrantHandled = true;
      // 販売プロダクトは6言語パック1つ。導線は言語別6 item だが、どの item でも常に6本リンクを送る
      const isKnownItem = itemNumber && WARRIORPLUS_ITEM_TO_LANG[itemNumber];
      const explicitMultipackItem = String(process.env.WARRIORPLUS_MULTIPACK_ITEM_NUMBER || '').trim();
      const isMultipack = (explicitMultipackItem && itemNumber === explicitMultipackItem) || isKnownItem;

      let tgLink = null;
      let multipackLinks = []; // [{ lang, label, link }]

      if (isMultipack) {
        // 6言語パック: 各チャンネルの1回限りリンクを発行（固定リンク優先、なければ Bot API）
        const expireDate = Math.floor(Date.now() / 1000) + 86400 * 7;
        for (const lang of MULTIPACK_LANGS) {
          const staticLink = process.env[`WARRIORPLUS_TG_INVITE_LINK_${lang}`];
          if (staticLink && String(staticLink).trim()) {
            multipackLinks.push({ lang, label: MULTIPACK_LANG_LABELS[lang] || lang, link: String(staticLink).trim() });
            continue;
          }
          const chatIdEnv = process.env[`TELEGRAM_CHAT_ID_BTC_${lang}`];
          const botToken = process.env.TELEGRAM_BOT_TOKEN;
          if (chatIdEnv && botToken) {
            const link = await createTelegramInviteLink(botToken, String(chatIdEnv).trim(), {
              member_limit: 1,
              expire_date: expireDate,
            });
            if (link) multipackLinks.push({ lang, label: MULTIPACK_LANG_LABELS[lang] || lang, link });
          }
        }
        console.log('[WarriorPlus IPN] 6-language pack: created', multipackLinks.length, 'invite links');
      } else {
        // 未知の item: 単一言語フォールバック（通常は使わない）
        tgLink = String(process.env.WARRIORPLUS_TG_CHANNEL_INVITE_LINK || '').trim();
        if (!tgLink && itemNumber) {
          const lang = WARRIORPLUS_ITEM_TO_LANG[itemNumber];
          if (lang) {
            const staticLink = process.env[`WARRIORPLUS_TG_INVITE_LINK_${lang}`];
            if (staticLink && String(staticLink).trim()) tgLink = String(staticLink).trim();
          }
          if (!tgLink && lang) {
            const chatIdEnv = process.env[`TELEGRAM_CHAT_ID_BTC_${lang}`];
            const botToken = process.env.TELEGRAM_BOT_TOKEN;
            if (chatIdEnv && botToken) {
              const expireDate = Math.floor(Date.now() / 1000) + 86400 * 7;
              tgLink = await createTelegramInviteLink(botToken, String(chatIdEnv).trim(), {
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
        } catch (e) {
          console.error('[WarriorPlus IPN] Resend email failed:', e?.message);
        }
      } else {
        console.warn('[WarriorPlus IPN] RESEND_API_KEY not set');
      }
    } else {
      // 従来: WarriorPlus→Whop（B案 or A案）
      const useDirectGrant = process.env.WARRIORPLUS_USE_DIRECT_GRANT === '1';
      if (useDirectGrant && process.env.WHOP_COMPANY_ID) {
        try {
          const { grantMembershipByEmail } = require('../services/whop/client');
          const result = await grantMembershipByEmail({
            plan_id: planId,
            email: buyerEmail,
            metadata: {
              source: 'warriorplus',
              wp_action: action || null,
              wp_ipn_id: ipnId || null,
              wp_sale_id: saleId || null,
              wp_item_number: itemNumber || null,
              wp_item_name: itemName || null,
              wp_txnid: parsed.WP_TXNID || null,
            },
          });
          if (result?.success) {
            directGrantSuccess = true;
            console.log('[WarriorPlus IPN] ✅ Direct membership grant succeeded:', result.membership_id);
          }
        } catch (e) {
          console.warn('[WarriorPlus IPN] Direct grant failed, falling back to checkout URL:', e?.message);
        }
      }
      if (!directGrantSuccess) {
        if (!planId) {
          console.warn('[WarriorPlus IPN] No Whop plan mapping for item', { itemNumber, itemName });
        } else {
          try {
            const { createCheckoutSessionBasic } = require('../services/whop/client');
            const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : process.env.BASE_URL || '';
            const redirectUrl = baseUrl ? `${baseUrl}/checkout/complete` : undefined;
            const { purchase_url, id } = await createCheckoutSessionBasic({
              plan_id: planId,
              redirect_url: redirectUrl,
              metadata: {
                source: 'warriorplus',
                wp_action: action || null,
                wp_ipn_id: ipnId || null,
                wp_sale_id: saleId || null,
                wp_item_number: itemNumber || null,
                wp_item_name: itemName || null,
                wp_buyer_email: buyerEmail || null,
                wp_txnid: parsed.WP_TXNID || null,
              },
            });
            whopCheckout = { id, purchase_url, plan_id: planId };
          } catch (e) {
            console.error('[WarriorPlus IPN] Whop checkout session create failed:', e?.message);
          }
        }
      }
      if (!directGrantSuccess && whopCheckout && planId && buyerEmail && kv) {
        const allowedKey = `warriorplus:allowed:${planId}:${normEmail}`;
        await kv.set(allowedKey, ipnId || saleId || '1', { ex: WARRIORPLUS_ALLOWED_EMAIL_TTL_SECONDS });
        console.log('[WarriorPlus IPN] ✅ Allowed email registered for validation:', { planId, email: normEmail });
      }
    }
  }

  // 剥奪: 自前DBモードなら KV を revoked に更新。Whop モードなら既存の Whop terminate
  const revokePlanOrItem = planId || itemNumber;
  if (revokeActions.has(action) && buyerEmail && (planId || (WARRIORPLUS_USE_RESEND_TG && itemNumber))) {
    const normEmail = safeLower(buyerEmail);
    if (WARRIORPLUS_USE_RESEND_TG && kv) {
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
    } else if (planId) {
      try {
        const { listMemberships, terminateMembership, cancelMembership } = require('../services/whop/client');
        const companyId = process.env.WHOP_COMPANY_ID;
        const memberships = await listMemberships({
          company_id: companyId || undefined,
          plan_ids: [planId],
          first: 50,
        });
        const match = (Array.isArray(memberships) ? memberships : []).find((m) => {
          const email = m?.member?.email || m?.user?.email;
          return safeLower(email) === safeLower(buyerEmail);
        });
        if (match?.id) {
          const mode = safeLower(process.env.WARRIORPLUS_REVOKE_MODE) || 'terminate';
          if (mode === 'cancel') {
            await cancelMembership(match.id, { cancellation_mode: 'immediate' });
            console.log('[WarriorPlus IPN] ✅ Whop membership cancelled:', match.id);
          } else {
            await terminateMembership(match.id);
            console.log('[WarriorPlus IPN] ✅ Whop membership terminated:', match.id);
          }
        } else {
          console.warn('[WarriorPlus IPN] No matching Whop membership found to revoke', { buyerEmail, planId, action });
        }
      } catch (e) {
        console.warn('[WarriorPlus IPN] Revoke attempt failed:', e?.message);
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
    const accessUrl = process.env.WARRIORPLUS_ACCESS_URL || process.env.WHOP_WEBHOOK_URL || '';
    if (WARRIORPLUS_USE_RESEND_TG && resendTgGrantHandled) {
      return res.status(200).send(accessUrl || 'Check your email for the Telegram invite link.');
    }
    if (directGrantSuccess) {
      return res.status(200).send(accessUrl || 'Access granted. Check your email for the login link.');
    }
    if (whopCheckout?.purchase_url) {
      return res.status(200).send(whopCheckout.purchase_url);
    }
  }

  return res.status(200).json({
    received: true,
    provider: 'warriorplus',
    action: action || null,
    plan_id: planId || null,
    direct_grant_success: directGrantSuccess,
    whop_checkout: whopCheckout,
    ...(WARRIORPLUS_USE_RESEND_TG && {
      resend_tg_grant_handled: resendTgGrantHandled,
      resend_tg_email_sent: resendTgSent,
    }),
  });
}

/**
 * UTMパラメータからX投稿IDを抽出
 * @param {string} utmContent - UTM contentパラメータ（例: "influencer_username" または "x_post_1234567890"）
 * @returns {Object|null} { tweetId, influencerUsername } または null
 */
function extractXPostInfoFromUtm(utmContent) {
  if (!utmContent) return null;
  
  // パターン1: influencer_username形式
  const influencerMatch = utmContent.match(/^influencer_(.+)$/);
  if (influencerMatch) {
    return {
      influencerUsername: influencerMatch[1],
      tweetId: null, // tweetIdは後で検索
    };
  }
  
  // パターン2: x_post_1234567890形式（tweetIdが含まれている場合）
  const tweetIdMatch = utmContent.match(/^x_post_(\d{18,19})$/);
  if (tweetIdMatch) {
    return {
      tweetId: tweetIdMatch[1],
      influencerUsername: null,
    };
  }
  
  return null;
}

function resolveConversionType(planId, amount) {
  const normalizedPlanId = String(planId || '').toLowerCase();
  const amountNum = Number(amount);
  const isMinimal =
    normalizedPlanId.includes('minimal') ||
    normalizedPlanId.includes('free') ||
    amountNum === 0;
  return isMinimal ? 'minimal' : 'regular';
}

function normalizeReplySalesLang(rawLang) {
  const normalized = String(rawLang || '').toLowerCase().trim();
  if (!normalized) return 'en';
  if (normalized === 'pt-br') return 'pt';
  return X_REPLY_SALES_SUPPORTED_LANGS.has(normalized) ? normalized : 'en';
}

async function recordXReplySalesTrialStart({
  dateString,
  eventId,
  lang,
  tweetId,
  postType,
  pattern,
  amount,
  currency,
  eventType,
  checkoutId,
  membershipId,
  userEmail
}) {
  if (!kv || !dateString || !eventId) return;

  const dedupKey = X_REPLY_SALES_TRIAL_EVENT_DEDUP_KEY(String(eventId));
  const already = await kv.get(dedupKey);
  if (already) return;

  await kv.set(dedupKey, '1', { ex: 86400 * 7 });
  const safeLang = normalizeReplySalesLang(lang);
  const totalKey = X_REPLY_SALES_TRIAL_START_KEY(dateString);
  const langKey = X_REPLY_SALES_TRIAL_START_LANG_KEY(dateString, safeLang);
  const [v1, v2] = await Promise.all([kv.incr(totalKey, 1), kv.incr(langKey, 1)]);
  if (v1 != null) await kv.expire(totalKey, X_REPLY_SALES_TTL_SECONDS);
  if (v2 != null) await kv.expire(langKey, X_REPLY_SALES_TTL_SECONDS);

  const eventsKey = X_REPLY_SALES_TRIAL_EVENTS_KEY(dateString);
  const eventsRaw = await kv.get(eventsKey);
  const events = Array.isArray(eventsRaw) ? eventsRaw : [];
  events.push({
    ts: new Date().toISOString(),
    eventId: String(eventId),
    lang: safeLang,
    tweetId: tweetId || null,
    postType: postType || null,
    pattern: pattern || null,
    amount: Number.isFinite(Number(amount)) ? Number(amount) : amount,
    currency: currency || 'USD',
    eventType: eventType || null,
    checkoutId: checkoutId || null,
    membershipId: membershipId || null,
    userEmail: userEmail || null
  });
  if (events.length > 1000) events.splice(0, events.length - 500);
  await kv.set(eventsKey, events, { ex: X_REPLY_SALES_TTL_SECONDS });
}

/**
 * Xリプライ直販の有料成約（Whop成約）を日次・言語別に記録（KPI用）
 */
async function recordXReplySalesConversion({
  dateString,
  eventId,
  lang,
  amount,
  currency,
  checkoutId,
  membershipId,
  userEmail
}) {
  if (!kv || !dateString || !eventId) return;

  const dedupKey = X_REPLY_SALES_CONVERSION_EVENT_DEDUP_KEY(String(eventId));
  const already = await kv.get(dedupKey);
  if (already) return;

  await kv.set(dedupKey, '1', { ex: 86400 * 7 });
  const safeLang = normalizeReplySalesLang(lang);
  const totalKey = X_REPLY_SALES_CONVERSION_KEY(dateString);
  const langKey = X_REPLY_SALES_CONVERSION_LANG_KEY(dateString, safeLang);
  const [v1, v2] = await Promise.all([kv.incr(totalKey, 1), kv.incr(langKey, 1)]);
  if (v1 != null) await kv.expire(totalKey, X_REPLY_SALES_TTL_SECONDS);
  if (v2 != null) await kv.expire(langKey, X_REPLY_SALES_TTL_SECONDS);
}

async function recordAffiliateAttributedConversion({
  dateString,
  conversionType,
  eventId,
  amount,
  currency,
  userEmail,
  refId,
  promoCode,
  planId,
  eventType
}) {
  if (!kv || !dateString || !eventId) return;

  const safeType = conversionType === 'minimal' ? 'minimal' : 'regular';
  const countKey = AFFILIATE_CONVERSION_COUNT_KEY(safeType, dateString);
  await kv.incr(countKey, 1);
  await kv.expire(countKey, AFFILIATE_CONVERSION_TTL_SECONDS);

  const eventsKey = AFFILIATE_CONVERSION_EVENTS_KEY(dateString);
  const events = (await kv.get(eventsKey)) || [];
  const list = Array.isArray(events) ? events : [];
  list.push({
    ts: new Date().toISOString(),
    eventId: String(eventId),
    conversionType: safeType,
    amount: Number.isFinite(Number(amount)) ? Number(amount) : amount,
    currency: currency || 'USD',
    userEmail: userEmail || null,
    refId: refId || null,
    promoCode: promoCode || null,
    planId: planId || null,
    eventType: eventType || null
  });
  if (list.length > 1000) list.splice(0, list.length - 500);
  await kv.set(eventsKey, list, { ex: AFFILIATE_CONVERSION_TTL_SECONDS });
}

/**
 * 購入イベントを処理（X投稿との紐付け）
 * @param {Object} event - Whop Webhookイベントデータ
 */
async function handlePurchaseEvent(event) {
  try {
    const {
      type, // イベントタイプ（例: "checkout.completed", "membership.created"）
      data, // イベントデータ
    } = event;
    
    console.log(`[Whop Webhook] 📨 Received purchase event:`, {
      type,
      data: JSON.stringify(data).substring(0, 500),
      timestamp: new Date().toISOString(),
    });
    
    // 購入情報を抽出（checkout / membership / payment / invoice に対応）
    const checkout = data?.checkout || data;
    const membership = data?.membership || data?.membership_data;
    const payment = data?.payment;
    const invoice = data?.invoice;
    const user = data?.user || checkout?.user || membership?.user || payment?.user || invoice?.user;
    
    // UTMパラメータを取得（referrer_urlまたはmetadataから）
    const referrerUrl = checkout?.referrer_url || checkout?.metadata?.referrer_url;
    const metadata = checkout?.metadata || membership?.metadata || payment?.metadata || invoice?.metadata || {};
    
    // UTMパラメータを解析
    let utmSource = null;
    let utmMedium = null;
    let utmCampaign = null;
    let utmContent = null;
    
    let refIdFromReferrer = null;
    let xReplySalesMeta = null;
    if (referrerUrl) {
      try {
        const url = new URL(referrerUrl);
        utmSource = url.searchParams.get('utm_source');
        utmMedium = url.searchParams.get('utm_medium');
        utmCampaign = url.searchParams.get('utm_campaign');
        utmContent = url.searchParams.get('utm_content');
        refIdFromReferrer = url.searchParams.get('ref') || url.searchParams.get('ref_id');
        if (String(utmSource || '').toLowerCase() === 'x_reply_sales') {
          xReplySalesMeta = {
            lang: normalizeReplySalesLang(url.searchParams.get('xrs_lang') || metadata.xrs_lang),
            tweetId: url.searchParams.get('xrs_tweet_id') || metadata.xrs_tweet_id || null,
            postType: url.searchParams.get('xrs_post_type') || metadata.xrs_post_type || null,
            pattern: url.searchParams.get('xrs_pattern') || metadata.xrs_pattern || null
          };
        }
      } catch (urlError) {
        console.warn('[Whop Webhook] ⚠️ Failed to parse referrer URL:', urlError.message);
      }
    }
    
    // FirstPromoter 用: ref_id / promo_code（紹介紐付け）
    const refId = metadata.ref_id || metadata.ref || refIdFromReferrer;
    const promoCode = checkout?.promo_code || membership?.promo_code || payment?.promo_code || invoice?.promo_code || metadata.promo_code;
    
    // metadataからもUTMパラメータを取得
    if (!utmSource && metadata.utm_source) utmSource = metadata.utm_source;
    if (!utmMedium && metadata.utm_medium) utmMedium = metadata.utm_medium;
    if (!utmCampaign && metadata.utm_campaign) utmCampaign = metadata.utm_campaign;
    if (!utmContent && metadata.utm_content) utmContent = metadata.utm_content;
    if (!xReplySalesMeta && String(utmSource || '').toLowerCase() === 'x_reply_sales') {
      xReplySalesMeta = {
        lang: normalizeReplySalesLang(metadata.xrs_lang || metadata.lang),
        tweetId: metadata.xrs_tweet_id || null,
        postType: metadata.xrs_post_type || null,
        pattern: metadata.xrs_pattern || null
      };
    }
    
    // X投稿情報を抽出
    const xPostInfo = extractXPostInfoFromUtm(utmContent);
    
    // コンバージョン情報を構築（payment / invoice の amount も取得）
    const amountRaw = checkout?.total ?? membership?.renewal_price ?? payment?.amount ?? invoice?.amount ?? payment?.total ?? invoice?.total;
    const conversionData = {
      eventType: type,
      checkoutId: checkout?.id || membership?.checkout_id || payment?.checkout_id || invoice?.checkout_id,
      membershipId: membership?.id || payment?.membership_id || invoice?.membership_id,
      userId: user?.id,
      userEmail: user?.email,
      planId: checkout?.plan_id || membership?.plan_id || payment?.plan_id || invoice?.plan_id,
      productId: checkout?.product_id || membership?.product_id || payment?.product_id || invoice?.product_id,
      amount: amountRaw,
      currency: checkout?.currency || membership?.currency || payment?.currency || invoice?.currency || 'USD',
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent,
      xPostInfo,
      xReplySalesMeta,
      timestamp: new Date().toISOString(),
    };
    
    console.log(`[Whop Webhook] ✅ Conversion data extracted:`, {
      checkoutId: conversionData.checkoutId,
      membershipId: conversionData.membershipId,
      userEmail: conversionData.userEmail,
      utmContent: conversionData.utmContent,
      xPostInfo: conversionData.xPostInfo,
    });

    const dateString = new Date().toISOString().split('T')[0];
    const conversionType = resolveConversionType(conversionData.planId, conversionData.amount);
    
    // KPI追跡: コンバージョンを記録
    try {
      const { recordConversion } = require('./analytics-dashboard');
      
      await recordConversion(conversionType, dateString, {
        source: utmSource || 'unknown',
        planId: conversionData.planId,
        amount: conversionData.amount,
        xPostInfo: conversionData.xPostInfo,
      });
      
      console.log(`[Whop Webhook] ✅ KPI conversion recorded: ${conversionType} on ${dateString}`);
    } catch (kpiError) {
      console.warn(`[Whop Webhook] ⚠️ Failed to record KPI conversion:`, kpiError.message);
    }

    if (String(utmSource || '').toLowerCase() === 'x_reply_sales' && conversionType === 'minimal') {
      try {
        const trialEventId =
          conversionData.checkoutId ||
          conversionData.membershipId ||
          `xrs_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        await recordXReplySalesTrialStart({
          dateString,
          eventId: trialEventId,
          lang: xReplySalesMeta?.lang || 'en',
          tweetId: xReplySalesMeta?.tweetId || null,
          postType: xReplySalesMeta?.postType || null,
          pattern: xReplySalesMeta?.pattern || null,
          amount: conversionData.amount,
          currency: conversionData.currency,
          eventType: type,
          checkoutId: conversionData.checkoutId,
          membershipId: conversionData.membershipId,
          userEmail: conversionData.userEmail
        });
        console.log('[Whop Webhook] ✅ x_reply_sales trial start recorded:', {
          dateString,
          lang: xReplySalesMeta?.lang || 'en',
          trialEventId
        });
      } catch (xrsError) {
        console.warn('[Whop Webhook] x_reply_sales trial start record failed:', xrsError?.message);
      }
    }

    // Xリプライ直販 KPI: 有料成約（amount > 0 または regular）を日次・言語別に記録
    if (String(utmSource || '').toLowerCase() === 'x_reply_sales' && (Number(conversionData.amount || 0) > 0 || conversionType === 'regular')) {
      try {
        const convEventId = conversionData.checkoutId || conversionData.membershipId || `xrs_conv_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        await recordXReplySalesConversion({
          dateString,
          eventId: convEventId,
          lang: xReplySalesMeta?.lang || 'en',
          amount: conversionData.amount,
          currency: conversionData.currency,
          checkoutId: conversionData.checkoutId,
          membershipId: conversionData.membershipId,
          userEmail: conversionData.userEmail
        });
        console.log('[Whop Webhook] ✅ x_reply_sales conversion (paid) recorded:', {
          dateString,
          lang: xReplySalesMeta?.lang || 'en',
          conversionType
        });
      } catch (xrsConvError) {
        console.warn('[Whop Webhook] x_reply_sales conversion record failed:', xrsConvError?.message);
      }
    }

    // FirstPromoter: 紹介売上がある場合のみ track/sale（ref_id または promo_code が取れたとき）
    const amountNum = Number(conversionData.amount);
    if (amountNum > 0 && !refId && !promoCode) {
      console.warn('[Whop Webhook] ⚠️ FirstPromoter: 成約ありだが ref_id/promo_code なし。アフィリエイターに紐づきません。referrer_url/metadata を確認:', { hasReferrerUrl: !!referrerUrl, metadataKeys: Object.keys(metadata) });
    }
    if ((refId || promoCode) && amountNum > 0) {
      try {
        const { trackSale } = require('../services/firstpromoter/trackSale');
        const currency = (conversionData.currency || 'USD').toUpperCase();
        const amountForFp = currency === 'JPY' ? Math.round(amountNum) : Math.round(amountNum * 100);
        const eventId = conversionData.checkoutId || conversionData.membershipId || `whop_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

        // 重複送信防止: 同一購入で checkout.completed / membership.activated 等が複数届く場合、
        // checkoutId または membershipId が既に送信済みならスキップ（詳細: docs/FIRSTPROMOTER_WHOP_INTEGRATION_AUDIT.md）
        const fpDedupKeys = [conversionData.checkoutId, conversionData.membershipId].filter(Boolean).map((id) => `fp_sent:${id}`);
        let shouldSendFp = true;
        if (kv && fpDedupKeys.length > 0) {
          const sentValues = await Promise.all(fpDedupKeys.map((k) => kv.get(k)));
          shouldSendFp = !sentValues.some((v) => !!v);
          if (!shouldSendFp) {
            console.log('[Whop Webhook] ℹ️ FirstPromoter track/sale skipped (already sent for this purchase):', eventId);
          }
        }

        if (shouldSendFp) {
          const fpResult = await trackSale({
            event_id: String(eventId),
            amount: amountForFp,
            email: conversionData.userEmail || undefined,
            ref_id: refId || undefined,
            promo_code: promoCode || undefined,
            currency,
            plan: conversionData.planId || undefined
          });
          if (fpResult.ok) {
            console.log('[Whop Webhook] ✅ FirstPromoter track/sale sent:', fpResult.status, eventId);
            if (fpResult.status === 200) {
              await recordAffiliateAttributedConversion({
                dateString,
                conversionType,
                eventId,
                amount: amountNum,
                currency,
                userEmail: conversionData.userEmail,
                refId,
                promoCode,
                planId: conversionData.planId,
                eventType: type
              });
              console.log('[Whop Webhook] ✅ Affiliate-attributed conversion recorded:', {
                conversionType,
                dateString,
                eventId
              });
            } else if (fpResult.status === 204) {
              console.log('[Whop Webhook] ℹ️ FirstPromoter track/sale returned 204 (non-attributed sale):', eventId);
            }
            if (kv && fpDedupKeys.length > 0) {
              await Promise.all(fpDedupKeys.map((k) => kv.set(k, '1', { ex: 86400 * 7 }))).catch((e) => console.warn('[Whop Webhook] fp dedup kv set:', e?.message));
            }
          } else {
            console.warn('[Whop Webhook] FirstPromoter track/sale failed:', fpResult.error);
          }
        }
      } catch (fpErr) {
        console.warn('[Whop Webhook] FirstPromoter track/sale error:', fpErr?.message);
      }
    }
    
    // KVストレージに保存（コンバージョン追跡）
    if (kv) {
      try {
        // コンバージョンIDを生成
        const conversionId = `whop_conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const conversionKey = `whop:conversion:${conversionId}`;
        
        // コンバージョンデータを保存（30日間保持）
        await kv.set(conversionKey, conversionData, { ex: 86400 * 30 });
        
        // ユーザーID別のコンバージョン履歴を保存
        if (conversionData.userId) {
          const userConversionsKey = `whop:conversions:user:${conversionData.userId}`;
          const userConversions = (await kv.get(userConversionsKey)) || [];
          userConversions.push({
            conversionId,
            timestamp: conversionData.timestamp,
            amount: conversionData.amount,
            planId: conversionData.planId,
          });
          await kv.set(userConversionsKey, userConversions, { ex: 86400 * 90 }); // 90日間保持
        }
        
        // X投稿ID別のコンバージョン統計を更新
        if (xPostInfo?.tweetId) {
          const tweetConversionsKey = `x:conversions:tweet:${xPostInfo.tweetId}`;
          const tweetConversions = (await kv.get(tweetConversionsKey)) || {
            tweetId: xPostInfo.tweetId,
            count: 0,
            totalAmount: 0,
            conversions: [],
          };
          tweetConversions.count = (tweetConversions.count || 0) + 1;
          tweetConversions.totalAmount = (tweetConversions.totalAmount || 0) + (conversionData.amount || 0);
          tweetConversions.conversions.push({
            conversionId,
            timestamp: conversionData.timestamp,
            amount: conversionData.amount,
            userId: conversionData.userId,
          });
          await kv.set(tweetConversionsKey, tweetConversions, { ex: 86400 * 30 });
          
          console.log(`[Whop Webhook] ✅ Updated conversion stats for tweet ${xPostInfo.tweetId}:`, {
            count: tweetConversions.count,
            totalAmount: tweetConversions.totalAmount,
          });
        }
        
        // インフルエンサー別のコンバージョン統計を更新
        if (xPostInfo?.influencerUsername) {
          const influencerConversionsKey = `x:conversions:influencer:${xPostInfo.influencerUsername}`;
          const influencerConversions = (await kv.get(influencerConversionsKey)) || {
            influencerUsername: xPostInfo.influencerUsername,
            count: 0,
            totalAmount: 0,
            conversions: [],
          };
          influencerConversions.count = (influencerConversions.count || 0) + 1;
          influencerConversions.totalAmount = (influencerConversions.totalAmount || 0) + (conversionData.amount || 0);
          influencerConversions.conversions.push({
            conversionId,
            timestamp: conversionData.timestamp,
            amount: conversionData.amount,
            userId: conversionData.userId,
          });
          await kv.set(influencerConversionsKey, influencerConversions, { ex: 86400 * 30 });
          
          console.log(`[Whop Webhook] ✅ Updated conversion stats for influencer @${xPostInfo.influencerUsername}:`, {
            count: influencerConversions.count,
            totalAmount: influencerConversions.totalAmount,
          });
        }
        
        console.log(`[Whop Webhook] ✅ Conversion saved: ${conversionId}`);
      } catch (kvError) {
        console.error('[Whop Webhook] ❌ Failed to save conversion to KV:', kvError.message);
        // KV保存の失敗は致命的ではない（ログに記録済み）
      }
    } else {
      console.warn('[Whop Webhook] ⚠️ KV storage not available, conversion data not saved');
    }
    
    return conversionData;
  } catch (error) {
    console.error('[Whop Webhook] ❌ Error handling purchase event:', error.message);
    console.error('[Whop Webhook] Stack:', error.stack);
    throw error;
  }
}

/**
 * Whop Webhook Handler
 * POST /api/whop-webhook
 */
async function handler(req, res) {
  // POSTのみ許可
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Raw bodyを取得（署名検証用）
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

    // WarriorPlus IPN（form-urlencoded）を先に判定・処理
    const ct = safeLower(req.headers['content-type']);
    let parsedForm = null;
    // 1) まずは bodyParser が作ったオブジェクト（最も確実）
    if (!rawBodyWasFromStream && req.body && typeof req.body === 'object') {
      parsedForm = req.body;
    } else if (ct.includes('application/x-www-form-urlencoded')) {
      // 2) 生のフォーム本文
      try {
        parsedForm = querystring.parse(String(rawBody || ''));
      } catch (_) {
        parsedForm = null;
      }
      // 3) フォールバックで JSON 化されていた場合（{"WP_ACTION":"sale",...}）
      if ((!parsedForm || !parsedForm.WP_ACTION) && rawBody && String(rawBody).trim().startsWith('{')) {
        try {
          const j = JSON.parse(String(rawBody));
          if (j && typeof j === 'object') parsedForm = j;
        } catch (_) { /* ignore */ }
      }
    }

    if (isLikelyWarriorPlusRequest(req, parsedForm) && (parsedForm?.WP_ACTION || safeLower(req.headers['user-agent']).includes('warriorplus'))) {
      // handleWarriorPlusIPN は rawBody から parse するため、object の場合は再構築して渡す
      const bodyForWp = rawBodyWasFromStream
        ? rawBody
        : (ct.includes('application/x-www-form-urlencoded')
          ? (typeof rawBody === 'string' ? rawBody : '')
          : querystring.stringify(parsedForm || {}));
      return await handleWarriorPlusIPN({ req, res, rawBody: bodyForWp });
    }
    
    // 署名ヘッダーを取得（x-whop-* と Standard Webhooks の webhook-* 両対応）
    const signature = req.headers['x-whop-signature'] || req.headers['X-Whop-Signature']
      || req.headers['webhook-signature'];
    const timestamp = req.headers['x-whop-timestamp'] || req.headers['X-Whop-Timestamp']
      || req.headers['webhook-timestamp'] || String(Math.floor(Date.now() / 1000));
    const webhookId = req.headers['webhook-id'] || req.headers['Webhook-Id'];
    
    // 署名検証（WHOP_SKIP_SIGNATURE_FOR_TEST=1 時は署名なしを許可：Whop ダッシュボードの Test 用）
    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
    if (WHOP_SKIP_SIGNATURE_FOR_TEST && !signature) {
      console.log('[Whop Webhook] ℹ️ Signature verification skipped (WHOP_SKIP_SIGNATURE_FOR_TEST=1, test mode)');
    } else if (signature && WHOP_WEBHOOK_SECRET) {
      const isValid = verifyWhopWebhookSignature(signature, rawBody, timestamp, webhookId);
      
      console.log('[Whop Webhook] 🔐 Signature verification:', {
        hasSignature: !!signature,
        hasTimestamp: !!timestamp,
        isValid,
        isProduction,
        timestamp: new Date().toISOString(),
      });
      
      if (!isValid) {
        if (WHOP_SKIP_SIGNATURE_FOR_TEST) {
          console.log('[Whop Webhook] ℹ️ Invalid signature but allowed (WHOP_SKIP_SIGNATURE_FOR_TEST=1, e.g. Test webhook)');
        } else if (isProduction) {
          console.error('[Whop Webhook] ❌ CRITICAL: Invalid signature in production');
          return res.status(401).json({ error: 'Invalid signature' });
        } else {
          console.warn('[Whop Webhook] ⚠️ Invalid signature, but continuing (development mode)');
        }
      }
    } else if (isProduction && !signature && !WHOP_SKIP_SIGNATURE_FOR_TEST) {
      console.error('[Whop Webhook] ❌ CRITICAL: Missing signature header in production');
      return res.status(401).json({ error: 'Missing signature header' });
    }
    
    // イベントデータをパース（rawBody 優先: getRawBody 成功時は req.body が空になりうるため）
    let event;
    try {
      event = rawBody ? JSON.parse(rawBody) : (typeof req.body === 'string' ? JSON.parse(req.body) : req.body);
    } catch (parseErr) {
      console.warn('[Whop Webhook] Failed to parse event:', parseErr?.message);
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
    if (!event || typeof event !== 'object') {
      console.warn('[Whop Webhook] Empty or invalid event payload');
      return res.status(200).json({ received: false, error: 'Invalid payload' });
    }

    console.log('[Whop Webhook] 📨 Received webhook event:', {
      type: event.type,
      dataKeys: event.data ? Object.keys(event.data) : [],
      timestamp: new Date().toISOString(),
    });

    // WarriorPlus 連携: 決済者メールと Whop 入力メールの照合（未決済の不正アクセス防止）
    const wpPlanIds = getWarriorPlusPlanIds();
    const membershipEventTypes = ['membership.created', 'membership.activated', 'membership_activated'];
    if (wpPlanIds.size > 0 && kv && membershipEventTypes.includes(event.type)) {
      const data = event.data || {};
      const membership = data.membership || data.membership_data || data;
      const planId = membership?.plan_id || membership?.plan?.id || data?.plan_id;
      const user = data?.user || membership?.user;
      const userEmail = user?.email ? String(user.email).trim() : null;
      const membershipId = membership?.id || data?.membership_id;

      if (planId && wpPlanIds.has(planId) && membershipId) {
        const normEmail = userEmail ? safeLower(userEmail) : null;
        const validatedKey = `warriorplus:validated:${membershipId}`;
        const alreadyValidated = await kv.get(validatedKey);
        if (alreadyValidated) {
          // 同一 membership の別イベント（例: membership.activated）は通過
        } else {
          const allowedKey = normEmail ? `warriorplus:allowed:${planId}:${normEmail}` : null;
          const allowed = allowedKey ? await kv.get(allowedKey) : null;
          if (!allowed) {
            try {
              const { terminateMembership } = require('../services/whop/client');
              await terminateMembership(membershipId);
              console.warn('[Whop Webhook] ⚠️ WarriorPlus validation: email not in allowed list, membership terminated', {
                planId,
                userEmail: normEmail || '(none)',
                membershipId,
              });
            } catch (e) {
              console.error('[Whop Webhook] Failed to terminate unauthorized membership:', e?.message);
            }
            return res.status(200).json({ received: true, warriorplus_validation: 'rejected' });
          }
          await kv.del(allowedKey);
          await kv.set(validatedKey, '1', { ex: 120 });
          console.log('[Whop Webhook] ✅ WarriorPlus validation: email matched, allowed', { planId, email: normEmail });
        }
      }
    }
    
    // 購入イベントを処理（ドット形式とアンダースコア形式の両方に対応。Whop の仕様に応じて追加可能）
    const purchaseEventTypes = [
      'checkout.completed',
      'membership.created',
      'membership.renewed',
      'membership.activated',
      'membership_activated',
      'payment_succeeded',
      'payment.succeeded',
      'invoice_paid',
      'invoice.paid',
    ];
    
    if (purchaseEventTypes.includes(event.type)) {
      await handlePurchaseEvent(event);
    } else {
      console.log(`[Whop Webhook] ℹ️ Event type ${event.type} is not a purchase event, skipping`);
    }
    
    // Whopの要件: 200ステータスを返す
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('[Whop Webhook] ❌ Error processing webhook:', error.message);
    console.error('[Whop Webhook] Stack:', error.stack);
    
    // エラーでも200を返す（Whopの要件）
    return res.status(200).json({ received: false, error: error.message });
  }
}

module.exports = handler;
