# 実際に使用されているAIモデル一覧
**作成日**: 2026-01-31  
**目的**: コード内で実際に使用されているAIモデルを正確に記録

---

## 📊 実際に使用されているモデル

### 1. Grok（X AI）

#### 使用モデル: `grok-4-1-fast-reasoning`

**実装ファイル**: `services/grok/client.js`

**用途別モデル設定**:
```javascript
const GROK_MODEL_MARKET = process.env.GROK_MODEL_MARKET || 
  (isDevelopment ? "grok-4-1-fast-reasoning" : "grok-4-0709");
const GROK_MODEL_MARKET_EMERGENCY = process.env.GROK_MODEL_MARKET_EMERGENCY || 
  "grok-4-1-fast-reasoning";
const GROK_MODEL_X_LIVE = process.env.GROK_MODEL_X_LIVE || 
  "grok-4-1-fast-reasoning";
const GROK_MODEL_HIGH_RES = process.env.GROK_MODEL_HIGH_RES || 
  "grok-4-1-fast-reasoning";
```

**使用箇所**:
- Xセンチメント分析（`analyzeXSentimentLive()`）: `GROK_MODEL_X_LIVE` = `grok-4-1-fast-reasoning`
- 市場分析（緊急時）: `GROK_MODEL_MARKET_EMERGENCY` = `grok-4-1-fast-reasoning`
- 高解像度解析: `GROK_MODEL_HIGH_RES` = `grok-4-1-fast-reasoning`
- Xアルゴリズム解析（`services/x/contentOptimizer.js`）: ハードコード `grok-4-1-fast-reasoning`

**本番環境での使用**:
- 開発環境: `grok-4-1-fast-reasoning`（すべての用途）
- 本番環境: 
  - 定期市場分析: `grok-4-0709`（コスト最適化）
  - 緊急市場分析: `grok-4-1-fast-reasoning`（品質優先）
  - Xリアルタイム: `grok-4-1-fast-reasoning`（品質優先）
  - 高解像度解析: `grok-4-1-fast-reasoning`（品質優先）

---

### 2. GPT（OpenAI）

#### 使用モデル: `gpt-5.2-2025-12-11` / `gpt-4o` / `gpt-4o-mini`

**実装ファイル**: `services/gpt/client.js`

**用途別モデル設定**:
```javascript
const GPT_MODEL_SUMMARY = process.env.GPT_MODEL_SUMMARY || 
  (isDevelopment ? 'gpt-5.2-2025-12-11' : 'gpt-4o-mini');
const GPT_MODEL_ANALYSIS = process.env.GPT_MODEL_ANALYSIS || 
  (isDevelopment ? 'gpt-5.2-2025-12-11' : 'gpt-4o');
const GPT_MODEL_GATE = process.env.GPT_MODEL_GATE || 
  'gpt-5.2-2025-12-11'; // 最終ゲートは常にgpt-5.2-2025-12-11
```

**使用箇所**:
- 前処理・要約（`analyzeCryptoQuantData()`）: `GPT_MODEL_SUMMARY`
  - 開発環境: `gpt-5.2-2025-12-11`
  - 本番環境: `gpt-4o-mini`
- 統合推論（`generateCryptoQuantAnalysis()`）: `GPT_MODEL_ANALYSIS`
  - 開発環境: `gpt-5.2-2025-12-11`
  - 本番環境: `gpt-4o`
- 最終ゲート（`generateNonUserImpactReport()`）: `GPT_MODEL_GATE`
  - 常に: `gpt-5.2-2025-12-11`（最高品質を保証）

**注意**: `gpt-5-mini-2025-08-07` は使用されていません。代わりに `gpt-5.2-2025-12-11` が使用されています。

---

### 3. Gemini（Google）

#### 使用モデル: `gemini-3-pro-preview` / `gemini-2.0-flash-exp`

**実装ファイル**: `services/gemini/deepPsychologicalAnalyzer.js`

**用途別モデル設定**:
```javascript
const GEMINI_MODEL = process.env.GEMINI_MODEL || 
  (isDevelopment ? 'gemini-3-pro-preview' : 'gemini-2.0-flash-exp');
```

**使用箇所**:
- 深層心理分析（`analyzeDeepPsychology()`）: `GEMINI_MODEL`
  - 開発環境: `gemini-3-pro-preview`
  - 本番環境: `gemini-2.0-flash-exp`（タイムアウト対策）

**Xコンテンツ最適化での使用**:
- `services/x/contentOptimizer.js`: ハードコード `gemini-3-pro-preview`
  ```javascript
  const GEMINI_MODEL = 'gemini-3-pro-preview'; // 心理分析用最上位モデル
  ```

**注意**: `gemini-3-flash-preview` は使用されていません。代わりに：
- 開発環境: `gemini-3-pro-preview`
- 本番環境: `gemini-2.0-flash-exp`（タイムアウト対策）

---

## 🔍 モデル使用状況の詳細

### Grokモデル

