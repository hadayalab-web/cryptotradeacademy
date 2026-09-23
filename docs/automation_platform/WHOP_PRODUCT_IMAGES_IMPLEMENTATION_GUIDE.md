# Whopプロダクトページ画像配置ガイド

**生成日**: 2026-01-12  
**対象プロダクト**: Trap Defence BTC - English (`prod_6RjqaJMGyEw1F`)  
**プロダクトURL**: https://whop.com/aio-media-llc/trap-defense-btc-en/

---

## 📋 生成されたアセット

### ✅ 生成完了

1. **① 統合エンジンの権威性可視化画像**
   - ファイル: `data/whop-product-assets/images/core-intelligence-hexagonal-shield.png`
   - 説明: CryptoQuant, Grok, GPT, Geminiの4つが「一つの最強の盾」になっていることを示す画像
   - アスペクト比: 16:9
   - 解像度: 4K

2. **② 実機UIによる証拠画像**
   - ファイル: `data/whop-product-assets/images/ui-evidence-trading-terminal.png`
   - 説明: 「本当に4つのデータが統合されている」ことをUI上で視覚化した画像
   - アスペクト比: 16:9
   - 解像度: 4K

### ⚠️ 生成失敗

3. **③ インテリジェンス・フロー動画**
   - エラー: Veo API 404 Not Found
   - 対応: 後で再試行または代替手段を検討

---

## 🎯 配置戦略

### PC版レイアウト

```
┌─────────────────────────────────────────┐
│  [VSL動画 - メイン]                     │
│  (HeyGen VSL: task1-user-lp-two-young-men) │
└─────────────────────────────────────────┘
┌──────────────────┬──────────────────────┐
│ ① 統合コア画像   │ テキスト補足          │
│ (権威性の証明)    │ "The World's First   │
│                  │ Integrated Defense    │
│                  │ Protocol"             │
│                  │ • CryptoQuant: ...    │
│                  │ • Grok / GPT: ...     │
│                  │ • Gemini: ...         │
└──────────────────┴──────────────────────┘
┌─────────────────────────────────────────┐
│ ② UI実機デモ画像                         │
│ (実体感の証明)                           │
└─────────────────────────────────────────┘
```

### モバイル版レイアウト

```
┌──────────────────┐
│ [VSL動画]        │
│ (HeyGen VSL)     │
└──────────────────┘
┌──────────────────┐
│ ② UI実機デモ画像 │
│ (実体感の証明)    │
└──────────────────┘
┌──────────────────┐
│ ① 統合コア画像   │
│ (権威性の証明)    │
└──────────────────┘
┌──────────────────┐
│ テキスト補足      │
│ "The World's     │
│ First Integrated │
│ Defense Protocol" │
│ • CryptoQuant: ...│
│ • Grok / GPT: ... │
│ • Gemini: ...     │
└──────────────────┘
```

---

## 📝 Whop Dashboardでの実装手順

### 1. 画像のアップロード

1. Whop Dashboardにアクセス: https://whop.com/dashboard/products/prod_6RjqaJMGyEw1F
2. 「Media」または「Images」セクションを開く
3. 以下の画像をアップロード:
   - `data/whop-product-assets/images/core-intelligence-hexagonal-shield.png`
   - `data/whop-product-assets/images/ui-evidence-trading-terminal.png`

### 2. VSLセクションの確認

- VSL（HeyGen）が既に埋め込まれているか確認
- VSL ID: `task1-user-lp-two-young-men`
- HeyGen Embed URL: `https://app.heygen.com/embedded-player/4da32f33872843be903e4bb427afefde`

### 3. 画像の配置

#### PC版

1. VSLの直下にセクションを追加
2. 左側: VSL動画（既存）
3. 右側: 
   - ① 統合コア画像を配置
   - その下にテキスト補足を追加

4. その下に:
   - ② UI実機デモ画像を配置（全幅）

#### モバイル版

1. VSLの直下にセクションを追加
2. 上から順に:
   - ② UI実機デモ画像（全幅）
   - ① 統合コア画像（全幅）
   - テキスト補足（全幅）

### 4. テキスト補足の追加

以下のテキストを画像の下に追加:

```
**The World's First Integrated Defense Protocol**

• **CryptoQuant**: 機関投資家のクジラの動きを監視。
• **Grok / GPT**: 市場のセンチメントと論理を解析。
• **Gemini**: 複雑なデータを一瞬で視覚ストーリーへ。
```

---

## 🎨 デザインの意図

### ① 統合エンジンの権威性可視化画像

**目的**: 「4大インテリジェンス統合コア」の権威性を視覚的に証明

**効果**:
- VSLで語られている「抽象的な凄さ」を「物理的な証拠」に変換
- ユーザーが動画を見ながら、横にある「4大ロゴ」を視覚的に捉え続ける
- 権威性を脳に焼き付ける

### ② 実機UIによる証拠画像

**目的**: 「本当に4つのデータが統合されている」ことをUI上で視覚化

**効果**:
- 「罠」という言葉を聞いた瞬間に、すぐ下の画像で「罠を検知している画面」を見せる
- 実体感を与える
- 信頼性を高める

---

## ✅ 実装チェックリスト

- [ ] ① 統合コア画像をアップロード
- [ ] ② UI実機デモ画像をアップロード
- [ ] VSLが正しく埋め込まれているか確認
- [ ] PC版レイアウトで画像を配置
- [ ] モバイル版レイアウトで画像を配置
- [ ] テキスト補足を追加
- [ ] プレビューで表示を確認
- [ ] 本番環境で公開

---

## 📊 生成されたファイル

- `data/whop-product-assets/images/core-intelligence-hexagonal-shield.png` - 統合コア画像
- `data/whop-product-assets/images/ui-evidence-trading-terminal.png` - UI実機デモ画像
- `data/whop-product-assets/metadata.json` - メタデータ

---

## 🔄 動画生成の再試行

Veo動画の生成に失敗した場合、以下の方法で再試行できます:

```bash
npx tsx scripts/generate-whop-product-images.ts
```

または、Veo APIのエンドポイントが変更された可能性があるため、`api/unified-api.ts`の`callVeo31`関数を確認してください。

---

**最終更新**: 2026-01-12  
**状態**: ✅ 画像生成完了、配置ガイド作成完了
