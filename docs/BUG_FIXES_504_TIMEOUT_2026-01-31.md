# 504タイムアウト修正レポート
**作成日時**: 2026-01-31  
**修正者**: Composer (Cursor AI)

---

## 🔴 問題の概要

### エラー内容
- `/api/x-quote-repost-en`: HTTP 504 (タイムアウト)
- `/api/x-quote-repost-ko`: HTTP 504 (タイムアウト)
- `/api/x-quote-repost-ja`: HTTP 504 (タイムアウト)
- `/api/cron`: HTTP 500 (構文エラー)

### 根本原因
1. **構文エラー**: `api/cron.js`の997行目に余分な`}`があり、`SyntaxError: Missing catch or finally after try`が発生
2. **504タイムアウト**: Grok API呼び出しにタイムアウト設定がなく、Vercel Functionsの60秒制限を超過
3. **最適化処理の遅延**: `optimizeContentAndFunnel`関数がGrokとGeminiの両方を呼び出しており、処理時間が長い

---

## ✅ 修正内容

### 1. 構文エラーの修正 (`api/cron.js`)
**問題**: 997行目に余分な`}`が存在
```javascript
// 修正前
    }
    }
    // ===== Phase 1 End =====

// 修正後
    }
    // ===== Phase 1 End =====
```

**修正ファイル**: `api/cron.js` (997行目)

---

### 2. Grok API呼び出しのタイムアウト設定 (`services/grok/client.js`)
**問題**: `generateQuoteRepostText`関数のGrok API呼び出しにタイムアウト設定がない

**修正内容**:
- 30秒のタイムアウト設定を追加（Vercel Functionsの60秒制限の半分）
- `AbortController`と`Promise.race`を使用してタイムアウト処理を実装
- タイムアウト時はフォールバックテンプレートに委譲

**修正コード**:
```javascript
// P0 FIX: タイムアウト設定を追加（30秒以内）- Vercel Functionsの60秒制限を考慮
const GROK_TIMEOUT_MS = 30000; // 30秒（60秒制限の半分）
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), GROK_TIMEOUT_MS);

let completion;
try {
  completion = await Promise.race([
    openai.chat.completions.create({ /* ... */ }),
    new Promise((_, reject) => {
      controller.signal.addEventListener('abort', () => {
        reject(new Error(`Grok API timeout after ${GROK_TIMEOUT_MS}ms`));
      });
    })
  ]);
  clearTimeout(timeoutId);
} catch (error) {
  clearTimeout(timeoutId);
  if (error.message?.includes('timeout')) {
    console.warn(`[Grok] Quote repost text generation timeout after ${GROK_TIMEOUT_MS}ms, using fallback template`);
    throw error; // フォールバック処理に委譲
  }
  throw error;
}
```

**修正ファイル**: `services/grok/client.js` (676行目付近)

---

### 3. 最適化処理のタイムアウト設定 (`api/x-quote-repost.js`)
**問題**: `optimizeContentAndFunnel`関数の呼び出しにタイムアウト設定がない

**修正内容**:
- 15秒のタイムアウト設定を追加
- `Promise.race`を使用してタイムアウト処理を実装
- タイムアウト時は`null`を返して続行（フォールバック）

