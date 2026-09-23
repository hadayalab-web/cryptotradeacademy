# アフィリエイト募集ワークフロー移行ガイド

**作成日**: 2026-01-09  
**目的**: 旧フォルダから新しいフォルダ構造への移行ガイド

---

## 📋 移行概要

### 旧フォルダ構造（混乱の原因）

```
hadayalab-website-dev/
└── cryptotradeacademy-lp-dev/
    └── cryptotradeacademy-lp-ja/
        └── app/api/workflows/
            ├── affiliate-integrated/
            ├── affiliate-deployment/
            ├── affiliate-search/
            ├── affiliate-dm/
            ├── affiliate-email/
            └── affiliate-analyze/
```

**問題点**:
- 深いネスト構造でCursorが混乱
- 日本語LPプロジェクトに依存
- ワークフローが散在

### 新フォルダ構造（改善版）

```
workflows/
└── affiliate-recruitment/
    ├── src/
    │   ├── types/              # TypeScript型定義
    │   ├── utils/              # 共通ユーティリティ
    │   └── workflows/          # ワークフローファイル
    └── README.md
```

**改善点**:
- わかりやすい名前（`affiliate-recruitment`）
- プロジェクトルートに配置
- モジュール化された構造
- GPTレビューに基づく改善を反映

---

## 🔄 移行手順

### 1. 新しいフォルダ構造の確認

新しいフォルダ構造は既に作成済みです：

```
workflows/affiliate-recruitment/
├── src/
│   ├── types/index.ts
│   ├── utils/
│   │   ├── api-client.ts
│   │   └── validation.ts
│   └── workflows/
│       ├── deployment.ts
│       ├── integrated.ts
│       └── management.ts
└── README.md
```

### 2. 旧ファイルの参照更新

旧ファイルは以下の場所に残っていますが、新しい実装を使用することを推奨します：

- `hadayalab-website-dev/cryptotradeacademy-lp-dev/cryptotradeacademy-lp-ja/app/api/workflows/affiliate-*`

### 3. 新しい実装の使用

新しい実装を使用する場合：

```typescript
// 旧: hadayalab-website-dev/.../affiliate-integrated/route.ts
// 新: workflows/affiliate-recruitment/src/workflows/integrated.ts

import { executeIntegratedWorkflow } from '@/workflows/affiliate-recruitment/src/workflows/integrated';
```

---

## ✅ 改善点の確認

### GPTレビューに基づく改善

1. ✅ **TypeScript型定義の強化** - `src/types/index.ts`
2. ✅ **共通ロジックの抽出** - `src/utils/api-client.ts`, `src/utils/validation.ts`
3. ✅ **エラーハンドリングの改善** - 具体的なエラーメッセージ
4. ✅ **リトライロジックの改善** - 指数バックオフ
5. ✅ **タイムアウト設定の統一** - すべてのAPI呼び出しにタイムアウト
6. ✅ **レート制限の実装** - API呼び出しに対するレート制限

---

## 📝 次のステップ

1. **旧ファイルのアーカイブ**（オプション）
   - 旧ファイルを`_archive/`フォルダに移動
   - または削除

2. **新しい実装の統合**
   - Next.js API Routesから新しい実装を呼び出す
   - または、新しい実装を直接使用

3. **テスト**
   - 新しい実装の動作確認
   - エラーハンドリングの確認

---

**最終更新**: 2026-01-09
