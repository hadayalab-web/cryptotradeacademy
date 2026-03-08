# クールダウン後のタスク（CEO 用）

共有・確認用。**グループリストからアカウントを抽出する処理は行わない。**  
やることは「渡した URL からグループリスト（groups.csv）を作る」だけ。

---

## タスク

| # | やること |
|---|----------|
| **1** | **URL を用意する** | グループ・チャンネルの URL を1行1件で `urls.txt` などに書く。 |
| **2** | **グループリストを作る** | `python urls_to_groups_csv.py --input urls.txt --output ../../data/groups.csv --lang pt` を実行。 |

**できあがるもの:** `data/groups.csv`（group_ref, language）。他ツールや手動で利用する。

---

## コマンド（コピペ用）

```powershell
cd scripts/telegram_scout
python urls_to_groups_csv.py --input urls.txt --output ../../data/groups.csv --lang pt
```
