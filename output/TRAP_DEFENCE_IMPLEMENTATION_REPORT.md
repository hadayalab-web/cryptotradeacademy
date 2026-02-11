# Trap Defence 実装状況レポート（構造化監査・6言語対応版）

**作成日**: 2026-02-10  
**対象**: cryptotradeacademy コードベース全体

---

## 1. 全体アーキテクチャ概要

### 主要ディレクトリと役割

| ディレクトリ | 役割 |
|-------------|------|
| `api/` | Cron エンドポイント、Webhook、配信ハンドラー |
| `config/` | 閾値、インフルエンサー戦略、テンプレート、市場プロファイル |
| `logic/` | トラップ検出、市場判定、シグナル生成（core / tier1_btc） |
| `services/` | 外部API（X/TG/GPT/Grok/Gemini/CryptoQuant）、メッセージ生成、ストレージ |
| `utils/` | KV、ロガー、スケジューラー、共通ユーティリティ |

### 主要ファイルと責務

| ファイル | 責務 |
|----------|------|
| `api/cron.js` | メインCron（15分ごと）: Regular TG配信、EMERGENCY/WATCH、市場データ収集、KV への Minimal payload 書き出し |
| `api/minimal-tg-delivery.js` | 無料版TG配信（6時間ごと）: KV から payload 取得→6言語 Minimal 配信 |
| `api/x-quote-repost-*.js` | 6言語別引用リポストCron（EN/ES/PT-BR/AR/KO/JA） |
| `api/x-quote-repost.js` | 引用リポスト共通ロジック（`postQuoteRepostsForLang`）、統一ハンドラー（Cron未登録） |
| `logic/core/trapDetector.js` | トラップ検出エンジン（CryptoQuant + Grok X 統合） |
| `services/telegram/messages/user/{lang}/` | 言語別TGメッセージテンプレート（regular / minimal-high-quality / emergency） |

### 6言語対応の構造

- **サポート言語**: `en`, `es`, `pt-br`, `ar`, `ja`, `ko`（`SUPPORTED_LANGS` で定義）
- **メッセージ配置**: `services/telegram/messages/user/{lang}/`
  - `regular.{lang}.js` → 有料版（Regular Briefing）
  - `minimal-high-quality.{lang}.js` → 無料版（Zeigarnik Edition v1.5）
  - `emergency.{lang}.js` → 緊急アラート

### TG配信とX投稿の分岐構造

```
api/cron.js (15分ごと)
├── 定期スロット (0,6,12,18 UTC :00) → Regular Briefing 6言語配信
├── 非定期 → GPT/Grok 解析 → EMERGENCY / WATCH / STANDBY_BREAK 判定
├── 定期時に KV へ minimal:payload:latest 書き出し
└── X Proof Post（英語のみ、ENABLE_X_PROOF_POST 時）

api/minimal-tg-delivery.js (0,6,12,18 UTC :10)
└── KV から minimal:payload:latest 取得 → 6言語 Minimal 配信

api/x-quote-repost-{lang}.js (言語別スケジュール)
└── postQuoteRepostsForLang(lang) → ストックからインフルエンサー選択 → 引用リポスト投稿
```

### データフローの全体像

```
入力: CryptoQuant API, CoinGecko, Fear&Greed, Grok X解析, GPT, Gemini
  ↓
処理: trapDetector, marketSnapshot, eventTriggers (イベント駆動)
  ↓
出力:
  - Telegram: Regular (有料6言語), Minimal (無料6言語), EMERGENCY, WATCH
  - X: 引用リポスト（6言語 × インフルエンサー）、X Proof Post（EN）
  - KV: minimal:payload:latest, 投稿ログ, インフルエンサーストック
```

---

## 2. 主要コンポーネントの説明

### api/cron.js（メイン Whale Monitor）

