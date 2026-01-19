# クイック検証ガイド

**作成日**: 2026-01-18  
**目的**: リード発見システムとVSL1投稿の動作確認を効率的に行う

---

## ✅ 確認方法

### 1. 環境変数の確認（ローカル）
```bash
node scripts/check-lead-discovery-env.js
```

### 2. 実際の動作確認（Vercel Dashboard）

**リード発見システム**:
- Vercel Dashboard → Project → Logs
- `/api/lead-discovery` のCron実行ログを確認（30分ごと）
- エラーがないか、リードが発見されているか確認

**VSL1投稿**:
- Vercel Dashboard → Project → Logs  
- `/api/vsl1-post` のCron実行ログを確認（UTC 9時、21時）
- Telegram MINIMALチャンネルとXに実際に投稿されているか確認

### 3. 手動実行（必要な場合のみ）

**Vercel Dashboardから**:
- Deployments → 最新デプロイ → Functions
- 各APIエンドポイントを直接実行

**または curl（本番環境）**:
```bash
# リード発見（実際に実行される）
curl -X POST "https://cryptotradeacademy.vercel.app/api/lead-discovery" \
  -H "Authorization: Bearer $CRON_SECRET"

# VSL1投稿（実際に投稿される）
curl -X POST "https://cryptotradeacademy.vercel.app/api/vsl1-post" \
  -H "Authorization: Bearer $CRON_SECRET"
```

---

## 📊 確認ポイント

### リード発見システム
- ✅ Cronが30分ごとに実行されている（Vercel Dashboard → Cron Jobs）
- ✅ ログにエラーがない
- ✅ リードが発見されている（ダッシュボードで確認）

### VSL1投稿
- ✅ Cronが1日2回実行されている（UTC 9時、21時）
- ✅ Telegram MINIMALチャンネルに投稿されている
- ✅ X（Twitter）に投稿されている
- ✅ 画像が添付されている

---

**注意**: 実際のAPIを呼び出すテストは時間とトークンを消費するため、Vercel Dashboardのログで確認することを推奨します。
