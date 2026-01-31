# Gemini実装レビュー（公式ドキュメント準拠）
**作成日**: 2026-01-31  
**参照**: [Gemini 3 デベロッパーガイド](https://ai.google.dev/gemini-api/docs/gemini-3?hl=ja)

---

## 🔍 実装チェック結果

### ✅ 正しく実装されている点

1. **公式SDKの使用**: `@google/generative-ai` を使用しており、思考シグネチャが自動的に処理される ✅
2. **モデル名**: `gemini-3-flash` は利用可能（`gemini-3-flash-preview`も利用可能） ✅
3. **APIバージョン**: 標準的な `v1beta` APIを使用 ✅

---

## ⚠️ 修正が必要な点

### 1. **CRITICAL: 温度設定の問題**

**問題箇所**:
- `services/gemini/messageOptimizer.js`: `temperature: 0.7` を設定
- `services/gemini/showProducer.js`: `temperature: 0.8` を設定

**公式ドキュメントの推奨**:
> **温度設定**: Gemini 3 では、温度パラメータをデフォルト値の `1.0` に維持することを強くおすすめします。
> 
> 以前のモデルでは、多くの場合、温度をチューニングして創造性と決定論を制御することでメリットが得られました。しかし、Gemini 3 の推論機能はデフォルト設定用に最適化されています。温度を変更する（1.0 未満に設定する）と、特に複雑な数学的タスクや推論タスクで、ループやパフォーマンスの低下などの予期しない動作が発生する可能性があります。

**推奨修正**:
- 温度パラメータを削除するか、`1.0` に設定
- または、デフォルト値（未指定）を使用

---

### 2. **HIGH: 思考レベルの明示的な設定**

**現在の実装**:
- 思考レベルが明示的に設定されていない（デフォルトで `high` が使用される）

**公式ドキュメントの推奨**:
- **タイムアウト対策が必要な場合**: `thinking_level: "low"` を設定
- **深層心理解析**: `thinking_level: "high"`（デフォルト）が適切
- **Gemini 3 Flash**: `minimal`, `low`, `medium`, `high` が利用可能

**推奨修正**:
- タイムアウト対策が必要な箇所で `thinking_level: "low"` を明示的に設定
- 深層心理解析では `thinking_level: "high"` を明示的に設定（またはデフォルトを使用）

---

### 3. **MEDIUM: モデル名の確認**

**現在の実装**:
- `gemini-3-flash` を使用

**公式ドキュメント**:
- `gemini-3-flash-preview` が公式に記載されている
- `gemini-3-flash` も利用可能な可能性があるが、確認が必要

**推奨**:
- 公式ドキュメントに準拠して `gemini-3-flash-preview` を使用するか、動作確認を実施

---

## 📝 推奨修正内容

### 修正1: `services/gemini/messageOptimizer.js`

**変更前**:
```javascript
generationConfig: {
  temperature: 0.7,  // ❌ 1.0未満は推奨されない
  topK: 40,
  topP: 0.95,
  maxOutputTokens: 1024,
},
```

**変更後**:
```javascript
generationConfig: {
  // temperature: 1.0 をデフォルトで使用（削除または明示的に1.0を設定）
  topK: 40,
  topP: 0.95,
  maxOutputTokens: 1024,
  thinkingConfig: {
    thinkingLevel: "low"  // タイムアウト対策のため
  }
},
```

---

### 修正2: `services/gemini/deepPsychologicalAnalyzer.js`

**変更前**:
```javascript
const apiResult = await model.generateContent(prompt);
```

**変更後**:
```javascript
const apiResult = await model.generateContent({
  contents: prompt,
  generationConfig: {
    thinkingConfig: {
      thinkingLevel: "high"  // 深層心理解析には高レベルの思考が必要
    }
    // temperatureはデフォルト1.0を使用（指定しない）
  }
});
```

---

### 修正3: `services/x/contentOptimizer.js`

**変更前**:
```javascript
const result = await model.generateContent(prompt);
```

**変更後**:
```javascript
const result = await model.generateContent({
  contents: prompt,
  generationConfig: {
    thinkingConfig: {
      thinkingLevel: "high"  // 心理分析には高レベルの思考が必要
    }
    // temperatureはデフォルト1.0を使用（指定しない）
  }
});
```

---

### 修正4: `services/gemini/showProducer.js`

**変更前**:
```javascript
const generatedText = await generateText(systemPrompt, userPrompt, { temperature: 0.8, max_tokens: 300 });
```

**変更後**:
```javascript
const generatedText = await generateText(systemPrompt, userPrompt, { 
  // temperature: 1.0 をデフォルトで使用（削除）
  max_tokens: 300,
  thinkingConfig: {
    thinkingLevel: "low"  // シンプルなテキスト生成のため
  }
});
```

---

## 🎯 優先度

1. **CRITICAL**: 温度設定の修正（予期しない動作を防ぐため）
2. **HIGH**: 思考レベルの明示的な設定（タイムアウト対策と品質向上）
3. **MEDIUM**: モデル名の確認（公式ドキュメント準拠）

---

## 📊 期待される効果

### 温度設定を1.0に修正
- ✅ 予期しない動作（ループ、パフォーマンス低下）の防止
- ✅ Gemini 3の推論機能の最適化された動作

### 思考レベルの明示的な設定
- ✅ タイムアウト対策（`low`設定でレイテンシ削減）
- ✅ 深層心理解析の品質向上（`high`設定で推論の深さ最大化）
- ✅ コスト最適化（必要に応じて`low`や`minimal`を使用）

---

## 🔗 参考資料

- [Gemini 3 デベロッパーガイド](https://ai.google.dev/gemini-api/docs/gemini-3?hl=ja)
- [思考レベルと思考予算](https://ai.google.dev/gemini-api/docs/gemini-3?hl=ja#thinking-levels)
- [温度設定の推奨事項](https://ai.google.dev/gemini-api/docs/gemini-3?hl=ja#temperature)
