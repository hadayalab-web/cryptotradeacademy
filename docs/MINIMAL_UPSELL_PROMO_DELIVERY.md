# Minimal アップセルプロモ配信

Minimal 購読者向けに、**Minimal とは別に** 1日2回、Regular Briefing へのアップセルプロモを送る仕組み。

## 仕様

- **解釈B**: プロモは**専用メッセージ**として送信（Minimal ブリーフィングの差し替えではない）。
- **6言語 × 2パターン**: A（直球アップセル）と B（補強・世界観）をローテ。
- **送信先**: Minimal と同じチャット（`TELEGRAM_CHAT_ID_MINIMAL_*`）。同じ購読者が受け取る。
- **導線**: 「Minimal にアクセスしたときの案内と同じルートで」リンクを受け取る（ref は個別差し込まない前提）。

## ファイル

| ファイル | 役割 |
|----------|------|
| `config/minimalUpsellPromoTemplates.js` | 6言語 × A/B の 12 本の文案 |
| `api/minimal-upsell-promo.js` | GET で Cron 呼び出し、A/B 決定して各言語に送信 |

## API

- **URL**: `GET /api/minimal-upsell-promo`
- **認証**: `Authorization: Bearer <CRON_SECRET>`
- **クエリ** (任意):
  - `pattern=A` または `pattern=B` でその回のパターン固定。
  - 未指定時: UTC 0–11 時 → A、12–23 時 → B。

## 推奨 Cron スケジュール（1日2回）

**UTC 08:00 → A（直球）／UTC 20:00 → B（構造）** を推奨。

- **08:00 UTC**: アジア・中東・欧州が活動時間帯。直球で「防御意識」を立てる。
- **20:00 UTC**: 欧州・南米・北米が活動時間帯。構造系で振り返りと理解を深める。
- **A/B 自動**: 0–11 時 → A、12–23 時 → B なので、`?pattern=` を付けなくても 08:00→A・20:00→B になる。
- **Minimal との同時刻**: Minimal が 4時間おき（00, 04, 08, 12, 16, 20 UTC）のため、08 と 20 は Minimal 配信と重なる。通知回数を増やさず「無料→有料」の導線だけ強化できる。

```
08:00 UTC → GET /api/minimal-upsell-promo
20:00 UTC → GET /api/minimal-upsell-promo
```

Vercel Dashboard の Cron、または `vercel.json` の例:

- `0 8 * * *` （毎日 08:00 UTC）
- `0 20 * * *` （毎日 20:00 UTC）

固定したい場合のみクエリを使用:

- `GET /api/minimal-upsell-promo`（推奨・時刻で A/B 自動）
- `GET /api/minimal-upsell-promo?pattern=A` / `?pattern=B` で固定

## 環境変数

Minimal 配信と同じでよい。

- `TELEGRAM_BOT_TOKEN` または `TELEGRAM_BOT_TOKEN_MINIMAL`
- `TELEGRAM_CHAT_ID_MINIMAL_EN`, `TELEGRAM_CHAT_ID_MINIMAL_JA`, … （言語別）
- `MINIMAL_MULTI_LANG=true`（6言語配信時）
- `ENABLE_TELEGRAM` が `false` のときは送信スキップ
