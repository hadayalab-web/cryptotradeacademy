# Whop / X と FirstPromoter の連携整理

Whop API・Webhook および X API と FirstPromoter の関係を、実装視点で整理する。

---

## 1. 全体の役割

| システム | 役割 | 連携の向き |
|----------|------|------------|
| **Whop** | 商品販売・決済・メンバーシップ。購入イベントを Webhook で通知。 | Whop → 当方 / 当方 → FirstPromoter |
| **FirstPromoter** | プロモーター（アフィリエイター）管理・紹介トラッキング・報酬計算。売上を API で受け取る。 | 当方 → FirstPromoter（Track API）/ FirstPromoter → 当方（Webhook） |
| **X (Twitter)** | DM でスカウト送付・招待リンク配布。FirstPromoter と直接の API 連携はない。 | 当方 → X（DM 送信）/ FirstPromoter → 当方（Webhook で登録検知） |

---

## 2. Whop API / Webhook と FirstPromoter の連携

### 2.1 目的

- Whop で発生した**有料成約**を、**どのプロモーターの紹介か**と紐付け、FirstPromoter に渡して報酬計算させる。

### 2.2 前提（FirstPromoter の仕様）

- **売上登録**: `POST https://firstpromoter.com/api/v1/track/sale`（サーバー側のみ推奨）
  - 必須: `event_id`（重複防止）, `amount`（セントまたは円等）
  - 顧客識別: `email` または `uid`（FirstPromoter 側のリードと照合）
  - **紹介紐付け**:
    - **A) リード登録済み**: 事前に signup API または JS でリードを登録し、その email/uid で sale を送ると FirstPromoter がプロモーターを判定
    - **B) ref_id**: 紹介リンクの `ref_id` を sale 時に渡すと、リード未登録でも「その ref のプロモーター」に紐付けてリード＋売上を一括登録可能
    - **C) promo_code**: プロモーターごとの固有クーポンを FirstPromoter に登録しておき、売上時に `promo_code` を渡すとそのプロモーターに紐付く

- Whop は Stripe 等で決済しているため、FirstPromoter の **Stripe 連携** だけでも「売上」は取れるが、**「誰の紹介か」** は別途、ref または signup で渡す必要がある。

### 2.3 推奨: Whop Webhook → 自前で FirstPromoter Track Sale を叩く

| ステップ | 内容 |
|----------|------|
| 1 | **既存**: `api/whop-webhook.js` で Whop の `checkout.completed` / `membership.created` 等を受信し、署名検証・コンバージョン記録（KPI/KV）を行っている。 |
| 2 | **追加**: 同一イベント内で、FirstPromoter 用の情報を用意する。 |
| 2a | **紹介元の特定**: (i) Whop の checkout metadata / referrer に `ref_id`（FirstPromoter の ref）または `utm_content` 等でプロモーター識別子を入れておく、(ii) または Whop のプロモコードと FirstPromoter のプロモーターを対応表で管理し、checkout の `promo_code` からプロモーターを決める。 |
| 2b | **重複防止**: `event_id` は Whop の `checkout.id` や `membership.id` など一意 ID を使う。 |
| 2c | **金額**: FirstPromoter はセント単位（JPY 等ゼロ小数通貨はそのまま）。Whop の `total` / `renewal_price` をその仕様に合わせて送る。 |
| 3 | **送信**: `POST /api/v1/track/sale` に `email`（または uid）, `event_id`, `amount`, 必要に応じて `ref_id` または `promo_code`, `currency`, `plan` を渡す。 |
| 4 | **結果**: 200 なら報酬作成、204 なら「紹介売上ではない」として FirstPromoter が無視。当方では 204 も正常扱いでよい。 |

**Whop API を直接使う連携**: 売上を「Whop から取りに行く」必要はない。Whop が Webhook で push してくるので、**Webhook 受信 → FirstPromoter Track API** の一方向で十分。Whop API はプロモコード一覧取得・在庫確認など別用途に使う。

### 2.4 データの流れ（図）

```
[ユーザー] → アフィリエイトリンク(ref_id 付き) or プロモコード入力
    → Whop で購入
        → Whop → Webhook → 当方 api/whop-webhook.js
            → 当方 → POST firstpromoter.com/api/v1/track/sale (email, event_id, amount, ref_id or promo_code)
                → FirstPromoter が報酬計算・プロモーターに紐付け
```

### 2.5 実装タスク（要約）

- Whop Webhook ハンドラ内で、metadata / referrer / promo から `ref_id` または FirstPromoter 用 `promo_code` を取得する。
- 取得できた場合のみ、`services/firstpromoter/trackSale.js` のような薄いクライアントで `track/sale` を呼ぶ。
- `FIRSTPROMOTER_API_KEY` を環境変数に追加する。

