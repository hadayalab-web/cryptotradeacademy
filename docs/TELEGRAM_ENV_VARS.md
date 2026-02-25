# Telegram 用環境変数（コードが参照する名前）

配信コードが読むのは `TELEGRAM_CHAT_ID_BTC_*`。REGULAR_* / MINIMAL_* は同じ値で揃えておけばよい（テスト等で参照されることがある）。

---

## 送信で実際に使う変数

- `TELEGRAM_BOT_TOKEN` — Bot トークン
- `TELEGRAM_CHAT_ID_BTC_EN` / `_JA` / `_ES` / `_KO` / `_PT_BR` / `_AR` — 有料版チャンネル ID（`sendMessageToChannel` が参照）
- `TELEGRAM_CHAT_ID_MINIMAL_*` — 無料版チャンネル ID

`TELEGRAM_CHAT_ID_REGULAR_*` は送信コードでは使わないが、.env に同じ値で入れてあればそのままでよい。
