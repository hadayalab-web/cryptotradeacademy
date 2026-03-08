# Telegram「管理者一本釣り」スカウトワークフロー

今日から動かすための、**断られない管理者スカウト**に特化した手順と自動化の範囲。

**方針:** メッセージの自動配信は行いません。**DMリスト取得のみ**に特化しています。リスト取得後は手動または外部ツール（TeleSender / CRMChat 等）で送信してください。

**基幹リスト抽出ロジック（一本化）:** 探索 → 抽出の流れと成果物は **`docs/TELEGRAM_SCOUT_CORE_LOGIC.md`** に定義。デプロイ用リストは **`data/telegram-scout-targets.csv`**。

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
- API: `GET /api/telegram-scout-message?lang=es&handle=AdminName&channel=MyChannel` → `firstMessage` をコピペ。**招待 URL（inviteUrl）は省略可**。`lang` に応じて `FIRSTPROMOTER_INVITE_URL_ES` 等が自動で使われる。
- またはスクリプト: `node scripts/telegram-scout-csv.js` で CSV から一括生成（各行の言語に応じて言語別招待 URL を使用）。

---

## 3. OK と言われたあと：「1分で完了」キット

以下をすぐ送る。

1. **実績画像**（所持しているもの）
2. **短い紹介文**（各言語）＝ `SCOUT_KIT_AFTER_OK` の「Short intro」部分
3. **FirstPromoter 登録・リンク発行**への誘導（`{inviteUrl}`）
4. **先行者ボーナス**（任意）:「最初の1週間だけ、あなたのリンクからの登録者に10%オフ」

キット本文取得:
- API: `GET /api/telegram-scout-message?lang=es&kitOnly=1` → `kit` をコピペ。招待 URL は言語別環境変数（`FIRSTPROMOTER_INVITE_URL_ES` 等）から自動挿入。
- Bot: ユーザーが `/getlink es` を送ると、同じく言語別招待 URL 付きのキットが返る。

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
| メッセージ送信 | ❌ 手動 or 外部ツール（**自動配信なし**） | TeleSender / CRMChat 等で送信。API で `firstMessage` を取得して流す。当システムはリスト取得のみ。 |
| **グループリスト（送信先候補）** | ✅ **自動**（パターンB/C） | **手動でゼロから作る必要なし。** `discover_groups.py` の **api** モード（キーワード→第三者API）または **seed** モード（数個のURLを `seed_groups.txt` に書くだけ）でシステムが自動構築。従来の「外部 or CSV 用意」はパターンAのみ。 |

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

### 履歴フォールバック（メンバー非表示グループ対応）**※実装済み**

- **メンバー一覧が非表示（Hide Members）**のグループでは、`iter_participants` が 0 件になる。
- その場合、**直近 N 件のメッセージの発言者**を `iter_messages` で取得し、KOL/ActiveMember として抽出するフォールバックが自動で動く（Admin は履歴からは判定不可）。
- **オプション:** `--fallback-from-history`（デフォルト ON）、`--no-fallback-from-history`（無効）、`--history-limit 500`（デフォルト 500 件。足りなければ `1000` に増やす）。
- ログに `[fallback] ... 直近 500 件のメッセージから発言者を抽出` と出れば、そのグループは履歴から抜いている。

### groups.txt の形式

- 1行 = `group_ref` または `group_ref` + タブ + `言語コード`（例: `en`, `ko`, `es`）
- 言語は `language` として出力され、目視やテンプレ選びに利用。

### 手順

