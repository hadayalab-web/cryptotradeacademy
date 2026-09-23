# Whop API v2 完全機能リスト - できること・できないこと

**作成日**: 2026-01-11  
**目的**: Whop API v2でできることとできないことを徹底的に調査・整理

---

## 📋 調査方法

1. Whop API v2公式ドキュメントの確認
2. 実装コード（`api/unified-api.ts`）の確認
3. 実際のエラー記録（`docs/WHOP_*`）の確認
4. 公式ドキュメントのWeb検索

---

## ✅ Whop API v2で**できること**

### 1. **Products（プロダクト）**

#### ✅ 読み取り（GET）
- ✅ `GET /api/v2/products` - プロダクト一覧取得
  - クエリパラメータ: `page`, `per`, `visibility`, `expand`
  - 最大50件/ページ
- ✅ `GET /api/v2/products/{product_id}` - プロダクト詳細取得

#### ❌ 作成・更新・削除（POST/PUT/PATCH/DELETE）
- ❌ `POST /api/v2/products` - **権限不足（401 Unauthorized）**
- ❌ `PUT /api/v2/products/{id}` - **権限不足（401 Unauthorized）**
- ❌ `PATCH /api/v2/products/{id}` - **権限不足（401 Unauthorized）**
- ❌ `DELETE /api/v2/products/{id}` - **権限不足（401 Unauthorized）**

**注意**: APIキーの権限設定により、読み取りのみ可能な場合がある

---

### 2. **Plans（プラン）**

#### ✅ 読み取り（GET）
- ✅ `GET /api/v2/plans` - プラン一覧取得
  - クエリパラメータ: `page`, `per`, `visibility`, `product_id`, `expand`
  - 最大50件/ページ
- ✅ `GET /api/v2/plans/{id}` - プラン詳細取得

#### ⚠️ 作成・更新・削除（POST/PUT/PATCH/DELETE）
- ⚠️ `POST /api/v2/plans` - **未確認（権限次第）**
- ⚠️ `PUT /api/v2/plans/{id}` - **未確認（権限次第）**
- ⚠️ `PATCH /api/v2/plans/{id}` - **未確認（権限次第）**
- ⚠️ `DELETE /api/v2/plans/{id}` - **未確認（権限次第）**

**注意**: 公式ドキュメントには記載があるが、実際の権限設定により制限される可能性がある

---

### 3. **Memberships（メンバーシップ）**

#### ✅ 読み取り（GET）
- ✅ `GET /api/v2/memberships` - メンバーシップ一覧取得
  - クエリパラメータ: `page`, `per`, `status`, `plan_id`, `product_id`, `user_id`, `discord_id`, `wallet_address`, `valid`, `hide_metadata`, `direction`, `expand`
  - 最大50件/ページ
- ✅ `GET /api/v2/memberships/{id}` - メンバーシップ詳細取得

#### ✅ 操作（POST）
- ✅ `POST /api/v2/memberships/{id}/cancel` - メンバーシップキャンセル

#### ⚠️ その他の操作
- ⚠️ `POST /api/v2/memberships/{id}/reactivate` - **未確認（公式ドキュメントに記載あり）**
- ⚠️ `POST /api/v2/memberships/{id}/extend` - **未確認（公式ドキュメントに記載あり）**
- ⚠️ `PUT /api/v2/memberships/{id}` - **未確認（公式ドキュメントに記載あり）**
- ⚠️ `PATCH /api/v2/memberships/{id}` - **未確認（公式ドキュメントに記載あり）**

---

### 4. **Members（メンバー）**

#### ✅ 読み取り（GET）
- ✅ `GET /api/v2/members` - メンバー一覧取得
- ✅ `GET /api/v2/members/{id}` - メンバー詳細取得

#### ⚠️ 更新（PUT/PATCH）
- ⚠️ `PUT /api/v2/members/{id}` - **未確認（公式ドキュメントに記載あり）**
- ⚠️ `PATCH /api/v2/members/{id}` - **未確認（公式ドキュメントに記載あり）**

---

### 5. **Affiliates（アフィリエイト）** ⭐ **重要**

