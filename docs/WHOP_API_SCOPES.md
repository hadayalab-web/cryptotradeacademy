# Whop API スコープ一覧

このドキュメントは、Whop APIで利用可能なすべてのスコープ（権限）をカテゴリ別に整理したものです。COO（Cursor/Composer）が実装時に参照しやすいように構成しています。

## 📋 目次

- [Products（製品）](#products製品)
- [Ad Campaigns（広告キャンペーン）](#ad-campaigns広告キャンペーン)
- [Affiliates（アフィリエイト）](#affiliatesアフィリエイト)
- [Authorization & Roles（認証・ロール）](#authorization--roles認証ロール)
- [Chat（チャット）](#chatチャット)
- [Forum（フォーラム）](#forumフォーラム)
- [Team Members（チームメンバー）](#team-membersチームメンバー)
- [Company & Business（会社・ビジネス）](#company--business会社ビジネス)
- [Content Rewards（コンテンツ報酬）](#content-rewardsコンテンツ報酬)
- [Developer & Apps（開発者・アプリ）](#developer--apps開発者アプリ)
- [IAP（アプリ内課金）](#iapアプリ内課金)
- [Livestreams（ライブストリーム）](#livestreamsライブストリーム)
- [Members & Memberships（メンバー・メンバーシップ）](#members--membershipsメンバーメンバーシップ)
- [Payments（支払い）](#payments支払い)
- [Payouts（支払い先）](#payouts支払い先)
- [Plans（プラン）](#plansプラン)
- [Waitlist（ウェイトリスト）](#waitlistウェイトリスト)
- [Promo Codes（プロモコード）](#promo-codesプロモコード)
- [Statistics（統計）](#statistics統計)
- [Support（サポート）](#supportサポート)
- [Tracking Links（トラッキングリンク）](#tracking-linksトラッキングリンク)
- [Courses（コース）](#coursesコース)
- [Leads（リード）](#leadsリード)
- [Invoices（インボイス）](#invoicesインボイス)
- [Webhooks（ウェブフック）](#webhooksウェブフック)
- [Shipments（出荷）](#shipments出荷)
- [Checkout（チェックアウト）](#checkoutチェックアウト)
- [Airdrop Links（エアドロップリンク）](#airdrop-linksエアドロップリンク)
- [Notifications（通知）](#notifications通知)

---

## Products（製品）

| スコープ | 説明 | 用途 |
|---------|------|------|
| `Export products` | 製品データのエクスポート | バックアップ、分析 |
| `Read products` | 製品情報の読み取り | 製品一覧、詳細取得 |
| `Manage product control center settings` | 製品コントロールセンター設定の管理 | 設定変更 |
| `Create products` | 製品の作成 | 新規製品追加 |
| `Delete products` | 製品の削除 | 製品削除 |
| `Export product statistics` | 製品統計のエクスポート | 統計データのエクスポート |
| `Read product statistics` | 製品統計の読み取り | 統計データの表示 |
| `Update products` | 製品情報の更新 | 製品情報の編集 |

## Ad Campaigns（広告キャンペーン）

| スコープ | 説明 | 用途 |
|---------|------|------|
| `ad_campaign:conversion:create` | 広告キャンペーンのコンバージョン作成 | コンバージョン記録 |
| `ad_campaign:create` | 広告キャンペーンの作成 | 新規キャンペーン作成 |
| `ad_campaign:credit:create` | 広告キャンペーンのクレジット作成 | クレジット付与 |
| `ad_campaign:read` | 広告キャンペーンの読み取り | キャンペーン情報取得 |
| `ad_campaign:update` | 広告キャンペーンの更新 | キャンペーン設定変更 |

## Affiliates（アフィリエイト）

| スコープ | 説明 | 用途 |
|---------|------|------|
| `Read affiliates` | アフィリエイト情報の読み取り | アフィリエイト一覧、詳細 |
| `Create affiliates` | アフィリエイトの作成 | 新規アフィリエイト追加 |
| `Update affiliates` | アフィリエイト情報の更新 | アフィリエイト設定変更 |
| `ad_publisher:read` | 広告パブリッシャー情報の読み取り | パブリッシャー情報取得 |

## Authorization & Roles（認証・ロール）

| スコープ | 説明 | 用途 |
|---------|------|------|
| `authorized_role:create` | 認証済みロールの作成 | ロール追加 |
| `Read app permissions` | アプリ権限の読み取り | 権限確認 |

## Chat（チャット）

| スコープ | 説明 | 用途 |
|---------|------|------|
| `Manage chat webhooks` | チャットウェブフックの管理 | ウェブフック設定 |
| `Moderate chats` | チャットのモデレート | チャット管理 |
| `Read chat messages` | チャットメッセージの読み取り | メッセージ取得 |
| `Read chats` | チャットの読み取り | チャット一覧取得 |

## Forum（フォーラム）

| スコープ | 説明 | 用途 |
|---------|------|------|
| `Create forum posts` | フォーラム投稿の作成 | 新規投稿 |
| `Read forum posts` | フォーラム投稿の読み取り | 投稿一覧、詳細 |
| `Moderate forum posts` | フォーラム投稿のモデレート | 投稿管理 |

## Team Members（チームメンバー）

| スコープ | 説明 | 用途 |
|---------|------|------|
| `Read team members` | チームメンバー情報の読み取り | メンバー一覧 |
| `Read team member emails` | チームメンバーのメールアドレス読み取り | メール取得 |

## Company & Business（会社・ビジネス）

| スコープ | 説明 | 用途 |
|---------|------|------|
| `Read company balance` | 会社残高の読み取り | 残高確認 |
| `Read logs` | ログの読み取り | ログ確認 |
| `Manage checkout settings` | チェックアウト設定の管理 | 決済設定 |
| `Manage legal settings` | 法的設定の管理 | 法的情報管理 |
| `Read business information` | ビジネス情報の読み取り | 会社情報取得 |
| `Update business details` | ビジネス詳細の更新 | 会社情報更新 |
| `company:create_child` | 子会社の作成 | 子会社追加 |
| `company:delete_child` | 子会社の削除 | 子会社削除 |
| `company:update_child_fees` | 子会社手数料の更新 | 手数料設定 |
| `child_company:basic:export` | 子会社基本データのエクスポート | データエクスポート |
| `Update social links` | ソーシャルリンクの更新 | SNSリンク更新 |
| `custom_emoji:update` | カスタム絵文字の更新 | 絵文字管理 |

## Content Rewards（コンテンツ報酬）

| スコープ | 説明 | 用途 |
|---------|------|------|
| `Export content rewards` | コンテンツ報酬のエクスポート | データエクスポート |
| `Read content rewards` | コンテンツ報酬の読み取り | 報酬一覧、詳細 |
| `Create content rewards` | コンテンツ報酬の作成 | 新規報酬設定 |
| `Delete content rewards` | コンテンツ報酬の削除 | 報酬削除 |
| `Moderate content reward submissions` | コンテンツ報酬提出のモデレート | 提出物管理 |
| `Update content rewards` | コンテンツ報酬の更新 | 報酬設定変更 |

## Developer & Apps（開発者・アプリ）

| スコープ | 説明 | 用途 |
|---------|------|------|
| `Read developer settings` | 開発者設定の読み取り | 設定確認 |
| `Create apps` | アプリの作成 | 新規アプリ作成 |
| `Manage OAuth settings` | OAuth設定の管理 | OAuth設定 |
| `Manage webhooks` | ウェブフックの管理 | ウェブフック設定 |
| `Manage app builds` | アプリビルドの管理 | ビルド管理 |
| `Update apps` | アプリの更新 | アプリ設定変更 |
| `Attach apps to products` | アプリを製品にアタッチ | アプリ連携 |
| `Delete apps` | アプリの削除 | アプリ削除 |
| `Detach apps from products` | アプリを製品からデタッチ | アプリ連携解除 |
| `Read hidden apps` | 非表示アプリの読み取り | 非表示アプリ確認 |
| `Update apps` | アプリの更新（重複） | アプリ設定変更 |

## IAP（アプリ内課金）

| スコープ | 説明 | 用途 |
|---------|------|------|
| `iap:read` | アプリ内課金情報の読み取り | IAP情報取得 |

## Livestreams（ライブストリーム）

| スコープ | 説明 | 用途 |
|---------|------|------|
| `Create livestreams` | ライブストリームの作成 | 新規配信作成 |
| `Delete livestreams` | ライブストリームの削除 | 配信削除 |
| `Manage livestream recordings` | ライブストリーム録画の管理 | 録画管理 |
| `Read livestream chat` | ライブストリームチャットの読み取り | チャット取得 |
| `Moderate livestreams` | ライブストリームのモデレート | 配信管理 |

## Members & Memberships（メンバー・メンバーシップ）

| スコープ | 説明 | 用途 |
|---------|------|------|
| `Export members` | メンバーデータのエクスポート | データエクスポート |
| `Read members` | メンバー情報の読み取り | メンバー一覧、詳細 |
| `Read member emails` | メンバーのメールアドレス読み取り | メール取得 |
| `Read member phone numbers` | メンバーの電話番号読み取り | 電話番号取得 |
| `Read member payment methods` | メンバーの支払い方法読み取り | 支払い方法取得 |
| `Manage members` | メンバーの管理 | メンバー管理 |
| `Update memberships` | メンバーシップの更新 | メンバーシップ設定変更 |
| `Moderate members` | メンバーのモデレート | メンバー管理 |
| `Export member statistics` | メンバー統計のエクスポート | 統計データエクスポート |
| `Read member statistics` | メンバー統計の読み取り | 統計データ表示 |

**現在の実装で使用中:**
- `Read members` - `services/lead-discovery/leadDiscoveryReport.js` の `getWhopStats()` で使用
- `Read memberships` - `services/whop/client.js` の `listMemberships()` で使用

## Payments（支払い）

| スコープ | 説明 | 用途 |
|---------|------|------|
| `Export payments` | 支払いデータのエクスポート | データエクスポート |
| `Read payments` | 支払い情報の読み取り | 支払い一覧、詳細 |
| `payment:charge` | 支払いのチャージ | 手動チャージ |
| `payment:dispute` | 支払いの異議申し立て | 異議処理 |
| `Export disputes` | 異議申し立てデータのエクスポート | データエクスポート |
| `Read disputes` | 異議申し立て情報の読み取り | 異議一覧、詳細 |
| `payment:setup_intent:read` | セットアップインテントの読み取り | 支払い設定確認 |
| `Manage payments` | 支払いの管理 | 支払い管理 |
| `payment:resolution_center` | 解決センターへのアクセス | 解決センター管理 |
| `Export resolution center cases` | 解決センターケースのエクスポート | データエクスポート |
| `Read resolution center cases` | 解決センターケースの読み取り | ケース一覧、詳細 |

## Payouts（支払い先）

| スコープ | 説明 | 用途 |
|---------|------|------|
| `Create payout destinations` | 支払い先の作成 | 新規支払い先追加 |
| `Delete payout destinations` | 支払い先の削除 | 支払い先削除 |
| `Read payout destinations` | 支払い先情報の読み取り | 支払い先一覧、詳細 |
| `Transfer funds` | 資金の転送 | 資金移動 |
| `Read transfers` | 転送情報の読み取り | 転送履歴取得 |
| `payout:transfer:export` | 転送データのエクスポート | データエクスポート |
| `Update payout destinations` | 支払い先情報の更新 | 支払い先設定変更 |
| `Withdraw funds` | 資金の引き出し | 引き出し処理 |
| `Read withdrawals` | 引き出し情報の読み取り | 引き出し履歴取得 |
| `payout:withdrawal:export` | 引き出しデータのエクスポート | データエクスポート |
| `Read payout accounts` | 支払いアカウント情報の読み取り | アカウント情報取得 |
| `Update payout accounts` | 支払いアカウント情報の更新 | アカウント設定変更 |

## Plans（プラン）

| スコープ | 説明 | 用途 |
|---------|------|------|
| `Export plans` | プランデータのエクスポート | データエクスポート |
| `Read plans` | プラン情報の読み取り | プラン一覧、詳細 |
| `Create plans` | プランの作成 | 新規プラン作成 |
| `Delete plans` | プランの削除 | プラン削除 |
| `Export plan statistics` | プラン統計のエクスポート | 統計データエクスポート |
| `Read plan statistics` | プラン統計の読み取り | 統計データ表示 |
| `Update plans` | プラン情報の更新 | プラン設定変更 |

## Waitlist（ウェイトリスト）

| スコープ | 説明 | 用途 |
|---------|------|------|
| `Manage waitlist entries` | ウェイトリストエントリの管理 | エントリ管理 |
| `Export waitlist entries` | ウェイトリストエントリのエクスポート | データエクスポート |
| `Read waitlist entries` | ウェイトリストエントリの読み取り | エントリ一覧、詳細 |

## Promo Codes（プロモコード）

| スコープ | 説明 | 用途 |
|---------|------|------|
| `Export promo codes` | プロモコードデータのエクスポート | データエクスポート |
| `Read promo codes` | プロモコード情報の読み取り | プロモコード一覧、詳細 |
| `Create promo codes` | プロモコードの作成 | 新規プロモコード作成 |
| `Delete promo codes` | プロモコードの削除 | プロモコード削除 |
| `Update promo codes` | プロモコード情報の更新 | プロモコード設定変更 |

**現在の実装で使用中:**
- `Read promo codes` - `api/promo-stock-monitor.js` で使用

## Statistics（統計）

| スコープ | 説明 | 用途 |
|---------|------|------|
| `stats:read` | 統計情報の読み取り | 統計データ表示 |

## Support（サポート）

| スコープ | 説明 | 用途 |
|---------|------|------|
| `Read support chats` | サポートチャットの読み取り | チャット一覧、詳細 |
| `Create support chats` | サポートチャットの作成 | 新規チャット作成 |
| `Send messages in support chats` | サポートチャットへのメッセージ送信 | メッセージ送信 |

## Tracking Links（トラッキングリンク）

| スコープ | 説明 | 用途 |
|---------|------|------|
| `Export tracking links` | トラッキングリンクデータのエクスポート | データエクスポート |
| `Read tracking links` | トラッキングリンク情報の読み取り | リンク一覧、詳細 |
| `Create tracking links` | トラッキングリンクの作成 | 新規リンク作成 |
| `Delete tracking links` | トラッキングリンクの削除 | リンク削除 |
| `Export tracking link statistics` | トラッキングリンク統計のエクスポート | 統計データエクスポート |
| `Read tracking link statistics` | トラッキングリンク統計の読み取り | 統計データ表示 |
| `Update tracking links` | トラッキングリンク情報の更新 | リンク設定変更 |

## Courses（コース）

| スコープ | 説明 | 用途 |
|---------|------|------|
| `Read courses` | コース情報の読み取り | コース一覧、詳細 |
| `Update courses` | コース情報の更新 | コース設定変更 |
| `Read student-lesson interactions` | 学生-レッスンインタラクションの読み取り | 学習進捗取得 |
| `Read course analytics` | コース分析情報の読み取り | 分析データ表示 |

## Leads（リード）

| スコープ | 説明 | 用途 |
|---------|------|------|
| `Read leads` | リード情報の読み取り | リード一覧、詳細 |
| `Export leads` | リードデータのエクスポート | データエクスポート |
| `lead:manage` | リードの管理 | リード管理 |

## Invoices（インボイス）

| スコープ | 説明 | 用途 |
|---------|------|------|
| `Create invoices` | インボイスの作成 | 新規インボイス作成 |
| `Read invoices` | インボイス情報の読み取り | インボイス一覧、詳細 |
| `Export invoices` | インボイスデータのエクスポート | データエクスポート |
| `Update invoices` | インボイス情報の更新 | インボイス設定変更 |
| `Read changes to invoices` | インボイス変更履歴の読み取り | 変更履歴取得 |

## Webhooks（ウェブフック）

| スコープ | 説明 | 用途 |
|---------|------|------|
| `webhook_receive:setup_intents` | セットアップインテントのウェブフック受信 | ウェブフック処理 |
| `webhook_receive:withdrawals` | 引き出しのウェブフック受信 | ウェブフック処理 |
| `webhook_receive:payout_methods` | 支払い方法のウェブフック受信 | ウェブフック処理 |
| `webhook_receive:verifications` | 検証のウェブフック受信 | ウェブフック処理 |
| `Read changes to waitlist entries` | ウェイトリストエントリ変更の読み取り | 変更履歴取得 |
| `Read changes to courses` | コース変更の読み取り | 変更履歴取得 |
| `Read changes to memberships` | メンバーシップ変更の読み取り | 変更履歴取得 |
| `Read changes to payments` | 支払い変更の読み取り | 変更履歴取得 |
| `Read changes to refunds` | 返金変更の読み取り | 変更履歴取得 |
| `Read changes to disputes` | 異議申し立て変更の読み取り | 変更履歴取得 |
| `Read changes to resolution center cases` | 解決センターケース変更の読み取り | 変更履歴取得 |
| `Read changes to app payments` | アプリ支払い変更の読み取り | 変更履歴取得 |
| `Read changes to app memberships` | アプリメンバーシップ変更の読み取り | 変更履歴取得 |

## Shipments（出荷）

| スコープ | 説明 | 用途 |
|---------|------|------|
| `Create shipments` | 出荷の作成 | 新規出荷作成 |
| `Read shipments` | 出荷情報の読み取り | 出荷一覧、詳細 |

## Checkout（チェックアウト）

| スコープ | 説明 | 用途 |
|---------|------|------|
| `Read checkout configurations` | チェックアウト設定の読み取り | 設定確認 |
| `Create checkout configurations` | チェックアウト設定の作成 | 新規設定作成 |
| `Delete checkout configurations` | チェックアウト設定の削除 | 設定削除 |
| `Create checkout requests` | チェックアウトリクエストの作成 | リクエスト作成 |
| `Read checkout requests` | チェックアウトリクエストの読み取り | リクエスト一覧、詳細 |

## Airdrop Links（エアドロップリンク）

| スコープ | 説明 | 用途 |
|---------|------|------|
| `airdrop_link:basic:read` | エアドロップリンク基本情報の読み取り | リンク情報取得 |
| `airdrop_link:manage` | エアドロップリンクの管理 | リンク管理 |

## Notifications（通知）

| スコープ | 説明 | 用途 |
|---------|------|------|
| `notification:create` | 通知の作成 | 通知送信 |

---

## 📝 実装時の注意事項

### 環境変数の設定

Whop APIを使用するには、以下の環境変数を設定してください：

```bash
# .env ファイルまたはVercel環境変数に設定
WHOP_API_KEY=apik_6Ql14WHRU0Sje_C3791174_C_cb45d64f7f618e1c592233edf2cf04ba11ff7d7e5cede362db19089df8a7a6
```

**注意:** 
- 本番環境では、環境変数として設定することを強く推奨します
- APIキーをコードに直接記述しないでください
- Vercelの場合は、ダッシュボードの「Environment Variables」から設定してください

### 現在の実装で使用中のスコープ

1. **Members & Memberships**
   - `Read members` - リード発見レポートで使用
   - `Read memberships` - メンバーシップ一覧取得で使用

2. **Promo Codes**
   - `Read promo codes` - プロモコード在庫監視で使用

### スコープの確認方法

APIキーに必要なスコープが付与されているか確認するには、Whop APIのドキュメントまたはダッシュボードで確認してください。

### エンドポイントとの対応関係

各スコープは、特定のAPIエンドポイントへのアクセス権限を表します。実装時は、使用するエンドポイントに必要なスコープが付与されていることを確認してください。

---

## 🔗 関連ドキュメント

- `services/whop/client.js` - Whop APIクライアント実装
- `services/lead-discovery/leadDiscoveryReport.js` - リード発見レポート（Whop統計使用）
- `api/promo-stock-monitor.js` - プロモコード在庫監視

---

**最終更新:** 2026-01-18  
**管理:** COO (Cursor/Composer)
