# Trap Defence X Repost OS 設計書（Cursor実装用・確定版）

**目的**: Cursor実装のための簡潔で構造的な設計ドキュメント  
**制約**: 完全 stateless、KV 禁止、1日 400〜500 投稿、複数言語対応

---

## 1. ゴール

### やることはこれだけ

> X API 経由で「今いちばんバズってる、Trap Defence と相性のいい投稿」を探す  
> → それに対して「含み損でダッシュボード真っ赤の思考停止トレード依存症」に刺さる引用リポストを書く  
> → Vidalytics にトラフィックを流す  
> → これを 1日 400〜500 投稿ペースで、多言語で淡々と回す

### 前提条件

| 項目 | 方針 |
|------|------|
| 状態管理 | **一切しない（完全 stateless）** |
| KV / DB | **使用禁止** |
| インフルエンサー単位ストック | **完全廃止** |
| バズ投稿ストック | **廃止** → 毎回 Search API でその場で取得 |
| Grok プール | 使用可。ただし **KV キャッシュは禁止**。インライン/別関数どちらでも可。呼び出しは stateless に |
| 公式 X API | POST /2/tweets、Search の制約内で動作 |

---

## 2. 全体アーキテクチャ

```
Vercel Cron（言語別スケジュール）
         ↓
/api/x-quote-repost-[lang]
         ↓
X API Recent Search（直近バズ投稿を取得）
         ↓
スコアリング → 上位 3 件を選ぶ
         ↓
ペルソナ特化テンプレで引用リポスト本文生成
         ↓
POST /2/tweets（quote_tweet_id + text）
         ↓
終了（ログ以外の状態は持たない）
```

---

## 3. エンドポイント構成

### 3.1 言語別 Cron エンドポイント

| パス | 言語 | 役割 |
|------|------|------|
| `/api/x-quote-repost-en` | 英語 | 英語圏バズ投稿 → 3 件引用リポスト |
| `/api/x-quote-repost-es` | スペイン語 | 同上 |
| `/api/x-quote-repost-pt` | ポルトガル語 | 同上 |
| `/api/x-quote-repost-ja` | 日本語 | 同上 |
| `/api/x-quote-repost-ko` | 韓国語 | 同上 |
| `/api/x-quote-repost-ar` | アラビア語 | 同上 |

- **1 Cron 実行 = 最大 3 投稿**（上位 3 件）
- **Cron 設定**: 各言語 1 時間に 2〜4 回、合計 400〜500 投稿/日になるよう調整

### 3.2 パス命名ルール

- 既存の `pt-br` は `pt` に統一してよい（実装次第）
- 新規は `/api/x-quote-repost-[lang]` パターンで統一

---

## 4. フロー詳細（/api/x-quote-repost-[lang]）

### 4.1 Step 1: バズ投稿取得（Recent Search）

**エンドポイント**: `GET /2/tweets/search/recent`

**必須フィルタ**: `-is:retweet` を必ず含める。RT は public_metrics が薄く、バズの熱が弱く、引用リポストすると機械感が出るため。

**クエリ例（言語別）**:

| 言語 | query | 備考 |
|------|-------|------|
| JA | `lang:ja -is:reply -is:quote -is:retweet min_faves:50 min_retweets:10` | RT 除外必須 |
| EN | `lang:en -is:reply -is:quote -is:retweet min_faves:80 min_retweets:15` | RT 除外必須 |
| ES | `lang:es -is:reply -is:quote -is:retweet min_faves:40 min_retweets:8` | RT 除外必須 |
| PT | `lang:pt -is:reply -is:quote -is:retweet min_faves:40 min_retweets:8` | RT 除外必須 |
| KO | `lang:ko -is:reply -is:quote -is:retweet min_faves:50 min_retweets:10` | RT 除外必須 |
| AR | `lang:ar -is:reply -is:quote -is:retweet min_faves:30 min_retweets:5` | RT 除外必須 |

**リクエスト例**:

