# 🔥 Cursor 指示書（完全版）  
# SECONDARY_TARGETS の重み付け（優先度）を導入する

**目的**: セカンダリーターゲットを「1日1回・先頭から順」ではなく、**頻度（weight）に応じて“ due ”な1件を選ぶ**ようにし、拡散力を最大化する。

**前提**:  
- 現状: フラットなリスト、今日まだ投稿していない先頭 1 件を選ぶ。  
- 変更後: ターゲットごとに **weight**（daily / 2d / 3d / weekly）を持たせ、**優先度順（daily → 2d → 3d → weekly）で「due なもの」を 1 件選ぶ**。

---

## 1. ゴール（実装後の状態）

- **イーロン（コア）** → 毎日（daily）  
- **AI クラスタ** → 2日に1回（2d）  
- **マーケット構造** → 3日に1回（3d）  
- **ミーム / テック哲学** → 週1（weekly）  

1 回の実行では、**due なターゲットのうち優先度の高いものから 1 件だけ**選び、投稿する。  
「今日すでに投稿したか」ではなく、**「最後に投稿した日から interval 日経っているか」**で due を判定する。

---

## 2. データモデル

### 2.1 config/secondaryTargets.js

**変更前**: `SECONDARY_TARGETS = ["elonmusk", ...]`（文字列の配列）

**変更後**: 各要素を `{ username, weight }` とする。

- **weight**: `"daily"` | `"2d"` | `"3d"` | `"weekly"`
  - `daily` … 毎日（interval = 1 日）
  - `2d` … 2日に1回（interval = 2 日）
  - `3d` … 3日に1回（interval = 3 日）
  - `weekly` … 週1回（interval = 7 日）

**優先度（選ぶ順）**: daily → 2d → 3d → weekly。同一 weight 内では配列の先頭から。

**後方互換**: 既存の「フラットな文字列配列」を読むコードがある場合は、`typeof item === "string"` なら `{ username: item, weight: "daily" }` として扱う。

### 2.2 KV のキー設計

- **キー**: `secondary:lastPosted:{username}`  
- **値**: 最後に投稿した日（UTC）の文字列 `YYYY-MM-DD`  
- **TTL**: 任意（例: 30 日）。無くても可。

「今日投稿したか」のキー（`secondary:posted:{username}:{dateString}`）は、**lastPosted に統一**するか、lastPosted のみで due 判定し、posted は廃止してよい。

---

## 3. 実装タスク

### 3.1 config/secondaryTargets.js の変更

- `SECONDARY_TARGETS` を **`{ username, weight }[]`** に変更する。
- コア（elonmusk, tesla, spacex, xai）→ `weight: "daily"`  
- AI クラスタ → `weight: "2d"`  
- マーケット構造 → `weight: "3d"`  
- ミーム・テック哲学 → `weight: "weekly"`  
- **ヘルパー**: `getTargetsByWeight(weight)` や `getAllTargets()`（フラットな username 配列を返す）があると、既存の「先頭から順」ロジックを書き換えやすい。

### 3.2 services/x/secondaryRotation.js の変更

- **getLastPosted(username)**  
  - `kv.get("secondary:lastPosted:" + username)` を返す。無ければ `null`。
- **markPosted(username, dateString)**  
  - `kv.set("secondary:lastPosted:" + username, dateString, { ex: 30 * 24 * 60 * 60 })` で「最後に投稿した日」を更新する。  
  - 必要なら従来の `secondary:posted:{username}:{dateString}` は呼ばない（または削除）。
- **isDue(lastPostedDateString, weight, todayDateString)**  
  - `lastPosted` が null なら `true`（まだ一度も投稿していない）。  
  - 否則、`lastPosted` と `todayDateString` を日付として比較し、  
    - daily: 1 日以上経過  
    - 2d: 2 日以上経過  
    - 3d: 3 日以上経過  
    - weekly: 7 日以上経過  
  なら `true`。
- **pickSecondaryTarget(dateString)**  
  - 優先度順に weight を見る（daily → 2d → 3d → weekly）。  
  - 各 weight について、その weight のターゲット一覧を取得し、**due なもの**を先頭から 1 件探す。  
  - 最初に見つかった due な username を返す。  
  - どの weight にも due がなければ `null`。

日付の差分は、`new Date(dateString)` 同士の引き算で「日」に直して比較すればよい（UTC で揃える）。

### 3.3 api/x-quote-repost.js

- **変更なし**でよい。  
- `pickSecondaryTarget(dateString)` が「due な 1 件」を返すようになるだけ。  
- `markPosted(secondary, dateString)` で「最後に投稿した日」が更新される。

---

## 4. 完了条件

- [ ] `SECONDARY_TARGETS` が `{ username, weight }[]` になっている。  
- [ ] `pickSecondaryTarget(dateString)` が、優先度（daily → 2d → 3d → weekly）で due な 1 件を返す。  
- [ ] `markPosted(username, dateString)` が `secondary:lastPosted:{username}` を更新する。  
- [ ] 既存の「EN のときだけセカンダリーを 1 件投稿」の流れはそのまま動く。  
- [ ] （任意）後方互換のため、`SECONDARY_TARGETS` が文字列配列の場合は `weight: "daily"` として扱う。

---

## 5. まとめ

- 重み付けにより、**イーロンは毎日、AI は 2 日ごと、マーケットは 3 日ごと、ミーム・哲学は週 1** で確実に回る。  
- Trap Defence OS の「セカンダリー 1 日 1 回」が、**クラスタ別の最適な頻度**に進化する。

この指示書を Cursor に渡し、「3.1 から順に実装してほしい」と指定すれば、重み付けが実装できる。
