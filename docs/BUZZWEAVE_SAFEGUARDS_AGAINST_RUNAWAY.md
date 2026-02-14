# BuzzWeave 暴走防止ガード（リンク欠落・無関係投稿の寄生を防ぐ）

異常投稿（Vidalytics リンクなし・Trap Defence と無関係の引用元に寄生）を防ぐため、以下のガードを実装済みです。

---

## 1. リンクが絶対に落ちないようにする

### gpt5mini.js（generateXPost）

- **三重ガード**:
  1. 生成直後: `body` に `vidUrl` が無ければ末尾に付加。
  2. `ensureHashtagAndEmoji` → `trimToMax` のあと、**再度** `body` に `vidUrl` が含まれるか確認。含まれていなければ再度付加してから返す（`trimToMax` で文字数制限によりリンクが切れるケースを防止）。
  3. catch 時の fallback 本文も、`trimToMax` 後にリンクが含まれるか確認し、無ければ付加してから返す。

### buzzWeaveEngine.js（runBuzzWeaveCycle）

- **投稿前の必須チェック**:
  - `pickVidalyticsLink(slot.lang, slot.mode)` の戻り値が空・非文字列・または `"vidalytics"` を含まない場合は **投稿しない**（early return）。
  - `generateParasiticCopy` の戻り値 `body` が空、または **指定した `videoUrl` を 1 文字も含まない場合は投稿しない**（`ok: false`, `message: "Body missing Vidalytics link"`）。

これにより「generateXPost が呼ばれていない／別ルートの投稿」や「trim でリンクが消えた」状態でも、**リンクなしでは投稿されません**。

---

## 2. 候補の健全性チェック（無関係投稿に寄生しない）

### buzzWeaveEngine.js（runBuzzWeaveCycle）

- **投稿する候補**は、必ず `collectBuzzCandidates` → `pickBestBuzzCandidate` パイプライン由来であることにする。
- 投稿前に以下を必須とする:
  - `candidate.post.id` が存在する
  - `candidate.post.text` が存在する
  - `candidate.cluster` が `etf` / `price_surge` / `fud` / `regulation` / `meme` / `other` のいずれか（search 経由でクラスタ付与された候補だけ許可）
- 上記のいずれかが満たされない場合は **投稿しない**（`ok: false`, `message: "Invalid candidate: not from buzz pipeline"`）。

これにより「候補ゼロ → fallback で直近の引用元を使う」ような異常ルートや、**検索クエリに一致しない無関係アカウントへの寄生**が起きないようにしています。

---

## 3. 運用上の注意

- **Cron の一時停止**: 暴走を確実に止めたい場合は、Vercel の Cron から `/api/buzzweave-run` を外すか、`BUZZWEAVE_EMERGENCY_STOP=true` を設定する。
- **ロックテーブル**: minimal スキーマのままにすると run 自体がスキップされる（[BUZZWEAVE_LOCK_SCHEMA_FIX.md](./BUZZWEAVE_LOCK_SCHEMA_FIX.md) 参照）。
- **x_api_blocked**: 402 後は `x_api_blocked=true` で run 内でも X API を叩かない。解除は Token/クレジット対応後に `scripts/clear-buzzweave-x-api-blocked.js` を実行。

以上が、Copilot 会話ログで指摘された「リンクなし投稿」「無関係投稿への寄生」を防ぐための実装です。
