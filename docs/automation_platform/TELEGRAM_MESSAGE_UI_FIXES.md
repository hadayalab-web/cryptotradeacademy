# TelegramメッセージUI修正

**作成日**: 2026-01-13  
**目的**: CEOが指摘したメッセージUIの問題を修正

---

## 🔍 確認された問題点

### 1. Trap Typeの表示
- **問題**: "WHALERETAILDIVERGENCE"（スペースなし）
- **修正**: アンダースコアをスペースに変換 → "WHALE RETAIL DIVERGENCE"
- **状態**: ✅ 修正完了

### 2. Dr. Grokの心理的サポート
- **問題**: "💚 Psychological Analysis: Fetching data..." と表示される
- **原因**: `mentalBlocks is not defined` エラーが発生
- **状態**: ⏳ 修正中

---

## ✅ 修正内容

### 1. Trap Typeの表示修正

**ファイル**: `cryptosignal-ai/services/telegram/messages/user/en/regular.en.js`

**変更**:
```javascript
// 修正前
const trapType = trapData.trapType || trapData.bugType || 'Anomaly';

// 修正後
let trapType = trapData.trapType || trapData.bugType || 'Anomaly';
// アンダースコアをスペースに変換して読みやすくする
trapType = trapType.replace(/_/g, ' ');
```

**効果**: "WHALE_RETAIL_DIVERGENCE" → "WHALE RETAIL DIVERGENCE"

---

### 2. mentalBlocksエラーの修正

**ファイル**: `cryptosignal-ai/services/grok/psychologicalSupport.js`

**変更**:
- `generateSupportMessage`関数に`mentalBlocks`パラメータを追加
- `mentalBlocks`を文字列に変換して`mentalBlockSection`を生成

**状態**: ⏳ 修正中（エラーが残っている可能性）

---

## 📊 修正後のメッセージUI

### 修正前
```
🛡️ USP1: Trap Defense - 🚨 WHALERETAILDIVERGENCE (Score: 70/100)
```

### 修正後
```
🛡️ USP1: Trap Defense - 🚨 WHALE RETAIL DIVERGENCE (Score: 70/100)
```

---

## ⚠️ 残っている問題

### Dr. Grokの心理的サポート
- **エラー**: `mentalBlocks is not defined`
- **原因**: `generateSupportMessage`関数内で`mentalBlocks`が参照されているが、スコープ外
- **修正**: `options`から`mentalBlocks`を取得するように修正済み

---

## 📝 次のステップ

1. ✅ Trap Typeの表示修正（完了）
2. ⏳ mentalBlocksエラーの修正（進行中）
3. ⏳ 修正後のテスト配信を実行
4. ⏳ メッセージUIの最終確認

---

**状態**: ⏳ 修正中
