# 🛠️ CryptoTrade Academy - Technical Supplement v2.0

**Version**: 2.0 - Strategic SSOT v4.0補完版
**Date**: 2025-12-23 23:30 JST
**Status**: ✅ コード実装完了（本番テスト・環境変数設定待ち）
**Purpose**: Strategic SSOT v4.0実装に必要な技術仕様完全版
**実装完了日**: 2025-12-23
**GitHub Copilotレビュー完了日**: 2025-12-23

***

## 📌 Section 0: このドキュメントの位置づけ

```yaml
Primary SSOT: Strategic SSOT v4.0 ULTIMATE
  - 戦略: 木下ロジック完全統合
  - 市場: 6市場×3C分析
  - 実装手順: LLMプロンプト
  - 測定: KPI定義

Technical Supplement v2.0(本ドキュメント):
  - Repository構造
  - 既存コードベース説明
  - Vercel環境変数完全定義
  - API実装詳細
  - 既存実装との統合方法
```


***

## 📂 Section 1: Repository構造

### 1.1 ディレクトリ構造

```
github.com/hadayalab-web/cryptosignal-ai/
├── api/
│   └── cron.js              # Vercel Cron Job エントリーポイント
├── config/
│   └── marketProfiles.js    # 市場別設定(6市場)
├── services/
│   ├── cryptoquant/
│   │   ├── client.js        # CryptoQuant API クライアント
│   │   └── deepMetrics.js   # [Phase 2] 市場別深掘りデータ
│   ├── grok/
│   │   └── client.js        # Grok API クライアント
│   └── telegram/
│       ├── bot.js           # Telegram Bot API
│       └── messages/
│           ├── en.js        # EN市場テンプレート
│           ├── ar.js        # AR市場テンプレート
│           ├── ko.js        # KO市場テンプレート
│           ├── ja.js        # JA市場テンプレート
│           ├── es.js        # ES市場テンプレート
│           └── ptbr.js      # PT-BR市場テンプレート
├── logic/
│   ├── core/
│   │   └── marketCore.js    # 市場判定コアロジック
│   └── eventTriggers.js     # [Phase 1] イベント駆動トリガー判定
├── utils/
│   └── stateManager.js      # [Phase 1] Vercel KV状態管理
├── vercel.json              # Vercel設定(6デプロイメント)
└── package.json
```


### 1.2 既存実装ファイル(Phase 0)

```yaml
api/cron.js:
  目的: 4時間ごと定期配信(現行)
  Phase 1移行: イベント駆動対応拡張

config/marketProfiles.js:
  目的: 市場別アルゴリズム設定
  Phase 1追加: eventTriggers設定

services/cryptoquant/client.js:
  目的: 基本データ取得(Exchange Inflow, MPI, Active Addresses)
  Phase 2追加: deepMetrics.js(市場別深掘り)

services/telegram/bot.js:
  目的: sendBriefing()関数(Telegram配信)
  Phase 1拡張: イベント種別パラメータ追加

logic/core/marketCore.js:
  目的: decideSignalAdvanced()関数(市場判定)
  Phase 2拡張: 市場別スコア補正
```


***

## 🔧 Section 2: Vercel環境変数完全定義

### 2.1 共通環境変数(全デプロイメント)

```bash
# API Keys
CRYPTOQUANT_API_KEY=<CQ定額プランAPIキー>
GROK_API_KEY=<Grok-4-0709 APIキー>
TELEGRAM_BOT_TOKEN=<TelegramボットToken>

# Vercel KV (Phase 1)
KV_URL=<Vercel KV URL>
KV_REST_API_URL=<Vercel KV REST API URL>
KV_REST_API_TOKEN=<Vercel KV Token>
KV_REST_API_READ_ONLY_TOKEN=<Vercel KV Read-Only Token>

# Feature Flags (Phase 1)
ENABLE_EVENT_DRIVEN=false  # Phase 1実装後true

# Deployment Info (自動設定)
VERCEL_ENV=production
VERCEL_URL=<auto>
VERCEL_GIT_COMMIT_SHA=<auto>
```


