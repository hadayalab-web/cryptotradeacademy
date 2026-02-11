# Trap Defence X Repost OS — 統合パッケージ（最終版）

**Composer 1.5 にそのまま渡せる形。**  
設計書 `TRAP_DEFENCE_X_REPOST_OS_DESIGN.md` の全部品を一括参照。

---

## 1. VIDALYTICS_LINKS + pickVidalyticsLink

```ts
export const VIDALYTICS_LINKS = {
  minimal: {
    en: "https://preview.vidalytics.com/vid/r7EVEIvFx66Nj3dp",
    es: "https://preview.vidalytics.com/vid/C7qhJZh6N8reco2h",
    pt: "https://preview.vidalytics.com/vid/0uqYb_5TWoSfBl6Y",
    ar: "https://preview.vidalytics.com/vid/rBzQDrGv2xSyZKtK",
    ko: "https://preview.vidalytics.com/vid/OQNbnGJNtF6_W5zC",
    ja: "https://preview.vidalytics.com/vid/iQUVsxj5j522r_sf",
  },
  regular: {
    en: "https://preview.vidalytics.com/vid/r7EVEIvFx66Nj3dp",
    es: "https://preview.vidalytics.com/vid/Sn0Ksfoqayhn19Hu",
    pt: "https://preview.vidalytics.com/vid/4nFpiTEQLXbOruxk",
    ar: "https://preview.vidalytics.com/vid/E3_5s_i7QfqcZnkm",
    ko: "https://preview.vidalytics.com/vid/7SP9FG5F9ox6PNYS",
    ja: "https://preview.vidalytics.com/vid/ksCwzN2p2nOGUSso",
  },
};

export function pickVidalyticsLink(lang: string, tier: "regular" | "minimal" | "mixed" = "mixed"): string {
  if (tier === "regular") return VIDALYTICS_LINKS.regular[lang] ?? VIDALYTICS_LINKS.regular.en;
  if (tier === "minimal") return VIDALYTICS_LINKS.minimal[lang] ?? VIDALYTICS_LINKS.minimal.en;
  const roll = Math.random();
  return roll < 0.8
    ? (VIDALYTICS_LINKS.regular[lang] ?? VIDALYTICS_LINKS.regular.en)
    : (VIDALYTICS_LINKS.minimal[lang] ?? VIDALYTICS_LINKS.minimal.en);
}
```

---

## 2. SEARCH_CONFIG + buildSearchQuery

```ts
export const SEARCH_CONFIG = {
  en: { minFaves: 80, minRt: 15 },
  ja: { minFaves: 50, minRt: 10 },
  es: { minFaves: 40, minRt: 8 },
  pt: { minFaves: 40, minRt: 8 },
  ko: { minFaves: 50, minRt: 10 },
  ar: { minFaves: 30, minRt: 5 },
};

export function buildSearchQuery(lang: string): string {
  const { minFaves, minRt } = SEARCH_CONFIG[lang] ?? SEARCH_CONFIG.en;
  return `lang:${lang} -is:reply -is:quote -is:retweet min_faves:${minFaves} min_retweets:${minRt}`;
}
```

---

## 3. scoreTweet（最適化版）+ pickTopN

```ts
export function scoreTweet(t: { public_metrics?: Record<string, number>; created_at?: string }): number {
  const m = t.public_metrics ?? {};
  const likes = m.like_count ?? 0;
  const rts = m.retweet_count ?? 0;
  const replies = m.reply_count ?? 0;
  const quotes = m.quote_count ?? 0;
  const ageMinutes = (Date.now() - new Date(t.created_at ?? 0).getTime()) / 60000;
  const freshness = 1 / (1 + ageMinutes / 60);
  return (likes * 1.0 + rts * 2.0 + replies * 1.5 + quotes * 1.2) * freshness;
}

export function pickTopN<T extends { public_metrics?: Record<string, number>; created_at?: string }>(tweets: T[], n: number): T[] {
  return [...tweets].sort((a, b) => scoreTweet(b) - scoreTweet(a)).slice(0, n);
}
```

---

## 4. 6言語テンプレ + getTemplatesForLang + buildBody

