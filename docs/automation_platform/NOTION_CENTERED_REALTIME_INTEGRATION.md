# Notion中心のリアルタイムデータ連携アーキテクチャ

**最終更新**: 2025-01-XX  
**目的**: Excel/OneDriveとのリアルタイムデータ連携・蓄積をNotion中心で実現

---

## 🎯 アーキテクチャ概要

### なぜNotionが最適か

**GitHub Actionsの制限**:
- ❌ イベント駆動・定期実行には適しているが、リアルタイム連携には不向き
- ❌ 継続的なデータ蓄積には不適切
- ❌ データの一元管理が難しい

**Notionの優位性**:
- ✅ **リアルタイム更新**: データが即座に反映される
- ✅ **継続的なデータ蓄積**: Databaseでデータを永続的に管理
- ✅ **MCP統合**: 既にNotion MCPサーバーが設定済み
- ✅ **一元管理**: すべてのデータをNotion Databaseで管理
- ✅ **シームレスな連携**: Cursor Chatから直接操作可能

---

## 📊 データ連携フロー

### アーキテクチャ図

```
┌─────────────┐
│   Excel     │
│  OneDrive   │
└──────┬──────┘
       │
       │ (Microsoft Graph API)
       │
       ▼
┌─────────────────┐
│  Sync Script     │ ← GitHub Actions（定期実行）
│  (Python/Node)   │   またはリアルタイムWebhook
└──────┬──────────┘
       │
       │ (Notion API)
       │
       ▼
┌─────────────────┐
│  Notion Database│ ← リアルタイムデータ蓄積
│  (一元管理)     │
└──────┬──────────┘
       │
       │ (MCP経由)
       │
       ▼
┌─────────────────┐
│   Cursor Chat   │ ← リアルタイムアクセス
│   (MCP統合)     │
└─────────────────┘
```

---

## 🔧 実装方法

### 方法1: Excel/OneDrive → Notion Database（推奨）

#### ステップ1: Notion Databaseの作成

**Cursor Chatで実行**:
```
Notionで「Excel/OneDrive Sync」というDatabaseを作成して、以下のプロパティを追加して：
- File Name (Title)
- Source (Select: Excel, OneDrive)
- File Path (Text)
- Last Modified (Date)
- Status (Select: Synced, Pending, Error)
- Content (Text) - ExcelデータのJSON形式
- Sync Date (Date)
```

#### ステップ2: 同期スクリプトの作成

**ファイル**: `scripts/excel-onedrive-to-notion-sync.js`

```javascript
const { Client } = require('@notionhq/client');
const { Client: GraphClient } = require('@microsoft/microsoft-graph-client');
const { ClientSecretCredential } = require('@azure/identity');

// Notion APIクライアント
const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

// Microsoft Graph APIクライアント
const credential = new ClientSecretCredential(
  process.env.AZURE_TENANT_ID,
  process.env.AZURE_CLIENT_ID,
  process.env.AZURE_CLIENT_SECRET
);

const graphClient = GraphClient.initWithMiddleware({
  authProvider: {
    getAccessToken: async () => {
      const token = await credential.getToken([
        'https://graph.microsoft.com/.default'
      ]);
      return token.token;
    }
  }
});

async function syncExcelToNotion() {
  try {
    // OneDriveからExcelファイルを取得
    const driveItems = await graphClient
      .api('/me/drive/root/children')
      .filter("file/mimeType eq 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'")
      .get();

    for (const item of driveItems.value) {
      // Excelファイルの内容を読み込み
      const fileContent = await graphClient
        .api(`/me/drive/items/${item.id}/content`)
        .get();

      // Excelをパース（xlsxライブラリ使用）
      const workbook = XLSX.read(fileContent, { type: 'buffer' });
      const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

      // Notion Databaseにデータを追加/更新
      const response = await notion.databases.query({
        database_id: process.env.NOTION_DATABASE_ID,
        filter: {
          property: 'File Name',
          title: {
            equals: item.name
          }
        }
      });

      if (response.results.length > 0) {
        // 既存レコードを更新
        await notion.pages.update({
          page_id: response.results[0].id,
          properties: {
            'Last Modified': {
              date: {
                start: item.lastModifiedDateTime
              }
            },
            'Content': {
              rich_text: [{
                text: {
                  content: JSON.stringify(sheetData)
                }
              }]
            },
            'Status': {
              select: {
                name: 'Synced'
              }
            },
            'Sync Date': {
              date: {
                start: new Date().toISOString()
              }
            }
          }
        });
      } else {
        // 新規レコードを作成
        await notion.pages.create({
          parent: {
            database_id: process.env.NOTION_DATABASE_ID
          },
          properties: {
            'File Name': {
              title: [{
                text: {
                  content: item.name
                }
              }]
            },
            'Source': {
              select: {
                name: 'OneDrive'
              }
            },
            'File Path': {
              rich_text: [{
                text: {
                  content: item.webUrl
                }
              }]
            },
            'Last Modified': {
              date: {
                start: item.lastModifiedDateTime
              }
            },
            'Content': {
              rich_text: [{
                text: {
                  content: JSON.stringify(sheetData)
                }
              }]
            },
            'Status': {
              select: {
                name: 'Synced'
              }
            },
            'Sync Date': {
              date: {
                start: new Date().toISOString()
              }
            }
          }
        });
      }
    }
  } catch (error) {
    console.error('Sync error:', error);
  }
}

// 定期実行（例: 5分ごと）
setInterval(syncExcelToNotion, 5 * 60 * 1000);
syncExcelToNotion(); // 初回実行
```

#### ステップ3: GitHub Actionsワークフロー（定期実行）

