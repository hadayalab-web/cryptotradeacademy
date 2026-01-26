# 予測値 vs 実績の分析レポート（2026-01-26）

## 📋 問題の指摘

ユーザーからの指摘:
> "24時間の振り返りをするとだいぶ最初の予測と乖離してるのに、この後の24時間で相当なリカバリーが起こるという見立てか？その根拠は？"

## 🔍 実績データの分析

### 実績（6.5時間分のログから抽出）

| 指標 | 実績値 | 24時間換算（単純計算） | 予測値（日次） | 乖離率 |
|------|--------|---------------------|--------------|--------|
| **総インプレッション** | 2,830,000 | 約10,440,000 | 3,122,000 | +234% |
| **総エンゲージメント** | 86 | 約317 | N/A | - |
| **Telegramオプトイン** | 17人 | 約63人/日 | 9,666-40,275人/日 | -99%～-99.8% |

**注意**: 24時間換算は単純計算であり、実際の投稿パターンとは異なる可能性があります。

### ログ期間の制限

- **ログ期間**: 2026-01-25 17:45 UTC ～ 2026-01-26 00:15 UTC（約6.5時間）
- **24時間全体のデータではない**

---

## 📊 予測値の根拠分析

### 1. 予測値の計算ロジック（`calculateDailyExpectations`）

#### 投稿パターンの前提

```javascript
// Quote Reposts: 10投稿/日
const quoteRepostImpressions = 
  (impressionsByLang['ar'] || 0) * 2 +
  (impressionsByLang['ko'] || 0) * 2 +
  (impressionsByLang['en'] || 0) * 2 +
  (impressionsByLang['pt-br'] || 0) * 2 +
  (impressionsByLang['es'] || 0) * 2;
// = 5言語 × 2投稿 = 10投稿/日

// Free Reports: 5投稿/日
const freeReportImpressions = 
  (impressionsByLang['en'] || 0) * 1 +
  (impressionsByLang['ko'] || 0) * 1 +
  (impressionsByLang['pt-br'] || 0) * 1 +
  (impressionsByLang['es'] || 0) * 1 +
  (impressionsByLang['ar'] || 0) * 1;
// = 5言語 × 1投稿 = 5投稿/日

// Minimal Version: 6投稿/日
const minimalVersionImpressions = 
  (impressionsByLang['en'] || 0) * 1 +
  (impressionsByLang['es'] || 0) * 1 +
  (impressionsByLang['pt-br'] || 0) * 1 +
  (impressionsByLang['ar'] || 0) * 1 +
  (impressionsByLang['ko'] || 0) * 1 +
  (impressionsByLang['ja'] || 0) * 1;
// = 6言語 × 1投稿 = 6投稿/日
```

#### 実際のCronスケジュール（`vercel.json`）

| Cron Job | スケジュール | 実際の実行回数/日 | 予測値の前提 | 不一致 |
|----------|------------|----------------|------------|--------|
| `/api/x-quote-repost` | `0 0,1,13,14,20,21,22 * * *` | **7回/日** | 10投稿/日 | ❌ **-3回** |
| `/api/x-post-free-report` | `0 12,13,14,15,18 * * *` | **5回/日** | 5投稿/日 | ✅ 一致 |
| `/api/x-post-minimal-version-cron` | `0 8,20 * * *` | **2回/日** | 6投稿/日 | ❌ **-4回** |

**重大な不一致**: 
- Quote Repost: 予測値は10投稿/日を前提としているが、実際は7回/日（-30%）
- Minimal Version: 予測値は6投稿/日を前提としているが、実際は2回/日（-67%）

---

## ⚠️ 実績データの問題点

### 1. `/api/x-quote-repost`のタイムアウト

検証レポート（`docs/DEPLOYMENT_8H_VERIFICATION_2026-01-26.md`）より:
- **実行回数**: 4回（6.5時間中）
- **成功**: 1回（UTC 00:00:48）
- **エラー**: 3回（すべてStatus 504 - Gateway Timeout）
  - UTC 20:00:48
  - UTC 21:00:48
  - UTC 22:00:48

**影響**: Quote Repostの投稿が3回失敗しているため、インプレッションが予測値を下回る可能性が高い。

### 2. Free ReportとMinimal Versionの検出不足

ログから抽出された実績:
- **Free Report**: UTC 18:00:17に実行（検証レポートで確認）
- **Minimal Version**: UTC 20:00:16に実行（検証レポートで確認）
- **ただし、ログからツイートIDが抽出できなかったため、詳細なメトリクスは含まれていません。**

**問題**: Free ReportとMinimal Versionのインプレッションが実績に含まれていない可能性があります。

### 3. ログ期間の制限

- **ログ期間**: 約6.5時間のみ（2026-01-25 17:45 UTC ～ 2026-01-26 00:15 UTC）
- **24時間全体のデータではない**

**問題**: 24時間全体の投稿パターンを正確に反映していない可能性があります。

---

## 🔍 予測値の根拠の検証

