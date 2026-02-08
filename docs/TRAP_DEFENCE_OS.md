# Trap Defence – System Architecture Instruction v2.8 (for Cursor)

**Purpose:** This project implements the Trap Defence BTC Briefing System using **Code + LLM Prompts + Telegram Bot**. The system does *not* perform trading actions. It only **collects data, analyzes market structure, and generates reports**.

**v2.8 updates:** Final Report Engine Prompt 見出し強制の最終最終版 — 太字(**)での見出し代替を厳禁、## 必須、Scenario Map 重複禁止、Behind-the-Scenes 4要素強制生成。完全体として安定稼働。

---

## 1. System Overview

Trap Defence is a **three-engine analysis system**:

### 1. CryptoQuant Engine (GPT)
- **Input:** CQ API data (netflow, MPI, stablecoin flow, whale ratio, etc.)
- **Output:** Behind-the-Scenes Structure
  - Whale Intent (structural inference only)
  - Algo Behavior Patterns
  - Retail Psychological Distortion
  - Liquidity Map
  - Trap Score reasoning
- **Code:** `services/gpt/client.js` → `generateCryptoQuantAnalysis()`

### 2. X Sentiment Engine (Grok)
- **Input:** X posts (Live Search / API)
- **Output:** Trap Defence X Engine format
  - sentiment_state
  - emotional_bias
  - retail_behavior
  - psychological_traps
- **Code:** `services/grok/client.js` → `analyzeXSentimentLive()`, `services/grok/highResolution.js` → `analyzeXSentimentHighResolutionCompat()`

### 3. Macro Engine (Gemini)
- **Input:** CQ data + past context
- **Output:** Trap Defence Macro Engine format
  - macro_pressure
  - volatility_drivers
  - liquidity_regime
  - external_risks
  - action_guidance
- **Code:** `services/gemini/sosovalueArticle.js` → `generateSosovalueStyleArticle()`

### Final Report Engine (GPT) — v2.8（見出し強制の最終最終版）
- Integrates all three engines
- Generates **Trap Defence Regular Briefing**
- Uses the "Behind-the-Scenes Structure" format
- **MUST NOT** include trading instructions, entries, exits, or recommendations
- Focus ONLY on structure, psychology, liquidity, and market mechanics

---

## 2. Data Flow

```
[Scheduler / Cron] → [Data Fetcher] → [LLM Engines] → [Report Builder] → [Telegram Bot]
```

### Data Fetcher
- CQ data via API
- X posts / sentiment
- Normalize into JSON

### LLM Engines
- **GPT (CQ Engine):** `generateCryptoQuantAnalysis()` in `services/gpt/client.js`
- **Grok (X Engine):** `analyzeXSentimentHighResolutionCompat()` 
- **Gemini (Macro):** `generateSosovalueStyleArticle()` in `services/gemini/sosovalueArticle.js`

### Report Builder
- **Regular Briefing:** `formatRegularBriefing()` in `services/telegram/messages/user/{lang}/regular.{lang}.js`
- Structure: Market State Radar → Behind-the-Scenes → Current BTC Structure → Scenario Map → Data-Backed Evidence → Psychological Insight → Trap Defence Value → Snapshot

### Telegram Bot
- Posts briefing to channel
- Commands: `/briefing` → latest full report, `/snapshot` → minimal version

---

## 3. Regular Briefing Structure (Trap Defence OS v2.8 — 完全レポート v3.5)

0. **Header** – Trap Defence Briefing / Alert + "CQ × X × 3AI — Behind-the-Scenes Structure Report"
1. **Market State Radar** – Trap Score, CQ Risk, X Sentiment, Macro Pressure, Liquidity Regime, Volatility Mode + **### Key Metrics** sub-section (BTC Price, Netflow, MPI, Sentiment)

**HARD RULES (NON-NEGOTIABLE):** DO NOT generate Trade Verdict. DO NOT generate On-chain insight. Scenario Map MUST appear ONLY in Section 4. Scenario Map MUST NOT appear inside Behind-the-Scenes. All Behind-the-Scenes subsections MUST use ## headers. Key Metrics MUST use ### Key Metrics.
2. **Behind-the-Scenes Structure** (MANDATORY 4 elements — NO Summary, NO Scenario Map)
   - ## 2-1. Whale Intent (structural inference only)
   - ## 2-2. Algo Behavior Patterns
   - ## 2-3. Retail Psychological Distortion
   - ## 2-4. Liquidity Map
3. **Current BTC Structure** – Price, key levels, netflow interpretation
4. **Scenario Map** (MANDATORY: 3-5 structural scenarios — ONLY here, NOT inside Behind-the-Scenes)
   - Supply shock continuation, miner pressure, retail panic, algo-driven volatility, macro regime
   - NOT trade setups
5. **Data-Backed Evidence** – Trap Score, on-chain reasons (structural only)
6. **Psychological Insight (Dr. Grok)** – X sentiment + mental coaching
   - **Grok null fallback:** "Sentiment silence" — Data missing is meaningful. When retail freezes from fear, market enters psychological vacuum—conditions where algos move most freely.
7. **Trap Defence Value** – Structural clarity, psychological insight, CQ×X×3AI integration
8. **Snapshot** – Price, Netflow, MPI, Sentiment, Trap Score

---

## 4. Minimal Version (Free Report) — OS v2.6 テンプレ