**ファイル**: `.github/workflows/excel-onedrive-notion-sync.yml`

```yaml
name: Excel/OneDrive to Notion Sync

on:
  schedule:
    - cron: '*/5 * * * *'  # 5分ごと
  workflow_dispatch:  # 手動実行も可能

jobs:
  sync:
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

      - name: Sync Excel/OneDrive to Notion
        env:
          NOTION_API_KEY: ${{ secrets.NOTION_API_KEY }}
          NOTION_DATABASE_ID: ${{ secrets.NOTION_DATABASE_ID }}
          AZURE_CLIENT_ID: ${{ secrets.AZURE_CLIENT_ID }}
          AZURE_CLIENT_SECRET: ${{ secrets.AZURE_CLIENT_SECRET }}
          AZURE_TENANT_ID: ${{ secrets.AZURE_TENANT_ID }}
        run: node scripts/excel-onedrive-to-notion-sync.js
```

---

### 方法2: リアルタイムWebhook連携（高度）

#### OneDrive Webhookの設定

OneDriveのファイル変更を検知してリアルタイムでNotionに同期：

```javascript
// Webhookエンドポイント
app.post('/webhook/onedrive', async (req, res) => {
  const { value } = req.body;
  
  for (const notification of value) {
    if (notification.changeType === 'updated') {
      // ファイルが更新されたら即座にNotionに同期
      await syncFileToNotion(notification.resource);
    }
  }
  
  res.status(200).send('OK');
});
```

---

## 📊 Notion Database設計例

### Excel/OneDrive Sync Database

| プロパティ | 型 | 説明 |
|----------|-----|------|
| File Name | Title | ファイル名 |
| Source | Select | Excel / OneDrive |
| File Path | Text | ファイルパス/URL |
| Last Modified | Date | 最終更新日時 |
| Status | Select | Synced / Pending / Error |
| Content | Text | ファイル内容（JSON形式） |
| Sync Date | Date | 同期日時 |
| Error Message | Text | エラーメッセージ（エラー時） |

### ビュー例

1. **All Files** - すべてのファイル
2. **Recent Sync** - 最近同期したファイル
3. **Errors** - エラーが発生したファイル
4. **By Source** - ソース別（Excel / OneDrive）

---

## 🎯 Cursor Chatからの利用

### 基本的な操作

```
# Notion Databaseからデータを取得
Notion Database「Excel/OneDrive Sync」の最新10件のデータを取得して

# 特定のファイルを検索
Notion Database「Excel/OneDrive Sync」で「File Name」が「sales_data.xlsx」のデータを取得して

# エラーが発生したファイルを確認
Notion Database「Excel/OneDrive Sync」で「Status」が「Error」のデータを取得して
```

### データ分析

```
# 同期状況の分析
Notion Database「Excel/OneDrive Sync」のデータを分析して、同期成功率とエラー傾向を教えて
```

---

## 🔄 データフロー例

### シナリオ1: Excelファイルの更新

1. **ExcelファイルをOneDriveで更新**
2. **Webhookまたは定期実行で検知**
3. **Microsoft Graph APIでファイル内容を取得**
4. **ExcelをパースしてJSON形式に変換**
5. **Notion Databaseに即座に反映**
6. **Cursor Chatからリアルタイムでアクセス可能**

### シナリオ2: データの蓄積

1. **複数のExcel/OneDriveファイルを継続的に同期**
2. **Notion Databaseに蓄積**
3. **Notion Databaseの検索・フィルタ機能で分析**
4. **Cursor Chatから自然言語でデータにアクセス**

---

## 📚 必要な設定

### 1. Notion API Key

既に設定済み（`docs/setup/NOTION_MCP_SETUP_GUIDE.md`参照）

### 2. Microsoft Graph API認証情報

- Azure ADアプリ登録
- Client ID / Client Secret / Tenant ID
- 必要な権限: `Files.ReadWrite`, `Files.ReadWrite.All`

### 3. GitHub Secrets

- `NOTION_API_KEY`
- `NOTION_DATABASE_ID`
- `AZURE_CLIENT_ID`
- `AZURE_CLIENT_SECRET`
- `AZURE_TENANT_ID`

---

## ✅ メリット

1. **リアルタイム連携**: データが即座にNotionに反映
2. **継続的な蓄積**: データが永続的に管理される
3. **一元管理**: すべてのデータをNotion Databaseで管理
4. **MCP統合**: Cursor Chatから直接アクセス可能
5. **検索・分析**: Notionの強力な検索・フィルタ機能
6. **可視化**: Notion Databaseのビュー機能で可視化

---

## ⚠️ 注意事項

1. **レート制限**
   - Notion API: 3リクエスト/秒
   - Microsoft Graph API: リクエスト数に応じて制限あり

2. **データサイズ**
   - Notion Databaseのプロパティにはサイズ制限あり
   - 大きなファイルは外部ストレージと統合を検討

3. **同期頻度**
   - リアルタイム同期: Webhook推奨
   - 定期同期: GitHub Actions（5分ごとなど）

---

## 🚀 次のステップ

1. **Notion Databaseの作成**
2. **同期スクリプトの実装**
3. **GitHub Actionsワークフローの設定**
4. **動作確認とテスト**
5. **リアルタイムWebhook連携の実装（オプション）**

---

## 📚 参考リンク

- [Notion API Documentation](https://developers.notion.com/)
- [Microsoft Graph API](https://learn.microsoft.com/en-us/graph/overview)
- [Notion MCP設定ガイド](./setup/NOTION_MCP_SETUP_GUIDE.md)
- [Notion vs Google Sheets/Drive](./analysis/NOTION_VS_GOOGLE_SHEETS_DRIVE.md)



