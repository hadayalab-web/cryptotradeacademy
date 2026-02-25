# FirstPromoter Assets — コピペ用

**使い方:** 各 ## 見出しの下の Content をコピーし、FirstPromoter → Assets → Add Asset → Text で貼り付け。
Asset name は ## 見出しの名前と同じにする。

## X プロフィール用 URL（FirstPromoter に飛ばす）

**X の「ウェブサイト」欄に貼るリンク。** クリックで FirstPromoter 招待ページへ。出所は `utm_source=x_profile` で識別。

- **取得方法:** 環境変数 `FIRSTPROMOTER_INVITE_URL` を設定している場合、その URL に `?utm_source=x_profile`（既に `?` があれば `&utm_source=x_profile`）を付けたものがプロフィール用。
- **コード:** `config/affiliateRecruitConfig.js` の `getFirstPromoterProfileUrl()` で同じURLを取得可能。

---

## X DM（6言語・Copilot 最適化）

**単一ソース:** `config/affiliateRecruitDmTemplates.js`（リクルート） / `config/affiliateScoutDmTemplates.js`（スカウト）。痛み→救済→CTA。DM→LP→登録後 の一本血流。

---

## 導線フロー（最適化版）

| 段階 | 媒体 | 内容 |
|------|------|------|
| 1 | X DM | 壊れた商品→50%報酬→招待リンク |
| 2 | サインアップページ | `AFFILIATE_EXPECTATIONS_LP_*`（地獄の島→天国の島＋**ユーザーの喜びの声**＋**アフィリ成功事例**＋報酬＋やること） |
| 3 | ウェルカムメール | `WELCOME_POST_REGISTER_*`（＋**アフィリ成功事例1件**で背中押し） |
| 4 | ダッシュボード | START_HERE |
| 5 | 基礎 | AFFILIATE_TERMS, `AFFILIATE_FAQ_*` |
| 6 | 社会的証明 | **`USER_TESTIMONIALS_*`**（ユーザーの喜びの声 フル版）、**`AFFILIATE_SUCCESS_CASES_*`**（アフィリ成功事例 フル版） |
| 7 | 実行 | `QUICK_START_DAY1_*`, `PURCHASE_INVITE_TEMPLATE_*` |
| 8 | 素材 | スワイプ（`REGULAR_BRIEFING_SWIPE_*`, `KIBA_SWIPE_*`, `AI_REVIEW_*`）, `USER_TESTIMONIALS_*`, `X_COPY_*` |
| 9 | ショート動画 | `SHORT_VIDEO_SCRIPT_SRT_EN` 〜 `_JA`（6言語）、`SHORT_VIDEO_GUIDE_EN` 〜 `_JA`（6言語）。Minimal TG リンク挿入済み。 |

---

## EN版 FirstPromoter 実装用（コピペ用）

**まず EN から実装するときのコピペ元。** FirstPromoter → Emails → Triggers で1通ずつ作成。Variables から `{{promotion.referral_link}}`・`{{campaign.name}}` を挿入。

### イベントトリガー（1〜9）＋ 初動（15〜17）＋ 時間ベース（10〜14）＝ 17通

| # | Trigger | Subject |
|---|---------|---------|
| 1 | Promoter accepted | Welcome. You've left Hell Island — Day 1 in 3 steps |
| 2 | Promoter pending | Application under review — please wait |
| 3 | Promoter rejected | About your application — please see |
| 4 | Lead signup | Welcome to Minimal — next steps |
| 5 | Reward created | First commission earned 🎉 |
| 6 | Payout completed | Payout completed |
| 7 | Count reached | [X] conversions reached — onward to the next goal |
| 8 | Inactivity | Still distributing Minimal? |
| 9 | Recurring | Weekly reminder — share Minimal |
| **15** | **Promoter accepted + 1 day** | **Day 1 - Share Minimal once** |
| **16** | **Promoter accepted + 2 days** | **48 hours in - Did you share Minimal yet?** |
| **17** | **Promoter accepted + 3 days** | **3 days in - One share today** |
| 10 | {{campaign.name}} + 7 days | 7 days since signup — Did you take the first step? |
| 11 | {{campaign.name}} + 14 days | 2 weeks since signup — Getting into the distribution rhythm? |
| 12 | {{campaign.name}} + 30 days | 1 month since signup — Monthly check-in |
| 13 | {{campaign.name}} + 60 days | 2 months since signup — Consistency is power |
| 14 | {{campaign.name}} + 90 days | 3 months since signup — Stacking rewards |

---

**1. Promoter accepted**

Subject: Welcome. You've left Hell Island — Day 1 in 3 steps

Body（以下をそのままコピペ）:

```
Welcome. You've completely left Hell Island.

From here, you're not selling broken products anymore. You're the one who delivers a shield to your audience.

Trap Defence BTC is the only academy that tells users to wait. So churn stays low, and your commissions compound instead of burning out.

---

**【First step—do this only】**

1. Share Minimal once (profile, post, or DM)
2. Add one testimonial—copy-paste
3. When they react, send ref link + DEFEND50

That's enough. Playbooks and swipes are ready. Your role: distribute.

---

**【Others did it】**

Promoted 5 products, zero conversions → switched to Trap Defence. Minimal as lead magnet. First sale within hours. 7 conversions in 1 week.

No special skills needed. You can replicate the same flow.

---

Your referral link: {{promotion.referral_link}}

From today, your audience keeps surviving.
```

---

**2. Promoter pending**

Subject: Application under review — please wait

Body:
```
Thank you for registering.
We're reviewing your application. We'll be in touch within 24–48 hours.
Please bear with us.
```

---

**3. Promoter rejected**

Subject: About your application — please see

Body:
```
Thank you for applying.
Unfortunately we can't approve your application at this time.
If you have questions, contact support.
You may reapply if your circumstances change.
```

---

**4. Lead signup**

Subject: Welcome to Minimal — next steps

Body:
```
Thanks for signing up for Minimal.
Check the free brief for the full market picture.
When you're ready for the full version, use the link below.
```

---

**5. Reward created**

Subject: First commission earned 🎉

Body:
```
Congratulations.
Your distribution became someone's "shield."

Next steps:
- Share Minimal more
- Post REGULAR_BRIEFING_SWIPE
- When they react → ref link + DEFEND50

Your link: {{promotion.referral_link}}
```

---

**6. Payout completed**

Subject: Payout completed

Body:
```
Your payout is complete. Please confirm.

Keep distributing Minimal and delivering shields to your audience.
Recurring commissions keep coming as long as referrals stay.
```

---

**7. Count reached**

Subject: [X] conversions reached — onward to the next goal

Body:
```
Congratulations.
You've hit a conversion milestone.

Next steps:
- Share Minimal 3+ times/week
- Post REGULAR_BRIEFING_SWIPE on volatility days

Your link: {{promotion.referral_link}}
```

---

**8. Inactivity**

Subject: Still distributing Minimal?

Body:
```
We haven't seen dashboard activity recently. All good?

Remember the first steps:
1. Share Minimal once
2. Add one testimonial
3. When they react → ref link + DEFEND50

Your link: {{promotion.referral_link}}
```

---

**9. Recurring**

Subject: Weekly reminder — share Minimal

Body:
```
Did you share Minimal this week?
Profile, post, or DM—any one is fine.

Adding a user testimonial helps.
Copy-paste from REGULAR_BRIEFING_SWIPE.

Your link: {{promotion.referral_link}}
```

---

### 初動トリガー（15〜17）

Promoter accepted の 1日 / 2日 / 3日後に発火。トリガーは Promoter accepted、遅延は 1 day / 2 days / 3 days（**seconds ではない**）。

---

**15. 1 day after promoter accepted**（登録1日後）

Subject: Day 1 - Share Minimal once

Body:
```
Hey {{promoter.first_name}},

You signed up yesterday. You're already on the right side - delivering shields, not selling broken products.

Your first step is simple:

1. Share Minimal once (profile, post, or DM)
2. Add one testimonial
3. When they react - ref link + DEFEND50

Do it today. One share is enough to start the flow.

Your link: {{promotion.referral_link}}
```

---

**16. 2 days after promoter accepted**（登録2日後）

Subject: 48 hours in - Did you share Minimal yet?

Body:
```
Hey {{promoter.first_name}},

Two days since you left Hell Island. You're now the one who delivers shields.

Your first step still stands:

1. Share Minimal once
2. Add one testimonial
3. When they react - ref link + DEFEND50

Not yet? Do it today.
One share unlocks the flow.

Your link: {{promotion.referral_link}}
```

---

**17. 3 days after promoter accepted**（登録3日後）

Subject: 3 days in - One share today

Body:
```
Hey {{promoter.first_name}},

Three days in. You're the one who delivers shields.

First step: share Minimal once today. That's it.

1. Share Minimal once
2. Add one testimonial
3. When they react - ref link + DEFEND50

One share today keeps the flow going.

Your link: {{promotion.referral_link}}
```

---

### 時間ベーストリガー（10〜14）

キャンペーン内で「登録からの日数」で発火。Trigger name に `{{campaign.name}}` を含める場合、FirstPromoter の Variables から挿入。

---

**10. {{campaign.name}} – first 7 days**（7日後）

Subject: 7 days since signup — Did you take the first step?

Body:
```
One week in.
You're no longer on "Hell Island"—you're the one delivering shields.

First step is simple:

1. Share Minimal once (profile / post / DM)
2. Add one testimonial
3. When they react → ref link + DEFEND50

Not yet? Do it today.
Already did? **Add one more share this week.**

Your link: {{promotion.referral_link}}
```

---

**11. {{campaign.name}} – first 2 weeks**（14日後）

Subject: 2 weeks since signup — Getting into the distribution rhythm?

Body:
```
Two weeks in. Still sharing Minimal?

Points:

- 2–3 times/week minimum
- Post REGULAR_BRIEFING_SWIPE on volatility days—it gets reactions
- When they say "I want to buy" → **immediately** ref link + DEFEND50

Recurring means you get paid every month as long as the referral stays.
**Keep distributing and commissions stack.**

Your link: {{promotion.referral_link}}
```

---

**12. {{campaign.name}} – first month review**（30日後）

Subject: 1 month since signup — Monthly check-in

Body:
```
One month in.
You've been delivering shields to your audience.

Quick check:

- Did you share Minimal 2+ times/week?
- Any conversions? If yes, keep going
- If not, **always add testimonial + REGULAR_BRIEFING_SWIPE on volatility days**

Check conversions and earnings in your dashboard.
Let's keep the same pace next month.

Your link: {{promotion.referral_link}}
```

---

**13. {{campaign.name}} – second month review**（60日後）

Subject: 2 months since signup — Consistency is power

Body:
```
Two months in.
If you're still distributing, you're solidly a shield-deliverer.

Recurring commissions keep coming as long as referrals stay.
More conversions = thicker monthly earnings base.

Not yet? Start today:

Share Minimal once → add testimonial → when they react → ref link + DEFEND50

Your link: {{promotion.referral_link}}
```

---

**14. {{campaign.name}} – third month review**（90日後）

Subject: 3 months since signup — Stacking rewards

Body:
```
Three months in.
If you've made it here, you already have a stacking base.

Recurring means monthly pay as long as referrals stay.
The longer you continue, the thicker the earnings layer.

Going forward:

Share Minimal 2+ times/week →
REGULAR_BRIEFING_SWIPE on volatility days →
When they react → ref link + DEFEND50

Same pace = stacking rewards.

Your link: {{promotion.referral_link}}
```

---

## START_HERE（6言語）

FirstPromoter ダッシュボード「はじめに」用。言語別ガイド（Minimal リンク・API・Assets 一覧）は https://cryptotradeacademy.vercel.app/affiliate/start で選択。

Click and choose: English | Español | Português | العربية | 한국어 | 日本語

---

### START_HERE_EN
🚀 START HERE — This is your starting point

First, pick your language.

Other languages (Minimal links, assets list):
https://cryptotradeacademy.vercel.app/affiliate/start

---

🇬🇧 English speakers — Your first 5 steps

1. **Your referral link**
   {{promotion.referral_link}}

2. **Dashboard**
   {{company.promoters_login}}

3. **Lead magnet (most important)**
   Minimal (free) TG:
   https://t.me/cryptotradeacademytrialenglish
   → Share in bio, posts, DMs, replies
   → The product and testimonials do the selling. You just distribute.

4. **Purchase flow (when they buy)**
   Send ref link + code **DEFEND50**
   → That links the sale to you.

5. **Available Assets (copy-paste ready)**
   - REGULAR_BRIEFING_SWIPE_EN
   - KIBA_SWIPE_EN
   - PURCHASE_INVITE_TEMPLATE_EN
   - QUICK_START_DAY1_EN
   - AFFILIATE_FAQ_EN
   - X_COPY_EN_1line / 3lines / 5lines
   - AFFILIATE_TERMS_EN

---

Bookmark this page. When lost, come back here—the flow stays intact.

---

### START_HERE_ES
🚀 EMPIEZA AQUÍ — Este es tu punto de partida

Primero, elige tu idioma.

Otros idiomas (enlaces Minimal, lista de assets):
https://cryptotradeacademy.vercel.app/affiliate/start

---

🇪🇸 Spanish speakers — Tus primeros 5 pasos

1. **Tu enlace de referido**
   {{promotion.referral_link}}

2. **Dashboard**
   {{company.promoters_login}}

3. **Lead magnet (más importante)**
   Minimal (gratis) TG:
   https://t.me/cryptotradeacademytrialspanish
   → Comparte en bio, posts, DMs, respuestas
   → El producto y testimonios venden. Tú solo distribuyes.

4. **Flujo de compra (cuando compren)**
   Envía ref link + código **DEFEND50**
   → Eso enlaza la venta contigo.

5. **Assets disponibles (listos para copiar-pegar)**
   - REGULAR_BRIEFING_SWIPE_ES
   - KIBA_SWIPE_ES
   - PURCHASE_INVITE_TEMPLATE_ES
   - QUICK_START_DAY1_ES
   - AFFILIATE_FAQ_ES
   - X_COPY_ES_1line / 3lines / 5lines
   - SHORT_VIDEO_SCRIPT_SRT_ES
   - AFFILIATE_TERMS_ES

---

Guarda esta página. Si te pierdes, vuelve aquí—el flujo se mantiene.

---

### START_HERE_PT
🚀 COMECE AQUI — Este é seu ponto de partida

Primeiro, escolha seu idioma.

Outros idiomas (links Minimal, lista de assets):
https://cryptotradeacademy.vercel.app/affiliate/start

---

🇧🇷 Portuguese speakers — Seus primeiros 5 passos

1. **Seu link de referido**
   {{promotion.referral_link}}

2. **Dashboard**
   {{company.promoters_login}}

3. **Lead magnet (mais importante)**
   Minimal (grátis) TG:
   https://t.me/cryptotradeacademytrialportugues
   → Compartilhe em bio, posts, DMs, respostas
   → O produto e depoimentos vendem. Você só distribui.

4. **Fluxo de compra (quando comprarem)**
   Envie ref link + código **DEFEND50**
   → Isso vincula a venda a você.

5. **Assets disponíveis (prontos para copiar-colar)**
   - REGULAR_BRIEFING_SWIPE_PT
   - KIBA_SWIPE_PT
   - PURCHASE_INVITE_TEMPLATE_PT
   - QUICK_START_DAY1_PT
   - AFFILIATE_FAQ_PT
   - X_COPY_PT_1line / 3lines / 5lines
   - SHORT_VIDEO_SCRIPT_SRT_PT
   - AFFILIATE_TERMS_PT

---

Salve esta página. Se se perder, volte aqui—o fluxo se mantém.

---

### START_HERE_AR
🚀 ابدأ هنا — هذه نقطة انطلاقك

أولاً، اختر لغتك.

لغات أخرى (روابط Minimal، قائمة المواد):
https://cryptotradeacademy.vercel.app/affiliate/start

---

🇸🇦 Arabic speakers — خطواتك الخمس الأولى

1. **رابط الإحالة**
   {{promotion.referral_link}}

2. **Dashboard**
   {{company.promoters_login}}

3. **Lead magnet (الأهم)**
   Minimal (مجاني) TG:
   https://t.me/cryptotradeacademytriaarabic
   → شارك في البايو، المنشورات، DMs، الردود
   → المنتج والشهادات تبيع. أنت توزّع فقط.

4. **تدفق الشراء (عند الشراء)**
   أرسل ref link + الرمز **DEFEND50**
   → يربط ذلك البيع بك.

5. **المواد المتاحة (جاهزة للنسخ)**
   - REGULAR_BRIEFING_SWIPE_AR
   - KIBA_SWIPE_AR
   - PURCHASE_INVITE_TEMPLATE_AR
   - QUICK_START_DAY1_AR
   - AFFILIATE_FAQ_AR
   - X_COPY_AR_1line / 3lines / 5lines
   - SHORT_VIDEO_SCRIPT_SRT_AR
   - AFFILIATE_TERMS_AR

---

احفظ هذه الصفحة. إن ضعت، ارجع هنا—التدفق يبقى سليماً.

---

### START_HERE_KO
🚀 여기서 시작 — 여기가 당신의 출발점

먼저 언어를 선택하세요.

다른 언어 (Minimal 링크, assets 목록):
https://cryptotradeacademy.vercel.app/affiliate/start

---

🇰🇷 Korean speakers — 처음 5단계

1. **소개 링크**
   {{promotion.referral_link}}

2. **Dashboard**
   {{company.promoters_login}}

3. **리드마그넷 (가장 중요)**
   Minimal (무료) TG:
   https://t.me/cryptotradeacademytrialkorean
   → 바이오, 포스트, DM, 답글에 공유
   → 제품과 후기가 판다. 당신은 배포만.

4. **구매 안내 (구매 시)**
   ref 링크 + 코드 **DEFEND50** 전달
   → 이렇게 하면 성약이 연결됨.

5. **사용 가능한 Assets (복붙 가능)**
   - REGULAR_BRIEFING_SWIPE_KO
   - KIBA_SWIPE_KO
   - PURCHASE_INVITE_TEMPLATE_KO
   - QUICK_START_DAY1_KO
   - AFFILIATE_FAQ_KO
   - X_COPY_KO_1line / 3lines / 5lines
   - SHORT_VIDEO_SCRIPT_SRT_KO
   - AFFILIATE_TERMS_KO

---

이 페이지를 북마크하세요. 길을 잃으면 여기로 돌아오세요—흐름이 유지됩니다.

---

### START_HERE_JA
🚀 はじめに — ここからスタート

まずは言語を選んでください。

日本語以外の方はこちら（Minimal リンク・Assets 一覧）:
https://cryptotradeacademy.vercel.app/affiliate/start

---

🇯🇵 日本語話者のあなたへ — 最初の5ステップ

1. **あなたの紹介リンク**
   {{promotion.referral_link}}

2. **ダッシュボード**
   {{company.promoters_login}}

3. **リードマグネット（最重要）**
   Minimal（無料）TG:
   https://t.me/cryptotradeacademytrialjapanese
   → プロフ・投稿・DM・リプライで配布
   → 説得は商品と証言が担う。あなたは配布するだけ。

4. **購入案内（成約時の流れ）**
   ref リンク ＋ コード **DEFEND50** を送る
   → これで成約に紐付く。

5. **利用できる Assets（コピペで使える）**
   - REGULAR_BRIEFING_SWIPE_JA
   - KIBA_SWIPE_JA
   - PURCHASE_INVITE_TEMPLATE_JA
   - QUICK_START_DAY1_JA
   - AFFILIATE_FAQ_JA
   - X_COPY_JA_1line / 3lines / 5lines
   - SHORT_VIDEO_SCRIPT_SRT_JA
   - AFFILIATE_TERMS_JA

---

このページをブックマークしておけば、
"迷ったらここに戻る" だけで血流が維持できます。

---

## 参照用 Asset（Copilot 最適化済み）

時間軸の「フェーズ」ではなく、登録後ずっと使う参照用。血流（DM→LP→ウェルカム→初日→トリガー）に合わせて最適化済み。

| 種類 | Asset 例 | 用途 |
|------|----------|------|
| 購入案内 | `PURCHASE_INVITE_TEMPLATE_*` | 「買いたい」と言われたとき |
| 社会的証明 | `USER_TESTIMONIALS_*`, `AFFILIATE_SUCCESS_CASES_*` | 投稿・LP に貼る |
| スワイプ | `REGULAR_BRIEFING_SWIPE_*`, `KIBA_SWIPE_*`, `AI_REVIEW_*` | 投稿用コピペ |
| サポート | `AFFILIATE_FAQ_*` | よくある質問 |
| X用 | `X_COPY_*` | プロフ・投稿テンプレ |

---

### 購入案内（PURCHASE_INVITE_TEMPLATE）— Copilot 最適化

「買いたい」と言われたときの送信テンプレ。FirstPromoter Assets に登録 → コピペで即送信。リンク＋コードの2行に統一。

#### PURCHASE_INVITE_TEMPLATE_EN
Here's your link: {{promotion.referral_link}}
Use code DEFEND50 at checkout for 50% off.

#### PURCHASE_INVITE_TEMPLATE_ES
Tu enlace: {{promotion.referral_link}}
Código DEFEND50 en checkout para 50% dto.

#### PURCHASE_INVITE_TEMPLATE_PT
Seu link: {{promotion.referral_link}}
Código DEFEND50 no checkout para 50% off.

#### PURCHASE_INVITE_TEMPLATE_AR
رابطك: {{promotion.referral_link}}
استخدم الرمز DEFEND50 عند الدفع لخصم 50%.

#### PURCHASE_INVITE_TEMPLATE_KO
링크: {{promotion.referral_link}}
결제 시 코드 DEFEND50 입력 시 50% 할인.

#### PURCHASE_INVITE_TEMPLATE_JA
リンク: {{promotion.referral_link}}
チェックアウトでコード DEFEND50 を入力すると 50%オフ.

---

## 参照用 Asset JA版（完成版）

FirstPromoter → Assets にそのまま貼れる完成形。DM → LP → ウェルカム → 初日 → トリガー と完全に統一された血流。購入案内は上記 `PURCHASE_INVITE_TEMPLATE_*`（6言語）を参照。

---

### USER_TESTIMONIALS_JA
【Before】クジラのダンプに毎回やられてた。操り人形みたいだった。
【After】今は先にダイバージェンスが見える。Trap Score 28で待った。$52k飛ぶところだった。
"SmartMoney の視点、やっと持てた。— R, スイング3年"

---

【Before】待てなかった。「今入らないと損する」FOMO地獄。
【After】Trap Defence が「いつ待つか」教えてくれる。Standby で初めて復讐トレードしなかった。
"ようやく座れるようになった。口座守れた。— M, 34"

