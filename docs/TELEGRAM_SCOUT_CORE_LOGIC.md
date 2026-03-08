# 基幹リスト抽出ロジック（ハブ・ハンティング・サイクル）

**このドキュメントが、Telegram スカウトにおける「リスト抽出」の唯一の基幹ロジックとする。**

**→ 手順をシンプルにやりたいだけなら:** **`docs/TELEGRAM_SCOUT_CEO_STEPS.md`**（やること2つだけ）を見る。

---

## 方針

- **量より質**: ハブ（Admin/KOL）と Active Member を狙い、最小DM数で最大のバイラル効果を得る。
- **出力のゴール**: デプロイ用リストは **`data/telegram-scout-targets.csv`**（抽出結果をそのまま利用）。

---

## 基幹フロー（2ステップ）

| # | ステップ | 役割 | ツール・成果物 |
|---|----------|------|----------------|
| **1. 探索** | 金脈（グループURL）の発掘 | CEO が Chrome/ディレクトリ/SNS で URL をピック → `data/seed_groups.txt` または `data/groups.txt`。発見のみなら `discover_groups.py` で `groups.txt` を生成。 |
| **2. 抽出** | メンバーリストのデータ化 | `run_pipeline.py` → `scrape_members.py`。成果物: **`data/telegram-scout-targets.json`** および **`data/telegram-scout-targets.csv`**。この CSV をデプロイに使う。 |

**3. 攻撃（デプロイ）** はリスト取得の外: 上記 CSV を手動または TeleSender 等で読み込み、属性別メッセージで DM 送信する。

---

## 参照

- **CEO 向け・やることだけ:** **`docs/TELEGRAM_SCOUT_CEO_STEPS.md`**
- 抽出の詳細・オプション: `scripts/telegram_scout/README_LIST_COLLECTION.md`
- ワークフロー全体・メッセージ取得: `docs/TELEGRAM_SCOUT_WORKFLOW.md`
