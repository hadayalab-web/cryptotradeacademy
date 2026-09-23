# CTO技術的実装計画: CMO改善提案の実装

**作成日**: 2026-01-11T04:36:38.485Z  
**作成者**: GPT: CTO (gpt-5.2-2025-12-11)  
**依頼者**: COO: Cursor (Composer)  
**基づくレビュー**: CMOレビュー結果（`docs/CMO_REVIEW_RESULT_WHOP_ARCHITECTURE_PRINCIPLES.md`）

---

# CTO技術的実装計画: CMO改善提案の実装

## 📋 実装計画サマリー
Whop中心アーキテクチャは維持しつつ、**「計測・アトリビューション」「ライフサイクル自動化」「アフィリエイト活性化」**を外部補完レイヤーとして追加します。  
中核は以下の3点です。

1. **統一トラッキングID（`cid`）とUTM/affiliate_codeの厳密な引き継ぎ**（LP→Whop Checkout→Webhook→LTV）
2. **Whop Webhookを起点にしたイベント駆動（Retention/Engagement）**（メール/Telegram自動化）
3. **分析・可視化のためのデータ基盤**（イベントログ＋集計テーブル＋ダッシュボード）

---

## 🏗️ アーキテクチャ設計

### 1. データ計測とアトリビューションの原則（第4原則）
#### システムアーキテクチャ
- **LP（Next.js）**：GA4/Meta Pixel送信、`cid`発行、UTM保持、Whop Checkoutへ引き渡し
- **Tracking API（新規）**：`/t`（クリック/LPイベント受信）、`/whop/webhook`（Whopイベント受信）
- **Event Store（DB）**：生イベント（append-only）を保存
- **Attribution/LTV Service（バッチ/ストリーム）**：注文・継続課金・解約からLTVを算出し、流入元（広告/アフィリエイト/市場/AB）に紐付け
- **BI（Metabase等）**：可視化（アフィリエイト別LTV、広告セット別LTV、言語別CVR等）

#### データフロー設計（最小で壊れない設計）
1. **LP初回訪問**
   - `cid`（UUID v4）を生成し、`_cta_cid` cookie（90日）と`localStorage`に保存
   - URLの `utm_*` / `ref` / `affiliate_code` / `market` / `ab_variant` を正規化して保存
2. **Whop Checkout起動**
   - `affiliateCode` はWhop Checkoutに渡す（既存通り）
   - 追加で `redirectUrl` に **`cid` とUTM一式**を付与（Whop→Thanksに戻すため）
3. **Whop Webhook受信**
   - 注文/サブスク開始/更新/解約イベントを受け、`cid`（redirect経由で回収したもの）または `affiliate_code` をキーに紐付け
4. **LTV計算**
   - `customer_id`（Whop側のユーザーID相当）単位で売上イベントを積算
   - 初回流入の `cid` に紐づく `utm`/`affiliate_code`/`market`/`ab_variant` を「first-touch」または「last-touch」ルールで付与

#### 統合ポイントの定義
- **LP → Tracking API**：ページビュー/CTA/Checkout開始など（サーバーサイドでも受ける）
- **Whop → Webhook**：購入/更新/キャンセル（Whop Webhook設定）
- **Telegram/Email → Tracking API**：送信ログ・クリックログ（Retention施策の効果測定）

#### 技術スタック選定（推奨）
- Backend: **Node.js (TypeScript)**（既存と整合）
- DB: **PostgreSQL**（イベントログ＋集計に最適）
- Queue/Job: 小規模は **DB + cron**、拡張時に **BullMQ + Redis** へ
- BI: **Metabase**（最短で社内可視化） or **Looker Studio**（軽量）

---

### 2. リテンション・ナーチャリングの自動化
#### システムアーキテクチャ
- **Whop Webhook**をトリガに、ユーザー状態を`membership_state`としてDBに反映
- 状態遷移に応じて**Workflow Engine（新規）**がメール/Telegram送信を実行
- 送信は外部サービス：
  - Email: **Resend**（既にAPIキーあり）
  - Telegram: **各言語Bot Token**（既存envあり）

#### ワークフロー設計（イベント駆動＋スケジュール）
- イベント駆動（即時）
  - `membership_activated` → Welcome（Telegram参加誘導、FAQ、使い方）
  - `membership_canceled` → Winback（理由ヒアリング、再開導線）
  - `payment_failed`（取れるなら）→ 支払い更新案内
- スケジュール（毎日バッチ）
  - `renewal_in_7_days` → 更新リマインド＋価値再提示
  - `inactive_3_days`（任意：Telegramクリック/閲覧が取れれば）→ ナーチャリング
  - `renewed` → 称賛＋次のステップ（アップセル）

