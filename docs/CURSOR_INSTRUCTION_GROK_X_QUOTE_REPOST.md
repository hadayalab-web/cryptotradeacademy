# Cursor 指示書（Grok × X広告 × Trap Defence 引用リポスト生成エンジン）完全版

この指示書は **Trap Score 画像と連動した、Grok 文体の引用リポストを毎回安定生成する** ための仕様です。  
実装: `services/salesLetterContest.js` の `buildGrokOnlyPrompt` に反映済み。

---

## 0. Mission

Generate **English quote‑repost copy** for X influencers that follows:

- Grok‑style tone  
- X Ads structure  
- Data‑driven persuasion  
- Trap Defence brand voice  
- Automatic CTA insertion  
- Automatic VSL links  
- Automatic Whop links  
- Automatic discount code insertion  
- Automatic "social proof" line  
- 100% consistent structure  

Input: Trap Score, Price, Whale Ratio, Netflow, Market condition notes, CTA code, Links.  
Output: **single finished quote tweet** (body only; VSL/Whop/social proof are added in code).

---

## 1. Tone Rules（Grok文体の強制）

- Calm, factual, slightly sarcastic  
- No hype, no exclamation marks  
- Short, sharp sentences  
- "Data > emotion" framing  
- Use contrast: hesitation vs. data  
- Use inversion: "the market observes you"  
- Grok‑style understatement  
- Never motivational / never emotional  
- No emojis except in the final social‑proof line (added by code)

**Example phrases:**  
"The number that says what people don't want to admit."  
"Still observing the market while the market observes your hesitation."  
"Not intuition. Not vibes. Data."  
"Predictable behavior. Predictable outcome."

---

## 2. X Ads Structure（広告構造の強制）

**黄金ルール:** 数字 → 意味 → 心理的暗示。説明ではなく「脳を止める → 読む → 行動する」。

1. **Red‑flag opener** — 黄金ルール: 数字 → 意味 → **暗示（心理）**。読者の脳を止め「どういう意味？」と考えさせる。パターン: "the number that says \"stability is a disguise.\"" または "the number that exposes stability as a disguise." 短く刺さる暗示に。推奨: "stability is a disguise", "stability pretending to be safety", "stability masking distribution"。避ける: "distribution disguised as stability" など長い説明。
2. **Human behavior pattern** — 「just watching」ループ＋**もう一撃**。単体の "Stuck in the 'just watching' loop." は弱い。読者の痛点に触れる短い足しを必ず入れる。例: "— telling yourself it's 'not the top.'" または ", waiting for confirmation that never comes." 皮肉×事実で刺す。ここに "the market observes your hesitation" は入れない。
3. **Psychological inversion + Data block** — 先に "The market observes your hesitation."（ブロック2の**後**）。続けて **Trap Score は1回だけ**（データ行は "28/100 + Whale Ratio + netflow" のみ）。意味づけは**短く・鋭く・冷たく**: "visible only in hindsight" または "noticed only after the drop" を推奨。"you only notice after the drop" は1%長いので避ける。最後に "Not intuition — data."
4. **Solution block** — 順序: 価値（Exit Map）→ オファー（DEFEND50）→ 心理（Decide before〜）。**リズム:** 短い文で区切る。例: "Regular. 15‑min alerts. Exit Map." 改行 "DEFEND50 gets you in. Decide before the market decides for you." **本文に "Join us." は書かない**（社会的証明で付与）。
5. **Hashtags** — `#BTC #TrapDefence #TrapScore`  
6. **VSL links** — コードで付与  
7. **Whop links** — コードで付与  
8. **Social proof** — コードで付与（"I'm Safe." と "Join us." は絶対に残す）

---

## 3. Mandatory Phrasing（必須フレーズ）

- "Not intuition — data."  
- "distribution signature"（"recognized only in hindsight" / "everyone recognizes too late" など鋭い意味づけ）  
- "the 'just watching' loop"  
- "the market observes your hesitation"（ブロック3のみ、ブロック2の後）  
- "decide before the market decides for you"  
- "Join us." は**本文に書かず**社会的証明で付与  

---

## 4. Variables（自動差し替え）

- trapScore, price, whaleRatio, netflow → from ON-CHAIN DATA  
- discountCode → DEFEND50  
- freeLink, upgradeLink, minimalVSL, fullVSL, socialProofNumber → inserted by code  

---

## 5. Output Format

Grok outputs **only** the tweet body (blocks 1–5).  
No explanations. No commentary. No markdown. No code blocks.

---

## 6. Quality Rules（品質チェック）

- Grok tone consistent  
- No hype  
- No emojis in body  
- No long paragraphs  
- No more than ~12 lines (body)  
- All required blocks included  
- All required variables inserted  
- Discount code DEFEND50 in solution block  

---

## Trap Score 画像との連動

