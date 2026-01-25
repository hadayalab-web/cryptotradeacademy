# CryptoQuant 404エンドポイント削除完了

**削除日**: 2026-01-25  
**理由**: CryptoQuant APIで提供されていないエンドポイント（404エラー）への呼び出しを削除

---

## ❌ 削除されたエンドポイント

### 1. Liquidations Long/Short
**エンドポイント**: 
- `/derivatives/liquidations-long/btc`
- `/derivatives/liquidations-short/btc`

**削除理由**: CryptoQuant APIで提供されていない（404エラー）

**影響**:
- `getLiquidations()`関数は常に0を返すように変更
- `trapScore`計算ではLiquidationsによるスコア加算は行われない（Whale Ratioのみで計算）
- EMERGENCY判定の`liquidations > $500M`条件は実質的に無効化（常にfalse）
- メッセージテンプレートでは`liquidations > 0`の条件があるため、表示されない

**変更ファイル**:
- `services/cryptoquant/deepMetrics.js` - `getLiquidations()`を簡略化
- `services/cryptoquant/highResolution.js` - Liquidations取得を削除
- `services/cryptoquant/capabilities.js` - チェック対象から削除
- `logic/eventTriggers.js` - コメント更新

---

### 2. NUPL（Net Unrealized Profit/Loss）
**エンドポイント**: `/utxo-data/nupl/btc`

**削除理由**: CryptoQuant APIで提供されていない（404エラー）

**影響**:
- `getNUPL()`関数は常に0を返すように変更
- `riskReward`計算ではNUPLによる加算は行われない（SOPRのみで計算）

**変更ファイル**:
- `services/cryptoquant/deepMetrics.js` - `getNUPL()`を簡略化
- `services/cryptoquant/capabilities.js` - チェック対象から削除

---

## ✅ 効果

1. **APIコスト削減**: 404エンドポイントへの無駄なリクエストを削除
2. **レート枠節約**: 20リクエスト/分の制限内でより効率的に
3. **エラーログ削減**: 404エラーのログが出力されなくなる
4. **コード簡素化**: 不要な機能フラグチェックとエラーハンドリングを削除

---

## 📊 現在の使用エンドポイント（6種類）

1. `/btc/exchange-flows/netflow` - Exchange Netflow（基本）
2. `/btc/flow-indicator/mpi` - MPI（基本）
3. `/btc/flow-indicator/exchange-whale-ratio` - Whale Ratio（EN市場）
4. `/btc/exchange-flows/inflow` (exchange=upbit) - Upbit Inflow（KO市場）
5. `/btc/exchange-flows/inflow` (exchange=binance) - Binance Inflow（KO市場）
6. `/btc/market-indicator/sopr` - SOPR（JA市場）

**削除前**: 9種類  
**削除後**: 6種類  
**削減**: 3エンドポイント（33%削減）

---

## 🔄 後方互換性

- `liquidations`パラメータは互換性のため残すが、常に0を返す
- `nupl`パラメータは互換性のため残すが、常に0を返す
- 既存のコードは変更なしで動作（0が返されるため）

---

## 📝 関連ドキュメント

- `docs/CRYPTOQUANT_ENDPOINTS_SUMMARY_2026-01-25.md` - エンドポイント一覧（更新済み）
- `CRYPTOQUANT_ENDPOINTS_NOT_AVAILABLE.md` - 404エンドポイントの確認記録