```ts
export const TEMPLATES_JA = [
  "この動きでダッシュボード真っ赤になってる人、多い。数字で見ると状況が掴める。→ {link}",
  "この反応、気づかないと後で後悔するやつ。必要な数字だけまとめた。→ {link}",
  "この変化、今のうちに位置だけ確認しとくと安心。短く整理した。→ {link}",
  "この動き、まだ巻き返し効く。数字で見るとわかる。→ {link}",
];
export const TEMPLATES_EN = [
  "If your dashboard's all red from this move, see the numbers. → {link}",
  "This reaction—easy to miss, hard to regret later. Numbers inside. → {link}",
  "This change—check your position now. Quick summary. → {link}",
  "Still time to recover. Numbers tell the story. → {link}",
];
export const TEMPLATES_ES = [
  "Este movimiento dejó muchos paneles en rojo. Ver los números ayuda a aclarar. → {link}",
  "Esta reacción es fácil de pasar por alto. Resumen rápido con datos. → {link}",
  "Este cambio merece revisar tu posición ahora. Datos esenciales aquí. → {link}",
  "Aún hay margen para recuperarse. Los números lo muestran. → {link}",
];
export const TEMPLATES_PT = [
  "Esse movimento deixou muitos painéis vermelhos. Ver os números acalma. → {link}",
  "Essa reação passa fácil despercebida. Resumo curto com dados. → {link}",
  "Essa mudança pede uma checagem rápida da sua posição. → {link}",
  "Ainda dá para recuperar. Os números mostram isso. → {link}",
];
export const TEMPLATES_KO = [
  "이 움직임에 계좌가 새빨개진 사람 많아요. 숫자로 보면 정리가 됩니다. → {link}",
  "이 반응은 놓치기 쉽지만 나중에 아쉬울 수 있어요. 핵심만 정리했습니다. → {link}",
  "지금 위치만 확인해도 마음이 한결 편해집니다. → {link}",
  "아직 회복 여지는 있습니다. 숫자가 말해줍니다. → {link}",
];
export const TEMPLATES_AR = [
  "هذا التحرك جعل شاشات كثيرين حمراء. رؤية الأرقام توضح الصورة. → {link}",
  "هذا التفاعل سهل أن يفوتك، لكن الأرقام تلخصه بسرعة. → {link}",
  "هذا التغير يستحق أن تراجع موقعك الآن. ملخص مختصر هنا. → {link}",
  "ما زال هناك مجال للتعافي. الأرقام توضح ذلك. → {link}",
];

export function getTemplatesForLang(lang: string): string[] {
  switch (lang) {
    case "ja": return TEMPLATES_JA;
    case "en": return TEMPLATES_EN;
    case "es": return TEMPLATES_ES;
    case "pt": return TEMPLATES_PT;
    case "ko": return TEMPLATES_KO;
    case "ar": return TEMPLATES_AR;
    default: return TEMPLATES_EN;
  }
}

export function buildBody(lang: string, index: number, tier: "regular" | "minimal" | "mixed" = "mixed"): string {
  const templates = getTemplatesForLang(lang);
  const tpl = templates[index % templates.length];
  return tpl.replace("{link}", pickVidalyticsLink(lang, tier));
}
```

---

## 5. buildGrokPrompt（最終版）

```ts
export function buildGrokPrompt(lang: string, tier: "regular" | "minimal" | "mixed" = "mixed"): string {
  const link = pickVidalyticsLink(lang, tier);
  return `
You are a short-form copy generator.

Persona:
A trader overwhelmed by losses, dashboard full of red, mentally overloaded.

Requirements:
- Write in ${lang}
- 40–80 characters
- Include exactly one link: ${link}
- Calm, concise, data-oriented tone
- No emotional pressure
- No fear-based language
- No more than 1 hashtag

Output format (JSON array):
[
  "text1",
  "text2",
  "text3"
]
`;
}
```

---

## 6. ハンドラー全体（Search → Pick → Shoot）

```ts
export default async function handler(req: Request) {
  const lang = req.url.match(/x-quote-repost-(\w+)/)?.[1] ?? "en";
  const tier = "mixed";

  const query = buildSearchQuery(lang);
  const searchRes = await xApiSearchRecent(query, 30);
  if (!searchRes?.data?.length) return { ok: true, posted: 0 };

  const top3 = pickTopN(searchRes.data, 3);
  let posted = 0;
  for (let i = 0; i < top3.length; i++) {
    try {
      const text = buildBody(lang, i, tier);
      await postQuoteTweet(top3[i].id, text);
      posted++;
    } catch (e) {
      if (e instanceof RateLimitError) throw e;
    }
  }
  return { ok: true, posted };
}
```

---

## 7. vercel.json Cron

```json
{
  "crons": [
    { "path": "/api/x-quote-repost-en", "schedule": "0 * * * *" },
    { "path": "/api/x-quote-repost-es", "schedule": "5 * * * *" },
    { "path": "/api/x-quote-repost-pt", "schedule": "10 * * * *" },
    { "path": "/api/x-quote-repost-ja", "schedule": "15 * * * *" },
    { "path": "/api/x-quote-repost-ko", "schedule": "20 * * * *" },
    { "path": "/api/x-quote-repost-ar", "schedule": "25 * * * *" }
  ]
}
```

---

**Cursor への指示**: 「docs/TRAP_DEFENCE_OS_UNIFIED_PACKAGE.md と TRAP_DEFENCE_X_REPOST_OS_DESIGN.md の仕様どおりに /api/x-quote-repost-[lang] 群を実装してくれ」
