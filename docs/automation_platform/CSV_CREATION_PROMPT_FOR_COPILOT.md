# CSVファイル作成プロンプト（GitHub Copilot用）

**作成日時**: 2026-01-13  
**目的**: GitHub CopilotにCSVファイルを作成させるためのプロンプト  
**用途**: Trap Defence BTCの直接販売用DM送信先リスト

---

## 📋 Copilotへのプロンプト

以下のプロンプトをGitHub Copilotに送信してください：

---

```
以下の形式でCSVファイルを作成してください。

ファイル名: data/user-list-en.csv

CSV形式:
username,display_name,market,telegram_user_id,email,status,notes,created_at,updated_at

必須カラム:
- username: ユーザー名（一意）
- market: 市場コード（EN固定）
- status: ステータス（NewまたはContacted）

送信先カラム（どちらか必須）:
- telegram_user_id: Telegram User ID
- email: Emailアドレス

notesフィールドの形式:
【配信準備完了 - GPT（CTO）】
準備日時: [ISO形式の日時]
優先チャネル: [TGまたはEmail]
Telegram User ID: [IDまたはN/A]
Email: [EmailまたはN/A]

DMメッセージ:
[実際のDMメッセージ内容]

サンプルデータ（1行目）:
username: testuser
display_name: Test User
market: EN
telegram_user_id: 6770292419
email: test@example.com
status: New
notes: 【配信準備完了 - GPT（CTO）】
準備日時: 2026-01-13T12:00:00.000Z
優先チャネル: TG
Telegram User ID: 6770292419
Email: test@example.com

DMメッセージ:
🚀 Exclusive Offer: Trap Defence BTC

Hi Test User,

We're launching an exclusive affiliate program for Trap Defence BTC.

🎯 Key Features:
- Trap Defense Engine
- Real-time market analysis
- 70% wait strategy

💰 Commission: 50% recurring

🚀 Get started: https://whop.com/aio-media-llc/trap-defence-btc-en/
created_at: 2026-01-13T12:00:00.000Z
updated_at: 2026-01-13T12:00:00.000Z

CSVファイルを作成してください。notesフィールドは複数行を含むため、CSVのダブルクォートで囲んでください。
```

---

## 📝 より詳細なプロンプト（複数行のサンプルが必要な場合）

```
以下の形式でCSVファイルを作成してください。

ファイル名: data/user-list-en.csv

CSVヘッダー:
username,display_name,market,telegram_user_id,email,status,notes,created_at,updated_at

CSV形式の要件:
1. ヘッダー行は必須
2. notesフィールドは複数行を含むため、ダブルクォートで囲む
3. 各フィールドはカンマ区切り
4. 日時はISO形式（2026-01-13T12:00:00.000Z）

サンプルデータ（3行）:

行1:
- username: cryptotrader123
- display_name: Crypto Trader
- market: EN
- telegram_user_id: 6770292419
- email: trader@example.com
- status: New
- notes: 【配信準備完了 - GPT（CTO）】
準備日時: 2026-01-13T12:00:00.000Z
優先チャネル: TG
Telegram User ID: 6770292419
Email: trader@example.com

DMメッセージ:
🚀 Exclusive Offer: Trap Defence BTC

Hi Crypto Trader,

We noticed your interest in cryptocurrency trading. We're launching Trap Defence BTC - a revolutionary tool to protect your trades.

🎯 Key Features:
- Trap Defense Engine
- Real-time market analysis
- 70% wait strategy

💰 Commission: 50% recurring

🚀 Get started: https://whop.com/aio-media-llc/trap-defence-btc-en/
- created_at: 2026-01-13T12:00:00.000Z
- updated_at: 2026-01-13T12:00:00.000Z

行2:
- username: bitcoin_expert
- display_name: Bitcoin Expert
- market: EN
- telegram_user_id: (空)
- email: expert@example.com
- status: New
- notes: 【配信準備完了 - GPT（CTO）】
準備日時: 2026-01-13T12:00:00.000Z
優先チャネル: Email
Telegram User ID: N/A
Email: expert@example.com

DMメッセージ:
🚀 Exclusive Offer: Trap Defence BTC

Hi Bitcoin Expert,

We're launching our revolutionary Trap Defence BTC product - designed to protect your crypto trades.

🎯 What makes us unique:
- Advanced trap detection
- AI-powered analysis
- Proven results

💰 Earn 50% commission on every sale

🚀 Join now: https://whop.com/aio-media-llc/trap-defence-btc-en/
- created_at: 2026-01-13T12:00:00.000Z
- updated_at: 2026-01-13T12:00:00.000Z

行3:
- username: trading_guru
- display_name: Trading Guru
- market: EN
- telegram_user_id: 987654321
- email: (空)
- status: New
- notes: 【配信準備完了 - GPT（CTO）】
準備日時: 2026-01-13T12:00:00.000Z
優先チャネル: TG
Telegram User ID: 987654321
Email: N/A

DMメッセージ:
🚀 Exclusive Offer: Trap Defence BTC

Hi Trading Guru,

Join thousands of traders using Trap Defence BTC to protect their crypto trades.

🎯 Why choose us:
- Revolutionary trap detection technology
- Real-time market insights
- Proven track record

💰 50% recurring commission

🚀 Start earning: https://whop.com/aio-media-llc/trap-defence-btc-en/
- created_at: 2026-01-13T12:00:00.000Z
- updated_at: 2026-01-13T12:00:00.000Z

CSVファイルを作成してください。notesフィールドは複数行を含むため、CSVのダブルクォートで囲み、改行はそのまま保持してください。
```

---

## 🎯 簡潔版プロンプト（最小限）

```
data/user-list-en.csvファイルを作成してください。

CSV形式:
username,display_name,market,telegram_user_id,email,status,notes,created_at,updated_at

サンプルデータ（1行）:
testuser,Test User,EN,6770292419,test@example.com,New,"【配信準備完了 - GPT（CTO）】
準備日時: 2026-01-13T12:00:00.000Z
優先チャネル: TG
Telegram User ID: 6770292419
Email: test@example.com

DMメッセージ:
🚀 Exclusive Offer: Trap Defence BTC

Hi Test User,

We're launching an exclusive affiliate program for Trap Defence BTC.

🎯 Key Features:
- Trap Defense Engine
- Real-time market analysis

💰 Commission: 50% recurring

🚀 Get started: https://whop.com/aio-media-llc/trap-defence-btc-en/",2026-01-13T12:00:00.000Z,2026-01-13T12:00:00.000Z

notesフィールドは複数行を含むため、ダブルクォートで囲んでください。
```

---

## 📋 プロンプトの使い方

1. **GitHub Copilotを開く**
2. **上記のプロンプトをコピー**
3. **Copilotに貼り付けて実行**
4. **生成されたCSVファイルを確認**
5. **必要に応じて修正**

---

## ✅ 生成後の確認事項

1. **ヘッダー行が正しいか**
   ```csv
   username,display_name,market,telegram_user_id,email,status,notes,created_at,updated_at
   ```

2. **notesフィールドがダブルクォートで囲まれているか**
   - 複数行を含むフィールドは必ずダブルクォートで囲む

3. **必須カラムが存在するか**
   - `username`
   - `market`（EN固定）
   - `status`（NewまたはContacted）

4. **送信先情報があるか**
   - `telegram_user_id`または`email`のどちらかが存在する

---

**作成日時**: 2026-01-13  
**報告者**: COO兼CTO（Cursor/Composer 1）
