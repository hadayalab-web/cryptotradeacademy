# Telegram Cryptoグループ探索ガイド

**作成日**: 2026-01-18  
**目的**: リード発見用のTelegram Cryptoグループを効率的に探す方法

---

## 🔍 グループ探索方法

### 方法1: Telegram検索機能を使用

1. **Telegramアプリを開く**
2. **検索バーで以下を検索**:
   - `Bitcoin trading`
   - `Crypto signals`
   - `BTC analysis`
   - `Crypto community`
   - `Bitcoin discussion`
   - 言語別: `Bitcoin español`, `Bitcoin 日本語`, `비트코인`, `Bitcoin árabe`, `Bitcoin português`

3. **グループタイプを確認**:
   - ✅ **グループ（Group）**: メンバーが投稿可能 → **監視対象**
   - ❌ **チャンネル（Channel）**: 一方向配信のみ → **監視不可**

### 方法2: Telegramディレクトリサイトを使用

**推奨サイト**:
- **TGStat**: https://tgstat.com/crypto
  - Cryptoグループをカテゴリ別に検索
  - メンバー数、アクティビティ、言語でフィルタ可能
  
- **TelegramCryptoGroups**: https://telegramcryptogroups.com
  - Crypto専用グループディレクトリ
  - 言語別、地域別で検索可能

### 方法3: 既存グループから拡張

1. **既に参加しているCryptoグループを確認**
2. **そのグループのメンバーが参加している他のグループを確認**
3. **関連グループに参加**

### 方法4: Botで自動取得

```bash
# Botが参加しているグループのIDを取得
node scripts/get-telegram-group-id.js
```

---

## 📋 探索すべきグループの条件

### 必須条件
- ✅ **グループ（Group）**であること（チャンネルではない）
- ✅ **メンバー数**: 1,000人以上（アクティブなコミュニティ）
- ✅ **言語**: 対象言語（EN, ES, PT-BR, AR, JA, KO）
- ✅ **トピック**: Bitcoin/Crypto関連

### 推奨条件
- ✅ **アクティビティ**: 1日10投稿以上
- ✅ **公開グループ**: Botが参加可能
- ✅ **トレーダー向け**: シグナル、分析、ディスカッション

---

## 🎯 言語別探索キーワード

### EN（英語）
- `Bitcoin trading signals`
- `BTC analysis group`
- `Crypto trading community`
- `Bitcoin discussion`

### ES（スペイン語）
- `Bitcoin trading español`
- `Señales de Bitcoin`
- `Comunidad crypto`
- `Bitcoin Latino`

### PT-BR（ポルトガル語）
- `Bitcoin trading Brasil`
- `Sinais de Bitcoin`
- `Comunidade crypto`
- `Bitcoin Brasil`

### AR（アラビア語）
- `تداول البيتكوين`
- `إشارات البيتكوين`
- `مجتمع البيتكوين`

### JA（日本語）
- `ビットコイントレード`
- `BTC分析`
- `暗号通貨コミュニティ`

### KO（韓国語）
- `비트코인 트레이딩`
- `BTC 시그널`
- `암호화폐 커뮤니티`

---

## 📝 グループID取得手順

1. **グループにBotを追加**
   - グループの管理者権限でBotを追加
   - Bot名: `@dr_grok_bot`

2. **グループIDを取得**
   ```bash
   node scripts/get-telegram-group-id.js
   ```

3. **環境変数に追加**
   ```bash
   TELEGRAM_MONITORED_GROUPS_EN=-1001234567890,-1001234567891
   TELEGRAM_MONITORED_GROUPS_ES=-1001234567892
   # ... 他の言語も同様
   ```

---

## ⚠️ 注意事項

1. **スパム対策**: グループのルールを確認し、Botがスパムとみなされないようにする
2. **プライバシー**: グループのプライバシー設定により、Botがメッセージを読み取れない場合がある
3. **権限**: Botがグループメッセージを読み取れる権限が必要

---

**COO (Cursor/Composer 1) グループ探索ガイド**: 2026-01-18
