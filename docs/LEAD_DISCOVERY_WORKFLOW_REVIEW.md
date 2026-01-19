# XとTelegramリードアプローチ ワークフロー解説とレビュー

**作成日**: 2026-01-18  
**目的**: XとTelegramのリードアプローチ方法を解説し、ワークフローの破綻を確認

---

## 📊 全体ワークフロー概要

### 2つのリード発見チャネル

1. **Xリード発見**: X上の投稿から直接リードを発見
2. **Telegramリード発見**: X上の投稿からTelegram関連リードを発見

**重要**: 両方とも**Grok（X AI API）を使用してX上の投稿をスキャン**している

---

## 🔍 Xリード発見のワークフロー

### Step 1: Cron実行（2時間ごと）

**ファイル**: `api/lead-discovery.js`  
**関数**: `handleLeadDiscovery`

**実行頻度**: 2時間ごと（12回/日）

---

### Step 2: 言語ループ（6言語同時展開）

**対象言語**: EN, ES, PT-BR, AR, JA, KO

```javascript
const languages = process.env.LEAD_DISCOVERY_LANGUAGES?.split(',') || ['en', 'es'];
for (const lang of languages) {
  // 各言語でリード発見
}
```

---

### Step 3: クエリ生成

**ファイル**: `api/lead-discovery.js`  
**関数**: `buildXSearchQuery`

**処理**:
1. 言語別の高優先度キーワードを取得（`HIGH_PRIORITY_KEYWORDS[lang]`）
2. 最大5つのキーワードを選択
3. 自然言語クエリを生成

**生成されるクエリ例**:
```
"Find BTC traders on X who are experiencing: BTC loss, bitcoin loss, lost bitcoin, BTC stolen, bitcoin stolen. 
Look for posts mentioning losses, hacks, FOMO, or fear. 
Return specific X handles (@username) and tweet content. Language: en"
```

---

### Step 4: GrokでXをスキャン

**ファイル**: `services/lead-discovery/xLeadDiscovery.js`  
**関数**: `searchLeadsOnX`

**処理**:
```javascript
const grokResult = await discoverLeadsOnX(query, lang);
```

**Grokの動作**:
- X（Twitter）のリアルタイムデータに直接アクセス
- キーワード検索、トレンド分析、投稿スキャンを実行
- 損失、ハック、FOMO、恐怖などのキーワードを含む投稿を検索
- 投稿者（@username）、投稿内容（note）、tweet IDを抽出

**Grokが返すJSON形式**:
```json
{
  "sources": [
    {
      "handle": "@trader123",
      "note": "Lost all my BTC in a hack attack. Devastated.",
      "tweetId": "1234567890123456789"
    }
  ],
  "summary": "Found 150 BTC traders experiencing losses or distress"
}
```

---

### Step 5: リード抽出・フィルタリング

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

### Step 6: リード品質スコアリング

**ファイル**: `services/lead-discovery/keywordMonitor.js`  
**関数**: `calculateLeadScore`, `isPerfectMatch`

**スコア計算**:
- **基本スコア**: 0.0（スタート）
- **優先度ボーナス**: high +0.5, medium +0.3, low +0.1
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

### Step 7: 優先キューに追加

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

### Step 8: ドンピシャリードの即座送信

**ファイル**: `api/lead-discovery.js`  
**関数**: `handleLeadDiscovery`

**処理**:
```javascript
if (lead.isPerfectMatch) {
  await replyVSL1ToLead(lead);  // XにVSL1リプライ送信
  await completeLead(jobId);     // キューから完了として削除
  stats.x.sent++;
}
```

**VSL1送信処理** (`services/lead-discovery/xLeadDiscovery.js`):
1. **重複送信防止チェック**: `hasSentVSL1(lead)`
2. **レート制限チェック**: `checkXApiRateLimit()`
3. **VSL1メッセージ生成**: 言語別VSL1メッセージ + YouTubeリンク
4. **X API v2でリプライ送信**: `replyToTweet(replyText, lead.tweetId)`
5. **送信済みをマーク**: `markVSL1Sent(lead)`

