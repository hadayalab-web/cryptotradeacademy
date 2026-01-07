# 🎯 SSOT ChangeEdge BTC - マーケティング戦略の正

**Version**: 1.0 FINAL  
**作成日**: 2026-01-27  
**Status**: ✅ マーケティング戦略確定版  
**Purpose**: ChangeEdge BTC の完全統一SSOT（戦略・技術・価格・実装・メッセージング）

---

## 📌 エグゼクティブサマリー

### プロダクト概要

- **プロダクト名**: **ChangeEdge BTC**
- **ブランド名**: **CryptoTradeAcademy**
- **ドメイン**: **cryptotradeacademy.io**
- **タグライン**: "Change the trend. Change your game. Get the edge."
- **Repository**: `github.com/hadayalab-web/cryptosignal-ai`
- **プラットフォーム**: Vercel（6独立デプロイメント）
- **販売戦略**: アフィリエイト展開のみ（広告展開なし）

### 核心価値提案（USP）

**ChangeEdge BTC は、トレーダーに「2つのチェンジ」を提供する**:

1. **トレンド転換のチェンジ**: 市場のトレンド転換を先取り検出（Trend Reversal Detection）
2. **弱小トレーダーから脱却のチェンジ**: SmartMoney視点への転換、情報の非対称性の解消

**具体的な価値**:
- ✅ **トレンド転換を捉える高精度シグナル**（全方位BUY/SELL/LONG/SHORT対応、信頼度スコアベース品質ゲート）
- ✅ **BUY/LONGとSELL/SHORTの両方に対応**（全方向シグナル生成）
- ✅ **市場トラップ検出**（Whale Dump、Retail FOMO Trap、Miner Selling、Liquidation Cascade）
- ✅ **高解像度データ分析**（CryptoQuant + Grok X解析の統合）
- ✅ **Trap Defense Academy戦略**（70%の時間は`TRAP_STANDBY`で待機 = 明確な優位性が出るまで防御）

---

## 💡 プロダクト名「ChangeEdge」の意味

### 選定理由

**ChangeEdge** は以下の2つの価値を直接的に表現する：

1. **「Change（転換）」**: 
   - トレンド転換の検出（`trendReversalDetector.js`, `divergenceDetector.js`）
   - 弱小トレーダーから脱却（SmartMoney視点への転換）

2. **「Edge（優位性）」**: 
   - SmartMoneyと同じ視点を獲得
   - 情報の非対称性の解消
   - 市場の裏側で起こっている「トラップ」を先取り検出

### タグライン

**EN市場**: "Change the trend. Change your game. Get the edge."

**多言語対応**:
- **JA**: "トレンド転換のチェンジ。弱小トレーダーから脱却のチェンジ。"
- **KO**: "트렌드 전환의 체인지. 약소 트레이더 탈피의 체인지."
- **ES**: "Cambia la tendencia. Cambia tu juego. Obtén la ventaja."
- **PT-BR**: "Mude a tendência. Mude seu jogo. Obtenha a vantagem."
- **AR**: "غير الاتجاه. غير لعبتك. احصل على الميزة."

---

## 🎯 ターゲットトレーダー像と価値提案

### 渇望するトレーダー像

**ChangeEdge BTC を渇望するトレーダーは**:

1. **「トレンド転換を見逃して損失を出す」トレーダー**
   - 問題: トレンド転換のタイミングがわからない
   - 解決: 早期トレンド転換検出により先取り可能

2. **「情報格差を感じている」弱小トレーダー（リテール）**
   - 問題: SmartMoneyと同じ情報にアクセスできない
   - 解決: 高解像度データ（CryptoQuant + Grok X）で情報格差を解消

3. **「リテールFOMOトラップに引っかかる」トレーダー**
   - 問題: 上昇局面で買い込んで高値掴み
   - 解決: 市場トラップ検出で事前に警告

4. **「シグナルの品質に不安を感じている」トレーダー**
   - 問題: 低品質シグナルで損失を出す
   - 解決: 信頼度スコアベースの統一品質ゲートで品質保証（全方位BUY/SELL/LONG/SHORT対応）

5. **「待つ理由がわからず、無駄な取引をしてしまう」トレーダー**
   - 問題: 「いつ取引すべきか」が不明確
   - 解決: `TRAP_STANDBY`モードで「70%の時間は待機」を明確化

### 日常抱えている問題と課題（チューニング済みロジック・メッセージテンプレートに基づく）

#### 問題1: 情報の非対称性

