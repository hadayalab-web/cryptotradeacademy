# Cursor インストール済み拡張機能 完全リスト

**作成日**: 2026-01-09  
**最終更新**: 2026-01-09

## 📊 概要

Cursorにインストール済みの拡張機能を完全リストアップしました。

### カテゴリー別サマリー

- **Cursor内蔵拡張機能**: 106個（標準機能）
- **ユーザー拡張機能**: 35個（既存ドキュメントより）
- **合計**: 141個

---

## 🔍 Cursor内蔵拡張機能（106個）

### Cursor専用機能（13個）

1. `anysphere.cursor-agent-exec` - Cursor Agent実行機能
2. `anysphere.cursor-always-local` - Always Local機能
3. `anysphere.cursor-android-emulator-connect` - Android Emulator接続
4. `anysphere.cursor-browser-extension` - ブラウザ拡張機能
5. `anysphere.cursor-commits` - コミット機能
6. `anysphere.cursor-deeplink` - ディープリンク機能
7. `anysphere.cursor-file-service` - ファイルサービス
8. `anysphere.cursor-ios-simulator-connect` - iOS Simulator接続
9. `anysphere.cursor-mcp` - MCP（Model Context Protocol）機能 ⭐
10. `anysphere.cursor-ndjson-ingest` - NDJSON取り込み
11. `anysphere.cursor-retrieval` - 検索・取得機能
12. `anysphere.cursor-shadow-workspace` - Shadow Workspace機能
13. `cursor.cursor-browser-automation` - ブラウザ自動化機能

### VS Code標準拡張機能（93個）

#### 言語サポート
- `vscode.bat` - Batchファイル
- `vscode.clojure` - Clojure
- `vscode.coffeescript` - CoffeeScript
- `vscode.cpp` - C++
- `vscode.csharp` - C#
- `vscode.css` / `vscode.css-language-features` - CSS
- `vscode.dart` - Dart
- `vscode.fsharp` - F#
- `vscode.go` - Go
- `vscode.groovy` - Groovy
- `vscode.handlebars` - Handlebars
- `vscode.hlsl` - HLSL
- `vscode.html` / `vscode.html-language-features` - HTML
- `vscode.java` - Java
- `vscode.javascript` - JavaScript
- `vscode.json` / `vscode.json-language-features` - JSON
- `vscode.julia` - Julia
- `vscode.latex` - LaTeX
- `vscode.less` - Less
- `vscode.lua` - Lua
- `vscode.make` - Make
- `vscode.markdown` / `vscode.markdown-language-features` / `vscode.markdown-math` - Markdown
- `vscode.npm` - npm
- `vscode.objective-c` - Objective-C
- `vscode.ocaml` - OCaml
- `vscode.perl` - Perl
- `vscode.php` / `vscode.php-language-features` - PHP
- `vscode.powershell` - PowerShell
- `vscode.pug` - Pug
- `vscode.python` - Python
- `vscode.r` - R
- `vscode.razor` - Razor
- `vscode.restructuredtext` - reStructuredText
- `vscode.ruby` - Ruby
- `vscode.rust` - Rust
- `vscode.scss` - SCSS
- `vscode.shaderlab` - ShaderLab
- `vscode.shellscript` - Shell Script
- `vscode.sql` - SQL
- `vscode.swift` - Swift
- `vscode.typescript` / `vscode.typescript-language-features` - TypeScript
- `vscode.vb` - Visual Basic
- `vscode.xml` - XML
- `vscode.yaml` - YAML

#### 開発ツール
- `vscode.configuration-editing` - 設定編集
- `vscode.debug-auto-launch` - デバッグ自動起動
- `vscode.debug-server-ready` - デバッグサーバー準備完了
- `vscode.diff` - Diff表示
- `vscode.docker` - Docker
- `vscode.emmet` - Emmet
- `vscode.extension-editing` - 拡張機能編集
- `vscode.git` / `vscode.git-base` - Git
- `vscode.github` / `vscode.github-authentication` - GitHub
- `vscode.grunt` - Grunt
- `vscode.gulp` - Gulp
- `vscode.ini` - INI
- `vscode.ipynb` - Jupyter Notebook
- `vscode.jake` - Jake
- `vscode.log` - ログ表示
- `vscode.media-preview` - メディアプレビュー
- `vscode.merge-conflict` - マージコンフリクト
- `vscode.microsoft-authentication` - Microsoft認証
- `vscode.references-view` - 参照ビュー
- `vscode.search-result` - 検索結果
- `vscode.simple-browser` - シンプルブラウザ
- `vscode.terminal-suggest` - ターミナルサジェスト
- `vscode.tunnel-forwarding` - トンネル転送

