# シグナルロジック レビュー結果と最適化計画
**最終更新**: 2026-01-17 14:07:03  
**作成日時**: 2026-01-17 14:07:03  

**作成日**: 2026-01-17
**レビュー範囲**: シグナル生成ロジック全体

---

## 📊 現状分析

### 1. シグナル品質メトリクス

**現在のShortシグナル品質**:
- **勝率**: 33.3% (目標: 80%)
- **サンプル数**: 3件 (最小要件: 30件)
- **ステータス**: `pass: false` (配信ブロック中)

**問題点**:
- サンプル数が極端に少なく、統計的に信頼できない
- 勝率が目標の半分以下で、実運用に不適切
- メトリクスが更新されても改善が見られない

---

## 🔍 コード構造レビュー

### 1. シグナル検出ロジックの並行実装

#### 1.1 `divergenceDetector.js`
- **目的**: ダイバージェンスベースのシグナル検出（80%勝率目標）
- **特徴**:
  - CryptoQuantオンチェーンデータ + Xセンチメント解析
  - 高勝率条件（`isHighWinRateSellCondition`）を定義
  - 信頼度70%以上で優先扱い
- **課題**: 
  - 実測勝率との乖離（理論vs実績）
  - 複数のダイバージェンス条件が複雑

#### 1.2 `trendReversalDetector.js`
- **目的**: 早期トレンド反転検出（統計的手法）
- **特徴**:
  - `FeatureEngine`による特徴量正規化
  - `shouldFireSellShort`ゲートで厳格な閾値適用
  - リード/ラグ推定によるタイミング最適化
- **課題**:
  - `api/cron.js`での使用状況が不明確
  - 他の検出ロジックとの統合が不透明

#### 1.3 `marketCore.js`
- **目的**: コア意思決定ロジック（統合ハブ）
- **特徴**:
  - 複数のスコア（Netflow, MPI, Social）を統合
  - `DivergenceDetector`のシグナルを優先（信頼度≥70%）
  - 伝統的なトラップ検出ロジックへのフォールバック
- **課題**:
  - ロジックが複雑で保守困難
  - 複数の検出器からのシグナル優先順位が不明確

### 2. 信頼度（Confidence）計算の分散

**問題**:
- 信頼度計算ロジックが複数ファイルに分散
  - `divergenceDetector.js`: ダイバージェンス強度ベース
  - `marketCore.js`: スコア統合ベース
  - `trendReversalDetector.js`: 統計確率ベース（`score.p`）
- 統一的な信頼度スケールがない

**影響**:
- 閾値比較が不正確になる可能性
- `MIN_CONF_FOR_TRADE`（0.45）の意味が検出器ごとに異なる

### 3. 閾値管理の複雑さ

#### 3.1 `thresholds.js`
```javascript
BASE: {
  HARD_SIGNAL_THRESH: 24,        // 28 → 24 に緩和
  SOFT_REGIME_THRESH: 18,         // 20 → 18 に緩和
  MIN_CONF_FOR_TRADE: 0.45,       // 0.5 → 0.45 に緩和
}
```

#### 3.2 `marketProfiles.js`
各市場プロファイルで個別に閾値を上書き可能:
```javascript
algorithm: {
  HARD_SIGNAL_THRESH: 24,
  SOFT_REGIME_THRESH: 18,
  MIN_CONF_FOR_TRADE: 0.45,
  BUG_STANDBY_BIAS: 10,  // 15 → 10 に削減
}
```

**問題**:
- 閾値が複数の場所で定義され、一貫性が保たれにくい
- 最近の緩和によりシグナル数は増加したが、勝率改善には至っていない
- 緩和が品質低下を招いている可能性

### 4. シグナル品質ゲート（`signalQualityGate.js`）

**実装状況**: ✅ 完了
- 80%勝率要件を強制
- サンプル数30件未満でブロック

**課題**:
- 現在の勝率が33%で、ゲートにより全てのSELL/SHORTシグナルがブロックされている
- サンプル数が3件のみで、改善評価ができない
- **メトリクス生成→評価→ブロック**のループから抜け出せない

---

## 🎯 最適化案

### 優先度1: Shortシグナル品質の根本改善

#### 1.1 シグナル検出ロジックの統合と単純化

**現状の問題**:
- 3つの検出ロジックが並行実装され、優先順位が不明確
- ロジック間で信頼度スケールが異なる

**改善案**:
1. **統一信頼度スケールの導入**
   - すべての検出器で0.0-1.0の統一スケールを使用
   - 検出器ごとに重み付け（`divergenceDetector`: 0.6, `trendReversalDetector`: 0.3, `marketCore`: 0.1）

