# Gemini テキスト生成機能実装

## 概要

Gemini APIのテキスト生成機能をMCPサーバーに追加しました。これにより、AIアシスタントの機能を大幅に強化できます。

## 追加された機能

**`gemini_generate_text`** - テキスト生成ツール

- **機能**: 高度な推論、マルチモーダル理解、長いコンテキストに対応したテキスト生成
- **ドキュメント**: https://ai.google.dev/gemini-api/docs/text-generation

## 機能強化のポイント

### 1. **高度な推論能力**
- Gemini 3 Pro: マルチモーダル理解で世界最高水準
- 複雑なタスクでの推論能力向上

### 2. **思考モード**
- デフォルトで有効（モデル依存）
- `thinkingBudget`パラメータで制御可能
- 複雑な問題解決に最適

### 3. **長いコンテキスト**
- Gemini 2.5 Flash: 最大100万トークン
- 大規模なドキュメントや会話履歴の処理が可能

### 4. **マルチモーダル理解**
- テキスト、画像、動画、音声など複数の入力形式に対応
- 統合的な理解と生成が可能

### 5. **柔軟な設定**
- 温度パラメータ（0-2）
- 最大出力トークン数
- 思考予算の制御

## 利用可能なモデル

- `gemini-3-pro-preview` - マルチモーダル理解で世界最高水準
- `gemini-3-flash-preview` - 高速モデル
- `gemini-2.5-flash` - 100万トークンコンテキスト（デフォルト）
- `gemini-2.5-pro` - 強力な推論モデル
- `gemini-2.0-flash` - 第2世代モデル

## 使用例

### 基本的なテキスト生成
```javascript
{
  "model": "gemini-2.5-flash",
  "prompt": "AIの仕組みを説明してください",
  "temperature": 0.7
}
```

### 高度な推論が必要な場合
```javascript
{
  "model": "gemini-3-pro-preview",
  "prompt": "複雑な問題を分析し、解決策を提案してください",
  "thinkingBudget": 1000
}
```

### 長いコンテキストの処理
```javascript
{
  "model": "gemini-2.5-flash",
  "prompt": "長いドキュメントを要約してください",
  "maxOutputTokens": 4096
}
```

## AIアシスタント機能の強化

### 1. **推論能力の向上**
- 複雑な問題の分析
- 多段階の推論プロセス
- 論理的な結論の導出

### 2. **コンテキスト理解の強化**
- 長い会話履歴の保持
- 大規模ドキュメントの処理
- 文脈に基づいた応答

### 3. **マルチモーダル対応**
- 画像とテキストの統合理解
- 動画や音声の分析
- 複合的な情報の処理

### 4. **専門的なタスク**
- コード生成とレビュー
- 技術文書の作成
- 戦略的な計画立案

## 実装の詳細

### 公式SDK使用
```javascript
const response = await this.genAI.models.generateContent({
  model: "gemini-2.5-flash",
  contents: prompt,
  config: {
    temperature: 0.7,
    maxOutputTokens: 4096,
    thinkingConfig: {
      thinkingBudget: 1000
    }
  }
});
```

### レスポンス処理
- テキスト出力の取得
- 使用量メタデータの取得
- エラーハンドリング

## 参考

- [公式ドキュメント](https://ai.google.dev/gemini-api/docs/text-generation)
- [思考モード](https://ai.google.dev/gemini-api/docs/thinking)
- [プロンプトエンジニアリング](https://ai.google.dev/gemini-api/docs/prompt-engineering)