**課題**:
- クジラ（SmartMoney）が何をしているか見えない
- リテールがFOMOで買い込んでいるタイミングがわからない
- オンチェーンデータ（Exchange Netflow、Miner Position Index）とXセンチメントのズレが検出できない

**ChangeEdge BTCの解決**:
- **高解像度CryptoQuantデータ取得**（`services/cryptoquant/highResolution.js`）
  - Exchange Netflowの複数時間窓分析（hour, 4hour, day）
  - Miner Position Index (MPI)の時系列トレンド分析
  - 複数時間窓での整合性チェック
- **Grok X高解像度解析**（`services/grok/highResolution.js`）
  - Whale Bias（-1 ~ +1）の検出
  - Retail FOMO（0 ~ 100）の検出
  - Whale-Retail Divergence（クジラとリテールのズレ）の可視化
- **メッセージテンプレートでの表示**:
  - "🐋 Whale-Retail Divergence: {divergenceValue}"
  - "📊 Market Trap Detection: {trapDetails}"

#### 問題2: トレンド転換を見逃す

**課題**:
- 上昇トレンドが終わるタイミングがわからない
- 下降トレンドが始まるタイミングがわからない
- 複数の指標が矛盾していて判断できない

**ChangeEdge BTCの解決**:
- **トレンド転換検出**（`logic/core/trendReversalDetector.js`）
  - 線形回帰によるトレンド分析
  - 加速度（変化率の変化率）の検出
  - Z-scoreベースの異常検知
- **ダイバージェンス検出**（`logic/core/divergenceDetector.js`）
  - オンチェーンとXセンチメントのズレ検出
  - 価格とオンチェーンのズレ検出
  - 価格とXセンチメントのズレ検出
  - 複数ダイバージェンスの同時発生検出
- **メッセージテンプレートでの表示**:
  - "🔄 Multi-Timeframe Trend Analysis: {trendDetails}"
  - "📈 High-Resolution Divergence Signal: {signalDetails}"

#### 問題3: SELL/SHORTシグナルの品質が低い

**課題**:
- 過去のSELL/SHORTシグナルで勝率が低い
- 低品質シグナルで損失を出す
- サンプル数が少なくて統計的信頼性がない

**ChangeEdge BTCの解決**:
- **信頼度スコアベースの統一品質ゲート**（`api/cron.js`）
  - **MIN_CONF_FOR_TRADE要件**（デフォルト: 0.45、市場別・イベント別に調整可能）
  - **全方位BUY/SELL/LONG/SHORTシグナルに統一適用**
  - `coreDecision.confidence < MIN_CONF_FOR_TRADE`の場合はシグナルをブロック
- **厳格なダイバージェンス条件**（`logic/core/divergenceDetector.js`）
  - 最高勝率条件: `enhancedConfidence >= 0.75`, `multipleDivergences >= 3`
  - 通常高勝率条件: `enhancedConfidence >= 0.70`, `multipleDivergences >= 2`
  - BUY/LONGとSELL/SHORTの両方で同じ基準を適用
  - 弱小トレーダー（リテール）を逆張りするシグナル生成

#### 問題4: 待つ理由が不明確

**課題**:
- 「いつ取引すべきか」が不明確
- 取引しない理由がわからない
- 無駄な取引をして手数料を払う

**ChangeEdge BTCの解決**:
- **Trap Defense Academy戦略**（`TRAP_STANDBY`モード）
  - 70%の時間は「明確な優位性が出るまで待機」
  - トラップが検出された場合のみシグナル生成
- **メッセージテンプレートでの表示**:
  - "🛡️ トラップスタンバイ (Defense Active)"
  - "Why standby? Change not yet clear. Protect capital. Wait for clear change."

#### 問題5: 判断根拠が不透明

**課題**:
- シグナルの根拠がわからない
- 信頼度が数値で示されない
- 複数の指標をどう統合しているか不明

**ChangeEdge BTCの解決**:
- **信頼度の数値表示**（`confidence: 0.0 ~ 1.0`）
- **検出方式の明示**（Divergence Signal, Trend Reversal Signal等）
- **複合ダイバージェンスの可視化**（複数のダイバージェンスが同時発生）
- **メッセージテンプレートでの表示**:
  - "🎯 Signal Confidence: {confidence}%"
  - "🔍 Detection Method: {method}"
  - "📊 Divergence Details: {details}"

### 問題解決後の感情の変化

