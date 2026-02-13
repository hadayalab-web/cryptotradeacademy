# Trap Defence BTC 実装仕様書 / 技術レポート

**作成日**: 2026-02-13  
**方針**: コードに存在する実装のみを記述。推測禁止。

---

## 1. 全体構造

### 1.1 主要コンポーネント一覧

| コンポーネント | ファイル | 役割 |
|----------------|----------|------|
| Cron（メイン） | `api/cron.js` | データ取得・AI解析・KV/Minimal payload書き出し・Regular/EMERGENCY配信 |
| Minimal配信 | `api/minimal-tg-delivery.js` | KV `minimal:btc:latest` を読み、6言語でTelegram配信 |
| BWE実行 | `api/buzzweave-run.js` | 1サイクル実行（引用リポスト投稿） |
| スロット生成 | `api/buzzweave-slots.js` | 日次400枠スロット生成 |
| メトリクス取得 | `api/x-metrics-fetcher.js` | `tweet_queue` 未処理から X API で metrics 取得 |
| X Webhook | `api/x-webhook.js` | イベント受信・`tweet_queue` 投入・エンゲージメント集計 |

### 1.2 Minimal / Regular の関係性

- **Minimal（無料版）**: `cron` が KV に `minimal:btc:latest` を書き出し、**別 Cron** `minimal-tg-delivery` が読み取り6言語Telegram配信。
- **Regular（有料版）**: `cron` 内で `formatRegularBriefing` によりメッセージ生成し、`cron` 内で直接Telegram配信。
- 配信時刻は意図的にずらしている: Regular は `0,6,12,18` 時の `:00`、Minimal は `0,6,12,18` 時の `:08`。

### 1.3 BWE（BuzzWeave Engine）との接続点

- **cron**: BWEとは直接連携しない。cron は Minimal/Regular の Telegram 配信のみ担当。
- **tweet_queue**: X Webhook が `tweet_create_events` 受信時に投入。BWE が X に投稿すると Webhook が発火し、その tweet_id が `tweet_queue` に入る。
- **x-metrics-fetcher**: `tweet_queue` の未処理を X API で取得し `tweet_metrics` に保存。BWE 投稿のメトリクス収集に使用。
- **BWE**: `td_post_slots` からスロットを取得し、X search/recent で候補収集 → GPT でコピー生成 → `postQuoteTweet` で投稿。`insertQuotedTweets` で引用履歴を記録。

---

## 2. データソース

### 2.1 外部 API

| API | 用途 | 取得データ |
|-----|------|------------|
| **CryptoQuant** | オンチェーン | `getExchangeInflow`: netflow (kBTC), `getMinerPositionIndex`: MPI |
| **CryptoQuant** | 深掘り | `getCQDeepMetrics`: whaleRatio, trapScore, kimchiPremium（KO）, liquidations（常に0）, riskReward, upbitPrice 等 |
| **CoinGecko** | 価格 | `fetchBtcPrice`: priceUsd, change24h |
| **Alternative.me** | センチメント | `fetchFearGreed`: value, label（Fear/Greed 等） |
| **Upbit**（KO市場時） | 価格 | `fetchBTCKRWPrice`, `fetchUSDKRWRate` |
| **X API** | 検索・投稿・メトリクス | search/recent, postQuoteTweet, getTweetMetrics |
| **OpenAI** | GPT | `analyzeCryptoQuantData`, `generateCryptoQuantAnalysis`, `generateNonUserImpactReport`, `generateXPost` |
| **Grok** | X解析 | `analyzeXSentimentLive`, `analyzeXSentimentHighResolutionCompat`, `analyzeMarket`, `diagnoseUserSentimentCompat` |
| **Gemini** | コンテンツ | `generateSosovalueStyleArticle` |

### 2.2 CQ / X / 3AI の統合ポイント（実装範囲）

- **CQ**: `inflow`, `mpi` を基本として使用。定期枠時は `getCQDeepMetrics` で `whaleRatio`, `trapScore` 等を追加取得。
- **X**: Grok が X 上の発言を解析し `whaleBias`, `retailFomo`, `newsImpact` を返す。高解像度版は複数クエリ並列（whale, retail, funding, ETF, liquidations）。
- **3AI**: GPT（CQ解析・トラップアラート）、Grok（Xセンチメント・Dr. Grok心理診断）、Gemini（SoSoValue風記事）が分離して呼ばれる。

---

## 3. Minimal Version（無料版）実装仕様