#### 外部機能（補完レイヤー）の実装方法
- `services/lifecycle/` を新設
  - `whopWebhookHandler.ts`：イベント正規化・冪等処理
  - `scheduler.ts`：期限系ジョブ生成
  - `sendEmail.ts` / `sendTelegram.ts`：チャネル別送信
  - `templates/`：多言語テンプレ（静的データ方針を踏襲）

#### 技術スタック選定
- Resend（メール）
- Telegram Bot API（送信）
- Postgres（状態・ジョブ・送信ログ）

---

### 3. アフィリエイター・コミュニティのエンゲージメント
#### システムアーキテクチャ
- **Affiliate Portal（新規Web）**：アフィリエイター向けダッシュボード
- **Affiliate Metrics Service**：
  - Whop APIで取れる範囲（アフィリエイター情報、リンク生成、チェックアウト生成）
  - 取れない「コミッション履歴」は当面は **推定指標**（クリック→購入→継続）で代替し、必要ならPuppeteerで補完取得（後述）
- **Praise/Notification System**：
  - Whop Webhook（購入）を受けて、該当affiliateに「称賛」通知（Telegram/Email）

#### ダッシュボード設計（MVP）
- ログイン：マジックリンク（Resend）＋affiliate_codeで紐付け（厳密化はPhase2）
- 表示項目：
  - 期間別：クリック数、Checkout開始、購入数、推定売上、推定LTV
  - 市場別・LP別・AB別のパフォーマンス
  - すぐ使える素材（リンク生成、UTM付きリンクコピー）
- 「次にやるべきこと」：成果が出ている市場の提案（簡易ルール）

#### Webhook統合設計
- `order.created`（等）→ `affiliate_code` をキーに集計更新
- しきい値で通知：
  - 初成約、当日5成約、LTV上位、連続成約など

#### 技術スタック選定
- Frontend: Next.js（既存LPと同系統で運用）
- Backend: 同Tracking APIに統合（`/affiliate/*`）
- DB: Postgres
- Optional: Puppeteerで「コミッション画面」取得（規約/運用リスクありなので後回し）

---

### 4. VSL（Video Sales Letter）のパーソナライズ
#### システムアーキテクチャ
- **VSL Asset Registry（DBまたは静的JSON）**：`market`×`variant`ごとに
  - HeyGen video_id / mp4 URL
  - サムネ
  - 背景/ジェスチャー/トーンのメタ情報
- **VSL Rendering Policy**：LPが `market` と `ab_variant` から最適VSLを選択

#### 動画生成パイプライン設計
- `scripts/vsl/generate.ts`（tsx）を追加し、HeyGen APIで生成→結果をレジストリへ登録
- 生成はCIではなく**手動/承認フロー**（ブランド毀損防止）
  - 入力：台本（既存コピー）、背景ID、ジェスチャープリセット、話速など
  - 出力：video_id、URL、言語、variant

#### 市場別最適化プロセス（ガイドラインをコード化）
- `VSL_GUIDELINES[market]` を静的データ化
  - 背景：都市/自宅/オフィス等
  - ジェスチャー：控えめ/強め
  - 服装/色調
- LPは `market` に応じてVSLを切替（将来は多変量テスト）

#### 技術スタック選定
- HeyGen API（既存キーあり）
- ストレージ：HeyGenホストURLを利用、必要ならS3/R2へミラー

---

### 5. トラッキングの標準化
#### トラッキングパラメータ設計（単一の正規形）
- 必須キー
  - `cid`：クリック/セッション統一ID（UUID）
  - `market`：EN/AR/ES/JA/KO/PT-BR
  - `affiliate_code`：Whopに渡す値（`ref`から正規化）
  - `utm_source, utm_medium, utm_campaign, utm_content, utm_term`
  - `lp_id`：どのLPか（42 LP識別）
  - `ab_variant`：A/Bバリアント
- ルール
  - URLに存在する値が最優先 → cookie/localStorage → デフォルト
  - `affiliate_code` は **Whop Checkoutの引数** と **redirectUrl** の両方に保持
  - すべての内部リンクに `cid` とUTMを付与（Next.js middleware推奨）

#### システム間連携設計
- LP: middlewareでクエリ正規化 + cookieセット
- Checkout: `redirectUrl = https://lp-domain/{market}/thanks?...` に全パラメータ付与
- Webhook: `affiliate_code` と `cid` の双方で照合（片方欠損に備える）

