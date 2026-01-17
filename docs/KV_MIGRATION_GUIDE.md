# Vercel KV移行ガイド
**最終更新**: 2026-01-17 14:07:03  
**作成日時**: 2026-01-17 14:07:03  

**作成日**: 2026-01-17
**目的**: free-users.jsonをVercel KVに移行

---

## ✅ 実装完了項目

### 1. KVストレージモジュール作成
- ✅ `services/free-users/kv-storage.js` を作成
- ✅ Vercel KVを使用した永続化実装

### 2. manager.jsの更新
- ✅ KVストレージの統合
- ✅ フォールバック機能（KVが利用不可の場合はファイルストレージ）

---

## ⚠️ 注意事項

### 既存コードとの互換性

`loadFreeUsers()` と `saveFreeUsers()` をasync化したため、**すべての呼び出し側をasync化する必要があります**。

**影響を受ける関数**:
- `addFreeUser()` → async化が必要
- `removeFreeUser()` → async化が必要
- `markVSL2Sent()` → async化が必要
- `markVSL2LastCallSent()` → async化が必要
- `getFreeUsersForVSL2()` → async化が必要
- `getFreeUsersForVSL1Reminder()` → async化が必要
- `getFreeUsersForVSL2LastCall()` → async化が必要

**影響を受ける呼び出し側**:
- `api/vsl2-free-users.js`
- `api/vsl2-last-call.js`
- `api/vsl1-reminder.js`
- `services/telegram/bot-commands.js`
- `services/telegram/commands.js`

---

## 📋 環境変数設定

Vercel Dashboardで以下の環境変数を設定してください：

```
KV_REST_API_URL=https://your-kv-instance.upstash.io
KV_REST_API_TOKEN=your-kv-token
```

**注意**: 環境変数が設定されていない場合、自動的にファイルストレージにフォールバックします。

---

## 🎯 次のステップ

1. **すべての関数をasync化**（要対応）
2. **すべての呼び出し側をasync化**（要対応）
3. **Vercel KVの環境変数を設定**
4. **動作確認**

---

**状態**: ⚠️ **実装途中 - すべての関数のasync化が必要**
