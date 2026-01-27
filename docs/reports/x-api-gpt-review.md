# X API関連コードレビュー結果
生成日時: 2026-01-27T02:18:25.631Z
モデル: gpt-5.2-2025-12-11

# X API関連コードレビュー結果

## 総合評価
- 正常に動作する可能性: **中（ただし「投稿0件」の症状は再現し得る）**
- 重大な問題: **有**
- 軽微な問題: **有**

---

## 発見された問題

### P0: 重大な問題（即座に修正が必要）

1. **OAuth 1.0a署名がクエリ文字列を含まないため、GET/一部POSTが401になり得る**
   - ファイル: `services/x/client.js`
   - 行番号: **xApiRequest内の署名生成付近（requestData = { url, method } の箇所）**
   - 問題: OAuth 1.0aの署名ベース文字列は **クエリパラメータも含めて** 生成する必要があります。現状は `url` にクエリを連結しているだけで、`oauth-1.0a` に `data` を渡していません（`authorize({url, method, data}, token)` の `data` が無い）。
   - 影響:  
     - `GET /2/tweets/:id?tweet.fields=...` など **params付きGETが401/403** になり得る  
     - メトリクス取得や検索系が落ち、上位の処理が「投稿スキップ」扱いになっていると **投稿0件** に繋がる
   - 修正案:
     - `requestData` に `data` を渡す（GETならparams、POSTならbodyのフィールド）  
     - もしくは **URLにクエリを付けず** `data` に渡して署名させ、fetch側でURLを組み立てる
     ```js
     const requestData = { url: `${X_API_BASE_URL}${endpoint}`, method, data: options.params };
     const authHeader = oauth.toHeader(oauth.authorize(requestData, token));

     // fetch用URLは params を付与
     const url = buildUrl(requestData.url, options.params);
     ```
     - POST JSONの場合も、OAuth1.0a署名にbodyを含めるかはAPI仕様/ライブラリ流儀に依存しますが、少なくとも **GET paramsは必須** です。

2. **`fetch` / `FormData` がNode実行環境で未定義の可能性（Vercel Node runtime次第）**
   - ファイル: `services/x/client.js`
   - 行番号: `xApiRequest` の `fetch(...)`、`uploadMedia` の `new FormData()`
   - 問題: Node 18+ なら `fetch`/`FormData` は概ね利用可能ですが、実行ランタイムが古い/設定が違うと落ちます。`FormData` は特に環境差が出やすいです。
   - 影響: 実行時例外で **投稿処理が開始直後に落ちる**（Cronは動いているが投稿0件、に一致）
   - 修正案:
     - Node runtimeを **18/20固定**（Vercelなら `engines` と `vercel.json`/Project settings確認）
     - 互換性のため `undici` を明示導入し `fetch, FormData` を確実化する

3. **Webhook署名検証が仕様不一致の可能性が高く、セキュリティ的に危険（検証スキップも含む）**
   - ファイル: `api/x-webhook.js`
   - 行番号: `verifyWebhookSignature`
   - 問題:
     - X(Twitter)のAccount Activity APIの署名検証は、一般に **ヘッダ名/署名形式が固定** で、単純な `${timestamp}.${body}` HMAC ではない可能性が高いです（実装コメントにも「注意」とある）。
     - さらに `X_API_CONSUMER_KEY_SECRET` が無いと **常にtrue** で通すのは本番では危険。
   - 影響:
     - Webhookが正しく検証できず **イベントが捨てられる/偽装を受ける**
     - ただし「投稿0件」直接原因ではないが、運用上P0
   - 修正案:
     - 公式仕様に合わせて実装（少なくとも **本番では検証スキップ禁止**）
     - 署名ヘッダ名（例: `x-twitter-webhooks-signature` 等）と比較方式を仕様通りに

4. **`postTracker.savePostId()` がKV必須で「投稿自体は成功しても」後段で致命的に落ちる設計**
   - ファイル: `services/x/postTracker.js`
   - 行番号: `savePostId` 全体（特に `testKvConnection()` を必ず実行）
   - 問題: KVが一時的に不調/未設定だと `savePostId` が例外を投げ、上位がそれを「投稿失敗」と扱うと、**実際にはXに投稿できていても**「0件」扱い・カウントも進まない、が起こり得ます。
   - 影響:
     - 「X APIクレジット減ってない」なら投稿自体が失敗している可能性が高いが、逆に「投稿はされてるのに内部は0件」も起こり得る
   - 修正案:
     - 投稿の成否とトラッキングの成否を分離  
       - 投稿成功 → `savePostId` 失敗は **warnに落として継続**（再試行キューに積む等）
     - `testKvConnection()` を毎回やるのは重いので、起動時/一定間隔にする

