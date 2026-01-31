# CronJobs テスト実行 - クイックスタートガイド
**作成日**: 2026-01-30  
**目的**: テストをすぐに開始するための簡易手順

---

## 🚀 3ステップでテスト開始

### Step 1: 環境変数設定（5分）

1. **Vercel Dashboard** にアクセス
   - https://vercel.com/dashboard

2. **Project Settings** → **Environment Variables**

3. **`X_POSTING_DRY_RUN`** を設定
   - Key: `X_POSTING_DRY_RUN`
   - Value: `true`
   - Environment: Production, Preview, Development（すべて）

4. **Save** をクリック

5. **再デプロイ**（必要に応じて）
   - Deployments タブ → 最新デプロイメント → **Redeploy**

---

### Step 2: テストスクリプトの準備（2分）

#### オプション A: PowerShellスクリプトを使用（推奨）

1. **スクリプトを実行**:
   ```powershell
   # プロジェクトルートで実行
   .\scripts\test-all-cronjobs.ps1
   ```

2. **カスタムURL/Secretを使用する場合**:
   ```powershell
   .\scripts\test-all-cronjobs.ps1 -VercelUrl "https://your-app.vercel.app" -CronSecret "your-secret"
   ```

#### オプション B: 個別にcurlコマンドを実行

```powershell
# 環境変数を設定
$VERCEL_URL = "https://cryptotradeacademy.vercel.app"
$CRON_SECRET = "9bbaadd14244949f1647185d88f48fdefff61c3531b3c0f325951edafe69e359"

# テスト実行例（Phase 1）
curl.exe -X GET "$VERCEL_URL/api/cron?force=true" `
  -H "Authorization: Bearer $CRON_SECRET" `
  -H "Content-Type: application/json"
```

---

### Step 3: 結果確認（5分）

1. **スクリプトの出力を確認**
   - ✅ 成功 / ❌ 失敗 を確認

2. **Vercel Dashboardでログを確認**
   - Deployments → 最新デプロイメント → Functions タブ
   - 各APIエンドポイントのログを確認

3. **エラーがあれば修正**
   - エラーメッセージを確認
   - バグを修正
   - 再テスト

---

## 📋 テスト実行順序（推奨）

### 優先度: 高（最初にテスト）

1. **`/api/cron`** - Trap Defence BTC配信
   - 最も重要な機能
   - 6言語すべてで動作確認

2. **`/api/x-quote-repost-en`** - 引用リポスト（EN）
   - X投稿の主要機能
   - ドライランモードの確認

### 優先度: 中（次にテスト）

3. **`/api/x-quote-repost-{lang}`** - 引用リポスト（残り5言語）
   - 各言語で個別にテスト

4. **`/api/vsl1-post`** - VSL1自動投稿
   - VSL1ワークフローの確認

5. **`/api/x-post-minimal-version-cron`** - 無料版X投稿
   - Minimal Versionチェックアウトリンクの確認

6. **`/api/x-post-free-report`** - 無料版レポートX投稿
   - 市場データ統合の確認

### 優先度: 低（最後にテスト）

7. **TG DM関連**（3件）
   - `/api/vsl2-free-users`
   - `/api/vsl1-reminder`
   - `/api/vsl2-last-call`

8. **その他**（1件）
   - `/api/promo-stock-monitor`

---

## ✅ 確認すべきポイント

### ドライランモードの確認

すべてのX投稿関連CronJobで以下を確認：

```json
{
  "success": true,
  "dryRun": true,  // ← これが true であることを確認
  "message": "Dry run mode enabled - no posts will be made"
}
```

**ログで確認**:
```
🧪 X dry-run enabled, skipping actual post
🧪 DRY RUN MODE - No actual posts will be made
```

---

### エラーの確認

**正常なログ**:
- ✅ `Success`
- ✅ `dryRun: true`
- ✅ `Selected X influencers`

**エラーログ**:
- ❌ `Error:`
- ❌ `Failed to`
- ❌ `Cannot find`

---

## 🎯 テスト完了後の確認

### すべてのテストが成功した場合

1. **ログを再確認**
   - エラーがないことを確認
   - 警告がないことを確認

2. **ドライランモードの確認**
   - すべてのX投稿で `dryRun: true` が表示されているか

3. **本番環境移行準備**
   - `X_POSTING_DRY_RUN=false` に変更する準備

### エラーがあった場合

1. **エラーログを確認**
   - Vercel Dashboardのログを確認
   - エラーメッセージを記録

2. **バグを修正**
   - エラーの原因を特定
   - コードを修正

3. **再テスト**
   - 修正後に再テスト
   - エラーが解消されたか確認

---

## 📊 テスト結果記録用テンプレート

```markdown
## テスト実行結果

**実行日時**: 2026-01-30 HH:MM
**環境**: Production / Preview

### 結果サマリー
- 成功: X/14
- 失敗: Y/14
- 成功率: Z%

### 詳細結果
| CronJob | ステータス | HTTP | 備考 |
|---------|----------|------|------|
| /api/cron | ✅ | 200 | - |
| ... | ... | ... | ... |

### 発見された問題
- なし / [問題の詳細]

### 次のステップ
- [ ] バグ修正
- [ ] 再テスト
- [ ] 本番環境移行
```

---

## 🆘 よくある質問

### Q1: ドライランモードが有効にならない

**A**: `X_POSTING_DRY_RUN=true` が正しく設定されているか確認してください。環境変数を変更した場合は、再デプロイが必要な場合があります。

### Q2: 401 Unauthorized エラー

**A**: `CRON_SECRET` が正しく設定されているか確認してください。Vercel Dashboardの環境変数と、テストコマンドの `Bearer` トークンが一致しているか確認してください。

### Q3: 500 Internal Server Error

**A**: Vercel Dashboardのログを確認してください。エラーメッセージから原因を特定できます。環境変数が不足している可能性もあります。

### Q4: インフルエンサーが選択されない

**A**: `data/influencers/influencers-{lang}.json` ファイルが存在し、正しく読み込まれているか確認してください。ファイルパスと内容を確認してください。

---

## 📚 関連ドキュメント

- **詳細ガイド**: `docs/CRONJOBS_TEST_EXECUTION_GUIDE_2026-01-30.md`
- **スケジュール**: `docs/CRONJOBS_DRY_RUN_TEST_SCHEDULE_2026-01-30.md`
- **環境変数チェック**: `docs/ENV_VARIABLES_RE_CHECK_REPORT_2026-01-30.md`

---

**最終更新**: 2026-01-30
