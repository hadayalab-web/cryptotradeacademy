# アーカイブ - 2025-12-25

このフォルダには、2025-12-25にプロジェクト整理の一環として移動されたファイルが含まれています。

## フォルダ構成

- `documents/` - 一時的なドキュメントファイル
- `verification/` - API検証関連のドキュメント
- `completion/` - プロジェクト完了報告ドキュメント
- `logs/` - 一時的なログファイル
- `backups/` - バックアップファイル
- `empty-files/` - 空ファイル（将来実装予定のプレースホルダー）

## 復元方法

必要に応じて、以下のコマンドでファイルを復元できます：

```powershell
# 例: 検証関連ドキュメントを復元
Copy-Item "_archive\2025-12-25\verification\*" -Destination "." -Recurse
```

## 削除方法

このアーカイブが不要になった場合は、以下のコマンドで削除できます：

```powershell
Remove-Item "_archive\2025-12-25" -Recurse -Force
```