---

【Before】24時間チャート監視。家族との時間と睡眠が犠牲。
【After】1日4回ブリーフ＋KIBA。確認して終わり。夕食は家族と。
"チャートの外に人生が戻ってきた。— K"

---

【Before】いつもトレンド追いかけて損。防御下手くそ。
【After】AVOID_LONG が鳴った。買わなかった。-15%ドンプ来た。まだスタックある。
"防御優先、ようやく。— J, スイング"

---

【Before】アラート多すぎ。ノイズ。どれも信用できなかった。
【After】KIBA は大事なときだけ鳴る。5分パルス、1時間抑制。スパムなし。
"鳴ったら見る。それだけでいい。— T"

---

### AFFILIATE_SUCCESS_CASES_JA
【Before】5商品紹介して成約ゼロ。「なんで何も刺さらない？」
【After】Trap Defence に切り替え。Minimal をリードマグネットに。AI レビュー（82/89）で権威性。
【Outcome】数時間で初成約。1週間で7成約。DEFEND50 が障壁を下げた。

---

【Before】響くコンテンツがなかった。汎用「買って」投稿は無視された。
【After】痛み→解決の構造で投稿。「クジラのダンプに毎回やられてた。今は先にわかる。」
【Outcome】DM「どうすれば？」→ ref リンクへ自然導線。

---

【Before】フォロワー少ない（〜3K）。5万必要だと思ってた。
【After】Minimal をプロフィール＋週2投稿。Trap Defence の痛み＝スイングの痛み。
【Outcome】5K未満から2成約。報酬 $200超。

---

【Before】同じ商品の他アフィリ10人と競争。差がなかった。
【After】AI レビュー訴求。「82〜89点。私じゃない—Grok、Gemini、GPT。」
【Outcome】1投稿のスレッドでバズ。12サインアップ。

---

### REGULAR_BRIEFING_SWIPE_JA
📊 Trap Defence BTC — Regular Briefing（実物）

━━━━━━━━━━━━━━━━━━━━
罠アラート: WHALERETAILDIVERGENCE – クリティカル (70/100)。入るな。
クジラベア -57、リテールFOMO 50。君が買う、彼らが捨てる。反転確率 70%超。
Dr. Grok: 「退屈耐性 ＞ レバー。今日は画面閉じろ」
━━━━━━━━━━━━━━━━━━━━

これを毎日受け取る。舞台裏の構造。KIBA 5分パルス。
商品と証言が訴求を担う。あなたは配布するだけ。

DEFEND50 で 50%オフ。
▶ 申し込み → {{promotion.referral_link}}

*証言: 「Trap Score 28で$52k損回避。買いすら押さなかった。— Alex」*

---

### KIBA_SWIPE_JA
⚠️ 構造変化注意 — Regular Briefing（KIBA 5分パルス）

市場の文脈:
• BTC $97,000 / 24h -1.2% / レジーム Risk-off
• NASDAQ Risk-off / GOLD 中立 / Macro ON

これは売買シグナルではなく"罠回避の判断材料"。

▶ Regular + KIBA → {{promotion.referral_link}}（コード: DEFEND50）

---

### AI_REVIEW_SWIPE_JA_GROK
🤖 AI が Trap Defence BTC をレビュー
Regular: 82点 | 転換点アラート: 87点

「AIトラップ検知の構造が防御を強化」— Grok

完全構造マップ＋5分パルス。
▶ {{promotion.referral_link}}（DEFEND50）

---

### AI_REVIEW_SWIPE_JA_GEMINI
🤖 AI が Trap Defence BTC をレビュー
Regular: 82点 | 転換点アラート: 89点（最高）

「オンチェーンの真実と群衆の狂気を AI が調停し、罠を可視化する精緻なレーダー。」— Gemini

▶ {{promotion.referral_link}}（DEFEND50）

---

### AI_REVIEW_AUTHORITY_JA
なぜこのスコアを信頼できるか

• 5AI（Grok / Cursor / Gemini / Copilot / GPT）が同一設計を評価
• インフレ指示なし。「客観的かつ厳格に」を依頼済み
• 3AI が Regular を 82点で独立一致
• 80台 = 優れた設計だが改善余地あり（妥当な評価帯）

これは設計評価。実測パフォーマンスではない。
1日トライアルで自己検証を推奨。

---

### AI_REVIEW_QUOTES_JA
5AI レビュー — 引用可能な一言

Grok: 「AIトラップ検知の構造が防御を強化」
Gemini: 「オンチェーンの真実と群衆の狂気を AI が調停」
Copilot: 「心理とオンチェーンを結ぶ実戦的な構造インテリジェンス」
GPT: 「オンチェーンと心理を同時に見せる、罠回避の設計。」

スレッド・DM・プロフィール・LP で使用可。

---

### AFFILIATE_FAQ_JA
# アフィリエイト FAQ

## ref リンクと DEFEND50
Q: 両方必要？
A: 必須。ref リンク経由で Whop に遷移し、チェックアウトで DEFEND50 を入力すると成約。

Q: DEFEND50 だけ教えたら？
A: 成約にならない。必ず ref リンク経由が必要。

## 成約の紐付け
Q: Minimal を見た人が後で購入したら？
A: あなたの ref リンクを踏んで購入すれば成約。

Q: セッション期限は？
A: 長時間空くと切れる可能性あり。迷ったら ref リンクを再送。

## 報酬・支払い
Q: 報酬率は？
A: 売上の50%。リカーリング。

Q: 支払いサイクルは？
A: FirstPromoter の設定による。

## 素材の使い方
Q: Minimal と Regular の違い？
A: Minimal = 無料リード。Regular = 有料本体。購入意欲が出たら ref リンク＋DEFEND50。

## サポート
Q: 質問は？
A: 歓迎メールに返信が最速。

---

### X_COPY_EN_1line
Stop getting caught in whale traps. Protect your BTC with Trap Defence. Free 1‑day + 50% off (DEFEND50) → {{promotion.referral_link}}

---

### X_COPY_ES_1line
Deja de caer en trampas de ballenas. Protege tu BTC con Trap Defence. 1 día gratis + 50% off (DEFEND50) → {{promotion.referral_link}}

---

### X_COPY_PT_1line
Pare de cair em armadilhas de baleias. Proteja seu BTC com Trap Defence. 1 dia grátis + 50% off (DEFEND50) → {{promotion.referral_link}}

---

### X_COPY_AR_1line
توقّف عن الوقوع في فخاخ الحيتان. احمِ الـBTC مع Trap Defence. يوم مجاني + خصم 50٪ (DEFEND50) → {{promotion.referral_link}}

---

### X_COPY_KO_1line
고래 함정에 더 이상 잡히지 마세요. Trap Defence로 BTC를 지키세요. 1일 무료 + 50% 할인(DEFEND50) → {{promotion.referral_link}}

---

### X_COPY_JA_1line
クジラの罠に狩られるのは終わり。Trap DefenceでBTCを守る。1日無料＋50%オフ（DEFEND50）→ {{promotion.referral_link}}

---

### X_COPY_EN_3lines
Most traders are just liquidity.
Spot whale traps before they hit.
Trap Defence (50% off: DEFEND50) → {{promotion.referral_link}}

---

### X_COPY_ES_3lines
La mayoría de los traders son solo liquidez.
Detecta las trampas de ballenas antes de caer.
Trap Defence (50% off: DEFEND50) → {{promotion.referral_link}}

---

### X_COPY_PT_3lines
A maioria dos traders é apenas liquidez.
Identifique as armadilhas das baleias antes que te peguem.
Trap Defence (50% off: DEFEND50) → {{promotion.referral_link}}

---

### X_COPY_AR_3lines
معظم المتداولين مجرد سيولة.
اكتشف فخاخ الحيتان قبل أن تضربك.
Trap Defence (خصم 50٪: DEFEND50) → {{promotion.referral_link}}

---

### X_COPY_KO_3lines
대부분의 트레이더는 그냥 유동성일 뿐입니다.
고래 함정을 먼저 포착해 자산을 지키세요.
Trap Defence (50% 할인: DEFEND50) → {{promotion.referral_link}}

---

### X_COPY_JA_3lines
多くのトレーダーは流動性でしかない。
クジラの罠を先に捉えて資産を守る。
Trap Defence（50%オフ: DEFEND50）→ {{promotion.referral_link}}

---

### X_COPY_EN_5lines
Losing money to invisible whale traps?
The key isn't buying — it's avoiding traps.
Get 4 daily structural briefings on Telegram.
Start with a free 1‑day trial.
50% off (DEFEND50) → {{promotion.referral_link}}

---

### X_COPY_ES_5lines
¿Perdiendo dinero en trampas invisibles de ballenas?
La clave no es comprar, sino evitar las trampas.
4 informes diarios en Telegram.
Empieza con 1 día gratis.
50% off (DEFEND50) → {{promotion.referral_link}}

---

### X_COPY_PT_5lines
Perdendo dinheiro em armadilhas invisíveis de baleias?
O segredo não é comprar — é evitar as armadilhas.
4 briefings diários no Telegram.
Comece com 1 dia grátis.
50% off (DEFEND50) → {{promotion.referral_link}}

---

### X_COPY_AR_5lines
هل تخسر أموالك بسبب فخاخ الحيتان غير المرئية؟
المهم ليس الشراء بل تجنّب الفخاخ.
4 تقارير يومية على تيليغرام.
ابدأ بيوم مجاني.
خصم 50٪ (DEFEND50) → {{promotion.referral_link}}

---

### X_COPY_KO_5lines
보이지 않는 고래 함정에 돈을 잃고 있나요?
중요한 건 매수가 아니라 함정 회피입니다.
텔레그램에서 하루 4회 구조 브리핑 제공.
1일 무료 체험부터 시작하세요.
50% 할인(DEFEND50) → {{promotion.referral_link}}

---

### X_COPY_JA_5lines
見えないクジラの罠で資金を溶かしていませんか？
大切なのは「買うこと」ではなく「罠にかからないこと」。
1日4回の構造分析レポートをTelegramで配信中。
まずは1日無料トライアルから。
50%オフ（DEFEND50）→ {{promotion.referral_link}}

---

## トリガーメール（9種・JA 完成版）

FirstPromoter Emails → Compose trigger email で設定。`{{promotion.referral_link}}` は Variables から挿入。そのまま貼れる完成形。

---

### 1. Promoter accepted（登録直後＝ウェルカム）
**Subject:** ようこそ。地獄の島から抜け出した — 初日の3ステップ

**Body:** `WELCOME_POST_REGISTER_JA` をそのまま使用。

---

### 2. Promoter pending（審査待ち）
**Subject:** 審査中です — 少々お待ちください

**Body:**  
ご登録ありがとうございます。  
現在、申請を確認しています。通常24〜48時間以内にご連絡します。  
少々お待ちください。

---

### 3. Promoter rejected（却下）
**Subject:** 申請について — ご確認ください

**Body:**  
ご申請ありがとうございました。  
残念ながら今回はご希望に沿えませんでした。  
理由が不明な場合はサポートまでお問い合わせください。  
条件が変わりましたら再申請いただけます。

---

### 4. Lead signup（リード登録）※必要な場合のみ
**Subject:** Minimal へようこそ — 次のステップ

**Body:**  
Minimal にご登録ありがとうございます。  
無料ブリーフで市場の全体像をチェックしてください。  
本格版が必要な場合はこちらからどうぞ。

---

### 5. Reward created（報酬発生）
**Subject:** 初報酬が発生しました 🎉

**Body:**  
おめでとうございます。  
あなたの配布が、誰かの「盾」になりました。

次にやること：  
- Minimal をさらに配布  
- REGULAR_BRIEFING_SWIPE を投稿  
- 反応が来たら ref リンク＋DEFEND50  

あなたのリンク：{{promotion.referral_link}}

---

### 6. Payout completed（支払い完了）
**Subject:** 支払いが完了しました

**Body:**  
支払いが完了しました。ご確認ください。

Minimal を継続して配布し、オーディエンスに盾を届け続けてください。  
リカーリング報酬は、紹介した人が残る限り毎月入ります。

---

### 7. Count reached（成約数マイルストーン）
**Subject:** [X] 成約達成 — 次の目標へ

**Body:**  
おめでとうございます。  
成約数がマイルストーンに到達しました。

次のステップ：  
- Minimal を週3回以上配布  
- 変動日に REGULAR_BRIEFING_SWIPE を投稿  

あなたのリンク：{{promotion.referral_link}}

---

### 8. Inactivity（非アクティブ）
**Subject:** Minimal の配布、続けていますか？

**Body:**  
最近ダッシュボードにアクセスされていませんね。大丈夫ですか？

最初の一歩を思い出してください：  
1. Minimal を1つ配布  
2. 証言を1つ添える  
3. 反応が来たら ref リンク＋DEFEND50  

あなたのリンク：{{promotion.referral_link}}

---

### 9. Recurring（定期送信）
**Subject:** 今週のリマインド — Minimal を配布しよう

**Body:**  
今週も Minimal を配布しましたか？  
プロフ・投稿・DM のどこか1つでOKです。

ユーザー証言を添えると効果が上がります。  
REGULAR_BRIEFING_SWIPE からコピペで済みます。

あなたのリンク：{{promotion.referral_link}}

---

## 初動トリガー（15〜17）・JA 完成版

Promoter accepted の 1日 / 2日 / 3日後に発火。トリガーは Promoter accepted、遅延は 1 day / 2 days / 3 days（**seconds ではない**）。

---

### 15. 1 day after promoter accepted（登録1日後）

**Subject:** 初日 — Minimal を1つ配布

**Body:**
```
{{promoter.first_name}} さん、

昨日登録いただきました。あなたはもう"盾を届ける側"です。

最初の一歩：

1. Minimal を1つ配布（プロフ / 投稿 / DM）
2. 証言を1つ添える
3. 反応が来たら ref リンク + DEFEND50

今日やってください。1回の配布で流れが始まります。

あなたのリンク：{{promotion.referral_link}}
```

---

### 16. 2 days after promoter accepted（登録2日後）

**Subject:** 48時間経過 — Minimal はもう配布しましたか？

**Body:**
```
{{promoter.first_name}} さん、

地獄の島を出て2日。あなたはもう盾を届ける側です。

最初の一歩はまだ：

1. Minimal を1つ配布
2. 証言を1つ添える
3. 反応が来たら ref リンク + DEFEND50

まだなら今日やってください。
1回の配布で流れが動き出します。

あなたのリンク：{{promotion.referral_link}}
```

---

### 17. 3 days after promoter accepted（登録3日後）

**Subject:** 3日目 — 今日1回だけ配布を

**Body:**
```
{{promoter.first_name}} さん、

3日経ちました。あなたは盾を届ける側です。

最初の一歩：今日 Minimal を1つ配布。それだけ。

1. Minimal を1つ配布
2. 証言を1つ添える
3. 反応が来たら ref リンク + DEFEND50

今日1回の配布で流れを維持できます。

あなたのリンク：{{promotion.referral_link}}
```

---

## トリガーメール（時間ベース・5種・JA 完成版）

FirstPromoter キャンペーン用。登録からの経過日数で送信。`{{campaign.name}}` は FirstPromoter 変数。血流（DM→LP→ウェルカム→初日→トリガー→Asset）に完全整合。

---

### 10. {{campaign.name}} – first 7 days（登録7日後）

**Subject:** 登録から7日 — 最初の一歩、やってみましたか？

**Body:**  
登録から1週間。  
あなたはもう"地獄の島"ではなく、盾を届ける側です。

最初の一歩はこれだけ：

1. Minimal を1つ配布（プロフ / 投稿 / DM）  
2. 証言を1つ添える  
3. 反応が来たら ref リンク＋DEFEND50  

まだなら今日やる。  
やったなら、**今週あと1回だけ配布を増やす**。

あなたのリンク：{{promotion.referral_link}}

---

### 11. {{campaign.name}} – first 2 weeks（登録2週間後）

**Subject:** 登録から2週間 — 配布のリズム、つかめてきましたか？

**Body:**  
2週間経ちました。Minimal の配布、続いていますか？

ポイント：

- 週2〜3回は最低ライン  
- 変動日に REGULAR_BRIEFING_SWIPE を投稿すると反応が出やすい  
- 「買いたい」と言われたら **即** ref リンク＋DEFEND50  

リカーリングだから、1件の成約が残る限り毎月入る。  
**配布を続けるだけで報酬が積み上がる設計** です。

あなたのリンク：{{promotion.referral_link}}

---

### 12. {{campaign.name}} – first month review（登録1ヶ月後）

**Subject:** 登録から1ヶ月 — 今月の振り返り

**Body:**  
1ヶ月お疲れさまです。  
あなたはオーディエンスに"盾"を届け続けています。

確認：

- Minimal を週2回以上配布できましたか？  
- 成約があれば、そのまま継続  
- まだなら、**証言を必ず添える＋変動日に REGULAR_BRIEFING_SWIPE**

ダッシュボードで成約数と収益を確認できます。  
来月も同じペースで配布を続けましょう。

あなたのリンク：{{promotion.referral_link}}

---

### 13. {{campaign.name}} – second month review（登録2ヶ月後）

**Subject:** 登録から2ヶ月 — 継続が力になる

**Body:**  
2ヶ月経ちました。  
配布を続けているなら、あなたは確実に"盾を届ける側"です。

リカーリング報酬は、紹介した人が残る限り毎月入る。  
成約が増えるほど、月々の収益の土台が厚くなる。

まだの人は今日から：

Minimal を1つ配布 → 証言を添える → 反応が来たら ref リンク＋DEFEND50  

あなたのリンク：{{promotion.referral_link}}

---

### 14. {{campaign.name}} – third month review（登録3ヶ月後）

**Subject:** 登録から3ヶ月 — 積み上がる報酬

**Body:**  
3ヶ月お疲れさまです。  
ここまで続けているなら、すでに"積み上がる土台"ができています。

リカーリングなので、紹介した人が残っている限り毎月報酬が入る。  
続けるほど、収益の層が厚くなる。

これからも：

Minimal を週2回以上配布 →  
変動日に REGULAR_BRIEFING_SWIPE →  
反応が来たら ref リンク＋DEFEND50  

同じペースで続けるだけで、報酬は積み上がります。

あなたのリンク：{{promotion.referral_link}}

---

## トリガーメール（時間ベース・5種・EN）
FirstPromoter campaign. Trigger by days since registration. Copy-paste ready.

### 10. {{campaign.name}} – first 7 days

**Subject:** 7 days since signup — Did you take the first step?

**Body:**  
One week in.  
You're no longer on "Hell Island"—you're the one delivering shields.

First step is simple:

1. Share Minimal once (profile / post / DM)  
2. Add one testimonial  
3. When they react → ref link + DEFEND50  

Not yet? Do it today.  
Already did? **Add one more share this week.**

Your link: {{promotion.referral_link}}

---

### 11. {{campaign.name}} – first 2 weeks

**Subject:** 2 weeks since signup — Getting into the distribution rhythm?

**Body:**  
Two weeks in. Still sharing Minimal?

Points:

- 2–3 times/week minimum  
- Post REGULAR_BRIEFING_SWIPE on volatility days—it gets reactions  
- When they say "I want to buy" → **immediately** ref link + DEFEND50  

Recurring means you get paid every month as long as the referral stays.  
**Keep distributing and commissions stack.**

Your link: {{promotion.referral_link}}

---

### 12. {{campaign.name}} – first month review

**Subject:** 1 month since signup — Monthly check-in

**Body:**  
One month in.  
You've been delivering shields to your audience.

Quick check:

- Did you share Minimal 2+ times/week?  
- Any conversions? If yes, keep going  
- If not, **always add testimonial + REGULAR_BRIEFING_SWIPE on volatility days**

Check conversions and earnings in your dashboard.  
Let's keep the same pace next month.

Your link: {{promotion.referral_link}}

---

### 13. {{campaign.name}} – second month review

**Subject:** 2 months since signup — Consistency is power

**Body:**  
Two months in.  
If you're still distributing, you're solidly a shield-deliverer.

Recurring commissions keep coming as long as referrals stay.  
More conversions = thicker monthly earnings base.

Not yet? Start today:

Share Minimal once → add testimonial → when they react → ref link + DEFEND50  

Your link: {{promotion.referral_link}}

---

### 14. {{campaign.name}} – third month review

**Subject:** 3 months since signup — Stacking rewards

**Body:**  
Three months in.  
If you've made it here, you already have a stacking base.

Recurring means monthly pay as long as referrals stay.  
The longer you continue, the thicker the earnings layer.

Going forward:

Share Minimal 2+ times/week →  
REGULAR_BRIEFING_SWIPE on volatility days →  
When they react → ref link + DEFEND50  

Same pace = stacking rewards.

Your link: {{promotion.referral_link}}

---

## 初動トリガー（15〜17）・ES

Promoter accepted の 1日 / 2日 / 3日後に発火。遅延は 1 day / 2 days / 3 days（seconds ではない）。

### 15. 1 day after promoter accepted

**Subject:** Dia 1 - Comparte Minimal una vez

**Body:**
```
Hola {{promoter.first_name}},

Te registraste ayer. Ya estas del lado correcto - entregando escudos, no vendiendo productos rotos.

Tu primer paso es simple:

1. Comparte Minimal una vez (bio, post o DM)
2. Anade un testimonio
3. Si reaccionan - ref link + DEFEND50

Hazlo hoy. Una vez es suficiente para iniciar el flujo.

Tu enlace: {{promotion.referral_link}}
```

---

### 16. 2 days after promoter accepted

**Subject:** 48 horas - Ya compartiste Minimal?

**Body:**
```
Hola {{promoter.first_name}},

Dos dias desde que dejaste la Isla del Infierno. Eres quien entrega escudos ahora.

Tu primer paso sigue:

1. Comparte Minimal una vez
2. Anade un testimonio
3. Si reaccionan - ref link + DEFEND50

Aun no? Hazlo hoy.
Una vez desbloquea el flujo.

Tu enlace: {{promotion.referral_link}}
```

---

### 17. 3 days after promoter accepted

**Subject:** 3 dias - Una vez hoy

**Body:**
```
Hola {{promoter.first_name}},

Tres dias. Eres quien entrega escudos.

Primer paso: comparte Minimal una vez hoy. Eso es todo.

1. Comparte Minimal una vez
2. Anade un testimonio
3. Si reaccionan - ref link + DEFEND50

Una vez hoy mantiene el flujo.

Tu enlace: {{promotion.referral_link}}
```

---

## トリガーメール（時間ベース・5種・ES）
FirstPromoter campaña. Disparo por días desde registro. Listo para copiar-pegar.