**注意**: 現在の実装では、XリードのVSL1送信時に**リード記録（`recordLead`）が行われていない**

---

## 📱 Telegramリード発見のワークフロー

### Step 1: Cron実行（2時間ごと）

**ファイル**: `api/lead-discovery.js`  
**関数**: `handleLeadDiscovery`

**実行頻度**: 2時間ごと（12回/日）

---

### Step 2: 言語ループ（6言語同時展開）

**対象言語**: EN, ES, PT-BR, AR, JA, KO

```javascript
const telegramLanguages = process.env.LEAD_DISCOVERY_LANGUAGES?.split(',') || ['en', 'es'];
for (const lang of telegramLanguages) {
  // 各言語でTelegramリード発見
}
```

---

### Step 3: GrokでXをスキャン（Telegram関連）

**ファイル**: `services/lead-discovery/telegramLeadDiscovery.js`  
**関数**: `discoverTelegramLeads`

**Grokへのプロンプト**:
```
Find BTC traders on X who mention Telegram groups, channels, or DMs where they discuss losses, hacks, or FOMO. 
Look for posts that mention:
- Telegram group links (t.me/...)
- Telegram channel links
- Users asking for help in Telegram
- Users sharing their losses in Telegram groups
- Users mentioning they got hacked and discussing it on Telegram

Return specific X handles (@username), tweet content, and tweet IDs.
Also extract any Telegram group/channel links mentioned in the tweets.
Language: ${lang}
```

**重要**: Telegramリード発見も**X上の投稿をスキャン**している

---

### Step 4: Telegramリンク抽出

**ファイル**: `services/lead-discovery/telegramLeadDiscovery.js`  
**関数**: `extractTelegramLinks`

**処理**:
- テキストから `t.me/...` パターンを抽出
- 重複チェック

**注意**: `@username` パターンは削除（Xのハンドルと混同するため）

---

### Step 5: リード抽出・フィルタリング

**ファイル**: `services/lead-discovery/telegramLeadDiscovery.js`  
**関数**: `discoverTelegramLeads`

**処理**:
1. Grokの結果から `sources` 配列を取得
2. 各sourceをループ処理
3. **Telegramリンク抽出**: `extractTelegramLinks(source.note)`
4. **キーワード検出**: `detectKeywords(source.note, lang)`
5. **Telegramリンクがあるか、キーワードがマッチした場合のみリードとして追加**

**リードオブジェクト作成**:
```javascript
{
  userId: null,
  username: "trader123",
  tweetId: "1234567890123456789",  // X上の投稿ID
  lang: "en",
  text: "Lost BTC. Discussed in Telegram group t.me/cryptohelp",
  keywords: ["BTC loss"],
  priority: "high",
  score: 0.85,
  isPerfectMatch: true,
  engagementRate: 0.1,
  timestamp: "2026-01-18T12:00:00.000Z",
  source: "grok_telegram",
  telegramLinks: [
    {
      type: "channel_or_group",
      username: "cryptohelp",
      url: "https://t.me/cryptohelp"
    }
  ]
}
```

---

### Step 6: 優先キューに追加

**ファイル**: `api/lead-discovery.js`  
**関数**: `handleLeadDiscovery`

**処理**:
```javascript
const leadId = await recordLead(lead);  // リード記録
const jobId = await enqueueLead(lead);  // キューに追加
```

**注意**: Telegramリードでは**リード記録が行われている**

---

### Step 7: ドンピシャリードの即座送信

**ファイル**: `api/lead-discovery.js`  
**関数**: `handleLeadDiscovery`

**処理**:
```javascript
if (lead.isPerfectMatch) {
  let sent = false;
  // Xリードの場合はリプライ送信
  if (lead.tweetId) {
    sent = await replyVSL1ToLead(lead);
  }
  // Telegramリードの場合はDM送信
  else if (lead.userId) {
    sent = await sendVSL1ToLead(lead);
  }
  
  if (sent) {
    if (leadId) {
      await recordVSL1Sent(leadId);
    }
    await completeLead(jobId);
    stats.telegram.sent++;
  }
}
```

