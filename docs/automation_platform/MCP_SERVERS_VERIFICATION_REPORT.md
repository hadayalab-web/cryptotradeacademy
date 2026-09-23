# MCPサーバーツール数検証レポート

**作成日**: 2025-01-27  
**検証内容**: 各MCPサーバーのスクリプトに定義されているツール数とCursor表示の一致確認

---

## 📊 検証結果サマリー

| MCPサーバー | スクリプト定義ツール数 | Cursor表示ツール数 | 状態 |
|------------|---------------------|-------------------|------|
| **whop** | 14 | 14 | ✅ **一致** |
| **heygen** | 6 | 6 | ✅ **一致** |
| **notion** | 8 | 8 | ✅ **一致** |
| **grok-x-affiliate** | 11 | 11 | ✅ **一致** |
| **grok-x-market-analyzer** | 5 | 5 | ✅ **一致** |
| **telegram-affiliate-dm** | 6 | 6 | ✅ **一致** |
| **合計** | **50** | **50** | ✅ **完全一致** |

---

## 🔍 詳細検証結果

### 1. whop MCP Server (14ツール)

**スクリプト**: `scripts/whop-mcp-server.js`

**定義されているツール**:
1. `whop_get_memberships` - メンバーシップ一覧取得
2. `whop_get_membership` - メンバーシップ詳細取得
3. `whop_cancel_membership` - メンバーシップキャンセル
4. `whop_reactivate_membership` - メンバーシップ再アクティブ化
5. `whop_get_products` - 製品一覧取得
6. `whop_get_product` - 製品詳細取得
7. `whop_update_product` - 製品情報更新
8. `whop_get_plans` - プラン一覧取得
9. `whop_get_plan` - プラン詳細取得
10. `whop_get_members` - メンバー一覧取得
11. `whop_get_member` - メンバー詳細取得
12. `whop_get_entries` - エントリー一覧取得
13. `whop_get_entry` - エントリー詳細取得
14. `whop_approve_entry` - エントリー承認

**検証結果**: ✅ **14ツール定義済み** → Cursor表示と一致

---

### 2. heygen MCP Server (6ツール)

**スクリプト**: `scripts/heygen-mcp-server.js`

**定義されているツール**:
1. `heygen_get_remaining_credits` - 残りクレジット取得
2. `heygen_get_voices` - 音声一覧取得
3. `heygen_get_voice_locales` - 音声ロケール一覧取得
4. `heygen_create_video` - 動画作成
5. `heygen_get_video_status` - 動画ステータス取得
6. `heygen_get_videos` - 動画一覧取得

**検証結果**: ✅ **6ツール定義済み** → Cursor表示と一致

---

### 3. notion MCP Server (8ツール)

**スクリプト**: `scripts/notion-mcp-server.js`

**定義されているツール**:
1. `notion_search` - ページやデータベースを検索
2. `notion_get_page` - ページ詳細取得
3. `notion_create_page` - ページ作成
4. `notion_update_page` - ページ更新
5. `notion_get_database` - データベース詳細取得
6. `notion_query_database` - データベースクエリ
7. `notion_create_database` - データベース作成
8. `notion_update_database` - データベース更新

**検証結果**: ✅ **8ツール定義済み** → Cursor表示と一致

**注意**: 以前の検証で6ツールと誤認していましたが、実際には8ツールすべて有効です。

---

### 4. grok-x-affiliate MCP Server (11ツール)

**スクリプト**: `scripts/grok-x-affiliate-mcp-server.js`

**定義されているツール**:
1. `extract_affiliates_by_market` - 市場別アフィリエイター候補抽出
2. `extract_affiliates_custom` - カスタムクエリでアフィリエイター候補抽出
3. `list_affiliate_candidates` - アフィリエイター候補一覧取得
4. `get_affiliate_candidate` - アフィリエイター候補詳細取得
5. `update_affiliate_candidate` - アフィリエイター候補情報更新
6. `delete_affiliate_candidate` - アフィリエイター候補削除
7. `affiliate_candidates_summary` - アフィリエイター候補統計情報取得
8. `search_affiliate_candidates` - 高度な検索機能で候補検索
9. `export_affiliate_candidates` - 候補データエクスポート（JSON/CSV）
10. `backup_affiliate_database` - データベースバックアップ作成
11. `restore_affiliate_database` - データベースバックアップ復元

**検証結果**: ✅ **11ツール定義済み** → Cursor表示と一致

---

### 5. grok-x-market-analyzer MCP Server (5ツール)

**スクリプト**: `scripts/grok-x-market-analyzer-mcp-server.js`

**定義されているツール**:
1. `analyze_sentiment_by_market` - 市場別センチメント解析
2. `analyze_sentiment_custom` - カスタムクエリでセンチメント解析
3. `get_sentiment_history` - センチメント解析ログ取得
4. `analyze_tweet_sentiment` - 特定ツイートのセンチメント解析
5. `analyze_persona` - ペルソナ解析（木下OS駆動）

**検証結果**: ✅ **5ツール定義済み** → Cursor表示と一致

---

### 6. telegram-affiliate-dm MCP Server (6ツール)

**スクリプト**: `scripts/telegram-affiliate-dm-mcp-server.js`

**定義されているツール**:
1. `send_dm_to_affiliate_candidate` - アフィリエイター候補にDM送信
2. `send_dm_to_multiple_candidates` - 複数候補に一括DM送信
3. `get_dm_history` - DM送信履歴取得
4. `get_telegram_contact_info` - Telegram連絡先情報取得
5. `generate_bot_link_for_candidate` - 候補用Botリンク生成
6. `prepare_dm_campaign` - DMキャンペーン準備

**検証結果**: ✅ **6ツール定義済み** → Cursor表示と一致

---

## ✅ 検証結論

**すべてのMCPサーバーで、スクリプトに定義されているツール数とCursor表示が完全に一致しています。**

- **総ツール数**: 50ツール
- **不一致**: 0件
- **検証状態**: ✅ **完了**

---

## 📝 以前の誤認について

以前の検証で、Notion MCPサーバーを6ツールと誤認していましたが、実際には**8ツールすべて有効**であることを確認しました。

関連ドキュメントを6ツール→8ツールに修正する必要があります。

---

**最終更新**: 2025-01-27  
**検証状態**: ✅ 完了