```
GET https://api.twitter.com/2/tweets/search/recent
  ?query=lang:ja -is:reply -is:quote -is:retweet min_faves:50 min_retweets:10
  &max_results=30
  &tweet.fields=public_metrics,created_at,author_id
```

**レスポンス**: `data` 配列にツイート一覧。各要素に `public_metrics`（like_count, retweet_count, reply_count）を含む。

**言語別 Search クエリ最適化（SEARCH_CONFIG）**:

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

### 4.2 Step 2: スコアリング & 上位 3 件選定（最適化版）

**スコア計算式**:

```
base = likes×1 + retweets×2 + replies×1.5 + quotes×1.2
score = base × freshness（新しさ補正）
```

**ポイント**: RT の重みを最大、「今の熱」を優先する新しさ補正、stateless で偏りが出にくい。

**擬似コード（最適化版）**:

```ts
export function scoreTweet(t: { public_metrics?: Record<string, number>; created_at?: string }): number {
  const m = t.public_metrics ?? {};
  const likes = m.like_count ?? 0;
  const rts = m.retweet_count ?? 0;
  const replies = m.reply_count ?? 0;
  const quotes = m.quote_count ?? 0;

  // 新しさ補正（古い投稿は少し減点）
  const ageMinutes = (Date.now() - new Date(t.created_at ?? 0).getTime()) / 60000;
  const freshness = 1 / (1 + ageMinutes / 60);

  return (
    likes * 1.0 +
    rts * 2.0 +
    replies * 1.5 +
    quotes * 1.2
  ) * freshness;
}

function pickTopN(tweets: Tweet[], n: number): Tweet[] {
  const sorted = [...tweets].sort((a, b) => scoreTweet(b) - scoreTweet(a));
  return sorted.slice(0, n);
}

const top3 = pickTopN(searchResult.data, 3);
```

---

### 4.3 Step 3: 引用リポスト本文生成

**ペルソナ**: 「含み損でダッシュボード真っ赤の思考停止トレード依存症」

**制約**:

- 40〜80 字程度
- 1 リンク（Vidalytics）
- テンプレはハードコードで可

**Vidalytics URL マッピング（Minimal / Regular × 6言語・stateless）**

```ts
// ========================================
// Trap Defence BTC — Vidalytics URL Map
// Minimal / Regular × 6 languages
// ========================================

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

// tier = regular | minimal | mixed（デフォルト mixed = 80% regular / 20% minimal）
export function pickVidalyticsLink(lang: string, tier: "regular" | "minimal" | "mixed" = "mixed"): string {
  if (tier === "regular") return VIDALYTICS_LINKS.regular[lang] ?? VIDALYTICS_LINKS.regular.en;
  if (tier === "minimal") return VIDALYTICS_LINKS.minimal[lang] ?? VIDALYTICS_LINKS.minimal.en;

  const roll = Math.random();
  if (roll < 0.8) {
    return VIDALYTICS_LINKS.regular[lang] ?? VIDALYTICS_LINKS.regular.en;
  } else {
    return VIDALYTICS_LINKS.minimal[lang] ?? VIDALYTICS_LINKS.minimal.en;
  }
}
```

**6言語テンプレ定義（Composer にそのまま貼れる形）**

