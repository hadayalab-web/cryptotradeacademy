# インフルエンサーストック削除バグ修正レポート
**作成日時**: 2026-01-28  
**問題**: 毎回リストが削除されていた

---

## 🐛 発見された根本原因

### 問題1: Grok APIエラー時に空配列を返していた

**場所**: `services/x/influencerStock.js` 261-264行目

**問題**:
```javascript
if (!discoveredInfluencers || discoveredInfluencers.length === 0) {
  console.warn(`[InfluencerStock] ⚠️ No influencers discovered for ${targetLang}`);
  return []; // ← 空配列を返していた
}
```

**説明**: 
- Grok APIからインフルエンサーを取得できなかった場合、空配列を返していた
- この空配列が`saveInfluencersToStock`に渡され、既存のストックが空配列で上書きされていた
- 過去には保護機能がなかったため、エラー時に毎回リストが削除されていた

**修正**: 
- 既存のストックを取得して返すように変更
- 既存ストックがない場合のみ空配列を返す（保存はしない）

---

### 問題2: 選択されたインフルエンサーが空の場合の処理不足

**場所**: `services/x/influencerStock.js` 298-305行目

**問題**:
- フィルタリング後にインフルエンサーが0人になった場合、空配列が保存される可能性があった

**修正**:
- 選択されたインフルエンサーが空の場合は既存ストックを保持
- 保存に失敗した場合も既存ストックを返す

---

### 問題3: 過去のTTLによる自動削除（既に修正済み）

**場所**: `services/x/influencerStock.js` 25行目

**問題**:
- 過去には24時間のTTLが設定されていた
- 24時間経過すると自動的に削除されていた

**修正**: 
- TTLを削除して永続保存に変更（既に修正済み）

---

## 🔧 修正内容

### 修正1: Grok APIエラー時の保護機能追加

```javascript
// 修正前
if (!discoveredInfluencers || discoveredInfluencers.length === 0) {
  return []; // 空配列を返す
}

// 修正後
if (!discoveredInfluencers || discoveredInfluencers.length === 0) {
  // 既存のストックを取得して返す（空配列を返さない）
  const existingStock = await getInfluencersFromStock(targetLang);
  if (existingStock && existingStock.length > 0) {
    return existingStock; // 既存ストックを保持
  }
  return []; // 既存ストックもない場合のみ空配列
}
```

### 修正2: 選択後の保護機能追加

```javascript
// 修正後
if (!selectedInfluencers || selectedInfluencers.length === 0) {
  // 既存のストックを保持
  const existingStock = await getInfluencersFromStock(targetLang);
  if (existingStock && existingStock.length > 0) {
    return existingStock;
  }
  return [];
}
```

### 修正3: 保存失敗時の保護機能追加

```javascript
// 修正後
if (!saved) {
  // 保存に失敗した場合も既存ストックを返す
  const existingStock = await getInfluencersFromStock(targetLang);
  if (existingStock && existingStock.length > 0) {
    return existingStock;
  }
}
```

---

## ✅ 修正後の動作

1. **Grok APIエラー時**: 既存ストックを保持（削除しない）
2. **フィルタリング後0人**: 既存ストックを保持（削除しない）
3. **保存失敗時**: 既存ストックを返す（削除しない）
4. **空配列での上書き**: 保護機能によりブロック（既に実装済み）

---

## 🛡️ 保護機能の階層

1. **第1層**: `saveInfluencersToStock`での空配列チェック（既存）
2. **第2層**: `updateInfluencerStock`での既存ストック保持（新規追加）
3. **第3層**: 保存失敗時の既存ストック返却（新規追加）

---

## 📋 確認事項

- [x] Grok APIエラー時の保護機能追加
- [x] 選択後の保護機能追加
- [x] 保存失敗時の保護機能追加
- [x] 空配列での上書き防止（既に実装済み）
- [x] TTL削除（既に修正済み）

---

## 🚀 今後の対策

1. **監視**: ストック数が一定数以下になった場合にアラート
2. **ログ**: 保護機能が発動した場合の詳細ログ
3. **バックアップ**: 定期的なバックアップ作成（既に実装済み）
