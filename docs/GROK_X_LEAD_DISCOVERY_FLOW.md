# GrokによるXリード発見の流れ

**作成日**: 2026-01-18  
**目的**: GrokがXリードリストを作成する詳細なプロセス説明

---

## 📊 全体フロー

```
Cron実行（30分ごと）
  ↓
api/lead-discovery.js (handleLeadDiscovery)
  ↓
6言語ループ（EN, ES, PT-BR, AR, JA, KO）
  ↓
buildXSearchQuery（クエリ生成）
  ↓
searchLeadsOnX（Grok呼び出し）
  ↓
discoverLeadsOnX（Grok X AI API）
  ↓
GrokがXをスキャンしてリードを発見
  ↓
JSONレスポンス（sources配列）
  ↓
キーワード検出・スコアリング
  ↓
リードリスト作成
  ↓
優先キューに追加
  ↓
ドンピシャリードは即座にVSL1送信
```

---

## 🔍 詳細ステップ

### Step 1: Cron実行（30分ごと）

**ファイル**: `api/lead-discovery.js`  
**関数**: `handleLeadDiscovery`

- Vercel Cronが30分ごとに `/api/lead-discovery` を実行
- `CRON_SECRET` で認証

---

### Step 2: 言語ループ開始

**コード**:
```javascript
const languages = ['en', 'es', 'pt-br', 'ar', 'ja', 'ko'];
for (const lang of languages) {
  // 各言語でリード発見
}
```

**処理**: 6言語それぞれでリード発見を実行

---

### Step 3: クエリ生成

**ファイル**: `api/lead-discovery.js`  
**関数**: `buildXSearchQuery`

**処理内容**:
1. 言語別の高優先度キーワードを取得
   - `HIGH_PRIORITY_KEYWORDS[lang]` から取得
   - 例: EN → `['BTC loss', 'bitcoin loss', 'lost bitcoin', 'BTC stolen', 'bitcoin stolen']`
2. 最大5つのキーワードを選択
3. 自然言語クエリを生成

**生成されるクエリ例**:
```
"Find BTC traders on X who are experiencing: BTC loss, bitcoin loss, lost bitcoin, BTC stolen, bitcoin stolen. 
Look for posts mentioning losses, hacks, FOMO, or fear. 
Return specific X handles (@username) and tweet content. Language: en"
```

---

### Step 4: Grok呼び出し

**ファイル**: `services/lead-discovery/xLeadDiscovery.js`  
**関数**: `searchLeadsOnX`

**処理**:
```javascript
const grokResult = await discoverLeadsOnX(query, lang);
```

---

### Step 5: GrokがXをスキャン

**ファイル**: `services/grok/client.js`  
**関数**: `discoverLeadsOnX`

**Grokへの指示**:

**System Prompt**:
```
You are "Dr. Grok", scanning X (Twitter) to find BTC traders who need help.
Find as many traders as possible who have lost money, been hacked, or are experiencing FOMO/fear.
Return ONLY JSON. No markdown. No code fences.
Schema: {"sources":[{"handle":string,"note":string,"tweetId":string}],"summary":string}
sources: Array of X handles (@username), tweet content (note), and tweet IDs.
Return AT LEAST 50-100 sources if possible. More is better.
tweetId: The numeric tweet ID (required for replying).
Focus on finding traders who mention: lost BTC, stolen wallet, hack attack, lost everything, 
afraid to trade, lost money trading, liquidation, margin call, trapped, FOMO, fear, panic, 
scam, fraud, rug pull.
```

**User Prompt**:
```
Task: Find as many BTC traders as possible on X who need protection/help.
Language: en
Query: [生成されたクエリ]
Return AT LEAST 100 X handles (@username), tweet content, and tweet IDs.
Find ALL traders experiencing: losses, hacks, FOMO, fear, panic, liquidations, 
margin calls, scams, fraud, rug pulls, trapped positions.
More results = better. Return maximum possible number of leads.
```

**Grokの動作**:
1. **X（Twitter）のリアルタイムデータにアクセス**
   - GrokはX AI API経由でXのデータに直接アクセス可能
   - キーワード検索、トレンド分析、投稿スキャンを実行
2. **リード候補を発見**
   - 損失、ハック、FOMO、恐怖などのキーワードを含む投稿を検索
   - 投稿者（@username）、投稿内容、tweet IDを抽出
3. **JSON形式で返却**
   - `max_tokens: 4000` で最大限のリードを返す
   - 100件以上のリードを返すよう指示

