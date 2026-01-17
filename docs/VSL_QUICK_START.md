# VSLワークフロー クイックスタート
**最終更新**: 2026-01-17 14:07:03  
**作成日時**: 2026-01-17 14:07:03  

**作成日**: 2026-01-17
**目的**: すぐに始められる手動テスト手順

---

## 🚀 5分で始める

### 1. 全体確認（1分）

```bash
cd cryptosignal-ai
npm run test:vsl-workflow
```

**確認**: 環境変数・ファイル・設定が正しいか

---

### 2. Botコマンドテスト（1分）

```bash
# テストユーザーでBotコマンドをテスト
npm run test:bot-command 123456789 "/start minimal"
```

**確認**: ユーザーが登録されるか

---

### 3. VSL1投稿テスト（1分）

```bash
npm run test:vsl1
```

**確認**: Telegram MINIMALチャンネルに投稿されるか

---

### 4. VSL2配信テスト（2分）

```bash
# テストユーザー追加（48時間経過状態）
npm run test:add-free-user 123456789 "TestUser"

# VSL2配信テスト
npm run test:vsl2
```

**確認**: VSL2が送信されるか

---

## 📋 利用可能なコマンド

| コマンド | 説明 |
|---------|------|
| `npm run test:vsl-workflow` | 全体確認テスト |
| `npm run test:vsl1` | VSL1投稿テスト |
| `npm run test:vsl2` | VSL2配信テスト |
| `npm run test:bot-command <chatId> <command>` | Botコマンドテスト |
| `npm run test:add-free-user <chatId> [userName]` | テストユーザー追加 |

---

## 🔧 環境変数設定

`.env`ファイルまたはVercel Dashboardで設定:

```env
VSL1_YOUTUBE_LINK=https://youtu.be/OqvqngJOiXc
VSL2_YOUTUBE_LINK=https://youtu.be/fXgVsKhqDjI
TELEGRAM_BOT_TOKEN_EN=xxx
TELEGRAM_CHAT_ID_MINIMAL_EN=xxx
WHOP_PRODUCT_URL_EN=https://whop.com/aio-media-llc/trap-defense-btc-en/
CRON_SECRET=xxx
```

---

## 📚 詳細ガイド

- **段階的完成ガイド**: `docs/VSL_WORKFLOW_STEP_BY_STEP.md`
- **手動テストガイド**: `docs/VSL_WORKFLOW_MANUAL_TESTING_GUIDE.md`
- **完成状況**: `docs/VSL_WORKFLOW_COMPLETE_STATUS.md`

---

**作成者**: COO  
**状態**: ✅ **準備完了**