- **目的**: 24時間監視、市場データ取得、Regular/Minimal/EMERGENCY 配信トリガー
- **依存**: CryptoQuant, GPT, Grok, Gemini, Telegram Bot, KV, stateManager（イベント駆動時）
- **主要関数**: `handler`（メインハンドラー）、`loadUserTemplates`、`getTargetLanguagesForRegular/Minimal`
- **重要ロジック**:
  - 定期スロット: `REGULAR_HOURS`（デフォルト 0,6,12,18 UTC）＋`REGULAR_DELIVERY_MINUTE`
  - イベント駆動: `evaluateTrigger` で REGULAR / EMERGENCY / WATCH / STANDBY_BREAK 判定
  - 多言語: `REGULAR_MULTI_LANG` / `MINIMAL_MULTI_LANG`（デフォルト true）で 6 言語全配信
- **クリティカルパス**: データ取得 → トラップ検出 → トリガー評価 → 言語ループで Regular 配信

### api/minimal-tg-delivery.js

- **目的**: 無料版 Minimal を 6 言語へ配信（Regular と同時刻を避ける）
- **依存**: KV（`minimal:payload:latest`）, `sendMessageToAsset`, `minimal-high-quality.{lang}.js`
- **主要関数**: `handler`, `loadMinimalFormatter`, `resolveMinimalChatId`, `getTargetLangs`
- **重要ロジック**: KV に payload がない場合は 503（cron.js が先に定期枠で書き出す前提）

### api/x-quote-repost.js + x-quote-repost-{lang}.js

- **目的**: インフルエンサーの投稿を引用リポストして TG 導線を載せる
- **依存**: X API, influencerStock, salesLetterContest, quoteRepostBodyTemplates, optimization
- **主要関数**: `postQuoteRepostsForLang`, `postQuoteReposts`, `getTelegramDeepLinkWithSource`
- **重要ロジック**:
  - ストックから `selectInfluencersWithRotation` で選択
  - Grok セールスレター（キャッシュ優先）または `getQuoteBodyTemplate` で本文生成
  - 8h クールダウン、日次上限（1 人 4 回/日）、重複防止
- **クリティカルパス**: ストック取得 → ローテーション選択 → 本文生成 → `postQuoteTweet` → ログ記録

### logic/core/trapDetector.js

- **目的**: オンチェーン + X センチメントの統合でトラップ検出
- **依存**: divergenceDetector, trendReversalDetector, tier1_btc/trapDetector, signalQualityGate
- **主要関数**: `detectTrapDetection`, `generateTrapAlert`
- **重要ロジック**: 複数ダイバージェンス、高解像度異常、whale-retail ズレで trapScore 算出、品質ゲート（trapScore≥60）

---

## 3. cron jobs の実装状況

### 本数と役割

| Cron | パス | スケジュール | 役割 |
|------|------|-------------|------|
| 1 | `/api/cron` | `0,7,22,37,52 * * * *`（15分ごと） | Whale Monitor: Regular 配信、EMERGENCY/WATCH、Minimal payload 書き出し |
| 2 | `/api/minimal-tg-delivery` | `10 0,6,12,18 * * *` | 無料版 TG 6言語配信 |
| 3 | `/api/x-quote-repost-en` | `0 * * * *` | 英語引用リポスト |
| 4 | `/api/x-quote-repost-es` | `10 * * * *` | 西語引用リポスト |
| 5 | `/api/x-quote-repost-pt-br` | `20 * * * *` | 葡語引用リポスト |
| 6 | `/api/x-quote-repost-ar` | `30 * * * *` | アラビア語引用リポスト |
| 7 | `/api/x-quote-repost-ko` | `40 * * * *` | 韓国語引用リポスト |
| 8 | `/api/x-quote-repost-ja` | `50 0,1,2,3,4,5,6,7,8,12,13,14,15,16 * * *` | 日本語引用リポスト（制限付き） |

**合計 8 本の Cron**

### 6言語への分散状況

- **TG Regular**: `api/cron.js` 内で `getTargetLanguagesForRegular()` により 6 言語全配信
- **TG Minimal**: `api/minimal-tg-delivery.js` で `getTargetLangs()` により 6 言語全配信
- **X 引用リポスト**: 言語別 Cron で分離（EN/ES/PT-BR/AR/KO/JA）。JA は UTC 0–8, 12–16 時のみ実行

### エラーハンドリング

