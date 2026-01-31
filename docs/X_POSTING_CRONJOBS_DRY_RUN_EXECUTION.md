# X投稿CronJobs ドライラン実行ガイド
**作成日**: 2026-01-31  
**目的**: X投稿関連のCronJobsをすべてドライランで正常に動作させる

---

## 🎯 実行対象

以下の9つのX投稿関連CronJobsをドライランで実行します：

1. `/api/vsl1-post` - VSL1自動投稿
2. `/api/x-post-minimal-version-cron` - 無料版X投稿
3. `/api/x-post-free-report` - 無料版レポートX投稿
4. `/api/x-quote-repost-en` - 引用リポスト（英語）
5. `/api/x-quote-repost-es` - 引用リポスト（スペイン語）
6. `/api/x-quote-repost-pt-br` - 引用リポスト（ポルトガル語）
7. `/api/x-quote-repost-ar` - 引用リポスト（アラビア語）
8. `/api/x-quote-repost-ja` - 引用リポスト（日本語）
9. `/api/x-quote-repost-ko` - 引用リポスト（韓国語）

---

## 📋 事前準備

### Step 1: 環境変数の確認

#### Vercel Dashboardでの確認

Vercel Dashboardで以下の環境変数が設定されているか確認してください：

1. **Vercel Dashboard** → **Project Settings** → **Environment Variables**
2. 以下の環境変数を確認：
   - `X_POSTING_DRY_RUN=true` （重要！これがないと実際に投稿されます）
   - `CRON_SECRET=9bbaadd14244949f1647185d88f48fdefff61c3531b3c0f325951edafe69e359`
   - その他の必須環境変数（XAI_API_KEY、GEMINI_API_KEYなど）

3. 環境変数を変更した場合は、**再デプロイ**が必要な場合があります

#### ローカル.envファイルの確認

スクリプトは以下のパスから`.env`ファイルを自動的に読み込みます：

- `C:/Users/chiba/Downloads/.env` （共有されたファイル）
- `C:/Users/chiba/hadayalab-automation-platform/.env`
- プロジェクトルートの`.env`

**注意**: ローカルの`.env`ファイルの`X_POSTING_DRY_RUN=false`は問題ありません。Vercel Dashboardの設定が優先されます。

---

## 🚀 実行方法

### 方法1: Node.jsスクリプトを使用（推奨）

```bash
# プロジェクトルートで実行
node scripts/test-x-posting-cronjobs.js
```

### 方法2: PowerShellスクリプトを使用

```powershell
# PowerShellで実行
.\scripts\test-x-posting-cronjobs.ps1
```

### 方法3: 個別にcurlコマンドを実行

```powershell
# 環境変数を設定
$VERCEL_URL = "https://cryptotradeacademy.vercel.app"
$CRON_SECRET = "9bbaadd14244949f1647185d88f48fdefff61c3531b3c0f325951edafe69e359"

# 1. VSL1自動投稿
curl.exe -X GET "$VERCEL_URL/api/vsl1-post" `
  -H "Authorization: Bearer $CRON_SECRET" `
  -H "Content-Type: application/json"

# 2. 無料版X投稿
curl.exe -X GET "$VERCEL_URL/api/x-post-minimal-version-cron" `
  -H "Authorization: Bearer $CRON_SECRET" `
  -H "Content-Type: application/json"

# 3. 無料版レポートX投稿
curl.exe -X GET "$VERCEL_URL/api/x-post-free-report" `
  -H "Authorization: Bearer $CRON_SECRET" `
  -H "Content-Type: application/json"

# 4. 引用リポスト EN
curl.exe -X GET "$VERCEL_URL/api/x-quote-repost-en" `
  -H "Authorization: Bearer $CRON_SECRET" `
  -H "Content-Type: application/json"

# 5. 引用リポスト ES
curl.exe -X GET "$VERCEL_URL/api/x-quote-repost-es" `
  -H "Authorization: Bearer $CRON_SECRET" `
  -H "Content-Type: application/json"

# 6. 引用リポスト PT-BR
curl.exe -X GET "$VERCEL_URL/api/x-quote-repost-pt-br" `
  -H "Authorization: Bearer $CRON_SECRET" `
  -H "Content-Type: application/json"

# 7. 引用リポスト AR
curl.exe -X GET "$VERCEL_URL/api/x-quote-repost-ar" `
  -H "Authorization: Bearer $CRON_SECRET" `
  -H "Content-Type: application/json"

# 8. 引用リポスト JA
curl.exe -X GET "$VERCEL_URL/api/x-quote-repost-ja" `
  -H "Authorization: Bearer $CRON_SECRET" `
  -H "Content-Type: application/json"

# 9. 引用リポスト KO
curl.exe -X GET "$VERCEL_URL/api/x-quote-repost-ko" `
  -H "Authorization: Bearer $CRON_SECRET" `
  -H "Content-Type: application/json"
```

---

## ✅ 確認すべきポイント

### 1. HTTPステータスコード

すべてのエンドポイントで **HTTP 200** が返されることを確認してください。

### 2. ドライランモードの確認

