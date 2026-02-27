# アフィリエイトリクルート — 根拠のない／判断で決まっている設定の洗い出し

「おかしいかも？」と判断できる、根拠がコード・ドキュメントに明記されていない設定を一覧にした。検証・計測で決め直す候補。

---

## 検索（affiliateRecruitSearch.js）

| 設定 | 現在値 | 備考 |
|------|--------|------|
| **SEARCH_WINDOW_MINUTES** | 30（Search デフォルト） | リクルート run では渡しで上書き: EN=240分・他地域=1440分（24h）（docs/AFFILIATE_RECRUIT_SEARCH_WINDOW_BY_SCHEDULE.md）。 |
| **endTime = now - 30秒** | 30 * 1000 ms | → #6 完了。検索 API のインデックス遅延を避けるため直近 30 秒を除外。コードに理由コメント追加。 |
| **LOW_VOLUME_* / ar:90** | — | 削除済み。#3 で fetchCandidatesFromSearch 削除時に削除。#7 完了。 |
| **SEARCH_QUERY_MAX_CHARS** | 480 | → #16 完了。X API v2 search recent のクエリ上限は Essential/Elevated で 512 文字。480 はその範囲内の安全値。コードにコメント追加。env BUZZWEAVE_QUERY_MAX_CHARS で上書き可。 |
| **SEARCH_QUERY_BUCKET_SIZE** | 3 | → #17 完了。従来モード（SINGLE_QUERY=0）時のみ使用。1 クエリが MAX_CHARS を超えないよう分割するときのサイズ。3 は 1 クエリに収まりやすい目安。通常は 1 言語 1 クエリのため未使用。コードにコメント追加。env BUZZWEAVE_QUERY_BUCKET_SIZE で上書き可。 |
| **SEARCH_PAGES_PER_BUCKET** | — | 削除済み。#3 で事前調査廃止に伴い fetchCandidatesFromSearch とともに削除。リクルート run は未使用。 |
| **fetchOneSearchPage の default maxResults** | 30（options 未指定時） | run からは 100 を渡しているが、Search 単体利用時は 30。 |

---

## ラン（affiliate-recruit-run.js）

| 設定 | 現在値 | 備考 |
|------|--------|------|
| **maxReadPages** | 3（AFFILIATE_RECRUIT_MAX_READ_PAGES） | 1 ランで取得する最大ページ数。→ #2 確定。1 ページ 100 投稿で 10 成功に要する試行数（約 18）から 2 ページで足りるが、候補質のばらつきを考慮しバッファで 3 ページ。env で上書き可。 |
| **maxResults（run から渡す）** | 100 | 1 Read あたり取得件数。API 上限に合わせて 100 に変更済み。 |

---

## Config（affiliateRecruitConfig.js）

| 設定 | 現在値 | 備考 |
|------|--------|------|
| **RECRUIT_BATCH_SIZE_DEFAULT** | 10 | 1 ランあたりの送信成功目標。→ #4 完了。目標「10 マスト」に合わせた値。config に根拠コメント追加。 |
| **EN_RECRUIT_HOURS** | [0,4,8,12,16,20] | → #18 完了。運用指示で固定。4時間ごとで窓240分と組み合わせて6回で24hを隙間なくカバー。変更時は SEARCH_WINDOW の doc および Cron と整合させること。 |
| **SLOT_BLOCK_HOURS / SLOT_BLOCKS** | — | #13 整理で削除。run で未使用の残骸。実行時刻は EN_RECRUIT_HOURS と SLOTS_BY_UTC_HOUR で参照。 |
| **DAILY_CAP_BY_LANG_60 / AFFILIATE_DM_DAILY_CAP** | — | #14 削除。上限を設ける意図が不明なため日次キャップを廃止。DAILY_CAP_BY_LANG_60 は未使用残骸で削除。 |
| **AFFILIATE_DM_MIN_INTERVAL_MS** | — | 削除済み。#5 で未使用のためリクルート config から削除。 |
| **SLOTS_BY_UTC_HOUR の Array(10)** | 各時刻 10 スロット | → #19 完了。運用指示で固定。送信成功目標10以外はどうでもよい。 |

