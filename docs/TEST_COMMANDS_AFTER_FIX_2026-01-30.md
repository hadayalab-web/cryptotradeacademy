# 修正後のテストコマンド
**作成日**: 2026-01-30  
**デプロイ**: 成功（コミット `ed969f2`）

---

## 🎯 テスト目標

1. **`kv is not defined`エラーが解消されているか確認**
2. **`/api/x-quote-repost-{lang}`が正常に動作するか確認**
3. **`/api/cron`の500エラーが解消されているか確認**

---

## 🚀 テストコマンド

### Step 1: 環境変数の設定

PowerShellで実行：

```powershell
# Vercel URLを設定
$VERCEL_URL = "https://cryptotradeacademy.vercel.app"

# CRON_SECRETを設定（Vercel Dashboardから取得）
$CRON_SECRET = "9bbaadd14244949f1647185d88f48fdefff61c3531b3c0f325951edafe69e359"

# 確認
Write-Host "Vercel URL: $VERCEL_URL" -ForegroundColor Cyan
Write-Host "CRON_SECRET: $($CRON_SECRET.Substring(0, 20))..." -ForegroundColor Cyan
```

---

### Step 2: 修正されたエンドポイントのテスト（優先度: 高）

#### テスト 1: `/api/x-quote-repost-en` - `kv is not defined`エラー修正確認

```powershell
Write-Host "`n🔍 テスト 1: 引用リポスト（EN） - kv is not definedエラー修正確認" -ForegroundColor Green
curl.exe -X GET "$VERCEL_URL/api/x-quote-repost-en" `
  -H "Authorization: Bearer $CRON_SECRET" `
  -H "Content-Type: application/json" `
  -v
```

**確認ポイント**:
- ✅ HTTPステータス: 200 OK
- ✅ `kv is not defined`エラーが発生しない
- ✅ `success: true`が返される（ドライランモード）
- ✅ `dry_run_count`が含まれる

**期待されるレスポンス**:
```json
{
  "success": true,
  "lang": "en",
  "results": [
    {
      "success": true,
      "dryRun": true,
      ...
    }
  ],
  "metrics": {
    "success_count": 0,
    "dry_run_count": 3,
    "total_count": 3,
    "posted_count": 0
  }
}
```

---

#### テスト 2: `/api/x-quote-repost-ko` - `kv is not defined`エラー修正確認

```powershell
Write-Host "`n🔍 テスト 2: 引用リポスト（KO） - kv is not definedエラー修正確認" -ForegroundColor Green
curl.exe -X GET "$VERCEL_URL/api/x-quote-repost-ko" `
  -H "Authorization: Bearer $CRON_SECRET" `
  -H "Content-Type: application/json" `
  -v
```

**確認ポイント**:
- ✅ HTTPステータス: 200 OK
- ✅ `kv is not defined`エラーが発生しない
- ✅ `success: true`が返される

---

#### テスト 3: `/api/x-quote-repost-ja` - `kv is not defined`エラー修正確認 + 504タイムアウト確認

```powershell
Write-Host "`n🔍 テスト 3: 引用リポスト（JA） - kv is not definedエラー修正確認 + 504タイムアウト確認" -ForegroundColor Green
curl.exe -X GET "$VERCEL_URL/api/x-quote-repost-ja" `
  -H "Authorization: Bearer $CRON_SECRET" `
  -H "Content-Type: application/json" `
  -v
```

**確認ポイント**:
- ✅ HTTPステータス: 200 OK（504タイムアウトが発生しない）
- ✅ `kv is not defined`エラーが発生しない
- ✅ `success: true`が返される
- ⚠️ 処理時間が60秒以内に完了する

---

### Step 3: `/api/cron`の再テスト（優先度: 高）

```powershell
Write-Host "`n🔍 テスト 4: Trap Defence BTC配信 - 500エラー修正確認" -ForegroundColor Green
curl.exe -X GET "$VERCEL_URL/api/cron?force=true" `
  -H "Authorization: Bearer $CRON_SECRET" `
  -H "Content-Type: application/json" `
  -v
```

**確認ポイント**:
- ✅ HTTPステータス: 200 OK（500エラーが発生しない）
- ✅ レスポンスに `success: true` が含まれる
- ✅ 6言語すべてで配信が試行される

