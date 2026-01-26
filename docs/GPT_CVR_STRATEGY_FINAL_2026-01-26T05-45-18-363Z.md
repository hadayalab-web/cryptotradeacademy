# GPT提案: 最終CVR戦略実装仕様（追加確認事項回答後）

**作成日時**: 2026-01-26T05:45:18.365Z
**モデル**: gpt-5.2-2025-12-11

## 📋 追加確認事項への回答

### 1. X引用RPのリンク
- ✅ YES - Telegram直リンク（中間LPなし）
- UTMパラメータは付与されているが、Telegramの制約で機能していない可能性

### 2. startパラメータのログ保存
- ⚠️ 部分的に可能 - 改善の余地あり
- 現在はsourceフィールドのみ保存（x_quote, x_directなど）
- startパラメータ全体、テンプレート識別子、インフルエンサー情報は保存されていない

### 3. Whop Webhook
- ❌ 現在は実装されていない
- Whop APIクライアントは存在するが、Webhook受信実装はなし
- 代替案: ポーリング方式で実装可能

---

以下は、あなたの現状コード（`api/x-quote-repost.js` / `services/telegram/bot-commands.js` / `services/free-users/manager.js` / `services/whop/*`）を前提に、「今すぐ実装でき、後方互換も保ち、PDCAまで回る」最終仕様です。  
（前提：Cloudflare Workers + KV想定で書きます。Nodeでもほぼ同様に移植できます）

---

# 0. 結論（設計方針）
- **Telegramは `?start=` が1個しか使えない** → **start文字列の中に計測情報を全部エンコード**する
- **後方互換**：既存 `minimal_{lang}_{source}` をそのまま受けられるパーサを残す
- **ログは2層**
  1) ユーザー単位（free_users）に「初回startの生値＋解析済み」を保存  
  2) イベント単位（events）に `tg_start` / `whop_purchase` を保存（PDCA用）
- **Whop購入計測**：Webhookが最優先。無理ならポーリング（差分検出）で代替

---

# 1. startパラメータ設計（後方互換あり）

## 1-1. 新フォーマット（推奨）
**Prefix + version + key=value を `_` で連結**（人間が読めて、壊れにくい）

例：
```
td2_lang=en_tpl=A1_src=x_quote_inf=saylor_t=15d_c=20260126
```

- `td2` … バージョン識別（Trap Defence v2）
- `lang` … `en/ja/es...`
- `tpl` … A/BテストのテンプレID（A1/B2など）
- `src` … `x_quote / x_direct / x_minimal / telegram / ...`
- `inf` … influencer識別子（`saylor` 等。いなければ `none`）
- `t` … timing（例：`t=15d`、`t=0h`、`t=pre` など運用で統一）
- `c` … campaign/date（`20260126` など。日付でもキャンペーンIDでもOK）

### 文字制約
Telegram start payloadは長さ制限があります（一般に短めが安全）。  
なので **キー名は短く**し、値も短いslugにします。

推奨キー短縮版（さらに短くしたい場合）：
- `l` `p` `s` `i` `t` `c`
例：
`td2_l=en_p=A1_s=xq_i=saylor_t=15d_c=260126`

ただし可読性は落ちるので、まずは長い方でOK。

---

## 1-2. 後方互換（現行フォーマット）
現行：
```
minimal_{lang}_{source}
```
例：`minimal_en_x_quote`

これを受けたら内部的に v1 として扱い、以下にマップ：
- `lang` = `en`
- `src` = `x_quote`
- `tpl` = `LEGACY`
- `inf` = `none`
- `t` = `na`
- `c` = `legacy`

---

## 1-3. X引用RPリンク生成の変更（UTMを捨てて start に集約）
`api/x-quote-repost.js` の `getTelegramDeepLinkWithSource` を置き換え：

