# KV保存実行手順（最終版）

## 目的
Grokが840人のインフルエンサー（6言語）を見つけてKVに保存し、`/api/x-quote-repost`が正常に動作するようにする。

## 現在の問題
- KVにストックが0人（全言語、キーも存在しない）
- `/api/x-quote-repost`がストックが空のため「ZERO DELIVERIES」を返す
- 結果：「配信ゼロ、ストックゼロ、インプレッションゼロ、エンゲージメントゼロ、コンバージョンゼロ」

## 実行コマンド

```powershell
cd c:\Users\chiba\hadayalab-automation-platform\cryptotradeacademy

# 環境変数設定
$env:KV_REST_API_URL="https://genuine-stork-35682.upstash.io"
$env:KV_REST_API_TOKEN="AYtiAAIncDE3ZjBjNDQxMzgwYzQ0MzdhYWI1MTYwMTFkMzFjNDA3MXAxMzU2ODI"
$env:KV_REST_API_READ_ONLY_TOKEN="AotiAAIgcDE1X4iRkRRJB4nbs9u_WKXO4e3LAV9o8X7a2ZGDQwIcZw"
$env:KV_URL="rediss://default:AYtiAAIncDE3ZjBjNDQxMzgwYzQ0MzdhYWI1MTYwMTFkMzFjNDA3MXAxMzU2ODI@genuine-stork-35682.upstash.io:6379"
$env:REDIS_URL="rediss://default:AYtiAAIncDE3ZjBjNDQxMzgwYzQ0MzdhYWI1MTYwMTFkMzFjNDA3MXAxMzU2ODI@genuine-stork-35682.upstash.io:6379"
$env:XAI_API_KEY="xai-jxO7HGeeFcEguSmqMTvxUqijZHnRT3fAP50iaDQnOzRE2aY1q86bNJLfMKxD18RMclcIoue426vV6vii"

# KV保存実行（@vercel/kvを直接使用）
node scripts/fix-kv-save-direct.js
```

## 実行後の確認

```powershell
# KVストック確認
node scripts/check-kv-direct.js
```

## 期待される結果
- 各言語で目標数のインフルエンサーがKVに保存される
- `check-kv-direct.js`で各言語のストック数が確認できる
- `/api/x-quote-repost`が正常に動作する

## エラーが発生した場合
1. KV接続テストが失敗している場合：環境変数を再確認
2. Grokからインフルエンサーが取得できない場合：XAI_API_KEYを確認
3. 保存が失敗している場合：ログを確認して原因を特定
