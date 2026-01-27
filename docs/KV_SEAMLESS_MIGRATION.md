# KVシームレスアクセス移行ガイド

## 概要

`utils/kv.js`を導入することで、KVアクセスをシームレスにしました。`Redis.fromEnv()`のような使い勝手を提供し、環境変数の自動読み込みとエラーハンドリングを統合しています。

## 主な利点

1. **シームレスな初期化**: 環境変数から自動的に設定を読み込む
2. **統一されたエラーハンドリング**: すべてのKV操作で一貫したエラー処理
3. **コードの重複削減**: 各ファイルで同じ初期化コードを繰り返す必要がない
4. **フォールバック動作**: KVが利用不可でもアプリケーションがクラッシュしない

## 使用方法

### 基本的な使用

```javascript
// 旧方法（各ファイルで繰り返し）
let kv = null;
try {
  const kvModule = require('@vercel/kv');
  kv = kvModule.kv;
} catch (error) {
  console.warn('[Module] @vercel/kv not available:', error.message);
}

// 新方法（シームレス）
const { kv } = require('./utils/kv');
// または
const { kv } = require('../../utils/kv'); // サービスから使用する場合
```

### KV操作

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

// キーの存在確認
const exists = await kv.exists('my-key');

// TTL取得
const ttl = await kv.ttl('my-key');
```

### 接続確認

```javascript
const { isKVAvailable, testKVConnection } = require('./utils/kv');

// KVが利用可能かチェック
if (isKVAvailable()) {
  console.log('KV is available');
}

// 接続テスト
const connected = await testKVConnection();
if (connected) {
  console.log('KV connection successful');
}
```

## 移行手順

### 1. 既存コードの確認

以下のパターンを検索して、移行が必要なファイルを特定します：

```bash
grep -r "@vercel/kv" --include="*.js" .
```

### 2. インポート文の置換

```javascript
// 旧
const { kv } = require('@vercel/kv');
// または
const kvModule = require('@vercel/kv');
const kv = kvModule.kv;

// 新
const { kv } = require('./utils/kv');
// または（サービスから）
const { kv } = require('../../utils/kv');
```

### 3. エラーハンドリングの簡素化

```javascript
// 旧（各ファイルで必要）
let kv = null;
try {
  const kvModule = require('@vercel/kv');
  kv = kvModule.kv;
} catch (error) {
  console.warn('[Module] @vercel/kv not available:', error.message);
}

if (!kv) {
  // フォールバック処理
  return;
}

// 新（エラーハンドリングはutils/kv.js内で統合）
const { kv } = require('./utils/kv');
// kv.get/set/delなどは自動的にエラーハンドリングされる
```

### 4. 直接kvインスタンスが必要な場合

```javascript
const { kv, getKV } = require('./utils/kv');

// ラッパー経由（推奨）
await kv.get('key');

// 生のインスタンスが必要な場合
const kvInstance = getKV();
if (kvInstance) {
  // 高度な操作
}
```

## 既に移行済みのファイル

- ✅ `services/cryptoquant/client.js`
- ✅ `utils/stateManager.js`
- ✅ `services/gpt/client.js`
- ✅ `utils/kv.js` (新規作成)

## 移行予定のファイル

以下のファイルは段階的に移行予定です：

- `api/x-quote-repost.js`
- `api/x-post-free-report.js`
- `api/x-post-minimal-version.js`
- `services/x/influencerRotation.js`
- `services/x/optimization.js`
- `services/x/userReplyHandler.js`
- `api/x-webhook.js`
- `services/free-users/kv-storage.js`
- その他多数

## 環境変数

`utils/kv.js`は以下の環境変数を自動的に読み込みます：

- `KV_REST_API_URL` (Vercel環境で自動設定)
- `KV_REST_API_TOKEN` (Vercel環境で自動設定)
- `KV_URL` (代替)

Vercel環境では、これらの環境変数は自動的に設定されるため、追加の設定は不要です。

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

## 今後の改善

1. **@upstash/redisへの移行**: 将来的に`@upstash/redis`への移行を検討（`Redis.fromEnv()`の完全なサポート）
2. **型定義の追加**: TypeScriptサポートの追加
3. **メトリクス統合**: KV操作のメトリクス収集

## 参考

- [Vercel KV Documentation](https://vercel.com/docs/storage/vercel-kv)
- [Upstash Redis Documentation](https://docs.upstash.com/redis)
- [Redis.fromEnv() Example](https://docs.upstash.com/redis/sdks/javascriptsdk/getstarted)
