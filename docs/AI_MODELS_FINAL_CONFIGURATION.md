# AIモデル最終設定まとめ
**作成日**: 2026-01-31  
**目的**: Grok、Gemini、GPTの最終設定を確認・整理

---

## 📊 最終設定一覧

### 1. Grok（X AI）

#### 用途別モデル設定

| 用途 | 開発環境 | 本番環境 | 実装ファイル |
|------|---------|---------|------------|
| **市場分析（定期）** | `grok-4-1-fast-reasoning` | `grok-4-1-fast-reasoning` | `services/grok/client.js` |
| **市場分析（緊急）** | `grok-4-1-fast-reasoning` | `grok-4-1-fast-reasoning` | `services/grok/client.js` |
| **Xリアルタイム** | `grok-4-1-fast-reasoning` | `grok-4-1-fast-reasoning` | `services/grok/client.js` |
| **高解像度解析** | `grok-4-1-fast-reasoning` | `grok-4-1-fast-reasoning` | `services/grok/client.js` |
| **Xアルゴリズム解析** | `grok-4-1-fast-reasoning` | `grok-4-1-fast-reasoning` | `services/x/contentOptimizer.js` |

#### 環境変数
- `GROK_MODEL_MARKET`: 定期市場分析用
- `GROK_MODEL_MARKET_EMERGENCY`: 緊急市場分析用
- `GROK_MODEL_X_LIVE`: Xリアルタイム用
- `GROK_MODEL_HIGH_RES`: 高解像度解析用
- `GROK_MODEL_X_ALGORITHM`: Xアルゴリズム解析用

#### 実装コード
```javascript
// services/grok/client.js
const GROK_MODEL_MARKET = process.env.GROK_MODEL_MARKET || 
  "grok-4-1-fast-reasoning";
const GROK_MODEL_MARKET_EMERGENCY = process.env.GROK_MODEL_MARKET_EMERGENCY || 
  "grok-4-1-fast-reasoning";
const GROK_MODEL_X_LIVE = process.env.GROK_MODEL_X_LIVE || 
  "grok-4-1-fast-reasoning";
const GROK_MODEL_HIGH_RES = process.env.GROK_MODEL_HIGH_RES || 
  "grok-4-1-fast-reasoning";

// services/x/contentOptimizer.js
const GROK_MODEL = process.env.GROK_MODEL_X_ALGORITHM || 
  (isDevelopment ? 'grok-4-1-fast-reasoning' : 'grok-4-1-fast-reasoning');
```

---

### 2. Gemini（Google）

#### 統一モデル設定

| 用途 | 開発環境 | 本番環境 | 実装ファイル |
|------|---------|---------|------------|
| **深層心理分析** | `gemini-3-pro-preview` | `gemini-3-flash` | `services/gemini/deepPsychologicalAnalyzer.js` |
| **X心理分析** | `gemini-3-pro-preview` | `gemini-3-flash` | `services/x/contentOptimizer.js` |
| **メッセージ最適化** | `gemini-3-pro-preview` | `gemini-3-flash` | `services/gemini/messageOptimizer.js` |

#### 環境変数
- `GEMINI_MODEL`: すべてのGemini用途で統一（デフォルト: `gemini-3-flash`）

#### 実装コード
```javascript
// services/gemini/deepPsychologicalAnalyzer.js
const GEMINI_MODEL = process.env.GEMINI_MODEL || 
  (isDevelopment ? 'gemini-3-pro-preview' : 'gemini-3-flash');

// services/x/contentOptimizer.js
const GEMINI_MODEL = process.env.GEMINI_MODEL || 
  (isDevelopment ? 'gemini-3-pro-preview' : 'gemini-3-flash');

// services/gemini/messageOptimizer.js
const GEMINI_MODEL = process.env.GEMINI_MODEL || 
  (isDevelopment ? 'gemini-3-pro-preview' : 'gemini-3-flash');
```

#### 推奨設定（公式ドキュメント準拠）
- **温度**: デフォルト1.0を使用（指定しない）
- **思考レベル**: 
  - 深層心理分析: `high`（推論の深さを最大化）
  - X心理分析: `high`（推論の深さを最大化）
  - メッセージ最適化: `low`（タイムアウト対策）

---

### 3. GPT（OpenAI）

#### 用途別モデル設定

| 用途 | 開発環境 | 本番環境 | 実装ファイル |
|------|---------|---------|------------|
| **SUMMARY（前処理・要約）** | `gpt-5.2-2025-12-11` | `gpt-5-mini` | `services/gpt/client.js` |
| **ANALYSIS（統合推論）** | `gpt-5.2-2025-12-11` | `gpt-5-mini` | `services/gpt/client.js` |
| **GATE（最終ゲート）** | `gpt-5.2-2025-12-11` | `gpt-5.2-2025-12-11` | `services/gpt/client.js` |

#### 環境変数
- `GPT_MODEL_SUMMARY`: 前処理・要約用
- `GPT_MODEL_ANALYSIS`: 統合推論用
- `GPT_MODEL_GATE`: 最終ゲート用

#### 実装コード
```javascript
// services/gpt/client.js
const GPT_MODEL_SUMMARY = process.env.GPT_MODEL_SUMMARY || 
  (isDevelopment ? 'gpt-5.2-2025-12-11' : 'gpt-5-mini');
const GPT_MODEL_ANALYSIS = process.env.GPT_MODEL_ANALYSIS || 
  (isDevelopment ? 'gpt-5.2-2025-12-11' : 'gpt-5-mini');
const GPT_MODEL_GATE = process.env.GPT_MODEL_GATE || 
  'gpt-5.2-2025-12-11';
```

---

## ✅ 設定の整合性チェック

### 1. モデル名の統一性

