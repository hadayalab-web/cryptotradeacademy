# Cursor Pro + GitHub Copilot Pro + n8n-mcp 最強開発環境 SSOT

## 戦略的位置づけ

**n8nワークフロー開発を爆速化し、完全制御を実現するAI統合開発環境**。3つのツールが相互補完し、自然言語からプロダクションレベルのワークフローまで一気通貫で実装。

***

## システム構成

### コアツールスタック

| ツール | 役割 | 月額 | 主要機能 |
| :-- | :-- | :-- | :-- |
| **Cursor Pro** | AI統合エディタ | \$20 | Composer（マルチファイル編集）、Agent（自律実行）、26種類LLM[^1] |
| **GitHub Copilot Pro** | コード補完AI | \$10 | リアルタイム補完、Chat、複数AIモデル[^2] |
| **n8n-mcp** | ワークフロー生成 | 無料 | 541ノード知識、2,709テンプレート[^3] |

**合計投資額**: **\$30/月** = 開発速度30%向上[^4]

***

## セットアップ手順

### Phase 1: Cursor Proのインストール

```bash
# 1. Cursor公式サイトからダウンロード
# https://cursor.com/

# 2. Proプランにアップグレード
# Settings → Billing → Upgrade to Pro
```

**Proプランの主要機能**:[^1][^5]

- Unlimited premium requests（無制限のプレミアムリクエスト）
- Composer（マルチファイル編集）
- Agent mode（自律実行）
- Claude 3.7 Sonnet、GPT-4o、o1など26モデル


### Phase 2: GitHub Copilot Proの設定

```bash
# 1. GitHubアカウントでCopilot Pro契約
# https://github.com/settings/copilot

# 2. Cursor内でCopilotを有効化
# Settings → Features → Enable GitHub Copilot
# GitHub認証を完了
```


### Phase 3: n8n-mcpの統合

```bash
# 1. n8nでAPIキー生成
# n8nダッシュボード → Settings → API → Generate API Key

# 2. n8n-mcpをインストール
npm install -g n8n-mcp

# 3. Cursor設定ファイルを作成
# ~/.cursor/mcp.json
```

**mcp.json設定**:[^3]

```json
{
  "mcpServers": {
    "n8n-mcp": {
      "command": "npx",
      "args": ["n8n-mcp"],
      "env": {
        "N8N_API_URL": "https://your-n8n-instance.com",
        "N8N_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

**設定確認**:

```bash
# Cursorを再起動後、Cmd+Shift+P（Mac）/ Ctrl+Shift+P（Windows）
# "MCP: Check Server Status" で接続確認
```


***

## 爆速ワークフロー開発手法

### Level 1: 基本ワークフロー生成（5分）

**Composerモードで自然言語指示**:[^6]

```
Cmd+I でComposer起動

「以下のワークフローを作成:
1. Webhook URLでPOSTリクエストを受信
2. ChatGPT-4oで受信データを要約
3. 結果をSlack #general チャンネルに投稿
4. Google Driveにログを保存

エラーハンドリングとリトライ機能を含める」
```

**自動生成されるもの**:[^7]

- ワークフローJSON定義ファイル
- README.mdドキュメント
- 環境変数テンプレート（.env.example）
- テスト用モックデータ


### Level 2: カスタムノード開発（15分）

**Agentモードで複雑な実装**:[^1]

```
Cmd+K でAgent起動

