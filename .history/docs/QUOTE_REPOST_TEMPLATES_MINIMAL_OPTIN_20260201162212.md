# 引用リポストテンプレート: 無料版（Minimal Version）オプトイン導線

**作成日**: 2026-02-01  
**用途**: インフルエンサー投稿への引用リポストで、VSL → Whop Minimal へのオプトイン導線。

---

## 導線

1. **VSL（6言語共通・字幕あり）**: https://youtu.be/OqvqngJOiXc
2. **言語別 Whop Minimal チェックアウト**:
   - EN: https://whop.com/checkout/plan_9zf3nrYeweovV
   - ES: https://whop.com/checkout/plan_pukjeWHXVbEBK
   - PT: https://whop.com/checkout/plan_wyK2xZcXtsMAV
   - AR: https://whop.com/checkout/plan_wREBLF9wriihy
   - KO: https://whop.com/checkout/plan_BYB0OUOWBrLem
   - JA: https://whop.com/checkout/plan_3hbsrgte6pCma

---

## テンプレートの設計

- **有名ヘッドライン風フック**: トレード依存症・深層心理を揺さぶる一言。
- **ツァイガルニク効果**: Minimal/Regular TG配信の「切り抜きチラ見せ」で「続きが気になる」状態を作る。
- **CTA**: 視聴（VSL）→ 無料登録（Whop Minimal）。
- **文字数**: 280文字以内（プレミアムアカウントでも互換性のため）。

---

## バリアント（3種類）

| バリアント | ヘッドラインの方向性                                                | ツァイガルニクの入れ方                                 |
| ---------- | ------------------------------------------------------------------- | ------------------------------------------------------ |
| **A**      | 「やめられない」系（Can't stop trading? / 待てないで負けてない？）  | 罠スコアは見せる / 出口マップは無料版の奥              |
| **B**      | 「彼らは笑った」系（They laughed when I said "wait for the trap."） | 本日のブリーフ一切れ（Score 12/100. Exit map—inside.） |
| **C**      | 「90%が嵌る罠」系（The trap 90% of traders fall into）              | スコアは見せる / 「どこで出口」は無料版の奥            |

---

## 使い方（コード）

```js
const {
  getMinimalOptinQuoteTemplate,
  getAllMinimalOptinTemplates,
  MINIMAL_OPTIN_VARIANTS
} = require("./config/quoteRepostTemplatesMinimalOptin");

// 1言語・デフォルトバリアントA
const textEn = getMinimalOptinQuoteTemplate("en");

// 1言語・バリアントB
const textJa = getMinimalOptinQuoteTemplate("ja", { variant: "B" });

// インフルエンサー別 UTM
const textEs = getMinimalOptinQuoteTemplate("es", {
  influencerUsername: "CryptoWhale",
  variant: "C"
});

// 全言語・全バリアントのプレビュー
const all = getAllMinimalOptinTemplates({ variant: "A" });
```

---

## 引用リポストフローでの利用

`api/x-quote-repost.js` で Grok 生成の代わりにこのテンプレートを使う場合は、  
`QUOTE_REPOST_USE_MINIMAL_OPTIN_TEMPLATE=true` のような環境変数と、  
`getMinimalOptinQuoteTemplate(lang, { variant: random A/B/C, influencerUsername })` の組み合わせで切り替え可能。