**修正コード**:
```javascript
// P0 FIX: タイムアウト設定を追加（Vercel Functionsの60秒制限を考慮）
const OPTIMIZATION_TIMEOUT_MS = 15000; // 15秒
optimizationStrategy = await Promise.race([
  optimizeContentAndFunnel({
    currentMetrics,
    marketData,
    xSentiment,
    lang,
  }),
  new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Optimization timeout after ${OPTIMIZATION_TIMEOUT_MS}ms`)), OPTIMIZATION_TIMEOUT_MS);
  })
]).catch((error) => {
  console.warn(`[Quote Repost] ⚠️ Optimization strategy generation failed or timed out for ${lang}:`, error.message);
  return null; // 最適化失敗時はnullを返して続行（フォールバック）
});
```

**修正ファイル**: `api/x-quote-repost.js` (445行目付近)

---

### 4. 早期リターン（タイムアウトチェック）の追加 (`api/x-quote-repost.js`)
**問題**: 残り時間が少ない場合でも処理を続行し、タイムアウトが発生

**修正内容**:
- `deadlineMs`を使用して残り時間をチェック
- 残り時間が10秒未満の場合は処理をスキップ

**修正コード**:
```javascript
// P0 FIX: タイムアウトチェック（残り時間が10秒未満の場合はスキップ）
if (deadlineMs && Date.now() >= deadlineMs - 10000) {
  console.warn(`[Quote Repost] ⏰ Skipping quote repost for @${influencer.username} (insufficient time remaining, deadline: ${new Date(deadlineMs).toISOString()}) [runId: ${langRunId}, step: ${currentStep}]`);
  results.push({
    lang,
    influencer: influencer.username,
    tweetId: influencer.tweetId,
    success: false,
    actuallyPosted: false,
    error: 'Timeout: insufficient time remaining',
    skipped: true,
  });
  continue;
}
```

**修正ファイル**: `api/x-quote-repost.js` (926行目付近)

---

## 📊 修正後の期待動作

### タイムアウト設定の階層
1. **Grok API呼び出し**: 30秒タイムアウト
2. **最適化処理**: 15秒タイムアウト
3. **早期リターン**: 残り時間10秒未満でスキップ
4. **Vercel Functions**: 60秒制限（全体）

### 処理フロー
```
開始 → 最適化処理（15秒以内） → Grok API呼び出し（30秒以内） → 投稿 → 完了
       ↓ タイムアウト              ↓ タイムアウト
       フォールバック（null）      フォールバック（テンプレート）
```

---

## 🧪 テスト方法

### 1. 構文エラーの確認
```bash
node -c api/cron.js
```

### 2. タイムアウト動作の確認
- Vercel Dashboardでログを確認
- タイムアウト時はフォールバックテンプレートが使用されることを確認

### 3. エンドポイントのテスト
```powershell
$VERCEL_URL = "https://cryptotradeacademy.vercel.app"
$CRON_SECRET = "9bbaadd14244949f1647185d88f48fdefff61c3531b3c0f325951edafe69e359"

# EN
curl.exe -X GET "$VERCEL_URL/api/x-quote-repost-en" `
  -H "Authorization: Bearer $CRON_SECRET" `
  -H "Content-Type: application/json"

# KO
curl.exe -X GET "$VERCEL_URL/api/x-quote-repost-ko" `
  -H "Authorization: Bearer $CRON_SECRET" `
  -H "Content-Type: application/json"

# JA
curl.exe -X GET "$VERCEL_URL/api/x-quote-repost-ja" `
  -H "Authorization: Bearer $CRON_SECRET" `
  -H "Content-Type: application/json"

# CRON
curl.exe -X GET "$VERCEL_URL/api/cron?force=true" `
  -H "Authorization: Bearer $CRON_SECRET" `
  -H "Content-Type: application/json"
```

---

## 📝 関連ファイル

- `api/cron.js` - 構文エラー修正
- `services/grok/client.js` - Grok APIタイムアウト設定
- `api/x-quote-repost.js` - 最適化処理タイムアウト設定、早期リターン追加

---

## ✅ 修正完了確認

- [x] 構文エラーの修正
- [x] Grok API呼び出しのタイムアウト設定
- [x] 最適化処理のタイムアウト設定
- [x] 早期リターン（タイムアウトチェック）の追加

---

## 🚀 次のステップ

1. **コミット・プッシュ・デプロイ**
   ```bash
   git add .
   git commit -m "fix: 504タイムアウトと構文エラーを修正

   - api/cron.js: 997行目の余分な`}`を削除
   - services/grok/client.js: Grok API呼び出しに30秒タイムアウト設定を追加
   - api/x-quote-repost.js: 最適化処理に15秒タイムアウト設定を追加、早期リターン（タイムアウトチェック）を追加"
   git push origin main
   ```

2. **デプロイ後のテスト**
   - 上記のテストコマンドを実行
   - Vercel Dashboardでログを確認
   - タイムアウトが発生しないことを確認

3. **モニタリング**
   - エンドポイントの応答時間を監視
   - タイムアウト発生率を追跡
   - 必要に応じてタイムアウト時間を調整
