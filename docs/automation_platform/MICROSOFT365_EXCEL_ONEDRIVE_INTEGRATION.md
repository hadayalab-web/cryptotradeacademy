# Microsoft 365（Excel/OneDrive）連携ガイド

**最終更新**: 2025-01-XX  
**目的**: MCPおよびGitHub Copilot Agents + GitHub ActionsでExcel/OneDriveとシームレスに連携する方法

---

## 🎯 連携方法の比較

### 方法1: MCP経由（Cursor内で直接操作）

**現状**: 理論的には可能だが、専用のMCPサーバーが必要

**メリット**:
- Cursor Chatから直接Excel/OneDriveを操作可能
- 自然言語でファイル操作ができる
- 他のMCPサーバー（Notion、Whop等）と統合可能

**デメリット**:
- 専用のMCPサーバーの設定が必要
- Azure AD認証情報の管理が必要
- カスタム開発が必要な場合がある

**実装状況**: ⚠️ **未実装**（設定が必要）

---

### 方法2: GitHub Copilot Agents + GitHub Actions経由（推奨）

**現状**: ✅ **シームレスに実装可能**

**メリット**:
- Microsoft Graph APIを直接使用可能
- GitHub Actionsワークフローで自動化可能
- 認証情報をGitHub Secretsで安全に管理
- オフラインでもタスクを継続実行可能

**デメリット**:
- Cursor Chatから直接操作はできない（GitHub Actions経由）

**実装状況**: ✅ **推奨アプローチ**

---

## 🔧 実装方法

### 方法1: MCP経由の実装

#### ステップ1: Microsoft 365用MCPサーバーの確認

利用可能なMCPサーバーを確認：

```bash
# 公式MCPサーバーの確認
npm search @modelcontextprotocol/microsoft365
npm search mcp-microsoft365

# コミュニティMCPサーバーの確認
npm search microsoft365-mcp
```

#### ステップ2: Azure AD認証情報の取得

1. **Azure Portal**にアクセス
   - URL: https://portal.azure.com/

2. **アプリの登録**
   - Azure Active Directory → アプリの登録 → 新規登録
   - 名前: `HadayaLab MCP Integration`
   - リダイレクトURI: `http://localhost:3000/callback`（MCPサーバーに応じて変更）

3. **認証情報の取得**
   - アプリケーション（クライアント）ID
   - ディレクトリ（テナント）ID
   - クライアントシークレット

4. **API権限の設定**
   - Microsoft Graph API権限を追加：
     - `Files.ReadWrite`（OneDrive読み書き）
     - `Files.ReadWrite.All`（すべてのファイル読み書き）
     - `Sites.ReadWrite.All`（SharePoint読み書き）
     - `User.Read`（ユーザー情報読み取り）

#### ステップ3: MCP設定ファイルの更新

**ファイル**: `C:\Users\chiba\.cursor\mcp.json`

```json
{
  "mcpServers": {
    "microsoft365": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/microsoft365"],
      "env": {
        "AZURE_CLIENT_ID": "your-client-id",
        "AZURE_CLIENT_SECRET": "your-client-secret",
        "AZURE_TENANT_ID": "your-tenant-id"
      }
    }
  }
}
```

**重要**: 認証情報は環境変数やシークレット管理ツールで管理してください。

#### ステップ4: Cursor再起動

1. Cursorを完全に終了
2. Cursorを再起動
3. MCPサーバーが認識されているか確認

---

### 方法2: GitHub Copilot Agents + GitHub Actions経由（推奨）

#### ステップ1: GitHub Actionsワークフローの作成

**ファイル**: `.github/workflows/microsoft365-integration.yml`

```yaml
name: Microsoft 365 Integration

on:
  workflow_dispatch:
  schedule:
    - cron: '0 0 * * *'  # 毎日実行（必要に応じて変更）

jobs:
  excel-onedrive-sync:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm install

      - name: Excel/OneDrive Integration
        env:
          AZURE_CLIENT_ID: ${{ secrets.AZURE_CLIENT_ID }}
          AZURE_CLIENT_SECRET: ${{ secrets.AZURE_CLIENT_SECRET }}
          AZURE_TENANT_ID: ${{ secrets.AZURE_TENANT_ID }}
        run: |
          node scripts/microsoft365-sync.js
```

#### ステップ2: Microsoft Graph APIスクリプトの作成

**ファイル**: `scripts/microsoft365-sync.js`

