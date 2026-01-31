# Whop無料版（Minimal Version）チェックアウトリンク設定
**作成日**: 2026-01-30  
**目的**: EN無料版チェックアウトリンクの確認と設定

---

## ✅ EN無料版チェックアウトリンク

### チェックアウトリンクURL
**EN**: `https://whop.com/checkout/plan_9zf3nrYeweovV`

### チェックアウトページの確認

#### ✅ 正しく設定されている項目

1. **製品名**: "Trap Defence BTC Minimal - EN" ✅
2. **価格**: "Free access" ✅
3. **CTAボタン**: "Subscribe"ボタンが表示されている ✅
4. **説明文**: 
   - "No credit card required" ✅
   - "Experience data-driven trading for free" ✅
   - "Upgrade anytime for full features" ✅
5. **質問フォーム**: 
   - "How many times a day do you typically check the charts or open a trade?"
   - "Do you often feel a strong urge to "revenge trade" immediately after a loss?"
   - "What is your biggest psychological hurdle in trading right now?"
   - "Would you like the AI to alert you when the market is too risky for impulsive entries?"
   - ✅ すべて適切な質問内容

---

## 🔧 環境変数の設定

### Vercel環境変数に追加

**EN無料版チェックアウトリンク**:
```
WHOP_MINIMAL_CHECKOUT_URL_EN=https://whop.com/checkout/plan_9zf3nrYeweovV
```

### 他の言語用チェックアウトリンク（今後作成）

```
WHOP_MINIMAL_CHECKOUT_URL_ES=https://whop.com/checkout/plan_...
WHOP_MINIMAL_CHECKOUT_URL_PTBR=https://whop.com/checkout/plan_...
WHOP_MINIMAL_CHECKOUT_URL_AR=https://whop.com/checkout/plan_...
WHOP_MINIMAL_CHECKOUT_URL_KO=https://whop.com/checkout/plan_...
WHOP_MINIMAL_CHECKOUT_URL_JA=https://whop.com/checkout/plan_...
```

---

## 📊 チェックアウトページの評価

### ✅ 優れている点

1. **CTAボタンが明確に表示**: "Subscribe"ボタンが大きく表示されている
2. **無料であることが明確**: "Free access"と明記
3. **クレジットカード不要を強調**: "No credit card required"を記載
4. **質問フォームで情報収集**: 心理的ハードルやトレーディング習慣を収集
5. **UXが良好**: シンプルで分かりやすいフロー

### 💡 改善提案（オプション）

1. **説明文の最適化**: 
   - 現在: "Master BTC markets with Trap Defence Minimal..."
   - 推奨: "Get free daily Trap Score reports and market insights. No credit card required."

2. **質問フォームの最適化**:
   - 現在の質問は適切だが、回答例を追加するとより良い
   - 例: "e.g., 5-10 times, 50+ times, or 'I can't stop checking'"

---

## 🎯 実装状況

### ✅ コード実装: 完了

1. **`services/telegram/whop-links.js`**: `getMinimalVersionCheckoutUrl()`関数を追加 ✅
2. **`api/x-quote-repost.js`**: チェックアウトリンクを優先的に使用 ✅
3. **`services/grok/client.js`**: チェックアウトリンクを処理 ✅

### ⏳ 環境変数設定: 待機中

**次のステップ**: Vercel環境変数に`WHOP_MINIMAL_CHECKOUT_URL_EN`を追加

---

## 📋 動作確認

### チェックアウトリンクの動作フロー

1. **X投稿**: チェックアウトリンクを使用
2. **ユーザーがクリック**: `https://whop.com/checkout/plan_9zf3nrYeweovV`に遷移
3. **質問フォーム**: 4つの質問に回答（オプション）
4. **メールアドレス入力**: メールアドレスを入力
5. **Subscribeボタンをクリック**: チェックアウト完了
6. **Whop Webhook**: `/api/whop-webhook`でコンバージョンを処理

---

## 🎯 結論

### ✅ EN無料版チェックアウトリンク: **完璧**

**評価**:
- ✅ CTAボタンが明確に表示されている
- ✅ 無料であることが明確に記載されている
- ✅ クレジットカード不要が強調されている
- ✅ 質問フォームで情報収集が可能
- ✅ UXが良好

**次のステップ**:
1. **環境変数を設定**: `WHOP_MINIMAL_CHECKOUT_URL_EN=https://whop.com/checkout/plan_9zf3nrYeweovV`
2. **他の言語用チェックアウトリンクを作成**: ES, PT-BR, AR, KO, JA
3. **テスト実行**: チェックアウトリンクが正しく動作するか確認

---

**最終更新**: 2026-01-30
