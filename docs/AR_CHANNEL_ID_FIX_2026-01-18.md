# AR版チャンネルID修正（2026-01-18）
**緊急度**: 🔴 高

---

## ⚠️ 問題の詳細

**有料版チャンネル** (`Trap Defence BTC - Arabic`) に**無料版メッセージ**が配信されています。

### 現在の設定（間違い）

```
TELEGRAM_CHAT_ID_BTC_AR=-1003310820145      ❌ これは無料版チャンネルID
TELEGRAM_CHAT_ID_MINIMAL_AR=-1003310820145  ✅ 正しい（無料版）
```

### 正しい設定

```
TELEGRAM_CHAT_ID_BTC_AR=-1003665969002      ✅ 有料版チャンネルID
TELEGRAM_CHAT_ID_MINIMAL_AR=-1003310820145  ✅ 無料版チャンネルID
```

---

## 📋 チャンネル情報（確認済み）

### 有料版チャンネル
- **チャンネル名**: Trap Defence BTC - Arabic
- **Chat ID**: `-1003665969002`
- **環境変数**: `TELEGRAM_CHAT_ID_BTC_AR`
- **配信されるべきメッセージ**: 有料版（Regular Briefing）メッセージ

### 無料版チャンネル
- **チャンネル名**: Trap Defence BTC Minimal - Arabic
- **Chat ID**: `-1003310820145`
- **環境変数**: `TELEGRAM_CHAT_ID_MINIMAL_AR`
- **配信されるべきメッセージ**: 無料版（Minimal Version）メッセージ

---

## 🔧 修正手順

### 1. Vercel Dashboardで環境変数を修正

1. Vercel Dashboardにアクセス: https://vercel.com/dashboard
2. プロジェクト `cryptosignal-ai` を選択
3. **Settings** → **Environment Variables** を開く
4. 以下の環境変数を修正：

   ```
   TELEGRAM_CHAT_ID_BTC_AR=-1003665969002
   ```

   （`TELEGRAM_CHAT_ID_MINIMAL_AR` は既に正しい値が設定されているので変更不要）

5. **保存**をクリック

### 2. ローカル環境（.envファイル）も確認

ローカルでテストする場合、`.env` ファイルも確認してください：

```bash
# 親ディレクトリの .env または cryptotradeacademy/.env
TELEGRAM_CHAT_ID_BTC_AR=-1003665969002
TELEGRAM_CHAT_ID_MINIMAL_AR=-1003310820145
```

### 3. 確認スクリプトで検証

修正後、以下のコマンドで確認できます：

```bash
node scripts/check-ar-channel-ids.js
```

**期待される結果**:
```
✅ 設定は正しいです！
```

### 4. テスト配信で確認

修正後、実際のテスト配信で確認：

```bash
node scripts/test-ar-delivery-actual.js
```

**期待される結果**:
- 有料版チャンネル (`Trap Defence BTC - Arabic`) に有料版メッセージが配信される
- 無料版チャンネル (`Trap Defence BTC Minimal - Arabic`) に無料版メッセージが配信される

---

## 📊 修正前後の比較

### 修正前（現在）
- ❌ `TELEGRAM_CHAT_ID_BTC_AR=-1003310820145` → 無料版チャンネルID
- ✅ `TELEGRAM_CHAT_ID_MINIMAL_AR=-1003310820145` → 無料版チャンネルID
- **結果**: 有料版チャンネルに無料版メッセージが配信される

### 修正後（期待）
- ✅ `TELEGRAM_CHAT_ID_BTC_AR=-1003665969002` → 有料版チャンネルID
- ✅ `TELEGRAM_CHAT_ID_MINIMAL_AR=-1003310820145` → 無料版チャンネルID
- **結果**: 各チャンネルに正しいメッセージが配信される

---

## ✅ 確認項目

修正後、以下を確認してください：

1. ✅ `TELEGRAM_CHAT_ID_BTC_AR` が `-1003665969002` になっている
2. ✅ `TELEGRAM_CHAT_ID_MINIMAL_AR` が `-1003310820145` になっている
3. ✅ 有料版チャンネルに有料版メッセージが配信される
4. ✅ 無料版チャンネルに無料版メッセージが配信される

---

**作成日**: 2026-01-18  
**最終更新**: 2026-01-18  
**状態**: ✅ **修正完了**

---

## ✅ 修正完了

以下の設定で修正が完了しました：

```bash
# AR版（アラビア語）
LANG=ar
TELEGRAM_CHAT_ID_BTC_AR=-1003665969002      # ✅ 有料版（Regular Briefing / Trap Defence BTC - Arabic）
TELEGRAM_CHAT_ID_REGULAR_AR=-1003665969002   # 有料版と同じ（コードでは未使用だが設定可）
TELEGRAM_CHAT_ID_MINIMAL_AR=-1003310820145   # ✅ 無料版（Minimal Version / Trap Defence BTC Minimal - Arabic）
```

### チャンネル情報（確認済み）

- **有料版（Regular Briefing）**: Trap Defence BTC - Arabic (`-1003665969002`)
- **無料版（Minimal Version）**: Trap Defence BTC Minimal - Arabic (`-1003310820145`)
