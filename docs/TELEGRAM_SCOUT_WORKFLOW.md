# Telegram「管理者一本釣り」スカウトワークフロー

今日から動かすための、**断られない管理者スカウト**に特化した手順と自動化の範囲。

---

## 1. ターゲット（獲物）の特定

### 検索キーワード（言語別）

Telegramの検索バーに打ち込むワード。`config/telegramScoutTemplates.js` の `TELEGRAM_SEARCH_KEYWORDS` と一致。

| 言語 | キーワード例 |
|------|----------------|
| EN | BTC signals, Crypto analysis, Whop trading |
| ES | Señales Cripto, Bitcoin España, Trading Latino |
| PT | Sinais Cripto, Cripto Brasil |
| KO | 비트코인 정보, 코인 시그널 |
| AR | تداول عملات |

### 管理者の見つけ方

1. チャンネルの詳細（Info）を開く。
2. `@` で始まるユーザー名（@Admin_Name, @Contact_Support 等）をメモ。
3. **5,000〜30,000人規模**の中堅チャンネルを優先（超大型より繋がりやすい）。

### 外部ツール（任意）

- **Telemetr.me**: チャンネル成長率・信頼性分析。
- **A-Parser**: 大量チャンネルから管理者ユーザー名を自動抽出（スクレイピング）。

---

## 2. 一通目スカウトメッセージ

「メリット」と「証拠」を同時に。テンプレは `config/telegramScoutTemplates.js` の `SCOUT_FIRST_MESSAGE`。

- プレースホルダー: `{handle}`, `{Channel_Name}`, `{inviteUrl}`
- **実績画像**は手動で添付（Total paid $1.4M+ のスクショ）。

メッセージ取得方法:
- API: `GET /api/telegram-scout-message?lang=es&handle=AdminName&channel=MyChannel` → `firstMessage` をコピペ。
- またはスクリプト: `node scripts/telegram-scout-csv.js` で CSV から一括生成。

---

## 3. OK と言われたあと：「1分で完了」キット

以下をすぐ送る。

1. **実績画像**（所持しているもの）
2. **短い紹介文**（各言語）＝ `SCOUT_KIT_AFTER_OK` の「Short intro」部分
3. **FirstPromoter 登録・リンク発行**への誘導（`{inviteUrl}`）
4. **先行者ボーナス**（任意）:「最初の1週間だけ、あなたのリンクからの登録者に10%オフ」

キット本文取得:
- API: `GET /api/telegram-scout-message?lang=es&kitOnly=1` → `kit` をコピペ。

---

## 4. 自動化の範囲（このリポジトリ）

| 項目 | 自動化 | 備考 |
|------|--------|------|
| 検索キーワード一覧 | ✅ config で定義 | 言語別 |
| 一通目テンプレ（5言語） | ✅ config + API | handle/channel/inviteUrl で埋める |
| **一通目バリエーション** | ✅ 各言語2〜3パターン | `?variation=random` でランダム取得。スパムフィルター・BAN対策 |
| OK 後キット（5言語） | ✅ config + API | inviteUrl で埋める |
| **Bot 自動応答** | ✅ `/getlink [lang]` | ユーザーが Bot に送るとキットを即返信（断らせない） |
| **AI Lead Scoring 用キーワード** | ✅ config + API で返却 | プロフィールに KOL/Influencer/Admin 等があれば優先 |
| メッセージ送信 | ❌ 手動 or 外部ツール | TeleSender / CRMChat 等で送信。API で `firstMessage` を取得して流す |
| チャンネル・管理者リスト | ⚠️ 外部 or CSV | Telemetr / A-Parser / TeleSender Member Scraper の結果を CSV で用意 |

---

## 5. 「自動営業マシン」との連携

- **一斉送信ツール（TeleSender / CRMChat）**: 毎回 `GET /api/telegram-scout-message?lang=es&handle=...&channel=...&variation=random` を叩き、`firstMessage` を取得して送信すると文言がランダム化され、スパム検知を避けやすい。
- **AI Lead Scoring**: API の `leadScoringKeywords` をツールのフィルタに設定し、バイオにこれらの語があるユーザーを優先送信する。
- **返信後の自動応答**: 一通目に「この Bot に /getlink と送るとリンクと素材が届きます」と書いておき、返信者が Bot に `/getlink` または `/getlink es` を送ると、キットが自動返信される。

---

## 6. パターンB: Telethon スクレイピング + KV（目視用データ）

**高速・自動でターゲットリストを抽出し、KV に格納して API で目視できる**流れ。

### 5つの抽出フィルタ（無駄打ち防止）

| # | フィルタ | 条件 | 備考 |
|---|----------|------|------|
| 1 | **権限** | Admin/Owner（`is_creator` / Admin 権限） | 最優先の「本丸」リスト |
| 2 | **アクティブ時間** | `UserStatusOnline` または `UserStatusRecently`（直近2〜3日） | 非 Admin は生存確認済みのみ（`--include-inactive` で無効化可） |
| 3 | **Bio キーワード** | 10カ国ビジネス語で KOL 判定 | 除外ワードにヒットした場合はリストから除外 |
| 4 | **Username 有無** | `username` が設定済み（@xxx） | 捨てアカ・ROM 専排除（`--allow-no-username` で無効化可） |
| 5 | **ボット排除** | `is_bot == False` | 管理用ボット・スパムボットを除外 |

