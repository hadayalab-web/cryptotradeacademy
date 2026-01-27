# Vercel Agent統合ガイド
**最終更新**: 2026-01-27  
**作成日時**: 2026-01-27

## 📋 概要

Vercel Agentは、AI-powered development toolsで、Code ReviewとInvestigationの機能を提供します。Proプランを契約している場合、これらの機能を活用できます。

## 🎯 Vercel Agentの機能

### 1. Code Review（自動コードレビュー）

**機能**:
- プルリクエストごとに自動コードレビュー
- セキュリティ脆弱性、ロジックエラー、パフォーマンス問題の特定
- 修正パッチの生成と検証
- ワンクリックで修正を適用可能

**主な特徴**（ダッシュボード画面より）:
- **Code reviews** with full codebase context to catch hard-to-find bugs
- **Code suggestions** validated in sandboxes before you merge
- **Trigger reviews** manually from any linked GitHub PR, or enable automatic reviews

**設定方法**:
1. Vercel Dashboard → Agentタブにアクセス
2. 「Tasks」セクションを確認
3. 「Redeem $100 Free Credit」ボタンをクリックしてプロモーションクレジットを取得（Proプランで利用可能）
4. 「Try Vercel Agent」モーダルで設定：
   - **Code Reviews (Beta)**:
     - "Review PRs Automatically"をONにする
     - リポジトリ設定: "All repositories"（全リポジトリをレビュー）または特定のリポジトリを選択
     - Draft PR設定: "Skip draft PRs"（Draft PRはスキップ）または "Review draft PRs"（Draft PRもレビュー）
   - **Auto-reload**:
     - "Enabled"をONにして、クレジットが不足した場合に自動的に補充
     - "Configure >"リンクから、自動リロードの閾値を設定
5. 「Save & Claim $100 Free Credit」ボタンをクリックして設定を保存

**推奨設定**:
- ✅ "Review PRs Automatically": ON（自動レビューを有効化）
- ✅ "All repositories": 全リポジトリをレビュー（または重要なリポジトリのみ選択）
- ✅ "Skip draft PRs": Draft PRはスキップ（作業中のPRはレビューしない）
- ✅ "Auto-reload Enabled": ON（クレジット不足時に自動補充）

**注意事項**:
- プロモーションクレジットは2週間で期限切れ（例: 2026年2月10日）
- クレジットは、Code ReviewやInvestigationの実行時に消費されます
- Auto-reloadの閾値は、使用状況に応じて調整することを推奨

**参考**: https://vercel.com/docs/agent/pr-review

### 2. Investigation（エラー調査）

**機能**:
- エラーアラート発生時に自動分析
- ログとメトリクスの自動クエリ
- パターンと相関関係の特定
- 根本原因の洞察を提供

**設定方法**:
1. Observability Plusが必要
2. Vercel Agent Investigationsを有効化
3. 自動調査を有効化

**参考**: https://vercel.com/docs/agent/investigation

## 🔧 Vercel MCPサーバー

### 概要

Vercelは、MCPサーバーのデプロイをサポートしています。`@vercel/mcp-adapter`（現在は`mcp-handler`）パッケージを使用して、Vercel上にMCPサーバーをデプロイできます。

### 主な特徴

- **Fluid Compute**: 動的スケーリングとインスタンス共有による最適化されたパフォーマンス
- **Instant Rollback**: 以前のデプロイメントへの迅速なロールバック
- **Preview Deployments**: 安全なテストのためのプレビューデプロイメント
- **Vercel Firewall**: セキュリティ保護

### 利用可能なテンプレート

- MCP with Next.js
- ChatGPT app with Next.js
- x402 AI Starter

**参考**: https://vercel.com/docs/mcp

## 🚀 統合オプション

### オプション1: Vercel Agentを直接活用（推奨）

**メリット**:
- ✅ 既存のVercelインフラを活用
- ✅ 自動コードレビューとエラー調査
- ✅ セットアップが簡単
- ✅ Proプランで利用可能

**設定手順**:
1. Vercel Dashboard → Agentタブにアクセス
2. Code Reviewを有効化
3. Investigationを有効化（Observability Plusが必要）

### オプション2: カスタムVercel MCPサーバーの作成

**概要**: Vercel APIを使用してログやデプロイメント情報にアクセスするMCPサーバーを作成

**必要なAPI**:
- Vercel REST API: https://vercel.com/docs/rest-api
- Logs API: https://vercel.com/docs/rest-api/endpoints/logs
- Deployments API: https://vercel.com/docs/rest-api/endpoints/deployments

**実装手順**:

1. **Vercel API Tokenの取得**
   - Vercel Dashboard → Settings → Tokens
   - 新しいTokenを作成（Read権限で十分）

