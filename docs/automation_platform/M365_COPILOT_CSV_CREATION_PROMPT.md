# M365 Copilot用 CSV作成プロンプト

**用途**: Trap Defence BTCの直接販売用DM送信先リスト  
**ファイル名**: `data/user-list-en.csv`  
**作成ツール**: Microsoft 365 Copilot（Excel / Power Automate）

---

## 📋 M365 Copilotに送信するプロンプト（コピー&ペースト用）

```
以下の形式でCSVファイルを作成してください。

ファイル名: data/user-list-en.csv

CSVヘッダー（1行目）:
username,display_name,market,telegram_user_id,email,status,created_at,updated_at

CSV形式の要件:
1. ヘッダー行は必須（1行目）
2. 各フィールドはカンマ区切り
3. 日時はISO形式（2026-01-13T12:00:00.000Z）
4. **重要**: DMメッセージは含めません。DMメッセージは別ファイル `data/dm-messages-en.json` に格納されます。

必須カラム:
- username: ユーザー名（一意、必須）
- market: 市場コード（EN固定、必須）
- status: ステータス（NewまたはContacted、必須）

送信先カラム（どちらか必須）:
- telegram_user_id: Telegram User ID
- email: Emailアドレス

オプションカラム:
- display_name: 表示名
- created_at: 作成日時（ISO形式）
- updated_at: 更新日時（ISO形式）

サンプルデータ（2-3行目）:
testuser,Test User,EN,6770292419,test@example.com,New,2026-01-13T12:00:00.000Z,2026-01-13T12:00:00.000Z
cryptotrader123,Crypto Trader,EN,123456789,trader@example.com,New,2026-01-13T12:00:00.000Z,2026-01-13T12:00:00.000Z
bitcoin_expert,Bitcoin Expert,EN,,expert@example.com,New,2026-01-13T12:00:00.000Z,2026-01-13T12:00:00.000Z

**重要**: 
- DMメッセージは含めません。DMメッセージはGemini CMOが作成し、`data/dm-messages-en.json`に格納されます。
- `username`がDMメッセージファイルとのキーになります。
- 空のフィールドはそのまま空欄にしてください（カンマは残す）。

CSVファイルを作成してください。
```

---

## 📝 Excelで作成する場合の詳細プロンプト

```
Excelで以下のCSVファイルを作成してください。

ファイル名: data/user-list-en.csv
保存場所: プロジェクトのdataフォルダ

列構成（A列からH列）:
A列: username（ユーザー名、必須）
B列: display_name（表示名、オプション）
C列: market（市場コード、EN固定、必須）
D列: telegram_user_id（Telegram User ID、オプション）
E列: email（Emailアドレス、オプション）
F列: status（ステータス、NewまたはContacted、必須）
G列: created_at（作成日時、ISO形式、オプション）
H列: updated_at（更新日時、ISO形式、オプション）

1行目（ヘッダー行）:
username,display_name,market,telegram_user_id,email,status,created_at,updated_at

2行目以降（データ行）のサンプル:
testuser,Test User,EN,6770292419,test@example.com,New,2026-01-13T12:00:00.000Z,2026-01-13T12:00:00.000Z
cryptotrader123,Crypto Trader,EN,123456789,trader@example.com,New,2026-01-13T12:00:00.000Z,2026-01-13T12:00:00.000Z
bitcoin_expert,Bitcoin Expert,EN,,expert@example.com,New,2026-01-13T12:00:00.000Z,2026-01-13T12:00:00.000Z

注意事項:
- DMメッセージは含めません（別ファイルに格納）
- telegram_user_idまたはemailのどちらかは必須
- 空のフィールドは空欄のまま（カンマは残す）
- 日時はISO形式（2026-01-13T12:00:00.000Z）

CSV形式（UTF-8）で保存してください。
```

---

## 🎯 Power Automateで作成する場合のプロンプト

```
Power Automateで以下のCSVファイルを作成するフローを作成してください。

出力ファイル名: data/user-list-en.csv

CSV構造:
- ヘッダー行: username,display_name,market,telegram_user_id,email,status,created_at,updated_at
- データ行: カンマ区切り、UTF-8エンコーディング

必須フィールド:
- username: ユーザー名（一意）
- market: 市場コード（EN固定）
- status: ステータス（NewまたはContacted）

送信先フィールド（どちらか必須）:
- telegram_user_id: Telegram User ID
- email: Emailアドレス

サンプルデータ行:
testuser,Test User,EN,6770292419,test@example.com,New,2026-01-13T12:00:00.000Z,2026-01-13T12:00:00.000Z

注意: DMメッセージは含めません。別ファイルに格納されます。
```

---

## 📊 CSVファイルの構造（表形式）

| username | display_name | market | telegram_user_id | email | status | created_at | updated_at |
|----------|--------------|--------|------------------|-------|--------|-------------|------------|
| testuser | Test User | EN | 6770292419 | test@example.com | New | 2026-01-13T12:00:00.000Z | 2026-01-13T12:00:00.000Z |
| cryptotrader123 | Crypto Trader | EN | 123456789 | trader@example.com | New | 2026-01-13T12:00:00.000Z | 2026-01-13T12:00:00.000Z |
| bitcoin_expert | Bitcoin Expert | EN | | expert@example.com | New | 2026-01-13T12:00:00.000Z | 2026-01-13T12:00:00.000Z |

---

## ✅ 生成後の確認事項

1. **ファイル名**: `data/user-list-en.csv`
2. **ヘッダー行**: `username,display_name,market,telegram_user_id,email,status,created_at,updated_at`
3. **エンコーディング**: UTF-8
4. **DMメッセージ**: 含まれていない（別ファイルに格納）
5. **必須カラム**: `username`, `market`, `status`が存在する
6. **送信先情報**: 各行で`telegram_user_id`または`email`のどちらかが存在する

---

## 🔗 関連ファイル

- **DMメッセージファイル**: `data/dm-messages-en.json`（Gemini CMOが作成）
- **VSL参照**: `docs/DM_VSL_REFERENCE.md`
- **詳細設計**: `docs/DM_MESSAGE_STORAGE_DESIGN.md`

---

## 💡 M365 Copilotでの使い方

### Excelの場合

1. Excelを開く
2. M365 Copilotに上記のプロンプトを送信
3. 生成されたCSVを確認
4. `data/user-list-en.csv`として保存（UTF-8形式）

### Power Automateの場合

1. Power Automateで新しいフローを作成
2. M365 Copilotに上記のプロンプトを送信
3. CSVファイル作成アクションを追加
4. フローを実行してCSVファイルを生成

---

**作成日時**: 2026-01-13  
**報告者**: COO兼CTO（Cursor/Composer 1）
