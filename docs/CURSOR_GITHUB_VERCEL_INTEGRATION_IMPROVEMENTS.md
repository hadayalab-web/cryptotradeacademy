# Cursor + GitHub + Vercel 統合改善案

## 🎯 現状の課題

1. **デプロイエラーの早期検知が困難**
   - Vercelのエラーログを手動で確認する必要がある
   - 構文エラーがデプロイ後に発覚する

2. **デプロイ前の自動チェックがない**
   - 構文エラー、依存関係、環境変数の検証が不足
   - ローカルでのテストが不十分

3. **エラーログの取得が手動**
   - Vercel Dashboardから手動でログをエクスポート
   - エラーの分析が後手に回る

4. **マルチ言語デプロイの管理が煩雑**
   - 6言語（en, es, pt-br, ar, ja, ko）のデプロイを個別に管理
   - 環境変数の同期が手動

## 💡 改善案

### 1. デプロイ前の自動チェック（推奨度: ⭐⭐⭐⭐⭐）

#### 1.1 Pre-commitフックの追加

**実装方法**:
```bash
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# 構文チェック
npm run lint
npm run type-check

# ビルドテスト
npm run build:test
```

**package.jsonに追加**:
```json
{
  "scripts": {
    "lint": "eslint api/**/*.js",
    "type-check": "node --check api/cron.js",
    "build:test": "node scripts/verify-build.js",
    "predeploy": "npm run lint && npm run type-check"
  }
}
```

#### 1.2 構文エラーチェックスクリプト

**scripts/verify-syntax.js**:
```javascript
const { execSync } = require('child_process');
const fs = require('fs');

const files = [
  'api/cron.js',
  'api/prepare.js',
  'api/weekly-report.js',
];

let hasError = false;

files.forEach(file => {
  try {
    execSync(`node --check ${file}`, { stdio: 'inherit' });
    console.log(`✅ ${file}: Syntax OK`);
  } catch (error) {
    console.error(`❌ ${file}: Syntax Error`);
    hasError = true;
  }
});

if (hasError) {
  process.exit(1);
}
```

### 2. GitHub Actionsとの統合（推奨度: ⭐⭐⭐⭐）

#### 2.1 CI/CDパイプラインの構築

**.github/workflows/vercel-deploy.yml**:
```yaml
name: Vercel Deploy Check

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  syntax-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: node scripts/verify-syntax.js

  deploy-preview:
    needs: syntax-check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

#### 2.2 デプロイステータスの通知

**GitHub Actions + Slack/Discord通知**:
```yaml
- name: Notify Deployment Status
  if: always()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    text: 'Vercel deployment ${{ job.status }}'
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### 3. Vercel CLIの統合（推奨度: ⭐⭐⭐⭐）✅ **既に実装済み**

#### 3.1 ローカルでのデプロイテスト

**現在の実装状況**:
- Vercel CLIは既に統合済み
- `vercel logs`コマンドでログ取得可能

**追加実装**:
- `scripts/fetch-vercel-logs.js`: エラーログの自動取得スクリプト ✅ 実装済み
- `scripts/analyze-vercel-errors.js`: エラーログの分析スクリプト ✅ 実装済み

#### 3.2 デプロイ前の自動検証

**scripts/pre-deploy-check.js**:
```javascript
const { execSync } = require('child_process');

console.log('🔍 Pre-deploy checks...');

// 1. 構文チェック
console.log('1. Checking syntax...');
execSync('node scripts/verify-syntax.js', { stdio: 'inherit' });

// 2. 依存関係チェック
console.log('2. Checking dependencies...');
execSync('npm audit --audit-level=moderate', { stdio: 'inherit' });

// 3. 環境変数チェック
console.log('3. Checking environment variables...');
const requiredEnvVars = [
  'TELEGRAM_BOT_TOKEN',
  'CRYPTOQUANT_API_KEY',
  'GROK_API_KEY',
];
// 環境変数の検証ロジック

console.log('✅ All pre-deploy checks passed!');
```

### 4. エラーログの自動取得と分析（推奨度: ⭐⭐⭐）✅ **実装済み**

