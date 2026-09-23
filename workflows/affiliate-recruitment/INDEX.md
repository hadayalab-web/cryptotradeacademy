# アフィリエイト募集自動化ワークフロー - インデックス

**作成日**: 2026-01-09  
**目的**: Cursorが混乱しないように、新しいフォルダ構造の説明

---

## 📁 新しいフォルダ構造

```
workflows/affiliate-recruitment/
├── src/
│   ├── types/
│   │   └── index.ts              # TypeScript型定義（GPTレビュー改善）
│   ├── utils/
│   │   ├── api-client.ts         # API呼び出し共通ユーティリティ
│   │   └── validation.ts         # バリデーション共通ユーティリティ
│   └── workflows/
│       ├── deployment.ts         # 展開ワークフロー
│       ├── integrated.ts         # 統合ワークフロー
│       └── management.ts         # 管理ワークフロー
├── README.md                      # メインドキュメント
├── MIGRATION_GUIDE.md            # 移行ガイド
├── CHANGELOG.md                   # 変更履歴
├── package.json                   # パッケージ設定
├── tsconfig.json                  # TypeScript設定
└── .gitignore                     # Git除外設定
```

---

## 🎯 主なファイル

### ワークフローファイル

1. **`src/workflows/deployment.ts`**
   - アフィリエイト展開ワークフロー
   - LP情報保存、Whop連動、候補検索準備

2. **`src/workflows/integrated.ts`**
   - 統合アフィリエイトワークフロー
   - 展開 → 検索 → GPT分析 → Telegram DM → Email

3. **`src/workflows/management.ts`**
   - アフィリエイター管理統合
   - 候補検索・保存・DM送信の統合実行

### ユーティリティ

1. **`src/utils/api-client.ts`**
   - API呼び出し共通ユーティリティ
   - リトライロジック（指数バックオフ）
   - タイムアウト設定
   - レート制限

2. **`src/utils/validation.ts`**
   - バリデーション共通ユーティリティ
   - 入力検証

### 型定義

1. **`src/types/index.ts`**
   - すべてのTypeScript型定義
   - GPTレビューに基づく型安全性の向上

---

## 📚 ドキュメント

- **README.md**: メインドキュメント
- **MIGRATION_GUIDE.md**: 旧フォルダからの移行ガイド
- **CHANGELOG.md**: 変更履歴

---

## ✅ GPTレビューに基づく改善

1. ✅ TypeScript型定義の強化
2. ✅ 共通ロジックの抽出
3. ✅ エラーハンドリングの改善
4. ✅ リトライロジックの改善（指数バックオフ）
5. ✅ タイムアウト設定の統一
6. ✅ レート制限の実装

---

**最終更新**: 2026-01-09
