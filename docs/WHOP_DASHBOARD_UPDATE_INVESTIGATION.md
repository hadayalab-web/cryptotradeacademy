# Whopダッシュボードアップデート調査レポート

**作成日**: 2026-01-27  
**目的**: Whopダッシュボード機能のアップデートに伴う問題の調査と解決策の提案  
**対象**: プロダクト説明文・機能説明5項目の編集機能

---

## 📋 確認された問題

1. **機能についての説明5項目が削除されている**
   - ダッシュボード上で機能説明の編集項目が表示されない
   - 以前は5項目の機能説明を編集できていた

2. **プロダクト説明文の編集ができない**
   - プロダクト説明文の編集フィールドが表示されない、または編集できない状態

3. **その他の問題（調査中）**
   - ダッシュボードUIの変更による影響を継続調査中

---

## 🔍 Whop API v2 調査結果

### API v2の主要な変更点（Whop 4.0）

1. **用語の変更**
   - "Products" → "Whops" / "Offerings" に変更
   - UI上での表示が統一された

2. **エンドポイントの変更**
   - プロダクト更新: `POST /api/v2/products/{id}` (以前は `PATCH`)
   - レスポンス構造がより構造化された（`experiences`, `plans` の展開）

3. **フィールドの追加・変更**
   - `one_per_user`, `shuffleable` などの新フィールドが追加
   - `visibility` の値が拡張（`visible`, `hidden`, `archived`, `quick_link`）

### プロダクト説明文・機能フィールドの構造

#### 1. **プロダクト説明文フィールド**

| フィールド | タイプ | 説明 | 最大長 |
|-----------|--------|------|--------|
| `title` | string | プロダクト名/タイトル | ~40文字 |
| `headline` | string | マーケティング用ヘッドライン | ~150文字 |
| `description` | string | 詳細説明文 | ~1500文字 |

#### 2. **機能説明フィールド（product_highlights）**

`product_highlights` は配列形式で、各要素は以下の構造：

```json
{
  "product_highlights": [
    {
      "content": "機能説明のテキスト",
      "highlightType": "benefit" | "pricing_feature" | "qualification" | "who_this_is_for",
      "title": "タイトル（オプション）"
    }
  ]
}
```

**highlightType の種類**:
- `benefit`: 顧客が得られる利益
- `pricing_feature`: 価格関連の機能
- `qualification`: 要件・前提条件
- `who_this_is_for`: 対象ユーザー

---

## 🛠️ APIエンドポイント詳細

### 1. プロダクト情報取得

**エンドポイント**: `GET /api/v2/products/{id}`

**パラメータ**:
- `expand[]`: 関連オブジェクトを展開（例: `experiences`, `plans`）

**レスポンス例**:
```json
{
  "data": {
    "id": "prod_6RjqaJMGyEw1F",
    "title": "CryptoTrade Academy",
    "headline": "Learn to spot traps BEFORE you fall",
    "description": "詳細な説明文...",
    "product_highlights": [
      {
        "content": "機能説明1",
        "highlightType": "benefit",
        "title": "機能1"
      }
    ],
    "visibility": "visible",
    "created_at": 1234567890
  }
}
```

### 2. プロダクト情報更新

**エンドポイント**: `POST /api/v2/products/{id}`

**リクエストボディ例**:
```json
{
  "description": "更新された説明文",
  "headline": "更新されたヘッドライン",
  "product_highlights": [
    {
      "content": "機能説明1",
      "highlightType": "benefit",
      "title": "機能1"
    },
    {
      "content": "機能説明2",
      "highlightType": "benefit",
      "title": "機能2"
    },
    {
      "content": "機能説明3",
      "highlightType": "benefit",
      "title": "機能3"
    },
    {
      "content": "機能説明4",
      "highlightType": "benefit",
      "title": "機能4"
    },
    {
      "content": "機能説明5",
      "highlightType": "benefit",
      "title": "機能5"
    }
  ]
}
```

---

## 🔧 実装済みの対応

### 1. Whop APIクライアントの拡張

`services/whop/client.js` に以下の関数を追加：

- `getProduct(productId, expand)`: プロダクト情報を取得
- `updateProduct(productId, updateData)`: プロダクト情報を更新
- `listProducts(params)`: プロダクトリストを取得

### 2. テストスクリプトの作成

`scripts/test-whop-product-api.js` を作成：
- プロダクト情報の取得テスト
- フィールド構造の確認
- 更新エンドポイントのテスト（dry-run）

---

## 🧪 テスト手順

### 1. 環境変数の確認

**Whop APIキーの取得方法**:
1. Whopダッシュボードにログイン: https://whop.com/dashboard
2. Settings → API Keys に移動
3. 新しいAPIキーを作成、または既存のキーを確認
4. キーをコピーして環境変数に設定

**環境変数の設定**:

