# Extension Monitor の開き方ガイド

**作成日**: 2026-01-09  
**目的**: Extension Monitorを正しく開く方法を案内

---

## 🔍 Extension Monitorを開く方法

### 方法1: コマンドパレットから開く（推奨）

1. **`Ctrl+Shift+P`** を押してコマンドパレットを開く
2. **`Extension Monitor`** と入力
3. 以下のいずれかのコマンドを選択：
   - `Extension Monitor: Open` （最も可能性が高い）
   - `Developer: Open Extension Monitor`
   - `View: Open Extension Monitor`

### 方法2: 設定から開く

1. **`Ctrl+,`** で設定を開く
2. 検索ボックスに **`Extension Monitor`** と入力
3. **`Extension Monitor: Enabled`** が有効になっていることを確認
4. 設定画面から直接開くオプションがある場合はクリック

### 方法3: 表示されている候補から選択

現在表示されている候補：

#### ❌ 選択しない候補

1. **`Cursor Browser Extension: Cursor Browser Extension Status`**
   - これはブラウザ拡張機能のステータスを表示するもの
   - Extension Monitorとは関係ありません

2. **`Developer: Open Extension Logs Folder`**
   - これは拡張機能のログフォルダを開くもの
   - Extension Monitorではありません

#### ✅ 試すべき候補

**`Developer: Open Developer Tools for Extension Host`**
- これは拡張機能ホストの開発者ツールを開くもの
- Extension Monitorとは異なりますが、拡張機能のデバッグには有用
- **Extension Monitorの代わりにはなりません**

---

## 🎯 正しいコマンドを見つける方法

### ステップ1: コマンドパレットで検索

1. `Ctrl+Shift+P` を押す
2. **`monitor`** と入力（小文字でOK）
3. 候補リストを確認

### ステップ2: より具体的に検索

1. `Ctrl+Shift+P` を押す
2. **`extension monitor`** と入力
3. 候補リストを確認

### ステップ3: Developer関連を確認

1. `Ctrl+Shift+P` を押す
2. **`developer`** と入力
3. Extension Monitor関連のコマンドを探す

---

## 📋 期待されるコマンド名

Extension Monitorのコマンド名は以下のいずれかの可能性が高いです：

- `Extension Monitor: Open`
- `Developer: Open Extension Monitor`
- `View: Open Extension Monitor`
- `Extension Monitor: Show`
- `Extension Monitor: Toggle`

---

## 🔧 代替方法: 設定から確認

Extension Monitorが有効になっているか確認：

1. `Ctrl+,` で設定を開く
2. 検索ボックスに **`extension monitor`** と入力
3. **`Extension Monitor: Enabled`** が **`true`** になっていることを確認

設定ファイルで確認：
- ファイル: `%APPDATA%\Cursor\User\settings.json`
- 設定: `"extensionMonitor": { "enabled": true }`

---

## ⚠️ 注意事項

### Extension Monitorが表示されない場合

1. **Cursorを再起動**
   - 設定を変更した後は再起動が必要な場合があります

2. **設定を確認**
   - Extension Monitorが有効になっているか確認
   - 設定ファイルを直接確認

3. **バージョンを確認**
   - Cursorのバージョンによってコマンド名が異なる可能性があります
   - 最新版に更新することを推奨

---

## 📊 Extension Monitorの機能

Extension Monitorを開くと、以下の情報が表示されます：

- **各拡張機能のCPU使用率**
- **各拡張機能のメモリ消費量**
- **各拡張機能の起動時間**
- **拡張機能のアクティビティ**

---

## 🎯 推奨アクション

1. **コマンドパレットで `monitor` と検索**
   - 最も確実な方法です

2. **候補リストを確認**
   - `Extension Monitor` という名前が含まれているコマンドを選択

3. **見つからない場合**
   - Cursorを再起動
   - 設定ファイルでExtension Monitorが有効になっているか確認

---

**最終更新**: 2026-01-09  
**ステータス**: ✅ Extension Monitor設定完了、開き方を案内
