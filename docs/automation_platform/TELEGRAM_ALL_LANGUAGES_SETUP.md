# Telegram全言語版チャンネル設定完了

**作成日**: 2026-01-14  
**状態**: ✅ 設定完了

## 📋 チャンネル情報

### EN版（英語）
- **有料チャンネル**: Trap Deffence BTC - English
  - URL: https://t.me/+6qFItJj3pr5lYWZl
  - Chat ID: `-1003658125431`
- **無料チャンネル**: Trap Deffence BTC Trial - English
  - URL: https://t.me/cryptotradeacademytrialenglish
  - Chat ID: `-1003603117491`

### ES版（スペイン語）
- **有料チャンネル**: Trap Deffence BTC - Spanish
  - URL: https://t.me/+EdTPnKdS8LViYzI9
  - Chat ID: `-1003685620163`
- **無料チャンネル**: Trap Deffence BTC Trial - Spanish
  - URL: https://t.me/cryptotradeacademytrialspanish
  - Chat ID: `-1003436216435`

### AR版（アラビア語）
- **有料チャンネル**: Trap Deffence BTC - Arabic
  - URL: https://t.me/+wXYpJFqM-wk0ZjM1
  - Chat ID: `-1003310820145`
- **無料チャンネル**: Trap Deffence BTC Trial - Arabic
  - URL: https://t.me/cryptotradeacademytriaarabic
  - Chat ID: `-1003665969002`

### PT版（ポルトガル語）
- **有料チャンネル**: Trap Deffence BTC - Portuguese
  - URL: https://t.me/+iR7jmYyISZdkODdl
  - Chat ID: `-1003658669204`
- **無料チャンネル**: Trap Deffence BTC Trial - Portuguese
  - URL: https://t.me/cryptotradeacademytrialportugues
  - Chat ID: `-1003542318432`

### KO版（韓国語）
- **有料チャンネル**: Trap Deffence BTC - Korean
  - URL: https://t.me/+AKRDBgyH_f8wMTNl
  - Chat ID: `-1003696353997`
- **無料チャンネル**: Trap Deffence BTC Trial - Korean
  - URL: https://t.me/cryptotradeacademytrialkorean
  - Chat ID: `-1003508024518`

### JA版（日本語）
- **有料チャンネル**: Trap Deffence BTC - Japanese
  - URL: https://t.me/+qEgRBFjpKqVhY2U1
  - Chat ID: `-1003451216720`
- **無料チャンネル**: Trap Deffence BTC Trial - Japanese
  - URL: https://t.me/cryptotradeacademytrialjapanese
  - Chat ID: `-1003423418139`

## 🔧 環境変数設定

`.env`ファイルに以下の環境変数を追加してください：

```bash
# ============================================
# Telegram Bot Token（全言語共通）
# ============================================
TELEGRAM_BOT_TOKEN=8150215039:AAHMpuZRugBj2mtubi3Xa0wwc7gxFv_lbwc

# ============================================
# Trap Defense BTC（有料版チャンネル）
# ============================================

# EN版（英語）
TELEGRAM_CHAT_ID_BTC_EN=-1003658125431

# ES版（スペイン語）
TELEGRAM_CHAT_ID_BTC_ES=-1003685620163

# AR版（アラビア語）
TELEGRAM_CHAT_ID_BTC_AR=-1003310820145

# PT版（ポルトガル語）- 環境変数ではPT_BR（アンダースコア）
TELEGRAM_CHAT_ID_BTC_PT_BR=-1003658669204

# KO版（韓国語）
TELEGRAM_CHAT_ID_BTC_KO=-1003696353997

# JA版（日本語）
TELEGRAM_CHAT_ID_BTC_JA=-1003451216720

# ============================================
# 無料版チャンネル（リードマグネット）
# ============================================

# EN版（英語）
TELEGRAM_CHAT_ID_MINIMAL_EN=-1003603117491

# ES版（スペイン語）
TELEGRAM_CHAT_ID_MINIMAL_ES=-1003436216435

# AR版（アラビア語）
TELEGRAM_CHAT_ID_MINIMAL_AR=-1003665969002

# PT版（ポルトガル語）- 環境変数ではPT_BR（アンダースコア）
TELEGRAM_CHAT_ID_MINIMAL_PT_BR=-1003542318432

# KO版（韓国語）
TELEGRAM_CHAT_ID_MINIMAL_KO=-1003508024518

# JA版（日本語）
TELEGRAM_CHAT_ID_MINIMAL_JA=-1003423418139

# ============================================
# 後方互換性のため（既存のコード用）
# ============================================
TELEGRAM_CHAT_ID=-1003658125431  # EN版有料チャンネル（デフォルト）
TELEGRAM_CHAT_ID_MINIMAL=-1003603117491  # EN版無料チャンネル（デフォルト）

# ============================================
# その他設定
# ============================================
ENABLE_TELEGRAM=true
WHOP_UPGRADE_LINK=https://whop.com/trap-defense-btc
```

## 📝 環境変数の命名規則

`sendMessageToChannel`関数は以下の命名規則を使用します：

- **有料チャンネル**: `TELEGRAM_CHAT_ID_{SERIES}_{MARKET}`
  - 例: `TELEGRAM_CHAT_ID_BTC_EN`, `TELEGRAM_CHAT_ID_BTC_ES`
- **無料チャンネル**: `TELEGRAM_CHAT_ID_MINIMAL_{MARKET}`
  - 例: `TELEGRAM_CHAT_ID_MINIMAL_EN`, `TELEGRAM_CHAT_ID_MINIMAL_ES`

**注意**: PT-BRは環境変数では`PT_BR`（アンダースコア）として扱われます。

## 🧪 テスト方法

全言語版の接続テストを実行：

```bash
cd cryptosignal-ai
node scripts/test-telegram-all-languages.js
```

## ✅ 次のステップ

1. ✅ 環境変数の設定
2. ✅ 全言語版チャンネルの作成
3. ✅ Botを各チャンネルの管理者として追加
4. ⏳ 全言語版の接続テスト実行
5. ⏳ 定期配信の開始
6. ⏳ 各言語版のメッセージテンプレート作成

## 📚 関連ドキュメント

- `docs/TELEGRAM_EN_SETUP_COMPLETE.md` - EN版設定詳細
- `docs/TELEGRAM_MULTI_CHANNEL_SETUP.md` - マルチチャンネル管理ガイド
- `docs/TELEGRAM_CHANNEL_VS_GROUP.md` - チャンネル vs グループの比較
