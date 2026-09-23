# VSLアセット管理ガイド

**作成日**: 2026-01-13  
**目的**: VSL関連の重要なアセット（CEOアバター、ロゴ等）の管理と活用

---

## 📁 アセットディレクトリ構造

```
data/
├── vsl-assets/
│   ├── avatars/
│   │   ├── ceo-avatar-1.png      # CEOアバター画像1
│   │   └── ceo-avatar-2.png       # CEOアバター画像2
│   └── logos/
│       ├── cryptotradeacademy-logo.png              # CryptoTradeAcademyロゴ（通常版）
│       └── cryptotradeacademy-logo-transparent.png  # CryptoTradeAcademyロゴ（透過版）
├── vsl-thumbnails/              # 生成されたサムネイル
└── whop-product-assets/         # Whopプロダクト用アセット
    ├── images/
    └── videos/
```

---

## 🎨 アセット詳細

### CEOアバター画像

**用途**:
- VSLサムネイルのベース画像
- 投稿コンテンツの権威性向上
- ブランドパーソナリティの確立

**ファイル**:
- `data/vsl-assets/avatars/ceo-avatar-1.png`
- `data/vsl-assets/avatars/ceo-avatar-2.png`

**使用例**:
```typescript
// サムネイル生成時に参照画像として使用
const referenceImage = join(__dirname, '..', 'data', 'vsl-assets', 'avatars', 'ceo-avatar-1.png');
```

---

### CryptoTradeAcademyロゴ

**用途**:
- サムネイルのブランディング
- 投稿コンテンツのロゴ表示
- 一貫したブランドイメージ

**ファイル**:
- `data/vsl-assets/logos/cryptotradeacademy-logo.png` (通常版)
- `data/vsl-assets/logos/cryptotradeacademy-logo-transparent.png` (透過版)

**使用推奨**:
- **通常版**: 白背景や単色背景に使用
- **透過版**: 画像オーバーレイや複雑な背景に使用

**使用例**:
```typescript
// サムネイルにロゴをオーバーレイ
const logoPath = join(__dirname, '..', 'data', 'vsl-assets', 'logos', 'cryptotradeacademy-logo-transparent.png');
```

---

## 🔧 サムネイル生成スクリプトの更新

### 参照画像の選択

サムネイル生成時に、CEOアバターを自動的に選択:

```typescript
// ランダムまたは順番にアバターを選択
const avatars = [
  join(ASSETS_DIR, 'avatars', 'ceo-avatar-1.png'),
  join(ASSETS_DIR, 'avatars', 'ceo-avatar-2.png'),
];
const selectedAvatar = avatars[Math.floor(Math.random() * avatars.length)];
```

### ロゴの統合

すべてのサムネイルにCryptoTradeAcademyロゴを追加:

```typescript
// ロゴをオーバーレイ
const logoOverlay = await sharp(logoPath)
  .resize(200, 200)
  .toBuffer();

image = image.composite([
  {
    input: logoOverlay,
    left: config.width - 250, // 右下
    top: config.height - 250,
  },
]);
```

---

## 📋 活用シナリオ

### 1. VSLサムネイル生成

**CEOアバターを使用**:
- プロフェッショナルな権威性
- パーソナルな接続
- 信頼性の確立

**ロゴを追加**:
- ブランド認知
- 一貫性の維持
- プロフェッショナルな仕上がり

### 2. 投稿コンテンツ

**CEOアバターをサムネイルとして使用**:
- 投稿の視覚的なインパクト向上
- 権威性の確立
- エンゲージメント向上

**ロゴを統合**:
- ブランド認知の向上
- 一貫したブランディング

### 3. Email/Telegram DM

**CEOアバターをプロフィール画像として使用**:
- パーソナルな接続
- 信頼性の確立

---

## 🔄 スクリプト更新計画

### `scripts/generate-vsl-thumbnail-nanobanana.ts`

- ✅ CEOアバターを参照画像として使用
- ✅ CryptoTradeAcademyロゴをオーバーレイ
- ✅ 複数のアバターから自動選択

### `scripts/generate-posting-content.ts`

- ✅ 生成されたサムネイルパスを自動的に含める
- ✅ CEOアバターを使用したサムネイル生成を統合

---

## 📊 アセット使用マトリックス

| アセット | VSLサムネイル | 投稿コンテンツ | Email | Telegram |
|---------|--------------|--------------|-------|----------|
| CEOアバター1 | ✅ ベース画像 | ✅ サムネイル | ✅ プロフィール | ✅ サムネイル |
| CEOアバター2 | ✅ ベース画像 | ✅ サムネイル | ✅ プロフィール | ✅ サムネイル |
| ロゴ（通常） | ✅ オーバーレイ | ✅ ブランディング | ✅ フッター | ✅ ヘッダー |
| ロゴ（透過） | ✅ オーバーレイ | ✅ ブランディング | ✅ フッター | ✅ ヘッダー |

---

## ✅ 次のステップ

1. ⏳ **サムネイル生成スクリプトを更新**: CEOアバターとロゴを統合
2. ⏳ **投稿コンテンツ生成を更新**: アバターを使用したサムネイル生成を統合
3. ⏳ **DMメッセージ生成を更新**: CEOアバターをプロフィール画像として使用

---

**作成日**: 2026-01-13  
**報告者**: COO兼CTO（Cursor/Composer 1）