- `api/cron.js`: try-catch、GPT/Grok 失敗時のフォールバック、`p-retry` によるリトライ
- `api/minimal-tg-delivery.js`: 言語別 try-catch、KV 不在時 503
- `api/x-quote-repost.js`: 言語単位で例外を握りつぶさず再スロー、`postQuoteTweet` のリトライ、tweet 不在時のストック削除

---

## 4. X投稿ロジック（引用リポスト）の実装状況

### 投稿探索（最大風速の検出）

- **「探す」**: ストックから `getInfluencersFromStock(lang)` で取得
- ストックは `/api/x-update-influencer-stock` や `discover-and-stock-influencers-*.js` で補充
- 「最大風速」の概念は**インプレッション目標**（`getImpressionTargetForLang`）で表現
- `selectInfluencersWithRotation` でローテーション選択、`selectInfluencersForImpressionTarget` がフォールバック

### 投稿解析（public_metrics）

- `getTweetMetrics(tweetId)` で `publicMetrics` / `organicMetrics` / `nonPublicMetrics` を取得
- 引用リポスト成功後に `recordEngagementMetrics` で記録
- インフルエンサーの `recentImpressions` / `engagementRate` はストック登録時に保持

### 投稿生成（40〜80字＋URL末尾）

- **本文**: Grok セールスレター（`getSalesLetterGrokFromCache` / `runGrokOnlySalesLetter`）または `getQuoteBodyTemplate(lang)`（2 行フォールバック）
- **URL**: `buildQuoteForYouTubeOgp`（YouTube OGP 最適化時）または `getLinkBlockGrokStyle` で TG 深層リンク / Whop
- 40〜80 字の制限は**廃止**。長文ポスト（最大 25,000 文字）対応

### 引用リポストの実装状況

- `postQuoteTweet(quoteText, influencer.tweetId)` で X API v2 引用リポストを実行
- 実装完了

### 6言語ごとの処理分岐

- 各 `api/x-quote-repost-{lang}.js` が `postQuoteRepostsForLang(lang, ...)` を直接呼び出し
- `getLanguagesForCurrentHour` は**使用されていない**（言語別 Cron で時間分散済み）

### 投稿パターン（無料/有料）の適用状況

- X 引用リポストは**統合導線**（無料 Minimal + 有料 Regular を 1 投稿に含む）
- Grok セールスレター or `getQuoteBodyTemplate` → `getLinkBlockGrokStyle` / `buildQuoteForYouTubeOgp` で TG 導線
- `quoteRepostTemplatesIntegrated.js` が統合用、`quoteRepostTemplatesMinimalOptin` / `RegularOptin` は参照用

---

## 5. TG配信ロジック（Regular / Minimal）の実装状況

### 6言語 × 2種の配信

| 種別 | テンプレート | チャンネル | スケジュール |
|------|-------------|-----------|-------------|
| Regular（有料） | `formatRegularBriefing`（`regular.{lang}.js`） | `TELEGRAM_CHAT_ID_BTC_{EN\|AR\|KO\|JA\|ES\|PT_BR}` | cron.js 定期枠（0,6,12,18 UTC :00） |
| Minimal（無料） | `formatMinimalBriefingOSv26`（`minimal-high-quality.{lang}.js`） | `TELEGRAM_CHAT_ID_MINIMAL_{lang}` | minimal-tg-delivery（0,6,12,18 UTC :10） |

### 配信スケジュール

- Regular: `REGULAR_DELIVERY_HOURS_UTC`（デフォルト 0,6,12,18）、`REGULAR_DELIVERY_MINUTE`（デフォルト 0）
- Minimal: 同じ 0,6,12,18 UTC の **:10** で、Regular と 10 分ずらして実行

### 文体・テンプレートの管理

- Regular: 各言語 `services/telegram/messages/user/{lang}/regular.{lang}.js`
- Minimal: Zeigarnik Edition v1.5 のみ（`formatMinimalBriefingOSv26`）。4-post 版は廃止

### 有料/無料の分岐ロジック

- Regular: `isRegularSlot || force || triggerType === "REGULAR"`
- Minimal: 常に `minimal-tg-delivery` で KV の payload を用いて 6 言語配信

---