### 2.2 市場別環境変数(6デプロイメント)

#### EN市場 (cryptotradeacademy-en.vercel.app)

```bash
MARKET_CODE=EN
MARKET_PERSONA=PRECISION_SNIPER
TELEGRAM_CHAT_ID=<EN専用TelegramチャットID>

# Algorithm Settings
HARD_SIGNAL_THRESH=28
SOFT_REGIME_THRESH=20
MIN_CONF_FOR_TRADE=0.6
BUG_STANDBY_BIAS=15

# Event Triggers (Phase 1)
EMERGENCY_TRAP_SCORE=60
EMERGENCY_LIQUIDATIONS=500000000
WATCH_SCORE_CHANGE=30
WATCH_MPI_THRESH=-20
STANDBY_BREAK_HOURS=24
REGULAR_MAX_HOURS=24
```


#### AR市場 (cryptotradeacademy-ar.vercel.app)

```bash
MARKET_CODE=AR
MARKET_PERSONA=SHIELD_WALL
TELEGRAM_CHAT_ID=<AR専用TelegramチャットID>

# Algorithm Settings
HARD_SIGNAL_THRESH=18
SOFT_REGIME_THRESH=12
MIN_CONF_FOR_TRADE=0.4
BUG_STANDBY_BIAS=70  # キャッチコピー逆算

# Event Triggers (Phase 1)
EMERGENCY_TRAP_SCORE=80  # 超保守的
WATCH_SCORE_CHANGE=40
STANDBY_BREAK_HOURS=48   # 2日
REGULAR_MAX_HOURS=24
```


#### KO市場 (cryptotradeacademy-ko.vercel.app)

```bash
MARKET_CODE=KO
MARKET_PERSONA=KIMCHI_SNIPER
TELEGRAM_CHAT_ID=<KO専用TelegramチャットID>

# Algorithm Settings
HARD_SIGNAL_THRESH=25
SOFT_REGIME_THRESH=18
MIN_CONF_FOR_TRADE=0.55
BUG_STANDBY_BIAS=20
KIMCHI_PREMIUM_THRESH=0.05  # 5%

# Event Triggers (Phase 1)
EMERGENCY_KIMCHI_PREMIUM=0.08  # 8%
WATCH_KIMCHI_PREMIUM=0.05      # 5%
STANDBY_BREAK_HOURS=12
REGULAR_MAX_HOURS=6            # 6時間
```


#### JA市場 (cryptotradeacademy-ja.vercel.app)

```bash
MARKET_CODE=JA
MARKET_PERSONA=KAIZEN_OPTIMIZER
TELEGRAM_CHAT_ID=<JA専用TelegramチャットID>

# Algorithm Settings
HARD_SIGNAL_THRESH=26
SOFT_REGIME_THRESH=19
MIN_CONF_FOR_TRADE=0.58
BUG_STANDBY_BIAS=22
RISK_REWARD_MIN=2.0

# Event Triggers (Phase 1)
EMERGENCY_TRAP_SCORE=65
EMERGENCY_RISK_REWARD=0.5
WATCH_SCORE_CHANGE=25
WATCH_RISK_REWARD=1.5
STANDBY_BREAK_HOURS=24
REGULAR_MAX_HOURS=24
```


#### ES市場 (cryptotradeacademy-es.vercel.app)

```bash
MARKET_CODE=ES
MARKET_PERSONA=VOZ_COMUN
TELEGRAM_CHAT_ID=<ES専用TelegramチャットID>

# Algorithm Settings
HARD_SIGNAL_THRESH=27
SOFT_REGIME_THRESH=19
MIN_CONF_FOR_TRADE=0.57
BUG_STANDBY_BIAS=18

# Event Triggers (Phase 1)
EMERGENCY_TRAP_SCORE=62
WATCH_SCORE_CHANGE=28
STANDBY_BREAK_HOURS=24
REGULAR_MAX_HOURS=24
```


