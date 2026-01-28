# Vercelデプロイ修正 - includeFiles設定の改善

## 問題
デプロイが正常に完了していない（`https://cryptotradeacademy-eobeqmiin-hadayalab-projects-projects.vercel.app`）

## 原因分析

### 現在の設定の問題点
```json
{
  "functions": {
    "api/cron.js": {
      "includeFiles": [
        "services/telegram/messages/shared/**",
        "services/telegram/messages/user/**"
      ]
    }
  }
}
```

### 問題の本質
1. **動的`require()`の検出不足**: `api/cron.js`の`loadUserTemplates`関数で動的に`require()`を使用
   ```javascript
   require(`../services/telegram/messages/user/${lang}/regular.${lang}`)
   ```
2. **VercelのNode File Trace**: 動的な`require()`は検出できない可能性がある
3. **間接的な依存関係**: `shared/contentFilters.js`が`user/**`からrequireされるが、パターンが狭すぎる可能性

## 修正内容

### より広範囲な`includeFiles`設定
```json
{
  "functions": {
    "api/cron.js": {
      "includeFiles": [
        "services/telegram/messages/**",
        "services/telegram/**",
        "services/**"
      ]
    }
  }
}
```

### 修正理由
1. **`services/telegram/messages/**`**: すべてのメッセージテンプレートを含める
2. **`services/telegram/**`**: Telegram関連のすべてのサービスを含める
3. **`services/**`**: フォールバックとして、すべてのサービスを含める

これにより、動的な`require()`で参照されるすべてのファイルが確実に含まれます。

## 期待される効果
- ✅ `contentFilters.js`が確実にデプロイバンドルに含まれる
- ✅ すべての言語テンプレートが含まれる
- ✅ 動的な`require()`で参照されるファイルが含まれる
