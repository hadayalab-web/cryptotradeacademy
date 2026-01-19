# Resend API 設定ガイド

このドキュメントは、Resend APIを使用したメール配信機能の設定方法を説明します。

## 📋 目次

- [環境変数の設定](#環境変数の設定)
- [実装ファイル](#実装ファイル)
- [使用方法](#使用方法)
- [テスト方法](#テスト方法)
- [トラブルシューティング](#トラブルシューティング)

---

## 環境変数の設定

### 必須環境変数

```bash
# Resend APIキー（必須）
RESEND_API_KEY=re_xxxxxxxxxxxxx

# CEOメールアドレス（オプション、デフォルト: chibaichi.work@gmail.com）
CEO_EMAIL=chibaichi.work@gmail.com
```

### Resend APIキーの取得方法

1. [Resend Dashboard](https://resend.com/api-keys) にログイン
2. 「API Keys」セクションに移動
3. 「Create API Key」をクリック
4. APIキー名を入力（例: `trap-defense-btc-production`）
5. 必要な権限を選択（通常は `sending_access`）
6. APIキーをコピー（一度しか表示されないため注意）

### Vercel環境変数の設定

1. Vercelダッシュボードにログイン
2. プロジェクトを選択
3. 「Settings」→「Environment Variables」に移動
4. 以下の環境変数を追加：
   - `RESEND_API_KEY`: Resend APIキー
   - `CEO_EMAIL`: CEOのメールアドレス（オプション）

---

## 実装ファイル

### 1. `services/email/resendClient.js`

Resend APIクライアントの基本実装（fetchベース）

**主な機能:**
- `sendResendEmail()` - 単一メール送信
- `sendBatchEmails()` - バッチメール送信（最大50件）

**使用例:**
```javascript
const { sendResendEmail } = require('./services/email/resendClient');

await sendResendEmail({
  to: 'recipient@example.com',
  subject: 'テストメール',
  html: '<h1>Hello World</h1>',
  from: 'onboarding@cryptotradeacademy.io',
  fromName: 'CryptoTrade Academy',
  tags: [
    { name: 'category', value: 'test' }
  ],
  lang: 'ja',
  messageType: 'REGULAR',
});
```

### 2. `services/email/ceo-report.js`

CEO宛てレポート送信機能

**主な機能:**
- `sendCEOReport()` - 汎用CEOレポート送信
- `sendVSLWorkflowReport()` - VSLワークフロー完了報告
- `sendDeploymentReport()` - デプロイメント完了報告

**使用例:**
```javascript
const { sendCEOReport } = require('./services/email/ceo-report');

await sendCEOReport({
  subject: 'リード発見レポート',
  html: '<h1>レポート内容</h1>',
  category: 'LEAD_DISCOVERY',
  metadata: {
    'Total Leads': '100',
    'CVR': '2.5%'
  }
});
```

### 3. `services/lead-discovery/leadDiscoveryReport.js`

リード発見システムのレポート生成機能

**主な機能:**
- `generateLeadDiscoveryReport()` - 実行レポート生成
- `generateDailyReport()` - 日次レポート生成
- `getWhopStats()` - Whop統計取得

**使用例:**
```javascript
const { generateDailyReport } = require('./services/lead-discovery/leadDiscoveryReport');

await generateDailyReport({
  date: '2026-01-18' // オプション、デフォルトは昨日
});
```

---

## 使用方法

### 1. 基本的なメール送信

```javascript
const { sendResendEmail } = require('./services/email/resendClient');

try {
  const result = await sendResendEmail({
    to: 'recipient@example.com',
    subject: 'テストメール',
    html: '<h1>Hello World</h1>',
  });
  
  console.log('メール送信成功:', result.id);
} catch (error) {
  console.error('メール送信失敗:', error.message);
}
```

### 2. CEOレポート送信

```javascript
const { sendCEOReport } = require('./services/email/ceo-report');

await sendCEOReport({
  subject: '日次レポート',
  html: '<h1>本日の成果</h1><p>リード: 100件</p>',
  category: 'DAILY_REPORT',
});
```

### 3. バッチメール送信

```javascript
const { sendBatchEmails } = require('./services/email/resendClient');

const result = await sendBatchEmails({
  recipients: ['user1@example.com', 'user2@example.com', ...],
  subject: '一斉送信メール',
  html: '<h1>お知らせ</h1>',
});

console.log(`送信成功: ${result.totalSent}件`);
console.log(`送信失敗: ${result.totalErrors}件`);
```

---

## テスト方法

### 1. 環境変数の確認

```bash
node -e "console.log('RESEND_API_KEY:', process.env.RESEND_API_KEY ? '✅ 設定済み' : '❌ 未設定')"
```

### 2. テストメール送信

```bash
# CEO宛てテストメール送信
node scripts/test-email-send-ceo.js

# 簡易テストメール送信
node scripts/test-email-simple-ceo.js

# 直接送信テスト
node scripts/test-email-send-ceo-direct.js
```

### 3. リード発見レポートのテスト

```bash
# 日次レポート送信
node scripts/send-lead-discovery-report.js

# 実行レポート送信（統計データ付き）
node scripts/send-lead-discovery-report.js --execution
```

---

## トラブルシューティング

### エラー: `RESEND_API_KEY is not set in environment variables`

**原因:** 環境変数が設定されていない

**解決方法:**
1. `.env`ファイルに`RESEND_API_KEY`を追加
2. Vercelの場合は、ダッシュボードで環境変数を設定
3. ローカル環境の場合は、`.env`ファイルを読み込むことを確認

### エラー: `Resend API error: 401 Unauthorized`

**原因:** APIキーが無効または権限不足

**解決方法:**
1. ResendダッシュボードでAPIキーを確認
2. APIキーに`sending_access`権限があることを確認
3. APIキーが有効期限内であることを確認

### エラー: `Resend API error: 422 Unprocessable Entity`

**原因:** メール送信パラメータが不正

**解決方法:**
1. `to`、`subject`、`html`が正しく設定されているか確認
2. `from`アドレスがResendで検証済みドメインであることを確認
3. HTMLコンテンツが有効なHTML形式であることを確認

### メールが届かない

**確認事項:**
1. Resendダッシュボードの「Emails」セクションで送信履歴を確認
2. スパムフォルダを確認
3. 送信先メールアドレスが正しいか確認
4. ドメイン認証が完了しているか確認（Resendダッシュボード）

---

## 送信元メールアドレス

現在の設定:
- **デフォルト送信元:** `onboarding@cryptotradeacademy.io`
- **送信元表示名:** `CryptoTrade Academy`（デフォルト）または `Trap Defence BTC - COO`（CEOレポート）

### ドメイン認証

Resendで独自ドメインを使用する場合:

1. Resendダッシュボードで「Domains」に移動
2. 「Add Domain」をクリック
3. ドメイン名を入力（例: `cryptotradeacademy.io`）
4. DNSレコードを追加（Resendが提供するレコード）
5. 認証が完了するまで待機（通常数分〜数時間）

---

## 関連ドキュメント

- `services/email/resendClient.js` - Resend APIクライアント実装
- `services/email/ceo-report.js` - CEOレポート送信機能
- `services/lead-discovery/leadDiscoveryReport.js` - リード発見レポート
- [Resend API Documentation](https://resend.com/docs/api-reference/emails/send-email)

---

**最終更新:** 2026-01-18  
**管理:** COO (Cursor/Composer)