### 1. インフルエンサーの平均インプレッション数

`calculateDailyExpectations`は、各言語のインフルエンサーストックから平均インプレッション数を取得しています:

```javascript
const influencers = await getInfluencersFromStock(lang);
if (influencers && influencers.length > 0) {
  const totalImpressions = influencers.reduce((sum, inf) => {
    return sum + parseImpressions(inf.recentImpressions || '0');
  }, 0);
  impressionsByLang[lang] = Math.round(totalImpressions / influencers.length);
}
```

**問題**: 
- インフルエンサーストックが適切に更新されていない場合、古いデータを使用している可能性がある
- 実際のインフルエンサーのパフォーマンスが期待値を下回る可能性がある

### 2. コンバージョン率の前提

```javascript
const CONVERSION_RATES = {
  telegramClickRate: {
    conservative: 0.001,  // 0.1%
    moderate: 0.002,      // 0.2%
    optimistic: 0.003,    // 0.3%
  },
  telegramOptInRate: {
    conservative: 0.3,    // 30%
    moderate: 0.5,        // 50%
    optimistic: 0.7,      // 70%
  },
  whopClickRate: {
    conservative: 0.01,   // 1%
    moderate: 0.02,       // 2%
    optimistic: 0.03,     // 3%
  },
  whopConversionRate: {
    conservative: 0.01,   // 1%
    moderate: 0.035,      // 3.5%
    optimistic: 0.05,     // 5%
  },
};
```

**問題**: 
- これらのコンバージョン率は、実際のデータに基づいているのか、それとも仮定値なのか不明
- 実績のTelegramオプトイン（17人）が予測値（9,666-40,275人/日）と大きく乖離している

---

## ❌ リカバリーの根拠がない理由

### 1. 予測値の前提条件が満たされていない

`docs/EXPECTATIONS_PREMISES_2026-01-25.md`より、予測値が達成される前提条件:

1. ✅ Cron Jobsが適正に実行される（vercel.jsonのスケジュール通り）
   - **問題**: `/api/x-quote-repost`が3回タイムアウトしている
2. ✅ インフルエンサーストックが適切に更新される
   - **確認必要**: インフルエンサーストックが適切に更新されているか不明
3. ✅ すべてのAPIが正常に動作する
   - **問題**: `/api/x-quote-repost`がタイムアウトしている
4. ✅ レート制限を超えない
   - **確認済み**: レート制限は正常に機能している
5. ✅ 市場状況がGemini/Grokの予測通りに推移する
   - **確認必要**: 市場状況が予測通りか不明
6. ✅ インフルエンサーのパフォーマンスが期待通り
   - **確認必要**: 実際のインフルエンサーのパフォーマンスが期待値を下回る可能性がある

**結論**: 前提条件の一部が満たされていないため、予測値の達成は困難です。

### 2. 投稿パターンの不一致

- **Quote Repost**: 予測値は10投稿/日を前提としているが、実際は7回/日（-30%）
- **Minimal Version**: 予測値は6投稿/日を前提としているが、実際は2回/日（-67%）

**結論**: 予測値の前提条件（投稿回数）が実際のCronスケジュールと一致していないため、予測値は過大評価されています。

### 3. タイムアウト問題の継続

`/api/x-quote-repost`のタイムアウト問題が解決されていない限り、Quote Repostの投稿が継続的に失敗する可能性があります。

**結論**: タイムアウト問題が解決されない限り、リカバリーは期待できません。

---

## 📝 結論

### 1. 予測値の根拠に問題がある

- **投稿パターンの不一致**: 予測値は10投稿/日（Quote Repost）と6投稿/日（Minimal Version）を前提としているが、実際は7回/日と2回/日
- **前提条件の未達成**: `/api/x-quote-repost`のタイムアウト問題により、予測値の前提条件が満たされていない

### 2. リカバリーの根拠がない

- **タイムアウト問題の継続**: `/api/x-quote-repost`のタイムアウト問題が解決されていない限り、リカバリーは期待できない
- **投稿回数の減少**: 実際のCronスケジュールが予測値の前提条件と一致していないため、予測値を達成するのは困難

### 3. 必要な対応

1. **予測値の再計算**: 実際のCronスケジュール（7回/日、2回/日）に基づいて予測値を再計算する
2. **タイムアウト問題の解決**: `/api/x-quote-repost`のタイムアウト問題を解決する
3. **実績データの正確な取得**: 24時間全体のデータを取得し、正確な実績を把握する

---

## 📚 参照

- `docs/24H_COMPLETE_REPORT_2026-01-26.md` - 24時間実績レポート
- `docs/DEPLOYMENT_8H_VERIFICATION_2026-01-26.md` - デプロイ後8時間のログ検証結果
- `docs/EXPECTATIONS_PREMISES_2026-01-25.md` - 期待値の前提条件
- `services/x/postPerformanceAnalyzer.js` - パフォーマンス分析機能
- `vercel.json` - Cron Jobsスケジュール定義
