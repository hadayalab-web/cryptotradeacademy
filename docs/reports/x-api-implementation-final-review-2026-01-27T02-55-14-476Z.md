# X投稿戦略実装の最終レビュー結果
生成日時: 2026-01-27T02:55:14.477Z
モデル: gpt-5.2-2025-12-11

### 総合評価
- 実装品質: **B**
- 動作可能性: **中**
- 重大な問題: **有**
- 軽微な問題: **有**

---

### 発見された問題（優先度順）

#### P0: 重大な問題

1. **Webhook署名検証が「raw body」前提を満たしておらず、本番で正しく検証できない可能性が高い**
   - ファイル: `api/x-webhook.js`
   - 行番号: **verifyWebhookSignature周辺 / POSTハンドラで body を JSON.stringify(req.body) している箇所（概ね 60〜200行台）**
   - 問題:  
     XのWebhook署名は **`timestamp + "." + raw_body`**（受信した生のボディ文字列）でHMACする必要があります。現状は `JSON.stringify(req.body)` を使っており、**キー順序・空白・エスケープ差分**で署名が一致しません。コメントでも認識されていますが、**本番必須化した以上、ここが未実装だと本番で401連発→Webhookが機能停止**します。
   - 影響:  
     本番でWebhookイベントが受理できず、エンゲージメント追跡・バズ検知・インフルエンサー集計が破綻。
   - 修正案:  
     - **Vercel Node Serverlessで raw body を取得**する実装に切り替える。  
       例（Next.js API Routeなら `config = { api: { bodyParser: false } }` でストリーム読み取り）ですが、現状は `api/*.js` のVercel Functionsなので、**reqをストリームとして読み取って rawBody を作る**実装に変更してください。  
     - 署名検証は `rawBody` をそのまま使い、`JSON.stringify` は禁止。
     - 併せて `content-type` が `application/json` 以外のケースも拒否/ログ化。

2. **OAuth 1.0a署名：GETのクエリを `data` に入れる方式がライブラリ挙動次第で不整合になり得る（特に baseUrl と finalUrl の扱い）**
   - ファイル: `services/x/client.js`
   - 行番号: **xApiRequestのURL構築〜requestData生成（概ね 60〜150行台）**
   - 問題:  
     「二重計上回避」の意図は正しい一方で、`oauth-1.0a` は **`url` に含まれるクエリ**も **`data`** も署名ベース文字列に取り込む実装が一般的です。あなたの実装は `url: baseUrl(クエリ無し)` + `data: params` で統一していますが、**実際に送るURLは finalUrl(クエリ有り)**。  
     多くの実装ではこれで一致しますが、X側の検証が「実際のURLのクエリ」を前提にしている場合、**署名不一致**が起きます（特に同名キー、配列、エンコード差異、順序差異があると顕在化）。
   - 影響:  
     `searchTweets` 等のGETが **401/403** になり得る。P0修正の目的（GET署名にクエリを含める）が逆に不安定化するリスク。
   - 修正案:  
     - 最も堅いのは **`requestData.url` に finalUrl（クエリ付き）を渡し、`data` は undefined** にする方式（=「URLにクエリを含める」一本化）。  
       ただし二重計上が怖いなら、**ライブラリの仕様を確認してテスト**（固定パラメータで署名文字列をログ出し、Xで通ることを検証）してください。
     - いずれにせよ、**署名対象と実送信URLを一致**させるのが原則です（今は一致していない）。

3. **`postTracker.savePostId()` が実行時エラーになる（スコープ外変数 `existingList` を参照）**
   - ファイル: `services/x/postTracker.js`
   - 行番号: **savePostIdの末尾ログ（概ね 90〜170行台）**
   - 問題:  
     `existingList` は `try { ... } catch { ... }` のブロック内で `let existingList = ...` と宣言されています。ブロック外の最後で `existingList` を参照して `totalCount` を計算しているため、**ReferenceError** になります。  
     コメントに「未定義変数existingを削除」とありますが、実際には `existingList` が未定義になっています。
   - 影響:  
     投稿後のトラッキング処理で例外→呼び出し側が想定している「非致命」にならず、**処理が落ちる**可能性。少なくともログが壊れます。
   - 修正案:  
     - `existingList` を `savePostId` の外側スコープで `let existingList = null;` と宣言してから更新する  
       もしくは `totalCount` ログ自体を削除し、`listKey` 更新成功時のみ出す。

4. **Webhookのイベント保存キーが高カーディナリティでKVコスト/容量を圧迫しやすい**
   - ファイル: `api/x-webhook.js`
   - 行番号: **handleLikeEvent/handleRetweetEvent/handleReplyEvent（概ね 120〜260行台）**
   - 問題:  
     `x:webhook:like:${tweetId}:${Date.now()}` のようにイベントごとにキーを増やす設計は、バズ時に**大量キー生成**→KVコスト増・読み出し困難・運用不可になりがちです。
   - 影響:  
     バズ検知したい局面ほどKVが膨張し、障害/課金増/遅延の原因。
   - 修正案:  
     - 生イベントは保存しない（またはサンプリング/上限）  
     - 代わりに `stats` を **原子的インクリメント**（KVが対応するなら `incr` 系）  
     - どうしても保存するなら、**1ツイートあたり1日1キーにまとめて配列追記**ではなく、**別ストレージ**（ログ基盤）へ。

