# システム起動確認チェックリスト

**作成日**: 2026-01-15  
**目的**: Trap Defence BTCの有料版・無料版・VSLワークフローの起動確認

---

## ✅ 1. Trap Defence BTC 有料版

### 実装状況
- ✅ **API**: `api/cron.js` で実装済み
- ✅ **Cronジョブ**: `/api/cron` - `*/15 * * * *`（15分ごと）
- ✅ **定期配信**: 4時間ごと（0, 4, 8, 12, 16, 20時 UTC）
- ✅ **緊急配信**: トラップ検知時（即時配信）

### 必要な環境変数

**必須**:
- `TELEGRAM_BOT_TOKEN` - Telegram Botトークン
- `TELEGRAM_CHAT_ID` または言語別チャンネルID（例: `TELEGRAM_CHAT_ID_REGULAR_EN`）

**推奨**:
- `CRYPTOQUANT_API_KEY` - CryptoQuant APIキー
- `GROK_API_KEY` または `XAI_API_KEY` - Grok APIキー
- `OPENAI_API_KEY` - GPT APIキー
- `GEMINI_API_KEY` - Gemini APIキー
- `CRON_SECRET` - Cron認証用シークレット

### 動作確認方法

```bash
# デバッグモードでテスト
curl "https://cryptotradeacademy.vercel.app/api/cron?debug=local"
```

**期待される動作**:
- 定期配信スロット時: 有料版メッセージをTelegramに送信
- 緊急配信時: トラップアラートをTelegramに送信

---

## ✅ 2. Trap Defence BTC 無料版（Minimal Version）

### 実装状況
- ✅ **API**: `api/cron.js` で実装済み（`ENABLE_MINIMAL_VERSION` フラグで制御）
- ✅ **定期配信**: 有料版と同じタイミング（4時間ごと）
- ✅ **価値投稿**: `api/value-post.js` で実装済み

### 必要な環境変数

**必須**:
- `TELEGRAM_BOT_TOKEN_MINIMAL` または `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID_MINIMAL` または言語別チャンネルID（例: `TELEGRAM_CHAT_ID_MINIMAL_EN`）

**推奨**:
- 有料版と同じ環境変数（CryptoQuant、Grok、GPT、Gemini）

### 動作確認方法

```bash
# デバッグモードでテスト
curl "https://cryptotradeacademy.vercel.app/api/cron?debug=local"
```

**期待される動作**:
- 定期配信スロット時: 無料版メッセージ（Trap Score + 簡易分析）をTelegramに送信
- 言語別チャンネルIDが設定されている場合、該当チャンネルに送信

---

## ✅ 3. VSLワークフロー

### 実装状況

#### 3-1. VSL1投稿（`api/vsl1-post.js`）
- ✅ **Cronジョブ**: `/api/vsl1-post` - `0 9,21 * * *`（1日2回: 9時、21時 UTC）
- ✅ **機能**: 無料版オプトイン誘導メッセージをTelegram MINIMALチャンネルに投稿
- ✅ **環境変数**: `TELEGRAM_CHAT_ID_MINIMAL_EN`, `VSL1_YOUTUBE_LINK`

#### 3-2. VSL2無料ユーザー向け配信（`api/vsl2-free-users.js`）
- ✅ **Cronジョブ**: `/api/vsl2-free-users` - `0 * * * *`（1時間ごと）
- ✅ **機能**: 無料版登録から24時間経過したユーザーにVSL2を送信
- ✅ **環境変数**: `TELEGRAM_BOT_TOKEN_EN` または `TELEGRAM_BOT_TOKEN`, `VSL2_YOUTUBE_LINK`, `WHOP_PRODUCT_URL_EN`

#### 3-3. VSL1リマインダー（`api/vsl1-reminder.js`）
- ✅ **Cronジョブ**: `/api/vsl1-reminder` - `0 */12 * * *`（12時間ごと）
- ✅ **機能**: VSL1を見たが登録していないユーザーにリマインダーを送信
- ✅ **環境変数**: `TELEGRAM_BOT_TOKEN_EN` または `TELEGRAM_BOT_TOKEN`

#### 3-4. VSL2ラストコール（`api/vsl2-last-call.js`）
- ✅ **Cronジョブ**: `/api/vsl2-last-call` - `0 * * * *`（1時間ごと）
- ✅ **機能**: VSL2送信から22時間経過したユーザーにラストコールを送信
- ✅ **環境変数**: `TELEGRAM_BOT_TOKEN_EN` または `TELEGRAM_BOT_TOKEN`, `VSL2_YOUTUBE_LINK`, `WHOP_PRODUCT_URL_EN`

#### 3-5. 価値投稿（`api/value-post.js`）
- ✅ **機能**: 無料版向けの価値投稿（Trap Score紹介）
- ✅ **環境変数**: `TELEGRAM_CHAT_ID_MINIMAL_EN`

### 動作確認方法

