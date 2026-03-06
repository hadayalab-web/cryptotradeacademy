# Telegram スカウト「顧客獲得エンジン」完了報告

**作成日:** 2026年2月  
**対象:** グループ発見 → メンバー抽出 → 3レイヤー分類 → 30パターン文面 まで一貫した自動化  

**方針:** メッセージの自動配信は行わない。**DMリスト取得のみ**に特化。送信は手動または外部ツールで実施。

---

## 1. 実装完了項目一覧

| # | 項目 | 状態 | 備考 |
|---|------|------|------|
| 1 | グループ発見（API / シード） | ✅ 完了 | `discover_groups.py`。10カ国キーワード・品質フィルタ（500〜50,000人）・重複排除 |
| 2 | メンバー抽出・三層分類 | ✅ 完了 | `scrape_members.py`。5フィルタ・Admin/KOL/ActiveMember・Bio取得・FloodWait リトライ |
| 3 | 言語別キャップ（200通マトリックス） | ✅ 完了 | `--cap-per-lang 5,5,10`。10言語で最大 200 件 |
| 4 | 一括パイプライン | ✅ 完了 | `run_pipeline.py`。発見→抽出を1コマンドで。`--dry-run` 対応 |
| 5 | KOL 判定の「リンク優先」 | ✅ 完了 | Bio に **t.me 以外**の YouTube/X/Instagram があれば無条件で KOL 格上げ |
| 6 | グループ最終発言日時 | ✅ 完了 | 出力 JSON に `group_last_active`（ISO）を付与。送信優先度の判断に利用可能 |
| 7 | 10カ国×3レイヤー＝30文面 | ✅ 完了 | `config/telegramScout30Templates.js`。jp, ko, vn, in, ar, ng, br, latam, es, sea × Admin/KOL/ActiveMember |
| 8 | 30文面の API 取得 | ✅ 完了 | `GET /api/telegram-scout-message?template30=1&lang=ja&category=Admin`（`market` で国指定可） |
| 9 | 前夜実行・リスト取得運用メモ | ✅ 完了 | `docs/TELEGRAM_SCOUT_WORKFLOW.md` に記載 |
| 10 | 毎日 Cron（daily API） | ❌ 廃止 | **DMリスト取得のみに特化**。自動配信・daily API は廃止済み |
| 11 | 送信済みフラグ（任意） | ✅ 完了 | `POST /api/telegram-scout-mark-sent`。手動送信後の重複防止に利用可 |
| 12 | リスト取得 API | ✅ 完了 | `GET /api/telegram-scout-targets`。パイプライン出力 JSON/CSV も利用可 |
| 13 | KV 補充 | ✅ 完了 | `scripts/telegram-scout-to-kv.js` または `POST /api/telegram-scout-refill` |
| 14 | 言語別 FirstPromoter 招待 URL | ✅ 完了 | `FIRSTPROMOTER_INVITE_URL_EN/ES/PT/AR/KO/JA`。API・Bot・CSV で自動選択 |

---

## 2. 主要ファイル

| 役割 | パス |
|------|------|
| グループ発見 | `scripts/telegram_scout/discover_groups.py` |
| メンバー抽出・分類 | `scripts/telegram_scout/scrape_members.py` |
| 一括実行 | `scripts/telegram_scout/run_pipeline.py` |
| 30パターン文面 | `config/telegramScout30Templates.js` |
| 一通目・キット（既存） | `config/telegramScoutTemplates.js` |
| メッセージ API | `api/telegram-scout-message.js` |
| **リスト取得 API** | `api/telegram-scout-targets.js`（自動配信なし） |
| KV 補充 API | `api/telegram-scout-refill.js` |
| 送信済みマーク（任意） | `api/telegram-scout-mark-sent.js` |
| ワークフロー説明 | `docs/TELEGRAM_SCOUT_WORKFLOW.md` |

---

## 3. 運用フロー（リスト取得のみ・自動配信なし）

**方針: メッセージの自動配信は行わない。DMリスト取得のみに特化。**

1. **リスト取得**  
   - **パイプライン:** `run_pipeline.py` で **発見 → 抽出 → 分類** を実行し、`data/telegram-scout-targets.json`（および CSV）を生成。  
   - **KV 経由:** 上記 JSON を `node scripts/telegram-scout-to-kv.js` または `POST /api/telegram-scout-refill` で KV に投入後、`GET /api/telegram-scout-targets?limit=200&offset=0` で取得。

