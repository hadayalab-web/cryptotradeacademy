# 3種類の配信のすみ分け - 完全理解ドキュメント
**作成日時**: 2026-01-28  
**作成者**: AI Assistant（COOからの指摘を受けて作成）

---

## 🎯 3種類の配信のすみ分け

### 1. Trap Defence BTCの無料版（Minimal Version）のTG配信

**目的**: 無料版ユーザーに日次のTrap Scoreと簡易分析を提供

**実装ファイル**: `api/cron.js`

**配信先**: Telegram MINIMALチャンネル（6言語）
- チャンネルID: `TELEGRAM_CHAT_ID_MINIMAL_EN`, `TELEGRAM_CHAT_ID_MINIMAL_JA`など
- 関数: `sendMessageToAsset(..., "MINIMAL", langCode, ...)`

**配信タイミング**: 
- 定時スロット（`isRegularSlot = true`）で配信
- UTC 0:00, 6:00, 12:00, 18:00（6時間ごと）またはUTC 0:00, 4:00, 8:00, 12:00, 16:00, 18:00, 20:00（4時間ごと）
- JST 9:00, 15:00, 21:00, 3:00（6時間ごと）またはJST 9:00, 13:00, 17:00, 21:00, 1:00, 3:00, 5:00（4時間ごと）

**テンプレート**: `services/telegram/messages/user/{lang}/minimal-high-quality.{lang}.js`

**メッセージ内容**:
- Trap Score（0-100）
- BTC価格と24時間変動率
- Exchange Netflow
- Whale Ratio
- Dr. Grok's Quick Insight
- Mental Note
- What to Avoid

**Cronジョブ**: `/api/cron`（`*/15 * * * *` + `0 0 * * *`）

**環境変数**:
- `MINIMAL_MULTI_LANG=true`（デフォルト: 6言語すべてに配信）
- `TELEGRAM_CHAT_ID_MINIMAL_EN`, `TELEGRAM_CHAT_ID_MINIMAL_JA`など

---

### 2. Trap Defence BTCの有料版（Regular Briefing）のTG配信

**目的**: 有料版ユーザーに詳細な市場分析とトレードシグナルを提供

**実装ファイル**: `api/cron.js`

**配信先**: Telegram BTCチャンネル（6言語）
- チャンネルID: `TELEGRAM_CHAT_ID_BTC_EN`, `TELEGRAM_CHAT_ID_BTC_JA`など
- 関数: `sendMessageToChannel(..., series="BTC", marketCode="EN"/"JA"など, ...)`

**配信タイミング**: 
- 定時スロット（`isRegularSlot = true`）で配信
- UTC 0:00, 6:00, 12:00, 18:00（6時間ごと）またはUTC 0:00, 4:00, 8:00, 12:00, 16:00, 18:00, 20:00（4時間ごと）
- JST 9:00, 15:00, 21:00, 3:00（6時間ごと）またはJST 9:00, 13:00, 17:00, 21:00, 1:00, 3:00, 5:00（4時間ごと）

**テンプレート**: `services/telegram/messages/user/{lang}/regular.{lang}.js`

**メッセージ内容**:
- CryptoWeather Alert - Trap Defense Report
- GPTリポーターのトラップニュース分析（CryptoQuantデータ解析）
- Grok X解析結果（Xセンチメント分析）
- Dr. Grokの心理的サポート
- Grok Xアルゴリズム解析 × Gemini深層心理解析の統合結果
- トレードシグナル（LONG/SHORT/STANDBY）
- リスクリワード比
- 市場別深掘りデータ（EN: Trap Score/Whale Flows、JA: Risk Reward/NUPL/SOPR30d、KO: Kimchi Premiumなど）

**Cronジョブ**: `/api/cron`（`*/15 * * * *` + `0 0 * * *`）

**環境変数**:
- `REGULAR_MULTI_LANG=true`（デフォルト: 6言語すべてに配信）
- `TELEGRAM_CHAT_ID_BTC_EN`, `TELEGRAM_CHAT_ID_BTC_JA`など

---

### 3. マーケティングファネルのTG配信とX配信

**目的**: 無料版オプトイン誘導とアップセル（VSL1/VSL2）

