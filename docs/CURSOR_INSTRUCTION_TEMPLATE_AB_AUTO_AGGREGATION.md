# 🔥 Cursor 指示書（完全版）  
# A/B テスト結果の自動集計レイヤー

**目的**: 多言語テンプレ A/B テストで記録した **lang × variantId × 実測インプレ・クリック** を **自動で集計**し、**言語別の勝ちバリアント** を判定。その結果を **テンプレ選択に反映**（勝ちバリアントを優先 or デフォルト化）して、OS が「自分で学習して最適化する」状態にする。

**前提**:  
- A/B テスト基盤が実装済み: getQuoteBodyTemplate(lang, { variant: 'random' }) が { body, variantId } を返し、投稿結果に templateVariant を付与。  
- 投稿成功時に recordEngagementMetrics(tweetId, { impressions, engagements, clicks, lang, ... }) が呼ばれ、**x:metrics:YYYY-MM-DD** に日別で保存されている。  
- （推奨）recordEngagementMetrics に **templateVariant** を渡し、同一ツイートのメトリクスとバリアントを紐付けて保存する。

---

## 1. ゴール（実装後の状態）

- **言語 × variantId** ごとに、直近 N 日分の **合計インプレッション・合計クリック（またはエンゲージメント）** を集計する。
- **CTR（クリック/インプレ or エンゲージメント/インプレ）** を計算し、**最低サンプル数**（例: インプレ 100 以上）を満たす言語について **勝ちバリアント** を 1 つ決める。
- 勝ちバリアントを **KV に保存**（例: `x:quote:template_winners` = { en: 'a', ja: 'b', ... }）。
- **getQuoteBodyTemplate(lang, { variant: 'winner' })** で、KV の勝ちバリアントを参照。未設定・未集計の言語は従来どおり random または default。
- **Cron または API** で「集計ジョブ」を定期実行し、**自動で勝ちバリアントを更新**する。
- （任意）集計結果（言語別 CTR 一覧・勝ちバリアント）を API で返し、ダッシュボードや手動確認に使う。

---

## 2. データモデル

### 2.1 入力: メトリクス＋テンプレバリアント

- **x:metrics:YYYY-MM-DD** の `tweets` 配列の 1 件に、**templateVariant**（variantId）が含まれるようにする。  
  - x-quote-repost.js で recordEngagementMetrics を呼ぶときに **templateVariant** を metrics に含める。  
  - x-engagement-metrics.js の recordEngagementMetrics は **metrics をそのまま tweet オブジェクトに展開**しているので、templateVariant を渡せば保存される。
- 集計対象: `source === 'quote_repost'` かつ **templateVariant** が存在するツイートのみ。

### 2.2 集計結果（言語 × バリアント）

- **言語 × variantId** ごとに:  
  - totalImpressions  
  - totalClicks（または totalEngagements）  
  - postCount  
  - ctr = totalClicks / totalImpressions（インプレ 0 の場合は 0 または除外）
- **勝ちバリアント**: 言語ごとに、**最低サンプル（例: totalImpressions >= 100）** を満たすバリアントのうち **CTR が最大**の variantId。同点の場合は投稿数が多い方など、ルールを 1 つ決める。

### 2.3 出力: 勝ちバリアントの保存

- **KV キー**: `x:quote:template_winners`  
- **値**: `{ en: 'a', ja: 'b', es: 'a', ... }`（言語 → variantId）。  
- TTL: 任意（例: 7 日）。集計ジョブが毎日上書きするなら TTL なしでも可。

### 2.4 getQuoteBodyTemplate の拡張

- **options.variant === 'winner'** のとき:  
  - KV の `x:quote:template_winners` を取得。  
  - 該当言語の勝ちバリアントがあればその variant で body を返す。  
  - なければ **'random'** と同様に振る舞う（または 'default'）。

---

## 3. 実装タスク一覧

### 3.1 投稿時に templateVariant をメトリクスに含める

**ファイル**: `api/x-quote-repost.js`

- recordEngagementMetrics(result.id, { ...engagementMetrics, lang, source: "quote_repost", ... }) を呼んでいる箇所で、**templateVariant**（その投稿で使った variantId）を **metrics オブジェクトに追加**する。  
  - セカンダリー先頭・fallback の両方で、getQuoteBodyTemplate から取得した variantId を保持しており、その値を recordEngagementMetrics に渡す。
- テンプレを使っていない経路（Grok 本文を使った場合など）では templateVariant を **null** または **省略**。集計時は templateVariant が存在するものだけ集計する。

### 3.2 集計サービス（新規）

