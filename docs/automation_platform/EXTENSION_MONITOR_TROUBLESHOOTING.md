# Extension Monitor トラブルシューティング

**作成日**: 2026-01-09  
**問題**: Extension Monitorのコマンドが見つからない

---

## 🔍 問題の状況

コマンドパレットで以下を試したが、Extension Monitorのコマンドが見つからない：

- `>monitor` → "No matching commands"
- `>extension monitor` → "Cursor Browser Extension: Cursor Browser Extension Status" のみ表示
- `>Extension Monitor` → 同じく "Cursor Browser Extension" のみ表示

---

## ✅ 解決方法

### 方法1: Cursorを完全に再起動

1. **Cursorを完全に終了**
   - すべてのCursorウィンドウを閉じる
   - タスクマネージャーでCursorプロセスが残っていないか確認

2. **Cursorを再起動**

3. **再度コマンドパレットで検索**
   - `Ctrl+Shift+P`
   - `extension monitor` と入力

---

### 方法2: 設定UIから確認

1. **設定を開く**
   - `Ctrl+,` を押す

2. **Extension Monitorを検索**
   - 検索ボックスに `extension monitor` と入力

3. **設定を確認**
   - `Extension Monitor: Enabled` が有効になっているか確認
   - 無効の場合は有効化

4. **設定から直接開く**
   - 設定画面に「Open Extension Monitor」ボタンがあればクリック

---

### 方法3: 設定ファイルを直接確認・修正

設定ファイル: `%APPDATA%\Cursor\User\settings.json`

**確認すべき設定**:

```json
{
  "extensionMonitor": {
    "enabled": true
  }
}
```

**設定が正しくない場合**:

1. 設定ファイルを開く
2. 上記の設定を追加または修正
3. ファイルを保存
4. Cursorを再起動

---

### 方法4: Cursorのバージョン確認

Extension MonitorはCursorの特定のバージョン以降で利用可能です。

1. **Cursorのバージョンを確認**
   - `Help` > `About` でバージョンを確認

2. **最新版に更新**
   - 古いバージョンの場合は更新を検討

---

## 🔧 代替方法: 拡張機能の状態を確認

Extension Monitorが利用できない場合、以下の方法で拡張機能の状態を確認できます：

### 1. 拡張機能パネルから確認

1. `Ctrl+Shift+X` で拡張機能パネルを開く
2. 各拡張機能の状態を確認
3. 無効化されている拡張機能を確認

### 2. 開発者ツールから確認

1. `Ctrl+Shift+P`
2. `Developer: Open Developer Tools` を選択
3. Consoleタブで拡張機能のログを確認

### 3. 拡張機能ログフォルダを確認

1. `Ctrl+Shift+P`
2. `Developer: Open Extension Logs Folder` を選択
3. ログファイルを確認

---

## 📋 確認チェックリスト

- [ ] Cursorを完全に再起動した
- [ ] 設定ファイルで `extensionMonitor.enabled: true` を確認した
- [ ] 設定UIでExtension Monitorが有効か確認した
- [ ] Cursorのバージョンが最新か確認した
- [ ] コマンドパレットで `extension monitor` と検索した
- [ ] コマンドパレットで `developer` と検索して関連コマンドを確認した

---

## ⚠️ 注意事項

### Extension Monitorが利用できない場合

1. **Cursorのバージョンが古い**
   - 最新版に更新することを推奨

2. **設定が正しく反映されていない**
   - Cursorを再起動
   - 設定ファイルを直接確認

3. **機能がこのバージョンでは利用できない**
   - 代替方法（拡張機能パネル、開発者ツール）を使用

---

## 🎯 推奨アクション

1. **まずCursorを完全に再起動**
   - これで解決することが多い

2. **設定UIから確認**
   - `Ctrl+,` → `extension monitor` で検索
   - 設定が有効か確認

3. **コマンドパレットで再検索**
   - `Ctrl+Shift+P` → `extension monitor`
   - または `developer` と入力して関連コマンドを探す

4. **それでも見つからない場合**
   - Cursorのバージョンを確認
   - 最新版に更新を検討
   - 代替方法（拡張機能パネル）を使用

---

## 📚 参考ドキュメント

- **Extension Monitor設定完了**: `docs/EXTENSION_MONITOR_SETUP_COMPLETE.md`
- **Extension Monitor開き方ガイド**: `docs/EXTENSION_MONITOR_OPEN_GUIDE.md`
- **拡張機能最適化結果**: `docs/CURSOR_EXTENSIONS_OPTIMIZATION_RESULTS.md`

---

**最終更新**: 2026-01-09  
**ステータス**: ⚠️ Extension Monitorコマンドが見つからない問題を調査中