### 3.1 使用データ

- `inflow`, `mpi`, `priceUsd`, `change24h`
- `minimalTrapScore`（trapDetection.trapScore / cqDeep.trapScore / trap ヒューリスティック）
- `trapData`: `{ trapAlert, exchangeNetflow, whaleRatio }`
- `minimalMarketData`: `{ mpi, priceUsd, change24h, score }`
- `sentimentData`: `{ sentiment, risk }`（grokXAnalysis があれば使用）
- `market_score`（snapshot.market_score）
- `grokXAnalysis`（Grok X解析結果、あれば）

### 3.2 処理

- **cron**: 定期枠（`isRegularSlot`）時、`minimalPayload` を組み立て `kv.set("minimal:btc:latest", minimalPayload, { ex: 1200 })` で書き出し。
- **早期書き込み**: 基本データ取得直後に `earlyMinimalPayload` を KV に書き出し（AI解析失敗時でも Minimal 配信を確保）。
- **minimal-tg-delivery**: `kv.get("minimal:btc:latest")` で payload を取得し、各言語で `formatMinimal` を呼び出してテキスト生成後、`sendMessageToAsset` で Telegram 配信。

### 3.3 出力項目（Minimal テンプレート）

- Trap Score（/100）
- CQ Summary（inflow に基づく簡易説明）
- X Sentiment（表面レベル: Fear-dominant / Greed-dominant / Neutral / Sentiment silence）
- Macro Summary（固定: "Risk-off dominant; liquidity conditions tight"）
- Key Metrics: Price, Netflow, MPI, Sentiment
- Insight（trapScore に応じた文言）
- 文言: "This snapshot is intentionally incomplete; the full structural breakdown is available in the Regular Briefing."

### 3.4 省略されているロジック

- Dr. Grok の深層心理診断（Minimal では使用しない）
- 高解像度 CQ/X データ（深掘りは Regular 専用）
- GPT 定期解析（`gptRegularAnalysis` は Regular 用）
- Gemini SoSoValue 記事
- Trap Detector の詳細（trapScore のみ使用）
- missedOpportunities / nonUserImpactReport

### 3.5 レスポンス構造（minimal-tg-delivery）

```json
{
  "ok": true,
  "sent": <number>,
  "errors": <number>,
  "details": { "sent": [...], "errors": [...] }
}
```

---

## 4. Regular Briefing（有料版）実装仕様

### 4.1 Minimal との差分

| 項目 | Minimal | Regular |
|------|---------|---------|
| データ | 基本 CQ + trapScore のみ | CQ + 深掘り + 高解像度 X + GPT + Grok + Gemini |
| Dr. Grok | なし | 各言語ごとに `diagnoseUserSentimentCompat` 呼び出し |
| Trap Detector | trapScore のみ | 詳細（trapType, trapSeverity, trapAlert） |
| SoSoValue | なし | Gemini で SoSoValue 風記事生成 |
| missedOpportunities | なし | 計算して GPT で報道コンテンツ生成 |
| 配信 | 別 Cron | cron 内で直接送信 |

### 4.2 深層構造分析の処理内容（実装範囲）

- **getCQDeepMetrics**: whaleRatio（Exchange Whale Ratio）, trapScore（whaleRatio 等から計算）, kimchiPremium（KO）, riskReward, longTerm（nupl, sopr30d 等）。Liquidations は 404 のため常に 0。
- **高解像度 X**: `analyzeXSentimentHighResolutionCompat` で whale / retail / funding / ETF / liquidations の5クエリを並列実行し、`sentimentData` に統合。
- **Trap Detector**: `detectTrapDetection` が divergence, trapScore, trapType, trapSeverity を算出。`generateTrapAlert` でアラート生成。

### 4.3 Whale / Algo / Retail / Liquidity の扱い

- **Whale**: Grok の `whaleBias`（-1〜+1）、CQ の `whaleRatio`。trapDetector で `WHALE_RETAIL_DIVERGENCE` 等を検出。
- **Retail**: Grok の `retailFomo`（0〜100）。高解像度では `retailFomo` 専用クエリ。
- **Algo**: 高解像度の `fundingRates` クエリで derivatives センチメントを取得。trapType に `TREND_ACCELERATION` 等。
- **Liquidity**: `getLiquidations` は常に 0 を返す（CQ API 未提供）。risk/liquidation は高解像度 X の `liquidations` クエリで取得。

### 4.4 シナリオマップ生成ロジック