### 三層分類（Category）

- **Admin** … グループの Admin/Owner。権限で判定。
- **KOL** … Bio にビジネスキーワードまたは SNS URL（t.me / twitter / youtube / instagram）あり。
- **ActiveMember** … 直近オンラインかつ上記以外の「アクティブ層」。

出力 JSON/CSV の `category` および後方互換の `role`（admin / member）を参照可能。

### groups.txt の形式

- 1行 = `group_ref` または `group_ref` + タブ + `言語コード`（例: `en`, `ko`, `es`）
- 言語は `language` として出力され、目視やテンプレ選びに利用。

### 手順

1. **Python 環境**
   - `scripts/telegram_scout/` で `pip install -r requirements.txt`
   - [my.telegram.org](https://my.telegram.org) で API ID / API Hash 取得
   - `.env` に `API_ID`, `API_HASH`, `PHONE` を設定
   - `groups.txt` に対象グループを1行1件（任意で 2 列目に言語コード）

2. **抽出**
   - 管理層のみ: `python scrape_members.py --output ../../data/telegram-scout-targets.json`
   - 三層すべて: `python scrape_members.py --all-members --max-per-group 300 --output out.json`
   - **200通マトリックス（10カ国×3レイヤー）**: `--cap-per-lang 5,5,10` で各国 5 Admin + 5 KOL + 10 Active までに自動で絞る。10言語分のグループを `groups.txt` に用意すれば最大 200 件のリストができる。
   - CSV も出力: `--csv ../../data/telegram-scout-targets.csv`
   - オプション: `--allow-no-username`, `--include-inactive`, `--delay 0.5`（GetFullUser 間隔。Flood 対策で 2 秒前後にしてもよい）

3. **【技術】Bio 取得と Flood 対策**
   - Bio は `GetFullUserRequest` で取得している。ループ内で 1 ユーザーごとにリクエストするため、`--delay`（デフォルト 0.4 秒）で間隔を空け、FloodWaitError 発生時はスクリプト内で待機してからリトライする。短時間に数百人分を叩く場合は `--delay 2` や「まず Username ありだけ抽出→その中から KOL 候補だけ Bio 確認」の 2 段構えも有効。

4. **【運用】送信不可ユーザーとリスト余裕**
   - 抽出リストには「知らない人からのメッセージ拒否」設定のユーザーが数％含まれる想定。**送信を Python で自動化する場合は** `PeerFloodError`（送信制限）と `UserPrivacyRestrictedError`（プライバシー制限）を `try-except` でキャッチすること。
   - **リストは 20% 増しで抽出**しておくと、送信で弾かれても 200 通分を確保しやすい（例: `--cap-per-lang 6,6,12` で 240 件）。

5. **KV 投入**
   - `node scripts/telegram-scout-to-kv.js [data/telegram-scout-targets.json]`
   - 環境変数 `KV_REST_API_URL` / `KV_REST_API_TOKEN` が必要（Vercel KV と同じ）。

6. **目視**
   - `GET /api/telegram-scout-targets?limit=200&offset=0` で一覧取得。
   - レスポンス: `{ targets: [{ user_id, username, first_name, last_name, category, role, group_name, language, bio_snippet, ... }], total, limit, offset }`
   - ダッシュボードや Excel 用に CSV 化する場合はこの API を叩いて加工。

### 200通マトリックス（最終確認）

| カウント | 国 | レイヤー | 抽出数（各国） |
| --- | --- | --- | --- |
| 50名 | 10カ国 | Admin | 5名 |
| 50名 | 10カ国 | KOL | 5名 |
| 100名 | 10カ国 | Active | 10名 |

`groups.txt` に 10 言語分のグループを用意し、`--all-members --cap-per-lang 5,5,10 --csv out.csv` で実行すると、上記の「200通送信用」リストが CSV/JSON で得られる。

---

## 7. パターンC: グループ発見まで自動化（顧客獲得エンジン）

**ターゲット発見 → 抽出 → 分類** まで一貫して自動化する流れ。

### 全体フロー

1. **[発見]** `discover_groups.py` … 母集団（グループ）を取得
2. **[抽出]** `scrape_members.py` … 各グループから Admin/KOL/Active を抽出
3. **[出力]** `targets.json` / `targets.csv` … 目視・送信用リスト

### 発見の2通り

| ソース | 説明 | 前提 |
|--------|------|------|
| **api** | 第三者API（例: Telegram Index on RapidAPI）でキーワード検索 | `TELEGRAM_INDEX_RAPIDAPI_KEY` を設定。1キーワードあたり 10〜30 秒の遅延を推奨（Flood 回避） |
| **seed** | 自分で用意したシードリストを Telethon で解決し、人数・メガグループでフィルタ | `API_ID` / `API_HASH` / `PHONE`。`seed_groups.txt` に 1行1グループ（@username または t.me リンク、任意でタブ＋言語） |

**注意:** Telegram の公式 MTProto API には「キーワードで公開グループを検索」する機能はない。`contacts.SearchRequest` は**ユーザー（連絡先）**検索用であり、グループ・チャンネル一覧は返さない。そのため **api** は第三者（Telegram Index 等）の HTTP API に依存し、**seed** は手元のグループリストを Telethon で検証する形になる。

### 品質フィルタ（発見時）

- **人数:** 500 以上・50,000 以下（`--min-members` / `--max-members` で変更可）。少なすぎると効率が悪く、多すぎると BOT だらけになりやすい。
- **seed 時:** Telethon の `GetFullChannelRequest` で `participants_count` を取得し、上記範囲のみ `groups.json` / `groups.txt` に出力。

### キーワード・マトリックス（api 用）

`discover_groups.py` 内の `SEARCH_KEYWORDS` に 10 カ国分を定義済み（JP, KO, VN, AR, EN, HI, PT, ES, ID, TH）。API のレスポンス形式に合わせて必要ならスクリプトを修正する。

### 一括実行（run_pipeline.py）

```bash
cd scripts/telegram_scout

# シードで発見 → 抽出（200通マトリックス）
python run_pipeline.py --source seed --seed-file seed_groups.txt --cap-per-lang 5,5,10

# API で発見 → 抽出（要 TELEGRAM_INDEX_RAPIDAPI_KEY）
python run_pipeline.py --source api --cap-per-lang 5,5,10 --delay 20

# 発見スキップ（既存 data/groups.txt で抽出のみ）
python run_pipeline.py --skip-discover --groups-file ../../data/groups.txt --cap-per-lang 5,5,10

# 安全確認（実行せずコマンドだけ表示）
python run_pipeline.py --dry-run --source seed --cap-per-lang 5,5,10
```

出力: `data/groups.json`, `data/groups.txt`, `data/telegram-scout-targets.json`, `data/telegram-scout-targets.csv`

### スパム判定を避けるために

- グループ検索を短時間に大量に行うと API のレート制限（FloodWait）にかかる。
- **対策:** 1 キーワードごとに 10〜30 秒の `--delay` を入れる。毎日 200 通分であれば、1 日 3〜5 個の良質なグループが見つかれば十分。一度に数千グループを探す必要はない。

### JST 10時「200通」に向けた前夜実行

- **GetFullUserRequest** の待機を考慮すると、**前夜から** `run_pipeline.py` または `scrape_members.py` をバックグラウンドで回しておくのが安全。
- 例（Linux/WSL）: `nohup python run_pipeline.py --source seed --cap-per-lang 5,5,10 > pipeline.log 2>&1 &`
- 翌朝 10 時には `data/telegram-scout-targets.json` が完成している想定で、その JSON を元に送信指示書（誰にどのテンプレを送るか）を組み立てる。

### 10カ国×3レイヤー＝30パターン文面（短文弾薬）

- **設定:** `config/telegramScout30Templates.js` に 30 パターン（jp, ko, vn, in, ar, ng, br, latam, es, sea × Admin / KOL / ActiveMember）を定義済み。
- **取得:** `GET /api/telegram-scout-message?template30=1&lang=ja&category=Admin` → `message30` に短文が入る。`category` は `Admin` / `KOL` / `ActiveMember`。`market=ng` などで en 圏の国を指定可能。
- 抽出 JSON の `language` と `category` を見て、上記 API で取得した `message30` をそのまま送信に使える。

### 運用上の補足（実装済み）

- **KOL 判定のリンク優先:** Bio に **外部 SNS リンク（t.me 以外の YouTube / X / Instagram）** があるユーザーは、キーワードがなくても KOL として格上げ。
- **group_last_active:** 抽出 JSON に各グループの「最終発言日時」を `group_last_active`（ISO）で出力。古いグループのメンバーは送信優先度を下げる判断に利用可能。

### 参照

- 発見: `scripts/telegram_scout/discover_groups.py`
- シード例: `scripts/telegram_scout/seed_groups.txt.example`
- 一括実行: `scripts/telegram_scout/run_pipeline.py`
- 抽出・分類: `scripts/telegram_scout/scrape_members.py`

---

## 8. 参照（全体）

- テンプレ・バリエーション・Lead Scoring: `config/telegramScoutTemplates.js`
- **30パターン短文:** `config/telegramScout30Templates.js`（`?template30=1&lang=ja&category=Admin` で取得）
- API: `api/telegram-scout-message.js`（`?variation=random` / `?kitOnly=1` / `?template30=1` 対応）
- Bot /getlink: `services/telegram/bot-commands.js` の `handleGetlinkCommand`
- CSV 一括生成: `scripts/telegram-scout-csv.js`
