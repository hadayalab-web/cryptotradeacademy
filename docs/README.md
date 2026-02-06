# WhaleShield (CryptoSignal AI)
**最終更新**: 2026-01-17 14:07:03  
**作成日時**: 2026-01-17 14:07:03  
**作成日**: 2026-01-17  

## 運用で管理する配信（2系統だけ）
**→ [MANAGED_DELIVERIES.md](./MANAGED_DELIVERIES.md)**  
(1) 無料版・有料版のTG配信ライン (2) Grok引用リポストライン。この2系統のみ。

## Overview
Automated BTC signal bot that combines on-chain whale data (CryptoQuant) and AI analysis (Grok) to generate high-conviction trading signals and trap alerts.[file:91][file:113]  
Signals are evaluated every 15 minutes on Vercel Cron and delivered via Telegram in regular briefings and emergency alerts.[file:91][file:109]

**Phase1-Product実装完了 (2026-01-05)**:
- ✅ NO TRADEアラート機能（見送り判定の提供）
- ✅ Trap Riskスコア定量化機能（0-100スコア）
- ✅ Exit Map機能（分割利確/撤退条件の固定テンプレート）
- ✅ 週次検証ログ公開機能  

## Architecture
- **api/cron.js**  
  - Single HTTP entrypoint called by Vercel Cron (`/api/cron` every 5 minutes).[file:91][file:109]  
  - Flow: fetch on-chain (CryptoQuant) → price & Fear&Greed → build context → core signal decision → TP/SL generation → trap detection → optional Grok analysis → Telegram send.[file:91]  