#### テーマ
- `vscode.theme-abyss` - Abyss
- `vscode.theme-defaults` - デフォルト
- `vscode.theme-kimbie-dark` - Kimbie Dark
- `vscode.theme-monokai` - Monokai
- `vscode.theme-monokai-dimmed` - Monokai Dimmed
- `vscode.theme-quietlight` - Quiet Light
- `vscode.theme-red` - Red
- `vscode.theme-solarized-dark` - Solarized Dark
- `vscode.theme-solarized-light` - Solarized Light
- `vscode.theme-tomorrow-night-blue` - Tomorrow Night Blue
- `vscode.vscode-theme-seti` - Seti

#### その他
- `vscode.builtin-notebook-renderers` - Notebookレンダラー
- `ms-toolsai.jupyter-keymap` - Jupyterキーマップ
- `ms-vscode.js-debug` / `ms-vscode.js-debug-companion` - JavaScriptデバッグ
- `ms-vscode.vscode-js-profile-table` - JavaScriptプロファイルテーブル
- `everysphere.worktree-textmate` - Worktree TextMate

---

## 🔍 ユーザー拡張機能（35個）

### コード補完・ナビゲーション系（3個）

1. **Path Intellisense** (`christian-kohler.path-intellisense`)
   - ✅ パフォーマンスリストに含まれています（優先度2）
   - パス補完機能

2. **Auto Rename Tag** (`formulahendry.auto-rename-tag`)
   - ✅ パフォーマンスリストに含まれています（優先度2）
   - HTMLタグの自動リネーム

3. **Bookmarks** (`alefragnani.bookmarks`)
   - ✅ パフォーマンスリストに含まれています（優先度3）
   - ブックマーク機能

### エラー検出・コード品質系（4個）

4. **Error Lens** (`usernamehw.errorlens`)
   - ✅ パフォーマンスリストに含まれています（優先度1・必須）
   - エラーをインライン表示

5. **ESLint** (`dbaeumer.vscode-eslint`)
   - ✅ パフォーマンスリストに含まれています（優先度2）
   - JavaScript/TypeScriptリント

6. **Prettier** (`esbenp.prettier-vscode`)
   - ✅ パフォーマンスリストに含まれています（優先度2）
   - コードフォーマッター

7. **EditorConfig** (`editorconfig.editorconfig`)
   - コードスタイル統一用

### Git系（3個）

8. **GitLens** (`eamodio.gitlens`)
   - ✅ パフォーマンスリストに含まれています（優先度2）
   - ⚠️ 機能が多いため、不要な機能は無効化推奨
   - Git履歴・ブランチ・コミット情報の表示

9. **Git History** (`donjayamanne.githistory`)
   - Git履歴閲覧

10. **Git Graph** (`mhutchie.git-graph`)
    - Git履歴のグラフ表示

### コード実行・デバッグ系（4個）

11. **Code Runner** (`formulahendry.code-runner`)
    - ✅ パフォーマンスリストに含まれています（優先度3）
    - コードの即座実行

12. **Python** (`ms-python.python`)
    - Python開発用

13. **Debugpy** (`ms-python.debugpy`)
    - Pythonデバッグ用

14. **PowerShell** (`ms-vscode.powershell`)
    - PowerShell開発用（内蔵版もあり）

### プロジェクト管理系（1個）

15. **Project Manager** (`alefragnani.project-manager`)
    - ✅ パフォーマンスリストに含まれています（優先度2）
    - プロジェクト管理

### TODO管理系（2個）

16. **Todo Tree** (`gruntfuggly.todo-tree`)
    - ✅ パフォーマンスリストに含まれています（優先度3）
    - TODO管理

17. **TODO Highlight** (`wayou.vscode-todo-highlight`)
    - TODOハイライト（Todo Treeと機能が重複している可能性）
    - ⚠️ 重複機能のため、片方を無効化推奨

### マークダウン系（2個）

18. **Markdown All in One** (`yzhang.markdown-all-in-one`)
    - Markdown支援

