# アフィリエイトリクルート「リストが取れない」・X API コスト浪費 精査（コード根拠）

コード上の根拠のみに基づく整理。推測は「要確認」と明記。

---

## 1. 「リストが全然取れない」要因（コード上の事実）

### 1.1 取得ページ数が 1 で固定されている

- **affiliate-recruit-run（リスト補充）**  
  - `config/affiliateRecruitConfig.js`: `EN_QUEUE_LIST_PAGES = 1`, `REGION_QUEUE_LIST_PAGES = 1`（env で上書き可）  
  - `api/affiliate-recruit-run.js`: `maxRounds = cfg.listPages` で `fetchOneSearchPage` をループ（969–1010 行付近）  
  - **結果**: 1 run あたり **1 言語につき最大 1 ページ（最大 100 件）** までしか検索しない。  
  - 増やしたい場合: `EN_RECRUIT_LIST_PAGES` / `REGION_RECRUIT_LIST_PAGES` を 2 以上に設定。

- **affiliate-recruit-bookmark**  
  - `api/affiliate-recruit-bookmark.js`: 言語ループ内で `fetchOneSearchPage(lang, { nextToken: undefined })` を **1 回だけ** 呼ぶ（88–93 行）。nextToken ループなし。  
  - **結果**: 1 言語あたり **常に 1 ページ（最大 100 件）**。  
  - 仕様上「1 run あたり 1 ページ」のため、リストを増やしたい場合は Cron 頻度か検索窓の調整が必要。

### 1.2 検索窓（時間幅）

- **affiliate-recruit-run**  
  - EN: `EN_SEARCH_WINDOW_MINUTES`（既定 90 分）  
  - 地域: `REGION_SEARCH_WINDOW_MINUTES`（既定 1440 分）  
  - `config/affiliateRecruitConfig.js` 213–215 行、`api/affiliate-recruit-run.js` 877 行で `windowMinutes` に渡している。

- **affiliate-recruit-bookmark**  
  - 同じく EN 90 分・地域 1440 分（`getWindowMinutes(lang)` → 40 行付近）。

- **affiliateRecruitSearch のデフォルト**  
  - `services/td/affiliateRecruitSearch.js` 192 行: `SEARCH_WINDOW_MINUTES = 30`（`BUZZWEAVE_SEARCH_WINDOW_MIN` 未設定時）。  
  - run/bookmark は **呼び出し側で `windowMinutes` を渡している**ため、上記 90/1440 が使われる（384 行 `options.windowMinutes ?? SEARCH_WINDOW_MINUTES`）。

### 1.3 検索クエリが厳しい

- `services/td/affiliateRecruitSearch.js`:  
  - `buildSearchQueriesSingle` で **必須 2 グループ（group1 OR/AND group2）＋ネガティブ語＋lang/-is:retweet/-is:reply**（256–326 行）。  
  - ヒットが少ないときだけ `LOW_HIT_FALLBACK_THRESHOLD`（既定 2 件以下）で 2 本目クエリを 1 回実行（414–421 行）。  
- クエリを緩めたい場合は `AFFILIATE_RECRUIT_REQUIRED_GROUP_OPERATOR` やネガティブ語リストの見直しが必要（要設定/コード変更）。

### 1.4 フォロワー数フィルタで落ちる

- **affiliate-recruit-bookmark**  
  - `filterByMinFollowers(posts, usersById, minFollowers)`（44–50 行）。  
  - `minFollowers` は `AFFILIATE_RECRUIT_MIN_FOLLOWERS`（既定 100）。  
- 検索で 100 件取れても、100 人以上フォロワーがいる著者だけ残すため、**credible が 0 になる**ことはあり得る。

### 1.5 402 で即終了する

- 検索が 402 を返すと `fatal402` で即終了し、リストは空になる。  
- `services/td/affiliateRecruitSearch.js` 457–458 行、`api/affiliate-recruit-run.js` 975/1042 行、`api/affiliate-recruit-bookmark.js` 94 行。

---

## 2. X API コスト浪費の有無（コード確認結果）

### 2.1 修正済み・対策済み

