# EN Quote Repost — Variant G Sample（やり直し後）

**構成**: ヘッドライン → Gemini（CryptoQuant/市況＋無様なペルソナ言及）→ 無料チラ見せ＋説明＋VSL/Whop → 有料チラ見せ＋説明＋VSL/Whop → 反論定型 → CTA（価格・トライアル・コード）

---

## サンプル（EN）

Why does "that coin" you watch every day suddenly go crazy?

[Gemini: 市況データを渡して生成。例: "With the score where it is, sitting in the 'just watching' loop only burns you. Many are in the same hole. The way out is a framework."]

Today's free TG snippet: «Trap Score 12/100. Where's the exit?—» Rest in Telegram.

Full story in the VSL. Free sign-up (no card) here:
https://youtu.be/OqvqngJOiXc
https://whop.com/checkout/plan_9zf3nrYeweovV?utm_source=x&utm_medium=quote_repost&utm_campaign=minimal_version&utm_content=influencer_xxx

Regular Briefing snippet: «Whales loading. Next trap in 48h—» Rest in Whop.

15min Alerts + Exit Map. Upgrade here (50% off with code below):
https://youtu.be/fXgVsKhqDjI
https://whop.com/trapdefence/btc-regular-en/

This intel only works in real time. Whether you have it or not decides tradeable edge vs pure gamble. 1-day trial—see the report, cancel if it's not for you. Risk zero.

$99/mo = 0.2% of a $50k loss. 1-day trial, cancel anytime. Risk zero.
For you: code DEFEND50 = 50% off (next 50 only).
▼ Regular Briefing (1-day free trial)
https://whop.com/trapdefence/btc-regular-en/

#BTC #TrapDefence

---

## 変更点（総括対応）

| 項目             | 変更内容                                                                                                                                                                   |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Geminiフック** | reportData（trapScore, priceUsd, change24h, exchangeNetflow, whaleRatio, sentiment）を渡し、市況を把握した上で無様なペルソナ（含み損・思考停止・トレード依存）に言及させる |
| **チラ見せ**     | ラベルだけではなく実際のスニペット文（«Trap Score 12/100. Where's the exit?—» / «Whales loading. Next trap in 48h—»）を定型で挿入                                          |
| **リンク**       | リンクの前に説明文を追加（"Full story in the VSL. Free sign-up (no card) here:" / "15min Alerts + Exit Map. Upgrade here (50% off with code below):"）                     |
| **反論処理**     | Gemini廃止。分析に基づく定型文（OBJECTION_FIXED）で統一                                                                                                                    |
| **CTAブロック**  | 「Just for you... Code DEFEND50」のみやめ、PRICE_FRAMING・1日トライアル・リスクゼロ・コード50%オフ（次の50名）を分析積み上げの文言で構成                                   |

**設定ファイル**: `config/quoteRepostVariantGCopy.js`（チラ見せ・リンク説明・反論・CTAのSSOT）