レスポンスに以下のいずれかが含まれていることを確認してください：

```json
{
  "success": true,
  "dryRun": true,
  "message": "Dry run mode enabled - no posts will be made"
}
```

または、ログに以下のメッセージが表示されることを確認：

```
🧪 X dry-run enabled, skipping actual post
🧪 DRY RUN MODE - No actual posts will be made
```

### 3. エラーの確認

以下のエラーが発生していないことを確認：

- ❌ `401 Unauthorized` - CRON_SECRETが間違っている
- ❌ `500 Internal Server Error` - コードエラーまたは環境変数不足
- ❌ `Timeout` - API呼び出しのタイムアウト

---

## 📊 期待される結果

### 正常な実行結果

すべてのエンドポイントで以下のような結果が返されます：

```
✅ 成功 (HTTP 200, X秒)
🧪 ドライランモード: 有効
```

### 結果サマリー

```
合計: 9/9 成功 (100%)
ドライランモード: 9/9 有効

🎉 すべてのX投稿CronJobsが正常に動作し、ドライランモードが有効です！
```

---

## 🔍 ログ確認方法

### Vercel Dashboardでログを確認

1. **Vercel Dashboard** → **Deployments** タブ
2. 最新のデプロイメントをクリック
3. **Functions** タブ → 各APIエンドポイントのログを確認

### 確認すべきログメッセージ

#### ✅ 正常なログ

- `🧪 X dry-run enabled` - ドライランモードが有効
- `✅ Selected X influencers` - インフルエンサー選択成功
- `✅ Generated quote repost text` - テキスト生成成功
- `[REGULAR] Processing language: en` - 言語別処理開始

#### ⚠️ 警告ログ（正常な場合もある）

- `⚠️ Skipping @username: in cooldown` - クールダウン中（正常）
- `⚠️ No influencers available` - インフルエンサー不足（確認必要）

#### ❌ エラーログ（修正必要）

- `❌ Error:` - エラー発生
- `Failed to` - 失敗

---

## 🐛 トラブルシューティング

### 問題1: 401 Unauthorized

**原因**: CRON_SECRETが正しく設定されていない、または間違っている

**解決方法**:
1. Vercel Dashboardで `CRON_SECRET` を確認
2. コマンドの `Bearer` トークンを確認
3. 環境変数が正しくデプロイされているか確認

### 問題2: 500 Internal Server Error

**原因**: コードエラー、環境変数不足、API接続エラー

**解決方法**:
1. Vercel Dashboardのログを確認
2. エラーメッセージを確認
3. 環境変数がすべて設定されているか確認
4. 外部API（X API、Grok APIなど）の接続を確認

### 問題3: ドライランモードが有効にならない

**原因**: `X_POSTING_DRY_RUN` が `true` に設定されていない

**解決方法**:
1. Vercel Dashboardで `X_POSTING_DRY_RUN=true` を確認
2. 環境変数を再デプロイ
3. ログに「🧪 X dry-run enabled」が表示されるか確認

### 問題4: インフルエンサーが選択されない

**原因**: インフルエンサーデータが読み込まれていない、またはクールダウン中

**解決方法**:
1. `data/influencers/influencers-{lang}.json` ファイルが存在するか確認
2. ファイルの内容が正しいか確認
3. ログでクールダウン状況を確認

---

## 📝 テスト結果記録用テンプレート

```markdown
## X投稿CronJobs ドライランテスト結果

**実行日時**: 2026-01-31 HH:MM
**実行者**: [名前]
**環境**: Production / Preview / Development

### テスト結果

| CronJob | ステータス | HTTP | ドライラン | 備考 |
|---------|----------|------|-----------|------|
| /api/vsl1-post | ✅ | 200 | ✅ | - |
| /api/x-post-minimal-version-cron | ✅ | 200 | ✅ | - |
| /api/x-post-free-report | ✅ | 200 | ✅ | - |
| /api/x-quote-repost-en | ✅ | 200 | ✅ | - |
| /api/x-quote-repost-es | ✅ | 200 | ✅ | - |
| /api/x-quote-repost-pt-br | ✅ | 200 | ✅ | - |
| /api/x-quote-repost-ar | ✅ | 200 | ✅ | - |
| /api/x-quote-repost-ja | ✅ | 200 | ✅ | - |
| /api/x-quote-repost-ko | ✅ | 200 | ✅ | - |

### 結果サマリー
- 成功: 9/9
- ドライランモード有効: 9/9
- 成功率: 100%

### 発見された問題
- なし / [問題の詳細]

### 次のステップ
- [ ] バグ修正（問題がある場合）
- [ ] 再テスト（修正後）
- [ ] 本番環境移行準備（すべて成功した場合）
```

---

## 🎯 次のステップ

すべてのテストが成功し、ドライランモードが有効であることを確認したら：

1. **ログを再確認** - エラーや警告がないことを確認
2. **本番環境移行準備** - `X_POSTING_DRY_RUN=false` に変更する準備
3. **初回実行の監視** - 本番環境での初回実行を監視

---

**最終更新**: 2026-01-31
