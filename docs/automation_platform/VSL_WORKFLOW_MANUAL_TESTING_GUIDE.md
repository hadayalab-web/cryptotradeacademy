# VSLワークフロー手動テストガイド

**作成日**: 2026-01-15  
**目的**: 段階的に完璧に仕上げるための手動テスト手順

---

## 🎯 テスト方針

**最初は手動でもいいじゃないか** - 段階的に完璧に仕上げていきます。

1. **手動テスト** → 動作確認
2. **問題修正** → 改善
3. **自動化** → Cron設定
4. **本番確認** → 最終チェック

---

## 📋 段階的チェックリスト

### Phase 1: 環境準備 ✅

- [ ] 環境変数設定（`.env`またはVercel Dashboard）
- [ ] 必要なファイルが存在するか確認
- [ ] 全体確認テスト実行

**実行コマンド:**
```bash
cd cryptosignal-ai
npm run test:vsl-workflow
```

---

### Phase 2: Botコマンドテスト ✅

- [ ] `/start minimal`コマンドが動作するか
- [ ] ユーザーが`data/free-users.json`に登録されるか
- [ ] ユーザー名が正しく保存されるか

**実行コマンド:**
```bash
# テストユーザーでBotコマンドをテスト
npm run test:bot-command 123456789 "/start minimal"

# 実際のTelegram Botでテスト（Webhook設定後）
# Telegramで @TrapDefenceBot に /start minimal を送信
```

**確認ポイント:**
- `data/free-users.json`にユーザーが追加されているか
- `joinedAt`が正しく記録されているか
- `userName`が正しく保存されているか

---

### Phase 3: VSL1投稿テスト ✅

- [ ] VSL1投稿メッセージが正しく生成されるか
- [ ] Telegram MINIMALチャンネルに投稿されるか
- [ ] エラーハンドリングが正しく動作するか

**実行コマンド:**
```bash
npm run test:vsl1
```

**確認ポイント:**
- Telegram MINIMALチャンネル（EN）に投稿が表示されるか
- VSL1 YouTubeリンクが正しく含まれているか
- Botコマンド `/start minimal` が正しく記載されているか

---

### Phase 4: VSL2配信テスト ✅

- [ ] 48時間経過ユーザーが正しく取得されるか
- [ ] VSL2メッセージが正しく生成されるか
- [ ] Telegram DMが正しく送信されるか
- [ ] `vsl2Sent`フラグが正しく設定されるか

**準備: テストユーザー追加（48時間経過状態）**
```bash
# テストユーザーを追加（48時間経過状態で）
npm run test:add-free-user 123456789 "TestUser"
```

**実行コマンド:**
```bash
npm run test:vsl2
```

**確認ポイント:**
- 対象ユーザーにVSL2が送信されるか
- VSL2 YouTubeリンクが正しく含まれているか
- プロモーションコードが正しく記載されているか
- Whopリンクが正しく含まれているか
- `vsl2Sent`フラグが`true`に更新されるか

---

### Phase 5: 統合テスト ✅

- [ ] 全体ワークフローが正しく動作するか
- [ ] エラーハンドリングが適切か
- [ ] ログが正しく出力されるか

**実行コマンド:**
```bash
# 全体確認
npm run test:vsl-workflow

# 各機能を順番にテスト
npm run test:bot-command 123456789 "/start minimal"
npm run test:vsl1
npm run test:add-free-user 123456789 "TestUser"
npm run test:vsl2
```

---

### Phase 6: 自動化確認 ✅

- [ ] Vercel Cron設定が正しいか
- [ ] Cron実行時に正しく動作するか
- [ ] 認証（CRON_SECRET）が正しく動作するか

**確認方法:**
1. Vercel DashboardでCron設定を確認
2. 手動でCronエンドポイントを呼び出し
3. Vercel Logsで実行ログを確認

**手動Cron実行（テスト用）:**
```bash
# VSL1投稿
curl -X GET "https://your-domain.vercel.app/api/vsl1-post" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# VSL2配信
curl -X GET "https://your-domain.vercel.app/api/vsl2-free-users" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

---

## 🔧 トラブルシューティング

### 環境変数が未設定

**症状**: テスト実行時に「未設定」エラー

**解決方法:**
1. `.env`ファイルに環境変数を追加
2. またはVercel Dashboardで環境変数を設定

### Botコマンドが動作しない

**症状**: `/start minimal`を送信しても反応がない

**解決方法:**
1. Telegram Bot Webhookが正しく設定されているか確認
2. `api/telegram-webhook.js`が正しくデプロイされているか確認
3. Bot Tokenが正しいか確認

### VSL2が送信されない

**症状**: `test:vsl2`実行時に「配信対象ユーザーがいません」

**解決方法:**
1. テストユーザーを追加: `npm run test:add-free-user <chatId> <userName>`
2. ユーザーの`joinedAt`が48時間以上前か確認
3. ユーザーの`vsl2Sent`が`false`か確認

### Telegram API エラー

**症状**: 「Telegram API Error: 429」など

**解決方法:**
1. レート制限を確認（20メッセージ/分）
2. 送信間隔を調整（`vsl2-free-users.js`の`setTimeout`を確認）
3. Bot Tokenが正しいか確認

---

## 📊 テスト結果記録

### テスト実行日: ___________

#### Phase 1: 環境準備
- [ ] 完了
- [ ] 問題あり（詳細: ________________）

#### Phase 2: Botコマンドテスト
- [ ] 完了
- [ ] 問題あり（詳細: ________________）

#### Phase 3: VSL1投稿テスト
- [ ] 完了
- [ ] 問題あり（詳細: ________________）

#### Phase 4: VSL2配信テスト
- [ ] 完了
- [ ] 問題あり（詳細: ________________）

#### Phase 5: 統合テスト
- [ ] 完了
- [ ] 問題あり（詳細: ________________）

#### Phase 6: 自動化確認
- [ ] 完了
- [ ] 問題あり（詳細: ________________）

---

## ✅ 完了基準

すべてのPhaseが完了し、以下が確認できたら本番環境にデプロイ:

1. ✅ Botコマンドが正しく動作する
2. ✅ VSL1が正しく投稿される
3. ✅ VSL2が正しく配信される
4. ✅ エラーハンドリングが適切
5. ✅ ログが正しく出力される
6. ✅ Cron設定が正しい

---

**作成者**: COO  
**状態**: ✅ **手動テスト準備完了**
