/**
 * Telegram「管理者一本釣り」スカウト用テンプレート（5言語）
 * 一通目でメリット＋証拠を叩きつけ、OK が出たら「1分で完了」キットを渡す。
 * プレースホルダー: {handle}, {Channel_Name}, {inviteUrl}
 */

const SCOUT_FIRST_MESSAGE = {
  en: `**Partner Offer: $1.4M Paid Out / 50% Recurring**
Hi @{handle}, I've been following your analysis in {Channel_Name}.
I'm looking for a few lead partners for **Trap Defence BTC** (AI-SaaS).
We've already paid out **$1,400,000+** to affiliates (see attached proof).
• **Your Cut:** 50% Lifetime Recurring
• **6 Languages:** EN/ES/PT/AR/KO/JA (ready to promote)
• **Platform:** FirstPromoter (transparent tracking)

Would you be interested in an exclusive link for your channel?
{inviteUrl}`,

  es: `**Propuesta de Socio: 50% Comisiones Recurrentes ($1.4M Pagados)**
Hola @{handle}, me gusta mucho la calidad de tus señales en {Channel_Name}.
Buscamos socios para **Trap Defence BTC**. Hemos pagado más de **$1.4M** a nuestros afiliados.
Ofrecemos **50% de comisión recurrente de por vida**.
Ya tenemos todo listo en español. ¿Te interesa probar con un enlace exclusivo?
{inviteUrl}`,

  pt: `**Proposta de Parceiro: 50% Comissão Recorrente (US$ 1,4 mi já pagos)**
Olá @{handle}, acompanho a qualidade dos seus sinais em {Channel_Name}.
Procuramos parceiros para **Trap Defence BTC**. Já pagamos mais de **US$ 1,4 mi** em comissões.
Oferecemos **50% de comissão recorrente vitalícia**.
Tudo pronto em português. Quer um link exclusivo para o seu canal?
{inviteUrl}`,

  ko: `**파트너 제안: $1.4M 지급 실적 / 50% 리커링**
안녕하세요 @{handle}님, {Channel_Name}에서 분석 콘텐츠를 보고 연락드립니다.
**Trap Defence BTC** 리드 파트너를 소수 모시고 있습니다. 이미 **$1,400,000+** 아필리에이트에 지급했습니다(첨부 증빙).
• **귀하 몫:** 50% 평생 리커링
• **6개 언어:** EN/ES/PT/AR/KO/JA 준비 완료
• **플랫폼:** FirstPromoter(투명 추적)

채널용 전용 링크에 관심 있으시면 알려주세요.
{inviteUrl}`,

  ar: `**عرض شريك: 50% عمولة متكررة (تم دفع أكثر من 1.4M$)**
مرحباً @{handle}، أعجبني محتوى الإشارات في {Channel_Name}.
نبحث عن شركاء لـ **Trap Defence BTC**. دفعنا أكثر من **1.4 مليون دولار** لأفلييتنا.
نقدم **50% عمولة متكررة مدى الحياة**.
كل شيء جاهز بالعربية. هل تريد رابطاً حصرياً لقناتك؟
{inviteUrl}`
};