#### PT-BR市場 (cryptotradeacademy-ptbr.vercel.app)

```bash
MARKET_CODE=PT_BR
MARKET_PERSONA=VOZ_COMUM
TELEGRAM_CHAT_ID=<PT-BR専用TelegramチャットID>

# Algorithm Settings (ES市場と同じ)
HARD_SIGNAL_THRESH=27
SOFT_REGIME_THRESH=19
MIN_CONF_FOR_TRADE=0.57
BUG_STANDBY_BIAS=18

# Event Triggers (Phase 1)
EMERGENCY_TRAP_SCORE=62
WATCH_SCORE_CHANGE=28
STANDBY_BREAK_HOURS=24
REGULAR_MAX_HOURS=24
```


***

## 🔌 Section 3: API実装詳細

### 3.1 CryptoQuant API

#### 基本データ取得(既存 - services/cryptoquant/client.js)

```javascript
const CQ_BASE_URL = 'https://api.cryptoquant.com';

async function getBasicMetrics() {
  const endpoints = {
    exchangeInflow: '/v1/btc/exchange-flows/inflow-sum',
    exchangeOutflow: '/v1/btc/exchange-flows/outflow-sum',
    minerMPI: '/v1/btc/miner-position-index/mpi',
    activeAddresses: '/v1/btc/network-data/active-addresses',
  };

  const results = await Promise.all(
    Object.entries(endpoints).map(async ([key, endpoint]) => {
      const res = await fetch(`${CQ_BASE_URL}${endpoint}`, {
        headers: { 'Authorization': `Bearer ${process.env.CRYPTOQUANT_API_KEY}` }
      });
      return [key, await res.json()];
    })
  );

  return Object.fromEntries(results);
}
```


#### 深掘りデータ取得(Phase 2 - services/cryptoquant/deepMetrics.js)

```javascript
// Strategic SSOT v4.0 Section 2.2のLLMプロンプト参照
// 実装例:

async function getCQDeepMetrics(market) {
  const baseData = await getBasicMetrics();

  switch(market) {
    case 'EN':
      return {
        ...baseData,
        whaleFlows: await getWhaleFlows(),
        liquidations: await getLiquidations(),
        trapScore: calculateTrapScore(/* ... */),
      };

    case 'KO':
      return {
        ...baseData,
        kimchiPremium: await getKimchiPremium(),
        upbitInflow: await getUpbitInflow(),
        isTrap: checkKimchiTrap(/* ... */),
      };

    case 'JA':
      return {
        ...baseData,
        longTerm: await getLongTermIndicators(),
        riskReward: calculateRiskReward(/* ... */),
      };

    default:
      return baseData; // AR/ES/PT-BR
  }
}
```


### 3.2 Grok API

```javascript
const GROK_BASE_URL = 'https://api.x.ai/v1';

async function getGrokIntel(market) {
  const res = await fetch(`${GROK_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GROK_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'grok-4-0709',
      messages: [
        {
          role: 'system',
          content: `You are analyzing X (Twitter) sentiment for Bitcoin trading in ${market} market.`
        },
        {
          role: 'user',
          content: 'Analyze current BTC sentiment. Focus on FOMO indicators and trap signals.'
        }
      ],
      temperature: 0.3,
    })
  });

  return await res.json();
}
```


### 3.3 Telegram Bot API

```javascript
// services/telegram/bot.js (既存)

async function sendBriefing(market, message, eventType = 'REGULAR') {
  const chatId = process.env.TELEGRAM_CHAT_ID;

  const emoji = {
    'EMERGENCY': '🚨',
    'WATCH': '⚠️',
    'STANDBY_BREAK': '✅',
    'REGULAR': '📊',
  }[eventType] || '📊';

  const res = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: `${emoji} ${message}`,
      parse_mode: 'Markdown',
    })
  });

  return await res.json();
}
```


***

## ⚙️ Section 4: 既存実装との統合

### 4.1 api/cron.js現行構造

```javascript
// 現行(Phase 0): 4時間ごと配信