「CryptoSignal AI用のカスタムノードを作成:
- Binance APIから価格データ取得
- RSI、MACDインジケーター計算
- TypeScript実装
- ユニットテスト含む」
```

**Agentの自律実行**:[^8]

1. ノードディレクトリ構造を作成
2. TypeScriptコードを生成（Copilotが補完）
3. package.jsonを更新
4. テストファイルを生成・実行
5. エラーを自動修正

### Level 3: 大規模リファクタリング（30分）

**Composer + Agent連携**:

```
Composerで全体指示:
「n8n-automationリポジトリ全体をリファクタリング:
- ワークフローを機能別にディレクトリ分割
- 共通処理をサブワークフロー化
- エラーログを統一フォーマットに変更
- ドキュメントを自動生成」
```

**複数Agentが並列実行**:[^1]

- Agent 1: ファイル構造の再編成
- Agent 2: サブワークフロー抽出
- Agent 3: ログ処理の統一
- Agent 4: ドキュメント生成

***

## 実践的開発フロー

### 日常的なワークフロー作成

```
┌─────────────────────────────────────────────┐
│ 1. Composer: 全体設計                        │
│    「〇〇なワークフローを作成」              │
└────────────────┬────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────┐
│ 2. n8n-mcp: ノード自動選択                   │
│    541ノードから最適なものを提案             │
└────────────────┬────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────┐
│ 3. Copilot: コード補完                       │
│    Function/Code内のロジック高速実装         │
└────────────────┬────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────┐
│ 4. Agent: テスト・デバッグ                   │
│    自動テスト実行→エラー修正→再テスト       │
└────────────────┬────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────┐
│ 5. n8n-mcp: デプロイ                         │
│    ワークフローをn8nインスタンスに自動登録   │
└─────────────────────────────────────────────┘
```


### プロジェクト固有の設定

**HadayaLab Space用カスタマイズ**:

```json
// .cursor/settings.json
{
  "cursor.agent.customInstructions": {
    "repositories": [
      "cryptosignal-ai",
      "n8n-automation", 
      "nm-gateway"
    ],
    "defaultWorkflowStructure": {
      "errorHandling": "always",
      "logging": "structured",
      "testMode": "enabled"
    },
    "n8nIntegration": {
      "preferredNodes": ["HTTP Request", "Code", "IF", "Switch"],
      "apiEndpoint": "https://your-n8n.com"
    }
  }
}
```


***

## 生産性指標

### 開発時間比較

| タスク | 従来 | この環境 | 短縮率 |
| :-- | :-- | :-- | :-- |
| 基本ワークフロー作成 | 30分 | 5分 | **83%** |
| カスタムノード開発 | 2時間 | 15分 | **87%** |
| 複雑な統合実装 | 1日 | 2時間 | **75%** |
| デバッグ・修正 | 1時間 | 15分 | **75%** |

**月間効率化**: 20時間の開発が**約6時間に短縮**（70%削減）[^5][^4]

### ROI計算

```
月額投資: $30
時給換算: $50（仮定）
節約時間: 14時間/月
月間ROI: ($50 × 14h) - $30 = $670

年間ROI: $670 × 12 = $8,040
投資回収期間: 即時（初月から黒字）
```


***

## トラブルシューティング

### よくある問題と解決策

**問題1**: n8n-mcp接続エラー

```bash
# 解決策
# 1. APIキーの再生成
# 2. mcp.json のN8N_API_URLが正しいか確認
# 3. n8nインスタンスが起動しているか確認
npx n8n-mcp --test-connection
```

**問題2**: Composerが複数ファイルを認識しない

```
# 解決策
# プロジェクトルートに .cursorignore を作成し除外ファイルを指定
node_modules/
.git/
dist/
```

**問題3**: Copilotとの競合

```
# 解決策
# Settings → Features
# "Copilot Suggestions" を "On specific trigger" に変更
# Tab = Cursor補完、Alt+\ = Copilot補完 で使い分け
```


***

## 高度なテクニック

### カスタムComposerプロンプト

**.cursor/composer-templates/n8n-workflow.md**:

```markdown
# n8nワークフローテンプレート

## 必須要素
- エラーハンドリング（Try-Catch構造）
- リトライロジック（最大3回）
- 構造化ログ（JSON形式）
- 環境変数による設定（APIキー等）

## 推奨ノード構成
1. Trigger（Webhook/Schedule）
2. 入力バリデーション（IF/Switch）
3. メイン処理
4. エラーハンドリング
5. 通知/ログ出力

