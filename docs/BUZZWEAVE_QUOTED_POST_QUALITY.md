# 引用されるバズ投稿の品質について

PQT で「どの投稿を引用するか」の品質がどこまで担保されているかをまとめる。**引用元抽出・投稿テンプレは完全パターン化**（GPT は使わない）。

---

## 完全パターン化

- **引用元抽出**: 検索クエリ・エンゲージメント中央値・**品質パターン**（NG キーワード・最低文字数・URL 数上限）・クラスタ（キーワード）・2–7 分ウィンドウ・momentum。context（topic/tone/lang）は固定（crypto / neutral / slotLang）。**GPT 分類は廃止**。
- **投稿テンプレ**: `pqtTemplates.js` のテンプレのみ。リンク前の整形は `pqtSecretWeapons.js`（改行・句点削除・字数制限なし）。GPT 生成は廃止済み。

---

## 現状ある品質関連のフィルタ（パターン）

| 段階 | 内容 | 役割 |
|------|------|------|
| **検索** | `SEARCH_KEYWORDS_BY_LANG`（bitcoin, btc, crypto, halving, ETF 等）+ `-is:retweet -is:reply` | クリプト関連のオリジナル投稿に限定 |
| **エンゲージメント** | `engagementScore`（いいね・RT 等でスコア化） | 伸びている投稿を優先 |
| **中央値フィルタ** | `score >= max(median × 1.2, 500)` | その時間帯で「中央より上」の投稿だけ通過 |
| **クラスタ** | `classifyCluster`（etf / price_surge / fud / regulation / meme / other） | キーワードで話題の種類を分類し、clusterScore で重み付け |
| **危険度** | `classifyDanger`（whale_trap / educational / neutral） | コピーモード用。**除外はしていない** |
| **品質パターン** | `passesQuoteQualityPattern`: NG キーワードブロック・最低文字数（`BUZZWEAVE_MIN_POST_LENGTH`  default 20）・URL 数上限（`BUZZWEAVE_MAX_URLS_IN_POST`  default 2） | 通過しない投稿は候補から除外 |
| **2–7 分ウィンドウ** | 投稿から 120–420 秒のものだけ採用 | 伸び始めの「仕手」っぽいタイミングに限定 |
| **momentum** | 2–7 分内で `_likesPer10min` でソート | 勢いのあるものを優先 |
| **shiteshiScore** | velocity 等でスコア化、tier cap | バランスよくスロットを取る |

---

## 現状「確かめていない」こと

- **スパム判定** … 「スパムかどうか」の専用チェックはなし。エンゲージメントが高ければ通過しうる。
- **アカウント品質** … フォロワー数・認証マーク・過去のスパム報告などは見ていない。
- **内容の適否** … GPT は topic/tone/lang のみ。「引用に値するか」「ネタ/荒らしでないか」は聞いていない。
- **重複・既引用** … 同一投稿への二重 QT は別ロジック（insertQuotedTweets 等）で防ぐ想定。引用元の「内容の重複」は見ていない。

---

## 結論

- **確かになっていること**: クリプト系キーワードを含むオリジナル投稿のうち、**その時間帯でエンゲージメントが高く、投稿から 2–7 分で勢いがある**ものに限定している。
- **確かになっていないこと**: スパムかどうか、アカウント信頼性、引用にふさわしい内容かどうかは**明示的には検証していない**。ヒューリスティック（伸び・時間・キーワード）で「バズっぽい」ものを選んでいる状態。

---

## 環境変数（パターン）

| 変数 | デフォルト | 説明 |
|------|------------|------|
| `BUZZWEAVE_MIN_POST_LENGTH` | 20 | 引用元の本文がこの文字数未満なら除外 |
| `BUZZWEAVE_MAX_URLS_IN_POST` | 2 | 引用元の URL がこの本数超なら除外 |

NG キーワードブロックは `buzzWeaveEngine.js` の `QUOTE_QUALITY_BLOCKLIST` で定義。要追加時はここを編集する。