Trap Score 表示時の意味づけ例: **"Market Anomaly Detected"** / **"Data-Driven Signal"** / **"distribution disguised as stability"**  
Red‑flag opener で Trap Score の数値とこの意味を対応させ、**「数字 → 意味 → 暗示」で一撃にする。**

---

## プロレビュー反映（9.6 → 10/10・完全体）

- **冒頭:** 数字 → 意味 → **暗示**。説明ではなく「暗示の一滴」で脳を止める。短く: "stability is a disguise" / "stability masking distribution"。長い "distribution disguised as stability" は避ける。  
- **ブロック2:** "Stuck in the 'just watching' loop." を単体で終わらせない。必ずもう一撃を足す（例: ", waiting for confirmation that never comes."）。皮肉×事実で痛点に触れる。
- **データブロック:** Trap Score は本文で**1回だけ**。意味づけは**短く・鋭く・冷たく**: "visible only in hindsight" または "noticed only after the drop" を推奨。
- **CTA 順:** 心理誘導 → データ → 解決策 → CTA。CTA を早めに出さない。Solution = Regular + 15min + Exit Map → DEFEND50 → "Decide before the market decides for you."  
- **"Join us.":** 本文には書かない。社会的証明で付与。  
- **Solution リズム:** 強→弱の順（Exit Map = 価値 → DEFEND50 = オファー → Decide = 心理）。句読点で短いビートに。例: "Regular. 15‑min alerts. Exit Map."
- **文字数:** 700–900（808 は黄金帯）。Social proof の "I'm Safe." は絶対維持。数字の変動は「リアルタイム感」で CTR に有効。

### 理想形（EN・本文のみ・ブロック 1–5・10/10 完全体）

```
Trap Score 28/100 — the number that says stability is a disguise.

Stuck in the 'just watching' loop, waiting for confirmation that never comes.

The market observes your hesitation.
28/100 + Whale Ratio 0.42 + negative netflow — the distribution signature visible only in hindsight.
Not intuition — data.

Regular. 15‑min alerts. Exit Map.
DEFEND50 gets you in. Decide before the market decides for you.
```
（"Join us." は社会的証明で付与。冒頭は「暗示の一滴」で脳を止める。データの意味づけは短く冷たく。）

### 理想形（ES・本文のみ・ブロック 1–5・10/10 完全体）

```
Trap Score 28/100 — el número que expone la estabilidad como disfraz.

Atrapado en el bucle de "solo mirar", esperando una confirmación que nunca llega.

El mercado observa tu duda.
28/100 + Whale Ratio 0.42 + flujo negativo — la firma de distribución que solo ves después de la caída.
No intuición: datos.

Regular. Alertas cada 15 min. Exit Map.
DEFEND50 te da acceso. Decide antes de que el mercado decida por ti.
```
（"Únete." は社会的証明で付与。"hesitación" → "duda" で自然に。データは短く「que solo ves después de la caída」。"Alertas cada 15 min" でリズムを整える。）

**ES版 プロレビュー反映（9.85 → 10/10）**
- **Block 3 心理:** "hesitación" は不自然 → **"duda"** に統一。広告的に刺さる。
- **データの意味づけ:** "visible solo en retrospectiva" は長い → **"que solo ves después de la caída"** または **"que solo reconoces tarde"** を推奨。短く鋭く。
- **Solution リズム:** "Alertas 15 min" → **"Alertas cada 15 min"** で自然さ・読みやすさアップ。Social proof の "I'm Safe." は英語のまま（ブランド性）。

### 理想形（PT-BR・本文のみ・ブロック 1–5・10/10 完全体）

```
Trap Score 28/100 — o número que expõe a estabilidade como disfarce.

Preso no loop de "só assistir", esperando uma confirmação que nunca vem.

O mercado observa sua dúvida.
28/100 + Whale Ratio 0.42 + fluxo negativo — a assinatura de distribuição que você só reconhece depois da queda.
Não intuição — dados.

Regular. Alertas a cada 15 min. + Exit Map.
DEFEND50 te dá acesso. Decida antes que o mercado decida por você.
```
（"Junte-se a nós." は社会的証明で付与。データは短く「que você só reconhece depois da queda」。Solution は "a cada 15 min. + Exit Map" でリズム。Block 3 は "dúvida"。）

**PT-BR版 プロレビュー反映（9.7 → 10/10）**
- **データの意味づけ:** "visível só em retrospecto" は長い → **"que você só reconhece depois da queda"** または **"visível apenas depois da queda"** を推奨。
- **Solution リズム:** "Exit Map" の前に **"+"** を入れて広告感を上げる。例: "Regular. Alertas a cada 15 min. + Exit Map."
- **Social proof:** "Junte-se." → **"Junte-se a nós."** で帰属感・安心感・行動誘導を強化（reaction-counter で付与）。

### 理想形（AR・本文のみ・ブロック 1–5・10/10 完全体）

