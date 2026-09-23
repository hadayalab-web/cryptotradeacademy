# Whopプロダクト名 統一更新ガイド

**更新日**: 2026-01-11  
**基準プロダクト名**: Trap Defense BTC - English  
**目的**: すべての多言語版プロダクト名を統一

---

## 📋 現在のプロダクト名（問題あり）

| 市場 | プロダクトID | 現在の名前 | 問題点 |
|------|------------|----------|--------|
| **EN** | `prod_6RjqaJMGyEw1F` | Trap Defense BTC - English | ✅ 正しい |
| **ES** | `prod_Eg1V8et0WTg69` | Trap Deffenca BTC - ES | ❌ スペルミス: Deffenca → Defense |
| **AR** | `prod_l4ipnvNhwFpdQ` | Trap Deffense BTC - AR | ❌ スペルミス: Deffense → Defense |
| **PT-BR** | `prod_Cpz4oQla16GUB` | Trap Deffence BTC - PT-BR | ❌ スペルミス: Deffence → Defense |
| **KO** | `prod_HouQTKTN1F7vD` | Trap Deffence BTC - KO | ❌ スペルミス: Deffence → Defense |
| **JA** | `prod_756mUZhSfLAkL` | Trap Deffence BTC - JA | ❌ スペルミス: Deffence → Defense |

---

## ✅ 更新後のプロダクト名（統一版）

| 市場 | プロダクトID | 更新後の名前 | Whop Dashboard URL |
|------|------------|------------|-------------------|
| **EN** | `prod_6RjqaJMGyEw1F` | Trap Defense BTC - English | https://whop.com/dashboard/products/prod_6RjqaJMGyEw1F |
| **ES** | `prod_Eg1V8et0WTg69` | Trap Defense BTC - Spanish | https://whop.com/dashboard/products/prod_Eg1V8et0WTg69 |
| **AR** | `prod_l4ipnvNhwFpdQ` | Trap Defense BTC - Arabic | https://whop.com/dashboard/products/prod_l4ipnvNhwFpdQ |
| **PT-BR** | `prod_Cpz4oQla16GUB` | Trap Defense BTC - Portuguese | https://whop.com/dashboard/products/prod_Cpz4oQla16GUB |
| **KO** | `prod_HouQTKTN1F7vD` | Trap Defense BTC - Korean | https://whop.com/dashboard/products/prod_HouQTKTN1F7vD |
| **JA** | `prod_756mUZhSfLAkL` | Trap Defense BTC - Japanese | https://whop.com/dashboard/products/prod_756mUZhSfLAkL |

**命名規則**: `Trap Defense BTC - {言語名（英語表記）}`

---

## 🔧 更新手順

### 方法1: Whop Dashboardで手動更新（推奨）

1. **Whop Dashboardにログイン**: https://whop.com/dashboard

2. **各プロダクトページにアクセス**:
   - 上記のWhop Dashboard URLを使用

3. **プロダクト名を更新**:
   - プロダクト設定ページを開く
   - 「Name」または「Title」フィールドを編集
   - 更新後の名前を入力
   - 保存

4. **確認**:
   - プロダクト一覧ページで名前が正しく表示されているか確認
   - 公開ページで名前が正しく表示されているか確認

### 方法2: Whop APIで更新（権限があれば）

**注意**: 以前の確認で、Update productsの権限が401エラーになっていました。APIキーの権限を確認してから試行してください。

