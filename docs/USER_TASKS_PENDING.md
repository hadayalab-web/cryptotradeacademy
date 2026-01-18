# 実装・確認待ちタスクリスト

**作成日**: 2026-01-18  
**作成者**: COO (Cursor/Composer 1)  
**目的**: ユーザー側で設定・確認が必要なタスクの完全リスト

---

## 🎯 優先度別タスク一覧

### 🔴 最優先（即座に実行）

#### 1. TelegramグループIDの設定（リード発見システム開始）

**目的**: リード発見システムを開始するために、監視対象のTelegramグループIDを設定

**手順**:

1. **グループIDを取得**
   ```bash
   # 方法1: 自動取得スクリプト（推奨）
   node scripts/get-telegram-group-id.js
   
   # 方法2: 手動取得
   # - 監視したいグループにBotを追加
   # - グループ内でメッセージを送信
   # - Vercel Dashboard → Logs でグループIDを確認
   ```

2. **Vercel環境変数に追加**
   - Vercel Dashboard → Project Settings → Environment Variables
   - 以下の形式で追加：
   ```bash
   # 英語グループ（例）
   TELEGRAM_MONITORED_GROUPS_EN=-1001234567890,-1001234567891
   
   # スペイン語グループ（例）
   TELEGRAM_MONITORED_GROUPS_ES=-1001234567892
   
   # ポルトガル語グループ（例）
   TELEGRAM_MONITORED_GROUPS_PT_BR=-1001234567894
   
   # アラビア語グループ（例）
   TELEGRAM_MONITORED_GROUPS_AR=-1001234567896
   
   # 日本語グループ（例）
   TELEGRAM_MONITORED_GROUPS_JA=-1001234567898
   
   # 韓国語グループ（例）
   TELEGRAM_MONITORED_GROUPS_KO=-1001234567900
   ```

3. **再デプロイ**
   - 環境変数追加後、Vercelが自動的に再デプロイ
   - または、手動で再デプロイ

**参考ドキュメント**: 
- `docs/TELEGRAM_GROUP_SETUP_GUIDE.md`
- `docs/LEAD_DISCOVERY_SETUP.md`

**完了条件**: 
- ✅ 各言語で最低1つ以上のグループIDが設定されている
- ✅ 環境変数がVercelに反映されている
- ✅ リード発見システムが正常に動作している（ログで確認）

---

#### 2. 環境変数の完全確認

**目的**: すべての必須環境変数が正しく設定されているか確認

**手順**:

1. **ローカル環境で確認**
   ```bash
   node scripts/check-lead-discovery-env.js
   ```

2. **Vercel環境変数の確認**
   - Vercel Dashboard → Project Settings → Environment Variables
   - 以下の必須環境変数が設定されているか確認：

**必須環境変数**:
```bash
# X API設定（リード発見用）
X_API_CONSUMER_KEY=...
X_API_CONSUMER_KEY_SECRET=...
X_API_ACCESS_TOKEN=...
X_API_ACCESS_TOKEN_SECRET=...

# Telegram Bot設定
TELEGRAM_BOT_TOKEN=...
TELEGRAM_BOT_USERNAME=...

# Vercel KV設定（リード発見キューシステム用）
KV_REST_API_URL=...
KV_REST_API_TOKEN=...

# VSLリンク設定
VSL1_YOUTUBE_LINK=https://youtu.be/OqvqngJOiXc
VSL2_YOUTUBE_LINK=https://youtu.be/fXgVsKhqDjI

# Cron認証
CRON_SECRET=...

# Grok API設定（XAI_API_KEYは既に設定済み）
XAI_API_KEY=...
```

**オプション環境変数**（推奨）:
```bash
# Gemini API設定（動的メッセージ生成用）
GEMINI_API_KEY=...

# 多言語配信設定
VSL1_MULTI_LANG=true
X_VSL1_MULTI_LANG=true

# 言語別チャンネルID（VSL1配信用）
TELEGRAM_CHAT_ID_MINIMAL_EN=...
TELEGRAM_CHAT_ID_MINIMAL_ES=...
TELEGRAM_CHAT_ID_MINIMAL_PT_BR=...
TELEGRAM_CHAT_ID_MINIMAL_AR=...
TELEGRAM_CHAT_ID_MINIMAL_JA=...
TELEGRAM_CHAT_ID_MINIMAL_KO=...
```

