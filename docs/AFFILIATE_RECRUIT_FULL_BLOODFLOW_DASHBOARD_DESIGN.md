# 完全血流ダッシュボード 設計メモ（アフィリエイトOS 観測フェーズ）

**目的**: DM 送信 → FirstPromoter 登録 → Whop 成約 の「血流」を言語×スコア帯で可視化し、国係数C・リスクR・DM 集中投下の最適化に使う。  
**前提**: [AFFILIATE_STRATEGY_X_DM_FIRSTPROMOTER_WHOP.md](./AFFILIATE_STRATEGY_X_DM_FIRSTPROMOTER_WHOP.md)、[AFFILIATE_RECRUIT_IMPLEMENTATION_REPORT.md](./AFFILIATE_RECRUIT_IMPLEMENTATION_REPORT.md)。

**実装状況**:
- **GET `/api/affiliate-recruit-funnel`** 実装済み。送信数・FirstPromoter 登録数・Whop 成約数（直近30日）を 1 レスポンスで返す。
- **ref 対応（v2.0）** 実装済み: 招待 URL に `ref=author_id` 付与、送信時に `affiliate_recruit:ref_sent:{author_id}` 保存、FirstPromoter Webhook で ref を `firstpromoter:signup:ref:{ref}` と `firstpromoter:signup_refs:list` に保存。funnel API で `signupsAttributed`（言語×スコア帯別・登録率）を返す。FirstPromoter が Webhook ペイロードに ref（または referral_id / referral_code / visitor_id / ref_id / referrer_id）を返す前提。
- **ヒートマップ API（v2.1）** 実装済み: **GET `/api/affiliate-recruit-heatmap`**。言語×スコア帯の行列で `sent` / `signupsAttributed` / `conversionRate`（セル別登録率 %）を返す。C/R 自動調整・DM 集中投下の根拠データ。ファイル: `api/affiliate-recruit-heatmap.js`。
- **C/R 自動調整（v2.2 完了）** 実装済み:
  - **国係数 C（言語別）・スコア帯係数 B**: KV に保存（`affiliate_recruit:cr:C:{lang}`, `affiliate_recruit:cr:B:{band}`、TTL 180日）。`services/td/affiliateRecruitCrConfig.js` で getCrConfig / setCrConfig。
  - **スクリーニングでの参照**: `api/affiliate-recruit-run.js` で priority = (score/100) × C × R_risk × B。C/B は KV から取得、未設定時はデフォルト（C=COEFFICIENT_BY_LANG, B=1.0）。
  - **C/B 更新 API**: **POST `/api/affiliate-recruit-cr-update`**（認証: CRON_SECRET）。ヒートマップの送信数・ref紐づき登録数から言語別・スコア帯別の登録率を算出し、C を [0.9, 1.2]、B を [0.9, 1.1] に正規化して KV に保存。Cron で定期実行するか手動実行。

**v2.2 を以て「自己最適化フェーズ」を完了とする。次フェーズ（v3.0）**: 自動 DM 集中投下・国別最適時間帯分析などは応用フェーズとして別途設計。

---

## 1. データソース一覧

| ソース | 取得方法 | 主な項目 | 備考 |
|--------|----------|----------|------|
| **DM 送信ログ（KV）** | 送信成功時に `markSent` で保存 | handle, lang, score, priority, author_id, ts | キー: `affiliate_recruit:sent:{handle}`。既存。 |
| **送信集計（KV）** | 送信成功時に `incrementSentStats` で incr | 言語別・言語×スコア帯別件数 | キー: `affiliate_recruit:stats:lang:{lang}`, `...:band:{band}`。既存。 |
| **送信集計 API** | GET `/api/affiliate-recruit-stats` | total, byLang, byLangScore | 既存。ダッシュボードの「送信」ビューにそのまま利用可能。 |
| **FirstPromoter Webhook** | POST `/api/firstpromoter-webhook` | eventType, promoterId, email, acceptedAt | KV: `firstpromoter:promoter:{id}`, `firstpromoter:events:list`（直近イベント）。登録＝「血流の出口」の一歩。 |
| **Whop Webhook** | POST `/api/whop-webhook` | 購入・メンバーシップ等 | 成約＝「血流の最終出口」。既存で受信済み。 |