```js
// api/x-quote-repost.js
function buildStartPayloadV2({
  lang = "en",
  template = "A1",
  source = "x_quote",
  influencer = "none",
  timing = "na",
  campaign = "20260126",
}) {
  // td2_{key=val}_{key=val}...
  // 値は _ を含めないslugにする（含むならURLエンコードか別セパレータに）
  const parts = [
    "td2",
    `lang=${lang}`,
    `tpl=${template}`,
    `src=${source}`,
    `inf=${influencer}`,
    `t=${timing}`,
    `c=${campaign}`,
  ];
  return parts.join("_");
}

export function getTelegramDeepLinkWithSource({ botUsername, lang, source, template, influencer, timing, campaign }) {
  const start = buildStartPayloadV2({ lang, source, template, influencer, timing, campaign });
  return `https://t.me/${botUsername}?start=${encodeURIComponent(start)}`;
}
```

---

# 2. Telegram側：startパラメータ解析・ログ保存（addFreeUser拡張）

## 2-1. パーサ実装（v2 + v1）
`services/telegram/bot-commands.js` の `parseStartParam` を拡張（例）：

```js
// services/telegram/parse-start.js
export function parseStartParam(raw) {
  const startParam = (raw || "").trim();
  if (!startParam) {
    return {
      version: "none",
      raw: "",
      lang: null,
      source: "unknown",
      template: null,
      influencer: null,
      timing: null,
      campaign: null,
    };
  }

  // v2: td2_lang=en_tpl=A1_src=x_quote...
  if (startParam.startsWith("td2_")) {
    const parts = startParam.split("_").slice(1); // remove td2
    const kv = {};
    for (const p of parts) {
      const idx = p.indexOf("=");
      if (idx === -1) continue;
      const k = p.slice(0, idx);
      const v = p.slice(idx + 1);
      kv[k] = v;
    }
    return {
      version: "td2",
      raw: startParam,
      lang: kv.lang || null,
      source: kv.src || "unknown",
      template: kv.tpl || null,
      influencer: kv.inf || null,
      timing: kv.t || null,
      campaign: kv.c || null,
    };
  }

  // v1 legacy: minimal_{lang}_{source}
  // minimal_en_x_quote
  const m = startParam.match(/^minimal_([a-z]{2})_(.+)$/i);
  if (m) {
    const lang = m[1].toLowerCase();
    const source = m[2].toLowerCase();
    return {
      version: "legacy",
      raw: startParam,
      lang,
      source,
      template: "LEGACY",
      influencer: "none",
      timing: "na",
      campaign: "legacy",
    };
  }

  // fallback: unknown but keep raw
  return {
    version: "unknown",
    raw: startParam,
    lang: null,
    source: "unknown",
    template: null,
    influencer: null,
    timing: null,
    campaign: null,
  };
}
```

---

## 2-2. addFreeUserの拡張（startParam生値＋解析結果）
`services/free-users/manager.js` の `addFreeUser` を拡張します。

### 保存するフィールド（ユーザーオブジェクト）
- `startParamRaw`（生値）
- `startParamVersion`
- `attribution`（解析済みオブジェクト）
  - `lang, source, template, influencer, timing, campaign`
- `firstSeenAt`（初回start時刻）
- `lastSeenAt`（更新）
- `eventsCount`（任意）

例：

```js
// services/free-users/manager.js
export async function addFreeUser(env, {
  chatId,
  lang,
  source,
  startParamRaw,
  startParamVersion,
  attribution, // {lang, source, template, influencer, timing, campaign}
}) {
  const key = `free_user:${chatId}`;
  const now = new Date().toISOString();

  const existing = await env.KV.get(key, { type: "json" });

  const user = existing || {
    chatId,
    joinedAt: now,
    firstSeenAt: now,
  };

  // 初回のstartのみ固定したいなら「空なら入れる」にする
  if (!user.startParamRaw && startParamRaw) user.startParamRaw = startParamRaw;
  if (!user.startParamVersion && startParamVersion) user.startParamVersion = startParamVersion;
  if (!user.attribution && attribution) user.attribution = attribution;

  // 常に更新する運用なら上書き
  user.lang = lang || user.lang || attribution?.lang || null;
  user.source = source || user.source || attribution?.source || "unknown";
  user.lastSeenAt = now;

  await env.KV.put(key, JSON.stringify(user));
  return user;
}
```

> 重要：**「初回attributionを固定」**すると、途中で別リンク踏んでも起点がブレません（CVR分析が安定）。  
> 一方「常に上書き」は最新接触に寄ります。まずは初回固定がおすすめ。

---

## 2-3. イベントログ（tg_start）も保存（PDCA用）
ユーザー保存だけだと「いつ何経路で来たか」の時系列が消えます。  
KVにイベントを積むだけでも最低限回ります。

```js
// services/analytics/events.js
export async function logEvent(env, event) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const payload = { id, ts: now, ...event };

  // 例: event:{ type:"tg_start", chatId, start:{...} }
  await env.KV.put(`event:${now}:${id}`, JSON.stringify(payload), {
    // 90日保持など（Cloudflare KVのTTL）
    expirationTtl: 60 * 60 * 24 * 90,
  });

  // ユーザー別インデックス（任意）
  if (event.chatId) {
    await env.KV.put(`event_by_user:${event.chatId}:${now}:${id}`, "1", {
      expirationTtl: 60 * 60 * 24 * 90,
    });
  }
  return payload;
}
```

`handleStartCommand` で呼びます：

```js
// services/telegram/bot-commands.js
import { parseStartParam } from "./parse-start";
import { addFreeUser } from "../free-users/manager";
import { logEvent } from "../analytics/events";

