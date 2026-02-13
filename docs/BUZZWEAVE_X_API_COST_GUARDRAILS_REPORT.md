# Trap Defence / BuzzWeave Engine — X API コストガードレール実装レポート

**作成日**: 2026-02-13  
**対象**: コードベースに存在する X API コスト抑制・暴走防止の実装の洗い出し

---

## 1. 全体フロー図（X API read/write とガードレールの位置）

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  Vercel Cron: GET /api/buzzweave-run  （毎分 * * * * *）                         │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    ▼                   ▼                   ▼
            【ガード1】          【ガード2】          【ガード3】
            BUZZWEAVE_          getBuzzweaveStatus   acquireBuzzweaveLock
            EMERGENCY_STOP       → x_api_blocked      → 多重実行防止
            → 即 return          → 即 return          → 取れなければ return
                    │                   │                   │
                    └───────────────────┴───────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  runBuzzWeaveCycle({ dryRun, langFilter })  （services/td/buzzWeaveEngine.js）   │
│  - cleanupOldSlots(48h)                                                         │
│  - getTdPostSlotsInNextHour(langFilter)  ← Supabase（X API ではない）             │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                    【ガード4】 スロット 0 件なら即 return（search も write も行わない）
                                        │
                                        ▼
            slot = slots[0]  （1サイクルで 1 スロットのみ使用）
                                        │
                    【ガード5】 deadline 超過なら即 return（BUZZWEAVE_DEADLINE_MS, デフォルト 55 秒）
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  collectBuzzCandidates({ slotLang, startMs, deadlineMs, classifyTopN })          │
│  - isDeadlineExceeded で各ステップ前チェック → 超過時は早期 return                │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  fetchCandidatesFromSearch(slotLang)  ← ここで X API read が 1 回だけ発生         │
│  - searchPostsRecent(query, { maxResults: 50, startTime, endTime, sortOrder })   │
│  - エンドポイント: GET /2/tweets/search/recent                                  │
│  - 402 検知時: fatal402: true を返し、再試行なし                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                    【ガード6】 fatal402 → upsertBuzzweaveStatus402() → 次回以降 getBuzzweaveStatus でブロック
                                        │
                                        ▼
            getQuotedTweetIdsInLast30Days(posts)  ← Supabase（X API ではない）
            候補フィルタ・クラスタリング・GPT 分類（classifyTopN=10 まで、deadline 都度チェック）
                                        │
                    候補 0 件なら return（投稿なし）
                                        │
                                        ▼
            pickBestBuzzCandidate → generateParasiticCopy（GPT）→ postQuoteTweet(body, quoteTweetId)
                                        │
                    【X API write】 1 回のみ（dryRun でなければ）
                    - エンドポイント: POST /2/tweets（quote_tweet_id 付き）
                    - xApiRequest 経由 → リトライ・429 時は指数バックオフ
                                        │
                                        ▼
            insertQuotedTweets / consumeTdPostSlot / insertXPost 等（Supabase）