#### 3-1. VSL1投稿（無料版オプトイン誘導）

**実装ファイル**: `api/vsl1-post.js`

**配信先**: 
- **X/Twitter**: メイン配信先（無料版に登録していない人に対してオプトインを促す）
- **Telegram MINIMALチャンネル**: オプション（`VSL1_TELEGRAM_MINIMAL_ENABLED=true`の場合のみ）

**配信タイミング**: 
- Cron設定: `0 1,13,21 * * *`（UTC）
- UTC時刻: 1:00, 13:00, 21:00
- JST時刻: 10:00, 22:00, 6:00（翌日）

**メッセージ内容**:
- VSL1動画リンク（YouTube）
- 無料版オプトイン誘導メッセージ
- Telegram Deep Link（`https://t.me/TrapDefenceBot?start=minimal_{lang}`）

**Cronジョブ**: `/api/vsl1-post`

**環境変数**:
- `VSL1_MULTI_LANG=true`（6言語すべてに配信）
- `VSL1_TELEGRAM_MINIMAL_ENABLED=false`（デフォルト: Telegram配信は無効）
- `X_VSL1_LANG=ja`（X投稿の言語指定）

**注意**: VSL1は無料版オプトイン誘導用のため、**無料版チャンネル（MINIMAL）には配信しない**（既に無料版に登録しているユーザーに不要なメッセージが届いてしまう）

---

#### 3-2. VSL2配信（24時間後のアップセル/クーポン）

**実装ファイル**: `api/vsl2-free-users.js`

**配信先**: Telegram DM（ユーザー個別）

**配信タイミング**: 
- Cron設定: `0 * * * *`（UTC、1時間ごと）
- 無料版ユーザー登録から**24時間経過**したユーザーに自動配信

**メッセージ内容**:
- VSL2動画リンク（YouTube）
- 50%オフクーポンコード（`DEFEND50`）
- Whop商品リンク

**Cronジョブ**: `/api/vsl2-free-users`

---

#### 3-3. VSL1リマインダー（12時間後のリマインド）

**実装ファイル**: `api/vsl1-reminder.js`

**配信先**: Telegram DM（ユーザー個別）

**配信タイミング**: 
- Cron設定: `0 */12 * * *`（UTC、12時間ごと）
- 無料版ユーザー登録から**12-24時間経過**したユーザー（VSL2未送信）に自動配信

**メッセージ内容**:
- VSL1動画リンク（YouTube）
- 無料版オプトイン誘導メッセージ

**Cronジョブ**: `/api/vsl1-reminder`

---

#### 3-4. VSL2ラストコール（22時間後の最終リマインド）

**実装ファイル**: `api/vsl2-last-call.js`

**配信先**: Telegram DM（ユーザー個別）

**配信タイミング**: 
- Cron設定: `0 * * * *`（UTC、1時間ごと）
- 無料版ユーザー登録から**22時間経過**したユーザー（VSL2未送信、24時間の2時間前）に自動配信

**メッセージ内容**:
- VSL2動画リンク（YouTube）
- 50%オフクーポンコード（`DEFEND50`）
- Whop商品リンク
- 「まもなく期限切れ」の緊急性メッセージ

**Cronジョブ**: `/api/vsl2-last-call`

---

## 📊 配信のすみ分け表

| 配信種類 | 配信先 | 目的 | Cronジョブ | スケジュール（UTC） |
|---------|--------|------|-----------|-------------------|
| **1. 無料版（Minimal Version）TG配信** | Telegram MINIMALチャンネル | 無料版ユーザーに日次Trap Score提供 | `/api/cron` | `*/15 * * * *` + `0 0 * * *` |
| **2. 有料版（Regular Briefing）TG配信** | Telegram BTCチャンネル | 有料版ユーザーに詳細分析提供 | `/api/cron` | `*/15 * * * *` + `0 0 * * *` |
| **3-1. VSL1投稿（X配信）** | X/Twitter | 無料版オプトイン誘導 | `/api/vsl1-post` | `0 1,13,21 * * *` |
| **3-2. VSL2配信** | Telegram DM（個別） | 24時間後のアップセル | `/api/vsl2-free-users` | `0 * * * *` |
| **3-3. VSL1リマインダー** | Telegram DM（個別） | 12時間後のリマインド | `/api/vsl1-reminder` | `0 */12 * * *` |
| **3-4. VSL2ラストコール** | Telegram DM（個別） | 22時間後の最終リマインド | `/api/vsl2-last-call` | `0 * * * *` |