export async function handleStartCommand(env, ctx) {
  const chatId = String(ctx.chat?.id);
  const raw = ctx.message?.text?.split(" ")[1] || ""; // "/start xxx"
  const parsed = parseStartParam(raw);

  const user = await addFreeUser(env, {
    chatId,
    lang: parsed.lang,
    source: parsed.source,
    startParamRaw: parsed.raw,
    startParamVersion: parsed.version,
    attribution: {
      lang: parsed.lang,
      source: parsed.source,
      template: parsed.template,
      influencer: parsed.influencer,
      timing: parsed.timing,
      campaign: parsed.campaign,
    },
  });

  await logEvent(env, {
    type: "tg_start",
    chatId,
    start: parsed,
    userSnapshot: {
      source: user.source,
      lang: user.lang,
      attribution: user.attribution,
    },
  });

  // ...既存の返信処理
}
```

---

# 3. Whop購入計測：Webhook優先 + ポーリング代替

## 3-1. Webhook（最優先）
`api/whop-webhook.js` を追加（Workers想定の例）。  
Whopの署名検証はドキュメントに合わせて実装してください（ここでは「ヘッダに署名が来る」前提の枠だけ示します）。

### 受信→イベント保存→ユーザー紐付け
紐付けキーは2パターン：

- **理想**：WhopのCheckoutに `metadata` 等で `chatId` を渡す  
- **現実案**：Telegram側で「購入ボタンを押した瞬間」に `purchase_intent` を記録し、Whop側の `email/username` と照合  
  - ただし照合は不安定になりがち  
  - 可能なら**Whopへ chatId を渡す導線**を最優先で作る（後述）

Webhook例：

```js
// api/whop-webhook.js
import { logEvent } from "../services/analytics/events";

async function verifyWhopSignature(request, env, rawBody) {
  // TODO: Whop docsに従って実装
  // return true/false
  return true;
}

export default {
  async fetch(request, env) {
    if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

    const rawBody = await request.text();
    const ok = await verifyWhopSignature(request, env, rawBody);
    if (!ok) return new Response("Invalid signature", { status: 401 });

    const data = JSON.parse(rawBody);

    // 想定: data.type, data.data にイベント本体
    // 例: type="membership.purchased" など
    const type = data.type || "unknown";
    const body = data.data || data;

    // ここで chatId を取りたい（metadataに入っている想定）
    const chatId = body?.metadata?.chatId ? String(body.metadata.chatId) : null;

    await logEvent(env, {
      type: "whop_webhook",
      whopEventType: type,
      chatId,
      whop: {
        id: body?.id,
        planId: body?.plan_id || body?.planId,
        productId: body?.product_id || body?.productId,
        email: body?.email,
        userId: body?.user_id || body?.userId,
        raw: body,
      },
    });

    // 購入イベントとして正規化して別途保存（分析が楽）
    if (type.includes("purchase") || type.includes("membership")) {
      await logEvent(env, {
        type: "purchase",
        provider: "whop",
        chatId,
        planId: body?.plan_id || body?.planId || null,
        amount: body?.amount || null,
        currency: body?.currency || null,
      });
    }

    return new Response("ok");
  }
};
```

---

## 3-2. 「chatIdをWhopに渡す」導線（超重要）
Webhookが来てもchatIdが取れないと「X→Telegram→Whop」が繋がりません。

実装案（実務的に一番簡単）：
- Telegram内の購入ボタンURLを **自前の中継URL**（例：`/go/whop?chatId=...`）にする  
- 中継で `chatId` をKVに保存し、Whopのcheckout URLへリダイレクト  
- 可能ならWhop側のcheckoutに `metadata` / `client_reference_id` 的なものを付与（Whopが対応していれば）

例：

```js
// api/go-whop.js
import { logEvent } from "../services/analytics/events";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const chatId = url.searchParams.get("chatId");
    const plan = url.searchParams.get("plan") || "default";

    if (chatId) {
      await logEvent(env, { type: "purchase_intent", chatId, plan });
      await env.KV.put(`purchase_intent:${chatId}`, JSON.stringify({
        chatId, plan, ts: new Date().toISOString()
      }), { expirationTtl: 60 * 60 * 24 * 7 });
    }

    // 最終的にWhopの購入ページへ
    const whopUrl = env.WHOP_CHECKOUT_URL; // plan別なら分岐
    return Response.redirect(whopUrl, 302);
  }
};
```

Webhook側でchatIdが取れない場合でも、直近の `purchase_intent` を使って「推定紐付け」できます（精度は落ちるがゼロより良い）。

---

## 3-3. Webhookが無理な場合：ポーリング差分検出
`services/whop/poller.js` を追加し、Cronで回します。

- `listMembers()` を取得
- 前回スナップショット（KV）と比較
- 新規メンバーを見つけたら `purchase` eventを発火

```js
// services/whop/poller.js
import { logEvent } from "../analytics/events";
import { whopClient } from "./client";

