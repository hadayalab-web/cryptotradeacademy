# 緊急: インフルエンサーストック削除問題と復旧手順
**作成日時**: 2026-01-28  
**問題**: 386人分のインフルエンサーストックが削除された

---

## 🚨 問題の概要

夜中にGrokが見つけてきた386人分のインフルエンサーリストがKVから削除されました。CronJobsを実行するためのリストがないと大問題です。

---

## 🔍 原因の調査

### 考えられる原因

1. **TTLによる自動削除（過去のコード）**
   - 以前のコードでは24時間のTTLが設定されていた可能性
   - 現在のコードではTTLは削除済み（永続保存）

2. **空配列での上書き**
   - 何らかのスクリプトやAPIで空配列が保存された可能性
   - エラー時に空配列が返された可能性

3. **KVストア自体の問題**
   - Upstash KVの障害やデータ消失

4. **手動削除**
   - 誤って削除操作が実行された可能性

---

## 🛡️ 保護機能の追加

### 1. 空配列での上書きを防ぐ

`services/x/influencerStock.js`の`saveInfluencersToStock`関数に保護機能を追加：

- 空配列での保存を拒否
- 既存データがある場合は保護
- 警告ログを出力

### 2. バックアップ機能

- 上書き前に既存データをバックアップ
- バックアップキー: `x:influencer_stock:{lang}:backup:{timestamp}`

### 3. 最小数のチェック

- 10人未満の保存時に警告を出力

---

## 🚀 緊急復旧手順

### 方法1: 緊急再構築スクリプトを使用（推奨）

```bash
# バッチファイルを実行（環境変数設定済み）
scripts\emergency-rebuild-influencer-stock.bat
```

または

```bash
# 環境変数を設定してから実行
set KV_REST_API_URL=https://genuine-stork-35682.upstash.io
set KV_REST_API_TOKEN=AYtiAAIncDE3ZjBjNDQxMzgwYzQ0MzdhYWI1MTYwMTFkMzFjNDA3MXAxMzU2ODI
set XAI_API_KEY=your_xai_api_key
node scripts/emergency-rebuild-influencer-stock.js
```

### 方法2: 通常の更新スクリプトを使用

```bash
# 全言語を更新
node scripts/update-influencer-stock.js --all

# または単一言語を更新
node scripts/update-influencer-stock.js --lang=en
```

### 方法3: APIエンドポイントから実行

```bash
# 全言語を更新
curl -X GET "https://your-domain.vercel.app/api/x-update-influencer-stock?all=true"

# 単一言語を更新
curl -X GET "https://your-domain.vercel.app/api/x-update-influencer-stock?lang=en"
```

---

## 📋 復旧後の確認

### ストック状態の確認

```bash
# ローカルから確認
node scripts/check-kv-direct.js

# または
node scripts/check-kv-all-keys.js
```

### 期待される結果

- **en**: 150人以上
- **es**: 76人以上
- **pt-br**: 58人以上
- **ar**: 40人以上
- **ja**: 40人以上
- **ko**: 22人以上
- **合計**: 386人以上

---

## 🔒 今後の対策

### 1. 保護機能の有効化

`services/x/influencerStock.js`に以下の保護機能が追加されました：

- ✅ 空配列での上書きを防ぐ
- ✅ 既存データのバックアップ
- ✅ 最小数のチェック

### 2. 定期的なバックアップ

定期的にストックをバックアップするスクリプトを実行：

```bash
# バックアップスクリプト（今後作成予定）
node scripts/backup-influencer-stock.js
```

### 3. 監視とアラート

- ストック数が一定数以下になった場合にアラート
- 定期的なストック状態の確認

---

## ⚠️ 注意事項

1. **XAI_API_KEYが必要**
   - Grok APIからインフルエンサーを取得するため、XAI_API_KEYが設定されている必要があります

2. **実行時間**
   - 全言語の再構築には最大60秒かかる可能性があります
   - タイムアウトに注意してください

3. **コスト**
   - Grok APIの呼び出しにコストがかかります
   - 必要に応じて単一言語ずつ更新してください

---

## 📞 サポート

問題が解決しない場合は、以下を確認してください：

1. 環境変数の設定（KV_REST_API_URL, KV_REST_API_TOKEN, XAI_API_KEY）
2. ネットワーク接続
3. Upstash KVの状態
4. Grok APIの状態

---

## ✅ チェックリスト

- [ ] 緊急再構築スクリプトを実行
- [ ] ストック状態を確認（全言語でデータが存在するか）
- [ ] CronJobsが正常に動作するか確認
- [ ] 保護機能が有効になっているか確認
- [ ] バックアップが作成されているか確認