---

#### P1: 重要な問題

1. **ログに絵文字が混在し、機械解析（Vercel logs→CSV/Issue化）でノイズになりやすい**
   - ファイル: `services/x/client.js`, `api/x-webhook.js`, `api/x-quote-repost.js`
   - 行番号: 多数
   - 問題:  
     追跡性は上がっていますが、絵文字・自由形式ログが多く、後段の解析が難しくなります。
   - 影響:  
     障害解析・集計・アラートが不安定。
   - 修正案:  
     - 重要ログは **JSON構造化**（`{level, runId, step, event, ...}`）に統一  
     - 人間向けログ（絵文字）は `debug` のみに限定

2. **`xApiRequest` のリトライ判定が `error.message` 依存で脆い**
   - ファイル: `services/x/client.js`
   - 行番号: **catch節（概ね 170〜240行台）**
   - 問題:  
     Nodeのfetchエラーは環境によりメッセージが変わります。`ECONNRESET` 等が `cause` に入る場合もあり、`message includes` は取りこぼしが出ます。
   - 影響:  
     リトライされるべきネットワーク障害が単発失敗になる。
   - 修正案:  
     - `error.cause?.code` や `error.code` を優先  
     - `AbortError` はOK  
     - 可能なら `p-retry` を使い、判定関数を一元化

3. **`getTrends` のOAuth署名がP0方針（クエリはparamsへ）と不整合**
   - ファイル: `services/x/client.js`
   - 行番号: **getTrends（概ね 330行台）**
   - 問題:  
     `requestData.url` に `?id=${woeid}` を含めています。`xApiRequest` 側では「endpointに?禁止」方針にしたのに、ここは例外。署名の一貫性が崩れます。
   - 影響:  
     将来の共通化/修正で壊れやすい。署名不一致の温床。
   - 修正案:  
     - `getTrends` も `xApiRequest` 相当の共通関数に寄せる  
     - v1.1用 `xApiRequestV1` を作り、`params` 方式に統一

4. **`api/x-quote-repost.js` が60秒制限に対して待機（15分/5分/1分）を含み、実運用ではほぼタイムアウトする**
   - ファイル: `api/x-quote-repost.js`
   - 行番号: **postQuoteRepostsForLang内の `setTimeout(900000)`、handler内の待機（多数）**
   - 問題:  
     Vercel Function maxDuration=60 なのに、言語ループ内で15分待機などが残っています（後半でタイムアウト回避ロジックもありますが、前半の `postQuoteRepostsForLang` 内 15分待機が致命的）。
   - 影響:  
     Cronがタイムアウト→途中投稿/重複/不整合。
   - 修正案:  
     - **待機を関数内でしない**。Cronは「1回=1投稿」または「1回=1言語1投稿」に分割  
     - レート制限は **次回Cronに委譲**（KVに次回実行可能時刻を保存）

---

#### P2: 軽微な問題

1. **`utils/common.normalizeLang` が `replaceAll` 依存（Node18ならOKだが、古い環境で落ちる）**
   - ファイル: `utils/common.js`
   - 行番号: **normalizeLang**
   - 問題:  
     Node18固定なので実害は小さいが、ローカル環境差で落ちる可能性。
   - 影響:  
     開発者体験の低下。
   - 修正案:  
     `replace(/_/g, '-')` にして互換性を上げる（任意）

2. **`services/x/client.js` の `Content-Type: application/json` を常に付与（GETでも）**
   - ファイル: `services/x/client.js`
   - 行番号: **headers構築**
   - 問題:  
     GETにContent-Typeは不要。X側で問題にならないことが多いが、プロキシや署名検証周辺でノイズ。
   - 影響:  
     低いが、将来の不具合要因。
   - 修正案:  
     `method !== 'GET' && bodyあり` のときだけ付与

---

### 推奨される改善点

- **Webhook署名検証をraw bodyで完全実装**（最優先）。これが通らないと本番運用価値が大きく落ちます。
- **OAuth署名の「署名対象URL」と「実送信URL」を一致**させ、GET署名の方式を一本化（テスト付き）。
- **Vercel 60秒制限に合わせてCron設計を分割**（待機を排除）。KVで「次回投稿可能時刻」「投稿済み」だけ管理。
- **postTrackerのReferenceError修正**（即時）。
- ログは「人間向け」と「機械向け」を分離し、重要イベントは構造化JSONに統一（runId/stepは良いので維持）。

---

### 結論
P0で入れた方向性（GET署名にクエリを含める、Webhook署名検証必須化、タイムアウト/リトライ、runId/stepログ、KV失敗の非致命化）は正しいです。ただし現状は **Webhook署名のraw body未対応** と **postTrackerの実行時エラー** が致命傷で、さらに **Cronの待機設計がVercel制限と衝突**しています。これら3点を直せば、動作可能性は「高」まで引き上げられます。

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
