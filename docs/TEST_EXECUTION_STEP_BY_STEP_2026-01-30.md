# テスト実行ステップバイステップガイド
**作成日**: 2026-01-30  
**目的**: 推奨される段階的なテスト実行手順

---

## 🎯 テスト実行の全体像

### 3段階アプローチ

1. **事前確認**（5分）- 環境変数と設定の確認
2. **優先度別テスト**（30-60分）- 重要度の高いCronJobから順にテスト
3. **一括テスト**（10分）- すべてのCronJobを自動テスト

---

## 📋 Step 1: 事前確認（必須）

### 1.1 環境変数の確認

**Vercel Dashboardで確認**:
1. https://vercel.com/dashboard にアクセス
2. プロジェクト `cryptotradeacademy` を選択
3. **Settings** → **Environment Variables**
4. 以下を確認：

```bash
✅ X_POSTING_DRY_RUN = true  # 重要！これが true でないと実際に投稿されます
✅ CRON_SECRET = [設定済み]
✅ XAI_API_KEY = [設定済み]
✅ その他の必須環境変数 = [設定済み]
```

**確認コマンド（PowerShell）**:
```powershell
# 環境変数が設定されているか確認（ローカル環境変数から）
$env:X_POSTING_DRY_RUN
$env:CRON_SECRET
```

### 1.2 Vercel URLの確認

**確認方法**:
1. Vercel Dashboard → **Deployments** タブ
2. 最新のデプロイメントのURLを確認
   - 例: `https://cryptotradeacademy.vercel.app`

**設定（PowerShell）**:
```powershell
$VERCEL_URL = "https://cryptotradeacademy.vercel.app"
```

### 1.3 CRON_SECRETの確認

**Vercel Dashboardから取得**:
- Settings → Environment Variables → `CRON_SECRET` の値を確認

**設定（PowerShell）**:
```powershell
$CRON_SECRET = "9bbaadd14244949f1647185d88f48fdefff61c3531b3c0f325951edafe69e359"
# または環境変数から
$CRON_SECRET = $env:CRON_SECRET
```

---

## 🚀 Step 2: 優先度別テスト（推奨）

### Phase 1: 最重要機能（最初にテスト）

#### テスト 1: `/api/cron` - Trap Defence BTC配信

**理由**: 最も重要な機能。6言語すべてで動作確認が必要。

**実行コマンド**:
```powershell
$VERCEL_URL = "https://cryptotradeacademy.vercel.app"
$CRON_SECRET = "9bbaadd14244949f1647185d88f48fdefff61c3531b3c0f325951edafe69e359"

curl.exe -X GET "$VERCEL_URL/api/cron?force=true" `
  -H "Authorization: Bearer $CRON_SECRET" `
  -H "Content-Type: application/json" `
  -v
```

**確認ポイント**:
- ✅ HTTPステータス: 200 OK
- ✅ レスポンスに `success: true` が含まれる
- ✅ 6言語すべてで配信が試行される
- ✅ Vercel Dashboardのログでエラーがないことを確認

**期待されるレスポンス**:
```json
{
  "success": true,
  "message": "Regular briefing sent",
  "languages": ["en", "es", "pt-br", "ar", "ja", "ko"],
  "sent": 6
}
```

**推定時間**: 5-10分（ログ確認含む）

---

#### テスト 2: `/api/x-quote-repost-en` - 引用リポスト（EN）

**理由**: X投稿の主要機能。ドライランモードの確認が重要。

**実行コマンド**:
```powershell
curl.exe -X GET "$VERCEL_URL/api/x-quote-repost-en" `
  -H "Authorization: Bearer $CRON_SECRET" `
  -H "Content-Type: application/json" `
  -v
```

**確認ポイント**:
- ✅ HTTPステータス: 200 OK
- ✅ レスポンスに `dryRun: true` が含まれる
- ✅ ログに「🧪 X dry-run enabled」が表示される
- ✅ インフルエンサーが正しく選択される
- ✅ 市場データが正しく統合される
- ✅ Whop Minimal Versionチェックアウトリンクが含まれる

**期待されるレスポンス**:
```json
{
  "success": true,
  "dryRun": true,
  "message": "Dry run mode enabled - no posts will be made",
  "lang": "en",
  "influencersSelected": 5,
  "postsGenerated": 5
}
```

**推定時間**: 5分

---

### Phase 2: X投稿関連（残り5言語）

#### テスト 3-7: `/api/x-quote-repost-{lang}` (ES, PT-BR, AR, JA, KO)

