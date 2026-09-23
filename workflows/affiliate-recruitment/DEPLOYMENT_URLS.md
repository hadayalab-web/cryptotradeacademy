# デプロイURL共有ガイド

**作成日**: 2026-01-10  
**目的**: デプロイ後のURL共有方法

---

## 🔗 共有すべきリンク

### 1. プロジェクトのProduction URL（推奨）

Vercelダッシュボードで確認できるURL：

```
https://your-project-name.vercel.app
```

**確認方法**:
1. Vercelダッシュボードにログイン
2. プロジェクトを選択
3. 「Deployments」タブを開く
4. 最新のデプロイメントの「Visit」ボタンをクリック
5. または、プロジェクト名の下に表示されるURLをコピー

---

## 📋 共有すべき情報

### 基本情報

```
プロジェクト名: affiliate-recruitment-workflow
Production URL: https://your-project-name.vercel.app
GitHubリポジトリ: https://github.com/hadayalab-web/affiliate-recruitment-workflow
```

### APIエンドポイント（実装されている場合）

このプロジェクトはワークフロー関数のみで、Next.js API Routesは実装されていない可能性があります。

もしAPI Routesを実装している場合：

```
# 統合ワークフロー
POST https://your-project-name.vercel.app/api/workflows/affiliate-integrated

# 展開ワークフロー
POST https://your-project-name.vercel.app/api/workflows/affiliate-deployment

# 検索ワークフロー
POST https://your-project-name.vercel.app/api/workflows/affiliate-search

# 分析ワークフロー
POST https://your-project-name.vercel.app/api/workflows/affiliate-analyze

# Telegram DM送信ワークフロー
POST https://your-project-name.vercel.app/api/workflows/affiliate-dm

# Email送信ワークフロー
POST https://your-project-name.vercel.app/api/workflows/affiliate-email
```

---

## ✅ 共有方法

### 1. プロジェクトURLのみ共有する場合

```
Vercelデプロイ完了:
https://your-project-name.vercel.app
```

### 2. 詳細情報を含めて共有する場合

```
✅ Affiliate Scout デプロイ完了

🔗 Production URL:
https://your-project-name.vercel.app

📦 GitHubリポジトリ:
https://github.com/hadayalab-web/affiliate-recruitment-workflow

📝 機能:
- Grok × GPT × Gemini 統合ワークフロー
- Telegram DM送信
- Resend Email送信
- アフィリエイター候補の自動検索・分析

⚙️ 環境変数:
すべて設定済み（XAI_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY, Telegram Tokens, RESEND_API_KEY）
```

---

## 🔍 Vercelダッシュボードでの確認方法

### Production URLの確認

1. **Vercelダッシュボードにログイン**
   - https://vercel.com/dashboard

2. **プロジェクトを選択**
   - 「affiliate-recruitment-workflow」をクリック

3. **URLを確認**
   - プロジェクト名の下に表示されるURL
   - 例: `affiliate-recruitment-workflow.vercel.app`
   - または、カスタムドメインが設定されている場合、そのURL

4. **デプロイメントの確認**
   - 「Deployments」タブを開く
   - 最新のデプロイメントの「Visit」ボタンをクリック
   - または、デプロイメントのURLをコピー

---

## 📊 デプロイメント情報

### 確認すべき情報

- ✅ **デプロイメントステータス**: Ready（成功）
- ✅ **環境変数**: すべて設定済み
- ✅ **ビルドログ**: エラーなし
- ✅ **Function Logs**: エラーなし

---

## 🎯 共有推奨事項

### チーム内共有の場合

```
✅ Affiliate Scout デプロイ完了

🔗 URL: https://your-project-name.vercel.app
📦 リポジトリ: https://github.com/hadayalab-web/affiliate-recruitment-workflow
📝 ドキュメント: workflows/affiliate-recruitment/README.md
```

### 外部共有の場合

```
Affiliate Scout - アフィリエイター募集自動化システム

🔗 Production URL: https://your-project-name.vercel.app
📦 GitHub: https://github.com/hadayalab-web/affiliate-recruitment-workflow

機能:
- AI統合ワークフロー（Grok × GPT × Gemini）
- 自動候補検索・分析
- Telegram DM送信
- Email送信
```

---

## ⚠️ 注意事項

1. **API Routesが実装されていない場合**
   - このプロジェクトはワークフロー関数のみの場合、直接アクセスできるURLはありません
   - ワークフローは他のアプリケーションから呼び出されることを想定しています

2. **カスタムドメイン**
   - カスタムドメインを設定している場合、そのURLを共有してください

3. **環境変数の機密性**
   - 環境変数の値は共有しないでください
   - URLのみを共有してください

---

**最終更新**: 2026-01-10