### 10. {{campaign.name}} – first 7 days

**Subject:** 7 días desde el registro — ¿Diste el primer paso?

**Body:**  
Una semana.  
Ya no estás en la "Isla del Infierno"—eres quien entrega escudos.

El primer paso es simple:

1. Comparte Minimal una vez (bio / post / DM)  
2. Añade un testimonio  
3. Si reaccionan → ref link + DEFEND50  

¿Aún no? Hazlo hoy.  
¿Ya lo hiciste? **Añade una distribución más esta semana.**

Tu enlace: {{promotion.referral_link}}

---

### 11. {{campaign.name}} – first 2 weeks

**Subject:** 2 semanas desde el registro — ¿El ritmo de distribución?

**Body:**  
Dos semanas. ¿Sigues compartiendo Minimal?

Puntos:

- 2–3 veces/semana mínimo  
- Publica REGULAR_BRIEFING_SWIPE en días de volatilidad—genera reacciones  
- Si dicen "quiero comprar" → **al instante** ref link + DEFEND50  

Recurrente = cobras cada mes mientras el referido permanezca.  
**Sigue distribuyendo y las comisiones se acumulan.**

Tu enlace: {{promotion.referral_link}}

---

### 12. {{campaign.name}} – first month review

**Subject:** 1 mes desde el registro — Revisión mensual

**Body:**  
Un mes.  
Has estado entregando escudos a tu audiencia.

Consulta rápida:

- ¿Compartiste Minimal 2+ veces/semana?  
- ¿Alguna conversión? Si sí, continúa  
- Si no, **siempre añade testimonio + REGULAR_BRIEFING_SWIPE en días de volatilidad**

Revisa conversiones y ganancias en tu panel.  
Mantengamos el mismo ritmo el próximo mes.

Tu enlace: {{promotion.referral_link}}

---

### 13. {{campaign.name}} – second month review

**Subject:** 2 meses desde el registro — La constancia es poder

**Body:**  
Dos meses.  
Si sigues distribuyendo, ya eres un entregador de escudos sólido.

Las comisiones recurrentes siguen entrando mientras los referidos permanezcan.  
Más conversiones = base de ganancias mensuales más gruesa.

¿Aún no? Empieza hoy:

Comparte Minimal una vez → añade testimonio → si reaccionan → ref link + DEFEND50  

Tu enlace: {{promotion.referral_link}}

---

### 14. {{campaign.name}} – third month review

**Subject:** 3 meses desde el registro — Comisiones que se acumulan

**Body:**  
Tres meses.  
Si llegaste hasta aquí, ya tienes una base que se acumula.

Recurrente = cobro mensual mientras los referidos permanezcan.  
Cuanto más continúes, más gruesa la capa de ganancias.

De aquí en adelante:

Comparte Minimal 2+ veces/semana →  
REGULAR_BRIEFING_SWIPE en días de volatilidad →  
Si reaccionan → ref link + DEFEND50  

Mismo ritmo = comisiones que se acumulan.

Tu enlace: {{promotion.referral_link}}

---

## 初動トリガー（15〜17）・PT

Promoter accepted の 1日 / 2日 / 3日後に発火。遅延は 1 day / 2 days / 3 days（seconds ではない）。

### 15. 1 day after promoter accepted

**Subject:** Dia 1 - Compartilhe Minimal uma vez

**Body:**
```
Oi {{promoter.first_name}},

Voce se cadastrou ontem. Ja esta do lado certo - entregando escudos, nao vendendo produtos quebrados.

Seu primeiro passo e simples:

1. Compartilhe Minimal uma vez (bio, post ou DM)
2. Adicione um depoimento
3. Se reagirem - ref link + DEFEND50

Faca hoje. Uma vez basta para iniciar o fluxo.

Seu link: {{promotion.referral_link}}
```

---

### 16. 2 days after promoter accepted

**Subject:** 48 horas - Ja compartilhou Minimal?

**Body:**
```
Oi {{promoter.first_name}},

Dois dias desde que saiu da Ilha do Inferno. Voce e quem entrega escudos agora.

Seu primeiro passo continua:

1. Compartilhe Minimal uma vez
2. Adicione um depoimento
3. Se reagirem - ref link + DEFEND50

Ainda nao? Faca hoje.
Uma vez desbloqueia o fluxo.

Seu link: {{promotion.referral_link}}
```

---

### 17. 3 days after promoter accepted

**Subject:** 3 dias - Uma vez hoje

**Body:**
```
Oi {{promoter.first_name}},

Tres dias. Voce e quem entrega escudos.

Primeiro passo: compartilhe Minimal uma vez hoje. E isso.

1. Compartilhe Minimal uma vez
2. Adicione um depoimento
3. Se reagirem - ref link + DEFEND50

Uma vez hoje mantem o fluxo.

Seu link: {{promotion.referral_link}}
```

---

## トリガーメール（時間ベース・5種・PT）
FirstPromoter campanha. Gatilho por dias desde o cadastro. Pronto para copiar-colar.

### 10. {{campaign.name}} – first 7 days

**Subject:** 7 dias desde o cadastro — Deu o primeiro passo?

**Body:**  
Uma semana.  
Você não está mais na "Ilha do Inferno"—você entrega escudos.

O primeiro passo é simples:

1. Compartilhe Minimal uma vez (bio / post / DM)  
2. Adicione um depoimento  
3. Se reagirem → ref link + DEFEND50  

Ainda não? Faça hoje.  
Já fez? **Adicione mais uma distribuição esta semana.**

Seu link: {{promotion.referral_link}}

---

### 11. {{campaign.name}} – first 2 weeks

**Subject:** 2 semanas desde o cadastro — Ritmo de distribuição?

**Body:**  
Duas semanas. Ainda compartilhando Minimal?

Pontos:

- 2–3 vezes/semana mínimo  
- Publique REGULAR_BRIEFING_SWIPE em dias de volatilidade—gera reações  
- Se disserem "quero comprar" → **na hora** ref link + DEFEND50  

Recorrente = você recebe todo mês enquanto o referido permanecer.  
**Continue distribuindo e as comissões acumulam.**

Seu link: {{promotion.referral_link}}

---

### 12. {{campaign.name}} – first month review

**Subject:** 1 mês desde o cadastro — Revisão mensal

**Body:**  
Um mês.  
Você está entregando escudos para sua audiência.

Checagem rápida:

- Compartilhou Minimal 2+ vezes/semana?  
- Alguma conversão? Se sim, continue  
- Se não, **sempre adicione depoimento + REGULAR_BRIEFING_SWIPE em dias de volatilidade**

Confira conversões e ganhos no painel.  
Vamos manter o mesmo ritmo no mês que vem.

Seu link: {{promotion.referral_link}}

---

### 13. {{campaign.name}} – second month review

**Subject:** 2 meses desde o cadastro — Constância é poder

**Body:**  
Dois meses.  
Se ainda está distribuindo, você é um entregador de escudos firme.

Comissões recorrentes continuam entrando enquanto os referidos permanecerem.  
Mais conversões = base de ganhos mensais mais espessa.

Ainda não? Comece hoje:

Compartilhe Minimal uma vez → adicione depoimento → se reagirem → ref link + DEFEND50  

Seu link: {{promotion.referral_link}}

---

### 14. {{campaign.name}} – third month review

**Subject:** 3 meses desde o cadastro — Comissões que acumulam

**Body:**  
Três meses.  
Se chegou até aqui, já tem uma base que acumula.

Recorrente = pagamento mensal enquanto os referidos permanecerem.  
Quanto mais continuar, mais espessa a camada de ganhos.

Daqui em diante:

Compartilhe Minimal 2+ vezes/semana →  
REGULAR_BRIEFING_SWIPE em dias de volatilidade →  
Se reagirem → ref link + DEFEND50  

Mesmo ritmo = comissões que acumulam.

Seu link: {{promotion.referral_link}}

---

## 初動トリガー（15〜17）・AR

Promoter accepted の 1日 / 2日 / 3日後に発火。遅延は 1 day / 2 days / 3 days（seconds ではない）。1行目は改行なし推奨。

### 15. 1 day after promoter accepted

**Subject:** اليوم 1 - شارك Minimal مرة

**Body:**
```
مرحباً {{promoter.first_name}}،
سجّلت أمس. أنت بالفعل من الجهة الصحيحة - تقديم الدرع، مش بيع منتجات معطلة.
الخطوة الأولى بسيطة:
1. شارك Minimal مرة (البايو أو منشور أو DM)
2. أضف شهادة
3. عند التفاعل - ref link + DEFEND50
اعمل اليوم. مرة واحدة تكفي لبدء التدفق.
رابط الإحالة: {{promotion.referral_link}}
```

---

### 16. 2 days after promoter accepted

**Subject:** 48 ساعة - شاركت Minimal؟

**Body:**
```
مرحباً {{promoter.first_name}}،
يومين منذ مغادرة جزيرة الجحيم. أنت الآن من يقدّم الدرع.
الخطوة الأولى ما زالت:
1. شارك Minimal مرة
2. أضف شهادة
3. عند التفاعل - ref link + DEFEND50
لسه؟ اعمل اليوم.
مرة واحدة تفتح التدفق.
رابط الإحالة: {{promotion.referral_link}}
```

---

### 17. 3 days after promoter accepted

**Subject:** 3 أيام - مرة اليوم

**Body:**
```
مرحباً {{promoter.first_name}}،
3 أيام. أنت من يقدّم الدرع.
الخطوة الأولى: شارك Minimal مرة اليوم. فقط.
1. شارك Minimal مرة
2. أضف شهادة
3. عند التفاعل - ref link + DEFEND50
مرة اليوم تحافظ على التدفق.
رابط الإحالة: {{promotion.referral_link}}
```

---

## トリガーメール（時間ベース・5種・AR）
FirstPromoter حملة. تشغيل حسب الأيام منذ التسجيل. جاهز للنسخ-اللصق.

### 10. {{campaign.name}} – first 7 days

**Subject:** 7 أيام منذ التسجيل — هل خطوت الخطوة الأولى؟

**Body:**  
أسبوع واحد.  
لم تعد في "جزيرة الجحيم"—أنت من يوزّع الدروع.

الخطوة الأولى بسيطة:

1. شارك Minimal مرة (البايو / منشور / DM)  
2. أضف شهادة واحدة  
3. عند التفاعل → رابط ref + DEFEND50  

لم بعد؟ افعل اليوم.  
فعلت؟ **أضف توزيعاً واحداً إضافياً هذا الأسبوع.**

رابطك: {{promotion.referral_link}}

---

### 11. {{campaign.name}} – first 2 weeks

**Subject:** أسبوعان منذ التسجيل — إيقاع التوزيع؟

**Body:**  
أسبوعان. ما زلت توزّع Minimal؟

نقاط:

- 2–3 مرات/أسبوع كحد أدنى  
- انشر REGULAR_BRIEFING_SWIPE في أيام التقلب—يجلب تفاعلات  
- عند قولهم "أريد الشراء" → **فوراً** رابط ref + DEFEND50  

المتكرر = تستلم كل شهر طالما الإحالة تبقى.  
**واصل التوزيع وستتراكم العمولات.**

رابطك: {{promotion.referral_link}}

---

### 12. {{campaign.name}} – first month review

**Subject:** شهر واحد منذ التسجيل — مراجعة شهرية

**Body:**  
شهر واحد.  
لقد كنت توزّع الدرع لجمهورك.

تحقق سريع:

- هل شاركت Minimal 2+ مرات/أسبوع؟  
- أي تحويلات؟ إذا نعم، استمر  
- إذا لا، **دائماً أضف شهادة + REGULAR_BRIEFING_SWIPE في أيام التقلب**

تحقق من التحويلات والأرباح في لوحتك.  
لنحافظ على نفس الإيقاع الشهر القادم.

رابطك: {{promotion.referral_link}}

---

### 13. {{campaign.name}} – second month review

**Subject:** شهران منذ التسجيل — الاستمرارية قوة

**Body:**  
شهران.  
إن كنت ما زلت توزّع، فأنت موزّع دروع ثابت.

العمولات المتكررة تستمر طالما الإحالات تبقى.  
تحويلات أكثر = قاعدة أرباح شهرية أوضح.

لم بعد؟ ابدأ اليوم:

شارك Minimal مرة → أضف شهادة → عند التفاعل → رابط ref + DEFEND50  

رابطك: {{promotion.referral_link}}

---

### 14. {{campaign.name}} – third month review

**Subject:** 3 أشهر منذ التسجيل — عمولات تتراكم

**Body:**  
ثلاثة أشهر.  
إن وصلت إلى هنا، فلديك بالفعل قاعدة تتراكم.

المتكرر = دفعة شهرية طالما الإحالات تبقى.  
كلما واصلت، كلما زادت طبقة الأرباح.

من هنا فصاعداً:

شارك Minimal 2+ مرات/أسبوع →  
REGULAR_BRIEFING_SWIPE في أيام التقلب →  
عند التفاعل → رابط ref + DEFEND50  

نفس الإيقاع = عمولات تتراكم.

رابطك: {{promotion.referral_link}}

---

## 初動トリガー（15〜17）・KO

Promoter accepted の 1日 / 2日 / 3日後に発火。遅延は 1 day / 2 days / 3 days（seconds ではない）。

### 15. 1 day after promoter accepted

**Subject:** 1일차 - Minimal 1회 공유

**Body:**
```
{{promoter.first_name}} 님,

어제 가입하셨다. 이미 올바른 편 - 방패를 전하고, 망가진 제품 파는 게 아니다.

첫 걸음은 간단하다:

1. Minimal 1회 공유 (바이오 / 포스트 / DM)
2. 후기 1개 추가
3. 반응 나오면 - ref 링크 + DEFEND50

오늘 하라. 1회 공유로 흐름이 시작된다.

당신 전용 링크: {{promotion.referral_link}}
```

---

### 16. 2 days after promoter accepted

**Subject:** 48시간 - Minimal 공유하셨나요?

**Body:**
```
{{promoter.first_name}} 님,

지옥의 섬에서 나온 지 2일. 이제 방패를 전하는 쪽이다.

첫 걸음은 그대로:

1. Minimal 1회 공유
2. 후기 1개 추가
3. 반응 나오면 - ref 링크 + DEFEND50

아직? 오늘 하라.
1회 공유가 흐름을 연다.

당신 전용 링크: {{promotion.referral_link}}
```

---

### 17. 3 days after promoter accepted

**Subject:** 3일차 - 오늘 1회만

**Body:**
```
{{promoter.first_name}} 님,

3일. 방패를 전하는 쪽이다.

첫 걸음: 오늘 Minimal 1회 공유. 그게 전부다.

1. Minimal 1회 공유
2. 후기 1개 추가
3. 반응 나오면 - ref 링크 + DEFEND50

오늘 1회 공유로 흐름을 유지한다.

당신 전용 링크: {{promotion.referral_link}}
```

---

## トリガーメール（時間ベース・5種・KO）
FirstPromoter 캠페인. 가입일 기준으로 발송. 복붙 가능.

### 10. {{campaign.name}} – first 7 days

**Subject:** 가입 7일 — 첫 걸음 내셨나요?

**Body:**  
일주일.  
이제 "지옥의 섬"이 아니라, 당신이 방패를 전하는 쪽입니다.

첫 걸음은 이것뿐:

1. Minimal 1회 배포 (바이오 / 포스트 / DM)  
2. 후기 1개 붙이기  
3. 반응 나오면 ref 링크 + DEFEND50  

아직이면 오늘 하세요.  
했다면 **이번 주에 배포 1회 더 늘리세요.**

당신 링크: {{promotion.referral_link}}

---

### 11. {{campaign.name}} – first 2 weeks

**Subject:** 가입 2주 — 배포 리듬 붙잡으셨나요?

**Body:**  
2주 됐습니다. Minimal 배포, 계속하고 있나요?

포인트:

- 주 2~3회 최소  
- 변동성 날 REGULAR_BRIEFING_SWIPE 게시하면 반응 잘 나옵니다  
- "사고 싶어요" 하면 **즉시** ref 링크 + DEFEND50  

리커링이라 소개한 분이 남는 한 매월 들어옵니다.  
**배포만 이어가도 보상이 쌓입니다.**

당신 링크: {{promotion.referral_link}}

---

### 12. {{campaign.name}} – first month review

**Subject:** 가입 1개월 — 이번 달 점검

**Body:**  
1개월 됐습니다.  
오디언스에게 방패를 계속 전하고 계십니다.

확인:

- Minimal 주 2회 이상 배포하셨나요?  
- 성약 있으셨나요? 있으면 그대로 이어가세요  
- 없으면 **후기 꼭 붙이기 + 변동성 날 REGULAR_BRIEFING_SWIPE**

대시보드에서 성약·수익 확인하세요.  
다음 달도 같은 템포로 배포 이어가시면 됩니다.

당신 링크: {{promotion.referral_link}}

---

### 13. {{campaign.name}} – second month review

**Subject:** 가입 2개월 — 이어가는 게 힘입니다

**Body:**  
2개월 됐습니다.  
배포를 이어가고 있다면, 이미 "방패를 전하는 쪽"입니다.

리커링 보상은 소개한 분이 남는 한 매월 들어옵니다.  
성약이 늘수록 월 수익 기반이 두꺼워집니다.

아직이면 오늘부터:

Minimal 1회 배포 → 후기 붙이기 → 반응 나오면 ref 링크 + DEFEND50  

당신 링크: {{promotion.referral_link}}

---

### 14. {{campaign.name}} – third month review

**Subject:** 가입 3개월 — 쌓이는 보상

**Body:**  
3개월 됐습니다.  
여기까지 이어갔다면, 이미 "쌓이는 기반"이 있습니다.

리커링이라 소개한 분이 남는 한 매월 보상이 들어옵니다.  
이어갈수록 수익층이 두꺼워집니다.

앞으로도:

Minimal 주 2회 이상 배포 →  
변동성 날 REGULAR_BRIEFING_SWIPE →  
반응 나오면 ref 링크 + DEFEND50  

같은 템포로 이어가시면 보상이 쌓입니다.

당신 링크: {{promotion.referral_link}}

---

## トリガーメール（9種・EN）
FirstPromoter Emails → Compose trigger email. Insert `{{promotion.referral_link}}` from Variables. Copy-paste ready.

### 1. Promoter accepted
**Subject:** Welcome. You've left Hell Island — Day 1 in 3 steps

**Body:** Use `WELCOME_POST_REGISTER_EN` as-is.

### 2. Promoter pending
**Subject:** Application under review — please wait

**Body:**  
Thank you for registering.  
We're reviewing your application. We'll be in touch within 24–48 hours.  
Please bear with us.

### 3. Promoter rejected
**Subject:** About your application — please see

**Body:**  
Thank you for applying.  
Unfortunately we can't approve your application at this time.  
If you have questions, contact support.  
You may reapply if your circumstances change.

### 4. Lead signup
**Subject:** Welcome to Minimal — next steps

**Body:**  
Thanks for signing up for Minimal.  
Check the free brief for the full market picture.  
When you're ready for the full version, use the link below.

### 5. Reward created
**Subject:** First commission earned 🎉

**Body:**  
Congratulations.  
Your distribution became someone's "shield."

Next steps:  
- Share Minimal more  
- Post REGULAR_BRIEFING_SWIPE  
- When they react → ref link + DEFEND50  

Your link: {{promotion.referral_link}}

### 6. Payout completed
**Subject:** Payout completed

**Body:**  
Your payout is complete. Please confirm.

Keep distributing Minimal and delivering shields to your audience.  
Recurring commissions keep coming as long as referrals stay.

### 7. Count reached
**Subject:** [X] conversions reached — onward to the next goal

**Body:**  
Congratulations.  
You've hit a conversion milestone.

Next steps:  
- Share Minimal 3+ times/week  
- Post REGULAR_BRIEFING_SWIPE on volatility days  

Your link: {{promotion.referral_link}}

### 8. Inactivity
**Subject:** Still distributing Minimal?

**Body:**  
We haven't seen dashboard activity recently. All good?

Remember the first steps:  
1. Share Minimal once  
2. Add one testimonial  
3. When they react → ref link + DEFEND50  

Your link: {{promotion.referral_link}}

### 9. Recurring
**Subject:** Weekly reminder — share Minimal

**Body:**  
Did you share Minimal this week?  
Profile, post, or DM—any one is fine.

Adding a user testimonial helps.  
Copy-paste from REGULAR_BRIEFING_SWIPE.

Your link: {{promotion.referral_link}}

---

## トリガーメール（9種・ES）
FirstPromoter Emails → Compose trigger email. Insertar `{{promotion.referral_link}}` desde Variables. Listo para copiar-pegar.

### 1. Promoter accepted
**Subject:** Bienvenido. Dejaste la Isla del Infierno — Día 1 en 3 pasos

**Body:** Usa `WELCOME_POST_REGISTER_ES` tal cual.

### 2. Promoter pending
**Subject:** Solicitud en revisión — por favor espera

**Body:**  
Gracias por registrarte.  
Estamos revisando tu solicitud. Te contactaremos en 24–48 horas.  
Por favor ten paciencia.

### 3. Promoter rejected
**Subject:** Sobre tu solicitud — por favor revisa

**Body:**  
Gracias por postularte.  
Lamentablemente no podemos aprobar tu solicitud en este momento.  
Si tienes dudas, contacta soporte.  
Puedes volver a postularte si cambian tus circunstancias.

### 4. Lead signup
**Subject:** Bienvenido a Minimal — próximos pasos

**Body:**  
Gracias por registrarte en Minimal.  
Revisa el brief gratuito para ver el panorama del mercado.  
Cuando quieras la versión completa, usa el enlace abajo.

### 5. Reward created
**Subject:** Primera comisión obtenida 🎉

**Body:**  
Felicitaciones.  
Tu distribución se convirtió en el "escudo" de alguien.

Próximos pasos:  
- Comparte Minimal más  
- Publica REGULAR_BRIEFING_SWIPE  
- Si reaccionan → ref link + DEFEND50  

Tu enlace: {{promotion.referral_link}}

### 6. Payout completed
**Subject:** Pago completado

**Body:**  
Tu pago está listo. Confirma.

Sigue compartiendo Minimal y entregando escudos a tu audiencia.  
Las comisiones recurrentes siguen entrando mientras los referidos permanezcan.

### 7. Count reached
**Subject:** [X] conversiones alcanzadas — al siguiente objetivo

**Body:**  
Felicitaciones.  
Llegaste a un hito de conversiones.

Próximos pasos:  
- Comparte Minimal 3+ veces/semana  
- Publica REGULAR_BRIEFING_SWIPE en días de volatilidad  