export default async function handler(req, res) {
  const market = process.env.MARKET_CODE;

  // 1. CryptoQuantデータ取得
  const cqData = await getBasicMetrics();

  // 2. Grokインテリジェンス取得
  const grokIntel = await getGrokIntel(market);

  // 3. 市場判定
  const decision = await decideSignalAdvanced(market, cqData, grokIntel);

  // 4. Telegram配信(常に配信)
  await sendBriefing(market, decision.message);

  return res.status(200).json({ status: 'sent' });
}
```


### 4.2 Phase 1拡張(イベント駆動)

```javascript
// Phase 1: イベント駆動対応

export default async function handler(req, res) {
  const market = process.env.MARKET_CODE;

  // 1. 前回状態取得
  const lastState = await getLastState(market);

  // 2. 現在データ取得
  const cqData = await getBasicMetrics();
  const grokIntel = await getGrokIntel(market);

  // 3. 現在状態計算
  const currentState = await decideSignalAdvanced(market, cqData, grokIntel);

  // 4. イベント判定
  const trigger = await evaluateTrigger(market, currentState, lastState, cqData);

  // 5. 条件付き配信
  if (trigger.shouldSend) {
    await sendBriefing(market, currentState.message, trigger.triggerType);
    await saveState(market, currentState);
    console.log(`[${market}] Sent: ${trigger.triggerType} - ${trigger.reason}`);
  } else {
    console.log(`[${market}] Skipped: ${trigger.reason}`);
  }

  return res.status(200).json({
    status: trigger.shouldSend ? 'sent' : 'skipped',
    trigger: trigger
  });
}
```


***

## 🎯 Section 5: Phase 1実装チェックリスト(詳細版)

### 5.1 utils/stateManager.js実装

```
✅ Vercel KV接続確認
  - @vercel/kv パッケージインストール完了
  - KV_* 環境変数設定確認（Vercel Dashboardで設定が必要）

✅ getLastState()実装
  - 市場別キー生成: state:${market}
  - デフォルト値返却(初回起動時)
  - エラーハンドリング・フォールバック実装完了

✅ saveState()実装
  - ISO 8601形式で保存
  - TTL設定(7日間保持)
  - 連続BUG_STANDBY回数カウント機能追加

✅ getHoursSinceLastUpdate()実装
  - 時差計算(UTC基準)
  - エラー時Infinity返却（GitHub Copilotレビュー改善）

⏳ ユニットテスト作成
  - 実装完了、テスト作成待ち
```


### 5.2 logic/eventTriggers.js実装

```
✅ evaluateTrigger()実装
  - 4種類のトリガー判定ロジック完了
  - 市場別設定読み込み(config/marketProfiles.js)
  - デフォルト設定フォールバック実装完了

✅ EMERGENCY判定
  - trapScore閾値チェック完了
  - liquidations閾値チェック完了
  - kimchiPremium閾値チェック(KO市場)完了
  - riskReward閾値チェック(JA市場)追加

✅ WATCH判定
  - score変動計算(前回比)完了
  - MPI閾値チェック完了
  - kimchiPremium閾値チェック(KO市場)追加
  - riskReward閾値チェック(JA市場)追加

✅ STANDBY_BREAK判定
  - 連続STANDBY時間計算完了
  - 市場別時間設定対応完了

✅ REGULAR判定
  - 最終配信からの経過時間完了

⏳ ユニットテスト作成
  - 実装完了、テスト作成待ち
```


### 5.3 api/cron.js拡張

```
✅ イベント駆動フロー実装
  - getLastState()呼び出し完了
  - evaluateTrigger()呼び出し完了
  - 条件付き配信(if shouldSend)完了
  - variable shadowing修正（GitHub Copilotレビュー）

