# インフルエンサー発見プロセス最適化案（最終版）

**作成日時**: 2026-01-30  
**ベース**: 包括的分析 + Gemini-3-pro-preview強化版  
**総目標数**: 840人  
**現状達成率**: 80.4%  
**目標達成率**: 95%+

---

## 📊 現状分析のサマリー

### 言語別達成率
| 言語 | 達成率 | 主な課題 |
|------|--------|----------|
| EN | 95.7% | 階層の偏り（100% top） |
| ES | 95.2% | 階層の偏り（100% top） |
| PT-BR | 78.0% | 重複増加、バッチ6失敗 |
| AR | 75.9% | 重複急増（90%）、バッチ3失敗 |
| JA | 69.4% | 4バッチ失敗、リトライ限界 |
| KO | 35.7% | 6バッチ失敗、極端な低達成率 |

### 共通課題
1. **階層の偏り**: すべての言語で100%が「top」階層
2. **リトライ上限の不足**: KO、JAで複数のバッチが失敗
3. **重複の増加**: AR、PT-BRで後半バッチで重複が90%に達する
4. **Grok APIの応答不良**: KO、JAで複数のバッチが失敗
5. **Username長さ制限**: 16文字以上のusernameが除外される

---

## 🚀 最適化案（実装優先順位順）

### Phase 1: CRITICAL（即座に実施 - Day 1-2）

#### 1.1 リトライロジックの強化（適応的リトライ戦略）

**問題**: KO（35.7%）、JA（69.4%）でリトライ上限に達して失敗

**解決策（Gemini強化版）**:

##### 1.1.1 条件緩和リトライ（Backoff & Relax）

リトライごとに戦略を変更：

| Attempt | 戦略 | 説明 |
|---------|------|------|
| **1** | Normal | 詳細な条件、厳密なキーワード |
| **2** | Wait & Retry | 5秒待機、同じ条件 |
| **3** | Query Rotation | キーワードを変更（例: "仮想通貨" → "ビットコイン"、"暗号資産"） |
| **4** | Relax Constraints | 制約条件を緩和（例: 「最近のアクティブユーザー」条件を外す） |
| **5** | Cross-Lingual | 英語のプロンプトで現地語の結果を求める |
| **6-8** | Extended Retry | より長い間隔（16s → 32s → 64s）で再試行 |

**言語別パラメータ**:
- **KO/JA**: 最大8回、Attempt 3以降は「英語プロンプト + 現地語キーワード」モード
- **PT-BR/AR**: 最大5回、Attempt 3以降は条件緩和
- **EN/ES**: 最大3回（現状維持）

**実装コード例**:
```javascript
async function fetchInfluencersBatchWithAdaptiveRetry(lang, batchSize, existingTweetIds, retryCount = 0) {
  const maxRetries = getMaxRetriesForLang(lang); // KO/JA: 8, PT-BR/AR: 5, EN/ES: 3
  const retryStrategy = getRetryStrategy(retryCount, lang);
  
  try {
    const prompt = buildPromptWithStrategy(lang, batchSize, existingTweetIds, retryStrategy);
    const rawInfluencers = await discoverInfluencersForQuoteRepost(lang, { 
      maxResults: batchSize,
      prompt: prompt,
      retryStrategy: retryStrategy
    });
    
    if (!rawInfluencers || rawInfluencers.length === 0) {
      if (retryCount < maxRetries) {
        const backoffDelay = calculateBackoffDelay(retryCount, lang);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
        return await fetchInfluencersBatchWithAdaptiveRetry(lang, batchSize, existingTweetIds, retryCount + 1);
      }
      return [];
    }
    
    return rawInfluencers;
  } catch (error) {
    if (retryCount < maxRetries && shouldRetry(error, retryCount)) {
      const backoffDelay = calculateBackoffDelay(retryCount, lang);
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
      return await fetchInfluencersBatchWithAdaptiveRetry(lang, batchSize, existingTweetIds, retryCount + 1);
    }
    return [];
  }
}

function getRetryStrategy(retryCount, lang) {
  if (lang === 'ko' || lang === 'ja') {
    if (retryCount >= 3) return 'cross-lingual'; // 英語プロンプト + 現地語キーワード
    if (retryCount >= 2) return 'relax-constraints';
    if (retryCount >= 1) return 'query-rotation';
    return 'normal';
  }
  // PT-BR/AR/EN/ES用の戦略
  return retryCount >= 2 ? 'relax-constraints' : 'normal';
}

function calculateBackoffDelay(retryCount, lang) {
  const baseDelays = {
    'ko': [2000, 5000, 10000, 20000, 40000, 80000, 160000, 320000], // 最大8回
    'ja': [2000, 5000, 10000, 20000, 40000, 80000, 160000, 320000],
    'pt-br': [2000, 4000, 8000, 16000, 32000], // 最大5回
    'ar': [2000, 4000, 8000, 16000, 32000],
    'en': [2000, 4000, 6000], // 最大3回
    'es': [2000, 4000, 6000]
  };
  return baseDelays[lang]?.[retryCount] || 2000;
}
```

