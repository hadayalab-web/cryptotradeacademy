# Vercelエラーログ自動取得と分析

## 📋 概要

Vercelのエラーログを自動的に取得し、分析するスクリプトを実装しました。

## 🚀 使用方法

### 1. エラーログの取得

```bash
npm run vercel:logs
```

または

```bash
node scripts/fetch-vercel-logs.js
```

**機能**:
- 過去24時間のVercelログを取得
- エラーログのみをフィルタリング
- `data/vercel-logs/error-logs.json`に保存
- エラーパターン、エラータイプ、ファイル別の集計を実行
- 分析結果を`data/vercel-logs/error-analysis.json`に保存

### 2. エラーログの分析

```bash
npm run vercel:analyze
```

または

```bash
node scripts/analyze-vercel-errors.js
```

**機能**:
- 保存されたエラーログを分析
- エラーパターン、エラータイプ、ファイル別の統計を表示
- トップ10エラーを抽出

## 📊 出力ファイル

### `data/vercel-logs/error-logs.json`
- エラーログの完全なJSON配列
- 各ログには`message`, `timestamp`, `level`などの情報が含まれます

### `data/vercel-logs/error-analysis.json`
- エラーの分析結果
- エラーパターン、エラータイプ、ファイル別の集計
- トップ10エラーのリスト

## ⚙️ 前提条件

1. **Vercel CLIのインストール**:
   ```bash
   npm install -g vercel
   ```

2. **Vercel CLIの認証**:
   ```bash
   vercel login
   ```

3. **プロジェクトのリンク**（初回のみ）:
   ```bash
   vercel link
   ```

## 🔍 分析内容

### エラーパターン
- `SyntaxError`: 構文エラー
- `ReferenceError`: 参照エラー
- `TypeError`: 型エラー
- `ModuleNotFound`: モジュールが見つからない
- `Timeout`: タイムアウトエラー
- `Other`: その他

### エラータイプ別
- エラーの種類ごとの出現回数

### ファイル別
- エラーが発生したファイルとその回数

## 📝 使用例

### デプロイ後のエラーチェック

```bash
# 1. エラーログを取得
npm run vercel:logs

# 2. 分析結果を確認
npm run vercel:analyze

# 3. エラーがある場合は詳細を確認
cat data/vercel-logs/error-logs.json
```

### GitHub Actionsでの自動実行

```yaml
- name: Fetch Vercel Error Logs
  run: npm run vercel:logs
  continue-on-error: true

- name: Analyze Errors
  run: npm run vercel:analyze
  if: always()
```

## 🔗 関連ドキュメント

- [Vercelデプロイエラー修正サマリー](./VERCEL_ERROR_FIX_SUMMARY_2026-01-08.md)
- [Cursor + GitHub + Vercel統合改善案](./CURSOR_GITHUB_VERCEL_INTEGRATION_IMPROVEMENTS.md)
