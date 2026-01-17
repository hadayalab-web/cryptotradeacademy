# PR #18 - Copilot Agents 手動起動ガイド
**最終更新**: 2026-01-17 14:07:03  
**作成日時**: 2026-01-17 14:07:03  
**作成日**: 2026-01-17  

## 🔗 PRリンク

**PR #18**: https://github.com/hadayalab-web/cryptosignal-ai/pull/18

---

## ⚠️ 重要

GitHub Copilot Agentsは**GitHub.com上で手動で起動する必要があります**。

---

## 🚀 起動手順（3ステップ）

### ステップ1: PR #18を開く

ブラウザで以下のURLを開いてください：
```
https://github.com/hadayalab-web/cryptosignal-ai/pull/18
```

### ステップ2: Copilot Chatを開く

PRページで以下を実行：
- コメント欄で `@` キーを押す
- または、サイドバーの「**Ask Copilot**」ボタンをクリック
- または、右上のCopilotアイコンをクリック

### ステップ3: 以下のテキストをコピー&ペースト

```
Vercelデプロイエラーを修正してください。

エラー: Cannot find module '../config/marketProfiles'
問題: vercel.jsonのincludeFiles設定が機能していない
依存関係: api/cron.js → services/grok/client.js → config/marketProfiles.js

依頼:
1. 根本原因の特定
2. 修正案の提案と実装

詳細: docs/COPILOT_VERCEL_DEBUG_REQUEST_2025-12-25.md
```

---

**完了後、Copilot Agentsが自動で作業を開始します。**