**Grokが返すJSON例**:
```json
{
  "sources": [
    {
      "handle": "@trader123",
      "note": "Lost all my BTC in a hack attack. Devastated.",
      "tweetId": "1234567890123456789"
    },
    {
      "handle": "@cryptouser",
      "note": "Got liquidated on my BTC position. Need help.",
      "tweetId": "9876543210987654321"
    },
    // ... 最大100件以上
  ],
  "summary": "Found 150 BTC traders experiencing losses or distress"
}
```

---

### Step 6: リード抽出・フィルタリング

**ファイル**: `services/lead-discovery/xLeadDiscovery.js`  
**関数**: `searchLeadsOnX`

**処理**:
1. Grokの結果から `sources` 配列を取得
2. 各sourceをループ処理（最大100件）
3. **キーワード検出**: `detectKeywords(source.note, lang)`
   - 投稿内容（`note`）からCryptoキーワードを検出
   - マッチしたキーワード、優先度（high/medium/low）を返す
4. **マッチした場合のみリードとして追加**

---

### Step 7: リード品質スコアリング

**ファイル**: `services/lead-discovery/keywordMonitor.js`  
**関数**: `calculateLeadScore`, `isPerfectMatch`

**スコア計算**:
- **基本スコア**: 0.0（スタート）
- **優先度ボーナス**:
  - `high` → +0.5
  - `medium` → +0.3
  - `low` → +0.1
- **キーワード数ボーナス**: マッチしたキーワード数 × 0.1（最大0.3）
- **エンゲージメントボーナス**: `engagementRate × 0.2`（最大0.2）

**ドンピシャ判定**:
- スコア ≥ 0.8 → `isPerfectMatch = true`
- スコア < 0.8 → `isPerfectMatch = false`

**リードオブジェクト作成**:
```javascript
{
  userId: null,
  username: "trader123",
  tweetId: "1234567890123456789",
  lang: "en",
  text: "Lost all my BTC in a hack attack...",
  keywords: ["BTC loss", "hack attack"],
  priority: "high",
  score: 0.85,
  isPerfectMatch: true,
  engagementRate: 0.1,
  timestamp: "2026-01-18T12:00:00.000Z",
  source: "grok"
}
```

---

### Step 8: 優先キューに追加

**ファイル**: `api/lead-discovery.js`  
**関数**: `handleLeadDiscovery`

**処理**:
```javascript
const jobId = await enqueueLead(lead);
```

**優先度**:
- **優先度1**: ドンピシャリード（`isPerfectMatch = true`）
- **優先度2**: 高優先度リード（`priority = 'high'`）
- **優先度3**: 中優先度リード（`priority = 'medium'`）
- **優先度4**: 低優先度リード（`priority = 'low'`）

---

### Step 9: ドンピシャリードの即座送信

**ファイル**: `api/lead-discovery.js`

**処理**:
```javascript
if (lead.isPerfectMatch) {
  await replyVSL1ToLead(lead);  // XにVSL1リプライ送信
  await completeLead(jobId);     // キューから完了として削除
  stats.x.sent++;
}
```

**VSL1送信**:
- X API v2でリプライ送信
- 言語別VSL1メッセージ + YouTubeリンク

---

### Step 10: トレンド検索（追加）

**ファイル**: `api/lead-discovery.js`  
**関数**: `discoverLeadsFromTrends`

**処理**:
- 各言語でトレンド関連のリードも発見
- 同じフローでキューに追加

---

## 📊 1回の実行で取得されるリード数

### キーワード検索
- **言語数**: 6言語
- **1言語あたり**: Grokが最大100件返す
- **合計**: 最大600リード

### トレンド検索
- **言語数**: 6言語
- **1言語あたり**: 最大50リード
- **合計**: 最大300リード

### **合計（1回の実行）**: 最大**900リード**

### 1日のリード発見数
- **実行頻度**: 30分ごと（1日48回）
- **理論最大**: 900リード × 48 = **43,200リード/日**
- **現実的な見積もり**: 重複・エラーを考慮して **5,000-10,000リード/日**

---

## 🎯 重要なポイント

### 1. Grokの強み
- **Xのリアルタイムデータに直接アクセス**
- **自然言語理解**: キーワードだけでなく、文脈も理解
- **大量のリードを一度に取得**: `max_tokens: 4000`で最大限

### 2. フィルタリングの重要性
- Grokが返すすべてのリードが有効とは限らない
- `detectKeywords`でキーワードマッチング
- スコアリングで品質を判定

### 3. ドンピシャリードの優先処理
- スコア0.8以上は即座にVSL1送信
- タイムリーな対応でコンバージョン率向上

---

**COO (Cursor/Composer 1) Grok Xリード発見フロー説明**: 2026-01-18