**ChangeEdge BTC を受け取ることで、トレーダーは以下の感情の変化を体験する**:

1. **「無力感」→「主導権の回復」**
   - 情報の非対称性が解消され、SmartMoneyと同じ視点を獲得
   - 市場の裏側で起こっている「トラップ」を先取り検出できる

2. **「不利感」→「優位感」**
   - 高解像度データで情報格差を解消
   - トレンド転換を捉える高精度シグナルで自信を持って取引できる

3. **「トレンド転換を見逃す」→「トレンド転換を先取り」**
   - 早期トレンド転換検出により、転換点を先取り
   - 複数時間窓での整合性チェックで確実性が向上

4. **「焦りからの解放」**
   - `TRAP_STANDBY`モードで「70%の時間は待機」が明確化
   - 「待つ理由」が可視化され、無駄な取引をしなくなる

5. **「信頼と期待」**
   - 信頼度スコアベースの統一品質ゲートで品質が保証される
   - 信頼度が数値で示され、判断根拠が透明化される

---

## 🔧 チューニング済み技術仕様

### 1. 高解像度データ取得システム

#### 1.1 CryptoQuant高解像度データ取得

**実装ファイル**: `services/cryptoquant/highResolution.js`

**機能**:
- **複数時間窓でのデータ取得**: `hour`, `4hour`, `day`（プラン制限に応じて動的調整）
- **Professionalプラン対応**: デフォルトで`['day']`のみ使用（`CRYPTOQUANT_PLAN=professional`）
- **Premiumプラン以上**: `['hour', '4hour', 'day']`が利用可能
- **トレンド分析**: 線形回帰による傾き計算
- **加速度検出**: 変化率の変化率を計算
- **異常検知**: Z-scoreベースの異常スコア

**主要関数**:
- `getExchangeNetflowMultiTimeframe(windows, limit)`: Exchange Netflowの複数時間窓取得
- `getMPIMultiTimeframe(windows, limit)`: Miner Position Index (MPI)の複数時間窓取得
- `getHighResolutionCQData(windows)`: 統合高解像度データ取得

#### 1.2 Grok X高解像度解析

**実装ファイル**: `services/grok/highResolution.js`

**機能**:
- **X（Twitter）センチメント解析**: Grok X APIを使用
- **Whale Bias検出**: -1 ~ +1の範囲でクジラのバイアスを検出
- **Retail FOMO検出**: 0 ~ 100の範囲でリテールFOMOを検出
- **Funding Sentiment**: 資金調達センチメント
- **ETF Flow Sentiment**: ETFフローセンチメント
- **Liquidation Risk**: 清算リスク検出

#### 1.3 CryptoQuant API クライアント

**実装ファイル**: `services/cryptoquant/client.js`

**機能**:
- **レート制限対応**: `p-retry`と`waitForRateLimit`で3秒間隔に制御
- **Professionalプラン最適化**: 3秒間隔でリクエストを制御し、レート制限を回避
- **エラーハンドリング**: リトライロジックで堅牢性を確保

### 2. ダイバージェンス検出ロジック

**実装ファイル**: `logic/core/divergenceDetector.js`

**核心ロジック**:

#### 2.1 高勝率SELL/SHORT条件（`isHighWinRateSellCondition`）

**検出パターン**: 「上昇局面で大口が売り抜け＋小口が買い続け」

**厳格な条件**:
- `confidence >= 0.75`（信頼度75%以上）
- `multipleDivergences >= 3`（複数ダイバージェンスが3つ以上同時発生）
- `onchainScore < -25`（オンチェーン指標が強い弱気）
- `socialScore < -45`（Xセンチメントが強い弱気）
- `priceChange24h > 0 && priceChange24h < 10`（価格が適度に上昇中、急騰すぎない）
- `exchangeNetflow > 2000`（取引所への流入 = 大口が売り）
- `retailFomo > 70`（リテールFOMOが高い）

**ターゲット**: 弱小トレーダー（リテール）を逆張り

#### 2.2 高勝率BUY/LONG条件（`isHighWinRateBuyCondition`）

**検出パターン**: 「下落局面で大口が買い集め＋小口が売り続け」（SELLの逆パターン）