| 項目 | 根拠 |
|------|------|
| 402 のリトライ禁止 | `services/x/client.js`: 402 時はリトライ判定前に throw（251–260 行）。`retryableStatuses` に 402 は含まれない（264 行）。 |
| 403/401 のリトライ禁止 | 同上。`retryableStatuses = [429, 500, 502, 503, 504]` のみリトライ。 |
| ブックマーク 1 run で /users/me 1 回 | `api/affiliate-recruit-bookmark.js`: `oauth2UserId` を言語ループ外で 1 回だけ取得（84, 123 行）。`createBookmark(tid, oauth2UserId)` でキャッシュを渡す。 |
| x-reply-sales 送信時の getMe | `api/x-reply-sales-run.js`: 1 回 `getMe()` して `cachedSourceId` を取得し、`followUser(..., { sourceId: cachedSourceId })` で渡している（1072–1091, 1358–1359 行）。 |
| フォロー解除の getMe 重複（今回修正） | `api/x-reply-sales-followup.js`: ループ前に 1 回だけ `getMe()` し、`unfollowUser(..., { sourceId })` で渡す。`services/x/client.js`: `unfollowUser` に `options.sourceId` を追加し、指定時は `/users/me` を呼ばない。 |

### 2.2 検索の Read 回数（仕様の範囲）

- **affiliate-recruit-run（list）**  
  - 1 言語あたり最大 `listPages` 回の `fetchOneSearchPage`。  
  - `fetchOneSearchPage` 1 回 = 検索 1 回（低ヒット時のみ fallback で最大 2 回）。  
- **affiliate-recruit-bookmark**  
  - 1 言語あたり `fetchOneSearchPage` 1 回（nextToken なし）。  
  - lang=all なら 6 言語で最大 6 回検索（各言語 1 ページ）。  
- 検索は Bearer 優先（`services/x/client.js` 744–779 行）。Bearer ありなら単発 fetch でリトライなし。

### 2.3 その他

- **likeTweet / followUser**  
  - 呼び出し元が `sourceId` を渡さない場合、**毎回 getMe()** が走る（966, 995 行）。  
  - x-reply-sales-run は `followUser` に `cachedSourceId` を渡しているため、送信ループ内の getMe 重複はなし。  
- **unfollowUser**  
  - 今回、`options.sourceId` を追加。followup では 1 回 getMe してからループで `sourceId` を渡すように変更済み。

---

## 3. 運用でリストを増やしたい場合のチェックリスト

1. **ページ数**: `EN_RECRUIT_LIST_PAGES` / `REGION_RECRUIT_LIST_PAGES` を 2 以上に（run のリスト補充のみ。bookmark は 1 ページ固定）。  
2. **窓**: `EN_SEARCH_WINDOW_MIN` / `REGION_SEARCH_WINDOW_MIN` で検索時間幅を変更。  
3. **クエリ**: `AFFILIATE_RECRUIT_REQUIRED_GROUP_OPERATOR`（OR/AND）、`AFFILIATE_RECRUIT_LOW_HIT_FALLBACK_THRESHOLD`、ネガティブ語（`affiliateRecruitSearch.js`）の見直し。  
4. **フォロワー**: `AFFILIATE_RECRUIT_MIN_FOLLOWERS` を 0 にするとフィルタ無効（運用方針に要確認）。  
5. **402**: クレジット補充。402 時はリトライしていないので、補充後の次 run で再取得される。

---

## 4. 今回のコード変更まとめ

- **services/x/client.js**  
  - `unfollowUser(targetUserId, options = {})` に `options.sourceId` を追加。指定時は getMe() を呼ばず DELETE のみ。  
- **api/x-reply-sales-followup.js**  
  - フォロー解除ループの前に 1 回だけ getMe() し、`unfollowUser(..., { sourceId: cachedSourceId })` で渡す。  
  - 最大 50 件解除時、**従来: 最大 50 回 /users/me → 修正後: 1 回 /users/me**。

---

## 5. 改善策の根拠（なぜその対応をしたか）

改善策ごとに、**根拠の種類**を明示する。推測のみのものは「要確認」とする。

### 5.1 402 でリトライしない

| 根拠の種類 | 内容 |
|------------|------|
| **HTTP 標準** | RFC 7231: 402 = "Payment Required"。支払い・クォータ不足を示す。 |
| **自リポジトリの設計** | `docs/BUZZWEAVE_X_API_COST_GUARDRAILS_REPORT.md`: 「402 を無視して run を続行するような改悪をすると、クレジット切れ後も search が続く可能性がある」。`docs/X_API_GROK_PROMPT_REFERENCE.md`: 402 時は「24〜48 時間バックオフ」を運用目安としている。 |
| **論理** | リトライしてもクレジットは増えないため、同じ 402 が返り続けるだけ。リクエスト回数だけ増え、課金（クレジット消費）が増える。 |
| **公式** | X API が「402 のときはリトライするな」と明文化しているかは未確認。上記の論理と自リポジトリ方針に基づく。 |

### 5.2 getMe / user id を 1 run で 1 回取得して渡す（followUser, unfollowUser, ブックマーク）

