# 今日の行動予定 - 2026-01-15

**目的**: VSLワークフローの動作確認と本番環境スタート

---

## 🎯 今日の目標

1. ✅ 手動テストで動作確認
2. ✅ 問題があれば修正
3. ✅ 本番環境でスタート

---

## 📋 段階的実行プラン

### Phase 1: ローカル環境での動作確認（30分）

#### Step 1.1: 環境変数確認
```bash
cd cryptosignal-ai
npm run test:vsl-workflow
```

**確認項目:**
- [ ] すべての環境変数が設定されている
- [ ] ファイルがすべて存在する

#### Step 1.2: VSL1投稿テスト（手動）
```bash
npm run test:vsl1
```

**確認項目:**
- [ ] Telegram MINIMALチャンネルに投稿される
- [ ] メッセージ内容が正しい
- [ ] YouTubeリンクが正しい

#### Step 1.3: Botコマンドテスト（手動）
```bash
npm run test:bot-command <your-chat-id> "/start minimal"
```

**確認項目:**
- [ ] Botがメッセージを送信する
- [ ] `data/free-users.json`にユーザーが登録される

#### Step 1.4: VSL2配信テスト（手動）
```bash
# まずテストユーザーを追加（48時間経過状態）
node scripts/test-add-free-user.js <chat-id> "TestUser"

# VSL2配信テスト
npm run test:vsl2
```

**確認項目:**
- [ ] 48時間経過ユーザーにVSL2が送信される
- [ ] `vsl2Sent`フラグが更新される

---

### Phase 2: 問題修正（必要に応じて）

**問題が見つかった場合:**
1. エラーログを確認
2. コードを修正
3. 再度テスト

---

### Phase 3: Git Push & デプロイ（10分）

```bash
git add .
git commit -m "feat: VSL1/VSL2自動投稿・配信ワークフロー実装完了"
git push
```

**確認項目:**
- [ ] Vercelでデプロイが成功している
- [ ] 環境変数が正しく設定されている

---

### Phase 4: 本番環境での動作確認（20分）

#### Step 4.1: Telegram Bot Webhook設定
1. Telegram Bot APIにアクセス
2. Webhook URLを設定: `https://your-domain.vercel.app/api/telegram-webhook`

#### Step 4.2: 本番環境でVSL1投稿テスト
- Vercel Dashboard → Functions → Cron Jobs
- `/api/vsl1-post`を手動実行
- Telegram MINIMALチャンネルを確認

#### Step 4.3: 本番環境でBotコマンドテスト
- 実際のTelegram Botに`/start minimal`を送信
- 動作を確認

---

### Phase 5: 本番環境スタート ✅

**すべてのテストが成功したら:**
- ✅ Cronジョブが自動実行される
- ✅ VSL1が1日2回自動投稿される
- ✅ Botコマンドが自動処理される
- ✅ VSL2が48時間後に自動配信される

---

## ⏱️ 時間見積もり

- Phase 1: 30分
- Phase 2: 必要に応じて（0-30分）
- Phase 3: 10分
- Phase 4: 20分
- Phase 5: 完了

**合計: 約1-1.5時間**

---

## 🎉 完了条件

- [x] すべての手動テストが成功
- [x] 本番環境で動作確認完了
- [x] Cronジョブが設定されている
- [x] Webhookが設定されている

---

**作成者**: COO  
**状態**: ✅ **今日の行動予定作成完了**