Tu enlace: {{promotion.referral_link}}

### 8. Inactivity
**Subject:** ¿Sigues compartiendo Minimal?

**Body:**  
No hemos visto actividad reciente en el panel. ¿Todo bien?

Recuerda los primeros pasos:  
1. Comparte Minimal una vez  
2. Añade un testimonio  
3. Si reaccionan → ref link + DEFEND50  

Tu enlace: {{promotion.referral_link}}

### 9. Recurring
**Subject:** Recordatorio semanal — comparte Minimal

**Body:**  
¿Compartiste Minimal esta semana?  
Bio, post o DM—cualquiera vale.

Añadir un testimonio ayuda.  
Copia-pega de REGULAR_BRIEFING_SWIPE.

Tu enlace: {{promotion.referral_link}}

---

## トリガーメール（9種・PT）
FirstPromoter Emails → Compose trigger email. Inserir `{{promotion.referral_link}}` de Variables. Pronto para copiar-colar.

### 1. Promoter accepted
**Subject:** Bem-vindo. Você saiu da Ilha do Inferno — Dia 1 em 3 passos

**Body:** Use `WELCOME_POST_REGISTER_PT` tal qual.

### 2. Promoter pending
**Subject:** Inscrição em análise — aguarde

**Body:**  
Obrigado por se registrar.  
Estamos analisando sua inscrição. Entraremos em contato em 24–48 horas.  
Por favor aguarde.

### 3. Promoter rejected
**Subject:** Sobre sua inscrição — por favor veja

**Body:**  
Obrigado por se candidatar.  
Infelizmente não podemos aprovar sua inscrição neste momento.  
Se tiver dúvidas, contate o suporte.  
Você pode se candidatar novamente se suas circunstâncias mudarem.

### 4. Lead signup
**Subject:** Bem-vindo ao Minimal — próximos passos

**Body:**  
Obrigado por se inscrever no Minimal.  
Confira o brief gratuito para a visão completa do mercado.  
Quando quiser a versão completa, use o link abaixo.

### 5. Reward created
**Subject:** Primeira comissão obtida 🎉

**Body:**  
Parabéns.  
Sua distribuição virou o "escudo" de alguém.

Próximos passos:  
- Compartilhe Minimal mais  
- Poste REGULAR_BRIEFING_SWIPE  
- Se reagirem → ref link + DEFEND50  

Seu link: {{promotion.referral_link}}

### 6. Payout completed
**Subject:** Pagamento concluído

**Body:**  
Seu pagamento está completo. Confira.

Continue compartilhando Minimal e entregando escudos à sua audiência.  
As comissões recorrentes continuam entrando enquanto os referidos permanecerem.

### 7. Count reached
**Subject:** [X] conversões atingidas — ao próximo objetivo

**Body:**  
Parabéns.  
Você atingiu um marco de conversões.

Próximos passos:  
- Compartilhe Minimal 3+ vezes/semana  
- Poste REGULAR_BRIEFING_SWIPE em dias de volatilidade  

Seu link: {{promotion.referral_link}}

### 8. Inactivity
**Subject:** Ainda compartilhando Minimal?

**Body:**  
Não vimos atividade recente no painel. Tudo bem?

Lembre-se dos primeiros passos:  
1. Compartilhe Minimal uma vez  
2. Adicione um depoimento  
3. Se reagirem → ref link + DEFEND50  

Seu link: {{promotion.referral_link}}

### 9. Recurring
**Subject:** Lembrete semanal — compartilhe Minimal

**Body:**  
Compartilhou Minimal esta semana?  
Bio, post ou DM—qualquer um serve.

Adicionar um depoimento ajuda.  
Copie de REGULAR_BRIEFING_SWIPE.

Seu link: {{promotion.referral_link}}

---

## トリガーメール（9種・AR）
FirstPromoter Emails → Compose trigger email. أدخل `{{promotion.referral_link}}` من Variables. جاهز للنسخ.

### 1. Promoter accepted
**Subject:** مرحباً. تركت جزيرة الجحيم — اليوم 1 في 3 خطوات

**Body:** استخدم `WELCOME_POST_REGISTER_AR` كما هو.

### 2. Promoter pending
**Subject:** الطلب قيد المراجعة — انتظر من فضلك

**Body:**  
شكراً على التسجيل.  
نراجع طلبك. سنتواصل خلال 24–48 ساعة.  
نرجو الانتظار.

### 3. Promoter rejected
**Subject:** بخصوص طلبك — راجع من فضلك

**Body:**  
شكراً على التقديم.  
للأسف لا نستطيع الموافقة على طلبك حالياً.  
لأي استفسار، تواصل مع الدعم.  
يمكنك إعادة التقديم إذا تغيرت ظروفك.

### 4. Lead signup
**Subject:** مرحباً في Minimal — الخطوات التالية

**Body:**  
شكراً على التسجيل في Minimal.  
راجع البريف المجاني للصورة الكاملة للسوق.  
عند الرغبة بالإصدار الكامل، استخدم الرابط أدناه.

### 5. Reward created
**Subject:** أول عمولة حصلت عليها 🎉

**Body:**  
تهانينا.  
توزيعك أصبح "الدرع" لشخص ما.

الخطوات التالية:  
- شارك Minimal أكثر  
- انشر REGULAR_BRIEFING_SWIPE  
- عند التفاعل → رابط ref + DEFEND50  

رابطك: {{promotion.referral_link}}

### 6. Payout completed
**Subject:** تم إتمام الدفع

**Body:**  
دفعك مكتمل. راجع من فضلك.

واصل توزيع Minimal وتقديم الدرع لجمهورك.  
عمولاتك المتكررة تستمر طالما الإحالات تبقى.

### 7. Count reached
**Subject:** [X] تحويلات محققة — نحو الهدف التالي

**Body:**  
تهانينا.  
وصلت لمرحلة تحويلات.

الخطوات التالية:  
- شارك Minimal 3+ مرات/أسبوع  
- انشر REGULAR_BRIEFING_SWIPE في أيام التقلب  

رابطك: {{promotion.referral_link}}

### 8. Inactivity
**Subject:** هل ما زلت توزّع Minimal؟

**Body:**  
لم نلاحظ نشاطاً حديثاً على اللوحة. كل شيء على ما يرام؟

تذكر الخطوات الأولى:  
1. شارك Minimal مرة  
2. أضف شهادة  
3. عند التفاعل → رابط ref + DEFEND50  

رابطك: {{promotion.referral_link}}

### 9. Recurring
**Subject:** تذكير أسبوعي — شارك Minimal

**Body:**  
هل شاركت Minimal هذا الأسبوع؟  
البايو، منشور، أو DM—أي واحد يصلح.

إضافة شهادة تساعد.  
انسخ من REGULAR_BRIEFING_SWIPE.

رابطك: {{promotion.referral_link}}

---

## トリガーメール（9種・KO）
FirstPromoter Emails → Compose trigger email. Variables에서 `{{promotion.referral_link}}` 삽입. 복붙 가능.

### 1. Promoter accepted
**Subject:** 환영합니다. 지옥의 섬에서 나왔다 — 1일차 3단계

**Body:** `WELCOME_POST_REGISTER_KO` 그대로 사용.

### 2. Promoter pending
**Subject:** 심사 중입니다 — 잠시 기다려 주세요

**Body:**  
등록해 주셔서 감사합니다.  
신청을 검토 중입니다. 24~48시간 내 연락드리겠습니다.  
잠시만 기다려 주세요.

### 3. Promoter rejected
**Subject:** 신청 안내 — 확인 부탁드립니다

**Body:**  
신청해 주셔서 감사합니다.  
이번에는 희망에 맞춰 진행하기 어렵습니다.  
문의사항은 지원팀으로 연락해 주세요.  
상황이 바뀌시면 재신청 가능합니다.

### 4. Lead signup
**Subject:** Minimal 환영합니다 — 다음 단계

**Body:**  
Minimal 가입 감사합니다.  
무료 브리프로 시장 전체를 확인하세요.  
본격판이 필요하면 아래 링크를 이용하세요.

### 5. Reward created
**Subject:** 첫 보상 발생 🎉

**Body:**  
축하합니다.  
당신의 배포가 누군가의 "방패"가 되었습니다.

다음 할 일:  
- Minimal 더 배포  
- REGULAR_BRIEFING_SWIPE 게시  
- 반응 나오면 ref 링크 + DEFEND50  

당신 링크: {{promotion.referral_link}}

### 6. Payout completed
**Subject:** 지급 완료

**Body:**  
지급이 완료되었습니다. 확인해 주세요.

Minimal 계속 배포하고, 오디언스에게 방패를 전하세요.  
리커링 보상은 소개한 분이 계속하는 한 매월 들어옵니다.

### 7. Count reached
**Subject:** [X] 성약 달성 — 다음 목표로

**Body:**  
축하합니다.  
성약 마일스톤에 도달했습니다.

다음 단계:  
- Minimal 주 3회 이상 배포  
- 변동성 날 REGULAR_BRIEFING_SWIPE 게시  

당신 링크: {{promotion.referral_link}}

### 8. Inactivity
**Subject:** Minimal 배포, 계속하고 있나요?

**Body:**  
최근 대시보드 접속이 없네요. 괜찮으세요?

첫 걸음을 떠올리세요:  
1. Minimal 1회 배포  
2. 후기 1개 추가  
3. 반응 나오면 ref 링크 + DEFEND50  

당신 링크: {{promotion.referral_link}}

### 9. Recurring
**Subject:** 이번 주 리마인더 — Minimal 배포하세요

**Body:**  
이번 주에도 Minimal 배포하셨나요?  
바이오·포스트·DM 아무 데나 하나면 됩니다.

사용자 후기를 붙이면 효과가 올라갑니다.  
REGULAR_BRIEFING_SWIPE에서 복붙하세요.

당신 링크: {{promotion.referral_link}}

---

## AFFILIATE_EXPECTATIONS_LP_EN
# Escape Hell Island — Become the One Who Delivers the Shield

It's not your fault you didn't sell.  
You were forced to promote broken products.

**What you're about to read is about "the world you belong in."**

---

## The Story You Need to Hear

The affiliate industry has a dirty secret.  
They want you to sell hype—hype burns fast and fees come in quick.

But look at your dashboard.

Low CVR?  
High churn?

That's because you're leading your audience to Hell Island.  
They lose there, and never trust you again.

The hidden enemy isn't traffic.  
It's the broken products you're promoting.

Imagine a different world.

**Heaven Island.**  
A place where you deliver a shield, not a gamble.

Trap Defence BTC is a Blue Ocean.  
We're the only academy that tells users to wait.

This radical honesty builds instant, unshakeable trust—  
CVR runs **50%** higher.

As long as your audience survives,  
recurring rewards keep compounding.

Stop burning your reputation for pennies.  
Join the elite circle who deliver real value.

Escape the hell of low conversions.  
We're waiting for you on Heaven Island.

---

## User Voices
"Whale dumps used to wipe me. Now I see it before they move. Account saved." — R  
"24/7 chart watching. Now 4 briefs a day. Dinner with family again." — K

---

## Affiliate Example
Promoted 5 products, zero conversions → switched to Trap Defence.  
Minimal as lead magnet.  
First sale within hours. 7 conversions in 1 week.

---

# 50% Commission — Industry Topping

Recurring: each referral pays monthly while they stay.  
Six languages (EN/ES/PT/AR/KO/JA)—cover all markets with one program.

Real product, low churn—  
your commissions compound instead of burning out.

Playbooks, swipes, and social proof ready.  
Your role: **distribute.**  
No crypto expertise or copywriting needed.

---

# What to Do (First Step Only, Clear)

Do this first:

**1. Share Minimal once (profile / post / DM)**

Then:

2. Add user testimonials (copy-paste from USER_TESTIMONIALS)  
3. Use REGULAR_BRIEFING_SWIPE (real sample + testimonial)  
4. When they want to buy → send ref link + DEFEND50  
5. Re-share Minimal/Regular on market-moving days

---

# Your referral link is issued after signup. Start now.

---

## AFFILIATE_EXPECTATIONS_LP_ES
# Escapa la Isla del Infierno — Llega a ser el que entrega el escudo

No es tu culpa que no vendieras.  
Te hacían promocionar productos rotos.

**Lo que vas a leer es sobre "el mundo al que perteneces."**

---

## La historia que necesitas oír

La industria de afiliados tiene un secreto sucio.  
Quieren que vendas hype—el hype quema rápido y las comisiones entran rápido.

Pero mira tu panel.

¿Bajas conversiones?  
¿Alta rotación?

Es porque llevas a tu audiencia a la Isla del Infierno.  
Pierden ahí y nunca vuelven a confiar en ti.

El enemigo oculto no es tu tráfico.  
Son los productos rotos que promocionas.

Imagina un mundo diferente.

**La Isla del Cielo.**  
Un lugar donde entregas un escudo, no una apuesta.

Trap Defence BTC es un océano azul.  
Somos la única academia que les dice a los usuarios que esperen.

Esta honestidad radical construye confianza instantánea e inquebrantable—  
CVR sube un **50%.**

Mientras tu audiencia siga viva,  
las comisiones recurrentes se acumulan.

Deja de quemar tu reputación por centavos.  
Únete al círculo élite que entregan valor real.

Escapa del infierno de las bajas conversiones.  
Te esperamos en la Isla del Cielo.

---

## Voces de usuarios
"Las ballenas me liquidaban. Ahora veo antes. Cuenta salvada." — R  
"Charts 24/7. Ahora 4 briefs. Cena en familia de nuevo." — K

---

## Ejemplo afiliado
5 productos, cero conversiones → Trap Defence.  
Minimal como lead magnet.  
Primera venta en horas. 7 conversiones en 1 semana.

---

# 50% comisión — De las más altas del sector

Recurrente: cada referido paga cada mes que sigan.  
Seis idiomas (EN/ES/PT/AR/KO/JA)—cubre todos los mercados con un programa.

Producto real, baja rotación—  
tus comisiones se acumulan en vez de quemarse.

Playbooks, swipes y prueba social listos.  
Tu rol: **distribuir.**  
No hace falta expertise en crypto ni copywriting.

---

# Qué hacer (solo el primer paso, claro)

Haz esto primero:

**1. Comparte Minimal una vez (bio / post / DM)**

Luego:

2. Añade testimonios—copia de USER_TESTIMONIALS  
3. Usa REGULAR_BRIEFING_SWIPE (muestra real + testimonio)  
4. Si quieren comprar → envía ref link + DEFEND50  
5. Vuelve a compartir Minimal/Regular en días de volatilidad

---

# Tu enlace de referido se emite tras el registro. Empieza ya.

---

## AFFILIATE_EXPECTATIONS_LP_PT
# Escape da Ilha do Inferno — Torne-se quem entrega o escudo

Não é sua culpa não ter vendido.  
Você foi forçado a promocionar produtos quebrados.

**O que você vai ler é sobre "o mundo ao qual você pertence."**

---

## A história que você precisa ouvir

A indústria de afiliados tem um segredo sujo.  
Querem que você venda hype—hype queima rápido e as taxas entram rápido.

Mas olhe seu painel.

Conversões baixas?  
Alta rotatividade?

É porque você está levando sua audiência à Ilha do Inferno.  
Eles perdem lá e nunca mais confiam em você.

O inimigo oculto não é seu tráfego.  
São os produtos quebrados que você promove.

Imagine um mundo diferente.

**A Ilha do Céu.**  
Um lugar onde você entrega um escudo, não uma aposta.

Trap Defence BTC é um oceano azul.  
Somos a única academia que diz aos usuários para esperarem.

Essa honestidade radical constrói confiança instantânea e inquebrantável—  
CVR sobe **50%.**

Enquanto sua audiência permanecer viva,  
as comissões recorrentes se acumulam.

Pare de queimar sua reputação por centavos.  
Junte-se ao círculo elite que entrega valor real.

Escape do inferno das baixas conversões.  
Estamos te esperando na Ilha do Céu.

---

## Vozes de usuários
"Baleias me liquidavam. Agora vejo antes. Conta salva." — R  
"Charts 24/7. Agora 4 briefs. Jantar em família de novo." — K

---

## Exemplo afiliado
5 produtos, zero conversões → Trap Defence.  
Minimal como lead magnet.  
Primeira venda em horas. 7 conversões em 1 semana.

---

# 50% comissão — No topo do mercado

Recorrente: cada referido paga todo mês que permanecerem.  
Seis idiomas (EN/ES/PT/AR/KO/JA)—cubra todos os mercados com um programa.

Produto real, baixa rotatividade—  
suas comissões somam em vez de queimar.

Playbooks, swipes e prova social prontos.  
Seu papel: **distribuir.**  
Sem necessidade de expertise em crypto ou copy.

---

# O que fazer (só o primeiro passo, claro)

Faça isso primeiro:

**1. Compartilhe Minimal uma vez (bio / post / DM)**

Depois:

2. Adicione depoimentos—copie de USER_TESTIMONIALS  
3. Use REGULAR_BRIEFING_SWIPE (amostra real + depoimento)  
4. Se quiserem comprar → envie ref link + DEFEND50  
5. Re-compartilhe Minimal/Regular em dias de volatilidade

---

# Seu link de referido é emitido após o registro. Comece agora.

---

## AFFILIATE_EXPECTATIONS_LP_AR
# اهرب من جزيرة الجحيم — كن من يقدّم الدرع

لسه مش غلطتك ما بعتت.  
كنت مجبور تروّج منتجات معطلة.

**اللي هتقراه دلوقتي عن "العالم اللي انت منه."**

---

## القصة اللي محتاج تسمعها

صناعة الشركاء فيها سر قذر.  
يريدونك تبيع الهيب—الهيب بيسرع يحترق والعمولات بتيجي بسرعة.

لكن شوف لوحتك.

تحويلات منخفضة؟  
تسرب عالي؟

عشان بتودّي جمهورك لجزيرة الجحيم.  
هناك بيخسروا وما بيرجعوا يثقوا بيك.

العدو الخفي مش الزيارات.  
هو المنتجات المعطلة اللي بتروّجها.

تخيل عالم تاني.

**جزيرة الجنة.**  
مكان بتقدّم فيه درع، مش مقامرة.

Trap Defence BTC محيط أزرق.  
احنا الأكاديمية الوحيدة اللي بتقول للمستخدمين انتظروا.

الصدق ده بتبني ثقة فورية وشديدة—  
CVR بيوصل **50%** أعلى.

طالما جمهورك بيبقى حي،  
عمولاتك المتكررة بتتراكم.

وقف تحرق سمعتك عشان فلسات.  
انضم لدائرة النخبة اللي بتقدّم قيمة حقيقية.

اهرب من جحيم التحويلات المنخفضة.  
بنستناك في جزيرة الجنة.

---

## أصوات المستخدمين
"الحيتان كانت تقضي علي. الآن أرى قبلهم. الحساب نجى." — R  
"24/7 على الشارتات. الآن 4 بريفات. عشاء مع العائلة مجدداً." — K

---

## مثال شريك
5 منتجات، صفر تحويلات → Trap Defence.  
Minimal كـ lead magnet.  
أول عملية في ساعات. 7 تحويلات في أسبوع واحد.

---

# 50٪ عمولة — من الأعلى في القطاع

متكرر: كل إحالة تدفع شهرياً ما داموا.  
ست لغات (EN/ES/PT/AR/KO/JA)—غطّ كل الأسواق ببرنامج واحد.

منتج حقيقي، تسرب منخفض—  
عمولاتك تتراكم بدل ما تحترق.

البلايبوك والسوايب والدليل الاجتماعي جاهزة.  
دورك: **التوزيع.**  
لا خبرة كريبتو ولا كوبي مطلوبان.

---

# إيه اللي تعمله (الخطوة الأولى بس، واضحة)

اعمل كده الأول:

**1. شارك Minimal مرة (البايو / منشور / DM)**

بعدين:

2. أضف شهادات—انسخ من USER_TESTIMONIALS  
3. استخدم REGULAR_BRIEFING_SWIPE (عينة حقيقية + شهادة)  
4. لو حابين يشتروا → أرسل رابط ref + DEFEND50  
5. شارك Minimal/Regular تاني في أيام التقلب

---

# رابط الإحالة يتصدّر بعد التسجيل. ابدأ دلوقتي.

---

## AFFILIATE_EXPECTATIONS_LP_KO
# 지옥의 섬에서 탈출 — 방패를 전하는 쪽이 되라

당신 탓이 아니다.  
망가진 제품을 소개했을 뿐이다.

**아래는 "당신이 있어야 할 세계"에 대한 이야기다.**

---

## 들어야 할 이야기

제휴 업계에는 더러운 비밀이 있다.  
그들은 당신이 허풍을 팔도록 한다. 허풍은 빨리 타서 수수료가 빨리 들어온다.

하지만 대시보드를 보라.

낮은 CVR?  
높은 이탈?

당신이 오디언스를 '지옥의 섬'으로 이끌고 있기 때문이다.  
거기서 손해 보고, 다시는 당신을 믿지 않는다.

숨은 적은 트래픽이 아니다.  
당신이 프로모트하는 망가진 제품이다.

다른 세상을 상상해 보라.

**천국의 섬.**  
당신이 도박이 아닌 방패를 전하는 곳.

Trap Defence BTC는 블루 오션이다.  
우리만이 사용자에게 기다리라고 말한다.

이 급진적 솔직함이 즉각적이고 흔들리지 않는 신뢰를 만들고—  
CVR이 **50%** 올라간다.

오디언스가 살아 있는 한,  
리커링 보상이 쌓인다.

평판을 돈 몇 푼에 태우지 마라.  
진짜 가치를 전하는 엘리트 서클에 합류하라.

저전환 지옥에서 탈출하라.  
천국의 섬에서 기다린다.

---

## 사용자 목소리
"매번 훅 덤프에 당했어. 이제 먼저 본다. 계정 지켰다." — R  
"24/7 차트. 이제 하루 4회 브리프. 가족과 저녁." — K

---

## 제휴 사례
5개 상품, 전환 0 → Trap Defence로 전환.  
Minimal 리드마그넷.  
몇 시간 만에 첫 성약. 1주에 7건 성약.

---

# 50% 보상 — 업계 상위권

리커링: 1건 성약이 그들이 있는 한 매월 보상.  
6개국어 (EN/ES/PT/AR/KO/JA)—한 프로그램으로 시장 커버.

본품이라 이탈 적음—  
보상이 타서 날리는 게 아니라 쌓인다.

플레이북·스와이프·사회적 증거 준비됐다.  
당신 역할: **배포.**  
크립토 전문지식이나 카피 불필요.

