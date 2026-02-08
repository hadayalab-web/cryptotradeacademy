# 🔥 Cursor 指示書（完全版）  
# 勝ちバリアント自動反映ログの可視化レイヤー

**目的**: A/B 自動集計で決まった **勝ちバリアント** と、その根拠となる **言語 × バリアント別の CTR・サンプル数** を **API で返せるようにする**。OS の「学習結果」を人間が確認し、改善サイクルを回しやすくする。

**前提**:  
- A/B 自動集計レイヤーが実装済み: aggregateTemplateAbResults() が byLang（言語別の winner, ctrByVariant 等）と winners を返し、winners を **x:quote:template_winners** に保存している。  
- 集計ジョブ（API または Cron）が定期実行され、勝ちバリアントが更新されている。

---

## 1. ゴール（実装後の状態）

- **「どの言語でどのバリアントが勝っているか」** を一覧で取得できる。
- 各言語について **variantId・CTR・サンプル数（インプレ or 投稿数）・勝ちバリアント・集計更新日時** が返る。
- **API 1 本** でレポートを取得し、ダッシュボードや手動確認・Slack 通知などに使える。
- 集計ジョブ実行時に **直近の集計結果（byLang の詳細）** を KV に保存しておき、可視化 API は **再集計せずにそのキャッシュを返す**（任意。再集計しないとレスポンスが軽く安定する）。

---

## 2. データモデル

### 2.1 保存するレポート（集計ジョブ実行時）

- **KV キー**: `x:quote:template_report`（または `x:quote:template_last_report`）  
- **値**: 直近 1 回の集計結果の **フルレポート**。  
  - **updatedAt**: 集計実行時刻（ISO 8601）。  
  - **winners**: `{ en: 'a', ja: 'b', ... }`（既に x:quote:template_winners と同期可）。  
  - **byLang**: 言語ごとの詳細。  
    - 各言語: `{ winner, ctrByVariant: { a: 0.02, b: 0.015 }, impressionsByVariant: { a: 500, b: 300 }, postCountByVariant: { a: 10, b: 8 }, updatedAt }`  
    - これにより「言語・variantId・CTR・サンプル数・勝ちバリアント・更新日時」を可視化できる。

### 2.2 集計サービスとの連携

- **aggregateTemplateAbResults()** の戻り値に、上記 byLang の **詳細**（impressionsByVariant, postCountByVariant 等）が含まれるようにする（未実装なら追加）。  
- 集計ジョブの最後に、**winners + byLang + updatedAt** を **x:quote:template_report** に保存する。

### 2.3 可視化 API の返却形

- **GET** で次の形の JSON を返す。  
  - **winners**: 現在の勝ちバリアント一覧（x:quote:template_winners または report 内の winners）。  
  - **updatedAt**: レポートの更新日時。  
  - **byLang**: 言語ごとの配列またはオブジェクト。  
    - 各要素: **lang**, **winner**（勝ちバリアント）, **variants**: [ { **variantId**, **ctr**, **impressions**（または postCount）, **postCount** } ], **updatedAt**（あれば）。  
- レポートが未生成の場合は `{ winners: {}, byLang: {}, updatedAt: null }` のように空で返す。

---

## 3. 実装タスク一覧

### 3.1 集計結果の詳細を KV に保存（集計ジョブ内）

**ファイル**: `services/x/templateAbAggregator.js`（または集計を実行する API）

- **aggregateTemplateAbResults()** の戻り値に、言語ごとの **impressionsByVariant**, **postCountByVariant**（および既存の ctrByVariant, winner）を含める。  
- 集計ジョブ実行後（API または Cron 内）、次のオブジェクトを **x:quote:template_report** に保存する。  
  - **updatedAt**: new Date().toISOString()  
  - **winners**: 今回の winners  
  - **byLang**: 今回の byLang（各言語に winner, ctrByVariant, impressionsByVariant, postCountByVariant を含む）  
- TTL は任意（例: 30 日）。集計が毎日走るなら 7 日でも可。

### 3.2 可視化 API の新規作成

**ファイル**: `api/x-template-winner-report.js`（新規）

- **GET** のみ受け付ける。  
- **x:quote:template_report** を get する。存在すればそのまま JSON で返す。  
  - 返却形を整える: **winners**, **updatedAt**, **byLang**（言語・variantId・CTR・サンプル数・勝ちバリアントが分かる形）。  
- 存在しなければ、**x:quote:template_winners** だけ get し、`{ winners: {...}, byLang: {}, updatedAt: null }` のように返す（最小限の後方互換）。  
- （任意）**?format=flat** のように、byLang を「1 言語 1 行」の配列に平坦化した形で返すオプションを付け、ダッシュボード用にしやすくする。

### 3.3 既存の集計 API との役割分担

- **api/x-template-ab-aggregate.js**: 集計 **実行**（POST または GET で aggregateTemplateAbResults を呼ぶ）＋ 実行結果を JSON で返す。  
- **api/x-template-winner-report.js**: 集計 **結果の参照**（再集計しない。KV のレポートを返すだけ）。  
- 可視化・ダッシュボード・Slack 通知は **x-template-winner-report** を叩く。

### 3.4 （任意）レポート形の安定化

- byLang の 1 言語分を、次の形に統一する。  
  - **lang**, **winner**, **variants**: [ { **variantId**, **ctr**, **impressions**, **postCount** } ]  
- 集計サービスがこの形で byLang を組み立て、x:quote:template_report に保存する。可視化 API は保存された形をそのまま返す。

---

## 4. 完了条件

- [ ] 集計ジョブ実行時に、winners ＋ byLang（言語別 winner, ctrByVariant, impressionsByVariant, postCountByVariant）＋ updatedAt を **x:quote:template_report** に保存している。
- [ ] **api/x-template-winner-report.js** が存在し、GET で **winners / updatedAt / byLang** を返す。
- [ ] レポート未生成時は winners のみ、または空の byLang で安全に返す。
- [ ] （任意）byLang が「言語・variantId・CTR・サンプル数・勝ちバリアント」を一意に解釈できる形になっている。

---

## 5. 運用イメージ

- 毎日、集計ジョブが走ると **x:quote:template_report** が更新される。  
- ダッシュボードや手動確認で **GET /api/x-template-winner-report** を叩き、「どの言語でどのバリアントが勝っているか」「CTR・サンプル数」を一覧で確認する。  
- 必要に応じて Slack やメールで updatedAt と winners のサマリを通知する。  
- 人間が「この言語は A が勝っている」と把握した上で、テンプレ文言の追加・調整や A/B 継続の判断がしやすくなる。

---

## 6. まとめ

- **勝ちバリアントの可視化** により、OS の「学習結果」を **言語・variantId・CTR・サンプル数・更新日時** として確認できる。  
- **集計結果を KV にキャッシュ** し、**専用 API で参照する** 構成にすることで、再集計なしで軽く安定したレポート取得ができる。  
- これにより Trap Defence OS の改善サイクルが加速し、「自己学習型」の結果を人間が理解・活用できるようになる。

この指示書を Cursor に渡し、「3.1 から順に実装してほしい」と指定すれば、勝ちバリアント可視化レイヤーが実装できる。
