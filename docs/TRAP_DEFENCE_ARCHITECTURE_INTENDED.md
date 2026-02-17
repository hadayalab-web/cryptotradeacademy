# Trap Defence OS — 本来の責務分担（意図したアーキテクチャ）

## 1. Trap Defence コアエンジン / コアデータ

コアが担うもの:

| 責務 | 説明 | 担当 Cron / API |
|------|------|-----------------|
| **Regular の TG 定期配信** | 有料版・6言語の定期ブリーフィング | `/api/cron` — **1日4回**（0,6,12,18 時 UTC） |
| **Minimal の TG 定期配信** | 無料版・ミニマル配信（Zeigarnik 等） | `/api/minimal-tg-delivery` — **1日4回** |
| **KIBA の TG アラート配信** | 異常検知時の 6 言語アラート | `/api/kiba-5min` — 5分（CQ 取得＋判定＋アラート） |

**CQ データの一本化**: Regular / Minimal / KIBA はすべて **同じ CQ の 5 分データ** を参照する。kiba-5min が 5 分ごとに **cq:latest** に書き、cron（Regular）と minimal-tg-delivery（Minimal）はそれを読んでスナップショット・配信に使う。緊急アラート廃止に伴い、cron の 15 分起動は廃止し、**cron は 1 日 4 回（Regular 枠のみ）** に変更済み。

コアデータ: スナップショット（btc:snapshot / btc:snapshot:early）、cq:latest、KV、Supabase のコアテーブル。

---

## 2. ML-PQT Engine ラン

| 責務 | 説明 | 担当 Cron / API |
|------|------|-----------------|
| **ラン（実行）** | 仕手 Bot 投稿へのリプライ（PQT）実行 | `/api/buzzweave-run`（3時間ごと） |
| **ログ/データ管理** | メトリクスポール（buzzweave_post_log）＋ MV 更新・lang_penalty（BuzzWeave 言語重み用） | `/api/buzzweave-metrics-poll`（15分・統合） |

ML-PQT は「投稿実行」と「そのログ・メトリクスの収集」に専念し、TG 定期配信や KIBA アラートはコアに任せる。

---

## 3. 境界の整理

- **コア**: Regular / Minimal / KIBA の 3 本の TG 配信と、それを支えるスナップショット・CQ・KIBA 判定。
- **ML-PQT**: PQT ランと、そのログ/データ管理のみ。

この分担になるよう、(1) cron から KIBA 実行・アラートを外し kiba-5min に一本化、(2) CQ は cq:latest（5 分データ）に一本化、(3) cron は 15 分起動をやめ 1 日 4 回（Regular 枠のみ）に変更済み。minimal 送信は minimal-tg-delivery のみで実施。