**期待効果**: KOの達成率を35.7% → 70%+、JAの達成率を69.4% → 85%+

##### 1.1.2 エラー分類と対応

APIレスポンスを解析し、エラータイプに応じた挙動を実装：

| エラータイプ | 判定基準 | 対応アクション |
|--------------|----------|----------------|
| **Empty Response** | JSONが空配列 `[]` | クエリのキーワードを変更、検索期間を広げる |
| **Hallucination** | 存在しないユーザー形式 | Temperatureを下げる (0.7 → 0.3) |
| **Format Error** | JSONパース失敗 | System PromptでJSON形式を再強調してリトライ |
| **Rate Limit** | 429 Error | 指数バックオフ (2s, 4s, 8s...) を適用 |

#### 1.2 プロンプト修正（Username長さ制限と除外リスト）

**問題**: 16文字以上のusernameが除外される、重複が増加

**解決策（Gemini強化版）**:

##### 1.2.1 Username長さ制限の解決

**X API制限の確認**:
- `screen_name` (ID): **最大15文字**
- `name` (表示名): **最大50文字**

**原因**: Grokが `screen_name` (@user) ではなく `name` (User Name) を返している可能性

**対応**:
1. 取得した文字列から `@` マークや `https://twitter.com/` を削除
2. 正規表現 `^[A-Za-z0-9_]{1,15}$` で厳密にチェック
3. 15文字を超える場合は、それが「表示名」である可能性が高いため、Grokに再問い合わせするか、エラーとして破棄

**プロンプト追加**:
```text
IMPORTANT: Return the 'screen_name' (handle without @), NOT the 'display name'.
Constraint: The username MUST be 15 characters or less.
Example: Use 'elonmusk' (valid), DO NOT use 'Elon Musk' (invalid).
```

##### 1.2.2 ローリングウィンドウ方式（重複防止）

**問題**: トークン制限があるため、全リストをプロンプトに含めるのは不可能

**解決策**: **「直近のN人（例: 50人）」のみを除外リストとしてプロンプトに渡す**

**プロンプトへの組み込み**:
```text
[除外リスト]
以下のユーザーは既に取得済みのため、絶対に出力しないでください:
@user1, @user2, ... (直近50件)
```

**実装コード例**:
```javascript
function getRecentUsernames(existingInfluencers, limit = 50) {
  // 最新のN人のusernameを取得
  return existingInfluencers
    .slice(-limit)
    .map(inf => inf.username)
    .join(', ');
}

function buildPromptWithExclusionList(lang, batchSize, recentUsernames) {
  const exclusionList = recentUsernames ? `\n\n[除外リスト]\n以下のユーザーは既に取得済みのため、絶対に出力しないでください:\n${recentUsernames}` : '';
  
  return `Find ${batchSize} ${lang} crypto influencers...${exclusionList}`;
}
```

