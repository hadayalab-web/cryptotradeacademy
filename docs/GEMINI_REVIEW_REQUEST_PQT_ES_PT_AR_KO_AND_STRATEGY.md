# Gemini へのレビュー依頼：PQT 3パターン（ES/PT/AR/KO）＋投下戦略

以下の文章をそのまま Gemini に貼り付けて、レビューと戦略アドバイスを依頼してください。

---

## 依頼文（コピー用）

```

あなたの以前の分析（損失回避層への緊急性×希少性、毒をもって毒を制す・合気道効果、改善案A/B/C）に基づいて、X（Twitter）の「仕手Bot投稿へのリプライ」用メッセージを **3パターン（fear / authority / elitism）** に集約した実装を、英語・日本語に加え **スペイン語（ES）・ポルトガル語（PT）・アラビア語（AR）・韓国語（KO）** でも用意しています。

**お願いしたいこと（2本立て）**

1. **ES / PT / AR / KO のコピーレビュー**  
   各言語の現行コピーについて、EN/JA と同様に「設計との整合性」「認知的不協和の緩和」「3パターンの使い分け妥当性」「コピー品質（刺さり・違和感・詐欺感・文化的配慮）」をレビューし、修正案（Before/After）があれば提示してください。特に Fear の「強いブレーキ」表現、Elitism の「攻撃しすぎない選民フレーム」が各言語で適切かどうかを見てほしいです。

2. **3パターンの投下戦略**  
   fear / authority / elitism の **3種類をどのように投下したら最も効果的か** について、戦略的なアドバイスをください。  
   - 仕手Botの dangerLabel（whale_trap / educational / neutral）に応じて **自動で1パターンを選ぶ現行方式** の評価と、代替案（例：ランダム化・時間帯で切り替え・A/Bテストの設計）があれば教えてください。  
   - コンバージョン（クリック・申し込み）を最大化しつつ、スパム判定・ユーザー疲れを避けるための **配分・頻度・タイミング** の考え方も知りたいです。

---

### 設計の前提（EN/JA レビュー時と同じ）

- **対象**: すべて仕手Bot投稿へのリプライ。仕手Botのニュアンス（dangerLabel）でパターンを自動選択。
- **3パターン**: 恐怖訴求 (fear) / 権威訴求 (authority) / 選民意識 (elitism)。パターン = 1メッセージに集約。
- **マッピング**: whale_trap → fear、educational → authority、neutral → elitism。
- **行動指針**: 全言語で「Pause → Verify → Act」（または「一旦停止 → 確認 → 条件一致で行動」など）を共通軸にし、急ぎは「ツールの枠」、止まれは「エントリー判断」に分離して認知的不協和を緩和済み。

---

### 各言語の行動指針（ACTION_GUIDANCE）

- **es:** Pausa → Verifica → Actúa solo cuando las condiciones coincidan  
- **pt:** Pare → Confira → Aja só quando as condições coincidirem  
- **ar:** توقف → تحقق → تحرك فقط عند تطابق الشروط  
- **ko:** 멈춤 → 확인 → 조건 일치 시 행동  

※ 日本語では「止まる」を「一旦停止」に変更し、停止への抵抗感を下げる修正を済ませています。ES/PT/AR/KO でも同様の「能動的ニュアンス」の要否について所見があればお願いします。

---

### ES サンプル（3パターン）

**1. 恐怖訴求 (fear)**  
Sí, este movimiento atrae. Antes de entrar — una revisión de estructura para no pillar el lado equivocado.  
Pausa → Verifica → Actúa solo cuando las condiciones coincidan  
[CTA] -> [Whop link]

**2. 権威訴求 (authority)**  
Accede al "análisis estructural" que valida el ruido. Un punto claro evita pérdidas evitables.  
[proofSnippet]  
Intel profesional. Pausa → Verifica → Actúa solo cuando las condiciones coincidan  
[CTA] -> [Whop link]

**3. 選民訴求 (elitism)**  
No seas liquidez de salida. El 5% superior verifica antes de sumar tamaño.  
[proofSnippet]  
Un nivel que confirmar. Pausa → Verifica -> [Whop link]

**希少性付き（SCARCITY_VARIANTS）**  
- fear: AVISO: Asegura tu "escudo" antes del dump. 48h para proteger activos. [Primeros 50]  
- authority: Accede al "análisis estructural" que valida el ruido. Intel profesional 48h. [Últimas plazas]  
- elitism: No seas liquidez de salida. "Slot superviviente" del 5% superior. Verifica antes de entrar. 48h. [50 plazas]

---

### PT サンプル（3パターン）

**1. 恐怖訴求 (fear)**  
Sim, esse movimento chama. Antes de entrar — uma checagem de estrutura para não ser pego do lado errado.  
Pare → Confira → Aja só quando as condições coincidirem  
[CTA] -> [Whop link]

**2. 権威訴求 (authority)**  
Acesse a "análise estrutural" que valida o ruído. Um ponto claro evita perdas evitáveis.  
[proofSnippet]  
Intel profissional. Pare → Confira → Aja só quando as condições coincidirem  
[CTA] -> [Whop link]

**3. 選民訴求 (elitism)**  
Não seja liquidez de saída. O top 5% verifica antes de aumentar tamanho.  
[proofSnippet]  
Um nível a confirmar. Pare → Confira -> [Whop link]

**希少性付き（SCARCITY_VARIANTS）**  
- fear: AVISO: Proteja seu "escudo" antes do dump. Janela de 48h. [Primeiros 50]  
- authority: Acesse a "análise estrutural" que valida o ruído. Intel profissional 48h. [Últimas vagas]  
- elitism: Não seja liquidez de saída. "Vaga sobrevivente" do top 5%. Verifique antes de entrar. 48h. [50 vagas]

---

### AR サンプル（3パターン）

**1. 恐怖訴求 (fear)**  
أجل، هذا الحركة يلفت. قبل القفز — تحقق من البنية مرة واحدة.  
توقف → تحقق → تحرك فقط عند تطابق الشروط  
[CTA] -> [Whop link]

**2. 権威訴求 (authority)**  
الوصول لـ"تحليل البنية" الذي يتحقق من الضجيج. نقطة واحدة تقلل الخسائر.  
[proofSnippet]  
احترافي. توقف → تحقق → تحرك فقط عند تطابق الشروط  
[CTA] -> [Whop link]

**3. 選民訴求 (elitism)**  
لا تكن سيولة خروج. أفضل 5% يتحققون قبل زيادة الحجم.  
[proofSnippet]  
مستوى واحد للتأكيد. توقف → تحقق -> [Whop link]

**希少性付き（SCARCITY_VARIANTS）**  
- fear: تحذير: احمِ أصولك قبل الانهيار. 48 ساعة. [أول 50 فقط]  
- authority: الوصول لـ"تحليل البنية" الذي يتحقق من الضجيج. 48 ساعة. [آخر الأماكن]  
- elitism: لا تكن سيولة خروج. "مقعد الناجين" لأفضل 5%. تحقق قبل الدخول. 48 ساعة. [50 مقعد]

**補足**: AR は RTL。文法・性一致（هذا الحركة → هذه الحركة 等）の指摘も歓迎です。

---

### KO サンプル（3パターン）

**1. 恐怖訴求 (fear)**  
맞아요, 이런 움직임 반응 많죠. 그 전에 여기만 확인해 두면 손해 덜 봅니다.  
멈춤 → 확인 → 조건 일치 시 행동  
[CTA] -> [Whop link]

**2. 権威訴求 (authority)**  
노이즈를 검증하는 "구조 분석" 접근. 한 가지 확인으로 손실을 줄입니다.  
[proofSnippet]  
프로급 인텔. 멈춤 → 확인 → 조건 일치 시 행동  
[CTA] -> [Whop link]

**3. 選民訴求 (elitism)**  
출구 유동성 되지 마세요. 상위 5%는 사이즈 올리기 전 확인합니다.  
[proofSnippet]  
확인할 한 레벨. 멈춤 → 확인 -> [Whop link]

**希少性付き（SCARCITY_VARIANTS）**  
- fear: 경고: 덤프 전에 "실드" 확보. 48시간. 자산 보호. [선착 50명]  
- authority: 노이즈를 검증하는 "구조 분석" 접근. 프로급 인텔 48h. [잔여 소수]  
- elitism: 출구 유동성 되지 마세요. 상위 5% "생존자 슬롯". 진입 전 확인. 48h. [50자리]

---

### 出力形式の希望

**Part 1（ES/PT/AR/KO レビュー）**  
- 言語ごとに「設計との整合性」「認知的不協和」「コピー品質」を簡潔に。  
- 修正推奨は Before / After または具体的な文言で。  
- 文化的・文法的な注意点（AR の性一致、KO の敬語レベル、ES/PT の地域差など）があれば記載。

**Part 2（3パターン投下戦略）**  
- 現行の「dangerLabel に応じた自動選択」の評価。  
- より効果的な投下の仕方（配分・タイミング・A/Bテスト案・スパム/疲れ対策）を 1〜2 ページ程度でまとめてください。
```

---

## 使い方

1. 上記の「依頼文（コピー用）」の \`\`\` \`\`\` で囲まれたブロック全体をコピーする。
2. Gemini のチャットに貼り付けて送信する。
3. 必要に応じて、`docs/PQT_DESIGN_BASED_ON_GEMINI_ANALYSIS.md` や `docs/PQT_SCARCITY_3PATTERNS_GEMINI.md` を参照用として追記できる。