2. **検出ロジックの優先順位明確化**
   ```javascript
   // 優先順位1: DivergenceDetector (目標80%勝率)
   if (divergenceSignal && divergenceSignal.confidence >= 0.70) {
     return divergenceSignal;
   }
   
   // 優先順位2: TrendReversalDetector (統計的確実性)
   if (reversalSignal && reversalSignal.confidence >= 0.75) {
     return reversalSignal;
   }
   
   // 優先順位3: MarketCore (統合スコア)
   if (coreSignal && coreSignal.confidence >= 0.50) {
     return coreSignal;
   }
   ```

3. **`divergenceDetector.js`の条件見直し**
   - `isHighWinRateSellCondition`の条件をより厳格化
   - 実測データに基づく条件調整が必要

#### 1.2 バックテストデータの拡充

**現状**:
- サンプル数が3件のみ
- メトリクス評価が不可能

**改善案**:
1. **バックテスト実行の自動化**
   - 毎日のcron実行時に自動バックテストを実行
   - `scripts/backtest/generate_and_backtest_recent.js`を定期実行

2. **サンプル数の段階的緩和**
   - 初期段階（サンプル数<30）: `MIN_CONF_FOR_TRADE`を0.70に引き上げ（より保守的に）
   - サンプル数30-50: `MIN_CONF_FOR_TRADE`を0.60に
   - サンプル数50+: 通常の0.45に

3. **リアルタイムメトリクス更新**
   - シグナル配信後に実際の価格変動を追跡
   - TP/SL到達を自動記録し、メトリクスを更新

### 優先度2: 信頼度計算の統一と最適化

#### 2.1 統一信頼度計算関数の作成

**提案**:
```javascript
// logic/core/confidenceCalculator.js (新規作成)
/**
 * 統一信頼度計算器
 * すべての検出器の信頼度を0.0-1.0の統一スケールに正規化
 */
function normalizeConfidence(rawConfidence, detectorType) {
  switch(detectorType) {
    case 'divergence':
      // ダイバージェンス強度を0.0-1.0に正規化
      return Math.min(1.0, Math.max(0.0, rawConfidence));
    case 'trend_reversal':
      // 統計確率（0.0-1.0）をそのまま使用
      return rawConfidence;
    case 'market_core':
      // スコアベース（0-100）を0.0-1.0に変換
      return rawConfidence / 100;
    default:
      return 0.0;
  }
}

/**
 * 複数検出器の信頼度を統合
 */
function aggregateConfidence(signals) {
  const weights = {
    divergence: 0.6,      // 最高優先度（80%勝率目標）
    trend_reversal: 0.3,  // 統計的確実性
    market_core: 0.1      // 補完
  };
  
  let totalWeight = 0;
  let weightedSum = 0;
  
  signals.forEach(signal => {
    const normalized = normalizeConfidence(signal.confidence, signal.detectorType);
    const weight = weights[signal.detectorType] || 0;
    weightedSum += normalized * weight;
    totalWeight += weight;
  });
  
  return totalWeight > 0 ? weightedSum / totalWeight : 0.0;
}
```

#### 2.2 `MIN_CONF_FOR_TRADE`の動的調整

**提案**:
- サンプル数と勝率に応じて動的に調整
- サンプル数が少ない場合は保守的に（閾値を高く）
- 勝率が高い場合は積極的に（閾値を低く）

```javascript
function calculateDynamicMinConf(metrics, baseMinConf = 0.45) {
  if (!metrics || !metrics.windows || !metrics.windows.short_last_100) {
    // メトリクスがない場合は保守的に
    return 0.70;
  }
  
  const w = metrics.windows.short_last_100;
  
  // サンプル数が少ない場合は閾値を上げる
  if (w.total < 30) {
    const sampleRatio = w.total / 30; // 0.0-1.0
    return baseMinConf + (0.70 - baseMinConf) * (1 - sampleRatio);
  }
  
  // 勝率が高い場合は閾値を下げる（より多くのシグナルを許可）
  if (w.winRate >= 0.80) {
    return Math.max(0.40, baseMinConf - 0.05);
  }
  
  // 勝率が低い場合は閾値を上げる（より厳格に）
  if (w.winRate < 0.50) {
    return Math.min(0.70, baseMinConf + 0.15);
  }
  
  return baseMinConf;
}
```

### 優先度3: コード重複の削減と保守性向上

#### 3.1 スコア計算ロジックの統合

