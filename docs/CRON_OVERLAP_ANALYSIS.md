# Cron 重複分析（cron vs kiba-5min / cron vs minimal-tg-delivery）

## 1. `/api/cron`（15分）と `/api/kiba-5min`（5分）— **重複あり**

### 現状
| 処理 | cron（15分） | kiba-5min（5分） |
|------|--------------|------------------|
| CQ 取得 | 使わない（**cq:latest を参照**） | ✅ 取得して **cq:latest に保存** |
| KIBA 実行 | ✅ **runKibaOnce** を実行 | ✅ **runKibaOnce** を実行 |
| KIBA 発火時の Telegram | ✅ 送信 | ✅ 送信 |

- **CQ**: 被っていない。cron は「kiba-5min が書いた cq:latest を読む」だけ。二重取得はしていない。
- **KIBA**: **被っている**。両方で `runKibaOnce` を呼び、両方で「発火時に Telegram 送信」する。同じイベントで **二重アラート** になる可能性あり。

### 推奨
- **KIBA の実行とアラートは kiba-5min に一本化**し、cron からは KIBA 実行・KIBA Telegram を削除する。
- cron は「スナップショット構築・REGULAR 配信・内部エンジン呼び出し」に専念し、KIBA は 5 分ごとの kiba-5min に任せる。

---

## 2. cron の「minimal」と `/api/minimal-tg-delivery` — **重複なし**

### 現状
| 処理 | cron（15分） | minimal-tg-delivery（日4回） |
|------|--------------|-----------------------------|
| deliveryMode 判定 | ✅ evaluateDeliveryMode で regular / minimal 等を判定 | — |
| minimal の**送信** | **しない**（minimal のときは **送信ブロックをスキップ**して return） | ✅ **minimal 専用**で btc:snapshot を読んで 6 言語配信 |

- cron は `deliveryMode === "minimal"` のとき「送信せずに return」しているだけ（1357–1367 行目）。**minimal 本文を送っているのは minimal-tg-delivery.js のみ**。
- スケジュールも別: cron は 0,7,22,37 分ごと、minimal-tg-delivery は `8 0,6,12,18 * * *`（0/6/12/18 時 8 分）。意図的に「Regular と同時刻にしない」設計。

### 結論
- **重複なし**。cron = Regular 送信 or スキップ、minimal-tg-delivery = Minimal 送信専用。
