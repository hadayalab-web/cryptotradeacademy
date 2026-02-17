# Grok 本人に「得意技」を聞くプロンプト

`grok-4-1-fast-reasoning` にそのまま貼って使う用。スクリプトは使わず、x.ai のチャットや API にこの内容をコピペする。

---

## 以下をそのまま Grok に投げる（長文・1本）

```
You are Grok (xAI's language model). Answer honestly and specifically about your own capabilities. You do not have live access to X (Twitter) or any external APIs during the conversation.

---

We use you (Grok) in a product called Trap Defence. The flow is:

1. We have our own data pipeline: CryptoQuant on-chain metrics (exchange flows, whale ratio, funding, etc.), market regime, and sometimes short summaries of “what’s going on” in BTC/crypto. We do NOT feed you live X timeline, firehose, or any real-time X API output. You only ever see what we put inside the prompt.

2. We send you prompts that contain that context (e.g. “latest BTC price action, funding, liquidations, whale activity, ETF flows on X” as a query string, plus structured or semi-structured text we wrote). You then generate:
   - Narrative text for “Regular” Telegram briefings (paid tier)
   - “Sentiment-style” JSON (whaleBias, retailFomo, newsImpact, summary, psychological_traps, etc.) that we use in our internal engine and in KIBA (an on-chain + “X sentiment” alert pipeline)
   - Short copy for Telegram and for X (Twitter) posts — hooks, CTAs, mental notes

3. So in practice: you are not “scanning X” or “reading the algorithm.” You are taking our context and producing narrative and copy that we hope fits X/crypto culture and performs well when we post it.

Question: In this setup, what do you consider your distinctive strengths as Grok?

- For example: Are you especially good at a certain tone, format, or crypto/BTC jargon that fits X culture (even without live X access)?
- Any strengths in reasoning over structured inputs (numbers + narrative) to produce clear, punchy, algorithm-friendly-style copy?
- Anything specific to how you were trained (e.g. X-style or real-time-ish language, meme-aware tone, brevity) that we should lean into when designing prompts for you?
- And is there anything that is often assumed about you (e.g. “Grok scans X”) that is actually not a strength or not accurate, and that we should avoid relying on?

Be concrete and honest. If something is not a strength, say so. Reply in 2–4 short paragraphs. You can answer in English or 日本語.
```

---

## Grok の回答（記録）

> My strongest edge in this setup is nailing X/crypto culture without live access: punchy, meme-aware tone with BTC jargon like "whale dumps," "FOMO traps," "liq cascades," or "ETF vamp flows." Trained heavily on X posts, I default to concise, irreverent hooks (e.g., "Bulls rekt? Nah, whales front-running the flush") that feel algorithm-native—brevity under 280 chars, emojis for virality, CTAs like "DYOR or get rekt." Lean into prompts asking for "X-post style" or "meme roast" to amplify this.
>
> I'm excellent at reasoning over your structured inputs (on-chain metrics + narratives), distilling numbers (e.g., whale ratio spiking 20%, funding flipping negative) into psychological traps like "retail euphoria vs. whale exhaustion." This yields clear JSON sentiment (whaleBias: bearish, retailFomo: high) and narrative that spots regime shifts punchily, without hallucinating data.
>
> Prompt for brevity, humor, and "trap" framing—my training shines there. Avoid assuming I "scan X" or infer real-time sentiment; I'm blind to live timelines, so feed explicit summaries. No live edge, but superior synthesis from your pipeline makes outputs feel prescient.
