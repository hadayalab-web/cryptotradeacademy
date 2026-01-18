# Telegramグループ監視セットアップガイド

**作成日**: 2026-01-17  
**作成者**: COO (Cursor/Composer 1)

---

## 📋 重要な注意事項

**Telegramグループとチャンネルの違い**:
- **チャンネル（Channel）**: 一方向配信、管理者のみ投稿可能、メンバーは閲覧のみ → **VSL1投稿配信用**
- **グループ（Group）**: 双方向コミュニケーション、メンバーが投稿可能、Botがメッセージを監視できる → **リード発見監視用**

リード発見システムは**Telegramグループ**を監視します（チャンネルではありません）。

---

## 📋 必要な情報

リード発見システムを開始するために、以下の情報を提供してください：

### 1. 監視したいTelegramグループの情報

以下の形式で、監視したいグループの情報を提供してください：

```
【グループ情報】
- グループ名: [例: Bitcoin Trading Group]
- グループID: [例: -1001234567890] または [未取得の場合はグループ名/リンク]
- 言語: [EN / ES / PT-BR / AR / JA / KO]
- グループの種類: [例: Bitcoin Trading, Crypto Signals, DeFi Discussion]
- 注意: グループ（Group）であること。チャンネル（Channel）ではないこと。
```

### 2. グループIDの取得方法

グループIDがわからない場合は、以下の方法で取得できます：

#### 方法1: 自動取得スクリプトを使用（推奨）

```bash
node scripts/get-telegram-group-id.js
```

このスクリプトは、Botが既に参加しているグループのIDを自動的に取得します。

#### 方法2: 手動で取得

1. **監視したいグループにBotを追加**
   - グループの管理者権限でBotを追加
   - Bot名: `@dr_grok_bot`（または設定されているBot名）

2. **グループ内でメッセージを送信**
   - グループ内で何かメッセージを送信（例: `/start`）

3. **Webhookログを確認**
   - Vercel Dashboard → Project → Logs
   - または、ローカルでWebhookを実行してログを確認
   - ログ内の`chat.id`がグループIDです

#### 方法3: グループ情報Botを使用

1. `@userinfobot`などのBotをグループに追加
2. BotがグループIDを表示します

---

## 📝 提供形式の例

以下のような形式で情報を提供してください：

```
【監視対象グループリスト】

【英語グループ】
1. Bitcoin Trading Group
   - ID: -1001234567890
   - 言語: EN
   - 種類: Bitcoin Trading

2. Crypto Signals Community
   - ID: -1001234567891
   - 言語: EN
   - 種類: Crypto Signals

【スペイン語グループ】
1. Bitcoin Latino
   - ID: -1001234567892
   - 言語: ES
   - 種類: Bitcoin Trading

【日本語グループ】
1. ビットコイントレード
   - ID: -1001234567893
   - 言語: JA
   - 種類: Bitcoin Trading
```

---

## 🔧 設定方法

### ステップ1: グループIDを取得

上記の方法でグループIDを取得してください。

### ステップ2: 環境変数に追加

`.env`ファイルまたはVercelの環境変数に以下を追加：

```bash
# 監視対象TelegramグループID（カンマ区切り）
TELEGRAM_MONITORED_GROUPS_EN=-1001234567890,-1001234567891
TELEGRAM_MONITORED_GROUPS_ES=-1001234567892
TELEGRAM_MONITORED_GROUPS_PT_BR=-1001234567894
TELEGRAM_MONITORED_GROUPS_AR=-1001234567896
TELEGRAM_MONITORED_GROUPS_JA=-1001234567898
TELEGRAM_MONITORED_GROUPS_KO=-1001234567900
```

### ステップ3: コードを更新（オプション）

環境変数を使用しない場合は、`services/lead-discovery/telegramGroupMonitor.js`の`MONITORED_GROUPS`オブジェクトを編集：

```javascript
const MONITORED_GROUPS = {
  en: [
    '-1001234567890', // Bitcoin Trading Group
    '-1001234567891', // Crypto Signals Community
  ],
  es: [
    '-1001234567892', // Bitcoin Latino
  ],
  // ... 他の言語も同様
};
```

---

## ⚠️ 注意事項

1. **グループとチャンネルの違い**: 
   - ✅ **グループ（Group）**: メンバーが投稿可能、Botがメッセージを監視できる → **リード発見用**
   - ❌ **チャンネル（Channel）**: 一方向配信のみ、Botがメッセージを監視できない → **VSL1投稿配信用**

2. **Botの権限**: Botがグループメッセージを読み取れる権限が必要です
3. **グループの種類**: スーパーグループ（Supergroup）と通常グループ（Group）の両方に対応
4. **プライバシー**: グループのプライバシー設定により、Botがメッセージを読み取れない場合があります
5. **スパム対策**: 過度なDM送信は避け、適切な間隔を空けてください
6. **グループIDの形式**: グループIDは通常、負の数値（例: `-1001234567890`）です

---

## 🚀 次のステップ

グループIDを提供していただければ、以下の作業を進めます：

1. ✅ 環境変数の設定
2. ✅ コードの更新
3. ✅ Webhookの設定
4. ✅ テスト実行

---

**作成者**: COO (Cursor/Composer 1)  
**最終更新**: 2026-01-17