---

## 2. 現状で「見える」もの・「見えない」もの

### 見える（実装済み）

- **送信数**: 言語別・言語×スコア帯別（0-49 / 50-64 / 65-79 / 80-100）
- **送信ログ（個別）**: 各 handle ごとの lang, score, priority, author_id（KV の値をパースすれば取得可能）
- **FirstPromoter**: 登録イベントの一覧（events:list）・プロモーター単位の記録（promoter:id）
- **Whop**: 購入イベント（既存 webhook で受信）

### 見えない（突き合わせに必要）

- **「この登録」が「あの DM 送信」由来か**  
  - 現状の招待 URL は **言語ごと 1 本**（`getFirstPromoterInviteUrl(lang)`）。  
  - 送信先（handle / author_id）ごとの ref を URL に載せていないため、FirstPromoter の登録と DM 送信を 1:1 で紐づけられない。
- **登録率・成約率を「言語×スコア帯」で割る**  
  - 上記紐づけができないため、現時点では「全体の登録数」「全体の成約数」は出せても、「言語×スコア帯別の登録率・成約率」は出せない。

---

## 3. 突き合わせを可能にするための拡張（推奨）

### 3.1 招待 URL に ref を付与（DM 送信ごと）

- **案**: DM 送信時に、招待 URL に **送信先を識別する ref** を付ける。  
  - 例: `?ref=author_id` または `?ref=handle`（FirstPromoter が ref を記録・webhook で返す前提）。  
  - または FirstPromoter の「トラッキング用パラメータ」仕様に合わせて、`fpr` / `ref` 等の名前で **1 送信 1 値**（author_id 推奨）を渡す。
- **効果**: FirstPromoter から「この登録は ref=X 経由」と分かれば、KV の送信ログ（author_id = X）と突き合わせできる。
- **実装**:  
  - `getFirstPromoterInviteUrl(lang, { ref })` のように ref をオプションで渡す。  
  - `affiliate-recruit-run.js` で DM 送信時に `getFirstPromoterInviteUrl(lang, { ref: c.author_id })` を呼ぶ。  
  - FirstPromoter の Webhook ペイロードに ref（または同等）が含まれるか確認し、含まれるなら KV に `firstpromoter:signup:ref:{ref}` のように保存する。

### 3.2 FirstPromoter Webhook で ref を保存

- Webhook 受信時に、ペイロードに **referral / ref / visitor_id** など送信元識別子があれば、それをキーに KV に書き、後で送信ログと突き合わせできるようにする。
- FirstPromoter のドキュメントで「招待リンクのクエリパラメータが webhook に含まれるか」を確認する必要あり。

### 3.3 突き合わせ用 API（③で想定している「小さな API」）

- **入力**: 特になし（KV と Webhook で溜まったデータを集約するだけでも可）。
- **出力例**:
  - **送信**: 既存 `GET /api/affiliate-recruit-stats` の拡張 or そのまま利用。
  - **登録・成約の突き合わせ**:  
    - オプション A: `GET /api/affiliate-recruit-funnel` で、  
      `{ sent: { byLang, byLangScore }, signups: { total, byRef? }, sales: { total } }` のような形で返す。  
    - オプション B: ref 紐づけができるようになったら、  
      `signupsByLang`, `signupsByLangScore`, `conversionRateByLang` などを追加。
- **データの揃い方**:  
  - まずは「送信集計」「FirstPromoter イベント件数」「Whop 成約件数」を同じ API で返すだけでも「完全血流」の第一版になる。  
  - ref 対応後、同じ API に「言語×スコア帯別の登録数・登録率」を追加。

---

## 4. ダッシュボードで可視化する指標（目標）

