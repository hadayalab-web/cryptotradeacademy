# KVシームレスアクセスユーティリティ

`utils/kv.js`は、Vercel KVへのシームレスなアクセスを提供するユーティリティです。`Redis.fromEnv()`のような使い勝手で、環境変数の自動読み込みとエラーハンドリングを統合しています。

## クイックスタート

```javascript
const { kv } = require('./utils/kv');

// 値を取得
const value = await kv.get('my-key');

// 値を設定（TTL付き）
await kv.set('my-key', 'my-value', { ex: 3600 }); // 1時間TTL

// 値を削除
await kv.del('my-key');

// 値をインクリメント
const newValue = await kv.incr('counter', 1);
```

## 主な機能

### ✅ シームレスな初期化
- 環境変数から自動的に設定を読み込む
- Vercel環境では追加設定不要

### ✅ 統一されたエラーハンドリング
- すべてのKV操作で一貫したエラー処理
- KVが利用不可でもアプリケーションがクラッシュしない

### ✅ コードの重複削減
- 各ファイルで同じ初期化コードを繰り返す必要がない

### ✅ フォールバック動作
- KVが利用不可の場合、警告を出して処理をスキップ

## API

### `kv.get(key)`
値を取得します。

```javascript
const value = await kv.get('my-key');
// 存在しない場合は null を返す
```

### `kv.set(key, value, options)`
値を設定します。

```javascript
await kv.set('my-key', 'my-value');
await kv.set('my-key', 'my-value', { ex: 3600 }); // TTL付き（秒）
```

### `kv.del(key)`
値を削除します。

```javascript
await kv.del('my-key');
```

### `kv.incr(key, amount)`
値をインクリメントします。

```javascript
const newValue = await kv.incr('counter', 1);
// amount のデフォルト値は 1
```

### `kv.exists(key)`
キーの存在を確認します。

```javascript
const exists = await kv.exists('my-key');
// true または false を返す
```

### `kv.ttl(key)`
キーのTTLを取得します。

```javascript
const ttl = await kv.ttl('my-key');
// TTL秒数、または null（存在しない場合）
```

### `getKV()`
生のKVインスタンスを取得します（高度な操作が必要な場合）。

```javascript
const { getKV } = require('./utils/kv');
const kvInstance = getKV();
if (kvInstance) {
  // 高度な操作
}
```

### `isKVAvailable()`
KVが利用可能かチェックします。

```javascript
const { isKVAvailable } = require('./utils/kv');
if (isKVAvailable()) {
  console.log('KV is available');
}
```

### `testKVConnection()`
KV接続をテストします。

```javascript
const { testKVConnection } = require('./utils/kv');
const connected = await testKVConnection();
if (connected) {
  console.log('KV connection successful');
}
```

## 環境変数

以下の環境変数が自動的に読み込まれます：

- `KV_REST_API_URL` (Vercel環境で自動設定)
- `KV_REST_API_TOKEN` (Vercel環境で自動設定)
- `KV_URL` (代替)

Vercel環境では、これらの環境変数は自動的に設定されるため、追加の設定は不要です。

## テスト

KV接続をテストするには：

```bash
node scripts/test-kv-connection.js
```

## 移行ガイド

既存のコードを移行するには、[KV_SEAMLESS_MIGRATION.md](../docs/KV_SEAMLESS_MIGRATION.md)を参照してください。

## トラブルシューティング

### KVが利用できない場合

```javascript
const { isKVAvailable } = require('./utils/kv');

if (!isKVAvailable()) {
  console.warn('KV is not available, using fallback');
  // フォールバック処理
}
```

### 接続エラーの確認

```javascript
const { testKVConnection } = require('./utils/kv');

const connected = await testKVConnection();
if (!connected) {
  console.error('KV connection failed');
  // エラー処理
}
```

## パフォーマンス

- **シングルトンパターン**: KVインスタンスは一度だけ初期化され、再利用されます
- **遅延初期化**: 最初の使用時に初期化されます
- **エラーハンドリング**: 各操作でエラーが発生しても、アプリケーションは継続して動作します

## 参考

- [Vercel KV Documentation](https://vercel.com/docs/storage/vercel-kv)
- [Upstash Redis Documentation](https://docs.upstash.com/redis)
- [移行ガイド](../docs/KV_SEAMLESS_MIGRATION.md)
