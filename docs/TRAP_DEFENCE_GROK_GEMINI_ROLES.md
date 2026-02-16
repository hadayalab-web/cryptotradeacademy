# Trap Defence BTC：Grok と Gemini の役割分担と注意事項

検証（GEMINI_VERIFICATION_PROMPT / GROK_VERIFICATION_PROMPT）を踏まえた役割整理。不安になりがちな「このままでいいか」に答える。

---

## 本番フローでの役割（現状）

| 担当 | 用途 | 出力 | パラメータ推奨 |
|------|------|------|----------------|
| **Grok** | Stage 6: 市場分析・Dr.Grok 文 | `drGrok.base`（分析テキスト） | **返していない** |
| **Grok** | X センチメント・心理サポート | Telegram Regular の「X Sentiment」「Dr. Grok」 | **返していない** |
| **Gemini** | Stage 5: SoSoValue 風記事 | `sosovalueArticle` | **返していない** |
| **Gemini** | 画像・動画生成（USP2） | メディアファイル | **返していない** |

**結論**: 本番の自動パイプラインでは、**どちらも「テキスト／コンテンツ生成」のみ**。run の「次の1アクション」（BUZZWEAVE_SEARCH_WINDOW_MIN など）を API が返して自動反映する設計にはなっていない。**役割分担はこのままでよい。**

---

## 人間が Grok / Gemini に「相談」するとき

- **スクリプト例**: `report-kpi-gap-to-grok.js`, `analyze-grok-x-integration-strategy.js`, `request-market-research-from-grok.ts` など。人間が Grok に長文プロンプトを投げて戦略・KPI・次の一手を聞く。
- **検証で分かったこと**  
  - **Gemini**: 自由記述で「次の1アクション」を聞いても、原因・正しいレバー・理由を出し、末尾のメタ発言を抑えれば使える。  
  - **Grok**: 自由記述で「次の1アクション」を聞くと、**誤レバー**（例: 存在しない `lowVolumeBackfillUsed=true`）を出す。**A/B で選ばせる**か、**候補を文中に明示**すると正しく答える。

**運用ルール**:  
- **Grok に「次の一手」「どれを先にやるべきか」を聞くときは、選択肢を明示する。**（A/B または「BUZZWEAVE_SEARCH_WINDOW_MIN を 30 にする / BUZZWEAVE_FALLBACK_SLOT_COUNT を 5 にする」のように候補を書いてから選ばせる。）  
- **Gemini** はそのまま「原因・次の1アクション・理由」を自由記述で聞いてよい（検証通過済み）。

---

## 将来「Grok の出力を自動でパラメータに反映」する場合

- その設計にするなら、**Grok の出力は「選択肢から選んだもの」に限定する**（自由記述の「次の1アクション」をそのまま環境変数に流さない）。  
- あるいは、**「次の1アクション」の自動反映は Gemini に任せ、Grok はセンチメント・市場文脈の生成だけに使う**、という分担にすると安全。

---

## まとめ

- **このままでよい**: 本番では Grok = センチメント・市場分析・Dr.Grok 文、Gemini = 記事・コンテンツ。どちらもパラメータ推奨は返していない。  
- **相談するとき**: Grok には選択肢を明示してから意思決定を聞く。Gemini は自由記述でよい。  
- **自動でパラメータに反映するなら**: Grok は選択肢限定か、意思決定は Gemini に寄せる。
