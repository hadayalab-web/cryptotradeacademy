# Telegram Bot 複数チャンネル管理ガイド

**作成日**: 2026-01-13  
**目的**: 1つのTelegram Botで複数のチャンネル（Trap Defense BTC 6言語 + 他シリーズ 6言語）を管理する方法

---

## 🎯 結論: 1つのBotで複数チャンネル管理可能

**1つのTelegram Bot Tokenで、複数のチャンネルにメッセージを送信できます。**

---

## 📊 構成例

### Trap Defense BTC（6言語）

| 市場 | 言語 | 環境変数名 | チャンネルID例 |
|------|------|------------|----------------|
| EN | English | `TELEGRAM_CHAT_ID_BTC_EN` | `-1001234567890` |
| AR | Arabic | `TELEGRAM_CHAT_ID_BTC_AR` | `-1001234567891` |
| KO | Korean | `TELEGRAM_CHAT_ID_BTC_KO` | `-1001234567892` |
| JA | Japanese | `TELEGRAM_CHAT_ID_BTC_JA` | `-1001234567893` |
| ES | Spanish | `TELEGRAM_CHAT_ID_BTC_ES` | `-1001234567894` |
| PT-BR | Portuguese | `TELEGRAM_CHAT_ID_BTC_PT_BR` | `-1001234567895` |

### Trap Defense 他シリーズ（6言語）

| 市場 | 言語 | 環境変数名 | チャンネルID例 |
|------|------|------------|----------------|
| EN | English | `TELEGRAM_CHAT_ID_OTHER_EN` | `-1001234567896` |
| AR | Arabic | `TELEGRAM_CHAT_ID_OTHER_AR` | `-1001234567897` |
| KO | Korean | `TELEGRAM_CHAT_ID_OTHER_KO` | `-1001234567898` |
| JA | Japanese | `TELEGRAM_CHAT_ID_OTHER_JA` | `-1001234567899` |
| ES | Spanish | `TELEGRAM_CHAT_ID_OTHER_ES` | `-1001234567900` |
| PT-BR | Portuguese | `TELEGRAM_CHAT_ID_OTHER_PT_BR` | `-1001234567901` |

---

## 🔧 実装方法

### 環境変数設定

```bash
# 1つのBot Token（全チャンネル共通）
TELEGRAM_BOT_TOKEN=<your_bot_token>

# Trap Defense BTC（6言語）
TELEGRAM_CHAT_ID_BTC_EN=-1001234567890
TELEGRAM_CHAT_ID_BTC_AR=-1001234567891
TELEGRAM_CHAT_ID_BTC_KO=-1001234567892
TELEGRAM_CHAT_ID_BTC_JA=-1001234567893
TELEGRAM_CHAT_ID_BTC_ES=-1001234567894
TELEGRAM_CHAT_ID_BTC_PT_BR=-1001234567895

# Trap Defense 他シリーズ（6言語）
TELEGRAM_CHAT_ID_OTHER_EN=-1001234567896
TELEGRAM_CHAT_ID_OTHER_AR=-1001234567897
TELEGRAM_CHAT_ID_OTHER_KO=-1001234567898
TELEGRAM_CHAT_ID_OTHER_JA=-1001234567899
TELEGRAM_CHAT_ID_OTHER_ES=-1001234567900
TELEGRAM_CHAT_ID_OTHER_PT_BR=-1001234567901

# 無料版チャンネル（オプション）
TELEGRAM_CHAT_ID_MINIMAL=-1001234567902
```

### コード実装

`cryptosignal-ai/services/telegram/bot.js`に以下の関数を追加：