19. **Markdownlint** (`davidanson.vscode-markdownlint`)
    - Markdownリント

### Web開発系（1個）

20. **Tailwind CSS IntelliSense** (`bradlc.vscode-tailwindcss`)
    - Tailwind CSS補完

### その他の便利ツール（15個）

21. **Better Comments** (`aaron-bond.better-comments`)
    - コメントの色分け

22. **CodeSnap** (`adpyke.codesnap`)
    - コードのスクリーンショット

23. **Indent Rainbow** (`oderwat.indent-rainbow`)
    - インデントの色分け

24. **Trailing Spaces** (`shardulm94.trailing-spaces`)
    - 末尾の空白を表示

25. **Import Cost** (`wix.vscode-import-cost`)
    - インポートのサイズ表示

26. **Version Lens** (`pflannery.vscode-versionlens`)
    - パッケージバージョン表示

27. **Thunder Client** (`rangav.vscode-thunder-client`)
    - REST APIテストツール
    - ⚠️ REST Clientと機能が重複している可能性

28. **REST Client** (`humao.rest-client`)
    - REST APIテストツール（Thunder Clientと機能が重複）
    - ⚠️ 重複機能のため、片方を無効化推奨

29. **Code Tour** (`vsls-contrib.codetour`)
    - コードツアー機能

30. **Local History** (`xyz.local-history`)
    - ローカルファイル履歴

31. **YAML** (`redhat.vscode-yaml`)
    - YAML支援

32. **GitHub Actions** (`github.vscode-github-actions`)
    - GitHub Actions支援

33. **TypeScript Next** (`ms-vscode.vscode-typescript-next`)
    - TypeScript実験的機能

34. **Cursor Pyright** (`anysphere.cursorpyright`)
    - Cursor用Python型チェック

35. **SpecStory** (`specstory.specstory-vscode`)
    - ✅ すでに導入済み（会話ログ保存用）

---

## 📈 パフォーマンス最適化リストとの比較

### ✅ すでにインストール済み（パフォーマンスリストに含まれているもの）

**優先度1（必須）**:
- ✅ Error Lens

**優先度2（高）**:
- ✅ Path Intellisense
- ✅ Auto Rename Tag
- ✅ ESLint
- ✅ Prettier
- ✅ GitLens
- ✅ Project Manager

**優先度3（中）**:
- ✅ Code Runner
- ✅ Bookmarks
- ✅ Todo Tree

### ⚠️ 推奨アクション

1. **重複機能の整理**
   - **Todo Tree** vs **TODO Highlight** → Todo Treeを推奨
   - **Thunder Client** vs **REST Client** → Thunder Clientを推奨

2. **Extension Monitorの有効化**
   - `Settings` > `Application` > `Experimental` > `Extension Monitor: Enabled`
   - 各拡張機能のリソース使用量を確認

3. **不要な拡張機能の無効化**
   - 使用頻度の低い拡張機能は無効化または削除を検討
   - GitLensなど機能が多い拡張機能は、必要な機能だけを有効化

4. **パフォーマンス最適化**
   - 優先度1の拡張機能は必須として維持
   - 優先度2の拡張機能は必要に応じて有効化
   - 優先度3の拡張機能は使用頻度に応じて有効化/無効化

---

## 🔧 拡張機能の確認方法

### Cursor UIから確認

1. **Extensionsビューを開く**
   - `Ctrl+Shift+X` または `View` > `Extensions`

2. **インストール済み拡張機能を表示**
   - 左サイドバーの「Extensions」アイコンをクリック
   - 「@installed」でフィルタ

3. **拡張機能の詳細確認**
   - 各拡張機能をクリックして詳細を確認
   - 有効/無効の切り替えが可能

### コマンドラインから確認

```powershell
# 拡張機能リストを取得
.\scripts\list-cursor-extensions.ps1
```

---

## 📚 参考ドキュメント

- **パフォーマンス最適化ガイド**: `docs/setup/CURSOR_EXTENSIONS_PERFORMANCE.md`
- **拡張機能最適化レポート**: `docs/CURSOR_EXTENSIONS_OPTIMIZATION.md`
- **既存の拡張機能リスト**: `hadayalab-website-dev/INSTALLED_EXTENSIONS.md`

---

**最終更新**: 2026-01-09  
**メンテナー**: COO (Composer 1)