| 根拠の種類 | 内容 |
|------------|------|
| **X 認証の仕様** | X Developer ドキュメント（OAuth 2.0 User Context）: "Each access token is tied to the user who authenticated" / "The same token cannot be used for multiple different users"。同一トークン＝同一ユーザー＝同一 user id。 |
| **コード上の事実** | 修正前: ループ内で `unfollowUser(id)` のみ渡しており、`unfollowUser` 内で毎回 `getMe()` を呼んでいた。1 run で N 回 /users/me が発生。修正後: ループ外で 1 回 getMe し、`sourceId` を渡すと `/users/me` は呼ばれない（client.js 1026 行）。 |
| **論理** | 1 回の run では同じ OAuth トークンを使うため、認証ユーザー ID は不変。1 回取得してキャッシュして渡せば十分。 |

### 5.3 ブックマークで oauth2UserId を言語ループの外で 1 回取得

| 根拠の種類 | 内容 |
|------------|------|
| **上記 5.2 と同じ** | 同一トークン＝同一ユーザー。run 中は 1 アカウントでブックマークするだけなので、user id は 1 回で足りる。 |
| **コード上の事実** | 修正前: `let oauth2UserId = null` が言語ループ内にあり、言語が変わるたびにリセット。複数言語でブックマークすると getOAuth2UserId() が言語数だけ呼ばれていた。 |

### まとめ

- **402 リトライ禁止**: HTTP の 402 の意味・自リポジトリの既存設計・「リトライしてもクレジットは増えない」という論理に基づく。X が公式に「402 でリトライするな」と書いているかは未確認。  
- **getMe/user id のキャッシュ**: X の「1 トークン = 1 ユーザー」という公式の認証モデルと、コード上「N 回呼ばれていた」事実に基づく。改善後は「1 回取得して渡す」で同一挙動が保証される。

---

## 6. 「臨むリスト」が本当に集まるか（検索と運用指示の齟齬）

### 6.1 運用指示・設計書で「欲しい」とされているリスト

| 出典 | 内容 |
|------|------|
| `api/affiliate-recruit-bookmark.js` 冒頭コメント | 候補条件の一つに「**案件を募集中（open to collab / DM for business 等を除外しない）**」と明記。 |
| `docs/AFFILIATE_RECRUIT_RECOMMENDATION_DESIGN.md` | 「案件募集中」「提携募集中」を **High Intent として優先抽出**。Seekers = "DM open for collab", "募集" → **優先。案件提案。** |
| `docs/AFFILIATE_RECRUIT_BRICS_SCORING_AND_PRIORITY.md` | "affiliate / **open to collab** / DM open" にスコア +5。 |

→ **「案件募集中」「open to collab」層は、運用指示・設計書上は「臨むリスト」に含める想定。**

### 6.2 検索で実際にやっていること

| 出典 | 内容 |
|------|------|
| `services/td/affiliateRecruitSearch.js` 7–8 行 | 「**案件募集・コラボ待ち文脈は除外**」とコメント。 |
| 同ファイル `SEARCH_NEGATIVE_TERMS_BY_LANG` | 検索クエリに **ネガティブ語** を付与し、これらの語を含むツイートは **ヒットさせない**。 |

**ネガティブ語の例（該当部分のみ）:**

- **en**: `"colab"`, `"collab"`（115–118 行）
- **ja**: `"案件募集"`, `"お仕事募集"`, `"コラボ"`（129–139 行）
- **ko**: `"콜라보"`, `"협찬"`（151–152 行）
- **es/pt**: `"colab"`（155, 168 行）

→ **「open to collab」「案件募集」「コラボ」などと言っている投稿は、検索段階で除外されている。**

### 6.3 結論

- **「実際に紹介活動している」証拠語＋プラットフォーム語** に合致する投稿は取れる。
- **「案件募集中 / open to collab / DM for business」を前面に出している層** は、現状のネガティブ語により **検索結果に入ってこない**。
- したがって、**運用指示・設計書で「臨むリスト」に含めるとしている一部（Seekers／案件募集中）は、今の実装では集まっていない。**

### 6.4 取りうる対応

1. **「案件募集中・コラボ希望」もリストに含めたい場合**  
   - ネガティブ語から `colab` / `collab` / `案件募集` / `コラボ` 等を**外す or 縮小**する。  
   - その場合、「求人・PR依頼だけのノイズ」と「本当にアフィリエイト意図のある collab」の切り分けは、スコアリングや送信時フィルタで行う必要がある。

2. **「案件募集・コラボ待ちは除外」を正とする場合**  
   - 検索の現状のままでよい。  
   - その代わり、`api/affiliate-recruit-bookmark.js` の「案件を募集中を**除外しない**」という記述は**誤り**なので削除または修正する（「案件募集中は検索で除外している」と明記する）。

どちらを正とするかは運用方針の判断になる。
