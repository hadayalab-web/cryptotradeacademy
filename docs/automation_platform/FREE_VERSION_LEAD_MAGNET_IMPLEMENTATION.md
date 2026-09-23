# 無料版リードマグネット実装ガイド

## 📋 概要

開発資金確保のため、無料版リードマグネットを最速で実装しました。無料版ユーザーにTrap Score + 簡易分析を提供し、有料版へのアップセルを促進します。

## 🎯 実装内容

### 1. 無料版テンプレートロード修正

- **ファイル**: `cryptosignal-ai/api/cron.js`
- **変更**: `loadUserTemplates`関数を修正し、`minimal-high-quality`版を優先的にロード
- **効果**: より詳細な無料版レポートを提供可能

### 2. 無料版ユーザー管理システム

- **ファイル**: `cryptosignal-ai/services/free-users/manager.js`
- **機能**:
  - TelegramチャットIDリストで無料版ユーザーを管理
  - `data/free-users.json`に保存
  - 追加・削除・確認機能

### 3. 無料版配信ロジック

- **ファイル**: `cryptosignal-ai/api/cron.js` (1480-1515行目)
- **機能**:
  - 定期配信時に無料版レポートも同時配信
  - Trap Score + 簡易分析 + Dr. Grokコメント + Mental Note
  - アップセルCTAを含む

### 4. アップセルCTA最適化

- **ファイル**: `cryptosignal-ai/services/telegram/messages/user/en/minimal-high-quality.en.js`
- **変更**: 緊迫感のあるCTAに変更
- **内容**: Whopリンクプレースホルダーを含む

### 5. Telegram Botコマンド実装

- **ファイル**:
  - `cryptosignal-ai/services/telegram/commands.js`
  - `cryptosignal-ai/api/telegram-webhook.js`
- **コマンド**:
  - `/start` - ウェルカムメッセージ
  - `/free` - 無料版登録
  - `/upgrade` - 有料版アップグレード案内
  - `/help` - ヘルプメッセージ

## ⚙️ 環境変数設定

### 必須環境変数

```bash
# 無料版Telegram Bot設定
TELEGRAM_BOT_TOKEN_MINIMAL=your_bot_token_here
TELEGRAM_CHAT_ID_MINIMAL=your_chat_id_here

# または、統一Bot Tokenを使用する場合
TELEGRAM_BOT_TOKEN=your_unified_bot_token
TELEGRAM_CHAT_ID_MINIMAL=your_free_version_chat_id
```

### 推奨設定

無料版は有料版と同じBot Tokenを使用し、異なるChat IDで管理することを推奨します。

```bash
# 統一Bot Token（推奨）
TELEGRAM_BOT_TOKEN=your_unified_bot_token

# 有料版Chat ID
TELEGRAM_CHAT_ID=your_paid_chat_id

# 無料版Chat ID
TELEGRAM_CHAT_ID_MINIMAL=your_free_chat_id
```

## 🚀 セットアップ手順

### 1. 環境変数の設定

`.env.local`または`.env`に環境変数を追加：

```bash
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID_MINIMAL=your_free_chat_id
```

### 2. Telegram Botの設定

1. [@BotFather](https://t.me/botfather)でBotを作成
2. Webhookを設定（オプション）:
   ```bash
   curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://your-domain.com/api/telegram-webhook"
   ```

### 3. 無料版チャットグループの作成

1. Telegramで新しいグループを作成
2. Botをグループに追加
3. グループのChat IDを取得（`@userinfobot`を使用）
4. `TELEGRAM_CHAT_ID_MINIMAL`に設定

### 4. Whopリンクの設定

`minimal-high-quality.en.js`の`[Whop Link]`プレースホルダーを実際のWhop製品リンクに置き換え：

```javascript
// 218行目付近
🎯 Start Your 1-Day Free Trial
→ Upgrade now: https://whop.com/your-product-link
```

## 📊 配信スケジュール

無料版レポートは有料版と同じスケジュールで配信されます：

- **定期配信**: 設定された時間（通常1日1-2回）
- **緊急配信**: Trap検出時（無料版には送信されません）

## 🎯 アップセル戦略

### 無料版の内容

- Trap Score（0-100）
- Trap Score説明
- BTC価格情報
- What to Avoid（高リスク時のみ）
- Evidence（簡易データ）
- Dr. Grok's Quick Insight
- Mental Note

### 有料版への誘導ポイント

1. **CTAの配置**: メッセージ末尾に配置
2. **価値の明確化**: 無料版で得られるものと有料版で得られるものの差を明確化
3. **緊迫感**: 「資本を守るか失うかの違いは、たった1つのトラップシグナルを見逃すこと」というメッセージ

## 📈 モニタリング

### 無料版ユーザー数の確認

```javascript
const { getFreeUserCount } = require("./services/free-users/manager");
console.log(`Free users: ${getFreeUserCount()}`);
```

### ユーザーリストの確認

`data/free-users.json`を直接確認可能。

## 🔧 トラブルシューティング

### 無料版が配信されない

1. 環境変数が正しく設定されているか確認
2. `ENABLE_MINIMAL_VERSION`が`true`になっているか確認（`cron.js`の1482行目）
3. `formatMinimalBriefing`が正しくロードされているか確認

### Botコマンドが動作しない

1. Webhookが正しく設定されているか確認
2. `/api/telegram-webhook`エンドポイントがアクセス可能か確認
3. Botがグループに追加されているか確認

## 📝 次のステップ

1. **Whopリンクの設定**: 実際の製品リンクに置き換え
2. **A/Bテスト**: CTAの文言を最適化
3. **分析**: 無料版→有料版のコンバージョン率を追跡
4. **拡張**: 他の言語版（JA, ES等）の実装

## 🎉 完了

無料版リードマグネットの実装が完了しました。これで初動の瞬間最大風速を捉える準備が整いました！