#### テスト仕様（100%保証のための自動テスト）
- E2E（Playwright）
  1. `?utm_*&ref=AFF123` でLP訪問 → cookieに保持される
  2. Checkout起動 → WhopCheckoutに `affiliateCode=AFF123` が渡る（DOM/props検証）
  3. `redirectUrl` に `cid` とUTMが含まれる（URL検証）
  4. Thanksページで `cid/affiliate_code` を表示・API送信できる
- Webhookテスト（契約テスト）
  - Whop webhook payloadのfixtureを固定し、冪等キー（event_id）で重複登録されないこと
- 監視
  - `cid` 欠損率、affiliate_code欠損率を日次でアラート

#### 技術スタック選定
- Playwright（E2E）
- Vitest/Jest（ユニット）
- Sentry/Logtail等（任意：運用監視）

---

### 6. アフィリエイター・リクルートLPのA/Bテスト
#### A/Bテストシステム設計（軽量・確実）
- **サーバーサイド割当**（Next.js middleware）
  - `ab_variant` を `A|B` で割当しcookie固定（30日）
  - 市場別に比率を変えられる設定（例：ARはB多め）
- 変更対象
  - 「Hidden Enemy」フックの見出し/冒頭VSL/CTA文言/フォーム順序など
- 計測
  - `view` / `cta_click` / `form_submit` / `checkout_start` を `ab_variant`付きで送信

#### データ収集・分析設計
- `events` テーブルに `ab_variant` を必須列として保存
- CVR: `form_submit / view`、`checkout_start / view`
- LTV: `ab_variant`別の購入後LTV（Webhook連動）

#### 可視化ダッシュボード設計
- 市場×variantの
  - CVR、CPA（広告費が入るなら後で）、LTV、回収率
- 有意差は当面「参考指標」（統計検定はPhase3で追加）

#### 技術スタック選定
- Next.js middleware + Postgres + Metabase

---

### 7. サンクスページの活用
#### リダイレクト処理設計
- Whop Checkoutの `redirectUrl` を **市場別Thanksページ**へ統一
  - `/[market]/thanks?cid=...&affiliate_code=...&utm_...`
- Thanksページ到達時に
  - Tracking APIへ `purchase_thanks_view` を送信（クライアント＋サーバー両方可）

#### 動的コンテンツ表示設計
- クエリから `market` / `affiliate_code` / `ab_variant` を読み
  - 言語別のTelegram参加ボタン（該当グループのリンク）
  - 「参加できない場合」FAQ（Whop Bot処理待ちの説明）
  - アップセル（上位プラン/年額）導線（任意）
- Telegram CTAは **ワンタップ**を最優先（深い説明は折りたたみ）

#### CTA最適化設計
- CTAクリックをイベント送信（`telegram_join_click`）
- 「参加完了」自己申告ボタン（`telegram_join_confirm`）を設置（計測の穴埋め）

#### 技術スタック選定
- Next.js page + 既存静的データ + Tracking API

---

## 📝 実装フェーズ

### Phase 1: 基盤構築（優先度: 高）
**目的**：計測ID統一・Webhook受信・DB基盤を先に固める  
- 実装項目
  - Postgres導入（または既存DBがあれば統合）
  - Tracking API（`/t`, `/whop/webhook`）新設
  - `cid`/UTM/affiliate_codeの正規化ミドルウェア（全LP共通）
  - イベントスキーマ・冪等処理
- 技術的タスク
  - DBスキーマ作成（events, users_map, memberships, jobs, sends）
  - Whop Webhook署名検証（可能なら）＋再送/重複対策
  - Playwrightで「UTM引き継ぎ」E2Eの雛形
- 見積もり工数（目安）
  - 5〜8人日
- 依存関係
  - Whop Webhook設定権限
  - LPリポジトリ共通コンポーネント/ミドルウェア適用

### Phase 2: 統合・連携（優先度: 高）
**目的**：RetentionとThanks CTA、ABテストを回し始める  
- 実装項目
  - Thanksページ実装（市場別）
  - Lifecycle workflows（更新7日前/解約直後/Welcome）
  - A/Bテスト（affiliate recruit LPから開始）
  - Metabaseダッシュボード初版
- 技術的タスク
  - Scheduler（日次）＋ジョブテーブル
  - Resendテンプレ（6言語）
  - Telegram送信（言語別bot/チャットIDの運用整理）
- 見積もり工数
  - 7〜12人日
- 依存関係
  - 各言語のテンプレ文言確定（CMO側）
  - Telegram導線（グループリンク/参加要件）の確定

### Phase 3: 最適化・拡張（優先度: 中）
**目的**：アフィリエイター活性化、VSLパーソナライズの運用化、LTV精度向上  
- 実装項目
  - Affiliate Portal（MVP）
  - Praise通知（しきい値ベース）
  - VSL Registry + HeyGen生成スクリプト + market別ルール
  - LTV算出の精緻化（プラン別、チャーン率、コホート）