```ts
// =======================
// JA（日本語）
// =======================
export const TEMPLATES_JA = [
  "この動きでダッシュボード真っ赤になってる人、多い。数字で見ると状況が掴める。→ {link}",
  "この反応、気づかないと後で後悔するやつ。必要な数字だけまとめた。→ {link}",
  "この変化、今のうちに位置だけ確認しとくと安心。短く整理した。→ {link}",
  "この動き、まだ巻き返し効く。数字で見るとわかる。→ {link}",
];

// =======================
// EN（英語）
// =======================
export const TEMPLATES_EN = [
  "If your dashboard's all red from this move, see the numbers. → {link}",
  "This reaction—easy to miss, hard to regret later. Numbers inside. → {link}",
  "This change—check your position now. Quick summary. → {link}",
  "Still time to recover. Numbers tell the story. → {link}",
];

// =======================
// ES（スペイン語）
// =======================
export const TEMPLATES_ES = [
  "Este movimiento dejó muchos paneles en rojo. Ver los números ayuda a aclarar. → {link}",
  "Esta reacción es fácil de pasar por alto. Resumen rápido con datos. → {link}",
  "Este cambio merece revisar tu posición ahora. Datos esenciales aquí. → {link}",
  "Aún hay margen para recuperarse. Los números lo muestran. → {link}",
];

// =======================
// PT（ポルトガル語）
// =======================
export const TEMPLATES_PT = [
  "Esse movimento deixou muitos painéis vermelhos. Ver os números acalma. → {link}",
  "Essa reação passa fácil despercebida. Resumo curto com dados. → {link}",
  "Essa mudança pede uma checagem rápida da sua posição. → {link}",
  "Ainda dá para recuperar. Os números mostram isso. → {link}",
];

// =======================
// KO（韓国語）
// =======================
export const TEMPLATES_KO = [
  "이 움직임에 계좌가 새빨개진 사람 많아요. 숫자로 보면 정리가 됩니다. → {link}",
  "이 반응은 놓치기 쉽지만 나중에 아쉬울 수 있어요. 핵심만 정리했습니다. → {link}",
  "지금 위치만 확인해도 마음이 한결 편해집니다. → {link}",
  "아직 회복 여지는 있습니다. 숫자가 말해줍니다. → {link}",
];

// =======================
// AR（アラビア語）
// =======================
export const TEMPLATES_AR = [
  "هذا التحرك جعل شاشات كثيرين حمراء. رؤية الأرقام توضح الصورة. → {link}",
  "هذا التفاعل سهل أن يفوتك، لكن الأرقام تلخصه بسرعة. → {link}",
  "هذا التغير يستحق أن تراجع موقعك الآن. ملخص مختصر هنا. → {link}",
  "ما زال هناك مجال للتعافي. الأرقام توضح ذلك. → {link}",
];

// =======================
// 共通：テンプレ取得ヘルパー
// =======================
export function getTemplatesForLang(lang: string): string[] {
  switch (lang) {
    case "ja":
      return TEMPLATES_JA;
    case "en":
      return TEMPLATES_EN;
    case "es":
      return TEMPLATES_ES;
    case "pt":
      return TEMPLATES_PT;
    case "ko":
      return TEMPLATES_KO;
    case "ar":
      return TEMPLATES_AR;
    default:
      return TEMPLATES_EN;
  }
}

// =======================
// 本文生成ヘルパー
// =======================
// tier: "regular" | "minimal" | "mixed"（デフォルト mixed）
export function buildBody(lang: string, index: number, tier: "regular" | "minimal" | "mixed" = "mixed"): string {
  const templates = getTemplatesForLang(lang);
  const tpl = templates[index % templates.length];
  const link = pickVidalyticsLink(lang, tier);
  return tpl.replace("{link}", link);
}
```

**buildBody 使用例（Composer が理解しやすい形）**:

```ts
const top3 = pickTopN(searchRes.data, 3);
const tier = "mixed"; // "regular" | "minimal" | "mixed"

for (let i = 0; i < top3.length; i++) {
  const text = buildBody(lang, i, tier);
  await postQuoteTweet(top3[i].id, text);
}
```

---

### 4.4 Step 4: 引用リポスト送信

**エンドポイント**: `POST /2/tweets`

**ボディ例**:

```json
{
  "text": "この動きでダッシュボード真っ赤になってる人、多い。数字で見ると状況が掴める。→ https://vidalytics.link/xxx",
  "quote_tweet_id": "1234567890123456789"
}
```

**認証**: User Context（OAuth 1.0a または OAuth 2.0 User Context）

**擬似コード**:

