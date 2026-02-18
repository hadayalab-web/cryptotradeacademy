# Gemini へのレビュー依頼：PQT 3パターン集約実装

以下の文章をそのまま Gemini に貼り付けて、レビューを依頼してください。

---

## 依頼文（コピー用）

```

あなたの以前の分析（損失回避層への緊急性×希少性、毒をもって毒を制す・合気道効果、改善案A/B/C）に基づいて、X（Twitter）の「仕手Bot投稿へのリプライ」用メッセージを **3パターンに集約** した実装を行いました。設計と実装の整合性・リスク・コピー品質についてレビューをお願いします。

### 前提

- **対象**: すべて仕手Bot投稿へのリプライ（一般投稿はなし）。仕手Botのニュアンス（dangerLabel）でパターンを自動選択している。
- **3パターン**: あなたが作成した「恐怖訴求型 (fear)」「権威訴求型 (authority)」「選民意識型 (elitism)」に統一。**パターン = 1メッセージ** に集約済み。

### 設計の根拠（あなたの分析の要約）

1. **仮説**: 損失回避層に緊急性×希少性は刺さる（二重の損失回避・認知トンネリングで支持）。
2. **設計**:  Bot の煽りエネルギーを消さず「防御」へ誘導（合気道効果）。同一言語で行動先だけ防御側へ。
3. **リスク**: 「急がせながら止まれ」の認知的不協和。
4. **改善案A**: コピーの焦点を「枠」ではなく「市場の変動」に（相場が崩れる前の48h・資産を守る）。
5. **改善案B**: 「防御」を「攻撃的準備」に言い換え（上位5%・生存者枠・選民フレーム）。
6. **改善案C**: LP では手順を簡略化（YES/NO で即判定できる UI）。

### 実装の対応関係

- 本文: 仕手Botの dangerLabel（whale_trap / educational / neutral）→ fear / authority / elitism のいずれか1本の本文を選択。
- 希少性コピー: 同じパターンで SCARCITY_VARIANTS（fear / authority / elitism）の文言を付与。あなたが作成した文言をそのまま使用。
- プロモ行: 1日無料トライアル・48h限定・先着50枠・コード DEFEND50（6言語）。

### レビューしてほしい点

1. **設計との整合性**: 上記の改善案A・B・Cおよび「毒をもって毒を制す」の設計と、実装された本文・希少性コピーは一致していますか。ずれや不足はありませんか。
2. **認知的不協和のリスク**: 「急がせながら止まれ」の矛盾は、現行コピーでどの程度緩和されていると見えますか。さらに弱めるための文言修正案があれば教えてください。
3. **3パターン（fear / authority / elitism）の使い分け**: 仕手Botの「煽り強」「情報質を謳う」「その他・群がり」へのマッピングは、行動経済学・消費者心理学の観点で妥当ですか。
4. **コピー品質**: 以下に掲載する EN ・ JA のサンプルについて、各パターンで「刺さり」や「違和感」「詐欺感」の観点で所見があればお願いします。
5. **その他**: 見落としがちなリスク・改善提案があれば挙げてください。

---

### EN サンプル（3パターン）

**1. 恐怖訴求 (fear)** — 煽り強の仕手Bot向け  
Yeah, this kind of move gets attention. Before you jump — one structure check so you don't get rekt.  
Pause → Verify → Act only when conditions align  
Use this as your decision guide -> [Whop link]

**2. 権威訴求 (authority)** — 情報の質を謳うBot向け  
Access the "Structure Analysis" that validates the noise. One clear checkpoint can separate avoidable losses from the rest.  
[proofSnippet: 市況・構造の一文]  
Professional grade intel. Pause → Verify → Act only when conditions align  
Use this as your decision guide -> [Whop link]

**3. 選民訴求 (elitism)** — その他・群がり向け  
Don't be exit liquidity. Claim your "Survivor Slot" — the top 5% verify before they add size.  
[proofSnippet: 市況・構造の一文]  
One level worth confirming. Pause → Verify -> [Whop link]

---

### JA サンプル（3パターン）

**1. 恐怖訴求 (fear)**  
確かに動いてますね。その前にここだけ見ておくと損しにくいです。  
一旦停止 → 確認 → 条件一致で行動  
判断材料はこちら -> [Whop link]  
＋ 1日無料トライアル。48h限定・先着50枠。コード DEFEND50 で50%オフ。  
＋ 警告：値崩れ前の「緊急避難ルート」確保は済んでいますか？ 手遅れになる前の48時間限定公開。資産を守る【先着50名】

**2. 権威訴求 (authority)**  
騒乱を静観する「機関レベルの構造分析」へ。一つだけ確認しておくと、手遅れの損失を避けやすいです。  
[proofSnippet]  
プロ級の情報。一旦停止 → 確認 → 条件一致で行動  
判断材料はこちら -> [Whop link]  
＋ 1日無料トライアル。48h限定・先着50枠。コード DEFEND50 で50%オフ。

**3. 選民訴求 (elitism)**  
「養分」回避。カモにされない上位5%だけが「変わり目」を確認してからサイズを足す。  
[proofSnippet]  
確認すべきレベルが一つ。一旦停止 → 確認 → 条件一致で行動  
判断材料はこちら -> [Whop link]  
＋ 1日無料トライアル。48h限定・先着50枠。コード DEFEND50 で50%オフ。

---

出力形式の希望:  
(1) 各レビュー項目への回答を簡潔に。  
(2) 修正を推奨する場合は「Before / After」または具体的な文言案を記載。  
(3) 結論として「設計との整合性」「認知的不協和」「コピー品質」の3点について、それぞれ 1〜2文の総評を付けてください。
```

---

## 使い方

1. 上記の「依頼文（コピー用）」の ` ``` ` で囲まれたブロック全体をコピーする。
2. Gemini のチャットに貼り付けて送信する。
3. 必要に応じて、プロジェクト内の `docs/PQT_DESIGN_BASED_ON_GEMINI_ANALYSIS.md` や `docs/PQT_SCARCITY_3PATTERNS_GEMINI.md` の内容も参照用として追記できる。
