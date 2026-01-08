# 📊 バックテスト検証結果レポート

**検証日**: 2026-01-07  
**チューニング実施後**: プロダクトチューニング完了後

---

## 📈 バックテスト結果サマリー

### 全体統計

- **総シグナル数**: 4件
- **評価済みトレード**: 4件
- **スキップ**: 0件

### トレード結果

- **オープンポジション**: 1件
- **勝ち（TP/TP_FIRST）**: 1件
- **負け（SL/SL_FIRST）**: 2件
- **勝率**: **33.33%**

### パフォーマンス指標

- **平均最大上昇（Avg max run-up）**: 9.74%
- **平均最大ドローダウン（Avg max drawdown）**: -1.78%
- **最悪ドローダウン（Worst drawdown）**: -5.32%

---

## 🎯 イベント別バックテスト結果

### 1. FRB Rate Shock (2024-08-01 ~ 2024-08-15)
- **シグナル数**: 1件
- **精度**: 0%
- **False Positives**: 1件
- **False Negatives**: 49件
- **Trap Alerts**: 1件

### 2. SVB Contagion Panic (2023-03-10 ~ 2023-03-20)
- **シグナル数**: 3件
- **精度**: 33%
- **True Positives**: 1件
- **False Positives**: 2件
- **False Negatives**: 42件
- **Trap Alerts**: 3件
- **清算警告リードタイム**: 4,940分（約82時間）

### 3. その他のイベント
- **US Election Rally**: シグナル0件
- **Summer Doldrums Range**: シグナル0件
- **Bitcoin ETF Approval**: シグナル0件
- **Halving Anticipation**: シグナル0件
- **Institutional Accumulation**: シグナル0件
- **FOMC Decision Volatility**: シグナル0件
- **Mt. Gox Payout Selling Pressure**: シグナル0件
- **Trump Crypto Order FOMO**: シグナル0件

---

## 🔍 分析と所見

### 改善点

1. **シグナル生成の改善**
   - FRB Rate ShockとSVB Contagion Panicでシグナルが生成されている
   - チューニング前は多くのイベントで0件だったが、一部のイベントでシグナルが生成されるようになった

2. **Trap検出の機能**
   - Trap検出が機能しており、適切にアラートを生成している

### 課題

1. **False Negativesが多い**
   - FRB Rate Shock: 49件のfalse negatives
   - SVB Contagion Panic: 42件のfalse negatives
   - まだ多くの機会を逃している

2. **精度の改善が必要**
   - FRB Rate Shock: 0%の精度
   - SVB Contagion Panic: 33%の精度
   - 生成されたシグナルの精度向上が必要

3. **多くのイベントでシグナルが0件**
   - 8つのイベントでシグナルが生成されていない
   - 閾値のさらなる調整が必要な可能性

---

## 💡 推奨される追加調整

### 1. 閾値のさらなる最適化
- HARD_SIGNAL_THRESHを24から22-23にさらに緩和
- MIN_CONF_FOR_TRADEを0.45から0.40-0.42にさらに緩和

### 2. スコアリングロジックの強化
- オンチェーン指標の重みをさらに増やす（0.65 → 0.70）
- 24h Price Changeの補正をさらに強化

### 3. イベント別プロファイルの追加
- 各イベントタイプに応じた専用プロファイルの作成
- イベント特性に応じた動的な閾値調整

---

## 📝 次のステップ

ユーザーからの追加調整指示を待機中...

---

**検証実施者**: AI Assistant  
**検証完了**: 2026-01-07
