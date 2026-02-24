# 実装ロジック破綻チェックレポート

**実施日:** 2026-02-24

---

## 1. 発見した問題

### 🔴 重大: Whop Webhook — event パースの破綻

**ファイル:** `api/whop-webhook.js` 404行目

**問題:**
```javascript
const event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
```

`getRawBody(req)` が成功してストリームを消費した場合、`req.body` は未設定のままとなる（Vercel は bodyParser 無効時や raw-body 先行読み取り時に req.body を自動設定しない）。その場合 `event` が `undefined` になり、直後の `event.type` 参照で `TypeError: Cannot read property 'type' of undefined` が発生する。

**推奨修正:**
`rawBody` が取得できている場合は `rawBody` からパースする。署名検証と同じソースを使うことで一貫性も保てる。

```javascript
// rawBody があればそれをソースに、なければ req.body
let event;
try {
  event = rawBody ? JSON.parse(rawBody) : (typeof req.body === 'string' ? JSON.parse(req.body) : req.body);
} catch (parseErr) {
  console.warn('[Whop Webhook] Failed to parse event:', parseErr?.message);
  return res.status(400).json({ error: 'Invalid JSON body' });
}
if (!event || typeof event !== 'object') {
  console.warn('[Whop Webhook] Empty or invalid event payload');
  return res.status(200).json({ received: false, error: 'Invalid payload' });
}
```

---

### ⚠️ 軽微: analytics-dashboard — 無意味なガード

**ファイル:** `api/analytics-dashboard.js` 31行目

**問題:**
```javascript
if (!kv) return;
```

`kv` は `utils/kv.js` のラッパーオブジェクトで、常に truthy。実際の「KV 未使用」は `kv.get`/`kv.set` 内の `getKV()` で判定されている。この条件は一度も成立せずデッドコード。

**影響:** 小さく、機能破綻はない。

---

### ⚠️ 軽微: 署名検証と body ソースの不一致リスク

**ファイル:** `api/whop-webhook.js`

**問題:**
`rawBody` のフォールバックで `JSON.stringify(req.body)` を使っている場合、元のリクエストの JSON とキー順序・スペースが異なり、署名検証が失敗する可能性がある。

**対策:** `raw-body` で確実に raw body を取得できるよう、必要なら `bodyParser: false` を設定する（X Webhook と同様）。

---

## 2. 整合性確認（問題なし）

| 項目 | 状態 |
|------|------|
| loadFreeUsers | ✅ `services/free-users/manager.js` に存在 |
| recordConversion | ✅ `api/analytics-dashboard.js` でエクスポート済み |
| pt / pt-br | ✅ whop-links の normalizeLang で正規化 |
| KV: kv vs getKV | ✅ 両方とも utils/kv 経由で同一インスタンス参照 |
| affiliateScoutConfig の pt | ✅ getWhopProductUrl("pt") は normalizeLang で pt-br に変換 |

---

## 3. 依存関係チェック

| 呼び出し元 | 依存先 | 存在 |
|------------|--------|------|
| whop-webhook | analytics-dashboard.recordConversion | ✅ |
| whop-webhook | firstpromoter/trackSale | ✅ |
| promo-monitor | free-users/manager.loadFreeUsers | ✅ |
| promo-monitor | whop/client | ✅ |
| affiliate-scout-run | affiliateScoutConfig, dmClient, ... | ✅ |
| x-webhook | utils/supabase.insertTweetQueue | ✅ |

---

## 4. 修正優先度

1. **P0:** Whop Webhook の event パースを rawBody ベースに変更 — ✅ 修正済み
2. **P2:** analytics-dashboard の `if (!kv) return` を削除または `getKV()` チェックに変更（任意）
3. **P2:** Whop Webhook の bodyParser 設定を検討（署名検証の堅牢性向上）
