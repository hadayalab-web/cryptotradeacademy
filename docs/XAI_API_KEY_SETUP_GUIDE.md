# XAI_API_KEY環境変数設定ガイド
**作成日時**: 2026-01-28

---

## 🔑 XAI_API_KEYとは

Grok APIを使用してインフルエンサーを発見するために必要なAPIキーです。

---

## 🚀 設定方法

### 方法1: PowerShellで一時的に設定（推奨：テスト用）

```powershell
# PowerShellで実行
$env:XAI_API_KEY="your-api-key-here"
node scripts/update-influencer-stock.js --all
```

**注意**: この方法は現在のPowerShellセッションでのみ有効です。新しいターミナルを開くと設定が消えます。

---

### 方法2: システム環境変数として設定（永続的）

#### Windows 10/11の場合

1. **設定を開く**
   - `Win + R`キーを押す
   - `sysdm.cpl`と入力してEnter

2. **環境変数を開く**
   - 「詳細設定」タブをクリック
   - 「環境変数」ボタンをクリック

3. **新しい環境変数を追加**
   - 「ユーザー環境変数」セクションで「新規」をクリック
   - 変数名: `XAI_API_KEY`
   - 変数値: あなたのAPIキー
   - 「OK」をクリック

4. **PowerShellを再起動**
   - 設定を反映するために、PowerShellを閉じて再度開く

---

### 方法3: .envファイルを使用（開発環境）

1. **プロジェクトルートに`.env`ファイルを作成**
   ```
   XAI_API_KEY=your-api-key-here
   ```

2. **dotenvパッケージを使用するスクリプトを作成**
   ```javascript
   require('dotenv').config();
   // その後、通常通りスクリプトを実行
   ```

**注意**: `.env`ファイルはGitにコミットしないでください（`.gitignore`に追加）。

---

## ✅ 確認方法

環境変数が正しく設定されているか確認：

```powershell
# PowerShellで実行
echo $env:XAI_API_KEY
```

APIキーが表示されれば設定成功です。

---

## 🔧 トラブルシューティング

### 問題1: 環境変数が設定されていない

**エラーメッセージ**:
```
❌ XAI_API_KEY環境変数が設定されていません
```

**解決方法**:
- 上記の方法1-3のいずれかで環境変数を設定してください

### 問題2: PowerShellを再起動したら設定が消えた

**原因**: 方法1（一時的な設定）を使用した場合

**解決方法**: 
- 方法2（システム環境変数）を使用するか、毎回設定してください

### 問題3: スクリプトが環境変数を読み込まない

**解決方法**:
- PowerShellを再起動してから再度実行してください
- 環境変数の設定が正しいか確認してください

---

## 📋 関連ファイル

- `scripts/update-influencer-stock.js`: ストック更新スクリプト
- `scripts/update-influencer-stock-with-env.bat`: 環境変数チェック付きバッチファイル
- `services/x/influencerStock.js`: ストック管理ロジック
- `services/grok/client.js`: Grok APIクライアント

---

## 🔗 参考情報

- Grok APIドキュメント: https://docs.x.ai/
- Vercel環境変数の設定: Vercel Dashboard > Settings > Environment Variables
