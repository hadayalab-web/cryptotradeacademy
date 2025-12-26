# GitHub Copilot Agents 応答しない場合の対処法

## 問題
GitHub Copilot AgentsがIssueコメントに応答しない

## 対処法

### 方法1: PRを作成してレビュー依頼

GitHub Copilot AgentsはPRでのレビューがより確実に動作します。

```bash
# ブランチは既に作成済み
git checkout copilot-review-vercel-error-jst2100

# PRを作成
gh pr create --title "[URGENT] Vercel deployment error - config/marketProfiles not found" \
  --body "## Review Request for @copilot

@copilot このPRをレビューしてください。

### 問題
Vercelデプロイで\`config/\`フォルダが含まれず、\`Cannot find module '../config/marketProfiles'\`エラーが発生。

### レビュー依頼
1. \`vercel.json\`の\`includeFiles: \"config/**\"\`設定が正しいか確認
2. 代替解決策の提案（構文変更、ファイル構造変更など）
3. テスト方法の提供

詳細: \`docs/VERCEL_ERROR_ANALYSIS_JST2100_2025-12-25.md\`
"
```

### 方法2: Issueの説明文を編集

Issueの説明文（body）に直接`@copilot`を含める方法がより確実です。

```bash
gh issue edit 15 --body-file docs/COPILOT_ISSUE_BODY.md
```

### 方法3: より具体的なコメントを追加

ファイルへの直接的な参照を含むコメントを追加します。

```markdown
@copilot 以下のファイルを確認して、Vercelデプロイエラーを解決してください:

- vercel.json (lines 5-8): includeFiles設定を確認
- services/grok/client.js (line 4): require('../config/marketProfiles')
- config/marketProfiles.js: このファイルがデプロイに含まれない

エラー: Cannot find module '../config/marketProfiles'
現在の設定: includeFiles: "config/**"

解決策を提案してください。
```

### 方法4: GitHub.com上で手動でCopilot Chatを開く

1. Issue #15を開く: https://github.com/hadayalab-web/cryptosignal-ai/issues/15
2. サイドバーのCopilotアイコンをクリック
3. または、`@`キーを押してCopilot Chatを開く
4. 直接質問を入力:
   ```
   このIssueのVercelデプロイエラーを解決してください。
   vercel.jsonのincludeFiles設定を確認し、config/marketProfilesがデプロイに含まれるようにしてください。
   ```

### 方法5: PRを作成してFiles Changedタブでレビュー依頼

PRを作成後、GitHub.com上で：
1. PRの「Files changed」タブを開く
2. サイドバーのCopilotアイコンをクリック
3. 「Review changes」を選択
4. レビュー依頼を入力

## 推奨方法

**最も確実な方法**: PRを作成してレビュー依頼

PRでのレビューは、コード差分が明確で、Copilot Agentsがより正確に分析できます。







