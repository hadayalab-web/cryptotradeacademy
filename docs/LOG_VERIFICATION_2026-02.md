# ログ検証メモ（2026-02）

共有ログ（Git・デプロイ・X監視・CTR）を検証した結果と対処。

---

## 1. Git エラー: pathspec が一致しない

**内容**:
```text
error: pathspec 'C:/Users/chiba/AppData/Roaming/Cursor/User/workspaceStorage/.../images/image-6e4a3ecc-7438-4617-8b1b-00d66b626979.png' did not match any file(s) known to git
```

**原因**: 指定されているパスは **Cursor のワークスペースストレージ内**（ペーストした画像の一時保存先）であり、**このリポジトリの作業ツリー外**。  
`git add` にその絶対パスを渡すと、リポジトリ内にそのファイルが存在しないため「pathspec が一致しない」になる。

**対処**:
- コミット対象は **リポジトリ内のファイルだけ**にする。例: `git add -A` または `git add .`（プロジェクトルートで実行）。
- 画像をコミットしたい場合は、**プロジェクト内**（例: `assets/`）にコピーしてから `git add assets/...` とする。
- Cursor のストレージパスを `git add` に渡さない（スクリプトで `git add` する場合は、引数にリポ外パスが入らないようにする）。

---

## 2. Git エラー: Invalid commit message format

**内容**: コミットメッセージが「指定フォーマットに無効」と出る。

**このリポジトリの状態**:
- **commit-msg フックは未使用**（`.husky/commit-msg` なし）。
- **pre-commit** は `npm run precommit`（実装検証＋重要テスト）のみ。メッセージ形式はチェックしていない。
- `package.json` に commitlint 等のコミットメッセージ検証はない。

**考えられる原因**:
- 別リポジトリ／別ツールの「Conventional Commits 必須」など、別のルールが効いている。
- Cursor や IDE の「コミットメッセージルール」が有効になっている。

**対処**:
- このリポでは **feat:/fix:/chore: 等は任意**。形式エラーが出る場合は、使っている commit-msg フックや IDE のルールを確認する。
- このリポだけで形式を統一したい場合は、`.husky/commit-msg` と commitlint を導入するか、運用で「feat: / fix: プレフィックス推奨」とドキュメントに書く。

---

## 3. ログの [X]・投稿監視・CTR計測について

**ログに含まれるタグ例**: `[X]`、`X投稿監視`、`Xアルゴリズム解析`、`投稿CTR計測`、`CTR改善`、`ツイート取得`、`いいね`、`リツイート`。

**このリポの実装**:
- **X 検索・メトリクス**: `services/x/client.js`（`searchPostsRecent`）、`services/x/metrics.js`（`getTweetMetrics`）。ログプレフィックスは `[X API]` 等。
- **BuzzWeave 投稿・ログ**: `[BuzzWeave]`、`pqt-only slots ready` 等。`buzzweave_post_log` に投稿・成約・インプレを記録。
- **CTR**: `pqtCtaEngine` の `recordPqtUse`／`pickTemplateIndex`。ログには「投稿CTR計測」「CTR改善」という文言は直接出さない。
- **Xアルゴリズム**: `services/x/contentOptimizer.js`、`services/grok/xAlgorithmAnalyzer.js` 等で「Xアルゴリズム」という語は使うが、ログタグは別。

**結論**: 共有ログの `[X]`・`X投稿監視`・`投稿CTR計測` 等は、**このリポの標準ログフォーマットとは一致しない**。  
別システム（集約ログ・ダッシュボード・ラッパースクリプト）が、当リポの「X 検索／メトリクス／BuzzWeave／CTR」を概念的にラベリングして出している可能性がある。  
当リポのログと突き合わせる場合は、`[BuzzWeave]`・`[X API]`・`buzzweave_post_log`・`api/buzzweave-metrics-poll` 等をキーにするとよい。

---

## 4. デプロイ・ビルド

**ログ**: `npm run build`、`yarn run build`、`pm2 restart`、`自動デプロイ`、`デプロイ中` 等。

**このリポ**:
- **ビルド**: `npm run build`（= `node scripts/copy-telegram-messages.js`）。Vercel は `vercel-build` を使用。
- **デプロイ**: Vercel 連携（`git push` で自動デプロイ）。`vercel --prod` は `npm run deploy`。
- **pm2**: この `package.json` には pm2 は含まれていない。別プロセス／別サービスで pm2 を使っている場合は、その環境のログとして解釈する。

---

## 5. まとめ

| 項目 | 状態 | アクション |
|------|------|------------|
| pathspec エラー（画像パス） | Cursor ストレージの絶対パスを git が参照している | リポ内のファイルだけ add。画像はリポ内にコピーしてから add |
| Invalid commit message | このリポに commit-msg フックなし | 別ツール／別リポのルールを確認。必要なら commitlint 等を導入 |
| [X]・投稿監視・CTR計測 | 当リポの標準ログタグと不一致 | 集約ログ／他システムのラベルと解釈。突き合わせは [BuzzWeave]/[X API]/metrics-poll を基準に |