export async function pollWhopMembers(env) {
  const client = whopClient(env);
  const members = await client.listMembers(); // 既存実装に合わせる

  const key = "whop:members:snapshot";
  const prev = await env.KV.get(key, { type: "json" }) || { ids: {} };

  const currentIds = {};
  for (const m of members) {
    currentIds[m.id] = true;
    if (!prev.ids[m.id]) {
      // 新規
      await logEvent(env, {
        type: "purchase",
        provider: "whop_poll",
        chatId: null, // 紐付けは別途（intentやメール照合）
        planId: m.plan_id || null,
        whopMemberId: m.id,
        raw: m,
      });
    }
  }

  await env.KV.put(key, JSON.stringify({ ids: currentIds, ts: new Date().toISOString() }));
}
```

Cron（例：30分ごと）で `pollWhopMembers` 実行。

---

# 4. 計測とPDCA（勝敗判定までの実装）

## 4-1. 追跡の最小単位（ファネル）
- **tg_start**（start paramから attribution確定）
- **purchase_intent**（Telegram内で購入ボタン押下）
- **purchase**（Webhook or poll）

この3つが揃うと、最低限のPDCAが回ります。

---

## 4-2. 集計ロジック（テンプレ×言語×インフルエンサー）
KVだけでやるなら「日次で集計してサマリをKVに保存」が現実的です。

### 日次集計ジョブ（例）
- 期間：昨日分（UTCまたはJSTで統一）
- `event:*` をprefixでなめるのはKVが苦手なので、本来はD1/R2/外部DB推奨  
  ただし「まず動かす」なら、イベントキー命名を工夫して日付prefixで取れるようにする

例：`event:2026-01-26T...` ではなく  
`event:20260126:...` にして `list({prefix:`event:20260126:`})` できるようにする。

#### 勝敗判定（簡易）
- 各セル（lang×tpl×inf）について
  - `starts` = tg_start数
  - `purchases` = purchase数（chatIdで紐付けできるもの優先、できないものは別枠）
  - `cvr = purchases / starts`
- 最低サンプル：starts >= 200 など閾値を置く
- 統計：まずは **二項比率の差のz検定** or **Wilson区間**で十分

「実装しやすい」Wilson下限での比較例：
- 各variantのCVRのWilson下限を計算し、下限が最も高いものを勝ちにする  
（厳密な多重比較は後で）

---

## 4-3. 紐付け（X→Telegram→Whop）
- X→Telegram：start payloadで確定（source/inf/tpl/timing）
- Telegram→Whop：理想はWebhookにchatIdが入る
  - それが無理なら `purchase_intent` と突合（直近7日以内）で推定

推定紐付けのルール（実装可能ライン）：
- purchaseイベント（chatIdなし）が来たら
  - `email`等でユーザー特定できるならそれで
  - できないなら「直近N分以内に purchase_intent を出したchatId」を候補に（曖昧なら紐付けしない）

---

# 5. 実装タスク一覧（この順でやると詰まりにくい）

1) **start payload v2生成**（`api/x-quote-repost.js`）  
2) **parseStartParam v2+legacy**（`services/telegram/parse-start.js`追加）  
3) **addFreeUser拡張**（startParamRaw/attribution保存）  
4) **tg_startイベントlog**（`services/analytics/events.js`）  
5) **購入導線中継 `/go/whop`**（purchase_intentログ）  
6) **Whop webhook受信**（可能なら署名検証）  
7) webhookが無理なら **poller + Cron**  
8) 日次集計（まずは手動/簡易でOK、後で自動化）

---

# 6. 追加で確認したい2点（ここが決まると仕様が確定します）
1) 実行環境はCloudflare Workers + KVで確定ですか？（D1は使えますか）  
　→ KVだけだとイベント集計が重くなるので、可能なら **D1** を併用したいです（eventsテーブルが作れる）

2) WhopのCheckout URLに **metadata / client_reference_id** 的に任意値（chatId等）を載せられますか？  
　→ 可能ならWebhookで100%紐付けでき、PDCA精度が一気に上がります

---

必要なら、あなたのリポジトリ構造に合わせて「どのファイルのどの関数をどう差し替えるか」をパッチ形式（diff）で出します。現状の `parseStartParam` と `addFreeUser` の実コード（該当部分）を貼ってもらえれば、衝突しない形に落とし込みます。

---

**生成日時**: 2026-01-26T05:45:18.365Z
