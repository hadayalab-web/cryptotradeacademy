# アフィリエイト獲得レコメンド設計書 (2026-03-01)

## 1. エグゼクティブサマリー
現状の「静的属性マッチング（Crypto層にCrypto案件）」から、**「動的意図マッチング（『案件募集中』層に最適な高単価案件）」**への転換を行う。
具体的には、競合プラットフォーム（Whop, Gumroad）利用者や「提携募集中」の発信者を**「High Intent（高意図）」層**として優先抽出し、コンテンツベースフィルタリングで最適な訴求軸（Angle）を割り当てることで、Signup/Sentの最大化を狙う。

## 2. アフィリエイター生態系マップ (Targeting)

アフィリエイターを「属性」ではなく「現在持っている意図の強さ」で分類し、上位2層をメインターゲットとする。

| セグメント | 特徴・シグナル (Bio/投稿) | 案件探索意図 | アクション |
| :--- | :--- | :--- | :--- |
| **1. 競合利用者 (Competitor Users)** | `Whop`, `Gumroad`, `ClickBank`, `Brain` | **High (即戦力)** | 最優先。乗り換え/追加提案。 |
| **2. アクティブ・シーカー (Seekers)** | `"looking for affiliate"`, `"DM open for collab"`, `募集` | **High (顕在需要)** | 優先。案件提案。 |
| **3. 成果報告層 (Hustlers)** | `"revenue share"`, `dashboard`, `income` | **Mid (潜在)** | 準優先。より良い条件提示。 |
| **4. インフルエンサー (Influencers)** | `Bitcoin`, `Gem`, `Signal` | **Low (受動的)** | 探索枠(Explore)で維持。 |
| **5. 初心者 (Beginners)** | `Side hustle`, `Money online` | **Low (教育コスト高)** | 優先度低。 |

## 3. レコメンドロジック設計

### 3.1 ユーザー×案件マッチング (Scoring)
入力特徴量（Bio/Tweet）から「どのAngleが最も刺さるか」をスコアリングし、推奨Angle (`recommendedAngle`) を決定する。

$$ Score_{angle} = \sum (Signal_i \times Weight_{i, angle}) $$

*   **Crypto Signal:** `btc`, `trading`, `signal`, `chart`, `gem`
*   **SaaS Signal:** `ai`, `tool`, `automation`, `software`, `bot`
*   **Intent Signal:** `competitor_keywords`, `seeking_keywords` (+Score Bonus)

**判定ロジック:**
1.  Cryptoスコア > SaaSスコア → **Angle: Crypto**
2.  SaaSスコア > Cryptoスコア → **Angle: AI SaaS**
3.  両方低い → **Angle: Side Hustle** (汎用)

### 3.2 探索と活用 (Explore / Exploit)
*   **Exploit (活用 80%):** 上記ロジックで算出された `recommendedAngle` を送信。
*   **Explore (探索 20%):** スコアが拮抗している場合や、意図が不明確な層に対し、ランダムにAngleを割り当てて反応率データを蓄積する。

## 4. 実装仕様

### 4.1 検索クエリの「能動化」 (`services/td/affiliateRecruitSearch.js`)
名詞だけでなく、**動詞（Looking for...）**を含むクエリを追加し、能動的な層を引っ掛ける。

```javascript
const INTENT_QUERIES = {
  en: ['"looking for affiliate"', '"best affiliate program"', '"high ticket affiliate"'],
  ja: ["アフィリエイト募集", "ASP おすすめ", "案件 募集"]
};
```

### 4.2 スコアリングへのIntent導入 (`services/td/affiliateRecruitScoring.js`)
固定点数廃止。Intentによる加点と、Angle推奨値を返すように変更。

```javascript
// 戻り値イメージ
return {
  score: 85, // High Intentなら高得点
  recommendedAngle: "crypto", // マッチしたAngle
  isHighIntent: true,
  breakdown: { competitor: 30, crypto_match: 15 }
};
```

### 4.3 実行時のマッチング適用 (`api/affiliate-recruit-run.js`)
DM送信時に `recommendedAngle` があればそれを採用する。

```javascript
const scoreResult = computeCandidateScore(user, tweets);
const angle = scoreResult.recommendedAngle || pickRecruitAngleByKey(username);
// sendRecruitDm(..., angle)
```

## 5. KPIと運用ルール

### 主要KPI
- **Signup / Sent:** 目標 1.0% 以上（現状の倍増）。
- **Attributed Sales:** 送客後の成約有無（質）。

### If-Then ルール
1.  **IF** `Signup/Sent` < 0.5% **THEN** High Intent（競合利用者）の加点を強化し、送信対象を厳選する。
2.  **IF** `Active Seekers` が枯渇 **THEN** Explore（一般層）の比率を上げ、広範囲に投げる。
3.  **IF** `403 Error` (DM不可) > 20% **THEN** ターゲットがBot/公式に偏っているため、除外ワードを強化する。

## 6. 実験計画

### Phase 1: キャリブレーション (72h)
- `dryRun=true` で実行し、抽出されたユーザーのBioと判定された `recommendedAngle` を目視確認。
- 「Whop利用者」が正しく抽出され、「Crypto」と判定されているか？

### Phase 2: ABテスト (2週間)
- **Group A (Control):** 従来のランダムAngle割り当て。
- **Group B (Treatment):** 本レコメンドロジック適用。
- **勝敗:** Group B の CTR が A より **15%以上** 高ければ採用。

### ロールバック条件
- DM送信エラー（403/Block）が急増した場合。
- `no_eligible_candidate`（候補枯渇）が頻発する場合。
