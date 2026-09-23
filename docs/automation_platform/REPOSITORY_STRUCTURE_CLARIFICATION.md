# リポジトリ構造の整理

**作成日**: 2026-01-11  
**目的**: リポジトリ構造の食い違いを整理

---

## 🔍 現状の整理

### 1. リポジトリの関係性

#### `workflows/affiliate-recruitment`
- **Gitリポジトリ**: `https://github.com/hadayalab-web/cryptotradeacademy-lp-ja.git`（現在）
- **正しいリポジトリ**: `https://github.com/hadayalab-web/affiliate-recruitment-workflow.git`（ユーザー指定）
- **役割**: ワークフローライブラリ（関数の集まり）
- **構造**: 
  - `src/workflows/` - ワークフロー関数
  - `src/utils/` - ユーティリティ関数
  - Next.jsアプリではない（APIルートなし）

#### `_archive/cryptotradeacademy-lp-ja`（アーカイブ済み）
- **Gitリポジトリ**: `https://github.com/hadayalab-web/cryptotradeacademy-lp-ja.git`
- **ステータス**: ✅ アーカイブ済み（2026-01-11）
- **理由**: `affiliate-recruitment-workflow`リポジトリに統合され、不要になったため
- **役割**: Next.jsアプリケーション（LPサイト）- 過去の実装

---

## 📊 アーキテクチャの理解

### 現在の構造

```
workflows/affiliate-recruitment/          ← ワークフローライブラリ
├── src/workflows/integrated.ts          ← executeIntegratedWorkflow()
│   └── callInternalApi('/api/workflows/affiliate-dm')  ← HTTP呼び出し
│
_archive/cryptotradeacademy-lp-ja/  ← Next.jsアプリ（アーカイブ済み）
└── app/api/workflows/
    └── affiliate-dm/route.ts            ← APIエンドポイント（過去の実装）
```

### 動作フロー

1. `workflows/affiliate-recruitment`の`executeIntegratedWorkflow()`が実行される
2. `callInternalApi('/api/workflows/affiliate-dm')`でHTTPリクエストを送信
3. `NEXT_PUBLIC_APP_URL`（デフォルト: `http://localhost:3000`）の`/api/workflows/affiliate-dm`にリクエスト
4. **注意**: `cryptotradeacademy-lp-ja`はアーカイブ済み。新しいAPIエンドポイントの配置場所を確認する必要があります。

---

## ❓ 問題点

### 1. Gitリポジトリの不一致

**現状**:
- `workflows/affiliate-recruitment`のGitリモート: `cryptotradeacademy-lp-ja.git`
- **ユーザー指定の正しいリポジトリ**: `affiliate-recruitment-workflow.git`

**問題**: `workflows/affiliate-recruitment`が間違ったリポジトリに紐づいている可能性

### 2. `cryptotradeacademy-lp-ja`の役割

**質問**: `cryptotradeacademy-lp-ja`は何か？
- Next.jsアプリ（LPサイト）？
- `affiliate-recruitment-workflow`の一部？
- 別の独立したプロジェクト？

---

## 🔧 確認が必要な事項

1. **`workflows/affiliate-recruitment`の正しいGitリモート**
   - 現在: `cryptotradeacademy-lp-ja.git`
   - 正しい: `affiliate-recruitment-workflow.git`？

2. **`affiliate-dm/route.ts`の配置場所**
   - `workflows/affiliate-recruitment`内にNext.jsアプリとして配置すべきか？
   - 別のNext.jsアプリに配置すべきか？
   - 現在、`cryptotradeacademy-lp-ja`はアーカイブ済みのため、新しい配置場所を確認する必要があります

---

## 📝 次のステップ

1. **Gitリモートの確認と修正**
2. **`affiliate-dm/route.ts`の新しい配置場所の確認**
3. **正しいリポジトリ構造の確認**

## ✅ 完了した作業

- **`cryptotradeacademy-lp-ja`のアーカイブ**: 2026-01-11に`_archive/cryptotradeacademy-lp-ja`に移動済み

---

**最終更新**: 2026-01-11
