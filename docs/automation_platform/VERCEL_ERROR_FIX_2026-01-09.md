# Vercelエラー修正 - 2026-01-09

**作成日**: 2026-01-09  
**目的**: Vercelデプロイエラーの根本原因を解決

---

## 🔍 問題の原因

### エラー内容
```
Cannot find module '../config/marketProfiles'
```

### 根本原因

1. **`vercel.json`の設定が不正**
   - `includeFiles`が文字列形式になっていた（配列形式である必要がある）
   - 必要なディレクトリ（`services/`, `logic/`, `utils/`）が含まれていなかった

2. **Vercelのサーバーレス関数の制限**
   - Vercelは`api/`ディレクトリ内のファイルのみをデプロイする
   - `api/`の外にある`services/`, `logic/`, `utils/`, `config/`ディレクトリは明示的に`includeFiles`に追加する必要がある

3. **依存関係の不足**
   - `api/cron.js`が多くの外部モジュールを参照している
   - これらのモジュールがデプロイバンドルに含まれていなかった

---

## ✅ 実装した修正

### 1. `vercel.json`の修正

**変更前**:
```json
{
  "functions": {
    "api/cron.js": {
      "includeFiles": "config/**"  // ❌ 文字列形式
    }
  }
}
```

**変更後**:
```json
{
  "functions": {
    "api/cron.js": {
      "includeFiles": [  // ✅ 配列形式
        "config/**",
        "services/**",
        "logic/**",
        "utils/**"
      ]
    }
  }
}
```

### 2. すべてのAPIエンドポイントに適用

以下のエンドポイントすべてに同じ設定を適用：
- `api/cron.js`
- `api/prepare.js`
- `api/weekly-report.js`
- `api/analytics.js`
- `api/track.js`

---

## 📋 修正内容の詳細

### 含まれるディレクトリ

1. **`config/**`**
   - `config/marketProfiles.js`
   - `config/thresholds.js`

2. **`services/**`**
   - `services/grok/client.js`
   - `services/gpt/client.js`
   - `services/telegram/bot.js`
   - `services/cryptoquant/**`
   - `services/binance/**`
   - `services/upbit/**`
   - その他すべてのサービスファイル

3. **`logic/**`**
   - `logic/core/marketCore.js`
   - `logic/core/trapDetector.js`
   - `logic/tier1_btc/**`
   - `logic/tier2_altseason/**`
   - `logic/tier3_alpha/**`
   - `logic/eventTriggers.js`

4. **`utils/**`**
   - `utils/logger.js`
   - `utils/stateManager.js`
   - `utils/missedOpportunities.js`
   - その他すべてのユーティリティファイル

---

## 🎯 期待される効果

### Before（修正前）

- ❌ すべてのデプロイが失敗
- ❌ `Cannot find module '../config/marketProfiles'`エラー
- ❌ Cron実行が500エラー

### After（修正後）

- ✅ デプロイが正常に完了
- ✅ すべてのモジュールが正しく読み込まれる
- ✅ Cron実行が正常に動作

---

## 🔧 検証方法

### 1. デプロイの確認

```bash
cd cryptosignal-ai
vercel --prod
```

### 2. エラーログの確認

```bash
npm run vercel:logs
```

### 3. Cron実行の確認

- VercelダッシュボードでCron実行ログを確認
- 15分ごとのCron実行が正常に完了することを確認

---

## 📝 注意事項

### 1. ファイルサイズの制限

Vercelのサーバーレス関数には以下の制限があります：
- **関数サイズ**: 最大50MB（圧縮後）
- **実行時間**: 最大60秒（Hobbyプラン）、300秒（Proプラン）

現在の設定でこれらの制限を超えないことを確認してください。

### 2. デプロイ時間

`includeFiles`に多くのファイルを含めると、デプロイ時間が長くなる可能性があります。

### 3. 今後の追加ファイル

新しいディレクトリを追加する場合は、`vercel.json`の`includeFiles`にも追加する必要があります。

---

## 🚀 次のステップ

1. **デプロイを実行**
   ```bash
   cd cryptosignal-ai
   vercel --prod
   ```

2. **エラーログを監視**
   ```bash
   npm run vercel:logs
   ```

3. **Cron実行を確認**
   - VercelダッシュボードでCron実行ログを確認
   - 15分ごとのCron実行が正常に完了することを確認

---

## 📚 関連ドキュメント

- [Vercel Functions Configuration](https://vercel.com/docs/functions/serverless-functions/runtimes/node-js#including-additional-files)
- [Vercel includeFiles Documentation](https://vercel.com/docs/functions/serverless-functions/runtimes/node-js#including-additional-files)

---

**最終更新**: 2026-01-09  
**ステータス**: ✅ 修正完了
