# アフィリエイトリクルート 現状スクリーニング条件

フォーカス: (1) すでにアフィリエイターとして活動中 (2) ノイズ徹底排除 (3) 403は追いかけない  
※「DM募集中」は条件から廃止（XのDM設定と一致せず403が多いため）

---

## 1. 検索条件（誰を拾うか）

**ファイル**: `services/td/affiliateRecruitSearch.js`

- **検索クエリ**: 言語別キーワード + `lang:XX` + `-is:retweet` + `-is:reply`
- **キーワード方針**: すでにアフィリエイターとして活動中（link in bio, referral link, whop 等）。DM募集中系は廃止（Xの設定と一致しないため）。

| 言語 | 前面（アフィリエイター活動） | 後面（クリプト文脈） |
|------|-----------------------------|----------------------|
| EN  | affiliate, referral, link in bio, my link, referral link, whop affiliate | bitcoin, btc, crypto, etf, halving |
| JA  | アフィリエイト, 紹介, プロフィールにリンク, 紹介リンク, whop | ビットコイン, BTC, 仮想通貨, ETF, 半減期 |
| KO  | 제휴, 리퍼럴, 프로필 링크, 제휴 링크, whop | 비트코인, BTC, 암호화폐, ETF, 반감기 |
| ES  | afiliado, referido, link en bio, mi link, link de referido, whop | bitcoin, btc, crypto, etf, halving |
| PT  | afiliado, indicado, link na bio, meu link, link de indicação, whop | bitcoin, btc, crypto, etf, halving |
| AR  | شراكة, إحالة, الرابط في البايو, رابط الإحالة, whop | بيتكوين, كريبتو, etf, تنصيف |

- **検索窓**: デフォルト 30 分（`BUZZWEAVE_SEARCH_WINDOW_MIN`）。ar/ko は LOW_VOLUME で 60 分、ar は 90 分オーバーライド可。
- **AR のみ**: `BUZZWEAVE_AR_INFLUENCER_IDS` があれば `from:id1 OR from:id2...` クエリを追加。

---

## 2. スコアリング（0–100 + 除外）

**ファイル**: `services/td/affiliateRecruitScoring.js`

### 2.1 スコアに効くウェイト（ノイズは 0）

| 項目 | ウェイト | 内容 |
|------|----------|------|
| **ACTIVE_AFFILIATE** | **0.4** | Bio に「link in bio / dm for link / dm open / whop / DM募集中」等（約40語・6言語）。1語→0.7、2語以上→1.0 |
| BIO | 0.2 | アフィリエイト・クリプト系語（affiliate, crypto, whop, linktree…）。2語以上で高得点 |
| FOLLOWERS | 0.2 | 1000–50000 で最大。それ以外は対数スケールで減衰 |
| ER | 0.08 | エンゲージメント率（投稿×フォロワー） |
| HUSTLE_PROFILE | 0.06 | hustle, dm open, affiliate, 副業 等（PROFILE_HUSTLE_KEYWORDS） |
| HUSTLE_ZONE | 0.06 | フォロワー 100–3000 で 1 |
| HYPE_PAIN | 0 | 廃止（煽り投稿） |
| BEGINNER_ZONE | 0 | 廃止（30–1500） |
| NO_LINK | 0 | 廃止（リンクなしボーナス） |
| ACTION_LOG | 0 | 廃止（今日の学び系） |
| CONSISTENCY | 0 | 廃止（投稿ばらつき） |
| PAIN_ACTION | 0 | 廃止 |

合計 1.0。スコアは 0–100 にクリップ。

### 2.2 優先度（送信可否の閾値）

- **Priority** = `(score/100) × C（言語係数） × R（リスク0.6/0.8/1.0） × B（スコア帯係数、CrConfig）`
- **PRIORITY_MIN_SEND = 0.4**: この値未満は DM 送らない。

---

## 3. 除外条件（ここに当たると候補から落ちる）

**ファイル**: `services/td/affiliateRecruitScoring.js` の `checkExclusions` + リスク補正

### 3.1 即除外（excluded: true）

| 条件 | 定数 | 内容 |
|------|------|------|
| メトリクスなし | — | followers === 0 && following === 0 |
| FF比高すぎ | FF_RATIO_MAX = 10 | followers / following > 10 |
| FF比低すぎ | FF_RATIO_MIN = 0.1 | followers / following < 0.1 |
| アカウント新しすぎ | MIN_ACCOUNT_AGE_DAYS = 180 | 作成から 180 日未満 |
| Bio 空 | — | description が空 |
| プロフィール除外語 | PROFILE_EXCLUDE_KEYWORDS | growth hacker, seo expert, consultant, coach, agency owner, mentor, guru, forex trader, mlm（いずれかを含む） |
| 低ER・高フォロワー | LOW_ER_* | followers > 10k かつ ER < 0.05% |

### 3.2 リスク補正 R（除外ではないが Priority が下がる）

- **R = 0.6**: RISK_KEYWORDS_06（forex trader, mlm, religion, politics, military 等）、PT は BR_HOTMART_KEYWORDS（hotmart, eduzz…）
- **R = 0.8**: RISK_KEYWORDS_08（get rich, make $100/day, investing, entrepreneur）
- 該当なし: R = 1.0

---

## 4. 送信前フィルタ（affiliate-recruit-run.js）

候補は「除外されていない」「Priority ≥ PRIORITY_MIN_SEND」でソートしたあと、以下を通過した人にだけ送る。

| フィルタ | 内容 |
|----------|------|
| **isAlreadySent(handle)** | 同一 handle に 90 日以内に送信済みならスキップ（追いかけ再送しない） |
| **isDmNg(author_id)** | 過去に 403（DM拒否）で markDmNg されているならスキップ（**403は追いかけない**、90 日） |
| **ngFilter（EN のみ）** | プロフィールに URL があり、かつ description に nigeria/naija/lagos を含む場合はスキップ |

403 発生時は `markDmNg(author_id)` を呼び、以降 90 日間はその author_id には送らない。

---

## 5. まとめ（フォーカスとの対応）

| フォーカス | 現状の実装 |
|------------|------------|
| 1. すでにアフィリエイター | 検索: affiliate / link in bio / referral link / whop 等。スコア: ACTIVE_AFFILIATE 0.4 + BIO 0.2（DM募集中キーワードは廃止） |
| 2. ノイズ徹底排除 | 煽り検索なし。HYPE_PAIN / ACTION_LOG 等ウェイト 0。除外は consultant, mlm 等のみ |
| 3. 403は追いかけない | 403 時に markDmNg。isDmNg で 90 日間スキップ。再送しない |

---

*最終確認: 2026-02 時点の affiliateRecruitSearch / affiliateRecruitScoring / affiliate-recruit-run に基づく*
