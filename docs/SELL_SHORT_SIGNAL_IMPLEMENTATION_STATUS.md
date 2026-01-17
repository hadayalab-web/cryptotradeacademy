# SELL/SHORTシグナル実装状況
**最終更新**: 2026-01-17 14:07:03  
**作成日時**: 2026-01-17 14:07:03  

**作成日**: 2026-01-17
**目的**: SELL/SHORTシグナルの実装状況と80%勝率要件の確認

---

## ✅ 実装済み機能

### 1. SELLシグナル生成ロジック

**ファイル**: `logic/core/marketCore.js` (204-206行目)

**条件**:
```javascript
if (score <= -HARD_SIGNAL_THRESH && confidence >= MIN_CONF_FOR_TRADE && smartMoneyScore < 0) {
  regime = 'DISTRIBUTION';
  signal = 'SELL';
}
```

**閾値** (デフォルト):
- `HARD_SIGNAL_THRESH`: -24 (BASEプロファイル)
- `MIN_CONF_FOR_TRADE`: 0.45 (BASEプロファイル)

**意味**:
- マーケットスコアが-24以下
- 信頼度が0.45以上
- スマートマネーが弱気（`smartMoneyScore < 0`）

---

### 2. SHORTポジション計算

**ファイル**: `logic/tier1_btc/signalGen.js` (60-64行目)

**実装**:
```javascript
} else if (signal === 'SELL') {
  // SHORT: 下方向 TP, 上方向 SL
  tpPrice = entry * (1 - tpPct);  // 下方向にTP
  slPrice = entry * (1 + slPct);  // 上方向にSL
}
```

**TP/SL設定**:
- **TP**: エントリー価格の-3.5% (下方向)
- **SL**: エントリー価格の+2.0% (上方向)
- **R:R比**: 約1.75

---

### 3. バックテスト機能

**ファイル**: `scripts/backtest/eval_signals.js`

**SHORTシグナル評価** (187-190行目):
```javascript
} else if (side === 'SHORT') {
  if (tpIndex === null && k.low <= tp) tpIndex = i;  // 下方向TP検出
  if (slIndex === null && k.high >= sl) slIndex = i;  // 上方向SL検出
}
```

**勝率計算**: `scripts/backtest/summarize_backtest.js` (108行目)
```javascript
const winRate = closedTrades > 0 ? (summary.wins / closedTrades) * 100 : null;
```

---

### 4. 配信ロジック

**ファイル**: `api/cron.js` (216行目)

**実装**:
```javascript
if (tradeSignal.signal === 'SELL') side = 'SHORT';
```

SELLシグナルはSHORTとして配信される。

---

## ❌ 未実装機能

### 80%勝率要件の強制チェック

**現状**: SELL/SHORTシグナルが生成されれば、**勝率に関係なく配信される**

**要件**: SELL/SHORTシグナルは**80%以上の勝率が必要**

**実装が必要な機能**:
1. バックテスト結果からSELL/SHORTシグナルの勝率を取得
2. 勝率が80%未満の場合は、シグナルを`BUG_STANDBY`に変更
3. または、SELL/SHORTシグナルを配信しない

---

## 📊 バックテスト結果（参考）

`data/signals_backtest.jsonl`から確認できるSELL/SHORTシグナルの例:

```json
{
  "signal": "SELL",
  "side": "SHORT",
  "entry": 23955,
  "tp": 23284,
  "sl": 24434,
  "backtest": {
    "outcome": "SL",  // この例は損失
    "holdingHours": 9
  }
}
```

**注意**: バックテスト結果を見ると、SELL/SHORTシグナルでも損失が出ているケースがある。

---

## 🔧 実装が必要な機能

### オプション1: バックテスト結果ベースのフィルタリング

**実装場所**: `api/cron.js` (tradeSignal生成後)

**ロジック**:
```javascript
// バックテスト結果からSELL/SHORTシグナルの勝率を取得
const sellShortWinRate = getSellShortWinRateFromBacktest();

if (tradeSignal.signal === 'SELL' && sellShortWinRate < 80) {
  // 80%未満の場合はBUG_STANDBYに変更
  tradeSignal.signal = 'NONE';
  normalizedSignal = 'BUG_STANDBY';
  console.log(`[SELL/SHORT] Win rate ${sellShortWinRate.toFixed(1)}% < 80%, blocking SELL signal`);
}
```

### オプション2: より厳格な閾値設定

**実装場所**: `config/thresholds.js` または `config/marketProfiles.js`

**ロジック**:
- SELLシグナル用に別の閾値を設定
- より厳格な条件（例: `HARD_SIGNAL_THRESH: -35`、`MIN_CONF_FOR_TRADE: 0.7`）

### オプション3: リアルタイム勝率計算

**実装場所**: 新規サービス

**ロジック**:
- 過去のSELL/SHORTシグナルの勝率をリアルタイムで計算
- 80%未満の場合は配信しない

---

## 📋 推奨実装アプローチ

### Phase 1: バックテスト結果ベース（推奨）

1. **バックテスト結果を読み込む**: `data/signals_backtest.jsonl`
2. **SELL/SHORTシグナルの勝率を計算**: 過去N件のSELL/SHORTシグナルから勝率を算出
3. **80%未満の場合はブロック**: `api/cron.js`でフィルタリング

**メリット**:
- 実装が簡単
- 既存のバックテストデータを活用
- リアルタイム配信前にチェック可能

**デメリット**:
- バックテストデータが古い場合、現在の市場状況を反映しない可能性

---

### Phase 2: より厳格な閾値設定

1. **SELL専用の閾値を設定**: `config/thresholds.js`に`SELL_SIGNAL_THRESH`を追加
2. **より厳格な条件**: 例: `HARD_SIGNAL_THRESH: -35`、`MIN_CONF_FOR_TRADE: 0.7`

**メリット**:
- シンプル
- リアルタイムで動作

**デメリット**:
- 80%勝率を保証するわけではない（調整が必要）

---

## 🎯 結論

### 実装済み ✅

1. ✅ SELLシグナル生成ロジック
2. ✅ SHORTポジション計算（TP/SL）
3. ✅ バックテスト機能（SHORT対応）
4. ✅ 配信ロジック（SELL → SHORT変換）

### 未実装 ❌

1. ❌ **80%勝率要件の強制チェック**
2. ❌ SELL/SHORTシグナルの勝率ベースフィルタリング
3. ❌ リアルタイム勝率計算

---

## 📝 次のステップ

80%勝率要件を実装する場合は、以下のいずれかのアプローチを選択：

1. **バックテスト結果ベースのフィルタリング**（推奨）
2. **より厳格な閾値設定**
3. **リアルタイム勝率計算サービス**

どのアプローチで実装しますか？
