# Whop EN版以外（JA/KO/ES/AR/PT-BR）完成計画

**作成日**: 2026-01-15  
**目的**: 実行フェーズ開始に向けて、WhopのEN版以外の5言語版をすべて完成させる

---

## 📊 現状確認

### ✅ プロダクト・プラン状況

| 言語 | プロダクトID | プラン数 | 価格設定 | 状態 |
|------|------------|---------|---------|------|
| **EN** | `prod_6RjqaJMGyEw1F` | 6件 | $69/$165/$588 | ✅ **完成** |
| **JA** | `prod_756mUZhSfLAkL` | 3件 | $117/$317/$797 | ⏳ 説明文なし |
| **KO** | `prod_HouQTKTN1F7vD` | 3件 | $117/$317/$797 | ⏳ 説明文なし |
| **ES** | `prod_Eg1V8et0WTg69` | 3件 | $117/$317/$797 | ⏳ 説明文なし |
| **AR** | `prod_l4ipnvNhwFpdQ` | 3件 | $97/$267/$597 | ⏳ 説明文なし |
| **PT-BR** | `prod_Cpz4oQla16GUB` | 3件 | $117/$317/$797 | ⏳ 説明文なし |

**確認結果**: 全6言語のプロダクト・プランは存在するが、**説明文が「なし」**の状態

---

## 🎯 完成に必要な作業

### 1. Whopプロダクトページのコンテンツ追加

各言語版に以下を追加：

#### 1.1 Headline（ヘッドライン）
- **文字数制限**: 30字
- **内容**: EN版をベースに各言語に翻訳

#### 1.2 Description（説明文）
- **文字数制限**: 1500字（プレーンテキストのみ）
- **内容**: SSOTベースの説明文
  - 4つのAIの連携説明
  - 5つの主要なベネフィット
  - 「70%勝利の準備戦略」の説明

#### 1.3 Features（特徴リスト）
- **文字数制限**: 140字×5-7項目
- **内容**: 
  - Trap Defense Engine
  - Information Priority
  - Story Format
  - News Program Format
  - 70% Victory Preparation Strategy
  - Clear Call to Action
  - Dr. Grok Psychological Support

#### 1.4 FAQ（よくある質問）
- **文字数制限**: 質問255字+回答255字×5-8項目
- **内容**: EN版をベースに各言語に翻訳

---

### 2. 「1日無料トライアル」記載の削除

**現状**: 全言語版で「1日無料トライアル」の記載が存在する可能性
**対応**: Whop Dashboardで確認し、存在する場合は削除

---

### 3. VSL2の実装

**EN版**: ✅ VSL2 YouTube URL実装済み（`https://youtu.be/vjz896hTPPw`）
**他5言語版**: ⏳ VSL2未実装

**必要な作業**:
- 各言語版のVSL2 YouTube URLを取得・設定
- WhopプロダクトページにVSL2を埋め込み

---

## 📋 実装タスクリスト

### Phase 1: Whopコンテンツ準備（各言語版）

#### JA版
- [ ] Headline作成（30字）
- [ ] Description作成（1500字、SSOTベース）
- [ ] Features作成（140字×5-7項目）
- [ ] FAQ作成（質問+回答×5-8項目）
- [ ] 「1日無料トライアル」記載削除確認
- [ ] VSL2 YouTube URL取得・設定

#### KO版
- [ ] Headline作成（30字）
- [ ] Description作成（1500字、SSOTベース）
- [ ] Features作成（140字×5-7項目）
- [ ] FAQ作成（質問+回答×5-8項目）
- [ ] 「1日無料トライアル」記載削除確認
- [ ] VSL2 YouTube URL取得・設定

#### ES版
- [ ] Headline作成（30字）
- [ ] Description作成（1500字、SSOTベース）
- [ ] Features作成（140字×5-7項目）
- [ ] FAQ作成（質問+回答×5-8項目）
- [ ] 「1日無料トライアル」記載削除確認
- [ ] VSL2 YouTube URL取得・設定

#### AR版
- [ ] Headline作成（30字）
- [ ] Description作成（1500字、SSOTベース）
- [ ] Features作成（140字×5-7項目）
- [ ] FAQ作成（質問+回答×5-8項目）
- [ ] 「1日無料トライアル」記載削除確認
- [ ] VSL2 YouTube URL取得・設定

#### PT-BR版
- [ ] Headline作成（30字）
- [ ] Description作成（1500字、SSOTベース）
- [ ] Features作成（140字×5-7項目）
- [ ] FAQ作成（質問+回答×5-8項目）
- [ ] 「1日無料トライアル」記載削除確認
- [ ] VSL2 YouTube URL取得・設定

---

### Phase 2: Whop Dashboardでの更新

#### 各言語版の更新手順
1. [Whop Dashboard](https://whop.com/dashboard)にログイン
2. **Products** → 該当言語のプロダクトを選択
3. **Edit** をクリック
4. 以下の順序で更新：
   - **Headline** フィールドにHeadlineをコピー&ペースト
   - **Description** フィールドにDescriptionをコピー&ペースト（マークダウン記号なしのプレーンテキスト）
   - **Features** セクションにFeaturesを1つずつ追加
   - **FAQ** セクションにFAQを1つずつ追加
   - **「1日無料トライアル」の記載を削除**（存在する場合）
   - **VSL2 YouTube URLを設定**（存在する場合）
5. **Save** または **Update** をクリック

---

## 📚 参考資料

### EN版完成例
- **ドキュメント**: `docs/WHOP_EN_COPY_PASTE_READY_FINAL.md`
- **Whop URL**: https://whop.com/products/prod_6RjqaJMGyEw1F

### 全言語版コンテンツ（改善版）
- **ドキュメント**: `data/whop-content-all-languages-improved.md`
- **内容**: EN版をベースに各言語に翻訳済みのコンテンツ

### プロダクト情報
- **ドキュメント**: `docs/WHOP_ALL_PRODUCTS_PRICING.md`
- **内容**: 全6言語のプロダクトID、プランID、価格情報

---

## 🎯 優先順位

### 🔴 最優先（実行フェーズ開始前に必須）

1. **JA版完成**（日本市場は重要）
   - Headline、Description、Features、FAQ追加
   - 「1日無料トライアル」削除
   - VSL2実装

2. **KO版完成**（韓国市場は重要）
   - Headline、Description、Features、FAQ追加
   - 「1日無料トライアル」削除
   - VSL2実装

### 🟡 次優先（実行フェーズ開始後1週間以内）

3. **ES版完成**
4. **AR版完成**
5. **PT-BR版完成**

---

## ✅ 完成チェックリスト

### 各言語版の完成基準

- [ ] Headlineが設定されている（30字以内）
- [ ] Descriptionが設定されている（1500字以内、SSOTベース）
- [ ] Featuresが5-7項目設定されている（各140字以内）
- [ ] FAQが5-8項目設定されている（各質問+回答255字以内）
- [ ] 「1日無料トライアル」の記載が削除されている
- [ ] VSL2 YouTube URLが設定されている（可能な場合）
- [ ] 価格表示が正しい（`docs/WHOP_ALL_PRODUCTS_PRICING.md`参照）

---

## 🚀 次のステップ

1. **Gemini CMOに依頼**: 各言語版のHeadline、Description、Features、FAQを作成
2. **COO実装**: 作成されたコンテンツをWhop Dashboardに反映
3. **CEO確認**: 各言語版のWhopページを確認し、問題があれば修正

---

**作成者**: COO（Cursor/Composer 1）  
**状態**: ⏳ **実行フェーズ開始準備中**