/** OK と言われたあと渡す「1分で完了」キット（実績画像は別添・各言語の紹介文＋CTA） */
const SCOUT_KIT_AFTER_OK = {
  en: `**1-min setup**
1. Attached: proof (Total paid $1.4M+).
2. Sign up here and get your link: {inviteUrl}
3. Post the short intro below to your channel (or we send you ready-made posts).

**Short intro (copy-paste):**
Trap Defence BTC — 50% recurring commission, $1.4M+ already paid to affiliates. FirstPromoter tracking. Link in my bio / DM me for the link.

**Early-bird (optional):** First week only — 10% off for your subscribers. Ask me to enable it.`,

  es: `**Configuración en 1 minuto**
1. Adjunto: comprobante (más de $1.4M pagados).
2. Regístrate y obtén tu enlace: {inviteUrl}
3. Publica el texto corto de abajo en tu canal (o te enviamos posts listos).

**Texto corto (copiar/pegar):**
Trap Defence BTC — 50% comisión recurrente, más de $1.4M pagados a afiliados. Seguimiento FirstPromoter. Enlace en mi bio / escríbeme al DM por el enlace.

**Ventaja adelantada (opcional):** Solo la primera semana — 10% de descuento para tus suscriptores. Dime si lo activo.`,

  pt: `**Configuração em 1 minuto**
1. Anexo: comprovante (mais de US$ 1,4 mi pagos).
2. Cadastre-se e pegue seu link: {inviteUrl}
3. Publique o texto curto abaixo no seu canal (ou enviamos posts prontos).

**Texto curto (copiar/colar):**
Trap Defence BTC — 50% de comissão recorrente, mais de US$ 1,4 mi pagos a afiliados. Rastreio FirstPromoter. Link na bio / me chame no DM pelo link.

**Vantagem antecipada (opcional):** Só na primeira semana — 10% de desconto para seus inscritos. Peça para eu ativar.`,

  ko: `**1분 셋업**
1. 첨부: 실적 증빙 ($1.4M+ 지급).
2. 여기서 가입 후 링크 발급: {inviteUrl}
3. 아래 짧은 소개문을 채널에 올리시거나, 완성된 게시문을 보내드립니다.

**짧은 소개 (복붙):**
Trap Defence BTC — 50% 리커링, 이미 $1.4M+ 아필리에이트 지급. FirstPromoter 추적. 링크는 프로필/DM으로 요청.

**얼리버드 (선택):** 첫 주만 — 구독자 10% 할인. 활성화 요청하시면 됩니다.`,

  ar: `**إعداد بدقيقة واحدة**
1. المرفق: إثبات الدفع (أكثر من 1.4M$).
2. سجّل هنا واحصل على رابطك: {inviteUrl}
3. انشر النص القصير أدناه في قناتك (أو نرسل لك منشورات جاهزة).

**نص قصير (نسخ/لصق):**
Trap Defence BTC — 50% عمولة متكررة، تم دفع أكثر من 1.4M$ للأفلييت. تتبع FirstPromoter. الرابط في البايو / راسلني على DM للرابط.

**ميزة مبكرة (اختياري):** أسبوع واحد فقط — خصم 10% لمتابعيك. اطلب مني تفعيله.`
};

/** 検索キーワード（Telegram検索バー用・言語別） */
const TELEGRAM_SEARCH_KEYWORDS = {
  en: ["BTC signals", "Crypto analysis", "Whop trading"],
  es: ["Señales Cripto", "Bitcoin España", "Trading Latino"],
  pt: ["Sinais Cripto", "Cripto Brasil"],
  ko: ["비트코인 정보", "코인 시그널"],
  ar: ["تداول عملات"]
};

/** ターゲット規模の目安（5,000〜30,000が即効性あり） */
const TARGET_CHANNEL_SIZE = { min: 5000, max: 30000 };

