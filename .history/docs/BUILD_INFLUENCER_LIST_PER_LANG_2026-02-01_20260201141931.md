# 一言語ずつインフルエンサーリストを完成させる

**作成日**: 2026-02-01

---

## 1. 方針

- **一言語ずつ**リストを完成させていく。
- **Grok + Gemini 併用**で username 候補を取得し、**X API で品質チェック**してから **シード JSON に追記**。
- シードが溜まったら **KV へ反映**（`rebuild-influencer-list-from-seed.js`）。

---

## 2. 実行手順

### 2.1 1言語を構築（1回の実行）

```bash
node scripts/build-influencer-list-per-lang.js --lang <言語コード>
```

オプション:

- `--batch N` … Gemini と Grok からそれぞれ N 件ずつ取得（デフォルト 25）。最大 50。

例:

```bash
node scripts/build-influencer-list-per-lang.js --lang en
node scripts/build-influencer-list-per-lang.js --lang es --batch 30
```

流れ:

1. Gemini から指定言語の crypto/BTC インフルエンサー username を N 件取得
2. Grok から同様に N 件取得
3. マージ・重複除去し、既にシードにある username を除外
4. 各 username を X API で検証（user 存在 → 直近ツイート取得 → 1件目を tweetId として採用）
5. 通過分を `data/influencers-seed/influencers-{lang}.json` に追記（既存とマージ・重複なし）

### 2.2 同じ言語を複数回実行して目標数まで増やす

1回の実行で追加される件数は、候補数・X API 通過率に依存する。目標数に達していなければ、**同じ `--lang` で再度実行**する（既存シードはそのまま、新規候補だけ追加される）。

例（en を 200 件目標にする場合）:

```bash
node scripts/build-influencer-list-per-lang.js --lang en --batch 30
# 追加されたら再度
node scripts/build-influencer-list-per-lang.js --lang en --batch 30
# 必要なら繰り返し
```

### 2.3 シードを KV に反映

その言語のシードを KV に保存する:

```bash
node scripts/rebuild-influencer-list-from-seed.js --lang <言語コード>
```

全言語を一括で KV に反映する場合:

```bash
node scripts/rebuild-influencer-list-from-seed.js --all
```

---

## 3. 言語コードと初回ストック目標

| 言語コード | 言語                | 初回ストック目標 |
| ---------- | ------------------- | ---------------- |
| en         | English             | 200              |
| pt-br      | Portuguese (Brazil) | 120              |
| ko         | Korean              | 100              |
| es         | Spanish             | 80               |
| ja         | Japanese            | 80               |
| ar         | Arabic              | 40               |
| **合計**   |                     | **620**          |

参照: `docs/INITIAL_STOCK_PLAN_QUOTE_REPOST_2026-02-01.md`

---

## 4. 推奨実行順（一言語ずつ完成させる場合）

1. **en** … 需要・候補とも最多。まず en を完成させてから他言語へ。
2. **pt-br**, **ko** … 暗号採用が強い市場。
3. **es**, **ja**
4. **ar** … 候補が少なめなので目標 40 で調整。

各言語で目標数に達したら `rebuild-influencer-list-from-seed.js --lang <lang>` で KV に反映し、次の言語へ進める。

---

## 5. 参照

- スクリプト: `scripts/build-influencer-list-per-lang.js`
- シード形式・KV 反映: `data/influencers-seed/README.md`, `scripts/rebuild-influencer-list-from-seed.js`
- 戦略完成・最後のピース: `docs/STRATEGY_COMPLETION_FINAL_PIECE_2026-02-01.md`
