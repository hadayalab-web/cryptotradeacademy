# Whopページ更新ガイド（CEO向け）

**作成日**: 2026-01-14  
**目的**: 改善版WhopコンテンツをWhop Dashboardに反映する手順

---

## 📊 現状

### ✅ 完了済み
- ✅ **改善版コンテンツ作成完了**: `data/whop-content-all-languages-improved.md`
- ✅ **全6言語版のコンテンツ準備完了**（EN, JA, KO, ES, AR, PT-BR）

### ⚠️ API自動更新の制約
- ❌ **Whop APIの更新権限不足**: 現在のAPIキーには読み取り権限のみ
- ❌ **自動更新スクリプト**: 権限不足により401エラーで動作しない

### 📋 結論
**Whopページの更新は、現在のところCEOがWhop Dashboardで手動更新する必要があります。**

---

## 🎯 更新手順（CEO向け）

### Step 1: Whop Dashboardにアクセス

1. [Whop Dashboard](https://whop.com/dashboard)にログイン
2. **Products** → 更新したい市場のプロダクトを選択

### Step 2: 改善版コンテンツを確認

**ファイル**: `data/whop-content-all-languages-improved.md`

各言語版のコンテンツがJSON形式で記載されています：
- `headline`: ヘッドライン（80字以内）
- `description`: 説明文（1500字以内）
- `features`: 特徴リスト（7項目）
- `faq`: FAQ（8項目）

### Step 3: 各市場のプロダクトページを更新

#### EN市場
- **プロダクトID**: `prod_6RjqaJMGyEw1F`
- **Whop URL**: https://whop.com/products/prod_6RjqaJMGyEw1F
- **コンテンツ**: `data/whop-content-all-languages-improved.md`の`"EN"`セクション

#### JA市場
- **プロダクトID**: `prod_756mUZhSfLAkL`
- **Whop URL**: https://whop.com/products/prod_756mUZhSfLAkL
- **コンテンツ**: `data/whop-content-all-languages-improved.md`の`"JA"`セクション

#### KO市場
- **プロダクトID**: `prod_HouQTKTN1F7vD`
- **Whop URL**: https://whop.com/products/prod_HouQTKTN1F7vD
- **コンテンツ**: `data/whop-content-all-languages-improved.md`の`"KO"`セクション

#### ES市場
- **プロダクトID**: `prod_Eg1V8et0WTg69`
- **Whop URL**: https://whop.com/products/prod_Eg1V8et0WTg69
- **コンテンツ**: `data/whop-content-all-languages-improved.md`の`"ES"`セクション

#### AR市場
- **プロダクトID**: `prod_l4ipnvNhwFpdQ`
- **Whop URL**: https://whop.com/products/prod_l4ipnvNhwFpdQ
- **コンテンツ**: `data/whop-content-all-languages-improved.md`の`"AR"`セクション

#### PT-BR市場
- **プロダクトID**: `prod_Cpz4oQla16GUB`
- **Whop URL**: https://whop.com/products/prod_Cpz4oQla16GUB
- **コンテンツ**: `data/whop-content-all-languages-improved.md`の`"PT-BR"`セクション

### Step 4: 各フィールドを更新

Whop Dashboardの各プロダクトページで以下を更新：

1. **Headline**: JSONの`headline`をコピー&ペースト
2. **Description**: JSONの`description`をコピー&ペースト
3. **Features**: JSONの`features`配列の各項目をコピー&ペースト
4. **FAQ**: JSONの`faq`配列の各質問と回答をコピー&ペースト

### Step 5: 保存

各市場のプロダクトページで「Save」または「Update」をクリック

---

## 🔄 自動化のオプション（将来）

### オプション1: APIキーの権限更新

1. Whop Dashboard → **Settings** → **API Keys**
2. 現在のAPIキーの権限を確認
3. **`access_pass:update`**権限を有効化
4. 新しいAPIキーを生成（必要に応じて）
5. `.env`ファイルの`WHOP_API_KEY`を更新
6. `scripts/sync-whop-products.ts`を実行

### オプション2: 手動更新スクリプトの作成

改善版コンテンツを読み込んで、Whop Dashboardの更新手順を自動生成するスクリプトを作成可能です。

---

## 📝 改善版コンテンツの主な変更点

### 1. Headline
- **変更前**: "Master the Art of Defensive Trading with AI."
- **変更後**: "Master the Art of Defensive Trading with **4 AI-Powered Intelligence**."

### 2. Description
- **追加**: 「🛡️ 4 AI Models Working Together」セクション
- **追加**: 「✨ 5 Key Benefits You Get」セクション
- **変更**: 「AI-Powered Clarity」→「4 AI Synergy」

### 3. Features
- **追加**: 5つのベネフィットを明確に表示
- **追加**: 各ベネフィットの具体的な説明

### 4. FAQ
- **追加**: 「How is Trap Defence BTC different from other AI signal services?」
- **追加**: 「What are the 5 key benefits?」
- **追加**: 「What is the '70% Victory Preparation Strategy'?」
- **改善**: 既存のFAQにも5つのベネフィットを反映

### 5. 「70%待機」→「70%勝利の準備」
- 全コンテンツで「70%待機」を「70%勝利の準備」に言い換え

---

## ⏱️ 所要時間の目安

- **1市場あたり**: 5-10分
- **全6市場**: 30-60分

---

## ✅ 更新完了チェックリスト

- [ ] EN市場の更新完了
- [ ] JA市場の更新完了
- [ ] KO市場の更新完了
- [ ] ES市場の更新完了
- [ ] AR市場の更新完了
- [ ] PT-BR市場の更新完了
- [ ] 各市場のプロダクトページで表示確認
- [ ] テスト購入で検証（オプション）

---

## 📞 サポート

更新中に問題が発生した場合：
1. `data/whop-content-all-languages-improved.md`のコンテンツを確認
2. Whop Dashboardのエラーメッセージを確認
3. COOに報告

---

**作成者**: COO（Cursor/Composer 1）  
**状態**: ✅ 改善版コンテンツ準備完了、手動更新待ち
