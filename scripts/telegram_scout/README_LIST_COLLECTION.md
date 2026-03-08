# リスト収集ロジック（ベストプラクティス・多国籍展開）

**基幹ロジックは一本化済み。** 詳細は **`docs/TELEGRAM_SCOUT_CORE_LOGIC.md`** を参照。

- **探索** → **抽出**（本 README の run_pipeline / scrape）。成果物は **`data/telegram-scout-targets.csv`**（デプロイにそのまま利用）。

---

## 流れ

1. **発見** `discover_groups.py` … シード or API で `data/groups.txt`（`group_ref\t言語`）を生成  
2. **抽出** `scrape_members.py` … 各グループから Admin/KOL/ActiveMember を抽出 → `data/telegram-scout-targets.json` + **`data/telegram-scout-targets.csv`**（デプロイ用リスト）

進捗は **`data/telegram-scout-progress.json`** に保存される。同じ `groups.txt` で再実行すると続きから再開する。

**全件完了フラグ:** 全グループ処理が終わると **`data/telegram-scout-complete.flag`** が作成される。中身は `COMPLETE`・グループ数・日時・ターゲット数。このファイルがあれば「全件完了」と分かる。再実行で続きがある場合はフラグは消される。

---

## ロジック上のポイント（仕上げ済み）

- **get_entity リトライ** … 初回失敗時に 2 秒待って 1 回だけリトライ（一過性エラーでスキップしすぎない）
- **FloodWait** … 待機時間が `--max-flood-wait` を超えるグループはスキップし、`data/groups-floodwait-skipped.txt` に出力。後でそのファイルを groups にして再実行可能
- **連続スキップ** … `--max-consecutive-skips 0` で「連続スキップで止めない＝完走」モード
- **resume** … デフォルトで有効。`telegram-scout-progress.json` の `next_index` から再開
- **Admin/KOL のみ** … `--admin-kol-only` で ActiveMember を追加しない。非 Admin の KOL 判定は `--max-non-admin-for-kol`（デフォルト 10）で cap。API バースト防止に有効。
- **フォールバック時の get_entity 連打防止** … 履歴から @username を拾ったとき、**最大15件まで**しか get_entity せず、件間に `delay_full_user` を入れる。これ以上は呼ばないのでロックされにくい。

---

## 実行例（ブラジル・完走）

**`--skip-discover` 指定時は必ず追記（--merge-existing が自動で付く）。既存 targets は上書きされない。**

**FloodWait を避ける:** 1回あたり 10 グループだけ処理（`--max-groups 10`）→ 進捗保存 → 同じコマンドを繰り返して次の 10 グループ。438 グループなら約 44 回の実行で完走。

```bash
cd scripts/telegram_scout

# 小分け運用: 1回 10 グループだけ → 再実行で続きから
python run_pipeline.py --skip-discover --groups-file ../../data/groups.txt \
  --max-consecutive-skips 0 --max-groups 10 --delay-between-groups 8 --max-per-group 5

# 一気に完走したいとき（FloodWait リスクあり）
python run_pipeline.py --skip-discover --groups-file ../../data/groups.txt \
  --max-consecutive-skips 0 --max-groups 0 --delay-between-groups 8 --max-per-group 5

# バースト抑制（Admin/KOL のみ・間隔空け・履歴 cap）
python run_pipeline.py --skip-discover --groups-file ../../data/groups.txt \
  --max-consecutive-skips 0 --max-groups 10 --delay-between-groups 30 \
  --delay-full-user 1.5 --max-per-group 2 --history-max-users 5 --admin-kol-only
```

別言語（多国籍）のときは、発見で `--lang es` などで `groups.txt` を用意し、同じように `--skip-discover --groups-file ...` で抽出すればよい。

---

## エラーが出たとき

スクリプトを回して **エラーメッセージ（トレースバック含む）をそのまま渡してくれ**。  
ロジック側で原因を潰して、リスト収集を完璧に仕上げる。