**完了条件**: 
- ✅ すべての必須環境変数が設定されている
- ✅ スクリプト実行でエラーがない
- ✅ Vercel環境変数も同様に設定されている

---

### 🟡 高優先度（1週間以内）

#### 3. Telegram Bot Webhookの設定確認

**目的**: Telegram Botがグループメッセージを受信できるようにWebhookを設定

**手順**:

1. **Webhook URLを確認**
   - Vercelデプロイ後のURL: `https://your-domain.vercel.app/api/telegram-webhook`

2. **Webhookを設定**
   ```bash
   curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
     -d "url=https://your-domain.vercel.app/api/telegram-webhook"
   ```

3. **Webhook設定を確認**
   ```bash
   curl "https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo"
   ```

**完了条件**: 
- ✅ Webhookが正しく設定されている
- ✅ グループメッセージがWebhookに届いている（ログで確認）

---

#### 4. リード発見システムの動作確認

**目的**: リード発見システムが正常に動作しているか確認

**手順**:

1. **手動実行でテスト**
   ```bash
   # リード発見を実行
   curl -X POST "https://your-domain.vercel.app/api/lead-discovery" \
     -H "Authorization: Bearer <CRON_SECRET>"
   
   # キュー処理を実行
   curl -X POST "https://your-domain.vercel.app/api/lead-discovery/process" \
     -H "Authorization: Bearer <CRON_SECRET>"
   ```

2. **ログを確認**
   - Vercel Dashboard → Project → Logs
   - エラーがないか確認
   - リードが発見されているか確認

3. **ダッシュボードで確認**
   ```bash
   curl "https://your-domain.vercel.app/api/lead-discovery/dashboard" \
     -H "Authorization: Bearer <CRON_SECRET>"
   ```

**完了条件**: 
- ✅ リード発見が正常に実行されている
- ✅ キュー処理が正常に実行されている
- ✅ ログにエラーがない
- ✅ リードが発見されている（ダッシュボードで確認）

---

#### 5. VSL1投稿の動作確認

**目的**: VSL1投稿が正常に動作しているか確認

**手順**:

1. **VSL1投稿のスケジュール確認**
   - Vercel Dashboard → Settings → Cron Jobs
   - `/api/vsl1-post` が `0 9,21 * * *` で設定されているか確認

2. **手動実行でテスト**
   ```bash
   curl -X POST "https://your-domain.vercel.app/api/vsl1-post" \
     -H "Authorization: Bearer <CRON_SECRET>"
   ```

3. **配信結果を確認**
   - Telegram MINIMALチャンネルに投稿されているか確認
   - X（Twitter）に投稿されているか確認
   - 画像が添付されているか確認

**完了条件**: 
- ✅ VSL1投稿が正常に実行されている
- ✅ Telegram + X の両方に投稿されている
- ✅ 画像が添付されている
- ✅ 6言語対応が動作している（`VSL1_MULTI_LANG=true`の場合）

---

### 🟢 中優先度（1ヶ月以内）

#### 6. Gemini API予算の設定確認

**目的**: Gemini APIの予算を$2,000に設定（リード発見メッセージ最適化用）

**手順**:

