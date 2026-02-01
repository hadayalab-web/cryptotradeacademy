# 引用リポストテンプレート: 有料版（Regular Briefing）直導線

**作成日**: 2026-02-01  
**用途**: インフルエンサー投稿への引用リポストで、VSL → プロモコード → Whop Regular への直導線。

---

## 導線

1. **VSL（有料版用）**: https://youtu.be/fXgVsKhqDjI  
2. **プロモコード**: defend50（環境変数 `WHOP_PROMO_CODE` で変更可）  
3. **言語別 Whop Regular**:
   - EN: https://whop.com/trapdefence/btc-regular-en/
   - ES: https://whop.com/trapdefence/btc-regular-es/
   - AR: https://whop.com/trapdefence/btc-regular-ar/
   - PT: https://whop.com/trapdefence/btc-regular-pt/
   - JA: https://whop.com/trapdefence/btc-regular-ja/
   - KO: https://whop.com/trapdefence/btc-regular-ko/

リンクは `?promo=defend50` 付きで生成（`getWhopProductUrl(lang)` + `getPromoCode()`）。

---

## テンプレートの設計

- **有名ヘッドライン風フック**: トレード依存症・深層心理を揺さぶる一言。
- **ツァイガルニク効果**: Regular Briefing の Grok/Gemini 記事の「切り抜きチラ見せ」で「続きが気になる」状態を作る。
- **CTA**: 視聴（VSL）→ 50% OFF（defend50）→ Whop Regular。
- **文字数**: 280文字以内で互換性確保。

---

## バリアント（3種類）

| バリアント | ヘッドラインの方向性 | ツァイガルニクの入れ方 |
|------------|----------------------|------------------------|
| **A** | 「負け続けた男」系（6連敗→彼らのブリーフの一行を読んだ） | Regular 記事の一行チラ見せ |
| **B** | 「彼らは知っていた」系（罠の場所を知っていた） | 全文は見せない—フックだけ |
| **C** | 「90%が知らない」系（What 90% of traders never see） | Grok ブリーフ一切れ（Score 12/100. Exit map—）で途中で切る |

---

## 使い方（コード）

```js
const {
  getRegularOptinQuoteTemplate,
  getAllRegularOptinTemplates,
  REGULAR_OPTIN_VARIANTS,
} = require('./config/quoteRepostTemplatesRegularOptin');

// 1言語・デフォルトバリアントA
const textEn = getRegularOptinQuoteTemplate('en');

// 1言語・バリアントB
const textJa = getRegularOptinQuoteTemplate('ja', { variant: 'B' });

// インフルエンサー別 UTM
const textEs = getRegularOptinQuoteTemplate('es', {
  influencerUsername: 'CryptoWhale',
  variant: 'C',
});

// 全言語プレビュー
const all = getAllRegularOptinTemplates({ variant: 'A' });
```

---

## Minimal 導線との使い分け

- **Minimal オプトイン**（`config/quoteRepostTemplatesMinimalOptin.js`）: 無料版→VSL→Whop Minimal。フォロワーゼロ寄り・まずリスト取り。
- **Regular 直導線**（本ファイル）: 有料版直→VSL→defend50→Whop Regular。すでに興味が高い層・即コンバージョン狙い。
