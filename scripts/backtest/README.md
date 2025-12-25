# Backtest System

CryptoTrade Academyのバックテストシステム。

## 構成

### 1. イベントベースバックテスト
- `run_events_backtest.js`: 過去のクリティカルイベント時のアラート検証
- `replay_event_signals.js`: イベント期間中のシグナル再現

### 2. シグナル評価バックテスト
- `eval_signals.js`: signals_log.jsonlをBinance価格データで検証
- `summarize_backtest.js`: バックテスト結果の集計

### 3. アルゴリズム自動チューニング
- `autoTuner.js`: パラメータ最適化（実装中）

## 使用方法

### イベントバックテスト実行
```bash
node scripts/backtest/run_events_backtest.js > data/events_backtest_summary.json
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
```bash
node scripts/backtest/autoTuner.js --market=EN --days=30
```

## データファイル

### 入力
- `data/signals_log.jsonl`: 実際のシグナルログ
- `data/signals_log_dummy.jsonl`: ダミーデータ

### 出力
- `data/signals_backtest.jsonl`: バックテスト結果
- `data/events_backtest_summary.json`: イベント別サマリー

## 対象イベント

1. US Election Rally (2024-11-05 ~ 2024-11-15)
2. FRB Rate Shock (2024-08-01 ~ 2024-08-15)
3. Bitcoin ETF Approval (2024-01-10 ~ 2024-01-25)
4. SVB Contagion Panic (2023-03-10 ~ 2023-03-20)
5. Halving Anticipation (2024-03-15 ~ 2024-04-20)
6. FOMC Decision Volatility (2024-12-18)
7. その他...



