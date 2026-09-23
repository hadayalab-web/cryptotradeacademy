# VSLワークフロー段階的完成ガイド

**作成日**: 2026-01-15  
**方針**: 抜け漏れを防ぎながら、ひとつづつ進めて完璧に仕上げる

---

## 🎯 段階的アプローチ

### Step 1: 現状確認 ✅

**目的**: 何が実装済みで、何が不足しているか確認

**実行:**
```bash
cd cryptosignal-ai
npm run test:vsl-workflow
```

**確認項目:**
- [ ] 環境変数設定状況
- [ ] ファイル存在確認
- [ ] ユーザー管理システム確認
- [ ] Cron設定確認

---

### Step 2: Botコマンド手動テスト ✅

**目的**: `/start minimal`コマンドが正しく動作するか確認

**実行:**
```bash
# テストユーザーでBotコマンドをテスト
npm run test:bot-command 123456789 "/start minimal"
```

**確認項目:**
- [ ] ユーザーが`data/free-users.json`に登録される
- [ ] `joinedAt`が正しく記録される
- [ ] `userName`が正しく保存される

**問題があれば修正 → Step 2に戻る**

---

### Step 3: VSL1投稿手動テスト ✅

**目的**: VSL1が正しく投稿されるか確認

**実行:**
```bash
npm run test:vsl1
```

**確認項目:**
- [ ] Telegram MINIMALチャンネルに投稿される
- [ ] VSL1 YouTubeリンクが正しい
- [ ] Botコマンドが正しく記載されている

**問題があれば修正 → Step 3に戻る**

---

### Step 4: VSL2配信手動テスト ✅

**目的**: VSL2が正しく配信されるか確認

**準備:**
```bash
# テストユーザーを追加（48時間経過状態で）
npm run test:add-free-user 123456789 "TestUser"
```

**実行:**
```bash
npm run test:vsl2
```

**確認項目:**
- [ ] 対象ユーザーにVSL2が送信される
- [ ] VSL2 YouTubeリンクが正しい
- [ ] プロモーションコードが正しい
- [ ] Whopリンクが正しい
- [ ] `vsl2Sent`フラグが更新される

**問題があれば修正 → Step 4に戻る**

---

### Step 5: 統合テスト ✅

**目的**: 全体ワークフローが正しく動作するか確認

**実行:**
```bash
# 全体確認
npm run test:vsl-workflow

# 各機能を順番にテスト
npm run test:bot-command 123456789 "/start minimal"
npm run test:vsl1
npm run test:add-free-user 123456789 "TestUser"
npm run test:vsl2
```

**確認項目:**
- [ ] すべての機能が正しく動作する
- [ ] エラーハンドリングが適切
- [ ] ログが正しく出力される

**問題があれば修正 → 該当Stepに戻る**

---

### Step 6: 環境変数設定 ✅

**目的**: 本番環境用の環境変数を設定

**Vercel Dashboardで設定:**
```env
VSL1_YOUTUBE_LINK=https://youtu.be/zdLFYwFJQd4
VSL2_YOUTUBE_LINK=https://youtu.be/vjz896hTPPw
VSL_YOUTUBE_LINK=https://youtu.be/vjz896hTPPw
TELEGRAM_BOT_TOKEN_EN=xxx
TELEGRAM_BOT_TOKEN=xxx
TELEGRAM_CHAT_ID_MINIMAL_EN=xxx
WHOP_PRODUCT_URL_EN=https://whop.com/aio-media-llc/trap-defense-btc-en/
CRON_SECRET=xxx
```

**確認項目:**
- [ ] すべての環境変数が設定されている
- [ ] 値が正しい

---

### Step 7: Git Push & デプロイ ✅

**目的**: コードをデプロイ

**実行:**
```bash
git add .
git commit -m "feat: VSL1/VSL2自動投稿・配信ワークフロー実装完了"
git push
```

**確認項目:**
- [ ] Vercelでデプロイが成功する
- [ ] エラーがない

---

### Step 8: Telegram Bot Webhook設定 ✅

**目的**: Botコマンドを受け取れるようにする

**実行:**
1. Telegram Bot APIにアクセス
2. Webhook URLを設定: `https://your-domain.vercel.app/api/telegram-webhook`
3. Bot Tokenを確認

**確認項目:**
- [ ] Webhookが正しく設定されている
- [ ] Botコマンドが動作する

---

### Step 9: 本番環境動作確認 ✅

**目的**: 本番環境で正しく動作するか確認

**確認項目:**
- [ ] Botコマンドが動作する
- [ ] VSL1が正しく投稿される（Cron実行時）
- [ ] VSL2が正しく配信される（Cron実行時）
- [ ] エラーログがない

**問題があれば修正 → 該当Stepに戻る**

---

### Step 10: 完了 ✅

**目的**: すべてが完璧に動作することを確認

**最終確認:**
- [ ] すべてのStepが完了
- [ ] すべてのテストが成功
- [ ] 本番環境で正しく動作
- [ ] エラーがない

**🎉 完了！**

---

## 📝 チェックリスト

### コード実装
- [x] Bot参加時のユーザー登録
- [x] VSL1自動投稿
- [x] VSL2無料版ユーザー配信
- [x] 無料版ユーザー管理システム
- [x] Telegram Webhook

### テストスクリプト
- [x] VSL1投稿テスト
- [x] VSL2配信テスト
- [x] Botコマンドテスト
- [x] ユーザー追加テスト
- [x] 全体確認テスト

### 環境設定
- [ ] 環境変数設定
- [ ] Telegram Bot Webhook設定
- [ ] Git Push & デプロイ

### 動作確認
- [ ] Botコマンド動作確認
- [ ] VSL1投稿動作確認
- [ ] VSL2配信動作確認
- [ ] Cron動作確認

---

## 🚀 次のステップ

1. **Step 1を実行**: `npm run test:vsl-workflow`
2. **問題があれば修正**
3. **次のStepに進む**
4. **繰り返し**

**段階的に完璧に仕上げていきましょう！**

---

**作成者**: COO  
**状態**: ✅ **段階的完成ガイド準備完了**