```ts
async function postQuoteTweet(tweetId: string, text: string): Promise<void> {
  const res = await fetch("https://api.twitter.com/2/tweets", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`,
      // + OAuth 1.0a 署名が必要な場合は適宜
    },
    body: JSON.stringify({
      text,
      quote_tweet_id: tweetId,
    }),
  });

  if (res.status === 429) {
    // レート制限 → 即終了（次の Cron に任せる）
    throw new RateLimitError(res.headers.get("x-rate-limit-reset"));
  }
  if (res.status === 400 || res.status === 403 || res.status === 404) {
    // その tweetId はスキップ
    return;
  }
  if (res.status === 503) {
    // 1 回 retry → ダメなら次へ
  }
}
```

---

### 4.5 Step 5: エラー処理

| HTTP | 対応 |
|------|------|
| 429 | 即 run 終了。`x-rate-limit-reset` まで待つのは次の Cron に任せる |
| 400 / 403 / 404 | その tweetId をスキップして次の候補へ。記録なし |
| 503 | 1 回だけ retry → ダメなら次へ |

**状態は一切保存しない。ログは Vercel / console.log で十分。**

---

## 5. レートと投稿数の考え方

- X API: `POST /2/tweets` = 約 100 req / 15 min / user
- 400〜500 投稿/日 は余裕の範囲
- 計算例:
  - 6 言語 × 3 投稿/run × 約 28 run/日 ≈ 504 投稿/日
  - 1 時間あたり 2 run × 6 言語 × 24 時間 = 288 run → 864 投稿（上限に余裕があるため、Cron 間隔で 400〜500 に抑える）

---

## 6. 擬似コード：ハンドラー全体

```ts
// /api/x-quote-repost-[lang].ts のハンドラー

export default async function handler(req: Request) {
  const lang = req.url.match(/x-quote-repost-(\w+)/)?.[1] ?? "en";

  // 1. Search
  const query = buildSearchQuery(lang);
  const searchRes = await xApiSearchRecent(query, 30);

  if (!searchRes?.data?.length) {
    return { ok: true, posted: 0 };
  }

  // 2. Pick
  const top3 = pickTopN(searchRes.data, 3);

  // 3. Shoot
  let posted = 0;
  const tier = "mixed";
  for (let i = 0; i < top3.length; i++) {
    try {
      const text = buildBody(lang, i, tier);
      await postQuoteTweet(top3[i].id, text);
      posted++;
    } catch (e) {
      if (e instanceof RateLimitError) throw e;
      // スキップして次へ
    }
  }

  return { ok: true, posted };
}