```
🌤️ Trap Defence BTC — Minimal Briefing
📅 {timestamp}

━━━━━━━━━━━━━━━━━━━━
📡 Market Snapshot
━━━━━━━━━━━━━━━━━━━━
• Trap Score: {trap_score}/100
• CQ Summary: {cq_summary}
• X Sentiment: {x_summary or "Sentiment silence"}
• Macro Summary: {macro_summary}

━━━━━━━━━━━━━━━━━━━━
📊 Key Metrics
━━━━━━━━━━━━━━━━━━━━
• Price: {price}
• Netflow: {netflow}
• MPI: {mpi}
• Sentiment: {sentiment}

━━━━━━━━━━━━━━━━━━━━
🧠 Insight
━━━━━━━━━━━━━━━━━━━━
{one-line structural insight}

For educational purposes only.
```

**Minimal High Quality（4-post）は廃止。** Zeigarnik Edition v1.5 のみ使用。

---

## 4b. Trap Defence Minimal Engine — 指示書（最終版）

無料版（Minimal Version）専用。短いのに深い・構造が伝わる・世界観が崩れない を強制。

**MUST:**
- short (max 6–8 lines total)
- NEVER trading instructions, entries, exits, recommendations
- NEVER scenario maps, Behind-the-Scenes Structure
- NEVER Whale/Algo/Retail/Liquidity analysis
- NEVER psychological coaching or Dr. Grok commentary
- NEVER long paragraphs
- ALWAYS preserve Trap Defence worldview (structure, psychology, liquidity)

**Sections (EXACT order):**
1. Header — 🌤️ Trap Defence BTC — Minimal Briefing / 📅 {timestamp UTC}
2. 📡 Market Snapshot — EXACTLY 4 bullets: Trap Score, CQ Summary, X Sentiment, Macro Summary
3. 📊 Key Metrics — EXACTLY 4 bullets: Price, Netflow, MPI, Sentiment
4. 🧠 Insight — ONE sentence only (structural insight, NOT recommendation)
5. Footer — For educational purposes only.

**Insight examples:**
- "Whales appear to be absorbing panic-driven supply; liquidity is shifting under fear pressure."
- "Market structure shows liquidity reconfiguration under fear-dominant conditions."
- "Volatility reflects structural stress rather than directional conviction."

**MANDATORY CHECK before output:** EXACT section order/titles, EXACT bullet count, Insight ONE sentence only, NO trading instructions, NO scenario map, NO Behind-the-Scenes, NO Whale/Algo/Retail/Liquidity analysis, NO long paragraphs, NO "…" placeholders.

---

## 5. Coding Rules

- Use **Node.js** (ESM/CommonJS)
- Use `async/await` for network operations
- Use `fetch` or `httpx` for API calls
- Use `node-telegram-bot-api` or similar for Telegram
- All configs in `.env`
- All logs to console (Vercel logs)
- All LLM calls wrapped in retry logic
- **No trading actions**
- **No financial advice**

---

## 6. Error Handling

- If any engine fails → fallback to partial report
- **If X Engine (Grok) is null** → interpret as "sentiment silence" and explain its structural meaning
- If data missing → mark section as "Data unavailable"
- Never halt entire pipeline

---

## 7. Security

- No private keys in code
- All tokens loaded from environment variables
- No trading execution endpoints

---

## 8. Key Files

| Component | Path |
|-----------|------|
| Cron / Scheduler | `api/cron.js` |
| GPT CQ Engine | `services/gpt/client.js` → `generateCryptoQuantAnalysis()` |
| Grok X Engine | Grok sentiment analysis |
| Gemini Macro | `services/gemini/sosovalueArticle.js` |
| Regular Briefing (EN) | `services/telegram/messages/user/en/regular.en.js` |
| Minimal Briefing | `services/telegram/messages/user/{lang}/minimal-high-quality.{lang}.js` |

---

## 9. Final Report Engine Prompt v2.8（見出し強制の最終最終版）

HARD RULES (NON-NEGOTIABLE):
- DO NOT generate "Trade Verdict" or "On-chain insight"
- DO NOT generate "stay flat", "avoid", "enter", "exit", "watch levels"
- Scenario Map MUST appear ONLY in Section 4. Scenario Map MUST NOT appear inside Behind-the-Scenes Structure
- All Behind-the-Scenes subsections MUST use Markdown headers (##). Key Metrics MUST use "### Key Metrics"
- Using bold text (**) instead of Markdown headers (##) is STRICTLY FORBIDDEN
- DO NOT skip, shorten, or partially output any mandatory subsection
- DO NOT output "…" or incomplete placeholders
- If any subsection is missing or incomplete, MUST regenerate fully before outputting

CHECKLIST FOR BEHIND-THE-SCENES STRUCTURE (MUST PASS ALL):
1. Whale Intent: MUST exist, full paragraph, MUST use header "## 2-1. Whale Intent", NO "…"
2. Algo Behavior Patterns: MUST exist, full paragraph, MUST use header "## 2-2. Algo Behavior Patterns", NO "…"
3. Retail Psychological Distortion: MUST exist, full paragraph, MUST use header "## 2-3. Retail Psychological Distortion"; if X null → interpret "sentiment silence"; NO "…"
4. Liquidity Map: MUST exist, full paragraph, MUST use header "## 2-4. Liquidity Map", NO "…"
NO bold text (**) is used for subsection titles. If ANY fails → regenerate before outputting.

---

## 10. Goal

Trap Defence を **「自動で毎日動くプロダクト」** として完成させる。