**問題**:
- `marketScorer.js`と`marketCore.js`で類似したスコア計算が重複
- `divergenceDetector.js`でも独自のスコアリング

**改善案**:
- スコア計算を`logic/core/scoreCalculator.js`に集約
- 各検出器はこの統合スコア計算を使用

#### 3.2 閾値管理の一元化

**提案**:
- `thresholds.js`を唯一の真実の源（Single Source of Truth）に
- `marketProfiles.js`の`algorithm`設定は`thresholds.js`への参照に変更
- 市場別の調整は`thresholds.js`内でプロファイルとして管理

### 優先度4: パフォーマンス最適化

#### 4.1 データ取得の最適化

**現状**:
- `api/cron.js`で複数のAPIを順次取得
- エラーハンドリングが不十分

**改善案**:
- 並列取得（`Promise.all`）の拡充
- エラー時の部分的なデータ使用を許可
- キャッシング戦略の導入

#### 4.2 メトリクスファイルの読み込み最適化

**現状**:
- `signalQualityGate.js`で5分間キャッシュ
- ファイルI/Oが発生

**改善案**:
- Vercel KVにメトリクスを保存
- リアルタイム更新を可能に

---

## 📝 実装計画

### Phase 1: 緊急対応（勝率改善）

1. **`divergenceDetector.js`の条件見直し**
   - `isHighWinRateSellCondition`の閾値を厳格化
   - `confidence >= 0.75`に引き上げ（0.70から）
   - `multipleDivergences >= 3`に引き上げ（2から）

2. **`marketCore.js`での優先順位明確化**
   - DivergenceDetectorのシグナルを最優先
   - 信頼度0.75以上のシグナルのみ配信

3. **サンプル数不足時の保守的動作**
   - `MIN_CONF_FOR_TRADE`を動的に0.70に引き上げ
   - サンプル数が30件に達するまで

### Phase 2: コード品質向上

1. **統一信頼度計算器の実装**
   - `logic/core/confidenceCalculator.js`を新規作成
   - すべての検出器で使用

2. **シグナル検出ロジックの統合**
   - `api/cron.js`での検出器呼び出しを整理
   - 優先順位の明確化

3. **閾値管理の一元化**
   - `thresholds.js`を唯一の真実の源に
   - `marketProfiles.js`からの参照に変更

### Phase 3: メトリクス改善

1. **リアルタイムメトリクス更新**
   - シグナル配信後の価格追跡
   - 自動TP/SL判定と記録

2. **バックテスト自動化**
   - 毎日のcron実行時に自動バックテスト
   - メトリクス自動更新

---

## 🔧 具体的な変更ファイル

### 修正が必要なファイル

1. **`logic/core/divergenceDetector.js`**
   - 高勝率条件の厳格化
   - 信頼度計算の見直し

2. **`logic/core/marketCore.js`**
   - 検出器優先順位の明確化
   - 信頼度スケールの統一

3. **`api/cron.js`**
   - 検出器呼び出しの整理
   - 動的`MIN_CONF_FOR_TRADE`の適用

4. **`config/thresholds.js`**
   - 動的閾値計算関数の追加

5. **`logic/core/confidenceCalculator.js`** (新規作成)
   - 統一信頼度計算ロジック

6. **`logic/core/scoreCalculator.js`** (新規作成)
   - 統合スコア計算ロジック

---

## 📊 期待される改善効果

### 短期（Phase 1完了後）
- **勝率**: 33% → 50-60%（目標）
- **サンプル数**: 3件 → 10-20件（段階的増加）

### 中期（Phase 2完了後）
- **コード保守性**: 大幅向上（重複削減、一元化）
- **信頼度一貫性**: 全検出器で統一スケール

### 長期（Phase 3完了後）
- **勝率**: 60% → 75-80%（目標達成）
- **サンプル数**: 30件以上（統計的信頼性確保）
- **自動改善**: リアルタイムメトリクス更新による継続的改善

---

## ⚠️ 注意事項

1. **段階的導入**
   - 一度に全てを変更せず、Phaseごとに実装・検証
   - 各Phase後にバックテストで効果を確認

2. **データ収集の継続**
   - サンプル数が少ない現状では、まずデータ収集が最優先
   - メトリクスが更新されるまで、保守的な動作を維持

3. **ロールバック計画**
   - 各変更にロールバック手順を準備
   - Gitタグで重要なマイルストーンを記録

---

## 📌 次のステップ

1. Phase 1の実装を開始（緊急対応）
2. バックテスト実行で現状ベースラインを確立
3. Phase 1完了後にメトリクス改善を確認
4. 改善が確認できたらPhase 2に進行