- 明示的な「シナリオマップ」生成関数は存在しない。
- `decideSignal` / `decideSignalAdvanced` が `signal`, `score`, `regime`, `confidence` を返す。
- `divergenceSignal`（`detectDivergenceHighResolution`）がダイバージェンスシグナルを返す。
- テンプレート側でこれらの値を組み合わせて表示。

### 4.5 Dr. Grok（心理分析）の実装箇所

- **呼び出し**: `api/cron.js` 内、Regular 配信ループ内で `diagnoseUserSentimentCompat` を言語ごとに呼び出し。
- **入力**: `marketData`（price_usd_display, change_24h, market_score, trapDetection, trapAlert, divergenceSignal）, `xSentiment`, `targetLang`。
- **出力**: `psychologicalState`（NEUTRAL/FOMO/FEAR/GREED/PANIC/EUPHORIA/CONFUSION）, `psychologicalRisk`, `psychologicalSupportLevel`, `psychologicalAdvice` 等。
- **ロジック**: `retailFomo`, `whaleBias`, `priceChange`, `trapDetection` から心理状態を推定。高リスクトラップ時はリスクレベルを上昇。

### 4.6 出力項目一覧（Regular テンプレート）

- BTC Price, change24h
- Exchange Netflow（inflow/outflow）
- Miners' Position Index
- Sentiment
- Market Score（解釈付き）
- Trap Detector（trapSeverity, trapScore, trapType）
- Trap Alert（recommendation, confidence）
- gptReporterAnalysis（GPT CQ解析）
- grokXAnalysis（Grok X解析）
- psychologicalSupport（Dr. Grok）
- sosovalueArticle（Gemini SoSoValue風記事）
- nonUserImpactReport（missedOpportunities に基づく報道）
- divergenceSignal
- highResCQ, highResX
- 市場別: trapScore, whaleFlows, liquidations（EN）, kimchiPremium, upbitPrice（KO）

---

## 5. 多言語パイプライン

### 5.1 実装言語

- `SUPPORTED_LANGS = ["en", "es", "pt-br", "ar", "ja", "ko"]`

### 5.2 翻訳処理

- 翻訳専用 API は呼んでいない。各言語用テンプレートファイルが存在し、テンプレート側で文言を言語別に出力。
- GPT/Grok/Gemini には `lang` または `targetLang` を渡して、各モデルに多言語生成を委譲。

### 5.3 テンプレート構造

- **Minimal**: `services/telegram/messages/user/<lang>/minimal-high-quality.<lang>.js`  
  - `formatMinimalBriefingOSv26` または `formatMinimalBriefing`
- **Regular**: `services/telegram/messages/user/<lang>/regular.<lang>.js`  
  - `formatRegularBriefing`
- **Emergency**: `services/telegram/messages/user/<lang>/emergency.<lang>.js`  
  - `formatTrapAlert`
- フォールバック: 読み込み失敗時は `en` を参照。

---

## 6. BWE との連携

### 6.1 cron → fetcher → queue → BWE の流れ

1. **cron**: BWE とは直接連携しない。Minimal payload を KV に書き出し、Regular/EMERGENCY を Telegram 配信。
2. **BWE**: `buzzweave-run`（毎分）が `runBuzzWeaveCycle` を実行。`td_post_slots` から次1時間のスロットを取得し、X search/recent で候補収集 → GPT でコピー生成 → `postQuoteTweet` で X に投稿。
3. **X Webhook**: 自アカウントの `tweet_create_events` を受信した際、`insertTweetQueue` で `tweet_queue` に投入。
4. **x-metrics-fetcher**: 5分ごとに `fetchUnprocessedQueue` で未処理を取得し、X API で `getTweetMetrics` を呼び、`insertTweetMetrics` で保存。`markQueueProcessed` で処理済みにする。

### 6.2 Minimal / Regular が BWE で使われる箇所

- **BWE の X 投稿**: `generateXPost` に `mode: slot.mode` を渡す。`slot.mode` は `regular` または `minimal`（スロット生成時の `MODE_WEIGHTS` で 70%/30%）。
- Minimal/Regular の Telegram 配信とは別経路。BWE は「引用リポスト」用の X 投稿のみ担当。

### 6.3 X 投稿の生成フロー（BWE）

