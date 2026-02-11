/**
 * Trap Defence OS — X投稿生成（gpt-5-mini 統合）
 * Grok / GrokPool / KV版テンプレートを廃止し、Trap Defence コピー人格に一本化
 */

const OpenAI = require("openai");
const { insertXPost } = require("../../utils/supabase");

const MODEL = process.env.GPT_MODEL_X_POST || "gpt-5-mini";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const SYSTEM_PROMPT = `You are the Trap Defence copywriter. All X posts MUST follow these rules.

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

【構造テンプレ mode=minimal】
- 1行目：痛み・恐怖・五感刺激
- 2行目：敵（クジラ・アルゴ）を明示
- 3行目：無料のシールド（Minimal）を提示
- 4行目：video_url
- 5行目：#BTC + 絵文字1つ

【構造テンプレ mode=regular】
- 1行目：痛み・恐怖・破滅の映像
- 2行目：軽装備では死ぬ（構造の問題）
- 3行目：フル防御（Regular）を提示
- 4行目：video_url
- 5行目：#BTC + 絵文字1つ

【生成条件】
- You are now writing in the target language: {{LANG}}.
- You are now generating a post for mode={{MODE}}.
- Follow the exact structure template for this mode.
- Never deviate from the required line structure.`;

const MODE_MINIMAL_USER = `Generate a post in {{LANG}} for mode "minimal".

Structure (strict):
1. Pain/fear/five-senses stimulus
2. Enemy explicit (whale/algo/trap/bait/sucked)
3. Free shield (Minimal) offer
4. {{VIDEO_URL}}
5. #BTC + exactly 1 emoji

Output: 3-4 lines, ~150 chars. Link at end. No abstract words.`;

const MODE_REGULAR_USER = `Generate a post in {{LANG}} for mode "regular".

Structure (strict):
1. Pain/fear/destruction imagery
2. Light armor = death (structural problem)
3. Full defence (Regular) offer
4. {{VIDEO_URL}}
5. #BTC + exactly 1 emoji

Output: 3-4 lines, ~150 chars. Link at end. No abstract words.`;

const LANGS = ["ja", "en", "es", "pt", "ko", "ar"];
const DEFAULT_EMOJI = "🚨";
// Unicode Emoji 簡易検出（一般的な絵文字範囲）
const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u2600-\u26FF\u2700-\u27BF]/gu;

const MAX_LEN_BY_LANG = {
  ja: 150,
  ko: 150,
  ar: 150,
  en: 180,
  es: 180,
  pt: 180
};

function trimToMax(text, lang = "ja") {
  if (!text || typeof text !== "string") return "";
  const t = text.trim();
  const max = MAX_LEN_BY_LANG[lang] ?? MAX_LEN_BY_LANG.ja;
  const margin = Math.min(20, max - 10);
  if (t.length <= max + margin) return t;
  const cut = t.substring(0, max - 3);
  const lastSpace = cut.lastIndexOf(" ");
  const trimmed = lastSpace > max * 0.6 ? cut.substring(0, lastSpace) : cut;
  return trimmed.trim() + "...";
}

/**
 * #BTC をちょうど1回、絵文字をちょうど1つに厳格化。
 * 最終形: <本文> <video_url> #BTC 🚨
 */
function ensureHashtagAndEmoji(text) {
  let t = text.trim();

  // 絵文字: 2つ以上なら先頭1つだけ残し、0個なら🚨を使用
  const emojiMatches = t.match(EMOJI_REGEX) || [];
  const emojiToUse = emojiMatches.length >= 1 ? emojiMatches[0] : DEFAULT_EMOJI;

  // #BTC と絵文字を除去して本文のみ取得
  let body = t.replace(/#BTC/gi, "").replace(EMOJI_REGEX, "").replace(/\s+/g, " ").trim();

  // 末尾の " #BTC" や " 🚨" の余分なスペースを除去
  body = body.replace(/\s+$/, "");

  // 最終形: <本文> #BTC <絵文字>
  return (body + " #BTC " + emojiToUse).replace(/\s+/g, " ").trim();
}

/**
 * X投稿文を生成
 * @param {Object} opts
 * @param {string} opts.mode - "minimal" | "regular"
 * @param {string} opts.language - "ja" | "en" | "es" | "pt" | "ko" | "ar"
 * @param {string} opts.video_url - Vidalytics URL
 * @param {string} [opts.variant] - A/B variant (optional)
 * @returns {Promise<{body: string, variant: string}>}
 */
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
    return { body: trimToMax(ensureHashtagAndEmoji(fallback), lang), variant: assignedVariant };
  }

  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

  const systemPrompt = SYSTEM_PROMPT
    .replace(/\{\{LANG\}\}/g, lang)
    .replace(/\{\{MODE\}\}/g, mode);

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_completion_tokens: 200,
      temperature: 0.7,
      top_p: 1,
      presence_penalty: 0,
      frequency_penalty: 0
    });

    let body = completion?.choices?.[0]?.message?.content?.trim() || "";
    if (!body) {
      body = `ダッシュボード真っ赤。クジラが吸う前にシールド。${vidUrl} #BTC 🔥`;
    }
    if (!body.includes(vidUrl)) {
      body = (body.trim() + " " + vidUrl).replace(/\s+/g, " ");
    }
    body = ensureHashtagAndEmoji(body);
    body = trimToMax(body, lang);
    return { body, variant: assignedVariant };
  } catch (e) {
    console.warn("[gpt5mini] generateXPost error:", e.message);
    const fallback = `ダッシュボード真っ赤。クジラが吸う前にシールド。${vidUrl} #BTC 🔥`;
    return { body: trimToMax(ensureHashtagAndEmoji(fallback), lang), variant: assignedVariant };
  }
}

/**
 * X投稿を生成し、Supabase x_posts に保存
 * @param {Object} opts - generateXPost と同じ + 保存
 * @returns {Promise<{body: string, variant: string, saved: boolean}>}
 */
async function generateAndSaveXPost(opts = {}) {
  const { body, variant } = await generateXPost(opts);
  const { mode = "minimal", language = "ja", video_url = "" } = opts;
  const saved = await insertXPost({
    lang: language,
    mode,
    variant,
    body,
    video_url
  });
  return { body, variant, saved };
}

module.exports = {
  MODEL,
  SYSTEM_PROMPT,
  generateXPost,
  generateAndSaveXPost,
  trimToMax,
  ensureHashtagAndEmoji,
  MAX_LEN_BY_LANG
};