---

# 할 일 (첫 걸음만 명확하게)

먼저 이것만:

**1. Minimal 1회 공유 (바이오 / 포스트 / DM)**

그 다음:

2. 사용자 후기 추가 (USER_TESTIMONIALS에서 복붙)  
3. REGULAR_BRIEFING_SWIPE 사용 (실제 샘플+후기)  
4. 구매 의향 나오면 ref 링크＋DEFEND50 전달  
5. 시장 이슈에 맞춰 Minimal/Regular 재배포

---

# 등록 후 전용 링크 발급. 지금 시작하라.

---

## AFFILIATE_EXPECTATIONS_LP_JA
# 地獄の島から脱出し、盾を届ける側へ

あなたが売れない理由は、あなたのせいじゃない。  
壊れた商品を紹介させられていただけだ。

**ここから読むのは、"あなたが本来いるべき世界" の話だ。**

---

## 聞くべきストーリー

アフィリエイト業界には汚い秘密がある。  
彼らはあなたに煽りを売らせる。煽りはすぐ燃え尽きて、手数料が早く入るからだ。

でも、ダッシュボードを見てほしい。

低CVR？  
高チャーン？

それは、あなたがオーディエンスを「地獄の島」に連れて行っているからだ。  
そこで彼らは損をして、二度とあなたを信じなくなる。

隠された敵はトラフィックじゃない。  
あなたが紹介している壊れた商品だ。

違う世界を想像してほしい。

**「天国の島」。**  
あなたが盾を届け、ギャンブルを売らない場所。

Trap Defence BTC はブルーオーシャンだ。  
私たちは唯一、ユーザーに「待て」と言うアカデミーである。

このラディカルな正直さが、瞬時に揺るがない信頼を築き、  
CVR を **50%** 高める。

オーディエンスが生き残っている限り、  
リカーリング報酬は増え続ける。

小銭のために評判を燃やし続けるな。  
本物の価値を届けるエリートパートナーの輪に加わろう。

低CVRの地獄から抜け出せ。  
今日、天国の島で待っている。

---

## ユーザーの声
「クジラのダンプに毎回やられてた。今は先にわかる。口座守れた。」— R  
「24時間チャート漬けだった。今は4回チェックで済む。家族と夕食。」— K

---

## アフィリの実例
5商品紹介して成約ゼロ → Trap Defence に切り替え。  
Minimal をリードマグネットに。  
数時間で初成約。1週間で7成約。

---

# 報酬50% — 業界最水準

リカーリングだから、紹介1件が残る限り毎月入る。  
6言語対応（EN/ES/PT/AR/KO/JA）で全市場を1つのプログラムでカバー。

本物の商品だからチャーンが低く、  
報酬が燃え尽きずに積み上がる。

プレイブック・スワイプ・社会的証明はすべて用意済み。  
あなたの役割は **配布**。  
クリプトの専門知識もコピーライティングも不要。

---

# やること（最初の一歩だけ明確に）

まずはこれだけ：

**1. Minimal を1つ配布（プロフ / 投稿 / DM）**

その後は：

2. ユーザー証言を添える（USER_TESTIMONIALS からコピペ）  
3. REGULAR_BRIEFING_SWIPE を使う（実物サンプル＋証言入り）  
4. 購入意向が出たら ref リンク＋DEFEND50 を送る  
5. 市場の話題に合わせて Minimal/Regular を再配布

---

# 登録後、あなた専用のリンクが発行されます。今すぐ始めよう。

---

## WELCOME_POST_REGISTER_EN
Welcome. You've completely left Hell Island.

From here, you're not selling broken products anymore. You're the one who delivers a shield to your audience.

Trap Defence BTC is the only academy that tells users to wait. So churn stays low, and your commissions compound instead of burning out.

---

**【First step—do this only】**

1. Share Minimal once (profile, post, or DM)
2. Add one testimonial—copy-paste
3. When they react, send ref link + DEFEND50

That's enough. Playbooks and swipes are ready. Your role: distribute.

---

**【Others did it】**

Promoted 5 products, zero conversions → switched to Trap Defence. Minimal as lead magnet. First sale within hours. 7 conversions in 1 week.

No special skills needed. You can replicate the same flow.

---

Your referral link: {{promotion.referral_link}}

From today, your audience keeps surviving.

---

## WELCOME_POST_REGISTER_ES
Bienvenido. Dejaste la Isla del Infierno por completo.

Desde aquí, ya no vendes productos rotos. Eres quien entrega un escudo a tu audiencia.

Trap Defence BTC es la única academia que les dice a los usuarios que esperen. Por eso la rotación baja y tus comisiones se acumulan en vez de quemarse.

---

**【Primer paso—solo esto】**

1. Comparte Minimal una vez (bio, post o DM)
2. Añade un testimonio—copia-pega
3. Si reaccionan, envía ref link + DEFEND50

Con eso basta. Playbooks y swipes listos. Tu rol: distribuir.

---

**【Otros lo lograron】**

5 productos, cero conversiones → Trap Defence. Minimal como lead magnet. Primera venta en horas. 7 conversiones en 1 semana.

No hace falta habilidad especial. Tú puedes reproducir el mismo flujo.

---

Tu enlace de referido: {{promotion.referral_link}}

Desde hoy, tu audiencia sigue viva.

---

## WELCOME_POST_REGISTER_PT
Bem-vindo. Você saiu completamente da Ilha do Inferno.

Daqui em diante, você não vende produtos quebrados. Você é quem entrega um escudo à sua audiência.

Trap Defence BTC é a única academia que diz aos usuários para esperarem. Por isso a rotatividade fica baixa e suas comissões somam em vez de queimar.

---

**【Primeiro passo—só isso】**

1. Compartilhe Minimal uma vez (bio, post ou DM)
2. Adicione um depoimento—copie e cole
3. Se reagirem, envie ref link + DEFEND50

É o bastante. Playbooks e swipes prontos. Seu papel: distribuir.

---

**【Outros conseguiram】**

5 produtos, zero conversões → Trap Defence. Minimal como lead magnet. Primeira venda em horas. 7 conversões em 1 semana.

Sem habilidade especial necessária. Você pode replicar o mesmo fluxo.

---

Seu link de referido: {{promotion.referral_link}}

A partir de hoje, sua audiência continua viva.

---

## WELCOME_POST_REGISTER_AR
مرحباً. تركت جزيرة الجحيم تماماً.

من الآن، ما عاد تبيع منتجات معطلة. أنت من يقدّم الدرع لجمهورك.

Trap Defence BTC الأكاديمية الوحيدة التي تقول للمستخدمين انتظروا. لذلك التسرب منخفض وعمولاتك تتراكم بدل ما تحترق.

---

**【الخطوة الأولى—هذا فقط】**

1. شارك Minimal مرة (البايو أو منشور أو DM)
2. أضف شهادة—انسخ والصق
3. عند التفاعل، أرسل رابط ref + DEFEND50

هذا كافٍ. البلايبوك والسوايب جاهزة. دورك: التوزيع.

---

**【آخرون حققوه】**

5 منتجات، صفر تحويلات → Trap Defence. Minimal كـ lead magnet. أول عملية في ساعات. 7 تحويلات في أسبوع واحد.

ما تحتاج مهارة خاصة. أنت تستطيع تكرار نفس التدفق.

---

رابط الإحالة: {{promotion.referral_link}}

من اليوم، جمهورك يستمر حياً.

---

## WELCOME_POST_REGISTER_KO
환영합니다. 지옥의 섬에서 완전히 나왔다.

이제부터 망가진 제품을 파는 게 아니다. 오디언스에게 방패를 전하는 쪽이다.

Trap Defence BTC만이 사용자에게 기다리라고 말한다. 그래서 이탈이 적고, 보상이 타지 않고 쌓인다.

---

**【첫 걸음—이것만】**

1. Minimal 1회 공유 (바이오 or 포스트 or DM)
2. 후기 1개 추가—복붙
3. 반응 나오면 ref 링크 + DEFEND50 전달

이것으로 충분하다. 플레이북·스와이프 준비됐다. 당신 역할: 배포.

---

**【다른 사람들도 했다】**

5개 상품, 전환 0 → Trap Defence 전환. Minimal 리드마그넷. 몇 시간 만에 첫 성약. 1주에 7건.

특별한 스킬 불필요. 당신도 같은 흐름을 재현할 수 있다.

---

당신 전용 링크: {{promotion.referral_link}}

오늘부터 오디언스가 살아남는다.

---

## WELCOME_POST_REGISTER_JA
ようこそ。あなたは今、完全に「地獄の島」から抜け出した。

ここからは、壊れた商品を売らされる側ではなく、
オーディエンスを守る"盾を届ける側"になる。

Trap Defence BTC は、唯一「待て」と言うアカデミー。
だからチャーンが低く、報酬が燃え尽きずに積み上がる。

---

【まず最初の一歩はこれだけ】

1. Minimal を1つ配布（プロフ / 投稿 / DM）
2. 証言を1つコピペして添える
3. 反応が来たら ref リンク＋DEFEND50 を送る

これで十分。プレイブック・スワイプはすべて用意済み。
あなたの役割は「配布」だけ。

---

【やれた人がいる】

5商品紹介して成約ゼロ → Trap Defence に切り替え。
Minimal をリードマグネットに。
数時間で初成約。1週間で7成約。

特別なスキルは不要。あなたにも同じ流れが再現できる。

---

あなたの専用リンク：{{promotion.referral_link}}

今日から、あなたのオーディエンスは生き残り続ける。

---

## QUICK_START_DAY1_EN
# Day 1: Just do these 3

---

## 1. Distribute Minimal everywhere

No limit on shares. Bio, posts, DMs, replies—everywhere. **Distribution volume = lead volume.** No need to sell. The product and testimonials do the work.

**Add the free Minimal TG link to your X profile:**
- EN: https://t.me/cryptotradeacademytrialenglish

→ Followers hit the lead magnet every time they check your profile. The product and testimonials do the persuading—you just distribute.

---

## 2. Make your first post

Introduce Minimal and add purchase info. **Always add one user testimonial**—copy from `USER_TESTIMONIALS_EN`. Real users' words are strongest.

**Example:**
> Free market snapshot: [Minimal TG link]
> Want the full picture? Use my link + DEFEND50 for 50% off.
> "Trap Score 28 saved me from a $52k loss. I didn't click buy. — Alex"

`REGULAR_BRIEFING_SWIPE_EN` (real sample + testimonial) works as-is.

---

## 3. Copy the purchase template

**Register `PURCHASE_INVITE_TEMPLATE_EN` in Assets** so you can send it the moment someone says "I want to buy."

**Send format (example):**
> Your link: {{promotion.referral_link}}
> Use code **DEFEND50** at checkout for 50% off.

---

# Done. Day 1 complete.

From Day 2 onward:

- **Distribute Minimal actively** (2–3x/week minimum, more is fine)
- Use `REGULAR_BRIEFING_SWIPE_*` (real sample + testimonial)
- Product and testimonials persuade. You focus on distribution.

---

## QUICK_START_DAY1_ES
# Día 1: Solo haz estas 3

---

## 1. Distribuye Minimal por todas partes

Sin límite de compartidos. Bio, posts, DMs, respuestas—en todas partes. **Volumen de distribución = volumen de leads.** No necesitas vender. El producto y los testimonios hacen el trabajo.

**Pon el enlace TG gratuito de Minimal en tu perfil de X:**
- ES: https://t.me/cryptotradeacademytrialspanish

→ Seguidores llegan al lead magnet al ver tu perfil. Producto y testimonios convencen—tú solo distribuyes.

---

## 2. Publica tu primer post

Presenta Minimal y añade info de compra. **Siempre añade un testimonio**—copia de `USER_TESTIMONIALS_ES`. Las palabras de usuarios reales son las más fuertes.

**Ejemplo:**
> Resumen gratuito del mercado: [enlace TG Minimal]
> ¿Quieres el cuadro completo? Usa mi enlace + DEFEND50 para 50% dto.
> "Trap Score 28 me salvó de perder $52k. Ni clic en comprar. — Alex"

`REGULAR_BRIEFING_SWIPE_ES` (muestra real + testimonio) sirve tal cual.

---

## 3. Copia la plantilla de compra

**Registra `PURCHASE_INVITE_TEMPLATE_ES` en Assets** para enviarlo al instante cuando digan "quiero comprar."

**Formato (ejemplo):**
> Tu enlace: {{promotion.referral_link}}
> Código **DEFEND50** en checkout para 50% dto.

---

# Listo. Día 1 completo.

A partir del Día 2:

- **Distribuye Minimal activamente** (2–3x/semana mínimo, más mejor)
- Usa `REGULAR_BRIEFING_SWIPE_*` (muestra real + testimonio)
- Producto y testimonios convencen. Tú te enfocas en distribuir.

---

## QUICK_START_DAY1_PT
# Dia 1: Só faça estas 3

---

## 1. Distribua Minimal em todo lugar

Sem limite de compartilhamentos. Bio, posts, DMs, respostas—em todo lugar. **Volume de distribuição = volume de leads.** Não precisa vender. O produto e os depoimentos fazem o trabalho.

**Coloque o link TG gratuito do Minimal no seu perfil do X:**
- PT: https://t.me/cryptotradeacademytrialportugues

→ Seguidores chegam ao lead magnet ao ver seu perfil. Produto e depoimentos convencem—você só distribui.

---

## 2. Faça seu primeiro post

Apresente o Minimal e adicione info de compra. **Sempre adicione um depoimento**—copie de `USER_TESTIMONIALS_PT`. Palavras de usuários reais são as mais fortes.

**Exemplo:**
> Snapshot gratuito do mercado: [link TG Minimal]
> Quer o quadro completo? Use meu link + DEFEND50 para 50% off.
> "Trap Score 28 me salvou de perder $52k. Nem cliquei em comprar. — Alex"

`REGULAR_BRIEFING_SWIPE_PT` (amostra real + depoimento) funciona tal qual.

---

## 3. Copie o template de compra

**Registre `PURCHASE_INVITE_TEMPLATE_PT` nos Assets** para enviar no instante em que disserem "quero comprar."

**Formato (exemplo):**
> Seu link: {{promotion.referral_link}}
> Use o código **DEFEND50** no checkout para 50% off.

---

# Pronto. Dia 1 completo.

A partir do Dia 2:

- **Distribua Minimal ativamente** (2–3x/semana mínimo, mais melhor)
- Use `REGULAR_BRIEFING_SWIPE_*` (amostra real + depoimento)
- Produto e depoimentos convencem. Você foca em distribuir.

---

## QUICK_START_DAY1_AR
# اليوم 1: نفّذ هذه الـ 3 فقط

---

## 1. وزّع Minimal في كل مكان

بلا حد للمشاركات. البايو، المنشورات، DMs، الردود—كل مكان. **حجم التوزيع = حجم الليدات.** ما تحتاج تبيع. المنتج والشهادات يعملان.

**ضع رابط TG المجاني لـ Minimal في بروفايل X:**
- AR: https://t.me/cryptotradeacademytriaarabic

→ المتابعون يوصلون لليد ماغنت لما يشوفون بروفايلك. المنتج والشهادات يقنعون—أنت توزّع فقط.

---

## 2. أنشر أول منشور

قدّم Minimal وأضف معلومات الشراء. **دائماً أضف شهادة واحدة**—انسخ من `USER_TESTIMONIALS_AR`. كلام المستخدمين الحقيقيين الأقوى.

**مثال:**
> لقطة مجانية للسوق: [رابط TG Minimal]
> تريد الصورة الكاملة؟ استخدم رابطي + DEFEND50 لخصم 50%.
> "Trap Score 28 أنقذني من خسارة $52k. ما ضغطت شراء. — Alex"

`REGULAR_BRIEFING_SWIPE_AR` (عينة حقيقية + شهادة) يعمل كما هو.

---

## 3. انسخ قالب الشراء

**سجّل `PURCHASE_INVITE_TEMPLATE_AR` في Assets** لترسلها فوراً عند قول "أريد الشراء."

**الشكل (مثال):**
> رابطك: {{promotion.referral_link}}
> استخدم الرمز **DEFEND50** عند الدفع لخصم 50%.

---

# انتهى. اليوم 1 مكتمل.

من اليوم 2 فصاعداً:

- **وزّع Minimal بنشاط** (2–3 مرات/أسبوع حد أدنى، أكتر أفضل)
- استخدم `REGULAR_BRIEFING_SWIPE_*` (عينة حقيقية + شهادة)
- المنتج والشهادات يقنعون. أنت تركز على التوزيع.

---

## QUICK_START_DAY1_KO
# 1일차: 이 3가지만 하세요

---

## 1. Minimal 링크 어디든 배포

공유 제한 없음. 바이오, 포스트, DM, 답글—어디든. **배포량 = 리드량.** 판매 스킬 불필요. 제품과 후기가 설득.

**X 프로필에 무료 Minimal TG 링크:**
- KO: https://t.me/cryptotradeacademytrialkorean

→ 팔로워 프로필 볼 때마다 리드마그넷. 제품과 후기가 설득—당신은 배포만.

---

## 2. 첫 게시물 올리기

Minimal 소개하고 구매 안내 추가. **반드시 사용자 후기 1개**—`USER_TESTIMONIALS_KO`에서 복붙. 실제 유저 말이 가장 강력.

**예:**
> 무료 마켓 스냅샷: [Minimal TG 링크]
> 전체 그림 원하시면? 제 링크 + DEFEND50으로 50% 할인.
> "Trap Score 28이 $52k 손실 막아줬어요. 매수 버튼도 안 눌렀어요. — Alex"

`REGULAR_BRIEFING_SWIPE_KO` (실제 샘플+후기) 그대로 사용 가능.

---

## 3. 구매 초대 템플릿 복사

"사고 싶다"고 할 때 바로 보낼 수 있도록 **`PURCHASE_INVITE_TEMPLATE_KO`를 Assets에 등록하세요.**

**전달 형식 (예):**
> 링크: {{promotion.referral_link}}
> 결제 시 코드 **DEFEND50** 입력하면 50% 할인.

---

# 끝. 1일차 완료.

2일차부터:

- **Minimal 적극 배포** (주 2~3회 최소, 더 많이 OK)
- `REGULAR_BRIEFING_SWIPE_*` 사용 (실제 샘플+후기)
- 제품과 후기가 설득. 당신은 배포에 집중.

---

## QUICK_START_DAY1_JA
# 初日：この 3 つだけやる

---

## 1. Minimal リンクを"どこにでも"配布する

配布回数に制限なし。  
プロフ、投稿、DM、リプライ──どこでもOK。  
**配布量＝リード量。**  
売り込む必要はない。商品と証言が勝手に仕事をする。

**X プロフィールに無料 Minimal の TG リンクを入れる：**
- 日本語: https://t.me/cryptotradeacademytrialjapanese  

→ フォロワーがプロフを見るたびにリードマグネットへ流れる。  
→ 説得は商品と証言が担う設計。

---

## 2. 最初の 1 投稿をする

Minimal を紹介しつつ、購入時の案内を添える。  
**必ずユーザー証言を1つ添える（USER_TESTIMONIALS_JA からコピペ）。**  
本物の利用者の言葉が最も強い。

**投稿例：**
> 無料マーケットスナップ: [Minimal TG リンク]  
> 全体像が欲しい？ 私のリンク + DEFEND50 で 50% オフ。  
> 「Trap Score 28で$52k損回避。買いすら押さなかった。— Alex」

REGULAR_BRIEFING_SWIPE_JA（実物サンプル＋証言入り）もそのまま使える。

---

## 3. 購入案内テンプレをコピーしておく

「買いたい」と言われた瞬間に送れるように、  
**PURCHASE_INVITE_TEMPLATE_JA を Assets に登録しておく。**

**送る形式（例）：**
> リンク: {{promotion.referral_link}}  
> チェックアウトでコード **DEFEND50** を入力すると 50%オフ。

---

# 終わり。これで初日は完了。

翌日以降は：

- **Minimal を積極的に配布**（週2〜3回は最低、それ以上でOK）  
- REGULAR_BRIEFING_SWIPE を使う（実物サンプル＋証言入り）  
- 説得は商品と証言が担う。あなたは"配布"に集中するだけ。

---

## AFFILIATE_FAQ_EN
# Affiliate FAQ

---

## ref link & DEFEND50

**Q: Do I need both ref link and DEFEND50?**

Yes. The buyer must reach Whop via your ref link and enter DEFEND50 at checkout for the sale to count.

**Q: If I only share DEFEND50, does it count?**

No. The purchase must be made via your ref link and in that session. Always say "use this link and DEFEND50."

**Q: Is DEFEND50 available elsewhere (ads, public landing, etc.)?**

No. DEFEND50 is only given through affiliate channels. It's not publicly advertised—your audience gets it exclusively from you.

---

## Attribution

**Q: If someone sees Minimal (free) and buys later, does it count?**

Yes. As long as they click your ref link, go to Whop, and buy in that session. Minimal first → ref link later is fine.

**Q: How long is the cookie/session valid?**

Per FirstPromoter. Generally, a purchase in the same browser session after clicking your ref link will count. If it's been a while, send the ref link again.

---

## Payouts

**Q: Commission rate?**

50% of sale. Applies to recurring too. You earn monthly as long as the subscriber stays.

**Q: Minimum payout & schedule?**

Per FirstPromoter (e.g. min $20, Net-30 after month-end). Check your dashboard.

**Q: When do I get paid?**

Per the payout cycle (e.g. Net-30). Payment method (PayPal etc) is set in the dashboard.

---

## Assets

**Q: What is {{promotion.referral_link}}?**

FirstPromoter auto-replaces it with your referral link. When you copy an Asset, it already has your link.

**Q: Minimal vs Regular?**

- **Minimal (free)** = Lead magnet. Share TG link / API freely. Give value, get leads.
- **Regular (paid)** = Use swipes to promote. When someone wants to buy, send ref link + DEFEND50.

---

## Support

**Q: How do I get help?**

Reply to the welcome email or contact support. Fastest by reply.

---

## AFFILIATE_FAQ_ES
# FAQ Afiliados

---

## ref link y DEFEND50

**P: ¿Necesito ref link y DEFEND50?**

Sí. El comprador debe llegar a Whop por tu ref link e introducir DEFEND50 en checkout para que cuente.

**P: ¿Solo con DEFEND50 cuenta?**

No. La compra debe hacerse por tu ref link y en esa sesión. Siempre di "usa este enlace y DEFEND50".

**P: ¿DEFEND50 está disponible en otros lugares (ads, landing pública, etc.)?**

No. DEFEND50 solo se concede a través de canales de afiliados. No se anuncia públicamente—tu audiencia lo recibe exclusivamente de ti.

