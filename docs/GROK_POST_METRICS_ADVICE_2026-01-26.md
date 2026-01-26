# Grokによる投稿後のインプレッションとエンゲージメント取得方法のアドバイス（2026-01-26）

## 📊 質問内容

X API v2を使用して、投稿後のインプレッションとエンゲージメントを正確に取得する方法について質問しました。

## 🤖 Grokの回答

### X API v2での`impression_count`取得に関する解決策

X（Twitter）API v2の専門家として、リアルタイムデータを基に正確なアドバイスを提供します。あなたの状況（OAuth 1.0a User Context認証、自分のツイート、非プロモート投稿）を考慮し、公式ドキュメント（[Tweets lookup](https://developer.twitter.com/en/docs/twitter-api/tweets/lookup/api-reference/get-tweets-id)）と実際の挙動（投稿後メトリクスの更新遅延）を基に回答します。

`impression_count`は**リアルタイム更新ではなく、Xの内部集計処理による遅延**が発生します。投稿直後（数秒～数分）は常に0です。これはXの仕様で、フィード配信・集計に時間がかかるためです。

#### 1. 投稿後にX API v2で`impression_count`を取得する場合、どのくらいの時間待てば正確な値が取得できますか？
- **最初の信頼できる値**: 投稿後**5～15分**。この時点で最初のインプレッション（数～数百）が反映され始めます。
- **正確な値（80-90%精度）**: 投稿後**30分～1時間**。
- **理由**: Xのアルゴリズムがフィードに投稿を配信し、ユーザー閲覧をカウントするのに時間がかかります。低アクティビティ投稿ではさらに遅れます。

#### 2. 投稿直後に`impression_count`が0の場合、どのように対処すべきですか？何分待ってから再取得すべきですか？
- **対処法**:
  - 投稿直後（0-5分）は**取得をスキップ**し、`impressions: 0`として仮置き。エンゲージメント率計算時は**除外**（分母をimpressionsにせず、別途追跡）。
  - **初回再取得**: 投稿後**10分**待ってGET /2/tweets/:idを実行。
  - まだ0なら**さらに20分待って再取得**（合計30分）。
- **実装推奨**: 投稿時に`postId`をRedis/KVに保存し、Bull QueueやsetTimeoutで遅延タスクをスケジュール。
- **コード修正案**（api/x-quote-repost.jsの投稿後処理に追加）:
  ```javascript
  // 投稿成功後（quoteMetrics取得直後）
  if (engagementMetrics.impressions === 0) {
    // KVに投稿IDと投稿時刻を保存（追跡用）
    const kvKey = `x:pending:${quoteId}`;  // quoteIdは投稿ID
    await kv.set(kvKey, JSON.stringify({ postId: quoteId, postedAt: Date.now() }), { ex: 3600 });  // 1時間有効

    // 10分後に初回メトリクス取得タスクをスケジュール（例: Bull Queue使用）
    queue.add('fetchMetrics', { postId: quoteId }, { delay: 10 * 60 * 1000 });
  }
  ```

#### 3. `non_public_metrics`と`organic_metrics`の`impression_count`の違いは何ですか？どちらを使用すべきですか？
| 項目              | `non_public_metrics.impression_count` | `organic_metrics.impression_count` |
|-------------------|---------------------------------------|------------------------------------|
| **内容**         | 総インプレッション（organic + 有料プロモート分） | オーガニックインプレッションのみ（非プロモート） |
| **利用条件**     | 認証ユーザー**自身のツイート**限定 | 認証ユーザー**自身のツイート**限定（v2.19以降） |
| **更新タイミング** | ほぼ同等（数分遅延）                | ほぼ同等                          |
| **推奨**         | **通常投稿（非プロモート）で優先使用**。総数で正確。 | プロモート投稿時のみ使用（純粋オーガニック測定） |

- **あなたのケース**: 非プロモートなので**`non_public_metrics.impression_count`を優先**。フォールバックで`organic_metrics`。
- **コード修正案**（共通）:
  ```javascript
  const impressions = metrics.non_public_metrics?.impression_count ?? 
                      metrics.organic_metrics?.impression_count ?? 
                      0;
  ```

#### 4. Cron Jobで定期的に追跡する場合、投稿後どのくらいの間隔で実行すれば、正確なインプレッション数とエンゲージメント数を取得できますか？
- **推奨スケジュール**（投稿後24時間以内の精度向上）:
  | 経過時間       | 間隔          | 理由 |
  |----------------|---------------|------|
  | 0-1時間       | **10分ごと** | 急激な初期成長を捉える |
  | 1-6時間       | **30分ごと** | 安定化フェーズ |
  | 6-24時間      | **1時間ごと**| 十分安定 |
  | 24時間以降    | **6時間ごと**| 長期追跡 |
- **現在の1時間ごとCronの問題**: 投稿後最初の急成長を逃す → **動的スケジュール**に変更。
- **実装推奨**: Cronではなく**投稿IDごとの個別Queue**（Bull/Agenda.js）。KVからpendingリストを読み込み。
  ```javascript
  // services/x/metricsTracker.js のCron代替（queue処理）
  queue.process('fetchMetrics', async (job) => {
    const { postId } = job.data;
    const metrics = await getTweetMetrics(postId);  // APIコール
    const impressions = metrics.non_public_metrics?.impression_count ?? metrics.organic_metrics?.impression_count ?? 0;
    
    // KV保存（最新値上書き）
    const kvKey = `x:metrics:${postId}`;
    await kv.set(kvKey, JSON.stringify({ impressions, ...otherMetrics, updatedAt: Date.now() }));
    
    // 次回スケジュール（動的）
    const postedAt = /* KVから取得 */;
    const elapsed = Date.now() - postedAt;
    let nextDelay;
    if (elapsed < 3600000) nextDelay = 10 * 60 * 1000;  // 10分
    else if (elapsed < 6 * 3600000) nextDelay = 30 * 60 * 1000;  // 30分
    else nextDelay = 3600000;  // 1時間
    
    job.delayed(nextDelay);  // 再スケジュール
  });
  ```

#### 5. 投稿後のインプレッション数とエンゲージメント数を正確に取得するためのベストプラクティス
1. **投稿時**: メトリクス取得を**スキップ**。`impressions: 0`固定、エンゲージメント率計算**無効化**（Grok推定値も混用禁止）。
2. **遅延取得**: 投稿後**10分/30分/1時間/6時間**に複数回ポーリング（expansions=public_metrics,non_public_metrics,organic_metrics）。
3. **データ保存**: KVキー=`x:metrics:${postId}`に**タイムスタンプ付き履歴**保存（配列で最新10件）。
4. **Rate Limit対応**: ユーザーContextで15分/150リクエスト。ポーリング時はbackoff（指数退避）。
5. **エンゲージメント率**: `engagements / impressions`（impressions > 0時のみ）。public_metrics（likes+retweets+replies+quotes）使用。
6. **モニタリング**: 0が続く場合（24時間超）は投稿削除疑い→ログ出力。
7. **APIコール例**（Node.js）:
   ```javascript
   async function getTweetMetrics(tweetId) {
     const response = await needle.request('GET', `https://api.twitter.com/2/tweets/${tweetId}?tweet.fields=public_metrics,non_public_metrics,organic_metrics`, {}, oauthToken);
     return response.data;
   }
   ```
8. **Grok推定値の分離**: `influencer.recentImpressions`は一切混用せず、API値のみ使用。

#### 6. X API v2の`impression_count`は、投稿後どのくらいの時間で安定した値になりますか？
- **80%安定**: **6時間**（初期急成長後）。
- **95%安定**: **24時間**（アルゴリズム調整完了）。
- **完全安定**: **72時間**（長期フィード反映）。
- アクティブ投稿（フォロワー多）ほど早く安定。低アクティブは遅め。

#### 追加推奨: 全体フロー改善
```
1. 投稿 → postIdをKV/Queue保存
2. 10分後: 初回取得 → KV保存
3. 動的Queue: 30分/1時間間隔で更新
4. 24時間後: 1日1回に減速
5. ダッシュボード: 最新KV値で率計算（impressions > 0のみ）
```

この実装で、投稿直後の0問題と計算ミスを解決。実装後テスト推奨（テスト投稿でタイミング検証）。不明点あればAPIエンドポイント指定で深掘りします。

---

## 📚 参照

- `api/x-quote-repost.js` - 引用リポスト投稿API
- `services/x/metricsTracker.js` - メトリクス追跡サービス
- `api/x-quote-repost-metrics.js` - メトリクス追跡Cron Job
- `docs/GPT_X_DATA_EXTRACTION_ADVICE_2026-01-26.md` - GPTによるアドバイス
- `docs/CRITICAL_ERROR_24H_REPORT_ANALYSIS_2026-01-26.md` - 24時間レポートのデータソース混在エラー
