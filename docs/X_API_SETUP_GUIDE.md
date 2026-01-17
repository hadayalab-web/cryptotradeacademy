# X API設定ガイド

**作成日**: 2026-01-16  
**状態**: ✅ **設定手順完了**

---

## 🎯 設定手順

### 1. アプリの権限（必須）

**現在の選択**: 「読む (Read)」が選択されています  
**変更が必要**: ✅ **「読み取りと書き込み (Read and Write)」を選択してください**

**理由**: VSL1のツイート投稿機能を使用するため、書き込み権限が必要です。

**設定方法**:
1. 「読み取りと書き込み (Read and Write)」のオプションをクリック
2. 「投稿とプロフィール情報を読み取りおよび投稿する」が選択されていることを確認

---

### 2. アプリの種類（必須）

**現在の選択**: 「ネイティブアプリ (Native App)」が選択されています  
**変更が必要**: ✅ **「ウェブアプリ、自動化アプリまたはボット (Web App, Automated App, or Bot)」を選択してください**

**理由**: サーバーレス環境（Vercel）で自動投稿を行うため、機密クライアント（Confidential Client）タイプが必要です。

**設定方法**:
1. 「ウェブアプリ、自動化アプリまたはボット (Web App, Automated App, or Bot)」のオプションをクリック
2. 「機密クライアント」が選択されていることを確認

---

### 3. アプリ情報

#### 3.1 コールバックURI / リダイレクトURL（必須）

**設定値**:
```
https://api.vercel.com
```

**理由**: Vercelのサーバーレス関数で使用するため。実際のOAuthフローは使用しませんが、設定が必要です。

**設定方法**:
1. 「コールバックURI / リダイレクトURL」の入力欄に `https://api.vercel.com` を入力
2. 必要に応じて「●さらに追加する」で追加のURLを設定可能

---

#### 3.2 ウェブサイトURL（必須）

**推奨設定値**:
```
https://whop.com/aio-media-llc/trap-defence-btc-en/
```

**または、プロジェクトのメインURLがある場合**:
```
https://your-project-domain.vercel.app
```

**設定方法**:
1. 「ウェブサイトURL」の入力欄に上記のいずれかを入力
2. `https://` で始まるURLであることを確認

---

#### 3.3 組織名（オプション）

**推奨設定値**:
```
AIO Media LLC
```

**または**:
```
CryptoTrade Academy
```

---

#### 3.4 組織のURL（オプション）

**推奨設定値**:
```
https://whop.com/aio-media-llc
```

---

#### 3.5 利用規約（オプション）

**推奨設定値**:
```
https://whop.com/aio-media-llc/trap-defence-btc-en/terms
```

**または、利用規約ページがない場合**:
```
https://whop.com/aio-media-llc/trap-defence-btc-en/
```

---

#### 3.6 プライバシーポリシー（オプション）

**推奨設定値**:
```
https://whop.com/aio-media-llc/trap-defence-btc-en/privacy
```

**または、プライバシーポリシーページがない場合**:
```
https://whop.com/aio-media-llc/trap-defence-btc-en/
```

---

### 4. Request email from users（オプション）

**現在の設定**: OFF（グレー）  
**推奨**: **OFFのまま**（メール取得は不要）

**理由**: 自動投稿ボットなので、ユーザーのメールアドレスは不要です。

---

## ✅ 設定完了後の確認事項

### 1. 設定の保存

1. すべての設定を確認
2. 「変更を保存する」ボタンをクリック
3. 保存が完了するまで待機

---

### 2. OAuth 1.0aキーの取得

設定保存後、以下の手順でOAuth 1.0aのキーを取得してください：

1. 「キーに戻る」をクリック（または「Keys and tokens」タブに移動）
2. 「API Key and Secret」を確認（Consumer Key/Secret）
3. 「Access Token and Secret」を生成（User Context）
4. 生成された4つの値をコピー（**この画面を離れると再表示できません**）

---

### 3. 環境変数の設定

取得したOAuth 1.0aのキーを `.env` ファイルに追加：

```bash
# X API OAuth 1.0a認証情報
X_API_CONSUMER_KEY=your-consumer-key
X_API_CONSUMER_KEY_SECRET=your-consumer-key-secret
X_API_ACCESS_TOKEN=your-access-token
X_API_ACCESS_TOKEN_SECRET=your-access-token-secret
```

**または、Vercel Dashboardで設定**:
1. Vercel Dashboard → プロジェクト → Settings → Environment Variables
2. 上記4つの環境変数を追加
3. 値を入力して保存

---

### 3.1 運用フラグ（任意）

```bash
# X投稿の有効化（未設定時はtrue扱い）
X_POSTING_ENABLED=true

# 投稿のドライラン（テスト時のみ）
X_POSTING_DRY_RUN=false

# Grokセンチメント連動（未設定時はtrue扱い）
X_VSL1_USE_GROK_SENTIMENT=true

# Grokへのセンチメント分析プロンプト（任意）
X_VSL1_SENTIMENT_PROMPT="latest BTC price action, funding, liquidations, whale activity, ETF flows on X"

# Telegram Botのユーザー名（Deep Link生成用）
TELEGRAM_BOT_USERNAME=TrapDefenceBot
```

---

## 🧪 テスト手順

設定完了後、以下のコマンドでテストを実行：

```bash
# 基本テスト（アカウント情報確認 + テストツイート）
npm run test:x-post

# VSL1メッセージもテスト
npm run test:x-post -- --vsl1
```

---

## ⚠️ 注意事項

### 1. 権限の変更

- 「読み取りと書き込み」権限に変更すると、X Developer Portalの審査が必要な場合があります
- 審査が完了するまで数時間〜数日かかる場合があります

### 2. OAuthキーの管理

- OAuthキーは機密情報です。**絶対に公開リポジトリにコミットしないでください**
- `.env` ファイルは `.gitignore` に含まれていることを確認してください

### 3. レート制限

**Freeプラン**:
- 書き込み: 500 posts/month
- VSL1投稿頻度: 1日2回 = 月60回 → 十分対応可能

**Basicプラン** ($200/month):
- 書き込み: 50,000 posts/month
- エンゲージメント分析が可能

---

## 📋 設定チェックリスト

- [ ] 「読み取りと書き込み (Read and Write)」を選択
- [ ] 「ウェブアプリ、自動化アプリまたはボット」を選択
- [ ] コールバックURIを設定（`https://api.vercel.com`）
- [ ] ウェブサイトURLを設定
- [ ] 組織名を設定（オプション）
- [ ] 利用規約URLを設定（オプション）
- [ ] プライバシーポリシーURLを設定（オプション）
- [ ] 「変更を保存する」をクリック
- [ ] OAuth 1.0aのキー（Consumer Key/Secret + Access Token/Secret）を取得
- [ ] `.env` ファイルまたはVercel Dashboardで環境変数を設定
- [ ] `npm run test:x-post` でテスト実行

---

**作成者**: COO（Cursor/Composer 1）  
**状態**: ✅ **設定手順完了**
