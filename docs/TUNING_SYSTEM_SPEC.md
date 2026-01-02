# CryptoTrade Academy チューニングシステム仕様書

## 📋 概要

本仕様書は、CryptoTrade Academyのシグナル生成アルゴリズムを自動最適化するチューニングシステムの要件定義と実装仕様をまとめたものです。

## 🎯 目的

- 市場別プロファイルのパラメータを自動最適化する
- バックテスト結果に基づいてパフォーマンスを評価する
- 複数の評価メトリクスを考慮した最適化を実現する
- 市場環境の変化に適応的にパラメータを調整する

---

## 📊 現状分析

### 現在の実装状況

1. **基本チューニング機能**
   - `scripts/backtest/autoTuner.js`: 基本的なグリッドサーチ実装
   - パラメータ空間の定義機能あり
   - 評価関数が未完成（簡易版のみ）

2. **バックテスト機能**
   - `scripts/backtest/eval_signals.js`: シグナル評価機能実装済み
   - `scripts/backtest/summarize_backtest.js`: 結果集計機能実装済み
   - TP/SL/OPENの判定ロジック実装済み

3. **評価メトリクス**
   - Win Rate（勝率）: 実装済み
   - Max Runup/Drawdown: 実装済み
   - Accuracy, Precision, Recall: 未実装（イベントバックテストには一部実装あり）

### 課題・改善点

1. **評価関数の未完成**
   - `evaluateParameters`関数が実装されていない
   - 実際のシグナル生成ロジックとの統合が不十分
   - バックテスト結果を活用できていない

2. **評価メトリクスの不足**
   - 単一メトリクス（accuracy）のみを考慮
   - Precision, Recall, F1スコアの計算が必要
   - リスク調整後のリターン（Sharpe Ratio等）の考慮が必要

3. **最適化アルゴリズムの制約**
   - パラメータを個別に最適化（組み合わせ最適化ではない）
   - グリッドサーチのみ（計算コストが高い）
   - ベイズ最適化などの効率的な手法の検討が必要

4. **市場別最適化の不完全性**
   - 6市場（EN, AR, KO, JA, ES, PT-BR）すべてに対応する必要がある
   - 市場特性を考慮したパラメータ空間の定義が必要

---

## 🔧 要件定義

### 機能要件

#### FR1: パラメータ空間の定義

- **目的**: チューニング対象パラメータとその探索範囲を定義する
- **対象パラメータ**:
  1. `HARD_SIGNAL_THRESH`: ハードシグナルの閾値（デフォルト: 市場別、範囲: 15-35）
  2. `SOFT_REGIME_THRESH`: ソフトレジームの閾値（デフォルト: 市場別、範囲: 10-25）
  3. `MIN_CONF_FOR_TRADE`: 取引に必要な最小信頼度（デフォルト: 市場別、範囲: 0.3-0.7）
  4. `BUG_STANDBY_BIAS`: スタンバイバイアス（デフォルト: 市場別、範囲: 0-80）
  5. （将来拡張）スコア関数の重み係数
- **要件**:
  - 市場別プロファイルの現在値を基準とする
  - パラメータ間の依存関係を考慮する
  - 不合理な組み合わせを除外する

#### FR2: バックテスト実行

- **目的**: 特定のパラメータセットでバックテストを実行する
- **入力**:
  - パラメータセット
  - テスト期間（日数、デフォルト: 30日）
  - 市場コード
- **出力**:
  - シグナル評価結果（TP, SL, OPEN）
  - 評価メトリクス（Win Rate, Precision, Recall等）
- **要件**:
  - 既存の`eval_signals.js`ロジックを活用
  - パラメータを動的に適用できること
  - 並列実行に対応（将来拡張）

#### FR3: 評価メトリクスの計算

- **目的**: バックテスト結果から複数の評価メトリクスを計算する
- **メトリクス**:
  1. **Win Rate（勝率）**: TP / (TP + SL)
  2. **Accuracy（精度）**: (TP + TN) / (TP + TN + FP + FN)
  3. **Precision（適合率）**: TP / (TP + FP)
  4. **Recall（再現率）**: TP / (TP + FN)
  5. **F1 Score**: 2 * (Precision * Recall) / (Precision + Recall)
  6. **Sharpe Ratio**: (平均リターン - リスクフリーレート) / リターンの標準偏差
  7. **Max Drawdown**: 最大ドローダウン
  8. **Average Holding Time**: 平均保有時間
- **要件**:
  - False Positive/Negativeの定義を明確にする
  - 市場環境（Bull/Bear/Sideways）別の評価を考慮（将来拡張）

#### FR4: 最適化アルゴリズム

