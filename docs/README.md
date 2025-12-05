# WhaleShield (CryptoSignal AI)

## Overview
Automated BTC signal bot that combines on-chain whale data (CryptoQuant) and AI analysis (Grok) to generate high-conviction trading signals and trap alerts.[file:91][file:113]  
Signals are evaluated every 5 minutes on Vercel Cron and delivered via Telegram in regular briefings and emergency alerts.[file:91][file:109]  

## Architecture
- **api/cron.js**  
  - Single HTTP entrypoint called by Vercel Cron (`/api/cron` every 5 minutes).[file:91][file:109]  
  - Flow: fetch on-chain (CryptoQuant) → price & Fear&Greed → build context → core signal decision → TP/SL generation → trap detection → optional Grok analysis → Telegram send.[file:91]  
- **logic/**  
  - `logic/core/marketCore.js`: Builds market context and outputs core decision `{ score, regime, signal }`.[file:91]  
  - `logic/tier1_btc/signalGen.js`: Converts score+direction into concrete trade signal (side, TP, SL).[file:91]  
  - `logic/tier1_btc/trapDetector.js`: Detects FOMO/PANIC traps from price change, inflow, MPI, and sentiment.[file:91]  
  - `logic/tier1_btc/sentiment.js`: Normalizes Fear&Greed label into internal sentiment.[file:91]  
- **services/**  
  - `services/cryptoquant/client.js`: Thin HTTP client for CryptoQuant API using `CRYPTOQUANT_API_KEY`.[file:112]  
  - `services/cryptoquant/endpoints/btc.js`: BTC-specific helpers `getExchangeInflow`, `getMinerPositionIndex` used by `api/cron.js`.[file:113][file:91]  
  - `services/grok/client.js`: Wraps Grok calls (`analyzeXSentimentLive`, `analyzeMarket`) for X sentiment and market commentary.[file:91]  
  - `services/telegram/bot.js`: Minimal Telegram sender used by `api/cron.js`.[file:91]  
  - `services/telegram/messages/.../regular|emergency.js`: Format functions for regular reports and trap alerts.[file:91]  

## Deployment & Runtime
- **Platform**: Vercel (Serverless Function + Vercel Cron).[file:109]  
- **Cron schedule**: `vercel.json` configures `*/5 * * * *` to call `/api/cron`.[file:109]  
- **Regular briefings**: Sent every 4 hours when `utcHour ∈ [0,4,8,12,16,20]` and `utcMinute < 5` (or when `?force=true`).[file:91]  
- **Emergency alerts**: Sent immediately when `trap.isTrap && trap.confidence === 'HIGH'` outside regular slots.[file:91]  

## Local Development
1. Install dependencies  
   - `npm install`.[file:108]  
2. Configure environment  
   - Create `.env` (or `.env.local`) with at least:  
     - `CRON_SECRET` – shared secret for protecting `/api/cron`.[file:91]  
     - `CRYPTOQUANT_API_KEY` – for on-chain data.[file:112][file:113]  
     - Grok / Telegram tokens as required by `services/grok/client.js` and `services/telegram/bot.js`.[file:91]  
   - On Vercel, set the same keys in the project Environment Variables UI (no `.env` file needed in production).[file:109]  
3. Run a single cron cycle locally (example)  
   - Use an HTTP client (curl/Postman) against the deployed `/api/cron` with header `Authorization: Bearer <CRON_SECRET>` and optional `?force=true` to force a regular briefing.[file:91]  

## Notes
- `.vercel/`, `node_modules/`, logs, and backup files are ignored via `.gitignore` and should not be committed.[file:111]  
- Backtest and experimental scripts (`scripts/`, `data/` for dummy/backtest logs) are intentionally kept out of the core production flow and can live in a separate repository or local-only workspace.[file:101][file:102][file:103]  
- This repository focuses on the minimal production path: **Vercel Cron → `/api/cron` → logic → Grok → Telegram**.[file:91][file:109]
