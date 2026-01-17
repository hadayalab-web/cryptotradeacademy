# Whopプロモコード徹底調査レポート

**作成日**: 2026-01-16  
**調査者**: COO（Cursor/Composer 1）  
**目的**: Whopプロモコードの時間制限機能の徹底調査

---

## 🔍 調査結果サマリー

### ⚠️ 重要な発見

**Whopプロモコードには「動的な時間制限（24時間など）」は設定できません。**

---

## 📋 Whopプロモコードの機能と制約

### ✅ 設定可能な項目

1. **有効期限（Expiration Date）**
   - `expires_at` パラメータで**特定の日時**を指定可能
   - 例: `2026-01-17T00:00:00Z`（2026年1月17日0時まで有効）
   - **注意**: 日時は固定値のみ。動的な「24時間後」は設定不可

2. **使用回数制限（Stock）**
   - `stock` パラメータで使用回数を制限可能
   - 例: `stock: 50`（50回まで使用可能）
   - `unlimited_stock: true` で無制限に設定可能

3. **顧客区分の制限**
   - `new_users_only: true` - 新規ユーザーのみ
   - `existing_memberships_only: true` - 既存メンバーのみ
   - `churned_users_only: true` - 解約ユーザーのみ

4. **割引の継続期間（Duration）**
   - `one-time` - 一度きり
   - `forever` - 永久
   - `repeating` - 複数月（`promo_duration_months`で指定）

### ❌ 設定不可能な項目

1. **動的な時間制限**
   - ❌ 「24時間後」のような相対的な時間制限は設定不可
   - ❌ 「ユーザー登録から24時間後」のような条件付き時間制限は設定不可
   - ✅ 可能なのは**固定の日時（expires_at）**のみ

2. **ユーザー別の有効期限**
   - ❌ ユーザーごとに異なる有効期限を設定することはできない
   - ✅ すべてのユーザーに同じ有効期限が適用される

---

## ⚠️ 現在のコードの問題点

### 問題のあるメッセージ

#### 1. VSL2配信メッセージ（`api/vsl2-free-users.js`）
```javascript
⏰ **24-HOUR LIMITED**: This offer expires in ${hoursLeft} hours!
⏰ Offer expires in ${hoursLeft} hours. Don't miss out!
```

**問題点**:
- 「24時間で期限切れ」と表示しているが、実際のWhopプロモコードには時間制限が設定されていない
- ユーザーが24時間後にアクセスしても、プロモコードが有効なままの可能性がある
- **虚偽の緊急性（False Urgency）**となり、信頼を損なう可能性

#### 2. VSL2ラストコールメッセージ（`api/vsl2-last-call.js`）
```javascript
🚨 **ONLY 2 HOURS LEFT**: Your 50% OFF offer expires in 2 hours!
⏰ Don't miss out - This offer expires in 2 hours!
```

**問題点**:
- 「残り2時間」と表示しているが、実際のWhopプロモコードには時間制限が設定されていない
- ユーザーが2時間後にアクセスしても、プロモコードが有効なままの可能性がある

---

## ✅ 推奨対応策

### 策1: Whopでプロモコードの有効期限を設定（推奨）

**実装方法**:
1. Whop Dashboardでプロモコード `DEFEND50` を作成
2. **有効期限（Expiration Date）**を設定
   - 例: 2026年1月31日23:59:59 UTC
   - または、定期的に更新（例：毎月1日に新しいプロモコードを作成）

**メリット**:
- 実際に時間制限が機能する
- ユーザーへの信頼性が向上
- 虚偽の緊急性を回避

**デメリット**:
- 定期的なプロモコード更新が必要
- 固定の日時なので、ユーザーごとの「24時間後」は実現できない

---

### 策2: メッセージの表現を修正（緊急性を保ちつつ正確に）

**修正案1: 使用回数制限を強調**
```javascript
🎁 Special Offer for You, ${userName}!

💰 Use Promo Code: **${PROMO_CODE}** for 50% OFF!

🚀 Get the pro's weapon at half price:
${WHOP_PRODUCT_URL}?promo=${PROMO_CODE}

⏰ Limited availability - Don't miss out!
```

**修正案2: 早期アクセス特典として表現**
```javascript
🎁 Special Offer for You, ${userName}!

💰 Use Promo Code: **${PROMO_CODE}** for 50% OFF!

🚀 Get the pro's weapon at half price:
${WHOP_PRODUCT_URL}?promo=${PROMO_CODE}

💡 Early adopter bonus - Limited time offer!
```

**修正案3: 実績と価値を強調（時間制限を削除）**
```javascript
🎁 Special Offer for You, ${userName}!

📊 **Proof**: Over the past 30 days, Trap Defence BTC has:
• Identified traps before they hit
• Saved users from significant losses
• Maintained high win rate

🎬 Watch this: ${VSL2_YOUTUBE_LINK}

💰 Use Promo Code: **${PROMO_CODE}** for 50% OFF!

🚀 Get the pro's weapon at half price:
${WHOP_PRODUCT_URL}?promo=${PROMO_CODE}
```

---

### 策3: 使用回数制限を設定して「限定性」を演出

**実装方法**:
1. Whop Dashboardでプロモコード `DEFEND50` を作成
2. **使用回数制限（Stock）**を設定
   - 例: `stock: 100`（100回まで使用可能）
3. メッセージを修正:
   ```javascript
   🎁 Special Offer for You, ${userName}!
   
   💰 Use Promo Code: **${PROMO_CODE}** for 50% OFF!
   ⚠️ Limited to first 100 users only!
   
   🚀 Get the pro's weapon at half price:
   ${WHOP_PRODUCT_URL}?promo=${PROMO_CODE}
   ```

**メリット**:
- 実際に限定性が機能する
- 虚偽の緊急性を回避
- 使用回数を追跡可能

---

## 🎯 推奨実装（善策）

### 最適解: 使用回数制限 + メッセージ修正

**理由**:
1. **正確性**: 虚偽の緊急性を回避
2. **実現可能性**: Whopの機能で実現可能
3. **効果**: 限定性による緊急性を維持
4. **管理性**: 使用回数を追跡・管理可能

**実装内容**:
1. Whop Dashboardでプロモコード `DEFEND50` の使用回数制限を設定（例：100回）
2. メッセージから時間制限の表現を削除
3. 使用回数制限を強調する表現に変更

---

## 📋 修正が必要なファイル

1. `api/vsl2-free-users.js` - VSL2配信メッセージ
2. `api/vsl2-last-call.js` - VSL2ラストコールメッセージ

---

## ⚠️ 注意事項

### 虚偽の緊急性（False Urgency）のリスク

**問題点**:
- ユーザーが「24時間で期限切れ」と信じてアクセスしたが、実際には有効なまま
- 信頼を損なう可能性
- 法的リスク（消費者保護法違反の可能性）

**推奨**:
- 時間制限の表現を削除するか、実際に設定可能な制限（使用回数制限など）に変更

---

**作成者**: COO（Cursor/Composer 1）  
**状態**: ⚠️ **問題発見 - 修正が必要**