**実行コマンド（各言語）**:
```powershell
# ES
curl.exe -X GET "$VERCEL_URL/api/x-quote-repost-es" `
  -H "Authorization: Bearer $CRON_SECRET" `
  -H "Content-Type: application/json"

# PT-BR
curl.exe -X GET "$VERCEL_URL/api/x-quote-repost-pt-br" `
  -H "Authorization: Bearer $CRON_SECRET" `
  -H "Content-Type: application/json"

# AR
curl.exe -X GET "$VERCEL_URL/api/x-quote-repost-ar" `
  -H "Authorization: Bearer $CRON_SECRET" `
  -H "Content-Type: application/json"

# JA
curl.exe -X GET "$VERCEL_URL/api/x-quote-repost-ja" `
  -H "Authorization: Bearer $CRON_SECRET" `
  -H "Content-Type: application/json"

# KO
curl.exe -X GET "$VERCEL_URL/api/x-quote-repost-ko" `
  -H "Authorization: Bearer $CRON_SECRET" `
  -H "Content-Type: application/json"
```

**確認ポイント（各言語共通）**:
- ✅ HTTPステータス: 200 OK
- ✅ `dryRun: true` が含まれる
- ✅ インフルエンサーが正しく選択される
- ✅ エラーが発生しない

**推定時間**: 各言語3-5分 × 5言語 = 15-25分

---

### Phase 3: その他のX投稿機能

#### テスト 8: `/api/vsl1-post` - VSL1自動投稿

**実行コマンド**:
```powershell
curl.exe -X GET "$VERCEL_URL/api/vsl1-post" `
  -H "Authorization: Bearer $CRON_SECRET" `
  -H "Content-Type: application/json"
```

**確認ポイント**:
- ✅ HTTPステータス: 200 OK
- ✅ `dryRun: true` が含まれる
- ✅ VSL1リンクが正しく含まれる

**推定時間**: 3分

---

#### テスト 9: `/api/x-post-minimal-version-cron` - 無料版X投稿

**実行コマンド**:
```powershell
curl.exe -X GET "$VERCEL_URL/api/x-post-minimal-version-cron" `
  -H "Authorization: Bearer $CRON_SECRET" `
  -H "Content-Type: application/json"
```

**確認ポイント**:
- ✅ HTTPステータス: 200 OK
- ✅ `dryRun: true` が含まれる
- ✅ Whop Minimal Versionチェックアウトリンクが含まれる

**推定時間**: 3分

---

#### テスト 10: `/api/x-post-free-report` - 無料版レポートX投稿

**実行コマンド**:
```powershell
curl.exe -X GET "$VERCEL_URL/api/x-post-free-report" `
  -H "Authorization: Bearer $CRON_SECRET" `
  -H "Content-Type: application/json"
```

**確認ポイント**:
- ✅ HTTPステータス: 200 OK
- ✅ `dryRun: true` が含まれる
- ✅ 市場データが正しく取得される

**推定時間**: 3分

---

### Phase 4: TG DM関連（オプション）

#### テスト 11-13: TG DM関連（3件）

**実行コマンド**:
```powershell
# VSL2自動配信
curl.exe -X GET "$VERCEL_URL/api/vsl2-free-users" `
  -H "Authorization: Bearer $CRON_SECRET" `
  -H "Content-Type: application/json"

# VSL1リマインド
curl.exe -X GET "$VERCEL_URL/api/vsl1-reminder" `
  -H "Authorization: Bearer $CRON_SECRET" `
  -H "Content-Type: application/json"

# VSL2終了直前リマインド
curl.exe -X GET "$VERCEL_URL/api/vsl2-last-call" `
  -H "Authorization: Bearer $CRON_SECRET" `
  -H "Content-Type: application/json"
```

**推定時間**: 各3分 × 3件 = 9分

---

#### テスト 14: `/api/promo-stock-monitor` - プロモコード在庫監視

**実行コマンド**:
```powershell
curl.exe -X GET "$VERCEL_URL/api/promo-stock-monitor" `
  -H "Authorization: Bearer $CRON_SECRET" `
  -H "Content-Type: application/json"
```

**推定時間**: 3分

---

## 🎯 Step 3: 一括テスト（推奨）

### 自動スクリプトを使用（最も効率的）

**実行コマンド**:
```powershell
# プロジェクトルートで実行
.\scripts\test-all-cronjobs.ps1
```

**カスタムURL/Secretを使用する場合**:
```powershell
.\scripts\test-all-cronjobs.ps1 `
  -VercelUrl "https://cryptotradeacademy.vercel.app" `
  -CronSecret "9bbaadd14244949f1647185d88f48fdefff61c3531b3c0f325951edafe69e359"
```

**スクリプトの動作**:
- ✅ 14件のCronJobを自動的に順次実行
- ✅ HTTPステータスコードを確認
- ✅ ドライランモードの確認（X投稿関連）
- ✅ 結果サマリーを表示
- ✅ Phase別に結果を整理

