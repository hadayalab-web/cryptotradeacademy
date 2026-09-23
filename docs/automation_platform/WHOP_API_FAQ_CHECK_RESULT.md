# Whop API FAQチェック結果レポート

**確認日**: 2026-01-11  
**確認者**: COO（Cursor/Composer）  
**使用API**: Whop API v2  
**参照スコープ**: Export products, Read products, Update products

---

## 📋 確認対象プロダクト

| プロダクトID | 市場 | プロダクト名 |
|------------|------|------------|
| `prod_6RjqaJMGyEw1F` | EN | Trap Defense BTC - English |
| `prod_Eg1V8et0WTg69` | ES | Trap Deffenca BTC - ES |
| `prod_l4ipnvNhwFpdQ` | AR | Trap Deffense BTC - AR |
| `prod_Cpz4oQla16GUB` | PT-BR | Trap Deffence BTC - PT-BR |
| `prod_HouQTKTN1F7vD` | KO | Trap Deffence BTC - KO |
| `prod_756mUZhSfLAkL` | JA | Trap Deffence BTC - JA |

---

## 🔍 API確認結果

### 1. `/api/v2/products/{id}` エンドポイント

**取得できた情報**:
- ✅ `id`: プロダクトID
- ✅ `title`: プロダクトタイトル
- ✅ `name`: プロダクト名
- ✅ `visibility`: 公開状態
- ✅ `created_at`: 作成日時
- ✅ `company_id`: 会社ID
- ✅ `experiences`: Experience IDの配列（例: `["exp_bDV7AnWGZGZeMt"]`）
- ✅ `plans`: プランIDの配列

**取得できなかった情報**:
- ❌ `description`: FAQ情報を含む説明文
- ❌ `faqs`: FAQ情報の配列
- ❌ `headline`: ヘッドライン
- ❌ `features`: 特徴の配列
- ❌ `slug`: プロダクトスラッグ

### 2. `/api/v2/products/{id}?expand[]=experiences` エンドポイント

**試行結果**: 
- `expand`パラメータを使用して`experiences`の詳細情報を取得しようとしましたが、FAQ情報は含まれていませんでした。

### 3. `/api/v2/experiences/{id}` エンドポイント

**未確認**: 
- ExperienceエンドポイントでFAQ情報が取得できるかは未確認です。

---

## 📊 各プロダクトの取得結果

### EN (`prod_6RjqaJMGyEw1F`)

```json
{
  "id": "prod_6RjqaJMGyEw1F",
  "title": "Trap Defense BTC - English",
  "name": "Trap Defense BTC - English",
  "visibility": "visible",
  "created_at": 1763136259,
  "company_id": "biz_BGcUmx3gOmZqbK",
  "experiences": ["exp_bDV7AnWGZGZeMt"],
  "plans": [
    "plan_SatV2J5R7gvHn",
    "plan_L1xV19322pC3",
    "plan_CKOj1QCfnlr1j"
  ]
}
```

**FAQ情報**: ❌ 取得できず

### ES (`prod_Eg1V8et0WTg69`)

```json
{
  "id": "prod_Eg1V8et0WTg69",
  "title": "Trap Deffenca BTC - ES",
  "name": "Trap Deffenca BTC - ES",
  "visibility": "visible",
  "created_at": 1767406936,
  "company_id": "biz_BGcUmx3gOmZqbK",
  "experiences": ["exp_USP1DZTV3llcup"],
  "plans": [
    "plan_NJWa1JUcDx5Fa",
    "plan_kQhbzBdoir5xC",
    "plan_l2chYQncOcB1I"
  ]
}
```

**FAQ情報**: ❌ 取得できず

### AR (`prod_l4ipnvNhwFpdQ`)

```json
{
  "id": "prod_l4ipnvNhwFpdQ",
  "title": "Trap Deffense BTC - AR",
  "name": "Trap Deffense BTC - AR",
  "visibility": "visible",
  "created_at": 1767406985,
  "company_id": "biz_BGcUmx3gOmZqbK",
  "experiences": ["exp_p1raYwz8X49sDv"],
  "plans": [
    "plan_trhNqPmGEBV49",
    "plan_BFAUO1jBunao6",
    "plan_TZLVX52Fy9iV2"
  ]
}
```

