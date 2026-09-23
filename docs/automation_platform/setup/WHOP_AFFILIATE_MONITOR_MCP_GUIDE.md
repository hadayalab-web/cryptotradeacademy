# Whop Affiliate Monitor MCPガイド

**作成日**: 2025-01-27
**更新**: 2025-01-27 - Grok API統合、全世界対応、多プラットフォーム検索対応

---

## 🎯 概要

**Whop Affiliate Monitor MCP**は、Grok APIを使用して様々な媒体（X/Twitter、Telegram、YouTube、LinkedIn、Instagramなど）からアフィリエイター候補を検索し、EmailまたはTelegramで接続可能な候補をNotionデータベースに保存するMCPサーバーです。

**特徴**:
- ✅ **Grok API統合**: Grok AIを使用してあらゆる媒体から候補を検索
- ✅ **多プラットフォーム対応**: X、Telegram、YouTube、LinkedIn、Instagramなど様々なプラットフォームを検索
- ✅ **全世界対応**: 市場特化なし、全世界をターゲット
- ✅ **Notionデータベース化**: 候補情報をNotionデータベースに自動保存
- ✅ **連絡先フィルタ**: EmailまたはTelegramで接続可能な候補のみを保存
- ✅ **重複排除**: 既存の候補は自動的にスキップ
- ✅ **定期監視対応**: GitHub Actionsなどで定期実行可能

---

## 📋 セットアップ

### 1. APIキーの設定

`.env`ファイルに以下を追加：

```env
# Grok API (必須)
XAI_API_KEY=your_xai_api_key_here
# または
GROK_API_KEY=your_grok_api_key_here

# Notion API (必須)
NOTION_API_KEY=your_notion_api_key_here

# Notion Database ID (必須 - 後で設定)
NOTION_AFFILIATE_DATABASE_ID=your_database_id_here
```

### 2. MCPサーバーの設定

`~/.cursor/mcp.json`に`whop-affiliate-monitor`サーバーが追加済みです。

### 3. Notionデータベースの作成

#### 方法1: MCPツールを使用して作成（推奨）

Cursor Chatで以下を実行：

```
@whop-affiliate-monitor Notionデータベースを作成して。親ページIDは「your_parent_page_id」で。
```

#### 方法2: 手動で作成

Notionで以下のプロパティを持つデータベースを作成：

| プロパティ名 | タイプ | 説明 |
|------------|--------|------|
| 名前 | Title | アフィリエイター名（必須） |
| Email | Email | メールアドレス |
| Telegram | Text | Telegramユーザー名 |
| プラットフォーム | Select | X/Twitter/Telegram/YouTube/LinkedIn/Instagramなど |
| ユーザー名 | Text | プラットフォーム上のユーザー名 |
| ステータス | Select | New/Contacted/Responded/Onboarded/Rejected |
| 連絡方法 | Select | Email/Telegram/Both |
| マッチスコア | Number | ペルソナとの適合度（1-10） |
| フォロワー数 | Number | フォロワー/サブスクライバー数 |
| エンゲージメント率 | Number | エンゲージメント率（%） |
| プロフィールURL | URL | プロフィールURL |
| 作成日 | Date | 作成日時 |
| 更新日 | Date | 更新日時 |
| メタデータ | Text | その他の情報（JSON形式） |

**ステータスオプション**:
- New (青)
- Contacted (黄)
- Responded (オレンジ)
- Onboarded (緑)
- Rejected (赤)

**連絡方法オプション**:
- Email (緑)
- Telegram (青)
- Both (紫)

データベースIDを取得して、`.env`ファイルに設定：

```env
NOTION_AFFILIATE_DATABASE_ID=your_database_id_here
```

### 4. Cursorを再起動

設定を反映するため、Cursorを再起動してください。

---

## 🚀 使い方

### 基本的な使い方

#### 1. アフィリエイター候補を検索してNotionに保存

```
@whop-affiliate-monitor 「crypto technical analysis BTC」でアフィリエイター候補を検索して
```

#### 2. 特定のプラットフォームを指定して検索

```
@whop-affiliate-monitor 「bitcoin trading strategy」でXとTelegramからアフィリエイター候補を検索して
```

#### 3. 複数の検索クエリを一括実行

```
@whop-affiliate-monitor 以下のクエリでアフィリエイター候補を検索して:
- "crypto technical analysis"
- "bitcoin trading signals"
- "on-chain analysis tutorial"
```

### 高度な使い方

#### マッチスコアの設定

```
@whop-affiliate-monitor 「crypto education」で検索して、マッチスコア8以上で
```

#### 最大候補数の設定

```
@whop-affiliate-monitor 「bitcoin analysis」で最大50件の候補を検索して
```

---

## 📊 データ構造

### Grok APIレスポンス例