**推定時間**: 10-15分（すべてのCronJobを実行）

---

## 📊 Step 4: 結果確認とログ分析

### 4.1 Vercel Dashboardでログ確認

**手順**:
1. Vercel Dashboard → **Deployments** タブ
2. 最新のデプロイメントをクリック
3. **Functions** タブを開く
4. 各APIエンドポイントのログを確認

**確認すべきログ**:

#### ✅ 正常なログ
```
🧪 X dry-run enabled, skipping actual post
✅ Selected X influencers
✅ Generated quote repost text
[REGULAR] Processing language: en
```

#### ⚠️ 警告ログ（正常な場合もある）
```
⚠️ Skipping @username: in cooldown
⚠️ No influencers available (will retry next cycle)
```

#### ❌ エラーログ（修正が必要）
```
❌ Error: ...
Failed to ...
Cannot find ...
```

---

### 4.2 テスト結果の記録

**推奨フォーマット**:
```markdown
## テスト実行結果

**実行日時**: 2026-01-30 HH:MM
**実行者**: [名前]
**環境**: Production

### 結果サマリー
- 成功: X/14
- 失敗: Y/14
- 成功率: Z%

### 詳細結果
| CronJob | ステータス | HTTP | 備考 |
|---------|----------|------|------|
| /api/cron | ✅ | 200 | - |
| /api/x-quote-repost-en | ✅ | 200 | dryRun: true 確認済み |
| ... | ... | ... | ... |

### 発見された問題
- なし / [問題の詳細]

### 次のステップ
- [ ] バグ修正
- [ ] 再テスト
- [ ] 本番環境移行
```

---

## 🐛 Step 5: バグ修正（必要に応じて）

### よくある問題と解決方法

#### 問題 1: 401 Unauthorized

**原因**: CRON_SECRETが正しく設定されていない

**解決方法**:
1. Vercel Dashboardで `CRON_SECRET` を確認
2. コマンドの `Bearer` トークンが正しいか確認
3. 環境変数が正しくデプロイされているか確認

---

#### 問題 2: 500 Internal Server Error

**原因**: コードエラー、環境変数不足、API接続エラー

**解決方法**:
1. Vercel Dashboardのログを確認
2. エラーメッセージを確認
3. 環境変数がすべて設定されているか確認
4. 外部API（X API、Grok APIなど）の接続を確認

---

#### 問題 3: ドライランモードが有効にならない

**原因**: `X_POSTING_DRY_RUN` が `true` に設定されていない

**解決方法**:
1. Vercel Dashboardで `X_POSTING_DRY_RUN=true` を確認
2. 環境変数を再デプロイ
3. ログに「🧪 X dry-run enabled」が表示されるか確認

---

#### 問題 4: インフルエンサーが選択されない

**原因**: インフルエンサーデータが読み込まれていない、またはクールダウン中

**解決方法**:
1. `data/influencers/influencers-{lang}.json` ファイルが存在するか確認
2. ファイルの内容が正しいか確認
3. ログでクールダウン状況を確認

---

## ✅ Step 6: 本番環境移行準備

### すべてのテストが成功した場合

1. **ログを再確認**
   - エラーがないことを確認
   - 警告がないことを確認

2. **ドライランモードの確認**
   - すべてのX投稿で `dryRun: true` が表示されているか

3. **本番環境移行準備**
   - `X_POSTING_DRY_RUN=false` に変更する準備
   - 初回実行時の監視準備

---

## 🎯 推奨実行順序（まとめ）

### 最短ルート（約30分）

1. **事前確認**（5分）
   - 環境変数確認
   - Vercel URL確認

2. **最重要テスト**（10分）
   - `/api/cron` テスト
   - `/api/x-quote-repost-en` テスト

3. **一括テスト**（15分）
   - `.\scripts\test-all-cronjobs.ps1` を実行

4. **結果確認**（5分）
   - Vercel Dashboardでログ確認
   - エラーがないことを確認

**合計**: 約35分

---

### 完全なテスト（約60分）

1. **事前確認**（5分）
2. **優先度別テスト**（45分）
   - Phase 1: 最重要機能（15分）
   - Phase 2: X投稿関連（25分）
   - Phase 3: その他（5分）
3. **結果確認**（10分）

**合計**: 約60分

---

## 📝 次のステップ

### テスト完了後

1. **バグがあれば修正**
   - エラーログを確認
   - コードを修正
   - 再テスト

2. **すべてのテストが成功したら**
   - `X_POSTING_DRY_RUN=false` に変更
   - 本番環境での初回実行を監視

---

**最終更新**: 2026-01-30
