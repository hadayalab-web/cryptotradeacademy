# VSLワークフロー実行フェーズ - アクションプラン

**作成日**: 2026-01-15  
**状態**: 🚀 **実行フェーズ開始**

---

## 🎯 実行フェーズの目標

1. ✅ ローカル環境で手動テストを実行
2. ✅ 各機能が正常に動作することを確認
3. ✅ 環境変数の確認
4. ✅ Git Push & デプロイ準備

---

## 📋 実行順序

### Step 1: 環境変数の確認（ローカル）

まず、`.env`ファイルに必要な環境変数が設定されているか確認：

```bash
cd cryptosignal-ai
# .envファイルを確認（存在しない場合は作成）
```

**必要な環境変数**:
- `VSL1_YOUTUBE_LINK` = `https://youtu.be/zdLFYwFJQd4`
- `VSL2_YOUTUBE_LINK` = `https://youtu.be/vjz896hTPPw`
- `VSL_YOUTUBE_LINK` = `https://youtu.be/vjz896hTPPw`
- `TELEGRAM_BOT_TOKEN_EN` = （EN版Botトークン）
- `TELEGRAM_BOT_TOKEN` = （フォールバック用）
- `TELEGRAM_CHAT_ID_MINIMAL_EN` = （MINIMALチャンネルID）
- `WHOP_PRODUCT_URL_EN` = `https://whop.com/aio-media-llc/trap-defense-btc-en/`
- `CRON_SECRET` = （任意、ローカルテストでは不要）

---

### Step 2: 個別機能の手動テスト

#### 2.1 VSL1投稿テスト

```bash
npm run test:vsl1
```

**確認事項**:
- ✅ VSL1メッセージが生成される
- ✅ Deep Linkが含まれている
- ✅ Telegramに投稿される（実際に送信する場合は環境変数が必要）

#### 2.2 Botコマンドテスト

```bash
npm run test:bot-command
```

**確認事項**:
- ✅ `/start minimal`コマンドが正しく処理される
- ✅ ユーザーが登録される
- ✅ ウェルカムメッセージが送信される

#### 2.3 VSL1リマインドテスト

```bash
npm run test:vsl1-reminder
```

**確認事項**:
- ✅ 12-24時間前に登録したユーザーが取得される
- ✅ リマインドメッセージが生成される

#### 2.4 VSL2 Last Callテスト

```bash
npm run test:vsl2-last-call
```

**確認事項**:
- ✅ 22-24時間前に登録したユーザーが取得される
- ✅ Last Callメッセージが生成される
- ✅ インラインボタンが含まれている

#### 2.5 VSL2配信テスト

```bash
npm run test:vsl2
```

**確認事項**:
- ✅ 24時間前に登録したユーザーが取得される
- ✅ VSL2メッセージが生成される
- ✅ インラインボタンが含まれている

---

### Step 3: 全体ワークフローテスト

```bash
npm run test:vsl-workflow
```

**確認事項**:
- ✅ すべてのステップが正常に実行される
- ✅ エラーが発生しない

---

### Step 4: テストユーザーの追加（必要に応じて）

VSL2 Last CallやVSL2配信をテストするには、22時間以上前に登録したテストユーザーが必要です。

```bash
npm run test:add-free-user
```

**注意**: テストユーザーを追加する際は、`joinedAt`を過去の日時に設定する必要があります。

---

### Step 5: Git Push & デプロイ準備

テストが成功したら、変更をコミットしてプッシュ：

```bash
git add .
git commit -m "feat: VSLワークフロー実装完了（Deep Link, Last Call, Inline Buttons）"
git push
```

---

## ⚠️ 注意事項

### 1. 環境変数の設定

**ローカルテスト**:
- `.env`ファイルに環境変数を設定
- `TELEGRAM_BOT_TOKEN_EN`が設定されていない場合、実際のTelegram送信はスキップされます

**本番環境（Vercel）**:
- Vercel Dashboardで環境変数を設定する必要があります
- 設定方法: Project Settings → Environment Variables

### 2. テストユーザーの準備

VSL2 Last CallやVSL2配信をテストするには、過去の日時に登録したテストユーザーが必要です。

**テストユーザー追加方法**:
1. `scripts/test-add-free-user.js`を実行
2. または、`data/free-users.json`を直接編集

### 3. Telegram APIのレート制限

大量のユーザーに送信する場合は、レート制限（20メッセージ/秒）に注意してください。
現在の実装では100ms待機が実装されています。

---

## 🎯 実行フェーズの完了条件

- [x] すべての実装が完了している
- [ ] ローカルテストが成功している
- [ ] 環境変数が設定されている（ローカル）
- [ ] Git Push準備が完了している
- [ ] デプロイ準備が完了している

---

**作成者**: COO（Cursor/Composer 1）  
**状態**: 🚀 **実行フェーズ進行中**
