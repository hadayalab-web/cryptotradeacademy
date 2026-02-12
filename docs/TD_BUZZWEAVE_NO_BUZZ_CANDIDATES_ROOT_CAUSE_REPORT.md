# TD BuzzWeave Engine  
# `No buzz candidates` 原因特定レポート

作成日: 2026-02-12

---

## 1. 結論（先に要点）

`No buzz candidates` の主因は、**X API 認証や閾値ではなく、Supabase ターゲット母集団が空であること**。

- `td_post_slots` は存在
- しかし `td_influencers` / `td_official_accounts` が未作成（schema cache に存在しない）
- その結果、`collectBuzzCandidates()` の入口で target 数が 0 件
- `getUserTweets` は正常動作、閾値超過投稿も実在（別ルート検証済み）

---

## 2. 実施チェックと結果

### 2-1. X API 認証情報

確認結果（存在フラグ）:

```json
{
  "X_API_CONSUMER_KEY": true,
  "X_API_CONSUMER_KEY_SECRET": true,
  "X_API_ACCESS_TOKEN": true,
  "X_API_ACCESS_TOKEN_SECRET": true,
  "X_API_BEARER_TOKEN": true
}
```

判定: **問題なし**

---

### 2-2. アカウント一覧（quoteRepostStateless / official list）

- `config/quoteRepostStateless.js` には `influencers/officials/flexible` 配列は存在せず（マッチなし）
- 公式アカウント母集団は `config/officialCryptoXAccounts.js` で管理

件数:

```json
{
  "exchanges": 20,
  "projects": 43,
  "companiesMedia": 24,
  "totalUnique": 87
}
```

判定: **母集団は空ではない（設定上）**

---

### 2-3. `getUserTweets` 実取得確認

先頭8アカウントで実測:

```json
[
  {"username":"binance","userFound":true,"tweetCount":5},
  {"username":"coinbase","userFound":true,"tweetCount":5},
  {"username":"krakenfx","userFound":true,"tweetCount":5},
  {"username":"OKX","userFound":true,"tweetCount":5},
  {"username":"Bybit_Official","userFound":true,"tweetCount":5},
  {"username":"BitgetOfficial","userFound":true,"tweetCount":1},
  {"username":"kucoincom","userFound":true,"tweetCount":5},
  {"username":"Gemini","userFound":true,"tweetCount":5}
]
```

判定: **取得成功（関数は正常）**

---

### 2-4. BUZZ_THRESHOLD 超過投稿の存在

同サンプル（8アカウント, 36投稿）:

```json
{
  "sampleAccounts": 8,
  "postsChecked": 36,
  "aboveOfficialThreshold": 7,
  "officialThreshold": 500
}
```

判定: **閾値超過投稿は存在**

---

### 2-5. 0件化箇所の特定

BuzzWeave 診断:

```text
diag.targets { influencers: 0, officials: 0, total: 0 }
diag.scores { checked: 0, above: 0, thresholds: { influencer: 200, official: 500 } }
```

Supabase テーブル存在確認:

```text
td_post_slots OK rows=1
td_influencers ERROR: Could not find the table 'public.td_influencers' in the schema cache
td_official_accounts ERROR: Could not find the table 'public.td_official_accounts' in the schema cache
```

判定: **ここが根本原因**

---

## 3. 影響

- BuzzWeave Engine は slot を持っていても、target が 0 のため候補抽出不可
- `No buzz candidates` が返る
- KPI 3原則（高インプレッション / 高エンゲージメント / 高CVR）に到達しない

---

## 4. 修正案（優先順）

1. Supabase に `td_influencers` / `td_official_accounts` を作成
   - `docs/supabase-tweet-metrics-schema.sql` を適用
2. データ移設を実行
   - `node scripts/td-migrate-official-accounts-to-supabase.js`
   - `node scripts/td-migrate-influencers-to-supabase.js`
3. 再検証
   - ターゲット件数 > 0 を確認
   - `node scripts/td-generate-daily-slots.js`
   - `curl "http://localhost:3000/api/buzzweave-run?dry_run=true"`
4. 運用防御（任意）
   - target 0 件時のフォールバック（official list 直読）を `collectBuzzCandidates()` に追加

---

## 5. 参考

- 実行検証: `docs/TD_BUZZWEAVE_ENGINE_EXECUTION_REPORT.md`
- 実装検証: `docs/TD_BUZZWEAVE_ENGINE_VERIFICATION_REPORT.md`
- 改善レポート: `docs/TD_BUZZWEAVE_ENGINE_IMPROVEMENT_REPORT.md`

