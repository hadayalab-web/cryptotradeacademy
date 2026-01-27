# X投稿戦略実装の最終レビュー結果
生成日時: 2026-01-27T02:45:46.813Z
モデル: gpt-5.2-2025-12-11

### 総合評価
- 実装品質: **B**
- 動作可能性: **中**
- 重大な問題: **有**
- 軽微な問題: **有**

---

### 発見された問題（優先度順）

#### P0: 重大な問題

1. **Webhook署名検証が「raw body」前提の仕様を満たしていない（本番で誤検知→401/イベント欠落）**
   - ファイル: **api/x-webhook.js**
   - 行番号: **概ね 90〜210（verifyWebhookSignature / POST handlerの署名検証部分）**
   - 問題:  
     実装コメントにもある通り、`timestamp + "." + raw_body` の **raw_body（受信した生のバイト列/文字列）** が必要です。現状は `JSON.stringify(req.body)` を使っており、キー順序・空白・エスケープ差分で **署名が一致しない** 可能性が高いです。  
     さらに `Buffer.from(signatureWithoutPrefix)` が **base64デコードではなく文字列バイト** になっており、比較対象も同様に「base64文字列のバイト列」比較になっています。長さ一致はしますが、仕様上は **HMAC結果（base64）同士の文字列比較**でも成立はします。ただし raw body 問題が致命的です。
   - 影響:  
     本番でWebhookイベントが **401** になり、いいね/RT/リプライの集計が欠落。戦略の自動最適化・スコアリングが破綻します。
   - 修正案:  
     - **raw bodyを取得**できるようにする（Vercel/NextのAPI Routesなら `bodyParser: false` + 自前でストリーム読み取り、またはフレームワークに応じた rawBody 取得ミドルウェア）。
     - `verifyWebhookSignature(signature, rawBody, timestamp)` に **rawBody（文字列）** を渡す。
     - 署名比較は「`sha256=`プレフィックス除去後の **base64文字列同士** を timingSafeEqual」でOK。より厳密にするなら `Buffer.from(x, 'base64')` 同士で比較。
     - 追加で **timestampの許容ウィンドウ**（例: ±5分）を導入し、リプレイ攻撃を抑止。

2. **xApiRequest のタイムアウト/AbortControllerがリトライと整合していない（2回目以降が即Abort/タイムアウトが1回しか設定されない）**
   - ファイル: **services/x/client.js**
   - 行番号: **概ね 70〜190（xApiRequest内のAbortController/timeoutId/forループ）**
   - 問題:  
     `AbortController` と `timeoutId` を **forループの外で1回だけ作成**しています。  
     - 1回目でタイムアウト→abortされた `signal` は以降の試行でも **既にabort済み** のため、リトライが即失敗し得ます。  
     - `clearTimeout(timeoutId)` をリトライ前に呼んでいますが、**次の試行用のタイマーを再設定していない**ため、2回目以降はタイムアウトが効きません。
   - 影響:  
     リトライが機能しない/逆に無制限待ちになるなど、安定性が落ちます。Cron 60秒制限にも悪影響。
   - 修正案:  
     - **各attemptごとに** `AbortController` と `timeoutId` を作る（tryの直前で生成し、finallyでclear）。  
     - もしくは `fetchWithTimeout()` を作って `xApiRequest` から呼ぶ。

3. **OAuth 1.0a署名にクエリが含まれないケースが残っている（searchTweets等で署名不一致の可能性）**
   - ファイル: **services/x/client.js**
   - 行番号: **概ね 95〜150（requestData/data/url構築） + searchTweets（200〜260）**
   - 問題:  
     P0修正は「`options.params` を data に入れる」ですが、`searchTweets()` は `xApiRequest(`/tweets/search/recent?${params.toString()}`)` のように **URLに直書き**しており `options.params` を使っていません。  
     oauth-1.0a は `requestData.url` にクエリが含まれていてもライブラリ側で拾う実装もありますが、挙動依存になりやすく、今回の修正方針（paramsをdataで渡す）と不整合です。
   - 影響:  
     エンドポイントによって **署名が通ったり通らなかったり**する不安定状態。特に検索系は頻繁に使うので影響大。
   - 修正案:  
     - `xApiRequest` を「`endpoint` はパスのみ、クエリは `options.params` に統一」する。  
       例: `xApiRequest('/tweets/search/recent', { params: Object.fromEntries(params) })` のように統一。  
     - もしくは `xApiRequest` 内で `baseUrl` からクエリをパースして署名パラメータに必ず含める（URL直書きにも対応）。

4. **vercel.json が不正（functionsキーが重複しており、片方が上書きされる）**
   - ファイル: **vercel.json**
   - 行番号: **全体**
   - 問題:  
     JSONで同一キー `"functions"` が2回出てきます。後勝ちで上書きされるため、最初の `"api/**/*.js": { "runtime": "nodejs18.x" }` が消える可能性があります。
   - 影響:  
     Node 18固定が効かない/一部関数の設定が欠落し、FormDataやfetch挙動が環境依存になる恐れ。
   - 修正案:  
     `"functions"` を1つに統合して、glob設定と個別maxDurationを同じオブジェクトに入れる。

---

#### P1: 重要な問題