#### ✅ 読み取り（GET）
- ✅ `GET /api/v2/affiliates` - アフィリエイト一覧取得
  - クエリパラメータ: `page`, `per`, `product_id`, `expand`
  - 最大100件/ページ（実装確認済み）
- ✅ `GET /api/v2/affiliates/{id}` - アフィリエイト詳細取得

#### ✅ アフィリエイトリンク生成（URL構築）
- ✅ **アフィリエイトリンクのURL構築は可能**
  - プロダクトページ: `https://whop.com/{productSlug}?ref={affiliateCode}`
  - チェックアウトページ: `https://whop.com/checkout/{productId}/{planId}?ref={affiliateCode}`
  - **注意**: これはAPIエンドポイントではなく、URL構築による実装

#### ❌ 作成（POST）
- ❌ `POST /api/v2/affiliates` - **エンドポイントが存在しない**
  - Whop API v2にはアフィリエイター作成エンドポイントが存在しない
  - **解決策**: Whopダッシュボード自動化（Puppeteer）を使用

#### ⚠️ 更新・削除（PUT/PATCH/DELETE）
- ⚠️ `PUT /api/v2/affiliates/{id}` - **未確認（公式ドキュメントに記載なし）**
- ⚠️ `PATCH /api/v2/affiliates/{id}` - **未確認（公式ドキュメントに記載なし）**
- ⚠️ `DELETE /api/v2/affiliates/{id}` - **未確認（公式ドキュメントに記載なし）**

---

### 6. **Entries（エントリー）**

#### ✅ 読み取り（GET）
- ✅ `GET /api/v2/entries` - エントリー一覧取得
- ✅ `GET /api/v2/entries/{id}` - エントリー詳細取得

#### ✅ 操作（POST）
- ✅ `POST /api/v2/entries/{id}/approve` - エントリー承認

#### ⚠️ その他の操作
- ⚠️ `POST /api/v2/entries/{id}/reject` - **未確認（公式ドキュメントに記載あり）**
- ⚠️ `POST /api/v2/entries` - **未確認（作成エンドポイントの存在不明）**
- ⚠️ `DELETE /api/v2/entries/{id}` - **未確認（公式ドキュメントに記載あり）**

---

### 7. **Experiences（エクスペリエンス）**

#### ✅ 読み取り（GET）
- ✅ `GET /api/v2/experiences` - エクスペリエンス一覧取得
- ✅ `GET /api/v2/experiences/{id}` - エクスペリエンス詳細取得

#### ⚠️ 作成・更新・削除
- ⚠️ `POST /api/v2/experiences` - **未確認（公式ドキュメントに記載あり）**
- ⚠️ `PUT /api/v2/experiences/{id}` - **未確認（公式ドキュメントに記載あり）**
- ⚠️ `DELETE /api/v2/experiences/{id}` - **未確認（公式ドキュメントに記載あり）**

---

### 8. **OAuth（認証）**

#### ✅ 認証
- ✅ `POST /api/v2/oauth/token` - アクセストークン取得
- ✅ `GET /api/v2/oauth/user` - 認証済みユーザー情報取得
- ✅ `GET /api/v2/oauth/company` - 会社情報取得
- ✅ `GET /api/v2/oauth/info` - ユーザー・会社・エクスペリエンス情報の統合取得

---

### 9. **Refunds（返金）**

#### ✅ 読み取り（GET）
- ✅ `GET /api/v2/refunds` - 返金一覧取得
- ✅ `GET /api/v2/refunds/{id}` - 返金詳細取得

#### ⚠️ 作成（POST）
- ⚠️ `POST /api/v2/refunds` - **未確認（公式ドキュメントに記載あり）**

---

### 10. **Payments（支払い）**

#### ✅ 読み取り（GET）
- ✅ `GET /api/v2/payments` - 支払い一覧取得
- ✅ `GET /api/v2/payments/{id}` - 支払い詳細取得

---

### 11. **Checkout Sessions（チェックアウトセッション）** ⭐ **重要**

