# コミット・プッシュ・デプロイコマンド

## 今回の修正内容
1. **api/cron.js**: Regular Briefing配信の`integratedOptimization`スコープ問題を修正
2. **services/gpt/client.js**: GPT-5.2-2025-12-11のAPI呼び出しを公式仕様に準拠

## 実行コマンド

### 1. 変更ファイルをステージング
```powershell
git add api/cron.js services/gpt/client.js
```

### 2. コミット
```powershell
git commit -m "fix: Regular Briefing配信エラー修正とGPT-5.2-2025-12-11 API仕様準拠

- api/cron.js: integratedOptimizationのスコープ問題を修正（関数スコープの最初で定義）
- services/gpt/client.js: GPT-5.2-2025-12-11のAPI呼び出しを公式仕様に準拠（max_completion_tokens追加）

修正内容:
- JST 15時（UTC 6時）のRegular Briefing配信が6言語すべてで失敗していた問題を修正
- GPT APIタイムアウト時のエラーハンドリングを改善
- GPT-5.2-2025-12-11の公式API仕様に準拠（max_completion_tokensパラメータ追加）"
```

### 3. プッシュ
```powershell
git push origin main
```

### 4. Vercelデプロイ確認
Vercelは通常、mainブランチへのプッシュで自動デプロイされます。
デプロイ状況は以下で確認できます：
- Vercel Dashboard: https://vercel.com/dashboard
- または、Vercel CLIで確認: `vercel --prod`

## すべての変更をコミットする場合

もし他の変更も含めてコミットする場合は：

```powershell
# すべての変更をステージング
git add .

# コミット
git commit -m "fix: Regular Briefing配信エラー修正とGPT-5.2-2025-12-11 API仕様準拠

- api/cron.js: integratedOptimizationのスコープ問題を修正
- services/gpt/client.js: GPT-5.2-2025-12-11のAPI呼び出しを公式仕様に準拠
- その他の改善とバグ修正"

# プッシュ
git push origin main
```