---

## Atribución

**P: Si alguien ve Minimal (gratis) y compra después, ¿cuenta?**

Sí. Siempre que haga clic en tu ref link, vaya a Whop y compre en esa sesión. Minimal primero → ref link después está bien.

**P: ¿Cuánto dura la cookie/sesión?**

Según FirstPromoter. En general, una compra en la misma sesión tras clic en tu ref link cuenta. Si ha pasado tiempo, envía el ref link de nuevo.

---

## Pagos

**P: ¿Tasa de comisión?**

50% de la venta. También en recurrentes. Ganas mensualmente mientras el suscriptor siga.

**P: ¿Mínimo y calendario de pago?**

Según FirstPromoter (ej. mín. $20, Net-30 tras cierre de mes). Revisa tu panel.

**P: ¿Cuándo me pagan?**

Según el ciclo (ej. Net-30). Método de pago (PayPal etc) en el panel.

---

## Assets

**P: ¿Qué es {{promotion.referral_link}}?**

FirstPromoter lo reemplaza por tu enlace de referido. Al copiar un Asset, ya lleva tu enlace.

**P: ¿Minimal vs Regular?**

- **Minimal (gratis)** = Lead magnet. Comparte enlace TG / API libremente.
- **Regular (de pago)** = Usa swipes para promocionar. Cuando quieran comprar, envía ref link + DEFEND50.

---

## Soporte

**P: ¿Cómo obtengo ayuda?**

Responde al correo de bienvenida o contacta soporte. Más rápido por respuesta.

---

## AFFILIATE_FAQ_PT
# FAQ Afiliados

---

## ref link e DEFEND50

**P: Preciso dos dois — ref link e DEFEND50?**

Sim. O comprador deve acessar o Whop pelo seu ref link e inserir DEFEND50 no checkout para contar.

**P: Só DEFEND50 conta?**

Não. A compra deve ser via seu ref link e nessa sessão. Sempre diga "use este link e DEFEND50".

**P: DEFEND50 está disponível em outros lugares (anúncios, landing pública, etc.)?**

Não. DEFEND50 só é concedido através de canais de afiliados. Não é anunciado publicamente—sua audiência o recebe exclusivamente de você.

---

## Atribuição

**P: Se alguém vê Minimal (grátis) e compra depois, conta?**

Sim. Desde que clique no seu ref link, vá ao Whop e compre nessa sessão. Minimal primeiro → ref link depois está ok.

**P: Duração da cookie/sessão?**

Conforme FirstPromoter. Geralmente, compra na mesma sessão após clicar no ref link conta. Se passou tempo, envie o ref link de novo.

---

## Pagamentos

**P: Taxa de comissão?**

50% da venda. Também em recorrentes. Ganha mensalmente enquanto o assinante permanecer.

**P: Mínimo e calendário?**

Conforme FirstPromoter (ex. mín. $20, Net-30 após fechamento). Veja seu painel.

**P: Quando recebo?**

Conforme o ciclo (ex. Net-30). Método (PayPal etc) no painel.

---

## Assets

**P: O que é {{promotion.referral_link}}?**

FirstPromoter substitui pelo seu link. Ao copiar um Asset, já vem com seu link.

**P: Minimal vs Regular?**

- **Minimal (grátis)** = Lead magnet. Compartilhe link TG / API livremente.
- **Regular (pago)** = Use swipes para promover. Quando quiserem comprar, envie ref link + DEFEND50.

---

## Suporte

**P: Como obtenho ajuda?**

Responda ao email de boas-vindas ou contate suporte. Mais rápido por resposta.

---

## AFFILIATE_FAQ_AR
# FAQ الشركاء

---

## رابط ref و DEFEND50

**س: هل أحتاج رابط ref و DEFEND50؟**

نعم. المشتري يجب أن يدخل Whop عبر رابطك ويدخل DEFEND50 عند الدفع لاحتساب البيع.

**س: هل DEFEND50 وحده يكفي؟**

لا. الشراء يجب أن يكون عبر رابطك وفي نفس الجلسة. قل دائماً "استخدم هذا الرابط و DEFEND50".

**س: هل DEFEND50 متاح في أماكن أخرى (إعلانات، صفحة عامة، إلخ)؟**

لا. DEFEND50 يُمنح فقط عبر قنوات المنتسبين. لا يُعلن عنه علناً—جمهورك يحصل عليه حصرياً منك.

---

## الإسناد

**س: شخص شاف Minimal (مجاني) واشترى لاحقاً، هل يُحتسب؟**

نعم. طالما ضغط رابطك وذهب لـ Whop واشترى في نفس الجلسة. Minimal أولاً → رابط ref لاحقاً مقبول.

**س: مدة صلاحية الكوكي/الجلسة؟**

حسب FirstPromoter. عادةً شراء في نفس الجلسة بعد ضغط رابطك يُحتسب. لو مر وقت، أعد إرسال الرابط.

---

## المدفوعات

**س: نسبة العمولة؟**

50% من البيع. تنطبق على المتكرر أيضاً. تربح شهرياً طالما المشترك مستمر.

**س: الحد الأدنى والجدول؟**

حسب FirstPromoter (مثلاً $20 كحد أدنى، Net-30 بعد نهاية الشهر). راجع اللوحة.

**س: متى أستلم؟**

حسب دورة الدفع. طريقة الدفع (PayPal إلخ) في اللوحة.

---

## Assets

**س: ما هو {{promotion.referral_link}}؟**

FirstPromoter يعوّضه برابطك تلقائياً. عند نسخ Asset، يكون الرابط موجوداً.

**س: Minimal مقابل Regular؟**

- **Minimal (مجاني)** = ليد ماغنت. شارك رابط TG / API بحرية.
- **Regular (مدفوع)** = استخدم swipes للترويج. عند الرغبة بالشراء أرسل رابط ref + DEFEND50.

---

## الدعم

**س: كيف أصل للمساعدة؟**

رد على بريد الترحيب أو تواصل الدعم. الأسرع بالرد.

---

## AFFILIATE_FAQ_KO
# 제휴 FAQ

---

## ref 링크와 DEFEND50

**Q: ref 링크와 DEFEND50 둘 다 필요한가요?**

네. 구매자가 ref 링크로 Whop에 진입하고 결제 시 DEFEND50을 입력해야 성약으로 인정됩니다.

**Q: DEFEND50만 알려줘도 성약 되나요?**

안 됩니다. ref 링크 경유 클릭·세션 내 구매가 아니면 연결되지 않습니다. 반드시 "이 링크로 들어가서 DEFEND50 써"라고 안내하세요.

**Q: DEFEND50이 다른 곳(광고, 공개 랜딩 등)에서도 있나요?**

아니요. DEFEND50은 아필리엣 채널을 통해서만 제공됩니다. 공개적으로 광고되지 않습니다—독자만 여러분을 통해 받을 수 있어요.

---

## 성약 연결

**Q: Minimal(무료) 본 사람이 나중에 구매하면 성약 되나요?**

됩니다. 그 사람이 ref 링크를 클릭해 Whop으로 이동하고 해당 세션 내에서 구매하면 성약입니다.

**Q: 쿠키·세션 유효 기간은?**

FirstPromoter 스펙에 따릅니다. 보통 ref 링크 클릭 후 같은 브라우저 세션에서 구매하면 연결됩니다. 시간이 지나면 ref 링크를 다시 보내는 게 확실합니다.

---

## 보상·지급

**Q: 보상률은?**

매출의 50%. 리커링(구독 갱신)에도 적용됩니다.

**Q: 최소 지급액·지급 주기는?**

FirstPromoter 설정에 따릅니다. 대시보드에서 확인하세요.

**Q: 언제 입금되나요?**

지급 주기(예: Net-30)에 따릅니다. PayPal 등은 대시보드에서 설정합니다.

---

## Assets 사용

**Q: {{promotion.referral_link}} 란?**

FirstPromoter가 자동으로 귀하의 링크로 치환합니다. Asset을 복사하면 이미 링크가 들어 있는 상태입니다.

**Q: Minimal과 Regular 차이는?**

- **Minimal(무료)** = 리드매그넷. TG 링크·API 자유 배포. 가치 제공 후 리드 확보.
- **Regular(유료)** = 스와이프로 홍보. 구매 의향 나오면 ref 링크 + DEFEND50 안내.

---

## 지원

**Q: 문의는 어디로?**

환영 메일에 회신하거나 운영에 연락하세요. 회신이 가장 빠릅니다.

---

## AFFILIATE_FAQ_JA
# アフィリエイト FAQ

---

## ref リンクと DEFEND50

**Q: ref リンクと DEFEND50、どちらが必要？**

両方必要。購入者が **ref リンク経由で** Whop に遷移し、**チェックアウトで DEFEND50 を入力**すると成約に紐付く。

**Q: DEFEND50 だけ教えても成約になる？**

ならない。ref リンク経由のクリック・セッションで購入されないと、あなたのアカウントに紐付かない。必ず「このリンクから入って、DEFEND50 を使って」と案内する。

**Q: DEFEND50 は他チャネル（広告・一般ランディングなど）でも使える？**

いいえ。DEFEND50 はアフィリ経由でしか付与されない特別なコードです。一般公開されていません—あなたのオーディエンスだけがあなたを通じて受け取れます。

---

## 成約の紐付け

**Q: Minimal（無料版）を見せた人があとで購入したら、成約になる？**

なる。その人が**あなたの ref リンクをクリックして** Whop に遷移し、そのセッション内で購入すれば成約。 Minimal 経由で興味を持ち、後から ref リンクで購入する流れは問題ない。

**Q: クッキーやセッションの有効期限は？**

FirstPromoter の仕様による。一般的に、ref リンククリック後のセッション（同一ブラウザ）で購入すれば紐付く。長時間経過した場合は、改めて ref リンクを送り直すと確実。

---

## 報酬・支払い

**Q: 報酬率は？**

売上の 50%。リカーリング（継続課金）にも適用。購読者が継続する限り、毎月報酬が発生する。

**Q: 最低支払額・支払いサイクルは？**

FirstPromoter の設定による（例: 最低 $20、月末締め Net-30）。ダッシュボードで確認できる。

**Q: いつ頃振り込まれる？**

支払いサイクル（例: Net-30）に従い、締め翌月など。支払い方法（PayPal 等）はダッシュボードで設定。

---

## 素材の使い方

**Q: Assets の {{promotion.referral_link}} とは？**

FirstPromoter があなたの紹介リンクに自動置換するタグ。Assets をコピーすると、すでにあなたのリンクが入った状態になる。

**Q: Minimal と Regular の違いは？**

- **Minimal（無料）** = リードマグネット。TG リンク・API で自由に配布。価値提供してリード獲得。
- **Regular（有料）** = スワイプで訴求。購入意欲が出たら ref リンク＋DEFEND50 を案内。

---

## サポート

**Q: 質問があるときは？**

歓迎メールに返信するか、運営に連絡。返信が最速。

---

## AFFILIATE_TERMS_EN
# Trap Defence BTC Affiliate Program — Terms & Commission

You're joining as someone who delivers a shield to your audience—not someone forced to sell broken products. Below are the official terms.

---

## 1. Commission structure
- **Rate:** 50% of each payment (same for recurring)
- **Type:** Recurring—commission accrues monthly as long as the subscriber stays

---

## 2. Payouts
- **Schedule:** Month-end close → payout next month-end (Net-30)
- **Minimum payout:** 20 USD
- **Method:** Per FirstPromoter dashboard settings

---

## 3. Promotion guidelines
- **Channels:** SNS, newsletter, blog, DMs, word-of-mouth
- **Promo code:** DEFEND50 (50% off for buyers)
- **Prohibited:** Spam, false/misleading claims, self-affiliate, violations of Whop/FirstPromoter terms

Trap Defence affiliate is built around distribution. Minimal, testimonials, and swipes handle the persuasion.

---

## 4. Terms
- Program may be modified or discontinued with **14 days' notice**
- Fraud or violations may result in **immediate disqualification** and **forfeiture of unpaid commissions**

---

## Contact
- X (DM): @trapdefence
- Email: support@cryptotradeacademy.io

Participation constitutes agreement to these terms.
**Last updated: 2026-02**

---

## AFFILIATE_TERMS_ES
# Programa de afiliados Trap Defence BTC — Términos y comisión

Te unes como quien entrega un escudo a tu audiencia—no como quien vende productos rotos. A continuación los términos oficiales.

---

## 1. Estructura de comisión
- **Tasa:** 50% de cada pago (igual para recurrentes)
- **Tipo:** Recurrente—la comisión se acumula mensualmente mientras el suscriptor permanezca

---

## 2. Pagos
- **Calendario:** Cierre mes → pago fin mes siguiente (Net-30)
- **Mínimo:** 20 USD
- **Método:** Según configuración FirstPromoter

---

## 3. Guía de promoción
- **Canales:** SNS, newsletter, blog, DMs, boca a boca
- **Código:** DEFEND50 (50% dto. para compradores)
- **Prohibido:** Spam, afirmaciones falsas/engañosas, auto-afiliado, violaciones Whop/FirstPromoter

El afiliado Trap Defence se centra en la distribución. Minimal, testimonios y swipes hacen la persuasión.

---

## 4. Términos
- El programa puede modificarse o terminarse con **14 días de aviso**
- Fraude o violaciones pueden suponer **descalificación inmediata** y **pérdida de comisiones no pagadas**

---

## Contacto
- X (DM): @trapdefence
- Email: support@cryptotradeacademy.io

La participación implica aceptar estos términos.
**Última actualización: 2026-02**

---

## AFFILIATE_TERMS_PT
# Programa de afiliados Trap Defence BTC — Termos e comissão

Você entra como quem entrega um escudo à sua audiência—não como quem vende produtos quebrados. Abaixo os termos oficiais.

---

## 1. Estrutura de comissão
- **Taxa:** 50% de cada pagamento (igual para recorrentes)
- **Tipo:** Recorrente—a comissão acumula mensalmente enquanto o assinante permanecer

---

## 2. Pagamentos
- **Calendário:** Fechamento do mês → pagamento fim do mês seguinte (Net-30)
- **Mínimo:** 20 USD
- **Método:** Conforme configuração FirstPromoter

---

## 3. Diretrizes de promoção
- **Canais:** SNS, newsletter, blog, DMs, boca a boca
- **Código:** DEFEND50 (50% off para compradores)
- **Proibido:** Spam, alegações falsas/enganosas, auto-afiliado, violações Whop/FirstPromoter

O afiliado Trap Defence gira em torno da distribuição. Minimal, depoimentos e swipes fazem a persuasão.

---

## 4. Termos
- O programa pode ser alterado ou encerrado com **14 dias de aviso**
- Fraude ou violações podem resultar em **desqualificação imediata** e **perda de comissões não pagas**

---

## Contato
- X (DM): @trapdefence
- Email: support@cryptotradeacademy.io

A participação implica aceitar estes termos.
**Última atualização: 2026-02**

---

## AFFILIATE_TERMS_AR
# برنامج شركاء Trap Defence BTC — الشروط والعمولة

تنضم كمن يقدّم درعاً لجمهورك—وليس كمن يبيع منتجات معطلة. فيما يلي الشروط الرسمية.

---

## 1. هيكل العمولة
- **المعدل:** 50٪ من كل دفعة (نفسه للمتكرر)
- **النوع:** متكرر—العمولة تتراكم شهرياً طالما المشترك مستمر

---

## 2. الدفعات
- **الجدول:** إغلاق الشهر → دفعة نهاية الشهر التالي (Net-30)
- **الحد الأدنى:** 20 USD
- **الطريقة:** حسب إعدادات FirstPromoter

---

## 3. إرشادات الترويج
- **القنوات:** SNS، newsletter، blog، DMs، كلام الناس
- **الرمز:** DEFEND50 (خصم 50٪ للمشترين)
- **ممنوع:** سبام، ادعاءات كاذبة/مضللة، إحالة ذاتية، خروقات Whop/FirstPromoter

شريك Trap Defence يعتمد على التوزيع. Minimal والشهادات والسوايب تعمل الإقناع.

---

## 4. الشروط
- البرنامج قد يُعدّل أو يُنهى بإشعار **14 يوم**
- الغش أو الخروقات قد تؤدي لـ **إلغاء فوري** و**مصادرة عمولات غير مدفوعة**

---

## التواصل
- X (DM): @trapdefence
- Email: support@cryptotradeacademy.io

المشاركة تعني الموافقة على هذه الشروط.
**آخر تحديث: 2026-02**

---

## AFFILIATE_TERMS_KO
# Trap Defence BTC 제휴 프로그램 — 약관 및 보상

당신은 망가진 제품을 파는 쪽이 아니라, 오디언스에게 방패를 전하는 쪽으로 참여합니다. 아래는 공식 약관입니다.

---

## 1. 보상 구조
- **보상률:** 각 결제의 50%（리커링 동일）
- **유형:** 리커링—구독자가 계속하는 동안 매월 보상 적립

---

## 2. 지급
- **일정:** 월말 마감 → 다음 달 말일 지급 (Net-30)
- **최소 지급:** 20 USD
- **방법:** FirstPromoter 대시보드 설정에 따름

---

## 3. 프로모션 가이드라인
- **채널:** SNS, 뉴스레터, 블로그, DM, 구전
- **프로모 코드:** DEFEND50 (구매자 50% 할인)
- **금지:** 스팸, 허위·오해 유발 표현, 자기 제휴, Whop/FirstPromoter 약관 위반

Trap Defence 제휴는 배포 중심입니다. Minimal, 후기, 스와이프가 설득을 담당합니다.

---

## 4. 약관
- 14일 전 통보로 프로그램 변경·종료 가능
- 부정행위·약관 위반 시 **즉시 실격** 및 **미지급 보상 몰수**

---

## 문의
- X (DM): @trapdefence
- Email: support@cryptotradeacademy.io

참여 시 본 약관에 동의한 것으로 간주합니다.
**최종 수정: 2026-02**

---

## AFFILIATE_TERMS_JA
# Trap Defence BTC アフィリエイトプログラム — 規約・報酬条件

あなたは「壊れた商品を売らされる側」ではなく、
オーディエンスを守る"盾を届ける側"として参加します。
以下はそのための正式な条件です。

---

## 1. 報酬体系
- **報酬率:** 各決済額の 50%（継続課金も同率）
- **タイプ:** リカーリング
  購読者が継続する限り、毎月報酬が積み上がる

---

## 2. 支払い
- **スケジュール:** 月末締め → 翌月末払い（Net-30）
- **最低支払額:** 20 USD
- **方法:** FirstPromoter ダッシュボードの設定に従う

---

## 3. プロモーションガイドライン
- **推奨チャネル:** SNS、ニュースレター、ブログ、DM、個人への紹介
- **プロモコード:** DEFEND50（購入者が 50% オフ）
- **禁止事項:**
  - スパム行為
  - 虚偽・誤解を招く表現
  - 自己アフィリエイト
  - Whop / FirstPromoter 規約違反

Trap Defence のアフィリエイトは「配布」が中心です。
Minimal・証言・スワイプが訴求を担います。

---

## 4. 規約
- プログラムは **14日前の通知** により変更・終了する場合があります
- 不正行為・規約違反が確認された場合、
  **即時失格** および **未払い報酬の没収** が行われます

---

## お問い合わせ
- X（DM）: @trapdefence
- Email: support@cryptotradeacademy.io

参加により本規約に同意したものとみなします。
**最終更新: 2026-02**

---

## PURCHASE_INVITE_TEMPLATE_EN
Here's your link: {{promotion.referral_link}}
Use code DEFEND50 at checkout for 50% off.

---

## PURCHASE_INVITE_TEMPLATE_ES
Tu enlace: {{promotion.referral_link}}
Código DEFEND50 en checkout para 50% dto.

---

## PURCHASE_INVITE_TEMPLATE_PT
Seu link: {{promotion.referral_link}}
Código DEFEND50 no checkout para 50% off.

---

## PURCHASE_INVITE_TEMPLATE_AR
رابطك: {{promotion.referral_link}}
استخدم الرمز DEFEND50 عند الدفع لخصم 50%.

---

## PURCHASE_INVITE_TEMPLATE_KO
링크: {{promotion.referral_link}}
결제 시 코드 DEFEND50 입력 시 50% 할인.

---

## PURCHASE_INVITE_TEMPLATE_JA
リンク: {{promotion.referral_link}}
チェックアウトでコード DEFEND50 を入力すると50%オフ。

---

## REGULAR_BRIEFING_SWIPE_EN
📊 Trap Defence BTC — Regular Briefing
**Real output. Real structure. Copy & share.**

SAMPLE from today's briefing:
━━━━━━━━━━━━━━━━━━━━
TRAP ALERT: WHALERETAILDIVERGENCE – CRITICAL (70/100). STAY THE FUCK OUT.
Whales bearish at -57, retail FOMO at 50. You buy, they dump. 70%+ reversal odds.
Dr. Grok: "Boredom tolerance > leverage. Close the screen today."
━━━━━━━━━━━━━━━━━━━━

This is what you get. Behind-the-scenes structure. KIBA 5-min pulse. The product speaks for itself—you just share.

50% off with DEFEND50.
▶ Get access → {{promotion.referral_link}}

*Testimonial (copy-paste): "Trap Score 28 saved me from a $52k loss. I didn't click buy. — Alex"*

---

## REGULAR_BRIEFING_SWIPE_ES
📊 Trap Defence BTC — Regular Briefing
**Salida real. Estructura real. Copia y comparte.**

MUESTRA del briefing de hoy:
━━━━━━━━━━━━━━━━━━━━
ALERTA TRAMPA: WHALERETAILDIVERGENCE – CRÍTICO (70/100). NO ENTRES.
Ballenas bajistas -57, retail FOMO 50. Compras tú, venden ellos. +70% odds reversión.
Dr. Grok: "Tolerancia al aburrimiento > apalancamiento. Cierra la pantalla hoy."
━━━━━━━━━━━━━━━━━━━━

Esto es lo que recibes. Estructura detrás de escena. Pulso KIBA 5 min. El producto habla—tú solo compartes.

50% dto con DEFEND50.
▶ Acceso → {{promotion.referral_link}}

*Testimonio (copiar-pegar): "Trap Score 28 me salvó de perder $52k. Ni clic en comprar. — Alex"*

---

## REGULAR_BRIEFING_SWIPE_PT
📊 Trap Defence BTC — Regular Briefing
**Saída real. Estrutura real. Copie e compartilhe.**

