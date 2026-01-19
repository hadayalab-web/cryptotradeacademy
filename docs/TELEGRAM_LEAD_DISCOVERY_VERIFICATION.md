# Telegramリード発見機能の動作検証

**作成日**: 2026-01-18  
**目的**: 実装が机上の空論ではなく、実際に動作することを検証

---

## 🔍 検証方法

### 1. ローカルテスト（リンク抽出）

```bash
npm run test:telegram-leads
```

**テスト内容**:
- `extractTelegramLinks()`関数の動作確認
- 様々なテキストパターンでのTelegramリンク抽出
- 重複チェックの動作確認

### 2. 実際のAPI呼び出しテスト

**テスト内容**:
- Grok APIによるTelegramリード発見
- Grok APIによるTelegramグループ/チャンネル発見
- レスポンス形式の検証
- エラーハンドリングの確認

---

## ✅ 修正した問題点

### 問題1: `@username`パターンがXのハンドルも拾ってしまう

**修正前**:
```javascript
// @username パターンも検索
const usernamePattern = /@([a-zA-Z0-9_]+)/g;
```

**修正後**:
```javascript
// 注意: @username パターンは削除（Xのハンドルと混同するため）
// Telegramのユーザー名は通常 t.me/username の形式で共有される
```

**理由**: Xのハンドル（`@username`）とTelegramのユーザー名を区別できないため、誤検出を防ぐ

### 問題2: エラーハンドリングが不十分

**修正前**:
```javascript
catch (error) {
  console.error('[Telegram Lead Discovery] Failed:', error.message);
  return [];
}
```

**修正後**:
```javascript
// Grokのレスポンス形式を検証
if (!grokResult) {
  console.warn('[Telegram Lead Discovery] Grok returned null or undefined');
  return leads;
}

if (!grokResult.sources || !Array.isArray(grokResult.sources)) {
  console.warn('[Telegram Lead Discovery] Grok sources is not an array:', typeof grokResult.sources);
  return leads;
}

console.log(`[Telegram Lead Discovery] Grok returned ${grokResult.sources.length} sources`);
```

**理由**: エラーの原因を特定しやすくするため

### 問題3: 必須フィールドの検証が不十分

**修正前**:
```javascript
if (source.handle && source.note) {
  // 処理
}
```

**修正後**:
```javascript
// 必須フィールドの検証
if (!source || !source.handle || !source.note) {
  console.warn('[Telegram Lead Discovery] Skipping invalid source:', source);
  continue;
}
```

**理由**: 不正なデータをスキップして、エラーを防ぐため

---

## 🧪 テスト実行結果の確認

### 成功パターン

```
✅ PASS: "Join our Telegram group: t.me/cryptotraders..."
✅ PASS: "Check out t.me/btc_signals for BTC signals"
✅ PASS: "Lost my BTC. Discussed in Telegram group t.me/cryptohelp"

結果: 3件成功, 0件失敗

✅ API呼び出し成功
   発見されたリード数: 5
```

### 失敗パターン

```
❌ FAIL: "No Telegram links here"
   期待値: []
   実際の値: [{ type: 'username', username: 'No', ... }]

❌ エラーが発生しました: XAI_API_KEY is not set
```

---

## 📊 実際の動作確認

### ステップ1: 環境変数の確認

```bash
# .envファイルに以下が設定されているか確認
XAI_API_KEY=xai-...
```

### ステップ2: テスト実行

```bash
npm run test:telegram-leads
```

### ステップ3: 結果の確認

1. **リンク抽出テスト**: すべて成功することを確認
2. **API呼び出しテスト**: Grok APIが正常に呼び出されることを確認
3. **リード発見**: 実際にリードが発見されることを確認（0件でも正常）

---

## ⚠️ 注意事項

### 1. Grok APIのレスポンス形式

Grokの`discoverLeadsOnX`関数は以下の形式を返すことを想定:

```json
{
  "sources": [
    {
      "handle": "@username",
      "note": "Tweet content...",
      "tweetId": "1234567890"
    }
  ],
  "summary": "Summary text"
}
```

### 2. リードが0件の場合

リードが0件でも正常な場合があります:
- Grokが該当する投稿を見つけられなかった
- キーワードがマッチしなかった
- Telegramリンクが含まれていなかった

### 3. コスト

実際のAPI呼び出しテストは以下のコストがかかります:
- **1回のテスト**: 約$0.50-1.00（Grok APIのLive Search料金）

---

## 🔧 トラブルシューティング

### エラー: `XAI_API_KEY is not set`

**解決方法**:
```bash
# .envファイルにXAI_API_KEYを設定
XAI_API_KEY=xai-...
```

### エラー: `Grok sources is not an array`

**原因**: Grok APIのレスポンス形式が期待と異なる

**解決方法**:
1. `services/grok/client.js`の`discoverLeadsOnX`関数を確認
2. Grok APIのレスポンス形式を確認
3. 必要に応じてレスポンス形式を修正

### リードが0件

**確認事項**:
1. Grok APIが正常に呼び出されているか
2. キーワードが適切に設定されているか
3. 言語設定が正しいか

---

## ✅ 検証チェックリスト

- [ ] リンク抽出テストが成功
- [ ] Grok API呼び出しが成功
- [ ] リード発見が動作（0件でも正常）
- [ ] エラーハンドリングが適切
- [ ] ログ出力が適切

---

**COO (Cursor/Composer 1) Telegramリード発見機能の動作検証**: 2026-01-18