- **目的**: 評価メトリクスを最大化するパラメータセットを見つける
- **アルゴリズム**:
  1. **Phase 1（初期実装）**: 改善されたグリッドサーチ
     - パラメータを個別に最適化（現状維持、ただし評価関数を改善）
     - 各パラメータ最適化後に全体の評価を実行
  2. **Phase 2（将来拡張）**: ベイズ最適化
     - 効率的な探索を実現
     - パラメータ間の相互作用を考慮
- **要件**:
  - 複数の評価メトリクスを考慮した複合スコアを定義
  - 最適化対象メトリクスを選択可能（accuracy, precision, recall, f1, sharpe等）
  - 計算コストを考慮した制約設定

#### FR5: 結果の出力と適用

- **目的**: 最適化結果を出力し、設定ファイルに適用できる形式で提供する
- **出力形式**:
  1. **コンソール出力**: 最適化プロセスのログ
  2. **JSON出力**: 最適パラメータセット
  3. **レポート出力**: 評価メトリクスの比較（変更前/変更後）
  4. **設定ファイル形式**: `config/marketProfiles.js`に適用可能な形式
- **要件**:
  - 変更前後のパラメータを比較表示
  - 評価メトリクスの改善度を表示
  - 設定ファイルへの自動適用は手動確認を経る（安全のため）

#### FR6: 市場別最適化

- **目的**: 6市場それぞれに最適なパラメータを決定する
- **市場**: EN, AR, KO, JA, ES, PT-BR
- **要件**:
  - 市場ごとに独立して最適化
  - 市場特性を考慮したパラメータ空間の定義
  - 市場間の比較レポート生成

---

### 非機能要件

#### NFR1: パフォーマンス

- バックテスト実行時間: 1市場30日分で5分以内（目標）
- 最適化実行時間: 1市場で30分以内（目標、パラメータ数による）

#### NFR2: 信頼性

- エラーハンドリング: バックテスト実行エラー時の適切な処理
- ログ出力: 最適化プロセスの詳細ログ
- 再現性: 同じ入力で同じ結果が得られること

#### NFR3: 保守性

- コードの可読性: 既存コードとの整合性を保つ
- モジュール化: 機能を独立した関数/モジュールに分割
- ドキュメント: 関数の説明と使用例

#### NFR4: 拡張性

- 新しい評価メトリクスの追加が容易
- 新しい最適化アルゴリズムの追加が容易
- パラメータの追加が容易

---

## 📐 設計仕様

### システム構成

```
scripts/backtest/
├── autoTuner.js          # メイン最適化ロジック（既存、拡張）
├── eval_signals.js       # バックテスト実行（既存、活用）
├── summarize_backtest.js # 結果集計（既存、活用）
└── tuning/
    ├── parameterSpace.js    # パラメータ空間定義（新規）
    ├── evaluator.js         # 評価メトリクス計算（新規）
    ├── optimizer.js         # 最適化アルゴリズム（新規、拡張）
    └── reporter.js          # 結果レポート生成（新規）
```

### データフロー

```
1. パラメータ空間定義
   ↓
2. パラメータセット生成（グリッドサーチ等）
   ↓
3. バックテスト実行（eval_signals.jsを活用）
   ↓
4. 評価メトリクス計算（evaluator.js）
   ↓
5. 最適パラメータ判定（optimizer.js）
   ↓
6. 結果出力（reporter.js）
```

### 主要関数の仕様

#### `getParameterSpace(market: string): ParameterSpace`

パラメータ空間を定義する関数

**入力**:
- `market`: 市場コード（EN, AR, KO, JA, ES, PT-BR）

**出力**:
```typescript
{
  HARD_SIGNAL_THRESH: { min: number, max: number, step: number, current: number },
  SOFT_REGIME_THRESH: { min: number, max: number, step: number, current: number },
  MIN_CONF_FOR_TRADE: { min: number, max: number, step: number, current: number },
  BUG_STANDBY_BIAS: { min: number, max: number, step: number, current: number }
}
```

#### `runBacktest(params: ParameterSet, market: string, days: number): BacktestResult`

バックテストを実行する関数

**入力**:
- `params`: パラメータセット
- `market`: 市場コード
- `days`: テスト期間（日数）

**出力**:
```typescript
{
  signals: SignalEvaluation[],
  metrics: {
    winRate: number,
    accuracy: number,
    precision: number,
    recall: number,
    f1Score: number,
    sharpeRatio: number,
    maxDrawdown: number,
    avgHoldingTime: number
  }
}
```

#### `evaluateMetrics(backtestResult: BacktestResult): Metrics`

評価メトリクスを計算する関数

**入力**: `BacktestResult`

**出力**: `Metrics` (winRate, accuracy, precision, recall, f1Score, sharpeRatio, maxDrawdown, avgHoldingTime)

#### `optimizeParameters(paramSpace: ParameterSpace, market: string, days: number, targetMetric: string): OptimizedParameters`