#### 4.1 Vercel CLIを使用したログ取得

**scripts/fetch-vercel-logs.js** ✅ 実装済み:
- Vercel CLIで過去24時間のログを取得
- エラーログのみをフィルタリング
- `data/vercel-logs/error-logs.json`に保存
- エラーパターン、エラータイプ、ファイル別の集計を実行

**使用方法**:
```bash
npm run vercel:logs
# または
node scripts/fetch-vercel-logs.js
```

#### 4.2 エラーパターンの自動分析

**scripts/analyze-vercel-errors.js** ✅ 実装済み:
- 保存されたエラーログを分析
- エラーパターン、エラータイプ、ファイル別の統計を表示
- トップ10エラーを抽出

**使用方法**:
```bash
npm run vercel:analyze
# または
node scripts/analyze-vercel-errors.js
```

### 5. 環境変数の自動同期（推奨度: ⭐⭐⭐）📝 **GitHubで管理中**

#### 5.1 環境変数の一元管理

**現状**:
- 環境変数はGitHubで管理されています
- 各言語のVercelプロジェクトに手動で設定する必要があります

**将来的な改善案**:
- GitHub SecretsとVercel環境変数の自動同期スクリプト
- マルチ言語デプロイ時の環境変数一括設定

**注意**: 環境変数は機密情報のため、GitHubでの管理が推奨されます。

### 6. Cursor拡張機能の活用（推奨度: ⭐⭐⭐⭐）

#### 6.1 Cursor Rulesの活用

**.cursorrules**に追加:
```
- Vercelデプロイ前に構文チェックを実行
- 変数の重複宣言を検出
- デプロイ前の自動テストを実行
```

#### 6.2 Cursor Composerでの自動修正

**推奨ワークフロー**:
1. コード変更後、Cursor Composerで「構文チェックとデプロイ準備」を実行
2. 自動的に構文エラーを検出・修正
3. デプロイ前のチェックリストを自動生成

### 7. マルチ言語デプロイの自動化（推奨度: ⭐⭐⭐⭐）

#### 7.1 デプロイスクリプトの統一

**scripts/deploy-all-languages.js**:
```javascript
const { execSync } = require('child_process');
const languages = ['en', 'es', 'pt-br', 'ar', 'ja', 'ko'];

languages.forEach(lang => {
  console.log(`Deploying ${lang}...`);
  execSync(`LANG=${lang} vercel --prod`, {
    stdio: 'inherit',
    env: { ...process.env, LANG: lang }
  });
});
```

## 🚀 実装優先順位

### Phase 1: 即座に実装（緊急度: 高）
1. ✅ **構文エラーチェックスクリプト** - 今回のエラーを防ぐ
2. ✅ **Pre-commitフック** - コミット前にエラーを検出

### Phase 2: 短期実装（1-2週間）
3. **GitHub Actions CI/CD** - 自動テストとデプロイ
4. ✅ **Vercel CLI統合** - 既に実装済み

### Phase 3: 中期実装（1ヶ月）
5. ✅ **エラーログ自動取得** - 実装済み（`scripts/fetch-vercel-logs.js`）
6. 📝 **環境変数自動同期** - GitHubで管理中（将来的な改善案）

## 📚 参考リソース

- [Vercel CLI Documentation](https://vercel.com/docs/cli)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Cursor Rules Documentation](https://cursor.sh/docs)
- [Vercel API Documentation](https://vercel.com/docs/rest-api)

## 🔗 統合ツール

### 推奨ツールチェーン

1. **開発環境**: Cursor + ESLint + Prettier
2. **CI/CD**: GitHub Actions + Vercel CLI
3. **モニタリング**: Vercel Analytics + Sentry（オプション）
4. **通知**: Slack/Discord + GitHub Notifications

### 設定例

**`.github/workflows/ci.yml`**:
```yaml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run lint
      - run: npm run test
      - run: node scripts/verify-syntax.js
```

**`.cursorrules`**:
```
# Vercelデプロイ前の自動チェック
- コミット前に構文チェックを実行
- 変数の重複宣言を検出
- デプロイ前のチェックリストを自動生成
```