---

### Step 4: その他の言語版のテスト（優先度: 中）

```powershell
# ES
Write-Host "`n🔍 テスト 5: 引用リポスト（ES）" -ForegroundColor Green
curl.exe -X GET "$VERCEL_URL/api/x-quote-repost-es" `
  -H "Authorization: Bearer $CRON_SECRET" `
  -H "Content-Type: application/json"

# PT-BR
Write-Host "`n🔍 テスト 6: 引用リポスト（PT-BR）" -ForegroundColor Green
curl.exe -X GET "$VERCEL_URL/api/x-quote-repost-pt-br" `
  -H "Authorization: Bearer $CRON_SECRET" `
  -H "Content-Type: application/json"

# AR
Write-Host "`n🔍 テスト 7: 引用リポスト（AR）" -ForegroundColor Green
curl.exe -X GET "$VERCEL_URL/api/x-quote-repost-ar" `
  -H "Authorization: Bearer $CRON_SECRET" `
  -H "Content-Type: application/json"
```

---

## 📋 一括テストスクリプト

すべてのテストを一括実行する場合：

```powershell
# 環境変数を設定
$VERCEL_URL = "https://cryptotradeacademy.vercel.app"
$CRON_SECRET = "9bbaadd14244949f1647185d88f48fdefff61c3531b3c0f325951edafe69e359"

Write-Host "🚀 修正後のテスト開始" -ForegroundColor Green
Write-Host "=" * 80

# テスト1: EN
Write-Host "`n[1/7] テスト: /api/x-quote-repost-en" -ForegroundColor Cyan
$response1 = curl.exe -X GET "$VERCEL_URL/api/x-quote-repost-en" `
  -H "Authorization: Bearer $CRON_SECRET" `
  -H "Content-Type: application/json" `
  -s -w "`nHTTP_STATUS:%{http_code}"
$status1 = ($response1 | Select-String -Pattern "HTTP_STATUS:(\d+)").Matches[0].Groups[1].Value
if ($status1 -eq "200") {
    Write-Host "  ✅ 成功 (HTTP $status1)" -ForegroundColor Green
} else {
    Write-Host "  ❌ 失敗 (HTTP $status1)" -ForegroundColor Red
}
Start-Sleep -Seconds 2

# テスト2: KO
Write-Host "`n[2/7] テスト: /api/x-quote-repost-ko" -ForegroundColor Cyan
$response2 = curl.exe -X GET "$VERCEL_URL/api/x-quote-repost-ko" `
  -H "Authorization: Bearer $CRON_SECRET" `
  -H "Content-Type: application/json" `
  -s -w "`nHTTP_STATUS:%{http_code}"
$status2 = ($response2 | Select-String -Pattern "HTTP_STATUS:(\d+)").Matches[0].Groups[1].Value
if ($status2 -eq "200") {
    Write-Host "  ✅ 成功 (HTTP $status2)" -ForegroundColor Green
} else {
    Write-Host "  ❌ 失敗 (HTTP $status2)" -ForegroundColor Red
}
Start-Sleep -Seconds 2

# テスト3: JA
Write-Host "`n[3/7] テスト: /api/x-quote-repost-ja" -ForegroundColor Cyan
$response3 = curl.exe -X GET "$VERCEL_URL/api/x-quote-repost-ja" `
  -H "Authorization: Bearer $CRON_SECRET" `
  -H "Content-Type: application/json" `
  -s -w "`nHTTP_STATUS:%{http_code}"
$status3 = ($response3 | Select-String -Pattern "HTTP_STATUS:(\d+)").Matches[0].Groups[1].Value
if ($status3 -eq "200") {
    Write-Host "  ✅ 成功 (HTTP $status3)" -ForegroundColor Green
} elseif ($status3 -eq "504") {
    Write-Host "  ⚠️  タイムアウト (HTTP $status3)" -ForegroundColor Yellow
} else {
    Write-Host "  ❌ 失敗 (HTTP $status3)" -ForegroundColor Red
}
Start-Sleep -Seconds 2

# テスト4: CRON
Write-Host "`n[4/7] テスト: /api/cron" -ForegroundColor Cyan
$response4 = curl.exe -X GET "$VERCEL_URL/api/cron?force=true" `
  -H "Authorization: Bearer $CRON_SECRET" `
  -H "Content-Type: application/json" `
  -s -w "`nHTTP_STATUS:%{http_code}"
