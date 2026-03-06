# Gemini「Google Dorking × Instant Data Scraper」分析のレビュー

## 司令官流：毎日「最強リスト」を作る標準フロー（コード完全対応済み）

| ステップ | アクション | 内容 |
|----------|------------|------|
| **1. 収穫** | Google Dorking | `site:t.me "キーワード"` で検索。必要なら期間指定（24時間/1週間）で鮮度を絞る。 |
| **2. 抽出** | 拡張機能 | Instant Data Scraper で検索結果を CSV 化。 |
| **3. 洗浄** | groups.txt 作成 | CSV の `t.me/` 列だけ抜く。**1行1件**。任意で **タブまたはカンマ + 言語**（`ref\tpt` または `ref,pt`）。重複はスクリプト側で自動除去。保存先: `data/groups.txt`。 |
| **4. 殲滅** | Python 実行 | `cd scripts/telegram_scout` → `python run_pipeline.py --skip-discover --groups-file ../../data/groups.txt --cap-per-lang 5,5,10` |
| **5. 納品** | CSV | `data/telegram-scout-targets.csv` が Admin/KOL/Active 仕分け済みアプローチリスト。 |

**groups.txt の形式（いずれも可）**
- `t.me/grupo_br`
- `https://t.me/grupo_br	pt`
- `https://t.me/grupo_br,pt`

---

## 結論（要約）

- **Dorking ＋ 拡張で URL を集める発想は有効**。鮮度・数・無料というメリットはその通り。
- **「API は古くて役に立たない」は言いすぎ**。PT では Parcerias / Brasil / Sinais で 4 件ヒット済み。API も併用するのが現実的。
- **スクリプトの使い方の記述が誤り**。`--source local` は存在しない。正しくは **`--skip-discover`** で既存の `groups.txt` を渡す。

---

## 1. 正しい運用フロー（このリポジトリの実装に合わせる）

Gemini は「集めた URL を `data/groups.txt` に流し込み、`--source local` で実行」と書いているが、**`--source local` は存在しない**。

### 正しい手順

1. **URL 収集**  
   Google Dorking ＋ Instant Data Scraper 等で `t.me/...` の URL を CSV などに保存。

2. **groups.txt の作成**  
   - 保存先: `data/groups.txt`（または任意のパス）  
   - 形式: **1行1件。`group_ref` のみ、または `group_ref` + タブ + 言語コード（pt, ja, en 等）**
   - 例:
     ```
     grupo_cripto_br	pt
     t.me/crypto_afiliados	pt
     https://t.me/joinchat/xxxxx	pt
     ```

3. **パイプライン実行（発見はスキップ）**  
   ```bash
   cd scripts/telegram_scout
   python run_pipeline.py --skip-discover --groups-file ../../data/groups.txt --cap-per-lang 5,5,10
   ```
   - `--skip-discover` = discover を飛ばし、既存の `groups.txt` だけを使う。  
   - このとき **「source」は api/seed ではなく「発見をスキップ」** なので、`--source` は不要。

4. **結果**  
   `data/telegram-scout-targets.json` と `data/telegram-scout-targets.csv` が生成され、Admin/KOL/Active の抽出と分類まで一括で動く。

---

## 2. Gemini 分析の評価

### 妥当な点

| 項目 | コメント |
|------|----------|
| **鮮度** | Google のインデックスは API の DB より新しいことが多く、Dorking で「いまある」グループを拾いやすいのは事実。 |
| **ヒット数** | 検索クエリ次第だが、API で +0 だった言語でも、Dork では件数が出る可能性はある。 |
| **無料** | 検索＋ブラウザ拡張なのでコストはかからない。 |
| **Dork 例** | `site:t.me "br" "crypto" "admin"` のような形は実用的。Instant Data Scraper で「次へ」を押して URL を抜く流れも現実的。 |

### 過大評価・誤り

| 項目 | 指摘 |
|------|------|
| **「API は古くて +0 の原因」** | PT では **Parcerias / Brasil / Sinais で 4 件** 取得できている。キーワードと type（channel/group）の調整で API も使える。「API が役に立たない」と切り捨てるのは早計。 |
| **`--source local`** | **存在しない**。正しくは `--skip-discover` と `--groups-file`。 |
| **「二度と +0 を見ない」** | Dork でもクエリやインデックス次第では 0 件になることはある。過信は禁物。 |

---

## 3. 推奨：ハイブリッド運用

- **RapidAPI**  
  - 使える言語・キーワード（例: pt の Parcerias, Brasil, Sinais）ではそのまま利用。  
  - `.env` は `scripts/telegram_scout/.env` のみ読み込む運用でキーを確実に渡す。
- **Google Dorking ＋ 拡張**  
  - API で弱い言語や、もっと数を増やしたいときに URL を補完。  
  - 取得した URL を `data/groups.txt` に整形し、**`run_pipeline.py --skip-discover --groups-file ../../data/groups.txt`** でメンバー抽出へつなぐ。

「API か Dork か」ではなく、**両方使う**のが現実的。

---

## 4. groups.txt の形式（再掲）

- 1行 = `group_ref` のみ、または `group_ref` + **タブ** または **カンマ** + 言語コード（例: `ref,pt`）。
- `group_ref` は次のどれでも可（読み込み時に正規化される）: `@username`, `username`, `t.me/username`, `https://t.me/joinchat/xxxxx`。同一 URL は自動で重複除去される。
- 言語コード例: `pt`, `ja`, `ko`, `en`, `es`, `ar`, `vi`。

Dork で取った CSV から URL 列だけ抜き、上記形式で `data/groups.txt` にすれば、そのまま現行パイプラインで利用できる。
