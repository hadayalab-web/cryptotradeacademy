# アフィリエイター募集自動化ワークフロー - デプロイ準備状況

**確認日**: 2026-01-09  
**更新日**: 2026-01-09  
**ステータス**: ✅ **大幅アップデート完了 - デプロイスタンバイOK**

---

## ✅ 実装完了項目

### 1. アフィリエイトリンク生成機能

#### ✅ APIエンドポイント
- **`/api/affiliate/link-generate`** (`app/api/affiliate/link-generate/route.ts`)
  - アフィリエイトリンクを自動生成
  - 市場別・プラン別対応
  - エラーハンドリング完備

#### ✅ ライブラリ関数
- **`lib/whop/affiliate-links.ts`**
  - `generateAffiliateLink()` - 単一リンク生成
  - `generateAllAffiliateLinks()` - 全プランリンク生成
  - Whop API統合準備済み

### 2. 登録フォーム統合

#### ✅ RegistrationFormコンポーネント
- **`components/RegistrationForm.tsx`**
  - 登録後に自動的にアフィリエイトリンクを生成
  - エラーハンドリング完備（リンク生成失敗時も登録は成功）

#### ✅ AffiliateLinkDisplayコンポーネント
- **`components/AffiliateLinkDisplay.tsx`**
  - アフィリエイトリンクとコードを表示
  - ワンクリックコピー機能
  - UI/UX最適化済み

### 3. 統合ワークフロー

#### ✅ 統合アフィリエイトワークフロー
- **`/api/workflows/affiliate-integrated`** (`app/api/workflows/affiliate-integrated/route.ts`)
  - アフィリエイト展開ワークフロー統合
  - Telegram DM送信
  - Resend Email送信
  - エラーハンドリング完備

#### ✅ アフィリエイト展開ワークフロー
- **`/api/workflows/affiliate-deployment`** (`app/api/workflows/affiliate-deployment/route.ts`)
  - LP情報保存準備
  - Whop Product情報取得
  - 候補検索準備

---

## 🔧 必要な環境変数

### 必須環境変数

以下の環境変数がVercelに設定されている必要があります：

```env
# Whop API
WHOP_API_KEY=whop_xxx
WHOP_PRODUCT_ID_EN=prod_xxx
WHOP_PRODUCT_ID_AR=prod_xxx
WHOP_PRODUCT_ID_KO=prod_xxx
WHOP_PRODUCT_ID_JA=prod_xxx
WHOP_PRODUCT_ID_ES=prod_xxx
WHOP_PRODUCT_ID_PT_BR=prod_xxx

# Telegram Bot（6言語対応）
TELEGRAM_BOT_TOKEN=xxx
TELEGRAM_BOT_TOKEN_EN=xxx
TELEGRAM_BOT_TOKEN_AR=xxx
TELEGRAM_BOT_TOKEN_KO=xxx
TELEGRAM_BOT_TOKEN_JA=xxx
TELEGRAM_BOT_TOKEN_ES=xxx
TELEGRAM_BOT_TOKEN_PT_BR=xxx

# Resend API
RESEND_API_KEY=re_xxx

# App URL（本番環境用）
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### オプション環境変数

```env
# アフィリエイト検索設定
AFFILIATE_SEARCH_MAX_CANDIDATES=20
AFFILIATE_SEARCH_MIN_MATCH_SCORE=7