```bash
# .env ファイルまたは環境変数に以下が設定されていることを確認
WHOP_API_KEY=your_api_key_here
WHOP_PRODUCT_ID_EN=prod_6RjqaJMGyEw1F  # オプション（デフォルト値あり）

# その他のプロダクトID（必要に応じて）
WHOP_PRODUCT_ID_JA=prod_756mUZhSfLAkL
WHOP_PRODUCT_ID_KO=prod_HouQTKTN1F7vD
WHOP_PRODUCT_ID_ES=prod_Eg1V8et0WTg69
WHOP_PRODUCT_ID_AR=prod_l4ipnvNhwFpdQ
WHOP_PRODUCT_ID_PTBR=prod_Cpz4oQla16GUB
```

**Vercel環境変数の設定**:
- Vercel Dashboard → Project Settings → Environment Variables
- `WHOP_API_KEY` を追加

### 2. テストスクリプトの実行

```bash
node scripts/test-whop-product-api.js
```

**実行内容**:
1. プロダクト情報を取得（基本）
2. プロダクト情報を取得（experiences, plansをexpand）
3. プロダクトの全フィールド構造を表示
4. プロダクト更新エンドポイントのテスト（dry-run）
5. プロダクトリストを取得（比較用）

### 3. 機能説明5項目の更新スクリプト

専用の更新スクリプト `scripts/update-whop-product-highlights.js` を作成しました。

```bash
# 実行（dry-runモード、実際の更新はコメントアウト済み）
node scripts/update-whop-product-highlights.js
```

**実際に更新する場合**:
1. `scripts/update-whop-product-highlights.js` を開く
2. メイン関数内の以下のコメントを外す:
```javascript
// console.log('4. プロダクト情報を更新中...');
// const updatedProduct = await updateProduct(PRODUCT_ID, updateData);
// ...
```
3. 再度実行

### 4. 実際の更新テスト（注意: 本番データを変更します）

```javascript
// scripts/test-whop-product-api.js の main() 関数内で
// 以下のコメントを外して実行

const updateFields = {
  description: '更新された説明文',
  headline: '更新されたヘッドライン',
  product_highlights: [
    {
      content: '機能説明1',
      highlightType: 'benefit',
      title: '機能1'
    },
    // ... 5項目まで
  ]
};

const updated = await updateProduct(PRODUCT_ID, updateFields);
console.log('更新結果:', updated);
```

---

## 📊 推奨事項

### 1. ダッシュボードUIの問題への対応

**問題**: ダッシュボード上で編集フィールドが表示されない

**解決策**:
- **API経由での編集**: Whop API v2を使用して直接プロダクト情報を更新
- **自動化スクリプト**: プロダクト説明文・機能説明を一括更新するスクリプトを作成

### 2. 機能説明5項目の復元

**対応方法**:
1. 現在のプロダクト情報をAPIで取得
2. `product_highlights` フィールドの状態を確認
3. 5項目の機能説明を `product_highlights` 配列として設定
4. API経由で更新

**実装例**:
```javascript
const { getProduct, updateProduct } = require('./services/whop/client');

// 現在の情報を取得
const product = await getProduct('prod_6RjqaJMGyEw1F');

// 5項目の機能説明を設定
const highlights = [
  { content: '機能説明1', highlightType: 'benefit', title: '機能1' },
  { content: '機能説明2', highlightType: 'benefit', title: '機能2' },
  { content: '機能説明3', highlightType: 'benefit', title: '機能3' },
  { content: '機能説明4', highlightType: 'benefit', title: '機能4' },
  { content: '機能説明5', highlightType: 'benefit', title: '機能5' },
];

// 更新
await updateProduct('prod_6RjqaJMGyEw1F', {
  product_highlights: highlights
});
```

### 3. プロダクト説明文の編集

**対応方法**:
- `description` フィールドをAPI経由で更新
- `headline` フィールドも同時に更新可能

### 4. 継続的な監視

**推奨事項**:
- 定期的にプロダクト情報を取得して、フィールドの状態を確認
- ダッシュボードUIの変更を監視し、API経由での編集を標準化

---

## 🔗 参考リソース

- **Whop API v2 ドキュメント**: https://docs.whop.com/api-reference/products/
- **Whop API v2 開発者リファレンス**: https://dev.whop.com/api-reference/v2/products/
- **Whop 4.0 アップデート情報**: https://whop.com/blog/whop-4/

---

## 📝 次のステップ

1. ✅ Whop API v2の最新リファレンスを調査
2. ✅ プロダクト情報取得・更新のテストスクリプトを作成
3. 🔄 実際のプロダクトデータを取得してフィールド構造を確認
4. ⏳ プロダクト説明文・機能フィールドの更新テストを実行
5. ⏳ 調査結果と推奨事項をまとめたレポートを作成（本ドキュメント）

---

## ⚠️ 注意事項

- **APIキーの管理**: `WHOP_API_KEY` は環境変数で管理し、リポジトリにコミットしないこと
- **本番データの変更**: 更新テストは慎重に実行し、必要に応じてバックアップを取得
- **レート制限**: Whop APIにはレート制限がある可能性があるため、大量のリクエストには注意

---

**作成者**: COO (Cursor/Composer 1)  
**最終更新**: 2026-01-27