```typescript
// 更新例（api/unified-api.tsを使用）
import { whopRequestSafe } from '../api/unified-api';

const updates = [
  { id: 'prod_Eg1V8et0WTg69', name: 'Trap Defense BTC - Spanish' },
  { id: 'prod_l4ipnvNhwFpdQ', name: 'Trap Defense BTC - Arabic' },
  { id: 'prod_Cpz4oQla16GUB', name: 'Trap Defense BTC - Portuguese' },
  { id: 'prod_HouQTKTN1F7vD', name: 'Trap Defense BTC - Korean' },
  { id: 'prod_756mUZhSfLAkL', name: 'Trap Defense BTC - Japanese' },
];

for (const update of updates) {
  try {
    await whopRequestSafe('PATCH', `/products/${update.id}`, {
      name: update.name,
      title: update.name, // titleも更新する場合
    });
    console.log(`✅ ${update.id}: 更新成功`);
  } catch (error: any) {
    console.error(`❌ ${update.id}: 更新失敗 - ${error.message}`);
  }
}
```

---

## 📝 更新チェックリスト

- [ ] EN: Trap Defense BTC - English（変更不要）
- [ ] ES: Trap Deffenca BTC - ES → Trap Defense BTC - Spanish
- [ ] AR: Trap Deffense BTC - AR → Trap Defense BTC - Arabic
- [ ] PT-BR: Trap Deffence BTC - PT-BR → Trap Defense BTC - Portuguese
- [ ] KO: Trap Deffence BTC - KO → Trap Defense BTC - Korean
- [ ] JA: Trap Deffence BTC - JA → Trap Defense BTC - Japanese

---

## 🔍 確認方法

### 1. Whop Dashboardで確認

各プロダクトの設定ページで「Name」フィールドを確認:
- ✅ 正しい: `Trap Defense BTC - {言語名}`
- ❌ 間違い: `Trap Deffence BTC - {言語コード}` など

### 2. 公開ページで確認

各プロダクトの公開ページで名前を確認:
- EN: https://whop.com/aio-media-llc/trap-defense-btc-en/
- ES: https://whop.com/aio-media-llc/trap-defense-btc-es/
- AR: https://whop.com/aio-media-llc/tap-defense-btc-ar/
- KO: https://whop.com/aio-media-llc/trap-defense-btc-ko/
- JA: https://whop.com/aio-media-llc/trap-deffence-btc-ja/
- PT-BR: （URL未確認）

### 3. APIで確認

```bash
npx tsx scripts/check-whop-products-faq.ts
```

または、個別に確認:

```typescript
import { getWhopProduct } from './api/unified-api';

const product = await getWhopProduct('prod_Eg1V8et0WTg69');
console.log('現在の名前:', product.name);
```

---

## 💡 注意事項

1. **プロダクト名とタイトルの違い**:
   - `name`: 内部識別用の名前
   - `title`: 公開ページに表示されるタイトル
   - 両方を更新することを推奨

2. **スラッグ（URL）への影響**:
   - プロダクト名を変更しても、既存のスラッグ（URL）は変更されない可能性があります
   - スラッグを変更する場合は、別途設定が必要です

3. **SEOへの影響**:
   - プロダクト名の変更は、検索エンジンでの表示に影響する可能性があります
   - 変更後は、Google Search Consoleなどでインデックス状況を確認してください

---

## 📊 更新前後の比較

### 更新前
- ❌ スペルが統一されていない（Deffence, Deffense, Deffenca）
- ❌ 言語表記が統一されていない（English vs ES, AR, KO, JA）

### 更新後
- ✅ スペルが統一されている（すべて「Defense」）
- ✅ 言語表記が統一されている（すべて「{言語名（英語表記）}」）

---

## 🚀 次のステップ

1. ✅ 更新ガイドの作成: 完了
2. ✅ Whop APIでのプロダクト情報更新: **完了**（COO確認済み）
3. ✅ 更新後の確認: **完了**（プロダクト名が適切に更新されていることを確認）
4. ✅ プロダクト名の統一: **完了**（すべて「Trap Defense BTC - {言語名}」形式に統一）

**更新確認レポート**: `docs/WHOP_PRODUCT_UPDATE_VERIFICATION_REPORT.md` を参照

---

**最終更新**: 2026-01-11  
**作成者**: COO（Cursor/Composer）  
**承認者**: CEO