AMOSTRA do briefing de hoje:
━━━━━━━━━━━━━━━━━━━━
ALERTA ARMADILHA: WHALERETAILDIVERGENCE – CRÍTICO (70/100). NÃO ENTRE.
Baleias bear -57, retail FOMO 50. Você compra, eles vendem. +70% odds reversão.
Dr. Grok: "Tolerância ao tédio > alavancagem. Feche a tela hoje."
━━━━━━━━━━━━━━━━━━━━

Isso é o que você recebe. Estrutura por trás. Pulso KIBA 5 min. O produto fala—você só compartilha.

50% off com DEFEND50.
▶ Acesso → {{promotion.referral_link}}

*Depoimento (copie-cole): "Trap Score 28 me salvou de perder $52k. Nem cliquei em comprar. — Alex"*

---

## REGULAR_BRIEFING_SWIPE_AR
📊 Trap Defence BTC — Regular Briefing
**مخرجات حقيقية. هيكل حقيقي. انسخ وشارك.**

عينة من بريفينج اليوم:
━━━━━━━━━━━━━━━━━━━━
تنبيه فخ: WHALERETAILDIVERGENCE – حرج (70/100). ابق خارجاً.
حيتان هبوطية -57، ريتيل FOMO 50. أنت تشتري، هم يبيعون. +70% احتمالات انعكاس.
Dr. Grok: "تحمل الملل > الرافعة. أغلق الشاشة اليوم."
━━━━━━━━━━━━━━━━━━━━

هذا ما تحصل عليه. هيكل خلف الكواليس. نبض KIBA 5 دقائق. المنتج يتكلم—أنت تشارك فقط.

خصم 50% برمز DEFEND50.
▶ الدخول → {{promotion.referral_link}}

*شهادة (نسخ-لصق): "Trap Score 28 أنقذني من خسارة $52k. ما ضغطت شراء. — Alex"*

---

## REGULAR_BRIEFING_SWIPE_KO
📊 Trap Defence BTC — Regular Briefing
**실제 산출. 실제 구조. 복사·공유.**

오늘 브리핑 샘플:
━━━━━━━━━━━━━━━━━━━━
함정 경고: WHALERETAILDIVERGENCE – 위험 (70/100). 들어가지 마세요.
고래 베어 -57, 리테일 FOMO 50. 당신이 사면 그들이 덤프. 반전 확률 +70%.
Dr. Grok: "지루함 허용 > 레버리지. 오늘 화면 닫으세요."
━━━━━━━━━━━━━━━━━━━━

이걸 받습니다. 백스테이지 구조. KIBA 5분 펄스. 제품이 말해요—당신은 공유만.

DEFEND50로 50% 할인.
▶ 접속 → {{promotion.referral_link}}

*후기 (복붙): "Trap Score 28이 $52k 손실 막아줬어요. 매수도 안 눌렀어요. — Alex"*

---

## REGULAR_BRIEFING_SWIPE_JA
📊 Trap Defence BTC — Regular Briefing
**実物の出力。実物の構造。コピペで共有。**

今日のブリーフィング実例:
━━━━━━━━━━━━━━━━━━━━
罠アラート: WHALERETAILDIVERGENCE – クリティカル (70/100)。入るな。
クジラベア -57、リテールFOMO 50。君が買う、彼らが捨てる。反転確率 70%超。
Dr. Grok: 「退屈耐性 ＞レバー。今日は画面閉じろ」
━━━━━━━━━━━━━━━━━━━━

これを毎日受け取る。舞台裏の構造。KIBA 5分パルス。商品と証言が訴求を担う—あなたは配布するだけ。

DEFEND50 で 50% オフ。
▶ 申し込み → {{promotion.referral_link}}

*ユーザー証言（コピペ可）: 「Trap Score 28で$52k損回避。買いすら押さなかった。— Alex」*

---

## KIBA_SWIPE_EN
⚠️ Elevated structure — Regular Briefing (KIBA 5-min pulse)
Market context:
• BTC $97,000 / 24h -1.2% / Regime Risk-off
• NASDAQ Risk-off / GOLD neutral / Macro ON

Use as directional context, not a direct signal.

▶ Get Regular + KIBA alerts → {{promotion.referral_link}}  Code: DEFEND50

---

## KIBA_SWIPE_ES
⚠️ Estructura elevada — Regular Briefing (pulso KIBA 5 min)
Contexto de mercado:
• BTC $97.000 / 24h -1,2% / Régimen Risk-off
• NASDAQ Risk-off / ORO neutral / Macro ON

Úsalo como contexto direccional, no como señal directa.

▶ Regular + alertas KIBA → {{promotion.referral_link}}  Código: DEFEND50

---

## KIBA_SWIPE_PT
⚠️ Estrutura elevada — Regular Briefing (pulso KIBA 5 min)
Contexto de mercado:
• BTC $97.000 / 24h -1,2% / Regime Risk-off
• NASDAQ Risk-off / OURO neutral / Macro ON

Use como contexto de direção, não como sinal direto.

▶ Regular + alertas KIBA → {{promotion.referral_link}}  Código: DEFEND50

---

## KIBA_SWIPE_AR
⚠️ هيكل مرتفع — Regular Briefing (نبض KIBA 5 دقائق)
سياق السوق:
• BTC 97000$ / 24h -1.2% / النظام Risk-off
• NASDAQ Risk-off / GOLD محايد / الماكرو ON

استخدمه كسياق اتجاه وليس كاشارة شراء/بيع مباشرة.

▶ Regular + تنبيهات KIBA → {{promotion.referral_link}}  الرمز: DEFEND50

---

## KIBA_SWIPE_KO
⚠️ 구조 변화 주의 — Regular Briefing (KIBA 5분 펄스)
시장 맥락:
• BTC $97,000 / 24h -1.2% / 레짐 Risk-off
• NASDAQ Risk-off / GOLD 중립 / 매크로 ON

직접 매수/매도 신호가 아니라, 방향 판단 재료로 사용하세요.

▶ Regular + KIBA 알림 → {{promotion.referral_link}}  코드: DEFEND50

---

## KIBA_SWIPE_JA
⚠️ 構造変化注意 — Regular Briefing（KIBA 5分パルス）
市場の文脈:
• BTC $97,000 / 24h -1.2% / レジーム Risk-off
• NASDAQ Risk-off / GOLD 中立 / Macro ON

直接的な売買シグナルではなく、方向性の判断材料としてご活用ください。

▶ Regular + KIBA アラート → {{promotion.referral_link}}  Code: DEFEND50

---

## AI_REVIEW（カテゴリー: Assets｜AI レビュー）

| Asset 名 | 言語 | FirstPromoter カテゴリー |
|----------|------|--------------------------|
| AI_REVIEW_SWIPE_*_GROK | EN / ES / PT / AR / KO / JA | AI レビュー（スワイプ） |
| AI_REVIEW_SWIPE_*_GEMINI | EN / ES / PT / AR / KO / JA | AI レビュー（スワイプ） |
| AI_REVIEW_AUTHORITY_* | EN / ES / PT / AR / KO / JA | AI レビュー（権威補強） |
| AI_REVIEW_QUOTES_* | EN / ES / PT / AR / KO / JA | AI レビュー（引用集） |

**PT 表記注意:** 「detecção」（ç セディーユ）が正。スペイン語の「detección」（ción）にならないよう要確認。

---

## AI_REVIEW_SWIPE_EN_GROK
**カテゴリー:** AI レビュー（スワイプ）
🤖 AI reviewed Trap Defence BTC
Regular Briefing: 82/100 | Inflection Alert: 87/100

"AI trap detection structure strengthens defense." — Grok

Full structural map + 5-min pulse. 50% off with DEFEND50.
▶ {{promotion.referral_link}}

---

## AI_REVIEW_SWIPE_ES_GROK
**カテゴリー:** AI レビュー（スワイプ）
🤖 AI revisó Trap Defence BTC
Regular: 82/100 | Alerta de inflexión: 87/100

"La estructura de detección AI fortalece la defensa." — Grok

Mapa completo + pulso 5 min. 50% dto con DEFEND50.
▶ {{promotion.referral_link}}

---

## AI_REVIEW_SWIPE_PT_GROK
**カテゴリー:** AI レビュー（スワイプ）
🤖 AI analisou Trap Defence BTC
Regular: 82/100 | Alerta de inflexão: 87/100

"A estrutura de detecção AI fortalece a defesa." — Grok

Mapa completo + pulso 5 min. 50% off com DEFEND50.
▶ {{promotion.referral_link}}

---

## AI_REVIEW_SWIPE_AR_GROK
**カテゴリー:** AI レビュー（スワイプ）
🤖 AI راجع Trap Defence BTC
Regular: 82/100 | تنبيه التحول: 87/100

"هيكل كشف AI يقوي الدفاع." — Grok

خريطة كاملة + نبض 5 دقائق. خصم 50% برمز DEFEND50.
▶ {{promotion.referral_link}}

---

## AI_REVIEW_SWIPE_KO_GROK
**カテゴリー:** AI レビュー（スワイプ）
🤖 AI가 Trap Defence BTC 검토
Regular: 82점 | 전환점 알림: 87점

"AI 트랩 탐지 구조가 방어를 강화한다." — Grok

전체 구조맵 + 5분 펄스. DEFEND50로 50% 할인.
▶ {{promotion.referral_link}}

---

## AI_REVIEW_SWIPE_JA_GROK
**カテゴリー:** AI レビュー（スワイプ）
🤖 AI が Trap Defence BTC をレビュー
Regular Briefing: 82点 | 転換点アラート: 87点

「AIトラップ検知の構造が防御を強化」— Grok

完全構造マップ＋5分パルス。DEFEND50で50%オフ。
▶ {{promotion.referral_link}}

---

## AI_REVIEW_SWIPE_EN_GEMINI
**カテゴリー:** AI レビュー（スワイプ）
🤖 AI reviewed Trap Defence BTC
Regular: 82/100 | Inflection Alert: 89/100

"AI mediates on-chain truth and crowd frenzy—a precise radar that visualizes whale traps." — Gemini

Full structural map + 5-min pulse. 50% off with DEFEND50.
▶ {{promotion.referral_link}}

---

## AI_REVIEW_SWIPE_ES_GEMINI
**カテゴリー:** AI レビュー（スワイプ）
🤖 AI revisó Trap Defence BTC
Regular: 82/100 | Alerta de inflexión: 89/100

"AI media la verdad on-chain y la frenesí de la multitud—un radar preciso que visualiza trampas de ballenas." — Gemini

Mapa completo + pulso 5 min. 50% dto con DEFEND50.
▶ {{promotion.referral_link}}

---

## AI_REVIEW_SWIPE_PT_GEMINI
**カテゴリー:** AI レビュー（スワイプ）
🤖 AI analisou Trap Defence BTC
Regular: 82/100 | Alerta de inflexão: 89/100

"AI media a verdade on-chain e a frenesi da multidão—um radar preciso que visualiza armadilhas de baleias." — Gemini

Mapa completo + pulso 5 min. 50% off com DEFEND50.
▶ {{promotion.referral_link}}

---

## AI_REVIEW_SWIPE_AR_GEMINI
**カテゴリー:** AI レビュー（スワイプ）
🤖 AI راجع Trap Defence BTC
Regular: 82/100 | تنبيه التحول: 89/100

"AI يتوسط الحقيقة على السلسلة وهيجان الجماهير—رادار دقيق يوضح مصائد الحيتان." — Gemini

خريطة كاملة + نبض 5 دقائق. خصم 50% برمز DEFEND50.
▶ {{promotion.referral_link}}

---

## AI_REVIEW_SWIPE_KO_GEMINI
**カテゴリー:** AI レビュー（スワイプ）
🤖 AI가 Trap Defence BTC 검토
Regular: 82점 | 전환점 알림: 89점

"AI가 온체인 진실과 군중의 열광을 조율하고 고래 함정을 시각화하는 정밀 레이더." — Gemini

전체 구조맵 + 5분 펄스. DEFEND50로 50% 할인.
▶ {{promotion.referral_link}}

---

## AI_REVIEW_SWIPE_JA_GEMINI
**カテゴリー:** AI レビュー（スワイプ）
🤖 AI が Trap Defence BTC をレビュー
Regular: 82点 | 転換点アラート: 89点（3AI中最高）

「オンチェーンの真実と群衆の狂気を AI が調停し、クジラの罠を可視化する精緻なレーダーだ。」— Gemini

完全構造マップ＋5分パルス。DEFEND50で50%オフ。
▶ {{promotion.referral_link}}

---

## AI_REVIEW_AUTHORITY_EN
**カテゴリー:** AI レビュー（権威補強）
Why trust these scores?
• 5 different AIs (Grok, Cursor, Gemini, Copilot, GPT) evaluated the same design.
• We asked for "objective and strict" assessment—no inflation bias.
• 3 AIs (Grok, Cursor, Gemini) independently gave Regular Briefing 82/100.
• Scores in the 80s = strong design with room for improvement (we avoid claiming perfection).
This is a design evaluation, not empirical performance data. We recommend a 1-day trial to verify for yourself.

---

## AI_REVIEW_AUTHORITY_ES
**カテゴリー:** AI レビュー（権威補強）
¿Por qué confiar en estas puntuaciones?
• 5 AIs diferentes evaluaron el mismo diseño.
• Pedimos evaluación "objetiva y estricta"—sin sesgo de inflación.
• 3 AIs dieron 82/100 a Regular Briefing de forma independiente.
• 80 puntos = diseño sólido con margen de mejora.
Es evaluación de diseño, no datos empíricos. Recomendamos prueba de 1 día.

---

## AI_REVIEW_AUTHORITY_PT
**カテゴリー:** AI レビュー（権威補強）
Por que confiar nessas pontuações?
• 5 AIs diferentes avaliaram o mesmo design.
• Solicitamos avaliação "objetiva e rigorosa"—sem viés de inflação.
• 3 AIs deram 82/100 ao Regular Briefing de forma independente.
• 80 pontos = design sólido com margem de melhoria.
É avaliação de design, não dados empíricos. Recomendamos teste de 1 dia.

---

## AI_REVIEW_AUTHORITY_AR
**カテゴリー:** AI レビュー（権威補強）
لماذا نثق بهذه النتائج؟
• 5 نماذج AI مختلفة قيمت نفس التصميم.
• طلبنا تقييماً "موضوعياً وصارماً"—بدون تضخيم.
• 3 AIs أعطت 82/100 لـ Regular Briefing بشكل مستقل.
• 80 نقطة = تصميم قوي مع مساحة للتحسين.
تقييم تصميم، وليس بيانات أداء فعلية. نوصي بتجربة يوم واحد.

---

## AI_REVIEW_AUTHORITY_KO
**カテゴリー:** AI レビュー（権威補強）
이 점수를 신뢰하는 이유
• 5종의 AI가 동일 설계를 평가함.
• "객관적·엄격" 평가를 요청—인플레이션 지시 없음.
• 3 AI가 Regular Briefing에 82점으로 일치.
• 80대 = 우수한 설계, 개선 여지 있음.
설계 평가이며 실측 데이터 아님. 1일 체험 권장.

---

## AI_REVIEW_AUTHORITY_JA
なぜこのスコアを信頼できるか
• 5種類のAI（Grok / Cursor / Gemini / Copilot / GPT）が同一設計を評価
• 「客観的かつ厳格に」を依頼済み。インフレ指示はしていない
• 3AI（Grok / Cursor / Gemini）が独立して Regular Briefing に 82 点で一致
• 80台 = 優れた設計だが改善余地あり。満点避けの妥当な評価帯
設計評価であり、実測パフォーマンスではない。1日トライアルでの自己検証を推奨。

---

## AI_REVIEW_QUOTES_EN
**カテゴリー:** AI レビュー（引用集）
5 AI Reviews — Quotable One-liners

Grok: "AI trap detection structure strengthens defense."
Gemini: "AI mediates on-chain truth and crowd frenzy—a precise radar that visualizes whale traps."
Copilot: "Practical structural intelligence linking psychology and on-chain data."
GPT: "A design that shows on-chain and psychology side by side—for trap avoidance."

Use these in threads, DMs, bios, and landing pages. Attribute the AI name.

---

## AI_REVIEW_QUOTES_ES
**カテゴリー:** AI レビュー（引用集）
5 AI Reviews — Citas de una línea

Grok: "La estructura de detección AI fortalece la defensa."
Gemini: "AI media la verdad on-chain y la frenesí de la multitud—un radar preciso."
Copilot: "Inteligencia estructural práctica que une psicología y datos on-chain."
GPT: "Diseño que muestra on-chain y psicología—para evitar trampas."

---

## AI_REVIEW_QUOTES_PT
**カテゴリー:** AI レビュー（引用集）
5 AI Reviews — Citações em uma linha

Grok: "A estrutura de detecção AI fortalece a defesa."
Gemini: "AI media verdade on-chain e frenesi da multidão—um radar preciso."
Copilot: "Inteligência estrutural prática ligando psicologia e dados on-chain."
GPT: "Design que mostra on-chain e psicologia—para evitar armadilhas."

---

## AI_REVIEW_QUOTES_AR
**カテゴリー:** AI レビュー（引用集）
مراجعات 5 AI — اقتباسات سطر واحد

Grok: "هيكل كشف AI يقوي الدفاع."
Gemini: "AI يتوسط الحقيقة على السلسلة وهيجان الجماهير—رادار دقيق."
Copilot: "ذكاء هيكلي عملي يربط النفسية والبيانات على السلسلة."
GPT: "تصميم يعرض السلسلة والنفسية جنباً—لتجنب الفخاخ."

---

## AI_REVIEW_QUOTES_KO
**カテゴリー:** AI レビュー（引用集）
5 AI 리뷰 — 인용 가능한 한 줄

Grok: 「AI 트랩 탐지 구조가 방어를 강화한다」
Gemini: 「온체인 진실과 군중 열광을 AI가 조율—고래 함정을 시각화하는 정밀 레이더」
Copilot: 「심리와 온체인을 연결하는 실전적 구조 인텔리전스」
GPT: 「온체인과 심리를 동시에 보여주는, 함정 회피 설계」

---

## AI_REVIEW_QUOTES_JA
**カテゴリー:** AI レビュー（引用集）
5AI レビュー — 引用可能な一言

Grok: 「AIトラップ検知の構造が防御を強化」
Gemini: 「オンチェーンの真実と群衆の狂気を AI が調停し、クジラの罠を可視化する精緻なレーダーだ。」
Copilot: 「心理とオンチェーンを結ぶ実戦的な構造インテリジェンス」
GPT: 「オンチェーンと心理を同時に見せる、罠回避の設計。」

スレッド・DM・プロフィール・LP で使用。AI 名を明示。

---

## USER_TESTIMONIALS_EN
【Before】Whale dump used to wipe me every time. Felt like a puppet.
【After】Now I see the divergence before they move. Trap Score 28—I sat out. Would've lost $52k.

"SmartMoney's view? I have it now. — R, 3y swing"

---

【Before】Couldn't wait. 'Gotta enter now or miss it'—FOMO hell.
【After】Trap Defence tells me WHEN to wait. 'Standby—change not yet clear.' First time I didn't revenge-trade.

"I finally learned to sit. Account saved. — M, 34"

---

【Before】24/7 chart watching. Family time and sleep sacrificed.
【After】4 briefs a day + KIBA. I check and go. Dinner with family—no guilt.

"Life outside charts exists again. — K"

---

【Before】Chased every trend. 'Defense sucks'—always late.
【After】AVOID_LONG hit. I didn't click buy. -15% dump came. Still have my stack.

"Defense first. Finally. — J, swing"

---

【Before】Too many alerts. Noise. Couldn't trust any.
【After】KIBA only fires when it matters. 5-min pulse, 1hr suppression. No spam.

"When it beeps, I look. — T"

---

## USER_TESTIMONIALS_ES
【Before】Las ballenas me liquidaban cada vez. Me sentía títere.
【After】Ahora veo la divergencia antes. Trap Score 28—me quedé fuera. Perdí $52k en papel.

"La vista de SmartMoney. La tengo. — R, swing"

---

【Before】No podía esperar. FOMO infernal.
【After】Trap Defence me dice CUÁNDO esperar. Standby. Primera vez que no vengué con trade.

"Aprendí a sentarme. Cuenta salvada. — M, 34"

---

【Before】Charts 24/7. Tiempo familiar y sueño sacrificados.
【After】4 briefs + KIBA. Reviso y listo. Cena en familia sin culpa.

"La vida fuera de charts volvió. — K"

---

【Before】Perseguía cada tendencia. Defensa pésima.
【After】AVOID_LONG sonó. No compré. Bajó -15%. Sigo con mi stack.

"Defensa primero. Al fin. — J"

---

【Before】Demasiadas alertas. Ruido. No confiaba en ninguna.
【After】KIBA solo cuando importa. Pulso 5 min, supresión 1h. Sin spam.

"Cuando suena, miro. — T"

---

## USER_TESTIMONIALS_PT
【Before】Baleias me liquidavam toda vez. Me sentia fantoche.
【After】Agora vejo a divergência antes. Trap Score 28—fiquei fora. Perdi $52k no papel.

"Visão SmartMoney. Tenho agora. — R, swing"

---

【Before】Não conseguia esperar. FOMO infernal.
【After】Trap Defence me diz QUANDO esperar. Standby. Primeira vez que não revenge-trade.

"Aprendi a sentar. Conta salva. — M, 34"

---

【Before】Charts 24/7. Tempo com família e sono sacrificados.
【After】4 briefs + KIBA. Verifico e pronto. Jantar em família sem culpa.

"Vida fora dos charts voltou. — K"

---

【Before】Perseguia cada tendência. Defesa péssima.
【After】AVOID_LONG tocou. Não comprei. Caiu -15%. Stack intacto.

"Defesa primeiro. Finalmente. — J"

---

【Before】Alertas demais. Ruído. Não confiava em nenhum.
【After】KIBA só quando importa. Pulso 5 min, supressão 1h. Sem spam.

"Quando toca, olho. — T"

---

## USER_TESTIMONIALS_AR
【Before】الحيتان كانت تنقض علي كل مرة. حسيت نفسي عروسة.
【After】دلوقتي أشوف التباعد قبلهم. Trap Score 28—وقفت برا. كنت هخسر $52k.

"رؤية SmartMoney. معايا دلوقتي. — R"

---

【Before】ما قدرت أستنى. FOMO جحيم.
【After】Trap Defence بيقولي امتى أستنى. Standby. أول مرة ما انتقمت بتريد.

"تعلمت أقعد. الحساب انقذ. — M"

---

【Before】Charts 24/7. وقت العيلة والنوم تضحي.
【After】4 briefs + KIBA. أشيك وأخلص. عشاء مع العيلة بلا ذنب.