## 6. 投稿パターン（無料1 / 有料2）の実装状況

### パターン数と種類

| 種別 | パターン数 | 実装 |
|------|-----------|------|
| 無料 | 1 | Minimal（Zeigarnik Edition）＝ `minimal-high-quality.{lang}.js` |
| 有料 | 2（概念的） | Regular Briefing（`regular.{lang}.js`）、EMERGENCY（`formatTrapAlert`） |

設計書の「無料1 / 有料2」は、TG の Minimal 1 種と Regular+EMERGENCY 2 種に対応。

### 文体の違い

- Minimal: ツァイガルニク型、`formatMinimalBriefingOSv26` で統一
- Regular: 市場レーダー、Behind-the-Scenes、シナリオマップ、GPT/Grok 解析結果を含む長文
- EMERGENCY: `formatTrapAlert` による短い警報

### パラメータの違い

- Minimal: `trapScore`, `priceUsd`, `change24h`, `trapData`, `marketData`, `sentimentData`
- Regular: `snapshot`, `gptReporterAnalysis`, `grokXAnalysis`, `trapDetection`, `psychologicalSupport`, `sosovalueArticle` など多数

### 言語別最適化

- 6 言語すべてに専用テンプレートあり（en, es, pt-br, ar, ja, ko）
- EN ロード失敗時は EN フォールバック

### 動的最適化

- A/B バリアント（variant A/B）を `messageId` に含めて記録
- `integratedOptimization` は廃止（GPT/Grok/Gemini の役割を分離）

---

## 7. 言語別処理の実装状況

### 対応言語

**6言語**: en, es, pt-br, ar, ja, ko

### 言語ごとの分岐ロジック

- `SUPPORTED_LANGS` で定義
- `normalizeLang`（`utils/common.js`）で正規化
- ストック: `influencerStock.js` で `x:influencers:stock:{lang}` をキーに管理

### 時間帯最適化

- **optimization.js**: `getLanguagePeakHours(lang)` で UTC ピーク時間を定義
- **getPeakMapForHour**: 時間帯ごとに処理対象言語を返す（本番は言語別 Cron で代替）
- JA: `ACTIVE_HOURS_UTC_BY_LANG.ja` で 0–8, 12–16 のみ。Cron も `50 0,1,2,3,4,5,6,7,8,12,13,14,15,16 * * *` に制限

### 文体・語尾の最適化

- 各言語フォルダ内の `regular` / `minimal-high-quality` / `emergency` で個別に実装
- `quoteRepostBodyTemplates.js` に 6 言語の 2 行フォールバックあり

---

## 8. API 呼び出しの実装状況

### 使用API

| API | 用途 | クライアント |
|-----|------|-------------|
| X (Twitter) API v2 | 引用リポスト、メトリクス取得 | `services/x/client.js` |
| Telegram Bot API | メッセージ送信 | `services/telegram/bot.js` |
| CryptoQuant | オンチェーンデータ | `services/cryptoquant/` |
| OpenAI (GPT) | CQ 解析、市場レポート | `services/gpt/client.js` |
| Grok (xAI) | X センチメント、セールスレター | `services/grok/` |
| Gemini | SoSoValue 風記事、最適化 | `services/gemini/` |
| CoinGecko, Fear&Greed | 価格・センチメント | cron.js 内 fetch |
| Resend | メール（EMERGENCY 等） | `services/email/resendClient.js` |

### レート制限対策

- X: `rateLimitTracker`, `recordRateLimit`、`checkHourlyPostLimit`（100/時間デフォルト）
- CryptoQuant: `rateLimiter.js`
- GPT: 429 時のログと次回リトライ

### エラーハンドリング

- `p-retry` でリトライ（CQ、価格、F&G）
- X: 500/503/AbortError 時に 2 秒待って 1 回リトライ
- tweet 不在時はストックから削除して次へ

### リトライロジック

- CQ: retries 2, factor 2, minTimeout 500
- X `postQuoteTweet`: 15 秒タイムアウト、1 回リトライ
- GPT: 429 時は次回実行に委ねる

---

## 9. ログ・監視・メトリクス

### ログ内容

