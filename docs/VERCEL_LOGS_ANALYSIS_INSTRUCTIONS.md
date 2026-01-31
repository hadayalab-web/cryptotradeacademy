# Vercelログ解析手順
**作成日**: 2026-01-30

---

## 🚀 ログ解析スクリプトの実行方法

### Step 1: Pythonスクリプトを実行

PowerShellで以下のコマンドを実行してください：

```powershell
# プロジェクトルートに移動
cd c:\Users\chiba\hadayalab-automation-platform\cryptotradeacademy

# スクリプトを実行
python scripts/analyze_vercel_logs.py
```

または、直接ファイルパスを指定：

```powershell
python scripts/analyze_vercel_logs.py "c:\Users\chiba\Downloads\logs_result.json"
```

---

## 📊 スクリプトの出力内容

スクリプトは以下を表示します：

1. **総ログ数**
2. **`/api/cron`関連のログ**（最初の10件）
3. **エラーログ**（最初の20件）
4. **400以上のステータスコード**（最初の20件）
5. **`/api/cron`の500エラー**（すべて）

---

## 🔍 手動でログを確認する方法

ログファイルが大きすぎる場合、以下の方法で確認できます：

### 方法1: テキストエディタで検索

1. `c:\Users\chiba\Downloads\logs_result.json` をテキストエディタで開く
2. 以下を検索：
   - `/api/cron` - cron関連のログ
   - `"responseStatusCode":500` - 500エラー
   - `"level":"error"` - エラーレベルのログ

### 方法2: PowerShellで検索

```powershell
# /api/cron関連のログを検索
Select-String -Path "c:\Users\chiba\Downloads\logs_result.json" -Pattern "/api/cron" | Select-Object -First 10

# 500エラーを検索
Select-String -Path "c:\Users\chiba\Downloads\logs_result.json" -Pattern '"responseStatusCode":500' | Select-Object -First 10

# エラーレベルを検索
Select-String -Path "c:\Users\chiba\Downloads\logs_result.json" -Pattern '"level":"error"' | Select-Object -First 10
```

---

## 📝 確認すべきエラーパターン

### 1. 環境変数不足

```
"message": "Missing environment variable: XXX"
"message": "process.env.XXX is undefined"
```

### 2. モジュール読み込みエラー

```
"message": "Cannot find module 'xxx'"
"message": "Module not found"
```

### 3. KV接続エラー

```
"message": "KV connection failed"
"message": "Failed to connect to KV"
```

### 4. タイムアウト

```
"message": "Function execution timeout"
"message": "Execution timeout"
```

### 5. 認証エラー

```
"message": "Unauthorized"
"message": "Authentication failed"
```

---

## 🎯 次のステップ

1. **スクリプトを実行**してログを解析
2. **エラーメッセージを特定**
3. **エラーの原因を分析**
4. **修正案を提案**

---

**最終更新**: 2026-01-30
