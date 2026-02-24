# FirstPromoter–Whop 連携 精緻点検レポート

**作成日**: 2026-02-24  
**目的**: FirstPromoter と Whop の連携ロジックを精緻に点検し、破綻点を特定・是正する。

---

## 1. アーキテクチャ概要

```
[ユーザー] → ref_id / promo_code 付きリンク → [Whop Checkout]
    → 決済完了 → [Whop Webhook] → [api/whop-webhook.js]
    → ref_id / promo_code 抽出 → [FirstPromoter track/sale]
    → 紹介報酬・アフィリエイトコミッション付与
```

| コンポーネント | 役割 |
|----------------|------|
| `api/whop-webhook.js` | Whop Webhook 受信、署名検証、購入イベント処理、FirstPromoter track/sale 呼び出し |
| `services/firstpromoter/trackSale.js` | FirstPromoter Track Sale API の薄いクライアント |
| `config/affiliateScoutConfig.js` | `getFirstPromoterInviteUrl(lang)` で 6 言語対応 URL |
| `services/telegram/whop-links.js` | 6 言語 Whop チェックアウトリンク |

---

## 2. FirstPromoter API 仕様（公式）

### 2.1 Track Sale API

- **URL**: `POST https://firstpromoter.com/api/v1/track/sale`
- **認証**: `X-API-KEY` ヘッダ
- **必須**: `event_id`, `amount`
- **email / uid**: 「`email` は uid が null の場合必須」「`uid` は email が null の場合必須」
  - **ref_id / promo_code 使用時**: サインアップ追跡をバイパスし、リード＋売上を一括作成可能。この場合、email がなくても動作する可能性あり（要実機確認）。
  - **推奨**: 可能な限り `email` を渡す（Whop の user.email から取得）。

### 2.2 金額フォーマット

| 通貨種別 | amount 形式 | 例 (100 円/USD) |
|----------|-------------|------------------|
| JPY 等ゼロ小数通貨 | 整数 | `100` |
| USD 等 | セント（×100） | `10000` |

**当方実装**: `currency === 'JPY' ? Math.round(amountNum) : Math.round(amountNum * 100)` ✅ 正しい。

### 2.3 重複防止

- `event_id` が必須。同一 `event_id` の再送で **409 Conflict** が返る場合あり。
- FirstPromoter 側でも event_id による重複排除を行う。

---

## 3. Whop Webhook 処理

### 3.1 対象イベント（7 種）

| イベント | 購入フェーズ |
|----------|--------------|
| `checkout.completed` | チェックアウト完了 |
| `membership.created` | メンバーシップ作成 |
| `membership.renewed` | 更新課金 |
| `membership.activated` | アクティベート |
| `membership_activated` | （アンダースコア形式） |
| `payment_succeeded` | 決済成功 |
| `invoice_paid` | 請求書支払い済み |

**重要**: 同一購入で複数イベントが届く可能性あり。

- 例: `checkout.completed` → `membership.activated` → `payment_succeeded` → `invoice_paid`
- 対策: **KV ベースの重複送信防止** を実装済み（§4 参照）。

### 3.2 ref_id / promo_code 抽出元

| ソース | 抽出ロジック |
|--------|--------------|
| `metadata.ref_id` / `metadata.ref` | checkout / membership / payment / invoice の metadata |
| `referrer_url` の `ref` / `ref_id` クエリ | checkout.referrer_url, metadata.referrer_url |
| `promo_code` | checkout / membership / payment / invoice / metadata.promo_code |

**Whop 仕様要確認**: Whop が referrer / metadata で ref を渡すかは公式ドキュメントで明示されていない。実機 Webhook ログで確認推奨。

### 3.3 金額・ID 抽出

```javascript
amountRaw = checkout?.total ?? membership?.renewal_price ?? payment?.amount ?? invoice?.amount ?? ...
checkoutId = checkout?.id || membership?.checkout_id || payment?.checkout_id || invoice?.checkout_id
membershipId = membership?.id || payment?.membership_id || invoice?.membership_id
```

- `checkout_id`: membership / payment / invoice に含まれる場合、同一購入を一意に識別可能。
- 含まれない場合: `membership.id` 等が event_id に使われ、イベントごとに異なる可能性 → KV dedup で吸収。

---

## 4. 重複送信防止（実装済み）

### 4.1 問題

同一購入で `checkout.completed` と `membership.activated` 等が届くと、それぞれから `track/sale` が呼ばれ得る。`event_id` が異なると FirstPromoter 上で二重カウントになる可能性。

### 4.2 対策

1. **KV キー**: `fp_sent:{checkoutId}` および `fp_sent:{membershipId}`（存在する場合）
2. **送信前チェック**: 上記いずれかが既に存在する場合、`track/sale` をスキップ
3. **送信後登録**: 成功時に両 ID を KV に保存（TTL 7 日）
4. **event_id**: `checkoutId || membershipId || whop_{timestamp}_{random}` で優先度を固定

これにより、同一購入に対する複数イベントでも **1 回のみ** track/sale が送信される。

---

## 5. 署名検証・rawBody パース

### 5.1 署名検証

- Whop は Standard Webhooks 仕様（HMAC SHA-256）
- 署名文字列: `{timestamp}.{raw_body}`
- `WHOP_WEBHOOK_SECRET` 未設定時: 本番では検証失敗、開発ではスキップ

### 5.2 イベントパース

- `getRawBody` でストリームを読み、`rawBody` から JSON パース
- `rawBody` がなければ `req.body` を使用
- パース失敗・空ペイロード時は 400 / 200（エラー時も 200 を返す Whop 要件に従う）

---

## 6. 6 言語連携

| 項目 | 実装 |
|------|------|
| FirstPromoter 招待 URL | `getFirstPromoterInviteUrl(lang)`（en/es/pt/ar/ko/ja） |
| Whop リンク | `services/telegram/whop-links.js` で 6 言語対応 |
| DM テンプレート | `config/affiliateScoutDmTemplates.js` |
| アフィリエイト資産 | `docs/FIRSTPROMOTER_ASSETS_COPY_PASTE.md` 参照 |

---

## 7. チェックリスト・推奨アクション

| # | 項目 | 状態 | 備考 |
|---|------|------|------|
| 1 | ref_id / promo_code 抽出 | ✅ | metadata, referrer_url, 各オブジェクトから取得 |
| 2 | 金額フォーマット（JPY / 他通貨） | ✅ | 実装正 |
| 3 | event_id 一意性・重複防止 | ✅ | KV dedup + FirstPromoter event_id |
| 4 | email 渡却 | ✅ | userEmail を可能な限り渡している |
| 5 | Whop 署名検証 | ✅ | 本番必須 |
| 6 | rawBody パース | ✅ | 修正済み |
| 7 | Whop ペイロード構造 | ⚠️ 要確認 | checkout_id が membership に含まれるか実機確認推奨 |
| 8 | ref 受け渡し仕様 | ⚠️ 要確認 | Whop が referrer / metadata で ref を渡すか実機確認推奨 |

---

## 8. 関連ドキュメント

- `docs/INTEGRATION_WHOP_X_FIRSTPROMOTER.md` — 連携設計
- `docs/FIRSTPROMOTER_IMPLEMENTATION_STATUS.md` — 実装進捗
- `docs/API_IMPLEMENTATION_AUDIT_REPORT.md` — API 監査レポート
