# 🎯 プロダクトチューニング結果レポート
**最終更新**: 2026-01-17 14:07:03  
**作成日時**: 2026-01-17 14:07:03  
**作成日**: 2026-01-17  

**実施日**: 2026-01-07  
**目的**: バックテスト結果に基づくアルゴリズム最適化  
**対象**: シグナル生成ロジック、閾値設定、市場別プロファイル

---

## 📊 バックテスト結果分析

### 問題点の特定

1. **シグナル生成が少なすぎる**
   - 多くのイベントでシグナルが0件
   - 閾値が厳しすぎる可能性

2. **False Negativesが多い**
   - FRB Rate Shock: 49件のfalse negatives
   - SVB Contagion Panic: 42件のfalse negatives
   - シグナルを出すべき場面で出せていない

3. **精度が低い**
   - FRB Rate Shock: 0%の精度
   - SVB Contagion Panic: 33%の精度

---

## 🔧 実施したチューニング

### 1. 閾値設定の最適化（`config/thresholds.js`）

#### BASEプロファイル
- **HARD_SIGNAL_THRESH**: 28 → **24**（-14%）
  - シグナル数を増やし、False Negativesを削減
- **SOFT_REGIME_THRESH**: 20 → **18**（-10%）
  - レジーム検出を早め、機会損失を削減
- **MIN_CONF_FOR_TRADE**: 0.5 → **0.45**（-10%）
  - より多くのシグナルを許可

#### EVENT_FOMCプロファイル
- **HARD_SIGNAL_THRESH**: 22 → **20**（-9%）
  - イベント時はより積極的にシグナル生成
- **SOFT_REGIME_THRESH**: 18 → **16**（-11%）
  - レジーム切り替えをさらに早める
- **MIN_CONF_FOR_TRADE**: 0.45 → **0.40**（-11%）
  - イベント時はより積極的に

#### 戦略別プロファイル
- **BOTTOM_ATTACK**: minScore 55 → **52**, maxChange24h -1.5% → **-1.0%**
- **DIP_ATTACK**: minScore 45 → **42**, maxAbsChange24h ±9% → **±10%**
- **CEILING_DEFEND**: maxScore 45 → **48**, minChange24h +3% → **+2.5%**

### 2. 市場別プロファイルの最適化（`config/marketProfiles.js`）

#### EN市場（Precision Sniper）
- **HARD_SIGNAL_THRESH**: 28 → **24**（-14%）
- **SOFT_REGIME_THRESH**: 20 → **18**（-10%）
- **MIN_CONF_FOR_TRADE**: 0.6 → **0.45**（-25%）
- **BUG_STANDBY_BIAS**: 15 → **10**（-33%）
  - シグナル抑制を大幅に緩和

#### AR市場（Shield Wall）
- **BUG_STANDBY_BIAS**: 70 → **65**（-7%）
  - 既に緩い設定のため微調整のみ

#### KO市場（Kimchi Sniper）
- **HARD_SIGNAL_THRESH**: 25 → **22**（-12%）
- **SOFT_REGIME_THRESH**: 18 → **16**（-11%）
- **MIN_CONF_FOR_TRADE**: 0.55 → **0.50**（-9%）
- **BUG_STANDBY_BIAS**: 20 → **15**（-25%）

#### JA市場（Kaizen Trader）
- **HARD_SIGNAL_THRESH**: 26 → **23**（-12%）
- **SOFT_REGIME_THRESH**: 19 → **17**（-11%）
- **MIN_CONF_FOR_TRADE**: 0.58 → **0.52**（-10%）
- **BUG_STANDBY_BIAS**: 22 → **18**（-18%）

#### ES市場（VozComún）
- **HARD_SIGNAL_THRESH**: 27 → **24**（-11%）
- **SOFT_REGIME_THRESH**: 19 → **17**（-11%）
- **MIN_CONF_FOR_TRADE**: 0.57 → **0.50**（-12%）
- **BUG_STANDBY_BIAS**: 18 → **15**（-17%）