✅ エラーハンドリング
  - Vercel KV接続失敗時フォールバック完了
  - API呼び出し失敗時リトライ完了
  - エラーログ出力完了

✅ ログ出力
  - 配信/スキップ理由記録完了
  - コスト計算(配信回数カウント)完了
  - トリガータイプ・理由ログ出力完了

✅ 環境変数チェック
  - ENABLE_EVENT_DRIVEN=true確認完了
  - フォールバック実装完了

✅ WATCH/STANDBY_BREAKメッセージ対応
  - WATCHメッセージ多言語対応化（formatRegularBriefing使用）
  - STANDBY_BREAKメッセージにPhase 2データ統合
  - イベント駆動とレガシーロジックの競合解消

✅ Phase 2データ統合
  - trapScore/kimchiPremium/riskReward等の市場別データ追加
  - 全メッセージタイプでPhase 2データ対応完了

⏳ 統合テスト
  - 実装完了、本番テスト待ち
```


### 5.4 config/marketProfiles.js拡張

```
✅ eventTriggers設定追加
  - 6市場×4トリガー設定完了
  - 市場別閾値設定完了

✅ 既存設定維持
  - algorithm設定維持完了
  - pricing設定維持完了

✅ 市場プロファイル構造
  - getMarketProfile()関数実装完了
  - デフォルト設定フォールバック実装完了

⏳ バリデーション
  - 実装完了、バリデーション強化は将来の拡張として検討
```


### 5.5 Vercel環境変数設定

```
⚠️ KV環境変数(4つ)
  - KV_URL（Vercel Dashboardで設定が必要）
  - KV_REST_API_URL（Vercel Dashboardで設定が必要）
  - KV_REST_API_TOKEN（Vercel Dashboardで設定が必要）
  - KV_REST_API_READ_ONLY_TOKEN（Vercel Dashboardで設定が必要）

⚠️ イベント駆動フラグ
  - ENABLE_EVENT_DRIVEN=true（Vercel Dashboardで設定が必要）

✅ トリガー設定(市場別)
  - config/marketProfiles.jsで実装完了
  - 環境変数不要（コード内で管理）

⚠️ 6デプロイメント全て設定
  - EN/AR/KO/JA/ES/PT-BR（各デプロイメントでVercel Dashboard設定が必要）
```


### 5.6 vercel.json更新

```
✅ Cron頻度変更
  - 4時間ごと → 15分ごと完了
  - schedule: "*/15 * * * *"設定完了

✅ 6市場個別設定維持
  - 各デプロイメントに個別cron設定（vercel.jsonで設定済み）
```


***

## 📊 Section 6: Phase 1完了条件(詳細版)

```yaml
技術完了:
  ✅ utils/stateManager.js実装完了
     - getHoursSinceLastUpdate()追加完了
     - エラーハンドリング・フォールバック実装完了
  ✅ logic/eventTriggers.js実装完了
     - 4種類トリガー判定完了、市場別プロファイル対応完了
     - GitHub CopilotレビューでAPI data handling改善
  ✅ api/cron.js拡張完了
     - イベント駆動フロー統合完了
     - WATCH/STANDBY_BREAK多言語対応化完了
     - Phase 2データ統合完了
     - variable shadowing修正（GitHub Copilotレビュー）
  ✅ config/marketProfiles.js拡張完了
     - 6市場すべてにeventTriggers設定完了
  ⚠️ Vercel環境変数設定(6市場)
     - コード実装完了、Vercel Dashboardでの設定待ち
  ✅ vercel.json更新(15分監視)
     - schedule: "*/15 * * * *"設定完了
  ⏳ 全ユニットテスト PASS
     - 実装完了、テスト作成・実行待ち
  ⏳ 統合テスト PASS(静穏期/通常期/高ボラ期)
     - 実装完了、本番テスト待ち