| 指標 | 説明 | 現状 | ref 対応後 |
|------|------|------|------------|
| 送信数（言語別） | 言語ごとの DM 送信数 | ✅ byLang | ✅ |
| 送信数（言語×スコア帯） | 言語×スコア帯ごとの送信数 | ✅ byLangScore | ✅ |
| 登録数（全体） | FirstPromoter 経由の登録数 | ✅ events:list の件数等 | ✅ |
| 登録数（言語×スコア帯） | DM 送信と言語×スコア帯で紐づいた登録数 | ❌ | ✅ ref 紐づけ後 |
| 登録率（言語×スコア帯） | 送信あたり登録率 | ❌ | ✅ ref 紐づけ後 |
| 成約数（全体） | Whop 購入数 | ✅ webhook で取得可 | ✅ |
| 成約率（言語×スコア帯） | 送信あたり成約率 | ❌ | ✅ ref 紐づけ後 |
| 国係数 C 検証 | 言語圏別の登録率・成約率から C の妥当性を確認 | - | 上記が揃えば可能 |
| リスク R 検証 | スコア帯別の成約率から R の妥当性を確認 | - | 上記が揃えば可能 |

---

## 5. 画面イメージ（ダッシュボード構成）

- **ビュー 1: 送信マップ（現状だけで実装可）**
  - 表: 言語 × スコア帯 の送信数（ヒートマップ or 表）。
  - 数値ソース: `GET /api/affiliate-recruit-stats`。
- **ビュー 2: 全体の血流**
  - 送信総数 → FirstPromoter 登録数 → Whop 成約数 の 3 段（フロー図 or 数字のみ）。
  - 数値ソース: 送信は stats API、登録は FirstPromoter イベント件数、成約は Whop webhook 集計（要集計用キー or API）。
- **ビュー 3: 言語×スコア帯別の登録率・成約率（ref 対応後）**
  - 表: 言語 × スコア帯 で「送信 / 登録 / 成約 / 登録率 / 成約率」を表示。
  - 国係数 C・リスク R のチューニング根拠として利用。

---

## 6. 実装の優先順位（Copilot 提案の ②→③→① に沿った形）

1. **② 設計の固定**  
   - 本メモを「完全血流ダッシュボードの設計」として確定。  
   - データソース・指標・画面イメージは上記の通り。

2. **③ 突き合わせ用の小さな API**  
   - まず **ref なし**で:  
     - 送信: 既存 `GET /api/affiliate-recruit-stats`。  
     - 登録: FirstPromoter の `events:list` または promoter 件数を返す API を 1 本追加（例: `GET /api/affiliate-recruit-funnel` で sent + signupsTotal + salesTotal）。  
   - **ref 対応後**:  
     - 招待 URL に ref 付与、Webhook で ref 保存、funnel API に「言語×スコア帯別の登録数・登録率」を追加。

3. **① 報告書に「次のフェーズ」を追記**  
   - [AFFILIATE_RECRUIT_IMPLEMENTATION_REPORT.md](./AFFILIATE_RECRUIT_IMPLEMENTATION_REPORT.md) に「完全血流ダッシュボード設計」「突き合わせ API」「ref 拡張」を要約して追記し、OS の進化ロードマップとして固定。

---

## 7. 用語・キー名の参照

- **送信ログ（個別）**: `affiliate_recruit:sent:{handle}` → JSON `{ ts, handle, lang, score, priority, author_id }`。
- **送信集計**: `affiliate_recruit:stats:lang:{lang}`, `affiliate_recruit:stats:lang:{lang}:band:{band}`。
- **FirstPromoter**: `firstpromoter:promoter:{id}`, `firstpromoter:events:list`。
- **スコア帯**: 0-49, 50-64, 65-79, 80-100（[affiliate-recruit-stats.js](../api/affiliate-recruit-stats.js) と一致）。

この設計メモに沿って、③ API とダッシュボード UI を実装すれば、OS の「観測フェーズ」と「自己最適化」の入口が揃う。
