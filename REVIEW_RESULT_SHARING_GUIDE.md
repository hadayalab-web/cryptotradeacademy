# レビュー結果の共有ガイド - クイックリファレンス

## 🎯 レビュー完了後、私（Auto）に共有する方法

### ✅ 最も簡単な方法（推奨）

**PR URLを共有するだけ**:

```
PR #9のレビュー結果を確認して: https://github.com/hadayalab-web/cryptosignal-ai/pull/9
```

これだけで、私が自動的に:
1. ✅ PR #9のコメントを取得
2. ✅ Copilot Agentのレビューを解析
3. ✅ 問題点を特定
4. ✅ 修正案を提案
5. ✅ 修正を実施（指示があれば）
6. ✅ Copilot Agentに返信（必要に応じて）

---

## 📋 双方向レビュー・テスト・デバッグの方法

### パターン1: PRコメント経由（推奨）

#### 流れ:

1. **ユーザー**: PR URLを共有
   ```
   PR #9のレビュー結果を確認して: https://github.com/hadayalab-web/cryptosignal-ai/pull/9
   ```

2. **私（Auto）**: レビュー結果を取得・解析
   - 問題点を特定
   - 修正案を提案

3. **ユーザー**: 修正を承認（または追加指示）

4. **私（Auto）**: 修正を実施してコミット・プッシュ

5. **私（Auto）**: Copilot Agentに返信
   ```bash
   gh pr comment 9 --body "@copilot-swe-agent 修正を実施しました。レビューお願いします。"
   ```

6. **繰り返し**: 必要に応じてステップ1-5を繰り返す

---

### パターン2: Issueコメント経由

1. **Issueを作成**:
   ```bash
   gh issue create --title "Copilot Agent Review Discussion - PR #9"
   ```

2. **Copilot Agentに質問**:
   ```bash
   gh issue comment <ISSUE_NUMBER> --body "@copilot PR #9のレビューで指摘された点について質問があります。"
   ```

3. **私（Auto）がIssueコメントを解析**:
   - Issueコメントを取得
   - Copilot Agentの回答を解析
   - 修正案を提案

4. **修正を実施して返信**

---

### パターン3: スクリプトを使った自動化

#### レビュー結果を取得

```bash
node scripts/get-copilot-review.js 9
```

このスクリプトが:
- PR #9のCopilot Agentレビュー結果を取得
- 共有用のURLを表示
- レビュー内容を整形して表示

#### レビュー結果に返信

```bash
node scripts/respond-to-copilot-review.js 9 "修正を実施しました。レビューお願いします。"
```

---

## 🔧 便利なコマンド

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
gh pr view 9 --json comments --jq '.comments[] | select(.author.login == "copilot-swe-agent") | {createdAt, body, url}'
```

---

## 📝 実際の使用例

### 例1: 基本的なレビュー結果共有

**ユーザー**:
```
PR #9のレビュー結果を確認して: https://github.com/hadayalab-web/cryptosignal-ai/pull/9
```

**私（Auto）の応答**:
- レビュー結果を取得
- 問題点を分析
- 修正案を提案
- 修正を実施（指示があれば）

---

### 例2: 特定のコメントを共有

**ユーザー**:
```
このコメントを確認して: https://github.com/hadayalab-web/cryptosignal-ai/pull/9#issuecomment-1234567890
```

**私（Auto）の応答**:
- 特定のコメントを取得
- そのコメントに基づいて分析
- 対応案を提案

---

### 例3: 修正後の再レビュー依頼

**ユーザー**:
```
PR #9のレビュー結果を確認して修正したので、Copilot Agentに再度レビューを依頼して
```

**私（Auto）の応答**:
1. レビュー結果を確認
2. 修正を実施（まだであれば）
3. Copilot Agentに返信コメントを追加

---

## ✅ まとめ

**最も簡単な方法**:
- PR URLを共有するだけ: `PR #9のレビュー結果を確認して: https://github.com/hadayalab-web/cryptosignal-ai/pull/9`

**私が自動的に**:
- ✅ レビュー結果を取得・解析
- ✅ 問題点を特定
- ✅ 修正案を提案
- ✅ 修正を実施（指示があれば）
- ✅ Copilot Agentに返信（必要に応じて）

**双方向のやり取り**:
- PRコメント経由が最も効率的
- 必要に応じてIssueコメント経由も可能
- スクリプトで自動化も可能

---

**最終更新**: 2025年12月24日

