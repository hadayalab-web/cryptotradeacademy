# KV接続トラブルシューティングガイド
**作成日時**: 2026-01-28

---

## 🔍 KV接続確認手順

### 1. 環境変数の確認

KV接続に必要な環境変数：

| 環境変数 | 説明 | 必須 |
|---------|------|------|
| `KV_REST_API_URL` | Vercel KV REST API URL | 必須（`KV_URL`とどちらか一方） |
| `KV_URL` | Vercel KV URL（代替） | 必須（`KV_REST_API_URL`とどちらか一方） |
| `KV_REST_API_TOKEN` | Vercel KV REST API Token | 推奨 |

**確認方法**:
```powershell
# PowerShellで実行
echo $env:KV_REST_API_URL
echo $env:KV_URL
echo $env:KV_REST_API_TOKEN
```

---

### 2. @vercel/kvパッケージの確認

**確認方法**:
```bash
npm list @vercel/kv
```

**インストールされていない場合**:
```bash
npm install @vercel/kv
```

---

### 3. KV接続テストスクリプトの実行

```bash
node scripts/check-kv-connection.js
```

このスクリプトは以下を確認します：
- 環境変数の設定状況
- @vercel/kvモジュールの存在
- KV接続テスト（読み書き）

---

## 🐛 よくある問題と解決方法

### 問題1: 環境変数が設定されていない

**エラーメッセージ**:
```
[KV] KV環境変数が設定されていません（KV_REST_API_URL または KV_URL）
```

**解決方法**:

#### 方法A: PowerShellで一時的に設定
```powershell
$env:KV_REST_API_URL="your-kv-rest-api-url"
$env:KV_REST_API_TOKEN="your-kv-rest-api-token"
```

#### 方法B: .envファイルに追加
`.env`ファイル（プロジェクトルートまたは親ディレクトリ）に追加：
```
KV_REST_API_URL=your-kv-rest-api-url
KV_REST_API_TOKEN=your-kv-rest-api-token
```

#### 方法C: システム環境変数として設定
1. `Win + R` → `sysdm.cpl` → Enter
2. 「詳細設定」→「環境変数」
3. 「新規」をクリック
4. 変数名と値を設定

---

### 問題2: @vercel/kvパッケージがインストールされていない

**エラーメッセージ**:
```
[KV] @vercel/kv not available: Cannot find module '@vercel/kv'
```

**解決方法**:
```bash
npm install @vercel/kv
```

---

### 問題3: Vercel KVストアが作成されていない

**確認方法**:
1. [Vercel Dashboard](https://vercel.com/dashboard)にログイン
2. プロジェクトを選択
3. 「Storage」タブを確認
4. KVストアが作成されているか確認

**作成方法**:
1. Vercel Dashboard → Storage
2. 「Create Database」をクリック
3. 「KV」を選択
4. ストア名を入力して作成
5. 環境変数をコピー

---

### 問題4: ネットワーク接続の問題

**確認方法**:
```powershell
# KV REST API URLに接続できるか確認
curl $env:KV_REST_API_URL
```

**解決方法**:
- ファイアウォール設定を確認
- プロキシ設定を確認
- ネットワーク接続を確認

---

### 問題5: 認証トークンの問題

**エラーメッセージ**:
```
[KV] Error getting 'key': Unauthorized
```

**解決方法**:
- `KV_REST_API_TOKEN`が正しく設定されているか確認
- Vercel Dashboardから新しいトークンを生成

---

## 📋 KV接続確認チェックリスト

- [ ] `KV_REST_API_URL`または`KV_URL`が設定されている
- [ ] `KV_REST_API_TOKEN`が設定されている（推奨）
- [ ] `@vercel/kv`パッケージがインストールされている
- [ ] Vercel KVストアが作成されている
- [ ] ネットワーク接続が正常
- [ ] 認証トークンが有効

---

## 🚀 クイック診断コマンド

```bash
# 1. 環境変数確認
node -e "console.log('KV_REST_API_URL:', process.env.KV_REST_API_URL ? '✅' : '❌'); console.log('KV_URL:', process.env.KV_URL ? '✅' : '❌'); console.log('KV_REST_API_TOKEN:', process.env.KV_REST_API_TOKEN ? '✅' : '❌');"

# 2. @vercel/kv確認
node -e "try { require('@vercel/kv'); console.log('✅ @vercel/kv installed'); } catch(e) { console.log('❌ @vercel/kv not installed'); }"

# 3. KV接続テスト
node scripts/check-kv-connection.js
```

---

## 🔗 関連ファイル

- `utils/kv.js`: KVユーティリティ
- `scripts/check-kv-connection.js`: KV接続確認スクリプト
- `scripts/check-vsl-workflow-setup.js`: 環境変数チェックスクリプト

---

## 📞 サポート

問題が解決しない場合：
1. Vercel DashboardでKVストアの状態を確認
2. Vercelのログを確認
3. 環境変数の設定を再確認
