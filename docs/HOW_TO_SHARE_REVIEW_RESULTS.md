# GitHub Copilot Agent レビュー結果の共有方法

## 📋 レビュー完了後の共有方法

### 方法1: PR URLを共有（最も簡単・推奨）

**共有すべきリンク**:
```
PR #9のレビュー結果を確認して: https://github.com/hadayalab-web/cryptosignal-ai/pull/9
```

**私への共有方法**:
チャットで以下を入力するだけ:
```
PR #9のレビュー結果を確認して: https://github.com/hadayalab-web/cryptosignal-ai/pull/9
```

または、より簡潔に:
```
PR #9のレビューを確認
```

---

### 方法2: 特定のコメントURLを共有

Copilot Agentの特定のコメントを共有する場合:

1. **GitHub.comでPR #9を開く**
2. **Copilot Agentのコメントを探す**
3. **コメントの右上の「...」をクリック**
4. **「Copy link」を選択**
5. **私にURLを共有**

**例**:
```
このコメントを確認して: https://github.com/hadayalab-web/cryptosignal-ai/pull/9#issuecomment-1234567890
```

---

### 方法3: スクリプトを使って自動取得

レビューが完了したら、以下のコマンドを実行してください:

```bash
node scripts/get-copilot-review.js 9
```

このスクリプトが:
- PR #9のCopilot Agentレビュー結果を取得
- 共有用のURLを表示
- レビュー内容を表示

その出力を私に共有していただければ、私がレビュー結果を解析します。

---

## 🔄 私がレビュー結果を取得する方法

PR URLまたはコメントURLを共有していただければ、私は以下の方法でレビュー結果を取得できます:

### 1. GitHub CLIを使用

```bash
# PR #9のコメントをすべて取得
gh pr view 9 --json comments --jq '.comments[] | select(.author.login == "copilot-swe-agent")'

# PR #9の詳細とコメントを取得
gh pr view 9 --json number,title,body,comments

# PR #9をブラウザで開く
gh pr view 9 --web
```

### 2. スクリプトを使用

```bash
# レビュー結果を取得・表示
node scripts/get-copilot-review.js 9
```

---

## 📌 推奨ワークフロー

### ステップ1: レビュー完了を確認

GitHub.comでPR #9を確認し、Copilot Agentのコメントがあることを確認。

### ステップ2: 私にPR URLを共有

チャットで以下を入力:
```
PR #9のレビュー結果を確認して: https://github.com/hadayalab-web/cryptosignal-ai/pull/9
```

### ステップ3: 私がレビュー結果を取得・解析

私は自動的に:
1. PR #9のコメントを取得
2. Copilot Agentのレビュー内容を解析
3. 問題点を特定
4. 修正案を提案

### ステップ4: 修正を実施

私が:
1. 問題点を修正
2. コードをコミット・プッシュ
3. Copilot Agentに返信

---

## 💡 便利なコマンド

### PR #9を開く

```bash
gh pr view 9 --web
```

### PR #9のコメントを確認

```bash
gh pr view 9 --comments
```

### Copilot Agentのコメントのみを表示

```bash
gh pr view 9 --json comments --jq '.comments[] | select(.author.login == "copilot-swe-agent") | {createdAt, body}'
```

---

**最終更新**: 2025年12月24日

