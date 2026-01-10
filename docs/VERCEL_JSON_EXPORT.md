# VercelエラーログのJSON取得方法

## 📋 概要

VercelのエラーログをJSON形式で取得する方法は2つあります：

1. **Vercel CLIを使用した自動取得**（推奨・既に実装済み）
2. **Vercelダッシュボードからの手動エクスポート**

## 🚀 方法1: Vercel CLIを使用（自動化・推奨）

### 実装済みの機能

既に`scripts/fetch-vercel-logs.js`でJSON形式で取得しています：

```bash
npm run vercel:logs
```

### 取得されるJSONファイル

1. **`data/vercel-logs/raw-logs.json`**
   - 全ログ（フィルタリング前）
   - Vercel CLIから取得した生のJSONデータ

2. **`data/vercel-logs/error-logs.json`**
   - エラーログのみ（フィルタリング後）
   - エラー分析用に最適化

3. **`data/vercel-logs/error-analysis.json`**
   - エラー分析結果
   - エラーパターン、エラータイプ、ファイル別の集計

### JSON形式の例

```json
[
  {
    "timestamp": "2026-01-09T05:15:32.471Z",
    "level": "error",
    "message": "SyntaxError: Unexpected token 'else'",
    "requestPath": "/api/cron",
    "responseStatusCode": 500,
    "deploymentId": "dpl_4MynWz3Ynwi7NzNDhyjdhRUb6PKw"
  }
]
```

### メリット

- ✅ **自動化**: ワンコマンドで取得
- ✅ **フィルタリング**: エラーのみ自動抽出
- ✅ **分析機能**: エラーパターンの自動分析
- ✅ **CSV変換**: 必要に応じてCSV形式にも変換
- ✅ **GitHub Issue**: エラー検出時に自動でIssue作成

## 📊 方法2: Vercelダッシュボードからの手動エクスポート

### 手順

1. Vercelダッシュボードにアクセス
2. プロジェクトの「Logs」タブを開く
3. 右上の「...」メニューをクリック
4. 「**Export to JSON**」を選択
5. JSONファイルをダウンロード

### メリット

- ✅ **視覚的**: ダッシュボードで確認しながらエクスポート
- ✅ **簡単**: クリックだけで取得

### デメリット

- ❌ **手動操作**: 毎回手動でエクスポートが必要
- ❌ **自動化不可**: スクリプトで自動実行できない
- ❌ **フィルタリング**: エラーのみ抽出するには手動でフィルタリングが必要

## 🎯 推奨ワークフロー

### 通常の運用（自動化）

```bash
# 1. ログを取得（JSON形式で自動保存）
npm run vercel:logs

# 2. Cursorで直接読み取る
@data/vercel-logs/error-logs.json

# 3. エラーがある場合はGitHub Issueを自動作成
npm run vercel:issue
```

### 緊急時の確認（手動）

1. Vercelダッシュボードで「Export to JSON」
2. ダウンロードしたJSONファイルをCursorにドラッグ&ドロップ
3. `@ファイル名.json`で参照

## 📁 ファイル構成

```
data/vercel-logs/
├── raw-logs.json              # 生のJSONログ（全ログ）
├── error-logs.json            # エラーログのみ（JSON形式）
├── error-analysis.json        # エラー分析結果（JSON形式）
├── latest-errors.csv          # CSV形式（Cursor用）
└── latest-vercel-errors.csv   # 最新エラーログ（CSV形式）
```

## 💡 Cursorでの使用方法

### JSONファイルを直接参照

```bash
# エラーログを分析
@data/vercel-logs/error-logs.json このエラーを分析して修正方法を教えて

# 生のログを確認
@data/vercel-logs/raw-logs.json このログからエラーを抽出して

# 分析結果を確認
@data/vercel-logs/error-analysis.json この分析結果を見て問題を特定して
```

## 🔄 自動化オプション

### GitHub Actionsでの定期実行

```yaml
name: Vercel Error Monitor

on:
  schedule:
    - cron: '*/15 * * * *'  # 15分ごと

jobs:
  monitor:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - name: Install Vercel CLI
        run: npm install -g vercel
      - name: Fetch logs (JSON)
        run: npm run vercel:logs
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
      - name: Upload JSON logs
        uses: actions/upload-artifact@v3
        with:
          name: vercel-logs
          path: data/vercel-logs/*.json
```

## 📝 まとめ

- **既にJSON形式で取得しています** ✅
- **自動化されているため、手動エクスポートは不要** ✅
- **Cursorで直接参照可能** ✅
- **エラー分析も自動化** ✅

Vercelダッシュボードの「Export to JSON」は緊急時の確認用として便利ですが、通常の運用では`npm run vercel:logs`で自動取得することを推奨します。
