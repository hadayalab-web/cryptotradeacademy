# 無料版言語別チャンネルID対応状況
**作成日時**: 2026-01-17 14:07:03  
**作成日**: 2026-01-17  

**最終更新**: 2026-01-17 14:07:03
**状態**: ✅ **コード修正完了、環境変数設定待ち**

---

## ✅ コード修正状況

### 1. `sendMessageToAsset`関数の修正 ✅ 完了

**ファイル**: `services/telegram/bot.js`

**修正内容**:
- 言語コード（`langCode`）パラメータを追加
- `MINIMAL`資産で言語コードが指定された場合、言語別チャンネルIDを参照
- 環境変数形式: `TELEGRAM_CHAT_ID_MINIMAL_{LANG_CODE}`（例: `TELEGRAM_CHAT_ID_MINIMAL_JA`）
- 言語別チャンネルIDが設定されていない場合、デフォルトの`TELEGRAM_CHAT_ID_MINIMAL`にフォールバック

**コード**:
```javascript
// MINIMAL資産で言語コードが指定されている場合、言語別チャンネルIDを参照
if (asset === 'MINIMAL' && langCode) {
  const langCodeUpper = langCode.toUpperCase().replace('-', '_');
  const envVarName = `TELEGRAM_CHAT_ID_MINIMAL_${langCodeUpper}`;
  chatId = process.env[envVarName];
  
  // 言語別チャンネルIDが設定されていない場合、デフォルトのMINIMALチャンネルIDにフォールバック
  if (!chatId) {
    chatId = process.env.TELEGRAM_CHAT_ID_MINIMAL;
    if (chatId) {
      console.warn(`⚠️ Language-specific channel ID not found for MINIMAL/${langCodeUpper}, using default MINIMAL channel`);
    }
  }
}
```

### 2. `cron.js`の修正 ✅ 完了

**ファイル**: `api/cron.js`

**修正内容**:
- 無料版メッセージ送信時に言語コードを渡すように修正
- `LANG`変数（`en`, `ja`, `ko`, `es`, `pt-br`, `ar`）を環境変数形式（`EN`, `JA`, `KO`, `ES`, `PT_BR`, `AR`）に変換

**コード**:
```javascript
// 言語コードを環境変数形式に変換（en -> EN, pt-br -> PT_BR）
const langCodeForEnv = LANG.toUpperCase().replace('-', '_');

// 言語別無料版チャンネルIDまたはデフォルトのMINIMALチャンネルIDを確認
const langSpecificEnvVar = `TELEGRAM_CHAT_ID_MINIMAL_${langCodeForEnv}`;
const hasLangSpecificChannel = !!process.env[langSpecificEnvVar];
const hasDefaultChannel = !!process.env.TELEGRAM_CHAT_ID_MINIMAL;

if (hasLangSpecificChannel || hasDefaultChannel) {
  const sendResult = await sendMessageToAsset(minimalText, 'MINIMAL', langCodeForEnv);
  console.log(`[Free Version] Sent successfully to ${LANG} (${langCodeForEnv}):`, sendResult?.message_id || 'N/A');
}
```

---

## ⚠️ 現在の状況

### 問題: 無料版メッセージがすべてEN版チャンネルに送信されている

**原因**: 環境変数に各言語の無料版チャンネルIDが設定されていないため、フォールバックとして`TELEGRAM_CHAT_ID_MINIMAL`（EN版）が使用されている

**動作フロー**:
1. `cron.js`が各言語の無料版メッセージを生成
2. `sendMessageToAsset(minimalText, 'MINIMAL', langCodeForEnv)`を呼び出し
3. `sendMessageToAsset`関数内で`TELEGRAM_CHAT_ID_MINIMAL_{LANG_CODE}`を参照
4. 環境変数が設定されていない場合、`TELEGRAM_CHAT_ID_MINIMAL`（EN版）にフォールバック
5. 結果: すべての言語の無料版メッセージがEN版チャンネルに送信される

---

## ✅ 解決方法

### Vercel Dashboardで環境変数を設定

各言語の無料版チャンネルIDを以下の環境変数に設定してください：

```bash
# デフォルト（フォールバック用）
TELEGRAM_CHAT_ID_MINIMAL=-1003603117491  # EN版（既存）

# 言語別チャンネルID（新規追加が必要）
TELEGRAM_CHAT_ID_MINIMAL_EN=-1003603117491   # English（既存）
TELEGRAM_CHAT_ID_MINIMAL_JA=-100XXXXXXXXXX   # 日本語版チャンネルID（要設定）
TELEGRAM_CHAT_ID_MINIMAL_KO=-100XXXXXXXXXX   # 韓国語版チャンネルID（要設定）
TELEGRAM_CHAT_ID_MINIMAL_ES=-100XXXXXXXXXX   # スペイン語版チャンネルID（要設定）
TELEGRAM_CHAT_ID_MINIMAL_PT_BR=-100XXXXXXXXXX # ポルトガル語版チャンネルID（要設定）
TELEGRAM_CHAT_ID_MINIMAL_AR=-1003310820145   # アラビア語版チャンネルID（要設定）
```

---

## 📋 各言語の無料版チャンネル作成が必要

現在、EN版の無料版チャンネル（`Trap Deffence BTC Trial - English`）のみが存在し、他の言語の無料版チャンネルが作成されていない可能性があります。

**必要な作業**:
1. 各言語の無料版Telegramチャンネルを作成
   - JA版: Trap Deffence BTC Trial - Japanese
   - KO版: Trap Deffence BTC Trial - Korean
   - ES版: Trap Deffence BTC Trial - Spanish
   - PT-BR版: Trap Deffence BTC Trial - Portuguese
   - AR版: Trap Deffence BTC Trial - Arabic（既存: -1003310820145）

2. 各チャンネルのIDを取得

3. Vercel Dashboardで環境変数を設定

---

## 🔄 動作確認

環境変数設定後、以下のコマンドでテストできます：

```bash
cd cryptosignal-ai
node scripts/test-actual-telegram-delivery.js
```

または、各言語を個別にテスト：

```bash
# AR版のみテスト
node scripts/test-arabic-delivery.js
```

---

## 📊 修正前後の比較

### 修正前
- すべての言語の無料版メッセージがEN版チャンネルに送信される
- 言語別チャンネルIDの概念がない

### 修正後（コード）
- 言語コードを受け取り、言語別チャンネルIDを参照する機能を追加
- 環境変数が設定されていない場合、フォールバックでEN版チャンネルに送信

### 修正後（環境変数設定後）
- 各言語の無料版メッセージが対応する言語のチャンネルに送信される
- 言語別チャンネルIDが設定されていない言語のみ、EN版チャンネルにフォールバック

---

**最終更新**: 2026-01-17 14:07:03
**状態**: ✅ **コード修正完了、環境変数設定待ち**
