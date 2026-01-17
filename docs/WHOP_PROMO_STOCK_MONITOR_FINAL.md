# Whopプロモコード残り枠監視システム - 最終実装レポート
**最終更新**: 2026-01-17 14:07:03  
**作成日時**: 2026-01-17 14:07:03  

**作成日**: 2026-01-17
**作成者**: COO（Cursor/Composer 1）  
**状態**: ✅ **実装完了 - 重複送信防止機能追加**

---

## 🎯 実装概要

Whop APIを使用してプロモコードの残り使用回数をリアルタイム監視し、「あと何枠！」のリマインドフローを自動化しました。

**新機能**: 重複送信防止機能を追加（KVストレージで送信履歴を管理）

---

## ✅ 実装内容

### 1. Whop APIクライアント（`services/whop/client.js`）

**機能**:
- ✅ プロモコード情報の取得（`getPromoCode`）
- ✅ プロモコードリストの取得（`listPromoCodes`）
- ✅ 残り枠数の計算（`calculateRemainingStock`）
- ✅ 残り枠数の取得（`getRemainingStock`）

---

### 2. プロモコード監視サービス（`services/whop/promo-monitor.js`）

**機能**:
- ✅ 残り枠数のリアルタイム監視
- ✅ しきい値に基づいたリマインド送信
- ✅ 無料版ユーザーへの自動リマインド
- ✅ **重複送信防止（KVストレージで送信履歴を管理）**

**しきい値設定**:
```javascript
const STOCK_THRESHOLDS = [
  { threshold: 50, message: '50 spots left' },
  { threshold: 25, message: '25 spots left' },
  { threshold: 10, message: 'Only 10 spots left!' },
  { threshold: 5, message: 'Only 5 spots left!' },
  { threshold: 1, message: 'LAST SPOT AVAILABLE!' },
];
```

**重複送信防止**:
- KVストレージで送信済みしきい値を記録
- 同じしきい値で重複送信を防止
- キー: `promo_reminder_sent_{PROMO_CODE_ID}`

---

### 3. Vercel Cronエンドポイント（`api/promo-stock-monitor.js`）

**機能**:
- ✅ 15分ごとにプロモコードの残り枠数を監視
- ✅ しきい値を下回ったときに自動的にリマインドを送信

**Cronスケジュール**: `*/15 * * * *`（15分ごと）

---

## 🔧 重複送信防止の仕組み

### 1. 送信履歴の管理

```javascript
// KVストレージで送信済みしきい値を記録
const key = `promo_reminder_sent_${PROMO_CODE_ID}`;
const sentThresholds = await kvStorage.get(key) || [];
```

### 2. 送信前のチェック

```javascript
// 既に送信済みかチェック
const alreadySent = await hasSentThreshold(threshold.threshold);
if (alreadySent) {
  // スキップ
  return { success: true, alreadySent: true };
}
```

### 3. 送信後の記録

```javascript
// 送信完了を記録
if (sent > 0) {
  await markThresholdSent(threshold.threshold);
}
```

---

## 📋 リマインドメッセージの例

### 残り50枠の場合
```
💡 **50 SPOTS LEFT**

🎁 Special Reminder for You, there!

The promo code **DEFEND50** (50% OFF) is running out of spots.

📊 **Current Status**: Only 50 spots remaining!

💰 Use Promo Code: **DEFEND50** for 50% OFF!

🚀 Get the pro's weapon at half price:
https://whop.com/aio-media-llc/trap-defence-btc-en/?promo=DEFEND50

💡 Limited availability - Secure your spot now!
```

### 残り5枠の場合
```
🚨 **ONLY 5 SPOTS LEFT!**

🎁 Special Reminder for You, there!

The promo code **DEFEND50** (50% OFF) is running out of spots.

📊 **Current Status**: Only 5 spots remaining!

💰 Use Promo Code: **DEFEND50** for 50% OFF!

🚀 Get the pro's weapon at half price:
https://whop.com/aio-media-llc/trap-defence-btc-en/?promo=DEFEND50

⏰ This is your LAST CHANCE! Don't miss out!
```

---

## 🔧 環境変数設定

Vercel Dashboardで以下の環境変数を設定してください：

```
# Whop API認証情報
WHOP_API_KEY=your-whop-api-key
WHOP_API_BASE_URL=https://api.whop.com/api/v2  # オプション

# プロモコードID（Whop Dashboardで確認）
WHOP_PROMO_CODE_ID=promo_xxx  # または PROMO_CODE_ID
WHOP_PROMO_CODE=DEFEND50  # プロモコード名

# Vercel KV（送信履歴管理用）
KV_REST_API_URL=your-kv-rest-api-url
KV_REST_API_TOKEN=your-kv-rest-api-token

# 言語別Whop URL（既存）
WHOP_PRODUCT_URL_EN=https://whop.com/aio-media-llc/trap-defence-btc-en/
WHOP_PRODUCT_URL_ES=https://whop.com/aio-media-llc/trap-defense-btc-es/
# ... 他の言語も同様
```

