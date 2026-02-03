# X Webhook サブスクリプション追加ガイド

**問題**: 引用リポスト200～300件の実績があるのに、Webhook統計（いいね/RT/リプライ）が0件

**原因**: **サブスクリプション未設定** — Webhook URLは登録済み（CRC成功）だが、アカウントをWebhookに**購読**していないため、イベントが届かない。

---

## 解決手順

### 1. X Developer Portal で確認

1. [X Developer Portal](https://developer.x.com/) にログイン
2. プロジェクト → あなたのApp → **Products** で **Account Activity API** が有効か確認
3. **Account Activity API** の開発環境（development / production）名を確認
4. **Webhooks** タブで登録済みWebhookの **Webhook ID** を確認

### 2. サブスクリプションを追加

Account Activity API では、**Webhook登録**と**ユーザー購読**が別ステップです。

| ステップ              | 状態      | 説明                                 |
| --------------------- | --------- | ------------------------------------ |
| 1. Webhook URL登録    | ✅ 完了   | CRC成功＝URLは検証済み               |
| 2. **アカウント購読** | ❌ 未実施 | ここを追加しないとイベントが届かない |

**購読API**（OAuth 1.0a User Context 必須）:

```
POST https://api.twitter.com/1.1/account_activity/all/{env_name}/subscriptions.json
```

または（API v2形式）:

```
POST https://api.twitter.com/2/account_activity/webhooks/{webhook_id}/subscriptions/all
```

**重要**: 使用するAccess Tokenが、引用リポストを投稿しているアカウント（@trapdefence 等）のものであること。

### 3. スクリプトで購読する場合

```bash
# 環境名が "development" の場合（デフォルト）
npm run subscribe:x-webhook

# 環境名を指定する場合
X_ACCOUNT_ACTIVITY_ENV=production npm run subscribe:x-webhook
```

**環境変数**:

- `X_ACCOUNT_ACTIVITY_ENV`: Account Activity API の環境名（デフォルト: `development`）
  - X Developer Portal → Account Activity API → 開発環境の名前と一致させる

### 4. 手動で購読する場合

X Developer Portal の **Account Activity API** → **Webhooks** 画面で:

- 登録済みWebhookの横に **「Subscribe」** または **「Add subscription」** ボタンがある場合、クリックしてアカウントを購読

### 5. 購読確認

購読後に、以下のいずれかでテスト:

1. 自分の投稿に自分で「いいね」する
2. 数分待って `npm run inspect:kv` を実行
3. **Webhook統計（ツイート別）** にキーが増えていれば成功

---

## 参考: イベントが届く条件

- [x] Webhook URLが登録され、CRC検証を通っている
- [x] OAuth 1.0a の Access Token が投稿アカウントのもの
- [ ] **アカウントがWebhookに購読されている** ← これを追加する
- [ ] Account Activity API の利用権限がある（Pro/Enterprise）

---

**作成日**: 2026-02-03