| 用途 | 開発環境 | 本番環境 | 実装ファイル |
|------|---------|---------|------------|
| Xセンチメント分析 | `grok-4-1-fast-reasoning` | `grok-4-1-fast-reasoning` | `services/grok/client.js` |
| 市場分析（定期） | `grok-4-1-fast-reasoning` | `grok-4-0709` | `services/grok/client.js` |
| 市場分析（緊急） | `grok-4-1-fast-reasoning` | `grok-4-1-fast-reasoning` | `services/grok/client.js` |
| 高解像度解析 | `grok-4-1-fast-reasoning` | `grok-4-1-fast-reasoning` | `services/grok/client.js` |
| Xアルゴリズム解析 | `grok-4-1-fast-reasoning` | `grok-4-1-fast-reasoning` | `services/x/contentOptimizer.js` |

### GPTモデル

| 用途 | 開発環境 | 本番環境 | 実装ファイル |
|------|---------|---------|------------|
| 前処理・要約 | `gpt-5.2-2025-12-11` | `gpt-4o-mini` | `services/gpt/client.js` |
| 統合推論 | `gpt-5.2-2025-12-11` | `gpt-4o` | `services/gpt/client.js` |
| 最終ゲート | `gpt-5.2-2025-12-11` | `gpt-5.2-2025-12-11` | `services/gpt/client.js` |

**注意**: `gpt-5-mini-2025-08-07` は使用されていません。

### Geminiモデル

| 用途 | 開発環境 | 本番環境 | 実装ファイル |
|------|---------|---------|------------|
| 深層心理分析 | `gemini-3-pro-preview` | `gemini-2.0-flash-exp` | `services/gemini/deepPsychologicalAnalyzer.js` |
| X心理分析 | `gemini-3-pro-preview` | `gemini-3-pro-preview` | `services/x/contentOptimizer.js` |

**注意**: `gemini-3-flash-preview` は使用されていません。

---

## 📝 モデル最適化の経緯

### GPT-5-mini-2025-08-07について

**状況**: `gpt-5-mini-2025-08-07` はコード内で使用されていません。

**実際の使用モデル**:
- `gpt-5.2-2025-12-11`: 開発環境と最終ゲートで使用
- `gpt-4o`: 本番環境の統合推論で使用
- `gpt-4o-mini`: 本番環境の前処理・要約で使用

**関連ドキュメント**:
- `docs/GPT5_MINI_P0_IMPLEMENTATION.md`: GPT-5-mini推奨のP0最適化（タイムアウト対策）
- `commit_msg_gpt5_mini_p0_optimization.txt`: GPT-5-mini推奨の最適化実装

**注意**: GPT-5-miniは「推奨」として言及されていますが、実際のコードでは `gpt-5.2-2025-12-11` が使用されています。

### Gemini-3-flash-previewについて

**状況**: `gemini-3-flash-preview` はコード内で使用されていません。

**実際の使用モデル**:
- `gemini-3-pro-preview`: 開発環境とXコンテンツ最適化で使用
- `gemini-2.0-flash-exp`: 本番環境の深層心理分析で使用（タイムアウト対策）

**関連ドキュメント**:
- `commit_msg_gemini_optimization.txt`: `gemini-2.0-flash-exp → gemini-3-flash-preview` への更新が記載されているが、実際のコードでは `gemini-2.0-flash-exp` が使用されている

**注意**: `gemini-3-flash-preview` への更新は検討されていたが、実際のコードでは `gemini-2.0-flash-exp` が使用されています。

---

## ✅ 確認済みのモデル使用状況

### 実際に使用されているモデル

1. **Grok**: `grok-4-1-fast-reasoning` ✅
   - Xセンチメント分析、緊急市場分析、高解像度解析、Xアルゴリズム解析で使用

2. **GPT**: `gpt-5.2-2025-12-11` / `gpt-4o` / `gpt-4o-mini` ✅
   - 開発環境: `gpt-5.2-2025-12-11`（すべての用途）
   - 本番環境: `gpt-4o-mini`（前処理）、`gpt-4o`（統合推論）、`gpt-5.2-2025-12-11`（最終ゲート）

3. **Gemini**: `gemini-3-pro-preview` / `gemini-2.0-flash-exp` ✅
   - 開発環境: `gemini-3-pro-preview`
   - 本番環境: `gemini-2.0-flash-exp`（タイムアウト対策）

### 使用されていないモデル

1. **`gpt-5-mini-2025-08-07`**: ❌ 使用されていない
   - 代わりに `gpt-5.2-2025-12-11` が使用されている

2. **`gemini-3-flash-preview`**: ❌ 使用されていない
   - 代わりに `gemini-2.0-flash-exp` が使用されている

---

## 🎯 まとめ

**実際に使用されているモデル**:
- **Grok**: `grok-4-1-fast-reasoning`（すべての用途で使用）
- **GPT**: `gpt-5.2-2025-12-11`（開発環境と最終ゲート）、`gpt-4o`/`gpt-4o-mini`（本番環境）
- **Gemini**: `gemini-3-pro-preview`（開発環境）、`gemini-2.0-flash-exp`（本番環境）

**ユーザーが言及したモデル**:
- `gpt-5-mini-2025-08-07`: 使用されていない（代わりに `gpt-5.2-2025-12-11` が使用）
- `gemini-3-flash-preview`: 使用されていない（代わりに `gemini-2.0-flash-exp` が使用）

**最適化の経緯**:
- GPT-5-miniとGemini-3-flash-previewは「推奨」として検討されていたが、実際のコードではより新しいモデル（`gpt-5.2-2025-12-11`）やタイムアウト対策モデル（`gemini-2.0-flash-exp`）が使用されている
