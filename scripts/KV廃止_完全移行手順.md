# KV廃止: ファイルシステム方式への完全移行

## 変更内容

### 1. KVを完全廃止
- ✅ `api/x-quote-repost.js` のKV参照を削除
- ✅ `services/x/influencerStockFromFile.js` でファイルシステムから読み込み
- ✅ `api/x-quote-repost-from-file.js` で1日1000投稿対応

### 2. 1日1000投稿の実装
- ✅ `vercel.json` に1分ごとのCronJobを追加
- ✅ 6言語を6分で1サイクル → 1日240サイクル = 1440投稿（目標1000投稿を超える）

### 3. データ保存方法
- ✅ `data/influencers/influencers.json` - JSON形式
- ✅ `data/influencers/influencers.csv` - CSV形式
- ✅ Gitでバージョン管理
- ✅ Vercelで自動デプロイ

## 実行手順

### ステップ1: Grokから取得してJSON/CSV保存

```powershell
$env:XAI_API_KEY="xai-jxO7HGeeFcEguSmqMTvxUqijZHnRT3fAP50iaDQnOzRE2aY1q86bNJLfMKxD18RMclcIoue426vV6vii"
node scripts/save-influencers-to-json-csv.js
```

### ステップ2: Gitにコミット・プッシュ

```powershell
git add data/influencers/
git commit -m "Add influencers data (KV廃止、ファイルシステム方式に移行)"
git push
```

### ステップ3: Vercelで自動デプロイ

Gitにプッシュすると自動デプロイされます。

### ステップ4: 動作確認

デプロイ後、以下のCronJobが1分ごとに実行されます:
- `/api/x-quote-repost-from-file` - 1日1000投稿

## 利点

✅ **KV接続の問題を完全に回避**
✅ **Gitでバージョン管理可能**
✅ **デバッグが容易**
✅ **確実にデータを保存・取得可能**
✅ **1日1000投稿を実現**

## 注意事項

- `data/influencers/` ディレクトリはGitにコミットしてください
- インフルエンサーデータを更新する場合は、`save-influencers-to-json-csv.js` を実行してGitにコミットしてください