#### ✅ 作成（POST）
- ✅ `POST /api/v2/checkout_sessions` - チェックアウトセッション作成
  - **パラメータ**:
    - `plan_id` (string, 必須) - プランID
    - `affiliate_code` (string, オプション) - **アフィリエイトコードを指定可能** ⭐
    - `redirect_url` (string, オプション) - リダイレクトURL
    - `metadata` (object, オプション) - メタデータ
  - **レスポンス**: 
    - `id` - チェックアウトセッションID
    - `purchase_url` - 購入URL
    - `affiliate_code` - 適用されたアフィリエイトコード
    - `redirect_url` - リダイレクトURL

#### ✅ 読み取り（GET）
- ✅ `GET /api/v2/checkout_sessions` - チェックアウトセッション一覧取得
- ✅ `GET /api/v2/checkout_sessions/{id}` - チェックアウトセッション詳細取得

**重要な発見**: 
- ✅ **チェックアウトセッション作成時に`affiliate_code`を指定可能**
- ✅ これにより、プログラム的にアフィリエイトトラッキングが可能
- ✅ `@whop/react`の`WhopCheckout`コンポーネントでも`affiliateCode`プロパティで対応

---

### 12. **Webhooks（ウェブフック）**

#### ✅ 読み取り（GET）
- ✅ `GET /api/v2/webhooks` - ウェブフック一覧取得

#### ⚠️ 作成・更新・削除
- ⚠️ `POST /api/v2/webhooks` - **未確認（公式ドキュメントに記載あり）**
- ⚠️ `PUT /api/v2/webhooks/{id}` - **未確認（公式ドキュメントに記載あり）**
- ⚠️ `DELETE /api/v2/webhooks/{id}` - **未確認（公式ドキュメントに記載あり）**

---

## ❌ Whop API v2で**できないこと**

### 1. **アフィリエイター作成（最重要）**

- ❌ `POST /api/v2/affiliates` - **エンドポイントが存在しない**
  - Whop API v2にはアフィリエイター作成エンドポイントが存在しない
  - **解決策**: 
    1. Whopダッシュボード自動化（Puppeteer）を使用
    2. 手動登録
    3. アフィリエイター登録用LPを作成し、候補が自分で登録

**実装済みの解決策**:
- ✅ `scripts/whop-dashboard-automation.ts` - Puppeteerによる自動登録

---

### 2. **プロダクト作成・更新・削除（権限不足）**

- ❌ `POST /api/v2/products` - **権限不足（401 Unauthorized）**
- ❌ `PUT /api/v2/products/{id}` - **権限不足（401 Unauthorized）**
- ❌ `PATCH /api/v2/products/{id}` - **権限不足（401 Unauthorized）**
- ❌ `DELETE /api/v2/products/{id}` - **権限不足（401 Unauthorized）**

**原因**: 現在のAPIキーにプロダクト作成・更新・削除の権限がない

**解決策**:
1. Whop Dashboard → Settings → API Keys で権限を更新
2. Whop Dashboardで手動更新

---

### 3. **アフィリエイトリンク生成APIエンドポイント**

- ❌ `POST /api/v2/affiliates/{id}/links` - **エンドポイントが存在しない**
- ❌ `GET /api/v2/affiliates/{id}/links` - **エンドポイントが存在しない**

**代替実装**:
- ✅ URL構築による実装（`generateWhopAffiliateLink`関数）
  - プロダクト情報を取得してスラッグを取得
  - URLを構築: `https://whop.com/{productSlug}?ref={affiliateCode}`
- ✅ **チェックアウトセッション作成時に`affiliate_code`を指定**（`POST /api/v2/checkout_sessions`）
  - より確実なアフィリエイトトラッキングが可能
  - `@whop/react`の`WhopCheckout`コンポーネントでも対応

---

### 4. **アフィリエイトコミッション履歴取得**

- ❌ `GET /api/v2/affiliates/{id}/commissions` - **エンドポイントが存在しない**
- ❌ `GET /api/v2/affiliates/{id}/stats` - **エンドポイントが存在しない**

**注意**: 公式ドキュメントには記載がないが、Whopダッシュボードで確認可能

---

## 📊 実装状況まとめ

### ✅ 実装済み（`api/unified-api.ts`）