**厳格な条件**:
- `confidence >= 0.70`（信頼度70%以上、高解像度では`0.75`以上）
- `multipleDivergences >= 2`（複数ダイバージェンスが2つ以上同時発生、高解像度では3つ以上）
- `priceChange24h < 0`（価格が下落中 = 底値圏での大口の買い集め）
- `exchangeNetflow < -2000`（取引所からの流出 = 大口が買い集め）
- `minerMPI < 0`（マイナーも買い = MPIマイナス）
- `onchainScore > 20.0`（オンチェーン指標が強気）
- `retailFomo <= 50`（リテールFOMOが低い = リテールが売り）
- `whaleBias >= 0.4`（クジラバイアスがプラス = 大口が買い）

**ターゲット**: 下落局面でリテールが売り続けている中、大口が底値圏で買い集めているパターンを検出

#### 2.3 高解像度ダイバージェンス検出（`evaluateDivergenceSignalHighResolution`）

**機能**:
- 複数時間窓データを使用した強化検出
- 複数時間窓での整合性チェック

**SELL/SHORTシグナル**:
- `enhancedConfidence >= 0.75`、`multipleDivergences >= 3`で高勝率シグナル（最高勝率）
- または `enhancedConfidence >= 0.70`、`multipleDivergences >= 2`で通常高勝率シグナル

**BUY/LONGシグナル**:
- `enhancedConfidence >= 0.75`、`multipleDivergences >= 3`で高勝率シグナル（最高勝率）
- または `enhancedConfidence >= 0.70`、`multipleDivergences >= 2`で通常高勝率シグナル

### 3. シグナル品質ゲート（信頼度スコアベース統一）

**実装ファイル**: `api/cron.js`（統一品質ゲートロジック）

**機能**: 全方位BUY/SELL/LONG/SHORTシグナルに対して信頼度スコアベースで統一判定

**信頼度スコアベース品質ゲート**（**全方位対応**）:
- `MIN_CONF_FOR_TRADE`（デフォルト: 0.45）を最小信頼度として適用
- `coreDecision.confidence < MIN_CONF_FOR_TRADE`の場合はシグナルをブロックし、`BUG_STANDBY`に変更
- 市場別プロファイル（`config/marketProfiles.js`）で`MIN_CONF_FOR_TRADE`を上書き可能
- イベントプロファイル（FOMC等）では`MIN_CONF_FOR_TRADE: 0.40`に緩和

**高勝率シグナルの条件**（ダイバージェンス検出ロジック内）:
- **最高勝率**: `enhancedConfidence >= 0.75` かつ `multipleDivergences >= 3`
- **通常高勝率**: `enhancedConfidence >= 0.70` かつ `multipleDivergences >= 2`
- これらの条件はBUY/LONGとSELL/SHORTの両方に適用

### 4. 市場トラップ検出

**実装ファイル**: `logic/tier1_btc/trapDetector.js`

**検出パターン**:
- **Whale Dump Trap**: 大口売却トラップ
- **Retail FOMO Trap**: リテールFOMOトラップ
- **Miner Selling Trap**: マイナー売却トラップ
- **Liquidation Cascade**: 清算カスケード

**実装ファイル**: `services/cryptoquant/highResolution.js` - `detectMarketBugs()`

**機能**:
- 複数のトラップパターンを統合的に検出
- トラップスコア（0-100）を計算
- `trapScore > 60`でEMERGENCY配信トリガー

**用語統一**: ユーザー向けメッセージでは「Bug」→「Trap」に統一（`BUG_STANDBY`は内部コード識別子として維持）

### 5. トレンド転換検出

**実装ファイル**: `logic/core/trendReversalDetector.js`

**機能**:
- `TrendReversalDetector`クラスによる早期検出
- `FeatureEngine`による特徴量正規化
- `shouldFireSellShort`ゲートで厳格な閾値適用
- リード/ラグ推定によるタイミング最適化

### 6. 市場コア意思決定ロジック

**実装ファイル**: `logic/core/marketCore.js`

**機能**:
- `decideSignal()`: 統合シグナル決定
  - `DivergenceDetector`のシグナルを最優先（`confidence >= 0.70`または`0.75`）
  - `divergenceSignal`を返す
- `decideSignalAdvanced()`: 高度なシグナル決定
- 複数のスコア（Netflow, MPI, Social）を統合

### 7. 配信スケジューリング

**実装ファイル**: `api/cron.js`, `vercel.json`

**定期配信**: 6時間ごと（0:00, 6:00, 12:00, 18:00 UTC）
- `REGULAR_HOURS = [0, 6, 12, 18]`
- `vercel.json`: `/api/prepare` cron schedule `55 17,23,5,11 * * *`（UTC）

