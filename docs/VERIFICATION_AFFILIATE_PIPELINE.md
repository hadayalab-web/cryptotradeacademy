# X–FirstPromoter–Whop アフィリエイトパイプライン 動作確認ガイド

デプロイ後に以下を順に確認する。

---

## 1. DM スカウト（dryRun: 送信なし）

候補検索のみ実行し、DM は送らない。

```bash
curl -s "https://cryptotradeacademy.vercel.app/api/affiliate-scout-run?dryRun=1"
```

**期待する結果の例:**
- `ok: true`, `dryRun: true`, `wouldSend: { handle, lang, textLength }` → 候補が見つかり、この @handle に送る想定
- `ok: false`, `reason: "no_slot_this_hour"` → 現在の UTC 時刻にスロットがない（21–23 時 UTC は空き枠なし）
- `ok: false`, `reason: "no_eligible_candidate"` → 検索結果の全員が既送信

---

## 2. DM スカウト（実送信・1通のみ）

`CRON_SECRET` を設定している場合のみ。1通だけ DM を送る。

```bash
curl -X POST "https://cryptotradeacademy.vercel.app/api/affiliate-scout-run?secret=YOUR_CRON_SECRET"
```

または:

```bash
curl -X POST "https://cryptotradeacademy.vercel.app/api/affiliate-scout-run" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

**期待する結果の例:**
- `ok: true`, `sent: { handle }` → DM 送信成功
- `ok: false`, `reason: "dm_send_failed"` → X API エラー（DM 権限・レート制限等を確認）

---

## 2'. 指定ハンドルへのテスト送信

特定の @handle に送る（検索・スロット・日次キャップをスキップ）。認証必須。

```bash
# dryRun（送信しない・本文確認のみ）
curl -s "https://cryptotradeacademy.vercel.app/api/affiliate-scout-run?targetHandle=kitunenzu0214&dryRun=1&secret=YOUR_CRON_SECRET"

# 実送信
curl -X POST "https://cryptotradeacademy.vercel.app/api/affiliate-scout-run?targetHandle=kitunenzu0214&secret=YOUR_CRON_SECRET"
```

`?lang=ja`（デフォルト）で日本語文面。他言語は `?lang=en` 等で指定。

---

## 3. FirstPromoter Webhook（テスト受信）

`FIRSTPROMOTER_WEBHOOK_SECRET` 未設定なら署名不要で受け付ける。

```bash
curl -X POST "https://cryptotradeacademy.vercel.app/api/firstpromoter-webhook" \
  -H "Content-Type: application/json" \
  -d '{"type":"promoter_accepted","email":"test@example.com","promoter_id":"fp_123"}'
```

**期待する結果:**
- `{"received":true,"eventType":"promoter_accepted"}` → 200 OK

---

## 4. Whop Webhook（本番で自動検証）

Whop ダッシュボードで Webhook URL を設定済みなら、**テスト購入** または既存成約でイベントが飛ぶ。

**確認方法:**
- Vercel → Project → Logs で `[Whop Webhook]` ログを確認
- `Received purchase event` → イベント受信
- `FirstPromoter track/sale sent` → ref_id / promo_code があり、track/sale 成功

Whop に「Send test webhook」があれば、`membership_activated` や `payment_succeeded` を送って動作確認できる。

---

## 5. Cron スケジュール確認

`vercel.json` の設定:

| Cron | スケジュール | 内容 |
|------|--------------|------|
| affiliate-scout-run | `*/15 * * * *` | 15分ごとに DM 1通送信（スロットがある時刻のみ） |

Vercel Dashboard → Project → Crons で次回実行予定を確認できる。

---

## 6. トラブルシュート

| 症状 | 確認項目 |
|------|----------|
| affiliate-scout-run が `no_slot_this_hour` | UTC 21–23 時はスロットなし。別の時刻で再試行 |
| `dm_send_failed` | X API の DM 権限（dm.read, dm.write）を確認 |
| Whop Webhook が 401 | `WHOP_WEBHOOK_SECRET` が Whop の署名と一致しているか |
| track/sale が飛ばない | metadata / referrer に ref_id または checkout に promo_code が含まれているか |
