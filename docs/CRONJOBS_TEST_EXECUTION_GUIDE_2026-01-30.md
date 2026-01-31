# CronJobs テスト実行ガイド
**作成日**: 2026-01-30  
**目的**: すべてのCronJobsをドライランでテスト実行するための詳細手順

---

## 🎯 テスト目標

1. **すべてのCronJobsが正常に動作することを確認**
2. **ドライランモードで実際の投稿を行わずに動作を検証**
3. **バグがあれば修正**
4. **完全な挙動が確認できたら本番環境の投稿に臨む**

---

## 📋 事前準備

### Step 1: Vercel環境変数の設定

#### 1.1 Vercel Dashboardにアクセス
1. [Vercel Dashboard](https://vercel.com/dashboard) にログイン
2. プロジェクトを選択（例: `cryptotradeacademy`）

#### 1.2 ドライランモードを有効化
1. **Project Settings** → **Environment Variables** に移動
2. 以下の環境変数を設定または確認：

```bash
# X投稿関連のドライランを有効化（重要！）
X_POSTING_DRY_RUN=true

# その他の必須環境変数（既に設定済みのはず）
CRON_SECRET=9bbaadd14244949f1647185d88f48fdefff61c3531b3c0f325951edafe69e359
XAI_API_KEY=xai-jxO7HGeeFcEguSmqMTvxUqijZHnRT3fAP50iaDQnOzRE2aY1q86bNJLfMKxD18RMclcIoue426vV6vii
# ... その他の環境変数
```

**重要**: `X_POSTING_DRY_RUN=true` を設定しないと、実際にXに投稿されてしまいます！

#### 1.3 環境変数の適用
- **Environment**: Production, Preview, Development すべてに設定
- **Save** をクリック
- 必要に応じて再デプロイを実行

---

### Step 2: Vercel URLの確認

#### 2.1 デプロイURLを確認
1. Vercel Dashboard → **Deployments** タブ
2. 最新のデプロイメントのURLを確認
   - 例: `https://cryptotradeacademy.vercel.app`
   - または: `https://cryptotradeacademy-xxx.vercel.app`

#### 2.2 環境変数から取得（推奨）
```bash
# PowerShell
$VERCEL_URL = $env:VERCEL_URL
# または
$VERCEL_URL = "https://cryptotradeacademy.vercel.app"
```

---

### Step 3: CRON_SECRETの確認

```bash
# PowerShell
$CRON_SECRET = "9bbaadd14244949f1647185d88f48fdefff61c3531b3c0f325951edafe69e359"
```

---

## 🚀 テスト実行手順

### Phase 1: Trap Defence BTC配信（有料版・無料版）

#### テスト 1: `/api/cron` - 定期配信・緊急配信

**実行コマンド**:
```powershell
# PowerShell
$VERCEL_URL = "https://cryptotradeacademy.vercel.app"
$CRON_SECRET = "9bbaadd14244949f1647185d88f48fdefff61c3531b3c0f325951edafe69e359"

curl.exe -X GET "$VERCEL_URL/api/cron?force=true" `
  -H "Authorization: Bearer $CRON_SECRET" `
  -H "Content-Type: application/json"
```

**確認項目**:
- [ ] HTTPステータス: 200 OK
- [ ] レスポンスに `success: true` が含まれる
- [ ] ログに「REGULAR」または「EMERGENCY」が表示される
- [ ] 6言語すべてで配信が試行される
- [ ] エラーメッセージが表示されない

**期待されるレスポンス例**:
```json
{
  "success": true,
  "message": "Regular briefing sent",
  "languages": ["en", "es", "pt-br", "ar", "ja", "ko"],
  "sent": 6
}
```

**推定時間**: 10分

---

### Phase 2: X投稿関連（10件）

#### テスト 2: `/api/vsl1-post` - VSL1自動投稿

**実行コマンド**:
```powershell
curl.exe -X GET "$VERCEL_URL/api/vsl1-post" `
  -H "Authorization: Bearer $CRON_SECRET" `
  -H "Content-Type: application/json"
```

**確認項目**:
- [ ] HTTPステータス: 200 OK
- [ ] レスポンスに `dryRun: true` が含まれる
- [ ] ログに「🧪 X dry-run enabled」が表示される
- [ ] 6言語すべてで投稿テキストが生成される
- [ ] VSL1リンクが正しく含まれる
- [ ] エラーが発生しない

**推定時間**: 5分

---

#### テスト 3: `/api/x-post-minimal-version-cron` - 無料版X投稿

**実行コマンド**:
```powershell
curl.exe -X GET "$VERCEL_URL/api/x-post-minimal-version-cron" `
  -H "Authorization: Bearer $CRON_SECRET" `
  -H "Content-Type: application/json"
```

**確認項目**:
- [ ] HTTPステータス: 200 OK
- [ ] レスポンスに `dryRun: true` が含まれる
- [ ] ログに「🧪 X dry-run enabled」が表示される
- [ ] 6言語すべてで投稿テキストが生成される
- [ ] Whop Minimal Versionチェックアウトリンクが正しく含まれる
- [ ] UTMパラメータが正しく付与される
- [ ] エラーが発生しない

**推定時間**: 5分

---

#### テスト 4: `/api/x-post-free-report` - 無料版レポートX投稿

**実行コマンド**:
```powershell
curl.exe -X GET "$VERCEL_URL/api/x-post-free-report" `
  -H "Authorization: Bearer $CRON_SECRET" `
  -H "Content-Type: application/json"
```

**確認項目**:
- [ ] HTTPステータス: 200 OK
- [ ] レスポンスに `dryRun: true` が含まれる
- [ ] ログに「🧪 X dry-run enabled」が表示される
- [ ] 6言語すべてで投稿テキストが生成される
- [ ] 市場データが正しく取得される
- [ ] エラーが発生しない

**推定時間**: 5分

---

#### テスト 5-10: `/api/x-quote-repost-{lang}` - 引用リポスト自動化（6言語）

**実行コマンド（EN）**:
```powershell
curl.exe -X GET "$VERCEL_URL/api/x-quote-repost-en" `
  -H "Authorization: Bearer $CRON_SECRET" `
  -H "Content-Type: application/json"
```

**実行コマンド（ES）**:
```powershell
curl.exe -X GET "$VERCEL_URL/api/x-quote-repost-es" `
  -H "Authorization: Bearer $CRON_SECRET" `
  -H "Content-Type: application/json"
```

**実行コマンド（PT-BR）**:
```powershell
curl.exe -X GET "$VERCEL_URL/api/x-quote-repost-pt-br" `
  -H "Authorization: Bearer $CRON_SECRET" `
  -H "Content-Type: application/json"
```

**実行コマンド（AR）**:
```powershell
curl.exe -X GET "$VERCEL_URL/api/x-quote-repost-ar" `
  -H "Authorization: Bearer $CRON_SECRET" `
  -H "Content-Type: application/json"
```

**実行コマンド（JA）**:
```powershell
curl.exe -X GET "$VERCEL_URL/api/x-quote-repost-ja" `
  -H "Authorization: Bearer $CRON_SECRET" `
  -H "Content-Type: application/json"
```

**実行コマンド（KO）**:
```powershell
curl.exe -X GET "$VERCEL_URL/api/x-quote-repost-ko" `
  -H "Authorization: Bearer $CRON_SECRET" `
  -H "Content-Type: application/json"
```

**確認項目（各言語共通）**:
- [ ] HTTPステータス: 200 OK
- [ ] レスポンスに `dryRun: true` が含まれる
- [ ] ログに「🧪 DRY RUN MODE」が表示される
- [ ] インフルエンサーが正しく選択される
- [ ] ローテーションが正しく動作する
- [ ] クールダウンが正しく機能する（EN: 6時間、その他: 8時間）
- [ ] 市場データが正しく統合される
- [ ] 引用リポストテキストが正しく生成される
- [ ] Whop Minimal Versionチェックアウトリンクが正しく含まれる
- [ ] UTMパラメータが正しく付与される
- [ ] エラーが発生しない

**推定時間**: 各言語5分 × 6言語 = 30分

---

### Phase 3: TG DM関連（3件）

#### テスト 11: `/api/vsl2-free-users` - VSL2自動配信

**実行コマンド**:
```powershell
curl.exe -X GET "$VERCEL_URL/api/vsl2-free-users" `
  -H "Authorization: Bearer $CRON_SECRET" `
  -H "Content-Type: application/json"
```

**確認項目**:
- [ ] HTTPステータス: 200 OK
- [ ] 無料版ユーザーが正しく取得される
- [ ] 24時間経過したユーザーに配信される
- [ ] VSL2メッセージが正しく生成される
- [ ] 6言語すべてで配信される
- [ ] エラーが発生しない

**推定時間**: 5分

---

#### テスト 12: `/api/vsl1-reminder` - VSL1リマインド

**実行コマンド**:
```powershell
curl.exe -X GET "$VERCEL_URL/api/vsl1-reminder" `
  -H "Authorization: Bearer $CRON_SECRET" `
  -H "Content-Type: application/json"
```

**確認項目**:
- [ ] HTTPステータス: 200 OK
- [ ] 無料版ユーザーが正しく取得される
- [ ] 12時間経過したユーザーに配信される
- [ ] VSL1リマインドメッセージが正しく生成される
- [ ] 6言語すべてで配信される
- [ ] エラーが発生しない

**推定時間**: 5分

---

#### テスト 13: `/api/vsl2-last-call` - VSL2終了直前リマインド

**実行コマンド**:
```powershell
curl.exe -X GET "$VERCEL_URL/api/vsl2-last-call" `
  -H "Authorization: Bearer $CRON_SECRET" `
  -H "Content-Type: application/json"
```

**確認項目**:
- [ ] HTTPステータス: 200 OK
- [ ] 無料版ユーザーが正しく取得される
- [ ] 21時間経過したユーザーに配信される
- [ ] VSL2終了直前リマインドメッセージが正しく生成される
- [ ] 6言語すべてで配信される
- [ ] エラーが発生しない

**推定時間**: 5分

---

### Phase 4: その他（1件）

#### テスト 14: `/api/promo-stock-monitor` - プロモコード在庫監視

**実行コマンド**:
```powershell
curl.exe -X GET "$VERCEL_URL/api/promo-stock-monitor" `
  -H "Authorization: Bearer $CRON_SECRET" `
  -H "Content-Type: application/json"
```

**確認項目**:
- [ ] HTTPステータス: 200 OK
- [ ] プロモコード在庫が正しく取得される
- [ ] 在庫不足のアラートが正しく動作する
- [ ] エラーが発生しない

**推定時間**: 5分

---

## 📝 一括テスト実行スクリプト

### PowerShellスクリプト（推奨）

以下のスクリプトを `test-all-cronjobs.ps1` として保存：

```powershell
# test-all-cronjobs.ps1
# すべてのCronJobsを一括テスト実行

$VERCEL_URL = "https://cryptotradeacademy.vercel.app"
$CRON_SECRET = "9bbaadd14244949f1647185d88f48fdefff61c3531b3c0f325951edafe69e359"

$endpoints = @(
    @{ path = "/api/cron?force=true"; name = "Trap Defence BTC配信" },
    @{ path = "/api/vsl1-post"; name = "VSL1自動投稿" },
    @{ path = "/api/x-post-minimal-version-cron"; name = "無料版X投稿" },
    @{ path = "/api/x-post-free-report"; name = "無料版レポートX投稿" },
    @{ path = "/api/x-quote-repost-en"; name = "引用リポスト EN" },
    @{ path = "/api/x-quote-repost-es"; name = "引用リポスト ES" },
    @{ path = "/api/x-quote-repost-pt-br"; name = "引用リポスト PT-BR" },
    @{ path = "/api/x-quote-repost-ar"; name = "引用リポスト AR" },
    @{ path = "/api/x-quote-repost-ja"; name = "引用リポスト JA" },
    @{ path = "/api/x-quote-repost-ko"; name = "引用リポスト KO" },
    @{ path = "/api/vsl2-free-users"; name = "VSL2自動配信" },
    @{ path = "/api/vsl1-reminder"; name = "VSL1リマインド" },
    @{ path = "/api/vsl2-last-call"; name = "VSL2終了直前リマインド" },
    @{ path = "/api/promo-stock-monitor"; name = "プロモコード在庫監視" }
)

Write-Host "🚀 CronJobs 一括テスト開始" -ForegroundColor Green
Write-Host "=" * 80

$results = @()

foreach ($endpoint in $endpoints) {
    Write-Host "`n🔍 テスト実行: $($endpoint.name)" -ForegroundColor Cyan
    Write-Host "   URL: $VERCEL_URL$($endpoint.path)"
    
    try {
        $response = curl.exe -X GET "$VERCEL_URL$($endpoint.path)" `
            -H "Authorization: Bearer $CRON_SECRET" `
            -H "Content-Type: application/json" `
            -s -w "`nHTTP_STATUS:%{http_code}"
        
        $statusMatch = $response | Select-String -Pattern "HTTP_STATUS:(\d+)"
        $httpStatus = if ($statusMatch) { $statusMatch.Matches[0].Groups[1].Value } else { "unknown" }
        
        if ($httpStatus -eq "200") {
            Write-Host "   ✅ 成功 (HTTP $httpStatus)" -ForegroundColor Green
            $results += @{ name = $endpoint.name; status = "✅ 成功"; httpStatus = $httpStatus }
        } else {
            Write-Host "   ⚠️  警告 (HTTP $httpStatus)" -ForegroundColor Yellow
            $results += @{ name = $endpoint.name; status = "⚠️  警告"; httpStatus = $httpStatus }
        }
        
        # レート制限対策（1秒待機）
        Start-Sleep -Seconds 1
    } catch {
        Write-Host "   ❌ エラー: $_" -ForegroundColor Red
        $results += @{ name = $endpoint.name; status = "❌ エラー"; error = $_.ToString() }
    }
}