```

**X API 呼び出しの発生箇所（1サイクルあたり）**

| 種類 | 発生箇所 | 回数/サイクル | 備考 |
|------|----------|----------------|------|
| **Read** | `searchPostsRecent`（fetchCandidatesFromSearch 内） | **1 回** | 1 クエリ・maxResults=50・1 言語のみ |
| **Read** | getUserByUsername / getUserTweets | **0 回** | runBuzzWeaveCycle の主経路では未使用（fetchRecentPostsFromX は別用途で定義のみ） |
| **Write** | `postQuoteTweet` | **0 または 1 回** | dryRun でなければ 1 投稿 |

---

## 2. search 系ガードレール

### 2.1 どの関数がどのエンドポイントを叩いているか

| 関数（client.js） | エンドポイント | 呼び出し元（BuzzWeave 経路） |
|-------------------|----------------|------------------------------|
| `searchPostsRecent(query, options)` | `GET /2/tweets/search/recent` | `fetchCandidatesFromSearch`（buzzWeaveEngine.js）のみ |

- **searchTweets**（client.js）: BuzzWeave からは呼ばれていない。
- **getUserByUsername** / **getUserTweets**: `fetchRecentPostsFromX` から呼ばれるが、`runBuzzWeaveCycle` → `collectBuzzCandidates` の流れでは **一度も呼ばれていない**（collectBuzzCandidates は fetchCandidatesFromSearch のみ使用）。

### 2.2 1サイクルあたり・1分あたり・1時間あたりの想定最大リクエスト数

**実装に基づく数値:**

- **1 サイクルあたり**
  - Search: **1 回**（`fetchCandidatesFromSearch` 内で `searchPostsRecent` を 1 回だけ呼ぶ）
  - ページネーション・ループでの追加 search はなし
- **1 分あたり**
  - Cron が毎分 1 回発火。`acquireBuzzweaveLock` で排他されるため、同時刻に複数 run は走らない。
  - 想定最大: **search 1 回/分**（ロック取得できた場合のみ）
- **1 時間あたり**
  - 想定最大: **search 最大 60 回/時**（毎分 1 回 run が成功した場合の理論上限）
  - 実際は「次 1 時間のスロット」が空の分は早期 return するため、search は発生しない。

**該当コード（抜粋）**

```javascript
// services/td/buzzWeaveEngine.js 行 539-542
const searchResult = await fetchCandidatesFromSearch(slotLang, {
  maxResults: 50,
  sortOrder: "recency",
  windowMinutes: SEARCH_WINDOW_MINUTES
});
// ↑ 1 サイクルでここが 1 回だけ。ループなし。
```

```javascript
// services/td/buzzWeaveEngine.js 行 421-501（fetchCandidatesFromSearch）
const res = await searchPostsRecent(query, {
  maxResults: options.maxResults || 50,
  startTime: startTime.toISOString(),
  endTime: endTime.toISOString(),
  sortOrder: options.sortOrder || "recency"
});
return { data: Array.isArray(res?.data) ? res.data : [], ... };
// 402 時は catch で fatal402: true を返し、再試行しない
```

### 2.3 「search 暴走」を防ぐ条件分岐・早期 return・スキップ

| 条件 | 場所 | 挙動 |
|------|------|------|
| スロットが 0 件 | `runBuzzWeaveCycle`（685-689 行付近） | `getTdPostSlotsInNextHour` が空なら **search を呼ばずに** `return { ok: true, message: "No slots in next hour", posted: 0 }` |
| deadline 超過（サイクル開始直後） | `runBuzzWeaveCycle`（692-705 行） | `collectBuzzCandidates` を呼ばず return |
| deadline 超過（search 前） | `collectBuzzCandidates`（532-535 行） | `fetchCandidatesFromSearch` を呼ばず `return { ..., deadlineExceeded: true }` |
| 402 応答 | `fetchCandidatesFromSearch` の catch（454-458 行） | `fatal402: true` を返す。**再試行はしない**。呼び出し元で `upsertBuzzweaveStatus402()` し、次回以降エントリでブロック |
| その他エラー | `fetchCandidatesFromSearch` の catch（459-461 行） | 空の `data` を返すだけ。**リトライはしない**（search の連打にはならない） |

- 「スロットが一定数未満なら search を打たない」: **実装あり**。スロット 0 のときは search 自体を実行しない。
- 「すでに十分な候補がある場合は search を抑制」: **未実装**。毎回 1 回だけ search を実行する設計で、候補数に応じた search スキップはない。

---

## 3. read スパイク防止ロジック

### 3.1 実装されているもの

| 内容 | 実装箇所 | 条件・閾値・挙動 |
|------|----------|------------------|
| **1 run あたり 1 スロットのみ** | `runBuzzWeaveCycle`（686 行 `slot = slots[0]`） | 次 1 時間分のスロットを取得するが、**先頭 1 件だけ**使用。同じ run 内で複数 search / 複数 post はしない |
| **スロット 0 なら read しない** | 上記 685-689 行 | search を一度も呼ばず return |
| **deadline による打ち切り** | `BUZZWEAVE_DEADLINE_MS`（デフォルト 55 秒）、`isDeadlineExceeded` | サイクル開始から 55 秒を超えたら各ステップ前で早期 return。search 後・GPT 分類中・投稿前のいずれでも打ち切り可 |
| **多重実行の排他** | `acquireBuzzweaveLock`（buzzweave-run.js 41-44 行） | 同一ロック名で 1 本のみ実行。TTL 10 分（`LOCK_TTL_MINUTES = 10`）。取れなければ「Locked」で return し、search も post も行わない |
| **402 後の run 停止** | `getBuzzweaveStatus().x_api_blocked`（buzzweave-run.js 36-39 行） | 402 検知時に `upsertBuzzweaveStatus402()` でフラグを立て、以降の run は「X API blocked」で即 return（search なし） |

### 3.2 実装されていないもの（コードベースに基づく）

- **「直近 N 分間の実行回数・read 回数を見てスキップする」**: **未実装**。N 分間の実行回数や read 回数を集計して run をスキップするロジックはない。
- **「スロットが一定数未満なら search を打たない」の「一定数」**: スロット **0 件** のときのみ search を打たない。「1 件以上あれば 1 回 search」であり、「例: スロット 5 件未満なら search しない」のような閾値はない。
- **「候補が十分ある場合は search を抑制」**: **未実装**。キャッシュや前回候補の再利用はなく、run のたびに 1 回 search する。

### 3.3 定数・環境変数（search/read 関連）

| 名前 | デフォルト | 利用箇所 |
|------|------------|----------|
| `BUZZWEAVE_DEADLINE_MS` | 55000 | 1 run の最大実行時間（ミリ秒）。超過で search 後や GPT 後でも打ち切り |
| `BUZZWEAVE_SEARCH_WINDOW_MIN` | 5 | 検索対象の「直何分」か（分）。startTime/endTime の幅 |
| `SEARCH_WINDOW_MINUTES` | 上記と同一 | fetchCandidatesFromSearch の windowMinutes |
| `maxResults` | 50 | search/recent の 1 リクエストあたり最大件数（10〜100 の範囲で 50） |
| `BUZZWEAVE_GPT_CLASSIFY_TOP_N` | 10 | GPT で分類する候補数の上限（read スパイクではなく GPT 呼び出し数の抑制） |
| `BUZZWEAVE_MAX_TARGETS` | 12 | **定義のみで runBuzzWeaveCycle 内では未使用**（コード上は未参照） |
| `BUZZWEAVE_ENOUGH_CANDIDATES` | 24 | **定義のみで runBuzzWeaveCycle 内では未使用**（コード上は未参照） |

---

## 4. エラー・レートリミット・例外時の挙動

### 4.1 search（searchPostsRecent）

- **Bearer 利用時**（`X_API_BEARER_TOKEN` あり）  
  - `fetch(url, { headers: Authorization: Bearer ... })` の 1 回のみ。  
  - `!res.ok` なら `throw new Error(...)`。**リトライなし**。  
  - 429 が返ってもそのまま throw され、`fetchCandidatesFromSearch` の catch に入り `{ data: [], ... }` を返す（fatal402 にはしない）。  
  - つまり **429 時は「候補 0 件」として 1 run が終了し、search の再試行はしない**（連打にはならない）。

- **OAuth 利用時**（Bearer なしで xApiRequest にフォールバック）  
  - `xApiRequest` のリトライ・429 処理の対象になる（後述）。

### 4.2 xApiRequest（OAuth 経路・postQuoteTweet 等）

- **リトライ対象**: 429, 500, 502, 503, 504（227 行付近 `retryableStatuses`）。  
  - さらに catch では AbortError / ECONNRESET / ETIMEDOUT / network / timeout もリトライ対象。
- **最大リトライ回数**: デフォルト 3（attempt 0〜3 で最大 4 回まで）。
- **429 時**  
  - `recordRateLimit` で KV に記録。  
  - `x-rate-limit-reset` があれば、その時刻まで待機（最大 5 分）。  
  - なければ指数バックオフ 1s, 2s, 4s。  
  - リトライ後に再度 429 ならさらに待機またはバックオフ。
- **5xx 時**  
  - `retry-after` があればその秒数待機。  
  - なければ指数バックオフ。  
- **402**  
  - `retryableStatuses` に 402 は含まれていないため、**リトライせず**即 throw。  
  - search 経路では `fetchCandidatesFromSearch` が 402 を検知して `fatal402: true` を返し、run 全体を打ち切り、`upsertBuzzweaveStatus402()` でブロック状態にする。

### 4.3 「エラー時に逆にリクエストが増える」かどうか

- **search**: 1 run あたり 1 回のみ呼び、失敗してもリトライしない（Bearer 経路）または xApiRequest に任せる（OAuth 経路）。**エラーで search が増えたり連打したりする実装はない**。
- **postQuoteTweet**: xApiRequest 経由で最大 4 回（初回+3 リトライ）。429/5xx で待機してから再試行するため、短時間の「無制限リトライ」にはなっていない。  
- **402 時**: リトライしない + 次回以降 run ごとブロックするため、402 でリクエストが増える設計にはなっていない。

**結論**: コード上、「エラー時に逆にリクエストが増える」ようなループや無制限リトライはない。

---

## 5. OS レベルの「コスト上限」的な考え方の有無

### 5.1 実装されている上限（スロット・時間で間接的に効くもの）

| 概念 | 実装 | 値・備考 |
|------|------|----------|
| **1 日あたりの投稿枠** | 日次スロット数 | `DAILY_SLOT_COUNT = 400`（JST 時間帯分布で 400 枠/日）。`generateDailySlots` で 1 日 400 件まで。実際の投稿数は「消費されたスロット数」で上限される |
| **1 run あたりの実行時間** | deadline | `BUZZWEAVE_DEADLINE_MS`（デフォルト 55 秒）で run 全体を打ち切り |
| **1 run あたりの search 回数** | 固定 1 回 | ループなしで `fetchCandidatesFromSearch` が 1 回のみ |
| **1 run あたりの write 回数** | 1 スロット = 最大 1 投稿 | `slot = slots[0]` のみ使用し、成功時に `consumeTdPostSlot(slot.id)` で 1 件消費 |

### 5.2 BuzzWeave 経路で使われていない上限

- **X_MAX_DAILY_POSTS / X_MAX_HOURLY_POSTS**: `services/x/optimization.js` の `getDailyPostCount` / `getMonthlyPostCount` 等で参照されるが、**buzzWeaveEngine.js や buzzweave-run.js からは一切参照されていない**。  
  → BuzzWeave 単体OS では「1 日/1 時間の X 投稿数」の明示的な上限チェックは **未使用**。
- **BUZZWEAVE_MAX_TARGETS / BUZZWEAVE_ENOUGH_CANDIDATES**: 定数として定義されているが、**runBuzzWeaveCycle や collectBuzzCandidates 内で参照されていない**（未使用）。

### 5.3 結論

- **OS レベルで明示的な「read/write の絶対上限値」や「コスト上限」を定数で持ち、それに基づいて run を止める実装はない。**
- 実質的な上限は次のとおり。
  - **投稿**: 日次スロット 400 枠 + 1 run あたり 1 スロットのみ使用。
  - **read（search）**: 1 run あたり 1 回 + Cron 毎分 1 回 + ロックで排他 → 最大 60 回/時程度。
- よって、「現状は OS レベルのコスト上限（例: 1 日 read 上限 N 回）は **未定義**。スロット数と 1 run 1 search の構造で間接的に抑制している」と整理できる。

---

## 6. 現状評価とリスク（通常運転 / 暴走時）

### 6.1 通常運転時にコストを抑制できる設計か

- **できる要素**
  - 1 run = 1 search + 最大 1 post。ループでの search 連打や複数 post はない。
  - スロット 0 なら search も post も行わない。
  - 多重実行ロック（TTL 10 分）で同時 run が 1 本に制限される。
  - 402 で即停止し、次回以降は `x_api_blocked` で run ごとブロック。
  - deadline 55 秒で run が伸びすぎない。
  - 日次 400 枠のスロットで投稿数が上から抑えられる。
- **想定レート**
  - search: 最大 60 回/時（毎分 1 run かつ毎回 search した場合）。
  - write: 最大 400 回/日（スロット数）、かつ 1 run 1 投稿のため 1 分あたり最大 1 回程度。

→ 通常運転では、「1 run 1 search・1 スロット 1 post・ロック・402 ブロック・deadline」により、**過剰な read/write は起きにくい設計**になっている。

### 6.2 暴走時にどこまで被害が広がりうるか（数十分で $10 飛ぶケースを前提に）

- **想定暴走シナリオ**
  - Cron が毎分確実に 1 回 run を起動し、ロックも毎回取れる場合: search 60 回/時。  
    Search API の課金レートが高いプランでも、**「search が無制限に倍増する」ようなループはコードにない**ため、数十分で search が数百回を超えるような増え方はしない。
  - 想定しうるのは「Cron の誤設定で 1 分に複数回 buzzweave-run が叩かれる」ケース。  
    その場合でも **ロックで 1 本しか実行されない**ため、search は「1 分あたり 1 回」のまま。  
    ただし、**ロック取得に失敗した run は 200 で即 return するだけ**で、search はしない。  
    したがって「Cron が 10 本来ても search は 1 本ぶん」に抑えられる。
- **本当に危ないケース**
  - **ロックが取れない／ロックが無効**（例: Supabase 不調で常に `acquireBuzzweaveLock` が true を返してしまう、またはロックテーブルを使わない別経路で run が実行される）場合、複数 run が並列し、**1 分あたりの search が run 数分になる**可能性はある。  
    現行コードでは「buzzweave-run の入口」は 1 つかつ、ロックはその入口でしか使っていないため、**同一プロジェクト内でロックをバイパスする別 API がなければ、暴走の主因はロック障害か Cron の多重起動**に限られる。
  - **402 を無視して run を続行する**ような改悪をすると、クレジット切れ後も search が続く可能性がある。現状は 402 で run 打ち切り + ブロックフラグで抑止されている。

→ 現状の実装のままなら、「数十分で $10 飛ぶ」ほどの search 暴走は起きにくい。ただし **ロックが実質無効になった場合**は、Cron の呼び出し回数に比例して search が増える余地がある。

### 6.3 設計思想はあるが実装が不十分な点（ファイル・関数レベル）

| 内容 | 場所 | 指摘 |
|------|------|------|
| **BUZZWEAVE_MAX_TARGETS / BUZZWEAVE_ENOUGH_CANDIDATES** | `services/td/buzzWeaveEngine.js`（51, 53 行） | 定数が定義されているが **どこからも参照されていない**。候補数やターゲット数の上限として効いていない。 |
| **search の Bearer 経路で 429 時リトライなし** | `services/x/client.js` の `searchPostsRecent`（Bearer 分岐、644-679 行付近） | 429 で即 throw し、`fetchCandidatesFromSearch` では「候補 0」で終わる。リトライはしないので連打にはならないが、**429 時だけ即諦める**設計。必要なら「1 回だけバックオフしてリトライ」を検討できる。 |
| **X_MAX_DAILY_POSTS / X_MAX_HOURLY_POSTS を BuzzWeave で未使用** | `services/x/optimization.js` | 日次・時間あたりの投稿数上限は optimization にはあるが、**buzzWeaveEngine や buzzweave-run からは参照されていない**。スロット 400 枠で間接的に効いているだけで、OS として「絶対に N 回/日を超えない」という二重の縛りはない。 |
| **x_api_blocked の解除** | `utils/supabase.js` の `getBuzzweaveStatus` / `upsertBuzzweaveStatus402` | 402 でブロックを入れる実装はあるが、**ブロックを解除する API や Cron はコード上見当たらない**。解除は手動（DB 更新等）を想定している可能性が高い。 |

---

## 7. まとめ表

| 観点 | 実装状況 | 備考 |
|------|----------|------|
| 1 run あたり search 回数 | ✅ 1 回に固定 | ループ・ページネーションなし |
| スロット 0 で search スキップ | ✅ あり | run 入口で return |
| 多重実行防止 | ✅ あり | buzzweave_locks、TTL 10 分 |
| 402 検知で run 停止・次回以降ブロック | ✅ あり | fatal402 → upsertBuzzweaveStatus402 / getBuzzweaveStatus |
| deadline で run 打ち切り | ✅ あり | デフォルト 55 秒 |
| 1 日/1 時間の read 上限（明示） | ❌ 未定義 | スロットと 1 run 1 search で間接的に抑制 |
| 1 日/1 時間の write 上限（明示） | ❌ BuzzWeave では未使用 | スロット 400 枠で間接的に抑制。X_MAX_* は未参照 |
| 429 時 search リトライ | Bearer: なし / OAuth: あり | Bearer は 1 回で諦め。連打にはならない |
| エラー時のリクエスト増加 | ✅ なし | リトライは上限あり・402 はリトライ対象外 |

---

*以上、コードベースに基づく X API コストガードレールの洗い出しレポート（2026-02-13）*
