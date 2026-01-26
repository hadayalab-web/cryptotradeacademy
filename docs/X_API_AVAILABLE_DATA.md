# X API v2 から取得可能な投稿情報

## 📊 現在のコードで取得している情報

### 1. 基本情報（認証不要）
- `id` - ツイートID
- `text` - ツイート本文
- `author_id` - 投稿者ID
- `created_at` - 作成日時
- `edit_history_tweet_ids` - 編集履歴（2022年9月29日以降のツイート）

### 2. Public Metrics（認証不要）
- `public_metrics`:
  - `retweet_count` - リツイート数
  - `reply_count` - リプライ数
  - `like_count` - いいね数
  - `quote_count` - 引用ツイート数
  - `bookmark_count` - ブックマーク数
  - `impression_count` - インプレッション数（**注意: これは公開メトリクスだが、通常は0**）

### 3. Non-Public Metrics（OAuth 1.0a User Context認証が必要、自分のツイートのみ）
- `non_public_metrics`:
  - `impression_count` - インプレッション数（**最も正確**）
  - `url_link_clicks` - URLクリック数
  - `user_profile_clicks` - プロフィールクリック数
  - `engagements` - 総エンゲージメント数

### 4. Organic Metrics（OAuth 1.0a User Context認証が必要、過去30日以内のツイートのみ）
- `organic_metrics`:
  - `impression_count` - オーガニックインプレッション数
  - `like_count` - オーガニックいいね数
  - `retweet_count` - オーガニックリツイート数
  - `reply_count` - オーガニックリプライ数
  - `url_link_clicks` - オーガニックURLクリック数
  - `user_profile_clicks` - オーガニックプロフィールクリック数

## 🔍 追加で取得可能な情報（現在未使用）

### Tweet Fields（`tweet.fields`パラメータで指定可能）
- `conversation_id` - 会話ID
- `context_annotations` - コンテキストアノテーション
- `entities` - エンティティ（ハッシュタグ、メンション、URLなど）
- `attachments` - 添付メディア情報
- `geo` - 位置情報
- `lang` - 言語コード
- `possibly_sensitive` - センシティブコンテンツの可能性
- `referenced_tweets` - 参照ツイート
- `reply_settings` - リプライ設定
- `source` - 投稿元（クライアント名）
- `withheld` - 制限情報

### Expansions（`expansions`パラメータで関連データを取得）
- `author_id` - 投稿者情報（`user.fields`で詳細指定可能）
- `referenced_tweets.id` - 参照ツイートの詳細
- `attachments.media_keys` - メディア情報（`media.fields`で詳細指定可能）
- `attachments.poll_ids` - 投票情報（`poll.fields`で詳細指定可能）
- `geo.place_id` - 場所情報（`place.fields`で詳細指定可能）
- `entities.mentions.username` - メンションされたユーザー情報
- `in_reply_to_user_id` - リプライ先ユーザー情報

### User Fields（`user.fields`パラメータで指定可能）
- `created_at` - アカウント作成日時
- `description` - プロフィール説明
- `entities` - エンティティ
- `id` - ユーザーID
- `location` - 場所
- `name` - 表示名
- `pinned_tweet_id` - ピン留めツイートID
- `profile_image_url` - プロフィール画像URL
- `protected` - 非公開アカウントかどうか
- `public_metrics` - 公開メトリクス（フォロワー数、フォロー数など）
- `url` - プロフィールURL
- `username` - ユーザー名
- `verified` - 認証済みかどうか
- `withheld` - 制限情報

### Media Fields（`media.fields`パラメータで指定可能）
- `duration_ms` - 動画の長さ（ミリ秒）
- `height` - 高さ
- `media_key` - メディアキー
- `preview_image_url` - プレビュー画像URL
- `type` - メディアタイプ
- `url` - メディアURL
- `width` - 幅
- `public_metrics` - メディアの公開メトリクス（再生数など）
- `alt_text` - 代替テキスト
- `variants` - 動画バリアント

## ⚠️ 重要な制約

### インプレッション情報について
1. **`public_metrics.impression_count`**: 通常は0が返される（公開メトリクスだが実装されていない）
2. **`non_public_metrics.impression_count`**: 
   - OAuth 1.0a User Context認証が必要
   - 自分のツイートのみ取得可能
   - 最も正確なインプレッション数
3. **`organic_metrics.impression_count`**: 
   - OAuth 1.0a User Context認証が必要
   - 過去30日以内のツイートのみ取得可能
   - オーガニック（広告以外）のインプレッション数

### 認証要件
- **Public Metrics**: Bearer Token（App-only認証）で取得可能
- **Non-Public Metrics / Organic Metrics**: OAuth 1.0a User Context認証が必要

### レート制限
- `/tweets/:id`: 300リクエスト/15分（User Context認証）
- `/tweets`: 300リクエスト/15分（User Context認証、最大100件まで一括取得可能）

## 📝 現在の実装状況

### 取得している情報
✅ 基本情報（id, text, author_id, created_at）
✅ Public Metrics（いいね、リツイート、リプライ、引用ツイート数）
✅ Non-Public Metrics（インプレッション数、URLクリック数、プロフィールクリック数）
✅ Organic Metrics（オーガニックインプレッション数など）

### 未使用の情報
❌ エンティティ（ハッシュタグ、メンション、URL）
❌ メディア情報（画像、動画の詳細）
❌ 投稿者情報の詳細（フォロワー数、認証状態など）
❌ コンテキストアノテーション
❌ 位置情報

## 💡 推奨事項

現在の実装で取得している情報は基本的なメトリクスに限定されています。より詳細な分析には以下を追加検討：

1. **投稿者情報の取得**: `expansions=author_id&user.fields=public_metrics,verified`でフォロワー数や認証状態を取得
2. **エンティティ情報**: `tweet.fields=entities`でハッシュタグやメンションを取得
3. **メディア情報**: `expansions=attachments.media_keys&media.fields=type,url,public_metrics`でメディアの詳細を取得
