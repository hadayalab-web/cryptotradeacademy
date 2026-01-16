# アラビア語チャンネルID修正

**修正日時**: 2026-01-14  
**問題**: AR版の有料版とミニマム版のチャンネルIDが逆に設定されていた

---

## ✅ 正しいチャンネルID

### AR版（有料版）
- **チャンネル名**: Trap Deffence BTC - Arabic
- **URL**: https://t.me/+wXYpJFqM-wk0ZjM1
- **Chat ID**: `-1003665969002`
- **環境変数**: `TELEGRAM_CHAT_ID_BTC_AR=-1003665969002`

### ARミニマム版（無料版）
- **チャンネル名**: Trap Deffence BTC Trial - Arabic
- **URL**: https://t.me/cryptotradeacademytriaarabic
- **Chat ID**: `-1003310820145`
- **環境変数**: `TELEGRAM_CHAT_ID_MINIMAL_AR=-1003310820145`

---

## 📋 Vercel Dashboardでの設定

以下の環境変数をVercel Dashboardで設定してください：

```bash
# AR版の有料版チャンネルID（修正）
TELEGRAM_CHAT_ID_BTC_AR=-1003665969002

# AR版の無料版チャンネルID
TELEGRAM_CHAT_ID_MINIMAL_AR=-1003310820145
```

---

## ⚠️ 重要: 現在の環境変数設定が逆になっています

**現在の設定（間違い）**:
- `TELEGRAM_CHAT_ID_BTC_AR=-1003310820145` → これはTrialチャンネルID（無料版）
- `TELEGRAM_CHAT_ID_MINIMAL_AR=-1003665969002` → これは有料版チャンネルID

**結果**:
- 有料版チャンネルに無料版メッセージ（"Trap Defense BTC - تقرير أدنى مجاني"）が送信されている
- 無料版チャンネルに有料版メッセージ（"CryptoWeather Alert - Trap Defense Report"）が送信されている

**修正が必要**: Vercel Dashboardで環境変数を正しい値に変更してください。

---

**最終更新**: 2026-01-14  
**状態**: ✅ **ドキュメント更新完了（Vercel環境変数設定待ち）**
