# 投稿に実装した CTR をいかにクリックさせるか

**目的**: テンプレ・リンク・CTA は実装済み。ここでは「**いかにクリックさせるか**」— コピー・心理・フォーマット・クリック計測の接続 — を一覧にし、抜けをなくす。

**前提**: **まずインプレ（リーチ）がないとクリックは伸びない。** 直近投稿が「1〜2件の表示」のときは [IMPRESSIONS_NEAR_ZERO_WHAT_TO_DO.md](IMPRESSIONS_NEAR_ZERO_WHAT_TO_DO.md) を先に潰す。

---

## 1. 実装済み（土台）

| 項目 | 中身 |
|------|------|
| **テンプレ選択（CTR バンディット）** | `pqtCtaEngine.pickTemplateIndex(lang)` — 言語ごとに uses/clicks で CTR が高いテンプレを優先。`recordPqtUse(lang, templateIndex)` で投稿時に uses を記録。 |
| **リンク配置（Secret Weapons）** | `pqtSecretWeapons.applySecretWeaponsFormat` — リンクを**最終行に単独**（前の行と空行で区切り）。CTA 末尾の 。!? 削除。約 15% click lift 想定。 |
| **Mirror vocab** | 引用元から 2–3 語を抽出し本文に織り込む（semantic match で relevance 向上）。 |
| **導線** | `pickBestFunnelLink` / `pickVidalyticsLink` — Minimal vs Regular の選定。70% Regular / 30% Minimal 等。 |

---

## 2. クリックを「させる」ための設計（抜けていた観点）

**心理・コピー**

- **損失回避**: 「損する前に」「Don't lose here」— クリックでリスク回避できると伝える。
- **緊急性**: 「今のうちに」「before you're next」— 今クリックする理由を明示。
- **ツァイガルニク**: 「この先どうなる？」「What happens next?」— 未完の答え＝開いたループでリンクへ誘導。
- **価値先行**: 「Checklist to ride this: [link]」型。押し売りより「役に立つ」でクリック率 2–3 倍（Grok 実績）。

**フォーマット・CTA**

- **リンクは改行のあと単独**: リンクの後にテキストを書かない。空行＋リンクのみ。
- **CTA 末尾に句点をつけない**: 。!? を削除（applySecretWeaponsFormat で実施済み）。
- **1 リンク**: 複数リンクは分散するので 1 本に絞る。
- **Opening**: 1–2 語の同意 or 絵文字で乗る → 本文 → CTA＋リンク。

**避けること**

- リンクだけの投げっぱなし（価値ゼロと見なされクリックされない）。
- 煽りすぎの文言（shill 判定でアルゴに demote）。
- 同じテンプレのコピペ連発（パターン検知でリーチ低下）。

テンプレ中身は `pqtTemplates.js` および `config/quoteRepostTemplates*.js` 等。上記を満たすバリアントを優先し、`pickTemplateIndex` が CTR で選べるようにする。

---

## 3. クリック数取得と CTR 学習の接続（まだ弱いところ）

- **現状**: `recordPqtUse(lang, templateIndex)` で **uses のみ** 記録。**clicks は 0 のまま**なので、`pickTemplateIndex` は「未使用テンプレから順に試す」に寄っている。
- **やること**: 導線（Vidalytics / Whop / 短縮 URL）の**クリック数を取得**し、`recordPqtResult(lang, templateIndex, clicks)` に渡す。するとテンプレ別 CTR が計算され、**クリックの出るテンプレが自動で優先**される。
- **データ源の例**: 短縮 URL のクリックログ、Whop/Vidalytics のレポート、または `buzzweave_post_log.our_clicks` を言語・テンプレ別に集計して定期的に `recordPqtResult` に流す。現状 DB の our_clicks は投稿単位なので、**投稿時に templateIndex をログに持てば**後から集計できる。

→ **クリックを「計測してテンプレ選択に戻す」**までつなげば、「いかにクリックさせるか」がループで改善する。

---

## 4. チェックリスト（運用）

- [ ] テンプレに損失回避・緊急性・ツァイガルニク・価値先行のいずれかが入っているか
- [ ] リンクは最終行単独・CTA 末尾句点なし（applySecretWeaponsFormat 適用済みか）
- [ ] 導線は 1 本・Minimal/Regular は pickBestFunnelLink で選定しているか
- [ ] クリック数取得経路を用意し、recordPqtResult に渡す（または our_clicks を templateIndex 付きで集計して反映）

---

## 5. 参照

| 用途 | ファイル |
|------|----------|
| CTR 最大化ロジック・メインフロー | `docs/BUZZWEAVE_PQT_CTR_DESIGN.md` |
| フォーマット・Secret Weapons | `docs/GROK_PROMPT_SECRET_WEAPONS.md`、`services/td/pqtSecretWeapons.js` |
| 心理・フック・CTA パターン | `docs/COPILOT_VS_GROK_ENGAGEMENT_COPY.md` |
| テンプレ選択・記録 | `services/td/pqtCtaEngine.js`（pickTemplateIndex, recordPqtUse, recordPqtResult） |
| 導線選定 | `services/links/index.js`（pickBestFunnelLink）、`config/buzzweaveLinks.js` |
| 北極星（100成約/日） | `docs/NORTH_STAR_KPI.md` — クリックは成約への入り口。 |
