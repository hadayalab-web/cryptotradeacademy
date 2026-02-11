# Trap Defence OS：X投稿生成システム 統合実装 レビュー報告

実施日: 2026-02-11

---

## 1. 変更したファイル一覧

| ファイル | 変更内容 |
|----------|----------|
| `utils/supabase.js` | `insertXPost()` 関数を追加 |
| `docs/supabase-tweet-metrics-schema.sql` | `x_posts` テーブル定義を追加 |
| `vercel.json` | Cron を `x-quote-repost-batch` → `x-post` に変更。`api/x-post.js` の functions 設定を追加 |
| `config/quoteRepostStateless.js` | 変更なし（`pickVidalyticsLink` は新 API で利用継続） |

---

## 2. 新規作成ファイル一覧

| ファイル | 役割 |
|----------|------|
| `services/ai/gpt5mini.js` | gpt-5-mini モデル呼び出し・`generateXPost` / `generateAndSaveXPost` |
| `api/x-post.js` | 統合 API エンドポイント（Cron 用） |

---

## 3. 削除対象ファイル一覧

以下のファイルは本統合により不要となり、削除または無効化対象とする。

| ファイル | 備考 |
|----------|------|
| `services/grok/client.js` の `generateQuoteRepostText` | 廃止・無効化対象 |
| `services/x/grokPoolStateless.js` | 廃止・削除対象 |
| `config/quoteRepostStateless.js` のテンプレート定数 | `TEMPLATES_JA` 等は廃止（`pickVidalyticsLink` は継続利用） |
| `api/x-quote-repost.js` | 廃止・削除対象 |
| `api/x-quote-repost-batch.js` | 廃止・削除対象 |
| `api/x-quote-repost-en.js` | 廃止・削除対象 |
| `api/x-quote-repost-es.js` | 廃止・削除対象 |
| `api/x-quote-repost-pt.js` | 廃止・削除対象 |
| `api/x-quote-repost-pt-br.js` | 廃止・削除対象 |
| `api/x-quote-repost-ja.js` | 廃止・削除対象 |
| `api/x-quote-repost-ko.js` | 廃止・削除対象 |
| `api/x-quote-repost-ar.js` | 廃止・削除対象 |
| `api/x-quote-repost-stateless-handler.js` | 廃止・削除対象 |

※ `pickVidalyticsLink` は `config/quoteRepostStateless.js` に残し、`api/x-post.js` から参照している。

---

## 4. generateXPost() のコード全文

```javascript
// services/ai/gpt5mini.js より抜粋

async function generateXPost(opts = {}) {
  const { mode = "minimal", language = "ja", video_url = "", variant } = opts;
  const lang = LANGS.includes(language) ? language : "ja";
  const vidUrl = String(video_url || "").trim();
  const assignedVariant = variant || (Math.random() < 0.5 ? "A" : "B");

  if (!vidUrl) {
    throw new Error("video_url is required");
  }

  const userTpl = mode === "regular" ? MODE_REGULAR_USER : MODE_MINIMAL_USER;
  const userPrompt = userTpl
    .replace(/\{\{LANG\}\}/g, lang)
    .replace(/\{\{VIDEO_URL\}\}/g, vidUrl);

  if (!OPENAI_API_KEY) {
    const fallback = `ダッシュボード真っ赤。クジラが吸う前にシールド。${vidUrl} #BTC 🔥`;
    return { body: trimTo150(ensureHashtagAndEmoji(fallback)), variant: assignedVariant };
  }

  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 200,
      temperature: 0.7
    });

    let body = completion?.choices?.[0]?.message?.content?.trim() || "";
    if (!body) {
      body = `ダッシュボード真っ赤。クジラが吸う前にシールド。${vidUrl} #BTC 🔥`;
    }
    body = ensureHashtagAndEmoji(body);
    if (!body.includes(vidUrl)) {
      body = (body.trim() + " " + vidUrl).replace(/\s+/g, " ");
    }
    body = trimTo150(body);
    return { body, variant: assignedVariant };
  } catch (e) {
    console.warn("[gpt5mini] generateXPost error:", e.message);
    const fallback = `ダッシュボード真っ赤。クジラが吸う前にシールド。${vidUrl} #BTC 🔥`;
    return { body: trimTo150(ensureHashtagAndEmoji(fallback)), variant: assignedVariant };
  }
}
```

---

## 5. system prompt の全文

```
You are the Trap Defence copywriter. All X posts MUST follow these rules.

