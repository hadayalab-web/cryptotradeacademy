# 無料版言語別チャンネルID対応 - 修正完了

**修正日時**: 2026-01-14  
**修正内容**: 無料版メッセージを言語別チャンネルに送信できるように修正

---

## ✅ 修正内容

### 1. `sendMessageToAsset`関数の拡張

**ファイル**: `services/telegram/bot.js`

**変更点**:
- 言語コード（`langCode`）パラメータを追加
- `MINIMAL`資産で言語コードが指定された場合、言語別チャンネルIDを参照
- 環境変数形式: `TELEGRAM_CHAT_ID_MINIMAL_{LANG_CODE}`（例: `TELEGRAM_CHAT_ID_MINIMAL_JA`）
- 言語別チャンネルIDが設定されていない場合、デフォルトの`TELEGRAM_CHAT_ID_MINIMAL`にフォールバック

**対応言語コード**:
- `EN` → `TELEGRAM_CHAT_ID_MINIMAL_EN`
- `JA` → `TELEGRAM_CHAT_ID_MINIMAL_JA`
- `KO` → `TELEGRAM_CHAT_ID_MINIMAL_KO`
- `ES` → `TELEGRAM_CHAT_ID_MINIMAL_ES`
- `PT_BR` → `TELEGRAM_CHAT_ID_MINIMAL_PT_BR`
- `AR` → `TELEGRAM_CHAT_ID_MINIMAL_AR`

### 2. `cron.js`の無料版メッセージ送信ロジック修正

**ファイル**: `api/cron.js`

**変更点**:
- 無料版メッセージ送信時に言語コードを渡すように修正
- `LANG`変数（`en`, `ja`, `ko`, `es`, `pt-br`, `ar`）を環境変数形式（`EN`, `JA`, `KO`, `ES`, `PT_BR`, `AR`）に変換
- 言語別チャンネルIDまたはデフォルトチャンネルIDの存在を確認してから送信

### 3. テストスクリプトの修正

**ファイル**: `scripts/test-actual-telegram-delivery.js`

**変更点**:
- 無料版メッセージ送信時に言語コードを渡すように修正

---

## 📋 環境変数設定

各言語の無料版チャンネルIDを以下の環境変数に設定してください：

```bash
# デフォルト（フォールバック用）
TELEGRAM_CHAT_ID_MINIMAL=-1003603117491

# 言語別チャンネルID（推奨）
TELEGRAM_CHAT_ID_MINIMAL_EN=-1003603117491
TELEGRAM_CHAT_ID_MINIMAL_JA=-100XXXXXXXXXX
TELEGRAM_CHAT_ID_MINIMAL_KO=-100XXXXXXXXXX
TELEGRAM_CHAT_ID_MINIMAL_ES=-100XXXXXXXXXX
TELEGRAM_CHAT_ID_MINIMAL_PT_BR=-100XXXXXXXXXX
TELEGRAM_CHAT_ID_MINIMAL_AR=-1003310820145  # Trap Deffence BTC Trial - Arabic

# AR版の有料版チャンネルID（修正済み）
TELEGRAM_CHAT_ID_BTC_AR=-1003665969002  # Trap Deffence BTC - Arabic
```

**注意**: 
- 言語別チャンネルIDが設定されていない場合、デフォルトの`TELEGRAM_CHAT_ID_MINIMAL`が使用されます
- 言語別チャンネルIDが設定されている場合、その言語のメッセージは対応するチャンネルに送信されます

---

## 🔄 動作フロー

1. **Cron実行時**:
   - `LANG`環境変数から現在の言語を取得（例: `ja`）
   - 言語コードを環境変数形式に変換（`ja` → `JA`）
   - 無料版メッセージを生成
   - `sendMessageToAsset(minimalText, 'MINIMAL', 'JA')`を呼び出し

2. **sendMessageToAsset関数内**:
   - `asset === 'MINIMAL'`かつ`langCode === 'JA'`の場合
   - `TELEGRAM_CHAT_ID_MINIMAL_JA`環境変数を参照
   - 設定されていない場合、`TELEGRAM_CHAT_ID_MINIMAL`にフォールバック
   - 対応するチャンネルにメッセージを送信

---

## ✅ テスト方法

### 1. ローカルテスト

```bash
cd cryptosignal-ai
node scripts/test-actual-telegram-delivery.js
```

### 2. 本番環境テスト

- Vercel Dashboardで環境変数を設定
- 次回のCron実行（15分後）で各言語の無料版メッセージが正しいチャンネルに送信されることを確認

---

## 📝 次のステップ

1. **環境変数の設定**（CEOが対応）:
   - 各言語の無料版チャンネルを作成
   - Vercel Dashboardで環境変数を設定

2. **動作確認**:
   - 次回のCron実行で各言語のメッセージが正しいチャンネルに送信されることを確認

---

**最終更新**: 2026-01-14  
**状態**: ✅ **修正完了（環境変数設定待ち）**
