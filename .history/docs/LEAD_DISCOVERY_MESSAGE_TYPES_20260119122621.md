# リード発見システム - 配信メッセージ種類一覧

## 概要

リード発見システムでは、発見したリードに対して**4種類のメッセージ**を自動配信します。各メッセージは異なるタイミングと目的で送信され、リードを無料版ユーザーから有料版ユーザーへと段階的にコンバートするためのファネルを構成しています。

---

## メッセージ種類一覧

### 1. VSL1メッセージ（初回配信）

![VSL1サムネイル](../public/images/thumbnails/vsl1_thumbnail.png)

**タイミング**: リード発見時（X/TwitterまたはTelegram経由）  
**目的**: 無料版オプトイン誘導  
**配信チャネル**:

- X/Twitter: リプライ形式
- Telegram: DM形式

**メッセージ内容**:

- 2人のトレーダーの比較ストーリー（同じ資金で始めたが、異なる結果）
- VSL1動画リンク（YouTube）
- Telegram Botへのディープリンク
- 「プロが使うトラップ回避ロジック」の無料提供を訴求

**対応言語**: 6言語

- English (en)
- 日本語 (ja)
- Español (es)
- Português Brasil (pt-br)
- العربية (ar)
- 한국어 (ko)

**実装ファイル**:

- `services/telegram/messages/vsl1.js`
- `services/lead-discovery/xLeadDiscovery.js` (X経由)
- `services/lead-discovery/telegramGroupMonitor.js` (Telegram経由)

**重複送信防止**:

- `services/lead-discovery/duplicatePrevention.js`で管理
- 同じリードには1回のみ送信

---

### 2. VSL1リマインドメッセージ

**タイミング**: VSL1送信から12-24時間後（VSL2未送信の場合）  
**目的**: エンゲージメント維持、FOMO要素の追加  
**配信チャネル**: Telegram DM

**メッセージ内容**:

- 緊急性を強調（「残りX時間」のランダム表示）
- 市場の動きの予測結果の報告
- 「今日もユーザーが損失を回避した」という証拠
- VSL1動画への再誘導
- Telegram Botへの再誘導

**対応言語**: 英語（EN版のみ）

**実装ファイル**:

- `api/vsl1-reminder.js`
- `services/free-users/manager.js` (対象ユーザー取得)

**送信条件**:

- 無料版ユーザー登録から12-24時間経過
- VSL2未送信
- VSL1リマインド未送信

---

### 3. VSL2メッセージ（アップセル）

![VSL2サムネイル](../public/images/thumbnails/vsl2_thumbnail.png)

**タイミング**: 無料版ユーザー登録から24時間後  
**目的**: 有料版へのアップセル、50%OFFクーポン配信  
**配信チャネル**: Telegram DM

**メッセージ内容**:

- 無料版と完全版の比較
  - 無料版 = 「コンパス」（方向性のみ）
  - 完全版 = 「宝の地図」（完全な情報）
- 完全版の3つのメリット
  1. 完全なオンチェーン分析
  2. リアルタイムトラップアラート
  3. Dr. Grokサポート（AI心理サポート）
- VSL2動画リンク（YouTube）
- Whop商品ページリンク（プロモーションコード付き）
- 50%OFF限定クーポンコード

**対応言語**: 6言語

- English (en)
- 日本語 (ja)
- Español (es)
- Português Brasil (pt-br)
- العربية (ar)
- 한국어 (ko)

**実装ファイル**:

- `services/telegram/messages/vsl2.js`
- `api/vsl2-free-users.js`
- `services/free-users/manager.js` (対象ユーザー取得)

**送信条件**:

- 無料版ユーザー登録から24時間経過
- VSL2未送信

**画像添付**: VSL2サムネイル画像（`public/images/thumbnails/vsl2_thumbnail.png`）

---

### 4. VSL2 Last Callメッセージ（終了直前リマインド）

**タイミング**: 無料版ユーザー登録から22時間後（VSL2未送信の場合）  
**目的**: VSL2送信前の最終リマインド  
**配信チャネル**: Telegram DM

**メッセージ内容**:

- 最終案内の緊急性
- VSL2の3つのメリットの再確認
  1. 完全なオンチェーン分析
  2. リアルタイムトラップアラート
  3. Dr. Grokサポート
- VSL2動画リンク（YouTube）
- Whop商品ページリンク（プロモーションコード付き）
- 50%OFFクーポンコード

**対応言語**: 6言語

- English (en)
- 日本語 (ja)
- Español (es)
- Português Brasil (pt-br)
- العربية (ar)
- 한국어 (ko)

**実装ファイル**:

- `services/telegram/messages/vsl2-last-call.js`
- `api/vsl2-last-call.js`
- `services/free-users/manager.js` (対象ユーザー取得)