1. ✅ `getWhopProduct(productId)` - プロダクト詳細取得
2. ✅ `getWhopProducts(options)` - プロダクト一覧取得
3. ✅ `getWhopPlan(planId)` - プラン詳細取得
4. ✅ `getWhopPlans(options)` - プラン一覧取得
5. ✅ `getWhopAffiliate(affiliateId)` - アフィリエイト詳細取得
6. ✅ `getWhopAffiliates(options)` - アフィリエイト一覧取得（全ページ検索対応）
7. ✅ `generateWhopAffiliateLink(options)` - アフィリエイトリンク生成（URL構築）
8. ✅ `whopRequestSafe()` - レート制限・リトライ対応のリクエストヘルパー

### ❌ 実装できない（API制限）

1. ❌ `createWhopAffiliate()` - アフィリエイター作成（エンドポイントが存在しない）
2. ❌ `updateWhopProduct()` - プロダクト更新（権限不足）
3. ❌ `createWhopProduct()` - プロダクト作成（権限不足）
4. ❌ `deleteWhopProduct()` - プロダクト削除（権限不足）

---

## 🔄 レート制限

### Whop API v2のレート制限（公式ドキュメント確認済み）

- **制限**: **10秒あたり100リクエスト**（公式ドキュメント確認済み）
- **超過時のペナルティ**: 60秒のクールダウン期間
- **実装**: `whopRequestSafe()`関数で対応
  - レート制限チェック（現在は1分あたり100リクエストとして実装）
  - 429エラー時の自動リトライ（指数バックオフ）
  - 5xxエラー時の自動リトライ

**注意**: 
- 実装では1分あたり100リクエストとして実装されているが、公式ドキュメントでは**10秒あたり100リクエスト**と記載されている
- より厳しい制限の可能性があるため、実装の見直しが必要な場合がある

---

## 🎯 重要な結論

### 1. **アフィリエイター作成はAPI経由不可**

- ❌ `POST /api/v2/affiliates` - **エンドポイントが存在しない**
- ✅ **解決策**: Whopダッシュボード自動化（`scripts/whop-dashboard-automation.ts`）

### 2. **プロダクト更新は権限次第**

- ❌ 現在のAPIキーでは権限不足（401 Unauthorized）
- ✅ **解決策**: Whop DashboardでAPIキーの権限を更新、または手動更新

### 3. **アフィリエイトリンク生成はURL構築で実現**

- ❌ 専用APIエンドポイントは存在しない
- ✅ **実装**: `generateWhopAffiliateLink()`関数でURL構築

### 4. **読み取り操作はほぼすべて可能**

- ✅ Products, Plans, Memberships, Members, Affiliates, Entries, Experiences の読み取りは可能
- ✅ フィルタリング、ページネーション、拡張（expand）も対応

### 5. **チェックアウトセッション作成時にアフィリエイトコード指定可能** ⭐ **新発見**

- ✅ `POST /api/v2/checkout_sessions` - **`affiliate_code`パラメータでアフィリエイトトラッキング可能**
- ✅ これにより、プログラム的にアフィリエイトトラッキングが実現可能
- ✅ `@whop/react`の`WhopCheckout`コンポーネントでも`affiliateCode`プロパティで対応

---

## 📚 参考資料

- [Whop API v2 Documentation](https://dev.whop.com/api-reference/v2)
- [Whop API v2 Products](https://dev.whop.com/api-reference/v2/products)
- [Whop API v2 Plans](https://docs.whop.com/api-reference/v2/plans)
- [Whop API v2 Memberships](https://dev.whop.com/api-reference/v2/memberships)
- [Whop API v2 Affiliates](https://dev.whop.com/api-reference/v2/affiliates) - **注意**: アフィリエイター作成エンドポイントは記載なし

---

**関連ドキュメント**: 
- `docs/WHOP_CENTRIC_ARCHITECTURE_PRINCIPLES.md` - **3つの基本原則**（重要）
  - 原則1: **Whop APIで制御できないことは外部機能を配置**

---

**最終更新**: 2026-01-11  
**ステータス**: ✅ 調査完了
