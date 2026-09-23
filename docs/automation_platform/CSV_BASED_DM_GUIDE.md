# CSVベースDM送信ガイド

**作成日時**: 2026-01-13  
**目的**: CSVファイルを使用したDM送信の完全ガイド（直接販売用）

**用途**: Trap Defence BTCの直接販売 - ユーザーにDMを送り、Whopページで商品を購入してもらう

---

## 🎯 CSVベースの利点

- ✅ **データベース不要**: PostgreSQL/SQLiteのセットアップが不要
- ✅ **シンプル**: CSVファイルを直接編集可能
- ✅ **即座に開始**: CSVファイルを作成するだけで開始可能
- ✅ **バージョン管理**: GitでCSVファイルを管理可能

---

## 📋 CSVファイルの形式

### ファイル場所
`data/user-list-en.csv`

### CSV形式
```csv
username,display_name,market,telegram_user_id,email,status,notes,created_at,updated_at
```

### 必須カラム
- `username`: ユーザー名（一意）
- `market`: 市場コード（EN固定）
- `status`: ステータス（NewまたはContacted）

### 送信先カラム（どちらか必須）
- `telegram_user_id`: Telegram User ID
- `email`: Emailアドレス

### notesフィールドの形式
```
【配信準備完了 - GPT（CTO）】
準備日時: 2026-01-13T12:00:00.000Z
優先チャネル: TG
Telegram User ID: 123456789
Email: user@example.com

DMメッセージ:
[実際のDMメッセージ内容]
```

---

## 🚀 実行手順

### Step 1: CSVファイルの作成

`data/user-list-en.csv`を作成し、以下の形式でデータを追加：

```csv
username,display_name,market,telegram_user_id,email,status,notes,created_at,updated_at
user1,User One,EN,123456789,user1@example.com,New,"【配信準備完了 - GPT（CTO）】
準備日時: 2026-01-13T12:00:00.000Z
優先チャネル: TG
Telegram User ID: 123456789
Email: user1@example.com

DMメッセージ:
Hello! This is a test DM message.",2026-01-13T12:00:00.000Z,2026-01-13T12:00:00.000Z
```

**詳細な形式は `docs/CSV_FILE_FORMAT.md` を参照してください。**

### Step 2: CSV状態確認

```bash
npx tsx scripts/check-en-dm-csv-status.ts
```

### Step 3: CEO宛てテスト送信

```bash
npx tsx scripts/send-ceo-test-dm-csv.ts
```

### Step 4: 本番送信

```bash
# テストモード（最大2件）
TEST_MODE=true npx tsx scripts/send-en-dm-csv.ts

# 本番モード（最大1000件）
npx tsx scripts/send-en-dm-csv.ts
```

---

## 📊 CSVファイルのサンプル

### 最小限の例

```csv
username,display_name,market,telegram_user_id,email,status,notes,created_at,updated_at
testuser,Test User,EN,6770292419,test@example.com,New,"【配信準備完了 - GPT（CTO）】
準備日時: 2026-01-13T12:00:00.000Z
優先チャネル: TG
Telegram User ID: 6770292419
Email: test@example.com

DMメッセージ:
🚀 Exclusive Offer: Trap Defence BTC

Hi Test User,

We're launching Trap Defence BTC - a revolutionary tool to protect your crypto trades.

🎯 Key Features:
- Trap Defense Engine
- Real-time market analysis

💰 Special Offer: Limited time pricing

🚀 Get started: https://whop.com/aio-media-llc/trap-defence-btc-en/",2026-01-13T12:00:00.000Z,2026-01-13T12:00:00.000Z
```

---

## 🔍 CSVファイルの検証

### 必須チェック

1. **ヘッダー行が正しいか**
   ```csv
   username,display_name,market,telegram_user_id,email,status,notes,created_at,updated_at
   ```

2. **必須カラムが存在するか**
   - `username`
   - `market`（EN固定）
   - `status`（NewまたはContacted）

3. **送信先情報があるか**
   - `telegram_user_id`または`email`のどちらかが存在する

4. **notesフィールドにDMメッセージが含まれているか**
   - `DMメッセージ:`という文字列が含まれている
   - メッセージ内容が存在する

---

## 📚 関連スクリプト

- `scripts/check-en-dm-csv-status.ts` - CSV状態確認
- `scripts/send-ceo-test-dm-csv.ts` - CEO宛てテスト送信
- `scripts/send-en-dm-csv.ts` - 本番送信
- `docs/CSV_FILE_FORMAT.md` - CSV形式の詳細

---

## 🎯 次のステップ

1. **CSVファイルを作成**（`docs/CSV_FILE_FORMAT.md`を参照）
2. **CSV状態確認を実行**
3. **CEO宛てテスト送信を実行**
4. **検証結果を確認**
5. **本番送信を実行**

---

**作成日時**: 2026-01-13  
**報告者**: COO兼CTO（Cursor/Composer 1）