```bash
# VSL1投稿のテスト
curl "https://cryptotradeacademy.vercel.app/api/vsl1-post" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# VSL2無料ユーザー向け配信のテスト
curl "https://cryptotradeacademy.vercel.app/api/vsl2-free-users" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

---

## 📋 環境変数チェックリスト

### 必須環境変数（すべての機能で必要）

| 変数名 | 説明 | 用途 |
|--------|------|------|
| `TELEGRAM_BOT_TOKEN` | Telegram Botトークン | 有料版・無料版・VSL配信 |
| `TELEGRAM_CHAT_ID` | 有料版チャンネルID | 有料版配信 |
| `TELEGRAM_CHAT_ID_MINIMAL` | 無料版チャンネルID | 無料版配信 |
| `CRYPTOQUANT_API_KEY` | CryptoQuant APIキー | オンチェーンデータ取得 |
| `CRON_SECRET` | Cron認証用シークレット | Vercel Cron認証 |

### VSLワークフロー専用環境変数

| 変数名 | 説明 | 用途 |
|--------|------|------|
| `VSL1_YOUTUBE_LINK` | VSL1 YouTube URL | VSL1投稿 |
| `VSL2_YOUTUBE_LINK` | VSL2 YouTube URL | VSL2配信 |
| `VSL_YOUTUBE_LINK` | VSL YouTube URL（フォールバック） | VSL2配信（フォールバック） |
| `TELEGRAM_CHAT_ID_MINIMAL_EN` | 無料版ENチャンネルID | VSL1投稿・価値投稿 |
| `TELEGRAM_BOT_TOKEN_EN` | EN用Botトークン（オプション） | VSL2配信（フォールバック: `TELEGRAM_BOT_TOKEN`） |
| `WHOP_PRODUCT_URL_EN` | WhopプロダクトURL（EN） | VSL2配信 |

### オプション環境変数（機能向上用）

| 変数名 | 説明 | 用途 |
|--------|------|------|
| `GROK_API_KEY` または `XAI_API_KEY` | Grok APIキー | Xセンチメント分析 |
| `OPENAI_API_KEY` | GPT APIキー | CryptoQuantデータ解析 |
| `GEMINI_API_KEY` | Gemini APIキー | 画像・動画生成 |
| `TELEGRAM_BOT_TOKEN_MINIMAL` | 無料版専用Botトークン（オプション） | 無料版配信（フォールバック: `TELEGRAM_BOT_TOKEN`） |

---

## 🔍 起動確認手順

### 1. Vercel Dashboardで確認

1. **Cronジョブの確認**
   - Vercel Dashboard → **Settings** → **Cron Jobs**
   - 以下のCronジョブが設定されていることを確認：
     - `/api/cron` - `*/15 * * * *`
     - `/api/vsl1-post` - `0 9,21 * * *`
     - `/api/vsl2-free-users` - `0 * * * *`
     - `/api/vsl1-reminder` - `0 */12 * * *`
     - `/api/vsl2-last-call` - `0 * * * *`

2. **環境変数の確認**
   - Vercel Dashboard → **Settings** → **Environment Variables**
   - 必須環境変数がすべて設定されていることを確認

3. **デプロイの確認**
   - Vercel Dashboard → **Deployments**
   - 最新のデプロイが成功していることを確認

### 2. APIエンドポイントのテスト

```bash
# 有料版・無料版のテスト（デバッグモード）
curl "https://cryptotradeacademy.vercel.app/api/cron?debug=local"

# VSL1投稿のテスト
curl "https://cryptotradeacademy.vercel.app/api/vsl1-post" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# VSL2無料ユーザー向け配信のテスト
curl "https://cryptotradeacademy.vercel.app/api/vsl2-free-users" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### 3. Telegramメッセージの確認

- **有料版**: 定期配信（4時間ごと）が正常に動作することを確認
- **無料版**: 定期配信（4時間ごと）が正常に動作することを確認
- **VSL1**: 1日2回（9時、21時 UTC）に投稿されることを確認
- **VSL2**: 無料版登録から24時間経過したユーザーに送信されることを確認

---

## ⚠️ トラブルシューティング

### 有料版が起動しない

**原因**:
- `TELEGRAM_BOT_TOKEN` または `TELEGRAM_CHAT_ID` が設定されていない
- Cronジョブが設定されていない

**解決方法**:
1. 環境変数を確認・設定
2. Vercel DashboardでCronジョブが設定されているか確認
3. デプロイログでエラーがないか確認

### 無料版が起動しない

**原因**:
- `TELEGRAM_CHAT_ID_MINIMAL` が設定されていない
- `ENABLE_MINIMAL_VERSION` フラグが `false` になっている

**解決方法**:
1. `TELEGRAM_CHAT_ID_MINIMAL` または言語別チャンネルIDを設定
2. `api/cron.js` の `ENABLE_MINIMAL_VERSION` フラグを確認

### VSLワークフローが起動しない

**原因**:
- VSL関連の環境変数が設定されていない
- Cronジョブが設定されていない
- 無料ユーザーデータが存在しない

**解決方法**:
1. VSL関連の環境変数を確認・設定
2. Vercel DashboardでCronジョブが設定されているか確認
3. `services/free-users/manager.js` で無料ユーザーデータが正しく管理されているか確認

---

## ✅ 最終確認チェックリスト

### デプロイ前
- [ ] すべての環境変数が設定されている
- [ ] `vercel.json` のCron設定が正しい
- [ ] デプロイが成功している

### デプロイ後
- [ ] Vercel DashboardでCronジョブが設定されている
- [ ] APIエンドポイントが正常に動作する
- [ ] 有料版メッセージが正常に配信される
- [ ] 無料版メッセージが正常に配信される
- [ ] VSL1投稿が正常に動作する
- [ ] VSL2配信が正常に動作する
- [ ] Telegramメッセージが正常に送信される

---

**作成者**: COO（Cursor/Composer 1）  
**状態**: 📋 **起動確認準備完了**
