# SELL/SHORTシグナル80%勝率要件 実装完了報告
**最終更新**: 2026-01-17 14:07:03  
**作成日時**: 2026-01-17 14:07:03  

**作成日**: 2026-01-17
**実装完了**: ✅

---

## 📋 実装概要

SELL/SHORTシグナルに対して、**80%以上の勝率要件を強制する**機能を実装しました。  
勝率が80%未満、またはサンプル数が不足している場合は、シグナルを`BUG_STANDBY`に変更し、配信をブロックします。

---

## ✅ 実装内容

### 1. 勝率メトリクス生成スクリプト

**ファイル**: `scripts/backtest/build_signal_quality.js`

**機能**:
- `data/signals_backtest.jsonl`からSELL/SHORTシグナルを抽出
- 直近100件のSHORTトレードの勝率を計算
- `data/signal_quality_metrics.json`にメトリクスを保存

**実行方法**:
```bash
npm run build:quality
```

**出力例**:
```json
{
  "generatedAt": "2026-01-07T13:08:25.550Z",
  "windows": {
    "short_last_100": {
      "total": 3,
      "wins": 1,
      "losses": 2,
      "winRate": 0.3333333333333333,
      "minTrades": 30,
      "threshold": 0.8,
      "pass": false
    }
  }
}
```

---

### 2. 勝率ゲート関数

**ファイル**: `logic/core/signalQualityGate.js`

**機能**:
- メトリクスファイルを読み込み（5分間キャッシュ）
- SELL/SHORTシグナルの配信可否を評価
- 80%未満またはサンプル不足の場合は`pass: false`を返す

**API**:
```javascript
const { evaluateShortSellGate } = require('../logic/core/signalQualityGate');

const gate = evaluateShortSellGate({ minWinRate: 0.80 });
// { pass: boolean, reason: string, details: Object, message: string }
```

**判定ロジック**:
1. メトリクスファイルが存在しない → `pass: false` (reason: 'NO_METRICS')
2. サンプル数が30件未満 → `pass: false` (reason: 'INSUFFICIENT_SAMPLE')
3. 勝率が80%未満 → `pass: false` (reason: 'LOW_WINRATE')
4. 上記すべてを満たす → `pass: true` (reason: 'OK')

---

### 3. cron.jsへの統合

**ファイル**: `api/cron.js`

**実装箇所**:
1. **通常モード** (216-232行目):
   - `tradeSignal.signal === 'SELL'`の場合にゲートをチェック
   - 80%未満の場合は`tradeSignal.signal = 'NONE'`に変更

2. **イベント駆動モード** (418-430行目):
   - `normalizedSignal === 'SELL'`の場合にゲートをチェック
   - 80%未満の場合は`normalizedSignal = 'BUG_STANDBY'`に変更

**ログ出力**:
```
[SELL/SHORT Gate] Blocked: LOW_WINRATE - Win rate 33.33% < 80%
[SELL/SHORT Gate] Passed: Win rate 85.00% >= 80%
```

---

## 🔄 実行フロー

### バックテスト実行時

```bash
# 1. バックテスト実行
npm run backtest:real

# 2. バックテスト結果を集計
npm run summary:real

# 3. 勝率メトリクスを生成（新規追加）
npm run build:quality

# または一括実行
npm run backtest:full
```

### cron実行時

1. `api/cron.js`がSELLシグナルを生成
2. `evaluateShortSellGate()`で勝率をチェック
3. 80%未満の場合は`BUG_STANDBY`に変更して配信しない
4. 80%以上の場合は通常通り配信

---

## 📊 現在のメトリクス状態

**最新実行結果** (2026-01-07):
- **Total SHORT trades**: 3
- **Wins**: 1
- **Losses**: 2
- **Win rate**: 33.33%
- **Pass**: ❌ (サンプル数不足 & 勝率不足)

**注意**: 現在のバックテストデータでは、SELL/SHORTシグナルは**配信されません**（`BUG_STANDBY`扱い）。