```javascript
const { Client } = require('@microsoft/microsoft-graph-client');
const { ClientSecretCredential } = require('@azure/identity');

async function syncExcelOneDrive() {
  // Azure AD認証
  const credential = new ClientSecretCredential(
    process.env.AZURE_TENANT_ID,
    process.env.AZURE_CLIENT_ID,
    process.env.AZURE_CLIENT_SECRET
  );

  // Microsoft Graph APIクライアント
  const client = Client.initWithMiddleware({
    authProvider: {
      getAccessToken: async () => {
        const token = await credential.getToken([
          'https://graph.microsoft.com/.default'
        ]);
        return token.token;
      }
    }
  });

  // OneDriveファイル一覧取得
  const driveItems = await client
    .api('/me/drive/root/children')
    .get();

  console.log('OneDrive files:', driveItems.value);

  // Excelファイルの読み込み（例）
  const excelFile = await client
    .api('/me/drive/root:/path/to/file.xlsx:/content')
    .get();

  // データ処理...
}

syncExcelOneDrive().catch(console.error);
```

#### ステップ3: GitHub Secretsの設定

1. **GitHubリポジトリ**にアクセス
2. **Settings** → **Secrets and variables** → **Actions**
3. 以下のシークレットを追加：
   - `AZURE_CLIENT_ID`
   - `AZURE_CLIENT_SECRET`
   - `AZURE_TENANT_ID`

#### ステップ4: パッケージのインストール

```bash
npm install @microsoft/microsoft-graph-client @azure/identity
```

---

## 📊 機能比較

| 機能 | MCP経由 | GitHub Actions経由 |
|------|---------|-------------------|
| Cursor Chatから直接操作 | ✅ 可能 | ❌ 不可（GitHub Actions経由） |
| 自動化 | ⚠️ 手動操作 | ✅ 完全自動化 |
| オフライン実行 | ❌ 不可 | ✅ 可能（GitHub Copilot Agents） |
| 認証管理 | ⚠️ ローカル設定 | ✅ GitHub Secrets |
| Excel操作 | ✅ 可能 | ✅ 可能 |
| OneDrive操作 | ✅ 可能 | ✅ 可能 |
| シームレス性 | ⚠️ 設定が必要 | ✅ 設定後はシームレス |

---

## 🎯 推奨アプローチ

### リアルタイムデータ連携・蓄積の場合: **Notion中心アーキテクチャ（推奨）**

**理由**:
1. ✅ **リアルタイム更新**: データが即座にNotionに反映される
2. ✅ **継続的な蓄積**: Databaseでデータを永続的に管理
3. ✅ **MCP統合**: 既にNotion MCPサーバーが設定済み
4. ✅ **一元管理**: すべてのデータをNotion Databaseで管理
5. ✅ **Cursor Chatから直接アクセス**: 自然言語でデータ操作可能

**詳細**: [Notion中心のリアルタイムデータ連携アーキテクチャ](./NOTION_CENTERED_REALTIME_INTEGRATION.md) を参照

### イベント駆動・定期実行の場合: **GitHub Copilot Agents + GitHub Actions**

**理由**:
1. ✅ **シームレスな自動化**: GitHub Actionsで完全自動化可能
2. ✅ **オフライン実行**: GitHub Copilot AgentsでPCがオフラインでも実行可能
3. ✅ **セキュリティ**: GitHub Secretsで認証情報を安全に管理
4. ✅ **スケーラビリティ**: 複数のワークフローを並行実行可能
5. ✅ **監査ログ**: GitHub Actionsで実行履歴を確認可能

### MCP経由の実装を検討する場合

以下の条件を満たす場合、MCP経由の実装も検討できます：

1. ✅ Cursor Chatから直接操作したい
2. ✅ リアルタイムでファイル操作したい
3. ✅ 他のMCPサーバー（Notion、Whop等）と統合したい

---

## 📚 参考リンク

1. **Microsoft Graph API**
   - https://learn.microsoft.com/en-us/graph/overview
   - https://learn.microsoft.com/en-us/graph/api/overview

2. **OneDrive API**
   - https://learn.microsoft.com/en-us/onedrive/developer/rest-api/

3. **Excel API**
   - https://learn.microsoft.com/en-us/graph/api/resources/excel

4. **GitHub Actions**
   - https://docs.github.com/en/actions

5. **GitHub Copilot Agents**
   - https://github.com/features/copilot

6. **MCP（Model Context Protocol）**
   - https://modelcontextprotocol.io/

---

## ⚠️ 注意事項

1. **認証情報の管理**
   - 認証情報は絶対にGitにコミットしない
   - GitHub Secretsまたは環境変数で管理
   - `.gitignore`に設定ファイルを追加

2. **権限設定**
   - Microsoft Graph APIで必要な権限（スコープ）を適切に設定
   - 最小権限の原則に従う

3. **レート制限**
   - Microsoft Graph APIにはレート制限がある
   - 大量のリクエストには注意が必要

4. **セキュリティ**
   - 認証情報の漏洩に注意
   - 定期的に認証情報を更新

---

## 🚀 次のステップ

1. **Azure AD認証情報の取得**
2. **GitHub Secretsの設定**
3. **GitHub Actionsワークフローの作成**
4. **Microsoft Graph APIスクリプトの実装**
5. **動作確認とテスト**

詳細な実装手順については、各ステップのドキュメントを参照してください。

