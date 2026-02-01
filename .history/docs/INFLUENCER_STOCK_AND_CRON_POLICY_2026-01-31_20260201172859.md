# インフルエンサーストックとCronポリシー

## 2026-01-31 確定（2026-02-01 更新: 自アカウント向け全廃止）

---

## 0. X投稿の方針（確定）

- **自アカウント向けは全廃止**  
  `free_report`（無料レポート）、`minimal_version`（ミニマル版）、`regular_direct`（有料版直導線）の **Cron はすべて削除**。自アカウントへの直接投稿はスケジュール実行しない。
- **引用リポストは2種類で展開**  
  X投稿は **引用リポストのみ**。導線は **Minimal オプトイン** と **Regular 直導線** の2種類を、インフルエンサーごとにローテーション（`QUOTE_REPOST_USE_MINIMAL_REGULAR_TEMPLATES` + `quoteFunnelRotation.js`）。  
  詳細: `docs/QUOTE_REPOST_MINIMAL_REGULAR_ROTATION.md`

---

## 1. 引用リポストのインフルエンサー取得元

- **唯一の取得元**: **KV**（`services/x/influencerStock.js` の `getInfluencersFromStock(lang)`）
- ファイル（`influencerStockFromFile.js`）は**廃止・削除済み**。参照しないこと。
- ストックが空の場合、引用リポストはその言語で 0 件になる。**Cron では補充しない。**

---

## 2. Cron でやってはいけないこと

- **インフルエンサーリストの自動取得は絶対にしない。**
- `vercel.json` の `crons` に **`/api/x-update-influencer-stock` を追加しないこと。**
- リストの補充・リフレッシュは、**必要に応じて手動**で行う（あなたと Grok でリスト補充・リフレッシュする前提）。

---

## 3. ストック補充のやり方（手動のみ）

- **API**: `GET /api/x-update-influencer-stock?lang=en` など（手動実行。Bearer CRON_SECRET で認証）
- **スクリプト**: `scripts/discover-and-stock-influencers-840.js` などで Grok 取得 → KV に保存
- いずれも **Cron では呼ばない。**
- **ファイルのみでストックしていた場合**: 一度 KV へ投入する運用が必要（上記APIまたはスクリプトで投入し、以降はKVを唯一のソースとする）。

---

## 4. 削除した欠陥実装（Cursor/Composer 1 由来）

- **`api/x-quote-repost-from-file.js`** … 削除済み
  - `influencerStockFromFile.js`（存在しない）を require しており起動即クラッシュ
  - `getPromoCode` 未インポート、`INTERVAL_MINUTES` 未定義、`module.exports` 二重で handler が上書きされる等の欠陥
- **`services/x/influencerStockFromFile.js`** … リポジトリに存在しない（以前から未コミット or 削除済み）

---

## 5. 現在の引用リポストの流れ

1. Cron: `x-quote-repost-en`, `x-quote-repost-es`, … が `x-quote-repost.js` の `postQuoteRepostsForLang` を呼ぶ
2. `postQuoteRepostsForLang` は **`influencerStock.js` の `getInfluencersFromStock(lang)`** のみを使用（KV 参照）
3. KV にストックが無い／空の場合は 0 件で終了。**その場で Grok やファイルは叩かない。**

以上を「インフルエンサーストックとCronのポリシー」として固定する。