---

## 🎯 動作フロー

### 1. 監視フロー（15分ごと）

```
1. Vercel Cronが /api/promo-stock-monitor を実行
2. Whop APIからプロモコード情報を取得
3. 残り枠数を計算（stock - uses）
4. しきい値をチェック
5. 送信履歴をチェック（重複送信防止）
6. しきい値を下回った場合、無料版ユーザーにリマインドを送信
7. 送信完了を記録（重複送信防止）
```

### 2. リマインド送信フロー

```
1. 残り枠数がしきい値（50, 25, 10, 5, 1）を下回る
2. 送信履歴をチェック（既に送信済みの場合はスキップ）
3. 無料版ユーザー（VSL2未送信）を取得
4. 各ユーザーにリマインドメッセージを送信
5. レート制限対策（100ms待機）
6. 送信完了を記録（重複送信防止）
```

---

## ⚠️ 注意事項

### 1. 重複送信の防止

**実装済み**: KVストレージで送信履歴を管理し、同じしきい値で重複送信を防止

**動作**:
- 各しきい値ごとに1回のみ送信
- KVストレージで送信済みしきい値を記録
- 既に送信済みの場合はスキップ

### 2. APIレート制限

**Whop APIのレート制限**:
- 15分ごとの監視で十分な間隔を確保
- エラーハンドリングでレート制限エラーに対応

**Telegram APIのレート制限**:
- 100ms待機でレート制限を回避
- エラーハンドリングでレート制限エラーに対応

### 3. 無制限プロモコード

**対応**:
- `unlimited_stock === true` の場合はリマインドを送信しない
- ログに「無制限」と記録

### 4. KVストレージのフォールバック

**対応**:
- KVストレージが利用できない場合は、送信履歴のチェックをスキップ
- ログに警告を記録

---

## 📊 監視結果の例

```json
{
  "success": true,
  "remainingStock": 23,
  "sent": 15,
  "failed": 0,
  "total": 15,
  "threshold": 25
}
```

**重複送信防止が機能した場合**:
```json
{
  "success": true,
  "remainingStock": 23,
  "sent": 0,
  "threshold": 25,
  "alreadySent": true
}
```

---

## 🎯 メリット

### 1. 正確な緊急性
- ✅ 実際の残り枠数に基づいたリマインド
- ✅ 虚偽の緊急性を回避
- ✅ ユーザーへの信頼性向上

### 2. 自動化
- ✅ 15分ごとの自動監視
- ✅ しきい値に基づいた自動リマインド送信
- ✅ 人的リソース不要

### 3. 効果的なマーケティング
- ✅ 残り枠数が少なくなるほど緊急性が高まる
- ✅ 複数のしきい値で段階的にリマインド
- ✅ コンバージョン率の向上が期待できる

### 4. 重複送信防止
- ✅ KVストレージで送信履歴を管理
- ✅ 同じしきい値で重複送信を防止
- ✅ ユーザー体験の向上

---

## 📋 次のステップ

### 1. Whop API認証情報の設定
- Vercel Dashboardで `WHOP_API_KEY` を設定
- Whop DashboardでプロモコードIDを確認し、`WHOP_PROMO_CODE_ID` を設定

### 2. プロモコードの設定
- Whop Dashboardでプロモコード `DEFEND50` を作成
- 使用回数制限を設定（例：100回）
- プロモコードIDを取得

### 3. Vercel KVの設定
- Vercel DashboardでKVストレージを作成
- `KV_REST_API_URL` と `KV_REST_API_TOKEN` を設定

### 4. 動作確認
- テスト環境で動作確認
- 残り枠数がしきい値を下回ったときにリマインドが送信されることを確認
- 重複送信が防止されることを確認

### 5. 改善（オプション）
- 言語別のリマインドメッセージを実装
- しきい値のカスタマイズ機能を追加

---

## ✅ 実装完了項目

- [x] Whop APIクライアント作成
- [x] プロモコード監視サービス作成
- [x] Vercel Cronエンドポイント作成
- [x] しきい値に基づいたリマインド送信機能
- [x] 言語別Whop URL対応
- [x] エラーハンドリング
- [x] レート制限対策
- [x] **重複送信防止機能（KVストレージ）**

---

**作成者**: COO（Cursor/Composer 1）  
**状態**: ✅ **実装完了 - 重複送信防止機能追加完了**
