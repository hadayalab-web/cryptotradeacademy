# PQT-ONLY MODE: Trap Defence OS – BuzzWeave v3 仕様

## 目的
BuzzWeave の投稿生成を **PQT（Parasitic Quote Tweet）ロジックのみ** に再構築する。  
PQT に基づかない既存の通常ポスト・固定数・固定スケジュール・分岐は **廃止** する。

## 有効化
- 環境変数: `BUZZWEAVE_PQT_ONLY=true` または `BUZZWEAVE_PQT_ONLY=1`
- 有効時: `api/buzzweave-run.js` から呼ばれる `runBuzzWeaveCycle` が内部で **runBuzzWeaveCyclePqtOnly** に分岐する。

---

## 禁止事項
- Grok が生成した投稿数・割合・時間帯などの「数字」を **一切使用しない**。
- 固定投稿数・固定スケジュール・固定割合を **使用しない**。
- **通常ポスト（非引用）の量産ロジックを実行しない**（buildAndPostFromSlot は呼ばれない）。
- Fisherman 検出に関係ないテンプレートは **使わない**（4要素 PQT テンプレのみ）。

---

## PQT ロジック（唯一の正義）

### 1. Fisherman Detection（釣り師検出）
- hype keywords（言語別 HYPE_KEYWORDS_BY_LANG / HYPE_KEYWORDS）
- engagement velocity（伸び率＝スコア閾値）
- 画像＋煽り構造（既存 dangerLabel / cluster を利用）
- 言語圏ごとの煽り文化（languageConfig.tone）

### 2. Slot Selection（寄生対象の優先順位）
- engagement velocity の高い順にソート
- **上位 5〜10% の Fisherman 投稿だけを対象**（`selectFishermanSlotsTopPercent`）
- **API クレジットに応じて動的に上限調整**（`BUZZWEAVE_API_CALL_CAP` / `getPqtCapForRun`）

### 3. PQT Template（6言語共通の 4 要素）
1. **Agree**（釣り師に乗る）
2. **Proof**（1行の構造視点）
3. **Soft CTA**（押し付けない導線）
4. **Link**（Vidalytics / Whop）

言語別ニュアンスは `languageConfig.tone` で管理。`pqtTemplates.js` のみ使用。

### 4. CTR Feedback（テンプレ学習）
- テンプレごとの CTR（clicks / uses）を記録（`pqtCtaEngine.recordPqtResult` / `recordPqtUse`）
- CTR の高いテンプレを優先（`pickTemplateIndex`）
- 言語別に学習

### 5. Posting Frequency Logic（市場同期）
投稿数は **次の 2 つだけ** で決定：
1. **trapScore**（high / medium / low）→ レンジで「多め / 少なめ」
2. **Fisherman 活動量**（言語別 weight + 活動係数）

固定数値は使わない。API クレジットが少ない場合は **上位 5% のみ** などで cap。

---

## 出力
- BuzzWeave は **6言語 × PQT のみ** を生成する。
- **通常ポストは一切生成しない。**

---

## 実装上のポイント
- **スロット不要**: PQT-ONLY 時は `getTdPostSlotsInNextHour` / `generateDailySlots` は使わない。`generateDailySlots` は `count: 0, pqtOnly: true` を返す。
- **1 run あたり**: 1 言語（`langFilter`）で search → 候補取得 → Fisherman 上位 5〜10% → cap 件まで PQT 投稿。
- **本番入口**: 従来どおり `GET/POST /api/buzzweave-run`。`BUZZWEAVE_PQT_ONLY=true` でエンジンが PQT-only に切り替わる。
