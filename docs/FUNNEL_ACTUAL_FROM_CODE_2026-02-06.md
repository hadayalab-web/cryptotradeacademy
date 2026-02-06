# 実際の導線（コード準拠・2026-02-06）

**目的**: 引用リポストからユーザーがクリックした先を、実装に基づいて正確に書く。LP/Telegram/Whop のすみ分けをはっきりさせる。

---

## 引用リポストに実際に出ているリンク

### 本番パス（Grok セールスレター・SALES_LETTER_LANGS）

- **リンクブロック** = `getLinkBlockGrokStyle(lang)`（`services/salesLetterContest.js`）
- 中身:
  1. **無料（メインCTA）** → **Whop の Minimal チェックアウト URL**  
     `getMinimalVersionCheckoutUrl(lang)` = `https://whop.com/checkout/plan_xxx`（言語別）
  2. **有料（Regular）** → **Whop の商品ページ**  
     `getWhopProductUrl(lang)` = `https://whop.com/trapdefence/btc-regular-en/` 等
  3. **サブ** → VSL（YouTube）の URL 2本（Minimal用・Regular用）

→ **X からクリックすると、ユーザーが行くのは Whop か YouTube。Telegram（t.me）のリンクはこのブロックには入っていない。**

### フォールバック・dry-run パス

- テキスト内に **Telegram Deep Link** を直で入れている  
  `getTelegramDeepLinkWithSource(lang, "x_quote")` = `https://t.me/TrapDefenceBot?start=minimal_en_x_quote&utm_...`
- このときは **X → クリック → Telegram** になる。

---

## 用語の整理（何を指しているか）

| 用語 | 実態（このコードベース） |
|------|---------------------------|
| **LP** | 引用リポストの導線には **出てこない**。別ドメインの「ランディングページ」がこのフローに含まれている実装はない。戦略ドキュメントで「LP」と書いてある場合は、**Whop のページ**か、存在するなら別サイトを指している可能性があるが、引用リポスト実装上は「LP」という1本のURLはない。 |
| **Telegram** | **本番のリンクブロックには含まれない**。t.me はフォールバック・dry-run 時のみ。本番では「TG に直接クリック」させる設計にはなっていない。Whop 経由でオプトインした人が後から Telegram Bot に誘導される流れは別実装。 |
| **Whop** | 引用リポストの **メインの着地**。無料 = Minimal チェックアウト（plan_xxx）、有料 = Regular 商品ページ（trapdefence/btc-regular-xx）。 |

---

## 実際の流れ（一言で）

- **本番**: X 引用リポスト → クリック → **Whop**（Minimal チェックアウト or Regular） or **YouTube**（VSL）。  
  **Telegram 直リンクは貼っていない。**
- **LP** という名前の別ページは、この引用リポストの導線には登場しない。

---

## 参照コード

- リンクブロック: `services/salesLetterContest.js` の `getLinkBlockGrokStyle`
- Whop/Minimal URL: `services/telegram/whop-links.js` の `getMinimalVersionCheckoutUrl`, `getWhopProductUrl`
- Telegram Deep Link（フォールバック用）: `api/x-quote-repost.js` の `getTelegramDeepLinkWithSource`、dry-run 時のテキスト
