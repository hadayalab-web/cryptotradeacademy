# BuzzWeave Engine — X API 暴走以外の潜在リスク

X API が暴走しなければ正常に動く前提で、他にあり得る潜在リスクを一覧化したものです。

---

## 1. 投稿成功後の DB 失敗（重複引用・スロット再利用）

**内容**: `postQuoteTweet` が成功したあと、`insertBuzzweavePostLog` / `insertQuotedTweets` / `consumeTdPostSlot` のいずれかが失敗すると、**X には投稿済みなのに** 30日重複防止（quoted_tweets）やスロット消費が反映されない。

**結果**:
- `insertQuotedTweets` が走る前に throw → 同じ引用元を 30 日以内に再度引用する可能性
- `consumeTdPostSlot` が走る前に throw → 同じスロットが再度使われる可能性

**対策**: 投稿成功後は「重複防止」と「スロット消費」を最優先で実行するよう処理順を変更済み（`insertQuotedTweets` → `consumeTdPostSlot` をログ系より先に実行）。ログ・アーカイブ系が失敗しても、重複防止とスロット消費は試行される。

---

## 2. スロットの日時: カラム名と実体のズレ

**内容**: `td_post_slots.datetime_jst` という名前だが、実体は **UTC**（`slotDate.toISOString()` で保存）。  
`getTdPostSlotsInNextHour` は `now.toISOString()`（サーバー時刻＝Vercel では UTC）で比較しているため、**Vercel 上では** 挙動は一致している。

**リスク**: サーバーを JST にした場合や、誰かが「datetime_jst だから JST で解釈する」と勘違いして触ると、スロットの「次1時間」がずれる。

**対策**: 運用では Vercel（UTC）のままにし、`datetime_jst` は「JST 時刻を UTC に変換して格納している」とドキュメントで明記する。必要ならカラム名を `scheduled_at_utc` などにリネームするマイグレーションを検討。

---

## 3. 日次スロット投入の失敗が分かりにくい

**内容**: `api/buzzweave-slots` で `insertTdPostSlots(slots)` が失敗（`result.ok === false`）でも、戻り値は `{ ok: false, count: slots.length, targetDailySlots: 400 }` のため、**count は 400 のまま**。実際には 0 件しか入っていないのに「400 枠入れた」と誤認しうる。

**対策**: `generateDailySlots` の戻り値を修正済み。`insertTdPostSlots` が失敗（`ok: false`）のときは **count: 0** を返すため、「0 件しか入っていないのに 400 と返る」ことはない。Vercel の Cron ログで `ok: false` を監視するとよい。

---

## 4. Vercel の実行制限（60 秒）

**内容**: `buzzweave-run` の `maxDuration` は 60 秒。  
`runBuzzWeaveCycle` が 60 秒を超えると Vercel がプロセスを落とす。その時点で `postQuoteTweet` まで完了していても、その後の `insertQuotedTweets` / `consumeTdPostSlot` が実行されない可能性がある。

**結果**: 上記「1. 投稿成功後の DB 失敗」と同様に、重複引用・スロット再利用の可能性。

**対策**: 処理順の見直し（重複防止・スロット消費を先に実行）でリスクを低減。さらに、GPT 分類や search の遅延が重なった場合は deadline（BUZZWEAVE_DEADLINE_MS）で早めに return するため、通常は 60 秒以内に収まる想定。

---

## 5. OpenAI / Supabase / KV の不調

**内容**:
- **OpenAI**: `classifyPostWithGpt4o` や `generateXPost` が失敗・タイムアウトすると、分類はデフォルト値、本文は fallback 文になる。リンクは fallback にも含める実装のため、**リンク欠落にはならない**。
- **Supabase**: `getTdPostSlotsInNextHour` が失敗すると `[]` が返り、run は「スロットなし」で終了（投稿しない）。接続障害時は 503 やロック取得失敗で run がスキップされる。
- **KV**: btcSnapshot 取得失敗時は buzzweave-run が `SKIP_NO_SNAPSHOT` で return するため、X API は叩かず、投稿もしない。

**対策**: 現状の early return と fallback で、外部障害時は「投稿しない」か「fallback で投稿」に寄る設計。必要なら Health Check で Supabase / KV の疎通を監視する。

---

## 6. generateDailySlots の insert 失敗

**内容**: `generateDailySlots` 内で `insertTdPostSlots(slots)` が失敗すると、その日は **スロット 0 件** のまま。次の run では常に「次1時間にスロットなし」となり、投稿は発生しない。Cron の戻りが `ok: false` であることに気づかないと、原因が分かりにくい。

**対策**: 上記「3」と同様、`ok: false` のときは `count: 0` を返すか、実際の insert 結果を返す。Cron ログで 200 かつ `ok: false` を検知できるようにする。

---

## 7. その他（低リスク）

- **ロック TTL 60 秒**: 異常終了時も 60 秒でロックが外れ、次の run で再取得できる。長時間ブロックは起きにくい。
- **dryRun のデフォルト**: `runBuzzWeaveCycle` の `dryRun` は **デフォルト true**。`api/buzzweave-run.js` はクエリで `dry_run=true` が無い限り `dryRun: false` を渡す実装になっているため、本番では投稿される。誤って dryRun で回し続けないよう、Cron のパラメータを確認する。
- **BUZZWEAVE_ACTIVE_HOURS_JST**: 空文字や不正値で `new Set(hours)` が空になると `BUZZWEAVE_ACTIVE_HOURS_JST` が `null` になり、従来どおり全時間帯でスロットが生成される。意図しない「全時間帯」になる可能性はあるが、暴走には直結しない。

---

## まとめ

| リスク | 影響 | 対策状況 |
|--------|------|----------|
| 投稿成功後の DB 失敗 | 重複引用・スロット再利用 | 処理順変更（重複防止・スロット消費を優先） |
| datetime_jst の実体が UTC | タイムゾーン誤解・将来のバグ | ドキュメントで明記。必要ならカラム名変更 |
| スロット insert 失敗の見え方 | 0 件なのに 400 と誤認 | 修正済み（ok: false 時は count: 0） |
| 60 秒タイムアウト | 投稿後に DB 更新されない | 処理順で重複防止・スロット消費を先行 |
| 外部サービス障害 | 投稿スキップ or fallback 投稿 | 現状の early return / fallback で許容。監視は推奨 |

上記のうち、**「1. 投稿成功後の DB 失敗」** については、処理順の変更をコードに反映する。
