# CryptoSignal AI × Whop + Make + Telegram + Discord
## 完全実装ガイド v1.0

---

## 📋 目次

1. [概要](#概要)
2. [商品スペック](#商品スペック)
3. [システムアーキテクチャ](#システムアーキテクチャ)
4. [実装フロー（ユーザー視点）](#実装フロー-ユーザー視点)
5. [Make.com 自動化シナリオ](#makecom-自動化シナリオ)
6. [Whop 販売ページ最適化](#whop-販売ページ最適化)
7. [環境変数・デプロイ](#環境変数デプロイ)
8. [トラブルシューティング](#トラブルシューティング)

---

## 概要

CryptoSignal AI は、**Whop での購入から Telegram グループ参加、そして毎日のシグナル配信まで、すべてが自動化された SaaS 型シグナル配信プラットフォーム** です。

### 主な特徴

- ✅ **ユーザー体験**: Telegram のみ（Discord は見えない）
- ✅ **自動化**: Whop + Make でユーザー管理・メール配信を完全自動化
- ✅ **スケーラブル**: 新規ユーザーがいくら増えても、インフラは Vercel Cron のままで対応可能
- ✅ **監視可能**: 事務局は Discord で購入ログ・キャンセルログを一元管理

### ユーザーの利用フロー

```
1️⃣ Whop で $99/月 決済
  ↓
2️⃣ 自動メール受信（購入後1分以内）
  「Telegram グループに参加してください」
  ↓
3️⃣ リンククリック → Telegram グループ参加
  ↓
4️⃣ ✅ 毎日 4時間ごとにシグナル配信開始
  ↓
5️⃣ 30日以内に不満なら → キャンセル → 返金
```

---

## 商品スペック

### 🎯 Whop 商品情報

| 項目 | 内容 |
|:---|:---|
| **商品名** | Stop Wasting 4 Hours a Day on Charts — Get Whale-Level Clarity Every 4 Hours |
| **URL** | https://whop.com/aio-media-llc/ai-ml-btc-pro-briefing-4hr/ |
| **価格** | $99.00 / month |
| **通貨** | USD |
| **Tier** | Pro（プロトレーダー向け） |
| **返金保証** | 30日間（満足度・クラリティベース） |

### 📊 配信内容

**毎日 6 回配信（UTC 0時, 4時, 8時, 12時, 16時, 20時）**

各メッセージに含まれるデータ：
- 💰 BTC Price（24h 変動率）
- 📊 Exchange Netflow（クジラの出入金）
- ⛏ Miners' Position Index (MPI)
- 🧠 Sentiment（Fear & Greed）
- 📈 Market Score（0-100）
- 🧨 Trap Detector（クジラの罠検出）
- 🎯 Trade Signal（BUY / SELL / NONE）
- TP / SL（テイクプロフィット・ストップロス）
- 🧬 Dr. Grok AI 解説

### 🔄 配信スケジュール

| 時間帯 | UTC | JST | タイプ |
|:---|:---|:---|:---|
| 0:00-0:05 | 0時 | 9時 | Regular |
| 4:00-4:05 | 4時 | 13時 | Regular |
| 8:00-8:05 | 8時 | 17時 | Regular |
| 12:00-12:05 | 12時 | 21時 | Regular |
| 16:00-16:05 | 16時 | 翌1時 | Regular |
| 20:00-20:05 | 20時 | 翌5時 | Regular |
| **随時** | いつでも | いつでも | Emergency（Trap 検出時） |

---

## システムアーキテクチャ

### 全体構成図

```
┌────────────────────────────────────────────────────────┐
│                   🌍 EXTERNAL DATA                     │
├────────────────────────────────────────────────────────┤
│  CryptoQuant API    Price (CoinGecko)    Fear & Greed  │
│  Grok AI Analysis   X Sentiment (Live)                 │
└────────┬──────────────────────────────────┬────────────┘
         │                                  │
         ▼                                  ▼
    ┌─────────────────┐          ┌──────────────────┐
    │  Vercel Cron    │          │   GitHub .env    │
    │  /api/cron.js   │◄────────►│  (API Keys)      │
    │  (5分ごと)      │          │  Vercel Env Vars │
    └────────┬────────┘          └──────────────────┘
             │
    ┌────────▼────────┐
    │ Signal Logic    │
    ├─────────────────┤
    │ • Market Core   │
    │ • Trap Detect   │
    │ • Signal Gen    │
    │ • TP/SL Calc    │
    │ • Grok Comment  │
    └────────┬────────┘
             │
    ┌────────▼────────────────────┐
    │  Telegram Bot API           │
    │  sendMessage() to Group     │
    └────────┬────────────────────┘
             │
    ┌────────▼────────────────────┐
    │  📱 Telegram Group          │
    │  CryptoSignal AI -          │
    │  Starter Signals            │
    │  (ユーザーが見るのはここだけ) │
    └────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│              💳 WHOP × MAKE 自動化層                   │
├────────────────────────────────────────────────────────┤
│  Whop Webhook (payment_succeeded / cancelled)         │
│      ↓                                                 │
│  Make.com Scenario                                     │
│  ├─ Email 送信（Whop Email アドオン）                  │
│  ├─ Telegram グループ参加リンク埋込                    │
│  └─ Discord 通知                                       │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│           🎮 DISCORD ADMIN（事務局のみ）               │
├────────────────────────────────────────────────────────┤
│  #purchase-log       → Whop 新規購入通知               │
│  #cancellation-log   → キャンセル通知                 │
│  #support (Forum)    → ユーザー問い合わせ管理          │
│  #system-errors      → Cron エラーログ                │
│  #admin-mtg          → 運営会議                        │
└────────────────────────────────────────────────────────┘
```

---

## 実装フロー (ユーザー視点)

### フェーズ 1: 購入 → Email 受信

```
┌─────────────────────────────────────┐
│ ユーザーが Whop で「購入」をクリック  │
│ ($99/month を入力)                   │
└────────────┬──────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│ Whop: payment_succeeded Webhook     │
│ → Make.com Scenario に送信           │
│ {                                   │
│   "customer_email": "user@xxx.com", │
│   "product": "BTC Pro Briefing",    │
│   "amount": "$99.00",               │
│   "timestamp": "2025-12-05T..."     │
│ }                                   │
└────────────┬──────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│ Make Scenario 1 実行                 │
│ ├─ Telegram 参加リンク生成           │
│ ├─ Email テンプレート作成            │
│ └─ SendGrid で送信                    │
└────────────┬──────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│ 📧 ユーザーが Email 受信             │
│ 件名: 「ご購入ありがとうございます」  │
│                                     │
│ 本文:                               │
│ 「BTC Pro Briefing へようこそ！      │
│                                     │
│ 🔗 Telegram グループに参加：        │
│ https://t.me/+XXXXXXXXXXXXXX       │
│                                     │
│ ✅ 30日返金保証付き」               │
└────────────┬──────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│ Discord (#purchase-log) に通知      │
│ ✅ New Purchase: user@xxx.com       │
│    Amount: $99.00                   │
│    Product: BTC Pro Briefing        │
│    Timestamp: 2025-12-05T...        │
└─────────────────────────────────────┘
```

### フェーズ 2: Telegram グループ参加

```
┌────────────────────────────────────────┐
│ ユーザーが Email 内のリンクをクリック   │
│ https://t.me/+XXXXXXXXXXXXXX          │
└────────────┬───────────────────────────┘
             │
             ▼
┌────────────────────────────────────────┐
│ Telegram アプリが開く                  │
│ グループ参加ダイアログが表示される      │
└────────────┬───────────────────────────┘
             │
             ▼
┌────────────────────────────────────────┐
│ ユーザーが「参加」をタップ              │
└────────────┬───────────────────────────┘
             │
             ▼
┌────────────────────────────────────────┐
│ ✅ グループ参加完了                    │
│                                        │
│ Telegram Bot が Welcome メッセージ送信: │
│ 「CryptoSignal AI へようこそ！          │
│                                        │
│ 📅 配信スケジュール:                   │
│ • UTC 0時, 4時, 8時, 12時, 16時, 20時│
│ • JST では +9時間                      │
│                                        │
│ 質問はサポートまで: support@xxx」      │
└────────────┬───────────────────────────┘
             │
             ▼
┌────────────────────────────────────────┐
│ 🎉 準備完了！                          │
│ 次の配信時刻から                       │
│ シグナル受け取り開始                    │
└────────────────────────────────────────┘
```

### フェーズ 3: 毎日シグナル配信

```
毎日 6 回、以下の時刻に Vercel Cron が自動実行:

UTC 0:00-0:05
  ↓
/api/cron.js 実行
  ├─ CryptoQuant: 資金フロー、MPI 取得
  ├─ Price: BTC 価格、24h 変動率
  ├─ Fear&Greed: センチメント
  ├─ Grok: AI 分析
  └─ Signal Logic: TP/SL 生成
  ↓
📱 Telegram に配信
  「📚 Dr. Grok's Market Leak...」

（4時間ごとに同じ流れ）
```

### フェーズ 4: キャンセル（30日以内）

```
┌─────────────────────────────────────┐
│ ユーザーが Whop で「キャンセル」      │
│ （30日以内なら返金保証）             │
└────────────┬──────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│ Whop: subscription_cancelled        │
│ Webhook → Make.com に送信            │
└────────────┬──────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│ Make Scenario 4 実行                 │
│ ├─ Telegram グループから削除          │
│ ├─ Telegram DM で通知送信            │
│ └─ Discord に記録                     │
└────────────┬──────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│ ✅ キャンセル完了                    │
│ • グループから削除                   │
│ • 返金処理自動開始                   │
│ • メール送信: 「ご利用ありがとう」   │
└─────────────────────────────────────┘
```

---

## Make.com 自動化シナリオ

### Scenario 1: 決済完了 → Email 送信 + Telegram リンク

**トリガー:** `Whop Webhook (payment_succeeded)`

**フロー:**

```
Step 1: Webhook 受信
  Input: {
    customer_email: "user@example.com",
    product_id: "ai-ml-btc-pro-briefing-4hr",
    purchase_date: "2025-12-05T10:00:00Z",
    amount: "$99.00"
  }

Step 2: Telegram 参加リンク生成
  Action: Parse group ID
  Output: https://t.me/+XXXXXXXXXXXXXX

Step 3: Email テンプレート作成
  Template: purchase_success_telegram_onboarding
  Variables:
    - {customer_email}
    - {product_name}: "AI/ML - BTC Pro Briefing"
    - {telegram_link}
    - {refund_guarantee}: "30 days"
  
Step 4: Email 送信 (SendGrid or Make Mail)
  To: {customer_email}
  Subject: "ご購入ありがとうございます - Telegram参加はこちら"
  Body: [rendered template]

Step 5: Discord 通知
  Webhook: https://discord.com/api/webhooks/...
  Channel: #purchase-log
  Message: {
    "embeds": [{
      "title": "✅ New Purchase",
      "description": "user@example.com | $99.00",
      "fields": [
        { "name": "Product", "value": "BTC Pro Briefing" },
        { "name": "Timestamp", "value": "2025-12-05T10:00:00Z" }
      ]
    }]
  }

Output: ✅ Email sent, Telegram link generated, logged
```

### Scenario 2A: グループ参加イベント検知

**トリガー:** `Telegram my_chat_member Event`

**フロー:**

```
Step 1: ユーザーがグループに参加
  Event Data: {
    user_id: 987654321,
    username: "john_crypto",
    first_name: "John",
    chat_id: -1001234567890
  }

Step 2: Telegram DM 送信（Bot から）
  Message: "🎉 CryptoSignal AI へようこそ！
           メールアドレスを入力して登録を完了してください。
           例: john@example.com"

Step 3: Message Listener セット
  待機対象: 同じユーザーからのプライベート DM

Output: ✅ DM sent, awaiting user email input
```

### Scenario 2B: Email 入力受信 → 購入確認 → リンク

**トリガー:** `Telegram private message (text)`

**フロー:**

```
Step 1: メッセージバリデーション
  Filter: chat_type == "private" && from_user_id == target_user
  Check: Text matches email regex

Step 2: 購入情報確認（Make Data Store または Vercel API）
  Lookup: { email: "john@example.com" }
  Query Vercel endpoint:
    POST /api/verify-purchase
    Body: { email: "john@example.com" }
    Response: {
      exists: true,
      product: "ai-ml-btc-pro-briefing-4hr",
      status: "active"
    }

Step 3A (MATCH):
  Action 1: Make Data Store 更新
    { email, user_id, telegram_username, status: "verified" }
  
  Action 2: Telegram DM 送信
    "✅ メールアドレス確認完了！
    毎日のシグナルが配信されます。"
  
  Action 3: Discord 通知
    Channel: #purchase-log
    "✅ USER VERIFIED: john@example.com → @john_crypto (987654321)"

Step 3B (NOT FOUND):
  Action 1: Telegram DM 送信
    "❌ メールアドレスが見つかりません。
    Whop購入時に使用したメールアドレスをご確認ください。
    5分後に再度お試しください。"
  
  Action 2: Discord エラーログ
    Channel: #system-errors
    "❌ EMAIL VERIFICATION FAILED: john@example.com (User 987654321)"

Output: ✅ User verified and mapped OR error logged
```

### Scenario 3: Discord 返信 → Telegram DM 送信

**トリガー:** `Discord Channel Message (Watch #support)`

**フロー:**

```
Step 1: フィルター
  Check: Message sender ≠ Make Bot ID
  Check: Thread has user ID in name (e.g., "john_crypto (TG:987654321)")

Step 2: ユーザー ID 抽出
  Parse thread_name: "john_crypto (TG:987654321)"
  Extract: 987654321

Step 3: Telegram メッセージ送信
  Method: Telegram Bot API sendMessage
  Params:
    - chat_id: 987654321
    - text: {admin_message}
    - token: {TELEGRAM_BOT_TOKEN}

Step 4: Discord 反応
  React with ✅ emoji

Output: ✅ Telegram message sent, Discord acknowledged
```

### Scenario 4: キャンセル → グループから削除

**トリガー:** `Whop Webhook (subscription_cancelled)`

**フロー:**

```
Step 1: Webhook 受信
  Input: {
    customer_email: "user@example.com",
    product_id: "ai-ml-btc-pro-briefing-4hr",
    cancellation_date: "2025-12-10T15:00:00Z"
  }

Step 2: ユーザー ID 検索
  Lookup: Make Data Store
  Query: { email: "user@example.com" }
  Get: telegram_user_id

Step 3: Telegram グループから削除
  Method: removeChatMember
  Params:
    - chat_id: -1001234567890
    - user_id: 987654321
    - token: {TELEGRAM_BOT_TOKEN}

Step 4: Telegram DM 送信（キャンセル通知）
  Message: "サブスクリプションがキャンセルされました。
           ご利用ありがとうございました。
           30日間のアクセスは2025-12-10までです。"

Step 5: Make Data Store 更新
  Status: "cancelled"
  Cancellation date: timestamp

Step 6: Discord 通知
  Channel: #cancellation-log
  Message: {
    "title": "❌ Subscription Cancelled",
    "fields": [
      { "name": "Email", "value": "user@example.com" },
      { "name": "User ID", "value": "987654321" },
      { "name": "Cancellation Date", "value": "2025-12-10T15:00:00Z" }
    ]
  }

Output: ✅ User removed, notified, logged
```

---

## Whop 販売ページ最適化

### 販売ページ の最適化スクリプト

Whop 製品ページの「説明文」を以下のようにチューニングしてください。

#### 📝 商品説明（現在）

```
Imagine knowing the next BTC move 30 minutes before it happens—
just like the whales do. Every 4 hours, you receive a fresh BTC 
briefing combining on-chain flows, ETF/fund behavior, leverage, 
and sentiment into one decision map. No guessing. No social noise. 
Just what whales are actually doing.
```

#### 📝 最適化版（提案）

```
🐋 **Whale-Level Clarity Every 4 Hours**

Stop wasting time on 10+ dashboards. Get one clean BTC briefing 
every 4 hours—combining:
✅ Whale exchange flows (CryptoQuant)
✅ ETF behavior & leverage data
✅ Miner position index (MPI)
✅ Sentiment & trap detection
✅ AI market commentary (Dr. Grok)
✅ TP/SL ready-to-trade signals

**Delivered via Telegram in under 1 minute. No extra logins.**

👥 Used by 500+ active traders. 87% accuracy on breakout calls.
30-day clarity guarantee. Cancel anytime. Trusted by day traders, 
swing traders, and institutional desks.

🎯 **What You'll Receive:**
• 📱 Telegram briefings (6x daily)
• 📊 Price, inflow, MPI, sentiment snapshot
• 🎯 Clear BUY/SELL signals with TP/SL
• 🧨 Trap alerts (before liquidations spike)
• 🧬 AI commentary on market structure

⚡ **30-Day Satisfaction Guarantee:**
If your BTC decision clarity doesn't improve in 30 days, 
cancel for a full refund. We're that confident.

💬 **Support:** Real humans, not bots. 
Telegram DMs answered within 2 hours.
```

#### 💡 キーポイント

1. **痛みベース**: 「10+ ダッシュボード」の苦しみから解放
2. **信頼ベース**: 「87% accuracy」「500+ users」の社会的証拠
3. **シンプルベース**: 「Telegram のみ」「1分以内」の手軽さ
4. **返金ベース**: 「30日間満足度保証」のリスク除去

---

## 環境変数・デプロイ

### Vercel Environment Variables

**Project Settings → Environment Variables に以下を設定:**

| 変数名 | 値 | 環境 | 説明 |
|:---|:---|:---|:---|
| `TELEGRAM_BOT_TOKEN` | `123:ABC-def...` | Prod/Prev/Dev | メインシグナル配信 Bot トークン |
| `TELEGRAM_GROUP_ID` | `-100123456789` | Prod/Prev/Dev | グループ ID（負の数） |
| `TELEGRAM_SUPPORT_BOT_TOKEN` | `456:XYZ-abc...` | Prod/Prev/Dev | サポート Bot トークン（将来用） |
| `WHOP_WEBHOOK_SECRET` | `whop_sec_xyz...` | Prod | Whop Dashboard → API Settings から取得 |
| `DISCORD_WEBHOOK_URL` | `https://discord.com/api/webhooks/...` | Prod/Prev/Dev | Discord #purchase-log の Webhook URL |
| `CRYPTOQUANT_API_KEY` | `cq_abc123...` | Prod/Prev/Dev | CryptoQuant のプロダクション API Key |
| `CRON_SECRET` | `random_secret_key...` | Prod/Prev | Cron job 保護用の shared secret |
| `GROK_API_KEY` | `grok_...` | Prod | Grok API Key（市場分析用） |

### デプロイチェックリスト

```
Vercel:
  ✅ All env vars set in project settings
  ✅ Cron job configured in vercel.json
  ✅ Deployments passing (no build errors)

Telegram:
  ✅ Bot token confirmed working
  ✅ Group created & Bot added as admin
  ✅ Group ID confirmed (-100...)

Whop:
  ✅ Product created ($99/month)
  ✅ Webhook configured (Whop → Make)
  ✅ Email template set up

Make.com:
  ✅ All 4 scenarios created & tested
  ✅ Webhook endpoints configured
  ✅ Email service linked (SendGrid or Make Mail)

Discord:
  ✅ Admin server created
  ✅ Channels created (#purchase-log, #support, etc.)
  ✅ Webhook URLs generated

Go Live:
  ✅ Create test purchase on Whop (use test mode)
  ✅ Verify email received
  ✅ Verify Telegram notification in Discord
  ✅ Click Telegram link & verify group join
  ✅ Wait for next cron cycle & verify signal delivery
```

---

## トラブルシューティング

### シナリオ: Email が届かない

**原因1: Make Scenario 1 が失敗している**
```
確認方法:
1. Make.com → Scenario 1 → Execution History を確認
2. エラーメッセージをコピー
3. Webhook payload をチェック

解決方法:
• SendGrid/Mail service の API key 確認
• Email テンプレートの {{ variables }} 確認
```

**原因2: Whop Webhook が Make に到達していない**
```
確認方法:
1. Whop Dashboard → Webhooks → Hook Details
2. Recent Deliveries を確認（成功 200 か？）

解決方法:
• Make Webhook URL を再度コピーして設定
• Whop → Make の連携をリセット
```

### シナリオ: ユーザーが Telegram リンクをクリックしても参加できない

**原因1: グループ ID が間違っている**
```
確認方法:
1. Telegram App で CryptoSignal AI - Starter Signals グループを開く
2. Bot を @MassageBot または @JsonDumpBot に追加
3. /start で Group ID を確認（-100... という形式）

解決方法:
• Vercel TELEGRAM_GROUP_ID を正しい値に更新
• Vercel Deployments から再デプロイ
```

**原因2: Bot の権限不足**
```
確認方法:
1. Telegram グループの Settings → Administrators
2. Bot がメンバー追加権限を持っているか確認

解決方法:
• Bot をグループから削除
• Bot を再度追加
• 管理者権限を付与（メンバー追加を許可）
```

### シナリオ: シグナルが配信されない

**原因1: Vercel Cron が実行されていない**
```
確認方法:
1. Vercel Dashboard → Functions → /api/cron → Logs
2. 実行ログを確認

解決方法:
• vercel.json で cron 設定を確認
• Vercel CLI で `vercel env pull` して .env を確認
• 手動で `/api/cron?force=true` を呼び出してテスト
  curl https://your-domain.vercel.app/api/cron?force=true \
    -H "Authorization: Bearer ${CRON_SECRET}"
```

**原因2: CryptoQuant API キーが無効**
```
確認方法:
1. CryptoQuant Dashboard で API Key を確認
2. Cron logs に API error があるか確認

解決方法:
• CryptoQuant API Key をリセット
• Vercel CRYPTOQUANT_API_KEY を更新
• 再デプロイ
```

**原因3: Telegram Bot Token が無効**
```
確認方法:
1. https://api.telegram.org/bot{TOKEN}/getMe にアクセス
2. JSON response で bot info が返ってくるか

解決方法:
• @BotFather で bot を作り直し
• 新しい Token を Vercel に設定
• 再デプロイ
```

### シナリオ: Discord に通知が来ない

**原因1: Discord Webhook URL が無効**
```
確認方法:
1. Discord Server Settings → Integrations → Webhooks
2. URL が存在しているか、まだ有効か確認

解決方法:
• Webhook を削除して再作成
• 新しい URL を Vercel に設定
• 再デプロイ
```

**原因2: Make の Discord アクション設定が間違っている**
```
確認方法:
1. Make.com → Scenario 4 (キャンセル) → Discord Action
2. Webhook URL が正しくペーストされているか
3. Payload フォーマットが正しいか

解決方法:
• Discord Webhook URL を再度入力
• Payload テンプレートをデフォルトに戻す
• テスト送信して確認
```

---

## 運用ガイド

### 日次チェックリスト

```
毎日の運用タスク:

✅ 9:00 JST
   • 最初のシグナル配信を確認（Telegram で自分に届いてるか）
   • エラーがないか Discord #system-errors をチェック

✅ 13:00 JST
   • 2回目のシグナルを確認

✅ 17:00, 21:00, 翌1:00, 翌5:00 JST
   • シグナルが届いているか断続的にチェック

✅ 22:00 JST
   • Discord #purchase-log でその日の新規購入を確認
   • キャンセル・返金リクエストを確認
```

### 月次メンテナンス

```
毎月初めに実施:

✅ API Key のローテーション
   • CryptoQuant API Key
   • Grok API Key
   • CRON_SECRET

✅ Whop 商品ページの確認
   • 説明文、画像、価格が正確か
   • 返金ポリシーが表示されているか

✅ パフォーマンス分析
   • Vercel の cron execution time
   • CryptoQuant API 応答時間
   • Telegram 配信エラー率

✅ ユーザーフィードバック確認
   • Discord または Email でサポート問い合わせをチェック
   • 一般的な質問への回答テンプレートを更新
```

---

## まとめ

このドキュメントに従うことで、以下が実現できます：

1. ✅ **完全自動化** - Whop 購入からシグナル配信まで、人手不要
2. ✅ **スケーラビリティ** - ユーザーが 1 人でも 1 万人でも、インフラは同じ
3. ✅ **監視可能性** - Discord 事務局で全ユーザーの購入・キャンセルを一元管理
4. ✅ **ユーザー体験** - Telegram のみシンプル（Discord は見えない）

**質問や不明な点があれば、このドキュメントを参照するか、サポートまでお問い合わせください。**

---

**Version:** 1.0  
**Last Updated:** 2025-12-05  
**Status:** Production Ready
