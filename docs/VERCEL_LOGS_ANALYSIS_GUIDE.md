# Vercelログ解析ガイド
**作成日**: 2026-01-30

---

## 📋 ログファイルの解析方法

### ファイル情報
- **パス**: `c:\Users\chiba\Downloads\logs_result.json`
- **形式**: JSON配列（1行にすべてのログが含まれている）

---

## 🔍 エラーを探す方法

### 方法1: Pythonスクリプトを使用（推奨）

以下のスクリプトを実行してください：

```powershell
# PowerShellで実行
python scripts/analyze_vercel_logs.py
```

または、直接ファイルパスを指定：

```powershell
python scripts/analyze_vercel_logs.py "c:\Users\chiba\Downloads\logs_result.json"
```

### 方法2: 手動で検索

ログファイルをテキストエディタで開き、以下を検索：

1. **`/api/cron`** - cron関連のログ
2. **`"responseStatusCode":500`** - 500エラー
3. **`"level":"error"`** - エラーレベルのログ
4. **`FUNCTION_INVOCATION_FAILED`** - 関数実行失敗

---

## 📊 確認すべき項目

### 1. `/api/cron`関連のログ

以下のキーを確認：
- `"function": "/api/cron"`
- `"requestPath": ".../api/cron"`
- `"responseStatusCode": 500`（エラーの場合）

### 2. エラーメッセージ

以下のキーを確認：
- `"message"` - エラーメッセージ
- `"level": "error"` - エラーレベル

### 3. スタックトレース

エラーログにスタックトレースが含まれている場合、`"message"`フィールドに含まれている可能性があります。

---

## 🐛 よくあるエラーパターン

### パターン1: 環境変数不足

```json
{
  "message": "Missing environment variable: XXX",
  "level": "error"
}
```

### パターン2: モジュール読み込みエラー

```json
{
  "message": "Cannot find module 'xxx'",
  "level": "error"
}
```

### パターン3: KV接続エラー

```json
{
  "message": "KV connection failed",
  "level": "error"
}
```

### パターン4: タイムアウト

```json
{
  "message": "Function execution timeout",
  "level": "error"
}
```

---

## 📝 ログ解析結果の記録

解析結果を以下の形式で記録してください：

```markdown
## ログ解析結果

**解析日時**: 2026-01-30 HH:MM
**ログファイル**: logs_result.json

### 総ログ数
- 総数: X件

### /api/cron関連
- ログ数: X件
- 500エラー: X件

### エラーログ
- 総数: X件
- 主要なエラー:
  1. [エラーメッセージ1]
  2. [エラーメッセージ2]

### 発見された問題
- [問題1の詳細]
- [問題2の詳細]

### 修正提案
- [修正案1]
- [修正案2]
```

---

**最終更新**: 2026-01-30
