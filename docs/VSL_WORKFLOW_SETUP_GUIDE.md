# VSLワークフロー起動準備ガイド

**作成日**: 2026-01-17  
**状態**: ✅ **起動準備中**

---

## 📋 概要

このガイドでは、Trap Defence BTCのVSLワークフローを起動するために必要な設定と確認事項を説明します。

---

## 🔧 必須環境変数

### 1. Telegram Bot設定

```bash
# 必須
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_BOT_USERNAME=TrapDefenceBot  # デフォルト値あり（オプション）

# 言語別Bot Token（オプション）
TELEGRAM_BOT_TOKEN_EN=...
TELEGRAM_BOT_TOKEN_ES=...
TELEGRAM_BOT_TOKEN_PTBR=...
TELEGRAM_BOT_TOKEN_AR=...
TELEGRAM_BOT_TOKEN_KO=...
TELEGRAM_BOT_TOKEN_JA=...
```

**取得方法**:
1. [@BotFather](https://t.me/BotFather) にアクセス
2. `/newbot` コマンドでBotを作成
3. トークンを取得して `.env` に設定

---

### 2. X API設定（OAuth 1.0a User Context）

```bash
# 必須（4つすべて必要）
X_API_CONSUMER_KEY=your-consumer-key
X_API_CONSUMER_KEY_SECRET=your-consumer-secret
X_API_ACCESS_TOKEN=your-access-token
X_API_ACCESS_TOKEN_SECRET=your-access-token-secret

# オプション
X_POSTING_ENABLED=true  # デフォルト: true（falseにするとX投稿を無効化）
X_POSTING_DRY_RUN=false  # デフォルト: false（trueにすると実際には投稿しない）
X_VSL1_USE_GROK_SENTIMENT=true  # デフォルト: true（Grokセンチメント連動を有効化）
```

**取得方法**: `docs/X_API_SETUP_GUIDE.md` を参照

---

### 3. Grok API設定（X AI）

```bash
# 必須
XAI_API_KEY=your-xai-api-key
```

**取得方法**:
1. [X AI Platform](https://x.ai/) にアクセス
2. API Keyを取得して `.env` に設定

---

### 4. Whop API設定

```bash
# 必須
WHOP_API_KEY=your-whop-api-key
WHOP_PROMO_CODE_ID=your-promo-code-id  # プロモコード監視用
WHOP_PROMO_CODE=DEFEND50  # デフォルト値あり（オプション）

# 言語別Whop URL（オプション、デフォルト値あり）
WHOP_PRODUCT_URL_EN=https://whop.com/aio-media-llc/trap-defence-btc-en/
WHOP_PRODUCT_URL_ES=https://whop.com/aio-media-llc/trap-defense-btc-es/
WHOP_PRODUCT_URL_PTBR=https://whop.com/aio-media-llc/trap-defense-btc-ptbr/
WHOP_PRODUCT_URL_AR=https://whop.com/aio-media-llc/tap-defense-btc-ar/
WHOP_PRODUCT_URL_KO=https://whop.com/aio-media-llc/trap-defense-btc-ko/
WHOP_PRODUCT_URL_JA=https://whop.com/aio-media-llc/trap-defence-btc-ja/
```

**取得方法**:
1. [Whop Developer Portal](https://whop.com/developers) にアクセス
2. API Keyを取得
3. プロモコードIDを取得（プロモコード監視機能を使用する場合）

---

### 5. Vercel KV設定

```bash
# 必須（free-users.jsonのKV移行に必要）
KV_REST_API_URL=https://your-kv-instance.upstash.io
KV_REST_API_TOKEN=your-kv-token
```

**取得方法**:
1. [Vercel Dashboard](https://vercel.com/dashboard) → プロジェクト → Storage → KV
2. KVデータベースを作成
3. `KV_REST_API_URL` と `KV_REST_API_TOKEN` を取得

**注意**: KVが設定されていない場合、ローカルの `data/free-users.json` が使用されます（本番環境では推奨されません）

---

### 6. VSL YouTube Links

```bash
# 必須（デフォルト値あり、推奨: 明示的に設定）
VSL1_YOUTUBE_LINK=https://youtu.be/OqvqngJOiXc
VSL2_YOUTUBE_LINK=https://youtu.be/fXgVsKhqDjI
```

**デフォルト値**:
- `VSL1_YOUTUBE_LINK`: `https://youtu.be/OqvqngJOiXc`
- `VSL2_YOUTUBE_LINK`: `https://youtu.be/fXgVsKhqDjI`

---

### 7. Cron Secret（セキュリティ）

```bash
# 必須（本番環境では強く推奨）
CRON_SECRET=your-random-secret-string
```

**生成方法**:
```bash
# Node.jsでランダム文字列を生成
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**注意**: `.env` ファイルに設定し、Vercel Dashboardの環境変数にも設定してください。

---

### 8. 言語設定

```bash
# オプション（デフォルト: en）
LANG=en  # en, es, pt-br, ar, ja, ko のいずれか
```

---

## 🚀 起動準備チェック

### 1. 環境変数チェック

```bash
node scripts/check-vsl-workflow-setup.js
```

このスクリプトは以下を確認します：
- ✅ 必須環境変数の設定状況
- ✅ Vercel KV接続
- ✅ X API接続
- ✅ Grok API設定
- ✅ Whop API設定

---

### 2. Vercel Cron設定確認

`vercel.json` のCron設定を確認：

```json
{
  "crons": [
    { "path": "/api/vsl1-post", "schedule": "0 9,21 * * *" },  // 1日2回（9時、21時 UTC）
    { "path": "/api/vsl2-free-users", "schedule": "0 * * * *" },  // 1時間ごと
    { "path": "/api/vsl1-reminder", "schedule": "0 */12 * * *" },  // 12時間ごと
    { "path": "/api/vsl2-last-call", "schedule": "0 * * * *" },  // 1時間ごと
    { "path": "/api/promo-stock-monitor", "schedule": "*/15 * * * *" }  // 15分ごと
  ]
}
```

---

### 3. 手動テスト

#### VSL1投稿テスト

```bash
# X投稿テスト（ドライラン）
X_POSTING_DRY_RUN=true node -e "require('./api/vsl1-post').default({headers:{authorization:'Bearer ' + process.env.CRON_SECRET}}, {status:()=>({json:(d)=>console.log(JSON.stringify(d, null, 2))})})"

# 実際に投稿（注意: 本番環境で実行）
node -e "require('./api/vsl1-post').default({headers:{authorization:'Bearer ' + process.env.CRON_SECRET}}, {status:()=>({json:(d)=>console.log(JSON.stringify(d, null, 2))})})"
```

#### VSL2配信テスト

```bash
# テストユーザーを追加（free-users.jsonまたはKV）
# 24時間経過したユーザーが存在する場合、VSL2が送信されます
```

---

## 📊 VSLワークフロー概要

### 1. VSL1投稿（1日2回: 9時、21時 UTC）

- **Telegram**: MINIMALチャンネルに投稿
- **X (Twitter)**: Grokセンチメント連動で動的投稿
  - `retailFomo >= 70` → FOMOバリアント
  - `whaleBias <= -50` → Whale Warningバリアント
  - `mentalBlocks.includes('FEAR')` → Fearバリアント
  - その他 → Neutralバリアント

### 2. VSL1リマインダー（12時間ごと）

- 12-24時間経過した無料版ユーザーにリマインドメッセージを送信
- VSL2未送信のユーザーのみ対象

### 3. VSL2配信（1時間ごと）

- 24時間経過した無料版ユーザーにVSL2（アップセル/クーポン）を送信
- プロモコード `DEFEND50` で50%オフを提供

### 4. VSL2ラストコール（1時間ごと）

- 22時間経過した無料版ユーザーに「残り2時間」リマインドを送信
- VSL2未送信のユーザーのみ対象

### 5. プロモコード在庫監視（15分ごと）

- Whop APIでプロモコードの残り枠を監視
- 在庫が閾値を下回った場合、VSL2受信済みユーザーにリマインドを送信

---

## ⚠️ 注意事項

### 1. 本番環境での設定

- **CRON_SECRET** は必ず設定してください（セキュリティ）
- **KV_REST_API_URL** と **KV_REST_API_TOKEN** を設定してください（データ永続化）
- **X_POSTING_DRY_RUN** を `false` に設定してください（実際に投稿する場合）

### 2. レート制限

- **Telegram**: 20メッセージ/秒（コード内で100ms待機を実装済み）
- **X API**: プランによる制限あり（Free: 500 posts/month）
- **Grok API**: レート制限あり（エラー時は自動フォールバック）

### 3. エラーハンドリング

- 各エンドポイントは独立して動作（一方が失敗しても他方は継続）
- Telegram投稿失敗時もX投稿は継続
- Grok分析失敗時はNeutralバリアントで投稿

---

## 📝 チェックリスト

起動前に以下を確認してください：

- [ ] すべての必須環境変数が設定されている
- [ ] `node scripts/check-vsl-workflow-setup.js` が成功する
- [ ] Vercel Dashboardで環境変数が設定されている
- [ ] `vercel.json` のCron設定が正しい
- [ ] Vercel KVが設定されている（本番環境）
- [ ] X APIの権限が「Read and Write」に設定されている
- [ ] `CRON_SECRET` が設定されている（セキュリティ）
- [ ] `X_POSTING_DRY_RUN` が `false` に設定されている（本番環境）

---

## 🐛 トラブルシューティング

### VSL1がXに投稿されない

1. `X_POSTING_ENABLED` が `true` に設定されているか確認
2. `X_POSTING_DRY_RUN` が `false` に設定されているか確認
3. X APIの認証情報が正しいか確認
4. X Developer Portalでアプリの権限が「Read and Write」に設定されているか確認

### VSL2が送信されない

1. `free-users.json` またはKVにユーザーが存在するか確認
2. ユーザーの `joinedAt` が24時間以上前か確認
3. `vsl2Sent` フラグが `false` か確認
4. Telegram Bot Tokenが正しいか確認

### KV接続エラー

1. `KV_REST_API_URL` と `KV_REST_API_TOKEN` が正しいか確認
2. Vercel DashboardでKVデータベースが作成されているか確認
3. KVが設定されていない場合、ローカルの `data/free-users.json` が使用されます

---

**作成者**: COO（Cursor/Composer 1）  
**最終更新**: 2026-01-17