```javascript
/**
 * Send a message to a specific Telegram channel by series and market.
 * @param {string} text - Message text
 * @param {string} series - Series type ('BTC', 'OTHER', etc.)
 * @param {string} marketCode - Market code ('EN', 'AR', 'KO', 'JA', 'ES', 'PT-BR')
 * @returns {Promise<Object>} Telegram API response
 */
async function sendMessageToChannel(text, series = 'BTC', marketCode = 'EN') {
  const botToken = TELEGRAM_BOT_TOKEN;
  
  // 環境変数名を生成（例: TELEGRAM_CHAT_ID_BTC_EN）
  const envVarName = `TELEGRAM_CHAT_ID_${series}_${marketCode}`;
  const chatId = process.env[envVarName];
  
  if (!botToken || !chatId) {
    console.warn(`⚠️ Telegram credentials missing for ${series}/${marketCode}. Bot Token: ${!!botToken}, Chat ID: ${!!chatId}`);
    return;
  }

  const url = new URL(`https://api.telegram.org/bot${botToken}/sendMessage`);
  const body = {
    chat_id: chatId,
    text,
    parse_mode: "Markdown"
  };

  try {
    const response = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Telegram API Error: ${response.status} ${response.statusText} - ${errText}`);
    }

    const data = await response.json();
    console.log(`📨 Telegram sent to ${series}/${marketCode}:`, JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error(`❌ Telegram sendMessageToChannel failed for ${series}/${marketCode}:`, error.message);
    throw error;
  }
}
```

### cron.jsでの使用例

```javascript
// 現在の市場コードとシリーズを取得
const marketCode = getMarketCode(LANG); // 'EN', 'AR', 'KO', etc.
const series = 'BTC'; // または 'OTHER'

// チャンネルに送信
await sendMessageToChannel(regularText, series, marketCode);
```

---

## 📋 チャンネル作成手順

### Step 1: 各チャンネルを作成

1. **Trap Defense BTC（6言語）**
   - `Trap Defense BTC - Intelligence Report (EN)`
   - `Trap Defense BTC - Intelligence Report (AR)`
   - `Trap Defense BTC - Intelligence Report (KO)`
   - `Trap Defense BTC - Intelligence Report (JA)`
   - `Trap Defense BTC - Intelligence Report (ES)`
   - `Trap Defense BTC - Intelligence Report (PT-BR)`

2. **Trap Defense 他シリーズ（6言語）**
   - `Trap Defense [Series] - Intelligence Report (EN)`
   - `Trap Defense [Series] - Intelligence Report (AR)`
   - ...（同様に6言語）

### Step 2: Botを管理者として追加

各チャンネルで：
1. チャンネル設定 → 管理者 → 管理者を追加
2. Botを検索して追加
3. 権限: 「メッセージを投稿」を有効化

### Step 3: チャンネルIDを取得

各チャンネルのIDを取得して環境変数に設定：

```bash
# Bot経由で取得
curl https://api.telegram.org/bot<BOT_TOKEN>/getUpdates

# または @userinfobot を使用
```

---

## 🎯 使用例

### 有料版配信

```javascript
// Trap Defense BTC（EN市場）
await sendMessageToChannel(regularText, 'BTC', 'EN');

// Trap Defense BTC（JA市場）
await sendMessageToChannel(regularText, 'BTC', 'JA');

// Trap Defense 他シリーズ（EN市場）
await sendMessageToChannel(regularText, 'OTHER', 'EN');
```

### 無料版配信

```javascript
// 無料版チャンネル（全言語共通、または言語別に分割可能）
await sendMessageToAsset(minimalText, 'MINIMAL');
```

---

## ⚠️ 注意事項

### 1. Bot Tokenの管理
- **1つのBot Token**: 全チャンネルで共通使用
- **セキュリティ**: Bot Tokenは環境変数で管理（Gitにコミットしない）

### 2. チャンネルIDの管理
- **命名規則**: `TELEGRAM_CHAT_ID_{SERIES}_{MARKET}`
- **フォーマット**: 通常`-100`で始まる数値
- **公開チャンネル**: `@channel_username`も使用可能

### 3. レート制限
- **Telegram Bot API**: 20メッセージ/秒（チャンネル配信時）
- **大量配信時**: レート制限に注意
- **推奨**: 1チャンネルあたり1メッセージ/秒程度

### 4. エラーハンドリング
- チャンネルIDが設定されていない場合のフォールバック
- APIエラー時のリトライロジック
- ログ記録（どのチャンネルに送信したか）

---

## 📊 期待される効果

### 管理の簡素化
- **1つのBot Token**: 管理が簡単
- **環境変数で制御**: チャンネル追加が容易
- **コードの統一**: 同じ関数で全チャンネルに対応

### スケーラビリティ
- **新規シリーズ追加**: 環境変数のみで対応可能
- **新規言語追加**: 同様に環境変数のみで対応可能
- **コード変更不要**: 既存コードをそのまま使用可能

---

## 🔧 実装チェックリスト

### Phase 1: チャンネル作成
- [ ] Trap Defense BTC（6言語）チャンネル作成
- [ ] Trap Defense 他シリーズ（6言語）チャンネル作成
- [ ] Botを各チャンネルの管理者として追加
- [ ] チャンネルIDを取得

### Phase 2: 環境変数設定
- [ ] `.env`ファイルに全チャンネルIDを設定
- [ ] 本番環境の環境変数も設定
- [ ] 環境変数の命名規則を統一

### Phase 3: コード実装
- [ ] `sendMessageToChannel`関数を実装
- [ ] `cron.js`で使用するように修正
- [ ] エラーハンドリングを追加
- [ ] ログ記録を追加

### Phase 4: テスト
- [ ] 各チャンネルにテストメッセージを送信
- [ ] 正しいチャンネルに配信されることを確認
- [ ] エラー時の動作を確認

---

## 🎯 結論

**1つのTelegram Botで、Trap Defense BTC 6言語 + 他シリーズ 6言語 = 合計12チャンネル以上を管理可能です。**

実装方法:
1. ✅ 1つのBot Tokenを使用
2. ✅ 環境変数で各チャンネルIDを管理
3. ✅ `sendMessageToChannel(series, marketCode)`関数で送信

現在の実装を拡張するだけで対応可能です。

---

**状態**: ✅ 実装可能 - 環境変数と関数追加のみで対応
