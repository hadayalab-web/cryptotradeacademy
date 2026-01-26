# X API Webhookの用途と活用方法
**作成日時**: 2026-01-26  
**情報源**: X API公式ドキュメント

---

## 🔔 Webhookとは？

Webhookは、**イベント駆動型の通知システム**です。従来のポーリング方式（定期的にAPIを呼び出してデータを取得）とは異なり、**イベントが発生したときに自動的にHTTPリクエストを送信**します。

### ポーリング方式 vs Webhook方式

| 方式 | 動作 | メリット | デメリット |
|------|------|---------|-----------|
| **ポーリング** | 定期的にAPIを呼び出してデータを取得 | 実装が簡単 | リソース消費が大きい、リアルタイム性が低い |
| **Webhook** | イベント発生時に自動通知 | リアルタイム、リソース効率が良い | 実装が複雑、サーバーが必要 |

---

## 📊 X API Webhookの主な用途

### 1. **リアルタイムエンゲージメント追跡**

**現在の実装**: ポーリング方式でメトリクスを取得
- `services/x/metrics.js`で`getTweetMetrics()`を呼び出し
- Cron Jobで定期的にメトリクスを更新
- **コスト**: 1日100投稿 × 1回/日 × $0.005 = **$0.50/日**

**Webhook活用**:
- いいね、リツイート、リプライ、メンションが発生したときに**リアルタイムで通知**
- ポーリング不要 → **APIコスト削減**
- **即座に反応** → 高エンゲージメント投稿をすぐに検知

**活用例**:
```javascript
// Webhookイベント: いいねが100件を超えた
if (likeCount > 100) {
  // 即座にフォローアップ投稿を実行
  await postFollowUpTweet(tweetId);
}
```

---

### 2. **DM（ダイレクトメッセージ）の受信・送信**

**現在の実装**: DM機能は未実装

**Webhook活用**:
- DM受信時に自動通知
- VSL2配信をX DM経由で実装可能
- ユーザーからの質問に自動返信

**活用例**:
```javascript
// Webhookイベント: DM受信
if (dmText.includes('trap')) {
  // 自動返信: Trap Defence情報を送信
  await sendDM(userId, trapDefenceInfo);
}
```

---

### 3. **フォロー・アンフォローイベント**

**現在の実装**: フォロー機能は未実装

**Webhook活用**:
- 新規フォロワーを検知
- フォロー解除を検知
- フォロワー数変動のリアルタイム監視

**活用例**:
```javascript
// Webhookイベント: 新規フォロワー
if (eventType === 'follow') {
  // ウェルカムDMを自動送信
  await sendWelcomeDM(userId);
}
```

---

### 4. **投稿作成・削除イベント**

**現在の実装**: 投稿は自動作成のみ

**Webhook活用**:
- 投稿が削除された場合の検知
- 投稿が作成されたときの確認
- 投稿の状態変更をリアルタイム監視

---

## 🚀 プロジェクトでの活用シナリオ

### シナリオ1: リアルタイムエンゲージメント追跡

**現在の問題**:
- ポーリング方式でメトリクスを取得
- リアルタイム性が低い
- APIコストが発生（$0.50/日）

**Webhook活用**:
- いいね、リツイート、リプライが発生したときに**即座に通知**
- 高エンゲージメント投稿を**リアルタイムで検知**
- ポーリング不要 → **APIコスト削減**

**実装イメージ**:
```javascript
// api/x-webhook.js
module.exports = async function handler(req, res) {
  const event = req.body;
  
  // いいねイベント
  if (event.type === 'like') {
    await handleLikeEvent(event.tweetId, event.userId);
  }
  
  // リツイートイベント
  if (event.type === 'retweet') {
    await handleRetweetEvent(event.tweetId, event.userId);
  }
  
  // リプライイベント
  if (event.type === 'reply') {
    await handleReplyEvent(event.tweetId, event.userId, event.text);
  }
  
  res.status(200).json({ received: true });
};
```

---

### シナリオ2: バズ投稿の自動検知とフォローアップ

**現在の実装**: バズ投稿の検知は手動またはCron Job

**Webhook活用**:
- エンゲージメントが急上昇したときに**即座に通知**
- 自動的にフォローアップ投稿を実行
- バズの機会を逃さない

**実装イメージ**:
```javascript
// エンゲージメント急上昇を検知
if (engagementRate > 5% && impressions > 100000) {
  // 即座にフォローアップ投稿
  await postFollowUpTweet(tweetId, 'This is going viral!');
}
```

---

### シナリオ3: スパム検知の早期警告

**現在の懸念**: Grokが警告した「スパム検知のリスク」

**Webhook活用**:
- ミュート、ブロック、スパム報告をリアルタイムで検知
- 早期警告システムを構築
- 問題が発生したら即座に対応

**実装イメージ**:
```javascript
// スパム報告イベント
if (event.type === 'spam_report') {
  // 即座に投稿を停止
  await stopPosting();
  // アラートを送信
  await sendAlert('Spam report detected!');
}
```

---

## 💰 コスト比較

### 現在のポーリング方式

| 項目 | コスト |
|------|--------|
| **メトリクス取得** | 100投稿/日 × 1回/日 × $0.005 = **$0.50/日** |
| **月間コスト** | **$15** |

### Webhook方式

| 項目 | コスト |
|------|--------|
| **Webhook受信** | **無料**（イベント通知は無料） |
| **月間コスト** | **$0** |

**節約額**: **月$15**（年間$180）

---

## ⚠️ 実装の注意事項

### 1. **Account Activity APIが必要**

X APIのWebhookは**Account Activity API**を使用します。これは**Enterprise Tier**が必要な場合があります。

### 2. **サーバーが必要**

Webhookを受信するには、**公開されたHTTPSエンドポイント**が必要です。
- Vercel Serverless Functionsで実装可能
- `/api/x-webhook`エンドポイントを作成

### 3. **Webhook URLの登録**

X Developer ConsoleでWebhook URLを登録する必要があります。

### 4. **セキュリティ**

Webhookリクエストの検証が必要です（X APIの署名検証）。

---

## 🎯 推奨実装優先度

### Phase 1: リアルタイムエンゲージメント追跡（優先度高）

**メリット**:
- APIコスト削減（月$15節約）
- リアルタイム性の向上
- バズ投稿の即座検知

**実装難易度**: 中

### Phase 2: DM機能の実装（優先度中）

**メリット**:
- VSL2配信をX DM経由で実装可能
- ユーザーとの直接コミュニケーション

**実装難易度**: 高

### Phase 3: スパム検知の早期警告（優先度中）

**メリット**:
- Grokの警告への対応
- 問題の早期発見

**実装難易度**: 中

---

## 📝 結論

X APIのWebhookは、**リアルタイムエンゲージメント追跡**に最適です。現在のポーリング方式からWebhook方式に移行することで：

1. **APIコスト削減**（月$15節約）
2. **リアルタイム性の向上**
3. **バズ投稿の即座検知**
4. **スパム検知の早期警告**

が可能になります。

**推奨**: Phase 1として、リアルタイムエンゲージメント追跡の実装を優先することを推奨します。

---

**作成日**: 2026-01-26
