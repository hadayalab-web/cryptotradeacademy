# CEO向け: VSLワークフロー起動準備の設定指示

**作成日**: 2026-01-17  
**状態**: ✅ **起動準備中**

---

## 📋 現在の状況

✅ **基本的な設定は完了しています**
- Telegram Bot Token: ✅ 設定済み
- X API認証情報: ✅ 設定済み
- Grok API Key: ✅ 設定済み
- Whop API Key: ✅ 設定済み

⚠️ **以下の設定を追加/確認してください**

---

## 🔧 必須設定（本番環境で必要）

### 1. X投稿機能を有効化

**現在の状態**: `X_POSTING_ENABLED=false` （X投稿が無効になっています）

**設定方法**:
`.env` ファイルまたはVercel Dashboardの環境変数に以下を追加：

```bash
X_POSTING_ENABLED=true
X_POSTING_DRY_RUN=false  # 本番環境では false に設定
```

**理由**: VSL1のX投稿機能を使用するため、この設定が必要です。

---

### 2. CRON_SECRETの設定（セキュリティ）

**現在の状態**: 未設定

**設定方法**:

1. **ランダム文字列を生成**:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   または
   ```bash
   openssl rand -hex 32
   ```

2. **環境変数に設定**:
   ```bash
   CRON_SECRET=生成されたランダム文字列
   ```

3. **Vercel Dashboardでも設定**:
   - Vercel Dashboard → プロジェクト → Settings → Environment Variables
   - `CRON_SECRET` を追加して同じ値を設定

**理由**: Cronエンドポイントへの不正アクセスを防ぐため、セキュリティ上必須です。

---

## ⚠️ 推奨設定（機能を最大限活用するために）

### 3. Vercel KVの設定（データ永続化）

**現在の状態**: 未設定（ローカルの `free-users.json` が使用されます）

**設定方法**:

1. **Vercel DashboardでKVデータベースを作成**:
   - Vercel Dashboard → プロジェクト → Storage → KV
   - 「Create Database」をクリック
   - データベース名を入力（例: `trap-defence-kv`）
   - リージョンを選択（推奨: `ap-northeast-1` または `us-east-1`）

2. **環境変数を取得**:
   - 作成したKVデータベースのページで以下を確認：
     - `KV_REST_API_URL`
     - `KV_REST_API_TOKEN`

3. **環境変数に設定**:
   ```bash
   KV_REST_API_URL=https://your-kv-instance.upstash.io
   KV_REST_API_TOKEN=your-kv-token
   ```

4. **Vercel Dashboardでも設定**:
   - Vercel Dashboard → プロジェクト → Settings → Environment Variables
   - `KV_REST_API_URL` と `KV_REST_API_TOKEN` を追加

**理由**: 
- 本番環境ではデータの永続化が必要です
- ローカルファイル（`free-users.json`）はVercelのサーバーレス環境では使用できません
- KVを使用することで、複数のデプロイメント間でデータを共有できます

**注意**: KVが設定されていない場合、ユーザーデータが失われる可能性があります。

---

### 4. Whopプロモコード監視の設定

**現在の状態**: `WHOP_PROMO_CODE_ID` が未設定（プロモコード監視機能が無効）

**設定方法**:

1. **Whop Developer PortalでプロモコードIDを取得**:
   - [Whop Developer Portal](https://whop.com/developers) にアクセス
   - API → Promo Codes に移動
   - 監視したいプロモコード（例: `DEFEND50`）のIDを確認

2. **環境変数に設定**:
   ```bash
   WHOP_PROMO_CODE_ID=your-promo-code-id
   WHOP_PROMO_CODE=DEFEND50  # デフォルト値あり（オプション）
   ```

3. **Vercel Dashboardでも設定**:
   - Vercel Dashboard → プロジェクト → Settings → Environment Variables
   - `WHOP_PROMO_CODE_ID` を追加

**理由**: 
- プロモコードの残り枠を監視し、在庫が少なくなったときに自動でリマインドを送信します
- この機能により、コンバージョン率が向上します

**注意**: この設定がなくてもVSLワークフローは動作しますが、プロモコード監視機能は使用できません。

---

### 5. VSL YouTube Linksの明示的な設定（推奨）

**現在の状態**: デフォルト値が使用されています

**設定方法**:

```bash
VSL1_YOUTUBE_LINK=https://youtu.be/OqvqngJOiXc
VSL2_YOUTUBE_LINK=https://youtu.be/fXgVsKhqDjI
```

**理由**: 
- デフォルト値は設定されていますが、明示的に設定することで変更が容易になります
- 将来的にVSL動画を変更する場合に便利です

---

## 📋 設定チェックリスト

以下の順序で設定を進めてください：

### Phase 1: 必須設定（即座に実行）

- [ ] `X_POSTING_ENABLED=true` を設定
- [ ] `X_POSTING_DRY_RUN=false` を設定（本番環境）
- [ ] `CRON_SECRET` を生成して設定

### Phase 2: 推奨設定（本番デプロイ前に実行）

- [ ] Vercel KVデータベースを作成
- [ ] `KV_REST_API_URL` と `KV_REST_API_TOKEN` を設定
- [ ] `WHOP_PROMO_CODE_ID` を設定（プロモコード監視を使用する場合）
- [ ] `VSL1_YOUTUBE_LINK` と `VSL2_YOUTUBE_LINK` を明示的に設定

### Phase 3: 動作確認

- [ ] `node scripts/check-vsl-workflow-setup.js` を実行してすべてのチェックが成功することを確認
- [ ] Vercel Dashboardで環境変数が正しく設定されていることを確認
- [ ] 本番環境にデプロイ
- [ ] Vercel Cronが正常に動作しているか確認

---

## 🧪 動作確認方法

### 1. 環境変数チェック

```bash
node scripts/check-vsl-workflow-setup.js
```

すべてのチェックが ✅ になることを確認してください。

### 2. VSL1投稿テスト（ドライラン）

```bash
# ドライランモードでテスト（実際には投稿されません）
X_POSTING_DRY_RUN=true node -e "require('./api/vsl1-post').default({headers:{authorization:'Bearer ' + (process.env.CRON_SECRET || 'test')}}, {status:()=>({json:(d)=>console.log(JSON.stringify(d, null, 2))})})"
```

### 3. 本番環境でのテスト

Vercel Dashboard → プロジェクト → Functions → `/api/vsl1-post` を手動実行して動作を確認

---

## ⚠️ 重要な注意事項

### 1. 環境変数の設定場所

- **ローカル開発**: `.env` ファイルに設定
- **本番環境**: Vercel Dashboard → プロジェクト → Settings → Environment Variables に設定

**重要**: `.env` ファイルは `.gitignore` に含まれていることを確認してください（機密情報の漏洩を防ぐため）

### 2. CRON_SECRETの管理

- **絶対に公開リポジトリにコミットしないでください**
- Vercel Dashboardの環境変数に設定してください
- 定期的に変更することを推奨します

### 3. KVストレージの重要性

- **本番環境ではKVの使用を強く推奨します**
- KVが設定されていない場合、ユーザーデータが失われる可能性があります
- ローカルファイル（`free-users.json`）はVercelのサーバーレス環境では使用できません

### 4. X投稿機能の有効化

- `X_POSTING_ENABLED=true` に設定しないと、X投稿機能は動作しません
- テスト時は `X_POSTING_DRY_RUN=true` に設定して、実際には投稿されないようにできます

---

## 📞 サポート

設定で問題が発生した場合：

1. `node scripts/check-vsl-workflow-setup.js` を実行してエラーを確認
2. `docs/VSL_WORKFLOW_SETUP_GUIDE.md` を参照
3. Vercel Dashboardのログを確認

---

**作成者**: COO（Cursor/Composer 1）  
**最終更新**: 2026-01-17