1. **Gemini API Consoleで確認**
   - [Google AI Studio](https://makersuite.google.com/app/apikey)
   - 予算設定を確認
   - 必要に応じて$2,000に設定

2. **環境変数の確認**
   ```bash
   GEMINI_API_KEY=...
   ```

**完了条件**: 
- ✅ Gemini APIキーが設定されている
- ✅ 予算が$2,000に設定されている（または十分な予算がある）

---

#### 7. 週次KPIレビューの確認

**目的**: 週次ダッシュボードでKPIを確認し、最適化の方向性を決定

**手順**:

1. **週次ダッシュボードにアクセス**
   ```bash
   curl "https://your-domain.vercel.app/api/lead-discovery/dashboard" \
     -H "Authorization: Bearer <CRON_SECRET>"
   ```

2. **KPIを確認**
   - リード発見数
   - ドンピシャリード数
   - チャネル別・言語別統計
   - コンバージョン率

3. **最適化の方向性を決定**
   - 低パフォーマンスのチャネル・言語を特定
   - キーワードの最適化
   - メッセージの改善

**完了条件**: 
- ✅ 週次ダッシュボードが正常に動作している
- ✅ KPIが確認できる
- ✅ 最適化の方向性が決定されている

---

### 🔵 低優先度（3ヶ月以内）

#### 8. リード発見スケールアップの準備

**目的**: リード発見を1日5k→20kへスケールアップする準備

**手順**:

1. **並列インスタンスの準備**
   - Vercelのスケーリング設定を確認
   - 必要に応じてProプランにアップグレード

2. **レート制限の確認**
   - X APIのレート制限を確認
   - Telegram Bot APIのレート制限を確認

3. **コスト予測**
   - APIコストの予測
   - スケールアップ時のコスト計算

**完了条件**: 
- ✅ スケールアップの準備が整っている
- ✅ コスト予測が完了している
- ✅ レート制限対策が準備されている

---

## 📋 チェックリスト

### Phase 1（即座に実行）

- [ ] **TelegramグループIDの設定**
  - [ ] グループIDを取得（`scripts/get-telegram-group-id.js`）
  - [ ] Vercel環境変数に追加
  - [ ] 再デプロイ
  - [ ] 動作確認

- [ ] **環境変数の完全確認**
  - [ ] ローカル環境で確認（`scripts/check-lead-discovery-env.js`）
  - [ ] Vercel環境変数を確認
  - [ ] 不足している環境変数を追加

### Phase 2（1週間以内）

- [ ] **Telegram Bot Webhookの設定確認**
  - [ ] Webhook URLを設定
  - [ ] Webhook設定を確認
  - [ ] グループメッセージが受信されているか確認

- [ ] **リード発見システムの動作確認**
  - [ ] 手動実行でテスト
  - [ ] ログを確認
  - [ ] ダッシュボードで確認

- [ ] **VSL1投稿の動作確認**
  - [ ] Cronスケジュールを確認
  - [ ] 手動実行でテスト
  - [ ] 配信結果を確認

### Phase 3（1ヶ月以内）

- [ ] **Gemini API予算の設定確認**
  - [ ] Gemini APIキーが設定されているか確認
  - [ ] 予算を$2,000に設定

- [ ] **週次KPIレビューの確認**
  - [ ] 週次ダッシュボードにアクセス
  - [ ] KPIを確認
  - [ ] 最適化の方向性を決定

### Phase 4（3ヶ月以内）

- [ ] **リード発見スケールアップの準備**
  - [ ] 並列インスタンスの準備
  - [ ] レート制限の確認
  - [ ] コスト予測

---

## 🚀 クイックスタートガイド

### 最短でリード発見システムを開始する方法

1. **環境変数確認スクリプトを実行**
   ```bash
   node scripts/check-lead-discovery-env.js
   ```

2. **TelegramグループIDを取得**
   ```bash
   node scripts/get-telegram-group-id.js
   ```

3. **Vercel環境変数に追加**
   - Vercel Dashboard → Project Settings → Environment Variables
   - `TELEGRAM_MONITORED_GROUPS_EN` などにグループIDを追加

4. **動作確認**
   ```bash
   # リード発見を手動実行
   curl -X POST "https://your-domain.vercel.app/api/lead-discovery" \
     -H "Authorization: Bearer <CRON_SECRET>"
   ```

5. **ログを確認**
   - Vercel Dashboard → Project → Logs
   - エラーがないか確認

---

## 📞 サポート

問題が発生した場合：

1. **ログを確認**: Vercel Dashboard → Project → Logs
2. **環境変数を確認**: `scripts/check-lead-discovery-env.js`
3. **ドキュメントを確認**: 
   - `docs/LEAD_DISCOVERY_SETUP.md`
   - `docs/TELEGRAM_GROUP_SETUP_GUIDE.md`

---

**COO (Cursor/Composer 1) タスクリスト**: 2026-01-18