1. `getTdPostSlotsInNextHour(langFilter)` でスロット取得
2. `collectBuzzCandidates` で X search/recent から候補収集
3. `pickBestBuzzCandidate` で最適候補を選択
4. `generateParasiticCopy` → `generateXPost` で GPT が投稿文を生成（mode=minimal/regular, buzzContext 付き）
5. `postQuoteTweet` で X に投稿
6. `insertBuzzweavePostLog`, `insertQuotedTweets`, `consumeTdPostSlot`, `insertTdCopyArchive`, `insertTdCopyMeta`, `insertXPost` で DB 更新

---

## 7. エラー処理 / フォールバック

### 7.1 実装されているエラーケース

| 箇所 | 挙動 |
|------|------|
| CryptoQuant 失敗 | p-retry でリトライ。取得失敗時は cron を早期 return |
| GPT 解析失敗 | `gptRegularAnalysis = null`。テンプレート側でフォールバック |
| Grok 高解像度失敗 | `analyzeXSentimentLive` にフォールバック |
| Grok Live 失敗 | xSentiment をデフォルト値のまま継続 |
| getCQDeepMetrics 失敗 | フォールバックで再試行。失敗時は基本データのみ |
| Minimal テンプレート読込失敗 | EN フォールバック |
| KV 書き込み失敗 | console.warn でログ、処理は継続 |
| tweet_queue insert 失敗 | 非 fatal としてログ、Webhook は 200 返却 |
| 認証失敗（cron） | 401 |
| ロック取得失敗（buzzweave-run） | 200, message: "Locked" |

### 7.2 フォールバックロジック

- GPT 解析: `finalAnalysis = gptRegularAnalysis || aiAnalysis`
- Minimal テンプレート: `en` の `formatMinimalBriefingOSv26` にフォールバック
- Regular テンプレート: `en` の `formatRegularBriefing` にフォールバック
- trapScore: `trapDetection.trapScore ?? cqDeep.trapScore ?? trap ヒューリスティック`
- whaleRatio: `cqDeep.whaleFlows.whaleRatio ?? highResCQData.whaleRatio ?? cqDeep.whaleRatio`

### 7.3 API 失敗時の挙動

- CQ/Price/FNG 取得失敗: `return res.status(200).json({ message: "No on-chain data, skipped." })`
- GPT 429: ログして次回リトライ
- GPT 5xx: フォールバックで継続
- Grok 失敗: デフォルト xSentiment で継続

---

## 8. 将来拡張ポイント（コードに存在する TODO 等のみ）

### 8.1 TODO コメント

| ファイル | 内容 |
|----------|------|
| `api/x-webhook.js` | フォローアップ投稿を実行する機能を追加 |
| `api/x-metrics-fetcher.js` | Vidalytics API（stub: 将来実装） |
| `api/cron.js` | メール送信先を環境変数またはデータベースから取得（将来実装） |
| `scripts/backtest/autoTuner.js` | より詳細な評価メトリクス（accuracy, precision, recall 等）を実装 |
| `services/api/sales.js` | データベースに保存、データベースから取得、実際のレート制限チェック |
| `services/gemini/imageGenerator.js` | Veo 3.1 API 呼び出しを実装 |
| `scripts/monitor_expected_vs_actual_realtime.js` | X API / Whop API / Telegram からの実測取得、アラート送信 |

### 8.2 予約されている構造（cron.js）

- `stats: null` — reserved
- `noTradeAlert: null` — 将来の実装用
- `trapRisk: null` — 将来の実装用
- `exitMap: null` — 将来の実装用
- `series = "BTC"` — 現在は BTC のみ、将来的に `OTHER` 等も対応可能

### 8.3 その他（コード内コメント）

- `services/x/client.js`: 画像としてアップロード（将来的に外部サービスで動画変換可能）
- `utils/queue.js`: 将来的に BullMQ 等の本格的なキューシステムに移行することを推奨
- `services/cryptoquant/capabilities.js`: 新しい 404 エンドポイント・新しいエンドポイント追加時のチェックロジック

---

## 付録: Cron スケジュール（vercel.json）

| パス | スケジュール |
|------|--------------|
| /api/cron | 0,7,22,37,52 * * * *（毎時 5 回） |
| /api/minimal-tg-delivery | 8 0,6,12,18 * * *（00:08, 06:08, 12:08, 18:08 UTC） |
| /api/x-metrics-fetcher | */5 * * * *（5 分ごと） |
| /api/buzzweave-slots | 0 15 * * *（毎日 15:00 UTC） |
| /api/buzzweave-run | * * * * *（毎分） |