---

### P1: 重要な問題（早急に修正推奨）

1. **`xApiRequest` のリトライロジックが「catchで即throw」になっており、429以外は実質リトライしない**
   - ファイル: `services/x/client.js`
   - 行番号: `for (attempt...) { try { ... } catch { ... throw } }` のcatch節
   - 問題: catch内で `attempt < maxRetries` でも 429以外は即throwしており、ネットワーク瞬断等でリトライしません。
   - 影響: 一時的障害で投稿が落ちやすい
   - 修正案:
     - 429以外でも `ECONNRESET`/`ETIMEDOUT`/5xx はリトライ対象にする
     - `throw` はループ外に集約

2. **タイムアウトが無い（fetchがハングするとCron枠を食い続ける）**
   - ファイル: `services/x/client.js`
   - 行番号: `fetch(...)` 全般
   - 問題: AbortController等が無い
   - 影響: Cronは走るが処理が詰まり、次の実行と競合→投稿0件/重複/レート制限誘発
   - 修正案:
     - `AbortController` で 10〜30秒程度のタイムアウトを設定

3. **`X_API_BASE_URL` デフォルトが `https://api.x.com/2` だが、環境によっては `api.twitter.com` が必要**
   - ファイル: `services/x/client.js`
   - 行番号: `X_API_BASE_URL` 定義
   - 問題: 現状 `api.x.com` が通る環境もありますが、互換性/実績として `https://api.twitter.com/2` の方が無難なケースがあります（特に古いSDK/ネットワーク制限下）。
   - 影響: DNS/到達性で失敗→投稿0件
   - 修正案:
     - まずは環境変数で明示固定し、疎通確認
     - 可能なら `api.twitter.com` をデフォルトに寄せる

4. **`x-quote-repost.js` のテンプレートが「外部リンク2つ」になっており、仕様/運用方針と矛盾**
   - ファイル: `api/x-quote-repost.js`
   - 行番号: FALLBACKテンプレート（`whopLink` と `deepLink` を同時に入れている箇所）
   - 問題: コメントでは「外部リンクは1投稿1個以内」とあるが、実際は **Whop + Telegram** の2リンクになっています。
   - 影響:
     - スパム判定/配信抑制のリスク（投稿自体は成功してもインプレッションが死ぬ）
     - ただし「投稿0件」の直接原因ではない
   - 修正案:
     - どちらかを削る/日替わりで片方だけにする
     - どうしても両方入れるなら片方はプロフィール誘導にする等

---

### P2: 軽微な問題（改善推奨）

1. **`parseBoolean` が複数ファイルに重複**
   - ファイル: `api/x-quote-repost.js`, `services/x/config.js`
   - 問題: 実装差分が出ると事故る
   - 修正案: 共通utilへ

2. **`normalizeLang` が `replace('_','-')` で1箇所しか置換しない**
   - ファイル: `api/x-quote-repost.js`
   - 問題: `pt_br_extra` のようなケースで崩れる
   - 修正案: `replaceAll('_','-')`

3. **ログに機密の有無は出していないが、運用上は「認証情報の存在」も環境によっては情報漏えい扱い**
   - ファイル: `services/x/client.js`
   - 問題: `hasAccessToken: true/false` を常時出す
   - 修正案: 本番はdebugフラグ時のみ

4. **`shouldPostQuoteRepost` が「createdAtが無効/5分以内なら無条件true」**
   - ファイル: `services/x/optimization.js`
   - 影響: 同一ツイートへの連投/重複投稿の温床（KVで防いでいないと危険）
   - 修正案: 「同一tweetIdに対して投稿済みか」を必ずチェック（KVキーでtweetId単位のdedupe）

---

## 各ファイルの詳細レビュー

### `services/x/client.js`
- 評価: ログと400/429の観測性は良いが、**OAuth署名の作り方が最重要で危険**。タイムアウト無しも運用上つらい。
- 問題:
  - P0: OAuth署名にparamsが入っていない可能性
  - P0: fetch/FormDataのランタイム依存
  - P1: リトライが実質429専用
  - P1: タイムアウト無し
- 推奨事項:
  - 署名生成を「params/bodyを含める」形に修正
  - AbortController導入
  - 5xx/ネットワーク例外をリトライ対象へ
  - `X_API_BASE_URL` の到達性を `api.twitter.com` で検証

### `api/x-quote-repost.js`
- 評価: runId/step設計の方向性は良い（ただし提示コードが途中で切れているため、実際にrunIdが全ログに付与されているかは要実物確認）。
- 問題:
  - テンプレートが長文化・リンク2つになりがち（運用リスク）
  - `QUOTE_REPOST_TEMPLATES` と `FALLBACK...` の優先順位/例外時フォールバックが確実か要確認