Write-Host "`n" + "=" * 80
Write-Host "📊 テスト結果サマリー" -ForegroundColor Green
Write-Host "=" * 80

foreach ($result in $results) {
    Write-Host "$($result.status) $($result.name) (HTTP $($result.httpStatus))"
}

$successCount = ($results | Where-Object { $_.status -eq "✅ 成功" }).Count
$totalCount = $results.Count

Write-Host "`n合計: $successCount/$totalCount 成功" -ForegroundColor $(if ($successCount -eq $totalCount) { "Green" } else { "Yellow" })
```

**実行方法**:
```powershell
# PowerShellで実行
.\test-all-cronjobs.ps1
```

---

## 🔍 ログ確認方法

### Vercel Dashboardでログを確認

1. **Vercel Dashboard** → **Deployments** タブ
2. 最新のデプロイメントをクリック
3. **Functions** タブ → 各APIエンドポイントのログを確認

### ログで確認すべき項目

#### ✅ 正常なログ
- `🧪 X dry-run enabled` - ドライランモードが有効
- `✅ Selected X influencers` - インフルエンサー選択成功
- `✅ Generated quote repost text` - テキスト生成成功
- `[REGULAR] Processing language: en` - 言語別処理開始

#### ⚠️ 警告ログ
- `⚠️ Skipping @username: in cooldown` - クールダウン中（正常）
- `⚠️ No influencers available` - インフルエンサー不足（確認必要）

#### ❌ エラーログ
- `❌ Error:` - エラー発生（修正必要）
- `Failed to` - 失敗（修正必要）

---

## 📊 テスト結果記録

### テスト結果テンプレート

```markdown
## テスト実行結果

