# 引用リポスト — 実際の投稿内容（プレビュー）

本番で `postQuoteTweet(quoteText, influencerTweetId)` に渡している **quoteText** の構成と実例。

---

## 1. 構成（並び順）

```
[1] Grok が生成する本文
    - HEADLINE（1行・問いかけ・絵文字）
    - PERSONA HOOK（鷲掴み・痛みに共感）
    - PRODUCT INTRO（Minimal 無料 + Regular 有料・価格・DEFEND50）
    - （オプション）ペルソナ testimonial 1行（🔥 I'm Safe / Trap Avoided 系）
    - OBJECTION HANDLING（反論処理・testimonial または社会的証明）
    - HASHTAGS（#BTC #TrapDefence + 1つ）

[2] リンクブロック（定型・getLinkBlockGrokStyle）
    - 無料 CTA + Whop Minimal チェックアウト URL
    - 有料 CTA + Whop Regular 商品 URL
    - ─────
    - VSL（Minimal/Regular）YouTube リンク

[3] 社会的証明（getSocialProofText）
    - 例: 🔥 3,200+ Trap Avoided This Week (6 langs, worldwide) 👥 I'm Safe
```

---

## 2. リンクブロック実例（EN）

```
👇 Get free defense first (no card)
https://whop.com/checkout/plan_9zf3nrYeweovV?utm_source=x&utm_medium=quote_repost&utm_campaign=minimal_version&utm_content=influencer_PreviewUser
▼ Protect your assets seriously (DEFEND50 50% off)
https://whop.com/trapdefence/btc-regular-en/
─────
▼ Free video (full story)
https://youtu.be/OqvqngJOiXc
▼ Upgrade video
https://youtu.be/fXgVsKhqDjI
```

※ 実際の Minimal URL は `utm_content=influencer_{@インフルエンサー名}` になる。

---

## 3. 社会的証明実例（6言語・全世界規模）

| 言語 | 表示例 |
|------|--------|
| en | 🔥 3,200+ Trap Avoided This Week (6 langs, worldwide) 👥 I'm Safe |
| ja | 🔥 今週全世界3,200+トラップ回避（6言語） 👥 I'm Safe |
| es | 🔥 3,200+ Trampa Evitada Esta Semana (6 idiomas, mundial) 👥 I'm Safe |
| pt-br | 🔥 3,200+ Armadilha Evitada Esta Semana (6 idiomas, mundial) 👥 I'm Safe |
| ar | 🔥 3,200+ الفخ اتجنب هذا الأسبوع (6 لغات، عالمي) 👥 I'm Safe |
| ko | 🔥 이번 주 전세계 3,200+ 함정 회피 (6개국어) 👥 I'm Safe |

※ 数字は 2,800〜4,600 のランダム＋当日の「助かった」カウント。`toLocaleString()` で 3桁区切り。

---

## 4. 全文プレビュー（Grok 部分は例文）

以下は **EN で Grok が生成した場合のイメージ**（testimonial・社会的証明込み）。

```
Still revenge-trading every time the chart dumps? 🔴

That moment you see -8% and your finger hovers over the buy button. You're not alone. The way out isn't more screen time—it's a number. Trap Score 28 today. Exchange netflow negative. Whale ratio 0.42. I waited.

FREE Minimal: Trap Score, gut vs data, no card. Stop losses before they grow. PAID Regular: 15min Alerts + Exit Map, $99/mo, 1-day trial, risk zero. Code DEFEND50 for 50% off. Protect your assets—not just "earn."
"🔥 I'm Safe. Trap avoided. Score was 12/100—I sat out. Would've been rekt. — J, swing"

Expensive? One miss used to cost me 6 figures. 3,200+ avoided the trap this week worldwide. We're the ones who didn't get rekt.

#BTC #TrapDefence #Crypto

👇 Get free defense first (no card)
https://whop.com/checkout/plan_9zf3nrYeweovV?...
▼ Protect your assets seriously (DEFEND50 50% off)
https://whop.com/trapdefence/btc-regular-en/
─────
▼ Free video (full story)
https://youtu.be/OqvqngJOiXc
▼ Upgrade video
https://youtu.be/fXgVsKhqDjI

🔥 3,200+ Trap Avoided This Week (6 langs, worldwide) 👥 I'm Safe
```

---

## 5. 実際に1本分を生成して確認する

**API あり（Grok で本文生成）:**

```bash
node scripts/preview-quote-repost-content.js en
node scripts/preview-quote-repost-content.js ja
```

**API なし（リンクブロック＋社会的証明のみ）:**

```bash
node scripts/preview-quote-repost-content.js en --dry
```

`--dry` で Grok を呼ばず、リンクブロックと社会的証明の実出力だけ確認できる。

---

## 6. 参照コード

- 本文生成: `services/salesLetterContest.js`（buildGrokOnlyPrompt, runGrokOnlySalesLetter）
- リンクブロック: `services/salesLetterContest.js`（getLinkBlockGrokStyle）
- 社会的証明: `services/telegram/reaction-counter.js`（getSocialProofText）
- 投稿時の組み立て: `api/x-quote-repost.js`（quoteText = grokText + linkBlock、その後 + socialProofText）