"الحياة برا الـ charts رجعت. — K"

---

【Before】كل ترند كنت أتبعه. الدفاع وحش.
【After】AVOID_LONG طلع. ما اشتريتش. نزل -15%. الـ stack لسه معايا.

"الدفاع أولاً. أخيراً. — J"

---

【Before】تنبيهات كتير. ضوضاء. ما اثقش في أي واحد.
【After】KIBA بس لما يهم. نبض 5 دقايق، كتم ساعة. بدون سبام.

"لما يصوت، أشوف. — T"

---

## USER_TESTIMONIALS_KO
【Before】고래 덤프에 매번 당했어요. 꼭두각시 같았음.
【After】이제 그 전에 다이버전스 보임. Trap Score 28—안 들어갔음. $52k 날릴 뻔.

"SmartMoney 시점. 이제 가짐. — R, 스윙"

---

【Before】못 기다렸음. FOMO 지옥.
【After】Trap Defence가 언제 기다릴지 알려줌. Standby. 처음으로 복수 트레이드 안 함.

"드디어 앉을 수 있게 됐음. 계좌 살았음. — M, 34"

---

【Before】24시간 차트 감시. 가족 시간·수면 희생.
【After】하루 4번 브리핑 + KIBA. 확인하고 끝. 가족과 저녁 식사.

"차트 밖 인생이 돌아왔음. — K"

---

【Before】트렌드마다 추격. 방어 형편없었음.
【After】AVOID_LONG 울림. 안 샀음. -15% 폭락 옴. 스택 아직 있음.

"방어 우선. 드디어. — J"

---

【Before】알림 너무 많음. 노이즈. 하나도 못 믿겠음.
【After】KIBA는 중요한 때만. 5분 펄스, 1시간 억제. 스팸 없음.

"울리면 봄. 그게 다. — T"

---

## USER_TESTIMONIALS_JA
【Before】クジラのダンプに毎回やられてた。操り人形みたいだった。
【After】今は先にダイバージェンスが見える。Trap Score 28で待った。$52k飛ぶところだった。

"SmartMoney の視点、やっと持てた。— R, スイング3年"

---

【Before】待てなかった。「今入らないと損する」FOMO地獄。
【After】Trap Defence が「いつ待つか」教えてくれる。Standby で初めて復讐トレードしなかった。

"ようやく座れるようになった。口座守れた。— M, 34"

---

【Before】24時間チャート監視。家族との時間と睡眠が犠牲。
【After】1日4回ブリーフ＋KIBA。確認して終わり。夕食は家族と。

"チャートの外に人生が戻ってきた。— K"

---

【Before】いつもトレンド追いかけて損。防御下手くそ。
【After】AVOID_LONG が鳴った。買わなかった。-15%ドンプ来た。まだスタックある。

"防御優先、ようやく。— J, スイング"

---

【Before】アラート多すぎ。ノイズ。どれも信用できなかった。
【After】KIBA は大事なときだけ鳴る。5分パルス、1時間抑制。スパムない。

"鳴ったら見る。それだけでいい。— T"

---

## AFFILIATE_SUCCESS_CASES_EN
【Before】Promoted 5 products. Zero conversions. 'Why does nothing convert?'
【After】Switched to Trap Defence. Minimal as lead magnet—free value first. AI review (82/89) gave credibility. First sale within hours.
【Outcome】7 conversions in 1 week. DEFEND50 lowered barrier.

---

【Before】No content that resonated. Generic 'buy this course' posts got ignored.
【After】Posted pain→solution: 'Whale dump used to wipe me. Now I see it before they move.' Used AI review quote in bio. Engagement up.
【Outcome】DMs: 'How do I get that?' — natural funnel to ref link.

---

【Before】Small following (~3K). Thought affiliates needed 50K+.
【After】Minimal in bio + 2 posts/week. Quality over quantity. Trap Defence audience = swing traders who feel the pain. Niche fit.
【Outcome】2 sales from <5K. Commission > $200.

---

【Before】Competed with 10 other affiliates on same product. No edge.
【After】AI review angle. '5 AIs scored it 82–89. Not me—Grok, Gemini, GPT.' Authority without being pushy. Stand out.
【Outcome】Thread went viral. 12 signups from one post.

---

## AFFILIATE_SUCCESS_CASES_ES
【Before】Promocioné 5 productos. Cero conversiones. '¿Por qué nada convierte?'
【After】Cambié a Trap Defence. Minimal como lead magnet—valor gratis primero. AI review (82/89) dio credibilidad. Primera venta en horas.
【Outcome】7 conversiones en 1 semana. DEFEND50 bajó la barrera.

---

【Before】Nada resonaba. Posts genéricos ignorados.
【After】Posteé dolor→solución. Quote de AI review en bio. Engagement subió.
【Outcome】DMs: '¿Cómo lo consigo?' — embudo natural al ref link.

---

【Before】Pocos seguidores (~3K). Pensaba que necesitaba 50K+.
【After】Minimal en bio + 2 posts/semana. Calidad > cantidad. Nicho swing traders con dolor.
【Outcome】2 ventas desde <5K. Comisión >$200.

---

【Before】Competí con 10 afiliados en mismo producto. Sin ventaja.
【After】Ángulo AI review. '5 AIs puntuaron 82-89.' Autoridad sin empujar.
【Outcome】Thread viral. 12 signups de un post.

---

## AFFILIATE_SUCCESS_CASES_PT
【Before】Promovi 5 produtos. Zero conversões. 'Por que nada converte?'
【After】Mudei para Trap Defence. Minimal como lead magnet—valor grátis primeiro. AI review (82/89) deu credibilidade. Primeira venda em horas.
【Outcome】7 conversões em 1 semana. DEFEND50 baixou a barreira.

---

【Before】Nada ressoava. Posts genéricos ignorados.
【After】Postei dor→solução. Quote de AI review na bio. Engajamento subiu.
【Outcome】DMs: 'Como consigo?' — funil natural ao ref link.

---

【Before】Poucos seguidores (~3K). Pensava que precisava 50K+.
【After】Minimal na bio + 2 posts/semana. Qualidade > quantidade. Nicho swing traders com dor.
【Outcome】2 vendas de <5K. Comissão >$200.

---

【Before】Competi com 10 afiliados no mesmo produto. Sem vantagem.
【After】Ângulo AI review. '5 AIs pontuaram 82-89.' Autoridade sem empurrar.
【Outcome】Thread viral. 12 signups de um post.

---

## AFFILIATE_SUCCESS_CASES_AR
【Before】روّجت 5 منتجات. صفر تحويلات. 'ليه مفيش حاجة بتتحول؟'
【After】غيّرت لـ Trap Defence. Minimal كـ lead magnet—قيمة مجانية أولاً. AI review (82/89) أعطى مصداقية. أول عملية في ساعات.
【Outcome】7 تحويلات في أسبوع واحد. DEFEND50 خفّض العائق.

---

【Before】مفيش محتوى رن. بوستات عامة اتتجنّبت.
【After】نشرت ألم→حل. اقتباس AI review في البايو. الإشراك زاد.
【Outcome】DMs: 'ازاي ألاقيه؟' — قمع طبيعي للـ ref link.

---

【Before】متابعين قليلة (~3K). فكّرت محتاج 50K+.
【After】Minimal في البايو + بوستين/أسبوع. جودة > كمية. جمهور swing traders بيحسّوا بالألم.
【Outcome】بيعين من <5K. عمولة >$200.

---

【Before】نافست 10 affiliates على نفس المنتج. مفيش تميّز.
【After】زاوية AI review. '5 AIs قدّروا 82-89.' سلطة بدون ضغط.
【Outcome】ثريد viral. 12 تسجيل من بوست واحد.

---

## AFFILIATE_SUCCESS_CASES_KO
【Before】5개 상품 소개. 전환 0. '왜 아무것도 안 먹히지?'
【After】Trap Defence로 전환. Minimal을 리드마그넷으로—먼저 무료 가치. AI 리뷰(82/89)로 신뢰. 몇 시간 만에 첫 성약.
【Outcome】1주에 7건 성약. DEFEND50이 장벽 낮춤.

---

【Before】공감되는 콘텐츠 없음. 일반 '사세요' 포스트 무시됨.
【After】통증→해결로 포스팅. AI 리뷰 인용을 프로필에. 참여도 상승.
【Outcome】DM '어떻게 받아요?' — ref 링크로 자연스러운 유입.

---

【Before】팔로워 적음(~3K). 5만 명 필요한 줄 알았음.
【After】Minimal 프로필+주 2포스트. 양보다 질. 통증 있는 스윙트레이더 니치.
【Outcome】5K 미만에서 2건 성약. 수수료 $200 이상.

---

【Before】같은 상품 다른 어필리 10명과 경쟁. 차별점 없음.
【After】AI 리뷰 각도. '5개 AI가 82~89점.' 강압 없이 권위. 차별화.
【Outcome】한 포스트 스레드 바이럴. 12명 가입.

---

## AFFILIATE_SUCCESS_CASES_JA
【Before】5商品紹介して成約ゼロ。「なんで何も刺さらない？」
【After】Trap Defence に切り替え。Minimal をリード마グネットに—まず無料価値。AI レビュー（82/89）で権威性。数時間で初成約。
【Outcome】1週間で7成約。DEFEND50 が障壁を下げた。

---

【Before】響くコンテンツがなかった。汎用「買って」投稿は無視された。
【After】痛み→解決で投稿。「クジラのダンプに毎回やられてた。今は先にわかる。」AI レビュー引用をプロフィールに。エンゲージメント上がった。
【Outcome】DM「どうすれば？」—ref リンクへの自然な導線。

---

【Before】フォロワー少ない（〜3K）。5万フォロワー必要だと思ってた。
【After】Minimal をプロフィール＋週2投稿。量より質。Trap Defence オーディエンス＝痛みを感じるスイングトレーダー。ニッチフィット。
【Outcome】5K未満から2成約。報酬 $200超。

---

【Before】同じ商品の他アフィリ10人と競争。差がなかった。
【After】AI レビュー訴求。「5種類の AI が82〜89点。私じゃない—Grok、Gemini、GPT。」押しつけず権威性。差別化。
【Outcome】1投稿のスレッドでバズ。12サインアップ。

---

## SHORT_VIDEO_SCRIPT_SRT_EN
YouTube Shorts / TikTok. 25–30s. Minimal link only.

**Script**
0–1s: Most traders don't lose because of entries.
1–5s: They lose because they walk straight into whale traps.
5–10s: One trader gets wiped. Another wakes up profitable.
10–16s: The difference isn't luck — it's seeing the traps before they spring.
16–23s: This tool shows BTC whale traps early. No hype. No signals. Just defense.
23–30s: Free BTC trap alerts on Telegram. 👉 https://t.me/cryptotradeacademytrialenglish

**SRT（コピペで動画に貼る）**
```
1
00:00:00,000 --> 00:00:01,200
Most traders don't lose because of entries.

2
00:00:01,200 --> 00:00:04,800
They lose because they walk straight into whale traps.

3
00:00:04,800 --> 00:00:07,500
One trader gets wiped. Another wakes up profitable.

4
00:00:07,500 --> 00:00:10,500
The difference isn't luck — it's seeing traps early.

5
00:00:10,500 --> 00:00:14,500
This tool shows BTC whale traps before they spring.

6
00:00:14,500 --> 00:00:18,000
No hype. No signals. Just defense.

7
00:00:18,000 --> 00:00:21,000
Free BTC trap alerts on Telegram.

8
00:00:21,000 --> 00:00:23,000
https://t.me/cryptotradeacademytrialenglish
```

---

## SHORT_VIDEO_SCRIPT_SRT_ES
Shorts/TikTok. 25–30s. Solo link Minimal.

**Guion**
0–1s: La mayoría no pierde por las entradas.
1–5s: Pierden por caer en trampas de ballenas.
5–10s: Uno se liquida. Otro despierta con ganancias.
10–16s: La diferencia no es suerte — es ver las trampas antes.
16–23s: Esta herramienta muestra trampas BTC temprano. Sin hype. Sin señales. Solo defensa.
23–30s: Alertas gratuitas en Telegram. 👉 https://t.me/cryptotradeacademytrialspanish

**SRT**
```
1
00:00:00,000 --> 00:00:01,200
La mayoría no pierde por las entradas.

2
00:00:01,200 --> 00:00:04,800
Pierden por caer en trampas de ballenas.

3
00:00:04,800 --> 00:00:07,500
Uno se liquida. Otro despierta con ganancias.

4
00:00:07,500 --> 00:00:10,500
La diferencia no es suerte — es ver las trampas antes.

5
00:00:10,500 --> 00:00:14,500
Esta herramienta muestra trampas BTC temprano.

6
00:00:14,500 --> 00:00:18,000
Sin hype. Sin señales. Solo defensa.

7
00:00:18,000 --> 00:00:21,000
Alertas gratuitas de trampas BTC en Telegram.

8
00:00:21,000 --> 00:00:23,000
https://t.me/cryptotradeacademytrialspanish
```

---

## SHORT_VIDEO_SCRIPT_SRT_PT
Shorts/TikTok. 25–30s. Só link Minimal.

**Roteiro**
0–1s: A maioria não perde pelas entradas.
1–5s: Perde por cair em armadilhas de baleias.
5–10s: Um é liquidado. Outro acorda no lucro.
10–16s: A diferença não é sorte — é ver as armadilhas antes.
16–23s: Essa ferramenta mostra armadilhas BTC cedo. Sem hype. Sem sinais. Só defesa.
23–30s: Alertas gratuitos no Telegram. 👉 https://t.me/cryptotradeacademytrialportugues

**SRT**
```
1
00:00:00,000 --> 00:00:01,200
A maioria não perde pelas entradas.

2
00:00:01,200 --> 00:00:04,800
Perde por cair em armadilhas de baleias.

3
00:00:04,800 --> 00:00:07,500
Um é liquidado. Outro acorda no lucro.

4
00:00:07,500 --> 00:00:10,500
A diferença não é sorte — é ver as armadilhas antes.

5
00:00:10,500 --> 00:00:14,500
Essa ferramenta mostra armadilhas BTC cedo.

6
00:00:14,500 --> 00:00:18,000
Sem hype. Sem sinais. Só defesa.

7
00:00:18,000 --> 00:00:21,000
Alertas gratuitos no Telegram.

8
00:00:21,000 --> 00:00:23,000
https://t.me/cryptotradeacademytrialportugues
```

---

## SHORT_VIDEO_SCRIPT_SRT_AR
شورتس/تيك توك. 25–30 ثانية. رابط Minimal فقط.

**نص**
0–1s: معظم المتداولين لا يخسرون بسبب الدخول.
1–5s: بل لأنهم يقعون في فخاخ الحيتان.
5–10s: واحد يتصفّر. والآخر يستيقظ على ربح.
10–16s: الفرق ليس الحظ — بل رؤية الفخ مبكراً.
16–23s: هذه الأداة تكشف فخاخ BTC قبل أن تنغلق. بدون هيب. بدون إشارات. فقط دفاع.
23–30s: تنبيهات مجانية على تيليغرام. 👉 https://t.me/cryptotradeacademytriaarabic

**SRT**
```
1
00:00:00,000 --> 00:00:01,200
معظم المتداولين لا يخسرون بسبب الدخول.

2
00:00:01,200 --> 00:00:04,800
بل لأنهم يقعون في فخاخ الحيتان.

3
00:00:04,800 --> 00:00:07,500
واحد يتصفّر. والآخر يستيقظ على ربح.

4
00:00:07,500 --> 00:00:10,500
الفرق ليس الحظ — بل رؤية الفخ مبكراً.

5
00:00:10,500 --> 00:00:14,500
هذه الأداة تكشف فخاخ BTC قبل أن تنغلق.

6
00:00:14,500 --> 00:00:18,000
بدون هيب. بدون إشارات. فقط دفاع.

7
00:00:18,000 --> 00:00:21,000
تنبيهات فخاخ BTC مجاناً على تيليغرام.

8
00:00:21,000 --> 00:00:23,000
https://t.me/cryptotradeacademytriaarabic
```

---

## SHORT_VIDEO_SCRIPT_SRT_KO
쇼츠/틱톡. 25–30초. Minimal 링크만.

**스크립트**
0–1s: 대부분은 진입 때문에 지는 게 아니다.
1–5s: 고래 함정에 걸려서 진다.
5–10s: 한 명은 전재산을 잃고, 다른 한 명은 수익으로 깬다.
10–16s: 차이는 운이 아니라 — 함정을 미리 보는 것.
16–23s: 이 도구는 BTC 함정을 조기에 보여준다. 허풍 없음. 시그널 없음. 오직 방어.
23–30s: 무료 텔레그램 알림. 👉 https://t.me/cryptotradeacademytrialkorean

**SRT**
```
1
00:00:00,000 --> 00:00:01,200
대부분은 진입 때문에 지는 게 아니다.

2
00:00:01,200 --> 00:00:04,800
고래 함정에 걸려서 진다.

3
00:00:04,800 --> 00:00:07,500
한 명은 전재산을 잃고, 다른 한 명은 수익으로 깬다.

4
00:00:07,500 --> 00:00:10,500
차이는 운이 아니라 — 함정을 미리 보는 것.

5
00:00:10,500 --> 00:00:14,500
이 도구는 BTC 함정을 조기에 보여준다.

6
00:00:14,500 --> 00:00:18,000
허풍 없음. 시그널 없음. 오직 방어.

7
00:00:18,000 --> 00:00:21,000
무료 BTC 함정 알림 (텔레그램).

8
00:00:21,000 --> 00:00:23,000
https://t.me/cryptotradeacademytrialkorean
```

---

## SHORT_VIDEO_SCRIPT_SRT_JA
ショート動画/TikTok. 25–30秒。Minimal リンクのみ。

**スクリプト**
0–1s: 多くの人は"エントリー"で負けていません。
1–5s: 負ける理由は、クジラの罠に気づけないから。
5–10s: 1人は全損。もう1人は翌朝利益で起きる。
10–16s: 違いは運じゃない — 罠を先に見れるかどうか。
16–23s: このツールはBTCの罠を事前に通知します。煽りなし。シグナルなし。防御だけ。
23–30s: 無料のTelegram通知はこちら。 👉 https://t.me/cryptotradeacademytrialjapanese

**SRT**
```
1
00:00:00,000 --> 00:00:01,200
多くの人は"エントリー"で負けていません。

2
00:00:01,200 --> 00:00:04,800
負ける理由は、クジラの罠に気づけないから。

3
00:00:04,800 --> 00:00:07,500
1人は全損。もう1人は翌朝利益で起きる。

4
00:00:07,500 --> 00:00:10,500
違いは運じゃない — 罠を先に見れるかどうか。

5
00:00:10,500 --> 00:00:14,500
このツールはBTCの罠を事前に通知します。

6
00:00:14,500 --> 00:00:18,000
煽りなし。シグナルなし。防御だけ。

7
00:00:18,000 --> 00:00:21,000
無料のBTC罠アラート（Telegram）。

8
00:00:21,000 --> 00:00:23,000
https://t.me/cryptotradeacademytrialjapanese
```

---

## SHORT_VIDEO_GUIDE_EN
**Length:** 25–35 seconds works best.
**Hook:** First 1 second = "Wait, what?" moment.
**Voice:** Calm, factual, no hype.
**Visuals:** Charts / whale shadow / red PnL screen / family dinner / trap metaphor.
**Captions:** White text + black outline. One line per second.
**CTA:** "Get free" / "Don't get trapped" / "Telegram link below."
**Posting:** 1 video/day OK. Mere-exposure builds trust.

---

## SHORT_VIDEO_GUIDE_ES
**Length:** 25–35 segundos funciona mejor.
**Hook:** El primer segundo = momento "¿Espera, qué?".
**Voice:** Calmado, factual, sin hype.
**Visuals:** Gráficos / sombra de ballena / pantalla PnL roja / cena familiar / metáfora de trampa.
**Captions:** Texto blanco + contorno negro. Una línea por segundo.
**CTA:** "Consigue gratis" / "No te atrapes" / "Link de Telegram abajo."
**Posting:** 1 video/día OK. La mera exposición genera confianza.

---

## SHORT_VIDEO_GUIDE_PT
**Length:** 25–35 segundos funciona melhor.
**Hook:** O primeiro segundo = momento "Espera, o quê?".
**Voice:** Calmo, factual, sem hype.
**Visuals:** Gráficos / sombra de baleia / tela PnL vermelha / jantar em família / metáfora de armadilha.
**Captions:** Texto branco + contorno preto. Uma linha por segundo.
**CTA:** "Ganhe grátis" / "Não caia na armadilha" / "Link do Telegram abaixo."
**Posting:** 1 vídeo/dia OK. Mera exposição constrói confiança.

---

## SHORT_VIDEO_GUIDE_AR
**Length:** 25–35 ثانية تعمل بشكل أفضل.
**Hook:** أول ثانية = لحظة "انتظر، ماذا؟".
**Voice:** هادئ، واقعي، بدون هيب.
**Visuals:** رسوم بيانية / ظل حوت / شاشة PnL حمراء / عشاء عائلي / استعارة الفخ.
**Captions:** نص أبيض + إطار أسود. سطر واحد في الثانية.
**CTA:** "احصل مجاناً" / "لا تقع في الفخ" / "رابط تيليغرام أدناه."
**Posting:** فيديو واحد/يوم مقبول. التعرض البسيط يبني الثقة.

---

## SHORT_VIDEO_GUIDE_KO
**Length:** 25–35초가 가장 효과적.
**Hook:** 첫 1초 = "뭐, 잠깐?" 순간.
**Voice:** 차분하고 사실적. 허풍 없음.
**Visuals:** 차트 / 고래 그림자 / 빨간 PnL 화면 / 가족 저녁 / 함정 비유.
**Captions:** 흰 글자 + 검은 테두리. 초당 한 줄.
**CTA:** "무료로 받기" / "함정에 걸리지 마" / "텔레그램 링크 아래."
**Posting:** 하루 1개 OK. 노출 자체가 신뢰를 쌓음.

---

## SHORT_VIDEO_GUIDE_JA
**Length:** 25–35秒が最も効果的.
**Hook:** 最初の1秒＝「え、なに？」の瞬間.
**Voice:** 落ち着き、事実ベース、煽りなし.
**Visuals:** チャート / クジラの影 / 赤いPnL画面 / 家族の夕食 / 罠の比喩.
**Captions:** 白文字＋黒縁. 1秒1行.
**CTA:** 「無料でもらう」「罠にかかるな」「Telegramリンクは下に」
**Posting:** 1本/日OK. 単なる露出でも信頼が積み上がる.