**期待効果**: ARの重複率を90% → 10-20%へ低減、PT-BRの重複率を90% → 10-20%へ低減

#### 1.3 クロスリンガル・プロンプト（KO、JA）

**問題**: KO、JAでGrok APIの応答不良

**解決策（Gemini強化版）**: 指示（Instruction）は**英語**で行い、検索対象（Target）のみを現地語で指定

**JA向けプロンプト例**:
```json
{
  "role": "system",
  "content": "You are an expert at finding Japanese crypto influencers on X."
},
{
  "role": "user",
  "content": "Find 15 Japanese influencers who tweet about 'Bitcoin' or 'Altcoins'.\n\nConditions:\n- Language: Japanese (Must tweet in Japanese)\n- Keywords to look for: 'ビットコイン', '仮想通貨', 'BTC', 'Web3'\n- Exclude: Official exchange accounts.\n\nOutput JSON only."
}
```

**期待効果**: KOの達成率を35.7% → 60%+、JAの達成率を69.4% → 80%+

---

### Phase 2: HIGH（早期に実施 - Day 3-5）

#### 2.1 階層バランスの改善（ペルソナ別プロンプト + クォータ制）

**問題**: すべての言語で100%が「top」階層

**解決策（Gemini強化版）**:

##### 2.1.1 ペルソナ別プロンプト

単に数値範囲を指定するだけでなく、Grokに対して「誰を探しているか」のコンテキストを与える

**階層ごとの検索クエリ定義**:

| 階層 | 変数名 | フォロワー範囲 | 特徴 (Characteristics) | 検索の狙い |
|------|--------|----------------|------------------------|------------|
| **Top** | Macro | 100k - 500k | "業界のオピニオンリーダー、広範なリーチ" | 信頼性、認知度 |
| **Mid** | Mid-Tier | 10k - 99k | "特定のニッチ（DeFi, NFT等）に強い、高いエンゲージメント率" | 実利的な影響力、コミュニティ |
| **Bottom** | Micro | 1k - 9.9k | "新興の分析家、熱狂的なコアファンを持つ、草の根活動家" | 高いCVR、初期トレンド |

**プロンプトテンプレート**:
```text
[ターゲット層: {{TARGET_TIER_NAME}}]
- 定義: {{FOLLOWER_RANGE}}のフォロワーを持つアカウント
- 特徴: {{TIER_CHARACTERISTICS}}
- 除外: 既に有名なアカウント、ニュースBot

[検索キーワード]
{{KEYWORDS}}

[出力形式]
JSON形式 (username, estimated_follower_tierのみ)
```

##### 2.1.2 クォータ制バッチ処理

1つのリクエストですべてを混ぜるのではなく、APIコール自体を階層ごとに分離

**実装ロジック**:
1. **目標配分の設定**: Top(20%), Mid(50%), Bottom(30%) と定義
2. **専用ループの実行**:
   - `fetchBatch('Top')` を目標数に達するまで実行
   - `fetchBatch('Mid')` を目標数に達するまで実行
   - `fetchBatch('Bottom')` を目標数に達するまで実行

