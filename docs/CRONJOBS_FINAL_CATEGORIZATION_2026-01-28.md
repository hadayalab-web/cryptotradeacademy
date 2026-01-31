# CronJobs最終分類確認
**作成日時**: 2026-01-28  
**目的**: 残っているCronJobsを4つのカテゴリに分類して確認

---

## ✅ 現在のCronJobs分類（全9件）

### 1. Trap Defence BTCの無料版（Minimal Version）と有料版（Regular Briefing）の定期配信と緊急配信

**1件**:
- **`/api/cron`** - `*/15 * * * *`（15分ごと）
  - **無料版（Minimal Version）**: 定期配信（`isRegularSlot`が`true`の場合）
  - **有料版（Regular Briefing）**: 定期配信と緊急配信（`isRegularSlot`が`true`の場合、または緊急配信判定）
  - **実装**: `api/cron.js`
  - **配信先**: 
    - 無料版: `TELEGRAM_CHAT_ID_MINIMAL_*`チャンネル
    - 有料版: `TELEGRAM_CHAT_ID_BTC_*`チャンネル

---

### 2. X投稿関連

**4件**:
- **`/api/vsl1-post`** - `0 1,13,21 * * *`（1日3回：1時、13時、21時）
  - VSL1自動投稿（X/Twitterのみ）
  - 無料版オプトイン誘導

- **`/api/x-post-minimal-version-cron`** - `0 0,7,12,15,23 * * *`（1日5回）
  - 無料版（Minimal Version）のX投稿

- **`/api/x-post-free-report`** - `30 4,10,17,19 * * *`（1日4回：4:30、10:30、17:30、19:30）
  - 無料版レポートX投稿（6言語対応）

- **`/api/x-quote-repost`** - `0 * * * *`（1時間ごと）
  - 引用リポスト自動化（386人のインフルエンサーにローテーション、1日500前後投稿）
  - ⚠️ ストックがある前提で動作（自動検索・追加機能は削除済み）

---

### 3. TG DM関連

**3件**:
- **`/api/vsl2-free-users`** - `0 * * * *`（1時間ごと）
  - 無料版ユーザーへのVSL2自動配信（24時間後）

- **`/api/vsl1-reminder`** - `0 */12 * * *`（12時間ごと：0時、12時）
  - 無料版ユーザーへのVSL1リマインドメッセージ（12時間後）

- **`/api/vsl2-last-call`** - `0 * * * *`（1時間ごと）
  - 無料版ユーザーへのVSL2終了直前リマインド（21時間後）

---

### 4. Whopのプロモコード在庫監視

**1件**:
- **`/api/promo-stock-monitor`** - `*/15 * * * *`（15分ごと）
  - プロモコードの残り枠監視とリマインド送信（VSL2に関連）

---

## 📊 分類サマリー

| カテゴリ | Cron数 | CronJobs |
|---------|--------|----------|
| **1. Trap Defence BTC配信** | 1 | `/api/cron`（無料版+有料版） |
| **2. X投稿関連** | 4 | `/api/vsl1-post`, `/api/x-post-minimal-version-cron`, `/api/x-post-free-report`, `/api/x-quote-repost` |
| **3. TG DM関連** | 3 | `/api/vsl2-free-users`, `/api/vsl1-reminder`, `/api/vsl2-last-call` |
| **4. Whopプロモコード監視** | 1 | `/api/promo-stock-monitor` |
| **合計** | **9** | |

---

## ✅ 確認結果

**ユーザーの分類は正しいです！**

現在のCronJobsは以下の4つのカテゴリに分類されます：

1. ✅ **Trap Defence BTCの無料版（Minimal Version）と有料版（Regular Briefing）の定期配信と緊急配信** - 1件
2. ✅ **X投稿関連** - 4件
3. ✅ **TG DM関連** - 3件
4. ✅ **Whopのプロモコード在庫監視** - 1件

**合計: 9件**

---

## 📝 補足説明

### `/api/cron`について

- **無料版（Minimal Version）**: `isRegularSlot`が`true`の場合に配信
- **有料版（Regular Briefing）**: `isRegularSlot`が`true`の場合、または緊急配信判定（EMERGENCY）の場合に配信
- **両方とも同じスケジュール**（15分ごと）で実行され、条件に応じて配信される
