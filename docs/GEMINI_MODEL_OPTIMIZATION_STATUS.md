# Geminiモデル最適化状況

**作成日**: 2026-01-28  
**目的**: Geminiモデルの使用状況と最適化の確認

## 📊 現在の実装状況

### 1. `services/gemini/deepPsychologicalAnalyzer.js` ✅ 最適化済み

**実装**:
```javascript
const GEMINI_MODEL = process.env.GEMINI_MODEL || 
  (isDevelopment ? 'gemini-3-pro-preview' : 'gemini-2.0-flash-exp');
```

**状況**:
- ✅ 開発/本番環境でモデル切り替え実装済み
- ⚠️ 本番環境で`gemini-2.0-flash-exp`を使用（実験版、非推奨の可能性）
- ⚠️ 最新モデル（`gemini-2.5-flash`または`gemini-3-flash-preview`）に更新推奨

### 2. `services/gemini/messageOptimizer.js` ❌ 最適化未実施

**実装**:
```javascript
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';
```

**状況**:
- ❌ ハードコードで`gemini-2.0-flash-exp`を使用
- ❌ 環境変数による切り替えなし
- ❌ 開発/本番環境の区別なし

### 3. `services/gemini/imageGenerator.js` / `videoGenerator.js` ✅ 削除済み

**状況**:
- ✅ Nano BananaとVeoはVercelの60秒タイムアウト制限により削除済み
- ✅ `api/prepare.js`から呼び出しをコメントアウト済み

## 🔍 問題点

### 1. 古いモデルの使用
- `gemini-2.0-flash-exp`は実験版で、非推奨の可能性がある
- 最新の`gemini-2.5-flash`または`gemini-3-flash-preview`に更新すべき

### 2. 一貫性の欠如
- `deepPsychologicalAnalyzer.js`は環境変数対応済み
- `messageOptimizer.js`はハードコードで環境変数未対応

## ✅ 推奨される最適化

### 1. `deepPsychologicalAnalyzer.js`の更新

```javascript
// 現在
const GEMINI_MODEL = process.env.GEMINI_MODEL || 
  (isDevelopment ? 'gemini-3-pro-preview' : 'gemini-2.0-flash-exp');

// 推奨
const GEMINI_MODEL = process.env.GEMINI_MODEL || 
  (isDevelopment ? 'gemini-3-pro-preview' : 'gemini-2.5-flash');
// または
const GEMINI_MODEL = process.env.GEMINI_MODEL || 
  (isDevelopment ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview');
```

### 2. `messageOptimizer.js`の最適化

```javascript
// 現在（ハードコード）
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';

// 推奨（環境変数対応）
const APP_ENV = process.env.APP_ENV || process.env.NODE_ENV || 'production';
const isDevelopment = APP_ENV === 'development';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 
  (isDevelopment ? 'gemini-3-pro-preview' : 'gemini-2.5-flash');
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
```

## 📋 最新Geminiモデル情報（2026年1月）

### 推奨モデル（本番環境）

1. **`gemini-2.5-flash`** (Stable)
   - リリース: 2025年6月
   - 価格: $0.30/$2.50 per 1M tokens
   - 特徴: バランス型、安定版

2. **`gemini-3-flash-preview`** (Preview)
   - リリース: 2025年12月
   - 価格: $0.50/$3.00 per 1M tokens
   - 特徴: 最新機能、Proレベルの推論能力

### 非推奨モデル

- **`gemini-2.0-flash-exp`**: 実験版、非推奨の可能性

## 🎯 次のステップ

1. ✅ `deepPsychologicalAnalyzer.js`のモデルを`gemini-2.5-flash`に更新
2. ✅ `messageOptimizer.js`に環境変数対応を追加
3. ✅ 両方のファイルで一貫したモデル選択ロジックを実装