**問題点**: 
- TelegramリードはX上の投稿から発見しているため、`tweetId`が存在する
- そのため、`lead.tweetId`が存在する場合、Xリプライで送信される
- `lead.userId`は通常`null`のため、Telegram DMは送信されない

---

## ⚠️ ワークフローの破綻と問題点

### 🔴 重大な問題点

#### 1. Telegramリードのアプローチ方法が不明確

**現状**:
- TelegramリードはX上の投稿から発見している
- `tweetId`が存在するため、Xリプライで送信される
- Telegram DMは送信されない（`userId`が`null`のため）

**問題**:
- Telegramリード発見の目的が不明確
- X上の投稿からTelegramリンクを抽出しているが、実際にTelegramにアプローチする方法がない
- Telegramグループ/チャンネルにBotを追加する機能がない

**解決策**:
- **オプション1**: Telegramリード発見を削除し、Xリード発見のみに集中
- **オプション2**: Telegramリード発見を、実際のTelegramグループ監視に変更
- **オプション3**: TelegramリードはXリプライで送信することを明確化（現状の動作を維持）

---

#### 2. リード記録のタイミングが一貫していない

**現状**:
- **Telegramリード**: キューに追加する前に`recordLead`を実行（59-65行目）
- **Xリード（キーワード検索）**: `recordLead`を実行していない（115-130行目）
- **Xリード（トレンド検索）**: VSL1送信後に`recordLead`を実行（154行目）

**問題**:
- リード記録のタイミングがバラバラで、CVR追跡が不正確になる可能性
- ドンピシャリードで即座送信される場合、リード記録が行われない可能性

**解決策**:
- **すべてのリードで、キューに追加する前に`recordLead`を実行**
- VSL1送信時に`recordVSL1Sent`を実行

---

#### 3. 重複送信防止のチェックが一部で欠けている

**現状**:
- `replyVSL1ToLead`と`sendVSL1ToLead`では重複送信防止チェックが実装されている
- しかし、`api/lead-discovery.js`の122行目で、Xリードのドンピシャリード送信時に`recordVSL1Sent`が実行されていない

**問題**:
- VSL1送信記録が行われないため、CVR追跡が不正確になる

**解決策**:
- Xリードのドンピシャリード送信時にも`recordLead`と`recordVSL1Sent`を実行

---

#### 4. Telegramリードの送信方法の混乱

**現状** (`api/lead-discovery.js` 70-88行目):
```javascript
if (lead.isPerfectMatch) {
  let sent = false;
  // Xリードの場合はリプライ送信
  if (lead.tweetId) {
    sent = await replyVSL1ToLead(lead);
  }
  // Telegramリードの場合はDM送信
  else if (lead.userId) {
    sent = await sendVSL1ToLead(lead);
  }
}
```

**問題**:
- TelegramリードはX上の投稿から発見しているため、`tweetId`が存在する
- `userId`は通常`null`のため、`else if (lead.userId)`の条件は実行されない
- 結果として、TelegramリードもXリプライで送信される

**解決策**:
- TelegramリードもXリプライで送信することを明確化
- または、Telegramリード発見の目的を再定義

---

## ✅ 推奨される修正

### 修正1: リード記録の統一

**修正箇所**: `api/lead-discovery.js`

**修正内容**:
```javascript
// Xリード発見（キーワード検索）
for (const lead of keywordLeads) {
  try {
    // リードを記録（CVR追跡用）
    const leadId = await recordLead(lead);
    if (leadId) {
      lead.leadId = leadId;
    }
    
    // キューに追加
    const jobId = await enqueueLead(lead);
    
    // ドンピシャリードの場合は即座に送信
    if (lead.isPerfectMatch) {
      const sent = await replyVSL1ToLead(lead);
      if (sent && leadId) {
        await recordVSL1Sent(leadId);
      }
      await completeLead(jobId);
      stats.x.sent++;
    }
  } catch (error) {
    console.error('[Lead Discovery] Failed to process X lead:', error.message);
    stats.x.errors++;
  }
}
```

---

### 修正2: Telegramリードのアプローチ方法を明確化

**オプションA: Telegramリード発見を削除（推奨）**

