# 🎯 リアルタイム検証改善プラン

**作成日**: 2026-01-07  
**目的**: 6言語版Telegramメッセージのデータ一貫性を確保し、リアルタイム検証サイクルを実装

---

## 📊 現状の問題点（優先順位順）

### 🔴 最優先：データ不一致（即時修正必須）

1. **Market Scoreの不一致**
   - EN/ES/AR/JA: `-1/100`
   - PT-BR: `6/100`
   - KO: `3/100`
   - **原因**: 同一タイミングでも言語ごとに異なるscoreが計算/表示されている可能性

2. **価格表記の差異**
   - EN/PT-BR/JA: `$92,798`
   - ES/AR/KO: `$92,800`
   - **原因**: `formatUsd`の丸め処理や取得タイミングの差

3. **Dr. Grokセクションの内容が言語ごとに大きく異なる**
   - EN: 簡潔な分析
   - ES/PT-BR: 詳細な説明（5,000 tradersのVoz Común）
   - AR: 警告重視（70%の時間待機）
   - KO: キムチプレミアム追加
   - JA: Kaizen最適化レポート
   - **問題**: 同一データなのに分析内容が異なる = 検証不可能

### 🟡 高優先：リアルタイム検証要素の欠落

4. **検証可能な要素の欠落**
   - タイムスタンプ（`as_of`）の明示
   - データソース（`data_source`）の明示
   - スナップショットID（`snapshot_id`）の欠落
   - メッセージID（`message_id`）の欠落

5. **計測導線の欠落**
   - CTAリンクにUTM/refパラメータなし
   - A/Bテストのバリアント識別子なし
   - クリック/登録/継続の計測不可

---

## 🛠️ 改善実装プラン

### Phase 1: データ統合（Day 1-2）✅ **実装完了**

#### 1-1. Single Source of Truth (SSOT) の実装 ✅ **完了**

**目標**: 全言語で同一のデータソースから取得

**実装状況**: ✅ 完了（2026-01-07）

1. **Market Snapshot Service の作成** ✅
   ```javascript
   // services/core/marketSnapshot.js (新規作成)
   
   /**
    * Market Snapshot生成サービス
    * 全言語で同一のsnapshot_idを参照する
    */
   class MarketSnapshotService {
     constructor() {
       this.snapshots = new Map(); // メモリキャッシュ（本番はRedis推奨）
     }
   
     /**
      * スナップショット生成（5分ごと）
      */
     async createSnapshot({
       priceUsd,
       change24h,
       inflow,
       mpi,
       sentimentLabel,
       xSentiment,
       market,
     }) {
       const snapshotId = `snapshot_${Date.now()}`;
       const asOf = new Date().toISOString();
       
       // コアスコア計算（全言語共通）
       const ctx = buildMarketContext({
         asset: 'BTC',
         priceUsd,
         change24h,
         inflow,
         mpi,
         xSentiment,
         market: 'EN', // ベースはEN、市場別補正は後で適用
       });
       
       const coreDecision = decideSignal(ctx);
       
       // 価格の統一丸めルール
       const priceDisplay = Math.round(priceUsd);
       
       const snapshot = {
         snapshot_id: snapshotId,
         as_of_utc: asOf,
         symbol: 'BTC',
         price_usd_raw: priceUsd,
         price_usd_display: priceDisplay,
         change_24h: change24h,
         market_score: Math.round(coreDecision.score),
         market_score_version: 'v1.2',
         trap_score: trap?.score ?? 0,
         signal: coreDecision.signal,
         confidence: coreDecision.confidence,
         inflow,
         mpi,
         sentiment_label: sentimentLabel,
         x_sentiment: xSentiment,
         // 市場別オプション
         local_optional: {
           kimchi_premium: null, // KO市場のみ
           whale_flows: null, // EN市場のみ
           liquidations: null, // EN市場のみ
         },
       };
       
       this.snapshots.set(snapshotId, snapshot);
       return snapshot;
     }
   
     getSnapshot(snapshotId) {
       return this.snapshots.get(snapshotId);
     }
   }
   
   module.exports = new MarketSnapshotService();
   ```