```json
[
  {
    "username": "@cryptotrader",
    "display_name": "Crypto Trader",
    "follower_count": 15000,
    "engagement_rate": 3.5,
    "content_type": "Technical analysis",
    "recent_topics": ["BTC technical analysis", "Chart patterns"],
    "pain_points": ["Limited monetization", "Platform limitations"],
    "email": "crypto@example.com",
    "telegram_username": "@cryptotrader",
    "contact_method": "Both",
    "match_score": 8,
    "platform": "X",
    "profile_url": "https://twitter.com/cryptotrader",
    "bio": "Crypto trader and educator",
    "verified": false,
    "joined_date": "2020-01-01"
  }
]
```

### Notionデータベースエントリ

各アフィリエイター候補は以下の形式でNotionに保存されます：

- **名前**: アフィリエイターのユーザー名または表示名
- **Email**: メールアドレス（ある場合）
- **Telegram**: Telegramユーザー名（ある場合）
- **プラットフォーム**: X、Telegram、YouTube、LinkedIn、Instagramなど
- **ユーザー名**: プラットフォーム上のユーザー名
- **ステータス**: New（デフォルト）
- **連絡方法**: Email、Telegram、またはBoth
- **マッチスコア**: ペルソナとの適合度（1-10）
- **フォロワー数**: フォロワー/サブスクライバー数
- **エンゲージメント率**: エンゲージメント率（%）
- **プロフィールURL**: プロフィールURL
- **作成日**: 候補が作成された日時
- **更新日**: 最後に更新された日時
- **メタデータ**: その他の情報（JSON形式）

---

## 🔄 定期監視・CVRランキング更新

### CVRベスト100リストの生成

MCPツールを使用してCVRベスト100リストを生成：

```
@whop-affiliate-monitor CVRベスト100リストを生成して
```

### GitHub Actionsを使用した定期実行（毎朝6時JST）

`.github/workflows/update-cvr-top100.yml`が既に作成されています：

**スケジュール**: 毎朝6時（JST、UTC: 21:00）

**必要な環境変数（GitHub Secrets）**:
- `NOTION_API_KEY`: Notion API Key
- `NOTION_AFFILIATE_DATABASE_ID`: NotionデータベースID

**機能**:
- Notionデータベースから全候補を取得
- CVRスコアを計算（マッチスコア、エンゲージメント率、フォロワー数、連絡方法、プラットフォームを考慮）
- ベスト100をランキング
- NotionデータベースのCVRスコアとランキングを更新

### CVRスコア計算ロジック

CVRスコアは以下の要素から計算されます（0-100点満点）：

1. **マッチスコア**（40点満点）
   - ペルソナとの適合度（1-10）を40点満点に換算

2. **エンゲージメント率**（25点満点）
   - 5%以上: 25点
   - 3-5%: 3-25点（比例）
   - 3%未満: 0-15点

3. **フォロワー数**（15点満点）
   - 5K-50Kの範囲が最適（中央値27.5Kで満点）
   - 範囲外: 5点

4. **連絡方法**（10点満点）
   - Both: 10点
   - Email: 7点
   - Telegram: 5点

5. **プラットフォーム**（10点満点）
   - YouTube: 10点
   - X/Twitter: 9点
   - LinkedIn: 8点
   - Telegram: 7点
   - Instagram: 6点
   - その他: 4-5点

### 古いワークフロー（参考）

`.github/workflows/whop-affiliate-monitor.yml`を作成（現在は使用していません）：

```yaml
name: Whop Affiliate Monitor

on:
  schedule:
    # 毎日午前9時（JST）に実行
    - cron: '0 0 * * *'
  workflow_dispatch:

jobs:
  monitor:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Run monitor
        env:
          WHOP_API_KEY: ${{ secrets.WHOP_API_KEY }}
          NOTION_API_KEY: ${{ secrets.NOTION_API_KEY }}
          NOTION_AFFILIATE_DATABASE_ID: ${{ secrets.NOTION_AFFILIATE_DATABASE_ID }}
        run: |
          node scripts/whop-affiliate-monitor-runner.js
```

---

## ⚠️ 注意事項

1. **Grok API Key**: XAI API Key（またはGROK_API_KEY）が必要です
2. **Notion API権限**: Notion Integrationにデータベースへのアクセス権限を付与してください
3. **レート制限**: Grok APIとNotion APIのレート制限に注意してください
4. **重複排除**: 同じプラットフォームとユーザー名の組み合わせで重複チェックします
5. **連絡先必須**: EmailまたはTelegramの連絡先がある候補のみが保存されます

---

## 🔧 トラブルシューティング

### エラー: "Notion database ID is required"

`.env`ファイルに`NOTION_AFFILIATE_DATABASE_ID`が設定されているか確認してください。

### エラー: "Grok API error: 401 Unauthorized"

XAI_API_KEY（またはGROK_API_KEY）が正しく設定されているか確認してください。

### エラー: "Notion API Error: 404 Not Found"

Notion Database IDが正しいか、Notion Integrationにデータベースへのアクセス権限があるか確認してください。

---

## 📚 関連ドキュメント

- [Grok API Documentation](https://docs.x.ai/)
- [Notion API Documentation](https://developers.notion.com/docs)
- [Notion MCP Setup Guide](./NOTION_MCP_SETUP_GUIDE.md)

