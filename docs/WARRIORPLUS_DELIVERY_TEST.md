# WarriorPlus 決済完了後のフロー テスト手順

**目的:** 決済完了 → メール受信 → TG チャンネル参加まで、ユーザーが迷わず完了できるか確認する。

---

## 前提

- Vercel に **WARRIORPLUS_USE_RESEND_TG=1**、**WARRIORPLUS_SECURITY_KEY**、**RESEND_API_KEY** が設定済みであること。
- 言語別の TG リンク: **WARRIORPLUS_TG_INVITE_LINK_EN** 等、または **TELEGRAM_BOT_TOKEN** + **TELEGRAM_CHAT_ID_BTC_*** が設定済みであること。
- WarriorPlus の Notification URL が `https://cryptotradeacademy.vercel.app/api/whop-webhook` を指していること。

---

## 方法1: 擬似 IPN でメール〜TG までだけテスト（お金は使わない）

実際の決済は行わず、Webhook に「決済完了」の IPN を手動で送り、**メール送信 → 記載の TG リンクで参加** までを確認する。

### 1. テスト用メールアドレスを決める

- 自分が受信できるアドレス（例: 普段使う Gmail）を用意する。
- ここに Resend から「Your Telegram access – Trap Defence BTC」が届く想定。

### 2. Security Key を用意する

- Vercel の Environment Variables にある **WARRIORPLUS_SECURITY_KEY** の値を控える（本番と同一）。

### 3. 次の curl を実行する（PowerShell）

`YOUR_SECURITY_KEY` を実際の Security Key に、`your-email@example.com` をテスト用メールに置き換える。

**英語版（EN）の「購入」をシミュレートする例:**

```powershell
curl -X POST "https://cryptotradeacademy.vercel.app/api/whop-webhook" `
  -H "Content-Type: application/x-www-form-urlencoded" `
  -d "WP_ACTION=sale" `
  -d "IPN_ID=delivery_test_001" `
  -d "WP_ITEM_NUMBER=wso_vqp3r4" `
  -d "WP_ITEM_NAME=Trap Defence BTC English" `
  -d "WP_BUYER_EMAIL=your-email@example.com" `
  -d "WP_SECURITYKEY=YOUR_SECURITY_KEY"
```

- **IPN_ID** はテストのたびに変える（例: `delivery_test_002`）。同じ ID だと重複扱いでメールが送られない。
- **WP_ITEM_NUMBER** を変えると言語が変わる（EN: wso_vqp3r4, ES: wso_lxd2wq, PT: wso_dqz789, AR: wso_zn9g7p, KO: wso_vm68d9, JA: wso_zv25jy）。
- **TG専用（Whop を使わない）** の場合、`WARRIORPLUS_ITEM_NUMBER_*_WHOP_PLAN_ID` を設定していなくても、`WARRIORPLUS_ITEM_TO_LANG` に含まれる item（例: wso_vqp3r4）であれば Resend 送信される。

### 4. 確認すること

1. **メール** … 数分以内に指定アドレスに Resend からメールが届く。
2. **件名** … 「Your Telegram access – Trap Defence BTC」（または環境変数で設定した件名）。
3. **本文** … 「Join Telegram」などのリンクが1本（または言語別に複数）ある。
4. **TG 参加** … そのリンクをクリックし、該当の Telegram チャンネルに**迷わず参加できる**か確認する。
5. **迷惑メール** … 届かない場合は迷惑メールフォルダも確認する。

これで「メールが届く」「リンクから TG に参加できる」までを、決済なしで検証できる。

---

## 方法2: 本番フロー（WarriorPlus + Stripe で実際に1回購入）

本当に「決済完了 → IPN → メール → TG」を通して確認したい場合。

### 1. テスト用のメールアドレスを決める

- 自分が確実に受け取れるアドレス（本番で使わない Gmail など）を用意。

### 2. WarriorPlus の英語版オファーで購入

1. 英語 LP: https://whop.com/trapdefence/btc-en-warriorplus/
2. 「購読する」などで WarriorPlus に飛び、**テスト用メール**で $99/月 の購入を完了する。
3. 決済は Stripe 本番（または Stripe テストモードが使える場合はテストカードで）。

### 3. WarriorPlus が IPN を送信

- 決済が完了すると、WarriorPlus が **Notification URL** に IPN を送る。
- 自前の Webhook が IPN を受け取り、Resend でメール送信・TG 招待リンク（または固定リンク）を送る。

### 4. 確認すること

1. **メール** … 購入後、数分以内にテスト用アドレスに届くか。
2. **内容** … 件名・本文・TG リンクが想定どおりか。
3. **TG** … リンクをクリックして、英語用チャンネルに問題なく参加できるか。
4. **解約・返金** … テスト後、WarriorPlus の購入者ダッシュボードからキャンセル、または Stripe で返金する。

---

## チェックリスト（ユーザー目線）

- [ ] メールが届く（届かない場合は迷惑メール・Resend のログ確認）
- [ ] 件名・差出人が分かりやすい（support@cryptotradeacademy.io など）
- [ ] 本文に「Join Telegram」など明確な CTA とリンクがある
- [ ] リンクをクリックすると Telegram が開き、該当チャンネルに参加できる
- [ ] 複数言語でテストする場合は、WP_ITEM_NUMBER を変えて同様に確認

---

## トラブル時

- **メールが届かない** … Vercel の Function Logs で `[WarriorPlus IPN]` を検索し、IPN 受信・Resend 送信のログを確認。RESEND_API_KEY・差出人ドメインを確認。
- **401 Unauthorized** … `WP_SECURITYKEY` が Vercel の **WARRIORPLUS_SECURITY_KEY** と一致しているか確認。
- **TG リンクが無効** … 環境変数 **WARRIORPLUS_TG_INVITE_LINK_EN** 等、または Bot の createChatInviteLink が正しく動いているか確認。Vercel のログで `TG invite link created` やエラー有無を確認。