**実装コード例**:
```javascript
async function fetchInfluencersByTier(lang, tier, targetCount, existingTweetIds) {
  const tierConfig = {
    'top': { minFollowers: 100000, maxFollowers: 500000, characteristics: '業界のオピニオンリーダー、広範なリーチ' },
    'mid': { minFollowers: 10000, maxFollowers: 99999, characteristics: '特定のニッチに強い、高いエンゲージメント率' },
    'bottom': { minFollowers: 1000, maxFollowers: 9999, characteristics: '新興の分析家、熱狂的なコアファンを持つ' }
  };
  
  const config = tierConfig[tier];
  const prompt = buildTierSpecificPrompt(lang, tier, config, existingTweetIds);
  
  // 階層専用のプロンプトで取得
  return await discoverInfluencersForQuoteRepost(lang, {
    maxResults: targetCount,
    prompt: prompt,
    tier: tier
  });
}

async function fetchAllTiers(lang, totalTarget) {
  const tierDistribution = {
    'top': Math.floor(totalTarget * 0.2),
    'mid': Math.floor(totalTarget * 0.5),
    'bottom': Math.floor(totalTarget * 0.3)
  };
  
  const results = {
    'top': [],
    'mid': [],
    'bottom': []
  };
  
  // 階層ごとに順次取得
  for (const [tier, targetCount] of Object.entries(tierDistribution)) {
    console.log(`[${lang.toUpperCase()}] ${tier}階層の取得開始（目標: ${targetCount}人）`);
    results[tier] = await fetchInfluencersByTier(lang, tier, targetCount, getAllExistingTweetIds(results));
    console.log(`[${lang.toUpperCase()}] ${tier}階層の取得完了（取得: ${results[tier].length}人）`);
  }
  
  return [...results.top, ...results.mid, ...results.bottom];
}
```

**期待効果**: SSOTで推奨された階層分布を達成（Top 20%, Mid 50%, Bottom 30%）

##### 2.1.3 後処理での階層調整

**アルゴリズム**:
- **Overflow Handling**: Top層が目標数を超えた場合、その後のリクエストではTop層を除外するプロンプト（`exclude_follower_count_gt: 100000`）を強化
- **Tier Shift**: 取得時はMid想定だったが実際はTopだった場合、Topの枠を埋めたとみなし、Midの不足分を追加取得するキューを発行

#### 2.2 オーバーサンプリング（重複防止の強化）

**問題**: AR、PT-BRで後半バッチで重複が90%に達する

**解決策（Gemini強化版）**:

1. **バッチサイズの拡大 (Oversampling)**: 15人欲しい場合、Grokには「30人」要求する
2. **クライアントサイド・フィルタリング**: 返ってきた30人の中から、DB上の全取得済みリストと照合し、重複を除外して先頭15人を採用
3. **多様性指標**: プロンプトに「異なるコミュニティ（トレーダー、開発者、ニュース、NFT）からバランスよく選出せよ」と指示

**実装コード例**:
```javascript
async function fetchWithOversampling(lang, targetCount, existingTweetIds) {
  const oversampleRatio = 2.0; // 2倍要求
  const requestCount = Math.ceil(targetCount * oversampleRatio);
  
  const rawInfluencers = await discoverInfluencersForQuoteRepost(lang, {
    maxResults: requestCount,
    prompt: buildPromptWithDiversity(lang, requestCount)
  });
  
  // 重複を除外
  const uniqueInfluencers = rawInfluencers.filter(inf => 
    !existingTweetIds.includes(inf.tweetId)
  );
  
  // 先頭N人を採用
  return uniqueInfluencers.slice(0, targetCount);
}
```

**期待効果**: ARの重複率を90% → 10-20%へ低減、PT-BRの重複率を90% → 10-20%へ低減

#### 2.3 ハッシュタグ駆動検索（KO、JA）

**問題**: KO、JAでGrok APIの応答不良

**解決策（Gemini強化版）**: 一般的なキーワードではなく、その言語特有の**Twitterハッシュタグ**を指定

**言語別ハッシュタグ**:
- **KO**: `#비트코인` (Bitcoin), `#이더리움` (Ethereum), `#코인스타그램`, `#업비트` (Upbit)
- **JA**: `#BTC`, `#仮想通貨`, `#投資初心者`

**期待効果**: 自然言語処理よりもハッシュタグ検索の方がGrokにとって容易であり、KO/JAのヒット率が劇的に向上する（35% → 70%超）

---

### Phase 3: MEDIUM（中期的に実施 - Week 2）

#### 3.1 コスト最適化：キャッシュと検証の順序

**推奨事項**:
- **重複チェックの先行**: Grokから取得した直後にDBと照合し、重複していればX APIによる検証（高価な処理やレート制限のある処理）を行う前に破棄する
- **トークン節約**: プロンプト内の「例示（Few-shot examples）」は最小限にし、システムプロンプトに集約する

