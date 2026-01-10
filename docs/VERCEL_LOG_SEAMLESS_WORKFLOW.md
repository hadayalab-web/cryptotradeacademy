# Vercelログ取得・共有のシームレス化

## 🎯 目的

Vercelのエラーログを手動でダウンロード・共有する手間を削減し、自動化されたワークフローを構築します。

## ✨ 実装した機能

### 1. 自動CSV変換

**スクリプト**: `scripts/vercel-logs-to-csv.js`

Vercel Dashboardと同じCSV形式でログを保存します。Cursorが直接読み取れるよう、標準的な場所に保存されます。

**使用方法**:
```bash
npm run vercel:csv
```

**出力ファイル**:
- `data/vercel-logs/latest-errors.csv`
- `data/vercel-logs/latest-vercel-errors.csv`

### 2. 自動GitHub Issue作成

**スクリプト**: `scripts/create-vercel-error-issue.js`

エラーが検出されたら自動的にGitHub Issueを作成します。

**使用方法**:
```bash
npm run vercel:issue
```

**機能**:
- エラーのサマリーを自動生成
- トップ5エラーを表示
- 影響を受けたファイルをリスト
- 重複Issueを防止（1時間以内の既存Issueにコメント追加）

### 3. ワンコマンド実行

**コマンド**: `npm run vercel:all`

ログ取得→分析→CSV変換→Issue作成を一括実行します。

## 📋 ワークフロー

### 通常のワークフロー

```bash
# 1. ログを取得（自動的にCSVも生成される）
npm run vercel:logs

# 2. Cursorで直接読み取る
@data/vercel-logs/latest-vercel-errors.csv

# 3. GitHub Issueを作成（エラーがある場合）
npm run vercel:issue
```

### 完全自動化ワークフロー

```bash
# 全てを一括実行
npm run vercel:all
```

これにより：
1. Vercelログを取得
2. エラーを分析
3. CSV形式で保存
4. GitHub Issueを自動作成（エラーがある場合）

## 🎯 Cursorでの使用方法

### 直接ログファイルを参照

Cursorのチャットで以下のように指定すると、自動的にログファイルを読み取ります：

```
@data/vercel-logs/latest-vercel-errors.csv
```

または

```
@data/vercel-logs/latest-errors.csv
```

### エラーログの分析依頼

```
@data/vercel-logs/error-logs.json このエラーを分析して修正方法を教えて
```

### エラー分析結果の確認

```
@data/vercel-logs/error-analysis.json この分析結果を見て問題を特定して
```

## 📊 ファイル構成

```
data/vercel-logs/
├── error-logs.json           # エラーログ（JSON形式）
├── error-analysis.json       # エラー分析結果
├── latest-errors.csv         # CSV形式ログ
└── latest-vercel-errors.csv  # 最新エラーログ（CSV）
```

## 🔄 自動化オプション

### GitHub Actionsでの定期実行

`.github/workflows/vercel-error-monitor.yml`:

```yaml
name: Vercel Error Monitor

on:
  schedule:
    - cron: '*/15 * * * *'  # 15分ごと
  workflow_dispatch:

jobs:
  monitor:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install Vercel CLI
        run: npm install -g vercel
      - name: Fetch and analyze logs
        run: npm run vercel:all
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### ローカルでの定期実行

**Windows (Task Scheduler)** または **macOS/Linux (cron)**:

```bash
# 15分ごとに実行
*/15 * * * * cd /path/to/project && npm run vercel:all
```

## 💡 ベストプラクティス

1. **定期的な監視**: `npm run vercel:all`をcronで定期実行
2. **エラー通知**: GitHub Issueが作成されたらSlack/Discordに通知
3. **自動修正**: よくあるエラー（SyntaxErrorなど）は自動検知して修正提案

## 🚀 今後の改善案

1. **自動修正PR作成**: よくあるエラーを検出したら自動的に修正PRを作成
2. **エラー通知**: Issue作成時にSlack/Discordにも通知
3. **ダッシュボード**: エラー統計の可視化
4. **予測**: エラーの傾向を分析して事前に警告
