# トラップ検知実装レビュー

## 実装完了日
2026-01-07

## 実装内容

### 1. コアロジック統合
- **新規ファイル**: `logic/core/trapDetector.js`
  - `marketBugDetector.js`と`logic/tier1_btc/trapDetector.js`の機能を統合
  - `detectTrapDetection()`: トラップ検知ロジック
  - `generateTrapAlert()`: トラップアラート生成（BUY/SELLシグナルではなく防御的推奨）
  - 後方互換性のため`detectMarketBug`/`evaluateMarketBugSignal`もエクスポート

### 2. API統合
- **更新ファイル**: `api/cron.js`
  - `trapDetection`と`trapAlert`変数を導入
  - `trapAlert`を優先して`tradeSignal`と`coreDecision`を更新
  - 後方互換性のため`marketBug`も保持

### 3. メッセージテンプレート更新（全6言語）
- **JA**: `services/telegram/messages/user/ja/regular.ja.js`
- **EN**: `services/telegram/messages/user/en/regular.en.js`
- **ES**: `services/telegram/messages/user/es/regular.es.js`
- **AR**: `services/telegram/messages/user/ar/regular.ar.js`
- **PT-BR**: `services/telegram/messages/user/pt-br/regular.pt-br.js`
- **KO**: `services/telegram/messages/user/ko/regular.ko.js`

#### 変更点
1. 関数シグネチャに`trapDetection`, `marketBug`, `trapAlert`, `divergenceSignal`, `psychologicalSupport`, `hasGeminiContent`を追加
2. `dirEmoji`/`dirLabel`ロジック: トラップアラートを優先表示（AVOID_LONG/AVOID_SHORT/STANDBY）
3. `modeLine`: "Bug Standby" → "Trap Standby"
4. USP1表示: "Market Bug Detection" → "Trap Detection"（🛡️）
5. USP1表示: トラップアラート詳細（タイプ、深刻度、推奨、信頼度）を追加
6. USP2/USP3表示: 既存ロジックを維持
7. Exit Map: 最大8行に簡略化（最重要利確ゾーン2つ、最重要撤退条件2つ）

## 戦略的変更

### 「バグ」→「トラップ」統一
- 用語を「Market Bug」から「Trap Detection」に統一
- 後方互換性のため`marketBug`パラメータも保持

### シグナル生成戦略の転換
- **従来**: BUY/SELL/LONG/SHORTシグナル生成
- **新戦略**: トラップ検知アラート（防御的推奨）
  - `AVOID_LONG`: ロング回避推奨
  - `AVOID_SHORT`: ショート回避推奨
  - `STANDBY`: 待機推奨

### 多言語全方位同時展開
- EN/ES/AR/PT-BR/KO/JAの全6言語でUSP1/USP2/USP3を実装完了

## 後方互換性
- `marketBug`パラメータを保持（既存コードとの互換性）
- `detectMarketBug`/`evaluateMarketBugSignal`関数をエクスポート

## 次のステップ
1. テスト: 各言語版のメッセージ生成を検証
2. 監視: トラップアラートの精度/確度を追跡
3. 最適化: トラップ検知ロジックの精度向上