---

## ⚙️ 設定パラメータ

**ファイル**: `scripts/backtest/build_signal_quality.js`

```javascript
const LAST_N = 100;           // 直近N件を評価
const MIN_TRADES = 30;         // 最低サンプル数
const WIN_RATE_THRESHOLD = 0.80; // 80%勝率要件
```

**ファイル**: `logic/core/signalQualityGate.js`

```javascript
const CACHE_TTL_MS = 5 * 60 * 1000; // キャッシュ有効期限（5分）
```

---

## 🧪 テスト方法

### 1. メトリクス生成のテスト

```bash
npm run build:quality
```

**期待結果**:
- `data/signal_quality_metrics.json`が生成される
- コンソールに勝率情報が表示される

### 2. ゲート関数のテスト

```javascript
const { evaluateShortSellGate } = require('./logic/core/signalQualityGate');

const gate = evaluateShortSellGate({ minWinRate: 0.80 });
console.log(gate);
// { pass: false, reason: 'INSUFFICIENT_SAMPLE', ... }
```

### 3. cron実行時のテスト

- SELLシグナルが生成された場合、コンソールにゲート判定ログが出力される
- 80%未満の場合は`[SELL/SHORT Gate] Blocked`が表示される

---

## 📝 注意事項

### 1. メトリクスファイルの更新タイミング

- **手動更新**: `npm run build:quality`を実行
- **自動更新**: バックテスト実行後に`npm run backtest:full`を実行

**推奨**: 定期的にバックテストを実行し、メトリクスを更新してください。

### 2. メトリクスファイルが存在しない場合

- 安全側（配信停止）として動作
- `pass: false` (reason: 'NO_METRICS') を返す
- SELL/SHORTシグナルは配信されない

### 3. サンプル数が不足している場合

- 30件未満の場合は`pass: false` (reason: 'INSUFFICIENT_SAMPLE')
- 誤判定を防ぐため、最低サンプル数を必須としている

---

## 🎯 実装完了チェックリスト

- ✅ 勝率メトリクス生成スクリプト (`scripts/backtest/build_signal_quality.js`)
- ✅ 勝率ゲート関数 (`logic/core/signalQualityGate.js`)
- ✅ cron.jsへの統合（通常モード & イベント駆動モード）
- ✅ package.jsonスクリプト追加 (`build:quality`, `backtest:full`)
- ✅ 動作確認（メトリクス生成成功）

---

## 🔮 今後の改善案

### 1. 自動メトリクス更新

- バックテスト実行時に自動的にメトリクスを更新
- `scripts/backtest/eval_signals.js`の実行後に自動実行

### 2. 複数の評価ウィンドウ

- 直近100件だけでなく、直近30日、直近90日など複数のウィンドウを評価
- すべてのウィンドウで80%以上の場合のみ配信

### 3. 信頼区間の考慮

- Wilson score intervalなどで統計的な信頼性を評価
- 下限が80%以上の場合のみ配信

### 4. リアルタイム勝率計算

- バックテストデータに依存せず、過去の実配信シグナルの勝率をリアルタイムで計算
- より現在の市場状況を反映

---

## 📚 関連ドキュメント

- `docs/SELL_SHORT_SIGNAL_IMPLEMENTATION_STATUS.md` - 実装状況の詳細
- `scripts/backtest/summarize_backtest.js` - バックテスト集計スクリプト
- `api/cron.js` - メイン配信ロジック

---

## ✅ 結論

**SELL/SHORTシグナルの80%勝率要件は完全に実装されました。**

- ✅ 勝率メトリクスの生成
- ✅ 配信前のゲートチェック
- ✅ 80%未満の場合は自動的に`BUG_STANDBY`に変更
- ✅ ログ出力による可視化

**次のステップ**:
1. より多くのバックテストデータを生成（`npm run backtest:real`）
2. メトリクスを更新（`npm run build:quality`）
3. 実際の配信で動作を確認
