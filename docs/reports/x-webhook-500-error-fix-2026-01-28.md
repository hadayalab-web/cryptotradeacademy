# X Webhook 500エラー修正レポート
**作成日時**: 2026-01-28  
**作成者**: AI Assistant

---

## 🔴 エラー内容

VercelのWebhookリプレイ機能でXのWebhookを実行すると、500エラーが発生：

```
Received invalid status code from URL during CRC: Got a non-200 status code back: 5xx
Server Error code 500
```

---

## 🔍 原因分析

### 問題の原因

`api/x-webhook.js`の`generateCrcResponse`関数で、`X_API_CONSUMER_KEY_SECRET`が設定されていない場合にエラーをスローしていました：

```javascript
// 修正前
function generateCrcResponse(crcToken) {
  if (!X_API_CONSUMER_KEY_SECRET) {
    throw new Error('X_API_CONSUMER_KEY_SECRET is required for CRC verification');
  }
  // ...
}
```

VercelのWebhookリプレイ機能は、過去24時間のWebhookイベントを再配信する際に、CRC Challenge-Response Check（GETリクエスト）を実行します。この時、`X_API_CONSUMER_KEY_SECRET`が設定されていないと、エラーがスローされ、500エラーが返されていました。

---

## ✅ 修正内容

### 修正1: `generateCrcResponse`関数の改善

**修正前**:
```javascript
function generateCrcResponse(crcToken) {
  if (!X_API_CONSUMER_KEY_SECRET) {
    throw new Error('X_API_CONSUMER_KEY_SECRET is required for CRC verification');
  }
  // ...
}
```

**修正後**:
```javascript
function generateCrcResponse(crcToken) {
  if (!X_API_CONSUMER_KEY_SECRET) {
    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
    if (isProduction) {
      console.error('[X Webhook] ❌ CRITICAL: X_API_CONSUMER_KEY_SECRET not set in production');
      return null; // 本番環境ではnullを返してエラーとして処理
    }
    console.warn('[X Webhook] ⚠️ X_API_CONSUMER_KEY_SECRET not set, cannot generate CRC response (development mode)');
    return null; // 開発環境でもnullを返す（エラーハンドリングを統一）
  }
  // ...
}
```

**変更点**:
- エラーをスローせずに`null`を返すように変更
- 本番環境と開発環境で適切なログを出力

---

### 修正2: GETリクエストハンドラーの改善

**修正前**:
```javascript
try {
  const response = generateCrcResponse(crcToken);
  console.log('[X Webhook] ✅ CRC verification successful for token:', crcToken.substring(0, 10) + '...');
  return res.status(200).json(response);
} catch (error) {
  console.error('[X Webhook] ❌ CRC verification failed:', error.message);
  return res.status(500).json({ error: 'CRC verification failed' });
}
```

**修正後**:
```javascript
try {
  const response = generateCrcResponse(crcToken);
  
  if (!response) {
    // X_API_CONSUMER_KEY_SECRETが設定されていない場合
    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
    if (isProduction) {
      console.error('[X Webhook] ❌ CRITICAL: X_API_CONSUMER_KEY_SECRET not set in production, CRC verification failed');
      return res.status(500).json({ error: 'CRC verification failed: X_API_CONSUMER_KEY_SECRET not configured' });
    }
    console.warn('[X Webhook] ⚠️ X_API_CONSUMER_KEY_SECRET not set, returning 500 (development mode)');
    return res.status(500).json({ error: 'CRC verification failed: X_API_CONSUMER_KEY_SECRET not configured' });
  }
  
  console.log('[X Webhook] ✅ CRC verification successful for token:', crcToken.substring(0, 10) + '...');
  return res.status(200).json(response);
} catch (error) {
  console.error('[X Webhook] ❌ CRC verification failed:', error.message);
  console.error('[X Webhook] Stack:', error.stack);
  return res.status(500).json({ error: 'CRC verification failed', details: error.message });
}
```

**変更点**:
- `null`が返された場合の適切なエラーハンドリングを追加
- より詳細なエラーメッセージを返すように改善
- スタックトレースもログに出力

---

## 📋 確認事項

### 1. 環境変数の確認

Vercel Dashboardで以下の環境変数が設定されているか確認してください：

- `X_API_CONSUMER_KEY_SECRET`: X API Consumer Secret（Webhook署名検証用）

**設定方法**:
1. Vercel Dashboard → Project → Settings → Environment Variables
2. `X_API_CONSUMER_KEY_SECRET`を追加
3. 値はX Developer Consoleから取得

---

### 2. 修正後の動作確認

修正後、以下の手順で動作確認してください：

1. **Vercel DashboardでWebhookリプレイを実行**
   - Vercel Dashboard → Project → Webhooks
   - `https://cryptotradeacademy.vercel.app/api/x-webhook`を選択
   - 「Webhookをリプレイ」をクリック

2. **ログを確認**
   - Vercel Dashboard → Project → Logs
   - `[X Webhook]`で始まるログを確認
   - エラーメッセージが改善されているか確認

3. **期待される動作**:
   - `X_API_CONSUMER_KEY_SECRET`が設定されている場合: 200 OKが返される
   - `X_API_CONSUMER_KEY_SECRET`が設定されていない場合: 500エラーが返されるが、より明確なエラーメッセージが表示される

---

## 🔧 推奨される対応

### 即座の対応

1. **環境変数の設定**: `X_API_CONSUMER_KEY_SECRET`をVercel Dashboardで設定
2. **修正のデプロイ**: 修正をコミット・プッシュしてデプロイ
3. **動作確認**: Webhookリプレイを再実行してエラーが解消されたか確認

### 長期的な対応

1. **環境変数の検証**: デプロイ時に環境変数が設定されているか自動検証
2. **エラーハンドリングの改善**: より詳細なエラーメッセージとログ出力
3. **テストの追加**: CRC Challenge-Response Checkのユニットテストを追加

---

## 📝 まとめ

- **問題**: `X_API_CONSUMER_KEY_SECRET`が設定されていない場合にエラーがスローされ、500エラーが発生
- **修正**: エラーをスローせずに`null`を返し、適切なエラーハンドリングを追加
- **効果**: より明確なエラーメッセージが返され、問題の特定が容易になる

---

**作成者**: AI Assistant  
**最終更新**: 2026-01-28
