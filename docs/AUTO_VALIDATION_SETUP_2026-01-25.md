# 自動検証システムのセットアップ（2026-01-25）

## 📋 概要

「別のチャットセッションになれば検証スクリプトを使わない」問題を解決するため、**自動実行の仕組み**を構築しました。

## 🎯 目的

1. **AIが忘れても、システムが自動的に検証**
2. **コミット前に強制的に検証**
3. **CI/CDパイプラインに組み込み**

## 🔧 セットアップ方法

### 1. Git Pre-commitフックの設定

```bash
# Huskyをインストール（まだの場合）
npm install --save-dev husky

# Pre-commitフックを有効化
npx husky install
npx husky add .husky/pre-commit "npm run precommit"
```

**効果**: コミット前に自動的に検証が実行され、エラーがある場合はコミットが拒否されます。

### 2. package.jsonにスクリプトを追加

既に追加済み：

```json
{
  "scripts": {
    "validate:implementation": "node scripts/validate_implementation.js",
    "test:critical": "node scripts/test_critical_functions.js",
    "precommit": "npm run validate:implementation && npm run test:critical"
  }
}
```

**使用方法**:
```bash
# 手動で検証を実行
npm run validate:implementation

# 重要な関数のテストを実行
npm run test:critical

# Pre-commitフックを手動で実行
npm run precommit
```

### 3. .cursorrulesファイルの設定

`.cursorrules`ファイルに実装品質基準を記載しました。

**効果**: Cursorが新しいチャットセッションを開始する際、このルールを参照します。

## 🚀 自動実行の仕組み

### Git Pre-commitフック

**ファイル**: `.husky/pre-commit`

**動作**:
1. コミット前に自動実行
2. `validate_implementation.js`を実行
3. エラーがある場合、コミットを拒否

**メリット**:
- AIが忘れても、システムが強制的に検証
- バグのあるコードがリポジトリに入るのを防ぐ

### CI/CDパイプライン（将来の拡張）

Vercelのビルド時に検証を実行する場合：

```json
// vercel.json
{
  "buildCommand": "npm run validate:implementation && npm run build"
}
```

## 📊 検証項目

### 1. 関数の引数順序

- `replyToTweet(text, inReplyToTweetId)` - 正しい順序
- `replyToTweet(inReplyToTweetId, text)` - 間違った順序（検出）

### 2. 定数の一貫性

- `maxDailyPosts = 35` - すべてのファイルで統一
- `maxDailyPosts = 25` - 不一致（検出）

### 3. エラーハンドリング

- `console.error` - 重要なエラー
- `console.warn` - 警告（検出）

## 🔍 使用方法

### 通常の開発フロー

1. **実装前**: `.cursorrules`を確認
2. **実装中**: 関数の定義を確認
3. **実装後**: `npm run validate:implementation`を実行
4. **コミット時**: Pre-commitフックが自動実行

### エラーが発生した場合

```bash
# エラーの詳細を確認
npm run validate:implementation

# エラーを修正
# ... コードを修正 ...

# 再度検証
npm run validate:implementation
```

## ⚠️ 注意事項

### Pre-commitフックをスキップする場合

**推奨されませんが**、緊急時は：

```bash
git commit --no-verify -m "緊急修正"
```

**ただし**: 後で必ず検証を実行してください。

### 検証スクリプトの更新

新しい関数や定数を追加した場合、`validate_implementation.js`を更新してください：

```javascript
const EXPECTED_FUNCTION_SIGNATURES = {
  'services/x/client.js': {
    'newFunction': {
      requiredParams: ['param1', 'param2'],
      // ...
    },
  },
};
```

## 📚 参照ドキュメント

- `docs/IMPLEMENTATION_QUALITY_GUIDE_2026-01-25.md` - 実装品質ガイド
- `scripts/validate_implementation.js` - 実装検証スクリプト
- `scripts/test_critical_functions.js` - 重要な関数のテスト
- `.cursorrules` - Cursorルール

## ✅ チェックリスト

セットアップ確認：

- [ ] `npm run validate:implementation`が実行できるか
- [ ] `npm run test:critical`が実行できるか
- [ ] Pre-commitフックが設定されているか（`.husky/pre-commit`が存在するか）
- [ ] `.cursorrules`ファイルが存在するか

## 🎯 結論

**「別のチャットセッションになれば検証スクリプトを使わない」問題を解決するため、自動実行の仕組みを構築しました。**

これにより、AIが忘れても、システムが自動的に検証を実行し、「デタラメ実装」を防ぎます。