1. **postTracker.savePostId() を「失敗しても継続」にしたのに、呼び出し側が致命扱いしている（仕様不一致）**
   - ファイル: **api/x-quote-repost.js**
   - 行番号: **概ね 520〜590（savePostId後のcatchでthrowしている箇所）**
   - 問題:  
     P0修正方針は「KV失敗は警告に落として継続」なのに、引用リポスト側で `savePostId` 失敗を **CRITICALとしてthrow** しています。  
     しかも `savePostId` は失敗時に `false` を返す設計で、基本的にthrowしません（validate以外）。このため「失敗検知」がズレます。
   - 影響:  
     投稿自体は成功しているのに、ハンドラが失敗扱い→再実行→重複投稿リスク/運用判断ミス。
   - 修正案:  
     - `const saved = await savePostId(...); if (!saved) warnして継続` に統一。  
     - どうしても致命にしたいなら、P0方針を撤回して `savePostId` をthrow設計に戻す（ただし今回の要件と逆）。

2. **重複投稿防止がO(N)×投稿回数で高コスト（KV読み出しが毎回・全件走査）**
   - ファイル: **api/x-quote-repost.js**
   - 行番号: **概ね 330〜380（duplicate_check）**
   - 問題:  
     `getPostsForLastNDays(1)` が「日別配列を取得→全件push→someで走査」。インフルエンサーごとにこれをやると、投稿数が増えるほど遅くなります。
   - 影響:  
     Cron 60秒制限に近づきやすい。KVコスト増。タイムアウト増。
   - 修正案:  
     - 1件tweetIdごとに `x:dedupe:quote:${lang}:${influencerTweetId}` のような **専用キー** を `SET NX EX 86400` 相当で作る（KVが対応するなら）。  
     - 少なくとも「言語処理の最初に1回だけ recentPosts を取得してメモリに載せ、ループ内はSetで判定」。

3. **ログ設計：runId/stepが“全ログ”に付いていない（client.js等が未対応）**
   - ファイル: **services/x/client.js**, **api/x-webhook.js**, **api/x-quote-repost.js**
   - 行番号: **多数**
   - 問題:  
     quote-repost側はrunId/stepがかなり入っていますが、`xApiRequest` のログには runId が入らず、Webhook側も runId がありません。  
     追跡したいのは「このrunIdの投稿が、どのHTTPリクエストで、どのtweetIdを返したか」なので、境界（APIクライアント）にrunIdを渡せないとトレースが途切れます。
   - 影響:  
     障害解析で「どの投稿がどの失敗に対応するか」が追えない。
   - 修正案:  
     - `xApiRequest(endpoint, options, maxRetries, ctx)` のように `ctx={runId, step}` を渡し、ログに必ず含める。  
     - もしくは `options.headers['x-run-id']` 的に内部伝播（外部送信は不要、ログ用に保持）。

4. **package.json に不要/危険な依存（cryptoパッケージ）**
   - ファイル: **package.json**
   - 行番号: **dependencies.crypto**
   - 問題:  
     Node標準の `crypto` があるのに、`"crypto": "^1.0.1"` を依存に入れるのは混乱の元です（古いポリフィル系で、意図せず解決されると事故る）。
   - 影響:  
     依存解決の不確実性、脆弱性/互換性リスク。
   - 修正案:  
     `crypto` 依存を削除（コードはすでに `require("crypto")` で標準を使っている）。

---

#### P2: 軽微な問題

1. **utils/common.normalizeLang が replaceAll 前提（Node18ならOKだが、念のため互換性コメント/代替があると良い）**
   - ファイル: **utils/common.js**
   - 行番号: **normalizeLang**
   - 問題:  
     Node18固定なら問題ないが、将来の実行環境変更時に落ちる可能性。
   - 影響: 小
   - 修正案:  
     `replaceAll` を `split('_').join('-')` にするか、Node18固定を明確化（vercel.json修正が前提）。

2. **WebhookのアクセスログがKVに大量に溜まる設計（コスト/ノイズ）**
   - ファイル: **api/x-webhook.js**
   - 行番号: **logWebhookAccess**
   - 問題:  
     全リクエストを7日保存は、イベント量が増えるとKVコストが上がります。
   - 影響: 中（運用コスト）
   - 修正案:  
     本番はサンプリング（例: 1%）か、エラー時のみ保存、または日次集計にする。

---

### 推奨される改善点

- **Webhook署名検証を“raw body取得”込みで完成させる**（最優先）。加えて timestampのリプレイ耐性も入れる。
- **xApiRequestのタイムアウト/リトライを正しく**：attemptごとにAbortController生成、タイマー再設定、finallyで必ずclear。
- **OAuth署名パラメータの扱いを統一**：URL直書きを禁止し `options.params` に寄せる（searchTweets等を修正）。
- **KVトラッキング方針の一貫性**：`savePostId` を非致命にするなら呼び出し側も非致命に。致命にするなら関数設計を戻す。
- **vercel.jsonの重複キー解消**：Node18固定とmaxDurationが確実に反映される状態にする。
- **依存整理**：`crypto`削除。

---

### 結論
現状は「投稿自体」はかなりの確度で動きそうですが、**Webhook署名検証（raw body未対応）**と **xApiRequestのタイムアウト/リトライ不整合**、そして **vercel.jsonの重複キー**が、運用本番で致命傷になり得ます。  
この3点を直せば、P0/P1で挙げた“戦略の観測可能性・安定性・セキュリティ”が揃い、最終仕上げとして十分な品質（A寄り）に到達できます。

---

## レビュー対象ファイル

- services/x/client.js
- api/x-webhook.js
- services/x/postTracker.js
- api/x-quote-repost.js
- utils/common.js
- services/x/config.js
- package.json
- vercel.json