#### PT-BR市場（VozComum）
- **HARD_SIGNAL_THRESH**: 27 → **24**（-11%）
- **SOFT_REGIME_THRESH**: 19 → **17**（-11%）
- **MIN_CONF_FOR_TRADE**: 0.57 → **0.50**（-12%）
- **BUG_STANDBY_BIAS**: 18 → **15**（-17%）

### 3. スコアリング重みの最適化（`logic/core/marketCore.js`）

- **smartMoneyScore**: 0.6 → **0.65**（+8%）
  - オンチェーン指標をより重視（False Negatives削減）
- **retailScore**: 0.25 → **0.20**（-20%）
  - リテール指標の重みを少し下げる
- **divergenceScore**: 0.15 → **0.15**（維持）

### 4. 市場スコアリングロジックの強化（`logic/tier1_btc/marketScorer.js`）

#### Exchange Netflow補正
- **-1500以下**: +25スコア追加（新規）
- **+1500以上**: -25スコア追加（新規）
- より細かい閾値でシグナル検出を強化

#### 24h Price Change補正
- **-8%以下 + Extreme Fear**: +15スコア追加（新規）
- **-3%以下 + Fear**: +5スコア追加（新規）
- **+8%以上 + Greed**: -15スコア追加（新規）
- **+5%以上 + Greed**: -5スコア追加（新規）
- より早い段階でシグナルを検出

---

## 📈 期待される効果

### 1. シグナル数の増加
- **BASEプロファイル**: HARD_SIGNAL_THRESH 28→24により、約**20-30%のシグナル数増加**を期待
- **イベント時**: EVENT_FOMCプロファイルにより、**さらに10-15%の増加**を期待

### 2. False Negativesの削減
- 閾値緩和により、**見逃しを30-40%削減**を期待
- スコアリング重み調整により、オンチェーン指標を重視し、**より正確なシグナル検出**を期待

### 3. 精度の向上
- オンチェーン指標をより重視することで、**精度の向上**を期待
- より細かい閾値設定により、**適切なタイミングでのシグナル生成**を期待

---

## 🧪 検証方法

### 推奨検証手順

1. **バックテストの再実行**
   ```bash
   npm run backtest:real
   npm run summary:real
   ```

2. **メトリクスの確認**
   - シグナル数の変化
   - False Negativesの削減率
   - 精度の変化
   - True Positivesの増加率

3. **市場別パフォーマンスの確認**
   - 各市場（EN/AR/KO/JA/ES/PT-BR）でのシグナル生成数
   - 市場別の精度変化

---

## ⚠️ 注意事項

### リスク管理

1. **シグナル数の増加に伴う精度低下の可能性**
   - 初期段階では精度が一時的に低下する可能性がある
   - 継続的なモニタリングと微調整が必要

2. **市場別の特性を考慮**
   - AR市場は既に緩い設定のため、大幅な変更は不要
   - EN市場はPrecision Sniperの特性を維持しつつ、シグナル数を増加

3. **段階的なロールアウト推奨**
   - まずEN市場で検証
   - 結果を確認してから他市場に展開

---

## 📝 次のステップ

1. ✅ 閾値設定の最適化（完了）
2. ✅ 市場別プロファイルの最適化（完了）
3. ✅ スコアリング重みの最適化（完了）
4. ✅ 市場スコアリングロジックの強化（完了）
5. ⏳ バックテストの再実行と検証
6. ⏳ 実環境でのモニタリング
7. ⏳ 必要に応じた追加調整

---

## 🔄 ロールバック手順

チューニング結果が期待を下回る場合のロールバック手順：

1. `config/thresholds.js`のBASEプロファイルを元の値に戻す
2. `config/marketProfiles.js`の各市場プロファイルを元の値に戻す
3. `logic/core/marketCore.js`のスコアリング重みを元の値に戻す
4. `logic/tier1_btc/marketScorer.js`の補正ロジックを元に戻す

---

**チューニング実施者**: AI Assistant  
**承認待ち**: バックテスト結果の確認と承認
