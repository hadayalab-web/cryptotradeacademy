# 80%勝率検証方法（SELL/SHORTシグナル）
**最終更新**: 2026-01-17 14:07:03  
**作成日時**: 2026-01-17 14:07:03  
**作成日**: 2026-01-17  

## 概要

本ドキュメントは、SELL/SHORTシグナルの80%勝率を検証するためのバックテスト方法を説明します。

## バックテストスクリプト

### 1. `scripts/backtest/generate_and_backtest_recent.js`

最新のBinanceデータからシグナルを生成し、即座にバックテストを実行する統合スクリプト。

#### 実行方法

```bash
# デフォルト: 直近90日間、閾値20
node scripts/backtest/generate_and_backtest_recent.js

# カスタム期間と閾値
node scripts/backtest/generate_and_backtest_recent.js --days=60 --threshold=25
```

#### 出力

- `data/signals_log_recent.jsonl`: 生成されたシグナル
- `data/signals_backtest_recent.jsonl`: バックテスト結果

#### 80%勝率検証方法

スクリプトは自動的に以下を計算します：

```javascript
// SHORTシグナルの勝率計算
const shorts = closed.filter((s) => s.side === 'SHORT');
const shortWins = shorts.filter((s) => 
  s.backtest?.outcome === 'TP' || s.backtest?.outcome === 'TP_FIRST'
);
const shortWinRate = shorts.length > 0 
  ? ((shortWins.length / shorts.length) * 100).toFixed(2) 
  : 0;
```

**検証基準:**
- SHORTシグナルの勝率が80%以上であることを確認
- サマリー出力で `SHORT win rate: XX.XX%` を確認

### 2. `scripts/backtest/run_events_backtest.js`

特定のイベント期間（10-12イベント）に対してバックテストを実行。

#### 実行方法

```bash
node scripts/backtest/run_events_backtest.js > data/events_backtest_summary.json
```

#### 出力形式

各イベントごとに以下を出力：

```json
{
  "event": "Event Name",
  "period": "2024-XX-XX ~ 2024-XX-XX",
  "signals_tested": 5,
  "accuracy": "80%",
  "true_positives": 4,
  "false_positives": 1,
  "false_negatives": 2
}
```

**検証基準:**
- `accuracy` が80%以上であることを確認
- `true_positives / (true_positives + false_positives) >= 0.80` を確認

### 3. `scripts/backtest/summarize_backtest.js`

バックテスト結果を集計してサマリーを出力。

#### 実行方法

```bash
# デフォルト: data/signals_backtest.jsonl
node scripts/backtest/summarize_backtest.js

# カスタムファイル
node scripts/backtest/summarize_backtest.js --input=data/signals_backtest_recent.jsonl
```

#### 出力例

```
===== Backtest Summary =====
Total rows          : 50
Evaluated trades    : 45
Skipped trades      : 5

Outcomes:
  TP        : 36
  SL        : 9
  OPEN      : 0

Closed trades       : 45
Wins (TP/TP_FIRST)  : 36
Losses (SL/SL_FIRST): 9
Open positions      : 0
Win rate            : 80.00 %
```

**検証基準:**
- `Win rate` が80.00%以上であることを確認

## SELL/SHORTシグナルに特化した検証

### フィルタリング方法

`generate_and_backtest_recent.js` では、SHORTシグナルを自動的にフィルタリングして勝率を計算します：

```javascript
const shorts = closed.filter((s) => s.side === 'SHORT');
const shortWins = shorts.filter((s) => 
  s.backtest?.outcome === 'TP' || s.backtest?.outcome === 'TP_FIRST'
);
```

### 80%勝率要件の実装

`logic/core/signalQualityGate.js` の `evaluateShortSellGate` 関数が、SELL/SHORTシグナル発火前に80%勝率要件をチェックします。

**チェック項目:**
- `smartMoneyScore < -15`（クジラの売り圧）
- `confidence >= 0.80`（信頼度）
- 複数のオンチェーン指標の整合性

## バックテスト実行フロー

1. **データ取得**: Binanceから1時間足データを取得
2. **シグナル生成**: `marketCore.js` と `signalGen.js` を使用
3. **バックテスト評価**: 各シグナルに対してTP/SL到達を確認
4. **集計**: 勝率、最大ドローダウン、平均保持時間を計算

## 注意事項

- バックテストは過去データに基づくため、未来の市場状況を保証するものではありません
- 80%勝率は「閉じた取引（TPまたはSL到達）」のみを対象とします
- `OPEN`状態の取引は勝率計算に含まれません

## 関連ファイル

- `scripts/backtest/generate_and_backtest_recent.js`: 最新データバックテスト
- `scripts/backtest/run_events_backtest.js`: イベント単位バックテスト
- `scripts/backtest/summarize_backtest.js`: 結果集計
- `logic/core/signalQualityGate.js`: 80%勝率ゲート機能
- `data/signals_backtest.jsonl`: バックテスト結果データ
