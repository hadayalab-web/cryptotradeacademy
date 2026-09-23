# Whop設定問題と解決策

## 確認日
2025年1月

## 確認された問題

### 1. Whop設定が不十分

#### 問題1: AR市場のプロダクトが存在しない
- **エラー**: `404 Not Found - No such AccessPass found with the provided ID: prod_MD3f0RKwYBHxQ`
- **影響**: AR市場のWhop販売ページが動作しない
- **解決策**: AR市場のプロダクトを作成する必要がある

#### 問題2: プラン説明が不十分
- **EN市場**: プランの説明が1つだけ（`plan_SatV2J5R7gvHn`のみ）
- **他のプラン**: 説明が`null`
- **影響**: Whop販売ページでプランの価値が伝わらない

#### 問題3: プロダクト説明がSSOTと一致していない
- **現状**: プロダクト名のみ（"BTC TrapShield Academy EN"）
- **SSOT要件**: 3つのUSP、5つの特徴、10個のベネフィットを含む詳細な説明が必要
- **影響**: Whop販売ページでプロダクトの価値が伝わらない

#### 問題4: 価格設定の不一致
- **SSOT価格**: $147/$397/$997（月額/3ヶ月/年間）
- **実際のWhop価格**: $69/$165/$588
- **影響**: SSOTと実際の設定が一致していない

#### 問題5: KO/JA/ES/PT-BR市場のプランIDがプレースホルダー
- **現状**: `plan_XX_XXXXX`というプレースホルダー
- **影響**: これらの市場のWhop販売ページが動作しない

---

### 2. Whopの販売ページが未完成

#### 問題1: プロダクト説明の不足
- **現状**: 基本的なプロダクト名のみ
- **必要**: SSOTの3つのUSP、5つの特徴、10個のベネフィットを含む詳細な説明

#### 問題2: プラン説明の不足
- **現状**: プランの説明が`null`または簡易的な説明のみ
- **必要**: 各プランの価値提案、特典、価格根拠を含む詳細な説明

#### 問題3: 特徴・ベネフィットの未反映
- **現状**: Whop販売ページに特徴・ベネフィットが反映されていない
- **必要**: SSOTの5つの特徴、10個のベネフィットを反映

---

## 解決策

### Phase 1: EN市場の設定完成（最優先）

**目的**: EN市場のWhop設定をSSOTベースで完成させる

**手順**:
1. ✅ プロダクト情報の確認（完了）
2. ⏳ プロダクト説明の更新（SSOTベース）
3. ⏳ プラン説明の更新（SSOTベース）
4. ⏳ 価格設定の確認・調整

**スクリプト**: `scripts/whop-complete-setup-from-ssot.js`（作成済み）

**実行方法**:
```bash
node scripts/whop-complete-setup-from-ssot.js
```

**注意**: Whop APIの`Update products`エンドポイントが動作しない可能性があるため、手動更新またはexport/importワークフローを使用する必要がある場合があります。

---

### Phase 2: AR市場のプロダクト作成

**目的**: AR市場のプロダクトを作成

**手順**:
1. Whop DashboardでAR市場のプロダクトを作成
2. プロダクトIDを確認
3. `lib/whop/constants.ts`を更新
4. SSOTベースの設定を適用

**Whop MCP使用**:
```javascript
mcp_whop_whop_create_product({
  name: "CryptoTrade Academy (AR)",
  description: "SSOTベースの説明",
  visibility: "public"
})
```

---

### Phase 3: KO/JA/ES/PT-BR市場のプランID確認・更新

**目的**: 実際のプランIDを取得して`constants.ts`を更新

**手順**:
1. Whop MCPで各市場のプランを取得
2. 実際のプランIDを確認
3. `lib/whop/constants.ts`を更新

**Whop MCP使用**:
```javascript
mcp_whop_whop_get_plans({ product_id: "prod_XXXXX" })
```

---

### Phase 4: SSOTベースのプロダクト説明反映

**目的**: SSOTの内容をWhop販売ページに反映

**必要な情報**:
- 3つのUSP
- 5つの特徴
- 10個のベネフィット
- 価格設定の根拠

**実装方法**:
1. SSOTから必要な情報を抽出
2. Whop APIでプロダクト説明を更新
3. 各プランの説明を更新

**注意**: Whop APIの`Update products`エンドポイントが動作しない場合は、export/importワークフローを使用（`docs/WHOP_EXPORT_IMPORT_WORKFLOW.md`参照）

---

## 現在のWhop設定状況

### EN市場（prod_6RjqaJMGyEw1F）

**プロダクト**:
- Name: "BTC TrapShield Academy EN"
- Description: 未設定（SSOTベースの説明が必要）

**プラン**:
- **月額** (`plan_SatV2J5R7gvHn`): $69/月（30日、renewal、1日トライアル）
  - Description: "Tier1 – AI BTC Pro Briefing monthly subscription"（SSOTベースに更新必要）
- **3ヶ月** (`plan_L1xVv19322pC3`): $165（90日、renewal、1日トライアル）
  - Description: `null`（SSOTベースに更新必要）
- **年間** (`plan_CKOj1QCfnlr1j`): $588（365日、renewal、1日トライアル）
  - Description: `null`（SSOTベースに更新必要）

**問題**:
- 価格がSSOT（$147/$397/$997）と一致していない
- プラン説明が不十分
- プロダクト説明が未設定

---

### AR市場（prod_MD3f0RKwYBHxQ）

**問題**: プロダクトが存在しない（404エラー）

**解決策**: プロダクトを作成する必要がある

---

### KO/JA/ES/PT-BR市場

**問題**: プランIDがプレースホルダー（`plan_XX_XXXXX`）

**解決策**: 実際のプランIDを取得して更新する必要がある

---

## 次のステップ

### 🔴 最優先（MVPローンチ前に必須）

1. **EN市場のWhop設定完成**
   - プロダクト説明の更新（SSOTベース）
   - プラン説明の更新（SSOTベース）
   - 価格設定の確認（SSOTと実際の設定の整合性確認）

2. **AR市場のプロダクト作成**
   - Whop Dashboardでプロダクト作成
   - SSOTベースの設定を適用

### 🟡 次優先（ローンチ後1週間以内）

3. **KO/JA/ES/PT-BR市場のプランID確認・更新**
   - 実際のプランIDを取得
   - `constants.ts`を更新

4. **全市場のSSOTベース設定適用**
   - プロダクト説明の更新
   - プラン説明の更新

---

## 参考ドキュメント

- SSOT: `cryptosignal-ai/docs/SSOT_TRAP_DEFENSE_BTC.md`
- Whop MCP: `scripts/whop-mcp-server.js`
- Export/Importワークフロー: `docs/WHOP_EXPORT_IMPORT_WORKFLOW.md`
- 設定スクリプト: `scripts/whop-complete-setup-from-ssot.js`
