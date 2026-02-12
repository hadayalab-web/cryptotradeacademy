# X 投稿ロジック — BuzzWeave Engine 単体OS

**方針**: Trap Defence の X 投稿は **BuzzWeave Engine のみ**で行う。

## 投稿経路（一本化済み）

| 種別 | API | Cron | 説明 |
|------|-----|------|------|
| **BuzzWeave** | `api/buzzweave-run.js` | 毎分 | 引用リポスト（メイン投稿フロー） |
| **スロット生成** | `api/buzzweave-slots.js` | 毎日 15:00 UTC | 投稿スロット生成のみ（投稿なし） |

その他の X 投稿用 API（x-post, x-quote-repost-*, x-post-free-report, x-post-regular-direct 等）は廃止し、**BuzzWeave 単体OS** として運用する。

## 主要な構成

- **API**: `buzzweave-run.js`, `buzzweave-slots.js`, `cron.js`, `x-metrics-fetcher.js`（必要時）
- **サービス**: `services/td/buzzWeaveEngine.js`, `services/x/client.js`
- **設定**: `config/buzzweaveLinks.js`（`pickVidalyticsLink` 等）
- **データ**: `utils/supabase.js`（`td_post_slots`, `quoted_tweets`, `x_posts` 等）

## X 投稿に関する OS 原則

- **新しい X 投稿ロジックは必ず BuzzWeave Engine 経由で実装する**
- **services/x は I/O クライアント層に限定し、ビジネスロジックを持たせない**
- **新しい Cron ベースの投稿フローを追加しない**（buzzweave-run に統合する）
- **X への write 操作は buzzWeaveEngine のみが行う**

## Cron（vercel.json）

- `/api/buzzweave-run` — 毎分（X 投稿実行）
- `/api/buzzweave-slots` — 毎日 15:00 UTC（スロット生成）
- `/api/cron` — 5分ごと（X 投稿は含まない）
- `/api/x-metrics-fetcher` — 5分ごと（メトリクス取得）

---

*最終更新: 2026-02-13（BuzzWeave 単体OS 再構築時）*
