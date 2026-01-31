# パフォーマンス修正後のテストコマンド
**作成日時**: 2026-01-31

---

## 🚀 クイックテスト（推奨）

### PowerShellスクリプト（一括テスト）
```powershell
.\scripts\test-performance-fixes.ps1
```

---

## 📋 個別テストコマンド

### 1. `/api/cron`（定期配信）
```powershell
curl -X GET "https://cryptotradeacademy-l752t3vl8-hadayalab-projects-projects.vercel.app/api/cron" -H "User-Agent: vercel-cron/1.0" --max-time 70
```

**期待される結果**: HTTP 200（または改善されたエラーメッセージ）

---

### 2. `/api/x-quote-repost-en`（英語）
```powershell
curl -X GET "https://cryptotradeacademy-l752t3vl8-hadayalab-projects-projects.vercel.app/api/x-quote-repost-en?count=1&dry_run=true" --max-time 70
```

**期待される結果**: HTTP 200, `success: true`

---

### 3. `/api/x-quote-repost-ko`（韓国語）
```powershell
curl -X GET "https://cryptotradeacademy-l752t3vl8-hadayalab-projects-projects.vercel.app/api/x-quote-repost-ko?count=1&dry_run=true" --max-time 70
```

**期待される結果**: HTTP 200, `success: true`（並列処理により改善）

---

### 4. `/api/x-quote-repost-ja`（日本語）
```powershell
curl -X GET "https://cryptotradeacademy-l752t3vl8-hadayalab-projects-projects.vercel.app/api/x-quote-repost-ja?count=1&dry_run=true" --max-time 70
```

**期待される結果**: HTTP 200, `success: true`（並列処理により改善）

---

### 5. `/api/x-quote-repost-es`（スペイン語）
```powershell
curl -X GET "https://cryptotradeacademy-l752t3vl8-hadayalab-projects-projects.vercel.app/api/x-quote-repost-es?count=1&dry_run=true" --max-time 70
```

**期待される結果**: HTTP 200, `success: true`（並列処理により改善）

---

## 🔍 検証ポイント

### 修正前の問題
- ❌ `/api/cron`: HTTP 504（タイムアウト）
- ❌ `/api/x-quote-repost-ko`: HTTP 504（タイムアウト）
- ❌ `/api/x-quote-repost-ja`: HTTP 504（タイムアウト）
- ❌ `/api/x-quote-repost-es`: HTTP 504（タイムアウト）
- ✅ `/api/x-quote-repost-en`: HTTP 200（成功）

### 修正後の期待結果
- ✅ `/api/cron`: HTTP 200（または改善されたエラーメッセージ）
- ✅ `/api/x-quote-repost-en`: HTTP 200（維持）
- ✅ `/api/x-quote-repost-ko`: HTTP 200（改善）
- ✅ `/api/x-quote-repost-ja`: HTTP 200（改善）
- ✅ `/api/x-quote-repost-es`: HTTP 200（改善）

---

## 📊 パフォーマンス指標

### 処理時間
- **修正前**: 60秒以上（タイムアウト）
- **修正後**: 30-50秒（目標）

### 成功率
- **修正前**: EN 100%, KO/JA/ES 0%
- **修正後**: すべて 80-90%（目標）

---

## 🛠️ トラブルシューティング

### 504タイムアウトが続く場合
1. Vercelログを確認: `vercel logs`
2. 実行時間を確認: レスポンスの`duration`フィールド
3. エラーメッセージを確認: レスポンスの`error`フィールド

### 並列処理が動作していない場合
1. ログで`Promise.allSettled`の実行を確認
2. 各言語の処理開始時刻を確認
3. 累積遅延が発生していないか確認

---

## 📝 テスト結果の記録

テスト結果は以下の形式で記録してください：

```json
{
  "testDate": "2026-01-31TXX:XX:XXZ",
  "results": {
    "/api/cron": { "status": 200, "duration": 45.2 },
    "/api/x-quote-repost-en": { "status": 200, "duration": 12.3 },
    "/api/x-quote-repost-ko": { "status": 200, "duration": 15.7 },
    "/api/x-quote-repost-ja": { "status": 200, "duration": 16.1 },
    "/api/x-quote-repost-es": { "status": 200, "duration": 14.9 }
  },
  "successRate": "100%",
  "averageDuration": 20.8
}
```
