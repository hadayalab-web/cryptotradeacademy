# CVR追跡システム

**作成日**: 2026-01-18  
**目的**: リード発見から成約までの最終CVRを追跡し、正確な収益シミュレーションを実現

---

## 🎯 システム概要

### 追跡フロー

```
1. リード発見
   ↓
2. リード記録（KVストレージ）
   ↓
3. VSL1送信
   ↓
4. VSL1送信記録
   ↓
5. Whop購入
   ↓
6. 購入とリードを紐付け
   ↓
7. 成約記録
   ↓
8. CVR計算
```

---

## 📊 実装内容

### 1. リード記録 (`conversionTracker.js`)

#### `recordLead(lead)`
- リードIDを生成（ユニークID）
- KVストレージにリード情報を保存
- 日付別インデックスに追加

#### 保存データ
```javascript
{
  leadId: "abc123...",
  username: "@username",
  tweetId: "1234567890",
  lang: "en",
  source: "grok_telegram",
  score: 0.8,
  isPerfectMatch: true,
  discoveredAt: "2026-01-18T10:00:00Z",
  vsl1SentAt: null,
  vsl1Sent: false,
  convertedAt: null,
  converted: false,
  revenue: 0,
}
```

### 2. VSL1送信記録

#### `recordVSL1Sent(leadId)`
- VSL1送信時に呼び出し
- `vsl1Sent: true`, `vsl1SentAt` を記録

### 3. 成約記録

#### `recordConversion(leadId, membership)`
- Whop購入とリードを紐付け
- `converted: true`, `convertedAt`, `revenue` を記録

### 4. Whop購入同期

#### `syncWhopPurchases()`
- 定期的にWhop APIから購入を取得
- リードIDと紐付け
- 新規成約を記録

### 5. CVR統計取得

#### `getCVRStats(startDate, endDate)`
- 期間内のリード数、VSL1送信数、成約数を集計
- CVRを計算
- ドンピシャリードのCVRも別途計算

---

## 📈 CVRダッシュボード

### APIエンドポイント

#### `GET /api/lead-discovery/cvr-dashboard`
- CVR統計を取得
- 収益シミュレーションを計算

**クエリパラメータ**:
- `startDate`: 開始日（YYYY-MM-DD、デフォルト: 30日前）
- `endDate`: 終了日（YYYY-MM-DD、デフォルト: 今日）

**レスポンス**:
```json
{
  "success": true,
  "period": {
    "startDate": "2026-01-01",
    "endDate": "2026-01-18"
  },
  "stats": {
    "totalLeads": 5760,
    "vsl1Sent": 4800,
    "conversions": 1440,
    "cvr": 30.0,
    "revenue": 216000,
    "perfectMatchLeads": 1152,
    "perfectMatchConversions": 576,
    "perfectMatchCVR": 50.0
  },
  "simulation": {
    "currentCVR": 30.0,
    "perfectMatchCVR": 50.0,
    "averageRevenue": 150,
    "projectedMonthlyRevenue": {
      "dailyLeads": 192,
      "monthlyLeads": 5760,
      "monthlyConversions": 1728,
      "monthlyRevenue": 259200,
      "cvr": 30.0,
      "averageRevenue": 150
    }
  }
}
```

#### `POST /api/lead-discovery/sync-purchases`
- Whop購入を同期
- 新規成約を記録

**レスポンス**:
```json
{
  "success": true,
  "sync": {
    "checked": 150,
    "linked": 120,
    "newConversions": 15,
    "errors": 0
  }
}
```

---

## ⚙️ Cron設定

### `vercel.json`
```json
{
  "crons": [
    { "path": "/api/lead-discovery/cvr-dashboard", "schedule": "0 0 * * 0" },
    { "path": "/api/lead-discovery/sync-purchases", "schedule": "0 */6 * * *" }
  ]
}
```

- **CVRダッシュボード**: 毎週日曜0時（週次レポート）
- **購入同期**: 6時間ごと（新規成約を記録）

---

## 💰 収益シミュレーション

### 計算式

```javascript
// 1日あたりのリード数
dailyLeads = totalLeads / 30

// 月間リード数
monthlyLeads = dailyLeads * 30

// 月間成約数
monthlyConversions = monthlyLeads * (CVR / 100)

// 月間収益
monthlyRevenue = monthlyConversions * averageRevenue
```

### 例

**現在のCVR: 30%**
- 月間リード数: 5,760
- 月間成約数: 1,728
- 平均単価: $150
- **月間収益: $259,200**

**ドンピシャリードのCVR: 50%**
- ドンピシャリード数: 1,152
- 成約数: 576
- **成約率: 50%**

---

## 🔧 統合ポイント

### 1. リード発見時 (`api/lead-discovery.js`)

```javascript
// リードを記録
const leadId = await recordLead(lead);
lead.leadId = leadId;

// キューに追加
const jobId = await enqueueLead(lead);
```

### 2. VSL1送信時 (`api/lead-discovery.js`)

```javascript
// VSL1送信
await replyVSL1ToLead(lead);

// VSL1送信を記録
if (lead.leadId) {
  await recordVSL1Sent(lead.leadId);
}
```

### 3. Whop購入時（自動同期）

- 6時間ごとにWhop APIから購入を取得
- リードIDと紐付け
- 成約を記録

---

## 📊 データ保持期間

- **リードデータ**: 90日間（KVストレージ）
- **日付別インデックス**: 90日間

---

## ✅ 次のステップ

1. **VSL1メッセージにトラッキングパラメータを追加**
   - UTMパラメータ（`?lead_id=xxx`）
   - WhopリンクにリードIDを含める

2. **WhopメタデータにリードIDを保存**
   - 購入時にメタデータにリードIDを保存
   - より正確な紐付けが可能

3. **リアルタイムダッシュボード**
   - 現在のCVRをリアルタイムで表示
   - 収益予測を自動更新

---

**COO (Cursor/Composer 1) CVR追跡システム**: 2026-01-18
