# HeyGen VSLリンクの使い分け

**作成日時**: 2026-01-13  
**目的**: TelegramとEmailで使用するVSLリンクの違いを明確化

---

## 📹 VSLリンクの種類

### 1. 埋め込みプレーヤーURL（Email用）

**URL**: `https://app.heygen.com/embedded-player/3aaf47b98f4b49c59c14999a16038af3`

**用途**: 
- Email（HTMLメール）でiframeタグとして埋め込み
- Webページへの埋め込み

**形式**:
```html
<iframe width="560" height="315" src="https://app.heygen.com/embedded-player/3aaf47b98f4b49c59c14999a16038af3" title="HeyGen ビデオプレーヤー" frameborder="0" allow="encrypted-media; fullscreen;" allowfullscreen></iframe>
```

**制限**: Telegramではiframeタグがサポートされていないため使用不可

---

### 2. 共有リンクURL（Telegram用）

**取得方法**: 
1. HeyGenの動画ページで「このビデオを共有」をクリック
2. 共有ダイアログで「リンクをコピー」ボタンをクリック
3. コピーされたURLを使用

**URL形式**: `https://app.heygen.com/share/...` または `https://heygen.com/share/...`

**用途**:
- Telegramでテキストリンクとして共有
- Email（テキストメール）でリンクとして共有
- 直接ブラウザで開ける

**形式**:
```
📹 Watch our VSL: https://app.heygen.com/share/...
```

**利点**: 
- Telegramでクリック可能なリンクとして表示される
- ブラウザで直接開ける
- プレビューが表示される可能性がある

---

## 🔧 実装方法

### コードでの使い分け

```typescript
// 設定
const VSL_EMBED_URL = 'https://app.heygen.com/embedded-player/3aaf47b98f4b49c59c14999a16038af3'; // Email用
const VSL_SHARE_URL = 'https://app.heygen.com/share/...'; // Telegram用（HeyGenから取得）

// Email送信時
const emailMessage = `
  <p>Watch our VSL:</p>
  <iframe width="560" height="315" src="${VSL_EMBED_URL}" ...></iframe>
`;

// Telegram送信時
const telegramMessage = `
  📹 Watch our VSL: ${VSL_SHARE_URL}
`;
```

---

## ⚠️ 重要事項

1. **Telegramではiframeタグが使えない**
   - 埋め込みプレーヤーURLは使用不可
   - 共有リンクURLをテキストリンクとして使用

2. **Emailでは両方使用可能**
   - HTMLメール: iframeタグで埋め込み
   - テキストメール: 共有リンクURLをテキストリンクとして使用

3. **共有リンクURLの取得**
   - HeyGenの「リンクをコピー」ボタンから取得
   - 埋め込みプレーヤーURLとは異なる

---

## 📝 次のステップ

1. ✅ HeyGenの「リンクをコピー」から共有リンクURLを取得
2. ⏳ 共有リンクURLをコードに設定
3. ⏳ Telegram送信時にiframeタグを削除し、共有リンクURLを使用するように修正

---

**作成日時**: 2026-01-13  
**報告者**: COO兼CTO（Cursor/Composer 1）
