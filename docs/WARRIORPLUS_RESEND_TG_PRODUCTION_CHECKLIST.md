# WarriorPlus → 自前DB＋Resend＋TG 本番チェックリスト

数百〜数千のエンドユーザーを想定した確認用。

---

## ✅ 実装済み

| 項目 | 状態 |
|------|------|
| IPN 付与時: KV に顧客登録（planId または itemNumber + email） | ✅ |
| IPN 付与時: 6言語パックで常に6本TGリンク（固定リンク優先、なければ Bot API） | ✅ |
| IPN 付与時: Resend でアクセスメール送信（**6言語対応**・導線言語で件名・本文） | ✅ |
| 言語別チャンネル（WARRIORPLUS_TG_INVITE_LINK_* / TELEGRAM_CHAT_ID_BTC_*） | ✅ |
| IPN 剥奪時: KV の顧客を revoked に更新 | ✅ |
| IPN 剥奪時: **剥奪系メールを6言語で送信**（解約・返金・dispute・支払失敗・停止） | ✅ |
| IPN 重複防止（IPN_ID で KV キー・14日保持） | ✅ |
| KeyGen: WARRIORPLUS_ACCESS_URL を返却 | ✅ |
| Security Key 検証（本番はキー必須） | ✅ |
| IPN 生データ保存時に WP_SECURITYKEY を [REDACTED] にして保存 | ✅ |
| 未知 action / buyerEmail 欠落時のログ（監視用） | ✅ |

---

## 本番前に確認すること

| 確認項目 | 内容 |
|----------|------|
| **Vercel 環境変数** | `WARRIORPLUS_USE_RESEND_TG=1`, `WARRIORPLUS_SECURITY_KEY`, `RESEND_API_KEY`, `TELEGRAM_BOT_TOKEN`, 各 `TELEGRAM_CHAT_ID_BTC_*` または `WARRIORPLUS_TG_INVITE_LINK_EN`〜`JA`, `WARRIORPLUS_ACCESS_URL`（KeyGen 用） |
| **Resend** | `support@cryptotradeacademy.io` が送信元として利用可能か（ドメイン検証済みか） |
| **Telegram Bot** | 各言語チャンネルで Bot が管理者かつ「ユーザーを招待する」権限ありか（固定リンクを使う場合は Bot 不要） |
| **WarriorPlus** | Notification URL / KeyGen URL が `https://cryptotradeacademy.vercel.app/api/whop-webhook`（および `?output=text`）を指しているか |
| **WARRIORPLUS_SECURITY_KEY** | W+ の Security Key と完全一致しているか（本番では未設定だと警告ログ） |

---

## スケール・運用のメモ

- **KV**: 顧客数が数千でもキー数は「購入者数」程度。Vercel KV で問題なし。
- **Resend**: プランに応じた送信数制限あり。バースト時はレート制限に当たる可能性あり（通常の購入ペースならまず問題なし）。
- **Telegram createChatInviteLink**: 固定リンク（WARRIORPLUS_TG_INVITE_LINK_*）を優先するため、Bot API 呼び出しは補助的。連続大量購入時も負荷は抑えられる。
- **解約後の TG キック**: 現状は KV で `revoked: true` にする＋ユーザーに剥奪メール送信。チャンネルから実際にキックする処理は別実装で対応可能。
- **メール**: 付与・剥奪とも **EN/ES/PT_BR/AR/KO/JA の6言語**。導線の itemNumber から言語を決定。

---

## 障害時のフォールバック

- **createChatInviteLink 失敗**: 招待リンクは作れないが、**メールは送信する**。本文は「サポートに連絡してください」案内（support@cryptotradeacademy.io）。購入者はメールで案内を受け取り、サポート対応でリンクを手動発行可能。
- **Resend 失敗**: ログに `Resend email failed` または `Revoke email failed`。KV への顧客登録／剥奪は済んでいるので、手動で再送するか、別途リトライ処理を検討可能。
- **未知の WP_ACTION**: ログに `Unknown action (no grant/revoke)`。W+ が新種のイベントを送った場合の監視用。
- **buyerEmail 欠落**: ログに `Missing buyerEmail for action`。付与・剥奪はスキップされるが、IPN は 200 で受け付ける。

本番投入後は Vercel Function Logs で `[WarriorPlus IPN]` を検索し、Resend の配信状況とあわせてしばらく監視すると安心です。
