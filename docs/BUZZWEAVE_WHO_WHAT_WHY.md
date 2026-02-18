# BuzzWeave: 誰の・どんな投稿に・何のためにリプライしているか

コード（`buzzWeaveEngine.js` / `pqtCtaEngine.js` / `api/buzzweave-run.js`）に基づく整理。今後の議論はこの前提で行う。

---

## 誰（ターゲット）

- **リンクをクリックさせたい相手**: 仕手Botの煽り投稿に**群がっているトレーダー**（スレを見に来る・リプやいいねをする層）。リプライは「そのツイートの作者」宛てだが、届けたいのはスレを読む**群れ**。
- **検索でヒットする「ツイート」**: その群れが集まっている**仕手Botの投稿**。言語×キーワード×時間窓で X Search した結果。特定インフルエンサーリストではなく検索で拾う。
- 言語は **en / es / pt / ja / ko / ar**。UTC 時間帯で 1 Run あたり 1 言語（戦略的スケジュール）。
- 検索条件: `lang:${lang}`、`-is:retweet`、`-is:reply`。仕手Botが集客したスレを拾うため、Bot が使いがちな語もキーワードに含む（「仕手Bot攻略 → 提灯救済」）。

---

## どんな投稿（対象ツイート＝寄生先）

- **寄生先**: 仕手Botの**煽り投稿**。その投稿にトレーダーが群がっているスレに、CTA 付きリプライを 1 本入れてクリックを取る。
- **キーワード**: 言語別 `SEARCH_KEYWORDS_BY_LANG`（例: en → bitcoin, btc, crypto, pump, moon, ath, breakout, halving, spot etf, all time high / ja → ビットコイン, BTC, 仮想通貨, 急騰, 乗り遅れるな, 半減期, ETF, 暴落, 新高 など）。
- **時間窓**: 直近 30 分（デフォルト。低ボリューム言語は拡大あり）。
- **品質フィルタ**  
  - `passesQuoteQualityPattern`: 本文 20 字以上、URL 2 本以下、ブロックワードなし（follow me, dm for, airdrop, giveaway など）。  
  - 過去 30 日で既に引用リプした **tweet_id** は除外（同一ツイートには二度リプしない）。  
  - `MIN_REPLY_RETWEET_SUM` / `MIN_TOTAL_INTERACTIONS` は env で 0 以上にすればエンゲージメント閾値として効く。
- **クラスタ分類**: etf / price_surge / fud / regulation / meme / other（キーワードヒューリスティック）。
- **危険度分類**: whale_trap（煽り・希少性煽り） / educational（リスク・NFA 等） / neutral。テンプレ選びと「同意フック vs 教育的」の分岐に使用。
- **選定**: インプレ・エンゲージメント・鮮度（2〜7 分窓を優遇）などでスコア化し、Fisherman またはシンプル選定で cap までスロット取得。1 Run 内で同一 author は `MAX_SLOTS_PER_AUTHOR`（デフォルト 1）まで。

---

## 何のために（目的・導線）

- **目的**: 仕手Botの煽り投稿に**寄生**し、CTA を載せたリプライを投下する。そのスレに**群がるトレーダー**にリンクをクリックさせる。
- **北極星**: 100 成約/日（`BUZZWEAVE_DAILY_CONVERSION_TARGET`）。高インプレ・高エンゲ・高 CVR は成約への経路指標。
- **運用**: 引用リポストは廃止。**リプライのみ**でスレ内で確実に届ける。
- **リプライ内容**: PQT テンプレ（`buildPqt`）。  
  - 根拠スニペット（`buildProofSnippetFromSnapshot`）＋ CTA ＋ **リンク**。  
  - キャンペーン時: **Whop 有料版（Regular Briefing）**、希少性・緊急性・1 日無料トライアル。  
  - 非キャンペーン: **Vidalytics** または `pickBestFunnelLink` で選んだ導線（FOMO / ATH_SURGE）。  
  - 煽り強（whale_trap）は同意フック系ボットテンプレ、それ以外は 8 バリアント or 3 パターン（fear/authority/elitism）。
- **成約**: 群がっているトレーダーがリプライを見てクリック → Whop/Vidalytics での登録・有料転換。回数を重ねて効いてくる設計（フリークエンシー・認知の蓄積）。

---

## 重複排除（事実）

- **同一ツイート**: 過去 30 日で引用済みの `tweet_id` は `getQuotedTweetIdsInLast30Days` で除外。同じツイートには二度リプしない。
- **同一ユーザー（author）**: Run をまたいだ「この author にはもうリプした」というチェックは**していない**。別ツイートがヒットすれば同じユーザーに再度リプする可能性あり。1 Run 内では `MAX_SLOTS_PER_AUTHOR` で制限。

---

*最終更新: コード確認に基づく要約（buzzWeaveEngine.js, pqtCtaEngine.js, api/buzzweave-run.js, utils/supabase.js 参照）。*
