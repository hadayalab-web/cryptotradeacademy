# バックテスト改善計画
**最終更新**: 2026-01-17 14:07:03  
**作成日時**: 2026-01-17 14:07:03  
**作成日**: 2026-01-17  

## 📋 実装状況

### ✅ 完了した項目

1. **Binance API統合**
   - `services/binance/client.js`作成
   - Funding Rate, Open Interest, Long/Short Ratio, 24h Ticker取得
   - CryptoQuantデータを補完するデータ取得機能

2. **BinanceデータのCryptoQuant統合**
   - `deepMetrics.js`にBinanceデータ統合
   - trapScore計算にFunding Rate/Long-Short Ratio補正追加

3. **スコア計算改善**
   - `marketCore.js`の`scoreSocial`にBinanceデータ補正追加
   - Funding Rate/Long-Short Ratioによる強気シグナル強化

4. **アルゴリズム自動チューニング基盤**
   - `scripts/backtest/autoTuner.js`実装
   - パラメータ空間定義、グリッドサーチ実装

5. **バックテストドキュメント**
   - `scripts/backtest/README.md`作成

### ⏳ 未実装/改善が必要な項目

1. **deepMetrics.jsのcalculateTrapScore関数**
   - Binanceデータ補正の実装が未完了（関数シグネチャは更新済み、呼び出し側は未更新）

2. **クリティカルイベント検証機能の強化**
   - 現在の`run_events_backtest.js`は基本的な実装のみ
   - PR用の詳細レポート生成機能が必要

3. **autoTuner.jsの評価メトリクス**
   - `evaluateParameters`関数が簡易実装
   - より詳細な評価（accuracy, precision, recall等）が必要

4. **バックテストデータの整理**
   - `data/`内の重複ファイル整理
   - 不要ファイルの削除

## 🎯 次のステップ

### 優先度1: calculateTrapScore関数の完全実装
- Binanceデータを`calculateTrapScore`に渡すように修正
- EN市場でのtrapScore計算時にBinanceデータ補正を適用

### 優先度2: クリティカルイベント検証レポート生成
- 過去のクリティカルイベント時にどのアラートが出ていたか検証
- PR用の詳細レポート生成機能追加

### 優先度3: アルゴリズム自動チューニングの完成
- 評価メトリクスの実装
- 実際のテストデータでの検証

### 優先度4: バックテストファイル整理
- 不要なダミーファイルの整理
- ディレクトリ構造の最適化

## 📝 実装メモ

### Binance API補完データの活用方法

1. **Funding Rate**
   - 高いFunding Rate（>0.01%）: 強気過多 → trapScore +10
   - 負のFunding Rate（<-0.01%）: 強気シグナル強化 → socialScore +5

2. **Long/Short Ratio**
   - Long過多（>1.5）: トラップリスク → trapScore +15
   - Short過多（<0.7）: 強気シグナル → socialScore +5

3. **Open Interest**
   - OI急増: ボラティリティ増加を示唆（将来的に実装）

## 🔗 関連ファイル

- `services/binance/client.js`: Binance APIクライアント
- `services/cryptoquant/deepMetrics.js`: CryptoQuant + Binance統合
- `logic/core/marketCore.js`: スコア計算（Binance補正含む）
- `scripts/backtest/autoTuner.js`: 自動チューニング
- `scripts/backtest/run_events_backtest.js`: イベントバックテスト