/** 一通目のバリエーション（スパムフィルター回避・メッセージランダム化用）。各言語2〜3パターン。 */
const SCOUT_FIRST_MESSAGE_VARIATIONS = {
  en: [
    null,
    `Hi @{handle}, I came across {Channel_Name} and your crypto coverage.
We're onboarding a few lead partners for **Trap Defence BTC** — we've paid **$1.4M+** to affiliates (proof attached).
• 50% lifetime recurring • 6 langs ready • FirstPromoter
Interested in an exclusive link for your channel? {inviteUrl}`,
    `@{handle} — quick note from Trap Defence BTC.
We've paid out **$1,400,000+** to affiliates (see proof). 50% recurring, 6 languages, FirstPromoter tracking.
Looking for a few channel partners. Want your link? {inviteUrl}`
  ],
  es: [
    null,
    `Hola @{handle}, vi {Channel_Name} y la calidad de tu contenido.
Trap Defence BTC ya pagó **+$1.4M** a afiliados. 50% comisión recurrente de por vida, todo en español.
¿Quieres un enlace exclusivo? {inviteUrl}`,
    `@{handle} — Trap Defence BTC busca socios. Más de **$1.4M** pagados (adjunto prueba). 50% recurrente.
¿Te interesa link para tu canal? {inviteUrl}`
  ],
  pt: [
    null,
    `Olá @{handle}, acompanho {Channel_Name}. Trap Defence BTC já pagou **US$ 1,4 mi+** em comissões.
50% recorrente vitalícia, tudo em PT. Quer link exclusivo? {inviteUrl}`,
    `@{handle} — Trap Defence BTC: **1,4 mi US$** pagos a afiliados. 50% recorrente.
Link exclusivo para seu canal? {inviteUrl}`
  ],
  ko: [
    null,
    `@{handle}님, {Channel_Name} 콘텐츠 보고 연락드립니다. Trap Defence BTC가 이미 **$1.4M+** 지급했습니다.
50% 리커링, 6개국어. 채널용 링크 필요하시면요. {inviteUrl}`,
    `Trap Defence BTC 파트너 제안 — **$1.4M+** 실적. 50% 평생 리커링. @{handle}님 채널용 링크: {inviteUrl}`
  ],
  ar: [
    null,
    `@{handle} — Trap Defence BTC دفعنا **1.4M$+** لأفلييتنا. 50% عمولة متكررة، جاهز بالعربية.
رابط حصري لقناتك؟ {inviteUrl}`,
    `مرحباً @{handle}، محتوى {Channel_Name} أعجبني. نبحث شركاء. أكثر من **1.4M$** مدفوعة. 50% مدى الحياة.
الرابط: {inviteUrl}`
  ]
};

/** AI Lead Scoring 用：プロフィール・バイオに含まれると「優先ターゲット」とするキーワード（言語別） */
const LEAD_SCORING_KEYWORDS = {
  en: ["KOL", "Influencer", "Admin", "Channel owner", "Crypto signals", "Trader", "Affiliate"],
  es: ["influencer", "admin", "dueño del canal", "señales", "afiliado", "trader"],
  pt: ["influencer", "admin", "dono do canal", "sinais", "afiliado", "trader"],
  ko: ["인플루언서", "관리자", "채널 운영", "시그널", "제휴", "트레이더"],
  ar: ["إنفلونسر", "مدير", "مالك القناة", "إشارات", "أفلييت", "تداول"]
};

function fillScoutFirstMessage(lang, options = {}, variation = 0) {
  const { handle = "", Channel_Name = "", inviteUrl = "" } = options;
  const variations = SCOUT_FIRST_MESSAGE_VARIATIONS[lang] || SCOUT_FIRST_MESSAGE_VARIATIONS.en;
  const idx = variation === "random" ? Math.floor(Math.random() * (variations.length + 1)) : (variation || 0);
  const tpl = idx === 0 || !variations[idx] ? (SCOUT_FIRST_MESSAGE[lang] || SCOUT_FIRST_MESSAGE.en) : variations[idx];
  return tpl
    .replace(/\{handle\}/g, handle)
    .replace(/\{Channel_Name\}/g, Channel_Name)
    .replace(/\{inviteUrl\}/g, inviteUrl);
}

function fillScoutKit(lang, options = {}) {
  const { inviteUrl = "" } = options;
  const tpl = SCOUT_KIT_AFTER_OK[lang] || SCOUT_KIT_AFTER_OK.en;
  return tpl.replace(/\{inviteUrl\}/g, inviteUrl);
}

function getSearchKeywords(lang) {
  return TELEGRAM_SEARCH_KEYWORDS[lang] || TELEGRAM_SEARCH_KEYWORDS.en;
}

module.exports = {
  SCOUT_FIRST_MESSAGE,
  SCOUT_FIRST_MESSAGE_VARIATIONS,
  SCOUT_KIT_AFTER_OK,
  TELEGRAM_SEARCH_KEYWORDS,
  TARGET_CHANNEL_SIZE,
  LEAD_SCORING_KEYWORDS,
  fillScoutFirstMessage,
  fillScoutKit,
  getSearchKeywords
};