**イベント駆動配信**（`ENABLE_EVENT_DRIVEN=true`）:
- **EMERGENCY**: `trapScore > 60`（即座配信）
- **WATCH**: `score変動 > 30pt`（30分以内配信）
- **STANDBY_BREAK**: 24時間以上`BUG_STANDBY`後の条件成立（即座配信）
- **REGULAR**: 24時間強制配信（安心感のための定期配信）

---

## 📝 チューニング済みメッセージテンプレート

### 1. メッセージテンプレート構成

**対応言語**: 6言語（EN, JA, KO, ES, PT-BR, AR）

**ファイル構成**:
- `services/telegram/messages/user/{lang}/regular.{lang}.js`: 定期ブリーフ
- `services/telegram/messages/user/{lang}/emergency.{lang}.js`: トラップアラート

### 2. 定期ブリーフ（Regular Briefing）

**ヘッダー**: `📚 *ChangeEdge BTC* {Market Brief}`

**主要セクション**:

1. **Market Trap Detection（市場トラップ検出）**
   - `detectMarketBugs()`の結果を表示
   - Whale Dump、Retail FOMO Trap、Miner Selling、Liquidation Cascade

2. **Whale-Retail Divergence（クジラ-リテールダイバージェンス）**
   - Whale BiasとRetail FOMOのズレを可視化
   - `whaleRetailDivergence`の数値表示

3. **Multi-Timeframe Trend Analysis（複数時間窓トレンド分析）**
   - `highResCQ.netflow.timeframes`の表示
   - 各時間窓（hour, 4hour, day）のトレンド、加速度、異常スコア

4. **High-Resolution Divergence Signal Details（高解像度ダイバージェンスシグナル詳細）**
   - `divergenceSignal`の詳細表示
   - 信頼度、検出方式、複合ダイバージェンス数

5. **Signal Status（シグナルステータス）**
   - `TRAP_STANDBY`: "🛡️ トラップスタンバイ (Defense Active)"
   - `BUY/LONG` / `SELL/SHORT`: シグナル詳細

**用語統一**:
- "Bug" → "Trap"（すべてのユーザー向けメッセージ）
- "Market Bug Detection" → "Market Trap Detection"
- "Overall Bug Score" → "Overall Trap Score"
- "BUG STANDBY" → "トラップスタンバイ" / "TRAP STANDBY"

### 3. 緊急アラート（Emergency Alert）

**ヘッダー**: `🚨 *ChangeEdge BTC* Trap Alert`

**トリガー条件**:
- `trapScore > 60`
- `liquidations > $500M`
- `kimchiPremium > 8%`（KO市場のみ）

**表示内容**:
- トラップタイプと詳細
- 緊急度と推奨アクション

### 4. 言語別カスタマイズ

**EN市場**:
- Tagline: "Change the trend. Change your game. Get the edge."
- Persona: `PRECISION_SNIPER`

**JA市場**:
- Tagline: "トレンド転換のチェンジ。弱小トレーダーから脱却のチェンジ。"
- Persona: `KAIZEN_OPTIMIZER`

**KO市場**:
- Tagline: "트렌드 전환의 체인지. 약소 트레이더 탈피의 체인지."
- Persona: `KIMCHI_SNIPER`
- Kimchi Premium監視: 3分ごと

**AR市場**:
- Tagline: "حافة التغيير - 70% من الوقت نحميك"
- Persona: `SHIELD_WALL`
- Islamic Finance準拠: 100%

**ES/PT-BR市場**:
- Tagline: "Cambia la tendencia. Cambia tu juego. Obtén la ventaja."
- Persona: `VOZ_COMUN` / `VOZ_COMUM`
- LATAM購買力対応価格設定

---

## 💰 価格設定（最終決定版）

### EN市場（USD） - 3プラン構成

| プラン | タイプ | 期間 | 月額換算 | 総額 | 割引率 | アフィリエイター報酬率 | アフィリエイター報酬 |
|--------|--------|------|----------|------|--------|---------------------|---------------------|
| **1か月** | `renewal` | 30日 | $69/月 | **$69** | 0% | 50% | **$34.5** |
| **3か月** | `one_time` | 90日 | $55/月 | **$165** | -20% | 45% | **$74.25** ⭐ |
| **1年** | `one_time` | 365日 | $49/月 | **$588** | -29% | 40% | **$235.2** |

**決定理由**:
- ベース価格: $69/月（SSOT仕様準拠）
- 3か月プランをメイン推奨（-20%割引、最適な価値比率）
- 1年プランで最大割引（-29%）
- 全プラン共通: 1日無料トライアル

