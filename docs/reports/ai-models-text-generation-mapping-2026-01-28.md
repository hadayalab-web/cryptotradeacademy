# メッセージテキスト生成におけるAIモデル使用マッピング

**作成日**: 2026-01-28  
**最終更新**: 2026-01-28  
**ステータス**: 現状確認完了

## 概要

メッセージ内のテキスト生成で使用されているAIモデルを整理します。

## AIモデル使用状況

### 1. GPT-5.2-2025-12-11

#### 使用箇所
- **`generateCryptoQuantAnalysis()`** - CryptoQuantデータ解析（定期配信用）
  - ファイル: `services/gpt/client.js`
  - 用途: トラップニュース分析、市場データの構造化解析
  - 出力: `gptReporterAnalysis`（メッセージ内の「📖 THE STORY BEHIND THE DATA」セクション）

- **`generateNonUserImpactReport()`** - サービス未利用ユーザーの影響レポート生成
  - ファイル: `services/gpt/client.js`
  - 用途: サービス未利用ユーザーの悲惨な状況を報道
  - 出力: `nonUserImpactReport`（メッセージ内の「💔 サービス未利用ユーザーの悲惨な状況」セクション）

- **`analyzeCryptoQuantData()`** - 緊急配信用のCryptoQuantデータ解析
  - ファイル: `services/gpt/client.js`
  - 用途: 15分ごとの緊急配信時のシグナル検出
  - 出力: 緊急配信メッセージの分析部分

#### モデル設定
```javascript
// 開発環境: gpt-5.2-2025-12-11
// 本番環境: 
//   - SUMMARY: gpt-4o-mini
//   - ANALYSIS: gpt-5.2-2025-12-11（統合推論）
//   - GATE: gpt-5.2-2025-12-11（最終判定）
```

### 2. Grok-4-1-fast-reasoning

#### 使用箇所
- **`analyzeMarket()`** - 市場分析（定期配信・緊急配信）
  - ファイル: `services/grok/client.js`
  - 用途: 市場データとXセンチメントの統合分析
  - 出力: `aiAnalysis`（後方互換性のため残す）

- **`analyzeXSentimentLive()`** - Xセンチメント分析
  - ファイル: `services/grok/client.js`
  - 用途: X上のBTCトレーダー心理を分析
  - 出力: `grokXAnalysis`（メッセージ内の「📱 X Sentiment Analysis」セクション）

- **`diagnoseUserSentimentCompat()`** - 心理的サポート診断
  - ファイル: `services/grok/psychologicalSupport.js`
  - 用途: ユーザーの心理状態を診断し、アドバイスを提供
  - 出力: `psychologicalSupport`（メッセージ内の「💊 Dr. Grokの心理的サポート」セクション）
  - 内部で`analyzeXSentimentLive()`を使用

- **`analyzeXAlgorithmOptimization()`** - Xアルゴリズム最適化
  - ファイル: `services/grok/xAlgorithmAnalyzer.js`
  - 用途: Xアルゴリズム最適化のための深層分析
  - 出力: `integratedOptimization.optimization.content`（メッセージ内の「📱 X Post Optimization」セクション）

#### モデル設定
```javascript
// 開発環境: grok-4-1-fast-reasoning
// 本番環境:
//   - MARKET: grok-4-0709（定期市場分析）
//   - MARKET_EMERGENCY: grok-4-1-fast-reasoning（緊急市場分析）
//   - X_LIVE: grok-4-1-fast-reasoning（Xリアルタイム）
//   - HIGH_RES: grok-4-1-fast-reasoning（高解像度）
```

### 3. Gemini-3-pro-preview

#### 使用箇所
- **`analyzeDeepPsychology()`** - 深層心理分析
  - ファイル: `services/gemini/deepPsychologicalAnalyzer.js`
  - 用途: ユーザーの潜在的な心理的ブロックを特定、パーソナライズされたコーチングアドバイス
  - 出力: `integratedOptimization.optimization.psychologicalInsights`（メッセージ内の「🧠 【重要】深層心理インサイト」セクション）

