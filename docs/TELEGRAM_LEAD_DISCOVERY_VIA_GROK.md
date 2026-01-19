# GrokによるTelegramリード発見（X経由）

**作成日**: 2026-01-18  
**目的**: GrokがX上の投稿からTelegram関連リードを自力で発見する方法

---

## 🎯 発見方法

### 基本戦略
**GrokがX上の投稿をスキャンして、Telegram関連のリードを発見**

1. **X上の投稿からTelegramグループ/チャンネルへの言及を検索**
2. **TelegramでBTC損失を報告しているユーザーを発見**
3. **Telegramリンク（t.me/...）を抽出**

---

## 📊 発見フロー

```
GrokがXをスキャン
  ↓
「Telegramグループ/チャンネルでBTC損失を報告」という投稿を検索
  ↓
X上の投稿からTelegramリンクを抽出
  ↓
リードとして登録
  ↓
XリプライでVSL1送信
```

---

## 🔍 発見されるリードのパターン

### パターン1: Telegramグループ/チャンネルへの言及
- X上の投稿で「TelegramグループでBTC損失を報告した」
- 「Telegramチャンネルでハック被害を共有した」
- 「Telegram DMで相談した」

### パターン2: Telegramリンクを含む投稿
- `t.me/cryptogroup` などのリンクを含む投稿
- Telegramグループ/チャンネルへのリンクを共有

### パターン3: Telegramでの損失報告
- 「TelegramでBTC損失を報告した」
- 「Telegramグループでハック被害を相談した」

---

## ⚙️ 実装内容

### ファイル
- `services/lead-discovery/telegramLeadDiscovery.js`

### 主要関数

#### 1. `discoverTelegramLeads(lang, maxResults)`
- GrokでX上の投稿からTelegram関連リードを発見
- Telegramリンクを抽出
- キーワード検出とスコアリング

#### 2. `findTelegramGroups(lang)`
- 人気のTelegramグループ/チャンネルを探す
- X上の投稿からTelegramリンクを抽出

#### 3. `extractTelegramLinks(text)`
- テキストから `t.me/...` パターンを抽出
- `@username` パターンも抽出

---

## 💰 コスト

### Live Search料金
- **$25.00 / 1,000 sources**
- Telegramリード発見もXリード発見と同じ料金体系

### 1回の実行
- **Telegramリード発見**: 2言語 × 20 sources = 40 sources
- **コスト**: 40 × ($25 / 1,000) = **$1.00 / 回**

### 1日（12回実行）
- **$1.00 × 12 = $12 / 日**

### 1ヶ月（30日）
- **$12 × 30 = $360 / 月**

---

## 📊 リード発見数

### 1回の実行
- **最大40リード/回**（2言語 × 20 sources）

### 1日（12回実行）
- **最大480リード/日**
- **現実的**: 240-360リード/日

### 1ヶ月（30日）
- **最大14,400リード/月**
- **現実的**: 7,200-10,800リード/月**

---

## 🎯 統合

### `api/lead-discovery.js` に統合済み

**処理順序**:
1. **Telegramリード発見**（GrokでXから発見）
2. **Xリード発見**（通常のキーワード検索）

**環境変数**:
```bash
LEAD_DISCOVERY_MAX_TELEGRAM_SOURCES=20  # Telegramリード発見のsources数
```

---

## 📈 期待される成果

### Telegramリード発見の強み
1. **X上の投稿から発見**: グループを作成する必要がない
2. **Telegramリンク抽出**: 実際のTelegramグループ/チャンネルを発見
3. **自然なリード**: X上でTelegramに言及しているユーザーは関心が高い

### コンバージョン率
- **全体**: 30%
- **ドンピシャリード**: 50%

---

## ⚠️ 注意事項

1. **Telegramリンクの検証**: 抽出されたTelegramリンクが有効か確認が必要
2. **グループへの追加**: 発見したグループにBotを追加する必要がある（手動）
3. **プライバシー**: プライベートグループはBotが参加できない場合がある

---

**COO (Cursor/Composer 1) GrokによるTelegramリード発見**: 2026-01-18