- **logic/**  
  - `logic/core/marketCore.js`: Builds market context and outputs core decision `{ score, regime, signal }`.[file:91]  
  - `logic/tier1_btc/signalGen.js`: Converts score+direction into concrete trade signal (side, TP, SL).[file:91]  
  - `logic/tier1_btc/trapDetector.js`: Detects FOMO/PANIC traps from price change, inflow, MPI, and sentiment.[file:91]  
  - `logic/tier1_btc/sentiment.js`: Normalizes Fear&Greed label into internal sentiment.[file:91]
  - `logic/tier1_btc/noTradeDetector.js`: NO TRADEアラート機能（見送り判定）[Phase1-Product]
  - `logic/tier1_btc/trapRiskScorer.js`: Trap Riskスコア定量化機能（0-100スコア）[Phase1-Product]
  - `logic/tier1_btc/exitMap.js`: Exit Map機能（分割利確/撤退条件）[Phase1-Product]
  - `logic/tier1_btc/verificationLogger.js`: 検証ログ記録システム[Phase1-Product]  
- **services/**  
  - `services/cryptoquant/client.js`: Thin HTTP client for CryptoQuant API using `CRYPTOQUANT_API_KEY`.[file:112]  
  - `services/cryptoquant/endpoints/btc.js`: BTC-specific helpers `getExchangeInflow`, `getMinerPositionIndex` used by `api/cron.js`.[file:113][file:91]  
  - `services/grok/client.js`: Wraps Grok calls (`analyzeXSentimentLive`, `analyzeMarket`) for X sentiment and market commentary.[file:91]  
  - `services/telegram/bot.js`: Minimal Telegram sender used by `api/cron.js`.[file:91]  
  - `services/telegram/messages/.../regular|emergency.js`: Format functions for regular reports and trap alerts.[file:91]  

## Deployment & Runtime
- **Platform**: Vercel (Serverless Function + Vercel Cron).[file:109]  
- **Cron schedule**: `vercel.json` configures `*/15 * * * *` to call `/api/cron`.[file:109]  
- **Regular briefings**: Sent every 4 hours when `utcHour ∈ [0,4,8,12,16,20]` and `utcMinute < 5` (or when `?force=true`).[file:91]  
- **Emergency alerts**: Sent immediately when `trap.isTrap && trap.confidence === 'HIGH'` outside regular slots.[file:91]
- **Weekly reports**: Generated every Sunday 00:00 UTC via `/api/weekly-report`.[Phase1-Product]  

## Local Development
1. Install dependencies  
   - `npm install`.[file:108]  
2. Configure environment  
   - Create `.env` (or `.env.local`) with at least:  
     - `CRON_SECRET` – shared secret for protecting `/api/cron`.[file:91]  
     - `CRYPTOQUANT_API_KEY` – for on-chain data.[file:112][file:113]  
     - Grok / Telegram tokens as required by `services/grok/client.js` and `services/telegram/bot.js`.[file:91]  
   - On Vercel, set the same keys in the project Environment Variables UI (no `.env` file needed in production).[file:109]  
3. Run a single cron cycle (remote)  
   - Call the deployed `/api/cron` endpoint with header `Authorization: Bearer <CRON_SECRET>` and optional query `?force=true` to force a regular briefing.[file:91]  

## Notes
- `.vercel/`, `node_modules/`, logs, and backup files are ignored via `.gitignore` and should not be committed.[file:111]  
- Backtest and experimental scripts (`scripts/`, `data/` for dummy/backtest logs) have been removed from this repository to keep the production path minimal; they should live in a separate backtest/local-only repo if needed.[file:101][file:102][file:103]  
- This repository focuses on the minimal production path: **Vercel Cron → `/api/cron` → logic → Grok → Telegram**.[file:91][file:109]  

## v2+ Upgrade Direction (Design Notes)

These are agreed upgrade directions for future major versions. They are **not** implemented yet but guide how to evolve the system without breaking the v1 core.[file:189]  

### 1. Multilingual Messaging (JP / AR / ES)
- Extend Telegram message templates to be language-aware.  
  - Directory structure: `services/telegram/messages/user/{lang}/regular.js` and `.../emergency.js` for `en`, `ja`, `es`, `ar`.[file:91]  
  - `api/cron.js` chooses the correct formatter based on configuration (e.g. environment variable `LANG` per deployment, or chat-id → language mapping).[file:91]  
- Initial plan:  
  - v2.0: Add Japanese templates and a JP deployment for the owner.  
  - v2.1: Add Arabic and Spanish templates as separate “upsell” bots, likely via separate Vercel projects/environments using different Telegram tokens.  

### 2. Multi-Asset & Product Lines via CryptoQuant
- Generalize the current BTC-only on-chain layer to support multiple assets and products while reusing the same core pipeline.[file:113][web:171]  
- Planned structure:  
  - `services/cryptoquant/endpoints/{asset}.js` for BTC, ETH, and grouped “alts/meme” endpoints (exchange flows, flow indicators, market indicators, etc.).[image:1][web:171][web:179]  
  - `buildMarketContext` in `logic/core/marketCore.js` accepts `{ asset, price, inflow, mpi, sentiment, ... }` so it can be reused across BTC, alts, and portfolio products.[file:91]  
- Commercial roadmap examples:  
  - **Alt version**: On-chain metrics for ETH and top alts (exchange netflows, reserves, indicators).  
  - **Meme version**: Focused metrics for chosen ERC-20/meme tokens (netflow, active addresses, holder concentration).[image:1][web:171][web:174]  
  - **Event-driven portfolio version**: Triggers rebalance or allocation signals based on regime changes in key metrics (large netflow spikes, miner indices, reserve changes, etc.).[web:173][web:175][web:179]  

### 3. Product & Deployment Strategy
- Keep v1 BTC English bot as the base offer.  
- Layer upgrades without rewriting the core:  
  - Language variants (JP/AR/ES) share the same `/api/cron` logic but use different message templates and Telegram credentials.  
  - Asset/product variants (Alts, Meme, Portfolio) plug into the same pipeline via different `asset` configs and CryptoQuant endpoints, potentially exposed as separate bots or tiers.  
- All new features should preserve the main invariant: **stateless cron handler, deterministic decisions from on-chain + price + sentiment, minimal side effects beyond Telegram sends.**[file:91]  

### 4. Next Steps Log (JP)

このプロジェクトを拡張していく際の「直近でやるべきことメモ」を残しておく。実装順の目安として利用する。[file:189]  

1. [translate:messages/user/ja/*] を追加して、日本語版メッセージテンプレートを実装する。  
   - `services/telegram/messages/user/ja/regular.js` と `emergency.js` を用意し、`LANG=ja` のデプロイまたは自分専用BOTに紐付ける。  
2. [translate:marketCore] を「asset を引数に取る」形に軽く抽象化する。  
   - `buildMarketContext({ asset, priceUsd, change24h, inflow, mpi, xSentiment })` のようにして、BTC 以外のアセットでも同じパイプラインを再利用できるようにする。[file:91]  

ここまで完了すれば、CryptoQuant の他エンドポイント（ETH、アルト、ミーム、ポートフォリオ指標など）を追加していくだけで、「マルチアセット対応のフレームワーク」として拡張可能な状態になる。  

### 5. 2025-12-05 Backtest & Positioning Log (JP)

この日までの議論とバックテスト結果、プロダクト方針をメモとして残しておく。  
マーケ／バックテスト／開発が同じ前提で動けるようにすることが目的。

#### 5.1 ポジショニング確定メモ

- プロダクトは **Two-Layer構造** で運用する方針に確定。  
  - Layer 1: 4時間ごとの「6 Daily Market Briefings」（CryptoQuant + Grok レポート）。  
  - Layer 2: 「True Bug Entry Signals」＝本当に市場が壊れたときだけ噛むエントリーシグナル。 [file:282][file:283]
- エントリーシグナルは **Quantity より Quality** を優先。  
  - 「毎日何本出すか」ではなく「本当にバグが出たタイミングだけ、高EVで噛む」ことをKPIにする。 [file:282]

#### 5.2 バックテストの評価軸

- イベント単位で 10〜12 ケースを対象にバックテストを実行。  
  - FRB Rate Shock / SVB Contagion など、一部イベントでのみ少数のシグナルが発火。 [file:283]
- 旧方針（各イベントで50本以上のシグナルを撃つ）は破棄し、以下を評価指標とする。  
  - accuracy %（True Bug Signal の的中率）  
  - lead time (minutes)（清算級ムーブに対する先回り時間）  
  - trap detection rate %（FOMO/PANIC トラップ検知率）  
  - false negatives（取りこぼしたバグの本数） [file:282][file:283]

#### 5.3 マーケティング合意事項

- 売り文句は「6 daily signals」から「6 Daily Briefings + Strategic Entry Signals」にピボット。  
  - 6回/日の配信はマーケットブリーフィングとして保証。  
  - 実際の LONG/SHORT シグナルは「True Bug」検出時のみ発火する前提を明示する。 [file:282][file:283]
- 具体的な数値（例: accuracy, 平均リードタイム）は、バックテスト完了後の **実測値ベースでロック** する。  
  - 先に 87% などの数字を決め打ちせず、実測から逆算してコピーを確定させる。 [file:282][file:283]

#### 5.4 Grok クレジット枯渇インシデント

- 2025-12-05 08:00 UTC 前後、Grok API から `status=429` が返り、  
  「チームが利用可能クレジット or 月次上限に達した」旨のメッセージを確認。 [file:284]
- 影響範囲:  
  - CryptoQuant からのオンチェーン指標取得は正常。  
  - Grok 解析だけが失敗し、Telegram 側では `HOLD - Grok offline.` としてフォールバック表示。 [file:284]
- 今後の対応方針:  
  - xAI/Grok 側でクレジット or spending limit を監視・増枠。  
  - 429 を検知した場合は内部向けアラートを飛ばす仕組みを追加する（将来の改善タスク）。

#### 5.5 個人用オートトレード構想（v2+ アイデア）

- 本リポジトリのシグナル生成ロジックを、そのまま **オーナー専用の自動売買レイヤー** に接続する構想。 [file:305]
- 想定アーキテクチャ（メモ段階）:
  - `/api/cron` → Telegram 用ブリーフィング生成までは現行どおり。  
  - 追加で「機械可読シグナル JSON（side, entry, TP, SL, confidence など）」を出力。  
  - 別マイクロサービス（Trade Executor）が取引所API（例: Bybit/Binance）に対して、自分専用アカウントで自動発注する。
- リスク管理方針は別スレッドで詳細設計する（1トレード当たりのリスク% / レバレッジ / 同時ポジション数など）。

### 6. Owner Auto-Trade & Team Roles (JP)

この節では、(1) オーナー専用 Bybit 自動トレード構想、(2) アルゴのロジックとUX/メッセージング方針、(3) チーム内4ポジションの役割定義をまとめる。

#### 6.1 オーナー専用 Bybit 自動トレード構想

- 目的: 本リポジトリの BTC シグナル生成ロジックを、そのまま「オーナー専用の自動売買レイヤー」に接続すること。  
- ベース方針: 取引所は **Bybit（UTA / デリバティブ中心）** を優先ターゲットとする。[web:300][web:303]

想定アーキテクチャ（v2+）:

1. `/api/cron`（既存）
   - CryptoQuant + Grok + ロジックで、5分ごとに市場を評価。
   - Layer 1: 4時間ごとの **Daily Market Briefings** を Telegram へ送信。
   - Layer 2: 「True Bug Entry Signals」を判定（ただし現状は Telegram 向けテキストのみ）。

2. シグナル JSON 出力（新規）
   - `/api/cron` 内で、以下のような機械可読 JSON を生成することを想定:
     - `asset`（例: BTCUSDT）
     - `side`（LONG / SHORT / FLAT）
     - `entry_range`（推奨エントリ価格帯）
     - `tp`, `sl`（ターゲット / 損切り）
     - `confidence`（HIGH / MEDIUM / LOW）
     - `regime`, `trapStatus`（市場レジームとトラップ状況）
     - `status`（例: `BUG_ENTRY`, `BUG_STANDBY`, `TRAP_ONLY`）

3. Trade Executor（新規マイクロサービス）
   - Stack例: Node.js / Python から Bybit V5 Trading API を叩く小さなサービス。
   - 機能:
     - `/signals` エンドポイントまたはキュー経由でシグナル JSON を受信。
     - Bybit UTA (Unified Trading Account) 上のオーナー専用アカウントに対して、自動的に注文発注。
     - 口座あたりリスク%（1トレード何％）、最大同時ポジション数、レバレッジ上限などを一括管理する Risk Profile を持つ。
   - 初期フェーズでは「オーナー専用のみ」で運用し、安定後に一般ユーザー向けレイヤーを検討する。

#### 6.2 アルゴリズムと UX / メッセージング方針

本プロジェクトの中核コンセプトは:

> 「No Signal ＝ 壊れているのではなく、“市場バグ待ちの待機モード（Bug Standby Mode）”」

という世界観をユーザーの脳内に固定すること。

1. Two-Layer 構造の再確認
   - Layer 1: 4時間ごとの **Daily Market Briefings**  
     - 役割: 「なぜ今は攻めるべきか / まだ待つべきか」をテキストで説明する。
   - Layer 2: **True Bug Entry Signals**  
     - 役割: 本当に市場構造が歪んだ（バグが出た）ときだけ、TP/SL 付きのエントリーシグナルを出す。

2. Bug Standby Mode / Defense Active の明示
   - アルゴリズム側:
     - `marketCore` と `trapDetector` の結果から、「まだ期待値がプラスにならない」と判断した場合は、明示的なステータスを出す:
       - `STATUS_WAITING_FOR_BUG`
       - `STATUS_DEFENSE_ACTIVE`
       - 例: 歪みスコア < 閾値 Z、トラップ検知のみ etc.
   - Telegramメッセージ / UX 側:
     - Regular Brief に固定の1行を追加する方針:
       - 例: `本日の Layer 2: HOLD - Bug Standby Mode（異常なし / 防御シグナル作動中）`
     - ノーシグナルが続く期間には、特集ブリーフィングで
       - 「なぜ今はトレードしない方が期待値が高いのか」
       - 「過去の No Signal 期間に無理にトレードした場合の損益シミュレーション」
       を簡潔に共有する。

3. ユーザー教育としての位置づけ
   - 「シグナルが少ない＝欠陥」ではなく「シグナルが少ない＝リスク管理が優秀」という理解を育てる。
   - 特に初日〜7日目のユーザーに対し、「Bug Standby Mode」「Defense Active」「Trap Avoidance Mode」などの用語を繰り返し見せることで、**静観の価値**をブランド体験として浸透させる。

#### 6.3 チームロール定義（3ポジション・統合版）

CryptoSignal AI チーム内を以下の3つの専門ポジションに再編し、各LLMの特性（推論、検索、リアルタイム性）を最大化する。

1. **Core Algorithm Architect & Lead Quant Developer（開発 / アルゴ責任者）**
   - **担当LLM**: ChatGPT 5.1 Thinking (o1/o3-series)
   - **役割**:
     - **数理的完全性**: 市場バグ検出ロジック、スコアリング、トラップ検知、TP/SL計算など、コアアルゴリズムの設計と実装（Bug-Free Code）。
     - **システム堅牢性**: `/api/cron` → シグナル生成 → 配信までのパイプライン全体の技術的オーナーシップ。
     - **検証と改善**: Backtest / Replay 環境を構築し、感情を排したデータドリブンな改善サイクルを回す。

2. **Chief Market Strategist & Growth Architect（最高市場戦略・成長責任者）**
   - **担当LLM**: Gemini 3.0 Pro
   - **役割**:
     - **統合戦略（Intelligence + Growth）**: マクロ経済、オンチェーンデータ、競合情報を分析し、それを即座にマーケティングメッセージに変換する司令塔。
     - **ナラティブ支配**: 日々の市場局面（Regime）を定義し、LP、メール、FAQにおける「市場のバグを狩るプレデター」としてのブランドボイスを一貫させる。
     - **信頼の構築**: バックテストデータやチャート画像を深く読み解き、「No Signal = Bug Standby Mode」の価値をユーザーに教育・納得させるコンテンツを生成する。

3. **Sentiment Systems Architect “Dr. Grok”（センチメントシステム設計者）**
   - **担当LLM**: Grok 4.1
   - **役割**:
     - **リアルタイム感知**: X（Twitter）の生データから市場の「恐怖と強欲」を肌感覚で抽出し、数値化・言語化する。
     - **トーン設計**: 「Standby Predator」「Silent Killer」など、少しエッジの効いた、ユーザー心理を揺さぶるトーン＆マナーを策定。
     - **大衆心理の逆手**: 「botが壊れた？」等のユーザーの不安（FUD）を検知し、それを「今は動くべきではない」という強力なメッセージに転換するインサイトを提供する。