2. **送信**  
   リストを元に、**手動**または外部ツール（TeleSender / CRMChat 等）で DM を送信。必要に応じて `GET /api/telegram-scout-message?template30=1&lang=<lang>&category=<category>` で `message30` を取得して利用。

3. **送信済み記録（任意）**  
   `POST /api/telegram-scout-mark-sent` で送信済みを記録し、重複送信を防ぐ。

---

## 4. リスト取得のみ（Cron・自動配信は廃止）

- **方針:** 毎日の Cron および「200リスト＋メッセージ」の自動生成は**廃止**。**DMリストの取得のみ**に特化しています。
- **リスト取得:** `GET /api/telegram-scout-targets?limit=200&offset=0` で KV に格納済みのターゲット一覧を取得。事前に `POST /api/telegram-scout-refill` または `node scripts/telegram-scout-to-kv.js` で KV を補充しておく。
- **パイプライン出力:** `run_pipeline.py` の `data/telegram-scout-targets.json` / `.csv` をそのままリストとして利用可能。
- **送信済み記録（任意）:** `POST /api/telegram-scout-mark-sent` に `{ "user_id": 123 }` または `{ "user_ids": [123, 456] }` を送ると KV に記録。手動送信後の重複防止に利用可。

## 5. API クイックリファレンス

| 用途 | 例 |
|------|-----|
| **リスト取得** | `GET /api/telegram-scout-targets?limit=200&offset=0` |
| KV 補充 | `POST /api/telegram-scout-refill` Body: 配列 or `{ targets: [] }`。認証: Bearer `${CRON_SECRET}` 等 |
| 送信済みマーク（任意） | `POST /api/telegram-scout-mark-sent` Body: `{ "user_id": 123 }` または `{ "user_ids": [123, 456] }` |
| 30パターン短文 | `GET /api/telegram-scout-message?template30=1&lang=ja&category=Admin` |
| 国指定（en 圏） | `?template30=1&lang=en&category=KOL&market=ng` |
| 一通目（既存） | `?lang=es&handle=AdminName&channel=MyChannel&inviteUrl=...` |

---

## 6. 環境変数（追加実装分）

| 変数名 | 用途 |
|--------|------|
| `FIRSTPROMOTER_INVITE_URL_EN` | 英語圏の FirstPromoter 招待 URL（一通目・キット・/getlink で使用） |
| `FIRSTPROMOTER_INVITE_URL_ES` | スペイン語 |
| `FIRSTPROMOTER_INVITE_URL_PT` | ポルトガル語 |
| `FIRSTPROMOTER_INVITE_URL_AR` | アラビア語 |
| `FIRSTPROMOTER_INVITE_URL_KO` | 韓国語 |
| `FIRSTPROMOTER_INVITE_URL_JA` | 日本語 |
| `TELEGRAM_SCOUT_ALERT_WEBHOOK_URL` | 弾薬不足時（200 件未満）に通知する Slack / Discord Incoming Webhook URL |

未設定の言語は `FIRSTPROMOTER_INVITE_URL` または `firstpromoter.com` にフォールバック。API（`/api/telegram-scout-message`）・Bot（`/getlink`）・`scripts/telegram-scout-csv.js` はいずれも `config/affiliateRecruitConfig.js` の `getFirstPromoterInviteUrl(lang)` で言語別 URL を参照する。

---

## 7. 技術メモ

- **グループリスト**: 手動でゼロから作る必要なし。**api** = 第三者 API でキーワード検索→自動発掘。**seed** = 数個の URL を `seed_groups.txt` に書くだけ→Telethon で検証・リスト化。
- **Telethon**: 公式 API に「キーワードで公開グループ検索」はないため、発見は **第三者 API** または **シードの検証** で実施。
- **Bio 取得**: `GetFullUserRequest` をループ内で実行。FloodWait 時は待機してリトライ。`--delay` で間隔調整可能。
- **送信側**: 自動送信を実装する場合は `PeerFloodError` / `UserPrivacyRestrictedError` のキャッチを推奨。リストは 20% 増し（例: `--cap-per-lang 6,6,12`）で抽出すると余裕が持てる。

---

以上で、**ターゲット発見 → 抽出 → 分類 → 送信文面取得 → 毎日 Cron・送信済み管理・言語別招待 URL** まで一連のシステム実装は完了しています。
