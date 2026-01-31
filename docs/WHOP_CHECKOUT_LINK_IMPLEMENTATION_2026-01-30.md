# Whopチェックアウトリンク実装完了
**作成日**: 2026-01-30  
**目的**: WhopページのCTAボタン表示バグを回避するため、チェックアウトリンクを実装

---

## ✅ 実装完了内容

### 1. `services/telegram/whop-links.js`に無料版用チェックアウトリンク取得関数を追加

**追加関数**: `getMinimalVersionCheckoutUrl(lang, options)`

**機能**:
- 言語別のチェックアウトリンクを取得
- UTMパラメータを自動的に追加
- チェックアウトリンクが設定されていない場合は`null`を返し、Telegram Deep Linkをフォールバックとして使用

**環境変数**:
- `WHOP_MINIMAL_CHECKOUT_URL_EN`（英語用）
- `WHOP_MINIMAL_CHECKOUT_URL_ES`（スペイン語用）
- `WHOP_MINIMAL_CHECKOUT_URL_PTBR`（ポルトガル語用）
- `WHOP_MINIMAL_CHECKOUT_URL_AR`（アラビア語用）
- `WHOP_MINIMAL_CHECKOUT_URL_KO`（韓国語用）
- `WHOP_MINIMAL_CHECKOUT_URL_JA`（日本語用）

---

### 2. `api/x-quote-repost.js`でチェックアウトリンクを使用

**変更内容**:
- チェックアウトリンクを優先的に取得
- チェックアウトリンクが設定されていない場合は、Telegram Deep Linkをフォールバックとして使用
- `generateQuoteRepostText`に`minimalCheckoutUrl`パラメータを追加

---

### 3. `services/grok/client.js`でチェックアウトリンクを処理

**変更内容**:
- `generateQuoteRepostText`関数に`minimalCheckoutUrl`パラメータを追加
- チェックアウトリンクを優先的に使用し、「無料」「クレジットカード不要」を明確に記載
- プロンプトに「FREE checkout link - no payment required」という説明を追加

---

## 🔧 設定手順

### Step 1: Whopダッシュボードでチェックアウトリンクを作成

1. **Whopダッシュボードにログイン**
   - URL: https://whop.com/dashboard

2. **無料版（Minimal Version）製品を選択**
   - "Trap Defence BTC Minimal - EN"（言語別に設定）

3. **「Checkout links」セクションに移動**

4. **新しいチェックアウトリンクを作成**
   - **Product**: "Trap Defence BTC Minimal - EN"（言語別）
   - **Description**: 
     - EN: "Get free daily Trap Score reports and market insights. No credit card required."
     - JA: "無料の日次Trap Scoreレポートと市場インサイトを取得。クレジットカード不要。"
     - ES: "Obtén informes diarios gratuitos de Trap Score e información del mercado. No se requiere tarjeta de crédito."
     - など（言語別に設定）
   - **Price**: Free（$0）
   - **Stock**: Unlimited
   - **Ask questions before checkout**: ✅ 有効（オプション）
     - Question 1: "What markets do you trade?"（オプション）
   - **Advanced options**: 
     - メールアドレス必須: ❌ 無効（可能な場合）
     - 支払い情報: ❌ 不要（無料版のため）

5. **チェックアウトリンクをコピー**
   - 作成されたチェックアウトリンクのURLをコピー

---

### Step 2: 環境変数を設定

**Vercel環境変数**:
```
WHOP_MINIMAL_CHECKOUT_URL_EN=https://whop.com/checkout/...
WHOP_MINIMAL_CHECKOUT_URL_ES=https://whop.com/checkout/...
WHOP_MINIMAL_CHECKOUT_URL_PTBR=https://whop.com/checkout/...
WHOP_MINIMAL_CHECKOUT_URL_AR=https://whop.com/checkout/...
WHOP_MINIMAL_CHECKOUT_URL_KO=https://whop.com/checkout/...
WHOP_MINIMAL_CHECKOUT_URL_JA=https://whop.com/checkout/...
```

---

## 📊 動作フロー

### チェックアウトリンクが設定されている場合

1. **X投稿**: チェックアウトリンクを使用
2. **ユーザーがクリック**: Whopチェックアウトページに遷移
3. **チェックアウト完了**: Whop Webhookが発火
4. **コンバージョン追跡**: `/api/whop-webhook`で処理

### チェックアウトリンクが設定されていない場合（フォールバック）

1. **X投稿**: Telegram Deep Linkを使用（従来通り）
2. **ユーザーがクリック**: Telegram Botに遷移
3. **/startコマンド**: 無料版ユーザーとして登録

---

## 🎯 期待される効果

### 1. CTAボタン表示の問題解決
- **問題**: WhopページのCTAボタンが表示されない
- **解決**: チェックアウトリンクには必ずCTAボタンが表示される
- **効果**: **CVR +20-30%**

### 2. 情報収集の改善
- **メールアドレス**: 自動的に収集可能
- **追加情報**: 質問機能で「What markets do you trade?」などの情報を収集
- **コンバージョン追跡**: Whop Webhookで確実に追跡

### 3. UXの改善
- **明確なフロー**: 「チェックアウト」→「完了」という明確な流れ
- **信頼性**: Whopの公式チェックアウトフローで信頼性が向上

---

## ⚠️ 注意事項

### 1. 説明文の最適化
- **必須**: 「無料」「クレジットカード不要」を明確に記載
- **推奨**: 「No credit card required」「Free forever」などの表現を使用

### 2. UTMパラメータの設定
- **自動設定**: コードで自動的にUTMパラメータを追加
- **フォーマット**: `utm_source=x&utm_medium=quote_repost&utm_campaign=minimal_version&utm_content=influencer_{username}`

### 3. Whop Webhookの設定
- **必須**: チェックアウト完了時にWebhookが発火することを確認
- **エンドポイント**: `/api/whop-webhook`で処理

---

## 📋 次のステップ

1. **Whopダッシュボードでチェックアウトリンクを作成**（言語別に6個）
2. **環境変数を設定**（Vercel環境変数に追加）
3. **テスト実行**: チェックアウトリンクが正しく動作するか確認
4. **コンバージョン追跡**: Whop Webhookでコンバージョンを追跡

---

**最終更新**: 2026-01-30
