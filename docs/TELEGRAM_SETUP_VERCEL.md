# Telegram 環境変数設定（Vercel）

**目的**: 有料版（Regular Briefing）・無料版（Minimal Version）を時間通りに配信するために、Vercel に以下の環境変数を設定する。

---

## 1. 必須（共通）

| 変数名               | 用途                                                     |
| -------------------- | -------------------------------------------------------- |
| `TELEGRAM_BOT_TOKEN` | メインボットのトークン（Regular/Minimal 共通で使用可能） |
| `TELEGRAM_CHAT_ID`   | デフォルトのチャンネルID（後方互換）                     |

---

## 2. 有料版（Regular Briefing）EN

| 変数名                    | 用途                              |
| ------------------------- | --------------------------------- |
| `TELEGRAM_CHAT_ID_BTC_EN` | BTC EN チャンネル（有料版配信先） |

未設定時は `TELEGRAM_CHAT_ID` にフォールバック。EN が時間通り配信されない場合は上記を設定すること。

---

## 3. 無料版（Minimal Version）ES, PT, AR, KO, JA

| 変数名                           | 用途                                            |
| -------------------------------- | ----------------------------------------------- |
| `TELEGRAM_CHAT_ID_MINIMAL_ES`    | 無料版 スペイン語チャンネル                     |
| `TELEGRAM_CHAT_ID_MINIMAL_PT_BR` | 無料版 ポルトガル語（ブラジル）チャンネル       |
| `TELEGRAM_CHAT_ID_MINIMAL_AR`    | 無料版 アラビア語チャンネル                     |
| `TELEGRAM_CHAT_ID_MINIMAL_KO`    | 無料版 韓国語チャンネル                         |
| `TELEGRAM_CHAT_ID_MINIMAL_JA`    | 無料版 日本語チャンネル                         |
| `TELEGRAM_CHAT_ID_MINIMAL_EN`    | 無料版 英語チャンネル（他言語のフォールバック） |
| `TELEGRAM_CHAT_ID_MINIMAL`       | 無料版 共通フォールバック                       |

**ボットトークン**: `TELEGRAM_BOT_TOKEN_MINIMAL` または `TELEGRAM_BOT_TOKEN` を使用。

---

## 4. 設定手順

1. Vercel ダッシュボード → プロジェクト → **Settings** → **Environment Variables**
2. 上記変数を **Production** に追加
3. デプロイ後に反映されるため、必要に応じて再デプロイ

---

## 5. 確認

ログで `Telegram credentials are missing` が出なくなれば設定完了。`[MINIMAL] ✅ All channel IDs configured` や Regular 配信成功ログを確認する。