2. **MCPサーバーパッケージの作成**
   ```bash
   npm init -y
   npm install @modelcontextprotocol/sdk @vercel/sdk
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
       {
         name: 'get_vercel_deployments',
         description: 'Get Vercel deployments',
         inputSchema: {
           type: 'object',
           properties: {
             projectId: { type: 'string' },
             limit: { type: 'number' },
           },
           required: ['projectId'],
         },
       },
     ],
   }));

   server.setRequestHandler('tools/call', async (request) => {
     const { name, arguments: args } = request.params;
     const vercel = new Vercel({ token: process.env.VERCEL_TOKEN });

     if (name === 'get_vercel_logs') {
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

     if (name === 'get_vercel_deployments') {
       const deployments = await vercel.deployments.list({
         projectId: args.projectId,
         limit: args.limit || 10,
       });
       return {
         content: [
           {
             type: 'text',
             text: JSON.stringify(deployments, null, 2),
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

### オプション3: Vercel Agent API経由でのアクセス

**概要**: Vercel Agentの機能をプログラム的にアクセス（現在は限定的）

**注意**: Vercel Agentは主にDashboard経由で使用することを想定していますが、将来的にはAPIアクセスが可能になる可能性があります。

## 💡 推奨アプローチ

### 短期（即座に実装可能）

1. **Vercel Agentの有効化（今すぐ実行可能）**
   - Vercel Dashboard → Agentタブ → Tasksセクションにアクセス
   - 「Redeem $100 Free Credit」ボタンをクリックしてプロモーションクレジットを取得
   - Code Reviewを有効化して、プルリクエストごとに自動レビュー
   - Investigationを有効化して、エラー発生時に自動分析（Observability Plusが必要）

2. **既存のVercel CLIスクリプトの活用**
   - `scripts/fetch-vercel-logs.js`などの既存スクリプトを活用
   - Vercel AgentのInvestigation機能と組み合わせて使用

3. **Usageセクションでクレジット使用状況を確認**
   - Agentタブの「Usage」セクションで、クレジットの使用状況を確認
   - 現在の状態:
     - **Code Reviews**: "No reviews yet" - Vercel Agentが有効化された後に作成されたプルリクエストに対してレビューが実行されます
     - **Investigations**: "No Investigations Yet" - Vercel Agent Investigationsが有効化された後に作成されたアラートに対して調査が実行されます（Observability Plusが必要、毎月10件の無料調査が含まれます）
   - 右上の「$100 Credit」ボタンで、クレジット残高を確認
   - 自動リロードを設定して、クレジットが不足した場合に自動的に補充

### 長期（将来的な改善）

1. **カスタムVercel MCPサーバーの作成**
   - Vercel APIを使用して、ログやデプロイメント情報に直接アクセス
   - Cursor経由でVercelの情報を取得できるようにする

2. **Vercel Agent APIの活用**（将来的に利用可能になった場合）
   - プログラム的にCode ReviewやInvestigationを実行
   - CI/CDパイプラインに統合

## 📚 参考リンク

- [Vercel Agent Documentation](https://vercel.com/docs/agent)
- [Vercel Agent Code Review](https://vercel.com/docs/agent/pr-review)
- [Vercel Agent Investigation](https://vercel.com/docs/agent/investigation)
- [Vercel MCP Documentation](https://vercel.com/docs/mcp)
- [Vercel REST API Documentation](https://vercel.com/docs/rest-api)
- [Vercel Logs API](https://vercel.com/docs/rest-api/endpoints/logs)
- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)

## 💰 料金

Vercel Agentは、クレジットベースのシステムを使用します：
- 各レビューまたは調査: $0.30 USD（固定）+ トークンコスト
- **Proチーム: $100 USDのプロモーションクレジットが利用可能**（ダッシュボードの「Redeem $100 Free Credit」ボタンから取得）
- **プロモーションクレジットの有効期限**: 2週間（例: 2026年2月10日まで）
- クレジットの購入と自動リロードは、Agentタブの「Usage」セクションで管理可能

**Auto-reload設定**:
- "Try Vercel Agent"モーダルの「Auto-reload」セクションで有効化
- "Configure >"リンクから、自動リロードの閾値を設定可能
- クレジットが設定した閾値を下回った場合、自動的に補充されます

**注意**: 
- プロモーションクレジットは、Agentタブの「Tasks」セクションまたは「Usage」セクションから取得できます
- クレジットは、Code ReviewやInvestigationの実行時に消費されます
- プロモーションクレジットは期限切れになる前に使用することを推奨

**参考**: https://vercel.com/docs/agent/pricing

## 🔒 プライバシー

Vercel Agentは、データを保存したりトレーニングに使用したりしません。サブプロセッサーリストのLLMプロバイダーのみを使用し、データのトレーニングを許可しない契約を結んでいます。

## 📊 Usageセクションの確認事項

### Code Reviewsの状態確認

**現在の状態**:
- "No reviews yet" - まだレビューが実行されていません
- "Suggestions Made"と"Cost"のカードは、"No data in this time range"と表示されます

**レビューが実行される条件**:
- Vercel Agentが有効化された後に作成されたプルリクエストに対してレビューが実行されます
- "Review PRs Automatically"がONになっている場合、新しいPRが作成されると自動的にレビューが開始されます

**次のステップ**:
1. GitHubリポジトリで新しいプルリクエストを作成
2. Vercel Agentが自動的にレビューを実行するのを待つ
3. Usageセクションで「Suggestions Made」と「Cost」の数値が更新されることを確認

### Investigationsの状態確認

**現在の状態**:
- "No Investigations Yet" - まだ調査が実行されていません

**調査が実行される条件**:
- Vercel Agent Investigationsが有効化されている必要があります
- Observability Plusが必要です
- Vercel Agent Investigationsが有効化された後に作成されたアラートに対して調査が実行されます
- 毎月10件の無料調査が含まれます（Observability Plusをご利用の場合）

**次のステップ**:
1. Observability Plusを有効化（まだの場合）
2. Vercel Agent Investigationsを有効化
3. エラーアラートが発生すると、自動的に調査が実行されます
4. Usageセクションで調査結果が表示されることを確認

### クレジット管理

**右上の「$100 Credit」ボタン**:
- 現在のクレジット残高を確認
- クレジットの購入と自動リロードの設定
- 使用状況の詳細を確認

**推奨事項**:
- 定期的にUsageセクションを確認して、クレジットの使用状況を把握
- Auto-reloadの閾値を適切に設定して、クレジット不足を防ぐ
- プロモーションクレジット（$100）は2週間で期限切れになるため、早めに活用することを推奨

---

**作成日**: 2026-01-27  
**最終更新**: 2026-01-27  
**次回更新**: Vercel Agent API統合後
