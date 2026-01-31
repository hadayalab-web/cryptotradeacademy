# Vercel CronJobs 手動実行テストガイド
**作成日**: 2026-01-31  
**目的**: Vercel DashboardでCronJobsを手動実行して動作確認

---

## 🎯 手動実行テストの目的

### なぜ手動実行テストが必要か（重要）

1. **Cron設定の確認**
   - Cron設定が正しく動作するか確認
   - スケジュール通りに実行されるか確認
   - **Vercel Dashboardで「Run」ボタンがある場合、手動実行で動作確認可能**

2. **エラーの早期発見**
   - 実際のスケジュール実行前にエラーを発見
   - 問題があれば即座に対応可能
   - **デプロイ直後の動作確認として重要**

3. **動作確認**
   - ドライランモードが正しく機能するか確認
   - 時間帯チェックが正しく機能するか確認
   - レスポンスが正しく返されるか確認
   - **`X_POSTING_DRY_RUN=false`に変更する前の最終確認**

4. **本番環境移行前の最終チェック**
   - すべてのエンドポイントが正常に動作するか確認
   - エラーがないことを確認
   - **本番環境で実行開始する前の必須ステップ**

---

## 📋 Vercel Dashboardでの手動実行テスト手順

### Step 1: Vercel Dashboardにアクセス

1. **Vercel Dashboard** → **Project** → **Settings** → **Cron Jobs**
2. または、**Deployments** → 最新デプロイメント → **Functions** タブ

### Step 2: CronJobsの一覧を確認

以下のCronJobsが表示されることを確認：

**X投稿関連**:
- `/api/x-quote-repost-en` - 6分ごと
- `/api/x-quote-repost-es` - 10分ごと（1,7,13,19,25,31,37,43,49,55分）
- `/api/x-quote-repost-pt-br` - 10分ごと（2,8,14,20,26,32,38,44,50,56分）
- `/api/x-quote-repost-ar` - 10分ごと（3,9,15,21,27,33,39,45,51,57分）
- `/api/x-quote-repost-ja` - 10分ごと（4,10,16,22,28,34,40,46,52,58分）
- `/api/x-quote-repost-ko` - 10分ごと（5,11,17,23,29,35,41,47,53,59分）
- `/api/x-post-minimal-version-cron` - 1日5回（0,7,12,15,23時）
- `/api/x-post-free-report` - 1日4回（30 4,10,17,19時）

**その他**:
- `/api/vsl1-post` - 1日3回（0 1,13,21時）
- `/api/cron` - 15分ごと

### Step 3: 手動実行テスト（推奨）

**Vercel Dashboardの機能**:
- 一部のCronJobsには「Run」ボタンがある場合があります
- または、**Functions** タブから直接エンドポイントを呼び出すことができます

**手動実行方法**:

#### 方法1: Vercel Dashboardの「Run」ボタンを使用

1. **Settings** → **Cron Jobs** で各CronJobの「Run」ボタンをクリック
2. 実行結果を確認

#### 方法2: Functionsタブから直接呼び出し

1. **Deployments** → 最新デプロイメント → **Functions** タブ
2. 各エンドポイントをクリック
3. 「Test」または「Invoke」ボタンで実行

#### 方法3: curlコマンドで実行（推奨）

```powershell
# 環境変数を設定
$VERCEL_URL = "https://cryptotradeacademy.vercel.app"
$CRON_SECRET = "9bbaadd14244949f1647185d88f48fdefff61c3531b3c0f325951edafe69e359"

# X投稿関連のCronJobsをテスト（force=trueで時間帯チェックをスキップ）
curl.exe -X GET "$VERCEL_URL/api/x-quote-repost-en?force=true" `
  -H "Authorization: Bearer $CRON_SECRET" `
  -H "Content-Type: application/json"

curl.exe -X GET "$VERCEL_URL/api/x-quote-repost-es?force=true" `
  -H "Authorization: Bearer $CRON_SECRET" `
  -H "Content-Type: application/json"

# その他のエンドポイントも同様にテスト
```

---

## ✅ 確認すべきポイント

### 1. レスポンスの確認

**正常なレスポンス**:
```json
{
  "success": true,
  "dryRun": true,
  "message": "Dry run mode enabled - no posts will be made"
}
```

**時間帯チェックでスキップされた場合**:
```json
{
  "success": true,
  "skipped": true,
  "reason": "not_peak_time",
  "currentHour": 3,
  "message": "Not peak time for EN quote reposts. Use ?force=true to override."
}
```