**ファイル**: `services/x/templateAbAggregator.js`（新規）

- **aggregateTemplateAbResults(options)**  
  - options: `{ days?: number, minImpressions?: number }`（例: days=7, minImpressions=100）。  
  - 直近 **days** 日分の `x:metrics:YYYY-MM-DD` を get し、各 `tweets` のうち **source === 'quote_repost'** かつ **templateVariant** が存在するものを抽出。  
  - **(lang, variantId)** でグループ化し、各グループの totalImpressions, totalClicks（または totalEngagements）, postCount を集計。  
  - 言語ごとに、minImpressions を満たすバリアントのうち CTR が最大のものを **winner** とする（同点時は postCount 最大などルールを固定）。  
  - 戻り値: `{ byLang: { en: { winner: 'a', ctrByVariant: { a: 0.02, b: 0.015 }, ... }, ... }, winners: { en: 'a', ja: 'b', ... } }`。  
  - **winners** を KV の **x:quote:template_winners** に保存する。
- **getTemplateWinners()**  
  - KV の `x:quote:template_winners` を get して返す。存在しなければ `{}`。

### 3.3 getQuoteBodyTemplate に variant: 'winner' を追加

**ファイル**: `config/quoteRepostBodyTemplates.js`

- getQuoteBodyTemplate(lang, options) 内で、**options.variant === 'winner'** のとき:  
  - getTemplateWinners()（または KV を直接読む）で勝ちバリアントを取得。  
  - 該当 lang の winner が存在すれば **options.variant = winner の variantId** として body を取得。  
  - 存在しなければ **'random'** と同様に振る舞う。
- KV はサーバー側のみなので、getQuoteBodyTemplate が API から呼ばれる場合は getTemplateWinners を同期的に読む（既存の getInfluencersFromStock 等と同様に require して呼ぶ）。

### 3.4 集計ジョブの実行（Cron or API）

- **API**: `api/x-template-ab-aggregate.js`（新規）  
  - GET または POST で呼ばれたら aggregateTemplateAbResults() を実行し、結果（byLang, winners）を JSON で返す。  
  - Vercel Cron で「毎日 1 回、メトリクス更新の後」に呼ぶ設定を vercel.json に追加する。  
- または既存の **cron.js** 内で、メトリクス更新の後に aggregateTemplateAbResults() を 1 回呼ぶ。

### 3.5 （任意）集計結果の取得 API

- GET **api/x-template-ab-aggregate.js** で、**集計のみ実行せず**「直近の勝ちバリアント一覧」を返すモード（例: query `?report=1`）を用意する。  
  - getTemplateWinners() と、必要なら直近 1 回分の byLang 集計結果を KV にキャッシュしておき、それを返す。

---

## 4. 完了条件

- [ ] recordEngagementMetrics に templateVariant が渡され、x:metrics:YYYY-MM-DD の tweets に templateVariant が含まれる。
- [ ] templateAbAggregator.js が存在し、aggregateTemplateAbResults で言語×variantId の集計と勝ちバリアント判定・KV 保存ができる。
- [ ] getQuoteBodyTemplate(lang, { variant: 'winner' }) が、KV の勝ちバリアントを参照して body を返す。
- [ ] 集計ジョブが Cron または API で定期実行できる。
- [ ] （任意）集計結果・勝ちバリアント一覧を API で取得できる。

---

## 5. 運用イメージ

- 毎日、メトリクス更新後に集計ジョブが走る。  
- 直近 7 日（または 30 日）の「引用リポスト＋templateVariant あり」のツイートだけを集計し、言語ごとに勝ちバリアントを更新。  
- x-quote-repost では getQuoteBodyTemplate(lang, { variant: 'winner' }) を使うようにすると、勝ちバリアントが自動で選ばれる。  
- 勝ちバリアントがまだない言語（サンプル不足など）は random のまま。  
- ダッシュボードや手動確認で「言語別 CTR・勝ちバリアント」を見て、必要ならテンプレ文言を編集し、再度 A/B を回す。

---

## 6. まとめ

- **A/B テスト結果の自動集計** により、**言語 × variantId × CTR** を計算し、勝ちバリアントを KV に保存する。  
- **getQuoteBodyTemplate(..., { variant: 'winner' })** で勝ちバリアントを参照し、投稿文生成に反映する。  
- **定期実行**で勝ちバリアントを更新し続けることで、Trap Defence OS が「自分で学習して最適化する」自己学習レイヤーになる。

この指示書を Cursor に渡し、「3.1 から順に実装してほしい」と指定すれば、A/B テスト結果の自動集計レイヤーが実装できる。
