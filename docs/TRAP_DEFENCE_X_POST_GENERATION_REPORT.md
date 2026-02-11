# Trap Defence OS：X（Twitter）投稿生成・管理・配信 全体構造報告

実装者視点による正確な実装状況レポート。

---

## 【1. 投稿生成ロジック】

### X投稿文を生成する関数の場所

| 用途 | ファイル | 関数 |
|------|----------|------|
| **引用リポスト（KV版）** | `services/grok/client.js` | `generateQuoteRepostText()` (L505–683) |
| **引用リポスト（Stateless版）** | `services/x/grokPoolStateless.js` | `tryGenerateGrokPool()` (L56–106) |
| **無料版レポート投稿** | `api/x-post-free-report.js` | 内部で Grok/GPT 連携・テンプレートを利用 |
| **メール/YouTubeパッケージ用** | `scripts/generate-email-youtube-package.js` | `generateXPostWithGrok()` (L287–366) |

### 使用AIモデル

- **Grok**: `grok-4-1-fast-reasoning`（`services/grok/client.js` の `GROK_MODEL_X_LIVE`）
- **Stateless GrokPool**: `generateChatCompletion()` 経由（`services/grok/client.js` 内で利用）

### system prompt / user prompt の構成

**1) 引用リポスト（KV版）`generateQuoteRepostText`**

- **system**: 「Dr. Grok」として X アルゴリズム最適化・心理トリガー・認知バイアス・質問 CTA・リンク/ハッシュタグ/絵文字の指示
- **user**: 元ツイート・Trap Score・Deep Link・「Maximum 140 characters」「#BTC #TrapDefence」などを指定

**2) Stateless GrokPool `tryGenerateGrokPool`**

- **system**: 短文コピー生成、Persona（言語別）、Constraints（40–70文字・0–1 hashtag・1 link・絵文字禁止）
- **user**: 「40–70 characters」「1 link」「No emojis」「curiosity or pain」で JSON 配列を出力

### Minimal / Regular の導線分岐

- **実装済み**。`config/quoteRepostStateless.js` の `pickVidalyticsLink(lang, tier)` で分岐
- `tier=mixed` 時: 70% regular / 30% minimal でランダム選択
- 12本（Regular/Minimal × 6言語）の Vidalytics リンクを環境変数で管理

### 五感刺激・小脳刺激・抽象禁止などのルール

- プロンプト上で「好奇心・痛み」「感情的」「広告っぽくない」「心理トリガー」等の指示あり
- 「五感刺激」「小脳刺激」「抽象禁止」といった** explicit ルール名・チェックリストは未実装**

---

## 【2. テンプレート構造】

### 投稿テンプレートの管理

- `config/quoteRepostStateless.js` の `TEMPLATES_JA`, `TEMPLATES_EN` 等（6言語 × 4本）
- `{link}` プレースホルダーを `buildBodyWithMode()` で Vidalytics リンクに置換

### 150字前後の制御

- Stateless GrokPool: プロンプトで「40–70 characters」指定
- KV版 Grok: プロンプトで「Maximum 140 characters」指定
- **コード側での文字数検証・トリム・150字制御は未実装**（前担当者の 140/280 制限は廃止、長文対応に変更）

### リンク末尾・#BTC・絵文字1つのルール

- リンク末尾: `buildBodyWithMode` で `→ {link}` 形式で末尾に付加。`ensureSpaceBeforeLink()` でスペース補正あり
- #BTC: Grok プロンプトで「#BTC」「#TrapDefence」を指示。KV版フォールバック・`x-quote-repost.js` の文言でも使用
- 絵文字1つ: **明示的なルールは未実装**。Grok プロンプトでは「3–5 emojis」、Stateless では「No emojis」と逆方向の設定

---

## 【3. 多言語対応】

### 言語切り替え（JA/EN/ES/PT/KO/AR）

- 6言語対応: `en`, `es`, `pt`, `pt-br`, `ja`, `ko`, `ar`
- Cron が言語別に `/api/x-quote-repost-en`, `-es`, `-pt-br`, `-pt`, `-ar`, `-ja`, `-ko` を呼び出し、各 API が `lang` を固定して実行

### 各言語のテンプレート

- `config/quoteRepostStateless.js` に `TEMPLATES_JA`, `TEMPLATES_EN`, `TEMPLATES_ES`, `TEMPLATES_PT`, `TEMPLATES_KO`, `TEMPLATES_AR` が定義済み
- Grok プロンプトで `targetLang` を指定して言語別生成

### 翻訳か言語別生成か

- **言語別生成**。翻訳パイプラインはなく、Grok に `${targetLang} language` で直接生成させる方式

---

## 【4. 投稿スケジューリング】

### スケジュール管理

- **Vercel Cron**（`vercel.json`）でスケジュール管理
- `/api/cron`: 15分ごと（0,7,22,37,52分）
- `/api/minimal-tg-delivery`: 6時間ごと（0,6,12,18 UTC :08）
- `/api/x-metrics-fetcher`: 5分ごと
- `/api/x-quote-repost-batch`: 7分ごと

### Cron / Queue / Worker のどれを使用

- **Cron**: Vercel Cron を使用（Queue / 専用 Worker はなし）
- 引用リポストは `x-quote-repost-batch` が 7分ごとに実行し、内部で言語ごとに処理

### 1日あたりの投稿数・時間帯ロジック