- **cron.js**: 構造化ログ（`createLogger`）、JSON 形式で level / service / prefix / msg / time
- **x-quote-repost**: runId, step, lang, influencer, tweetId, 成功/失敗
- **PostLogger**: `logPostSuccess` / `logPostFailure` で投稿履歴を KV に保存

### 保存先

- **Vercel ログ**: `console.log` 出力
- **KV**: `x:post_logs:{YYYY-MM-DD}`, `minimal:payload:latest`, インフルエンサーストック、メッセージログ

### 監視ポイント

- チャンネル ID 未設定（`missingChannelIds`）
- ストック空（`No influencers in stock`）
- tweetId 不正、重複投稿、クールダウン超過
- X API 認証・レート制限

### デバッグ情報

- `runId` で実行単位を追跡
- `step` で処理段階を特定
- `X_API_DEBUG=true` で詳細ログ

---

## 10. 未実装・危険箇所・改善ポイント

### 抜け漏れ

1. **x-quote-repost.js の統一ハンドラー**: `getLanguagesForCurrentHour` を使うが、Cron は言語別 API を直接呼ぶため未使用。時間帯最適化が二重設計になっている可能性
2. **EMERGENCY の多言語**: EMERGENCY 配信は `LANG`（単一）ベース。6 言語向け EMERGENCY 配信の明示的実装はなし
3. **quoteRepostTemplatesMinimalOptin / RegularOptin**: 統合テンプレートが主で、これらが引用リポスト本番でどこまで使われているか要確認

### バグの可能性

1. **cron.js の LANG**: 起動時の `process.env.LANG` でテンプレートをロードするが、Regular は `targetLang` で言語ループしており、イベント駆動の WATCH/STANDBY_BREAK は `LANG` 固定
2. **minimal-tg-delivery の KV 依存**: cron.js が定期枠で payload を書く前提。定期枠をスキップした場合、payload が古い or 無い可能性

### 設計と実装のズレ

1. **「探す→読む→作成する」**: 「探す」はストックから選択、「読む」は `getTweetMetrics` 等で簡易解析、「作成する」は Grok セールスレター or フォールバック。設計書の 3 工程との対応がコード上は明示的でない
2. **「最大風速」**: インプレッション目標で表現されているが、「風速」という用語での実装はない

### 最適化余地

1. **6言語 × 時間帯 × パターン**: `getPeakMapForHour` と言語別 Cron の関係を整理し、どちらを SSOT とするか決定
2. **JA の実行回数**: 14 回/日で他言語より少ない。ストック数（11）に合わせた設計だが、需要に応じて拡張余地あり
3. **インフルエンサーストック**: en 124, ja 11 など言語で偏り。均等化 or 市場別戦略の見直し余地あり

---

## 11. 総合評価（現状の完成度）

### 評価: **78%**

### 理由

- **実装済み**
  - 6言語 × TG（Regular / Minimal）配信
  - 6言語 × X 引用リポスト（言語別 Cron）
  - トラップ検出、イベント駆動、KV 連携
  - ログ・メトリクス・エラーハンドリングの基本
- **未整理・要確認**
  - 設計書の「探す→読む→作成する」「最大風速」と実装の対応
  - `getLanguagesForCurrentHour` と言語別 Cron の役割分担
  - EMERGENCY の多言語対応
  - 投稿パターン（無料1/有料2）と TG/X の対応関係の文書化

### 次に着手すべき優先順位トップ3

1. **設計と実装の SSOT 化**
   - `getLanguagesForCurrentHour` と言語別 Cron のどちらを「正」にするか決定
   - 「探す→読む→作成する」「最大風速」をコード上の命名・コメントで明示

2. **EMERGENCY の 6 言語対応**
   - 現状は `LANG` 固定。6 言語全配信か、市場別配信かを設計し実装

3. **監視ダッシュボード強化**
   - 言語別配信成功率、ストック残数、X API 使用量を可視化
   - KV の `x:post_logs` を集計する Cron または分析 API の追加

---

*本レポートはコードベースの事実に基づいて作成しています。推測は「未実装・危険箇所」「改善ポイント」に限定しています。*
