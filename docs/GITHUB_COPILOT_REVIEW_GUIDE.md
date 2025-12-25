# GitHub Copilot Agent レビュー依頼ガイド

## 📋 概要

GitHub Copilot Agentにコードレビューを依頼するための自動化ツールと手順。

## 🚀 使用方法

### 方法1: npmスクリプトを使用（推奨）

```bash
# 最新のレビューIssueを自動検出して依頼
npm run copilot:review

# 特定のIssue番号を指定
npm run copilot:review -- 3
```

### 方法2: Node.jsスクリプトを直接実行

```bash
# 最新のレビューIssueを自動検出
node scripts/request-copilot-review.js

# 特定のIssue番号を指定
node scripts/request-copilot-review.js 3
```

### 方法3: PowerShellスクリプト（Windows）

```powershell
# 最新のレビューIssueを自動検出
.\scripts\request-copilot-review.ps1

# 特定のIssue番号を指定
.\scripts\request-copilot-review.ps1 -IssueNumber 3
```

## 📝 事前準備

1. **GitHub CLIのインストール**
   ```bash
   # 確認
   gh --version
   
   # 未インストールの場合
   # Windows: winget install GitHub.cli
   # Mac: brew install gh
   # Linux: 各ディストリビューションのパッケージマネージャーでインストール
   ```

2. **GitHub CLIの認証**
   ```bash
   gh auth login
   ```

3. **レビュー依頼Issueの作成**
   - Issueが既に存在する場合: その番号を指定
   - 新規作成の場合: `docs/GITHUB_ISSUE_COPILOT_REVIEW.md`を参照

## 🎯 実行例

### 例1: 最新のレビューIssueに依頼

```bash
$ npm run copilot:review

🔍 Searching for latest review request issue...
✅ Found review issue: #3 - Code Review Request: Binance API Integration & Backtest Improvements

📋 Preparing Copilot review request for issue #3...

📄 Issue: #3 - Code Review Request: Binance API Integration & Backtest Improvements
🔗 URL: https://github.com/hadayalab-web/cryptosignal-ai/issues/3

💬 Adding Copilot review request comment...
✅ Copilot review request added successfully!

📌 Next steps:
   1. Check issue #3: https://github.com/hadayalab-web/cryptosignal-ai/issues/3
   2. Wait for Copilot Agent to process the review
   3. Monitor issue comments for review feedback
```

### 例2: 特定のIssue番号を指定

```bash
$ npm run copilot:review -- 3

📋 Preparing Copilot review request for issue #3...
...
```

## 📋 スクリプトの機能

### `scripts/request-copilot-review.js`

- 最新のレビューIssueを自動検出
- Copilot Agent用のレビューコメントを自動生成
- Issueにコメントを追加

### `scripts/request-copilot-review.ps1`

- PowerShell版（Windows向け）
- 同様の機能を提供

## 🔍 Copilot Agentの動作確認

1. Issueページでコメントを確認
2. Copilot Agentがコメントを処理するまで待機（通常数分）
3. Issueに追加のコメントやPRが作成される場合があります

## 📚 関連ドキュメント

- `docs/COPILOT_REVIEW_REQUEST.md`: レビュー依頼の詳細
- `docs/GITHUB_ISSUE_COPILOT_REVIEW.md`: Issue作成テンプレート
- `docs/IMPLEMENTATION_REVIEW.md`: 実装レビュー結果

## ⚠️ 注意事項

- GitHub CLIの認証が必要です
- Issueが存在しない場合はエラーになります
- Copilot Agentの処理には数分かかる場合があります

## 🆘 トラブルシューティング

### Issueが見つからない

```bash
# すべてのIssueを確認
gh issue list

# レビューIssueを検索
gh issue list --search "review"
```

### GitHub CLIの認証エラー

```bash
# 認証状態を確認
gh auth status

# 再認証
gh auth login
```

### コメントが追加できない

- Issueが閉じられていないか確認
- リポジトリへの書き込み権限があるか確認