---

## 🔍 重要な違い

### 1. 無料版（Minimal Version）と有料版（Regular Briefing）の違い

| 項目 | 無料版（Minimal Version） | 有料版（Regular Briefing） |
|-----|-------------------------|--------------------------|
| **チャンネル** | MINIMALチャンネル | BTCチャンネル |
| **チャンネルID** | `TELEGRAM_CHAT_ID_MINIMAL_*` | `TELEGRAM_CHAT_ID_BTC_*` |
| **メッセージ長** | 短い（4-post thread形式） | 長い（詳細分析） |
| **内容** | Trap Score、簡易分析 | 詳細分析、トレードシグナル、心理的サポート |
| **AI解析** | Grok+Gemini統合最適化（簡易版） | GPT+Grok+Gemini統合最適化（詳細版） |
| **配信タイミング** | 定時スロット（`isRegularSlot`） | 定時スロット（`isRegularSlot`） |

### 2. マーケティングファネル（VSL1/VSL2）とサービス配信（Minimal/Regular）の違い

| 項目 | マーケティングファネル（VSL1/VSL2） | サービス配信（Minimal/Regular） |
|-----|--------------------------------|----------------------------|
| **目的** | オプトイン誘導・アップセル | 既存ユーザーへの価値提供 |
| **配信先** | X/Twitter、Telegram DM（個別） | Telegramチャンネル（公開） |
| **配信タイミング** | 固定時刻（VSL1）またはユーザー登録後（VSL2） | 定時スロット（市場データに基づく） |
| **メッセージ内容** | VSL動画リンク、クーポンコード | 市場分析、Trap Score、トレードシグナル |
| **対象ユーザー** | 未登録ユーザー（VSL1）、無料版ユーザー（VSL2） | 無料版ユーザー（Minimal）、有料版ユーザー（Regular） |

---

## ⚠️ よくある誤解

### 誤解1: VSL1は無料版チャンネル（MINIMAL）に配信される

**正解**: VSL1は**X/Twitterのみ**に配信される（無料版チャンネルには配信しない）

**理由**: 
- VSL1は無料版オプトイン誘導用
- 既に無料版に登録しているユーザーに不要なメッセージが届いてしまう
- X/Twitterで未登録ユーザーに対してオプトインを促す

### 誤解2: 無料版（Minimal Version）とVSL1は同じもの

**正解**: 異なる

- **無料版（Minimal Version）**: 既存の無料版ユーザーへの日次配信（Trap Score提供）
- **VSL1**: 未登録ユーザーへのオプトイン誘導（X/Twitter投稿）

### 誤解3: 有料版（Regular Briefing）とVSL2は同じもの

**正解**: 異なる

- **有料版（Regular Briefing）**: 既存の有料版ユーザーへの日次配信（詳細分析提供）
- **VSL2**: 無料版ユーザーへのアップセル誘導（Telegram DM、24時間後）

---

## 📝 まとめ

1. **Trap Defence BTCの無料版（Minimal Version）のTG配信**
   - 既存の無料版ユーザーへの日次配信
   - MINIMALチャンネルに配信
   - 定時スロットで配信

2. **Trap Defence BTCの有料版（Regular Briefing）のTG配信**
   - 既存の有料版ユーザーへの日次配信
   - BTCチャンネルに配信
   - 定時スロットで配信

3. **マーケティングファネルのTG配信とX配信**
   - VSL1: X/Twitter投稿（未登録ユーザーへのオプトイン誘導）
   - VSL2: Telegram DM（無料版ユーザーへのアップセル誘導、24時間後）
   - VSL1リマインダー: Telegram DM（12時間後）
   - VSL2ラストコール: Telegram DM（22時間後）

---

**作成者**: AI Assistant  
**最終更新**: 2026-01-28
