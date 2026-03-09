# WarriorPlus 決済 → Resend で TG 招待（Whop は LP のみ）

## 前提

- **Whop = LP 機能のみ使用**。ボタンクリック後は **WarriorPlus（Stripe）決済へ片道リダイレクト**。Whop のチェックアウト・メンバーシップ・メール入力は使わない。
- 決済完了後のアクセス付与は **Resend で TG 招待リンクを送る**＋自前顧客管理で行う。

## フロー概要

1. **Whop LP** → ボタンクリック → **WarriorPlus 商品ページ**（片道リダイレクト）→ **Stripe 決済**
2. 決済完了 → WarriorPlus が **IPN** を `https://cryptotradeacademy.vercel.app/api/whop-webhook` に送信（現状どおり）
3. **IPN 受信時（付与系）**: Whop の 0円チェックアウトは使わず、**Resend で購入者メールに TG チャンネル招待リンクを送信**
4. **KeyGen URL**: 「メールを確認してください」の固定ページを返すか、Thank You に固定文言を表示
5. **解約時**: IPN の revoke で自前の購入者リストを無効化。TG キックは Bot でリスト照合するか、招待リンクを無効化で対応

## 環境変数（Vercel）

| 変数 | 必須 | 説明 |
|------|------|------|
| `WARRIORPLUS_USE_RESEND_TG` | ✅ | `1` で Whop チェックアウトをスキップし、KV＋Resend で処理 |
| `WARRIORPLUS_TG_CHANNEL_INVITE_LINK` | どちらか | 固定の TG 招待リンク。**未設定時**は Bot API で都度発行（下記を使用） |
| `TELEGRAM_BOT_TOKEN` | どちらか | 招待リンクを API で発行する場合に必須（Bot はチャンネル管理者であること） |
| `TELEGRAM_CHAT_ID_BTC_EN` / `ES` / `AR` / `PT_BR` / `KO` / `JA` | どちらか | 言語別チャンネル ID。IPN の `WP_ITEM_NUMBER` から言語を判定し、該当チャンネルの1回用・7日有効リンクを発行 |
| `WARRIORPLUS_ACCESS_URL` | 推奨 | KeyGen で返す固定 URL（「メールを確認してください」ページなど） |
| `WARRIORPLUS_POST_PURCHASE_EMAIL_SUBJECT` | 任意 | メール件名（未設定時: "Your Telegram access – Trap Defence BTC"） |
| `RESEND_API_KEY` | ✅ | Resend 送信用（既存） |

## 顧客データ（KV）

- **キー**: `warriorplus:customer:{planId}:{normalizedEmail}`
- **値**: JSON `{ paidAt, saleId, ipnId, action, revoked: false }`
- **解約時**: 同キーで `revoked: true`, `revokedAt`, `revokeAction` を付与して上書き
- **TTL**: 1年（解約後も履歴として保持）

## 実装の選択肢（参考）

### A. IPN 付与時に「Resend のみ」で TG リンク送信（Whop を使わない）

- `handleWarriorPlusIPN` 内で、付与系のとき:
  - B案・A案（Whop）は **スキップ**
  - 代わりに `sendResendEmail({ to: buyerEmail, subject: '...', html: TG招待リンク入り本文 })`
- KeyGen URL は固定の「メールを確認してください」ページ（自前 or Vercel の静的ページ）を返す
- 顧客リストは **KV** または **Supabase** に `warriorplus:customer:{email}` やテーブルで保存（解約時に無効化）

### B. IPN 付与時に「Whop 0円 URL」と「Resend メール」の両方（併用）

- 今の Whop フローは残しつつ、**追加で** Resend でも TG リンクを送る
- 購入者は「Whop でメール入力」か「メールのリンクから直接 TG」のどちらでも参加可能

### C. Whop を外し、自前 LP → WarriorPlus のみ

- 自前 LP を用意し、CTA で WarriorPlus の商品 URL へ遷移（Whop を使わない場合）
- 決済後の Thank You は WarriorPlus のまま。Notification URL で IPN 受信 → Resend 送信のみ
- 顧客管理は Supabase などで「email, plan_id, paid_at, revoked_at」を管理

## 推奨（シンプルに進める場合）

1. **A 案**で「付与系 IPN → Resend で TG 招待メールのみ送る」を実装
2. 環境変数 `WARRIORPLUS_USE_RESEND_TG=1` のときは Whop の 0円チェックアウトを作らず、Resend 送信のみ
3. `WARRIORPLUS_TG_CHANNEL_INVITE_LINK` に TG の招待リンク（`t.me/joinchat/xxx` など）を設定
4. KeyGen URL は `WARRIORPLUS_ACCESS_URL` に「メールを確認してください」用の固定 URL を設定

解約時の TG キックは「Bot が有効購入者リスト（KV/DB）を参照してキック」を別途実装する必要あり。招待リンクを「1回限り・期限付き」にしておけば、解約後の再参加は防ぎやすい。  
**Whop は LP のみ・片道リダイレクト**のため、Whop の membership / webhook 連携は使わない。

## 実装済み（A 案）

- `WARRIORPLUS_USE_RESEND_TG=1` のとき: 付与系 IPN で KV に顧客登録 ＋ Resend で TG 招待メール送信。KeyGen では `WARRIORPLUS_ACCESS_URL` を返す。
- 剥奪系 IPN で該当顧客を KV 上で `revoked: true` に更新。
- TG チャンネルからのキックは、Bot または Cron で「有効でない顧客（KV で revoked）」を検出して `kickChatMember` する別実装で対応可能。
