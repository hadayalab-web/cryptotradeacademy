# WhopページVSL使用ガイド

**作成日時**: 2026-01-12  
**目的**: Whopページに埋め込むVSLの使用方法を明確化

---

## 🎯 WhopページVSL使用方針

### ✅ 推奨: タスク1のVSL（Two Young Menストーリー）を使用

**VSL**: `タスク1 ユーザー向けLP用コンテンツ（Two Young Menストーリー）.srt`  
**HeyGen Video ID**: `4da32f33872843be903e4bb427afefde`  
**埋め込みURL**: `https://app.heygen.com/embedded-player/4da32f33872843be903e4bb427afefde`

---

## 📋 理由

### 1. **ドキュメントに基づく決定**
- `docs/VSL_HEYGEN_IMPLEMENTATION.md`によると、タスク1のVSLは「ユーザー向けLPのVSLセクションでメイン使用」と明記されている
- VSL使用マッピングで「タスク1をメインに使用」と決定済み

### 2. **ストーリーの一貫性**
- タスク1のVSLは「Two Young Menストーリー」で、Whopページのタイトル「Why did Trader B earn $5K while Trader A lost everything?」と完全一致
- ユーザー向けLP全体が「Two Young Menストーリー」をベースに設計されている

### 3. **CVR最大化**
- 約1分10秒（69秒）の短い動画で視聴完了率が高い
- 感情的なインパクトが強い
- 防御型トレーディングの重要性が効果的に伝わる

---

## 🔧 実装方法

### Whopページへの埋め込み

Whopページには、HeyGenで作成された動画を埋め込みます：

```html
<iframe 
  width="560" 
  height="315" 
  src="https://app.heygen.com/embedded-player/4da32f33872843be903e4bb427afefde" 
  title="HeyGen ビデオプレーヤー" 
  frameborder="0" 
  allow="encrypted-media; fullscreen;" 
  allowfullscreen>
</iframe>
```

### 環境変数での設定

各市場のWhopページで、環境変数を使用してVSL URLを設定：

```env
NEXT_PUBLIC_VSL_URL_EN=https://app.heygen.com/embedded-player/4da32f33872843be903e4bb427afefde
NEXT_PUBLIC_VSL_URL_AR=https://app.heygen.com/embedded-player/4da32f33872843be903e4bb427afefde
NEXT_PUBLIC_VSL_URL_KO=https://app.heygen.com/embedded-player/4da32f33872843be903e4bb427afefde
NEXT_PUBLIC_VSL_URL_JA=https://app.heygen.com/embedded-player/4da32f33872843be903e4bb427afefde
NEXT_PUBLIC_VSL_URL_ES=https://app.heygen.com/embedded-player/4da32f33872843be903e4bb427afefde
NEXT_PUBLIC_VSL_URL_PT_BR=https://app.heygen.com/embedded-player/4da32f33872843be903e4bb427afefde
```

---

## 📊 VSLの使い分け

| VSL | 用途 | 使用場所 | 動画時間 |
|-----|------|---------|---------|
| **タスク1（Two Young Men）** | ✅ **Whopページに埋め込み** | Whop製品ページ | 約1分10秒 |
| **修正版英語版VSLスクリプト** | DMに挿入するテキスト | DMメッセージ | テキスト形式（Gemini CMOが生成） |

---

## ⚠️ 重要な違い

### WhopページのVSL（タスク1）
- **形式**: HeyGenで作成された動画（埋め込み）
- **用途**: Whop製品ページに埋め込んで視聴してもらう
- **特徴**: 視覚的、感情的なインパクト

### DMに挿入するVSL（修正版英語版スクリプト）
- **形式**: 修正版の英語版VSLスクリプト（Gemini CMOが生成）
- **ファイル**: `data/vsl-scripts/revised-dm-vsl-script.txt`
- **用途**: DMメッセージにテキストとして挿入
- **特徴**: 
  - タスク1のTwo Young Menストーリーとタスク3の詳細説明を統合
  - Whopページの動画（タスク1）と整合性を保持
  - 読みやすいテキスト形式、Whopページへの誘導
  - DMからWhopページに遷移したユーザーが「あ、これのことか！」というアハ体験を得られる設計

---

## ✅ 結論

**Whopページには、タスク1のVSL（Two Young Menストーリー）を使用してください。**

- ✅ ドキュメントで決定済み
- ✅ ストーリーの一貫性
- ✅ CVR最大化
- ✅ 既にHeyGenで動画が作成済み

---

**作成日時**: 2026-01-12  
**責任者**: COO（Cursor/Composer 1）