$status4 = ($response4 | Select-String -Pattern "HTTP_STATUS:(\d+)").Matches[0].Groups[1].Value
if ($status4 -eq "200") {
    Write-Host "  ✅ 成功 (HTTP $status4)" -ForegroundColor Green
} else {
    Write-Host "  ❌ 失敗 (HTTP $status4)" -ForegroundColor Red
}
Start-Sleep -Seconds 2

# テスト5-7: その他の言語
$langs = @("es", "pt-br", "ar")
$testNum = 5
foreach ($lang in $langs) {
    Write-Host "`n[$testNum/7] テスト: /api/x-quote-repost-$lang" -ForegroundColor Cyan
    $response = curl.exe -X GET "$VERCEL_URL/api/x-quote-repost-$lang" `
      -H "Authorization: Bearer $CRON_SECRET" `
      -H "Content-Type: application/json" `
      -s -w "`nHTTP_STATUS:%{http_code}"
    $status = ($response | Select-String -Pattern "HTTP_STATUS:(\d+)").Matches[0].Groups[1].Value
    if ($status -eq "200") {
        Write-Host "  ✅ 成功 (HTTP $status)" -ForegroundColor Green
    } else {
        Write-Host "  ❌ 失敗 (HTTP $status)" -ForegroundColor Red
    }
    Start-Sleep -Seconds 2
    $testNum++
}

Write-Host "`n" + "=" * 80
Write-Host "✅ テスト完了" -ForegroundColor Green
Write-Host "=" * 80
```

---

## 🔍 ログ確認方法

### Vercel Dashboardでログを確認

1. **Vercel Dashboard** → **Deployments** タブ
2. 最新のデプロイメント（`ed969f2`）をクリック
3. **Functions** タブ → 各APIエンドポイントのログを確認

### 確認すべきログ

#### ✅ 正常なログ
```
[Quote Repost] @vercel/kv not available: ... (KVが利用できない場合の警告 - 正常)
[Quote Repost] ✅ 完了: 0/3 投稿成功, 3/3 ドライラン成功
🧪 X dry-run enabled, skipping actual post
```

#### ❌ エラーログ（発生しないはず）
```
kv is not defined  ← このエラーが発生しないことを確認
Failed to generate text with Grok  ← このエラーが発生しないことを確認
```

---

## 📊 テスト結果記録

テスト実行後、以下の形式で結果を記録してください：

```markdown
## テスト実行結果

**実行日時**: 2026-01-30 HH:MM
**デプロイ**: ed969f2
**環境**: Production

### 結果サマリー
- 成功: X/7
- 失敗: Y/7
- 成功率: Z%

### 詳細結果
| テスト | ステータス | HTTP | 備考 |
|--------|----------|------|------|
| /api/x-quote-repost-en | ✅/❌ | 200/500 | kv is not definedエラー解消 |
| /api/x-quote-repost-ko | ✅/❌ | 200/500 | kv is not definedエラー解消 |
| /api/x-quote-repost-ja | ✅/❌ | 200/504 | kv is not definedエラー解消、タイムアウト確認 |
| /api/cron | ✅/❌ | 200/500 | 500エラー解消 |
| /api/x-quote-repost-es | ✅/❌ | 200/500 | - |
| /api/x-quote-repost-pt-br | ✅/❌ | 200/500 | - |
| /api/x-quote-repost-ar | ✅/❌ | 200/500 | - |

### 発見された問題
- なし / [問題の詳細]

### 次のステップ
- [ ] すべてのテストが成功したら本番環境移行準備
- [ ] エラーがあれば修正
```

---

## 🎯 推奨テスト順序

### 最短ルート（約5分）

1. **テスト1**: `/api/x-quote-repost-en` - `kv is not defined`エラー修正確認
2. **テスト4**: `/api/cron` - 500エラー修正確認

### 完全なテスト（約15分）

1. **テスト1-3**: EN, KO, JA（`kv is not defined`エラー修正確認）
2. **テスト4**: `/api/cron`（500エラー修正確認）
3. **テスト5-7**: ES, PT-BR, AR（その他の言語）

---

**最終更新**: 2026-01-30