### 2.6 公式リファレンス・ベストプラクティス（FirstPromoter–Whop 連携の根拠）

**FirstPromoter と Whop を直接つなぐ公式の「運用例」や「Whop 用ガイド」は公開されていない**が、両者の公式ドキュメントから、**「サポート外決済 → Webhook 受信 → Track API」** という同じパターンが示されており、当方の設計（Whop Webhook → track/sale）はそのベストプラクティスに沿っている。

| 出典 | 内容・ヒント |
|------|----------------|
| **FirstPromoter: API（サポート外決済）** | [Integrations > Billing > API](https://docs.firstpromoter.com/integrations/billing/api) で「決済プロバイダがサポート一覧にない場合は、**自サーバで Webhook を受信し、そのイベントを受けて FirstPromoter に track/sale を送る**」と明記。難易度 Intermediate、開発者要。 |
| **FirstPromoter: Track Sale API** | [Tracking sales and commissions](https://docs.firstpromoter.com/api-reference-v1/tracking-api/sales): `POST https://firstpromoter.com/api/v1/track/sale`。**売上は必ず請求プロバイダの Webhook / IPN / API 成功応答を受けてから送る**（クライアント側ピクセルは不正のため非推奨）。`event_id` で重複防止。`ref_id` または `promo_code` でサインアップ追跡をバイパスしつつリード＋売上を一括紐付け可能。**204 = 紹介売上ではない**（自前で紹介/非紹介を判定しなくてよい）。JPY は端数なしの整数で送る。認証は `X-API-KEY` ヘッダ。 |
| **FirstPromoter: カスタム連携ガイド** | ダッシュボード内の [Custom integration](https://login.firstpromoter.com/?redirect=%2Fintegration%2Fcustom) に、サポート外決済用のステップバイステップガイドあり（要ログイン）。 |
| **Whop: Webhooks** | [Webhooks](https://docs.whop.com/developer/guides/webhooks): Company Webhook で自社の決済・メンバーシップイベントを受信。**payment.succeeded**・**membership.activated**・**membership.deactivated** 等。 [Standard Webhooks](https://github.com/standard-webhooks/standard-webhooks) 仕様で署名検証必須。ローカルは ngrok / Cloudflare トンネル可。 |
| **Whop: API Reference** | 各リソースの `hook` ページでイベント名とペイロードスキーマを記載。[API Reference](https://docs.whop.com/api-reference/) で payment / membership 等を参照。 |

**Whop Webhook「すべて」選択時のイベント一覧**（参考）:

| 決済・請求 | メンバーシップ | 入会・審査 | 決済ライフサイクル | 紛争・返金 |
|------------|----------------|------------|--------------------|------------|
| invoice_created | membership_activated | entry_created | setup_intent_requires_action | dispute_created |
| invoice_paid | membership_deactivated | entry_approved | setup_intent_succeeded | dispute_updated |
| invoice_past_due | membership_cancel_at_period_end_chan | entry_denied | withdrawal_created | refund_created |
| invoice_voided | | entry_deleted | withdrawal_updated | refund_updated |
| | | | course_lesson_interaction_completed | dispute_alert_created |
| | | | payout_method_created | |
| | | | verification_succeeded | |
| | | | payment_created | |
| | | | payment_succeeded | |
| | | | payment_failed | |
| | | | payment_pending | |

**当方で track/sale に使うイベント**: `checkout.completed`, `membership.created`, `membership.renewed`, `membership.activated`, `membership_activated`, `payment_succeeded`, `invoice_paid`（ドット形式・アンダースコア形式の両方に対応）。

**Whop API 権限一覧**（参考・管理者権限で大半を付与済み）:

<details>
<summary>クリックで展開</summary>

- プロダクト: Create/Read/Update/Delete/Export products, Read/Export product statistics, Manage product control center
- 広告: Create ad campaigns, Create ad campaign conversions, Read/Update ad campaigns, Read ad publishers
- アフィリエイト: Read affiliates, Create/Update affiliates
- チャット・DM: Manage chat webhooks, Moderate chats, Read chat messages, Read chats, Read direct messages, Manage DM messages, Manage DM channels
- フォーラム: Create/Read forum posts, Moderate forum posts
- チーム: Read team members, Read team member emails
- トークン・残高: Read company balance, Read/Create token transactions
- ログ: Read logs
- 決済・チェックアウト: Manage checkout settings, Manage legal settings
- 会社情報: Read business information, Update business details, Create/Delete child companies, Update child company fees, Update social links, Update custom emojis
- コンテンツ報酬: Read/Create/Delete/Update content rewards, Moderate content reward submissions, Export content rewards
- デベロッパー・アプリ: Read developer settings, Create/Manage apps, Manage OAuth settings, **Manage webhooks**, Manage app builds, Attach/Detach apps to products, Read all apps, Update/Delete apps, Read in-app purchases
- ライブ配信: Create/Delete livestreams, Manage livestream recordings, Read/Write livestream chat, Moderate livestreams
- メンバー: Export/Read members, Read member emails, Read member phone numbers, Read member payment methods, Manage/Update/Moderate members, Update memberships, Export/Read member statistics
- 決済: Export/Read payments, Charge payments, Manage disputes, Export/Read disputes, payment:dispute_alert:read, Read setup intents, Manage payments, Manage resolution center cases, Export/Read resolution center cases
- ペイアウト: Create/Delete/Read/Update payout destinations, Transfer funds, Read transfers, Export transfers, Withdraw funds, Read/Export withdrawals, Read/Update payout accounts
- プラン: Export/Read plans, Create/Delete/Update plans, Export/Read plan statistics
- ウェイトリスト: Manage/Export/Read waitlist entries
- プロモコード: Export/Read promo codes, Create/Delete/Update promo codes
- 統計: Read statistics
- サポート: Read support chats, Create support chats, Send messages in support chats
- トラッキングリンク: Export/Read tracking links, Create/Delete/Update tracking links, Export/Read tracking link statistics
- コース: Read/Update courses, Read student-lesson interactions, Read course analytics
- リード: Read/Export leads, Manage leads
- 請求書: Create/Read/Export/Update invoices
- Webhook 変更通知: Read changes to invoices, setup intents, withdrawals, payout methods, verifications, waitlist entries, courses, memberships, payments, refunds, disputes, resolution center cases, app payments
- 発送: Create/Read shipments
- チェックアウト設定: Read checkout configurations, Create/Delete checkout configurations, Create/Read checkout requests
- エアドロップ: Read airdrop links, Manage airdrop links
- 通知: Create notifications
- OAuth: Exchange OAuth tokens

</details>

**当方の連携で特に重要な権限**: Manage webhooks（Webhook 受信設定）, Read changes to memberships / payments / refunds（購入イベントのペイロード）, Read promo codes（紹介紐付け）, Read member emails（FirstPromoter 用顧客識別）

**まとめ**: 「Whop から Webhook を受ける → 署名検証 → 成約時のみ FirstPromoter に track/sale（event_id, amount, ref_id or promo_code, email）」は、FirstPromoter の「サポート外決済」向け公式パターンと Whop の Webhook 仕様を組み合わせた形であり、**公式リファレンスに沿った運用方法**として参照できる。

---

## 3. X API と FirstPromoter の連携

### 3.1 結論: 「直接連携」はない

- **X API**: 投稿・検索・**DM 送信** など。SNS の機能提供のみ。
- **FirstPromoter**: プロモーター管理・紹介トラッキング・報酬。X 用の API は提供していない。

そのため、**「X API と FirstPromoter の連携」は、私たちのバックエンドが仲介する形**になる。

### 3.2 連携パターン

| やりたいこと | 誰が何をするか | 備考 |
|--------------|----------------|------|
| **スカウト DM を送る** | 当方で **X API**（DM 作成）を呼び、FirstPromoter の**招待リンク**を本文に含める。 | FirstPromoter は呼ばない。X が DM を配送するだけ。 |
| **誰がプロモーター登録したか知る** | **FirstPromoter → 当方**の Webhook「**Promoter Accepted**」等を受信。当方のエンドポイント（例: `api/firstpromoter-webhook.js`）で受け、Supabase/KV に「この email がプロモーター登録」を記録。 | 任意で、事前に「この X @handle に DM 送った」と DB に書いておき、後から同じ email で Promoter Accepted が来たら「@handle ↔ プロモーター」を紐付ける。 |
| **紹介クリックを計測する** | アフィリエイターが X で貼るリンクは **FirstPromoter の ref 付き URL**。クリックは FirstPromoter 側で計測。 | X API は不要。 |

### 3.3 データの流れ（図）

```
[当方] X API で DM 送信（本文に FirstPromoter 招待 URL）
    → [X] 候補に DM 配信
        → [候補] クリックして FirstPromoter でサインアップ
            → [FirstPromoter] Promoter Accepted
                → [FirstPromoter] Webhook → 当方 api/firstpromoter-webhook.js
                    → [当方] Supabase/KV に「プロモーター登録」を記録（任意で X handle と対応付け）
```

### 3.4 実装タスク（要約）

- **X 側**: 既存の DM 送信設計（`config/affiliateScoutDmTemplates.js` 等）のまま、本文に `getFirstPromoterInviteUrl(lang)` を入れる。X API の DM 作成のみ実装すればよい。
- **FirstPromoter 側**: 設定画面で Webhook URL を `https://当方ドメイン/api/firstpromoter-webhook` にし、イベント「Promoter Accepted」「Lead Signup」等を購読。受信ハンドラで署名検証し、プロモーター ID や email を Supabase/KV に保存する。必要なら「X DM 送信済み @handle」テーブルと email で突き合わせる。

---

## 4. まとめ表

| 連携 | 方向 | 手段 | 実装の要点 |
|------|------|------|------------|
| **Whop → FirstPromoter** | 当方経由で売上を FirstPromoter へ | Whop Webhook 受信 → FirstPromoter Track Sale API | Webhook 内で ref_id / promo_code を取得し、track/sale を呼ぶ。Notion は使わない。 |
| **FirstPromoter → 当方** | FirstPromoter からイベントを受ける | FirstPromoter Webhook（Promoter Accepted 等） | 新規エンドポイントで受信し、Supabase/KV に登録情報を保存。 |
| **X → FirstPromoter** | 間接のみ | X API で DM 送信し、本文に招待 URL を記載 | DM 送信のみ。FirstPromoter の API を X から叩く必要はない。 |
| **X ↔ FirstPromoter の対応付け** | 当方 DB で管理 | DM 送信ログ（@handle）と Webhook（email）の突き合わせ | 任意。Supabase/KV で「送信済み handle」「登録済み promoter email」を保存し、同じ人物かどうかを判定する。 |

---

## 5. あと詰めておくべきこと（実装・設計チェックリスト）

以下は連携を「動く状態」まで持っていくにあたり、決めておく・実装しておく項目。

| # | 項目 | 現状 | やること |
|---|------|------|---------|
| 1 | **Whop Webhook → FirstPromoter track/sale** | **実装済み** | `api/whop-webhook.js` で metadata / referrer から `ref_id`、checkout/membership から `promo_code` を取得し、`services/firstpromoter/trackSale.js` で `POST track/sale` を呼ぶ。 |
| 2 | **ref_id の受け渡し設計** | ドキュメント上のみ | 購入者がアフィリエイターのリンクから来た場合、**FirstPromoter の ref 付き URL** の ref を Whop の referrer または **metadata** に載せる（ランディング側で付与）。またはアフィリエイターごとの **プロモコード** を Whop と FirstPromoter に登録し、checkout で紐付ける。Whop が referrer/metadata を Webhook で送るか要確認。 |
| 3 | **FirstPromoter Webhook 受信** | **実装済み** | `api/firstpromoter-webhook.js` で Promoter Accepted 等を受信し、`FIRSTPROMOTER_WEBHOOK_SECRET` で検証のうえ KV に保存。 |
| 4 | **DM 送信済み @handle と登録プロモーターの突き合わせ** | 任意のまま | 運用で「誰が登録したか」を追いたい場合、DM 送信時に「送信先 @handle」を KV に記録し、FirstPromoter Webhook の email と突き合わせる。 |
| 5 | **報酬率・ペイアウト条件の明文化** | 戦略ドキュメントに「例: 50%」のみ | 報酬率・初回のみ/継続課金も、最低支払額、支払サイクルを FirstPromoter とアフィリエイト規約の両方に明記。ペイアウトは FirstPromoter 経由か Whop ネイティブかも決めておく（§6 参照）。 |
| 6 | **環境変数** | **実装済み** | `.env.example` に `FIRSTPROMOTER_API_KEY`、`FIRSTPROMOTER_INVITE_URL`、`FIRSTPROMOTER_WEBHOOK_SECRET`、`WHOP_WEBHOOK_SECRET`、`AFFILIATE_DM_DAILY_CAP`、`WHOP_AFFILIATE_PROGRAM_URL` を記載済み。 |

### 担当者タスク（実施後に稼働可能）

以下は**担当者（運用側）が実施するタスク**。完了次第、環境変数設定とデプロイで稼働できる。

| # | タスク | 内容 |
|---|--------|------|
| 1 | **X API を DM 権限ありで再取得** | 現在の X (Twitter) Developer のプロジェクト／アプリで **DM の読み書き権限**（`dm.read`, `dm.write`）を有効にしたうえで、Access Token を再発行する。未取得の場合は OAuth 2.0 または 1.0a のトークンに DM スコープを含める。 |
| 2 | **FirstPromoter のアカウント開設と設定・API 取得** | [FirstPromoter](https://firstpromoter.com/) でアカウントを作成し、**API Key**（Track API 用）を取得。招待用の **Signup / Invite URL** を控え、`FIRSTPROMOTER_INVITE_URL` に設定。必要なら Webhook 用の署名シークレットを設定し、`FIRSTPROMOTER_WEBHOOK_SECRET` に反映。 |

上記が完了したら、次の「稼働手順」で Vercel 環境変数と FirstPromoter の Webhook URL を設定する。

### 稼働手順（担当者タスク完了後に実施）

1. **環境変数**: Vercel に `CRON_SECRET`、`FIRSTPROMOTER_API_KEY`、`FIRSTPROMOTER_INVITE_URL`（FirstPromoter の招待 URL）、`WHOP_WEBHOOK_SECRET`、必要なら `AFFILIATE_DM_DAILY_CAP`（例: 15 または 62）を設定。KV（Vercel KV）を有効化。X API は **DM 権限付きのトークン**（`X_API_ACCESS_TOKEN` / `X_API_ACCESS_TOKEN_SECRET` または OAuth 2.0）を設定。
2. **FirstPromoter**: ダッシュボードで Webhook URL を `https://<当方ドメイン>/api/firstpromoter-webhook` に設定し、イベント（Promoter Accepted 等）を購読。`FIRSTPROMOTER_WEBHOOK_SECRET` を設定している場合はヘッダー名を `x-firstpromoter-signature` または `x-webhook-signature` に合わせる。
3. **DM スカウト**: Cron が **15 分ごと** に `/api/affiliate-scout-run` を呼ぶ（vercel.json に登録済み）。認証は `Authorization: Bearer <CRON_SECRET>`。手動テストは `GET /api/affiliate-scout-run?dryRun=1` で送信せず確認、`POST` に `?secret=<CRON_SECRET>` で 1 通送信。
4. **Whop**: 購入イベントで ref_id または promo_code が付与されていれば、whop-webhook が自動で FirstPromoter に track/sale を送る。

---

## 5.1 X–FirstPromoter–Whop パイプラインの実装可能性

**結論: うまく実装できそう**。設計と土台は揃っており、残りは「あと詰め」チェックリスト（§5）の範囲で、技術的ブロッカーはない。以下の 3 ブロックを順に実装すればパイプラインがつながる。

| ブロック | 現状 | 不足 | 難易度 |
|----------|------|------|--------|
| **X → FirstPromoter（DM 送信）** | 候補検索（`affiliateScoutSearch.js`）、文案・スロット設定（`affiliateScoutConfig.js`, `affiliateScoutDmTemplates.js`）、`fillScoutDmTemplate` / `getFirstPromoterInviteUrl` あり。 | **DM を実際に送る API または Cron** が未実装（README に「DM 送信は今後の実装に委ねる」とある）。X API の DM 作成を呼び、本文に `getFirstPromoterInviteUrl(lang)` または `getWhopAffiliateProgramUrl(lang)` を入れるエンドポイント or 定期実行が必要。 | 中（X API レート制限・既送信除外の考慮） |
| **Whop → FirstPromoter（売上紐付け）** | `api/whop-webhook.js` で Whop の購入イベント受信・署名検証・KPI/KV 記録まで実装済み。`referrer_url` と `metadata`（utm_*）の取得あり。 | **ref_id または promo_code** を metadata/referrer から取り、**FirstPromoter の track/sale** を呼ぶ処理が未実装。`services/firstpromoter/trackSale.js` の新規作成と、whop-webhook 内からの呼び出しが必要。加えて、**ref_id を Whop まで届ける設計**（ランディング URL の ref を checkout の referrer/metadata に載せる、またはプロモコード方式）の確定と、Whop がそれを Webhook で送るかの確認。 | 中（ref 受け渡しの設計が要） |
| **FirstPromoter → 当方（Webhook）** | なし。 | `api/firstpromoter-webhook.js` の新規作成。Promoter Accepted / Lead Signup の受信・署名検証・KV または Supabase への保存。DM 送信済み @handle との突き合わせは任意。 | 低 |

**既に揃っているもの**

- Whop Webhook の受信・検証・コンバージョン記録（event 種別・checkout/membership の参照・metadata 参照）
- アフィリエイトスカウト用の検索・文案・言語別スロット・招待 URL／Whop アフィリエイト URL の設定
- FirstPromoter の Track API 仕様と「サポート外決済」パターン（§2.6）の整理

**不確実な点（実装時に確認）**

- Whop の checkout が **referrer** または **metadata** に「FirstPromoter の ref」やプロモコードを載せ、Webhook で送ってくれるか。送れない場合は、ランディングページ側で ref を保持し、checkout 時に metadata に付与するなどのフローが必要。

---

## 6. FirstPromoter はベストチョイスか（選択の整理）

**選定で特に重視する軸**: (1) **アフィリエイターの手軽さ**（申し込み〜リンク取得までのステップの少なさ、Whop 未登録で参加できるか）、(2) **Whop 連携の親和性**（Whop で販売している前提で、紹介元の紐付け・報酬計算をどこまでスムーズにできるか）。この 2 つを優先するなら FirstPromoter 経由が有利になりやすい。詳細な比較は [FIRSTPROMOTER_MERITS_AND_ALTERNATIVES.md](./FIRSTPROMOTER_MERITS_AND_ALTERNATIVES.md) を参照。

### 6.1 結論

**「常にベスト」とは言い切れないが、いまの戦略（X DM スカウト → 招待リンクで登録 → Whop で販売）とは相性が良い**。一方で、**Whop だけでアフィリエイトを完結させる選択肢**もある。

### 6.2 FirstPromoter を選ぶ理由（向いている点）

- **招待リンクで「DM から登録」まで一本化できる**: DM に FirstPromoter の招待 URL を入れれば、クリック→サインアップ→ref 付きリンク取得まで FirstPromoter 上で完結。X handle と関係なく「誰がプロモーターか」を FirstPromoter が管理できる。
- **ref_id / promo_code で紹介元を紐付けられる**: Whop はネイティブで「誰の紹介か」を外部ツールに渡す API はないため、当方で Webhook 受信 → track/sale を叩く必要がある。FirstPromoter は Track API を提供しており、この「自前で売上を渡す」形と合う。
- **サブスク・継続課金向け**: 月額課金の報酬計算・リカーリングコミッションに対応。Trap Defence の有料版はサブスクなので要件と合う。
- **API・Webhook が使える**: 招待リンク生成、売上登録、Promoter Accepted の受信をすべて API/Webhook で扱える。Notion を使わず Supabase/KV で管理する方針とも整合する。

### 6.3 弱い点・注意点

- **Whop とのネイティブ連携はない**: Stripe / Paddle / Chargebee 等は公式連携があるが、Whop はない。**Whop Webhook → 自前で track/sale** の実装が必須。
- **UI やカスタマイズの不満**: 他ツールと比べ「UI が古い」「カスタマイズが限定的」という声はある。運用で困るレベルかは試してみないと分からない。
- **二重管理の可能性**: Whop にも「Custom Affiliates」「Revenue Share」がある。FirstPromoter で報酬計算しつつ、実際の支払いを Whop でするか、FirstPromoter でするかを決める必要がある（両方使うとルールが複雑になりがち）。

### 6.4 代替案: Whop ネイティブのみ

- **Whop のアフィリエイト**: 25,000+ アフィリエイト、$100M+ GTV、即時ペイアウト、dispute 管理あり。**Whop 上でアフィリエイト申請・承認・リンク発行・報酬支払いまで完結**できる。
- **トレードオフ**: 「DM で送る招待リンク」は **Whop のアフィリエイト申し込みページ**にすると、FirstPromoter は不要になるが、**登録者リスト・ランキング・ref の管理**は Whop 側のみになる。X DM 送信済み @handle と「誰が Whop でアフィリエイト登録したか」の突き合わせは、Whop API で取れるか要確認。
- **使い分けの目安**:
  - **FirstPromoter を選ぶ**: DM で送る「招待リンク」で FirstPromoter に登録させ、ref 付きで Whop に誘導し、報酬計算まで FirstPromoter に任せたい場合。招待→ref→売上紐付けを一つのツールで揃えたい場合。
  - **Whop ネイティブに寄せる**: 実装を減らしたい・Whop 一本で完結させたい場合。その場合は DM には「Whop のアフィリエイトプログラムページ」URL を入れ、Whop 上で申し込み・リンク取得・報酬を受けてもらう形になる。

### 6.5 推奨

現状の「X DM スカウト → FirstPromoter 招待 → Whop 販売」という**フローを変えずに進めるなら、FirstPromoter は妥当な選択**。そのうえで、§5 の「あと詰め」を実装し、**ref_id の受け渡し**と**Whop Webhook からの track/sale** を確実に動かす。将来的に「Whop だけでいい」と判断したら、DM のリンクを Whop アフィリエイトページに差し替え、FirstPromoter をやめる選択もあり得る。

---

## 7. X → Whop のみが一番合理的か

**なぜ FirstPromoter との比較になるか**: X → Whop のみにすると、アフィリエイターは **Whop への登録（またはログイン）が必須**になる（§8.5 参照）。この「Whop に登録する手間」を減らしたい・プロモーターに自前のポータルで参加させたい、という観点から [FirstPromoter](https://firstpromoter.com/)（サブスク向けアフィリエイトツール）との比較が生じている。

### 7.1 結論

**「システム数・実装コスト・運用の単純さ」だけを比べると、X → Whop の 2 点で完結させる方が合理的**である。

| 比較軸 | X → FirstPromoter → Whop | X → Whop のみ |
|--------|---------------------------|----------------|
| **関わるシステム** | X / FirstPromoter / Whop（3） | X / Whop（2） |
| **当方で実装する連携** | Whop Webhook → track/sale、FirstPromoter Webhook 受信、ref_id 受け渡し設計 | DM に Whop アフィリエイトページ URL を入れるだけ（既存 DM 送信のみ） |
| **報酬計算・ペイアウト** | FirstPromoter で計算し、支払いは別途（Whop か FirstPromoter か要決定） | Whop が計算・即時ペイアウト・dispute まで一括 |
| **登録者リスト** | FirstPromoter または自前 DB | Whop ダッシュボード |
| **「DM 送った @handle」と「登録した人」の突き合わせ** | Webhook + DB で可能（実装要） | Whop 側に email 等があれば、手動 or API で突き合わせ可能か要確認 |

### 7.2 X → Whop のみにするときのフロー

1. **DM 本文**: FirstPromoter 招待 URL の代わりに **Whop のアフィリエイトプログラム／パートナー申し込みページ**の URL を記載する。ページの場所は **§8** 参照。
2. **候補**: クリック → Whop 上でアフィリエイト申請・承認 → Whop がリンク発行 → そのリンクで Trap Defence を紹介 → 成約分の報酬を Whop が計算・ペイアウト。
3. **当方**: X DM 送信（既存実装）＋必要なら「送信先 @handle」のログのみ。Whop 向けの track/sale や FirstPromoter Webhook は**不要**。

### 7.3 FirstPromoter をあえて使う理由がはっきりしている場合

次のどれかに当てはまるなら、X → FirstPromoter → Whop の 3 点構成にも意味がある。

- **アフィリエイターに Whop 登録の手間をかけたくない**: FirstPromoter なら、プロモーターは **FirstPromoter のサインアップ／ポータル**（自ドメイン可）で登録し、リファラルリンク・クーポンを取得できる。Whop アカウントは不要。Whop のみの場合は「まず Whop で登録 → マーケットプレイスで当プログラムを探して参加」という手順が発生する（§8.5）。
- **Whop 以外にも紹介販売したい**: 同じプロモーターに別商品・別プラットフォームの紹介もさせたい場合、FirstPromoter で一元管理した方がよい。
- **「登録したがまだ 1 件も紹介していない」を細かく見たい**: FirstPromoter はリード・登録・売上を分けて追える。Whop だけだと「アフィリエイト登録者」と「成約」の 2 段階になり、その間のクリック等は Whop 次第。
- **既に FirstPromoter で運用中**: 他プロダクトで FirstPromoter を使っており、Trap Defence も同じダッシュボードでまとめたい場合。

そうした要件が**とくにない**なら、**まずは X → Whop のみで立ち上げ、必要になったら FirstPromoter を足す**のが無難である。

### 7.4 推奨の更新

- **迷ったら X → Whop のみを採用する**のが合理的。DM のリンクを Whop アフィリエイトページにし、FirstPromoter は使わない。
- FirstPromoter を入れるのは、**Whop 以外の紹介・細かいリード管理・既存 FirstPromoter 資産の活用**など、理由がはっきりしているときでよい。

---

## 8. Whop のアフィリエイトプログラムページはどこか

### 8.1 一般向け（誰でも「アフィリエイトになる」入口）

| URL | 用途 |
|-----|------|
| **https://whop.com/affiliates/** | Whop のアフィリエイト用ランディング。「アカウント作成 or ログインして whop を発見し収益化」がコンセプト。**DM に載せる「申し込みページ」としてはここ**。 |
| https://whop.com/affiliates/partners/ | パートナー向け（紹介・収益の確認用）。 |
| https://whop.com/discover/whop-for-beginners/whop-for-affiliates/ | 初心者向け「Whop For Affiliates」説明。 |

※ プロジェクトの `config/affiliateScoutConfig.js` では `getWhopAffiliateProgramUrl()` のデフォルトが **https://whop.com/affiliate**（末尾に s なし）。Whop の公式は **/affiliates/** なので、**DM で X → Whop のみにする場合は `WHOP_AFFILIATE_PROGRAM_URL=https://whop.com/affiliates` にしておく**とよい。

### 8.2 商品（Trap Defence）ごとの「この商品のアフィリエイトになる」リンク

- **グローバルなアフィリエイトマーケット**: https://whop.com/affiliates/ にアクセス → ログイン or 登録 → 一覧から Trap Defence を探して「Become affiliate」。
- **Custom affiliate（招待制）**: ストア側が Whop ダッシュボードの **Marketing → Affiliates → Invite affiliate** から、メール or Whop ユーザー名で招待する。招待された側はメールのリンクから「Customer Affiliates」ページで紹介リンクを取得。**公開の「申し込みページ」はなく、招待のみ**。
- 商品ページに「この商品のアフィリエイトになる」ボタンが付いているかは、Whop の商品ページ設定次第。Trap Defence の Whop 商品ページを開き、アフィリエイト用 CTA の有無を確認するとよい。

### 8.3 重要な2系統のページ（区別のため明記）

Whop には**プラットフォーム紹介**と**商品アフィリエイト**の2系統があり、DM スカウトで誘導するのは後者のみ。

| 系統 | 代表ページ | 内容・URL 例 |
|------|------------|----------------|
| **プラットフォーム紹介** | **Become a Whop partner** | Whop 自体に新規ユーザーを紹介。リンク例 `whop.com/?a=trapdefence`。紹介先が Whop で収益を生む限り「50年間」報酬。**Apply to be a partner** で申請。 |
| **同上** | **Whop Partners**（コミュニティ） | 「Make Money Bringing People to Whop」など、プラットフォーム紹介用のトレーニング・サポート・ウェイトリスト。Whop に人を呼び込む側のリソース。 |
| **商品アフィリエイト** | **https://whop.com/affiliates/**（ダッシュボード／バイヤーを紹介） | ログイン後の「バイヤーを紹介」→ マーケットプレイスで CryptoTrade Academy 等を検索して参加。**Trap Defence の成約報酬**が目的ならこちらを案内する。 |

DM 文案では **Become a Whop partner / Whop Partners の URL は載せない**。載せるのは **https://whop.com/affiliates**（バイヤーを紹介＝商品アフィリエイトの入口）のみ。

### 8.4 画面構成の整理（スクショ参照）

Whop の Affiliates ページ（https://whop.com/affiliates/）は次の構成になっている。

| タブ・エリア | 内容 |
|--------------|------|
| **ダッシュボード** | 純コミッション・返金/紛争・紹介ユーザー数・収益などの KPI。期間フィルタ・「マーケットプレイスを閲覧」CTA。 |
| **バイヤーを紹介** | **ホットオファー**（注目プログラム一覧）、**自分のアフィリエイトプログラム**（参加中のプログラムとクリック/コンバージョン/収益）、**保留中の申請**。上部に「アフィリエイトマーケットプレイス」「パートナーになるために申請する」ボタン。 |
| **アフィリエイトマーケットプレイス** | 業界フィルタ・検索付きの一覧。会社概要・業種・コミッション率・アフィリエイト収益・コンバージョン・クリックあたり収益・CVR。**CryptoTrade Academy はここで検索して参加できる**（「自分のアフィリエイトプログラム」に既に表示されている＝当方のプログラムがマーケットプレイスに掲載済み）。 |
| **パートナーになるために申請する** | **Whop プラットフォーム自体**の紹介プログラム。リンク例は `whop.com/?a=trapdefence`。新規ユーザーが Whop に登録し、そのユーザーが Whop で収益を生むと「今後50年間」紹介者に報酬が入る仕組み。 |

**DM スカウトで誘導したい対象**: Trap Defence（CryptoTrade Academy）の**商品紹介アフィリエイト**なので、候補には **バイヤーを紹介** の入口（＝ https://whop.com/affiliates に飛ばし、ログイン後にマーケットプレイスで「CryptoTrade Academy」を検索して「Become affiliate」または「資産を表示」でリンク取得）を案内する。「パートナーになるために申請する」は Whop 本体の紹介用なので、商品単体の報酬が欲しいアフィリエイター向けには **マーケットプレイス／バイヤーを紹介** 側の URL でよい。

### 8.5 DM に載せる URL の推奨（X → Whop のみの場合）

- **汎用**: `https://whop.com/affiliates`（必要なら `?lang=ja` 等を付与。Whop が言語パラメータを解釈するかは要確認）。ここから「バイヤーを紹介」→ マーケットプレイスで CryptoTrade Academy を探してもらう。
- **環境変数**: `WHOP_AFFILIATE_PROGRAM_URL=https://whop.com/affiliates` を設定し、`getWhopAffiliateProgramUrl(lang)` を DM 文案で参照する。
- Whop が「CryptoTrade Academy のプログラム専用ランディング」URL を発行している場合は、その URL を DM に載せるとより直行できる（ダッシュボードまたは Whop ヘルプで確認推奨）。
- **アフィリエイター側の手間**: 商品アフィリエイトに参加するには **Whop への登録（またはログイン）が必須**。DM から申し込み完了までに「Whop アカウント作成 → マーケットプレイスでプログラム検索 → 参加」というステップが入るため、離脱要因として考慮し、DM 文案で「まず Whop で無料登録」を短く案内するなどの工夫があるとよい。

---

*FirstPromoter の表記は FirstPromoter に統一。Whop は Webhook を前提とし、Whop API は補助用途（プロモコード一覧等）とする。§8.3・§8.4 は共有いただいた Whop Affiliates／Become a Whop partner／Whop Partners の画面に基づく。*
