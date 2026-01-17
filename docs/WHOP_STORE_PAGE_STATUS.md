# Whopストアページ・ディスカバーステータス確認結果
**作成日時**: 2026-01-17 14:07:03  
**作成日**: 2026-01-17  

**確認日**: 2026-01-27  
**目的**: VSLワークフロー開始に伴うストアページオープン・ディスカバーステータス確認

---

## ✅ 確認結果

### ストアページの可視性

**全6プロダクトの可視性**: ✅ **すべて `visible`**

| プロダクト | ID | 可視性 | ステータス |
|-----------|-----|--------|----------|
| Trap Defence BTC - English | `prod_6RjqaJMGyEw1F` | `visible` | ✅ オープン |
| Trap Defense BTC - Japanese | `prod_756mUZhSfLAkL` | `visible` | ✅ オープン |
| Trap Defense BTC - Korean | `prod_HouQTKTN1F7vD` | `visible` | ✅ オープン |
| Trap Defense BTC - Spanish | `prod_Eg1V8et0WTg69` | `visible` | ✅ オープン |
| Trap Defense BTC - Arabic | `prod_l4ipnvNhwFpdQ` | `visible` | ✅ オープン |
| Trap Defense BTC - Portuguese | `prod_Cpz4oQla16GUB` | `visible` | ✅ オープン |

**結論**: ストアページは既にオープン状態です。

---

## 📋 ディスカバーステータスについて

### 現在の状態

ダッシュボード上では「ディスカバー・ステータス」が「未上場 - ディスカバーに掲載」と表示されています。

### Whop APIでの制御方法

**`visibility`フィールド**:
- `visible`: ストアページに表示、ディスカバーにも掲載可能
- `hidden`: ストアページに非表示、ディスカバーにも非掲載
- `archived`: アーカイブ済み
- `quick_link`: クイックリンクのみ

**注意**: 
- `visibility: "visible"` に設定すると、ストアページに表示され、ディスカバーにも掲載可能になります
- ただし、ディスカバーへの実際の掲載は、Whop側の審査・条件（画像、説明文など）を満たす必要があります

---

## 🔧 ディスカバーステータスを変更する方法

### 方法1: API経由で`visibility`を確認・更新

```bash
# 現在の状態確認
node scripts/whop-cli.js products:get --id=prod_6RjqaJMGyEw1F --pretty

# visibilityをvisibleに設定（既にvisibleの場合は変更不要）
node scripts/whop-cli.js products:update --id=prod_6RjqaJMGyEw1F --data=scripts/whop-samples/product-visibility-update.json --apply
```

### 方法2: 一括確認スクリプト

```bash
node scripts/update-whop-products-visibility.js
```

---

## 📝 ディスカバーステータスの変更方法

### ⚠️ 重要な発見

**ディスカバーステータスはAPIでは制御できません。**

- Whop API v2には`listed_on_discover`や`discoverable`のようなフィールドは存在しません
- `visibility: "visible"`を設定しても、ディスカバーには自動的に掲載されません
- ディスカバーへの掲載は、**ダッシュボードで手動で設定する必要があります**

### 🔧 ディスカバーに掲載する手順

1. **Whopダッシュボードにログイン**
2. **各プロダクトの「Manage Whop」→「List on Discover」を有効化**
3. **審査完了を待つ（通常5-10分）**

### 📋 ディスカバー掲載の条件

以下の条件を満たしている必要があります：

- ✅ `visibility: "visible"` が設定されている
- ✅ タイトルが設定されている
- ✅ 説明文が設定されている
- ✅ ヘッドラインが設定されている
- ✅ 機能説明（product_highlights）が設定されている
- ✅ プランが設定されている
- ✅ エクスペリエンスが設定されている
- ✅ ロゴ・画像が設定されている
- ✅ カテゴリが設定されている
- ✅ 支払い設定が完了している

### 🔍 条件チェックスクリプト

```bash
node scripts/check-discover-status.js
```

このスクリプトで、各プロダクトがディスカバー掲載の条件を満たしているか確認できます。

---

## 📝 次のステップ

1. ✅ **ストアページの可視性**: 既に`visible`で問題なし
2. ⚠️ **ディスカバーステータス**: 
   - APIでは制御不可
   - ダッシュボードで「List on Discover」を有効化する必要がある
   - 審査は通常5-10分で完了

---

**確認者**: COO (Cursor/Composer 1)  
**最終更新**: 2026-01-17 14:07:03
