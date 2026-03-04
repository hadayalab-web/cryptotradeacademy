# Telegram スカウト「顧客獲得エンジン」完了報告

**作成日:** 2026年2月  
**対象:** グループ発見 → メンバー抽出 → 3レイヤー分類 → 30パターン文面 まで一貫した自動化

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
| 9 | 前夜実行・JST 10時運用メモ | ✅ 完了 | `docs/TELEGRAM_SCOUT_WORKFLOW.md` に記載 |

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
| 目視用ターゲット API | `api/telegram-scout-targets.js` |
| ワークフロー説明 | `docs/TELEGRAM_SCOUT_WORKFLOW.md` |

---

## 3. 運用フロー（明日 10 時「200通」向け）

1. **前夜（推奨）**  
   `run_pipeline.py` または `scrape_members.py` をバックグラウンドで実行し、翌朝までに `data/telegram-scout-targets.json` を生成する。

   ```bash
   cd scripts/telegram_scout
   nohup python run_pipeline.py --source seed --seed-file seed_groups.txt --cap-per-lang 5,5,10 > pipeline.log 2>&1 &
   ```

2. **翌朝 10 時**  
   - `data/telegram-scout-targets.json` を確認。  
   - 各レコードの `language` と `category` に応じて、  
     `GET /api/telegram-scout-message?template30=1&lang=<lang>&category=<category>` で `message30` を取得。  
   - 必要に応じて `group_last_active` で古いグループを下位にし、送信順を決める。

3. **送信**  
   取得した `message30` に [Affiliate Link] と [実績スクショ] を添えて送信。

---

## 4. 毎日 JST 10:00 の Cron（200リスト＋メッセージ）

- **Cron:** `0 1 * * *`（UTC 01:00 = JST 10:00）で `/api/telegram-scout-daily` を実行。
- **処理内容:** KV に格納されている最新ターゲットから最大 200 件を取得し、各ターゲットに `language` / `category` に応じた 30 パターン文面（`message30`）を付与して **当日分** として KV に保存する。
- **取得:** 同日以降に `GET /api/telegram-scout-daily` を叩くと、その日付の「200リスト＋ターゲットごとのメッセージ」が返る。
- **CSV 出力:** `GET /api/telegram-scout-daily?format=csv` で CSV ダウンロード。
- **注意:** 「最新 200 リスト」の元データは KV。前夜に `run_pipeline.py` → `telegram-scout-to-kv.js` で KV を更新しておく必要がある。

## 5. API クイックリファレンス

| 用途 | 例 |
|------|-----|
| **当日の 200＋メッセージ** | `GET /api/telegram-scout-daily` |
| 当日を CSV で | `GET /api/telegram-scout-daily?format=csv` |
| 30パターン短文 | `GET /api/telegram-scout-message?template30=1&lang=ja&category=Admin` |
| 国指定（en 圏） | `?template30=1&lang=en&category=KOL&market=ng` |
| 一通目（既存） | `?lang=es&handle=AdminName&channel=MyChannel&inviteUrl=...` |
| 目視用ターゲット一覧 | `GET /api/telegram-scout-targets?limit=200&offset=0` |

---

## 6. 技術メモ

- **Telethon**: 公式 API に「キーワードで公開グループ検索」はないため、グループ発見は **第三者 API（Telegram Index 等）** または **シードリストの Telethon 検証** で実施。
- **Bio 取得**: `GetFullUserRequest` をループ内で実行。FloodWait 時は待機してリトライ。`--delay` で間隔調整可能。
- **送信側**: 自動送信を実装する場合は `PeerFloodError` / `UserPrivacyRestrictedError` のキャッチを推奨。リストは 20% 増し（例: `--cap-per-lang 6,6,12`）で抽出すると余裕が持てる。

---

以上で、**ターゲット発見 → 抽出 → 分類 → 送信文面取得** まで一連のシステム実装は完了しています。