- **`produceShow()`** - Gemini番組プロデューサー
  - ファイル: `services/gemini/showProducer.js`
  - 用途: StoryBrand 2.0フレームワークに基づく番組コンテンツ生成
  - 出力: `showContent`（メッセージ内の「📊 NanoBanana インフォグラフィック」セクション）

#### モデル設定
```javascript
const GEMINI_MODEL = 'gemini-3-pro-preview';
```

## 統合フロー

### 有料版（Regular Briefing）のテキスト生成フロー

```
1. GPT-5.2-2025-12-11
   └─> generateCryptoQuantAnalysis()
       └─> gptReporterAnalysis（📖 THE STORY BEHIND THE DATA）

2. Grok-4-1-fast-reasoning
   ├─> analyzeXSentimentLive()
   │   └─> grokXAnalysis（📱 X Sentiment Analysis）
   │
   ├─> diagnoseUserSentimentCompat()
   │   └─> psychologicalSupport（💊 Dr. Grokの心理的サポート）
   │
   └─> analyzeXAlgorithmOptimization()
       └─> integratedOptimization.optimization.content（📱 X Post Optimization）

3. Gemini-3-pro-preview
   ├─> analyzeDeepPsychology()
   │   └─> integratedOptimization.optimization.psychologicalInsights（🧠 深層心理インサイト）
   │
   └─> produceShow()
       └─> showContent（📊 NanoBanana インフォグラフィック）

4. integrateGrokGeminiOptimization()
   ├─> Grok（Xアルゴリズム最適化）とGemini（深層心理分析）を統合
   └─> integratedOptimization（統合された最適化戦略）
```

### 無料版（Minimal Version）のテキスト生成フロー

```
1. Grok-4-1-fast-reasoning
   └─> analyzeXSentimentLive()
       └─> grokXAnalysis（センチメントデータとして使用）

2. integrateGrokGeminiOptimization()
   ├─> Grok（Xアルゴリズム最適化）
   └─> Gemini（深層心理分析）
       └─> grokGeminiOptimization（現在は未使用）
```

## メッセージ内での表示箇所

### 有料版（Regular Briefing）

1. **📖 THE STORY BEHIND THE DATA**
   - 生成元: GPT-5.2-2025-12-11 (`generateCryptoQuantAnalysis`)
   - 表示: `gptReporterAnalysis`

2. **📱 X Sentiment Analysis**
   - 生成元: Grok-4-1-fast-reasoning (`analyzeXSentimentLive`)
   - 表示: `grokXAnalysis`

3. **📱 X Post Optimization**
   - 生成元: Grok-4-1-fast-reasoning (`analyzeXAlgorithmOptimization`)
   - 表示: `integratedOptimization.optimization.content`

4. **🧠 【重要】深層心理インサイト**
   - 生成元: Gemini-3-pro-preview (`analyzeDeepPsychology`)
   - 表示: `integratedOptimization.optimization.psychologicalInsights`

5. **💊 Dr. Grokの心理的サポート**
   - 生成元: Grok-4-1-fast-reasoning (`diagnoseUserSentimentCompat`)
   - 表示: `psychologicalSupport`

6. **💔 サービス未利用ユーザーの悲惨な状況**
   - 生成元: GPT-5.2-2025-12-11 (`generateNonUserImpactReport`)
   - 表示: `nonUserImpactReport`

7. **📊 NanoBanana インフォグラフィック**
   - 生成元: Gemini-3-pro-preview (`produceShow`)
   - 表示: `showContent`

### 無料版（Minimal Version）

- 現在は`grokGeminiOptimization`パラメータは定義されているが未使用
- 基本的なテキスト生成はテンプレート内で行われている

## 結論

**メッセージ内のテキスト生成は、GPT-5.2-2025-12-11、Grok-4-1-fast-reasoning、Gemini-3-pro-previewの3つのAIモデルが協働して行われています。**

- **GPT-5.2**: CryptoQuantデータ解析、サービス未利用ユーザー影響レポート
- **Grok-4-1-fast-reasoning**: Xセンチメント分析、市場分析、心理的サポート、Xアルゴリズム最適化
- **Gemini-3-pro-preview**: 深層心理分析、番組コンテンツ生成

各AIモデルはそれぞれの専門分野でテキストを生成し、最終的にメッセージテンプレートで統合されています。
