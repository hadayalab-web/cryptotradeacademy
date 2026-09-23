# チャットセッション軽量化ガイド

## 🎯 問題
長期間続けているチャットが重くなり、パフォーマンスが低下している。

## ✅ 解決方法

### 方法1: 現在のチャットを保存して新しいセッションを開始（推奨）

1. **現在のチャットをSpecStoryに保存**
   - このチャットで「この会話をSpecStoryに保存してください」と依頼
   - または、重要な内容を手動でMarkdownファイルにコピー

2. **新しいチャットセッションを開始**
   - Cursorで新しいチャットを開く
   - 必要に応じて、保存したMarkdownファイルを`@`で参照

### 方法2: チャット履歴をアーカイブ

古いチャット履歴をアーカイブして、Cursorの読み込みを軽くします。

```powershell
# 30日以上前のチャット履歴をアーカイブ
$archiveDir = "$env:APPDATA\Cursor\User\History\Archive"
New-Item -ItemType Directory -Path $archiveDir -Force | Out-Null

$cutoffDate = (Get-Date).AddDays(-30)
Get-ChildItem "$env:APPDATA\Cursor\User\History" -Directory | 
    Where-Object { $_.LastWriteTime -lt $cutoffDate } |
    Move-Item -Destination $archiveDir -Force
```

### 方法3: Cursorのキャッシュをクリア

```powershell
# Cursorを完全に終了してから実行
Remove-Item "$env:APPDATA\Cursor\Cache\*" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "$env:LOCALAPPDATA\Cursor\Cache\*" -Recurse -Force -ErrorAction SilentlyContinue
```

## 📝 推奨ワークフロー

1. **重要な会話は定期的に保存**
   - 週に1回、重要なチャットをSpecStoryに保存
   - または、Markdownファイルとして`docs/chat-history/`に保存

2. **チャットが長くなったら分割**
   - 100メッセージ以上になったら新しいセッションを開始
   - 前のセッションの重要な内容を`@`で参照

3. **定期的なメンテナンス**
   - 月に1回、古いチャット履歴をアーカイブ
   - キャッシュをクリア

## ⚠️ 注意事項

- チャット履歴を削除する前に、必ずバックアップを取る
- SpecStoryが有効な場合、自動的に保存される
- 重要な内容は手動でMarkdownファイルに保存することを推奨
