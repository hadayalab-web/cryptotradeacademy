# PR #14 互換性修正レポート

**PR**: [#14: Fix CryptoQuant API endpoints to match v1 specification](https://github.com/hadayalab-web/cryptosignal-ai/pull/14)
**修正日**: 2025年12月24日

---

## 📋 概要

PR #14でCryptoQuant APIエンドポイントが修正され、戻り値の構造が変更されました。既存のコードとの互換性を保つため、影響を受ける箇所を修正しました。

---

## ✅ 実施した修正

### 1. `services/cryptoquant/deepMetrics.js`

**修正内容**: `getCQDeepMetrics()` の戻り値で `whaleData` を `whaleFlows` として返すように変更

**理由**: 既存のコード（`api/cron.js` など）が `cqDeep?.whaleFlows` として参照しているため、互換性を保つために `whaleFlows` として返すように変更しました。

**変更前**:
```javascript
return {
  ...baseResult,
  whaleData,        // ← whaleData として返していた
  liquidations,
  trapScore,
  longShortRatio: binanceDataForTrap?.currentLongShortRatio || 1.0,
  binance: binanceDataForTrap,
};
```

**変更後**:
```javascript
return {
  ...baseResult,
  whaleFlows: whaleData, // PR #14: whaleData を whaleFlows として返す（既存コードとの互換性のため）
  liquidations,
  trapScore,
  longShortRatio: binanceDataForTrap?.currentLongShortRatio || 1.0,
  binance: binanceDataForTrap,
};
```

---

### 2. `services/telegram/messages/user/en/regular.en.js`

**修正内容**: `whaleFlows` と `liquidations` の新しい構造に対応

**変更前**:
```javascript
// Whale Flows情報（EN市場専用）
if (whaleFlows && (whaleFlows.inflow || whaleFlows.outflow)) {
  const whaleLine = `🐋 Whale Flow: ${whaleFlows.netflow >= 0 ? 'Inflow' : 'Outflow'} ${Math.abs(whaleFlows.netflow).toFixed(0)} BTC`;
  lines.push(whaleLine);
}

// Liquidations情報（EN市場専用）
if (liquidations && liquidations > 0) {
  const liqLine = `💥 24h Liquidations: ${formatUsd(liquidations)}`;
  lines.push(liqLine);
}
```

**変更後**:
```javascript
// Whale Ratio情報（EN市場専用）
// PR #14: whaleFlows の構造が { whaleRatio, isHighPressure, interpretation } に変更
if (whaleFlows && whaleFlows.whaleRatio != null) {
  const whaleLine = `🐋 Whale Ratio: ${(whaleFlows.whaleRatio * 100).toFixed(1)}% ${whaleFlows.isHighPressure ? '(High Pressure)' : '(Normal)'}`;
  lines.push(whaleLine);
}

// Liquidations情報（EN市場専用）
// PR #14: liquidations の構造が { longLiquidations, shortLiquidations, totalLiquidations } に変更
const totalLiquidations = typeof liquidations === 'number'
  ? liquidations
  : (liquidations?.totalLiquidations ?? 0);
if (totalLiquidations > 0) {
  if (typeof liquidations === 'object' && liquidations.longLiquidations != null && liquidations.shortLiquidations != null) {
    const liqLine = `💥 24h Liquidations: ${formatUsd(totalLiquidations)} (Long: ${formatUsd(liquidations.longLiquidations)}, Short: ${formatUsd(liquidations.shortLiquidations)})`;
    lines.push(liqLine);
  } else {
    const liqLine = `💥 24h Liquidations: ${formatUsd(totalLiquidations)}`;
    lines.push(liqLine);
  }
}
```

**変更点**:
- `whaleFlows.netflow` → `whaleFlows.whaleRatio` に変更
- Whale Ratio（パーセンテージ）として表示
- `liquidations` を数値またはオブジェクトの両方に対応
- Long/Shortの内訳を表示（オブジェクトの場合）

---

### 3. `logic/eventTriggers.js`

**修正内容**: `liquidations` の新しい構造に対応

**変更前**:
```javascript
const trapScore = currentState.trapScore ?? cqDeep.trapScore ?? 0;
const liquidations = cqDeep.liquidations ?? 0;
const kimchiPremium = cqDeep.kimchiPremium ?? 0;
const mpi = cqDeep.mpi ?? cqDeep.minerMPI ?? 0;
```

**変更後**:
```javascript
const trapScore = currentState.trapScore ?? cqDeep.trapScore ?? 0;
// PR #14: liquidations の構造が { longLiquidations, shortLiquidations, totalLiquidations } に変更
const liquidationsData = cqDeep.liquidations ?? 0;
const liquidations = typeof liquidationsData === 'number'
  ? liquidationsData
  : (liquidationsData?.totalLiquidations ?? 0);
const kimchiPremium = cqDeep.kimchiPremium ?? 0;
const mpi = cqDeep.mpi ?? cqDeep.minerMPI ?? 0;
```

**変更点**:
- `liquidations` を数値またはオブジェクトの両方に対応
- オブジェクトの場合は `totalLiquidations` を取得

---

## 📊 修正ファイル一覧

| ファイル | 修正内容 | 影響範囲 |
|---------|---------|---------|
| `services/cryptoquant/deepMetrics.js` | `whaleData` → `whaleFlows` に変更 | `getCQDeepMetrics()` の戻り値 |
| `services/telegram/messages/user/en/regular.en.js` | `whaleFlows` と `liquidations` の新しい構造に対応 | メッセージフォーマット |
| `logic/eventTriggers.js` | `liquidations` の新しい構造に対応 | イベントトリガー判定 |

---

## 🔍 互換性の考慮

### 後方互換性

以下の修正により、既存のコードが正常に動作するようにしました：

1. **`whaleFlows` キーの維持**: `whaleData` を `whaleFlows` として返すことで、既存の `cqDeep?.whaleFlows` 参照が動作します

2. **`liquidations` の柔軟な処理**: 数値とオブジェクトの両方に対応することで、段階的な移行が可能です

3. **安全なデフォルト値**: `??` 演算子を使用して、undefined/null の場合のデフォルト値を設定

---

## ✅ テスト推奨項目

1. **メッセージフォーマットのテスト**:
   - EN市場の `formatRegularBriefing()` が新しい構造で正しく動作するか確認

2. **イベントトリガーのテスト**:
   - `evaluateTrigger()` が新しい `liquidations` 構造で正しく動作するか確認

3. **統合テスト**:
   - `api/cron.js` の全体フローが新しいデータ構造で正常に動作するか確認

---

## 📝 まとめ

PR #14の変更に対応し、既存のコードとの互換性を保つための修正を実施しました。すべての変更は後方互換性を考慮しており、段階的な移行が可能です。