**送信条件**:

- 無料版ユーザー登録から22時間経過
- VSL2未送信
- VSL2 Last Call未送信

**画像添付**: VSL2 Last Call専用サムネイル画像（`public/images/thumbnails/vsl2_last_call_thumbnail.png`）
**生成スクリプト**: `scripts/generate-vsl2-last-call-thumbnail.js`
**高CVR仕様**: 緊急性・FOMO・社会的証明・損失回避を強調した4コマスタイル

**注意**: VSL2 Last Callは22時間後、VSL2は24時間後に送信されるため、Last Callが先に送信されます。

---

## 配信タイムライン

```
リード発見
    ↓
[0時間] VSL1メッセージ送信
    ↓
[12-24時間] VSL1リマインドメッセージ送信（VSL2未送信の場合）
    ↓
[22時間] VSL2 Last Callメッセージ送信（VSL2未送信の場合）
    ↓
[24時間] VSL2メッセージ送信
```

---

## メッセージ生成ロジック

### VSL1メッセージ生成

```javascript
// services/telegram/messages/vsl1.js
const { generateVSL1Message } = require("../services/telegram/messages/vsl1");
const message = generateVSL1Message(lead.lang, deepLink, VSL1_YOUTUBE_LINK);
```

### VSL2メッセージ生成

```javascript
// services/telegram/messages/vsl2.js
const { generateVSL2Message } = require("../services/telegram/messages/vsl2");
const message = generateVSL2Message(userLang, userName, VSL2_YOUTUBE_LINK, whopUrl, promoCode);
```

### VSL2 Last Callメッセージ生成

```javascript
// services/telegram/messages/vsl2-last-call.js
const { generateVSL2LastCallMessage } = require("../services/telegram/messages/vsl2-last-call");
const message = generateVSL2LastCallMessage(
  userLang,
  userName,
  VSL2_YOUTUBE_LINK,
  whopUrl,
  promoCode
);
```

---

## 重複送信防止

すべてのメッセージは重複送信防止機能により、同じリード/ユーザーに対しては1回のみ送信されます。

**実装**:

- `services/lead-discovery/duplicatePrevention.js` (VSL1用)
- `services/free-users/manager.js` (VSL2/VSL2 Last Call用)

**チェック方法**:

- VSL1: KVストレージに`vsl1:sent:{userId}`キーで記録
- VSL2/VSL2 Last Call: 無料版ユーザーデータの`vsl2Sent`/`vsl2LastCallSent`フラグで管理

---

## レート制限対策

### Telegram API

- 20メッセージ/秒の制限
- メッセージ送信間に100ms待機を実装

### Resend API（メール送信）

- 1秒あたり2リクエストの制限
- レポート送信時に1秒待機を実装

---

## 環境変数

### VSL1関連

- `VSL1_YOUTUBE_LINK`: VSL1動画のYouTubeリンク（デフォルト: `https://youtu.be/OqvqngJOiXc`）

### VSL2関連

- `VSL2_YOUTUBE_LINK`: VSL2動画のYouTubeリンク（デフォルト: `https://youtu.be/fXgVsKhqDjI`）
- `WHOP_PRODUCT_URL`: Whop商品ページURL
- `PROMO_CODE`: プロモーションコード（50%OFF）

### Telegram関連

- `TELEGRAM_BOT_TOKEN`: Telegram Botトークン（各言語用）
- `TELEGRAM_BOT_TOKEN_EN`: 英語版Botトークン

---

## メッセージテンプレートのカスタマイズ

各メッセージテンプレートは以下のファイルで管理されています：

1. **VSL1**: `services/telegram/messages/vsl1.js`
2. **VSL2**: `services/telegram/messages/vsl2.js`
3. **VSL2 Last Call**: `services/telegram/messages/vsl2-last-call.js`
4. **VSL1リマインド**: `api/vsl1-reminder.js` (関数内に直接定義)

各言語のメッセージは、Gemini CMOによって最適化されており、文化的な文脈と高コンバージョンを考慮した内容になっています。

---

## 関連ドキュメント

- [リード発見戦略](./LEAD_DISCOVERY_STRATEGY.md)
- [Telegramリード発見フロー](./TELEGRAM_LEAD_DISCOVERY_FLOW.md)
- [Xリード発見フロー](./GROK_X_LEAD_DISCOVERY_FLOW.md)
- [CVR追跡システム](./CVR_TRACKING_SYSTEM.md)
- [リード発見レポート機能](./LEAD_DISCOVERY_REPORT_FEATURES.md)

---

## 更新履歴

- 2026-01-19: 初版作成 - 4種類のメッセージ配信システムをドキュメント化
