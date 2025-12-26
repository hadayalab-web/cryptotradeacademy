# GitHub Copilot Agent トリガーガイド

## ⚠️ 重要な注意事項

GitHub Copilot Agentは**Pull Request**で主に動作します。Issueのみではレビューが開始されない可能性があります。

## 🔍 現在の状況確認

Issue #3にコメントを追加しましたが、Copilot Agentが反応していない場合、以下の方法を試してください。

## ✅ 推奨方法: Pull Requestを作成

### 方法1: 自動PR作成スクリプトを使用

```bash
# Issue #3用のPRを作成
node scripts/create-copilot-review-pr.js 3
```

このスクリプトは：
1. レビュー用ブランチを作成
2. Pull Requestを作成
3. Copilot Agentにレビューコメントを追加

### 方法2: 手動でPRを作成

1. **レビューブランチを作成**
   ```bash
   git checkout -b copilot-review-issue-3
   git push -u origin copilot-review-issue-3
   ```

2. **GitHubでPRを作成**
   - Base: `main`
   - Compare: `copilot-review-issue-3`
   - Title: "Copilot Agent Review: Binance API Integration & Backtest Improvements"
   - Description: Issue #3を参照

3. **PRにCopilot Agentコメントを追加**
   ```
   @copilot Please review this PR and provide feedback on:
   - Code quality
   - Logic correctness
   - Error handling
   - Performance
   - Documentation
   ```

## 🔧 IssueでのCopilot Agent使用（限定的）

IssueでCopilot Agentを使用する場合：

1. **IssueにCopilotをアサイン**
   - GitHub UIでIssueを開く
   - "Assignees"をクリック
   - `@copilot` を検索してアサイン（可能な場合）

2. **詳細なコメントを追加**
   ```
   @copilot Please review the following files:

   - services/binance/client.js
   - services/cryptoquant/deepMetrics.js
   - logic/core/marketCore.js
   - api/cron.js
   - scripts/backtest/autoTuner.js

   Review focus:
   - Code quality and best practices
   - Logic correctness
   - Error handling
   - Performance optimization
   ```

3. **👀 絵文字の確認**
   - Copilot Agentがコメントを認識すると、👀（目の絵文字）が追加されます
   - この絵文字が表示されない場合、Copilot Agentが認識していない可能性があります

## 📋 Copilot Agentの動作確認

### 確認ポイント

1. **👀 絵文字が追加されているか**
   - コメントに👀が表示されれば、Copilot Agentが認識した証拠

2. **PRまたはIssueに応答があるか**
   - Copilot Agentは通常、数分以内に応答を開始します

3. **セッションタイムアウト**
   - 1時間経過するとセッションがタイムアウトする可能性があります
   - その場合は、アサインを解除して再度アサインしてください

## 🎯 最適な方法

**Pull Requestを作成することを強く推奨します。**

理由：
- Copilot AgentはPRで最も効果的に動作します
- コード差分が明確に表示されます
- レビューコメントがコードの特定行にリンクできます
- フィードバックの管理が容易です

## 🚀 次のステップ

```bash
# PR作成スクリプトを実行
node scripts/create-copilot-review-pr.js 3
```

これにより、Copilot Agentがレビューを開始できる状態になります。







