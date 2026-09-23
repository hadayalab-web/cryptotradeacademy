# Extension Monitor & Extension Settings Configuration Complete

**実行日**: 2026-01-09  
**ステータス**: ✅ 完了

---

## ✅ 実行内容

### 1. Extension Monitor 有効化

**設定ファイル**: `%APPDATA%\Cursor\User\settings.json`

```json
{
  "extensionMonitor": {
    "enabled": true
  }
}
```

**確認方法**:
- `Ctrl+Shift+P` → `Developer: Open Extension Monitor`
- または `Settings` > `Application` > `Experimental` > `Extension Monitor: Enabled`

---

### 2. 拡張機能設定の最適化

#### ✅ Error Lens設定

```json
{
  "errorLens.enabled": true,
  "errorLens.enabledDiagnosticLevels": ["error", "warning"],
  "errorLens.followCursor": "activeLine",
  "errorLens.delay": 500
}
```

**効果**:
- エラーと警告のみをインライン表示
- カーソル位置に応じて表示
- 500msの遅延でパフォーマンス最適化

---

#### ✅ GitLens設定（パフォーマンス最適化）

```json
{
  "gitlens.codeLens.enabled": false,
  "gitlens.currentLine.enabled": false,
  "gitlens.hovers.enabled": true,
  "gitlens.statusBar.enabled": true,
  "gitlens.advanced.messages": {
    "suppressCommitHasNoPreviousCommitWarning": true,
    "suppressCommitNotFoundWarning": true,
    "suppressFileNotUnderSourceControlWarning": true
  }
}
```

**効果**:
- Code Lensを無効化してパフォーマンス向上
- Current Line表示を無効化
- HoverとStatus Barは有効化（便利な機能のみ）

---

#### ✅ Prettier設定

```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.formatOnPaste": false,
  "prettier.requireConfig": false
}
```

**効果**:
- Prettierをデフォルトフォーマッターに設定
- 保存時に自動フォーマット
- ペースト時はフォーマットしない（パフォーマンス向上）

---

#### ✅ ESLint設定

```json
{
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ],
  "eslint.format.enable": true
}
```

**効果**:
- 保存時にESLintの自動修正を実行
- JavaScript/TypeScriptファイルを検証
- ESLintのフォーマット機能を有効化

---

#### ✅ Import Cost設定

```json
{
  "importCost.smallPackageSize": 50,
  "importCost.mediumPackageSize": 100,
  "importCost.showCalculatingDecoration": false
}
```

**効果**:
- 小さいパッケージ: 50KB以下
- 中サイズパッケージ: 100KB以下
- 計算中の装飾を非表示（パフォーマンス向上）

---

#### ✅ Todo Tree設定

```json
{
  "todo-tree.regex.regex": "((//|#|<!--|;|/\\*|^)\\s*($TAGS)|^\\s*- \\[ \\])",
  "todo-tree.highlights.customHighlight": {
    "TODO": {
      "icon": "check",
      "type": "text"
    },
    "FIXME": {
      "icon": "flame",
      "type": "text"
    }
  }
}
```

**効果**:
- TODOとFIXMEコメントを検出
- カスタムハイライト設定
- パフォーマンス最適化された正規表現

---

#### ✅ パフォーマンス最適化設定

**ファイル監視除外**:
```json
{
  "files.watcherExclude": {
    "**/.git/objects/**": true,
    "**/.git/subtree-cache/**": true,
    "**/node_modules/**": true,
    "**/.hg/store/**": true,
    "**/dist/**": true,
    "**/build/**": true
  }
}
```

**検索除外**:
```json
{
  "search.exclude": {
    "**/node_modules": true,
    "**/bower_components": true,
    "**/*.code-search": true,
    "**/dist": true,
    "**/build": true,
    "**/.git": true
  }
}
```

**拡張機能管理**:
```json
{
  "extensions.ignoreRecommendations": false,
  "extensions.autoCheckUpdates": true,
  "extensions.autoUpdate": false
}
```

**効果**:
- 不要なファイルの監視を除外してパフォーマンス向上
- 検索速度の向上
- 拡張機能の自動更新は無効化（手動制御）

---

## 🎯 次のステップ

### 1. Cursorの再起動

すべての設定を適用するため、Cursorを再起動してください。

### 2. Extension Monitorの確認

1. `Ctrl+Shift+P` を押す
2. `Developer: Open Extension Monitor` を選択
3. 各拡張機能のリソース使用量を確認

### 3. 拡張機能のリソース使用量チェック

Extension Monitorで以下を確認：
- **CPU使用率**: 高い拡張機能を特定
- **メモリ消費量**: メモリを多く使用している拡張機能を確認
- **起動時間**: 起動に時間がかかる拡張機能を特定

### 4. 不要な拡張機能の無効化

リソース使用量が高い拡張機能で、使用頻度が低いものは無効化を検討：
- 拡張機能パネル（`Ctrl+Shift+X`）を開く
- 無効化したい拡張機能を右クリック
- 「Disable」を選択

---

## 📊 期待される効果

### パフォーマンス向上

- **起動時間**: ファイル監視の最適化により、起動時間が短縮
- **メモリ使用量**: GitLensのCode Lens無効化により、メモリ使用量が削減
- **検索速度**: 不要なディレクトリの除外により、検索が高速化

### 開発効率向上

- **エラー検出**: Error Lensにより、エラーが即座に表示
- **コード品質**: ESLintとPrettierの自動修正により、コード品質が向上
- **TODO管理**: Todo Treeにより、タスク管理が効率化

---

## 📚 参考ドキュメント

- **拡張機能最適化結果**: `docs/CURSOR_EXTENSIONS_OPTIMIZATION_RESULTS.md`
- **拡張機能完全リスト**: `docs/CURSOR_EXTENSIONS_COMPLETE_LIST.md`
- **パフォーマンス最適化ガイド**: `docs/setup/CURSOR_EXTENSIONS_PERFORMANCE.md`

---

**最終更新**: 2026-01-09  
**ステータス**: ✅ Extension Monitor有効化 & 拡張機能設定完了
