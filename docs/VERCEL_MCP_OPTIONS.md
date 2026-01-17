# Vercel MCP統合オプション
**最終更新**: 2026-01-17 14:07:03  
**作成日時**: 2026-01-17 14:07:03  

## 📋 現状分析

Vercel公式でMCPサーバーのデプロイをサポートしていますが、**Vercelダッシュボードのログに直接アクセスする既存のMCPサーバーは現在存在しないようです**。

## 🔧 実装オプション

### オプション1: カスタムVercel MCPサーバーの作成（推奨）

**概要**: Vercel APIを使用してログを取得するMCPサーバーを自作

**必要なAPI**:
- Vercel API: https://vercel.com/docs/rest-api
- Logs API: https://vercel.com/docs/rest-api/endpoints/logs

**実装手順**:

1. **Vercel API Tokenの取得**
   - Vercel Dashboard → Settings → Tokens
   - 新しいTokenを作成（Read権限で十分）

2. **MCPサーバーパッケージの作成**
   ```bash
   npm init -y
   npm install @modelcontextprotocol/sdk vercel
   ```

3. **MCPサーバーコード**:
   ```javascript
   // vercel-mcp-server.js
   const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
   const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
   const { Vercel } = require('@vercel/sdk');

   const server = new Server({
     name: 'vercel-mcp',
     version: '1.0.0',
   }, {
     capabilities: {
       tools: {},
     },
   });

   // Vercelログ取得ツール
   server.setRequestHandler('tools/list', async () => ({
     tools: [
       {
         name: 'get_vercel_logs',
         description: 'Get logs from Vercel deployment',
         inputSchema: {
           type: 'object',
           properties: {
             projectId: { type: 'string' },
             deploymentId: { type: 'string' },
             since: { type: 'number' },
             until: { type: 'number' },
           },
           required: ['projectId'],
         },
       },
     ],
   }));

   server.setRequestHandler('tools/call', async (request) => {
     const { name, arguments: args } = request.params;

     if (name === 'get_vercel_logs') {
       const vercel = new Vercel({ token: process.env.VERCEL_TOKEN });
       const logs = await vercel.logs.list({
         projectId: args.projectId,
         deploymentId: args.deploymentId,
         since: args.since,
         until: args.until,
       });
       return {
         content: [
           {
             type: 'text',
             text: JSON.stringify(logs, null, 2),
           },
         ],
       };
     }
   });

   // サーバー起動
   const transport = new StdioServerTransport();
   server.connect(transport);
   ```

4. **MCP設定への追加** (`~/.cursor/mcp.json`):
   ```json
   {
     "mcpServers": {
       "vercel": {
         "command": "node",
         "args": ["path/to/vercel-mcp-server.js"],
         "env": {
           "VERCEL_TOKEN": "your-vercel-token-here"
         }
       }
     }
   }
   ```

**メリット**:
- ✅ カスタマイズ可能
- ✅ 必要な機能だけを実装
- ✅ 完全な制御

**デメリット**:
- ❌ 実装に時間がかかる
- ❌ メンテナンスが必要

---

### オプション2: Vercel APIをn8n経由でアクセス（現実的）

**概要**: n8nワークフローでVercel APIを呼び出し、MCP経由でn8nにアクセス

**実装手順**:

1. **n8nワークフロー作成**:
   - HTTP Request NodeでVercel Logs APIを呼び出し
   - Webhook TriggerまたはSchedule Triggerを設定

2. **MCP経由でアクセス**:
   - 既存の`n8n-mcp`を使用
   - ワークフローを実行してログを取得

**メリット**:
- ✅ 既存のインフラを活用
- ✅ 実装が簡単
- ✅ n8nの機能（フィルタリング、変換など）を利用可能

**デメリット**:
- ⚠️ n8n経由のため、直接API呼び出しより遅い可能性

---

### オプション3: Vercel CLIを使用したスクリプト

**概要**: Vercel CLIコマンドを実行するスクリプトを作成

**実装手順**:

1. **Vercel CLIのインストール**:
   ```bash
   npm install -g vercel
   ```

2. **スクリプト作成**:
   ```bash
   # get-logs.sh
   vercel logs --project cryptosignal-ai --since 1h
   ```

3. **MCPサーバーでスクリプト実行**:
   ```javascript
   const { exec } = require('child_process');

   server.setRequestHandler('tools/call', async (request) => {
     if (request.params.name === 'get_vercel_logs') {
       return new Promise((resolve, reject) => {
         exec('vercel logs --project cryptosignal-ai --since 1h', (error, stdout, stderr) => {
           if (error) reject(error);
           else resolve({ content: [{ type: 'text', text: stdout }] });
         });
       });
     }
   });
   ```

**メリット**:
- ✅ Vercel CLIの機能を活用
- ✅ 公式ツールを使用

**デメリット**:
- ❌ CLIのインストールが必要
- ❌ 認証設定が必要

---

## 🎯 推奨アプローチ

**短期（即座に実装可能）**: オプション2（n8n経由）

- 既存の`n8n-mcp`を使用
- ワークフローを作成するだけ
- すぐに利用可能

**長期（将来的な改善）**: オプション1（カスタムMCPサーバー）

- より直接的なアクセス
- カスタマイズ性が高い
- パフォーマンスが良い

---

## 📚 参考リンク

- [Vercel MCP Documentation](https://vercel.com/docs/mcp)
- [Vercel REST API Documentation](https://vercel.com/docs/rest-api)
- [Vercel Logs API](https://vercel.com/docs/rest-api/endpoints/logs)
- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)

---

**作成日**: 2026-01-17
**次回更新**: Vercel MCP実装後










