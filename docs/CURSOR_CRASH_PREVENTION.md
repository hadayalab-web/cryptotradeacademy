# Cursorクラッシュ対策ガイド

## 🔴 問題の概要

Cursor IDEが大量のデータ処理時にクラッシュする問題が発生しています。

## 🎯 主な原因

1. **大量データの一括処理**
   - `execSync`で全ログを一度にメモリに読み込む
   - 大きなJSONパースによるメモリ不足

2. **レスポンスサイズの肥大化**
   - ツール呼び出しのレスポンスが大きすぎる
   - 複数の大きなファイルを同時に読み込む

3. **メモリリーク**
   - バッチ処理なしのループ処理
   - ガベージコレクションが追いつかない

## ✅ 実装した対策

### 1. ログ取得スクリプトの最適化

#### `scripts/fetch-vercel-logs.js`（改善版）
- **時間範囲を短縮**: `--since 24h` → `--since 6h`
- **maxBuffer削減**: 10MB → 5MB
- **タイムアウト設定**: 30秒
- **ログ数制限**: 最大5,000件
- **メッセージ長制限**: 最大3,000文字
- **出力サイズ制限**: トップ5のみ表示

#### `scripts/fetch-vercel-logs-safe.js`（安全版）
- **ストリーミング処理**: `execSync` → `spawn`
- **バッチ処理**: 100件ずつ処理
- **メモリ監視**: ガベージコレクション促進
- **ストリーミング書き込み**: ファイル書き込みもストリーミング

### 2. 使用推奨

```bash
# 通常版（改善済み）
npm run vercel:logs

# 安全版（大量ログ時推奨）
npm run vercel:logs:safe
```

### 3. 設定パラメータ

| パラメータ | 通常版 | 安全版 | 説明 |
|-----------|--------|--------|------|
| 時間範囲 | 6時間 | 6時間 | メモリ使用量削減 |
| 最大ログ数 | 5,000 | 10,000 | メモリ保護 |
| メッセージ長 | 3,000文字 | 5,000文字 | メモリ保護 |
| 処理方式 | execSync | spawn | ストリーミング |
| タイムアウト | 30秒 | 60秒 | ハング防止 |

## 🛡️ その他の対策

### 1. ファイル読み込みの最適化

```javascript
// ❌ 悪い例: 大きなファイルを一度に読み込む
const data = fs.readFileSync('large-file.json', 'utf-8');

// ✅ 良い例: ストリーミング読み込み
const stream = fs.createReadStream('large-file.json');
// または行単位で処理
```

### 2. バッチ処理の実装

```javascript
// ❌ 悪い例: 全データを一度に処理
data.forEach(item => process(item));

// ✅ 良い例: バッチ処理
for (let i = 0; i < data.length; i += BATCH_SIZE) {
  const batch = data.slice(i, i + BATCH_SIZE);
  batch.forEach(item => process(item));
}
```

### 3. レスポンスサイズの制限

- ツール呼び出しの結果を制限
- 不要なデータを除外
- サマリー形式で返す

### 4. 並列処理の制限

- 同時に実行するツール数を制限
- 大きなファイルの同時読み込みを避ける

## 📊 メモリ使用量の監視

### Node.jsメモリ制限の確認

```bash
node --max-old-space-size=4096 script.js  # 4GB制限
```

### メモリ使用量の確認

```javascript
const used = process.memoryUsage();
console.log('Memory:', {
  rss: `${Math.round(used.rss / 1024 / 1024)}MB`,
  heapTotal: `${Math.round(used.heapTotal / 1024 / 1024)}MB`,
  heapUsed: `${Math.round(used.heapUsed / 1024 / 1024)}MB`
});
```

## 🚨 緊急時の対処法

1. **Cursorを再起動**
2. **安全版スクリプトを使用**: `npm run vercel:logs:safe`
3. **時間範囲を短縮**: `--since 1h` など
4. **ログ数を制限**: 最初の1000件のみ処理

## 📝 ベストプラクティス

1. **大きなデータは分割処理**
2. **ストリーミング処理を優先**
3. **バッチサイズを適切に設定**
4. **タイムアウトを設定**
5. **メモリ使用量を監視**
