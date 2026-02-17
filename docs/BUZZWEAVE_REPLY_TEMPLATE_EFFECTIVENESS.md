# リプライテンプレの効果的投下

## 現状の「効果的に投下されている」部分

| 要素 | 実装 | 効果 |
|------|------|------|
| **言語** | `langFilter` で 6 言語に対応した PQT / promo / scarcity / minimal | 現地語で一貫して出せる。 |
| **導線種別** | 有料(regular) → promoLine + scarcityLine / 無料(minimal) → minimalLine | 導線に合わせた CTA 付与。 |
| **キャンペーン** | `CAMPAIGN_PAID_FOCUS` 時のみ scarcityLine（48h・先着〇枠） | 希少性を有料導線にだけ付与。 |
| **引用文の語彙** | `extractMirrorWords(quotedText)` で元投稿の語をテンプレに反映 | 流れに合わせた言い回しで親和性アップ。 |
| **リンク** | 本文末尾にリンク・改行は Secret Weapons で整形 | クリックしやすい体裁。 |

## 効果が弱い／未接続の部分

### 1. テンプレ選択のバンディットが学習していない

- **仕様**: `pqtCtaEngine.pickTemplateIndex` は「過去 CTR が最も高いテンプレ」を選ぶ設計。
- **事実**: `recordPqtUse(lang, templateIndex)` は呼ばれているが、**クリック数（clicks）を渡す `recordPqtResult(..., clicks)` が一度も呼ばれていない**。
- **結果**: 全テンプレの CTR が 0 のまま → 常に **templateIndex 0** が選ばれる（または未使用インデックスがある間だけ順番に探索）。  
→ **テンプレート間の優劣が学習されず、効果の高いテンプレに偏らせられていない。**

**改善案**:  
- X の `url_link_clicks` や Whop/Vidalytics のクリックを `buzzweave_post_log.our_clicks` 等に集計しているなら、**投稿単位の templateIndex と紐付けて**定期的に `recordPqtResult(lang, templateIndex, clicks)` を呼ぶジョブを入れる。  
- または、クリック取得 API（x-engagement-metrics 等）の結果を「どのテンプレで投稿したか」と紐付け、pqtCtaEngine の stats を更新する。

### 2. ターゲット投稿の文脈でテンプレ種別を切り替えていない（修正済み）

- **仕様**: 仕手Bot向けの「同意フック＋短い本文」= **Bot テンプレ**（PQT_TEMPLATES_BOT）。通常 = PQT_TEMPLATES。
- **旧実装**: `useBotTemplates` は **環境変数のみ**（`BUZZWEAVE_USE_BOT_TEMPLATES`）。スロットの内容に依存していなかった。
- **改善**: **ターゲットの dangerLabel に連動**させる。  
  - `whale_trap`（煽り・FOMO 系）→ Bot テンプレ（同意＋構造の一言）で刺さりやすくする。  
  - `educational` / `neutral` → 通常テンプレで防御・洞察を足す。  
- 環境変数で `true` / `false` が明示されている場合は従来どおり env を優先。

### 3. ナラティブ・クラスタでテンプレの中身を変えていない

- 現在、**narrative_tag** や **cluster**（etf / price_surge / meme 等）は `buildPqt` に渡していない。
- テンプレ本文は「言語・導線・mirror 語彙」のみで決まり、**「どの文脈のスレにリプするか」で文言を切り替えていない**。
- 効果をさらに上げるなら: slot の `narrative_tag` / `cluster` を context に渡し、テンプレ側で「ATH 系」「Crash 系」「Meme 系」など出し分ける拡張が考えられる。

## まとめ

- **言語・導線・キャンペーン・mirror 語彙・リンク**は効くように投下されている。
- **テンプレ選択**は、  
  - **どのテンプレを使うか（Bot vs 通常）**を dangerLabel に連動させることで「効果的に投下」に寄せた。  
  - **どのテンプレが最も CTR が高いか**は、現状クリックがバンディットに戻っていないため学習されていない。クリックを templateIndex と紐付けて `recordPqtResult` に流すと、効果的なテンプレに偏らせられる。
