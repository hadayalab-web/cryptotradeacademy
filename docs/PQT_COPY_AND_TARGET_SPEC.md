# 引用リポスト: コピーとターゲット仕様（刺さる・インプレ伸びる）

北極星: **100成約/日**。  
経路: **250投稿/日 → 1投稿あたり 1000〜10000 インプレ → 25万〜250万インプレ → 100成約/日**。

これを達成するには次の2点が必須である。

1. **ターゲットをぼやけさせない** … 「このコピーが刺さる」引用元だけを選ぶ。
2. **インプレが必ず伸びるロジックの精度** … 選定条件を「伸びる投稿」に厳格に合わせる。

---

## 1. PQT コピーのテーマ（pqtTemplates.js）

私たちのコピーは **Trap Defence** 軸で一貫している。

| テーマ | コピーのフック | 刺さる引用元の特徴 |
|--------|----------------|--------------------|
| **速さ・追いかけ** | "move feels fast" / "chase without structure" / "勢いで判断が前のめり" | 引用元に「速い動き」「乗る」「追う」「FOMO」が含まれる |
| **勢い・数字の跳ね** | "numbers jump" / "momentum hides" / "数字が跳ねると体が先に反応" | 「跳ねる」「急騰」「モメンタム」「ATH」など |
| **見えない罠・安心感** | "traps stay invisible" / "strong candles feel convincing" / "きれいに見える時ほど罠" | 「きれいな上げ」「強いローソク」「ブレイクアウト」 |
| **構造・地図** | "no hype, need structure" / "one turning point most miss" / "地図を先に持つ" | 「サポート」「レジスタンス」「構造」「レベル」 |
| **手順・確認** | "process, not speed" / "Pause → Verify → Act" / "確認を飛ばすと損失" | 「確認」「チェック」「手順」「タイミング」 |
| **同調・バイアス** | "reactions become too fast" / "bias leaning one way" / "同調している時ほど" | 「みんな買い」「流れに乗る」「反応が速い」 |

**刺さるターゲットの定義**: 引用元の文言が、上記のいずれかのテーマと**意味的に重なる**こと。  
→ 実装: `copyTargetFitScore(quotedText)` で、引用元テキストがこれらのキーワード・文脈を含むかで 0..1 を付与する。

---

## 2. 「このコピーが刺さる」引用リポストターゲット

- **トピック適合 (topic fit)**  
  BTC/ETH/crypto/トレード/リスク/ボラティリティ/サポート/レジスタンス など、Trap Defence の文脈と一致する話題。
- **コピー適合 (copy fit)**  
  引用元の文言が、上記テーマ（速さ・追いかけ・罠・構造・手順・同調）のいずれかに触れていること。  
  → 私たちの「止まる→確認→条件一致で行動」が、引用元を読んだ人に**自然に刺さる**ようにする。
- **ぼやけさせない**  
  topic fit と copy fit の**両方**に閾値を設け、どちらかでも低い候補は採用しない（またはスコアで大きく下げる）。

---

## 3. インプレが伸びるロジックの精度

アルゴリズムに拾われやすい条件を**厳格に**満たす投稿だけを引用する。

| 条件 | 意味 | 実装 |
|------|------|------|
| **Rising window** | 初動 2〜7 分（または 2〜60 分）の「伸びている最中」の投稿に乗る | `BUZZWEAVE_RISING_WINDOW_MAX_SEC`、スロットの `_inRisingWindow` |
| **Engagement velocity** | 経過時間あたりのエンゲージメントが高い = アルゴに拾われやすい | `engagementVelocityScore`。**最小 velocity 閾値**で足切り。 |
| **Algorithm weight** | リプライ > 引用 > RT > いいね。議論が起きている投稿は伸びやすい | `algorithmWeightedScore`。必要なら最小値で足切り。 |
| **Topic fit** | 私たちのニッチと合う = 同じ興味層に届き、エンゲージされやすい | `topicFitScore`。**最小 topic fit 閾値**で足切り。 |
| **Copy fit** | コピーが刺さる = エンゲージ・CTR が期待できる | `copyTargetFitScore`。**最小 copy fit 閾値**で足切り。 |

**「インプレが必ず伸びる」ための足切り**  
- 候補に対して `minVelocity`・`minTopicFit`・`minCopyFit`（と必要なら `minAlgorithmWeight`）を設け、**いずれかを満たさない候補はスロットに渡さない**。  
- これにより「伸びる見込みの低い引用」を減らし、1投稿あたり 1000〜10000 インプレに寄せる。

---

## 4. 実装の対応

| 項目 | ファイル | 内容 |
|------|----------|------|
| コピー適合スコア | `services/td/quoteTargetQuality.js` | `copyTargetFitScore(text)` … 引用元テキストがコピーテーマと合うか 0..1。 |
| 品質スコアへの組み込み | `services/td/quoteTargetQuality.js` | `quoteTargetQualityScore` に copy fit を組み込み、ターゲットを Sharp に。 |
| インプレ足切り | `services/td/quoteTargetQuality.js` | `filterCandidatesByImpressionPotential(candidates, options, nowMs)` … velocity / topic fit / copy fit の最小閾値でフィルタ。 |
| エンジンでの適用 | `services/td/buzzWeaveEngine.js` | 品質スコア選定時、`filterCandidatesByImpressionPotential` を呼び、通過した候補だけを `selectByQualityScore` に渡す。 |

**環境変数**

- `BUZZWEAVE_USE_QUALITY_SCORE_SELECTION` = `true` のとき、**インプレ足切りはデフォルト有効**。`BUZZWEAVE_IMPRESSION_FILTER=false` で無効化可能。
- `BUZZWEAVE_MIN_VELOCITY` … 最小 velocity（未設定時 0 = 足切りしない）。例: 15 で初動の弱い投稿を除外。
- `BUZZWEAVE_MIN_TOPIC_FIT` … 最小 topic fit 0..1（未設定時 0）。例: 0.2 でトピックずれを除外。
- `BUZZWEAVE_MIN_COPY_FIT` … 最小 copy fit 0..1（未設定時 0）。例: 0.15 で「刺さらない」引用元を除外。

いずれも 0 のままなら足切りは行わず、品質スコアのランキングのみで選定する（volume 優先）。インプレを厳格に伸ばすなら閾値を設定する。

---

## 5. 検証

- `buzzweave_post_log` の `our_impressions` を、**copy_fit / topic_fit / velocity** のバケット別に集計する。  
- 閾値以上のみ採用した場合に、1投稿あたりインプレが 1000〜10000 に収束するか確認し、閾値を調整する。