- 推奨事項:
  - 「投稿実行直前」に `getXConfigStatus()` の `postingEnabled/dryRun` を必ずログ
  - `postQuoteTweet` の戻り値（tweet id）を必ずログし、KV保存失敗と分離

### `services/x/config.js`
- 評価: シンプルで良い
- 問題: parseBoolean重複
- 推奨事項: util化、`postingEnabled` を false にした時のログを上位で必ず出す

### `api/x-webhook.js`
- 評価: KV保存や集計の方向性は良い
- 問題:
  - P0: 署名検証が仕様不一致の可能性 + 検証スキップ
- 推奨事項:
  - 本番は検証必須
  - 受信ボディの「生文字列」を使う必要がある（JSON parse後だと署名一致しない）点も要注意

### `services/x/optimization.js`
- 評価: ログが多くデバッグしやすい
- 問題:
  - 投稿許可が緩すぎて重複/スパム化しやすい
- 推奨事項:
  - tweetId単位のdedupe（24h）を必須化
  - ピーク時間ロジックと「数撃て」方針の整合を取る

### `services/x/influencerStock.js` / `services/x/influencerRotation.js`
- 評価: KV前提の設計としては妥当
- 問題:
  - KVが無いと機能停止（投稿0件の原因になり得る）
- 推奨事項:
  - KVが無い場合のフォールバック（静的リスト等）を用意するか、起動時に明確にfail-fast

### `services/x/postTracker.js`
- 評価: バリデーションは良いが、**KVを致命扱いにしすぎ**
- 問題:
  - P0: 投稿成功後に落ちる可能性
  - 毎回 `testKvConnection` はコスト高
- 推奨事項:
  - 投稿とトラッキングを分離
  - 接続テストは起動時/ヘルスチェックに寄せる

### `services/x/metrics.js`
- 評価: リトライとエラーメッセージは良い
- 問題:
  - 根本の `xApiRequest` 署名問題があると全部失敗する
- 推奨事項:
  - 401/403時は即座に「署名/権限/プラン」疑いをログに出す

---

## 動作確認チェックリスト
- [ ] X API認証が正しく動作するか（**params付きGETで401にならないか**）
- [ ] 投稿機能が正しく動作するか（`POST /2/tweets` のレスポンスに tweet id が返るか）
- [ ] Webhook処理が正しく動作するか（CRC応答・署名検証が仕様通りか）
- [ ] エラーハンドリングが適切か（KV失敗で投稿全体を失敗扱いにしないか）
- [ ] ログ出力が適切か（runId/stepが全ログに付与され、dryRun/disabledが明示されるか）
- [ ] 非同期処理が正しく実装されているか（fetchタイムアウト、リトライ方針）
- [ ] ランタイムで `fetch/FormData` が利用可能か（Node 18/20固定）

---

## 推奨される修正アクション（優先順位順）

1. **P0: `xApiRequest` のOAuth署名に `options.params` を含める修正**（最優先）
2. **P0: 実行ランタイムをNode 18/20に固定し、fetch/FormDataの互換性を担保**
3. **P1: fetchにタイムアウト（AbortController）導入**
4. **P1: 5xx/ネットワーク例外のリトライ追加（429以外も）**
5. **P0/P1: `postTracker` を「投稿成功と独立」させ、KV障害で投稿全体を失敗にしない**
6. **P0: Webhook署名検証を公式仕様に合わせ、本番でスキップしない**
7. **P2: quoteテンプレの外部リンクを1つに制限（運用最適化）**
8. **P2: parseBoolean等の共通化、normalizeLang改善**

---

## 結論
現状の症状（Cronは動くが投稿0件、クレジットも減らない）から最も疑わしいのは、`services/x/client.js` の **OAuth 1.0a署名生成がクエリパラメータを含まず不正になっている**点です。これがあると、メトリクス取得や検索など「投稿前段」が401/403で落ち、上位がスキップ扱いにして投稿が実行されない、という流れが起きます。次点で、Nodeランタイム差による `fetch/FormData` 未定義、タイムアウト無しによるハングも「投稿0件」を作れます。

まずは **(1) OAuth署名修正** と **(2) ランタイム固定** を入れ、`POST /2/tweets` の成功レスポンス（tweet id）を runId付きで必ずログに出すところまで到達させるのが最短です。必要なら `postQuoteTweet` の実装も提示してください（そこに「Assignment to constant variable」の再発源が残っている可能性があります）。
