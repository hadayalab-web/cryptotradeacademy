# Vercelデプロイ前チェックリスト

**作成日**: 2026-01-10  
**目的**: デバッグ炎上を防ぐためのデプロイ前確認事項

---

## ✅ 実装済み対策

### 1. エラーハンドリングの強化
- ✅ すべての`JSON.parse`を安全化（`safeJsonParse`使用）
- ✅ JSON抽出を安全化（`extractJsonFromText`使用）
- ✅ エラーメッセージの具体化
- ✅ エラーログの安全化（機密情報マスク）

### 2. 環境変数チェック
- ✅ 必須環境変数の起動時チェック（`requireEnvVars`）
- ✅ 環境変数不足時の明確なエラーメッセージ

### 3. Vercel制限への対応
- ✅ タイムアウト管理ユーティリティ（`withTimeout`）
- ✅ Vercel実行時間制限の取得（`getVercelTimeoutLimit`）
- ✅ メモリ使用量監視（`checkMemoryUsage`）

### 4. ログ出力の安全化
- ✅ 機密情報のマスク（`maskSensitiveInfo`）
- ✅ 安全なログ出力（`safeLog`）
- ✅ APIキー、メールアドレスの自動マスク

### 5. メモリ効率化
- ✅ 配列のチャンク分割（`chunkArray`）
- ✅ 並列処理の制限（`ConcurrencyLimiter`）

---

## 🔍 デプロイ前確認事項

### 環境変数

以下の環境変数がVercelに設定されているか確認：

```env
# 🔴 必須（必ず設定が必要）
XAI_API_KEY=xai_xxx          # Grok API（候補検索・分析に必須）
OPENAI_API_KEY=sk-xxx        # GPT API（深い推論・DM生成に必須）
GEMINI_API_KEY=xxx           # Gemini API（マルチモーダル分析に必須）

# 🟡 条件付き必須（使用する機能に応じて設定）
# Telegram DM送信を使用する場合（sendTelegramDM: true）
TELEGRAM_BOT_TOKEN_EN=xxx    # 英語市場用
TELEGRAM_BOT_TOKEN_AR=xxx    # アラビア語市場用
TELEGRAM_BOT_TOKEN_KO=xxx    # 韓国語市場用
TELEGRAM_BOT_TOKEN_JA=xxx    # 日本語市場用
TELEGRAM_BOT_TOKEN_ES=xxx    # スペイン語市場用
TELEGRAM_BOT_TOKEN_PT_BR=xxx # ポルトガル語市場用

# Email送信を使用する場合（sendEmail: true）
RESEND_API_KEY=re_xxx

# 🟢 オプション（使用する機能に応じて設定）
WHOP_API_KEY=whop_xxx        # Whop連携を使用する場合
NEXT_PUBLIC_APP_URL=https://your-domain.com  # 内部API呼び出しを使用する場合
```

**詳細**: `ENV_VARS_GUIDE.md`を参照してください。

### Vercel設定

1. **関数タイムアウト**
   - Hobby: 10秒（デフォルト）
   - Pro: 60秒（設定可能）
   - 現在の実装: 9秒/55秒（安全マージン）

2. **メモリ制限**
   - Hobby: 1GB
   - Pro: 8GB
   - 監視機能実装済み

3. **実行環境**
   - Node.js 18.x以上推奨
   - TypeScriptビルド設定確認

---

## 🚨 デバッグ炎上を防ぐポイント

### 1. JSON.parseエラー対策
- ✅ すべての`JSON.parse`を`safeJsonParse`に置き換え
- ✅ JSON抽出を`extractJsonFromText`で安全化
- ✅ デフォルト値の設定

### 2. タイムアウト対策
- ✅ 長時間実行される処理にタイムアウト設定
- ✅ Vercel制限を考慮したタイムアウト値

### 3. メモリリーク対策
- ✅ 大きな配列のチャンク分割
- ✅ 並列処理の制限
- ✅ メモリ使用量の監視

### 4. エラーログ対策
- ✅ 機密情報の自動マスク
- ✅ エラーコンテキストの追加
- ✅ デバッグ情報の適切な管理

### 5. 環境変数対策
- ✅ 起動時の必須環境変数チェック
- ✅ 明確なエラーメッセージ

---

## 📊 デプロイ後の監視ポイント

1. **エラーログ**
   - VercelのFunction Logsを確認
   - エラー率の監視

2. **実行時間**
   - タイムアウトエラーの有無
   - 実行時間の傾向

3. **メモリ使用量**
   - メモリ不足エラーの有無
   - メモリ使用量の傾向

4. **API呼び出し**
   - レート制限エラーの有無
   - API呼び出し成功率

---

## 🔧 トラブルシューティング

### タイムアウトエラーが発生する場合

1. 処理を分割して非同期化
2. バッチサイズを小さくする
3. 不要な処理を削除

### メモリ不足エラーが発生する場合

1. 配列のチャンク分割を活用
2. 並列処理数を制限
3. キャッシュサイズを調整

### JSON.parseエラーが発生する場合

1. `safeJsonParse`が使用されているか確認
2. デフォルト値が適切か確認
3. AI応答の形式を確認

---

## ✅ デプロイ準備完了

すべての対策が実装済みです。Vercelにデプロイ可能です。

**最終確認日**: ${new Date().toISOString()}
