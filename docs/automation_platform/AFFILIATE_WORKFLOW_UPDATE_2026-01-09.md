# アフィリエイターワークフロー - 大幅アップデート（2026-01-09）

**更新日**: 2026-01-09  
**目的**: 安全ロック設計に基づくGPT分析機能の追加

---

## 🎯 更新内容

### 1. GPT分析ワークフローの追加 ⭐ NEW

#### `/api/workflows/affiliate-analyze`
- **目的**: Grokでストックした候補をGPTで分析・優先順位付け
- **安全ロック設計**: Grokで大量ストック → GPTで分析
- **機能**:
  - 優先順位付け（priorityScore: 1-10）
  - アプローチ戦略提案（Telegram/Email/Both）
  - コンテンツスタイル分析
  - インサイト生成

#### `lib/affiliate/gpt-analyzer.ts`
- **`analyzeCandidates()`**: 候補の優先順位付け分析
- **`analyzeContentStyle()`**: コンテンツスタイル分析

---

### 2. 統合ワークフローへのGPT分析ステップ追加 ⭐ NEW

#### `/api/workflows/affiliate-integrated`
- **Step 3**: GPT分析（Grokでストックした候補を分析）
- **パラメータ**: `analyzeCandidates?: boolean` (デフォルト: `true`)
- **結果**: 
  - `candidatesAnalyzed`: 分析した候補数
  - `highPriorityCandidates`: 高優先度候補数

---

### 3. affiliate-batch-searchの改善 ⭐ NEW

#### `/api/workflows/affiliate-batch-search`
- **変更**: `maxCandidatesPerQuery`のデフォルト値を`50`→`100`に増加
- **目的**: Grokでより多くの候補をストック

---

## 🔒 安全ロック設計

### 設計原則: **Grokで大量ストック → GPTで分析**

```
┌─────────────────────────────────────┐
│  Step 1: Grok（情報収集・ストック）  │
│  - リアルタイム情報取得              │
│  - X/Twitter分析                     │
│  - 大量候補の検索・保存              │
│  - データベース化（CSV保存）         │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  Step 2: GPT（分析・判断）           │
│  - Grokのデータを基に分析            │
│  - 優先順位付け                      │
│  - コンテンツスタイル分析            │
│  - アプローチタイミング判断          │
└─────────────────────────────────────┘
```

### 安全ロックの効果

1. **データの保護**: GrokでストックしたデータはCSVに保存、GPT分析が失敗してもデータは安全
2. **エラーの分離**: GrokのエラーとGPTのエラーが分離され、再分析が可能
3. **コスト最適化**: Grokで大量ストック（低コスト・高速）、GPTで必要な分だけ分析（高品質・効率的）
4. **品質の保証**: Grokで最新情報を正確に収集、GPTで高品質な分析・判断を実行

---

## 📊 使用例

### GPT分析ワークフロー（独立実行）

```bash
curl -X POST https://your-domain.com/api/workflows/affiliate-analyze \
  -H "Content-Type: application/json" \
  -d '{
    "marketCode": "EN",
    "status": "New",
    "limit": 50,
    "analysisType": "priority_ranking"
  }'
```

**レスポンス例**:
```json
{
  "success": true,
  "marketCode": "EN",
  "candidatesAnalyzed": 50,
  "analysisType": "priority_ranking",
  "analysis": {
    "priorityRanking": [
      {
        "candidateId": 1,
        "priorityScore": 9.5,
        "reason": "コンテンツスタイルがTrap Defenseに最適、フォロワー層がBTCトレーダー中心",
        "recommendedApproach": "Telegram",
        "bestTiming": "BTC価格変動時",
        "contentStyle": "教育系",
        "audienceMatch": "高",
        "conversionPotential": "High"
      }
    ],
    "insights": [
      "候補の80%がX/Twitter中心、Telegram併用は30%",
      "エンゲージメント率が高い候補は教育コンテンツが多い"
    ],
    "summary": {
      "totalAnalyzed": 50,
      "highPriority": 15,
      "mediumPriority": 25,
      "lowPriority": 10
    }
  }
}
```

### 統合ワークフロー（GPT分析含む）

```bash
curl -X POST https://your-domain.com/api/workflows/affiliate-integrated \
  -H "Content-Type: application/json" \
  -d '{
    "marketCode": "EN",
    "whopProductId": "prod_xxx",
    "searchQueries": ["crypto trader", "BTC analyst"],
    "maxCandidates": 50,
    "analyzeCandidates": true,
    "sendTelegramDM": false,
    "sendEmail": false
  }'
```

---

## 🔧 必要な環境変数

### 追加が必要な環境変数

```env
# OpenAI API（GPT分析用） ⭐ NEW
OPENAI_API_KEY=sk_xxx
```

---

## 📋 デプロイ前チェックリスト

### ✅ 実装完了
- [x] GPT分析ライブラリ実装済み
- [x] `/api/workflows/affiliate-analyze`エンドポイント実装済み
- [x] 統合ワークフローにGPT分析ステップ追加済み
- [x] affiliate-batch-search改善済み（maxCandidatesPerQuery: 50→100）

### ⚠️ 環境変数設定
- [ ] OpenAI API Key設定（GPT分析用）

### ⚠️ 動作確認
- [ ] GPT分析ワークフローのテスト
- [ ] 統合ワークフロー（GPT分析含む）のテスト

---

## 🚀 デプロイ手順

### 1. 環境変数の設定

Vercel Dashboardで以下の環境変数を追加：

```env
OPENAI_API_KEY=sk_xxx
```

### 2. デプロイ実行

```bash
git add .
git commit -m "feat: GPT分析ワークフロー追加（安全ロック設計）"
git push origin main
```

### 3. 動作確認

デプロイ後、GPT分析ワークフローをテスト：

```bash
curl -X POST https://your-domain.com/api/workflows/affiliate-analyze \
  -H "Content-Type: application/json" \
  -d '{
    "marketCode": "EN",
    "status": "New",
    "limit": 10,
    "analysisType": "priority_ranking"
  }'
```

---

## ✅ まとめ

**安全ロック設計に基づくGPT分析機能を追加し、大幅アップデートを完了しました。**

- ✅ GPT分析ワークフロー実装完了
- ✅ 統合ワークフローにGPT分析ステップ追加
- ✅ affiliate-batch-search改善（より多くの候補をストック）
- ✅ 安全ロック設計の実装完了

**タイマー（cron）は未設定のまま、LPデプロイまで待機します。**