```
Trap Score 28/100 — الرقم الذي يكشف أن الاستقرار مجرد قناع.

حبيس حلقة «المشاهدة فقط»، بانتظار تأكيد لا يأتي أبدًا.

السوق يراقب ترددك.
28/100 + Whale Ratio 0.42 + تدفق سلبي — توقيع التوزيع الذي لا تلاحظه إلا بعد الهبوط.
ليست حدسًا — بيانات.

ريجولار. تنبيهات كل 15 دقيقة. + Exit Map.
DEFEND50 يفتح لك الباب. قرر قبل أن يقرر السوق عنك.
```
（"انضم إلينا." は社会的証明で付与。オープナーは「مجرد قناع」で冷たく。データは「الذي لا تلاحظه إلا بعد الهبوط」。Solution は "+ Exit Map" でリズム。）

**AR版 プロレビュー反映（9.8 → 10/10）**
- **オープナー:** 文学的 "قناعًا" を避け、**"الرقم الذي يكشف أن الاستقرار مجرد قناع"** または **"أن الاستقرار تمويه"** で短く冷たく。
- **データの意味づけ:** "الذي لا يُرى إلا بعد الهبوط" は長い → **"الذي لا تلاحظه إلا بعد الهبوط"** または **"الذي لا يظهر إلا بعد الهبوط"** を推奨。
- **Solution リズム:** "Exit Map" の前に **"+"** を入れる。例: "ريجولار. تنبيهات كل 15 دقيقة. + Exit Map."
- **Social proof:** "انضم" → **"انضم إلينا."** で帰属感・安心感を強化（reaction-counter で付与）。

### 理想形（KO・本文のみ・ブロック 1–5・10/10 完全体）

```
트랩 스코어 28/100 — '안정'이 사실은 위장된 분배라는 신호.

'그냥 보기'만 반복하며, 오지 않을 확인만 기다리는 사이.

시장은 당신의 망설임을 지켜본다.
28/100 + Whale Ratio 0.42 + 순유입 마이너스 — 항상 뒤늦게만 보이는 분배 신호.
직감이 아니다 — 데이터.

레귤러. 15분 알림. + Exit Map.
DEFEND50으로 진입하세요. 시장이 결정하기 전에 당신이 결정하라.
```
（"함께 지키자." は社会的証明で付与。オープナーは「보이지만/사실은」の対比で刺さる。Block 2 は「반복/멈춤」で「루프」を避ける。データは「항상 뒤늦게만」。CTA は「진입하세요」で行動誘導。）

**KO版 プロレビュー反映（9.6 → 10/10）**
- **オープナー:** 直訳的な語順を避け、**"'안정'이 사실은 위장된 분배라는 신호"** または **"안정처럼 보이지만 분배를 숨기는 숫자"** で「보이지만/사실은」の対比に。
- **Block 2:** 「루프」は機械的 → **"'그냥 보기'만 반복하며"** または **"'지켜보기'만 하며 멈춰 있는 사이"** で「반복/멈춤」の刺さりに。
- **データの意味づけ:** **"항상 뒤늦게만 보이는 분배 신호"** または **"하락하고 나서야 보이는 분배 신호"** を推奨。
- **Block 4 CTA:** "시작하세요" は柔らかい → **"DEFEND50으로 진입하세요"** または **"바로 접근 가능"** で行動誘導を強く。Social proof「함께 지키자」はブランド性のため維持可。

### 理想形（JA・本文のみ・ブロック 1–5・10/10 完全体）

```
トラップスコア 28/100 — 「安定」が実は分配の仮面だというサイン。

「見てるだけ」を繰り返し、来ない確認を待ち続ける。

市場はあなたの躊躇を観察している。
28/100 + Whale Ratio 0.42 + 純流入マイナス — いつも後になって気づく分配サイン。
直感ではない — データ。

レギュラー。15分アラート。+ Exit Map。
DEFEND50で即アクセス。市場が決める前にあなたが決めろ。
```
（"一緒に守ろう." は社会的証明で付与。オープナーは「見えて/実は」の対比。Block 2 は「繰り返し/固まり」で「ループ」を避ける。データは「いつも後になって気づく」。CTA は「即アクセス」で行動誘導。Social proof「一緒に守ろう」はブランド性のため維持可。）

**JA版 プロレビュー反映（9.7 → 10/10）**
- **オープナー:** 説明的な「安定を装った」を避け、**「『安定』が実は分配の仮面だというサイン」** または **「安定に見えて実は『分配』を隠す数字」** で「見えて/実は」の対比に。
- **Block 2:** 「ループに陥り」は機械的 → **「『見てるだけ』を繰り返し、来ない確認を待ち続ける」** または **「『見てるだけ』のまま固まり、来ない確認を待つ」**。
- **データの意味づけ:** **「いつも後になって気づく分配サイン」** または **「下落して初めて見える分配サイン」** を推奨。
- **Block 4 CTA:** "参加" は柔らかい → **「DEFEND50で即アクセス」** または **「DEFEND50でアクセス可能」** で行動誘導を強く。