### 他の市場（相対価格換算）

#### AR市場（USD）
- **1か月**: $89/月（renewal）
- **3か月**: $223（one_time、-17%）
- **1年**: $756（one_time、-29%）

#### KO市場（KRW）
- **1か月**: ₩79,000/月（renewal）
- **3か月**: ₩197,500（one_time、-17%）
- **1年**: ₩669,200（one_time、-29%）

#### JA市場（JPY）
- **1か月**: ¥10,350/月（renewal）
- **3か月**: ¥25,875（one_time、-17%）
- **1年**: ¥87,660（one_time、-29%）

#### ES/PT-BR市場（USD - LATAM価格）
- **1か月**: $49/月（renewal）
- **3か月**: $123（one_time、-17%）
- **1年**: $417（one_time、-29%）

---

## 🔍 技術的実装詳細

### API構成とコスト

- **CryptoQuant**: Professionalプラン（API解像度: 1日まで）
- **Grok-4-0709**: $105/月（実測 - 36回/日 × 30日）
- **Telegram Bot**: $0（完全無料）
- **Upbit API**: $0（公開API）
- **Exchange Rate API**: $0（exchangerate-api.com）

### データ取得頻度と最適化

**CryptoQuant API**:
- レート制限: 3秒間隔（`waitForRateLimit`で制御）
- リトライ: `p-retry`で2回リトライ
- Professionalプラン: デフォルトで`['day']`のみ使用

**定期配信頻度**: 6時間ごと（0:00, 6:00, 12:00, 18:00 UTC）
- 1日4回 × 6言語 = 24回/日
- Grok X解析: 24回/日 × 平均コスト = $105/月

### シグナル生成フロー

```
1. 高解像度データ取得
   ├─ CryptoQuant（Exchange Netflow, MPI, Whale Ratio, Liquidations）
   └─ Grok X（Whale Bias, Retail FOMO, Funding Sentiment）

2. ダイバージェンス検出
   ├─ evaluateDivergenceSignal() - 基本検出
   └─ evaluateDivergenceSignalHighResolution() - 高解像度検出

3. 市場トラップ検出
   └─ detectMarketBugs() - Whale Dump, Retail FOMO Trap等

4. トレンド転換検出
   └─ TrendReversalDetector - 早期検出

5. シグナル品質ゲート（全方位対応、信頼度スコアベース統一）
   └─ api/cron.js - MIN_CONF_FOR_TRADEベース品質ゲート

6. メッセージ生成と配信
   ├─ formatRegularBriefing() - 定期ブリーフ
   └─ formatTrapAlert() - トラップアラート
```

### 閾値設定（市場別）

**EN市場**:
- `HARD_SIGNAL_THRESH: 24`
- `SOFT_REGIME_THRESH: 18`
- `MIN_CONF_FOR_TRADE: 0.45`
- `BUG_STANDBY_BIAS: 10`

**AR市場**:
- `HARD_SIGNAL_THRESH: 18`
- `SOFT_REGIME_THRESH: 12`
- `MIN_CONF_FOR_TRADE: 0.4`
- `BUG_STANDBY_BIAS: 65`

**KO市場**:
- `HARD_SIGNAL_THRESH: 22`
- `SOFT_REGIME_THRESH: 16`
- `MIN_CONF_FOR_TRADE: 0.50`
- `BUG_STANDBY_BIAS: 15`
- `KIMCHI_PREMIUM_THRESH: 0.05`（5%）

**JA市場**:
- `HARD_SIGNAL_THRESH: 23`
- `SOFT_REGIME_THRESH: 17`
- `MIN_CONF_FOR_TRADE: 0.52`
- `BUG_STANDBY_BIAS: 18`

**ES/PT-BR市場**:
- `HARD_SIGNAL_THRESH: 24`
- `SOFT_REGIME_THRESH: 17`
- `MIN_CONF_FOR_TRADE: 0.50`
- `BUG_STANDBY_BIAS: 15`

---

## 🎯 マーケティング戦略

### カテゴリ創造（木下ロジック②）

**旧カテゴリ**: Crypto Signal Service
- 競合: 10,000+
- CPA: $150（実測）
- LTV: $69 × 3ヶ月 = $207

**新カテゴリ**: **Trap Defense Academy**
- 競合: 3（独自調査）
- CPA: $50-80（70ドル削減）
- 差別化: 完全独占（"70%の時間、何もするな"）
- LTV: $69 × 12ヶ月 = $828（4倍）

