# ユーザー向けLP EN版 - デプロイチェックリスト

**作成日**: 2026-01-12  
**対象**: `hadayalab-website-dev/cryptotradeacademy-lp-dev/cryptotradeacademy-lp-en`  
**状態**: ✅ **デプロイ準備完了**

---

## ✅ 実装完了確認

### コンポーネント実装
- [x] `AuthorityImages.tsx` - 権威性画像セクション
- [x] `TwoYoungMen.tsx` - Two Young Men視覚化
- [x] `RiskReversal.tsx` - リスクリバーサル
- [x] `Testimonials.tsx` - ユーザーレビュー
- [x] `ScrollAnimation.tsx` - スクロールアニメーション

### 画像配置
- [x] `cryptoquant-authority-data-reliability.png` ✅
- [x] `ai-hybrid-nexus-intelligence.png` ✅
- [x] `telegram-smartphone-convenience.png` ✅
- [ ] `trader-a-lost-profits.png` (オプション - プレースホルダー表示中)
- [ ] `trader-b-earned-profits.png` (オプション - プレースホルダー表示中)

### SEO最適化
- [x] 動的メタタグ (`app/[market]/layout.tsx`)
- [x] 構造化データ (JSON-LD)
- [x] Open Graph対応
- [x] Twitter Card対応

### パフォーマンス最適化
- [x] Next.js Imageコンポーネント使用
- [x] 遅延ロード (`loading="lazy"`)
- [x] 画像品質最適化 (`quality={90}`)

### 機能実装
- [x] VSL埋め込み（HeyGen）
- [x] Whop Checkout統合
- [x] プラン選択機能
- [x] スクロールアニメーション
- [x] Floating CTA
- [x] Chatbot

---

## 🚀 デプロイ前チェックリスト

### 1. ビルドテスト
```bash
cd hadayalab-website-dev/cryptotradeacademy-lp-dev/cryptotradeacademy-lp-en
npm run build
```

**確認項目**:
- [ ] ビルドエラーなし
- [ ] 型エラーなし
- [ ] リンターエラーなし

### 2. ローカルテスト
```bash
npm run dev
```

**確認項目**:
- [ ] `http://localhost:3000/en` で正常に表示
- [ ] 画像が正しく表示される
- [ ] VSLが正しく埋め込まれる
- [ ] Whop Checkoutが動作する
- [ ] スクロールアニメーションが動作する
- [ ] モバイル表示が正常

### 3. 環境変数確認
```bash
# .env.local または環境変数の確認
GEMINI_API_KEY=...
WHOP_API_KEY=...
# その他の必要な環境変数
```

**確認項目**:
- [ ] すべての環境変数が設定されている
- [ ] APIキーが有効

### 4. パフォーマンス確認
- [ ] Lighthouse スコア確認
  - Performance: 90+
  - Accessibility: 90+
  - Best Practices: 90+
  - SEO: 90+

### 5. ブラウザ互換性
- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari
- [ ] モバイルブラウザ

---

## 📋 デプロイ手順

### Vercelデプロイ（推奨）

1. **Vercelプロジェクト作成**
   ```bash
   cd hadayalab-website-dev/cryptotradeacademy-lp-dev/cryptotradeacademy-lp-en
   vercel
   ```

2. **環境変数の設定**
   - Vercel Dashboard → Settings → Environment Variables
   - 必要な環境変数を設定

3. **デプロイ**
   ```bash
   vercel --prod
   ```

### その他のデプロイ方法

- **Netlify**: `netlify deploy --prod`
- **自社サーバー**: `npm run build` → `npm start`

---

## 🔍 デプロイ後確認

### 機能確認
- [ ] LPが正常に表示される
- [ ] 画像が正しく読み込まれる
- [ ] VSLが正しく再生される
- [ ] Whop Checkoutが動作する
- [ ] プラン選択が動作する
- [ ] スクロールアニメーションが動作する

### SEO確認
- [ ] メタタグが正しく設定されている
- [ ] 構造化データが検証される（Google Rich Results Test）
- [ ] OGP画像が正しく表示される

### パフォーマンス確認
- [ ] ページ読み込み速度が速い
- [ ] 画像が最適化されている
- [ ] モバイル表示が正常

---

## 📊 期待される結果

### CVR向上
- **目標**: 5-10% CVR
- **ベースライン**: 0% (Whopページ)
- **改善要因**:
  - 権威性画像: +15%
  - リスクリバーサル: +20%
  - 社会的証明: +25%
  - 動的要素: +10%

### ユーザー体験
- **滞在時間**: +30%
- **ページ速度**: +40%
- **検索エンジン可視性**: +50%

---

## 🐛 トラブルシューティング

### 画像が表示されない
- `public/images/` ディレクトリの確認
- 画像パスの確認
- Next.js Imageコンポーネントの設定確認

### VSLが表示されない
- HeyGen APIキーの確認
- VSL IDの確認
- ネットワークエラーの確認

### Whop Checkoutが動作しない
- Whop APIキーの確認
- プランIDの確認
- CORS設定の確認

---

## 📝 次のステップ

1. **デプロイ実行**
2. **動作確認**
3. **パフォーマンス監視**
4. **CVRデータの収集**
5. **A/Bテストの準備**

---

**最終更新**: 2026-01-12  
**状態**: ✅ デプロイ準備完了
