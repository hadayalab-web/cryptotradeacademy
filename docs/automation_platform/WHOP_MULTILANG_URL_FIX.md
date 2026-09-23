# 言語別Whop URL対応修正レポート

**作成日**: 2026-01-15  
**目的**: VSLワークフローで言語別Whopページに対応

---

## 📋 問題点

### 現状の問題
- VSL2配信とVSL2ラストコールで、EN版のWhop URLのみを使用していた
- 言語別のWhopページが存在するにもかかわらず、すべてのユーザーにEN版のURLを送信していた

### 提供された言語別Whop URL
- **EN**: https://whop.com/aio-media-llc/trap-defence-btc-en/
- **ES**: https://whop.com/aio-media-llc/trap-defense-btc-es/
- **AR**: https://whop.com/aio-media-llc/tap-defense-btc-ar/
- **PT-BR**: https://whop.com/aio-media-llc/trap-defense-btc-ptbr/
- **KO**: https://whop.com/aio-media-llc/trap-defense-btc-ko/
- **JA**: https://whop.com/aio-media-llc/trap-defence-btc-ja/

---

## ✅ 修正内容

### 1. `api/vsl2-free-users.js`の修正

#### 修正前
```javascript
const WHOP_PRODUCT_URL_EN = process.env.WHOP_PRODUCT_URL_EN || 'https://whop.com/aio-media-llc/trap-defense-btc-en/';
```

#### 修正後
```javascript
// LANG を正規化（en, es, pt-br, ar, ja, ko だけ許可）
const rawLang = process.env.LANG || 'en';
const baseLang = rawLang.toLowerCase().split('.')[0].split('_')[0];
const SUPPORTED_LANGS = ['en', 'es', 'pt-br', 'ar', 'ja', 'ko'];
const LANG = SUPPORTED_LANGS.includes(baseLang) ? baseLang : 'en';

// 言語別Whop URLマッピング
const WHOP_PRODUCT_URLS = {
  'en': process.env.WHOP_PRODUCT_URL_EN || 'https://whop.com/aio-media-llc/trap-defence-btc-en/',
  'es': process.env.WHOP_PRODUCT_URL_ES || 'https://whop.com/aio-media-llc/trap-defense-btc-es/',
  'pt-br': process.env.WHOP_PRODUCT_URL_PTBR || 'https://whop.com/aio-media-llc/trap-defense-btc-ptbr/',
  'ar': process.env.WHOP_PRODUCT_URL_AR || 'https://whop.com/aio-media-llc/tap-defense-btc-ar/',
  'ko': process.env.WHOP_PRODUCT_URL_KO || 'https://whop.com/aio-media-llc/trap-defense-btc-ko/',
  'ja': process.env.WHOP_PRODUCT_URL_JA || 'https://whop.com/aio-media-llc/trap-defence-btc-ja/',
};

// 現在のデプロイメントの言語に対応するWhop URLを取得
const WHOP_PRODUCT_URL = WHOP_PRODUCT_URLS[LANG] || WHOP_PRODUCT_URLS['en'];
```

#### 変更箇所
1. メッセージ内のWhop URL: `${WHOP_PRODUCT_URL_EN}` → `${WHOP_PRODUCT_URL}`
2. インラインボタンのWhop URL: `${WHOP_PRODUCT_URL_EN}` → `${WHOP_PRODUCT_URL}`

---

### 2. `api/vsl2-last-call.js`の修正

#### 修正前
```javascript
const WHOP_PRODUCT_URL_EN = process.env.WHOP_PRODUCT_URL_EN || 'https://whop.com/aio-media-llc/trap-defense-btc-en/';
```

