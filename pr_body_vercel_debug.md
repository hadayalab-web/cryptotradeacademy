# 🚨 Vercelデプロイエラー - 検証・デバッグ依頼

## 問題の概要

Vercelデプロイが継続的に失敗しており、`Cannot find module '../config/marketProfiles'`エラーが発生しています。

**現在の状態**: 🚨 デプロイが完全に失敗している

## エラーメッセージ

```
Cannot find module '../config/marketProfiles'
Require stack:
- /var/task/services/grok/client.js
- /var/task/api/cron.js
```

## 依存関係の構造

```
api/cron.js
  ↓ require
services/grok/client.js (line 4)
  ↓ require('../config/marketProfiles')
config/marketProfiles.js  ← 見つからない
```

## 試行した修正

1. ❌ `"includeFiles": "config/**"` (文字列形式)
2. ❌ `"includeFiles": ["config/**"]` (配列形式)
3. ❌ `"includeFiles": ["config/**/*", "config/*"]` (明示的なパターン)

**すべて失敗しました。**

## 現在のvercel.json設定

```json
{
  "crons": [
    { "path": "/api/cron", "schedule": "*/15 * * * *" }
  ],
  "functions": {
    "api/cron.js": {
      "includeFiles": ["config/**/*", "config/*"]
    }
  }
}
```

## 依頼事項

1. **根本原因の特定**: Vercelの`includeFiles`が間接的な依存関係を処理していない可能性
2. **修正案の提案**: 代替解決策の検討（ビルドスクリプト、構造変更など）
3. **修正の実装**: 提案された解決策の実装

## 関連ドキュメント

詳細は `docs/COPILOT_VERCEL_DEBUG_REQUEST_2025-12-25.md` を参照してください。

---

@github-copilot このPRをレビューして、根本原因を特定し、修正案を提案してください。