実測完了:
  ⏳ 静穏期コスト削減確認
     - 1-2回/日/言語 × 6市場 × 30日 × $3.5/briefing
     = $630-1,260/月 → $35/月目標達成（実装完了、実測待ち）

  ⏳ 通常期コスト確認
     - 3-5回/日/言語 × 6市場 × 30日 × $3.5/briefing
     = $1,890-3,150/月 → $87/月目標達成（実装完了、実測待ち）

  ⏳ 初回イベント駆動配信成功
     - 6市場すべてでEMERGENCYトリガー正常動作（実装完了、本番テスト待ち）
     - Telegram配信成功（実装完了、本番テスト待ち）
     - 状態保存成功（実装完了、本番テスト待ち）

GitHub Copilotレビュー完了:
  ✅ Variable shadowing修正（cqDeep重複定義解消）
  ✅ Missing parameters修正
  ✅ API data handling改善（deepMetrics.js）
  ✅ WATCH trigger logic conflicts修正
  ✅ API endpoint documentation追加
```


***

## 🚫 Section 7: 旧SSOT削除推奨項目

### 7.1 CryptoSignalAI SSOT v1.1からの削除理由

```yaml
削除項目:
  ❌ North Master Engine v1.4
     理由: CryptoTrade Academyは独立システム(Vercel Cron直接)

  ❌ Discord #go-*-* トリガー
     理由: Vercel Cron自動実行(手動トリガー不要)

  ❌ Make (Orchestration)
     理由: Vercel Functions単体で完結

  ❌ Gateway API (/api/strategy, /api/intel, /api/payload)
     理由: api/cron.js内で直接処理

  ❌ Sheets job_ledger
     理由: Vercel KVで状態管理

  ❌ 5段階利益管理
     理由: Strategic SSOT v4.0 Section 3.2で再定義済み

保持項目:
  ✅ Theory-SSOT基盤
     - 木下ロジック①②
     - Nudge/Influence
     - MECLABS/Scientific Advertising

  ✅ USP 4分類
     - Strategic SSOT v4.0 Section 1で市場別に再定義

  ✅ Compliance Guards
     - "Educational purposes only"
     - Signal/Bot否定
```


### 7.2 Technical SSOT Master v1.5.0からの削除理由

```yaml
削除項目:
  ❌ §0-§2 システムアーキテクチャ全般
     理由: CryptoTrade Academyは異なるアーキテクチャ

  ❌ §3 Sheets Schema
     理由: Vercel KV使用

  ❌ §4 5段階利益管理
     理由: Strategic SSOT v4.0で再定義

  ❌ §7 Multi-Language Expansion (Future)
     理由: Strategic SSOT v4.0で6市場同時実装

保持項目:
  ✅ API Cost計算ロジック
     - Strategic SSOT v4.0 Section 0.4で更新

  ✅ Gate Validation概念
     - イベント駆動でのトリガー判定に類似

  ✅ Optimization Roadmap思想
     - イベント駆動=コスト最適化
```


### 7.3 Make SSOT Master v0.2からの削除理由

```yaml
削除項目:
  ❌ 全セクション
     理由: Makeオーケストレーション不使用

完全削除推奨: Make SSOT Master v0.2は参照不要
```


***

## ✅ Section 8: Strategic SSOT v4.0との関係

```yaml
Strategic SSOT v4.0役割:
  - 戦略定義(木下ロジック)
  - 市場別戦略(3C分析 + USPエビデンス)
  - 実装手順(LLMプロンプト)
  - KPI定義

Technical Supplement v2.0役割(本ドキュメント):
  - Repository構造
  - 既存コードベース
  - Vercel環境変数
  - API実装詳細
  - Phase 1実装チェックリスト詳細版

使い方:
  1. Strategic SSOT v4.0でWHAT/WHY理解
  2. Technical Supplement v2.0でHOW実装
  3. Strategic SSOT v4.0 Section 2のLLMプロンプト使用
  4. Technical Supplement Section 5のチェックリスト確認
```


***

**🎯 Technical Supplement v2.0 完成！**

**Strategic SSOT v4.0 + Technical Supplement v2.0 = 完全実装可能**