#### 修正後
```javascript
// LANG を正規化（en, es, pt-br, ar, ja, ko だけ許可）
const rawLang = process.env.LANG || 'en';
const baseLang = rawLang.toLowerCase().split('.')[0].split('_')[0];
const SUPPORTED_LANGS = ['en', 'es', 'pt-br', 'ar', 'ja', 'ko'];
const LANG = SUPPORTED_LANGS.includes(baseLang) ? baseLang : 'en';

// 言語別Whop URLマッピング
const WHOP_PRODUCT_URLS = {
  'en': process.env.WHOP_PRODUCT_URL_EN || 'https://whop.com/aio-media-llc/trap-defence-btc-en/',
  'es': process.env.WHOP_PRODUCT_URL_ES || 'https://whop.com/aio-media-llc/trap-defense-btc-es/',
  'pt-br': process.env.WHOP_PRODUCT_URL_PTBR || 'https://whop.com/aio-media-llc/trap-defense-btc-ptbr/',
  'ar': process.env.WHOP_PRODUCT_URL_AR || 'https://whop.com/aio-media-llc/tap-defense-btc-ar/',
  'ko': process.env.WHOP_PRODUCT_URL_KO || 'https://whop.com/aio-media-llc/trap-defense-btc-ko/',
  'ja': process.env.WHOP_PRODUCT_URL_JA || 'https://whop.com/aio-media-llc/trap-defence-btc-ja/',
};

// 現在のデプロイメントの言語に対応するWhop URLを取得
const WHOP_PRODUCT_URL = WHOP_PRODUCT_URLS[LANG] || WHOP_PRODUCT_URLS['en'];
```

#### 変更箇所
1. メッセージ内のWhop URL: `${WHOP_PRODUCT_URL_EN}` → `${WHOP_PRODUCT_URL}`
2. インラインボタンのWhop URL: `${WHOP_PRODUCT_URL_EN}` → `${WHOP_PRODUCT_URL}`

---

## 🎯 動作原理

### アーキテクチャ
- プロジェクトは6つの独立したデプロイメントで構成されている
- 各デプロイメントは`LANG`環境変数で言語が設定されている
- VSLワークフローは各デプロイメントの`LANG`環境変数に基づいて、適切なWhop URLを選択する

### 動作フロー
1. 各デプロイメントで`LANG`環境変数が設定されている（例: `LANG=ja`）
2. VSL2配信またはVSL2ラストコールが実行される
3. `LANG`環境変数に基づいて、対応するWhop URLを選択
4. ユーザーに言語別のWhop URLを含むメッセージを送信

---

## 📋 環境変数設定（オプション）

各デプロイメントで、言語別のWhop URLを環境変数で設定することも可能です：

```
# EN市場デプロイメント
LANG=en
WHOP_PRODUCT_URL_EN=https://whop.com/aio-media-llc/trap-defence-btc-en/

# ES市場デプロイメント
LANG=es
WHOP_PRODUCT_URL_ES=https://whop.com/aio-media-llc/trap-defense-btc-es/

# PT-BR市場デプロイメント
LANG=pt-br
WHOP_PRODUCT_URL_PTBR=https://whop.com/aio-media-llc/trap-defense-btc-ptbr/

# AR市場デプロイメント
LANG=ar
WHOP_PRODUCT_URL_AR=https://whop.com/aio-media-llc/tap-defense-btc-ar/

# KO市場デプロイメント
LANG=ko
WHOP_PRODUCT_URL_KO=https://whop.com/aio-media-llc/trap-defense-btc-ko/

# JA市場デプロイメント
LANG=ja
WHOP_PRODUCT_URL_JA=https://whop.com/aio-media-llc/trap-defence-btc-ja/
```

**注意**: 環境変数が設定されていない場合、デフォルトのURLが使用されます。

---

## ✅ 修正完了項目

- [x] `api/vsl2-free-users.js`で言語別Whop URLマッピングを追加
- [x] `api/vsl2-free-users.js`でメッセージ内のWhop URLを修正
- [x] `api/vsl2-free-users.js`でインラインボタンのWhop URLを修正
- [x] `api/vsl2-last-call.js`で言語別Whop URLマッピングを追加
- [x] `api/vsl2-last-call.js`でメッセージ内のWhop URLを修正
- [x] `api/vsl2-last-call.js`でインラインボタンのWhop URLを修正

---

## 🎊 結論

**VSLワークフローが言語別Whopページに対応しました。**

### 確認されたポイント
1. ✅ **言語別Whop URLマッピング**: 6言語すべてに対応
2. ✅ **環境変数ベースの選択**: `LANG`環境変数に基づいて適切なURLを選択
3. ✅ **フォールバック**: 環境変数が設定されていない場合、デフォルトURLを使用
4. ✅ **後方互換性**: 既存の環境変数名（`WHOP_PRODUCT_URL_EN`など）もサポート

### 次のステップ
1. 各デプロイメントで`LANG`環境変数が正しく設定されているか確認
2. デプロイ後、各言語のVSL2配信で正しいWhop URLが使用されているか確認

---

**作成者**: COO（Cursor/Composer 1）  
**状態**: ✅ **言語別Whop URL対応完了**
