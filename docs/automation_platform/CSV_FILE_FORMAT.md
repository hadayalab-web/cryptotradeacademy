# CSVファイル形式定義

**作成日時**: 2026-01-13  
**目的**: EN版DM送信で使用するCSVファイルの形式を定義

---

## 📋 必要なCSVファイル

### 1. `data/user-list-en.csv` - EN市場のユーザーリスト（DM送信先）

**場所**: `data/user-list-en.csv`

**目的**: Trap Defence BTCの直接販売用DM送信先リスト

**CSV形式**:
```csv
username,display_name,market,telegram_user_id,email,status,created_at,updated_at
```

**各カラムの説明**:

| カラム名 | 型 | 説明 | 必須 |
|---------|-----|------|------|
| `username` | string | ユーザー名（一意、DMメッセージファイルとのキー） | ✅ |
| `display_name` | string | 表示名 | ❌ |
| `market` | string | 市場コード（EN固定） | ✅ |
| `telegram_user_id` | string | Telegram User ID | ❌ |
| `email` | string | Emailアドレス | ❌ |
| `status` | string | ステータス（New, Contacted） | ✅ |
| `created_at` | string | 作成日時（ISO形式） | ❌ |
| `updated_at` | string | 更新日時（ISO形式） | ❌ |

**ステータス値**:
- `New`: 準備済み（まだ送信していない）
- `Contacted`: 送信済み

**重要**: 
- **DMメッセージは含みません**。DMメッセージは別ファイル `data/dm-messages-en.json` に格納されます。
- `username`がDMメッセージファイルとのキーになります。

---

## 📝 CSVファイル作成例

### 最小限の例

```csv
username,display_name,market,telegram_user_id,email,status,created_at,updated_at
user1,User One,EN,123456789,user1@example.com,New,2026-01-13T12:00:00.000Z,2026-01-13T12:00:00.000Z
```

**注意**: DMメッセージは `data/dm-messages-en.json` に別途格納されます。

### 完全な例

```csv
username,display_name,market,telegram_user_id,email,status,created_at,updated_at
cryptotrader123,Crypto Trader,EN,6770292419,trader@example.com,New,2026-01-13T12:00:00.000Z,2026-01-13T12:00:00.000Z
bitcoin_expert,Bitcoin Expert,EN,987654321,expert@example.com,New,2026-01-13T12:00:00.000Z,2026-01-13T12:00:00.000Z
```

**注意**: DMメッセージは `data/dm-messages-en.json` に別途格納されます。`username`をキーにして結合します。

---

## 📋 CSVファイル作成手順

### Step 1: CSVファイルの作成

1. `data/`ディレクトリに`affiliate-candidates-en.csv`を作成
2. 上記の形式に従ってヘッダー行を追加
3. データ行を追加

### Step 2: 必須カラムの確認

- ✅ `username`: 必須
- ✅ `market`: 必須（EN固定）
- ✅ `status`: 必須（NewまたはContacted）
- ⚠️ `telegram_user_id`または`email`: どちらか一方は必須（送信先として）

### Step 3: DMメッセージファイルの確認

DMメッセージは `data/dm-messages-en.json` に格納されます。

**Gemini CMOが作成したDMメッセージの格納場所**:
- `scripts/complete-6markets-whop-and-send-dm.ts` の `generateSalesLettersBatch` 関数で作成
- `data/dm-messages-en.json` に保存（実装予定）

**DMメッセージファイル形式**: `docs/DM_MESSAGE_STORAGE_DESIGN.md` を参照

---

## 🔍 CSVファイルの検証

### 必須チェック

1. **ヘッダー行が正しいか**
   ```csv
   username,display_name,market,telegram_user_id,email,status,notes,created_at,updated_at
   ```

2. **必須カラムが存在するか**
   - `username`
   - `market`
   - `status`

3. **送信先情報があるか**
   - `telegram_user_id`または`email`のどちらかが存在する

4. **DMメッセージファイルが存在するか**
   - `data/dm-messages-en.json` が存在する
   - ユーザーリストの`username`とDMメッセージファイルの`username`が一致する

---

## 📊 CSVファイルのサンプル（空のテンプレート）

```csv
username,display_name,market,telegram_user_id,email,status,created_at,updated_at
```

このテンプレートをコピーして、データを追加してください。

**注意**: DMメッセージは含めません。DMメッセージは `data/dm-messages-en.json` に別途格納されます。

---

## 🚀 次のステップ

1. **CSVファイルを作成**（上記の形式に従って）
2. **`data/user-list-en.csv`に保存**
3. **CSVベースのスクリプトを実行**

---

**作成日時**: 2026-01-13  
**報告者**: COO兼CTO（Cursor/Composer 1）
