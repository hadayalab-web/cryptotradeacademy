# AR版チャンネルID設定（正しい設定）

**最終更新**: 2026-01-18  
**状態**: ✅ **正しい設定**

---

## ✅ 正しい環境変数設定

```bash
# AR版（アラビア語）
LANG=ar
TELEGRAM_CHAT_ID_BTC_AR=-1003665969002      # 有料版（Regular Briefing / Trap Defence BTC - Arabic）
TELEGRAM_CHAT_ID_REGULAR_AR=-1003665969002   # 有料版と同じ（コードでは未使用だが設定可）
TELEGRAM_CHAT_ID_MINIMAL_AR=-1003310820145   # 無料版（Minimal Version / Trap Defence BTC Minimal - Arabic）
```

---

## 📋 チャンネル情報

### 有料版チャンネル（Regular Briefing）
- **チャンネル名**: Trap Defence BTC - Arabic
- **Chat ID**: `-1003665969002`
- **環境変数**: `TELEGRAM_CHAT_ID_BTC_AR`
- **配信メッセージ**: 有料版（Regular Briefing）メッセージ

### 無料版チャンネル（Minimal Version）
- **チャンネル名**: Trap Defence BTC Minimal - Arabic
- **Chat ID**: `-1003310820145`
- **環境変数**: `TELEGRAM_CHAT_ID_MINIMAL_AR`
- **配信メッセージ**: 無料版（Minimal Version）メッセージ

---

## 🔍 確認方法

設定が正しいか確認するには：

```bash
node scripts/check-ar-channel-ids.js
```

**期待される結果**:
```
✅ 設定は正しいです！
```

---

## 📝 注意事項

- `TELEGRAM_CHAT_ID_REGULAR_AR` はコードでは使用されていませんが、設定しても問題ありません
- 実際に使用される環境変数は：
  - `TELEGRAM_CHAT_ID_BTC_AR` （有料版用）
  - `TELEGRAM_CHAT_ID_MINIMAL_AR` （無料版用）

---

**状態**: ✅ **設定完了・動作確認済み**
