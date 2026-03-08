# Telegram スカウト：CEO 手順（やることだけ）

**やることは1つ：渡した URL からグループリスト（groups.csv）を作る。**

グループリストからアカウントを抽出する処理は行わない。

---

## 前提

- 自分でグループ・チャンネルの URL を用意する。
- プロジェクトのルート（`cryptotradeacademy`）でターミナルを開く。

---

## 手順：グループリストを作る

**やること:** URL を1行1件で書いたファイル（例: `urls.txt`）を用意し、次を実行する。

```powershell
cd scripts/telegram_scout
python urls_to_groups_csv.py --input urls.txt --output ../../data/groups.csv --lang pt
```

- **`--input`** … URL 一覧ファイル（1行1URL。タブまたはカンマのあとに言語を書いてもよい）
- **`--output`** … 出力する groups.csv のパス（既定: `../../data/groups.csv`）
- **`--lang pt`** … 言語を省略した行のデフォルト言語（任意）

**できあがるもの:**  
`data/groups.csv`（列: `group_ref`, `language`）。このファイルを他ツールや手動で使う。

---

## まとめ

| やること | コマンド／作業 |
|----------|----------------|
| グループリスト作成 | `urls_to_groups_csv.py --input urls.txt --output ../../data/groups.csv` |

**新しい URL を追加したいとき:**  
`urls.txt` に追記して、同じコマンドを再実行すれば `groups.csv` が上書きされる。
