# FirstPromoter のメリットと類似ツールとの比較分析

サブスクリプション／Whop 販売を前提に、[FirstPromoter](https://firstpromoter.com/) を利用するメリットと、Rewardful・Tapfiliate・LeadDyno・PartnerStack・Whop ネイティブなど類似ツールとの比較を整理する。連携方針の詳細は **[INTEGRATION_WHOP_X_FIRSTPROMOTER.md](./INTEGRATION_WHOP_X_FIRSTPROMOTER.md)** を参照。

---

## 重要な選定軸（優先するなら）

ツール選びでは、次の **2 つを特に重視** するとよい。

| 軸 | 意味 | 選定への影響 |
|----|------|----------------|
| **アフィリエイターの手軽さ** | 候補が「申し込み → リンク取得」までどれだけ少ないステップで済むか。Whop 未登録でも参加できるか、自ドメインのポータルで完結するか。 | 手軽さを最優先するなら FirstPromoter の招待→ポータルで完結する形が有利。Whop のみだと「Whop 登録 → マーケットプレイスでプログラム検索」の手間が発生する。 |
| **Whop 連携の親和性** | 販売・決済が Whop で完結している前提で、紹介元の紐付け・報酬計算をどこまでスムーズにできるか。ネイティブ連携があるか、API/Webhook で補完しやすいか。 | Whop は公式のアフィリエイト外部連携 API がないため、「親和性」は「Whop Webhook を自前で受け、track/sale 等で渡せるツール」との相性になる。FirstPromoter の Track API はその形と合う。Whop ネイティブなら連携実装は不要だが、アフィリエイターは Whop 登録が必須。 |

両立はトレードオフになる: **アフィリエイターの手軽さ** を取るなら FirstPromoter 経由、**実装・運用のシンプルさ** を取るなら Whop のみ。どちらを優先するかで FirstPromoter 採用の有無が決まる。

---

## 1. FirstPromoter を利用するメリット

### 1.1 一般的なメリット（公式・事例に基づく）

FirstPromoter は「サブスク向けアフィリエイト・紹介プログラム」に特化した SaaS。7 年以上の実績があり、月 $30M+ の売上トラッキング、2,000+ 顧客、7,000+ プログラムが稼働している（[FirstPromoter 公式](https://firstpromoter.com/)）。

| メリット | 内容 |
|----------|------|
| **サブスク前提の設計** | 継続課金・アップグレード・解約・返金を自動で反映。リカーリングコミッションと同期し、手動承認不要。 |
| **リッチなレポート** | 18 以上の指標でレポート。トライアル中・有料・解約した紹介ユーザーを分けて把握できる。 |
| **プロモーター用ポータル** | ブランド化可能なアフィリエイトダッシュボード。自ドメイン・カスタム CSS/JS 対応。紹介リンク・クーポン・報酬をプロモーターが自分で確認できる。 |
| **メール自動化** | ブロードキャスト・トリガー型メールを FirstPromoter 内で送信可能。別ツールがなくてもオンボーディングやリマインドができる。 |
| **不正検知** | セルフリファラル・広告経由トラフィックの検知。報酬は請求プロバイダ（Stripe 等）で購入確定後にのみ付与する設計。 |
| **Stripe 連携** | Stripe と連携すれば売上・返金・アップグレード等を自動取得可能。スクリプト不要のクイックセットアップも提供（Whop 経由の場合は当方で Webhook → track/sale が必要）。 |
| **API・Webhook** | 招待・売上登録・Promoter Accepted 等を API/Webhook で扱える。自前バックエンドとの連携に適する。 |
| **料金体系** | アフィリエイト収益ベースの段階料金。Starter $49/月（〜$5,000/月）、Business $99/月（〜$15,000/月）、Enterprise $149/月〜。14 日無料トライアル・クレカ不要。 |

### 1.2 当プロジェクト（X DM スカウト → Whop 販売）におけるメリット

| メリット | 内容 |
|----------|------|
| **DM から登録まで一本化** | DM に FirstPromoter の招待 URL を載せるだけで、クリック→サインアップ→ref 付きリンク取得まで FirstPromoter 上で完結。Whop アカウントがなくてもプロモーターになれる（Whop のみの場合は「Whop 登録 → マーケットプレイスでプログラム検索」の手間が発生）。 |
| **Track API との相性** | Whop は「誰の紹介か」を外部に渡す公式 API がないため、当方で Whop Webhook 受信 → FirstPromoter の `track/sale` を叩く形になる。FirstPromoter はこの「自前で売上を渡す」運用を API でサポートしている。 |
| **ref_id / promo_code** | 紹介リンクの `ref_id` やプロモーター別クーポンで紐付け可能。Whop の checkout metadata / referrer に ref を載せる設計と組み合わせられる。 |
| **X と Whop の仲介** | X API と FirstPromoter は直接連携しないが、当方バックエンドが「DM に招待 URL」「Webhook で Promoter Accepted 受信」を繋ぐことで、DM 送信先 @handle とプロモーター登録の突き合わせが可能。 |
| **複数プラットフォームを将来まとめる** | Whop 以外に同じプロモーターで別商品・別決済を紹介させたい場合、FirstPromoter で一元管理しやすい。 |

### 1.3 デメリット・注意点（当プロジェクト観点）

- **Whop ネイティブ連携なし**: Stripe/Paddle/Chargebee 等の公式連携はあるが、Whop はない。**Whop Webhook → 自前で track/sale** の実装が必須（[INTEGRATION_WHOP_X_FIRSTPROMOTER.md](./INTEGRATION_WHOP_X_FIRSTPROMOTER.md) §2 参照）。
- **二重管理の可能性**: Whop にも Custom Affiliates・Revenue Share がある。FirstPromoter で報酬計算し、支払いを Whop でするか FirstPromoter でするかを決める必要がある。
- **UI・カスタマイズ**: 他ツールと比べ「UI が古い」という声はある。FirstPromoter 2.0 で UI 刷新が行われている（[FirstPromoter 公式](https://firstpromoter.com/)）。

---

## 2. 類似ツールとの比較

### 2.1 比較表（概要）

| ツール | 主な対象 | 料金目安 | 特徴（要約） |
|--------|----------|----------|-----------------------------|
| **FirstPromoter** | サブスク・SaaS | $49〜$149/月（収益ベース） | 18+ 指標、メール自動化、不正検知、API/Webhook、自ドメインポータル。Stripe/Paddle/Chargebee 等と連携。Whop は自前連携が必要。 |
| **Rewardful** | SaaS・スタートアップ | $49〜$149/月 | セットアップが簡単（5〜15 分）、Stripe/Paddle 連携が強み。レポートはシンプル。メール自動化は外部連携。 |
| **Tapfiliate** | B2B/B2C 広く | 高めの価格帯 | 多機能・カスタマイズ性が高い。SaaS 以外にも対応。学習コスト・コストとも高め。 |
| **LeadDyno** | 複数業種 | - | 汎用だが UI が古いとの評価。返金の自動追跡・アフィリエイト別複数クーポンに弱い。 |
| **PartnerStack** | 大規模・エンタープライズ | $500/月〜 | パートナー・マーケットプレイス、大規模向け。Ghost/HighLevel 等の連携は FirstPromoter の方が充実しているとの比較あり。 |
| **Whop ネイティブ** | Whop で販売している事業者 | プラットフォームに含まれる | 25,000+ アフィリエイト、即時ペイアウト、dispute 管理。アフィリエイターは Whop 登録が必須。 |

※ 料金・機能は公式発表・比較記事（[FirstPromoter 比較ブログ](https://firstpromoter.com/blog/comparing-top-affiliate-tracking-solutions-firstpromoter-vs-rewardful-vs-partnerstack-vs-leaddyno)、[Rewardful 比較](https://www.rewardful.com/articles/rewardful-vs-firstpromoter)等）に基づく。最新は各社サイトで確認すること。

### 2.2 FirstPromoter vs Rewardful

| 観点 | FirstPromoter | Rewardful |
|------|----------------|-----------|
| **セットアップ** | ステップ設定で柔軟。API/Webhook で自前連携しやすい。 | 5〜15 分でセットアップ可能。Stripe/Paddle に最適化。 |
| **レポート** | 18+ 指標、詳細なレポート。 | シンプル・リアルタイム中心。 |
| **メール** | 内蔵（ブロードキャスト・トリガー）。 | 外部連携（メールツール連携）。 |
| **カスタマイズ** | ポータルのカスタム CSS/JS、自ドメイン。 | シンプルなカスタマイズ。 |
| **サポート** | メール・チャット。 | 24/7 ライブチャット・メール・ビデオ。 |

**目安**: 初心者・とにかく早く始めたい → Rewardful。成長段階で指標・メール・自前連携を重視 → FirstPromoter。

### 2.3 FirstPromoter vs Tapfiliate

- **Tapfiliate**: 業種を問わず多機能（A/B テスト、サブ ID、多通貨など）。カスタマイズ性が高く、その分コスト・学習コストも高め。
- **FirstPromoter**: サブスク・SaaS に特化。必要な機能が揃い、比較的シンプル。Whop のような「公式連携のない決済」には Track API で自前連携する形が合う。

### 2.4 FirstPromoter vs LeadDyno / PartnerStack

- **LeadDyno**: 汎用だが、返金の自動追跡・アフィリエイト別複数クーポンに弱く、UI が古いとの評価。サブスク特化で細かく管理したい場合は FirstPromoter の方が向く。
- **PartnerStack**: 大規模パートナー・マーケットプレイス向け。$500/月〜。小〜中規模の「X DM スカウト → 招待 → Whop 販売」には過剰になりがち。

### 2.5 FirstPromoter vs Whop ネイティブ

| 観点 | FirstPromoter | Whop ネイティブ |
|------|----------------|------------------|
| **アフィリエイター登録** | 自前ポータル（自ドメイン可）。Whop アカウント不要。 | Whop への登録・ログインが必須。マーケットプレイスでプログラムを探して参加。 |
| **システム数** | X + FirstPromoter + Whop（3）。Whop Webhook → track/sale の実装が必要。 | X + Whop（2）。DM に Whop アフィリエイト URL を載せるだけ。 |
| **報酬・ペイアウト** | FirstPromoter で計算。支払いは Whop か FirstPromoter か選択。 | Whop が計算・即時ペイアウト・dispute まで一括。 |
| **リード・クリックの可視性** | リード・登録・売上を分けて追える。 | アフィリエイト登録と成約の 2 段階が中心。その間のクリック等は Whop 次第。 |

詳細は [INTEGRATION_WHOP_X_FIRSTPROMOTER.md](./INTEGRATION_WHOP_X_FIRSTPROMOTER.md) の §6・§7・§8 を参照。

---

## 3. 選定の目安（当プロジェクト向け）

**上記の 2 軸（アフィリエイターの手軽さ・Whop 連携の親和性）を優先するなら**、FirstPromoter 経由が有利になりやすい。逆に「実装を増やしたくない」を最優先するなら Whop のみでよい。

- **FirstPromoter を選ぶとよい場合**
  - アフィリエイターに **Whop 登録の手間をかけたくない**（自前ポータルで参加させたい）。
  - **DM から登録・ref 取得までを一ツールで揃えたい**。
  - **Whop 以外の商品・決済**も同じプロモーターで紹介させたい、または **リード・登録・売上を細かく見たい**。
  - 既に他プロダクトで FirstPromoter を使っており、Trap Defence も同じダッシュボードでまとめたい。

- **X → Whop のみ（FirstPromoter を使わない）がよい場合**
  - **実装・運用をできるだけシンプルにしたい**（Whop Webhook → track/sale を書きたくない）。
  - 報酬計算・ペイアウト・dispute を **Whop に一任したい**。
  - 上記の「FirstPromoter を選ぶ理由」がとくに当てはまらない。

- **Rewardful を検討する場合**
  - 決済が **Stripe または Paddle のみ**で、FirstPromoter の「自前で売上を渡す」連携が不要な場合。Whop 経由の場合は FirstPromoter と同様に自前で track/sale が必要になるため、Whop 非対応という点は同じ。

- **Tapfiliate / PartnerStack**
  - 多業種・大規模パートナー・マーケットプレイスが必要な場合。当プロジェクトの現状スコープでは FirstPromoter または Whop ネイティブの方が適している。

---

## 4. 参照リンク

### 4.1 FirstPromoter

- [FirstPromoter 公式](https://firstpromoter.com/) — 機能・料金・事例
- [FirstPromoter Pricing](https://firstpromoter.com/pricing) — プラン詳細
- [Billing API（サポート外決済）](https://docs.firstpromoter.com/integrations/billing/api) — Webhook 受信 → track/sale の公式パターン
- [Tracking API: Sales](https://docs.firstpromoter.com/api-reference-v1/tracking-api/sales) — track/sale のパラメータ（event_id, ref_id, promo_code, 204 の意味）
- [FirstPromoter 比較ブログ（Rewardful, PartnerStack, LeadDyno）](https://firstpromoter.com/blog/comparing-top-affiliate-tracking-solutions-firstpromoter-vs-rewardful-vs-partnerstack-vs-leaddyno)
- [Rewardful vs FirstPromoter](https://www.rewardful.com/articles/rewardful-vs-firstpromoter)

### 4.2 Whop

- [Whop Webhooks](https://docs.whop.com/developer/guides/webhooks) — Company Webhook、payment.succeeded / membership.activated、署名検証（Standard Webhooks）
- [Whop API Reference](https://docs.whop.com/api-reference/) — 各イベントのペイロード

### 4.3 当プロジェクト

- **FirstPromoter–Whop 連携の公式リファレンス・ベストプラクティス**: [INTEGRATION_WHOP_X_FIRSTPROMOTER.md](./INTEGRATION_WHOP_X_FIRSTPROMOTER.md) の **§2.6** に、FirstPromoter の「サポート外決済」用 API パターンと Whop Webhook を組み合わせる運用の根拠を記載。**「FirstPromoter + Whop」の公式事例はないが、両者の公式ドキュメントから同じベストプラクティスを参照できる**。
