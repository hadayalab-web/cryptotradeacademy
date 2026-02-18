# リプライ用 希少性コピー 3パターン（Gemini 作成）

**設計の根拠**: テンプレ全体の設計は **`docs/PQT_DESIGN_BASED_ON_GEMINI_ANALYSIS.md`** にまとめた Gemini の行動経済学分析に基づいて統一する。

仕手Botの煽り（Hot State）のエネルギーを「防御」へ転換させる設計（毒をもって毒を制す・合気道効果）。Bot投稿タイプに合わせて使い分け可能。

---

## 1. 恐怖訴求型 (Fear Appeal)

**狙い:** 「儲け損なう恐怖」を「資産を失う恐怖（実損）」にすり替え、防御行動を緊急化させる。

**活用シーン:** Botが「To the moon!」「今買わないと損」と強く煽っている時。上げ相場のピーク感がある時。

| 言語 | コピー |
|------|--------|
| **ja** | 警告：値崩れ前の「緊急避難ルート」確保は済んでいますか？ 手遅れになる前の48時間限定公開。資産を守る【先着50名】 |
| **en** | WARNING: Secure your "Shield" before the dump. 48h window to protect your assets. Don't get trapped. [First 50 only] |

---

## 2. 権威訴求型 (Authority Appeal)

**狙い:** 騒がしいBotの煽りに対し、「冷静なプロのデータ」という対比構造を作り、信頼性で釣る。

**活用シーン:** 「確実な情報筋」「激アツ銘柄」など、情報の質を謳うBot投稿へのカウンター。

| 言語 | コピー |
|------|--------|
| **ja** | 騒乱を静観する「機関レベルの構造分析」へ招待。 一般アクセスは48時間のみ許可されます。真実を確認する【残り数枠】 |
| **en** | Access the "Structure Analysis" that validates the noise. Professional grade intel open for 48h. [Last few spots available] |

---

## 3. 選民意識型 (Elitism Appeal)

**狙い:** 「その他大勢（養分）」になりたくないというプライドを刺激し、防御＝賢い選択と再定義する。

**活用シーン:** 思考停止で群がるリプライ（「買いました！」「行けー！」）が多い投稿。FOMOを煽る投稿。

| 言語 | コピー |
|------|--------|
| **ja** | 養分回避。カモにされない上位5%だけの「生存者枠」を確保してください。 エントリー条件を確認する48時間。【残り50枠】 |
| **en** | Don't be exit liquidity. Claim your "Survivor Slot" used by the top 5%. Verify before you ape in. 48h limit. [50 spots left] |

---

## 運用メモ

- **英語:** "Don't be exit liquidity" "Ape in" は Crypto Twitter で刺さるパワーワード。
- **【残り〇枠】:** 実際の枠数（CAMPAIGN_SLOTS_LEFT）で差し替えると信憑性アップ（バンドワゴン効果）。
- **実装:** `pqtTemplates.js` の `getScarcityLine` が **CAMPAIGN_SCARCITY_VARIANT** を参照。`fear` / `authority` / `elitism` のいずれかを指定するとそのパターンを付与。未設定時は「48h限定・先着50名」「あと〇枠・48h限定」のデフォルト。`CAMPAIGN_SLOTS_LEFT` を設定すると各パターン末尾に「あと〇枠・48h限定」を付与。

---

## 参照

- **設計の根拠（仮説・リスク・改善案）**: `PQT_DESIGN_BASED_ON_GEMINI_ANALYSIS.md`
- 仮説: 仕手Bot＝損失回避 → 提灯層に緊急性×希少性が刺さる。同一言語で行動先だけ防御へ。
- Gemini 検証: 二重の損失回避・認知トンネリングで仮説支持。「急がせながら止まれ」の不協和を、資産防衛のタイムリミット（改善A）・選民フレーミング（改善B）で緩和。
