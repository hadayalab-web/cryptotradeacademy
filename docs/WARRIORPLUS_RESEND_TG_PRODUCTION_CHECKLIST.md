# WarriorPlus → 自前DB＋Resend＋TG 本番チェックリスト

数百〜数千のエンドユーザーを想定した確認用。

---

## ✅ 実装済み

| 項目 | 状態 |
|------|------|
| IPN 付与時: KV に顧客登録（planId + email） | ✅ |
| IPN 付与時: TG 招待リンク発行（Bot API createChatInviteLink、1回用・7日有効） | ✅ |
| IPN 付与時: Resend でメール送信（差出人 support@cryptotradeacademy.io） | ✅ |
| 言語別チャンネル（WP_ITEM_NUMBER → TELEGRAM_CHAT_ID_BTC_EN/ES/AR/PT_BR/KO/JA） | ✅ |
| IPN 剥奪時: KV の顧客を revoked に更新 | ✅ |
| IPN 重複防止（IPN_ID で KV キー） | ✅ |
| KeyGen: WARRIORPLUS_ACCESS_URL を返却 | ✅ |
| Security Key 検証（本番はキー必須） | ✅ |

---

## 本番前に確認すること

| 確認項目 | 内容 |
|----------|------|
| **Vercel 環境変数** | `WARRIORPLUS_USE_RESEND_TG=1`, `WARRIORPLUS_SECURITY_KEY`, `RESEND_API_KEY`, `TELEGRAM_BOT_TOKEN`, 各 `TELEGRAM_CHAT_ID_BTC_*`, `WARRIORPLUS_ACCESS_URL`（推奨） |
| **Resend** | `support@cryptotradeacademy.io` が送信元として利用可能か（ドメイン検証済みか） |
| **Telegram Bot** | 各言語チャンネルで Bot が管理者かつ「ユーザーを招待する」権限ありか |
| **WarriorPlus** | Notification URL / KeyGen URL が `https://cryptotradeacademy.vercel.app/api/whop-webhook`（および `?output=text`）を指しているか |

---

## スケール・運用のメモ

- **KV**: 顧客数が数千でもキー数は「購入者数」程度。Vercel KV で問題なし。
- **Resend**: プランに応じた送信数制限あり。バースト時はレート制限に当たる可能性あり（通常の購入ペースならまず問題なし）。
- **Telegram createChatInviteLink**: リクエスト過多で一時制限される可能性あり。連続大量購入時のみ考慮でよい。
- **解約後の TG キック**: 現状は KV で `revoked: true` にするのみ。チャンネルから実際にキックする処理は別実装（Cron や Bot で「有効顧客リストにいないメンバーを kick」など）で対応可能。
- **メール本文**: 現状は英語のみ。必要なら言語別テンプレ（件名・本文）の追加を検討。

---

## 障害時のフォールバック

- **createChatInviteLink 失敗**: 招待リンクは作れないが、**メールは送信する**。本文は「サポートに連絡してください」案内（support@cryptotradeacademy.io）。件名は「Your purchase is confirmed – ...」。購入者はメールで案内を受け取り、サポート対応でリンクを手動発行可能。
- **Resend 失敗**: ログに `Resend email failed`。KV への顧客登録は済んでいるので、手動で再送するか、別途リトライ処理を検討可能。

実装はここまでで完了。本番投入後はログと Resend の配信状況をしばらく見ると安心です。
