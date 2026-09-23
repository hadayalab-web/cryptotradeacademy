# EN版LP - Git設定とデプロイ手順

**作成日**: 2026-01-12  
**状態**: ⚠️ **Git設定が必要**

---

## ⚠️ 現在の状況

1. **Gitユーザー情報が未設定**
   - `git config user.name` と `git config user.email` が必要

2. **リモートリポジトリが見つからない**
   - `https://github.com/hadayalab-web/cryptotradeacademy-lp-en.git` が存在しないか、アクセス権限がない

---

## 🔧 必要な設定

### 1. Gitユーザー情報の設定

```bash
cd hadayalab-website-dev/cryptotradeacademy-lp-dev/cryptotradeacademy-lp-en

# グローバル設定（推奨）
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# または、このリポジトリのみに設定
git config user.name "Your Name"
git config user.email "your.email@example.com"
```

### 2. リモートリポジトリの確認/作成

#### オプションA: GitHubでリポジトリを作成する場合

1. GitHubで新しいリポジトリを作成:
   - リポジトリ名: `cryptotradeacademy-lp-en`
   - オーナー: `hadayalab-web`
   - 公開/非公開: お好みで

2. リモートを設定:
   ```bash
   git remote remove origin  # 既存のリモートを削除
   git remote add origin https://github.com/hadayalab-web/cryptotradeacademy-lp-en.git
   ```

#### オプションB: 既存のリポジトリを使用する場合

リモートURLを確認・変更:
```bash
git remote -v
git remote set-url origin <正しいリポジトリURL>
```

---

## 📋 コミット・プッシュ手順

### 1. 変更をステージング（完了済み）
```bash
git add app/[market]/page.tsx
git add app/[market]/layout.tsx
git add components/lp/
git add public/images/
git add app/affiliate/[market]/page.tsx
git add lib/cvr-data.ts
```

### 2. コミット
```bash
git commit -m "feat: Complete EN LP implementation with authority images, risk reversal, testimonials, and scroll animations

- Add AuthorityImages component with 3 authority images
- Add RiskReversal component (money-back guarantee, free trial, 24/7 support)
- Add Testimonials component with user reviews carousel
- Add ScrollAnimation component for smooth scroll effects
- Add TwoYoungMen component for visual storytelling
- Add SEO optimization (dynamic metadata, JSON-LD structured data)
- Add performance optimization (lazy loading, image optimization)
- Integrate all components into main LP page
- Add market-specific layout with dynamic metadata"
```

### 3. プッシュ
```bash
git push origin main
```

---

## 📦 コミットされるファイル

### 新規ファイル
- `app/[market]/layout.tsx` - 動的メタタグ用レイアウト
- `components/lp/AuthorityImages.tsx` - 権威性画像セクション
- `components/lp/RiskReversal.tsx` - リスクリバーサル
- `components/lp/ScrollAnimation.tsx` - スクロールアニメーション
- `components/lp/Testimonials.tsx` - ユーザーレビュー
- `components/lp/TwoYoungMen.tsx` - Two Young Men視覚化
- `public/images/ai-hybrid-nexus-intelligence.png`
- `public/images/cryptoquant-authority-data-reliability.png`
- `public/images/telegram-smartphone-convenience.png`

### 変更ファイル
- `app/[market]/page.tsx` - メインLPページ（全コンポーネント統合）
- `app/affiliate/[market]/page.tsx` - アフィリエイトページ
- `lib/cvr-data.ts` - CVRデータ

---

## 🚀 デプロイ手順（GitHubプッシュ後）

### Vercelデプロイ（推奨）

1. **Vercelに接続**
   - Vercel Dashboard → Add New Project
   - GitHubリポジトリを選択: `hadayalab-web/cryptotradeacademy-lp-en`

2. **環境変数の設定**
   - Settings → Environment Variables
   - 必要な環境変数を設定:
     - `GEMINI_API_KEY`
     - `WHOP_API_KEY`
     - その他の必要な変数

3. **デプロイ**
   - 自動的にデプロイが開始されます
   - または、手動で `Deploy` をクリック

### その他のデプロイ方法

- **Netlify**: GitHubリポジトリを接続して自動デプロイ
- **自社サーバー**: `npm run build` → `npm start`

---

## ✅ デプロイ後確認項目

- [ ] LPが正常に表示される (`/en`)
- [ ] 画像が正しく読み込まれる
- [ ] VSLが正しく埋め込まれる
- [ ] Whop Checkoutが動作する
- [ ] スクロールアニメーションが動作する
- [ ] モバイル表示が正常
- [ ] SEOメタタグが正しく設定されている

---

**最終更新**: 2026-01-12  
**状態**: ⚠️ Git設定が必要