**FAQ情報**: ❌ 取得できず

### PT-BR (`prod_Cpz4oQla16GUB`)

```json
{
  "id": "prod_Cpz4oQla16GUB",
  "title": "Trap Deffence BTC - PT-BR",
  "name": "Trap Deffence BTC - PT-BR",
  "visibility": "visible",
  "created_at": 1767407016,
  "company_id": "biz_BGcUmx3gOmZqbK",
  "experiences": ["exp_8naLeXfZOaGO57"],
  "plans": [
    "plan_o0zp6ijFsahMC",
    "plan_0NuklMva0SQbz",
    "plan_zWA7dBw46iQic"
  ]
}
```

**FAQ情報**: ❌ 取得できず

### KO (`prod_HouQTKTN1F7vD`)

```json
{
  "id": "prod_HouQTKTN1F7vD",
  "title": "Trap Deffence BTC - KO",
  "name": "Trap Deffence BTC - KO",
  "visibility": "visible",
  "created_at": 1767407041,
  "company_id": "biz_BGcUmx3gOmZqbK",
  "experiences": ["exp_8naLeXfZOaGO57"],
  "plans": [
    "plan_LZf2Jium9Gk3h",
    "plan_8pMQO0mlMuLj6",
    "plan_QlHefoBY983BV"
  ]
}
```

**FAQ情報**: ❌ 取得できず

### JA (`prod_756mUZhSfLAkL`)

```json
{
  "id": "prod_756mUZhSfLAkL",
  "title": "Trap Deffence BTC - JA",
  "name": "Trap Deffence BTC - JA",
  "visibility": "visible",
  "created_at": 1767407069,
  "company_id": "biz_BGcUmx3gOmZqbK",
  "experiences": ["exp_GGwCRve0fComaD"],
  "plans": [
    "plan_0b6EOuqxk6TPb",
    "plan_2vKR0Xd77d7Rp",
    "plan_moF8lZrc4nElw"
  ]
}
```

**FAQ情報**: ❌ 取得できず

---

## 🔍 結論

### Whop API v2でのFAQ情報取得について

**現状**: 
- ❌ `/api/v2/products/{id}`エンドポイントからはFAQ情報を直接取得できません
- ❌ `expand`パラメータを使用してもFAQ情報は含まれていません
- ❓ `/api/v2/experiences/{id}`エンドポイントでの取得は未確認

**推測される理由**:
1. FAQ情報はWhop DashboardのUIで管理されており、APIでは公開されていない可能性
2. FAQ情報は別のエンドポイント（例: `/api/v2/products/{id}/faqs`）で取得する必要がある可能性
3. FAQ情報は`experiences`の中に含まれているが、現在のAPIキーの権限では取得できない可能性

### 確認方法

**オプション1: Whop APIドキュメントを確認**
- [Whop API v2 Products Documentation](https://dev.whop.com/api-reference/v2/products/)
- FAQ情報を取得する専用エンドポイントがあるか確認

**オプション2: Whop Dashboardで確認**
- 各プロダクトページのFAQセクションを手動で確認
- FAQが正しく表示されているか確認

**オプション3: Experienceエンドポイントを確認**
- `/api/v2/experiences/{id}`エンドポイントでFAQ情報が取得できるか確認

---

## 💡 推奨事項

1. **Whop APIドキュメントの確認**: FAQ情報を取得する方法が記載されているか確認してください。

2. **Whop Dashboardでの手動確認**: APIで取得できない場合は、Whop Dashboardで各プロダクトのFAQセクションを確認してください。

3. **APIキーの権限確認**: 現在のAPIキーにFAQ情報を取得する権限があるか確認してください。

4. **Whopサポートへの問い合わせ**: FAQ情報をAPIで取得する方法が不明な場合は、Whopサポートに問い合わせることを検討してください。

---

## 📝 次のステップ

1. ✅ プロダクト基本情報の取得: 完了
2. ❓ ExperienceエンドポイントでのFAQ情報取得: 未確認
3. ❓ Whop APIドキュメントでのFAQ取得方法確認: 推奨
4. ✅ Whop Dashboardでの手動確認: 推奨（CEOが実施）

---

**最終更新**: 2026-01-11  
**作成者**: COO（Cursor/Composer）