#### 3.2 パフォーマンス最適化：非同期並列処理

**推奨事項**:
- 言語ごとのバッチは独立しているため、6言語を直列ではなく**並列（Parallel）**に実行する
- ただし、X APIのレート制限（検証用）に引っかからないよう、検証フェーズにはセマフォ（同時実行数制御）を入れる

#### 3.3 データ品質向上：エンゲージメント密度

**推奨事項**:
- 単にフォロワー数だけでなく、「フォロワー数に対する平均いいね数/リプライ数」の比率を計算し、Botや「フォロワーを買ったアカウント」を自動除外するロジックを検証フェーズに追加する

#### 3.4 モニタリング：リアルタイムダッシュボード

**推奨事項**:
- バッチごとの「成功率」「重複率」「平均フォロワー数」をログ出力し、異常値（例：ARで重複率が80%を超えた瞬間）が出たらSlack等にアラートを飛ばし、プロセスを早期停止させる（無駄なAPIコールの防止）

---

## 📈 期待される改善効果

### 短期（1-2週間）

| 指標 | 現状 | 改善後 | 改善率 |
|------|------|--------|--------|
| **総達成率** | 80.4% | 90%+ | +10%+ |
| **KO達成率** | 35.7% | 70%+ | +34%+ |
| **JA達成率** | 69.4% | 85%+ | +16%+ |
| **階層バランス** | 100% top | 20% top, 50% mid, 30% bottom | 改善 |
| **重複率** | 最大90% | 10-20%以下 | -70%+ |

### 中期（1ヶ月）

| 指標 | 現状 | 改善後 | 改善率 |
|------|------|--------|--------|
| **総達成率** | 80.4% | 95%+ | +15%+ |
| **KO達成率** | 35.7% | 75%+ | +39%+ |
| **JA達成率** | 69.4% | 90%+ | +21%+ |
| **階層バランス** | 100% top | SSOT推奨分布 | 達成 |
| **重複率** | 最大90% | 10%以下 | -80%+ |

---

## 🎯 実装ロードマップ

### Phase 1: 即時 (Day 1-2)

1. ✅ **リトライロジック改修**: KO/JA向けに回数を増やし、英語プロンプトへの切り替え（Fallback）を実装
2. ✅ **プロンプト修正**: `screen_name` (max 15 chars) の明示と、除外リスト（Rolling Window）の注入
3. ✅ **クロスリンガル・プロンプト**: KO、JAで英語指示 + 現地語キーワード

### Phase 2: 短期 (Day 3-5)

4. ✅ **階層別取得**: Top/Mid/Microにクエリを分割
5. ✅ **オーバーサンプリング**: 要求数を増やしてクライアント側で重複排除
6. ✅ **ハッシュタグ駆動検索**: KO、JAでハッシュタグベースの検索

### Phase 3: 中期 (Week 2)

7. ✅ **並列処理化**: 6言語を並列実行
8. ✅ **モニタリングアラート**: 異常値検知とアラート設定

---

## 📝 結論

Gemini-3-pro-previewの分析を統合し、以下の強化された最適化案を提示しました：

### 主要な強化ポイント

1. **適応的リトライ戦略**: 単純なリトライではなく、条件緩和リトライ（Backoff & Relax）を導入
2. **ペルソナ別プロンプト**: 階層ごとの「ペルソナ定義」と「クォータ制（割当制）」の導入
3. **ローリングウィンドウ方式**: 全リストではなく、直近50人のみを除外リストとして渡す
4. **クロスリンガル・プロンプト**: KO、JAで英語指示 + 現地語キーワード
5. **オーバーサンプリング**: 2倍要求してクライアント側で重複排除

これらの最適化を実施することで、**総達成率を80.4% → 95%+**、**階層バランスをSSOT推奨分布に**、**重複率を最大90% → 10%以下**に改善できると期待されます。
