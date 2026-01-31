# AIモデル最適化分析

**作成日**: 2026-01-31  
**目的**: Vercel環境でのAIモデル選択の最適化（タイムアウト・コスト・安定性のバランス）

---

## 🔍 現在の使用モデル

### Grok (xAI)
- **本番環境**: `grok-4-0709` (中規模モデル)
- **開発環境**: `grok-4-1-fast-reasoning` (高速推論モデル)
- **緊急時**: `grok-4-1-fast-reasoning`
- **X Live分析**: `grok-4-1-fast-reasoning`

**評価**:
- ✅ 本番環境では軽量モデルを使用（適切）
- ⚠️ `grok-4-1-fast-reasoning`は高速だが、タイムアウトリスクがある可能性

---

### GPT (OpenAI)
- **サマリー**: `gpt-4o-mini` (本番) / `gpt-5.2-2025-12-11` (開発)
- **分析**: `gpt-5.2-2025-12-11` (常に最上位)
- **最終ゲート**: `gpt-5.2-2025-12-11` (常に最上位)

**評価**:
- ⚠️ **問題**: 分析とゲートで常に最上位モデルを使用
- ⚠️ **タイムアウトリスク**: `gpt-5.2-2025-12-11`は処理が重く、60秒制限を超える可能性
- 💡 **推奨**: 分析は`gpt-4o`または`gpt-4o-mini`に変更

---

### Gemini (Google)
- **深層心理分析**: `gemini-3-pro-preview` (最上位モデル)
- **メッセージ最適化**: `gemini-2.0-flash-exp` (軽量モデル)
- **動画生成**: Veo 3.1

**評価**:
- ⚠️ **問題**: 深層心理分析で最上位モデルを使用
- ✅ **良い点**: メッセージ最適化では軽量モデルを使用
- 💡 **推奨**: 深層心理分析も`gemini-2.0-flash-exp`または`gemini-1.5-flash`に変更

---

## 🎯 最適化提案

### 優先度P0: タイムアウト対策

#### 1. GPT分析モデルの軽量化
```javascript
// services/gpt/client.js
// 変更前
const GPT_MODEL_ANALYSIS = 'gpt-5.2-2025-12-11';

// 変更後
const GPT_MODEL_ANALYSIS = process.env.GPT_MODEL_ANALYSIS || 'gpt-4o'; // または 'gpt-4o-mini'
```

**効果**:
- 処理時間: 10-20秒 → 3-8秒
- タイムアウトリスク: 大幅に減少
- コスト: 約1/10に削減

#### 2. Gemini深層心理分析の軽量化
```javascript
// services/gemini/deepPsychologicalAnalyzer.js
// 変更前
const GEMINI_MODEL = 'gemini-3-pro-preview';

// 変更後
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp';
```

**効果**:
- 処理時間: 15-30秒 → 2-5秒
- タイムアウトリスク: 大幅に減少
- コスト: 約1/5に削減

---

### 優先度P1: コスト最適化

#### 3. Grok緊急時モデルの見直し
```javascript
// services/grok/client.js
// 変更前
const GROK_MODEL_MARKET_EMERGENCY = 'grok-4-1-fast-reasoning';

// 変更後
const GROK_MODEL_MARKET_EMERGENCY = process.env.GROK_MODEL_MARKET_EMERGENCY || 'grok-4-0709';
```

**効果**:
- コスト削減: 約1/3
- 安定性向上: より安定したレスポンス

---

## 📊 期待される効果

### タイムアウト削減
- **現在**: `/api/x-quote-repost-en`と`/api/x-quote-repost-es`がタイムアウト
- **最適化後**: タイムアウトが解消される見込み

### コスト削減
- **GPT**: 約90%削減（`gpt-5.2-2025-12-11` → `gpt-4o-mini`）
- **Gemini**: 約80%削減（`gemini-3-pro-preview` → `gemini-2.0-flash-exp`）
- **Grok**: 約30%削減（緊急時モデルの見直し）

### 安定性向上
- 処理時間の短縮により、60秒制限内での実行が安定
- レート制限エラーの減少

---

## 🚀 実装計画

1. **Phase 1**: GPT分析モデルの軽量化（P0）
2. **Phase 2**: Gemini深層心理分析の軽量化（P0）
3. **Phase 3**: Grok緊急時モデルの見直し（P1）
4. **Phase 4**: 環境変数による柔軟な設定（本番/開発の切り替え）

---

## ⚠️ 注意事項

- **最終ゲート**: `gpt-5.2-2025-12-11`は維持（最高品質が必要）
- **開発環境**: 最上位モデルを使用可能（環境変数で制御）
- **段階的移行**: 一度にすべて変更せず、段階的に最適化
