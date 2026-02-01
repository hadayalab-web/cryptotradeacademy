# インフルエンサーリストを一から作り直す
## 「高視聴率番組」＝高品質インフルエンサーリストの構築手順
**作成日**: 2026-01-31

---

## 1. 目的

引用リポストの **在庫（インベントリ）** であるインフルエンサーリストを、**高視聴率番組** に値する品質で一から作り直す。

- **ゴール**: 実在するツイート・実インプレッション・高エンゲージメントが期待できるアカウントだけをリスト化し、KV に投入する。
- **方針**: 人数より質を優先。手動または Grok で候補を出し、**必ず X API で tweetId を検証**してから採用する。

---

## 2. 「高品質」の基準（高視聴率番組に相当する条件）

| 条件 | 内容 |
|------|------|
| **実在** | tweetId が X 上に存在する（X API で取得できる） |
| **引用可能** | ツイートが削除・非公開・凍結でない |
| **テーマ** | 暗号・BTC 関連の投稿が中心（引用リポストの文脈に合う） |
| **エンゲージメント** | いいね・RT・リプライが多め（公開指標で判断可能な範囲で） |
| **言語** | 運用する言語（en, es, pt-br, ar, ja, ko）ごとにリストを分ける |

※ インプレッション数は他者ツイートでは API で取れないため、**いいね・RT・リプライ** を「視聴率」の代理指標として使う。

---

## 3. 作り直しの流れ（3パターン）

### パターン A: 手動でシードを作り、検証 → KV 投入（推奨）

1. **シード JSON を用意する**  
   - 言語ごとに `data/influencers-seed/influencers-{lang}.json` を用意する。  
   - 1件あたり `{ "username": "スクリーン名（@なし）", "tweetId": "ツイートID（数字のみ）" }`。
2. **検証して KV に投入する**  
   - `node scripts/rebuild-influencer-list-from-seed.js --lang en`（または `--all`）を実行する。  
   - スクリプトが X API で各 tweetId の実在確認とツイート本文取得を行い、問題があるものは除外してから KV に保存する。
3. **引用リポストで確認**  
   - その言語の引用リポスト Cron が動くタイミングで、リストから投稿されるか確認する。

**メリット**: 自分で「このアカウント・このツイート」を選べるため、**高視聴率番組** に相当する在庫だけに絞りやすい。

### パターン B: Grok で候補を出し、検証してから採用

1. **Grok で候補を出す**  
   - `scripts/discover-and-stock-influencers-840.js` を実行するか、Grok に「言語・人数・暗号/BTC・高エンゲージメント」で候補リストを出させる。
2. **tweetId を検証する**  
   - 得られたリストを `data/influencers-seed/` の形式（username + tweetId）に落とし込み、  
     `node scripts/validate-influencer-tweet-ids.js --lang en` で実在チェックする。  
   - 実在率が低い場合は、候補の出し方や Grok の指示を見直す。
3. **実在したものだけ KV に投入する**  
   - 検証済みのリストを `rebuild-influencer-list-from-seed.js` で KV に投入する（シード JSON に書き出してから実行）。

**メリット**: 候補の量を稼ぎやすい。**デメリット**: Grok の tweetId が不正確なことがあるため、検証必須。

**一括実行**: `node scripts/rebuild-influencer-list-with-grok.js --lang en` または `--all [--per-lang N]` で、Grok 候補 → X API 検証 → 実在したものだけ KV 投入を一括実行できる。Grok が返す tweetId がすべて実在しない場合（0人通過）は KV には何も保存されない。

**Grok の限界（2026-02-01 に確認）**: Grok は **実在する tweetId を返せない**。理由: 学習データは 2023 年でカットオフ、X へのリアルタイムアクセスがないため、ツイートID（スノーフレーク）を「推測」して返しており、X API で検証するとすべて Not Found。**推奨ワークフロー**: (1) Grok には **ユーザー名（username）のリストだけ** 出させる（公開知識の有名アカウントは返せる）。(2) 各 username について **X API** で `GET /2/users/by/username/:username` → `GET /2/users/:id/tweets` で直近ツイートを取得。(3) クライアントでキーワード（BTC, Bitcoin 等）・エンゲージメントでフィルタし、**実在する tweetId** を採用。(4) 必要なら実ツイートデータを Grok に渡して「引用リポストのタイミング・最適化」だけ分析させる。詳細: `docs/grok-why-tweetid-fails-*.md`、質問スクリプト: `scripts/ask-grok-why-tweetid-extraction-fails.js`。

### パターン C: 既存リストを検証し、通ったものだけ残す

1. **既存の KV または JSON をエクスポートする**  
   - 既にストックがある場合は、`getInfluencersFromStock(lang)` や `data/influencers/influencers-{lang}.json` からリストを取り出す。
2. **tweetId を検証する**  
   - `validate-influencer-tweet-ids.js` で実在チェックする。
3. **実在したものだけシードに書き出し、KV を上書きする**  
   - 検証通過分だけ `data/influencers-seed/` に書き、`rebuild-influencer-list-from-seed.js` で KV に投入する。

**メリット**: 既存資産を活かしつつ、**質だけ** 作り直せる。

---

## 4. シード JSON の形式

**ファイル**: `data/influencers-seed/influencers-{lang}.json`  
**例**: `data/influencers-seed/influencers-en.json`（サンプルが `data/influencers-seed/` にあり。中身は**実在する** username / tweetId に差し替えること）

```json
[
  { "username": "crypto_influencer1", "tweetId": "1234567890123456789" },
  { "username": "btc_analyst", "tweetId": "9876543210987654321" }
]
```

- **username**: X のスクリーン名（@ は付けない）。
- **tweetId**: 引用したいツイートの ID（数字のみの文字列。18〜19桁）。
- 1ファイル = 1言語。`lang` はファイル名の `en` / `es` / `pt-br` / `ar` / `ja` / `ko` で判定する。

---

## 5. 使うスクリプト・API

| 用途 | スクリプト / API |
|------|------------------|
| シード → 検証 → KV 投入 | `node scripts/rebuild-influencer-list-from-seed.js --lang en` または `--all` |
| tweetId の実在チェックのみ | `node scripts/validate-influencer-tweet-ids.js --lang en`（既存 JSON を読む） |
| KV のストックを API で更新（Grok 取得分を保存） | `GET /api/x-update-influencer-stock?lang=en`（手動。Cron には入れない） |
| Grok で候補取得 → ローカル保存 | `node scripts/discover-and-stock-influencers-840.js`（その後、必要ならシードに落として検証） |

---

## 6. 運用上の注意

- **インフルエンサーリストの補充・更新は手動のみ**。Cron で自動取得しない（`docs/INFLUENCER_STOCK_AND_CRON_POLICY_2026-01-31.md`）。
- リストは **KV が唯一の参照元**。引用リポストは `getInfluencersFromStock(lang)` のみを使う。
- まずは **1言語・少人数** でシード → 検証 → KV 投入を回し、引用リポストが問題なく動くことを確認してから、他言語・人数を増やすと安全。

---

## 7. 関連ドキュメント

- 戦略の枠組み（広告運用の応用）: `docs/STRATEGY_MEDIA_BUYING_QUOTE_REPOST_2026-01-31.md`
- リストの現実チェック（824/840 の根拠、品質の検証）: `docs/INFLUENCER_LIST_REALITY_CHECK_2026-01-31.md`
- ストック・Cron ポリシー: `docs/INFLUENCER_STOCK_AND_CRON_POLICY_2026-01-31.md`