## ドキュメント
- README.md: 概要、使い方、環境変数
- TESTING.md: テスト手順
```

**使用方法**:

```
Composer起動後:
「@composer-templates/n8n-workflow.md に従って
API連携ワークフローを作成」
```


### Multi-Agent連携パターン

```javascript
// .cursor/agent-config.json
{
  "agents": [
    {
      "name": "workflow-architect",
      "role": "ワークフロー設計",
      "focus": ["structure", "node-selection"]
    },
    {
      "name": "code-implementer", 
      "role": "コード実装",
      "focus": ["javascript", "typescript", "python"]
    },
    {
      "name": "test-engineer",
      "role": "テスト・デバッグ",
      "focus": ["unit-test", "integration-test", "debugging"]
    },
    {
      "name": "documentation-writer",
      "role": "ドキュメント作成",
      "focus": ["readme", "api-docs", "comments"]
    }
  ]
}
```


***

## ベストプラクティス

### 1. ワークフロー設計原則

- **1ワークフロー = 1責務**: 複雑な処理はサブワークフローに分割[^9]
- **べき等性の確保**: 同じ入力で何度実行しても同じ結果
- **監視可能性**: すべての重要処理でログ出力


### 2. Composer活用法

- **明確な指示**: 「〇〇を作成」より「〇〇機能を持つXXを、YY構成で作成」
- **段階的生成**: 大規模変更は小さく分割して指示[^7]
- **コンテキスト提供**: 関連ファイルを開いてから指示


### 3. Agent最適化

- **並列実行**: 独立したタスクは複数Agentに分散[^1]
- **進捗確認**: Agentログをリアルタイムでモニタリング
- **エラー時の介入**: 無限ループに陥ったら手動停止


### 4. Copilot使い分け

- **補完**: 単純なコード、定型処理
- **Chat**: アルゴリズム相談、デバッグ支援
- **Composer**: プロジェクト全体の変更

***

## プロジェクト実装例

### cryptosignal-ai向けワークフロー

**Composer指示例**:

```
「暗号通貨シグナル生成ワークフローを作成:

入力:
- Binance Websocketから価格ストリーム受信

処理:
1. 価格データを1分足にアグリゲート
2. カスタムノードでRSI/MACD計算
3. ChatGPT-4oでシグナル分析
4. 信頼度スコアを算出

出力:
- 高スコアシグナルをTelegram送信
- 全データをPostgreSQLに保存
- Grafanaダッシュボード更新

要件:
- リアルタイム処理（遅延<500ms）
- エラー時の自動再接続
- バックテスト機能
」
```

**生成されるファイル**:

```
cryptosignal-workflow/
├── workflow.json              # n8nワークフロー定義
├── nodes/
│   └── technical-indicators/  # カスタムノード
│       ├── TechnicalIndicators.node.ts
│       └── TechnicalIndicators.node.test.ts
├── utils/
│   └── price-aggregator.ts    # 共通ロジック
├── tests/
│   └── integration.test.ts    # 統合テスト
├── .env.example               # 環境変数テンプレート
└── README.md                  # ドキュメント
```


***

## まとめ: 最強環境の価値

### 投資対効果

- **初期投資**: \$30/月
- **開発効率**: 70%向上
- **コード品質**: AI支援によるベストプラクティス適用
- **学習効果**: AI説明による技術理解の深化


### 適用領域

✅ n8nワークフロー開発（爆速）
✅ カスタムノード実装
✅ 既存コードのリファクタリング
✅ ドキュメント自動生成
✅ テスト・デバッグ自動化

### 次のステップ

1. **今日**: Cursor Pro契約 + 基本設定（30分）
2. **1日目**: 簡単なワークフローで操作習得（2時間）
3. **1週間**: cryptosignal-aiに実践投入
4. **1ヶ月**: ROI測定と環境最適化

**この環境は単なるツールではなく、AIペアプログラマーとの共同開発体制です**。HadayaLab Spaceのプロジェクト群（cryptosignal-ai、n8n-automation、nm-gateway）を次のレベルに引き上げる戦略的投資となります。[^5][^6]