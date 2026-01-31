# KVインフルエンサーストック空問題レポート
**作成日時**: 2026-01-28  
**状況**: 緊急対応が必要

---

## 🔍 問題の状況

### 確認結果
- **全言語のインフルエンサーストックが空（0人）**
  - en: 0人
  - es: 0人
  - pt-br: 0人
  - ar: 0人
  - ja: 0人
  - ko: 0人

### 影響
1. **1日500投稿計画が実行不可能**
   - `/api/x-quote-repost`がインフルエンサーを見つけられない
   - 投稿が実行されない

2. **ストック更新の自動化がない**
   - `vercel.json`に`/api/x-update-influencer-stock`のCron設定がない
   - 手動実行のみ

---

## 🔧 解決策

### 1. 即座に実行すべき対応（手動更新）

#### 方法A: APIエンドポイントを直接呼び出す
```bash
# 全言語を一度に更新（バックグラウンド処理）
curl -X GET "https://cryptotradeacademy.vercel.app/api/x-update-influencer-stock?all=true" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# または、単一言語を更新（推奨）
curl -X GET "https://cryptotradeacademy.vercel.app/api/x-update-influencer-stock?lang=en" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

#### 方法B: Vercel Dashboardから実行
1. Vercel Dashboardにログイン
2. Functionsタブから`/api/x-update-influencer-stock`を選択
3. "Invoke"ボタンをクリック
4. クエリパラメータ: `?lang=en`または`?all=true`

#### 方法C: ローカルスクリプトで実行
```bash
node scripts/update-influencer-stock.js
```

---

### 2. 長期的な対応（自動更新の設定）

#### vercel.jsonにCron設定を追加
```json
{
  "crons": [
    ...
    { "path": "/api/x-update-influencer-stock", "schedule": "0 0 * * *" }  // 毎日0時（UTC）に更新
  ]
}
```

**推奨スケジュール**:
- **毎日0時（UTC）**: `0 0 * * *` - ストックを1日1回更新
- **または、6時間ごと**: `0 */6 * * *` - より頻繁に更新（コスト増加）

---

## 📋 ストック更新の仕組み

### 更新プロセス
1. **Grok APIからインフルエンサーを発見**
   - 言語ごとに候補を取得（ストック数の5倍以上）
   - エンゲージメント率4%以上でフィルタリング

2. **選択戦略**
   - エンゲージメント率とインプレッション数のバランスを考慮
   - 好反応率重視の選択

3. **KVに保存**
   - キー: `x:influencer_stock:{lang}`
   - TTL: 24時間
   - 更新時刻: `x:influencer_stock_update:{lang}`

### 必要な環境変数
- `XAI_API_KEY`: Grok APIキー（必須）
- `KV_REST_API_URL`または`KV_URL`: Vercel KV接続情報（必須）
- `CRON_SECRET`: API認証用（推奨）

---

## ⚠️ 注意事項

1. **タイムアウト対策**
   - 全言語を一度に更新する場合、タイムアウト（60秒）のリスクがある
   - バックグラウンド処理として実行される（202 Acceptedを返す）

2. **コスト**
   - Grok APIの呼び出しコストが発生
   - 6言語 × 候補数（ストック数の5倍）のAPI呼び出し

3. **レート制限**
   - Grok APIのレート制限に注意
   - 言語間で3秒待機する実装あり

---

## 🚀 推奨アクション

### 即座に実行
1. ✅ 手動でストックを更新（全言語）
2. ✅ ストック更新が成功したことを確認

### 短期対応（今日中）
1. ✅ `vercel.json`にCron設定を追加
2. ✅ デプロイして自動更新を有効化

### 長期対応（今週中）
1. ✅ ストック更新の監視を追加
2. ✅ ストックが空の場合のアラート設定
3. ✅ ストック更新の失敗時のリトライ機能

---

## 📊 確認方法

### ストック更新後の確認
```bash
node scripts/check-kv-influencers.js
```

### 期待される結果
- 各言語に50-100人のインフルエンサーがストックされている
- 更新時刻が最近（24時間以内）になっている

---

## 🔗 関連ファイル

- `api/x-update-influencer-stock.js`: ストック更新API
- `services/x/influencerStock.js`: ストック管理ロジック
- `scripts/check-kv-influencers.js`: ストック確認スクリプト
- `vercel.json`: Cron設定（要追加）
