# Grok に聞く: 反応が上がりやすい投稿の型（刺さるコピー）

X（Twitter）でクリプト・トレード系オーディエンスに**刺さりやすく、反応（いいね・RT・リプ・クリック）が上がりやすい投稿**の特徴を Grok に聞くためのプロンプトです。  
現行の Copilot 設計（PQT コピー・トーン・CTA）が自己満足になっていないか検証するために使う。

---

## コピペ用プロンプト（英語で聞く）

```
You are an expert on X (Twitter) algorithm and crypto/trading audience behavior.

We run a quote-tweet (QT) strategy: we quote influential "fisherman" posts (hype, pumps, alpha calls) and add our own comment + one link to our funnel (briefing/checklist). Target: EN, ES, PT, AR, KO, JA. Goal: maximize engagement (likes, RTs, replies) and link clicks without sounding like spam or shilling.

Please answer in JSON with the following structure. Answer only with valid JSON, no other text.

{
  "what_works_hooks": [
    { "pattern": "short description", "why": "reason it gets engagement", "example_phrase": "example in English" }
  ],
  "what_works_structure": [
    { "element": "e.g. open with agree vs open with contradiction", "recommendation": "what to do", "avoid": "what to avoid" }
  ],
  "what_works_cta": [
    { "style": "e.g. soft vs direct", "example": "example CTA phrase", "why": "reason" }
  ],
  "what_works_tone": [
    { "tone_name": "e.g. urgency, authority, FOMO", "when_to_use": "context", "risk": "if overdone" }
  ],
  "what_hurts_engagement": [
    { "pattern": "what to avoid", "why": "reason" }
  ],
  "quote_tweet_specific": [
    { "tip": "QT-specific advice", "reason": "why" }
  ],
  "per_language_nuance": {
    "en": "one line",
    "es": "one line",
    "pt": "one line",
    "ar": "one line",
    "ko": "one line",
    "ja": "one line"
  }
}
```

---

## コピペ用プロンプト（日本語で聞く・要約向け）

```
X（Twitter）でクリプト・トレード系のフォロワーに刺さりやすい投稿の「型」を教えてほしい。

前提:
- 引用RT（QT）で、インフルエンサーのポストに私たちのコメント＋導線リンク1本を付けて投稿している。
- ターゲットはトレード・クリプト興味層。EN/ES/PT/AR/KO/JA の6言語。
- 目的はエンゲージメント（いいね・RT・リプ）とリンククリック。スパム感は出したくない。

聞きたいこと（JSONで返してほしい）:
1. 反応が伸びやすい「フック」（書き出し・一言目）のパターンと理由。具体例（英語でOK）。
2. 投稿の構成で「やるべきこと」と「避けること」（例: 最初に同意する vs 最初に矛盾を示す）。
3. CTA（リンクへの誘導）で効く言い回しと、押し売り感を出さないコツ。
4. トーン（焦り・権威・FOMO・証拠重視など）の使い分けと、やりすぎると逆効果になる点。
5. エンゲージメントを下げるNGパターン。
6. 引用RTならではの tips。
7. 言語別（EN/ES/PT/AR/KO/JA）で気をつけるニュアンスを1行ずつ。

「Answer only with valid JSON, no other text」で答えてほしい。
```

---

## 回答の使い方

1. Grok の返答から **JSON 部分だけ** をコピーする。
2. `docs/COPILOT_VS_GROK_ENGAGEMENT_COPY.md` の「Grok の回答」に貼り、現行 Copilot 設計と比較する。
3. 差分（一致・不足・過剰）をメモし、テンプレ修正や tone / CTA の見直しに反映する。