### 核心価値提案（6つの柱）

1. **情報の非対称性の解消**
   - 「見えなかったものが見える」→ SmartMoneyと同じ視点
   - 大口売却、リテールFOMOトラップ、ダイバージェンスが可視化

2. **待つ理由の明確化**
   - `TRAP_STANDBY`戦略（70%の時間待つ）
   - 「明確な優位性が出るまで待機。守りを優先。」

3. **トレンド転換を捉える高精度シグナル**
   - 信頼度スコア未達のシグナルは遮断される
   - 届いたシグナルは高信頼度で信頼できる

4. **透明性と判断根拠の可視化**
   - 信頼度が数値で示される
   - 検出方式が明示される
   - 複合ダイバージェンスが検出される

5. **防御的アプローチ（守りを優先）**
   - 過去の失敗パターンを避けられる
   - 資産を守れる
   - リテールFOMOトラップを回避できる

6. **2つのチェンジ（Change）の価値**
   - **トレンド転換のチェンジ**: トレンド転換を先取り
   - **弱小トレーダーから脱却のチェンジ**: SmartMoney視点への転換、情報格差の解消

### 市場別ペルソナ

**EN市場: Precision Sniper Academy**
- Hero Message: "You were exit liquidity."
- アルゴリズム: 中程度の閾値、適度なスタンバイバイアス

**AR市場: MaaliGuard (حارس الأموال)**
- Hero Message: "70%の時間、私たちは言う:待て"
- アルゴリズム: 超保守的、高いスタンバイバイアス（65%）
- Islamic Finance準拠: 100%

**KO市場: KimchiSniper (김치 저격수)**
- Hero Message: "3分ごとのKimchi Premium警告"
- アルゴリズム: 中程度の閾値、Kimchi Premium監視

**JA市場: Kaizen Trader (改善AI)**
- Hero Message: "改善AI - 毎日1%改善する職人"
- アルゴリズム: 中程度の閾値、適度なスタンバイバイアス

**ES/PT-BR市場: VozComún / VozComum**
- Hero Message: "5,000 traders te protegen ahora"
- アルゴリズム: LATAM購買力対応価格設定

---

## 📊 シグナルロジック最適化計画

### Phase 1: 緊急対応（勝率改善）

1. **`divergenceDetector.js`の条件見直し**
   - `isHighWinRateSellCondition`の閾値を厳格化
   - `confidence >= 0.75`に引き上げ（0.70から）
   - `multipleDivergences >= 3`に引き上げ（2から）

2. **`marketCore.js`での優先順位明確化**
   - DivergenceDetectorのシグナルを最優先
   - 信頼度0.75以上のシグナルのみ配信

3. **サンプル数不足時の保守的動作**
   - `MIN_CONF_FOR_TRADE`を動的に0.70に引き上げ
   - サンプル数が30件に達するまで

### Phase 2: コード品質向上

1. **統一信頼度計算器の実装**
   - `logic/core/confidenceCalculator.js`を新規作成
   - すべての検出器で使用

2. **シグナル検出ロジックの統合**
   - `api/cron.js`での検出器呼び出しを整理
   - 優先順位の明確化

3. **閾値管理の一元化**
   - `config/thresholds.js`を唯一の真実の源に
   - `config/marketProfiles.js`からの参照に変更

### Phase 3: メトリクス改善

1. **リアルタイムメトリクス更新**
   - シグナル配信後の価格追跡
   - 自動TP/SL判定と記録

2. **バックテスト自動化**
   - 毎日のcron実行時に自動バックテスト
   - メトリクス自動更新

---

## ✅ 実装完了項目

### ロジック実装

- ✅ 高解像度CryptoQuantデータ取得（`services/cryptoquant/highResolution.js`）
- ✅ 高解像度Grok X解析（`services/grok/highResolution.js`）
- ✅ ダイバージェンス検出（`logic/core/divergenceDetector.js`）
- ✅ シグナル品質ゲート（`logic/core/signalQualityGate.js`）
- ✅ 市場トラップ検出（`logic/tier1_btc/trapDetector.js`）
- ✅ トレンド転換検出（`logic/core/trendReversalDetector.js`）
- ✅ CryptoQuant APIレート制限対応（`services/cryptoquant/client.js`）

### メッセージテンプレート

