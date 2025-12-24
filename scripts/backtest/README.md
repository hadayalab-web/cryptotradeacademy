# Backtest System

CryptoTrade Academyのバックテストシステム。

## 構成

### 1. イベントベースバックテスト（拡張版）
- `run_events_backtest.js`: 過去のクリティカルイベント時のアラート検証（基本版）
- `run_events_backtest_enhanced.js`: 詳細レポート生成機能付き拡張版 ✨ NEW
- `replay_event_signals.js`: イベント期間中のシグナル再現
- `events/critical-events.js`: クリティカルイベントデータ定義 ✨ NEW
- `events/event-analyzer.js`: イベント分析ロジック ✨ NEW

### 2. シグナル評価バックテスト
- `eval_signals.js`: signals_log.jsonlをBinance価格データで検証
- `summarize_backtest.js`: バックテスト結果の集計

### 3. アルゴリズム自動チューニング（完全版）
- `autoTuner.js`: パラメータ最適化（基本版）
- `autoTuner_enhanced.js`: 評価メトリクス統合版 ✨ NEW
- `evaluation/metrics.js`: 評価メトリクス実装 ✨ NEW
- `evaluation/scorer.js`: 複合スコアリング ✨ NEW

### 4. レポート生成
- `reports/generate-report.js`: Markdown/JSONレポート生成 ✨ NEW
- `reports/templates/pr-report-template.md`: PRレポートテンプレート ✨ NEW

## 使用方法

### イベントバックテスト実行

**基本版（JSON出力）:**
```bash
node scripts/backtest/run_events_backtest.js > data/events_backtest_summary.json
```

**拡張版（詳細レポート）:**
```bash
# Markdownレポート生成
node scripts/backtest/run_events_backtest_enhanced.js --format=markdown --output=./reports/events_report.md

# JSONレポート生成
node scripts/backtest/run_events_backtest_enhanced.js --format=json --output=./reports/events_report.json

# タイムライン含む詳細レポート
node scripts/backtest/run_events_backtest_enhanced.js --format=markdown --timeline
```

### シグナルバックテスト実行
```bash
# 実際のデータ
npm run backtest:real
npm run summary:real

# ダミーデータ
npm run backtest:dummy
npm run summary:dummy
```

### 自動チューニング実行

**基本版:**
```bash
node scripts/backtest/autoTuner.js --market=EN --days=30
```

**拡張版（評価メトリクス統合）:**
```bash
# バランス型最適化
node scripts/backtest/autoTuner_enhanced.js --market=EN --target=balanced --iterations=50

# アグレッシブ型（リターン重視）
node scripts/backtest/autoTuner_enhanced.js --market=EN --target=aggressive --iterations=50

# 保守型（リスク最小化）
node scripts/backtest/autoTuner_enhanced.js --market=EN --target=conservative --iterations=50

# 高精度型（偽陽性最小化）
node scripts/backtest/autoTuner_enhanced.js --market=EN --target=highPrecision --iterations=50
```

## データファイル

### 入力
- `data/signals_log.jsonl`: 実際のシグナルログ
- `data/signals_log_dummy.jsonl`: ダミーデータ

### 出力
- `data/signals_backtest.jsonl`: バックテスト結果
- `data/events_backtest_summary.json`: イベント別サマリー（基本版）
- `reports/backtest_report_*.md`: 詳細レポート（Markdown）
- `reports/backtest_report_*.json`: 詳細レポート（JSON）
- `reports/autotuner_*.json`: 自動チューニング結果

## 対象イベント

1. US Election Rally (2024-11-05 ~ 2024-11-15)
2. FRB Rate Shock (2024-08-01 ~ 2024-08-15)
3. Bitcoin ETF Approval (2024-01-10 ~ 2024-01-25)
4. SVB Contagion Panic (2023-03-10 ~ 2023-03-20)
5. Halving Anticipation (2024-03-15 ~ 2024-04-20)
6. FOMC Decision Volatility (2024-12-18)
7. その他...

## 新機能の詳細

### 📊 評価メトリクス（metrics.js）

実装されたメトリクス:
- **Accuracy**: 真陽性率（正しいシグナルの割合）
- **Precision**: 精度（偽陽性を最小化）
- **Recall**: 検出率（機会損失を最小化）
- **F1 Score**: PrecisionとRecallの調和平均
- **Sharpe Ratio**: リスク調整後リターン
- **Max Drawdown**: 最大ドローダウン
- **Win Rate**: 勝率
- **Win/Loss Ratio**: 平均勝敗比率
- **Profit Factor**: 総利益/総損失比率

### 🎯 スコアリングプリセット（scorer.js）

最適化目標に応じた重み付けプリセット:
- **balanced**: バランス型（デフォルト）
- **aggressive**: アグレッシブ型（リターン重視）
- **conservative**: 保守型（リスク最小化）
- **highPrecision**: 高精度型（偽陽性最小化）
- **highRecall**: 高検出型（機会損失最小化）

### 📝 レポート生成機能

- イベント別の詳細分析
- 期待値との比較（Expected vs Actual）
- 強み・弱みの自動抽出
- 改善提案の生成
- タイムライン表示（オプション）

## 実装ステータス

✅ **完了**:
- クリティカルイベントデータ定義
- イベント分析ロジック
- 評価メトリクス実装
- 複合スコアリング
- レポート生成機能
- 拡張版バックテスト・自動チューニング

⏳ **改善可能**:
- グリッドサーチの並列処理化
- ベイズ最適化の実装
- リアルタイムパラメータ適用
- より詳細なFalse Negative検出

## トラブルシューティング

### signals_log.jsonlが見つからない
```bash
# ダミーデータで実行
node scripts/backtest/generate_dummy_signals.js
```

### Binance API制限
- 1000本以上のklineが必要な場合は分割リクエストが自動実行されます
- レート制限に注意（1分間に1200リクエストまで）

### メモリ不足
- バックテスト期間を短縮
- `--iterations`パラメータを減らす