# Telegram DM設定
TELEGRAM_DM_RATE_LIMIT=10  # 1分あたりの送信数
TELEGRAM_DM_DELAY_MS=6000  # 送信間隔（ミリ秒）
```

---

## 📋 デプロイ前チェックリスト

### ✅ コード実装
- [x] アフィリエイトリンク生成API実装済み
- [x] 登録フォーム統合済み
- [x] アフィリエイトリンク表示コンポーネント実装済み
- [x] 統合ワークフロー実装済み
- [x] **GPT分析ワークフロー実装済み** ⭐ NEW
- [x] **GPT分析ライブラリ実装済み** ⭐ NEW
- [x] **affiliate-batch-search改善（maxCandidatesPerQuery: 50→100）** ⭐ NEW
- [x] エラーハンドリング完備

### ⚠️ 環境変数設定
- [ ] Whop API Key設定
- [ ] Whop Product IDs設定（6市場）
- [ ] Telegram Bot Tokens設定（6言語）
- [ ] Resend API Key設定
- [ ] **OpenAI API Key設定（GPT分析用）** ⭐ NEW
- [ ] NEXT_PUBLIC_APP_URL設定

### ⚠️ 動作確認
- [ ] ローカル環境での動作確認
- [ ] アフィリエイトリンク生成のテスト
- [ ] 登録フォームの動作確認
- [ ] Telegram DM送信のテスト
- [ ] Resend Email送信のテスト

---

## 🚀 デプロイ手順

### 1. 環境変数の設定

Vercel Dashboardで以下の環境変数を設定：

1. **Project Settings** → **Environment Variables** を開く
2. 上記の必須環境変数を追加
3. **Production**, **Preview**, **Development** すべてに設定

### 2. デプロイ実行

```bash
# GitHubにpush（自動デプロイ）
git add .
git commit -m "feat: アフィリエイター募集自動化ワークフロー実装完了"
git push origin main
```

または、Vercel CLIで直接デプロイ：

```bash
vercel --prod
```

### 3. 動作確認

デプロイ後、以下のエンドポイントをテスト：

```bash
# アフィリエイトリンク生成テスト
curl -X POST https://your-domain.com/api/affiliate/link-generate \
  -H "Content-Type: application/json" \
  -d '{
    "candidateId": "test_candidate_123",
    "market": "EN"
  }'

# 統合ワークフローテスト
curl -X POST https://your-domain.com/api/workflows/affiliate-integrated \
  -H "Content-Type: application/json" \
  -d '{
    "marketCode": "EN",
    "whopProductId": "prod_xxx",
    "analyzeCandidates": true,
    "sendTelegramDM": false,
    "sendEmail": false
  }'

# GPT分析ワークフローテスト（独立実行） ⭐ NEW
curl -X POST https://your-domain.com/api/workflows/affiliate-analyze \
  -H "Content-Type: application/json" \
  -d '{
    "marketCode": "EN",
    "status": "New",
    "limit": 50,
    "analysisType": "priority_ranking"
  }'
```

---

## 📊 ワークフロー概要

### アフィリエイター登録フロー

```
1. ユーザーがアフィリエイター向けLPにアクセス
   ↓
2. RegistrationFormで登録
   ↓
3. /api/register で登録処理
   ↓
4. /api/affiliate/link-generate でアフィリエイトリンク生成
   ↓
5. AffiliateLinkDisplayでリンク表示
   ↓
6. ユーザーがリンクをコピー・共有
```

### 統合ワークフロー（安全ロック設計）

```
1. POST /api/workflows/affiliate-integrated
   ↓
2. アフィリエイト展開ワークフロー実行（LP情報保存、Whop連動）
   ↓
3. アフィリエイター候補検索（Grokで大量ストック） ⭐
   ↓
4. GPT分析（Grokでストックした候補を分析・優先順位付け） ⭐ NEW
   ↓
5. Telegram DM送信（オプション）
   ↓
6. Resend Email送信（オプション）
   ↓
7. 結果を返却
```

### GPT分析ワークフロー（独立実行可能）

```
1. POST /api/workflows/affiliate-analyze
   Body: {
     marketCode: 'EN',
     status: 'New',
     limit: 50,
     analysisType: 'priority_ranking'
   }
   ↓
2. Grokでストックした候補を取得（CSVから）
   ↓
3. GPTで分析実行
   - 優先順位付け（priorityScore: 1-10）
   - アプローチ戦略提案
   - コンテンツスタイル分析
   - インサイト生成
   ↓
4. 分析結果を返却
```

---

## 🎯 次のステップ

1. **環境変数の設定**: Vercel Dashboardで必須環境変数を設定
2. **動作確認**: ローカル環境でテスト実行
3. **デプロイ**: GitHub pushまたはVercel CLIでデプロイ
4. **モニタリング**: デプロイ後の動作を監視

---

## ✅ 結論

**アフィリエイター募集の自動化ワークフローは、コード実装が完了しており、デプロイスタンバイOKです。**

環境変数を設定し、動作確認を行えば、すぐに本番環境で使用できます。
