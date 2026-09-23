# アフィリエイト募集自動化ワークフロー

**作成日**: 2026-01-09  
**ステータス**: ✅ GPTレビュー完了、改善版実装済み

---

## 📋 概要

アフィリエイター募集の自動化ワークフローです。GPTレビューに基づいて改善された実装です。

### 主な機能

1. **アフィリエイト展開ワークフロー**: LP情報保存、Whop連動、候補検索準備
2. **統合ワークフロー**: 展開 → 検索 → GPT分析 → Telegram DM → Email
3. **アフィリエイター管理**: 候補検索・保存・DM送信の統合実行

---

## 🎯 GPTレビューに基づく改善点

### ✅ 実装済み改善

1. **TypeScript型定義の強化**
   - すべてのAPIレスポンスに型定義を追加
   - 型安全性を向上

2. **共通ロジックの抽出**
   - `src/utils/api-client.ts`: API呼び出しの共通ユーティリティ
   - `src/utils/validation.ts`: バリデーション共通ユーティリティ

3. **エラーハンドリングの改善**
   - より具体的なエラーメッセージ
   - コンテキスト情報を含むエラー

4. **リトライロジックの改善**
   - 指数バックオフを実装
   - 過負荷を避ける設計

5. **タイムアウト設定の統一**
   - すべての外部API呼び出しにタイムアウトを設定
   - デフォルトタイムアウト値を定義

6. **レート制限の実装**
   - API呼び出しに対するレート制限を実装
   - 負荷を管理

---

## 📁 ディレクトリ構造

```
workflows/affiliate-recruitment/
├── src/
│   ├── types/
│   │   └── index.ts              # TypeScript型定義
│   ├── utils/
│   │   ├── api-client.ts         # API呼び出し共通ユーティリティ
│   │   └── validation.ts         # バリデーション共通ユーティリティ
│   └── workflows/
│       ├── deployment.ts         # 展開ワークフロー
│       ├── integrated.ts         # 統合ワークフロー
│       └── management.ts         # 管理ワークフロー
└── README.md                      # このファイル
```

---

## 🚀 使用方法

### 展開ワークフロー

```typescript
import { executeDeploymentWorkflow } from './src/workflows/deployment';

const result = await executeDeploymentWorkflow({
  marketCode: 'EN',
  whopProductId: 'prod_xxx',
  searchQueries: ['crypto trading'],
  maxCandidates: 20,
});
```

### 統合ワークフロー

```typescript
import { executeIntegratedWorkflow } from './src/workflows/integrated';

const result = await executeIntegratedWorkflow({
  marketCode: 'EN',
  whopProductId: 'prod_xxx',
  searchQueries: ['crypto trading'],
  maxCandidates: 20,
  analyzeCandidates: true,
  sendTelegramDM: true,
  sendEmail: false,
});
```

---

## 🔧 設定

### 環境変数

```env
# Whop API
WHOP_API_KEY=whop_xxx

# Telegram Bot（6言語対応）
TELEGRAM_BOT_TOKEN_EN=xxx
TELEGRAM_BOT_TOKEN_AR=xxx
TELEGRAM_BOT_TOKEN_KO=xxx
TELEGRAM_BOT_TOKEN_JA=xxx
TELEGRAM_BOT_TOKEN_ES=xxx
TELEGRAM_BOT_TOKEN_PT_BR=xxx

# Resend API
RESEND_API_KEY=re_xxx

# OpenAI API（GPT分析用）
OPENAI_API_KEY=sk-xxx

# App URL
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

---

## 📊 改善前後の比較

### 改善前

- ❌ 型定義が不足
- ❌ エラーメッセージが抽象的
- ❌ リトライロジックが単純
- ❌ タイムアウト設定が不統一
- ❌ レート制限なし

### 改善後

- ✅ 完全なTypeScript型定義
- ✅ 具体的なエラーメッセージ
- ✅ 指数バックオフによるリトライ
- ✅ 統一されたタイムアウト設定
- ✅ レート制限の実装

---

## 📚 参考ドキュメント

- **GPTレビュー結果**: `docs/AFFILIATE_WORKFLOW_GPT_REVIEW.md`
- **デプロイ準備状況**: `docs/AFFILIATE_WORKFLOW_DEPLOYMENT_STATUS.md`

---

**最終更新**: 2026-01-09  
**ステータス**: ✅ 改善版実装完了