// buildSearchQuery(lang) は 4.1 節の SEARCH_CONFIG を使用
```

---

## 7. 実装タスク一覧（Cursor 向け）

| # | タスク | 詳細 |
|---|--------|------|
| 1 | X API クライアント | Recent Search (GET)、POST /2/tweets、User Context 認証 |
| 2 | 言語別エンドポイント | `/api/x-quote-repost-[lang]` を作成。Search クエリは `lang`、`min_faves`、`min_retweets` を言語別に |
| 3 | スコアリング関数 | `scoreTweet(public_metrics): number`、ソートして上位 3 件返す |
| 4 | テンプレ管理 | 言語別テンプレ配列、`{link}` を Vidalytics URL に差し替え、40〜80 字 |
| 5 | 引用リポスト送信 | 上位 3 件に対して順次 POST /2/tweets、エラー時スキップ |
| 6 | Cron 設定 | `vercel.json` または Vercel Dashboard で各言語エンドポイントをスケジュール、合計 400〜500/日 |

---

## 8. Grok プロンプト（Run 内 1 回生成・オプション）

Grok を使う場合でも **KV は禁止**。完全 stateless。失敗時はテンプレ fallback。

- **インライン**: 本文生成時に Grok を呼ぶ → レスポンスをその場で使う（保存なし）
- **別関数**: `generateQuoteBodyWithGrok(tweet, lang)` のような純関数で呼び出す
- **キャッシュ**: しない。毎回 API 呼び出しで stateless を維持

**buildGrokPrompt（Run 内 1 回・3文を一括生成・最終版）**:

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

**Trap Defence の思想に完全一致**: 刺激ではなく「落ち着かせる」、数字を見る誘導、多言語、stateless、Run 内 1 回だけ生成。

Grok 失敗時は `buildBody(lang, index, tier)` テンプレで fallback。

---

## 9. vercel.json Cron 設計

**1日 400〜500 投稿** を達成するための推奨 Cron。

- 1Run = 3 投稿
- 450 投稿/日 → 150 Run/日
- 6 言語 → 25 Run/言語/日
- 1 時間あたり ≒ 1 Run/言語
- 5 分ずらしで衝突回避

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

**計算**: 6 言語 × 1 時間に 1 回 × 24 時間 = 144 Run/日、1Run = 3 投稿 → **432 投稿/日** → 400〜500 投稿/日を安定達成。

※ 投稿数が多すぎる場合は 2 時間に 1 回へ調整（`0 */2 * * *` 等）。

---

## 10. 統合チェックリスト（Composer 1.5 実装用）

以下は **実装済み or 反映済み** の項目。

| 項目 | 状態 |
|------|------|
| 6 言語テンプレ（JA/EN/ES/PT/KO/AR） | ✔ 40〜80 字、落ち着いた誘導文、`{link}` 差し替え対応 |
| VIDALYTICS_LINKS（Minimal / Regular × 6 言語） | ✔ 定数化済み |
| pickVidalyticsLink(lang, tier) | ✔ mixed=80/20、EN fallback、完全 stateless |
| buildBody(lang, index, tier) | ✔ tier-aware、Shoot フローに統合可能 |
| SEARCH_CONFIG + buildSearchQuery | ✔ RT 除外必須、言語別閾値最適化 |
| scoreTweet（最適化版） | ✔ 新しさ補正、quote_count 追加 |
| buildGrokPrompt（最終版） | ✔ pickVidalyticsLink 連携、テンプレ fallback |
| vercel.json Cron | ✔ 5 分ずらし、432 投稿/日達成 |

---

## 11. Cursor への渡し方

この設計書をそのまま Cursor に渡して、次のように指示する:

> **「この仕様どおりに /api/x-quote-repost-[lang] 群を実装してくれ」**

実装時は既存の `api/x-quote-repost-*.js` との棲み分け（新規エンドポイントを追加するか、既存を置き換えるか）を開発者に任せる。

---

## 12. OS 全体の統合パッケージ（最終版）

Composer 1.5 に渡せば **OS が完成する状態**。部品一覧：

| 部品 | セクション | 用途 |
|------|-----------|------|
| VIDALYTICS_LINKS + pickVidalyticsLink(lang, tier) | 4.3 | Minimal/Regular × 6言語、stateless リンク供給 |
| 6 言語テンプレ（JA/EN/ES/PT/KO/AR） | 4.3 | 本文生成 |
| getTemplatesForLang(lang) | 4.3 | 言語別テンプレ取得 |
| buildBody(lang, index, tier?) | 4.3 | 本文生成ヘルパー（tier で Minimal/Regular/mixed 切替） |
| SEARCH_CONFIG + buildSearchQuery | 4.1 | 言語別 Search クエリ |
| scoreTweet（最適化版）+ pickTopN | 4.2 | スコアリング（新しさ補正・quote_count） |
| buildGrokPrompt（最終版） | 8 | Grok 1 回/Run、pickVidalyticsLink 連携 |
| vercel.json Cron | 9 | 432 投稿/日 → 400〜500 達成 |

**Cursor への渡し方**: 「docs/TRAP_DEFENCE_X_REPOST_OS_DESIGN.md の仕様どおりに /api/x-quote-repost-[lang] 群を実装してくれ」

**統合パッケージ（1 ファイルまとめ）**: `docs/TRAP_DEFENCE_OS_UNIFIED_PACKAGE.md` に全コードブロックを集約。Composer が一括参照可能。