**実行日時**: YYYY-MM-DD HH:MM
**実行者**: [名前]
**環境**: Production / Preview / Development

### Phase 1: Trap Defence BTC配信
- [ ] `/api/cron` - ✅ 成功 / ❌ 失敗
  - HTTPステータス: 200
  - エラー: なし
  - 備考: 

### Phase 2: X投稿関連
- [ ] `/api/vsl1-post` - ✅ 成功 / ❌ 失敗
- [ ] `/api/x-post-minimal-version-cron` - ✅ 成功 / ❌ 失敗
- [ ] `/api/x-post-free-report` - ✅ 成功 / ❌ 失敗
- [ ] `/api/x-quote-repost-en` - ✅ 成功 / ❌ 失敗
- [ ] `/api/x-quote-repost-es` - ✅ 成功 / ❌ 失敗
- [ ] `/api/x-quote-repost-pt-br` - ✅ 成功 / ❌ 失敗
- [ ] `/api/x-quote-repost-ar` - ✅ 成功 / ❌ 失敗
- [ ] `/api/x-quote-repost-ja` - ✅ 成功 / ❌ 失敗
- [ ] `/api/x-quote-repost-ko` - ✅ 成功 / ❌ 失敗

### Phase 3: TG DM関連
- [ ] `/api/vsl2-free-users` - ✅ 成功 / ❌ 失敗
- [ ] `/api/vsl1-reminder` - ✅ 成功 / ❌ 失敗
- [ ] `/api/vsl2-last-call` - ✅ 成功 / ❌ 失敗