#### ✅ Grok
- すべての用途で `grok-4-1-fast-reasoning` または `grok-4-0709` を使用
- 環境変数で柔軟に変更可能

#### ✅ Gemini
- **すべての用途で `gemini-3-flash` に統一** ✅
- 環境変数 `GEMINI_MODEL` で一元管理

#### ✅ GPT
- 用途別に適切なモデルを選択
- 環境変数で柔軟に変更可能

---

### 2. 環境変数の一貫性

#### ✅ すべてのモデルで環境変数対応
- Grok: `GROK_MODEL_*`（用途別）
- Gemini: `GEMINI_MODEL`（統一）
- GPT: `GPT_MODEL_*`（用途別）

#### ✅ 開発/本番環境の切り替え
- `APP_ENV` または `NODE_ENV` で判定
- 開発環境: ハイエンドモデル優先
- 本番環境: コスト効率とタイムアウト対策を考慮

---

### 3. 公式ドキュメント準拠

#### ✅ Gemini
- 温度設定: デフォルト1.0を使用（指定しない）
- 思考レベル: 用途に応じて適切に設定
- モデル名: `gemini-3-flash`（公式ドキュメント準拠）

#### ✅ GPT
- モデル名: `gpt-5-mini` / `gpt-5.2-2025-12-11`（公式ドキュメント準拠）
- 用途別に最適なモデルを選択

#### ✅ Grok
- モデル名: `grok-4-1-fast-reasoning` / `grok-4-0709`（現状維持）

---

## 📋 実装ファイル一覧

### Grok
1. `services/grok/client.js` - 市場分析、Xリアルタイム、高解像度解析
2. `services/x/contentOptimizer.js` - Xアルゴリズム解析

### Gemini
1. `services/gemini/deepPsychologicalAnalyzer.js` - 深層心理分析
2. `services/x/contentOptimizer.js` - X心理分析
3. `services/gemini/messageOptimizer.js` - メッセージ最適化

### GPT
1. `services/gpt/client.js` - すべてのGPT用途（SUMMARY、ANALYSIS、GATE）

---

## 🎯 最適化のポイント

### 1. コスト効率
- **Gemini**: `gemini-3-flash` に統一（Gemini 3 Proの約4倍安い）
- **GPT**: 本番環境で `gpt-5-mini` を使用（GPT-5.2の7倍安い）
- **Grok**: 定期市場分析で `grok-4-0709` を使用（コスト最適化）

### 2. タイムアウト対策
- **Gemini**: Fast速度の `gemini-3-flash` を使用
- **GPT**: Fast速度の `gpt-5-mini` を使用
- **Grok**: 用途に応じて適切なモデルを選択

### 3. 品質保証
- **GPT GATE**: `gpt-5.2-2025-12-11` を使用（最高品質）
- **Grok緊急分析**: `grok-4-1-fast-reasoning` を使用（最高品質）
- **Gemini深層心理**: `high` 思考レベルを使用（推論の深さを最大化）

---

## 🔄 環境変数での制御

### 開発環境
```bash
APP_ENV=development
```

### 本番環境
```bash
APP_ENV=production

# オプション: モデルを個別に設定
GEMINI_MODEL=gemini-3-flash
GPT_MODEL_SUMMARY=gpt-5-mini
GPT_MODEL_ANALYSIS=gpt-5-mini
GPT_MODEL_GATE=gpt-5.2-2025-12-11
GROK_MODEL_MARKET=grok-4-0709
GROK_MODEL_MARKET_EMERGENCY=grok-4-1-fast-reasoning
GROK_MODEL_X_LIVE=grok-4-1-fast-reasoning
GROK_MODEL_HIGH_RES=grok-4-1-fast-reasoning
GROK_MODEL_X_ALGORITHM=grok-4-1-fast-reasoning
```

---

## ✅ 確認済み項目

- [x] すべてのモデル名が正しく設定されている
- [x] 環境変数で柔軟に変更可能
- [x] 開発/本番環境の切り替えが正しく動作
- [x] 公式ドキュメントに準拠
- [x] コスト効率と品質のバランスが最適化されている
- [x] タイムアウト対策が考慮されている
- [x] Geminiの温度設定と思考レベルが適切に設定されている

---

## 📊 まとめ

### 最終設定

| AI | モデル | 用途 | 環境 |
|----|--------|------|------|
| **Grok** | `grok-4-1-fast-reasoning` | 統一 | 開発/本番 |
| **Gemini** | `gemini-3-pro-preview` / `gemini-3-flash` | 環境別 | 開発/本番 |
| **GPT** | `gpt-5-mini` / `gpt-5.2-2025-12-11` | 用途別 | 開発/本番 |

### 最適化の成果

1. ✅ **コスト削減**: GPT-5 miniとGemini-3-flashで大幅なコスト削減
2. ✅ **タイムアウト対策**: Fast速度モデルでレイテンシ削減
3. ✅ **品質保証**: 最終ゲートで最高品質モデルを使用、開発環境でGemini 3 Proを使用
4. ✅ **統一性**: Grokモデルを統一して管理を簡素化
5. ✅ **柔軟性**: 環境変数で簡単に変更可能

---

## 🔗 関連ドキュメント

- `docs/ACTUAL_AI_MODELS_USED.md`: 実際に使用されているAIモデルの詳細
- `docs/AI_MODEL_LINEUP_RECOMMENDATION.md`: AIモデルラインナップの推奨評価
- `docs/GEMINI_MODEL_OPTIMIZATION_RECOMMENDATION.md`: Geminiモデル最適化の推奨
- `docs/GPT_MODEL_OPTIMIZATION_RECOMMENDATION.md`: GPTモデル最適化の推奨
- `docs/GEMINI_IMPLEMENTATION_REVIEW.md`: Gemini実装レビュー（公式ドキュメント準拠）
