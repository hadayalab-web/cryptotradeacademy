# Telegramグループリード発見の流れ

**作成日**: 2026-01-18  
**目的**: Telegramグループ監視によるリード発見の詳細なプロセス説明

---

## 📊 全体フロー

```
Telegramグループでメッセージ投稿
  ↓
Telegram Bot API Webhook
  ↓
api/telegram-webhook.js (POST /api/telegram-webhook)
  ↓
handleGroupMessage（グループ判定）
  ↓
監視対象グループかチェック
  ↓
monitorGroupMessage（キーワード検出）
  ↓
キーワードマッチング
  ↓
リード品質スコアリング
  ↓
優先キューに追加
  ↓
ドンピシャリードは即座にVSL1 DM送信
```

---

## 🔍 詳細ステップ

### Step 1: Telegram Webhook受信

**ファイル**: `api/telegram-webhook.js`  
**エンドポイント**: `POST /api/telegram-webhook`

**処理**:
- Telegram Bot APIがグループメッセージをWebhookで送信
- VercelのAPIエンドポイントが受信

**Webhook設定**:
- URL: `https://cryptotradeacademy.vercel.app/api/telegram-webhook`
- Telegram Bot APIで設定済み

---

### Step 2: グループメッセージ判定

**ファイル**: `api/telegram-webhook.js`  
**関数**: `handler`

**処理**:
```javascript
if (update.message && update.message.chat) {
  const chatType = update.message.chat.type;
  if (chatType === 'group' || chatType === 'supergroup') {
    // グループメッセージとして処理
    const groupResult = await handleGroupMessage(update);
  }
}
```

**判定条件**:
- `chat.type === 'group'` または `'supergroup'`
- プライベートメッセージ（`'private'`）は除外

---

### Step 3: 監視対象グループチェック

**ファイル**: `api/telegram-webhook.js`  
**関数**: `handleGroupMessage`, `getMonitoredGroupIds`

**処理**:
1. 環境変数から監視対象グループIDを取得
   ```javascript
   const groups = {
     en: process.env.TELEGRAM_MONITORED_GROUPS_EN?.split(',') || [],
     es: process.env.TELEGRAM_MONITORED_GROUPS_ES?.split(',') || [],
     // ... 他の言語
   };
   ```

2. メッセージのグループIDが監視対象かチェック
   ```javascript
   const groupId = chat.id.toString();
   if (!allGroupIds.includes(groupId)) {
     return null; // 監視対象外
   }
   ```

3. グループIDから言語を逆引き
   ```javascript
   let lang = 'en'; // デフォルト
   for (const [langCode, groupIds] of Object.entries(groups)) {
     if (groupIds.includes(groupId)) {
       lang = langCode;
       break;
     }
   }
   ```

**環境変数設定例**:
```bash
TELEGRAM_MONITORED_GROUPS_EN=-1001234567890,-1001234567891
TELEGRAM_MONITORED_GROUPS_ES=-1001234567892
TELEGRAM_MONITORED_GROUPS_PT_BR=-1001234567893
# ... 他の言語も同様
```

---

### Step 4: キーワード検出

**ファイル**: `services/lead-discovery/telegramGroupMonitor.js`  
**関数**: `monitorGroupMessage`

**処理**:
```javascript
// メッセージテキストからキーワードを検出
const detectionResult = detectKeywords(message.text, lang);
```

**キーワード検出**:
- `services/lead-discovery/keywordMonitor.js` の `detectKeywords` を使用
- 200種以上のCryptoキーワード（6言語対応）とマッチング
- BTC損失、ハック被害、FOMO関連キーワードを検出

**検出結果**:
```javascript
{
  matched: true,
  keywords: ['BTC loss', 'hack attack'],
  priority: 'high',
  lang: 'en'
}
```

**マッチしない場合**: `null` を返して終了

---

### Step 5: リード品質スコアリング

**ファイル**: `services/lead-discovery/telegramGroupMonitor.js`  
**関数**: `monitorGroupMessage`

**処理**:
```javascript
// エンゲージメント率を計算
const userData = {
  engagementRate: message.reactions ? calculateEngagementRate(message.reactions) : 0,
};

// リード品質スコアを計算
const score = calculateLeadScore(detectionResult, userData);
const isPerfect = isPerfectMatch(detectionResult, userData);
```

**スコア計算**:
- 優先度ボーナス（high: +0.5, medium: +0.3, low: +0.1）
- キーワード数ボーナス（マッチ数 × 0.1、最大0.3）
- エンゲージメントボーナス（リアクション数 × 0.2、最大0.2）

**ドンピシャ判定**:
- スコア ≥ 0.8 → `isPerfectMatch = true`
- スコア < 0.8 → `isPerfectMatch = false`

---

### Step 6: リードオブジェクト作成

**ファイル**: `services/lead-discovery/telegramGroupMonitor.js`  
**関数**: `monitorGroupMessage`

**リード情報**:
```javascript
{
  userId: message.from?.id,           // TelegramユーザーID
  username: message.from?.username || message.from?.first_name,
  chatId: message.chat?.id,           // グループID
  groupId,                             // グループID（重複）
  lang: detectionResult.lang,          // 言語コード
  text: message.text.substring(0, 200), // メッセージ本文（最初の200文字）
  keywords: detectionResult.keywords, // マッチしたキーワード
  priority: detectionResult.priority, // 優先度（high/medium/low）
  score,                                // リード品質スコア
  isPerfectMatch: isPerfect,           // ドンピシャ判定
  timestamp: new Date().toISOString(), // 発見時刻
}
```

