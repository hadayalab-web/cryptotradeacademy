# 最適化マスターサマリー
## 今朝からの協議・改修の全体まとめ
**作成日**: 2026-01-31

---

## 📋 目次
1. [協議の背景とゴール](#1-協議の背景とゴール)
2. [実施した最適化一覧](#2-実施した最適化一覧)
3. [3つのコンバージョンファネル](#3-3つのコンバージョンファネル)
4. [KPIと逆算設計](#4-kpiと逆算設計)
5. [変更ファイル一覧](#5-変更ファイル一覧)
6. [環境変数・設定](#6-環境変数設定)
7. [次のアクション](#7-次のアクション)

---

## 1. 協議の背景とゴール

### 背景
- **TG定期配信**: 無料版（Minimal Version）・有料版（Regular Briefing）が定時に届かない事象
- **Vercelログ**: `/api/cron` で 504 Timeout が発生
- **CryptoQuant API**: getCQDeepMetrics と高解像度データ取得のオーバースペック懸念
- **X戦略**: 824人インフルエンサーリストを最大活用し、Whopへトラフィックを流し込む「チート戦略」の確立
- **Whop導線**: 有料版・無料版のURL・プロモコードの一元管理とプロモTG配信の見直し

### ゴール（KPI）
| 指標 | 目標（1日あたり） |
|------|-------------------|
| **無料版（Minimal Version）コンバージョン** | 150件 |
| **有料版（Regular Briefing）コンバージョン** | 50件 |

### 基本方針
- **ファネル1**: X → VSL1（OqvqngJOiXc）→ Whop無料版（Minimal Version）
- **ファネル2**: 無料版ユーザー → VSL2（fXgVsKhqDjI）→ Whop有料版（Regular Briefing）
- **ファネル3**: X → Whop有料版ページ（VSL3 rdMvxGs0ZaI がページで自動再生）→ コンバージョン

**戦略の枠組み（広告運用の応用）**: 高品質インフルエンサーへの引用リポスト＝高視聴率番組へのCM出稿。スタート・ゴール・既存戦略の再構築は `docs/STRATEGY_MEDIA_BUYING_QUOTE_REPOST_2026-01-31.md` を参照。

---

## 2. 実施した最適化一覧

### A. インフラ・信頼性

| 項目 | 内容 | 主な変更 |
|------|------|----------|
| **Vercel 504対策** | `/api/cron` のタイムアウト防止 | `vercel.json`: `api/cron.js` に `maxDuration: 300` を設定 |
| **CryptoQuant API最適化** | 重複呼び出し削減・Professionalプランに合わせたデータ量 | `api/cron.js`: 高解像度取得 → deepMetrics で再利用。`highResolution.js`: Professional時は limit=7 日。`deepMetrics.js`: `options.highResCQ` で共通データ再利用 |

### B. Whop・プロモの一元化

| 項目 | 内容 | 主な変更 |
|------|------|----------|
| **Whop URL・プロモコード** | 有料版・無料版URLとプロモコードを1か所で管理 | `services/telegram/whop-links.js`: `getWhopProductUrl(lang)`, `getMinimalVersionCheckoutUrl(lang)`, `getPromoCode()` を提供。有料: trapdefence/btc-regular-{lang}, 無料: checkout/plan_* |
| **プロモTG配信** | VSL2系でWhop情報を共通化 | `api/vsl2-post.js`, `api/vsl2-free-users.js`, `api/vsl2-last-call.js`: 上記 whop-links を利用するよう変更 |
| **X投稿のWhop導線** | 引用リポスト・無料レポート・有料直接誘導で共通URL・プロモ | `api/x-quote-repost.js`, `api/x-post-free-report.js`, `api/x-post-minimal-version.js`, `api/x-post-regular-direct.js` などで `getWhopProductUrl` / `getPromoCode` を使用 |

### C. ファネル3（X→有料版直接）の実装・強化

| 項目 | 内容 | 主な変更 |
|------|------|----------|
| **有料版直接誘導X投稿** | Whop有料版ページ（VSL3埋め込み）への直接導線 | 新規 `api/x-post-regular-direct.js`: 6言語・プロモコード付き・1日4回（2,8,14,20 UTC）。`vercel.json` に cron と functions 設定を追加 |

### D. KPI計測・可視化

| 項目 | 内容 | 主な変更 |
|------|------|----------|
| **コンバージョン追跡** | 無料版/有料版の日別コンバージョン数を記録・表示 | 新規 `api/analytics-dashboard.js`: 7日平均・目標達成率・過去7日推移を表示するダッシュボード |
| **Whop連携** | 購入イベントをKPIに反映 | `api/whop-webhook.js`: 購入時に `analytics-dashboard` の `recordConversion` を呼び出し、プランから無料/有料を判定して記録 |

### E. コンバージョン向上施策

| 項目 | 内容 | 主な変更 |
|------|------|----------|
| **インフルエンサー最適化** | エンゲージメント率でランク付け・選定ロジック | 新規 `services/x/influencer-optimizer.js`: ランキング、最近投稿除外、多様性ボーナス、パフォーマンスレポート |
| **VSL2メッセージ強化** | 損失回避・緊急性・社会的証明を強調 | `services/telegram/messages/vsl2.js`: 「95%は盲目トレードで損」「50%OFF 24時間で終了」「残り47枠」「1,000人以上の利益を出すトレーダーに参加」などを追加 |

---

## 3. 3つのコンバージョンファネル

### ファネル1: X → 無料版（Minimal Version）
```
X投稿（VSL1 / 引用リポスト / Minimal直接）
  → VSL1動画: https://youtu.be/OqvqngJOiXc（EN以外字幕あり）
  → Telegram Deep Link（?start=minimal_{lang}）
  → Whop無料版チェックアウト（plan_*）
```
- **主なAPI**: `api/vsl1-post.js`, `api/x-quote-repost-{lang}.js`, `api/x-post-minimal-version-cron.js`
- **状態**: 既存のまま。VSL1はX専用（TG無料チャンネル配信はデフォルトOFF）

### ファネル2: 無料版 → 有料版（Regular Briefing）
```
無料版ユーザー（登録24時間後）
  → VSL2動画: https://youtu.be/fXgVsKhqDjI（EN以外字幕あり）
  → Whop有料版（trapdefence/btc-regular-{lang}）＋プロモ defend50
```
- **主なAPI**: `api/vsl2-free-users.js`, `api/vsl2-last-call.js`, `api/vsl1-reminder.js`
- **状態**: Whop URL・プロモは whop-links に統一済み。VSL2文言を強化済み。

### ファネル3: X → 有料版（Regular Briefing）直接
```
X投稿（有料版直接誘導）
  → Whop有料版ページ（言語別）
  → ページ内でVSL3自動再生: https://youtu.be/rdMvxGs0ZaI（6言語対応）
  → コンバージョン（50%OFF）
```
- **主なAPI**: `api/x-post-regular-direct.js`（新規）、既存の `api/x-post-free-report.js` の有料版CTA
- **状態**: 有料版直接誘導用の専用投稿を追加済み。

---

## 4. KPIと逆算設計

### 目標
- 無料版: **150コンバージョン/日**
- 有料版: **50コンバージョン/日**

### 理論値（現状トラフィック想定）
- 無料版: 約 9,024件/日（目標の約60倍）
- 有料版: 約 508.8件/日（目標の約10倍）

※実際の数値はダッシュボードで計測し、ボトルネックを特定する必要あり。

### ダッシュボード
- **URL**: `https://<your-domain>.vercel.app/api/analytics-dashboard`
- **表示**: 無料版/有料版の7日平均、目標達成率、過去7日推移

---

## 5. 変更ファイル一覧

### 新規作成
| ファイル | 役割 |
|----------|------|
| `api/analytics-dashboard.js` | KPIダッシュボード（コンバージョン追跡・表示） |
| `api/x-post-regular-direct.js` | 有料版直接誘導X投稿（ファネル3） |
| `services/x/influencer-optimizer.js` | インフルエンサーランキング・選定 |

### 修正
| ファイル | 主な変更 |
|----------|----------|
| `vercel.json` | cron: `api/cron` maxDuration, `api/x-post-regular-direct` 追加。functions: cron, x-post-regular-direct 設定 |
| `api/cron.js` | CQ: 高解像度→deep再利用、定期枠外は簡易データのみ。DELIVERY START ログ追加 |
| `api/whop-webhook.js` | 購入イベントで `recordConversion` を呼び出しKPI記録 |
| `services/telegram/whop-links.js` | 有料URL（trapdefence/btc-regular-*）、無料checkout、`getPromoCode()` を提供 |
| `services/cryptoquant/highResolution.js` | Professional時は limit=7 日 |
| `services/cryptoquant/deepMetrics.js` | `options.highResCQ` で共通データ再利用 |
| `services/telegram/messages/vsl2.js` | 損失回避・緊急性・社会的証明の文言強化 |
| `api/vsl2-post.js`, `api/vsl2-free-users.js`, `api/vsl2-last-call.js` | Whop URL・プロモを whop-links から取得 |
| `api/x-quote-repost.js`, `api/x-post-free-report.js`, `api/x-post-minimal-version.js` 等 | Whop URL・プロモを whop-links から取得 |

### ドキュメント（本日関連）
| ファイル | 内容 |
|----------|------|
| `docs/CONVERSION_FUNNEL_OPTIMIZATION_2026-01-31.md` | 3ファネル構造・実装状況 |
| `docs/KPI_ACHIEVEMENT_STRATEGY_2026-01-31.md` | KPI逆算・ボトルネック・施策優先度 |
| `docs/KPI_OPTIMIZATION_GUIDE_PHASE1_2026-01-31.md` | Phase1 計測実装ガイド |
| `docs/KPI_PROJECT_COMPLETE_SUMMARY_2026-01-31.md` | KPIプロジェクト完了サマリー |
| `docs/OPTIMIZATION_MASTER_SUMMARY_2026-01-31.md` | 本ドキュメント（全体まとめ） |

※このほか、既存の BUG_FIXES_504、PROMO_TG_DISTRIBUTION_REVIEW、WHOP_URLS_AND_PROMO 等のドキュメントも参照可能。

---

## 6. 環境変数・設定

### 必須・推奨
- `CRON_SECRET`: Cron API 認証
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID_*`: TG配信
- `WHOP_WEBHOOK_SECRET`: Whop Webhook 署名検証（本番では必須）
- X API 各種: 投稿・メトリクス用

### Whop・プロモ（未設定時はコード内デフォルト使用）
- `WHOP_PROMO_CODE`: プロモコード（デフォルト: defend50）
- `WHOP_PRODUCT_URL_EN` 等: 有料版URL（未設定時: trapdefence/btc-regular-{lang}）
- `WHOP_MINIMAL_CHECKOUT_URL_EN` 等: 無料版チェックアウトURL

### VSL
- `VSL1_YOUTUBE_LINK`: https://youtu.be/OqvqngJOiXc
- `VSL2_YOUTUBE_LINK`: https://youtu.be/fXgVsKhqDjI

### CryptoQuant
- `CRYPTOQUANT_PLAN`: professional / premium / enterprise（Professional時は highResolution の limit=7）

### オプション
- `VSL1_TELEGRAM_MINIMAL_ENABLED`: true にするとVSL1を無料TGチャンネルにも配信（デフォルト false）
- `DASHBOARD_SECRET`: ダッシュボードに認証をかける場合

---

## 7. 次のアクション

### すぐ行うとよいこと
1. **デプロイ**: 上記変更をコミット・プッシュし、Vercelで本番反映
2. **ダッシュボード確認**: `/api/analytics-dashboard` でコンバージョン数・達成率を確認
3. **Whop Webhook**: 本番で `WHOP_WEBHOOK_SECRET` を設定し、購入→KPI記録が動くか確認
4. **インフルエンサーストック**: 引用リポストは KV（`influencerStock.js`）を参照。ストックが空なら `/api/x-update-influencer-stock` または `discover-and-stock` で補充

### 逆算に基づく運用（824人・150/50 KPI）
- **逆算**: 無料150・有料50 を賄うには約 **128 引用リポスト/日** で十分。824人は過剰に使わず 1人あたり 1〜2回/日で可。
- **詳細**: `docs/REVERSE_STRATEGY_824_INFLUENCERS_2026-01-31.md`
- **設定**: 過剰投稿を避ける場合は `INFLUENCER_COUNT_EN=1` 等で 1回あたり 1人にし、Cron 頻度を下げる検討を。

### 計測後に検討
- 実コンバージョンが目標に届かない場合: インフルエンサー実績（`influencer-optimizer`）の参照、引用リポスト側でのインフルエンサー選定への組み込み
- VSL2送信タイミング: 24時間→12時間など、A/Bテスト
- Regular Direct: 4回/日→8回/日など、頻度の微調整

### 参照ドキュメント
- **824人逆算戦略**: `docs/REVERSE_STRATEGY_824_INFLUENCERS_2026-01-31.md`
- ファネル詳細: `docs/CONVERSION_FUNNEL_OPTIMIZATION_2026-01-31.md`
- KPI逆算・施策: `docs/KPI_ACHIEVEMENT_STRATEGY_2026-01-31.md`
- 実装サマリー: `docs/KPI_PROJECT_COMPLETE_SUMMARY_2026-01-31.md`

---

**以上が、今朝からの協議に基づく全体的な最適化のまとめです。**
