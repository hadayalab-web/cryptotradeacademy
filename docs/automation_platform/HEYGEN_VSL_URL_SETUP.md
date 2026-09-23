# HeyGen VSL URL設定ガイド

**作成日時**: 2026-01-13  
**目的**: TelegramとEmailで使用するVSLリンクの設定方法

---

## 📹 VSL URLの種類

### 1. 埋め込みプレーヤーURL（Email用）

**URL**: `https://app.heygen.com/embedded-player/3aaf47b98f4b49c59c14999a16038af3`

**用途**: 
- Email（HTMLメール）でiframeタグとして埋め込み
- Webページへの埋め込み

**設定場所**: `scripts/generate-dm-messages-en.ts`の`VSL_EMBED_URL`定数

---

### 2. 動画の直接URL（Telegram用）

**URL**: `https://app.heygen.com/videos/3aaf47b98f4b49c59c14999a16038af3`

**用途**:
- Telegramでテキストリンクとして共有
- Email（テキストメール）でリンクとして共有
- ブラウザで直接開ける

**設定方法**: `.env`ファイルに以下を追加

```env
HEYGEN_VSL_SHARE_URL=https://app.heygen.com/videos/3aaf47b98f4b49c59c14999a16038af3
```

**デフォルト値**: 環境変数が設定されていない場合、上記のURLがデフォルトとして使用されます

---

## 🔧 設定手順

### Step 1: `.env`ファイルに追加

`.env`ファイルを開き、以下を追加：

```env
HEYGEN_VSL_SHARE_URL=https://app.heygen.com/videos/3aaf47b98f4b49c59c14999a16038af3
```

### Step 2: 確認

設定が正しく反映されているか確認：

```bash
# 環境変数が読み込まれているか確認（オプション）
echo $HEYGEN_VSL_SHARE_URL
```

---

## ✅ 動作確認

### Email送信時

- iframeタグで埋め込みプレーヤーが表示される
- URL: `https://app.heygen.com/embedded-player/3aaf47b98f4b49c59c14999a16038af3`

### Telegram送信時

- 動画の直接URLがテキストリンクとして送信される
- URL: `https://app.heygen.com/videos/3aaf47b98f4b49c59c14999a16038af3`
- ユーザーがクリックすると、ブラウザで動画が開く

---

## 📝 コード内での使用

### `scripts/generate-dm-messages-en.ts`

```typescript
const VSL_EMBED_URL = 'https://app.heygen.com/embedded-player/3aaf47b98f4b49c59c14999a16038af3'; // Email用
const VSL_SHARE_URL = process.env.HEYGEN_VSL_SHARE_URL || 'https://app.heygen.com/videos/3aaf47b98f4b49c59c14999a16038af3'; // Telegram用
```

### `scripts/send-ceo-test-dm-csv.ts`

```typescript
// Telegram送信時、埋め込みURLを共有URLに置換
.replace(/https:\/\/app\.heygen\.com\/embedded-player\/[^\s"<>]+/g, 
  process.env.HEYGEN_VSL_SHARE_URL || 'https://app.heygen.com/videos/3aaf47b98f4b49c59c14999a16038af3')
```

---

## 🎯 現在の設定

✅ **埋め込みプレーヤーURL**: `https://app.heygen.com/embedded-player/3aaf47b98f4b49c59c14999a16038af3`  
✅ **動画の直接URL**: `https://app.heygen.com/videos/3aaf47b98f4b49c59c14999a16038af3`

両方のURLが設定済みです。`.env`ファイルに`HEYGEN_VSL_SHARE_URL`を追加すれば、環境変数から読み込まれます。設定しなくても、デフォルト値として動画の直接URLが使用されます。

---

**作成日時**: 2026-01-13  
**報告者**: COO兼CTO（Cursor/Composer 1）