### 2. ログの確認

**Vercel Dashboard** → **Deployments** → 最新デプロイメント → **Functions** タブ → 各エンドポイントのログを確認

**確認すべきログ**:
- ✅ `✅ Peak time confirmed: UTC X:00`
- ✅ `🧪 X dry-run enabled`
- ✅ `✅ Selected X influencers`
- ❌ エラーメッセージがないこと

### 3. 実行時間の確認

**各エンドポイントの実行時間**:
- 10秒以内: 正常
- 20-30秒: 許容範囲
- 50秒以上: タイムアウトの可能性あり

---

## 🎯 推奨テスト順序

### Phase 1: 基本的な動作確認（必須）

1. **`/api/x-quote-repost-en?force=true`** - 最も重要なエンドポイント
2. **`/api/x-post-minimal-version-cron`** - 無料版X投稿
3. **`/api/x-post-free-report`** - 無料版レポートX投稿

### Phase 2: その他言語の確認（推奨）

4. **`/api/x-quote-repost-es?force=true`**
5. **`/api/x-quote-repost-pt-br?force=true`**
6. **`/api/x-quote-repost-ar?force=true`**
7. **`/api/x-quote-repost-ja?force=true`**
8. **`/api/x-quote-repost-ko?force=true`**

### Phase 3: その他のCronJobs（オプション）

9. **`/api/vsl1-post`**
10. **`/api/cron`**

---

## ⚠️ 注意事項

### 1. ドライランモードの確認

**重要**: 手動実行テスト時も `X_POSTING_DRY_RUN=true` が設定されていることを確認してください。

**確認方法**:
- レスポンスに `"dryRun": true` が含まれているか確認
- ログに「🧪 X dry-run enabled」が表示されているか確認

### 2. 時間帯チェックの確認

**`force=true`パラメータを使用しない場合**:
- ピーク時間帯でない場合はスキップされます
- これは正常な動作です

**`force=true`パラメータを使用する場合**:
- 時間帯チェックをスキップして実行されます
- テスト用に推奨

### 3. 実行頻度の制限

**注意**: 手動実行テストを頻繁に行うと、以下の問題が発生する可能性があります：
- クールダウン中のインフルエンサーが選択されない
- 日次上限に達して投稿されない
- 無駄なAPI呼び出しが発生する

**推奨**: 各エンドポイントは1回ずつテストすることを推奨します。

---

## 📊 テスト結果の記録

### テスト結果テンプレート

```markdown
## Vercel CronJobs 手動実行テスト結果

**実行日時**: 2026-01-31 HH:MM
**環境**: Production
**X_POSTING_DRY_RUN**: true

### テスト結果

| CronJob | ステータス | HTTP | ドライラン | 実行時間 | 備考 |
|---------|----------|------|-----------|---------|------|
| /api/x-quote-repost-en?force=true | ✅ | 200 | ✅ | 16.22秒 | - |
| /api/x-quote-repost-es?force=true | ✅ | 200 | ✅ | 10.51秒 | - |
| /api/x-post-minimal-version-cron | ✅ | 200 | ✅ | 13.03秒 | - |
| /api/x-post-free-report | ✅ | 200 | ✅ | 13.47秒 | - |

### 発見された問題
- なし / [問題の詳細]

### 次のステップ
- [ ] すべてのテストが成功
- [ ] X_POSTING_DRY_RUN=false に変更
- [ ] 本番環境で実行開始
```

---

## 🚀 結論

**手動実行テストは必須です**

**理由**:
1. ✅ Cron設定が正しく動作するか確認できる
2. ✅ エラーを早期発見できる
3. ✅ 実際のスケジュール実行前に動作確認できる
4. ✅ ドライランモードが正しく機能するか確認できる
5. ✅ **本番環境移行前の最終チェックとして重要**

**実行タイミング**:
- ✅ **デプロイ後、すぐに実行（必須）**
- ✅ **`X_POSTING_DRY_RUN=false`に変更する前に実行（必須）**
- ✅ すべてのテストが成功したら、本番環境移行

**推奨テスト順序**:
1. Vercel Dashboardで手動実行テスト（推奨）
2. または、curlコマンドで手動実行テスト
3. すべて成功したら、`X_POSTING_DRY_RUN=false`に変更
4. 本番環境で実行開始

---

**最終更新**: 2026-01-31
