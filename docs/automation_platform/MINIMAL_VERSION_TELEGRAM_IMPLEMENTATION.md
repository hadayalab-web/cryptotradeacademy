# 無料ミニマム版Telegram配信実装

**作成日**: 2026-01-13  
**目的**: 無料ミニマム版をTelegram配信に変更し、既存の配信システムをコピーして実装

---

## ✅ 実装完了項目

### 1. Telegramテンプレート作成
- **ファイル**: `cryptosignal-ai/services/telegram/messages/user/en/minimal.en.js`
- **機能**: Trap Scoreのみを表示するシンプルなフォーマット
- **内容**: 
  - Trap Score（0-100）の表示
  - Trap Scoreの説明（HIGH/MODERATE/LOW RISK）
  - BTC価格情報
  - 有料版へのアップグレードCTA

### 2. Telegram送信関数追加
- **ファイル**: `cryptosignal-ai/services/telegram/bot.js`
- **追加関数**: `sendMessageMinimal(text)`
- **環境変数**:
  - `TELEGRAM_BOT_TOKEN_MINIMAL`: 無料ミニマム版用のBot Token
  - `TELEGRAM_CHAT_ID_MINIMAL`: 無料ミニマム版用のChat ID

### 3. 配信ロジック追加
- **ファイル**: `cryptosignal-ai/api/cron.js`
- **実装内容**:
  - 定期配信（REGULAR）の後に無料ミニマム版の配信ロジックを追加
  - Trap Scoreのみを計算（詳細分析はスキップ）
  - 環境変数が設定されている場合のみ実行

### 4. SSOT更新
- **ファイル**: `cryptosignal-ai/docs/SSOT_TRAP_DEFENSE_BTC.md`
- **変更内容**: 配信形式を「メール配信」→「Telegram配信」に変更

---

## 🔧 環境変数設定

無料ミニマム版の配信を有効にするには、以下の環境変数を設定してください：

```bash
# 無料ミニマム版用のBot Token（CEOが明日作成予定）
TELEGRAM_BOT_TOKEN_MINIMAL=your_minimal_bot_token_here

# 無料ミニマム版用のChat ID（CEOが明日作成予定）
TELEGRAM_CHAT_ID_MINIMAL=your_minimal_chat_id_here
```

---

## 📋 実装方針

### 既存システムのコピー
- 既存の配信システム（`cron.js`）をベースに、無料ミニマム版用に簡略化
- Trap Scoreのみを計算・配信（詳細分析はスキップ）
- コスト削減のため、GPT/Grok/Geminiの呼び出しは行わない

### 配信タイミング
- 定期配信（REGULAR）と同じタイミングで配信
- 環境変数が設定されている場合のみ実行

### メッセージ内容
- Trap Score（0-100）
- Trap Scoreの説明（HIGH/MODERATE/LOW RISK）
- BTC価格情報
- 有料版へのアップグレードCTA

---

## 🚀 次のステップ

### CEOによる作業（明日予定）
1. **無料ミニマム版用のTelegram Bot作成**
   - Bot名: "Trap Defense BTC - Free Minimal Bot"（推奨）
   - Bot Tokenを取得

2. **無料ミニマム版用のTelegramチャットグループ作成**
   - グループ名: "Trap Defense BTC - Free Minimal"（推奨）
   - Chat IDを取得

3. **環境変数の設定**
   - `.env`ファイルに`TELEGRAM_BOT_TOKEN_MINIMAL`と`TELEGRAM_CHAT_ID_MINIMAL`を追加

### 実装後の確認事項
- [ ] 無料ミニマム版の配信が正常に動作することを確認
- [ ] Trap Scoreが正しく表示されることを確認
- [ ] 有料版へのアップグレードCTAが表示されることを確認
- [ ] 配信頻度が適切であることを確認（日次/週次）

---

## 📊 実装詳細

### 配信ロジックの流れ

1. **定期配信（REGULAR）の実行**
   - 既存の配信ロジックを実行
   - Trap Scoreを計算

2. **無料ミニマム版の配信（条件付き）**
   - 環境変数が設定されている場合のみ実行
   - Trap Scoreのみを使用してメッセージを生成
   - `sendMessageMinimal`で送信

### コスト削減
- GPT/Grok/Geminiの呼び出しは行わない
- Trap Scoreのみを計算（既存の計算結果を再利用）
- 詳細分析はスキップ

---

## ⚠️ 注意事項

1. **環境変数の設定**
   - 無料ミニマム版の配信を有効にするには、環境変数の設定が必須
   - 環境変数が設定されていない場合、配信はスキップされる

2. **Bot TokenとChat ID**
   - CEOが明日作成予定
   - 作成後、環境変数に設定する必要がある

3. **配信頻度**
   - 現在は定期配信（REGULAR）と同じタイミングで配信
   - 必要に応じて、配信頻度を調整可能（日次/週次）

---

**状態**: ✅ 実装完了（環境変数設定待ち）
