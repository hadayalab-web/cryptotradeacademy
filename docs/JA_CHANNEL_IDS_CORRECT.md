# JA版チャンネルID設定（正しい設定）

**最終更新**: 2026-01-18  
**状態**: ✅ **正しい設定**

---

## ✅ 正しい環境変数設定

```bash
# JA版（日本語）
LANG=ja
TELEGRAM_CHAT_ID_BTC_JA=-1003451216720      # 有料版（Regular Briefing / Trap Defence BTC - Japanese）
TELEGRAM_CHAT_ID_REGULAR_JA=-1003451216720   # 有料版と同じ（コードでは未使用だが設定可）
TELEGRAM_CHAT_ID_MINIMAL_JA=-1003423418139   # 無料版（Minimal Version / Trap Defence BTC Minimal - Japanese）
```

---

## 📋 チャンネル情報

### 有料版チャンネル（Regular Briefing）
- **チャンネル名**: Trap Defence BTC - Japanese
- **Chat ID**: `-1003451216720`
- **環境変数**: `TELEGRAM_CHAT_ID_BTC_JA`
- **配信メッセージ**: 有料版（Regular Briefing）メッセージ

### 無料版チャンネル（Minimal Version）
- **チャンネル名**: Trap Defence BTC Minimal - Japanese
- **Chat ID**: `-1003423418139`
- **環境変数**: `TELEGRAM_CHAT_ID_MINIMAL_JA`
- **配信メッセージ**: 無料版（Minimal Version）メッセージ

---

## 🔍 確認方法

設定が正しいか確認するには：

```bash
node scripts/check-ja-channel-ids.js
```

**期待される結果**:
```
✅ 設定は正しいです！
```

---

## 📝 注意事項

- `TELEGRAM_CHAT_ID_REGULAR_JA` はコードでは使用されていませんが、設定しても問題ありません
- 実際に使用される環境変数は：
  - `TELEGRAM_CHAT_ID_BTC_JA` （有料版用）
  - `TELEGRAM_CHAT_ID_MINIMAL_JA` （無料版用）

---

**状態**: ✅ **設定完了・動作確認済み**
