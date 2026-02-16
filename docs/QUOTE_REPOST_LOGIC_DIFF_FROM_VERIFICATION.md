# 引用リポストのロジック差分（検証に基づく実装）

**目的**: 北極星 100成約/日・インプレほぼゼロ対策・投稿 volume 不足の検証を踏まえ、引用リポスト選定ロジックに追加した差分をまとめる。

---

## 1. 検証の要約

| 検証 | 結論 |
|------|------|
| 北極星 | 100成約/日 = KPI。仕手・提灯にこだわらず volume 確保。 |
| 投稿数 | Content Create 23/日 は少なすぎ。500/日 に近づける。 |
| インプレ | ほぼゼロだとクリック施策は無意味。まずリーチ確保。インプレの出る条件を分析で出し配分に振る。 |
| 武器 | X スキャン＋自前分析で「どの条件で伸びたか」を可視化。 |

---

## 2. 実装したロジック差分

### 2.1 Volume トップアップ（デフォルト有効）

**場所**: `services/td/buzzWeaveEngine.js` — PQT スロット選定直後。

**内容**: Fisherman（または品質スコア）で選んだ slots が **cap に満たない** かつ **候補がまだある** とき、**未採用の候補を engagement 降順で並べ、cap に届くまで slots に追加**する。

- **意図**: 1 run あたりの投稿数を落とさない。インプレ・成約の「当たり」を増やす。
- **無効化**: `BUZZWEAVE_VOLUME_TOPUP=false` または `BUZZWEAVE_VOLUME_TOPUP=0` でトップアップを行わない（従来どおり Fisherman/品質スコアの slots のみ）。

### 2.2 Fisherman=0 時に fallback で cap まで埋めるオプション

**場所**: 同上。Fisherman が 0 件のときの fallback。

**従来**: `selectSlotsFallback(candidates, Math.min(FALLBACK_SLOT_COUNT, cap))` — 最大 10 件（デフォルト）程度。

**追加**: **`BUZZWEAVE_FALLBACK_FILL_CAP=true`** のとき、`selectSlotsFallback(candidates, effectiveCap)` で **cap いっぱいまで** fallback する。

- **意図**: Fisherman が 0 の日でも、候補があれば投稿本数を確保し、500/日に寄せる。
- **デフォルト**: 未設定なら従来どおり FALLBACK_SLOT_COUNT まで。

---

## 3. 環境変数一覧（差分分）

| 変数 | 意味 | デフォルト |
|------|------|------------|
| **BUZZWEAVE_VOLUME_TOPUP** | true で slots が cap に満たないとき候補から engagement 降順でトップアップ。false/0 で無効。 | 有効（未設定時はトップアップする） |
| **BUZZWEAVE_FALLBACK_FILL_CAP** | true で Fisherman=0 のとき fallback を cap まで取る。 | 無効（従来どおり FALLBACK_SLOT_COUNT まで） |

---

## 4. フロー（差分を反映した流れ）

1. 候補取得（検索 → candidates）。
2. **スロット選定**  
   - 品質スコアモード: `selectByQualityScore(candidates, cap)`。  
   - 通常: `selectFishermanSlotsTopPercent` → 0 件なら `selectSlotsFallback`（**FILL_CAP 時は cap まで**）。
3. **Volume トップアップ**（BUZZWEAVE_VOLUME_TOPUP が無効でないとき）  
   - `slots.length < cap` かつ 候補に余りがあれば、未採用を engagement 降順で追加し cap まで埋める。
4. 以降は従来どおり: 2–7 分／rising ウィンドウ・velocity ソート、shiteshi/Tier、diversity cap、投稿。

---

## 5. ターゲット抽出の修正（思惑どおり効かせる）

**問題**: 従来、`collectBuzzCandidates` 内で **classifyTopN（デフォルト 10）** だけをスロット選定に渡していた。そのため Fisherman の母数が常に最大 10 件となり、上位 8% で 1 件しか選ばれないなど、ターゲット抽出が思惑どおり効いていなかった。

**対応**: **BUZZWEAVE_MAX_CANDIDATES**（デフォルト **50**）を導入し、中央値フィルタ通過後の **impression 降順で最大 50 件** を候補として Fisherman／品質スコア選定に渡すようにした。環境変数 `BUZZWEAVE_MAX_CANDIDATES` で変更可能。

- コード: `services/td/buzzWeaveEngine.js` — `collectBuzzCandidates` の `toClassify` を `rankedByImpression.slice(0, maxCandidates)` に変更。
- これにより「引用リポストのターゲット抽出」が意図した母数で効く。

---

## 6. コピーが刺さるターゲットとインプレ足切り（1投稿 1000〜10000 インプレ向け）

**目的**: ターゲットをぼやけさせず、「このコピーが刺さる」引用元だけを選び、インプレが伸びる候補に絞る。

- **コピー適合 (copy fit)**  
  `quoteTargetQuality.js` に **copyTargetFitScore(引用元テキスト)** を追加。PQT テーマ（速さ・追いかけ・罠・構造・手順・同調）に触れる引用元を 0..1 でスコア化。品質スコアに **copy fit を 20% 重み**で組み込み、ランキングで「刺さる」候補を上位に。
- **インプレ足切り**  
  品質スコア選定時、**BUZZWEAVE_IMPRESSION_FILTER** はデフォルト有効。`filterCandidatesByImpressionPotential` で **minVelocity / minTopicFit / minCopyFit** のいずれかを満たさない候補はスロットに渡さない。閾値は `BUZZWEAVE_MIN_VELOCITY`・`BUZZWEAVE_MIN_TOPIC_FIT`・`BUZZWEAVE_MIN_COPY_FIT`（未設定なら 0 = 足切りしない）。

詳細: **`docs/PQT_COPY_AND_TARGET_SPEC.md`**

---

## 7. 参照

- 北極星: `docs/NORTH_STAR_KPI.md`
- コピーとターゲット仕様: `docs/PQT_COPY_AND_TARGET_SPEC.md`
- 投稿が伸びないとき: `docs/POST_VOLUME_NOT_GROWING.md`
- インプレほぼゼロ: `docs/IMPRESSIONS_NEAR_ZERO_WHAT_TO_DO.md`
- ML PQT 環境変数: `docs/ML_PQT_ENGINE_FOR_OPERATION_AND_VERIFICATION.md` §6
