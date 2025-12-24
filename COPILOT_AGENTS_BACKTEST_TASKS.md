# GitHub Copilot Agents バックテスト関連タスク依頼

## 🎯 依頼内容

バックテスト機能の改善と拡張を依頼します。テスト・デバッグが真骨頂の皆さんにお願いしたいタスクです。

---

## 📋 タスク1: 過去クリティカルイベント検証機能の強化（PR用）

### 現状
- `scripts/backtest/run_events_backtest.js`は基本的な実装のみ
- PR用の詳細レポート生成機能が必要

### 実装内容

#### 1. クリティカルイベントデータの定義
- 過去の重要な市場イベント（ビットコイン暴落、急騰、流動性危機など）の定義
- イベントデータ構造:
  ```javascript
  {
    id: 'event-id',
    name: 'Event Name',
    date: '2024-01-01T00:00:00Z',
    description: 'Event description',
    marketImpact: 'high|medium|low',
    // 追加のメタデータ
  }
  ```

#### 2. イベント検証ロジックの実装
- 各クリティカルイベント時に、アルゴリズムがどのようなアラートを出力していたかを検証
- 検証項目:
  - アラート発火の有無
  - アラートタイプ（EMERGENCY/WATCH/STANDBY_BREAK/REGULAR）
  - スコアとシグナル
  - アラート発火タイミング（イベント前/中/後）

#### 3. 詳細レポート生成機能
- PR用の詳細レポート生成
- レポート内容:
  - イベント概要
  - 検証結果サマリー
  - 時系列データ（イベント前後のスコア・シグナル変化）
  - アラート発火タイミングの分析
  - 改善提案

#### 4. レポートフォーマット
- Markdown形式
- グラフ/チャート（可能であれば）
- JSON形式（データ分析用）

### ファイル構成
```
scripts/backtest/
├── run_events_backtest.js (拡張)
├── events/
│   ├── critical-events.js (イベント定義)
│   └── event-analyzer.js (イベント分析ロジック)
└── reports/
    ├── generate-report.js (レポート生成)
    └── templates/
        └── pr-report-template.md (PR用レポートテンプレート)
```

### 参考資料
- `docs/BACKTEST_IMPROVEMENT_PLAN.md`
- `data/events_backtest_summary.json`

---

## 📋 タスク2: アルゴリズム自動チューニング機能の完成

### 現状
- `scripts/backtest/autoTuner.js`は基本的なグリッドサーチ実装のみ
- `evaluateParameters`関数が簡易実装（ダミースコア）

### 実装内容

#### 1. 評価メトリクスの実装
- **Accuracy**: シグナルの精度（真陽性率）
- **Precision**: シグナルの精度（偽陽性率）
- **Recall**: シグナルの検出率
- **F1 Score**: PrecisionとRecallの調和平均
- **Sharpe Ratio**: リスク調整後リターン
- **Max Drawdown**: 最大ドローダウン

#### 2. バックテストエンジンとの統合
- `eval_signals.js`を呼び出して実際のバックテストを実行
- バックテスト結果を解析して評価メトリクスを計算

#### 3. 最適化アルゴリズムの改善
- グリッドサーチの最適化（並列処理、早期終了など）
- オプション: ベイズ最適化、ランダムサーチなどの追加

#### 4. パラメータ空間の定義拡張
- 現在のパラメータ:
  - HARD_SIGNAL_THRESH
  - SOFT_REGIME_THRESH
  - MIN_CONF_FOR_TRADE
  - BUG_STANDBY_BIAS
- 追加検討:
  - 市場別パラメータ最適化
  - イベントトリガー閾値の最適化

#### 5. 結果の保存と可視化
- 最適化結果の保存（JSON形式）
- パラメータ比較レポート
- パフォーマンス改善の可視化

### ファイル構成
```
scripts/backtest/
├── autoTuner.js (拡張)
├── evaluation/
│   ├── metrics.js (評価メトリクス計算)
│   └── scorer.js (総合スコアリング)
└── optimization/
    ├── grid-search.js (グリッドサーチ実装)
    └── bayesian-optimization.js (オプション)
```

### 参考資料
- `scripts/backtest/autoTuner.js`
- `scripts/backtest/eval_signals.js`
- `data/signals_backtest.jsonl`

---

## 📋 タスク3: テスト・デバッグ支援

### 追加でお願いしたいこと

1. **バックテストデータの検証**
   - 既存のバックテストデータ（`data/signals_backtest.jsonl`）の整合性確認
   - データ欠損や異常値の検出

2. **エラーハンドリングの強化**
   - バックテスト実行時のエラーハンドリング
   - 詳細なエラーログとデバッグ情報

3. **パフォーマンス最適化**
   - バックテスト実行時間の最適化
   - メモリ使用量の最適化

---

## 🎯 実装優先順位

1. **高優先度**: タスク1（クリティカルイベント検証）- PR用なので早急に必要
2. **中優先度**: タスク2（自動チューニング完成）- アルゴリズム改善に重要
3. **低優先度**: タスク3（テスト・デバッグ支援）- 品質向上

---

## 📝 実装時の注意事項

1. **既存コードとの互換性**: 既存のバックテスト機能を壊さないこと
2. **ドキュメント**: 実装内容のドキュメント化
3. **テスト**: 新しい機能に対するテストの追加
4. **パフォーマンス**: 実行時間とメモリ使用量を考慮

---

## 🔗 関連ファイル

- `scripts/backtest/README.md` - バックテスト機能の概要
- `docs/BACKTEST_IMPROVEMENT_PLAN.md` - バックテスト改善計画
- `docs/TASK_COMPLETION_ESTIMATE.md` - タスク完了見積もり

---

## 📊 期待される成果

1. **PR用レポート**: 過去のクリティカルイベントでのアルゴリズム性能を示す詳細レポート
2. **自動チューニング**: アルゴリズムパラメータを自動的に最適化する機能
3. **品質向上**: バックテスト機能の信頼性と保守性の向上

---

**ご協力よろしくお願いします！** 🙏

