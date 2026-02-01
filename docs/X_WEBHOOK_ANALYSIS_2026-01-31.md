# X Webhook ログ分析レポート（2026-01-31）

出典: `logs_result (2).json`（31エントリ）

## 実行概要

X Account Activity API v2 の Webhook からデータを取得。  
ログには以下のイベントが記録されていた。

---

## 検出されたイベント

### 1. CRC Challenge-Response Checks: 3回

X が Webhook の正当性を検証するためのチェック。  
- タイムスタンプ: `2026-02-01 00:33:54`, `00:42:20`
- 結果: すべて `✅ CRC verification successful`

### 2. Replay Job Status: 2件

過去イベントの再配信ジョブ（Replay機能）の完了通知。

| Job ID | State | Description | Timestamp |
|--------|-------|-------------|-----------|
| `2017758268786147328` | Complete | Job completed successfully | 2026-02-01 00:34:34 |
| `2017760391384993795` | Complete | Job completed successfully | 2026-02-01 00:42:39 |

### 3. 投稿・エンゲージメントイベント: **0件**

`tweet_create_events`, `favorite_events`, `follow_events` などは検出されず。

---

## X Account Activity API で取得可能な情報（仕様）

参照: [X API Documentation - Account Activity API](https://docs.x.com/x-api/account-activity/introduction)

### 取得可能なイベントタイプ

| イベント | 内容 | 用途 |
|---------|------|------|
| **tweet_create_events** | 投稿、RT、リプライ、@mentions、引用ツイート | 投稿内容・エンゲージメント分析 |
| **favorite_events** | いいね（by user / of user） | いいね数・ユーザー属性分析 |
| **follow_events** | フォロー | フォロワー増加傾向 |
| **unfollow_events** | アンフォロー | 離脱分析 |
| **block_events / unblock_events** | ブロック/解除 | ネガティブ反応検知 |
| **mute_events / unmute_events** | ミュート/解除 | 静かな離脱検知 |
| **direct_message_events** | DM送受信 | 個別対応・コンバージョン |
| **tweet_delete_events** | 投稿削除通知 | コンプライアンス |

### 各イベントに含まれるデータ

- **for_user_id**: サブスクリプション対象ユーザーID
- **source**: アクション実行者（ユーザーオブジェクト）
- **target**: アクション対象（ユーザーオブジェクト）
- **created_timestamp**: イベント発生時刻
- **投稿の場合**:
  - `full_text`: 投稿本文（longform 対応、280文字超も含む）
  - `entities`: ハッシュタグ、URL、@mentions、symbols
  - `user`: 投稿者情報（followers_count, verified, profile画像など）
  - `extended_tweet`: 280文字超の全文

---

## 我々の X 投稿分析への活用方法

### 1. スニペット投稿（`ENABLE_X_SNIPPET_POST`）の効果測定

- **tweet_create_events** から:
  - `full_text`: 投稿した briefing スニペット内容
  - `id_str`: 投稿ID（パフォーマンス追跡用）
- **favorite_events**:
  - いいねしたユーザーの `followers_count`, `verified` → インフルエンサー反応率
- **retweet（tweet_create_events 内）**:
  - RT数・RTしたユーザー属性 → 拡散力測定

### 2. 引用リポスト（Quote Repost）の効果測定

- **tweet_create_events** から引用ツイート判定:
  - `quoted_status_id`: 元ツイートID
  - `text`: 我々が追加したコメント（歴史的ヘッドライン風）
- **favorite_events / retweet**:
  - 元ツイートのインフルエンサー vs 我々の引用ツイートのエンゲージメント比較

### 3. 時間帯・言語別パフォーマンス

- `created_timestamp` から:
  - どの時間帯（UTC 8, 12, 16, 20 など）が最もエンゲージメント高いか
  - 言語別（EN, ES, PT-BR, AR, JA, KO）の反応傾向

### 4. ハッシュタグ・URL効果

- `entities.hashtags`: どのハッシュタグが拡散に寄与したか
- `entities.urls`: ブリーフィングへのリンククリック率（外部ツールと連携）

### 5. インフルエンサー戦略の最適化

- **follow_events**:
  - 我々の投稿後にフォローしたユーザー → コンバージョン測定
- **replies（tweet_create_events 内）**:
  - どのインフルエンサーへのリプライが最も反応を得たか

---

## 現在のログの状況と課題

### ✅ 正常動作

- **CRC チェック**: 3回成功 → Webhook 登録・検証は正常
- **Replay Jobs**: 2件完了 → 過去イベント再配信機能は動作

### ⚠️ 投稿イベント未検出

`tweet_create_events`, `favorite_events` などが 0 件。

**原因（推測）**:

1. **サブスクリプション未設定**
   - X Developer Portal で自アカウント（または管理アカウント）をサブスクライブしていない可能性
   - Account Activity API のサブスクリプション追加が必要

2. **Replay 対象期間に投稿がない**
   - Replay Job は過去24時間以内のイベントを再配信
   - 該当期間に投稿・いいね・RTなどのアクティビティがなかった可能性

3. **Webhook の Subscription が for DM only**
   - 設定で DM のみサブスクライブしている場合、投稿イベントは配信されない

---

## 改善提案

### 1. サブスクリプション確認・追加

X Developer Portal で以下を確認:

```bash
# サブスクリプション一覧取得
GET /2/account_activity/webhooks/:webhook_id/subscriptions/all/list

# サブスクリプション追加（自アカウント）
POST /2/account_activity/webhooks/:webhook_id/subscriptions/all
```

### 2. テスト投稿・エンゲージメント

Webhook が正常に動作しているか確認するため:

1. 自アカウントで投稿
2. 自分で「いいね」
3. Webhook にイベントが届くか確認

### 3. Replay 実行（24時間以内の投稿がある場合）

```bash
POST /2/account_activity/replay/webhooks/:webhook_id/subscriptions/all
  ?from_date=202602010000&to_date=202602010100
```

### 4. ログ保存・分析基盤

Webhook で受信した `tweet_create_events`, `favorite_events` を:

- Vercel KV に保存（`x:events:tweet:<tweet_id>`, `x:events:favorite:<event_id>`）
- 定期的に集計（1日1回、cron で）
- Gemini でエンゲージメント傾向を分析
- Grok で「どの投稿タイプが X アルゴリズムに強いか」を推論

---

## まとめ

**現状**: Webhook は正常動作しているが、投稿イベントが届いていない。  
**次のステップ**: サブスクリプション追加 → テスト投稿 → イベント受信確認 → 分析基盤構築。

Account Activity API を活用すれば、以下が実現可能:

- スニペット投稿 vs 引用リポストの A/B テスト
- 時間帯・言語別の最適化
- インフルエンサー戦略の定量評価
- Grok のアルゴリズム解析 + 実データでの検証ループ