1. **Python 環境**
   - `scripts/telegram_scout/` で `pip install -r requirements.txt`
   - [my.telegram.org](https://my.telegram.org) で API ID / API Hash 取得
   - `.env` に `API_ID`, `API_HASH`, `PHONE` を設定
   - **`groups.txt`** は **手動で書かなくてよい**。`discover_groups.py`（**api** または **seed**）を先に実行すると自動で生成される。手動で用意する場合は 1行1件（任意で 2 列目に言語コード）。

2. **抽出**
   - 管理層のみ: `python scrape_members.py --output ../../data/telegram-scout-targets.json`
   - 三層すべて: `python scrape_members.py --all-members --max-per-group 300 --output out.json`
   - **200通マトリックス（10カ国×3レイヤー）**: `--cap-per-lang 5,5,10` で各国 5 Admin + 5 KOL + 10 Active までに自動で絞る。`groups.txt` は discover（api/seed）で自動生成されるので、**10言語分のグループを手動で用意する必要はない**。run_pipeline を回せば最大 200 件のリストができる。
   - CSV も出力: `--csv ../../data/telegram-scout-targets.csv`
   - オプション: `--allow-no-username`, `--include-inactive`, `--delay 0.5`（GetFullUser 間隔。Flood 対策で 2 秒前後にしてもよい）

3. **【技術】抽出できない主な原因（3つの壁）とフォールバック**
   - **① メンバー一覧が非表示:** グループ設定で「Hide Members」が ON だと、メンバーリストが取れず `iter_participants` が 0 件になる。**対策:** `--fallback-from-history`（デフォルト ON）で、直近メッセージの発言者から抽出する。このとき Admin は判定できないため **KOL / ActiveMember のみ** 出力する。
   - **② API 制限:** 一度に取れる人数や検索の仕様制限。FloodWait 時はスクリプト内で待機してリトライする。
   - **③ エンティティ解決失敗:** `Could not find the input entity` は `groups.txt` の書き方（@username や t.me リンク）を確認する。
   - フォールバックを無効にしたい場合: `--no-fallback-from-history`。履歴から読む件数は `--history-limit 500`（デフォルト）で変更可能。

4. **【技術】Bio 取得と Flood 対策**
   - Bio は `GetFullUserRequest` で取得している。ループ内で 1 ユーザーごとにリクエストするため、`--delay`（デフォルト 0.4 秒）で間隔を空け、FloodWaitError 発生時はスクリプト内で待機してからリトライする。短時間に数百人分を叩く場合は `--delay 2` や「まず Username ありだけ抽出→その中から KOL 候補だけ Bio 確認」の 2 段構えも有効。

5. **【運用】送信不可ユーザーとリスト余裕**
   - 抽出リストには「知らない人からのメッセージ拒否」設定のユーザーが数％含まれる想定。**送信を Python で自動化する場合は** `PeerFloodError`（送信制限）と `UserPrivacyRestrictedError`（プライバシー制限）を `try-except` でキャッチすること。
   - **リストは 20% 増しで抽出**しておくと、送信で弾かれても 200 通分を確保しやすい（例: `--cap-per-lang 6,6,12` で 240 件）。

6. **KV 投入**
   - `node scripts/telegram-scout-to-kv.js [data/telegram-scout-targets.json]`
   - 環境変数 `KV_REST_API_URL` / `KV_REST_API_TOKEN` が必要（Vercel KV と同じ）。

7. **目視**（パターンB）
   - `GET /api/telegram-scout-targets?limit=200&offset=0` で一覧取得。
   - レスポンス: `{ targets: [{ user_id, username, first_name, last_name, category, role, group_name, language, bio_snippet, ... }], total, limit, offset }`
   - ダッシュボードや Excel 用に CSV 化する場合はこの API を叩いて加工。

### 200通マトリックス（最終確認）

| カウント | 国 | レイヤー | 抽出数（各国） |
| --- | --- | --- | --- |
| 50名 | 10カ国 | Admin | 5名 |
| 50名 | 10カ国 | KOL | 5名 |
| 100名 | 10カ国 | Active | 10名 |

`groups.txt` は discover（api/seed）で自動生成される。そのうえで `run_pipeline.py` または `scrape_members.py --groups ... --all-members --cap-per-lang 5,5,10 --csv out.csv` を実行すると、上記の「200通送信用」リストが CSV/JSON で得られる。

---

## 7. パターンC: グループ発見まで自動化（顧客獲得エンジン）

**ターゲット発見 → 抽出 → 分類** まで一貫して自動化する流れ。

### 結論：グループリストを手動で作る必要はない

- **あなたがやるべきこと**は、システムの「起点」となる**キーワード**（api モード）または**シード（数個のグループURL）**（seed モード）を与え、**`run_pipeline.py` を実行することだけ**です。
- **グループリスト**は、`discover_groups.py` が **api** なら RapidAPI から自動発掘、**seed** なら `seed_groups.txt` のURLを検証して自動で `groups.txt` に書き出します。**「リスト作り」という労働からは不要**です。
- **api モード**を使えば、**「種（Seed）を探す労働」からも解放**されます。キーワードさえ設定すれば、その時点で世界で盛り上がっているグループを自動でリストアップします。

### 全自動・給弾システム（RapidAPI 主経路）

RapidAPI を活用すると、**手動で `seed_groups.txt` を更新する作業は不要**です。

1. **[API 発掘]** `discover_groups.py --source api` が RapidAPI（Telegram Index API または Telegram Data API）を叩き、**その瞬間に世界で盛り上がっているグループ**を自動で `groups.txt` にリストアップ。
2. **[抽出・分類]** `scrape_members.py` がそのリストを読み込み、Admin / KOL / ActiveMember を抽出。**履歴フォールバック**によりメンバー非表示グループも逃さない。
3. **[自動給弾]** `telegram-scout-to-kv.js` で抽出結果を Vercel KV へ投入。毎朝 10 時の daily API で 200 件＋メッセージを取得可能。

**司令官の仕事は一つだけ:** `discover_groups.py` 内の **検索キーワード（`SEARCH_KEYWORDS`）の鮮度**を保つこと。新興コインが流行ったらその名前を追加、特定国で規制が話題なら関連ワードを入れる、など。コードを書く必要も、URL を探す必要もありません。

### 最終形態へのチェックリスト（RapidAPI 統合）

| # | 項目 | 内容 |
|---|------|------|
| 1 | **RapidAPI キー** | [Telegram Index API](https://rapidapi.com) または [Telegram Data API](https://rapidapi.com/hvuhsg5/api/telegram-data-api) 等、検索エンドポイントを持つ API を購読。月額プランに応じて利用。 |
| 2 | **環境変数** | `RAPIDAPI_KEY` または `TELEGRAM_INDEX_RAPIDAPI_KEY` を `.env`（または Vercel）に追加。Telegram Data API を使う場合は `TELEGRAM_RAPIDAPI_HOST=telegram-data-api.p.rapidapi.com` を設定。 |
| 3 | **一括実行** | 以下を叩くだけで、翌朝には新しい獲物が並ぶ。前夜実行を Cron 化すれば完全自動。 |
| 4 | **キーワード** | `scripts/telegram_scout/discover_groups.py` の `SEARCH_KEYWORDS`（10カ国語）をトレンドに合わせてたまに更新。 |

```bash
# 全自動給弾：これを叩くだけで、明日の朝には新しい獲物が並びます
python run_pipeline.py --source api --cap-per-lang 5,5,10 --delay 20
```

### RapidAPI アカウント開設と API 購読手順（最初の一歩）

「自動給弾システム」の心臓部を手に入れるための手順です。

#### 1. 公式サイトでアカウント作成

[RapidAPI Hub](https://rapidapi.com/hub) にアクセスし、右上の **"Sign Up"** からアカウントを作成する。

- Google、GitHub、またはメールアドレスで登録可能。

#### 2. 使用する API を特定

検索窓に **「Telegram Index」** または **「Telegram Data API」** と入力して探す。

- **推奨:** 「キーワードからグループを検索できる」エンドポイントを持つものを選ぶ。例: [Telegram Index API](https://rapidapi.com/hvuhsg5/api/telegram-index) 系、[Telegram Data API](https://rapidapi.com/hvuhsg5/api/telegram-data-api)。

#### 3. プランの購読（サブスクリプション）

1. API の個別ページで **"Pricing"** タブをクリック。
2. まずは **"Basic"（無料枠あり）** または本格運用なら **"Pro"（月額 $5〜$20 程度）** の **"Subscribe"** を押す。
3. クレジットカードまたは PayPal を登録して完了。

#### 4. API キー（X-RapidAPI-Key）の取得

購読完了後、**"Endpoints"** タブのコードスニペット（右側）に表示される **X-RapidAPI-Key** をメモする。

#### 5. システムとの連携

- **`RAPIDAPI_KEY`** を `scripts/telegram_scout/.env` に保存（または `TELEGRAM_INDEX_RAPIDAPI_KEY` でも可）。`run_pipeline.py` は `.env` を読み込むため、キーを安全に参照できる。
- **`discover_groups.py`** はすでに API キーでキーワード検索→グループ自動取得に対応済み。`seed_groups.txt` を手で書く必要はない。

**アカウント作成とキー取得ができたら、** `run_pipeline.py --source api` を実行するだけで、翌朝には世界中の「稼げるグループ」がリストに並ぶ状態になります。あわせて **10カ国語×キーワード・マトリックス**（`SEARCH_KEYWORDS`）の鮮度をたまに更新すれば、自動給弾は完成です。

### 全体フロー

1. **[発見]** `discover_groups.py` … 母集団（グループ）を取得
2. **[抽出]** `scrape_members.py` … 各グループから Admin/KOL/Active を抽出
3. **[出力]** `targets.json` / `targets.csv` … 目視・送信用リスト

### 発見の2通り（どちらも「リストを手動で作る」必要なし）

| ソース | 説明 | あなたの作業 |
|--------|------|----------------|
| **api** | 10カ国語キーワードで RapidAPI（Telegram Index API / Telegram Data API）が 500〜50,000 人規模のグループを自動発掘。**種（Seed）を探す労働なし**。 | **なし**。`RAPIDAPI_KEY` または `TELEGRAM_INDEX_RAPIDAPI_KEY` を設定して `run_pipeline.py --source api` を実行するだけ。 |
| **seed** | 「ここは外せない」というグループURLを数個、`seed_groups.txt` に書く。システムが有効性・人数をチェックしてリスト化 | 気になるグループのURLをコピペするだけ。 |

**技術メモ:** Telegram の公式 API には「キーワードで公開グループ検索」がないため、**api** は第三者 HTTP API に依存し、**seed** はその URL を Telethon で解決・検証する形です。いずれにせよ、**送信先グループのリストはシステムが自動で構築**します。

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

# 全自動給弾（RapidAPI で発見 → 抽出。要 RAPIDAPI_KEY または TELEGRAM_INDEX_RAPIDAPI_KEY）
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

### リスト取得のタイミング

- パイプライン `run_pipeline.py` の実行は手動。必要に応じて前夜に実行し、翌朝には `data/telegram-scout-targets.json` を利用可能にしておく運用が一般的。
- **GetFullUserRequest** の待機を考慮すると、**前夜から** `run_pipeline.py` または `scrape_members.py` をバックグラウンドで回しておくのが安全。
- 例（Linux/WSL）: `nohup python run_pipeline.py --source api --cap-per-lang 5,5,10 --delay 20 > pipeline.log 2>&1 &`（全自動給弾）。seed の場合は `--source seed`。
- 出力された JSON（および KV に補充した場合は `GET /api/telegram-scout-targets`）を元に、送信先リストを確認し、手動または外部ツールで DM を送る。

### 10カ国×3レイヤー＝30パターン文面（短文弾薬）

- **設定:** `config/telegramScout30Templates.js` に 30 パターン（jp, ko, vn, in, ar, ng, br, latam, es, sea × Admin / KOL / ActiveMember）を定義済み。
- **取得:** `GET /api/telegram-scout-message?template30=1&lang=ja&category=Admin` → `message30` に短文が入る。`category` は `Admin` / `KOL` / `ActiveMember`。`market=ng` などで en 圏の国を指定可能。
- 抽出 JSON の `language` と `category` を見て、上記 API で取得した `message30` をそのまま送信に使える。

### 運用上の補足（実装済み）

- **KOL 判定のリンク優先:** Bio に **外部 SNS リンク（t.me 以外の YouTube / X / Instagram）** があるユーザーは、キーワードがなくても KOL として格上げ。
- **group_last_active:** 抽出 JSON に各グループの「最終発言日時」を `group_last_active`（ISO）で出力。古いグループのメンバーは送信優先度を下げる判断に利用可能。

### リスト取得のみ（自動配信なし）

- **方針:** 毎日の Cron による自動配信・自動「200件＋メッセージ」生成は**廃止**済み。**DMリストの取得のみ**に特化しています。
- **リストの取得方法:**
  1. **KV から API で取得:** `GET /api/telegram-scout-targets?limit=200&offset=0` で、KV に格納済みのターゲット一覧を取得。事前に KV を補充しておく必要あり。
  2. **パイプライン出力をそのまま利用:** `run_pipeline.py` の出力 `data/telegram-scout-targets.json`（および `data/telegram-scout-targets.csv`）を目視・外部ツール用に利用。
- **KV の補充:** パイプライン実行後、次のいずれかで KV に投入する。
  1. **手元:** `node scripts/telegram-scout-to-kv.js [data/telegram-scout-targets.json]`
  2. **API:** パイプライン実行環境から `POST /api/telegram-scout-refill` に送る。Body: `targets` 配列またはルートが配列の JSON。認証: `Authorization: Bearer ${CRON_SECRET}` または `TELEGRAM_SCOUT_REFILL_SECRET`（未設定なら認証スキップ）。
- **送信済み記録（任意）:** 手動送信後に `POST /api/telegram-scout-mark-sent` に `{ "user_id": 123 }` または `{ "user_ids": [123, 456] }` を送ると、KV に記録可能。リスト取得時に重複送信を避ける用途で利用可。

### 言語別 FirstPromoter 招待 URL（追加実装）

- 一通目・キット・Bot `/getlink` で使う **招待 URL** を、言語ごとに切り替え可能。
- **環境変数:** `FIRSTPROMOTER_INVITE_URL_EN`, `_ES`, `_PT`, `_AR`, `_KO`, `_JA` を設定すると、`/api/telegram-scout-message?lang=es` や `/getlink es` でその言語用の URL が自動で使われる。未設定の言語は `FIRSTPROMOTER_INVITE_URL` または `firstpromoter.com` にフォールバック。
- 実装: `config/affiliateRecruitConfig.js` の `getFirstPromoterInviteUrl(lang)` を、`api/telegram-scout-message.js`・`services/telegram/bot-commands.js`・`scripts/telegram-scout-csv.js` が参照。

### 参照

- 発見: `scripts/telegram_scout/discover_groups.py`
- シード例: `scripts/telegram_scout/seed_groups.txt.example`
- 一括実行: `scripts/telegram_scout/run_pipeline.py`
- 抽出・分類: `scripts/telegram_scout/scrape_members.py`
- **リスト取得 API:** `api/telegram-scout-targets.js`（`GET /api/telegram-scout-targets?limit=200&offset=0`。自動配信なし）
- KV 補充: `scripts/telegram-scout-to-kv.js` または `api/telegram-scout-refill.js`（POST で KV に投入）
- 送信済みマーク（任意）: `api/telegram-scout-mark-sent.js`
- 完了報告・環境変数一覧: `docs/TELEGRAM_SCOUT_COMPLETION_REPORT.md`

---

## 8. 参照（全体）

- テンプレ・バリエーション・Lead Scoring: `config/telegramScoutTemplates.js`
- **30パターン短文:** `config/telegramScout30Templates.js`（`?template30=1&lang=ja&category=Admin` で取得）
- **言語別招待 URL:** 環境変数 `FIRSTPROMOTER_INVITE_URL_EN` / `_ES` / `_PT` / `_AR` / `_KO` / `_JA`。`config/affiliateRecruitConfig.js` の `getFirstPromoterInviteUrl(lang)` で参照。
- API: `api/telegram-scout-message.js`（`?variation=random` / `?kitOnly=1` / `?template30=1` 対応。inviteUrl 未指定時は言語別 URL を使用）
- **リスト取得:** `api/telegram-scout-targets.js`（`GET /api/telegram-scout-targets`。自動配信なし）
- Bot /getlink: `services/telegram/bot-commands.js` の `handleGetlinkCommand`（言語別招待 URL 対応）
- CSV 一括生成: `scripts/telegram-scout-csv.js`（言語別招待 URL 対応）