---

## スコアリング（affiliateRecruitScoring.js）

| 設定 | 現在値 | 備考 |
|------|--------|------|
| **FF_RATIO_MAX / MIN** | — | #11 削除。目的が不明な除外のため削除。 |
| **MIN_ACCOUNT_AGE_DAYS** | — | #10 削除。根拠のない除外のため削除。候補を増やしスコアリングでピントを合わせる。 |
| **LOW_ER_*（低 ER 除外）** | — | #12 削除。不要な除外のため削除。 |
| **OPTIMAL / HUSTLE / BEGINNER / MICRO_NANO 帯** | — | #20 で削除。他モジュール未使用のため定数と scoreFollowers / scoreHustleZone / scoreBeginnerZone / scoreMicroNanoZone を削除。 |
| **COEFFICIENT_BY_LANG** | en:1.15, pt:1.15, es:1.1, ar/ja/ko:1.0 | #21 完了。crConfig/cr-update のデフォルト用に残置。並び順・除外には未使用。コメント追加済み。 |
| **REGION_COEFFICIENT** | — | #21 で削除。未使用のため定数・getRegionCoefficientByLang を削除。 |
| **WEIGHT_*** / 係数 / スコア帯** | 各種 | #15 並び順からは使わない。並び順は recency のみ。スコアのウェイト・係数は計算から削除し、非除外時は固定 score=50・breakdown={}。stats/response 用の目安のみ。COEFFICIENT_BY_LANG は crConfig 等で参照のため残置。 |
| **PRIORITY_MIN_SEND** | — | #9 削除。根拠のないフィルタのため削除。候補は excluded でなければ送信対象。 |
| **PRIORITY_TIER_HIGH / NORMAL** | — | 削除（PRIORITY_MIN_SEND とともに未使用のため）。 |
| **scoreConsistencyFromRecentTweets** | — | #22 で削除。未使用（computeCandidateScore でウェイト廃止後デッドコード）のため関数・export を削除。 |
| **scoreEr** | — | #23 で削除。未使用（computeCandidateScore でウェイト廃止後デッドコード）のため関数・export を削除。 |
| **scoreWhopImmune (config)** | — | #24 で削除。未使用のため scoreWhopImmune と WHOP_MENTION_PATTERNS を config から削除。 |

---

## KV / TTL（affiliate-recruit-run.js）

| 設定 | 現在値 | 備考 |
|------|--------|------|
| **SENT_TTL** | — | #8 完了。同一ユーザーへは一切再送しないため有効期限なし（キー永続）。 |
| **DM_NG_TTL** | — | #8 完了。403 ユーザーへは一切再送しないため有効期限なし（キー永続）。 |
| **REF_SENT_TTL** | 90 日 | → #25 完了。DM→登録紐づけ用 KV。90 日は想定期間カバー＋ストレージ目安。運用指示で固定。短縮時はコードまたは env で変更可。run にコメント追加。 |

---

## まとめ

- **検索窓・窓延長・低ボリューム** … 時間や言語の切り分けはすべて根拠未記載。
- **ページ数・件数・batchSize** … 5 ページ、10 件目標などは設計上の「決め」で、計測に基づいていない。
- **スコアリングの閾値・ウェイト・優先度** … コメントで意図は書いてあるが、数値の根拠はない。
- **時刻・間隔・TTL** … 4 時間ごと、5 分間隔、90 日などは運用上の決めで、根拠は未記載。

検証するなら: 検索窓・maxReadPages・batchSize を変えてヒット数・送信数・403 率を計測し、スコア閾値は送信済みのスコア分布を見てから決め直すとよい。
