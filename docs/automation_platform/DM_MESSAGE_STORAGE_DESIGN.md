# DMメッセージ格納設計

**作成日時**: 2026-01-13  
**目的**: ユーザーリストとDMメッセージテンプレートを分離し、Gemini CMOが作成したDMの格納場所を明確化

---

## 🎯 設計方針

### 分離の理由

1. **データの独立性**: ユーザーリストとDMメッセージは別々に管理
2. **再利用性**: 同じメッセージテンプレートを複数のユーザーに適用可能
3. **管理の容易さ**: メッセージの更新が容易
4. **Gemini CMOの出力管理**: 作成されたDMメッセージの追跡が容易

---

## 📁 ファイル構成

### 1. ユーザーリスト (`data/user-list-en.csv`)

**用途**: DM送信先のユーザー情報のみ

**CSV形式**:
```csv
username,display_name,market,telegram_user_id,email,status,created_at,updated_at
```

**カラム説明**:
- `username`: ユーザー名（一意、キー）
- `display_name`: 表示名
- `market`: 市場コード（EN固定）
- `telegram_user_id`: Telegram User ID
- `email`: Emailアドレス
- `status`: ステータス（New, Contacted）
- `created_at`: 作成日時
- `updated_at`: 更新日時

**注意**: DMメッセージは含まない

---

### 2. DMメッセージファイル (`data/dm-messages-en.json`)

**用途**: Gemini CMOが作成したDMメッセージを格納

**JSON形式**:
```json
{
  "messages": [
    {
      "username": "testuser",
      "message_id": "msg_001",
      "created_at": "2026-01-13T12:00:00.000Z",
      "created_by": "Gemini CMO",
      "preferred_channel": "TG",
      "dm_message": "🚀 Exclusive Offer: Trap Defence BTC\n\nHi Test User,\n\nWe're launching Trap Defence BTC - a revolutionary tool to protect your crypto trades.\n\n🎯 Key Features:\n- Trap Defense Engine\n- Real-time market analysis\n- 70% wait strategy\n\n💰 Special Offer: Limited time pricing\n\n🚀 Get started: https://whop.com/aio-media-llc/trap-defence-btc-en/"
    }
  ]
}
```

**フィールド説明**:
- `username`: ユーザー名（ユーザーリストとのキー）
- `message_id`: メッセージID（一意）
- `created_at`: 作成日時
- `created_by`: 作成者（"Gemini CMO"）
- `preferred_channel`: 優先チャネル（TG, Email）
- `dm_message`: 実際のDMメッセージ内容

---

### 3. DMメッセージテンプレート (`data/dm-templates-en.json`)

**用途**: 再利用可能なDMメッセージテンプレート

**JSON形式**:
```json
{
  "templates": [
    {
      "template_id": "template_001",
      "name": "Standard Direct Sales Template",
      "market": "EN",
      "preferred_channel": "TG",
      "template": "🚀 Exclusive Offer: Trap Defence BTC\n\nHi [DISPLAY_NAME],\n\nWe're launching Trap Defence BTC - a revolutionary tool to protect your crypto trades.\n\n🎯 Key Features:\n- Trap Defense Engine\n- Real-time market analysis\n- 70% wait strategy\n\n💰 Special Offer: Limited time pricing\n\n🚀 Get started: [WHOP_URL]",
      "variables": ["DISPLAY_NAME", "WHOP_URL"],
      "created_at": "2026-01-13T12:00:00.000Z"
    }
  ]
}
```

---

## 🔄 ワークフロー

### Step 1: ユーザーリスト作成

1. Grok CSOがユーザーリストを収集
2. `data/user-list-en.csv`に保存

### Step 2: DMメッセージ作成（Gemini CMO）

1. Gemini CMOがユーザーリストを読み込む
2. 各ユーザー向けにパーソナライズされたDMメッセージを生成
3. `data/dm-messages-en.json`に保存

**保存場所**: `scripts/complete-6markets-whop-and-send-dm.ts`の`generateSalesLettersBatch`関数内

### Step 3: DM送信準備

1. ユーザーリストとDMメッセージファイルを読み込む
2. `username`をキーにして結合
3. 送信準備完了

### Step 4: DM送信

1. `scripts/send-en-dm-csv.ts`がユーザーリストとDMメッセージを読み込む
2. 結合して送信

---

## 📝 Gemini CMOのDM作成処理

### 現在の実装

**ファイル**: `scripts/complete-6markets-whop-and-send-dm.ts`

**関数**: `generateSalesLettersBatch`

**保存場所**: 
- データベース: `AffiliateCandidate.notes`フィールド
- CSV: 未実装（データベースのみ）

### 新しい実装（提案）

**保存先**: `data/dm-messages-en.json`

```typescript
// Gemini CMOがDMメッセージを作成後
const dmMessageData = {
  username: user.username,
  message_id: `msg_${Date.now()}_${user.username}`,
  created_at: new Date().toISOString(),
  created_by: 'Gemini CMO',
  preferred_channel: preferredChannel,
  dm_message: salesLetter
};

// JSONファイルに保存
await saveDMMessageToFile('EN', dmMessageData);
```

---

## 🔧 実装が必要な変更

### 1. CSVファイル形式の変更

**変更前**: `notes`フィールドにDMメッセージを含む  
**変更後**: `notes`フィールドを削除、ユーザー情報のみ

### 2. DMメッセージ保存機能の追加

**新規作成**: `scripts/save-dm-message.ts`
- Gemini CMOが作成したDMメッセージを`data/dm-messages-en.json`に保存

### 3. DM送信スクリプトの変更

**変更**: `scripts/send-en-dm-csv.ts`
- ユーザーリストとDMメッセージファイルを読み込んで結合

---

## ✅ メリット

1. **データの分離**: ユーザー情報とメッセージが独立
2. **再利用性**: 同じメッセージを複数ユーザーに適用可能
3. **追跡性**: Gemini CMOが作成したDMメッセージを追跡可能
4. **管理の容易さ**: メッセージの更新が容易
5. **スケーラビリティ**: 大量のユーザーとメッセージを効率的に管理

---

**作成日時**: 2026-01-13  
**報告者**: COO兼CTO（Cursor/Composer 1）