2. **api/cron.js の修正** ✅
   - `services/core/marketSnapshot.js`をインポート
   - xSentiment取得後、スナップショット生成（EN市場基準で統一スコア計算）
   - 市場別オプションデータ（KO: kimchiPremium、EN: trapScore/whaleFlows/liquidations）をスナップショットに追加
   - `formatRegularBriefing`に`snapshot`を渡す

#### 1-2. テンプレート関数の統一 ✅

**全言語テンプレートでsnapshotを参照** ✅

**実装状況**: ✅ 完了（全6言語テンプレート修正済み）

```javascript
// services/telegram/messages/user/en/regular.en.js の修正例

function formatRegularBriefing({
  snapshot, // 新規: スナップショット全体
  aiAnalysis,
  lang = 'en',
}) {
  // snapshotから統一データを取得
  const unifiedPrice = snapshot?.price_usd_display ?? priceUsd;
  const unifiedScore = snapshot?.market_score ?? score;
  const unifiedInflow = snapshot?.inflow ?? inflow;
  const unifiedMpi = snapshot?.mpi ?? mpi;
  const unifiedSentiment = snapshot?.sentiment_label ?? sentimentLabel;
  const unifiedChange24h = snapshot?.change_24h ?? change24h;
  
  // 統一データを使用してメッセージ生成
  const priceLine = `💰 BTC Price: ${formatUsd(unifiedPrice)} ...`;
  const scoreLine = `📈 Market Score: ${unifiedScore}/100`;
    inflow,
    mpi,
    sentiment_label,
    local_optional,
  } = snapshot;
  
  const ts = new Date(as_of_utc).toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
  
  // 全言語で同一フォーマット
  const priceLine = `💰 BTC Price: ${formatUsd(price_usd_display)} (${formatPercent(change_24h)} / 24h)`;
  const scoreLine = `📈 Market Score: ${market_score}/100`;
  
  // ... 以下、既存の処理 ...
  
  // フッターに検証情報を追加
  lines.push('');
  lines.push(`📊 Snapshot: ${snapshot_id} | Source: CryptoQuant API | Updated: ${ts}`);
  
  return lines.join('\n');
}
```

---

### Phase 2: リアルタイム検証サイクル（Day 3-7）✅ **実装完了**

#### 2-1. A/Bテスト基盤の実装 ✅ **完了**

**目標**: バリアント別の計測が可能になる

**実装状況**: ✅ 完了（2026-01-07）

**実装内容**:

1. **メッセージ送信時のバリアント識別**
   ```javascript
   // api/cron.js
   
   // A/Bテスト設定
   const AB_VARIANTS = ['A', 'B']; // 将来的にC, Dも追加可能
   const variant = Math.random() < 0.5 ? 'A' : 'B'; // 50/50分割
   
   const messageId = `msg_${Date.now()}_${LANG}_${variant}`;
   
   // メッセージにバリアント情報を埋め込み
   const regularText = formatRegularBriefing({
     snapshot,
     aiAnalysis,
     lang: LANG,
     variant, // バリアント識別子
     messageId,
   });
   
   // 送信ログに記録
   await logMessage({
     message_id: messageId,
     snapshot_id: snapshot.snapshot_id,
     lang: LANG,
     variant,
     sent_at: new Date().toISOString(),
   });
   ```

2. **CTAリンクの計測対応**
   ```javascript
   // テンプレート内
   const ctaLink = `https://cryptotradeacademy.io/start?ref=${lang}_${variant}_${messageId}&snapshot=${snapshot_id}`;
   lines.push(`🔗 Get Started: ${ctaLink}`);
   ```

#### 2-2. 計測ダッシュボード（最小構成）

**実装**:

```javascript
// api/analytics.js (新規作成)