---

### Step 7: 優先キューに追加

**ファイル**: `api/telegram-webhook.js`  
**関数**: `handleGroupMessage`

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

**ファイル**: `api/telegram-webhook.js`  
**関数**: `handleGroupMessage`

**処理**:
```javascript
if (lead.isPerfectMatch) {
  await sendVSL1ToLead(lead);  // VSL1 DM送信
  await completeLead(jobId);   // キューから完了として削除
  return { success: true, action: 'perfect_match_sent', lead };
}
```

**VSL1送信**:
- **ファイル**: `services/lead-discovery/telegramGroupMonitor.js`  
- **関数**: `sendVSL1ToLead`

**処理内容**:
1. 言語別VSL1メッセージを生成
2. Telegram DMで送信（`sendMessageToUser`）
3. ユーザーを無料版に登録（`addFreeUser`）
   - 既に登録済みの場合はスキップ

---

## ⚙️ 設定方法

### 1. Telegram Bot Webhook設定

**Webhook URL**:
```
https://cryptotradeacademy.vercel.app/api/telegram-webhook
```

**設定方法**:
```bash
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -d "url=https://cryptotradeacademy.vercel.app/api/telegram-webhook"
```

**確認方法**:
```bash
curl "https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo"
```

---

### 2. 監視対象グループIDの設定

**環境変数設定**（Vercel）:
```bash
# EN版（英語）
TELEGRAM_MONITORED_GROUPS_EN=-1001234567890,-1001234567891

# ES版（スペイン語）
TELEGRAM_MONITORED_GROUPS_ES=-1001234567892

# PT-BR版（ポルトガル語）
TELEGRAM_MONITORED_GROUPS_PT_BR=-1001234567893

# AR版（アラビア語）
TELEGRAM_MONITORED_GROUPS_AR=-1001234567894

# JA版（日本語）
TELEGRAM_MONITORED_GROUPS_JA=-1001234567895

# KO版（韓国語）
TELEGRAM_MONITORED_GROUPS_KO=-1001234567896
```

**グループID取得方法**:
```bash
node scripts/get-telegram-group-id.js
```

または、Botをグループに追加後、Webhookログで確認

---

### 3. Botをグループに追加

**手順**:
1. Telegramグループを開く
2. グループ設定 → メンバーを追加
3. `@dr_grok_bot` を検索して追加
4. Botに「メッセージを読み取る」権限を付与

**注意事項**:
- Botがメッセージを読み取れる権限が必要
- グループのプライバシー設定により、Botがメッセージを読み取れない場合がある

---

## 📊 リード発見の特徴

### Xリード発見との違い

| 項目 | Xリード発見 | Telegramリード発見 |
|------|------------|-------------------|
| **発見方法** | GrokがXをスキャン | Webhookでリアルタイム受信 |
| **コスト** | Live Search料金（$25/1,000 sources） | **無料**（Telegram Bot APIは無料） |
| **リアルタイム性** | 30分ごと（Cron実行） | **即座**（メッセージ投稿時に受信） |
| **リード品質** | Grokが判定 | キーワードマッチングで判定 |
| **送信方法** | Xリプライ | Telegram DM |

### Telegramリード発見の強み

1. **コストゼロ**: Telegram Bot APIは無料
2. **リアルタイム**: メッセージ投稿と同時に処理
3. **高品質**: グループ内の会話から自然にリードを発見
4. **即座送信**: ドンピシャリードは即座にVSL1 DM送信

---

## 💰 コスト

### Telegramリード発見
- **コスト**: **$0**（Telegram Bot APIは無料）
- **制限**: 1秒あたり30メッセージ（十分）

### Xリード発見との比較
- **X**: $544.50 / 月（初速段階）
- **Telegram**: $0 / 月
- **推奨**: Telegramリード発見を優先的に活用

---

## 🎯 最適化のポイント

### 1. 監視対象グループの選定
- **メンバー数**: 1,000人以上（アクティブなコミュニティ）
- **アクティビティ**: 1日10投稿以上
- **トピック**: Bitcoin/Crypto関連
- **言語**: 対象言語（EN, ES, PT-BR, AR, JA, KO）

### 2. キーワードの最適化
- 高優先度キーワードに集中
- 月次レポートでCTR最適キーワードを抽出
- 高パフォーマンスキーワードを優先

### 3. ドンピシャリードの優先処理
- スコア0.8以上は即座にVSL1送信
- タイムリーな対応でコンバージョン率向上

---

## 📈 期待される成果

### リード発見数（グループ数に依存）
- **1グループ（1,000人）**: 1日5-10リード（推定）
- **10グループ（10,000人）**: 1日50-100リード
- **100グループ（100,000人）**: 1日500-1,000リード

### コンバージョン率
- **全体**: 25-30%
- **ドンピシャリード**: 50%

### コスト効率
- **コスト**: $0
- **ROI**: 無限大（コストゼロ）

---

## ⚠️ 注意事項

1. **Bot権限**: Botがメッセージを読み取れる権限が必要
2. **グループのプライバシー**: プライバシー設定により、Botがメッセージを読み取れない場合がある
3. **スパム対策**: グループのルールを確認し、Botがスパムとみなされないようにする
4. **グループID取得**: 監視対象グループのIDを正確に取得する必要がある

---

**COO (Cursor/Composer 1) Telegramリード発見フロー説明**: 2026-01-18