- 見積もり工数
  - 10〜20人日
- 依存関係
  - Whop APIで取得できるデータ範囲の再確認（不足分は代替指標で設計）
  - HeyGen制作オペレーション（承認フロー）

---

## 🔧 技術的詳細

### 使用する技術スタック
- フロントエンド: Next.js（既存LP群に統合）
- バックエンド: Node.js/TypeScript（既存スクリプト資産と統一）
- データベース: PostgreSQL
- 外部サービス統合:
  - Whop Webhook / Whop API
  - GA4 / Meta Pixel（クライアント送信＋必要に応じCAPIは後続）
  - Resend（メール）
  - Telegram Bot API（通知）
  - HeyGen API（VSL）
- インフラ:
  - Vercel/Cloud Run等どちらでも可（Webhook受信の安定性優先）
  - Cron（Cloud Scheduler/Vercel Cron等）

### 実装上の注意点
- パフォーマンス
  - LPは計測JSを最小化（イベントはバッチ送信）
  - Webhookは即時200返却＋非同期処理（キュー/ジョブ）
- スケーラビリティ
  - `events`は肥大化するのでパーティション/TTLを想定（Phase3）
- セキュリティ
  - Webhook署名検証、IP制限（可能なら）
  - PII（メール等）は最小保持、暗号化/マスキング
- メンテナンス性
  - 「正規化関数」を共通パッケージ化（UTM/affiliate_code/cid）
  - 言語テンプレは静的データで一元管理（現方針を踏襲）

---

## 📊 実装優先順位（理由付き）
1. **(5) トラッキング標準化**：後工程（LTV/AB/Retention）の前提。ここが崩れると全て無意味化。
2. **(1) 計測とアトリビューション統合**：Webhook+LPイベントの接続が最重要。LTV可視化の土台。
3. **(7) ThanksページCTA**：最短でCVR/LTV（初期オンボード）改善が狙える。
4. **(2) Retention自動化**：チャーン抑制でLTVを直接押し上げる。
5. **(6) A/Bテスト**：改善サイクルを回す仕組み。市場別に最適化可能。
6. **(3) Affiliateエンゲージメント**：量→質へ。中期で効く。
7. **(4) VSLパーソナライズ**：効果は大きいが制作運用が絡むため後段で確実に。

---

## ✅ 実装チェックリスト

### Phase 1
- [ ] `cid`生成・cookie保存・全リンクへの引き継ぎ実装
- [ ] `affiliate_code/ref` 正規化（1つのキーに統一）
- [ ] Whop Checkout `redirectUrl` に `cid+utm+affiliate_code` を付与
- [ ] `/whop/webhook` 受信・冪等処理・DB保存
- [ ] E2Eで「UTM/affiliate_codeがCheckoutとThanksに残る」ことを自動検証
- [ ] 欠損率メトリクス（cid/affiliate_code）を日次集計

### Phase 2
- [ ] 市場別Thanksページ（Telegram CTA、FAQ、計測）
- [ ] Welcome/更新7日前/解約直後のワークフロー稼働
- [ ] 送信ログ（email/telegram）とクリック計測
- [ ] Affiliate recruit LPのA/B割当・計測・Metabase可視化

### Phase 3
- [ ] Affiliate Portal（リンク生成、実績、推奨アクション）
- [ ] 成果称賛通知（Webhook→Telegram/Email）
- [ ] VSL Registry + HeyGen生成スクリプト + market別ガイドライン
- [ ] LTVのコホート分析（市場/LP/affiliate/variant別）

---

## 🎯 結論
次の一手は「**トラッキングの標準化（cid/UTM/affiliate_code）＋Webhook統合**」を最優先で実装し、**LTVまで一気通貫で可視化できる状態**を作ることです。その上で、ThanksページCTAとRetention自動化をPhase2で回し始めると、マーケ施策の改善速度が上がり、広告・アフィリエイト双方のROI最適化が可能になります。

次のステップとして、実装開始前に以下だけ確定してください（最短で着手できます）：
- Whop Webhookで受け取れるイベント種類・payload確認（サンプル取得）
- 全LPの「Checkout起動点」と「redirectUrl」の統一方針
- Thanksページの市場別Telegram導線（URL/グループ種別）とコピー確定（CMO）

---

## 使用量


- Prompt Tokens: N/A
- Completion Tokens: N/A
- Total Tokens: N/A


---

**最終更新**: 2026-01-11T04:36:38.487Z