- ✅ 6言語対応（EN, JA, KO, ES, PT-BR, AR）
- ✅ ChangeEdge BTC反映（全言語のヘッダー更新）
- ✅ "Bug" → "Trap"統一（全言語）
- ✅ 高解像度データ表示セクション追加
- ✅ 市場トラップ検出セクション追加
- ✅ Whale-Retail Divergence表示追加
- ✅ Multi-Timeframe Trend Analysis表示追加

### 設定・ドキュメント

- ✅ 市場プロファイル設定（`config/marketProfiles.js`）
- ✅ 価格設定決定（`docs/PRICING_PLAN_RECOMMENDATION.md`）
- ✅ プロダクト名決定（ChangeEdge BTC）
- ✅ ブランド・ドメイン決定（CryptoTradeAcademy, cryptotradeacademy.io）
- ✅ 配信スケジュール設定（6時間ごと）

---

## 📋 決定事項まとめ

### プロダクト命名

- **プロダクト名**: **ChangeEdge BTC**
- **ブランド名**: **CryptoTradeAcademy**
- **ドメイン**: **cryptotradeacademy.io**
- **タグライン**: "Change the trend. Change your game. Get the edge."

### 価格プラン（EN市場）

- **1か月**: $69/月（renewal、アフィリエイター報酬50%）
- **3か月**: $165（one_time、-20%割引、アフィリエイター報酬45%）⭐ メイン推奨
- **1年**: $588（one_time、-29%割引、アフィリエイター報酬40%）

### 配信スケジュール

- **定期配信**: 6時間ごと（0:00, 6:00, 12:00, 18:00 UTC）
- **イベント駆動**: EMERGENCY（即座）、WATCH（30分以内）、STANDBY_BREAK（24時間後）

### 用語統一

- **ユーザー向けメッセージ**: "Trap"（"Bug"から変更）
- **内部コード**: `BUG_STANDBY`（識別子として維持）

### シグナル品質要件（信頼度スコアベース統一）

- **全方位シグナル（BUY/SELL/LONG/SHORT）**: 信頼度スコアベース品質ゲート統一適用
  - `coreDecision.confidence >= MIN_CONF_FOR_TRADE`（デフォルト: 0.45）
  - 信頼度未達のシグナルはブロックされ、`BUG_STANDBY`に変更
- **高勝率シグナル条件**（ダイバージェンス検出ロジック内）:
  - **最高勝率**: `enhancedConfidence >= 0.75` かつ `multipleDivergences >= 3`
  - **通常高勝率**: `enhancedConfidence >= 0.70` かつ `multipleDivergences >= 2`
  - BUY/LONGとSELL/SHORTの両方で同じ基準を適用
- **市場別・イベント別調整**: `config/marketProfiles.js`と`config/thresholds.js`で`MIN_CONF_FOR_TRADE`を上書き可能

---

## 🚀 次のステップ（実装計画）

### 優先度: 高

1. **Whop設定の更新**
   - EN市場の月額プランを$69に設定
   - 3か月プラン（$165）を新規作成
   - 年額プランを$588に設定
   - アフィリエイター報酬率の設定（1か月: 50%, 3か月: 45%, 1年: 40%）

2. **Phase 1: シグナルロジック最適化**
   - `divergenceDetector.js`の条件見直し
   - `marketCore.js`での優先順位明確化
   - サンプル数不足時の保守的動作

### 優先度: 中

1. **Phase 2: コード品質向上**
   - 統一信頼度計算器の実装
   - シグナル検出ロジックの統合
   - 閾値管理の一元化

2. **ドキュメント整備**
   - README.mdの更新
   - APIドキュメントの整備

### 優先度: 低

1. **Phase 3: メトリクス改善**
   - リアルタイムメトリクス更新
   - バックテスト自動化

2. **パフォーマンス最適化**
   - API呼び出しの最適化
   - キャッシュ戦略の実装

---

## 📚 参照ドキュメント

- `docs/SSOT_INTEGRATED_V6.0.md`（統合SSOT v6.0）
- `docs/PRICING_PLAN_RECOMMENDATION.md`（価格プラン推奨案）
- `docs/PRODUCT_NAME_PROPOSAL_TRADER_LOVED.md`（プロダクト名提案）
- `docs/SIGNAL_LOGIC_REVIEW_AND_OPTIMIZATION_PLAN.md`（シグナルロジック最適化計画）
- `config/marketProfiles.js`（市場プロファイル設定）

---

**最終更新**: 2026-01-27  
**次回レビュー**: マーケティング展開開始前  
**Status**: ✅ マーケティング戦略確定 - 実装準備完了
