# 検証チェックリスト - 2026-01-25

## 修正内容の検証

### 1. 環境変数の確認（必須）

以下の環境変数がVercel Dashboardで正しく設定されていることを確認：

- [ ] `X_API_CONSUMER_KEY` - 設定されている
- [ ] `X_API_CONSUMER_KEY_SECRET` - 設定されている
- [ ] `X_API_ACCESS_TOKEN` - 設定されている
- [ ] `X_API_ACCESS_TOKEN_SECRET` - 設定されている
- [ ] `X_POSTING_ENABLED` - `true`に設定されている（または未設定でデフォルト`true`）
- [ ] `X_POSTING_DRY_RUN` - `false`に設定されている（または未設定でデフォルト`false`）
- [ ] `XAI_API_KEY` - Grok API用に設定されている

### 2. コード修正の確認

以下の修正が適用されていることを確認：

- [ ] `services/x/optimization.js`の`shouldPostQuoteRepost`関数が修正されている
  - `createdAt`が存在しない場合、または現在時刻に近すぎる場合（5分以内）は、タイミングチェックをスキップ
  - ピーク時間（UTC 0,1,20,21）であれば投稿を許可

- [ ] `api/x-quote-repost.js`の投稿時刻取得ロジックが修正されている
  - `influencer.createdAt || new Date(Date.now() - 15 * 60 * 1000).toISOString()`を使用

- [ ] `api/x-quote-repost.js`のインプレッション規模チェックが緩和されている
  - 目標の30%以上、または最低10,000インプレッション

- [ ] `api/x-quote-repost.js`に実際の投稿を確認するログが追加されている
  - `✅✅✅ SUCCESSFULLY POSTED`ログ
  - `❌❌❌ FAILED TO POST`ログ
  - `actuallyPosted`フラグ

### 3. デプロイ後の検証

デプロイ後、以下の手順で検証：

#### ステップ1: ログで実際の投稿を確認

Vercelログで以下のキーワードを検索：

1. **成功ログ**:
   ```
   ✅✅✅ SUCCESSFULLY POSTED
   ```
   または
   ```
   ✅✅✅ CONFIRMED: Quote repost ACTUALLY POSTED
   ```

2. **失敗ログ**:
   ```
   ❌❌❌ FAILED TO POST
   ```

3. **dry-runモードの確認**:
   ```
   DRY RUN MODE
   ```
   このログが表示される場合、`X_POSTING_DRY_RUN`が`true`に設定されている可能性があります。

#### ステップ2: X（Twitter）で実際の投稿を確認

1. X（Twitter）アカウントにログイン
2. プロフィールページで最新のツイートを確認
3. 引用リポスト（Quote Tweet）が実際に投稿されていることを確認
4. 投稿時刻がピーク時間（UTC 0,1,20,21）と一致していることを確認

#### ステップ3: エンドポイントの手動実行テスト

以下のエンドポイントを手動実行して、実際に投稿されることを確認：

```bash
# UTC 0:00または1:00、20:00、21:00に実行
curl -X POST https://your-domain.vercel.app/api/x-quote-repost \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"
```

レスポンスで以下を確認：
- `success: true`
- `actuallyPosted: true`が結果に含まれている
- `quoteTweetId`が含まれている（実際のツイートID）

### 4. 継続的な監視

デプロイ後24時間以内に：

- [ ] UTC 0:00の実行ログを確認
- [ ] UTC 1:00の実行ログを確認
- [ ] UTC 20:00の実行ログを確認
- [ ] UTC 21:00の実行ログを確認
- [ ] 各実行で実際に投稿されていることを確認（`✅✅✅ SUCCESSFULLY POSTED`ログ）

### 5. 問題が発生した場合の対処

#### 問題: dry-runモードが有効になっている

**症状**: `DRY RUN MODE`ログが表示される

**対処**:
1. Vercel Dashboardで`X_POSTING_DRY_RUN`環境変数を確認
2. `false`に設定するか、削除する（デフォルトは`false`）

#### 問題: タイミングチェックでスキップされる

**症状**: `not optimal timing`ログが表示される

**対処**:
1. 実行時刻がピーク時間（UTC 0,1,20,21）であることを確認
2. `shouldPostQuoteRepost`関数のロジックを確認
3. `createdAt`が正しく取得されているか確認

#### 問題: インプレッション規模チェックでスキップされる

**症状**: `low impressions`ログが表示される

**対処**:
1. Grok APIから返される`recentImpressions`を確認
2. 目標の30%以上、または最低10,000インプレッションであることを確認
3. 必要に応じて、インプレッション規模チェックをさらに緩和

#### 問題: X API認証エラー

**症状**: `X API credentials missing`または`X API Error: 401`

**対処**:
1. Vercel DashboardでX API認証情報を確認
2. 認証情報が正しく設定されていることを確認
3. X APIのアクセストークンが有効であることを確認

---

**作成日時**: 2026-01-25  
**緊急度**: 🔴 最高（機会損失を防ぐため即座に検証が必要）
