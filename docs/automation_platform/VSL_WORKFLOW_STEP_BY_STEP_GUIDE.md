# VSLワークフロー - 段階的完成ガイド

**作成日**: 2026-01-15  
**目的**: 最後のワンピースを完璧に仕上げるための段階的ガイド

---

## 🎯 このワークフローの重要性

このVSLワークフローは、**Trap Defence BTCの成長を加速させる最後のワンピース**です。

**期待される成果:**
- ✅ 自動化されたリード獲得（VSL1投稿）
- ✅ 無料版ユーザーの自動登録（`/start minimal`）
- ✅ 48時間後の自動アップセル（VSL2配信）
- ✅ Whopへの自動コンバージョン誘導
- ✅ 完全自動化されたマーケティングファネル

---

## 📋 段階的チェックリスト

### Phase 1: 環境準備 ✅

#### Step 1.1: 環境変数確認
```bash
cd cryptosignal-ai
npm run test:vsl-workflow
```

**確認項目:**
- [ ] VSL1_YOUTUBE_LINK が設定されている
- [ ] VSL2_YOUTUBE_LINK が設定されている
- [ ] TELEGRAM_BOT_TOKEN_EN が設定されている
- [ ] TELEGRAM_CHAT_ID_MINIMAL_EN が設定されている
- [ ] WHOP_PRODUCT_URL_EN が設定されている

**未設定の場合:**
1. Vercel Dashboardにアクセス
2. Settings → Environment Variables
3. 上記の環境変数を追加

---

### Phase 2: コード確認 ✅

#### Step 2.1: ファイル存在確認
```bash
npm run test:vsl-workflow
```

**確認項目:**
- [x] `api/vsl1-post.js` 存在
- [x] `api/vsl2-free-users.js` 存在
- [x] `api/telegram-webhook.js` 存在
- [x] `services/telegram/bot-commands.js` 存在
- [x] `services/free-users/manager.js` 存在
- [x] `vercel.json` 存在

---

### Phase 3: 手動テスト（最初は手動でOK） ✅

#### Step 3.1: VSL1投稿テスト
```bash
npm run test:vsl1
```

**確認項目:**
- [ ] Telegram MINIMALチャンネル（EN）にVSL1が投稿される
- [ ] メッセージに正しいYouTubeリンクが含まれている
- [ ] Botコマンド（`/start minimal`）が正しく表示されている

**成功の目安:**
```
✅ VSL1 posted to Telegram MINIMAL/EN
```

---

#### Step 3.2: Botコマンドテスト
```bash
npm run test:bot-command <your-chat-id> "/start minimal"
```

**確認項目:**
- [ ] Botがメッセージを送信する
- [ ] ユーザーが`data/free-users.json`に登録される
- [ ] `joinedAt`が正しく記録される

**成功の目安:**
```json
{
  "success": true,
  "isNewUser": true,
  "chatId": "123456789"
}
```

---

#### Step 3.3: テストユーザー追加（48時間経過状態）
```bash
node scripts/test-add-free-user.js <chat-id> "TestUser"
```

**確認項目:**
- [ ] ユーザーが追加される
- [ ] `joinedAt`が48時間前に設定される
- [ ] `vsl2Sent`が`false`に設定される

---

#### Step 3.4: VSL2配信テスト
```bash
npm run test:vsl2
```

**確認項目:**
- [ ] 48時間経過ユーザーが正しく取得される
- [ ] VSL2が正しく送信される
- [ ] `vsl2Sent`フラグが`true`に更新される

**成功の目安:**
```json
{
  "success": true,
  "sent": 1,
  "failed": 0,
  "total": 1
}
```

---

### Phase 4: デプロイ準備 ✅

#### Step 4.1: Git Push
```bash
git add .
git commit -m "feat: VSL1/VSL2自動投稿・配信ワークフロー実装完了"
git push
```

**確認項目:**
- [ ] すべてのファイルがコミットされている
- [ ] GitHubにプッシュされている

---

#### Step 4.2: Vercelデプロイ確認
1. Vercel Dashboardにアクセス
2. Deploymentsタブを確認
3. 最新のデプロイが成功していることを確認

**確認項目:**
- [ ] デプロイが成功している
- [ ] 環境変数が正しく設定されている

---

### Phase 5: Telegram Bot Webhook設定 ✅

#### Step 5.1: Webhook URL設定
1. Telegram Bot APIにアクセス: `https://api.telegram.org/bot<BOT_TOKEN>/setWebhook`
2. Webhook URLを設定: `https://your-domain.vercel.app/api/telegram-webhook`

**確認項目:**
- [ ] Webhookが正しく設定されている
- [ ] Botがメッセージを受信できる

---

### Phase 6: 本番環境動作確認 ✅

#### Step 6.1: VSL1投稿確認（Cron実行）
1. Vercel Dashboard → Functions → Cron Jobs
2. `/api/vsl1-post`の実行履歴を確認
3. Telegram MINIMALチャンネルを確認

**確認項目:**
- [ ] Cronが正しく実行されている
- [ ] VSL1が投稿されている

---

#### Step 6.2: Botコマンド確認（実際のユーザー）
1. Telegram Botに`/start minimal`を送信
2. `data/free-users.json`を確認

**確認項目:**
- [ ] ユーザーが登録されている
- [ ] `joinedAt`が正しく記録されている

---

#### Step 6.3: VSL2配信確認（48時間後）
1. 48時間経過を待つ（またはテストユーザーで確認）
2. Vercel Dashboard → Functions → Cron Jobs
3. `/api/vsl2-free-users`の実行履歴を確認

**確認項目:**
- [ ] 48時間経過ユーザーにVSL2が送信されている
- [ ] `vsl2Sent`フラグが更新されている

---

## 🎉 完成確認

すべてのPhaseが完了したら、以下を確認:

```bash
npm run test:vsl-workflow
```

**すべてのチェックが✅になったら、ワークフローは完成です！**

---

## 📊 期待される成果

### 短期（1週間）
- ✅ VSL1投稿が自動化される（1日2回）
- ✅ 無料版ユーザーが自動登録される
- ✅ VSL2配信が自動化される（48時間後）

### 中期（1ヶ月）
- ✅ リード獲得数の増加
- ✅ 無料版ユーザー数の増加
- ✅ 有料版コンバージョン数の増加

### 長期（3ヶ月）
- ✅ 完全自動化されたマーケティングファネル
- ✅ スケーラブルな成長基盤の確立
- ✅ 大きな成果の実現

---

## 🚀 次のステップ

1. **今日**: 環境変数設定 + 手動テスト
2. **明日**: Git Push + デプロイ + Webhook設定
3. **明後日**: 本番環境動作確認
4. **1週間後**: データ分析 + 最適化

---

## 💡 トラブルシューティング

### VSL1が投稿されない
- 環境変数`TELEGRAM_CHAT_ID_MINIMAL_EN`を確認
- Vercel DashboardでCron実行履歴を確認

### Botコマンドが動作しない
- Webhook URLを確認
- `TELEGRAM_BOT_TOKEN_EN`を確認

### VSL2が送信されない
- `data/free-users.json`にユーザーが登録されているか確認
- `joinedAt`が48時間以上前か確認
- `vsl2Sent`が`false`か確認

---

**このワークフローが、我々に大きな成果をもたらしてくれます！** 🎯

---

**作成者**: COO  
**状態**: ✅ **段階的完成ガイド作成完了**
