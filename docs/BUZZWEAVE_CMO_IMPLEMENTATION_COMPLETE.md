# BuzzWeave：Gemini CMO 戦略の実装完了一覧

**参照**: `docs/ai-analysis-results/CSO_CMO_STRATEGY_2026-02-18T11-05-42.md`

目的は **リプライの高インプレ獲得** と **高 CTR 獲得** の 2 つ。以下、CMO 推奨と実装の対応を記載する。

---

## 1. Cron の言語・地域別分割（実装済み）

| CMO 推奨 | 実装 |
|----------|------|
| cron-en-active: 15 分毎・en | `vercel.json`: `/api/buzzweave-cron-en` を `*/15 * * * *` で実行。`api/buzzweave-cron-en.js` が `?lang=en` を付与して buzzweave-run を呼ぶ。 |
| cron-asia: 30 分毎・ja/ko | `/api/buzzweave-cron-asia` を `*/30 * * * *`。`?region=asia` → API 内で `getLangForRegion('asia', utcHour)` により ja または ko を 1 つ選択。 |
| cron-latam: 30 分毎・es/pt | `/api/buzzweave-cron-latam` を `*/30 * * * *`。`?region=latam` → es または pt を UTC で選択。 |
| cron-emea: 60 分毎・ar | `/api/buzzweave-cron-emea` を `0 * * * *`。`?lang=ar` で固定。 |

**コード**: `api/buzzweave-run.js` で `region=asia|latam|emea` を受け取り、`services/td/buzzWeaveSchedulePlan.js` の `getLangForRegion(region, utcHour)` で言語を解決。単一の `*/30` Cron は廃止し、上記 4 本に置き換え済み。

---

## 2. 検索クエリ・キーワード（実装済み）

| CMO 推奨 | 実装 |
|----------|------|
| ar: 英語ティッカー追加（$BTC, $ETH, $SOL）・تداول, توصية | `buzzWeaveEngine.js` の `SEARCH_KEYWORDS_BY_LANG.ar` に `$BTC`, `$ETH`, `$SOL`, `تداول`, `توصية` を追加済み。 |
| en: gem, alpha, next pump, dyor, $SOL, $ETH | 同上、en に追加済み。 |
| ja: エアドロ, ギブアウェイ, 爆益, 魔界, 銘柄, アルト | 同上、ja に追加済み。 |
| ko: 가즈아, 떡상, 코인, 매수 | 同上、ko に追加済み。 |

---

## 3. UTM パラメータ付きリプライリンク（実装済み）

| CMO 推奨 | 実装 |
|----------|------|
| `utm_source=twitter_bot&utm_lang={lang}&utm_content={template_id}` で CTR 測定 | `services/td/buzzWeaveEngine.js` に `appendBuzzweaveUtm(url, lang, templateId)` を追加。リプライ用リンクに `utm_source=twitter_bot`, `utm_lang`, `utm_content`（dangerLabel または "default"）を付与。LP 側で `utm_content` を取得すればテンプレート別 CTR を集計可能。 |

---

## 4. 既に反映済み（別セッション・BUZZWEAVE_CMO_STRATEGY）

- インプレスコア重み（velocity 0.5, freshness 0.3, conversation/repost 0.1, author_reach 0.3）
- HYPE_BOOST 0.5 / CTR_BOOST 0.9（CopyFit 優先）
- 言語別キーワード（養分・靴磨き, 김프・구조대, estafa・gemas, حلال・نصب）
- 時間窓（ja 30 分, ar 90 分, LOW_VOLUME_LANGS から ja 除外）

→ 根拠は `docs/BUZZWEAVE_STRATEGY_RATIONALE.md` および `docs/ai-analysis-results/BUZZWEAVE_CMO_STRATEGY_*.md` を参照。

---

## 5. 追加実装済み（Phase 2 から繰り上げ）

| CMO 推奨 | 実装 |
|----------|------|
| **言語別品質フィルター** | `buzzWeaveEngine.js`: `LANG_QUALITY_FILTER` を追加。en: minFollowers 1000, minReplyCount 5。ja: minFollowers 3000。ko: maxAgeMinutes 20。ar: minFollowers 1000, minReplyCount 3。es/pt は空（量優先）。`applyPerLangQualityFilter` で中央値フィルタ前に適用。環境変数 `BUZZWEAVE_*_MIN_FOLLOWERS` / `_MIN_REPLIES` / `BUZZWEAVE_KO_MAX_AGE_MIN` で上書き可。 |
| **英語コピー A/B（緊急性 vs 権威性）** | EN 時のみ `copyVariant = urgency | authority` を 50/50 で設定。`pqtCtaEngine.js` の `buildPqt` で en かつ copyVariant ありなら fear（緊急性）または authority（権威性）の 3 パターン本文をそのまま使用。utm_content でテンプレート別 CTR 計測可能。 |
| **AR インフルエンサー指定検索** | `buildSearchQueries("ar")` 内で、環境変数 `BUZZWEAVE_AR_INFLUENCER_IDS`（カンマ区切り user ID、最大 10 件）が設定されていれば `(from:id1 OR from:id2 ...) lang:ar -is:retweet -is:reply` を追加クエリとして投入。ID リストは別途用意。 |

---

## 6. 未実装・今後のバックログ

- **言語別ゴールデンタイムに合わせた API 内部優先度の重み付け**: 現状は STRATEGIC_UTC_TO_LANG で言語は決まっている。さらに「この時間帯はこの言語の重みを上げる」等の細かい重みは未実装。
- **ja の「日本語の自然さ判定」**: CMO の Ultra-High の一部。NLP による不自然文の除外は未実装。

---

## 7. 運用メモ

- **手動実行**: 従来どおり `GET /api/buzzweave-run?lang=xx` または `?region=asia` で実行可能。Cron は 4 本のラッパー経由のみ。
- **KPI**: CMO が挙げた Reply Survival Rate・Average Time-to-Reply・CPE は、ログまたは別集計で対応。LP 側で utm_content を保存すればテンプレート別 CTR が取れる。