パラメータを最適化する関数

**入力**:
- `paramSpace`: パラメータ空間
- `market`: 市場コード
- `days`: テスト期間
- `targetMetric`: 最適化対象メトリクス（'accuracy' | 'precision' | 'recall' | 'f1' | 'sharpe'）

**出力**: 最適パラメータセットと評価メトリクス

---

## 🚀 実装計画

### Phase 1: 基本機能の実装（優先度: 高）

1. **評価メトリクス計算機能の実装**
   - `evaluator.js`の作成
   - Accuracy, Precision, Recall, F1 Scoreの計算
   - False Positive/Negativeの定義

2. **バックテスト統合機能の実装**
   - `evaluateParameters`関数の完全実装
   - `eval_signals.js`との統合
   - パラメータを動的に適用する機能

3. **最適化アルゴリズムの改善**
   - グリッドサーチの改善（評価関数を実装）
   - 結果の比較と最適パラメータの選択

4. **結果出力機能の実装**
   - レポート生成機能
   - JSON出力機能
   - 設定ファイル形式の出力

### Phase 2: 高度な機能の実装（優先度: 中）

1. **リスク調整メトリクスの追加**
   - Sharpe Ratioの計算
   - Max Drawdownの考慮
   - 複合スコアの定義

2. **市場別最適化の完全対応**
   - 6市場すべてでの最適化
   - 市場間比較レポート

3. **最適化アルゴリズムの高度化**
   - ベイズ最適化の検討（オプション）
   - パラメータ間の相互作用の考慮

### Phase 3: 将来拡張（優先度: 低）

1. **適応的チューニング**
   - 市場環境の変化に応じた自動調整
   - 定期実行機能

2. **並列実行**
   - 複数パラメータセットの並列評価
   - パフォーマンスの向上

---

## 📝 実装詳細

### 評価メトリクスの定義

#### False Positive / False Negative の定義

- **False Positive (FP)**: SLに到達したシグナル（損失を出したシグナル）
- **False Negative (FN)**: シグナルを出さなかったが、実際には利益機会があった場合
  - 実装: 価格変動が一定閾値（例: ±5%）を超えたがシグナルが出なかった場合
- **True Positive (TP)**: TPに到達したシグナル（利益を出したシグナル）
- **True Negative (TN)**: シグナルを出さず、実際に損失機会がなかった場合

#### 評価メトリクスの計算式

```
Win Rate = TP / (TP + SL)
Accuracy = (TP + TN) / (TP + TN + FP + FN)
Precision = TP / (TP + FP)
Recall = TP / (TP + FN)
F1 Score = 2 * (Precision * Recall) / (Precision + Recall)
Sharpe Ratio = (平均リターン - リスクフリーレート) / リターンの標準偏差
```

### パラメータ適用方法

パラメータを動的に適用するため、以下の方法を検討:

1. **環境変数による上書き**（簡易）
2. **関数パラメータによる上書き**（推奨）
   - `decideSignal`関数にパラメータを渡す
   - または、コンテキストにパラメータを含める

### バックテストデータの準備

- 既存の`signals_log.jsonl`を活用
- または、過去N日分のデータを再生成
- CryptoQuant APIの制約を考慮（履歴データの取得）

---

## 🔍 テスト計画

### 単体テスト

- 評価メトリクス計算のテスト
- パラメータ空間定義のテスト
- 最適化アルゴリズムのテスト

### 統合テスト

- バックテスト統合のテスト
- 市場別最適化のテスト
- 結果出力のテスト

### 検証方法

- 既知の最適パラメータでの検証
- 手動最適化結果との比較
- 異なる期間でのクロスバリデーション

---

## 📚 関連ドキュメント

- `docs/BACKTEST_IMPROVEMENT_PLAN.md`: バックテスト改善計画
- `scripts/backtest/README.md`: バックテストシステムのドキュメント
- `config/marketProfiles.js`: 市場別プロファイル設定

---

## 🎯 成功基準

### Phase 1完了基準

- [ ] 評価メトリクス（Accuracy, Precision, Recall, F1）が正しく計算される
- [ ] バックテスト統合が動作し、パラメータを動的に適用できる
- [ ] 最適化アルゴリズムが動作し、最適パラメータを出力する
- [ ] 結果レポートが生成される
- [ ] EN市場で最適化が実行できる

### Phase 2完了基準

- [ ] Sharpe Ratioが計算される
- [ ] 6市場すべてで最適化が実行できる
- [ ] 市場間比較レポートが生成される

---

## 📅 実装スケジュール（目安）

- **Phase 1**: 1-2週間
- **Phase 2**: 1週間
- **Phase 3**: 将来拡張

---

## 🔄 変更履歴

- 2025-01-XX: 初版作成