**理由**:
- Telegramリードは実際にはXリードと同じ扱いになっている
- Xリード発見のみに集中することで、ワークフローがシンプルになる

**修正内容**:
- `api/lead-discovery.js`の49-98行目を削除
- Telegramリード発見の処理を削除

---

**オプションB: TelegramリードをXリプライで送信することを明確化**

**修正内容**:
```javascript
// Telegramリード発見（X上の投稿からTelegram関連リードを発見）
// 注意: TelegramリードもX上の投稿から発見しているため、Xリプライで送信する
for (const lead of telegramLeads) {
  try {
    const leadId = await recordLead(lead);
    if (leadId) {
      lead.leadId = leadId;
    }
    
    const jobId = await enqueueLead(lead);
    
    // ドンピシャリードの場合は即座にXリプライで送信
    if (lead.isPerfectMatch && lead.tweetId) {
      const sent = await replyVSL1ToLead(lead);
      if (sent && leadId) {
        await recordVSL1Sent(leadId);
      }
      await completeLead(jobId);
      stats.telegram.sent++;
    }
  } catch (error) {
    console.error('[Lead Discovery] Failed to process Telegram lead:', error.message);
    stats.telegram.errors++;
  }
}
```

---

### 修正3: キュー処理の統一

**修正箇所**: `api/lead-discovery.js`  
**関数**: `processLeadQueue`

**現状の問題**:
- キューからリードを処理する際、リード記録が行われていない可能性がある

**修正内容**:
```javascript
// リードを記録（CVR追跡用）
const leadId = await recordLead(lead);
if (leadId) {
  lead.leadId = leadId;
}

let sent = false;

// Telegramリードの場合はDM送信
if (lead.userId && lead.chatId) {
  sent = await sendVSL1ToLead(lead);
}
// Xリードの場合はリプライ送信
else if (lead.tweetId) {
  sent = await replyVSL1ToLead(lead);
}

if (sent) {
  // リードを記録（CVR追跡用）
  if (leadId) {
    await recordVSL1Sent(leadId);
  }
  await completeLead(job.jobId);
  processed.push({ jobId: job.jobId, success: true });
}
```

---

## 📊 修正後のワークフロー（推奨）

### Xリード発見のワークフロー

```
1. Cron実行（2時間ごと）
   ↓
2. 6言語ループ
   ↓
3. GrokでXをスキャン
   ↓
4. リード抽出・フィルタリング
   ↓
5. リード記録（recordLead）
   ↓
6. 優先キューに追加
   ↓
7. ドンピシャリードは即座にXリプライでVSL1送信
   ↓
8. VSL1送信記録（recordVSL1Sent）
```

### Telegramリード発見のワークフロー（削除推奨）

**推奨**: Telegramリード発見を削除し、Xリード発見のみに集中

**理由**:
- Telegramリードは実際にはXリードと同じ扱いになっている
- ワークフローがシンプルになり、メンテナンスが容易になる

---

## 🎯 まとめ

### 現在のワークフローの問題点

1. **Telegramリードのアプローチ方法が不明確**
   - X上の投稿から発見しているが、Telegramにアプローチする方法がない
   - 実際にはXリプライで送信されている

2. **リード記録のタイミングが一貫していない**
   - Xリード（キーワード検索）で`recordLead`が実行されていない
   - CVR追跡が不正確になる可能性

3. **重複送信防止のチェックが一部で欠けている**
   - Xリードのドンピシャリード送信時に`recordVSL1Sent`が実行されていない

4. **Telegramリードの送信方法の混乱**
   - `userId`が`null`のため、Telegram DMは送信されない
   - 結果として、Xリプライで送信される

### 推奨される修正

1. **リード記録の統一**: すべてのリードで、キューに追加する前に`recordLead`を実行
2. **Telegramリード発見の削除**: Xリード発見のみに集中
3. **VSL1送信記録の統一**: すべてのVSL1送信で`recordVSL1Sent`を実行

---

**COO (Cursor/Composer 1) XとTelegramリードアプローチ ワークフロー解説とレビュー**: 2026-01-18