/**
 * リアルタイム検証用の計測API
 */
export default async function handler(req, res) {
  const { snapshot_id, lang, variant, time_window = '24h' } = req.query;
  
  // メッセージ送信ログから集計
  const metrics = await aggregateMetrics({
    snapshot_id,
    lang,
    variant,
    time_window,
  });
  
  // KPI返却
  return res.json({
    snapshot_id,
    lang,
    variant,
    metrics: {
      sent: metrics.sent_count,
      clicked: metrics.click_count,
      ctr: metrics.click_count / metrics.sent_count,
      started: metrics.start_count,
      subscribed: metrics.subscribe_count,
      blocked: metrics.block_count,
      retention_d1: metrics.retention_d1,
    },
  });
}
```

---

### Phase 3: Dr. Grokセクションの統一（Week 2）

#### 3-1. コア分析の統一

**目標**: 全言語で同一の論理構造

**実装**:

```javascript
// services/ai/grokAnalysis.js (新規作成)

/**
 * Dr. Grok分析の統一生成
 * 全言語で同一のコア分析 + ローカル補足
 */
async function generateUnifiedGrokAnalysis(snapshot, lang) {
  // コア分析（全言語共通）
  const coreAnalysis = {
    verdict: snapshot.signal === 'BUY' ? 'BULLISH' : snapshot.signal === 'SELL' ? 'BEARISH' : 'NEUTRAL',
    why: {
      score: snapshot.market_score,
      trend: snapshot.change_24h >= 0 ? 'UP' : 'DOWN',
      volatility: Math.abs(snapshot.change_24h) > 2 ? 'HIGH' : 'LOW',
    },
    watch: {
      risk: snapshot.trap_score >= 60 ? 'HIGH' : snapshot.trap_score >= 40 ? 'MODERATE' : 'LOW',
      support: snapshot.price_usd_display * 0.98, // 仮計算
      resistance: snapshot.price_usd_display * 1.02, // 仮計算
    },
  };
  
  // ローカル補足（言語別）
  const localAddon = getLocalAddon(lang, snapshot);
  
  // 翻訳辞書で各言語に変換
  return translateGrokAnalysis(coreAnalysis, localAddon, lang);
}

function getLocalAddon(lang, snapshot) {
  switch (lang) {
    case 'ko':
      return snapshot.local_optional.kimchi_premium != null
        ? `🥟 김치 프리미엄: ${(snapshot.local_optional.kimchi_premium * 100).toFixed(2)}%`
        : null;
    case 'ar':
      return '⚠️ 70%の時間、待機が最適。リスク > リワードの時はエントリーしない。';
    default:
      return null;
  }
}
```

---

## 📋 実装チェックリスト

### ✅ 即時対応（今日）

- [ ] `marketSnapshot.js` サービスの作成
- [ ] `api/cron.js` でスナップショット生成を統合
- [ ] 全言語テンプレートで `snapshot` を参照するように修正
- [ ] 価格表示の統一（`price_usd_display` を使用）
- [ ] Market Scoreの統一（`market_score` を使用）

### ✅ 短期対応（今週）

- [ ] A/Bテスト基盤の実装
- [ ] CTAリンクにUTM/refパラメータ追加
- [ ] メッセージ送信ログの記録
- [ ] 計測API（`api/analytics.js`）の作成

### ✅ 中期対応（来週）

- [ ] Dr. Grok分析の統一生成
- [ ] ローカル補足の最適化
- [ ] 計測ダッシュボード（最小構成）
- [ ] A/Bテスト運用開始

---

## 🎯 期待される効果

1. **データ一貫性**: 全言語で同一データ = 検証可能
2. **検証サイクル**: A/Bテストで勝ちパターンを発見
3. **継続改善**: リアルタイムで最適化

---

## 📝 次のステップ

1. このプランに基づいて実装を開始
2. 各Phase完了後に検証
3. 改善サイクルを回す