### Phase 4: その他
- [ ] `/api/promo-stock-monitor` - ✅ 成功 / ❌ 失敗

### 発見されたバグ
- なし / [バグの詳細]

### 次のステップ
- [ ] バグ修正
- [ ] 再テスト
- [ ] 本番環境移行準備
```

---

## 🐛 トラブルシューティング

### 問題 1: 401 Unauthorized

**原因**: CRON_SECRETが正しく設定されていない、または間違っている

**解決方法**:
1. Vercel Dashboardで `CRON_SECRET` を確認
2. コマンドの `Bearer` トークンを確認
3. 環境変数が正しくデプロイされているか確認

---

### 問題 2: 500 Internal Server Error

**原因**: コードエラー、環境変数不足、API接続エラー

**解決方法**:
1. Vercel Dashboardのログを確認
2. エラーメッセージを確認
3. 環境変数がすべて設定されているか確認
4. 外部API（X API、Grok APIなど）の接続を確認

---

### 問題 3: ドライランモードが有効にならない

**原因**: `X_POSTING_DRY_RUN` が `true` に設定されていない

**解決方法**:
1. Vercel Dashboardで `X_POSTING_DRY_RUN=true` を確認
2. 環境変数を再デプロイ
3. ログに「🧪 X dry-run enabled」が表示されるか確認

---

### 問題 4: インフルエンサーが選択されない

**原因**: インフルエンサーデータが読み込まれていない、またはクールダウン中

**解決方法**:
1. `data/influencers/influencers-{lang}.json` ファイルが存在するか確認
2. ファイルの内容が正しいか確認
3. ログでクールダウン状況を確認

---

## ✅ チェックリスト

### 事前準備
- [ ] Vercel環境変数に `X_POSTING_DRY_RUN=true` を設定
- [ ] すべてのAPIキーとシークレットが正しく設定されている
- [ ] インフルエンサーデータが正しく読み込まれる
- [ ] Whopチェックアウトリンクが正しく設定されている
- [ ] Vercel URLを確認

### テスト実行
- [ ] Phase 1: Trap Defence BTC配信テスト完了
- [ ] Phase 2: X投稿関連テスト完了（10件）
- [ ] Phase 3: TG DM関連テスト完了（3件）
- [ ] Phase 4: その他テスト完了（1件）

### バグ修正
- [ ] 発見されたバグをすべて修正
- [ ] 修正後の再テストを完了
- [ ] エラーログを確認

### 本番移行
- [ ] すべてのテストが成功
- [ ] エラーが発生しないことを確認
- [ ] 環境変数を `X_POSTING_DRY_RUN=false` に変更
- [ ] 本番環境での初回実行を確認

---

## 🎯 次のステップ

1. **環境変数設定**: Vercelで `X_POSTING_DRY_RUN=true` を設定
2. **テスト実行**: 上記手順に従ってテストを実行
3. **バグ修正**: 発見されたバグを修正
4. **再テスト**: 修正後の再テストを実行
5. **本番移行**: すべてのテストが成功したら `X_POSTING_DRY_RUN=false` に変更

---

**最終更新**: 2026-01-30
