# MCP最適化と拡張機能ガイド

**作成日**: 2025-01-27  
**現状**: 94ツール（推奨制限80を超過）

---

## ⚠️ 現状の問題

### ツール数超過
- **現在**: 94ツール
- **推奨制限**: 80ツール
- **超過**: 14ツール（17.5%超過）

### 影響
- パフォーマンス低下の可能性
- 一部のモデルが80ツール以上を無視する可能性
- ツール選択の精度低下

---

## 🔧 ツール数最適化戦略

### 1. 使用頻度の低いツールを無効化

#### 推奨無効化候補（優先度低）

**Whop MCP (19ツール)**
- `whop_get_experiences` - Experience機能が使用不可のため
- `whop_create_experience` - Experience機能が使用不可のため
- `whop_update_experience` - Experience機能が使用不可のため
- `whop_delete_experience` - Experience機能が使用不可のため

**n8n-local (20ツール)**
- 使用頻度の低いノード検索ツール
- テンプレート検索ツール（必要時のみ有効化）

**grok-x-sentiment (推定5-10ツール)**
- 使用頻度が低い場合、一時的に無効化

### 2. ツール統合の検討

#### 統合可能なツール
- **Whop**: 類似機能のツールを統合（例: `get_memberships`と`get_membership`を1つのツールに）
- **Notion**: 検索と取得を統合
- **HeyGen**: 音声関連ツールを統合

### 3. 条件付きツール読み込み

MCPサーバー側で、使用頻度に応じてツールを動的に読み込む機能を実装

---

## 🚀 MCP拡張機能と改善方法

### 1. MCP Extension API

**公式機能**: Cursorが提供するMCP拡張APIを使用して、プログラム的にMCPサーバーを管理

**メリット**:
- `mcp.json`を直接編集せずに動的設定
- ツールの有効/無効を動的に切り替え
- 条件付きツール読み込み

**参考**: [Cursor MCP Extension API](https://docs.cursor.com/ja/context/mcp-extension-api)

### 2. MCP対応ツールの追加

#### 推奨追加ツール

**データベース統合**
```json
{
  "postgres": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-postgres", "postgresql://localhost/mydb"]
  }
}
```

**タスク管理統合**
```json
{
  "todoist": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-todoist"]
  }
}
```

**参考**: [MCP Cursor Tools](https://mcpcursor.org/)

### 3. カスタムMCPサーバーの開発

#### 既存サーバーの改善

**1. ツールグループ化**
- 関連ツールをグループ化して、必要時のみ有効化
- 例: WhopのExperience関連ツールを1つのグループに

**2. ツール統合**
- 類似機能のツールを統合
- 例: `get_*`系ツールを1つの汎用ツールに

**3. 条件付きツール読み込み**
```javascript
// 使用頻度に応じてツールを動的に読み込む
const tools = [];
if (process.env.ENABLE_ADVANCED_TOOLS === 'true') {
  tools.push(...advancedTools);
}
```

### 4. MCPサーバーのパフォーマンス最適化

#### 実装済み最適化
- ✅ `NODE_NO_WARNINGS=1` - 警告を抑制
- ✅ `LOG_LEVEL=error` - エラーログのみ出力

#### 追加可能な最適化
- **キャッシング**: 頻繁にアクセスするデータをキャッシュ
- **バッチ処理**: 複数のリクエストをまとめて処理
- **遅延読み込み**: ツールを必要時のみ読み込む

---

## 📋 推奨アクション

### 即座に実施（ツール数削減）

1. **Whop Experience関連ツールを無効化** (-4ツール)
   - `whop_get_experiences`
   - `whop_create_experience`
   - `whop_update_experience`
   - `whop_delete_experience`

2. **使用頻度の低いn8n-localツールを無効化** (-5〜10ツール)
   - ノード検索ツール（必要時のみ有効化）
   - テンプレート検索ツール（必要時のみ有効化）

3. **grok-x-sentimentを一時的に無効化**（使用頻度が低い場合）(-5〜10ツール)

**目標**: 94ツール → 75〜80ツール

### 中期改善（機能拡張）

1. **MCP Extension APIの活用**
   - ツールの動的有効/無効化
   - 条件付きツール読み込み

2. **ツール統合の実装**
   - 類似機能のツールを統合
   - 汎用ツールの作成

3. **パフォーマンス最適化**
   - キャッシングの実装
   - バッチ処理の導入

### 長期改善（新機能追加）

1. **データベース統合**
   - PostgreSQL/MySQL MCPサーバーの追加
   - データ分析機能の強化

2. **タスク管理統合**
   - Todoist/Asana MCPサーバーの追加
   - タスク自動化の強化

3. **カスタムMCPサーバーの開発**
   - プロジェクト固有の機能を追加
   - ワークフロー自動化の強化

---

## 🔍 MCP拡張機能リソース

### 公式リソース
- **Cursor MCP Documentation**: https://docs.cursor.com/ja/context/model-context-protocol
- **MCP Extension API**: https://docs.cursor.com/ja/context/mcp-extension-api
- **MCP Cursor Tools**: https://mcpcursor.org/

### コミュニティリソース
- **MCP Servers GitHub**: https://github.com/modelcontextprotocol/servers
- **MCP Community**: Discord/Slackコミュニティ

### 参考実装
- **Guru Integration**: https://www.getguru.com/ja/integrations/cursor
- **PostgreSQL MCP**: https://docs.cursor.com/ja/guides/advanced/datascience

---

## ✅ チェックリスト

### 即座に実施
- [ ] Whop Experience関連ツールを無効化
- [ ] 使用頻度の低いn8n-localツールを無効化
- [ ] grok-x-sentimentを一時的に無効化（必要に応じて）
- [ ] ツール数を80以下に削減

### 中期改善
- [ ] MCP Extension APIの調査・実装
- [ ] ツール統合の実装
- [ ] パフォーマンス最適化の実装

### 長期改善
- [ ] データベース統合の追加
- [ ] タスク管理統合の追加
- [ ] カスタムMCPサーバーの開発

---

## 📊 現在のMCPサーバー一覧

| サーバー名 | ツール数 | 状態 | 優先度 |
|-----------|---------|------|--------|
| task-manager | 12 | ✅ 有効 | 高 |
| whop | 19 | ✅ 有効 | 高 |
| heygen | 6 | ✅ 有効 | 高 |
| notion | 8 | ✅ 有効 | 高 |
| n8n-local | 20 | ✅ 有効 | 中 |
| n8n-cloud | ? | ✅ 有効 | 中 |
| knowledge-base | 5 | ✅ 有効 | 中 |
| grok-x-affiliate | 10+ | ✅ 有効 | 高 |
| grok-x-sentiment | 5-10 | ✅ 有効 | 低 |
| telegram-affiliate-dm | 5 | ✅ 有効 | 高 |

**合計**: 94ツール（推奨制限80を超過）

---

**最終更新**: 2025-01-27  
**ステータス**: ⚠️ 最適化が必要





















