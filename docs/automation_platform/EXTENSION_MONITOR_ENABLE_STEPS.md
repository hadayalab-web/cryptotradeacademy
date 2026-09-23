# Extension Monitor 有効化手順

**作成日**: 2026-01-09  
**Cursor Version**: 2.3.30  
**ステータス**: ✅ 設定画面でExtension Monitorを発見

---

## ✅ 現在の状況

- **Cursor Version**: 2.3.30
- **設定画面**: Extension Monitorの設定を発見
- **場所**: `Application > Experimental > Extension Monitor: Enabled`
- **状態**: チェックボックスが未チェック（無効）

---

## 🎯 有効化手順

### ステップ1: 設定画面で有効化

1. **設定画面を開く**（既に開いている）
   - `Ctrl+,` で設定を開く
   - または `File` > `Preferences` > `Settings`

2. **Extension Monitorを検索**
   - 検索ボックスに `extension monitor` と入力
   - 「1 Setting Found」と表示される

3. **設定を有効化**
   - `Application > Experimental > Extension Monitor: Enabled` を開く
   - **チェックボックスをONにする**（✓を付ける）
   - 説明: "Enable extension monitoring. Requires a restart to take effect."

---

### ステップ2: Cursorを再起動

設定に「**Requires a restart to take effect**」と表示されているため、再起動が必要です。

1. **Cursorを完全に終了**
   - すべてのウィンドウを閉じる
   - タスクマネージャーでプロセスが残っていないか確認

2. **Cursorを再起動**

---

### ステップ3: Extension Monitorを開く

再起動後、以下の方法でExtension Monitorを開きます：

#### 方法1: コマンドパレットから

1. `Ctrl+Shift+P` を押す
2. `extension monitor` と入力
3. `Developer: Open Extension Monitor` を選択

#### 方法2: Developer関連から

1. `Ctrl+Shift+P` を押す
2. `developer` と入力
3. Extension Monitor関連のコマンドを探す

---

## 📊 確認事項

### 設定ファイルの確認

設定ファイル: `%APPDATA%\Cursor\User\settings.json`

有効化後、以下の設定が追加されているはずです：

```json
{
  "extensionMonitor": {
    "enabled": true
  }
}
```

---

## 🎯 期待される結果

Extension Monitorを開くと、以下の情報が表示されます：

- **各拡張機能のCPU使用率**
- **各拡張機能のメモリ消費量**
- **各拡張機能の起動時間**
- **拡張機能のアクティビティ**

---

## 📋 チェックリスト

- [ ] 設定画面でExtension MonitorのチェックボックスをONにした
- [ ] Cursorを再起動した
- [ ] 再起動後、コマンドパレットで `extension monitor` と検索
- [ ] Extension Monitorが開けることを確認
- [ ] 各拡張機能のリソース使用量を確認

---

## ⚠️ 注意事項

### 再起動が必要

設定画面に「**Requires a restart to take effect**」と表示されているため、設定を変更した後は必ずCursorを再起動してください。

### パフォーマンス

ユーザー報告によると、Cursor 2.3.30では：
- ✅ 起動が速い
- ✅ レスポンスが速い
- ✅ パフォーマンスに問題なし

Extension Monitorを有効化しても、パフォーマンスへの影響は最小限です。

---

## 📚 参考ドキュメント

- **Extension Monitor設定完了**: `docs/EXTENSION_MONITOR_SETUP_COMPLETE.md`
- **Extension Monitorトラブルシューティング**: `docs/EXTENSION_MONITOR_TROUBLESHOOTING.md`
- **拡張機能最適化結果**: `docs/CURSOR_EXTENSIONS_OPTIMIZATION_RESULTS.md`

---

**最終更新**: 2026-01-09  
**ステータス**: ✅ 設定画面でExtension Monitorを発見、有効化手順を案内
