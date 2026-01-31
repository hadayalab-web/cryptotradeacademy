# 14個すべてのCronJobs ドライランテスト実行ガイド

## 概要

vercel.jsonで定義されている14個すべてのCronJobsを一括でテスト実行し、正常稼働を確認します。

## 対象CronJobs（14個）

### Phase 1: Trap Defence BTC配信（1件）
- `/api/cron` - Trap Defence BTC配信（15分ごと）

### Phase 2: X投稿関連（9件）
- `/api/vsl1-post` - VSL1自動投稿（1:00, 13:00, 21:00 UTC）
- `/api/x-post-minimal-version-cron` - 無料版X投稿（0:00, 7:00, 12:00, 15:00, 23:00 UTC）
- `/api/x-post-free-report` - 無料版レポートX投稿（4:30, 10:30, 17:30, 19:30 UTC）
- `/api/x-quote-repost-en` - 引用リポスト EN（6分ごと）
- `/api/x-quote-repost-es` - 引用リポスト ES（特定分）
- `/api/x-quote-repost-pt-br` - 引用リポスト PT-BR（特定分）
- `/api/x-quote-repost-ar` - 引用リポスト AR（特定分）
- `/api/x-quote-repost-ja` - 引用リポスト JA（特定分）
- `/api/x-quote-repost-ko` - 引用リポスト KO（特定分）

### Phase 3: TG DM関連（3件）
- `/api/vsl2-free-users` - VSL2自動配信（毎時0分）
- `/api/vsl1-reminder` - VSL1リマインド（12時間ごと）
- `/api/vsl2-last-call` - VSL2終了直前リマインド（毎時0分）

### Phase 4: その他（1件）
- `/api/promo-stock-monitor` - プロモコード在庫監視（15分ごと）

## 実行方法

### 方法1: Node.jsスクリプト（推奨）

```bash
node scripts/test-all-14-cronjobs.js
```

または、Windowsバッチファイルから：

```bash
scripts\run-all-14-cronjobs-test.bat
```

### 方法2: PowerShellスクリプト

```powershell
.\scripts\test-all-14-cronjobs.ps1
```

環境変数を指定する場合：

```powershell
.\scripts\test-all-14-cronjobs.ps1 -VercelUrl "https://cryptotradeacademy.vercel.app" -CronSecret "your-secret"
```

## 環境変数

スクリプトは以下の順序で`.env`ファイルを検索します：

1. `./.env`
2. `../../.env`
3. `C:/Users/chiba/Downloads/.env`
4. `C:/Users/chiba/hadayalab-automation-platform/.env`

または、環境変数として設定：

- `VERCEL_URL` - VercelのURL（デフォルト: `https://cryptotradeacademy.vercel.app`）
- `CRON_SECRET` - CronJobs認証用のシークレット

## テスト結果の確認ポイント

### ✅ 成功の条件

1. **HTTPステータス200**: すべてのエンドポイントが200を返す
2. **ドライランモード確認**: X投稿関連エンドポイントで`dryRun: true`が返される
3. **スキップ状態の確認**: 時間帯チェックによりスキップされた場合は`skipped: true`が返される（正常）

### ⚠️ 注意事項

- **認証エラー（HTTP 401）**: `CRON_SECRET`が正しく設定されていない可能性があります
- **スキップされたエンドポイント**: 時間帯チェックにより実行されなかった場合は正常です（`skipped: true`）
- **レート制限**: 各リクエスト間に1秒の待機時間を設けています

## 期待される出力

```
🚀 14個すべてのCronJobs ドライランテスト開始
================================================================================
📍 Vercel URL: https://cryptotradeacademy.vercel.app
🔑 CRON_SECRET: 9bbaadd14244949f16...
================================================================================

📋 Phase 1
--------------------------------------------------------------------------------

🔍 テスト実行: Trap Defence BTC配信
   URL: https://cryptotradeacademy.vercel.app/api/cron?force=true
   ✅ 成功 (HTTP 200, 2.34秒)

📋 Phase 2
--------------------------------------------------------------------------------

🔍 テスト実行: VSL1自動投稿
   URL: https://cryptotradeacademy.vercel.app/api/vsl1-post
   ✅ 成功 (HTTP 200, 1.56秒)
   🧪 ドライランモード: 有効

...

📊 テスト結果サマリー（14個すべて）
================================================================================

Phase 1
  ✅ 成功 Trap Defence BTC配信 - HTTP 200 (2.34秒)

Phase 2
  ✅ 成功 VSL1自動投稿 - HTTP 200 (1.56秒) [🧪 ドライラン有効]
  ✅ 成功 無料版X投稿 - HTTP 200 (1.23秒) [🧪 ドライラン有効]
  ✅ 成功 無料版レポートX投稿 - HTTP 200 (0.89秒) [⏰ スキップ（正常）]
  ...

合計: 14/14 成功 (100.0%)
ドライランモード: 9/14 有効
スキップ: 2/14（時間帯チェックにより正常）

🎉 すべてのCronJobs（14個）が正常に動作しています！
   次のステップ: X_POSTING_DRY_RUN=false に変更して本番環境で実行開始
```

## トラブルシューティング

### 認証エラーが発生する場合

1. `.env`ファイルに`CRON_SECRET`が設定されているか確認
2. Vercel Dashboardで環境変数`CRON_SECRET`が正しく設定されているか確認
3. スクリプト実行時に`-CronSecret`パラメータで直接指定

### 一部のエンドポイントが失敗する場合

1. Vercel DashboardのFunctionsタブでログを確認
2. エラーメッセージを確認して原因を特定
3. 必要に応じて`?force=true`パラメータを追加（時間帯チェックをバイパス）

### スキップされたエンドポイントについて

時間帯チェックによりスキップされたエンドポイントは**正常な動作**です。これは最適化の一環で、ピーク時間帯以外の実行を避けるためです。

強制的に実行したい場合は、`?force=true`パラメータを追加してください。

## 次のステップ

すべてのCronJobsが正常に動作することを確認したら：

1. ✅ ドライランテスト完了
2. 🔄 Vercel Dashboardで手動実行テスト（推奨）
3. 🚀 `X_POSTING_DRY_RUN=false`に変更して本番環境で実行開始
4. 📊 実行結果を監視して期待通りの成果が得られているか確認

## 関連ドキュメント

- `docs/X_POSTING_CRONJOBS_PRODUCTION_READINESS.md` - 本番環境移行ガイド
- `docs/VERCEL_CRONJOBS_MANUAL_TEST_GUIDE.md` - Vercel Dashboardでの手動テストガイド
- `docs/X_POSTING_CRONJOBS_OPTIMIZATION_COMPLETE.md` - 最適化の詳細