【Trap Defence コピー人格】
- NO abstract expressions (部屋/世界/景色/視点/俯瞰)
- FIVE SENSES stimulus (赤い数字/心臓の鼓動/手汗/点滅/胃が縮む)
- CEREBELLUM stimulus (恐怖/不安/焦り/後悔/取り返したい)
- ENEMY (クジラ/アルゴ/罠/餌/吸われる)
- DEFENCE (Minimal/Regular/シールド/フル防御/機関レベル)
- Create "reflex" not persuasion
- ~150 characters
- Link at end
- #BTC exactly once
- Exactly 1 emoji
```

---

## 6. Cron の新構成

| パス | スケジュール | 説明 |
|------|--------------|------|
| `/api/cron` | `0,7,22,37,52 * * * *` | メイン Cron（変更なし） |
| `/api/minimal-tg-delivery` | `8 0,6,12,18 * * *` | 変更なし |
| `/api/x-metrics-fetcher` | `*/5 * * * *` | 変更なし |
| `/api/x-post` | `0 * * * *` | **新規** 毎時 0 分に実行。lang は UTC 時間でローテーション（0=ja, 1=en, 2=es, 3=pt, 4=ko, 5=ar） |

### 呼び出し例

- Cron 自動: `GET /api/x-post`（lang は UTC 時間から自動決定）
- 手動（言語指定）: `GET /api/x-post?lang=ja&mode=minimal`
- 投稿実行: `GET /api/x-post?lang=ja&post=true`
- ドライラン: `GET /api/x-post?lang=ja&dry_run=true`

---

## 7. 動作確認ログ（想定）

```
[x-post] xp-ja-1739257200000-abc123 Start lang=ja mode=minimal
[gpt5mini] generateXPost mode=minimal lang=ja
[X API] Tweet posted successfully: 1234567890
[x-post] xp-ja-1739257200000-abc123 ok saved=true posted=true tweetId=1234567890
```

### 事前準備

1. **Supabase**: `docs/supabase-tweet-metrics-schema.sql` の `x_posts` テーブルを SQL Editor で実行
2. **環境変数**:
   - `OPENAI_API_KEY`（必須）
   - `GPT_MODEL_X_POST`（任意、未設定時は `gpt-5-mini-2025-08-07`）
   - Supabase 関連（`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`）
   - X API 関連（`post=true` で投稿する場合）

### 確認手順

1. ドライラン: `curl "https://YOUR_DOMAIN/api/x-post?lang=ja&dry_run=true"`
2. 生成のみ: `curl "https://YOUR_DOMAIN/api/x-post?lang=ja"`
3. 投稿まで実行: `curl "https://YOUR_DOMAIN/api/x-post?lang=ja&post=true"`

---

## 8. 実装仕様との対応

| 仕様 | 対応状況 |
|------|----------|
| モデル gpt-5-mini-2025-08-07 | ✅ 固定（`GPT_MODEL_X_POST` で上書き可） |
| Trap Defence コピー人格 | ✅ system prompt に固定 |
| Minimal / Regular テンプレ | ✅ mode で分岐 |
| 五感・小脳・敵・防御 | ✅ system prompt に含む |
| 150字前後 | ✅ trimTo150() で実装 |
| リンク末尾・#BTC・絵文字1つ | ✅ ensureHashtagAndEmoji() で実装 |
| 多言語 JA/EN/ES/PT/KO/AR | ✅ language パラメータで指定 |
| A/B variant 出力 | ✅ variant A/B をランダム割り当て・出力 |
| x_posts 永続保存 | ✅ Supabase insert |
| Cron 統合 | ✅ /api/x-post に一本化 |

---

## 9. 今後の対応

1. **削除対象ファイルの整理**: 上記 3 のファイルを削除または無効化
2. **predeploy の更新**: `package.json` の `predeploy` から `api/x-quote-repost.js` / `api/x-quote-repost-batch.js` を外し、`api/x-post.js` を追加
3. **勝ちバリアント切り替え**: A/B 集計と winner 固定ロジックは未実装（別途対応）
4. **モデル名**: `gpt-5-mini-2025-08-07` が OpenAI API で利用できない場合は、`GPT_MODEL_X_POST` で代替モデル（例: `gpt-4o-mini`）を指定