- `services/x/optimization.js`: 1日投稿数・ピーク時間帯ロジック
- `config/influencerStrategy.js`: 言語別 Cron 回数・1ストックあたり投稿数
- `X_MAX_DAILY_POSTS` / `X_MAX_HOURLY_POSTS` で日次・時間あたり制限（`.env.example`）
- `x-quote-repost-batch.js`: 150秒間隔で 3投稿・言語ローテーション

---

## 【5. A/Bテスト】

### 複数パターン生成（A/Bテスト）の実装

- **Telegram（cron.js）**: A/B バリアント（A/B）を `messageId` に含めてログ記録。50/50 ランダム割り当て
- **引用リポスト**: `docs/CURSOR_INSTRUCTION_TEMPLATE_AB_AUTO_AGGREGATION.md` で設計されているが、`getQuoteBodyTemplate(lang, { variant: 'random' })` 等の実装は未確認
- 勝ちバリアントの自動切り替え: `CURSOR_INSTRUCTION_TEMPLATE_WINNER_AUTO_SWITCH_RULES.md` で設計されているが未実装の可能性が高い
- Stateless は `template` / `grok` / `hybrid` モードでパターンを変えるが、A/B としての計測・勝ちバリアント反映は未統合

### 保存・選択・配信

- 保存: KV の `x:metrics:YYYY-MM-DD` に templateVariant を含める設計（集計用）
- 選択: ランダム 50/50 または勝ちバリアント参照（後者は未統合）
- 配信: 投稿時に variant を付与してメトリクス記録する想定

---

## 【6. 投稿保存・ログ管理】

### 生成された投稿の保存

- Stateless 引用リポスト: **永続保存なし**（生成→即投稿）
- 引用済み tweet_id: Supabase `quoted_tweets` に保存
- 無料版レポート: 生成→投稿までで、投稿文の永続保存なし

### 過去投稿のログ

- **Vercel ログ**: `console.log`
- **Vercel KV**: `x:post_logs:{YYYY-MM-DD}` に投稿ログ
- **Supabase**: `tweet_queue`, `tweet_metrics`, `quoted_tweets`
- **x-webhook.js**: エンゲージメント統計を KV に保存（30日保持）

### 投稿の成功/失敗ログ

- `PostLogger` の `logPostSuccess` / `logPostFailure` を想定した設計
- `x-engagement-metrics.js` の `recordEngagementMetrics` でメトリクス記録
- Stateless 引用では `console.log` と `quoted_tweets` への insert が主なログ相当

---

## 【7. X API 連携】

### 投稿処理のファイル

- `services/x/client.js`
  - `postTweet()`: 通常ツイート
  - `postQuoteTweet()`: 引用リポスト (L750 付近)

### 認証（OAuth）

- **OAuth 1.0a User Context** 認証
- 環境変数: `X_API_CONSUMER_KEY`, `X_API_CONSUMER_KEY_SECRET`, `X_API_ACCESS_TOKEN`, `X_API_ACCESS_TOKEN_SECRET`
- Bearer Token: `X_API_BEARER_TOKEN`（検索等に使用）

### エラー処理・リトライロジック

- `xApiRequest()`: 指数バックオフで最大 3 回リトライ
- `isRateLimitError`, `isFatalTweetError`, `isRetryableError` で分類
- `postQuoteTweet`: 15秒タイムアウト、リトライあり
- 429 時はリクエスト停止

---

## 【8. 現状の問題点】

| 項目 | 内容 |
|------|------|
| **150字制御** | プロンプト指定のみで、コード側の長さ検証・トリムなし。140/280 制限の記述も混在 |
| **リンク・#BTC・絵文字** | 「リンク末尾」「#BTC」「絵文字1つ」の明示ルールと検証が未実装 |
| **五感・小脳・抽象禁止** | プロンプトに断片的な指示はあるが、チェック可能なルールとして未定義 |
| **A/B 勝ちバリアント** | 設計ドキュメントあり。引用リポストでの A/B 計測・勝ちバリアント自動切り替えは未統合 |
| **タイムアウト** | Vercel 300秒制限で長時間処理が打ち切られる可能性 |
| **投稿文の永続保存** | 投稿本文を DB 等に保存しておらず、後追い分析・AB 比較が困難 |
| **Stateless / KV 版の混在** | 引用リポストに Stateless と KV 版の両方が存在し、設計が二重化 |
| **GrokPool 制約の矛盾** | Stateless は「No emojis」、KV 版 Grok は「3–5 emojis」と逆方向の設定 |

---

## 付録：主要ファイル一覧

| パス | 役割 |
|------|------|
| `config/quoteRepostStateless.js` | テンプレート・リンク・スコア・pickTopN |
| `services/grok/client.js` | `generateQuoteRepostText`（引用リポスト本文生成） |
| `services/x/grokPoolStateless.js` | Stateless Grok プール生成 |
| `services/x/client.js` | `postTweet`, `postQuoteTweet`, OAuth, リトライ |
| `services/x/optimization.js` | ピーク時間・投稿数制限・ハッシュタグ |
| `api/x-post-free-report.js` | 無料版レポート X 投稿 |
| `api/x-quote-repost.js` | 引用リポスト（KV 版） |
| `api/x-quote-repost-batch.js` | 引用リポストバッチ（7分ごと） |
| `api/x-quote-repost-*-*.js` | 言語別引用リポストエントリポイント |
| `vercel.json` | Cron スケジュール・関数タイムアウト |
