# Vercel 1時間ログ分析：X投稿が計画通り実行されない原因（2026-02-02）

## 対象ログ

- **ファイル**: `logs_result (5).json`（1時間分）
- **時刻範囲**: 2026-02-01 22:20:50 ～ 23:15:27 UTC
- **解析スクリプト**: `scripts/analyze-logs-result-5.js`

---

## 分析結果サマリー

| 項目 | 結果 |
|------|------|
| 総ログ件数 | 736 |
| x-quote-repost-* | ✅ 呼ばれている（各言語 46～68 回/時間） |
| x-post-free-report | ❌ **0 回**（この1時間で一度も呼ばれていない） |
| x-post-minimal-version | ❌ **0 回**（この1時間で一度も呼ばれていない） |
| 引用リポストの実投稿 | ❌ **すべてスキップ**（理由: low impressions: 0） |

---

## 原因1: 引用リポストが「全員スキップ」される

### 事象

ログに多数の以下のメッセージが出ている。

```
⏰ Skipping quote repost for @xxx (low impressions: 0, min: 72,000) [step: impression_check]
```

- インフルエンサーの `recentImpressions` が **0** のまま。
- 旧実装では「impressions < minImpressions」でスキップしており、**0 のときもスキップ**していた。
- その結果、引用リポストは **1件も投稿されない**。

### 修正内容（実施済み）

**ファイル**: `api/x-quote-repost.js`

- **変更前**: `if (impressions > 0 && impressions < minImpressions)` でスキップ。  
  デプロイ版によっては `impressions < minImpressions` のみでスキップしており、**impressions === 0 でもスキップ**していた。
- **変更後**:
  - **impressions === 0** → 「メトリクス未取得」とみなし、**スキップせず投稿を許可**。
  - **impressions > 0 かつ impressions < minImpressions** のときのみスキップ。
- `impressions` を `Number(influencer.recentImpressions) || 0` で明示的に数値化。

これにより、メトリクスが取れていない（0）インフルエンサーも引用リポスト対象になり、計画に沿った投稿が可能になる。

---

## 原因2: x-post-free-report / x-post-minimal-version が 0 回

### 事象

この1時間のログでは次の2つが **1回も呼ばれていない**。

- `/api/x-post-free-report`
- `/api/x-post-minimal-version`

### Vercel Cron の定義（現状）

`vercel.json` では次のように登録済み。

- `x-post-minimal-version`: `0 0,7,12,15,23 * * *`（毎日 0,7,12,15,23 時 UTC の 0 分）
- `x-post-free-report`: `30 4,10,17,19 * * *`（毎日 4:30, 10:30, 17:30, 19:30 UTC）

### 考えられる理由

1. **ログ取得時刻とのずれ**  
   対象1時間は 22:20～23:15 UTC。  
   - minimal: 23:00 に 1 回だけ発火する可能性あり。  
   - free-report: 22:30, 23:30 は「30分」のため、22:30 が含まれるが 17:30/19:30 のみのスケジュールならこの1時間には含まれない。  
   いずれにせよ、**Cron がこの1時間に発火していない**可能性がある。

2. **デプロイタイミング**  
   このログを取得した時点のデプロイに、上記2つの Cron がまだ含まれていなかった可能性。

### 対応

- **vercel.json** に上記2つの Cron が入っていることを確認済み。  
- 次のデプロイ以降、指定時刻に **x-post-free-report** と **x-post-minimal-version** が呼ばれる想定。  
- 次回、**該当時刻を含む1時間のログ**を取得し、両エンドポイントが呼ばれているか再確認することを推奨。

---

## エンドポイント別 呼び出し回数（ログより）

| エンドポイント | 回数 | 備考 |
|----------------|------|------|
| /api/x-quote-repost-en-30 | 68 | ✅ |
| /api/cron | 66 | ✅ |
| /api/x-quote-repost-en | 61 | ✅ |
| /api/x-quote-repost-es | 58 | ✅ |
| /api/x-quote-repost-ar-30 | 58 | ✅ |
| /api/x-quote-repost-es-30 | 58 | ✅ |
| /api/x-quote-repost-pt-br | 53 | ✅ |
| /api/x-quote-repost-ko-30 | 53 | ✅ |
| /api/x-quote-repost-ar | 51 | ✅ |
| /api/x-quote-repost-ja | 47 | ✅ |
| /api/x-quote-repost-ja-30 | 46 | ✅ |
| /api/x-quote-repost-pt-br-30 | 46 | ✅ |
| /api/x-quote-repost-ko | 46 | ✅ |
| /api/x-webhook | 18 | ✅ |
| /api/vsl2-last-call | 4 | ✅ |
| /api/vsl2-free-users | 3 | ✅ |
| **/api/x-post-free-report** | **0** | ❌ |
| **/api/x-post-minimal-version** | **0** | ❌ |

---

## 実施した修正一覧

1. **api/x-quote-repost.js**  
   - インプレッション判定を変更。  
   - **impressions === 0** のときはスキップせず投稿を許可。  
   - **impressions > 0 かつ impressions < minImpressions** のときのみスキップ。

---

## 今後の確認推奨

1. **デプロイ後**  
   - 引用リポストが実際に投稿されているか（タイムライン／ログで確認）。  
   - 該当時刻に **x-post-free-report** / **x-post-minimal-version** が呼ばれているか（同じスクリプトでログ再解析）。

2. **ログの取り方**  
   - x-post-free-report（4:30, 10:30, 17:30, 19:30 UTC）や x-post-minimal-version（0, 7, 12, 15, 23 時 UTC）の **発火時刻を1時間に含めて**ログを取得すると原因切り分けがしやすい。

3. **recentImpressions の充実**  
   - 長期的には、インフルエンサーの `recentImpressions` を X API 等で取得・更新し、0 でない値が入るようにすると、インプレッション基準の選定が意味を持つ。
