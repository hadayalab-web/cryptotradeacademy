# Whop Webhook デプロイ＆テスト手順

**最終更新**: 2026-02-24

---

## 1. デプロイ

```powershell
cd c:\Users\chiba\hadayalab-automation-platform\cryptotradeacademy
npm run deploy
```

本番 URL: **https://cryptotradeacademy.vercel.app**  
Webhook エンドポイント: **https://cryptotradeacademy.vercel.app/api/whop-webhook**

---

## 2. Whop ダッシュボードで Webhook を設定

### 2.1 手順

1. [Whop Company Dashboard](https://whop.com/app/company) にログイン
2. **Settings** → **Developer** → **Webhooks**（または [Whop Webhooks](https://whop.com/app/company/settings/webhooks) に直接）
3. **Create Webhook** をクリック
4. 以下を設定:
   - **Endpoint URL**: `https://cryptotradeacademy.vercel.app/api/whop-webhook`
   - **Events**: 以下を選択
     - `checkout.completed`
     - `membership.created`
     - `membership.renewed`
     - `membership.activated`
     - `membership_activated`
     - `payment_succeeded`
     - `invoice_paid`
5. 保存後、**Signing Secret** をコピー

### 2.2 環境変数（Vercel）

Vercel の **Project Settings** → **Environment Variables** で以下を設定:

| 変数名 | 説明 | 必須 |
|--------|------|------|
| `WHOP_WEBHOOK_SECRET` | Whop Webhook の Signing Secret | 本番必須 |
| `FIRSTPROMOTER_API_KEY` | FirstPromoter Track Sale 用 | ref_id/promo 連携時 |
| `KV_REST_API_URL` | Vercel KV（重複防止・コンバージョン保存） | 推奨 |
| `KV_REST_API_TOKEN` | Vercel KV トークン | 推奨 |

**重要**: `WHOP_WEBHOOK_SECRET` 未設定だと本番では署名検証が失敗し、Webhook が拒否されます。

---

## 3. テスト方法

### 3.1 疎通確認（POST 受信のみ）

署名なしの簡易リクエストでエンドポイントが応答するか確認:

```powershell
# 開発時は署名検証スキップされる可能性あり。本番は WHOP_WEBHOOK_SECRET 必須。
curl -X POST "https://cryptotradeacademy.vercel.app/api/whop-webhook" `
  -H "Content-Type: application/json" `
  -d '{"type":"membership.activated","data":{}}'
```

期待: `200 OK` + `{"received":true}` または `{"received":false,...}`

### 3.2 実機購入テスト

1. **ref_id 付きリンク**で Whop チェックアウトに遷移  
   例: `https://whop.com/your-product?ref=YOUR_FIRSTPROMOTER_REF_ID`
2. **テスト購入**（最小額または Whop のテストモード）を完了
3. **Vercel Logs** で以下を確認:
   - `[Whop Webhook] 📨 Received webhook event:`
   - `[Whop Webhook] ✅ Conversion data extracted:`
   - ref_id または promo_code が取れていれば: `[Whop Webhook] ✅ FirstPromoter track/sale sent:`

### 3.3 Vercel ログの確認

- [Vercel Dashboard](https://vercel.com/hadayalab-projects-projects/cryptotradeacademy) → Deployments → 最新デプロイ → **Functions** → `whop-webhook` のログ
- または: `npm run vercel:logs` で取得

---

## 4. トラブルシュート

| 現象 | 確認・対応 |
|------|------------|
| 署名検証失敗 | `WHOP_WEBHOOK_SECRET` が正しく設定されているか。Whop の Signing Secret と一致するか |
| ref_id が取れない | Whop の checkout metadata / referrer_url に ref が含まれるか。実機 Webhook ペイロードをログで確認 |
| FirstPromoter に送らない | `(refId \|\| promoCode) && amount > 0` の条件を満たしているか。紹介なしの購入は 204 相当で送らない設計 |
| 重複送信 | KV が有効か。`fp_sent:{checkoutId}` で重複防止済み。同一購入で複数イベントが来ても 1 回のみ送信 |

---

## 5. 参考ドキュメント

- `docs/INTEGRATION_WHOP_X_FIRSTPROMOTER.md` — 連携設計
- `docs/FIRSTPROMOTER_WHOP_INTEGRATION_AUDIT.md` — 精緻点検レポート
